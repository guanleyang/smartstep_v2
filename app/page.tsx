"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import RealDevice, { DeviceMap, useLiveDevice } from "./RealDevice";
import { LanguageProvider, useLanguage, indoorName } from "./language";
import RemoteStatus from "./RemoteStatus";
import { batteryReadings } from "./battery-readings";
import { DangerProvider, DangerBadge, DangerAlerts, DangerToast, useDangerZones } from "./DangerZones";

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


const Icon = ({ children, className = "" }: { children: string; className?: string }) => (
  <span className={`material-symbols-rounded select-none ${className}`} aria-hidden="true">{children}</span>
);

function Header({ title, onBack, action }: { title: string; onBack?: () => void; action?: React.ReactNode }) {
  const {t,lang,setLang}=useLanguage();
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 text-slate-900 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        {onBack && <button onClick={onBack} className="icon-button" aria-label={t("返回","Go back")}><Icon>arrow_back</Icon></button>}
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{action}<select aria-label={t("界面语言","App language")} value={lang} onChange={e=>setLang(e.target.value==="en"?"en":"zh")} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"><option value="zh" lang="zh-CN">中文</option><option value="en" lang="en">English</option></select></div>
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

function Login({ onLogin }: { onLogin: (email: string) => void }) {
  const {t}=useLanguage();
  const [email, setEmail] = useState("SmartStep");
  const submit = (e: FormEvent) => { e.preventDefault(); onLogin(email || "demo@smartstep.com"); };
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-[#111858] via-[#1A237E] to-[#4A5BC4] p-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[28px] bg-white px-7 py-9 shadow-2xl shadow-indigo-950/40">
        <div className="mx-auto mb-5 grid size-20 place-items-center rounded-[22px] bg-gradient-to-br from-[#1A237E] to-[#4A5BC4] text-white shadow-xl shadow-indigo-900/25"><Icon className="text-[42px]">directions_walk</Icon></div>
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-[#1A237E]">SmartStep</h1>
        <p className="mb-7 mt-1 text-center text-xs text-slate-500">{t("智能安全鞋监控","Smart Safety Shoe Monitoring")}</p>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="email">{t("邮箱","Email")}</label>
        <input id="email" value={email} onChange={e => setEmail(e.target.value)} type="email" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3949AB] focus:bg-white focus:ring-1 focus:ring-[#3949AB]" placeholder={t("输入邮箱","Enter your email")} />
        <label className="block mt-4 text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="password">{t("密码","Password")}</label>
        <input id="password" defaultValue="demo1234" type="password" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3949AB] focus:bg-white focus:ring-1 focus:ring-[#3949AB]" placeholder={t("输入密码","Enter your password")} />
        <button className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#1A237E] to-[#3949AB] py-3.5 font-bold text-white shadow-lg shadow-indigo-900/20 active:scale-[.98] transition-transform">{t("登录","Log in")}</button>
        <button type="button" onClick={() => onLogin(email)} className="w-full py-3 text-sm font-semibold text-[#1A237E] mt-2">{t("创建账号","Create account")}</button>
        <div className="mt-2 flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-slate-500"><Icon className="text-lg text-blue-500">info</Icon><span>{t("演示模式，可使用任意邮箱和密码。","Demo mode accepts any email and password.")}</span></div>
      </form>
    </main>
  );
}

function LiveLocation({ compact=false }: {compact?: boolean}) {
  const {t,lang}=useLanguage();
  const live=useLiveDevice();const fix=live.location;const {circles}=useDangerZones();
  if(!live.connected)return <div className="rounded-xl bg-slate-50 p-8 text-sm text-slate-500">{t("请在设置中连接设备。","Connect the device in Settings.")}</div>;
  if(!fix)return <div className="rounded-xl bg-slate-50 p-8 text-sm text-slate-500">{t("等待设备上报位置。","Waiting for a location report.")}</div>;
  return <div className="space-y-4">
    <DangerBadge/>
    {(live.stale||live.error)&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("最后已知位置，当前数据已过期或连接中断。","Last known location. The report is stale or the connection was interrupted.")}</p>}
    {fix.source==='wifi'?<div className="rounded-2xl bg-indigo-50 p-6 sm:p-8">
      <div className="mb-4 text-[#3949AB]"><Icon className="text-4xl">apartment</Icon></div>
      <h3 className="text-2xl font-extrabold text-slate-900">{indoorName(fix.zone_name??"",lang)}</h3>
      <p className="mt-3 text-sm text-slate-500">{t("GPS信号不稳定，采用室内定位","GPS signal is weak. Using indoor positioning.")}</p>
      {fix.wifi_status==='held'&&<p className="mt-3 text-sm text-slate-600">{t("暂未匹配到新位置，保留上次确认的室内位置。","No new match. Showing the last confirmed indoor location.")}</p>}
    </div>:fix.source==='unavailable'?<p className="rounded-xl bg-slate-50 p-8 text-sm text-slate-500">{fix.status_reason==='waiting_wifi'?t("正在寻找室内位置，连续2分钟未匹配后尝试LTE。","Looking for an indoor location. LTE starts after two minutes without a match."):t("暂无可用位置。","No location available.")}</p>:<>
      <div className="flex items-center justify-between gap-3 text-sm"><b>{fix.source==='gps'?t("GPS位置","GPS location"):t("预估位置 · LTE","Estimated location · LTE")}</b>{fix.source==='lte'&&<span className="text-xs text-amber-700">{t(`范围半径约 ${Math.round(fix.accuracy_m!)} 米`, `Approx. ${Math.round(fix.accuracy_m!)} m radius`)}</span>}</div>
      <DeviceMap location={fix} compact={compact} circles={circles}/>
      <p className="text-sm font-mono text-slate-600">{fix.latitude?.toFixed(6)}, {fix.longitude?.toFixed(6)}</p>
    </>}
    <p className="text-xs text-slate-400">{fix.source==='wifi'?t("位置确认时间","Location confirmed"):t("更新时间","Updated")}{t('：',': ')}{new Date(fix.source==='wifi'?(fix.wifi_confirmed_at??fix.recorded_at):fix.recorded_at).toLocaleString(lang==="zh"?"zh-CN":"en-SG")}</p>
  </div>;
}

function Home({ name, battery, alerts, setTab, setDetail }: { name: string; battery: number; alerts: AlertItem[]; setTab: (t: Tab) => void; setDetail: (d: Detail) => void }) {
  const {t,lang}=useLanguage();
  const live=useLiveDevice(); const fix=live.location;
  const source=fix?({gps:'GPS',wifi:t("Wi-Fi 室内定位","Wi-Fi indoor location"),lte:t("LTE 预估位置","LTE estimate"),unavailable:t("暂无位置","No location")}[fix.source]):t("等待数据","Waiting for data");
  const readings = batteryReadings(fix,t);
  const batteryValue = readings.percent ?? readings.voltage;
  const batteryStatus = readings.available
    ? (readings.stale ? t("上次上报 · ","Last report · ") : "") + readings.state + " · " + readings.current
    : t("等待设备上报","Waiting for a device report");
  return <>
    <Header title={t("概览","Overview")} action={<button onClick={live.query} disabled={!live.connected||live.loading} className="icon-button" aria-label={t("刷新当前位置","Refresh current location")}><Icon>refresh</Icon></button>}/>
    <div className="mx-auto max-w-[1500px] p-3.5 sm:p-6 lg:p-8">
      <div className="mb-7 hidden items-center justify-between gap-4 sm:flex"><div><h2 className="text-2xl font-extrabold tracking-tight text-slate-900">SmartStep #001</h2><p className="mt-1 text-sm text-slate-500">{live.status}</p></div><button onClick={()=>setTab('settings')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#1A237E]">{t("设备设置","Device settings")}</button></div>
      <section className="relative mb-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#111858] via-[#202a82] to-[#5264d8] p-5 text-white shadow-lg sm:hidden">
        <p className="text-xs font-bold text-indigo-200">SmartStep #001</p><h2 className="mt-2 text-2xl font-black">{live.status}</h2>
        <div className="mt-5 grid grid-cols-2 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/10 py-3"><button type="button" className="px-3 text-left" onClick={()=>setDetail('battery')}><p className="text-[10px] text-indigo-200">{t("电池","Battery")}</p><p className="mt-1 text-sm font-bold">{batteryValue}</p><p className="mt-1 text-xs text-indigo-200">{batteryStatus}</p></button><div className="px-3"><p className="text-[10px] text-indigo-200">{t("位置","Location")}</p><p className="mt-1 text-sm font-bold">{source}</p></div></div>
      </section>
      {live.error&&<p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{live.error}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:gap-6">
        <Card onClick={()=>setDetail('device')} className="hidden min-h-[176px] sm:block"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">{t("设备状态","Device status")}</p><div className="mt-4 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-[#1A237E]"><Icon>directions_walk</Icon></span><div><p className="text-xl font-extrabold text-slate-800">{live.status}</p><p className="mt-1 text-xs text-slate-400">{t("shoe_001 · 4G 上传","shoe_001 · 4G upload")}</p></div></div></Card>
        <Card onClick={()=>setDetail('battery')} className="hidden min-h-[176px] sm:block"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">{t("电池","Battery")}</p><p className="mt-4 text-3xl font-black text-slate-700">{batteryValue}</p><p className="mt-3 text-xs text-slate-500">{batteryStatus}</p></Card>
        <Card className="hidden min-h-[176px] sm:block"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">{t("定位方式","Location source")}</p><p className="mt-4 text-xl font-extrabold text-[#1A237E]">{source}</p><p className="mt-3 text-xs text-slate-400">GPS → Wi-Fi → LTE</p></Card>
        <Card className="md:col-span-2 lg:col-span-2"><div className="mb-4 flex items-center justify-between"><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">{t("当前位置","Current location")}</p><button onClick={()=>setTab('map')} className="text-xs font-bold text-[#3949AB]">{t("查看位置 ›","View location ›")}</button></div><LiveLocation compact/></Card>
        <Card><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">{t("快捷操作","Quick actions")}</p><div className="mt-5 grid grid-cols-2 gap-3">{[['my_location',t("刷新位置","Refresh location"),live.query],['tune',t("设备连接","Connect device"),()=>setTab('settings')],['battery_charging_full',t("电池信息","Battery details"),()=>setDetail('battery')],['monitor_heart',t("远程状态","Remote status"),()=>setDetail('device')]].map(([icon,label,action])=><button key={label as string} onClick={action as ()=>void} className="flex min-h-24 flex-col items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs font-bold text-slate-600"><Icon className="text-[#3949AB]">{icon as string}</Icon>{label as string}</button>)}</div></Card>
      </div>
    </div>
  </>;
}



function MapPage({ onBack, battery }: { onBack: () => void; battery: number }) {
  const {t}=useLanguage();
 const live=useLiveDevice();
 return <><Header title={t("位置","Location")} onBack={onBack} action={<button onClick={live.query} disabled={!live.connected||live.loading} className="icon-button" aria-label={t("刷新当前位置","Refresh current location")}><Icon>refresh</Icon></button>}/><div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{live.error&&<p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{live.error}</p>}<Card><LiveLocation/></Card></div></>;
}


function Settings() {
  const {t} = useLanguage();
  const live = useLiveDevice();

  return <>
    <Header title={t("设置", "Settings")}/>
    <div className="mx-auto max-w-xl p-4 sm:p-6 lg:p-8">
      <Card>
        <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-slate-400">{t("设备", "Device")}</p>
        <h2 className="mt-3 text-lg font-extrabold">SmartStep #001</h2>
        <p className="mt-2 mb-6 text-sm text-slate-500">{live.status}</p>
        {live.form}
        {live.connected && <button onClick={live.disconnect} className="mt-4 w-full rounded-xl border border-red-100 p-3 text-sm font-bold text-red-600">
          {t("断开连接", "Disconnect")}
        </button>}
      </Card>
    </div>
  </>;
}


function DetailPage({ detail, battery, onClose, setDetail }: { detail: Exclude<Detail, null>; battery: number; onClose: () => void; setDetail: (d: Detail) => void }) {
  const {t}=useLanguage();
 const { location: fix } = useLiveDevice();
 const readings = batteryReadings(fix,t);
 return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#F4F6FA]">
   <Header title={detail==='battery'?t("电池信息","Battery details"):t("设备状态","Device status")} onBack={onClose}/>
   <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8"><Card>{detail==='battery'?<>
     {readings.stale && readings.available && <p role="status" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("超过 2 分钟未收到新数据，显示上次读数。","No new report for over two minutes. Showing the last reading.")}</p>}
     <InfoRow label={t("电池电压","Battery voltage")}>{readings.voltage}</InfoRow>
     <InfoRow label={t("电池净电流","Net battery current")}>{readings.current}</InfoRow>
     <InfoRow label={t("电池状态","Battery state")}>{readings.state}</InfoRow>
     <InfoRow label={t("估算电量","Estimated battery level")}>{readings.level}</InfoRow>
     <p className="mt-3 text-xs text-slate-500">{t("正值表示净放电，负值表示净充电。","Positive current means discharging. Negative current means charging.")}</p>
     <button onClick={()=>setDetail('device')} className="mt-4 text-sm font-bold text-[#3949AB]">{t("查看远程状态 ›","View remote status ›")}</button>
   </>:<RemoteStatus/>}</Card></div>
 </div>;
}


function BottomNav({ tab, setTab, unread }: { tab: Tab; setTab: (t: Tab) => void; unread: number }) {
  const {t}=useLanguage();
  const tabs: [Tab, string, string][] = [["home", "home", t("首页","Home")], ["map", "map", t("地图","Map")], ["alerts", "notifications", t("通知","Alerts")], ["settings", "settings", t("设置","Settings")]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] border-t border-slate-200/80 bg-white/95 backdrop-blur shadow-[0_-4px_24px_rgba(15,23,42,.06)] md:hidden pb-safe">
      {tabs.map(([id, icon, label]) => (
        <button aria-label={label} key={id} onClick={() => setTab(id)} className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${tab === id ? "text-[#1A237E]" : "text-slate-400 hover:text-slate-600"}`}>
          <Icon className={`text-2xl transition-transform ${tab === id ? "scale-110" : ""}`}>{icon}</Icon>
          {label}
          {id === "alerts" && unread > 0 && <span className="absolute right-[22%] top-1.5 grid min-w-[18px] h-[18px] place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] text-white leading-none shadow-sm">{unread}</span>}
        </button>
      ))}
    </nav>
  );
}

function SideNav({ tab, setTab, unread, name, collapsed, onToggle, onLogout }: { tab: Tab; setTab: (t: Tab) => void; unread: number; name: string; collapsed: boolean; onToggle: () => void; onLogout: () => void }) {
  const {t}=useLanguage();
  const tabs: [Tab, string, string][] = [["home", "grid_view", t("概览","Overview")], ["map", "map", t("位置","Location")], ["alerts", "notifications", t("通知","Alerts")], ["settings", "settings", t("设置","Settings")]];
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#111858] px-3 py-6 text-white shadow-2xl transition-[width] duration-300 ${collapsed ? "w-[76px]" : "w-64"}`}>
      <div className={`mb-8 flex items-center px-2 ${collapsed ? "flex-col gap-3" : "gap-3"}`}>
        <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#1A237E] to-[#4A5BC4] shadow-inner border border-white/10"><Icon className="text-2xl">directions_walk</Icon></div>
        {!collapsed && <div className="min-w-0 overflow-hidden"><p className="text-xl font-extrabold tracking-tight truncate">SmartStep</p><p className="truncate text-[9px] uppercase tracking-[.18em] text-indigo-300">{t("安全监控","Safety monitoring")}</p></div>}
        <button onClick={onToggle} className={`grid size-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition hover:scale-105 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${collapsed ? "" : "ml-auto"}`} aria-label={collapsed?t("展开导航","Expand navigation"):t("折叠导航","Collapse navigation")}>
          <Icon className="text-lg">{collapsed?"chevron_right":"chevron_left"}</Icon>
        </button>
      </div>
      
      <nav className="space-y-1.5">
        {tabs.map(([id, icon, label]) => (
          <button aria-label={label} title={collapsed?label:undefined} key={id} onClick={() => setTab(id)} className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${tab === id ? "bg-white text-[#1A237E] shadow-lg" : "text-indigo-100 hover:bg-white/10"}`}>
            <Icon className="shrink-0">{icon}</Icon>
            {!collapsed && label}
            {id === "alerts" && unread > 0 && <span className={`${collapsed ? "absolute right-2 top-2" : "ml-auto"} rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] text-white shadow-sm font-bold leading-none`}>{unread}</span>}
          </button>
        ))}
      </nav>
      
      <div className="mt-auto space-y-3 pt-6 border-t border-white/10">
        <button onClick={onLogout} title={t("退出连接","Disconnect device")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-red-500/20 hover:text-red-200 outline-none focus-visible:ring-2 focus-visible:ring-red-400">
          <Icon className="shrink-0 text-lg">logout</Icon>
          {!collapsed && t("退出连接","Disconnect device")}
        </button>
        <div className={`rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-all ${collapsed ? "p-2" : "p-3"}`}>
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-50 font-bold uppercase text-[#1A237E]">{name[0]}</div>
            {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-bold capitalize text-white">{name}</p><p className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold">{t("管理员","Admin")}</p></div>}
          </div>
        </div>
      </div>
    </aside>
  );
}

function OriginalApp() {
  const {t}=useLanguage();
  const live=useLiveDevice();
  const [loggedIn, setLoggedIn] = useState(true);
  const [email, setEmail] = useState("SmartStep");
  const [tab, setTab] = useState<Tab>(()=>typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("view")==="alerts"?"alerts":"home");
  const [detail, setDetail] = useState<Detail>(null);
  const [battery, setBattery] = useState(78);
  const {alerts}=useDangerZones();
  const [navCollapsed, setNavCollapsed] = useState(false);
  
  const name = useMemo(() => email.split("@")[0] || "demo", [email]);

  useEffect(()=>{
    if(!('serviceWorker' in navigator))return;
    const openAlerts=(event:MessageEvent)=>{if(event.data?.type==='smartstep-open-alerts'){setDetail(null);setTab('alerts');}};
    navigator.serviceWorker.addEventListener('message',openAlerts);
    return ()=>navigator.serviceWorker.removeEventListener('message',openAlerts);
  },[]);

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
        {tab === "alerts" && <><Header title={t("通知","Alerts")}/><div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8"><DangerAlerts/></div></>}
        {tab === "settings" && <Settings />}
      </div>

      <DangerToast onView={()=>{setDetail(null);setTab("alerts");}}/>

      {/* 详情浮层 */}
      {detail && <DetailPage detail={detail} battery={battery} onClose={() => setDetail(null)} setDetail={setDetail} />}
    </main>
  );
}


export default function SmartStepApp() { return <LanguageProvider><RealDevice><DangerProvider><OriginalApp/></DangerProvider></RealDevice></LanguageProvider>; }
