#pragma once

#include <Arduino.h>
#include <Wire.h>

namespace BatteryMonitor {
constexpr uint8_t ADDRESS = 0x40;
constexpr float SHUNT_OHMS = 0.100f;  // R100 on the soft-pack battery module.
constexpr uint16_t CONFIG = 0x399F;   // +/-320 mV shunt, continuous conversion.

inline bool readRegister(uint8_t reg, uint16_t &value) {
    Wire.beginTransmission(ADDRESS);
    Wire.write(reg);
    if (Wire.endTransmission(false) != 0) return false;
    if (Wire.requestFrom(ADDRESS, uint8_t(2)) != 2) {
        while (Wire.available()) Wire.read();
        return false;
    }
    value = uint16_t(Wire.read()) << 8;
    value |= uint8_t(Wire.read());
    return true;
}

inline bool read(float &voltage, float &currentMA) {
    uint16_t config, busRaw, shuntRaw;
    if (!readRegister(0x00, config)) return false;
    if (config != CONFIG) {
        Wire.beginTransmission(ADDRESS);
        Wire.write(0x00);
        Wire.write(uint8_t(CONFIG >> 8));
        Wire.write(uint8_t(CONFIG));
        if (Wire.endTransmission() != 0) return false;
        delay(3);
    }
    if (!readRegister(0x02, busRaw) || !readRegister(0x01, shuntRaw)) return false;
    const int32_t shuntCounts = shuntRaw < 0x8000
        ? int32_t(shuntRaw) : int32_t(shuntRaw) - 65536;
    if (shuntCounts <= -31990 || shuntCounts >= 31990) return false;
    const float shuntV = shuntCounts * 0.000010f;
    voltage = (busRaw >> 3) * 0.004f + shuntV;
    currentMA = 1000.0f * shuntV / SHUNT_OHMS;
    return voltage >= 2.0f && voltage <= 4.5f;
}
}
