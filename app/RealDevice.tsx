"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createContext, ReactNode, useContext } from "react";
import { ensureLeafletStyles } from "./leaflet-styles";
import type { CircleZone } from "./custom-zones";
import { useLanguage } from "./language";

export type Location = {
  device_id: string; latitude?: number; longitude?: number;
  source: "gps" | "wifi" | "lte" | "unavailable"; zone_id?: string; zone_name?: string; accuracy_m?: number;
  pdop: number | null; battery_percent: number | null;
  battery_voltage_v?: number | null;
  battery_current_ma?: number | null;
  wifi_status?: "confirmed" | "held"; wifi_age_ms?: number; wifi_confirmed_at?: number;
  status_reason?: "waiting_wifi";
  diagnostics?: { uptime_ms?: number; previous_upload_http?: number | null; previous_upload_error?: string | null; wifi_scan_count?: number | null };
  recorded_at: number; received_at: number; stale: boolean;
};

export function DeviceMap({ location, compact = false, circles }: { location: Location; compact?: boolean; circles: CircleZone[] }) {
  const {lang,t}=useLanguage();
  const element = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet").then(L => {
      if (disposed || !element.current) return;
      ensureLeafletStyles();
      const point: [number, number] = [location.latitude!, location.longitude!];
      map = L.map(element.current, { zoomControl: false, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView(point, location.source === "lte" ? 15 : 17);
      map.attributionControl.setPrefix(false);
      L.control.zoom({zoomInTitle:t("放大","Zoom in"),zoomOutTitle:t("缩小","Zoom out")}).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      if (location.source === "lte" && location.accuracy_m) {
        const circle = L.circle(point, { radius: location.accuracy_m, color: "#d97706", fillOpacity: .15 }).addTo(map);
        map.fitBounds(circle.getBounds(), { padding: [24,24], maxZoom: 16, animate: false });
      } else L.circleMarker(point, { radius: 10, color: "#3949AB", fillOpacity: .8 }).addTo(map);
      for (const zone of circles) {
        const label=document.createElement("span");
        label.textContent=(zone.id==="outdoor_red_circle"&&lang==="en"?"Outdoor danger zone":zone.name)+` · ${zone.radius_m} m`;
        L.circle([zone.latitude,zone.longitude], {radius:zone.radius_m,color:"#dc2626",fillOpacity:.2,weight:2,className:"danger-geofence"}).bindTooltip(label).addTo(map);
      }
    }).catch(() => { if (!disposed) setError("map"); });
    return () => { disposed = true; map?.remove(); };
  }, [location.latitude, location.longitude, location.source, location.accuracy_m, compact, circles, lang]);
  return <div className="relative"><div ref={element} className="w-full rounded-xl" style={{ height: compact ? 250 : 520 }} aria-label={t("鞋子最新上报位置","Latest reported shoe location")} />{error && <p className="text-sm text-amber-700 mt-2" role="status">{t("地图暂时无法加载，请查看下方坐标。","The map could not load. See the coordinates below.")}</p>}</div>;
}

type LiveState = { location: Location | null; status: string; stale: boolean; error: string; connected: boolean; loading: boolean; form: ReactNode; query: () => void; disconnect: () => void };
const LiveContext = createContext<LiveState | null>(null);
export function useLiveDevice() { const state = useContext(LiveContext); if (!state) throw Error("Missing device provider"); return state; }
export default function RealDevice({ children }: { children: ReactNode }) {
  const {lang,t}=useLanguage();
  const [url, setUrl] = useState("https://smartstep-gps.guanleyang007.workers.dev");
  const [device, setDevice] = useState("shoe_001");
  const [token, setToken] = useState("");
  const [connection, setConnection] = useState<{ url: string; device: string; token: string } | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [reachable, setReachable] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!connection) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    async function poll() {
      controller = new AbortController();
      if (!stopped) setLoading(true);
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(connection!.url + "/v2/devices/" + encodeURIComponent(connection!.device) + "/location",
          { headers: { Authorization: "Bearer " + connection!.token }, cache: "no-store", signal: controller.signal });
        if (response.status === 404) { if (!stopped) { setReachable(true); setFailed(false); setStatus(""); setLocation(null); } return; }
        if (!response.ok) throw new Error(response.status === 401 ? "查看凭证不正确，请在设备设置中重新连接。" : "暂时无法读取设备位置，正在自动重试。");
        const data = await response.json() as Location;
        if (!['gps','wifi','lte','unavailable'].includes(data.source) ||
            !Number.isFinite(data.received_at) || !Number.isFinite(data.recorded_at) || data.device_id !== connection!.device ||
            ((data.source === 'gps' || data.source === 'lte') && (typeof data.latitude !== 'number' || !Number.isFinite(data.latitude) || Math.abs(data.latitude)>90 || typeof data.longitude !== 'number' || !Number.isFinite(data.longitude) || Math.abs(data.longitude)>180)) ||
            (data.source === 'wifi' && (typeof data.zone_name !== 'string' || !data.zone_name || (data.wifi_status !== undefined && !['confirmed','held'].includes(data.wifi_status)) || (data.wifi_status === 'held' && (!Number.isFinite(data.wifi_confirmed_at) || !Number.isFinite(data.wifi_age_ms))))) || (data.source === 'lte' && (!Number.isFinite(data.accuracy_m) || !(data.accuracy_m! > 0)))) throw new Error('收到的位置数据不完整，正在重试。');
        if (!stopped) { setLocation(data); setReachable(true); setFailed(false); setStatus(""); }
      } catch (error) {
        if (!stopped) { setFailed(true); setStatus(error instanceof Error && /[\u4e00-\u9fff]/.test(error.message) ? error.message : "连接超时，正在自动重试。"); }
      } finally {
        clearTimeout(timeout);
        if (!stopped) { setLoading(false); timer = setTimeout(poll, 2000); }
      }
    }
    void poll();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stopped = true; clearTimeout(timer); clearInterval(clock); controller?.abort(); };
  }, [connection, refresh]);
  function connect(event: FormEvent) {
    event.preventDefault();
    try {
      const parsed = new URL(url);
      if ((parsed.protocol !== "https:" && !(parsed.protocol === "http:" && parsed.hostname === "localhost")) ||
          parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/")
        throw new Error("请输入服务的 HTTPS 地址，不要包含路径。");
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(device) || token.length < 32) throw new Error("请检查设备编号和查看凭证。");
      setLocation(null); setReachable(false); setFailed(false); setStatus("");
      setConnection({ url: parsed.origin, device, token }); setToken("");
    } catch (error) { setStatus(error instanceof Error && /[\u4e00-\u9fff]/.test(error.message) ? error.message : "请输入服务的 HTTPS 地址，不要包含路径。"); setFailed(true); }
  }
  const stale = !!location && (location.stale || now - location.received_at > 120000 || now - location.recorded_at > 120000 || (location.source === 'wifi' && location.wifi_confirmed_at !== undefined && now-location.wifi_confirmed_at>=120000));
  const connectionStatus = !connection ? t("尚未连接","Not connected") : failed ? t("连接异常","Connection error") : !reachable ? t("正在连接","Connecting") : !location ? t("等待设备上报","Waiting for a device report") : stale ? t("位置已过期","Location is out of date") : location.source === "unavailable" ? t("正在定位","Finding location") : t("设备数据已连接","Device connected");
  const displayedError = lang==="zh" ? status : ({
    "查看凭证不正确，请在设备设置中重新连接。":"Invalid read token. Reconnect in Settings.",
    "暂时无法读取设备位置，正在自动重试。":"Unable to read device location. Retrying automatically.",
    "收到的位置数据不完整，正在重试。":"The location report is incomplete. Retrying.",
    "连接超时，正在自动重试。":"Connection timed out. Retrying automatically.",
    "请输入服务的 HTTPS 地址，不要包含路径。":"Enter the HTTPS service address without a path.",
    "请检查设备编号和查看凭证。":"Check your device ID and read token.",
  } as Record<string,string>)[status] ?? "Unable to connect. Check the device settings and network.";
  const form = <form onSubmit={connect} className="grid gap-4">
    <label className="block text-sm font-semibold text-slate-700">{t("设备编号","Device ID")}<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal" required value={device} onChange={e => setDevice(e.target.value)} autoComplete="off" /></label>
    <label className="block text-sm font-semibold text-slate-700">{t("查看凭证","Read token")}<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal" required type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder={t("粘贴凭证文件中的 read 值","Paste the read value from your credentials file")} /></label>
    <details><summary>{t("高级连接设置","Advanced connection settings")}</summary><label className="block text-sm font-semibold text-slate-700">{t("服务地址","Service address")}<input className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal" required type="url" value={url} onChange={e => setUrl(e.target.value)} /></label></details>
    <button className="rounded-xl bg-[#1A237E] p-3 text-sm font-bold text-white">{connection ? t("重新连接","Reconnect") : t("连接我的 SmartStep","Connect my SmartStep")}<span aria-hidden="true">→</span></button>
    <p className="text-xs text-slate-400">{t("查看凭证仅保留在本次页面会话中，刷新后需要重新输入。","The read token is kept for this page session. Enter it again after reloading.")}</p>
  </form>;
  return <LiveContext.Provider value={{location, status: connectionStatus, stale, error: failed ? displayedError : "", connected: !!connection, loading, form,
    query: () => setRefresh(v => v + 1), disconnect: () => {setConnection(null);setLocation(null);setReachable(false);setFailed(false);setStatus("");setLoading(false);} }}>{children}</LiveContext.Provider>;
}
