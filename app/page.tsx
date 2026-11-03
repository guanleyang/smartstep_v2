"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import RealDevice, { DeviceMap, useLiveDevice } from "./RealDevice";

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
  const [email, setEmail] = useState("SmartStep");
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


function LiveLocation({ compact=false }: {compact?: boolean}) {
  const live=useLiveDevice();const fix=live.location;
  if(!live.connected)return <div className="rounded-xl bg-slate-50 p-8 text-sm text-slate-500">请在 Settings 中连接设备。</div>;
  if(!fix)return <div className="rounded-xl bg-slate-50 p-8 text-sm text-slate-500">等待设备上报位置。</div>;
  return <div className="space-y-4">
    {(live.stale||live.error)&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">最后已知位置，当前数据已过期或连接中断。</p>}
    {fix.source==='wifi'?<div className="rounded-2xl bg-indigo-50 p-6 sm:p-8">
      <div className="mb-4 text-[#3949AB]"><Icon className="text-4xl">apartment</Icon></div>
      <h3 className="text-2xl font-extrabold text-slate-900">{fix.zone_name}</h3>
      <p className="mt-3 text-sm text-slate-500">GPS信号不稳定，采用室内定位</p>
    </div>:fix.source==='unavailable'?<p className="rounded-xl bg-slate-50 p-8 text-sm text-slate-500">暂无可用位置。</p>:<>
      <div className="flex items-center justify-between gap-3 text-sm"><b>{fix.source==='gps'?'GPS位置':'预估位置 · LTE'}</b>{fix.source==='lte'&&<span className="text-xs text-amber-700">范围半径约 {Math.round(fix.accuracy_m!)} 米</span>}</div>
      <DeviceMap location={fix} compact={compact}/>
      <p className="text-sm font-mono text-slate-600">{fix.latitude?.toFixed(6)}, {fix.longitude?.toFixed(6)}</p>
    </>}
    <p className="text-xs text-slate-400">更新时间：{new Date(fix.recorded_at).toLocaleString()}</p>
  </div>;
}

function Home({ name, battery, alerts, setTab, setDetail }: { name: string; battery: number; alerts: AlertItem[]; setTab: (t: Tab) => void; setDetail: (d: Detail) => void }) {
  const live=useLiveDevice(); const fix=live.location;
  const source=fix?({gps:'GPS',wifi:'Wi-Fi 室内定位',lte:'LTE 预估位置',unavailable:'暂无位置'}[fix.source]):'等待数据';
  const level=fix?.battery_percent;
  return <>
    <Header title="Overview" action={<button onClick={live.query} disabled={!live.connected||live.loading} className="icon-button" aria-label="查询当前位置"><Icon>refresh</Icon></button>}/>
    <div className="mx-auto max-w-[1500px] p-3.5 sm:p-6 lg:p-8">
      <div className="mb-7 hidden items-center justify-between gap-4 sm:flex"><div><h2 className="text-2xl font-extrabold tracking-tight text-slate-900">SmartStep #001</h2><p className="mt-1 text-sm text-slate-500">{live.status}</p></div><button onClick={()=>setTab('settings')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#1A237E]">设备设置</button></div>
      <section className="relative mb-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#111858] via-[#202a82] to-[#5264d8] p-5 text-white shadow-lg sm:hidden">
        <p className="text-xs font-bold text-indigo-200">SmartStep #001</p><h2 className="mt-2 text-2xl font-black">{live.status}</h2>
        <div className="mt-5 grid grid-cols-2 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/10 py-3"><div className="px-3"><p className="text-[10px] text-indigo-200">Battery</p><p className="mt-1 text-sm font-bold">{level==null?'暂未上报':level+'%'}</p></div><div className="px-3"><p className="text-[10px] text-indigo-200">Location</p><p className="mt-1 text-sm font-bold">{source}</p></div></div>
      </section>
      {live.error&&<p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{live.error}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:gap-6">
        <Card onClick={()=>setDetail('device')} className="hidden min-h-[176px] sm:block"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Device status</p><div className="mt-4 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-[#1A237E]"><Icon>directions_walk</Icon></span><div><p className="text-xl font-extrabold text-slate-800">{live.status}</p><p className="mt-1 text-xs text-slate-400">shoe_001 · 4G上传</p></div></div></Card>
        <Card onClick={()=>setDetail('battery')} className="hidden min-h-[176px] sm:block"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Battery</p><p className="mt-4 text-3xl font-black text-slate-700">{level==null?'暂未上报':level+'%'}</p><p className="mt-3 text-xs text-slate-400">以设备上报数据为准</p></Card>
        <Card className="hidden min-h-[176px] sm:block"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Location source</p><p className="mt-4 text-xl font-extrabold text-[#1A237E]">{source}</p><p className="mt-3 text-xs text-slate-400">GPS → Wi-Fi → LTE</p></Card>
        <Card className="md:col-span-2 lg:col-span-2"><div className="mb-4 flex items-center justify-between"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Current location</p><button onClick={()=>setTab('map')} className="text-xs font-bold text-[#3949AB]">查看位置 ›</button></div><LiveLocation compact/></Card>
        <Card><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Quick actions</p><div className="mt-5 grid grid-cols-2 gap-3">{[['my_location','查询位置',live.query],['tune','设备连接',()=>setTab('settings')],['battery_charging_full','电池信息',()=>setDetail('battery')],['notifications','通知',()=>setTab('alerts')]].map(([icon,label,action])=><button key={label as string} onClick={action as ()=>void} className="flex min-h-24 flex-col items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs font-bold text-slate-600"><Icon className="text-[#3949AB]">{icon as string}</Icon>{label as string}</button>)}</div></Card>
      </div>
    </div>
  </>;
}



function MapPage({ onBack, battery }: { onBack: () => void; battery: number }) {
 const live=useLiveDevice();
 return <><Header title="Location" onBack={onBack} action={<button onClick={live.query} disabled={!live.connected||live.loading} className="icon-button" aria-label="查询当前位置"><Icon>refresh</Icon></button>}/><div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{live.error&&<p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{live.error}</p>}<Card><LiveLocation/></Card></div></>;
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
 const live=useLiveDevice();
 return <><Header title="Settings"/><div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8"><div className="grid gap-6 lg:grid-cols-2"><Card><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Device</p><h2 className="mt-3 text-lg font-extrabold">SmartStep #001</h2><p className="mt-2 mb-6 text-sm text-slate-500">{live.status}</p>{live.form}{live.connected&&<button onClick={live.disconnect} className="mt-4 w-full rounded-xl border border-red-100 p-3 text-sm font-bold text-red-600">断开连接</button>}</Card><Card><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">Location</p><InfoRow label="定位顺序">GPS → Wi-Fi → LTE</InfoRow><InfoRow label="页面读取">请求结束后约5秒</InfoRow><InfoRow label="上传方式">4G</InfoRow><p className="mt-4 text-xs leading-relaxed text-slate-400">查看凭证使用 read 值。板子的位置上报间隔由设备程序决定。</p></Card></div></div></>;
}



function DetailPage({ detail, battery, onClose, setDetail }: { detail: Exclude<Detail, null>; battery: number; onClose: () => void; setDetail: (d: Detail) => void }) {
 const live=useLiveDevice();const fix=live.location;
 return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#F4F6FA]"><Header title={detail==='battery'?'Battery':'Device'} onBack={onClose}/><div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8"><Card>{detail==='battery'?<><InfoRow label="电量">{fix?.battery_percent==null?'暂未上报':fix.battery_percent+'%'}</InfoRow><p className="mt-4 text-sm text-slate-500">电压、温度和剩余使用时间暂未接入。</p></>:<><InfoRow label="设备">shoe_001</InfoRow><InfoRow label="状态">{live.status}</InfoRow><InfoRow label="更新时间">{fix?new Date(fix.recorded_at).toLocaleString():'暂未上报'}</InfoRow><div className="mt-5"><LiveLocation compact/></div></>}</Card></div></div>;
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
  const tabs: [Tab, string, string][] = [["home", "grid_view", "Overview"], ["map", "map", "Location"], ["alerts", "notifications", "Alerts"], ["settings", "settings", "Settings"]];
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

function OriginalApp() {
  const live=useLiveDevice();
  const [loggedIn, setLoggedIn] = useState(true);
  const [email, setEmail] = useState("SmartStep");
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<Detail>(null);
  const [battery, setBattery] = useState(78);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
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
  
  // 屏幕缩小自动折叠侧边栏
  useEffect(() => { 
    const handleResize = () => { if (window.innerWidth < 1024) setNavCollapsed(true); };
    handleResize(); // 初始检查
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!loggedIn) return <Login onLogin={value => { setEmail(value); setLoggedIn(true); }} />;
  
  const unread = alerts.filter(a => !a.read).length;

  return (
    // 移动端预留底部导航高度 pb-[68px]
    <main className="min-h-dvh bg-[#F0F2F5] pb-[68px] md:pb-0">

      
      {/* 桌面侧边栏：移动端隐藏 */}
      <div className="hidden md:block">
        <SideNav 
          tab={tab} setTab={setTab} unread={unread} name={name} 
          collapsed={navCollapsed} onToggle={() => setNavCollapsed(v=>!v)} 
          onLogout={() => { live.disconnect(); setTab("settings"); }} 
        />
      </div>
      
      {/* 移动端底部导航：桌面端隐藏 */}
      <BottomNav tab={tab} setTab={setTab} unread={unread} />

      {/* 主内容区域，根据侧边栏状态调整左边距 */}
      <div className={`min-h-dvh transition-[margin] duration-300 ${navCollapsed ? "md:ml-[76px]" : "md:ml-64"}`}>
        {tab === "home" && <Home name={name} battery={battery} alerts={alerts} setTab={setTab} setDetail={setDetail} />}
        {tab === "map" && <MapPage onBack={() => setTab("home")} battery={battery} />}
        {tab === "alerts" && <><Header title="Alerts"/><div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8"><Card><p className="text-sm text-slate-500">暂无通知。当前仅接入定位，尚未接入设备报警。</p></Card></div></>}
        {tab === "settings" && <Settings name={name} email={email} setDetail={setDetail} onLogout={() => { live.disconnect(); setTab("settings"); }} />}
      </div>

      {/* 详情浮层 */}
      {detail && <DetailPage detail={detail} battery={battery} onClose={() => setDetail(null)} setDetail={setDetail} />}
    </main>
  );
}


export default function SmartStepApp() { return <RealDevice><OriginalApp/></RealDevice>; }
