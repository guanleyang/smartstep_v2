import type { Location } from "./RealDevice";

import type { Translate } from "./language";

const BATTERY_CAPACITY_MAH = 1100;

function formatDuration(minutes: number, t: Translate) {
  const rounded = Math.max(5, Math.round(minutes / 5) * 5);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (!hours) return t(`约 ${rest} 分钟`, `About ${rest} min`);
  if (!rest) return t(`约 ${hours} 小时`, `About ${hours} h`);
  return t(`约 ${hours} 小时 ${rest} 分钟`, `About ${hours} h ${rest} min`);
}

export function batteryReadings(report: Location | null, t: Translate) {
  const voltage = report?.battery_voltage_v;
  const current = report?.battery_current_ma;
  const hasVoltage = typeof voltage === "number" && Number.isFinite(voltage);
  const hasCurrent = typeof current === "number" && Number.isFinite(current);
  const level = report?.battery_percent;
  const validLevel = typeof level === "number" && Number.isFinite(level) && level >= 0 && level <= 100;
  const percent = validLevel ? Math.round(level / 5) * 5 + "%" : null;
  const charging = hasCurrent && current <= -1;
  const discharging = hasCurrent && current >= 1;
  const stale = !!report && Date.now() - report.received_at > 120000;
  const usableTime = !stale && validLevel && level > 0 && discharging
    ? formatDuration(60 * BATTERY_CAPACITY_MAH * level / 100 / current, t) : null;
  const fullTime = !stale && validLevel && level < 100 && charging
    ? formatDuration(60 * BATTERY_CAPACITY_MAH * (1 - level / 100) / -current, t) : null;
  return {
    charging,
    usableTime,
    fullTime,
    percent,
    level: percent ?? (hasVoltage && hasCurrent ? t("暂无估算","Estimate unavailable") : t("未上报","Not reported")),
    voltage: hasVoltage ? voltage.toFixed(3) + " V" : t("未上报","Not reported"),
    current: hasCurrent ? (current > 0 ? "+" : "") + current.toFixed(1) + " mA" : t("未上报","Not reported"),
    state: !hasCurrent ? t("未上报","Not reported") : current <= -1 ? t("净充电","Charging") : current >= 1 ? t("净放电","Discharging") : t("净电流接近零","Near-zero net current"),
    available: hasVoltage || hasCurrent,
    stale,
  };
}
