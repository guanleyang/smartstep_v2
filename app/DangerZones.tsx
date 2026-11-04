"use client";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useLiveDevice } from "./RealDevice";
import { createDangerTracker, dangerZonesFor, INDOOR_DANGERS, OUTDOOR_DANGER } from "./danger-zones.mjs";

export type DangerAlert={id:number;device_id?:string;zone_id?:string;entered_at?:number;type:"hazard"|"safe"|"battery";severity:"CRITICAL"|"WARNING";title:string;message:string;time:string;read:boolean};
type Zone={id:string;name:string};
const HISTORY="smartstep-danger-alerts-v1";
const SYSTEM_ENABLED="smartstep-danger-system-enabled-v1";
const TRACKER_STATE="smartstep-danger-active-v1";
function readTrackerState(){try{return JSON.parse(sessionStorage.getItem(TRACKER_STATE)||"{}");}catch{return {};}}
function saveSystemPreference(value:boolean){try{localStorage.setItem(SYSTEM_ENABLED,String(value));}catch{}}
function readHistory():DangerAlert[]{
  try{const rows=JSON.parse(localStorage.getItem(HISTORY)||"[]");return Array.isArray(rows)?rows.filter(r=>r&&r.type==='hazard'&&typeof r.id==='number'&&typeof r.message==='string'&&typeof r.title==='string'&&typeof r.read==='boolean').slice(0,100):[];}catch{return [];}
}
type State={zones:Zone[];alerts:DangerAlert[];setAlerts:React.Dispatch<React.SetStateAction<DangerAlert[]>>;toast:DangerAlert|null;dismiss:()=>void;enable:()=>Promise<void>;permission:string;notice:string;enabled:boolean;disable:()=>void};
const Context=createContext<State|null>(null);
export function useDangerZones(){const state=useContext(Context);if(!state)throw Error('Missing danger provider');return state;}
export function DangerProvider({children}:{children:ReactNode}){
  const live=useLiveDevice();const tracker=useRef(createDangerTracker(readTrackerState()));
  const [alerts,setAlerts]=useState<DangerAlert[]>(readHistory);
  const [toast,setToast]=useState<DangerAlert|null>(null);
  const [permission,setPermission]=useState(typeof Notification==='undefined'?'unsupported':Notification.permission);
  const [notice,setNotice]=useState("");const [enabled,setEnabled]=useState(false);
  const registration=useRef<ServiceWorkerRegistration|null>(null);const sequence=useRef(Date.now());
  useEffect(()=>{
    if(typeof Notification==='undefined'||Notification.permission!=='granted'||!('serviceWorker' in navigator))return;
    let cancelled=false;
    try{if(localStorage.getItem(SYSTEM_ENABLED)!=='true')return;}catch{return;}
    void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(reg=>{if(!cancelled&&reg?.active){registration.current=reg;setEnabled(true);}}).catch(()=>{});
    return ()=>{cancelled=true;};
  },[]);
  useEffect(()=>{try{localStorage.setItem(HISTORY,JSON.stringify(alerts.slice(0,100)));}catch{}},[alerts]);
  useEffect(()=>{
    const entered=tracker.current.observe(live.location,Date.now(),!live.connected||live.stale||!!live.error) as Zone[];
    try{sessionStorage.setItem(TRACKER_STATE,JSON.stringify(tracker.current.snapshot()));}catch{}
    if(!entered.length)return;
    const events=entered.map(zone=>({id:++sequence.current,device_id:live.location!.device_id,zone_id:zone.id,entered_at:Date.now(),type:'hazard' as const,severity:'CRITICAL' as const,title:'Danger Zone',message:`已进入 ${zone.name}`,time:new Date().toLocaleString(),read:false}));
    setAlerts(rows=>[...events,...rows].slice(0,100));setToast(events[events.length-1]);
    if(enabled&&registration.current&&typeof Notification!=='undefined'&&Notification.permission==='granted'){
      for(const event of events)void registration.current.showNotification('SmartStep · Danger Zone',{body:event.message,tag:`smartstep-${event.device_id}-${event.zone_id}`,data:{url:import.meta.env.BASE_URL+'?view=alerts'},icon:import.meta.env.BASE_URL+'mobile-app/icon.svg'}).catch(()=>setNotice('系统提醒发送失败，App内通知仍已记录。'));
    }
  },[live.location,live.connected,live.stale,live.error,enabled]);
  async function enable(){
    if(typeof Notification==='undefined'||!('serviceWorker' in navigator)||!window.isSecureContext){setPermission('unsupported');setNotice('当前环境不支持系统提醒，App内通知仍可使用。');return;}
    try{
      const result=await Notification.requestPermission();setPermission(result);
      if(result!=='granted'){saveSystemPreference(false);setNotice(result==='denied'?'系统提醒未获允许，请在浏览器设置中修改。':'尚未开启系统提醒。');return;}
      const reg=await navigator.serviceWorker.register(import.meta.env.BASE_URL+'danger-notifications-sw.js',{scope:import.meta.env.BASE_URL});
      if(!reg.active)await new Promise<void>((resolve,reject)=>{const worker=reg.installing||reg.waiting;if(!worker){reject(Error('Worker unavailable'));return;}const timer=setTimeout(()=>reject(Error('Worker activation timed out')),10000);worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}if(worker.state==='redundant'){clearTimeout(timer);reject(Error('Worker activation failed'));}});if(worker.state==='activated'){clearTimeout(timer);resolve();}});
      registration.current=reg;saveSystemPreference(true);setEnabled(true);setNotice('已开启页面运行期间的系统提醒。');
    }catch{setEnabled(false);setNotice('系统提醒暂时无法开启，App内通知仍可使用。');}
  }
  return <Context.Provider value={{zones:dangerZonesFor(live.location),alerts,setAlerts,toast,dismiss:()=>setToast(null),enable,permission,notice,enabled,disable:()=>{saveSystemPreference(false);setEnabled(false);setNotice('已关闭系统提醒，App内通知仍会记录。');}}}>{children}</Context.Provider>;
}
export function DangerBadge(){
  const {zones}=useDangerZones();const live=useLiveDevice();
  if(!zones.length)return null;
  return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800" aria-label="Danger Zone status"><p className="font-extrabold">Danger Zone{live.stale||live.error||live.location?.wifi_status==='held'?' · 上次确认位置':''}</p><p className="mt-1 text-sm">{zones.map(z=>z.name).join('、')}</p></div>;
}
export function DangerAlerts(){
  const {alerts,setAlerts,enable,disable,enabled,notice}=useDangerZones();const live=useLiveDevice();
  const current=alerts.filter(a=>!live.location||a.device_id===live.location.device_id);
  return <div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">危险区通知</h2><button onClick={()=>void(enabled?disable():enable())} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#3949AB]">{enabled?'关闭系统提醒':'开启系统提醒'}</button></div><p className="mt-3 text-sm text-slate-500">App内提醒自动开启。系统提醒需授权，页面关闭后不支持后台推送。</p>{notice&&<p role="status" className="mt-3 text-sm text-slate-600">{notice}</p>}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold">Danger Zone范围</h2><ul className="mt-3 space-y-2 text-sm text-slate-600">{INDOOR_DANGERS.map((z:Zone)=><li key={z.id}>{z.name} · 室内</li>)}<li>{OUTDOOR_DANGER.name} · 半径{OUTDOOR_DANGER.radius_m}米</li></ul><p className="mt-2 text-xs text-slate-400">中心：1.341917, 103.680252。室外范围按GPS判断。</p></section>
    <div className="flex items-center justify-between"><h2 className="font-extrabold">进入记录</h2><button onClick={()=>setAlerts(rows=>rows.map(r=>({...r,read:true})))} className="text-sm font-bold text-[#3949AB]">全部已读</button></div>
    {!current.length?<p className="rounded-2xl bg-white p-6 text-sm text-slate-500">暂无进入Danger Zone的通知。</p>:current.map(event=><button key={event.id} onClick={()=>setAlerts(rows=>rows.map(r=>r.id===event.id?{...r,read:true}:r))} className={`block w-full rounded-2xl border p-5 text-left ${event.read?'border-slate-200 bg-white':'border-red-200 bg-red-50'}`}><div className="flex items-center justify-between gap-3"><b className="text-red-700">{event.title}</b>{!event.read&&<span className="text-xs font-bold text-red-600">未读</span>}</div><p className="mt-2 text-sm text-slate-800">{event.message}</p><p className="mt-3 text-xs text-slate-500">{event.time}</p></button>)}
    <p className="text-xs text-slate-400">记录保存在当前浏览器，最多保留100条。保留旧点、过期位置及LTE粗定位不会触发新的进入通知。</p></div>;
}
export function DangerToast({onView}:{onView:()=>void}){
  const {toast,dismiss}=useDangerZones();if(!toast)return null;
  return <div role="alert" className="fixed inset-x-3 top-3 z-[90] mx-auto max-w-lg rounded-2xl border border-red-300 bg-white p-4 shadow-xl"><div className="flex items-start justify-between gap-3"><div><b className="text-red-700">Danger Zone</b><p className="mt-1 text-sm text-slate-800">{toast.message}</p></div><button onClick={dismiss} className="rounded-lg px-2 py-1 text-sm text-slate-500" aria-label="关闭危险区提醒">关闭</button></div><button onClick={()=>{dismiss();onView();}} className="mt-3 text-sm font-bold text-red-700">查看通知</button></div>;
}
