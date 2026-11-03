
/*
 * SmartShoe V5
 *
 * Board: LILYGO T-A7670E ESP32
 * Modem: A7670E-FASE
 * SIM: Singtel hi! Plan
 *
 * Features:
 * 1. Continuous GPS tracking
 * 2. Automatic AGPS assistance
 * 3. GPS reading every 10 seconds after first fix
 * 4. LTE registration monitoring
 * 5. Current GPS upload attempt every 30 seconds
 * 6. Authenticated HTTPS location upload (hardware validation pending)
 * 7. GPS stays on continuously
 *
 * IMPORTANT:
 * Cloud integration candidate. Compile and test on the actual board.
 * Never publish secrets.h or enable AT traffic dumps with a real token.
 */

#include "utilities.h"

#define TINY_GSM_RX_BUFFER 1024
#define SerialMon Serial
// AT tracing disabled: HTTP headers contain the device credential.

// Uncomment only when debugging AT traffic.
// #define DUMP_AT_COMMANDS

#include <TinyGsmClient.h>
#include <math.h>
#include <WiFi.h>
#include "fingerprint_model.h"
#include "secrets.h"
#include "root_ca.h"

#ifdef DUMP_AT_COMMANDS
#error "Disable DUMP_AT_COMMANDS before using real credentials"
#include <StreamDebugger.h>
StreamDebugger debugger(SerialAT, SerialMon);
TinyGsm modem(debugger);
#else
TinyGsm modem(SerialAT);
#endif

#ifndef TINY_GSM_FORK_LIBRARY
#error "Please install the LILYGO TinyGSM fork library"
#endif

// ========================================
// CONFIGURATION
// ========================================

// Cloud integration candidate: upload is enabled when this sketch is flashed.
const bool ENABLE_UPLOAD = true;

// Read GPS every 10 seconds after a fix.
const unsigned long GPS_INTERVAL = 10000UL;

// Retry GPS every 15 seconds without a fix.
const unsigned long GPS_RETRY_INTERVAL = 15000UL;

// Attempt current-fix upload every 30 seconds. HTTPS can block GPS polling.
const unsigned long UPLOAD_INTERVAL = 30000UL;

// Retry AGPS at most 3 times, 60 seconds apart.
const unsigned long AGPS_RETRY_INTERVAL = 60000UL;
const int AGPS_MAX_ATTEMPTS = 3;

// Replace when your backend is ready.
const char *SERVER_URL =
    "https://smartstep-gps.guanleyang007.workers.dev/v2/devices/shoe_001/location";

const char *DEVICE_ID = "shoe_001";

// A PDOP value is not an accuracy value in meters.
const float MAX_PDOP = 10.0f;

// ========================================
// STATE VARIABLES
// ========================================

bool agpsSuccess = false;
bool firstAgpsCheck = true;
bool gpsHasFixed = false;

int agpsAttempts = 0;

unsigned long lastAgpsCheck = 0;
unsigned long lastUploadAttempt = 0;

bool firstUpload = true;

// ========================================
// NETWORK STATUS
// ========================================

bool isLTERegistered()
{
    RegStatus status = modem.getRegistrationStatus();

    return (
        status == REG_OK_HOME ||
        status == REG_OK_ROAMING
    );
}

// ========================================
// AUTOMATIC AGPS
// ========================================

void tryEnableAGPS()
{
    // A GPS fix already exists.
    if (gpsHasFixed) {
        return;
    }

    // No need to run AGPS again after success.
    if (agpsSuccess) {
        return;
    }

    // Avoid endless AGPS attempts.
    if (agpsAttempts >= AGPS_MAX_ATTEMPTS) {
        return;
    }

    unsigned long now = millis();

    if (!firstAgpsCheck &&
        now - lastAgpsCheck < AGPS_RETRY_INTERVAL) {
        return;
    }

    firstAgpsCheck = false;
    lastAgpsCheck = now;

    Serial.println();
    Serial.println("Checking 4G for AGPS...");

    if (!isLTERegistered()) {
        Serial.println(
            "4G not registered yet. "
            "GPS will continue running."
        );
        return;
    }

    Serial.println("4G Registered!");
    Serial.println("Starting automatic AGPS...");

    agpsAttempts++;

    // Official LILYGO TinyGSM method.
    // Internally sends AT+CAGPS.
    if (modem.enableAGPS()) {

        agpsSuccess = true;

        Serial.println(
            "AGPS SUCCESS! Assistance data received."
        );

    } else {

        Serial.println(
            "AGPS failed. GPS will continue "
            "without AGPS."
        );
    }
}

// ========================================
// BUILD GPS JSON
// ========================================

String buildGPSJson(
    float latitude,
    float longitude,
    float pdop,
    int year,
    int month,
    int day,
    int hour,
    int minute,
    int second)
{
    char timestamp[25];

    snprintf(
        timestamp,
        sizeof(timestamp),
        "%04d-%02d-%02dT%02d:%02d:%02dZ",
        year,
        month,
        day,
        hour,
        minute,
        second
    );


    // Gregorian civil date -> Unix epoch, independent of the ESP32 time zone.
    int y = year - (month <= 2);
    int era = (y >= 0 ? y : y - 399) / 400;
    unsigned yoe = (unsigned)(y - era * 400);
    unsigned doy = (153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1;
    unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    int64_t days = (int64_t)era * 146097 + doe - 719468;
    int64_t milliseconds = ((days * 24 + hour) * 3600 + minute * 60 + second) * 1000LL;
    char fixMillis[24];
    snprintf(fixMillis, sizeof(fixMillis), "%lld", (long long)milliseconds);
    String json = "{";
    json += "\"recorded_at\":";
    json += fixMillis;
    json += ",";


    json += "\"device_id\":\"";
    json += DEVICE_ID;
    json += "\",";

    json += "\"latitude\":";
    json += String(latitude, 6);
    json += ",";

    json += "\"longitude\":";
    json += String(longitude, 6);
    json += ",";

    // PDOP is dimensionless, not meters.
    json += "\"pdop\":";
    json += String(pdop, 2);
    json += ",";

    json += "\"gps_time_utc\":\"";
    json += timestamp;
    json += "\",";

    // Reserved for future MAX17048 sensor.
    json += "\"battery_percent\":null";

    json += "}";

    return json;
}

// ========================================
// OPTIONAL HTTP POST
// NOT ENABLED DURING GPS TESTING
// ========================================


bool tlsReady = false;
bool clockReady = false;

bool expectOK(const char *step, uint32_t timeout = 10000UL)
{
    if (modem.waitResponse(timeout) == 1) return true;
    Serial.print("FAILED: "); Serial.println(step);
    return false;
}

bool prepareTLS()
{
    if (tlsReady) return true;
    // A fixed filename permits an in-place certificate refresh after firmware updates.
    modem.sendAT("+CCERTDELE=\"smartstep-ca.pem\"");
    modem.waitResponse(5000UL); // Missing file is expected on first boot.
    modem.sendAT("+CCERTDOWN=\"smartstep-ca.pem\",", strlen(ROOT_CA));
    if (modem.waitResponse(10000UL, ">") != 1) {
        Serial.println("FAILED: CA certificate transfer prompt"); return false;
    }
    SerialAT.write((const uint8_t *)ROOT_CA, strlen(ROOT_CA));
    SerialAT.flush();
    if (!expectOK("CA certificate transfer", 20000UL)) return false;
    modem.sendAT("+CSSLCFG=\"sslversion\",0,3"); // TLS 1.2
    if (!expectOK("TLS 1.2")) return false;
    modem.sendAT("+CSSLCFG=\"authmode\",0,1"); // Authenticate server certificate.
    if (!expectOK("server authentication")) return false;
    modem.sendAT("+CSSLCFG=\"ignorelocaltime\",0,0");
    if (!expectOK("certificate time verification")) return false;
    modem.sendAT("+CSSLCFG=\"cacert\",0,\"smartstep-ca.pem\"");
    if (!expectOK("trusted CA")) return false;
    modem.sendAT("+CSSLCFG=\"enableSNI\",0,1");
    if (!expectOK("TLS SNI")) return false;
    tlsReady = true;
    return true;
}

bool uploadGPS(const String &json)
{
    if (!ENABLE_UPLOAD || strlen(UPLOAD_TOKEN) != 64) return false;
    if (!isLTERegistered()) { Serial.println("4G not registered."); return false; }
    if (!clockReady && !syncNetworkClock()) {
        Serial.println("Upload deferred: no usable UTC clock for certificate verification.");
        return false;
    }
    if (!prepareTLS()) return false;
    bool success = false;
    // Clear a previous abandoned HTTP session; GPS remains on.
    modem.sendAT("+HTTPTERM"); modem.waitResponse(3000UL);
    modem.sendAT("+HTTPINIT");
    if (!expectOK("HTTPINIT", 20000UL)) return false;
    do {
        modem.sendAT("+HTTPPARA=\"SSLCFG\",0");
        if (!expectOK("HTTPS TLS context")) break;
        modem.sendAT("+HTTPPARA=\"URL\",\"", SERVER_URL, "\"");
        if (!expectOK("HTTP URL")) break;
        modem.sendAT("+HTTPPARA=\"CONTENT\",\"application/json\"");
        if (!expectOK("JSON content type")) break;
        // Do not enable TinyGSM debug or StreamDebugger: this contains a secret.
        modem.sendAT("+HTTPPARA=\"USERDATA\",\"Authorization: Bearer ", UPLOAD_TOKEN, "\"");
        if (!expectOK("authorization header")) break;
        modem.sendAT("+HTTPDATA=", json.length(), ",10000");
        if (modem.waitResponse(10000UL, "DOWNLOAD") != 1) {
            Serial.println("FAILED: HTTPDATA prompt"); break;
        }
        SerialAT.print(json);
        if (!expectOK("JSON transfer", 15000UL)) break;
        modem.sendAT("+HTTPACTION=1");
        if (!expectOK("HTTPACTION")) break;
        // Parse only the completion URC, without printing modem traffic.
        const unsigned long started = millis();
        String line;
        int status = -1;
        bool complete = false;
        while (millis() - started < 90000UL) {
            while (SerialAT.available()) {
                char ch = (char)SerialAT.read();
                if (ch == '\n') {
                    line.trim();
                    int method = -1, length = 0;
                    if (sscanf(line.c_str(), "+HTTPACTION: %d,%d,%d", &method, &status, &length) == 3 && method == 1) {
                        complete = true; break;
                    }
                    line = "";
                } else if (line.length() < 192) line += ch;
            }
            if (complete) break;
            delay(5);
        }
        if (!complete) { Serial.println("FAILED: HTTP result timeout"); break; }
        Serial.print("HTTP Status: "); Serial.println(status);
        success = status == 200;
        if (success) Serial.println("GPS upload accepted by server.");
        else if (status == 401) Serial.println("Check upload credential (never print it).");
        else if (status == 400) Serial.println("Check current GPS date/time and coordinates.");
        else if (status == 503) Serial.println("Check Worker DB binding and secrets.");
        else Serial.println("Upload failed. Check LTE data, modem TLS support and CA chain.");
    } while (false);
    modem.sendAT("+HTTPTERM"); modem.waitResponse(10000UL);
    return success;
}

bool setClockFromGPS(int year, int month, int day, int hour, int minute, int second)
{
    if (year < 2025 || year > 2099 || month < 1 || month > 12 ||
        day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        Serial.println("Invalid GPS UTC; upload skipped."); return false;
    }
    char clockValue[32];
    snprintf(clockValue, sizeof(clockValue), "%02d/%02d/%02d,%02d:%02d:%02d+00", year % 100, month, day, hour, minute, second);
    modem.sendAT("+CCLK=\"", clockValue, "\"");
    clockReady = expectOK("UTC modem clock");
    return clockReady;
}

// ========================================
// BOARD AND MODEM INITIALIZATION
// ========================================

void setup()
{
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("===========================");
    Serial.println("SmartShoe V5 Cloud Starting");
    Serial.println("===========================");

#ifdef BOARD_POWERON_PIN
    pinMode(BOARD_POWERON_PIN, OUTPUT);
    digitalWrite(BOARD_POWERON_PIN, HIGH);
#endif

#ifdef MODEM_RESET_PIN
    pinMode(MODEM_RESET_PIN, OUTPUT);

    digitalWrite(
        MODEM_RESET_PIN,
        !MODEM_RESET_LEVEL
    );

    delay(100);

    digitalWrite(
        MODEM_RESET_PIN,
        MODEM_RESET_LEVEL
    );

    delay(2600);

    digitalWrite(
        MODEM_RESET_PIN,
        !MODEM_RESET_LEVEL
    );
#endif

#ifdef MODEM_DTR_PIN
    pinMode(MODEM_DTR_PIN, OUTPUT);
    digitalWrite(MODEM_DTR_PIN, LOW);
#endif

    // Power on the modem.
    pinMode(BOARD_PWRKEY_PIN, OUTPUT);

    digitalWrite(BOARD_PWRKEY_PIN, LOW);
    delay(100);

    digitalWrite(BOARD_PWRKEY_PIN, HIGH);
    delay(MODEM_POWERON_PULSE_WIDTH_MS);

    digitalWrite(BOARD_PWRKEY_PIN, LOW);

    SerialAT.begin(
        115200,
        SERIAL_8N1,
        MODEM_RX_PIN,
        MODEM_TX_PIN
    );

    delay(3000);

    Serial.println("Connecting to modem...");

    int retry = 0;

    while (!modem.testAT(1000)) {

        Serial.println("Waiting for modem...");

        if (++retry > 30) {

            digitalWrite(BOARD_PWRKEY_PIN, LOW);
            delay(100);

            digitalWrite(BOARD_PWRKEY_PIN, HIGH);
            delay(MODEM_POWERON_PULSE_WIDTH_MS);

            digitalWrite(BOARD_PWRKEY_PIN, LOW);

            retry = 0;
        }

        delay(500);
    }

    Serial.println("Modem connected!");

    String modemName = modem.getModemName();

    Serial.print("Modem: ");
    Serial.println(modemName);

    if (!modemName.startsWith("A7670E-FASE")) {

        Serial.println(
            "WARNING: Unexpected modem model."
        );
    }

    // Wait for cellular registration before initializing GNSS.
    // Do not continue to GPS when the SIM or LTE network is unavailable.
    Serial.println("Waiting for 4G registration before GPS...");
    unsigned long networkWaitStarted = millis();
    while (!isLTERegistered()) {
        Serial.print("4G not registered. Waiting seconds: ");
        Serial.println((millis() - networkWaitStarted) / 1000UL);
        delay(2000);
    }
    Serial.println("4G registered. Starting GPS initialization...");

    // ====================================
    // GPS INITIALIZATION
    // ====================================

    // Stop AT-port NMEA output left by ATdebug.
    // This does NOT turn off GPS.
    modem.sendAT("+CGNSSTST=0");
    modem.waitResponse(3000UL);

    // Configure GNSS antenna.
    modem.sendAT("+CGDRT=1,1");
    modem.waitResponse(3000UL);

    modem.sendAT("+CGSETV=1,1");
    modem.waitResponse(3000UL);

    // Do NOT force CGNSSPWR=0 or cold start.
    // Reuse an existing running GNSS session.
    if (modem.isEnableGPS()) {

        Serial.println("GPS already running.");

    } else {

        Serial.println(
            "Enabling GPS/GNSS/GLONASS..."
        );

        while (!modem.enableGPS(
                   MODEM_GPS_ENABLE_GPIO,
                   MODEM_GPS_ENABLE_LEVEL)) {

            Serial.println(
                "Waiting for GPS startup..."
            );

            delay(1000);
        }
    }

    Serial.println("GPS Enabled");

    modem.setGPSBaud(115200);

    Serial.println(
        "4G registered. Automatic AGPS will run "
        "while waiting for the first GPS fix."
    );

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(false);
    WiFi.disconnect();
    Serial.println("SmartHybrid Ready: GPS > WiFi > LTE");

    if (!ENABLE_UPLOAD) {

        Serial.println(
            "Upload disabled - Preview only."
        );
    }

    Serial.println(
        "GPS will stay enabled continuously."
    );
}

// ========================================
// CONTINUOUS GPS TRACKING
// ========================================

void legacyLoop()
{
    // Try AGPS when needed, without preventing
    // ordinary GPS polling if LTE is not ready.
    tryEnableAGPS();

    float latitude = 0;
    float longitude = 0;
    float speed = 0;
    float altitude = 0;
    float pdop = 0;

    int visibleSat = 0;
    int usedSat = 0;

    int year = 0;
    int month = 0;
    int day = 0;

    int hour = 0;
    int minute = 0;
    int second = 0;

    uint8_t fixMode = 0;

    Serial.println();
    Serial.println("===========================");
    Serial.println("Requesting GPS location...");

    bool gpsOK = modem.getGPS(
        &fixMode,
        &latitude,
        &longitude,
        &speed,
        &altitude,
        &visibleSat,
        &usedSat,
        &pdop,
        &year,
        &month,
        &day,
        &hour,
        &minute,
        &second
    );

    bool validFix =
        gpsOK &&
        isfinite(latitude) && isfinite(longitude) &&
        fixMode >= 2 &&
        latitude >= -90.0f &&
        latitude <= 90.0f &&
        longitude >= -180.0f &&
        longitude <= 180.0f;

    if (!validFix) {

        Serial.println(
            "Couldn't get GPS location."
        );

        Serial.println(
            "GPS remains ON. Retrying in 15s."
        );

        delay(GPS_RETRY_INTERVAL);
        return;
    }

    gpsHasFixed = true;

    Serial.println("GPS FIX SUCCESS!");

    Serial.print("FixMode: ");
    Serial.println(fixMode);

    Serial.print("Latitude: ");
    Serial.println(latitude, 6);

    Serial.print("Longitude: ");
    Serial.println(longitude, 6);

    Serial.print("GPS satellites reported: ");
    Serial.println(visibleSat);

    Serial.print("PDOP: ");
    Serial.println(pdop, 2);

    Serial.print("Speed (knots): ");
    Serial.println(speed, 3);

    Serial.print("Altitude (m): ");
    Serial.println(altitude, 2);

    Serial.printf(
        "UTC Time: %04d-%02d-%02d "
        "%02d:%02d:%02d\n",
        year, month, day,
        hour, minute, second
    );

    // Display network status.
    if (isLTERegistered()) {

        Serial.println("4G Registered!");

    } else {

        Serial.println("4G Not Registered Yet");
    }

    // PDOP is a quality indicator, not an
    // accuracy measurement in meters.
    bool validPDOP =
        isfinite(pdop) &&
        pdop > 0.0f &&
        pdop < MAX_PDOP;

    if (!validPDOP) {

        Serial.println(
            "PDOP unreliable - upload skipped."
        );
    }

    unsigned long now = millis();

    bool timeToUpload =
        firstUpload ||
        (now - lastUploadAttempt >=
         UPLOAD_INTERVAL);

    if (validPDOP && timeToUpload) {

        firstUpload = false;
        lastUploadAttempt = now;

        String json = buildGPSJson(
            latitude,
            longitude,
            pdop,
            year,
            month,
            day,
            hour,
            minute,
            second
        );

        if (ENABLE_UPLOAD) {

            Serial.println(
                "Uploading location via 4G..."
            );

            if (setClockFromGPS(year, month, day, hour, minute, second)) uploadGPS(json);

        } else {

            Serial.println();
            Serial.println(
                "====== UPLOAD PREVIEW ======"
            );

            Serial.println(json);

            Serial.println(
                "============================"
            );
        }
    }

    // Keep GPS running.
    // Do not disable GNSS after a fix.
    delay(GPS_INTERVAL);
}


int wifiCandidate=-1,wifiConfirm=0;
bool indoorFix(int &zone) {
    int count=WiFi.scanNetworks(false,false);
    if(count<0){wifiCandidate=-1;wifiConfirm=0;return false;}
    float obs[FEATURE_COUNT];for(int j=0;j<FEATURE_COUNT;j++)obs[j]=-100;
    for(int i=0;i<count;i++) {
        if(WiFi.SSID(i)!="NTUSECURE")continue;
        String b=WiFi.BSSIDstr(i);
        for(int j=0;j<FEATURE_COUNT;j++)if(b.equalsIgnoreCase(FEATURE_BSSID[j])){obs[j]=WiFi.RSSI(i);break;}
    }
    WiFi.scanDelete();int visible=0;
    for(int j=0;j<FEATURE_COUNT;j++)if(obs[j]>-90)visible++;
    int best=-1;float bestScore=1e6;
    for(int z=0;z<ZONE_COUNT;z++) {
        float sum=0;for(int j=0;j<FEATURE_COUNT;j++){float d=obs[j]-TEMPLATES[z][j];sum+=d*d;}
        float score=sqrtf(sum/FEATURE_COUNT);
        if(score<bestScore){best=z;bestScore=score;}
    }
    if(visible<3||best<0||bestScore>ENTER_LIMIT[best]){wifiCandidate=-1;wifiConfirm=0;return false;}
    if(wifiCandidate==best)wifiConfirm++;else{wifiCandidate=best;wifiConfirm=1;}
    zone=best;return wifiConfirm>=2;
}

bool lteFix(float &latitude,float &longitude,float &accuracy) {
    modem.sendAT("+CLBS=1");
    unsigned long started=millis();String line;
    while(millis()-started<15000UL) {
        while(SerialAT.available()) {
            char c=(char)SerialAT.read();
            if(c=='\n') {
                line.trim();int status=-1;
                // Actual A011B09A7670M7_F field order was confirmed on this board.
                if(line.startsWith("+CLBS:")) {
                    int n=sscanf(line.c_str(),"+CLBS: %d,%f,%f,%f",&status,&latitude,&longitude,&accuracy);
                    // Consume any trailing acknowledgement before another command.
                    unsigned long drain=millis();while(millis()-drain<300){while(SerialAT.available())SerialAT.read();delay(5);}
                    return n==4&&status==0&&isfinite(latitude)&&isfinite(longitude)&&isfinite(accuracy)&&fabs(latitude)<=90&&fabs(longitude)<=180&&accuracy>0;
                }
                if(line=="ERROR"||line.startsWith("+CME ERROR"))return false;
                line="";
            }else if(line.length()<256)line+=c;
        }delay(5);
    }return false;
}

void loop() {
    tryEnableAGPS();
    float lat=0,lon=0,speed=0,alt=0,pdop=0;
    int visible=0,used=0,y=0,mo=0,d=0,h=0,mi=0,s=0;uint8_t mode=0;
    bool ok=modem.getGPS(&mode,&lat,&lon,&speed,&alt,&visible,&used,&pdop,&y,&mo,&d,&h,&mi,&s);
    String body;
    bool gps=ok&&mode>=2&&isfinite(lat)&&isfinite(lon)&&fabs(lat)<=90&&fabs(lon)<=180&&isfinite(pdop)&&pdop>0&&pdop<MAX_PDOP&&y>=2025&&y<=2099;
    if(gps) {
        gpsHasFixed=true;wifiCandidate=-1;wifiConfirm=0;
        body=buildGPSJson(lat,lon,pdop,y,mo,d,h,mi,s);
        body.remove(body.length()-1);body+=",\"source\":\"gps\"}";
        if(!setClockFromGPS(y,mo,d,h,mi,s)){delay(10000);return;}
        Serial.println("SOURCE: GPS");
    }else {
        int zone=-1;
        if(indoorFix(zone)) {
            body="{\"device_id\":\"shoe_001\",\"source\":\"wifi\",\"zone_id\":\"";
            body+=HYBRID_ZONE_ID[zone];body+="\"}";
            Serial.print("SOURCE: WIFI | ");Serial.println(ZONE_LABEL[zone]);
        }else {
            float a=0;
            if(isLTERegistered()&&lteFix(lat,lon,a)) {
                body="{\"device_id\":\"shoe_001\",\"source\":\"lte\",\"latitude\":";
                body+=String(lat,6);body+=",\"longitude\":";body+=String(lon,6);
                body+=",\"accuracy_m\":";body+=String(a,1);body+="}";
                Serial.println("SOURCE: LTE estimated position");
            } else {
                body="{\"device_id\":\"shoe_001\",\"source\":\"unavailable\"}";
                Serial.println("SOURCE: no current location");
            }
        }
    }
    uploadGPS(body);
    // Never turn off or reinitialize GNSS during a location source switch.
    delay(10000UL);
}


// The vendor LBS type 4 includes UTC date/time, so indoor startup need not wait
// for the first GNSS fix. No change to authmode or certificate time checks.
bool syncNetworkClock() {
    Serial.println("Checking modem clock before TLS:");
    modem.sendAT("+CCLK?");
    unsigned long started=millis();String line;
    while(millis()-started<5000UL) {
        while(SerialAT.available()) {
            char c=(char)SerialAT.read();
            if(c=='\n') {
                line.trim();
                if(line.startsWith("+CCLK:"))Serial.println(line);
                if(line=="OK"||line=="ERROR")goto clock_read;
                line="";
            }else if(line.length()<192)line+=c;
        }delay(5);
    }
clock_read:
    Serial.println("Requesting network UTC with CLBS type 4...");
    modem.sendAT("+CLBS=4");started=millis();line="";
    bool found=false;int y=0,mo=0,d=0,h=0,mi=0,sec=0;
    while(millis()-started<15000UL) {
        while(SerialAT.available()) {
            char c=(char)SerialAT.read();
            if(c=='\n') {
                line.trim();
                if(line.startsWith("+CLBS:")) {
                    // Log only the time fields, never credentials or identifiers.
                    int code=-1;float a=0,b=0,accuracy=0;
                    int parsed=sscanf(line.c_str(),"+CLBS: %d,%f,%f,%f,%d/%d/%d,%d:%d:%d",&code,&a,&b,&accuracy,&y,&mo,&d,&h,&mi,&sec);
                    found=parsed==10&&code==0;
                    if(!found)Serial.println("Network UTC absent or unexpected CLBS format.");
                    goto clock_done;
                }
                if(line=="ERROR"||line.startsWith("+CME ERROR"))goto clock_done;
                line="";
            }else if(line.length()<256)line+=c;
        }delay(5);
    }
clock_done:
    unsigned long drain=millis();while(millis()-drain<300){while(SerialAT.available())SerialAT.read();delay(5);}
    if(!found)return false;
    Serial.printf("Network UTC: %04d-%02d-%02d %02d:%02d:%02d\n",y,mo,d,h,mi,sec);
    return setClockFromGPS(y,mo,d,h,mi,sec);
}
