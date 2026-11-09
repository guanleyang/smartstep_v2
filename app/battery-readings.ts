import type { Location } from "./RealDevice";

export function batteryReadings(report: Location | null) {
  const voltage = report?.battery_voltage_v;
  const current = report?.battery_current_ma;
  const hasVoltage = typeof voltage === "number" && Number.isFinite(voltage);
  const hasCurrent = typeof current === "number" && Number.isFinite(current);
  return {
    voltage: hasVoltage ? voltage.toFixed(3) + " V" : "未上报",
    current: hasCurrent ? (current > 0 ? "+" : "") + current.toFixed(1) + " mA" : "未上报",
    state: !hasCurrent ? "未上报" : current <= -1 ? "净充电" : current >= 1 ? "净放电" : "净电流接近零",
    available: hasVoltage || hasCurrent,
    stale: !!report && Date.now() - report.received_at > 120000,
  };
}
