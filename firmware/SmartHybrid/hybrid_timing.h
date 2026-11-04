#pragma once
#include <stdint.h>

static constexpr uint32_t WIFI_CYCLE_MS = 10000UL;
static constexpr uint32_t WIFI_HOLD_MS = 120000UL;
static constexpr uint32_t GPS_POLL_MS = 1000UL;
enum class FallbackChoice { Waiting, HeldWifi, Lte };
constexpr FallbackChoice fallbackChoice(uint32_t now, uint32_t windowStart, int lastZone, uint32_t lastSeen) {
    return uint32_t(now-windowStart) >= WIFI_HOLD_MS ? FallbackChoice::Lte :
        lastZone >= 0 && uint32_t(now-lastSeen) < WIFI_HOLD_MS ? FallbackChoice::HeldWifi : FallbackChoice::Waiting;
}
constexpr bool gpsUploadDue(bool valid, bool previousValid, uint32_t now, uint32_t lastUpload) {
    return valid && (!previousValid || uint32_t(now-lastUpload) >= WIFI_CYCLE_MS);
}
constexpr float absolute(float x){return x<0?-x:x;}
constexpr bool floorOneGate(float score,float runner,float a,float b,float c) {
    return a>=-68.f&&a<=-40.f&&b>=-68.f&&b<=-40.f&&c>=-68.f&&c<=-40.f&&
        score<=5.f&&(absolute(a+58.f)+absolute(b+60.f)+absolute(c+62.f))/3.f<=6.f&&runner-score>=3.f;
}
// Executed as part of every firmware build; exercises the actual policy functions.
static_assert(fallbackChoice(119999,0,3,0)==FallbackChoice::HeldWifi,"Retain last confirmed point before 2 minutes");
static_assert(fallbackChoice(120000,0,3,0)==FallbackChoice::Lte,"LTE starts at 2 minutes");
static_assert(fallbackChoice(119999,0,-1,0)==FallbackChoice::Waiting,"No invented location at startup");
static_assert(fallbackChoice(200000,190000,5,190000)==FallbackChoice::HeldWifi,"New confirmed point resets hold timer");
static_assert(fallbackChoice(200000,190000,5,0)==FallbackChoice::Waiting,"Old point is not made fresh by a GPS fix");
static_assert(fallbackChoice(50000,UINT32_MAX-80000,3,UINT32_MAX-80000)==FallbackChoice::Lte,"Timer survives millis wrap");
static_assert(gpsUploadDue(true,false,1,0),"First valid GPS uploads immediately");
static_assert(!gpsUploadDue(true,true,9999,0),"Steady GPS uploads are rate limited");
static_assert(gpsUploadDue(true,true,10000,0),"Periodic GPS upload");
static_assert(!gpsUploadDue(false,false,20000,0),"Invalid GPS cannot upload");
static_assert(floorOneGate(3.2f,7.26f,-65.f,-64.f,-65.f),"Observed floor-1 training edge remains accepted");
static_assert(!floorOneGate(3.f,8.f,-75.f,-73.f,-72.f),"Weak shared APs do not prove floor 1");
static_assert(!floorOneGate(6.f,10.f,-58.f,-60.f,-62.f),"Loose full-vector match rejected");
static_assert(!floorOneGate(3.f,5.f,-58.f,-60.f,-62.f),"Ambiguous zone match rejected");
