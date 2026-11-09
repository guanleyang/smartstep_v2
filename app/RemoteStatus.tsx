"use client";
import { useLiveDevice } from "./RealDevice";
import { DangerBadge } from "./DangerZones";
import { batteryReadings } from "./battery-readings";

const errors: Record<string, string> = {
  upload_config: "上传配置不完整", lte_unregistered: "4G未注册",
  clock_unavailable: "无法获取校验HTTPS所需的时间", tls_setup: "HTTPS安全连接初始化失败",
  http_init: "上传服务初始化失败", http_transfer: "上传命令或数据传输失败",
  http_timeout: "等待上传结果超时", http_status: "服务器或通信模块返回错误状态",
};
function Row({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-slate-100 py-3 last:border-0"><dt className="text-sm text-slate-500">{label}</dt><dd className="min-w-0 break-words text-right text-sm font-semibold text-slate-800">{value}</dd></div>;
}
const measurement = (value: unknown, max: number, unit: string, digits: number) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value.toFixed(digits) + unit : "未上报";
const date = (value?: number) => typeof value === "number" && Number.isFinite(value) ? new Date(value).toLocaleString() : "未上报";
export default function RemoteStatus() {
  const live = useLiveDevice(); const fix = live.location; const d = fix?.diagnostics;
  const battery = batteryReadings(fix);
  const age = fix ? Math.max(0, Math.floor((Date.now()-fix.received_at)/1000)) : null;
  const source = fix ? { gps: "GPS", wifi: "Wi-Fi 室内定位", lte: "LTE 预估位置", unavailable: "暂无可用位置" }[fix.source] : "未上报";
  const deviceError = d && Object.hasOwn(d,"previous_upload_error") ? d.previous_upload_error == null ? d.previous_upload_http == null ? "尚无上一次上传结果" : "上一次上传未报告错误" : errors[d.previous_upload_error] || "未知错误代码" : "未上报";
  return <section aria-label="远程状态" className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">远程状态</h2><button onClick={live.query} disabled={!live.connected||live.loading} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#3949AB] disabled:opacity-40">{live.loading ? "读取中…" : "刷新状态"}</button></div>
    {!live.connected && <p className="text-sm text-slate-500">请先在 Settings 中连接设备。</p>}
    {live.error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">页面读取异常：{live.error}</p>}
    {live.stale && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">超过2分钟未收到新数据，以下是最后一次上报。设备可能断网或已关机。</p>}
    <DangerBadge/>
    <dl>
      <Row label="连接状态" value={live.status}/>
      <Row label="设备编号" value={fix?.device_id || "未上报"}/>
      <Row label="电池电压" value={battery.voltage}/>
      <Row label="电池净电流" value={battery.current}/>
      <Row label="电池状态" value={battery.stale && battery.available ? `上次上报 · ${battery.state}` : battery.state}/>
      <Row label="电量" value={measurement(fix?.battery_percent,100,"%",1)}/>
      <Row label="定位方式" value={source}/>
      {fix?.source === "wifi" && <Row label="室内位置" value={fix.zone_name || "未上报"}/>}
      {fix?.source === "wifi" && <Row label="室内位置状态" value={fix.wifi_status === "held" ? "保留上次确认位置" : "已匹配"}/>}
      {fix?.source === "wifi" && <Row label="最后确认时间" value={date(fix.wifi_confirmed_at ?? fix.recorded_at)}/>}
      {fix?.source === "gps" && <Row label="PDOP" value={measurement(fix.pdop,100,"",2)}/>}
      <Row label="最近上传时间" value={date(fix?.received_at)}/>
      <Row label="距最近上传" value={age == null ? "未上报" : `${age} 秒`}/>
      <Row label="位置采样时间" value={date(fix?.recorded_at)}/>
      <Row label="上报时运行时长" value={typeof d?.uptime_ms === "number" && Number.isFinite(d.uptime_ms) ? `${Math.floor(d.uptime_ms/1000)} 秒` : "未上报"}/>
      <Row label="Wi-Fi扫描数量" value={typeof d?.wifi_scan_count === "number" && Number.isFinite(d.wifi_scan_count) ? `${d.wifi_scan_count} 个` : "未上报"}/>
      <Row label="上一次上传状态码" value={typeof d?.previous_upload_http === "number" && Number.isFinite(d.previous_upload_http) ? String(d.previous_upload_http) : "未上报"}/>
      <Row label="上一次上传错误" value={deviceError}/>
    </dl>
    <p className="text-xs leading-relaxed text-slate-500">页面约每2秒读取一次。电池数据需要板子接入测量后上报。断网期间无法传回错误，恢复上传后可查看上一次上传结果。</p>
  </section>;
}
