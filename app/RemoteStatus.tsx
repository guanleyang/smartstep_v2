"use client";
import { useLanguage, indoorName } from "./language";
import { useLiveDevice } from "./RealDevice";
import { DangerBadge } from "./DangerZones";
import { batteryReadings } from "./battery-readings";


function Row({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-slate-100 py-3 last:border-0"><dt className="text-sm text-slate-500">{label}</dt><dd className="min-w-0 break-words text-right text-sm font-semibold text-slate-800">{value}</dd></div>;
}
export default function RemoteStatus() {
  const {t,lang}=useLanguage();
  const errors: Record<string, string> = {
  upload_config: t("上传配置不完整","Upload configuration incomplete"), lte_unregistered: t("4G未注册","4G not registered"),
  clock_unavailable: t("无法获取校验HTTPS所需的时间","Clock unavailable for HTTPS verification"), tls_setup: t("HTTPS安全连接初始化失败","HTTPS setup failed"),
  http_init: t("上传服务初始化失败","Upload initialization failed"), http_transfer: t("上传命令或数据传输失败","Upload command or data transfer failed"),
  http_timeout: t("等待上传结果超时","Upload result timed out"), http_status: t("服务器或通信模块返回错误状态","Server or modem returned an error"),
};
  const measurement = (value: unknown, max: number, unit: string, digits: number) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value.toFixed(digits) + unit : t("未上报","Not reported");
const date = (value?: number) => typeof value === "number" && Number.isFinite(value) ? new Date(value).toLocaleString(lang==="zh"?"zh-CN":"en-SG") : t("未上报","Not reported");
  const live = useLiveDevice(); const fix = live.location; const d = fix?.diagnostics;
  const battery = batteryReadings(fix,t);
  const age = fix ? Math.max(0, Math.floor((Date.now()-fix.received_at)/1000)) : null;
  const source = fix ? { gps: "GPS", wifi: t("Wi-Fi 室内定位","Wi-Fi indoor location"), lte: t("LTE 预估位置","LTE estimate"), unavailable: t("暂无可用位置","No location available") }[fix.source] : t("未上报","Not reported");
  const deviceError = d && Object.hasOwn(d,"previous_upload_error") ? d.previous_upload_error == null ? d.previous_upload_http == null ? t("尚无上一次上传结果","No previous upload result") : t("上一次上传未报告错误","No error reported for the last upload") : errors[d.previous_upload_error] || t("未知错误代码","Unknown error code") : t("未上报","Not reported");
  return <section aria-label={t("远程状态","Remote status")} className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">{t("远程状态","Remote status")}</h2><button onClick={live.query} disabled={!live.connected||live.loading} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#3949AB] disabled:opacity-40">{live.loading ? t("读取中…","Refreshing…") : t("刷新状态","Refresh status")}</button></div>
    {!live.connected && <p className="text-sm text-slate-500">{t("请先在设置中连接设备。","Connect the device in Settings first.")}</p>}
    {live.error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("页面读取异常：","Read error: ")}{live.error}</p>}
    {live.stale && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("超过2分钟未收到新数据，以下是最后一次上报。设备可能断网或已关机。","No new data for over two minutes. Showing the last report. The device may be offline.")}</p>}
    <DangerBadge/>
    <dl>
      <Row label={t("连接状态","Connection status")} value={live.status}/>
      <Row label={t("设备编号","Device ID")} value={fix?.device_id || t("未上报","Not reported")}/>
      <Row label={t("电池电压","Battery voltage")} value={battery.voltage}/>
      <Row label={t("电池净电流","Net battery current")} value={battery.current}/>
      <Row label={t("电池状态","Battery state")} value={battery.stale && battery.available ? t(`上次上报 · ${battery.state}`, `Last report · ${battery.state}`) : battery.state}/>
      <Row label={t("电量","Battery level")} value={measurement(fix?.battery_percent,100,"%",1)}/>
      <Row label={t("定位方式","Location source")} value={source}/>
      {fix?.source === "wifi" && <Row label={t("室内位置","Indoor location")} value={(fix.zone_name&&indoorName(fix.zone_name,lang)) || t("未上报","Not reported")}/>}
      {fix?.source === "wifi" && <Row label={t("室内位置状态","Indoor location status")} value={fix.wifi_status === "held" ? t("保留上次确认位置","Last confirmed location") : t("已匹配","Matched")}/>}
      {fix?.source === "wifi" && <Row label={t("最后确认时间","Last confirmed")} value={date(fix.wifi_confirmed_at ?? fix.recorded_at)}/>}
      {fix?.source === "gps" && <Row label="PDOP" value={measurement(fix.pdop,100,"",2)}/>}
      <Row label={t("最近上传时间","Last upload")} value={date(fix?.received_at)}/>
      <Row label={t("距最近上传","Time since last upload")} value={age == null ? t("未上报","Not reported") : t(`${age} 秒`,`${age} s`)}/>
      <Row label={t("位置采样时间","Location sampled")} value={date(fix?.recorded_at)}/>
      <Row label={t("上报时运行时长","Uptime at last report")} value={typeof d?.uptime_ms === "number" && Number.isFinite(d.uptime_ms) ? t(`${Math.floor(d.uptime_ms/1000)} 秒`,`${Math.floor(d.uptime_ms/1000)} s`) : t("未上报","Not reported")}/>
      <Row label={t("Wi-Fi扫描数量","Wi-Fi networks scanned")} value={typeof d?.wifi_scan_count === "number" && Number.isFinite(d.wifi_scan_count) ? String(d.wifi_scan_count) : t("未上报","Not reported")}/>
      <Row label={t("上一次上传状态码","Previous upload status code")} value={typeof d?.previous_upload_http === "number" && Number.isFinite(d.previous_upload_http) ? String(d.previous_upload_http) : t("未上报","Not reported")}/>
      <Row label={t("上一次上传错误","Previous upload error")} value={deviceError}/>
    </dl>
    <p className="text-xs leading-relaxed text-slate-500">{t("页面约每2秒读取一次。电池数据需要板子接入测量后上报。断网期间无法传回错误，恢复上传后可查看上一次上传结果。","The page checks about every two seconds. Battery readings require a connected sensor. The device reports its last upload result once it reconnects.")}</p>
  </section>;
}
