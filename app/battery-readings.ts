import type { Location } from "./RealDevice";

import type { Translate } from "./language";

export function batteryReadings(report: Location | null, t: Translate) {
  const voltage = report?.battery_voltage_v;
  const current = report?.battery_current_ma;
  const hasVoltage = typeof voltage === "number" && Number.isFinite(voltage);
  const hasCurrent = typeof current === "number" && Number.isFinite(current);
  const level = report?.battery_percent;
  const percent = typeof level === "number" && Number.isFinite(level) && level >= 0 && level <= 100
    ? report?.battery_percent_source === "cloud_estimate" ? "≈" + level.toFixed(0) + "%" : level.toFixed(1) + "%"
    : null;
  return {
    percent,
    level: percent ?? (hasVoltage && hasCurrent ? t("暂无估算","Estimate unavailable") : t("未上报","Not reported")),
    voltage: hasVoltage ? voltage.toFixed(3) + " V" : t("未上报","Not reported"),
    current: hasCurrent ? (current > 0 ? "+" : "") + current.toFixed(1) + " mA" : t("未上报","Not reported"),
    state: !hasCurrent ? t("未上报","Not reported") : current <= -1 ? t("净充电","Charging") : current >= 1 ? t("净放电","Discharging") : t("净电流接近零","Near-zero net current"),
    available: hasVoltage || hasCurrent,
    stale: !!report && Date.now() - report.received_at > 120000,
  };
}
