"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import RealDevice from "./RealDevice";

type Tab = "home" | "map" | "alerts" | "settings";
type Detail = "battery" | "device" | null;

type AlertItem = {
  id: number;
  type: "hazard" | "safe" | "battery";
  severity: "CRITICAL" | "WARNING";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const initialAlerts: AlertItem[] = [
  { id: 1, type: "hazard", severity: "CRITICAL", title: "Hazard Zone Alert", message: "Grandpa entered Construction Area", time: "2 min ago", read: false },
  { id: 2, type: "safe", severity: "WARNING", title: "Left Safe Zone", message: "Grandpa left Home", time: "18 min ago", read: false },
];

const Icon = ({ children, className = "" }: { children: string; className?: string }) => (
  <span className={`material-symbols-rounded select-none ${className}`} aria-hidden="true">{children}</span>
);

function Header({ title, onBack, action }: { title: string; onBack?: () => void; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 text-slate-900 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        {onBack && <button onClick={onBack} className="icon-button" aria-label="Go back"><Icon>arrow_back</Icon></button>}
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}

function Card({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <section 
      onClick={onClick} 
      className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,.04)] ${
        onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3949AB]" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-semibold text-slate-800">{children}</span>
  </div>
);

function PageBanner({ eyebrow, title, description, icon, children }: { eyebrow: string; title: string; description: string; icon: string; children?: React.ReactNode }) {
  return (
    <section className="page-banner relative overflow-hidden rounded-2xl bg-[#111858] p-5 sm:p-8 flex flex-col md:flex-row gap-5 items-start md:items-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white/10 text-white shrink-0"><Icon className="text-3xl">{icon}</Icon></div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-indigo-200">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-100">{description}</p>
      </div>
      {children && <div>{children}</div>}
    </section>
  );
}

function Login({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState("demo@smartstep.com");
  const submit = (e: FormEvent) => { e.preventDefault(); onLogin(email || "demo@smartstep.com"); };
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#111858] via-[#1A237E] to-[#4A5BC4] p-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[28px] bg-white px-7 py-9 shadow-2xl shadow-indigo-950/40">
        <div className="mx-auto mb-5 grid size-20 place-items-center rounded-[22px] bg-gradient-to-br from-[#1A237E] to-[#4A5BC4] text-white shadow-xl shadow-indigo-900/25"><Icon className="text-[42px]">directions_walk</Icon></div>
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-[#1A237E]">SmartStep</h1>
        <p className="mb-7 mt-1 text-center text-xs text-slate-500">Smart Safety Shoe Monitoring</p>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="email">Email</label>
        <input id="email" value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3949AB] focus:bg-white focus:ring-1 focus:ring-[#3949AB]" placeholder="Enter your email" />
        <label className="block mt-4 text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="password">Password</label>
        <input id="password" defaultValue="demo1234" type="password" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3949AB] focus:bg-white focus:ring-1 focus:ring-[#3949AB]" placeholder="Enter your password" />
        <button className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#1A237E] to-[#3949AB] py-3.5 font-bold text-white shadow-lg shadow-indigo-900/20 active:scale-[.98] transition-transform">Login</button>
        <button type="button" onClick={() => onLogin(email)} className="w-full py-3 text-sm font-semibold text-[#1A237E] mt-2">Create new account</button>
        <div className="mt-2 flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-slate-500"><Icon className="text-lg text-blue-500">info</Icon><span>Demo mode is active. Use any email and password to login.</span></div>
      </form>
    </main>
  );
}

function ActivityChart({ className = "" }: { className?: string }) {
  const values = [32, 45, 38, 62, 54, 78, 68, 86, 73, 91, 76, 82];
  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="mb-5 flex items-start justify-between">
        <div><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Movement activity</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Today&apos;s activity</h3></div>
        <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-[#3949AB]">5,842 steps</span>
      </div>
      <div className="flex h-36 items-end gap-2 sm:gap-3 flex-1">
        {values.map((v, i) => (
          <div key={i} className="group flex h-full flex-1 items-end">
            <div title={`${v}% activity`} className={`w-full rounded-t-md transition group-hover:bg-[#3949AB] ${i === 9 ? "bg-[#3949AB]" : "bg-slate-100"}`} style={{ height: `${v}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] font-semibold text-slate-400"><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>Now</span></div>
    </Card>
  );
}

function QuickActions({ setTab, setDetail }: { setTab: (t: Tab) => void; setDetail: (d: Detail) => void }) {
  const download = () => {
    const csv = "time,battery,latitude,longitude,status\nNow,78,1.34400,103.68200,Safe";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "smartstep-report.csv"; link.click(); URL.revokeObjectURL(url);
  };
  const actions = [
    ["my_location", "Locate wearer", () => setTab("map")],
    ["battery_charging_full", "Battery details", () => setDetail("battery")],
    ["download", "Export report", download],
    ["tune", "Configure device", () => setTab("settings")],
  ] as const;
  
  return (
    <Card className="h-full flex flex-col">
      <div className="mb-4"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Quick actions</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Device controls</h3></div>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {actions.map(([icon, label, action]) => (
          <button key={label} onClick={action} className="flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3949AB]">
            <Icon className="text-2xl text-[#3949AB] mb-4">{icon}</Icon>
            <span className="text-xs font-bold text-slate-700">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ZoneSummary({ setTab }: { setTab: (t: Tab) => void }) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between">
        <div><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Geofencing</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Safety zones</h3></div>
        <button onClick={() => setTab("settings")} className="text-xs font-bold text-[#3949AB] hover:underline">Manage</button>
      </div>
      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3"><div className="grid size-9 place-items-center rounded-lg bg-white text-emerald-600"><Icon>home</Icon></div><div className="flex-1"><p className="text-sm font-bold text-slate-800">Home</p><p className="text-xs text-slate-500">Safe zone · 200 m</p></div><span className="text-xs font-bold text-emerald-600">Inside</span></div>
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3"><div className="grid size-9 place-items-center rounded-lg bg-white text-red-600"><Icon>construction</Icon></div><div className="flex-1"><p className="text-sm font-bold text-slate-800">Construction Area</p><p className="text-xs text-slate-500">Hazard · 150 m</p></div><span className="text-xs font-bold text-slate-400">1.2 km</span></div>
      </div>
    </Card>
  );
}

function Home({ name, battery, alerts, setTab, setDetail }: { name: string; battery: number; alerts: AlertItem[]; setTab: (t: Tab) => void; setDetail: (d: Detail) => void }) {
  const unread = alerts.filter(a => !a.read).length;
  return (
    <>
      <Header title="Overview" action={
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:flex"><span className="live-dot size-2 rounded-full bg-emerald-500 animate-pulse" />Live data</div>
          <button onClick={() => setTab("alerts")} className="grid size-10 place-items-center rounded-full hover:bg-slate-100 transition relative" aria-label="Alerts">
            <Icon>notifications</Icon>
            {unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-red-500 text-[9px] font-bold text-white">{unread}</span>}
          </button>
        </div>
      } />
      <div className="mx-auto max-w-[1500px] p-3.5 sm:p-6 lg:p-8">
        <div className="mb-7 hidden items-center justify-between gap-4 sm:flex">
          <div><p className="text-sm font-medium text-slate-500">Good afternoon,</p><h2 className="text-2xl font-extrabold capitalize tracking-tight sm:text-3xl text-slate-900">{name}</h2><p className="mt-1 hidden text-sm text-slate-500 sm:block">Everything is connected and Grandpa is currently inside a safe zone.</p></div>
          <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs font-bold text-slate-700">Administrator</p><p className="text-[11px] text-slate-400">SmartStep workspace</p></div><div className="grid size-12 place-items-center rounded-2xl border border-indigo-100 bg-white text-lg font-bold text-[#1A237E] shadow-sm sm:size-14">{name[0]?.toUpperCase()}</div></div>
        </div>

        <section className="relative mb-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#111858] via-[#202a82] to-[#5264d8] p-5 text-white shadow-[0_18px_42px_rgba(26,35,126,.22)] sm:hidden">
          <div className="absolute -right-12 -top-14 size-40 rounded-full border border-white/10 bg-white/5" />
          <div className="absolute -bottom-16 right-12 size-32 rounded-full border border-white/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-200">Good afternoon</p>
              <h2 className="mt-1 text-2xl font-black capitalize tracking-tight">{name}</h2>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-100"><span className="live-dot size-2 rounded-full bg-emerald-400" />All systems connected</div>
            </div>
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-lg font-black backdrop-blur">{name[0]?.toUpperCase()}</div>
          </div>
          <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/10 py-3 backdrop-blur-sm">
            <div className="px-3"><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-200">Wearer</p><p className="mt-1 truncate text-sm font-extrabold">Grandpa</p></div>
            <div className="px-3"><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-200">Battery</p><p className="mt-1 text-sm font-extrabold">{battery}%</p></div>
            <div className="px-3"><p className="text-[9px] font-bold uppercase tracking-wider text-indigo-200">Status</p><p className="mt-1 flex items-center gap-1 text-sm font-extrabold text-emerald-300"><Icon className="text-sm">verified</Icon>Safe</p></div>
          </div>
        </section>

        {/* 响应式网格布局 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:gap-6">
          
          <Card onClick={() => setDetail("device")} className="col-span-1 hidden min-h-[176px] sm:block">
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="flex items-start gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500 text-white"><Icon>check</Icon></div>
              <div className="flex-1"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Device status</p><p className="text-xl font-extrabold text-emerald-600">Online</p><p className="text-xs text-slate-400">Last updated: just now</p></div>
              <Icon className="text-slate-300">chevron_right</Icon>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">Bluetooth signal</span><span className="font-bold text-slate-700">Excellent · −48 dBm</span></div>
            </div>
          </Card>

          <Card onClick={() => setDetail("battery")} className="col-span-1 hidden min-h-[176px] sm:block">
            <div className="flex items-center justify-between"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Battery</p><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">Good</span></div>
            <div className="mt-3 flex items-end justify-between"><div className="text-4xl font-black tracking-tight text-emerald-600">{battery}%</div><span className="text-xs font-semibold text-slate-500">≈ {(battery * .22).toFixed(1)}h remaining</span></div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${battery}%` }} /></div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">3.86 V</span><span className="text-slate-500">31.2°C</span><span className="font-bold text-slate-700">Not charging</span></div>
          </Card>

          <Card className="col-span-1 hidden min-h-[176px] sm:block">
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="flex items-start gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon>shield</Icon></div>
              <div className="flex-1"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Safety status</p><p className="text-xl font-extrabold text-emerald-600">Safe</p><p className="text-xs text-slate-400">User is inside Safe Zone</p></div><span className="live-dot mt-2 size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs"><span className="text-slate-500">Current zone</span><span className="font-bold text-slate-700">Home · 200 m</span></div>
            </div>
          </Card>

          {unread > 0 && (
            <button onClick={() => setTab("alerts")} className="col-span-1 md:col-span-2 lg:col-span-3 flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-left text-sm font-bold text-red-600 hover:bg-red-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
              <Icon>notification_important</Icon><span className="flex-1">{unread} unread alerts require attention</span><span>View ›</span>
            </button>
          )}

          <Card onClick={() => setTab("map")} className="col-span-1 md:col-span-2 lg:col-span-1 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Current location</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-[#1A237E]"><Icon>location_on</Icon></div>
                <div><p className="text-sm font-semibold text-slate-800">1.3440, 103.6820</p><p className="text-xs text-slate-400">Accuracy: 5.4 m · Speed: 1.2 m/s</p></div>
              </div>
            </div>
            <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-100 py-2.5 text-sm font-bold text-[#1A237E] bg-indigo-50 hover:bg-indigo-100 transition">
              <Icon className="text-lg">map</Icon>View Live Map
            </button>
          </Card>

          <ActivityChart className="col-span-1 md:col-span-2 lg:col-span-2" />
          
          <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <QuickActions setTab={setTab} setDetail={setDetail} />
            <ZoneSummary setTab={setTab} />
          </div>

        </div>
      </div>
    </>
  );
}

function MapPage({ onBack, battery }: { onBack: () => void; battery: number }) {
  const [history, setHistory] = useState(false);
  const [filter, setFilter] = useState("1h");
  const mapElement = useRef<HTMLDivElement>(null);
  const wearerMarker = useRef<import("leaflet").Marker | null>(null);
  
  useEffect(() => {
    if (!mapElement.current) return;
    let disposed = false;
    let mapInstance: import("leaflet").Map | undefined;
    
    void import("leaflet").then(L => {
      if (disposed || !mapElement.current) return;
      
      // 添加基础 CSS 支持（避免无外链 CSS 时样式错乱）
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const current: [number, number] = [1.344, 103.682];
      mapInstance = L.map(mapElement.current, {
        zoomControl: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      }).setView(current, 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mapInstance);
      L.control.zoom({ position: "bottomright" }).addTo(mapInstance);
      
      L.circle([1.344, 103.682], { radius: 200, color: "#10b981", fillColor: "#34d399", fillOpacity: .13, weight: 2 }).bindPopup("<strong>Home Safe Zone</strong><br>200 m radius").addTo(mapInstance);
      L.circle([1.347, 103.687], { radius: 150, color: "#ef4444", fillColor: "#f87171", fillOpacity: .14, weight: 2 }).bindPopup("<strong>Construction Area</strong><br>High-risk zone").addTo(mapInstance);
      L.polyline([[1.3428,103.6805],[1.3432,103.6811],[1.344,103.682],[1.3448,103.6832],[1.3454,103.684]], { color: "#3949ab", weight: 4, opacity: .75, dashArray: "8 8" }).addTo(mapInstance);
      
      // Marker 图标自定义
      const personIcon = L.divIcon({ 
        className: "bg-transparent border-0", 
        html: `<div class="bg-white border-2 border-[#1A237E] rounded-full p-1 shadow-lg text-center flex flex-col items-center justify-center size-12 text-[#1A237E]"><span class="material-symbols-rounded text-xl">directions_walk</span><span data-wearer-battery class="text-[10px] font-bold block leading-none">${battery}%</span></div>`, 
        iconSize: [48, 48], 
        iconAnchor: [24, 24] 
      });
      wearerMarker.current = L.marker(current, { icon: personIcon })
        .bindPopup(`<strong>Grandpa</strong><br>Battery ${battery}%<br>Accuracy 5.4 m`)
        .addTo(mapInstance);
    });
    
    // 清理函数优化
    return () => { 
      disposed = true; 
      wearerMarker.current = null;
      if (mapInstance) {
        mapInstance.stop();
        mapInstance.closePopup();
        mapInstance.off();
        mapInstance.remove();
      }
    };
    // The Leaflet instance must only be created once for this mounted page.
    // Battery changes are applied by the lightweight effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    wearerMarker.current?.setPopupContent(`<strong>Grandpa</strong><br>Battery ${battery}%<br>Accuracy 5.4 m`);
    const batteryLabel = mapElement.current?.querySelector<HTMLElement>("[data-wearer-battery]");
    if (batteryLabel) batteryLabel.textContent = `${battery}%`;
  }, [battery]);

  return (
    <div className="flex flex-col h-dvh bg-[#e9edf2]">
      <Header title="Live Map" onBack={onBack} action={<button onClick={() => setHistory(!history)} className={`grid size-10 place-items-center rounded-full transition ${history ? "bg-[#1A237E] text-white" : "hover:bg-slate-100"}`} aria-label="Toggle route history"><Icon>route</Icon></button>} />
      {history && (
        <div className="flex items-center gap-3 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 shadow-sm shrink-0">
          <span className="flex items-center gap-2 whitespace-nowrap text-xs font-bold text-slate-500"><Icon className="text-lg text-[#3949AB]">history</Icon>Route period</span>
          {["1h", "6h", "Today", "Yesterday"].map(x => <button key={x} onClick={() => setFilter(x)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter === x ? "bg-[#1A237E] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{x}</button>)}
        </div>
      )}
      <div className="relative flex-1">
        <div ref={mapElement} className="absolute inset-0 z-0" aria-label="Live location map" />
        
        <div className="pointer-events-none absolute left-4 top-4 z-[500] grid gap-2 sm:left-6 sm:top-6 sm:grid-cols-3">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur shadow-sm rounded-xl py-2 px-3 border border-slate-200/50"><Icon className="text-emerald-600">person_pin_circle</Icon><div className="flex flex-col leading-tight"><small className="text-[10px] text-slate-400 font-bold uppercase">Wearer</small><strong className="text-xs text-slate-700">Grandpa</strong></div></div>
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur shadow-sm rounded-xl py-2 px-3 border border-slate-200/50"><Icon className="text-[#3949AB]">battery_6_bar</Icon><div className="flex flex-col leading-tight"><small className="text-[10px] text-slate-400 font-bold uppercase">Battery</small><strong className="text-xs text-slate-700">{battery}% · Good</strong></div></div>
        </div>
        
        <div className="absolute bottom-5 left-4 right-4 z-[500] rounded-2xl border border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur sm:left-6 sm:right-auto sm:w-[380px]">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-[#1A237E]"><Icon>location_on</Icon></div>
            <div className="min-w-0 flex-1"><p className="font-extrabold text-slate-800">Grandpa&apos;s current location</p><p className="truncate text-xs text-slate-500">Nanyang Avenue, Singapore · 1.34400, 103.68200</p></div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">Safe</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Alerts({ alerts, setAlerts }: { alerts: AlertItem[]; setAlerts: React.Dispatch<React.SetStateAction<AlertItem[]>> }) {
  const unread = alerts.some(a => !a.read);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");
  const visible = alerts.filter(a => filter === "all" || (filter === "unread" ? !a.read : a.severity === "CRITICAL"));
  
  return (
    <>
      <Header title="Alerts" action={unread && <button onClick={() => setAlerts(xs => xs.map(x => ({ ...x, read: true })))} className="grid size-10 place-items-center rounded-full hover:bg-slate-100 text-slate-600" aria-label="Mark all read"><Icon>done_all</Icon></button>} />
      <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
        
        <PageBanner eyebrow="Safety events" title="Alert centre" description="Review events that may require attention and keep the entire care team informed." icon="notifications_active">
          <button onClick={() => setAlerts(xs=>xs.map(x=>({...x,read:true})))} className="flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 transition px-4 py-2.5 text-sm font-bold text-white backdrop-blur">
            <Icon className="text-lg">done_all</Icon>Mark all read
          </button>
        </PageBanner>
        
        <div className="my-6 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100"><span className="grid size-12 place-items-center rounded-xl bg-indigo-50 text-[#3949AB]"><Icon>notifications</Icon></span><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">All events</p><b className="text-xl text-slate-800">{alerts.length}</b></div></div>
          <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100"><span className="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600"><Icon>mark_email_unread</Icon></span><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Unread</p><b className="text-xl text-slate-800">{alerts.filter(a=>!a.read).length}</b></div></div>
          <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100"><span className="grid size-12 place-items-center rounded-xl bg-red-50 text-red-600"><Icon>emergency_home</Icon></span><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Critical</p><b className="text-xl text-slate-800">{alerts.filter(a=>a.severity==="CRITICAL").length}</b></div></div>
        </div>
        
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg font-extrabold text-slate-800">Recent events</h3><p className="text-sm text-slate-500">Select an alert to acknowledge it.</p></div>
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["all", "unread", "critical"] as const).map(x => (
              <button key={x} onClick={() => setFilter(x)} className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition ${filter === x ? "bg-[#1A237E] text-white shadow" : "text-slate-500 hover:bg-slate-50"}`}>{x}</button>
            ))}
          </div>
        </div>

        {/* 空状态处理 */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center bg-slate-50/50">
            <div className="grid size-14 place-items-center rounded-full bg-slate-100 text-slate-400 mb-4"><Icon className="text-3xl">check_circle</Icon></div>
            <p className="text-base font-bold text-slate-700">No alerts found</p>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Everything is looking safe and secure based on your current filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map(a => {
              const critical = a.severity === "CRITICAL";
              return (
                <button key={a.id} onClick={() => setAlerts(xs => xs.map(x => x.id === a.id ? { ...x, read: true } : x))} className={`flex w-full gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3949AB] ${a.read ? "border-slate-200 bg-white hover:border-slate-300" : critical ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${critical ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}><Icon>{a.type === "hazard" ? "dangerous" : "shield"}</Icon></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start"><p className="font-bold text-slate-900">{a.title}</p>{!a.read && <span className={`ml-auto mt-1.5 size-2 rounded-full ${critical ? "bg-red-500" : "bg-amber-500"}`} />}</div>
                    <p className="mt-1 text-sm text-slate-600">{a.message}</p>
                    <div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500 font-medium">{a.time}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{a.severity}</span></div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) { 
  return (
    <button onClick={onChange} className={`relative h-7 w-12 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3949AB] ${value ? "bg-[#3949AB]" : "bg-slate-300"}`} role="switch" aria-checked={value}>
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${value ? "left-6" : "left-1"}`} />
    </button>
  ); 
}

function Settings({ name, email, onLogout, setDetail }: { name: string; email: string; onLogout: () => void; setDetail: (d: Detail) => void }) {
  const [notifs, setNotifs] = useState({ push: true, hazard: true, battery: true, offline: true });
  const [freq, setFreq] = useState("30s");
  const [demo, setDemo] = useState(true);
  
  const setting = (key: keyof typeof notifs, title: string, icon: string) => (
    <div className="flex items-center gap-3 p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
      <div className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon>{icon}</Icon></div>
      <span className="flex-1 text-sm font-semibold text-slate-800">{title}</span>
      <Toggle value={notifs[key]} onChange={() => setNotifs(v => ({ ...v, [key]: !v[key] }))} />
    </div>
  );
  
  return (
    <>
      <Header title="Settings" />
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <PageBanner eyebrow="Workspace controls" title="Settings & preferences" description="Manage the connected device, safety boundaries, tracking behaviour and the alerts you receive." icon="tune">
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white backdrop-blur"><span className="mr-2 inline-block size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />All services online</div>
        </PageBanner>
        
        <div className="grid gap-6 mt-8 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <p className="mb-3 text-sm font-bold text-slate-500 uppercase tracking-wider">Device</p>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button onClick={() => setDetail("device")} className="flex w-full items-center gap-3 p-4 text-left border-b border-slate-100 hover:bg-slate-50 transition focus-visible:bg-slate-50 outline-none">
                <div className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon>directions_walk</Icon></div>
                <div className="flex-1"><p className="text-sm font-semibold text-slate-800">SmartStep #001</p><p className="text-xs text-emerald-600">● Connected</p></div>
                <Icon className="text-slate-400">chevron_right</Icon>
              </button>
              <div className="flex items-center gap-3 p-4">
                <div className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon>person</Icon></div>
                <div><p className="text-sm font-semibold text-slate-800">Wearer</p><p className="text-xs text-slate-500">Grandpa</p></div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <p className="mb-3 text-sm font-bold text-slate-500 uppercase tracking-wider">Notifications</p>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {setting("push", "Push Notifications", "notifications")}
              {setting("hazard", "Hazard Alerts", "warning")}
              {setting("battery", "Battery Alerts", "battery_alert")}
              {setting("offline", "Device Offline Alerts", "wifi_off")}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:col-span-2">
            <div>
              <p className="mb-3 text-sm font-bold text-slate-500 uppercase tracking-wider">Tracking Frequency</p>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="grid grid-cols-4 gap-2">
                  {["10s", "30s", "1min", "5min"].map(x => <button key={x} onClick={() => setFreq(x)} className={`rounded-full py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3949AB] ${freq === x ? "bg-[#1A237E] text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{x}</button>)}
                </div>
              </div>
            </div>
            
            <div>
              <p className="mb-3 text-sm font-bold text-slate-500 uppercase tracking-wider">Data Source</p>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                <div className="grid grid-cols-2 gap-2">
                  {[[true, "Demo Mode"], [false, "Real Device"]] .map(([v, x]) => <button key={x as string} onClick={() => setDemo(v as boolean)} className={`rounded-full py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3949AB] ${demo === v ? "bg-[#1A237E] text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{x as string}</button>)}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <p className="mb-3 text-sm font-bold text-slate-500 uppercase tracking-wider">Account</p>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-4 p-4 border-b border-slate-100">
                <div className="grid size-12 place-items-center rounded-full bg-indigo-50 font-bold text-lg uppercase text-[#1A237E]">{name[0]}</div>
                <div><p className="text-base font-semibold capitalize text-slate-800">{name}</p><p className="text-sm text-slate-500">{email}</p></div>
              </div>
              <button onClick={onLogout} className="flex w-full items-center gap-3 p-4 text-left text-red-600 hover:bg-red-50 transition focus-visible:bg-red-50 outline-none">
                <div className="grid size-10 place-items-center rounded-lg bg-red-100 text-red-600"><Icon>logout</Icon></div>
                <span className="text-sm font-bold">Logout securely</span>
              </button>
            </div>
          </div>
        </div>
        
        <p className="mt-12 text-center text-xs text-slate-400">SmartStep Web Platform · Version 1.0.2</p>
      </div>
    </>
  );
}

function DetailPage({ detail, battery, onClose, setDetail }: { detail: Exclude<Detail, null>; battery: number; onClose: () => void; setDetail: (d: Detail) => void }) {
  const batteryView = detail === "battery";
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#F4F6FA] animate-in slide-in-from-bottom-8 duration-300">
      <Header title={batteryView ? "Battery health" : "Device profile"} onBack={onClose} />
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {batteryView ? (
          <>
            <div className="mb-6 rounded-3xl bg-[#111858] p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8 shadow-xl text-center md:text-left">
              <div className="flex-1">
                <p className="text-sm font-bold text-indigo-200 tracking-wider">SMARTSTEP #001</p>
                <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Battery is healthy</h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-indigo-100">Estimated to last another {(battery * .22).toFixed(1)} hours at the current activity level before requiring a charge.</p>
              </div>
              <div className="relative grid size-40 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#34d399 ${battery * 3.6}deg,rgba(255,255,255,.15) 0)` }}>
                <div className="grid size-32 place-items-center rounded-full bg-[#1A237E] text-center shadow-inner">
                  <div>
                    <Icon className="text-4xl text-emerald-300 mb-1">battery_6_bar</Icon>
                    <p className="text-4xl font-black text-white tracking-tighter">{battery}%</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:gap-6">
              <Card><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400 mb-4">Electrical</p><InfoRow label="Level"><span className="text-emerald-600 text-lg">{battery}%</span></InfoRow><InfoRow label="Voltage">3.86 V</InfoRow><InfoRow label="Current draw">194 mA</InfoRow></Card>
              <Card><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400 mb-4">Health</p><InfoRow label="Temperature">31.2°C</InfoRow><InfoRow label="State">Not charging</InfoRow><InfoRow label="Est. Remaining">{(battery * .22).toFixed(1)}h</InfoRow></Card>
              <Card className="md:col-span-2 lg:col-span-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Discharge trend</p>
                <div className="mt-6 flex h-32 items-end gap-2">
                  {[95,91,88,86,83,81,78].map((v,i)=><div key={v} className="flex flex-1 flex-col items-center gap-2 group"><div className="w-full rounded-t bg-gradient-to-t from-[#3949AB] to-indigo-300 transition-all group-hover:opacity-80" style={{height:`${v}%`}}/><span className="text-[10px] text-slate-400 font-bold">{i*2}h</span></div>)}
                </div>
              </Card>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 rounded-3xl bg-[#111858] p-6 sm:p-10 flex flex-col md:flex-row items-center gap-6 shadow-xl">
              <div className="grid size-24 shrink-0 place-items-center rounded-[28px] bg-white/10 text-white backdrop-blur"><Icon className="text-5xl">directions_walk</Icon></div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h2 className="text-3xl font-black text-white">SmartStep #001</h2>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur">● Online</span>
                </div>
                <p className="mt-2 text-sm text-indigo-100">Assigned to Grandpa · Connected via Bluetooth Gateway</p>
              </div>
              <button onClick={() => setDetail("battery")} className="w-full md:w-auto rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#1A237E] hover:bg-slate-100 transition active:scale-95 shadow-lg">View battery</button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 xl:gap-6">
              <Card><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400 mb-4">Connectivity</p><InfoRow label="Status"><span className="text-emerald-600 font-bold">Online</span></InfoRow><InfoRow label="Gateway">Phone BT-Link</InfoRow><InfoRow label="Signal">Excellent · −48 dBm</InfoRow><InfoRow label="Last sync">Just now</InfoRow></Card>
              <Card onClick={() => setDetail("battery")}><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400 mb-4 flex justify-between">Battery <Icon className="text-base text-slate-400">open_in_new</Icon></p><InfoRow label="Level"><span className="text-emerald-600 font-bold">{battery}%</span></InfoRow><InfoRow label="Voltage">3.86 V</InfoRow><InfoRow label="Temperature">31.2°C</InfoRow><InfoRow label="Estimated">{(battery*.22).toFixed(1)}h</InfoRow></Card>
              <Card className="md:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Latest location</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Nanyang Avenue, Singapore</h3></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">Inside Safe zone</span>
                </div>
                <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-4">
                  <div><p className="text-xs text-slate-500 mb-1">Latitude</p><b className="text-slate-800 font-mono">1.34400</b></div>
                  <div><p className="text-xs text-slate-500 mb-1">Longitude</p><b className="text-slate-800 font-mono">103.68200</b></div>
                  <div><p className="text-xs text-slate-500 mb-1">Accuracy</p><b className="text-slate-800">5.4 m</b></div>
                  <div><p className="text-xs text-slate-500 mb-1">Speed</p><b className="text-slate-800">1.2 m/s</b></div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab, unread }: { tab: Tab; setTab: (t: Tab) => void; unread: number }) {
  const tabs: [Tab, string, string][] = [["home", "home", "Home"], ["map", "map", "Map"], ["alerts", "notifications", "Alerts"], ["settings", "settings", "Settings"]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] border-t border-slate-200/80 bg-white/95 backdrop-blur shadow-[0_-4px_24px_rgba(15,23,42,.06)] md:hidden pb-safe">
      {tabs.map(([id, icon, label]) => (
        <button key={id} onClick={() => setTab(id)} className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${tab === id ? "text-[#1A237E]" : "text-slate-400 hover:text-slate-600"}`}>
          <Icon className={`text-2xl transition-transform ${tab === id ? "scale-110" : ""}`}>{icon}</Icon>
          {label}
          {id === "alerts" && unread > 0 && <span className="absolute right-[22%] top-1.5 grid min-w-[18px] h-[18px] place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] text-white leading-none shadow-sm">{unread}</span>}
        </button>
      ))}
    </nav>
  );
}

function SideNav({ tab, setTab, unread, name, collapsed, onToggle, onLogout }: { tab: Tab; setTab: (t: Tab) => void; unread: number; name: string; collapsed: boolean; onToggle: () => void; onLogout: () => void }) {
  const tabs: [Tab, string, string][] = [["home", "grid_view", "Overview"], ["map", "map", "Live Map"], ["alerts", "notifications", "Alerts"], ["settings", "settings", "Settings"]];
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#111858] px-3 py-6 text-white shadow-2xl transition-[width] duration-300 ${collapsed ? "w-[76px]" : "w-64"}`}>
      <div className={`mb-8 flex items-center px-2 ${collapsed ? "flex-col gap-3" : "gap-3"}`}>
        <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#1A237E] to-[#4A5BC4] shadow-inner border border-white/10"><Icon className="text-2xl">directions_walk</Icon></div>
        {!collapsed && <div className="min-w-0 overflow-hidden"><p className="text-xl font-extrabold tracking-tight truncate">SmartStep</p><p className="truncate text-[9px] uppercase tracking-[.18em] text-indigo-300">Safety Platform</p></div>}
        <button onClick={onToggle} className={`grid size-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:scale-105 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${collapsed ? "" : "ml-auto"}`} aria-label={collapsed?"Expand navigation":"Collapse navigation"}>
          <Icon className="text-lg">{collapsed?"chevron_right":"chevron_left"}</Icon>
        </button>
      </div>
      
      <nav className="space-y-1.5">
        {tabs.map(([id, icon, label]) => (
          <button title={collapsed?label:undefined} key={id} onClick={() => setTab(id)} className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${tab === id ? "bg-white text-[#1A237E] shadow-lg" : "text-indigo-100 hover:bg-white/10"}`}>
            <Icon className="shrink-0">{icon}</Icon>
            {!collapsed && label}
            {id === "alerts" && unread > 0 && <span className={`${collapsed ? "absolute right-2 top-2" : "ml-auto"} rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white shadow-sm font-bold leading-none`}>{unread}</span>}
          </button>
        ))}
      </nav>
      
      <div className="mt-auto space-y-3 pt-6 border-t border-white/10">
        <button onClick={onLogout} title="Logout" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-red-500/20 hover:text-red-200 outline-none focus-visible:ring-2 focus-visible:ring-red-400">
          <Icon className="shrink-0 text-lg">logout</Icon>
          {!collapsed && "Logout"}
        </button>
        <div className={`rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all ${collapsed ? "p-2" : "p-3"}`}>
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-50 font-bold uppercase text-[#1A237E]">{name[0]}</div>
            {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-bold capitalize text-white">{name}</p><p className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold">Admin</p></div>}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function SmartStepApp() {
  const [realDevice, setRealDevice] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("demo@smartstep.com");
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<Detail>(null);
  const [battery, setBattery] = useState(78);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [navCollapsed, setNavCollapsed] = useState(false);
  
  const name = useMemo(() => email.split("@")[0] || "demo", [email]);

  // Register the installable mobile web app shell.
  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.VITE_DISABLE_SERVICE_WORKER === "true") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => { void navigator.serviceWorker.register("/sw.js"); };
    window.addEventListener("load", register);
    if (document.readyState === "complete") register();
    return () => window.removeEventListener("load", register);
  }, []);
  
  // 模拟电池消耗
  useEffect(() => { 
    if (realDevice || !loggedIn) return;
    const id = window.setInterval(() => setBattery(v => v <= 10 ? 95 : v - 1), 5000); 
    return () => window.clearInterval(id); 
  }, [loggedIn, realDevice]);
  
  // 屏幕缩小自动折叠侧边栏
  useEffect(() => { 
    const handleResize = () => { if (window.innerWidth < 1024) setNavCollapsed(true); };
    handleResize(); // 初始检查
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (realDevice) return <RealDevice onDemo={() => setRealDevice(false)} />;
  if (!loggedIn) return <Login onLogin={value => { setEmail(value); setLoggedIn(true); }} />;
  
  const unread = alerts.filter(a => !a.read).length;

  return (
    // 移动端预留底部导航高度 pb-[68px]
    <main className="min-h-dvh bg-[#F0F2F5] pb-[68px] md:pb-0">
      <div className="relative z-[80] bg-amber-100 p-3 text-center text-sm text-slate-900">Demo data · <button className="font-bold underline" onClick={() => { setDetail(null); setRealDevice(true); }}>Connect real GPS device</button></div>
      
      {/* 桌面侧边栏：移动端隐藏 */}
      <div className="hidden md:block">
        <SideNav 
          tab={tab} setTab={setTab} unread={unread} name={name} 
          collapsed={navCollapsed} onToggle={() => setNavCollapsed(v=>!v)} 
          onLogout={() => { setLoggedIn(false); setTab("home"); }} 
        />
      </div>
      
      {/* 移动端底部导航：桌面端隐藏 */}
      <BottomNav tab={tab} setTab={setTab} unread={unread} />

      {/* 主内容区域，根据侧边栏状态调整左边距 */}
      <div className={`min-h-dvh transition-[margin] duration-300 ${navCollapsed ? "md:ml-[76px]" : "md:ml-64"}`}>
        {tab === "home" && <Home name={name} battery={battery} alerts={alerts} setTab={setTab} setDetail={setDetail} />}
        {tab === "map" && <MapPage onBack={() => setTab("home")} battery={battery} />}
        {tab === "alerts" && <Alerts alerts={alerts} setAlerts={setAlerts} />}
        {tab === "settings" && <Settings name={name} email={email} setDetail={setDetail} onLogout={() => { setLoggedIn(false); setTab("home"); }} />}
      </div>

      {/* 详情浮层 */}
      {detail && <DetailPage detail={detail} battery={battery} onClose={() => setDetail(null)} setDetail={setDetail} />}
    </main>
  );
}

