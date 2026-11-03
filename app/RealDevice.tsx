"use client";
import { FormEvent, useEffect, useRef, useState } from "react";

type Location = {
  device_id: string; latitude?: number; longitude?: number;
  source: "gps" | "wifi" | "lte" | "unavailable"; zone_name?: string; accuracy_m?: number;
  pdop: number | null; battery_percent: number | null;
  recorded_at: number; received_at: number; stale: boolean;
};

function DeviceMap({ location }: { location: Location }) {
  const element = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet").then(L => {
      if (disposed || !element.current) return;
      if (!document.getElementById("leaflet-css")) {
        const css = document.createElement("link");
        css.id = "leaflet-css"; css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
      }
      const point: [number, number] = [location.latitude!, location.longitude!];
      map = L.map(element.current).setView(point, location.source === "lte" ? 15 : 17);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      if (location.source === "lte" && location.accuracy_m) {
        const circle = L.circle(point, { radius: location.accuracy_m, color: "#d97706", fillOpacity: .15 }).addTo(map);
        map.fitBounds(circle.getBounds(), { padding: [24,24], maxZoom: 16 });
      } else L.circleMarker(point, { radius: 10, color: "#3949AB", fillOpacity: .8 }).addTo(map);
    }).catch(() => { if (!disposed) setError("Map could not load. Coordinates remain available above."); });
    return () => { disposed = true; map?.remove(); };
  }, [location.latitude, location.longitude, location.source, location.accuracy_m]);
  return <><div ref={element} className="h-[65vh] min-h-[420px] w-full rounded-2xl" aria-label="Latest reported shoe location" />{error && <p role="status">{error}</p>}</>;
}

export default function RealDevice({ onDemo }: { onDemo: () => void }) {
  const [url, setUrl] = useState("https://smartstep-gps.guanleyang007.workers.dev");
  const [device, setDevice] = useState("shoe_001");
  const [token, setToken] = useState("");
  const [connection, setConnection] = useState<{ url: string; device: string; token: string } | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [status, setStatus] = useState("Enter your device connection details.");
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!connection) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    async function poll() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(connection!.url + "/v2/devices/" + encodeURIComponent(connection!.device) + "/location",
          { headers: { Authorization: "Bearer " + connection!.token }, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 404 ? "No GPS location received yet." :
          response.status === 401 ? "Read credential rejected." : "Location service unavailable.");
        const data = await response.json() as Location;
        if (!['gps','wifi','lte','unavailable'].includes(data.source) ||
            !Number.isFinite(data.received_at) || !Number.isFinite(data.recorded_at) || data.device_id !== connection!.device ||
            ((data.source === 'gps' || data.source === 'lte') && (typeof data.latitude !== 'number' || Math.abs(data.latitude)>90 || typeof data.longitude !== 'number' || Math.abs(data.longitude)>180)) ||
            (data.source === 'wifi' && !data.zone_name) || (data.source === 'lte' && !(data.accuracy_m! > 0))) throw new Error('Invalid location response.');
        if (!stopped) { setLocation(data); setFailed(false); setStatus("Latest location received"); }
      } catch (error) {
        if (!stopped) { setFailed(true); setStatus(error instanceof Error ? error.message : "Connection failed."); }
      } finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(poll, 5000);
      }
    }
    void poll();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stopped = true; clearTimeout(timer); clearInterval(clock); controller?.abort(); };
  }, [connection]);
  function connect(event: FormEvent) {
    event.preventDefault();
    try {
      const parsed = new URL(url);
      if ((parsed.protocol !== "https:" && !(parsed.protocol === "http:" && parsed.hostname === "localhost")) ||
          parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/")
        throw new Error("Use the HTTPS API origin, for example https://smartstep-gps.example.workers.dev");
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(device) || token.length < 32) throw new Error("Check the device ID and read credential.");
      setLocation(null); setFailed(false); setStatus("Connecting…");
      setConnection({ url: parsed.origin, device, token }); setToken("");
    } catch (error) { setStatus((error as Error).message); }
  }
  const stale = !!location && (location.stale || now - location.received_at > 120000 || now - location.recorded_at > 120000);
  const field = "mt-1 w-full rounded-xl border border-slate-300 p-3 text-slate-900";
  return <main className="min-h-dvh bg-slate-50 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">SmartStep · Real Device</h1><p>GPS + 4G shoe tracking</p></div>
        <button onClick={onDemo} className="rounded-xl border p-3">Open demo dashboard</button>
      </header>
      <form onSubmit={connect} className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="sm:col-span-2">API address<input required type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://smartstep-gps.example.workers.dev" className={field} /></label>
        <label>Device ID<input required value={device} onChange={e => setDevice(e.target.value)} className={field} /></label>
        <label>Read credential<input required type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} className={field} /></label>
        <p className="text-sm text-slate-500 sm:col-span-2">Use the viewer credential. It stays in memory for this session. Device upload credentials belong on the shoe.</p>
        <button className="rounded-xl bg-[#1A237E] p-3 font-bold text-white">Connect</button>
        {connection && <button type="button" className="rounded-xl border p-3" onClick={() => { setConnection(null); setLocation(null); setStatus("Disconnected"); }}>Disconnect</button>}
      </form>
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <p role="status" className="font-semibold">{status}{location && (failed || stale ? " · Last known position — not live" : " · 最新位置")}</p>
        {location ? <>
          <p className="text-sm text-slate-500">更新时间：{new Date(location.recorded_at).toLocaleString()}</p>
          {location.source === 'wifi' ? <div className="rounded-2xl bg-indigo-50 p-8">
            <p className="text-amber-700">GPS信号不稳定，采用室内定位</p>
            <h2 className="mt-4 text-3xl font-bold">{location.zone_name}</h2>
          </div> : location.source === 'unavailable' ? <p>暂无可用位置，正在重新定位。</p> : <>
            <h2 className="text-xl font-bold">{location.source === 'lte' ? '预估位置 · LTE粗定位' : 'GPS定位'}</h2>
            {location.source === 'lte' && <p>估计范围半径约 {Math.round(location.accuracy_m!)} 米；不是精确位置。</p>}
            <DeviceMap location={location} />
            <p className="font-mono text-sm">{location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}</p>
          </>}
        </> : <p>No real position is displayed until your shoe uploads a valid GPS fix.</p>}
      </section>
    </div>
  </main>;
}

