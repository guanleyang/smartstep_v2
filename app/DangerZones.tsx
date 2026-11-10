"use client";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import ZoneEditor from "./ZoneEditor";
import { readCustomZones, writeCustomZones, type CircleZone } from "./custom-zones";
import { useLanguage, type Translate } from "./language";
import { useLiveDevice } from "./RealDevice";
import { createDangerTracker, dangerZonesFor, INDOOR_DANGERS, OUTDOOR_DANGER } from "./danger-zones.mjs";

export type DangerAlert={id:number;device_id?:string;zone_id?:string;zone_name?:string;entered_at?:number;type:"hazard"|"safe"|"battery";severity:"CRITICAL"|"WARNING";title:string;message:string;time:string;read:boolean};
type Zone={id:string;name:string};
const zoneName=(zone:Zone,t:Translate)=>zone.id===OUTDOOR_DANGER.id?t("室外危险区","Outdoor danger zone"):zone.name;
const eventMessage=(event:DangerAlert,t:Translate)=>{
  const name=zoneName({id:event.zone_id??"",name:event.zone_name??event.message.replace(/^已进入 /,"")},t);
  return t(`已进入 ${name}`,`Entered ${name}`);
};
const HISTORY="smartstep-danger-alerts-v1";
const SYSTEM_ENABLED="smartstep-danger-system-enabled-v1";
const TRACKER_STATE="smartstep-danger-active-v1";
function readTrackerState(){try{return JSON.parse(sessionStorage.getItem(TRACKER_STATE)||"{}");}catch{return {};}}
function saveSystemPreference(value:boolean){try{localStorage.setItem(SYSTEM_ENABLED,String(value));}catch{}}
function readHistory():DangerAlert[]{
  try{const rows=JSON.parse(localStorage.getItem(HISTORY)||"[]");return Array.isArray(rows)?rows.filter(r=>r&&r.type==='hazard'&&typeof r.id==='number'&&typeof r.message==='string'&&typeof r.title==='string'&&typeof r.read==='boolean').slice(0,100):[];}catch{return [];}
}
type State={zones:Zone[];circles:CircleZone[];custom:CircleZone[];saveZone:(z:CircleZone)=>void;removeZone:(id:string)=>void;alerts:DangerAlert[];setAlerts:React.Dispatch<React.SetStateAction<DangerAlert[]>>;toast:DangerAlert|null;dismiss:()=>void;enable:()=>Promise<void>;permission:string;notice:string;enabled:boolean;disable:()=>void};
const Context=createContext<State|null>(null);
export function useDangerZones(){const state=useContext(Context);if(!state)throw Error('Missing danger provider');return state;}
export function DangerProvider({children}:{children:ReactNode}){
  const live=useLiveDevice();const {t}=useLanguage();
  const [custom,setCustom]=useState(readCustomZones);
  const circles=useMemo(()=>[OUTDOOR_DANGER,...custom],[custom]);
  const [tracker]=useState(()=>createDangerTracker(readTrackerState(),circles));
  function changeZones(next:CircleZone[]){writeCustomZones(next);setCustom(next);}
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
    const entered=tracker.observe(live.location,Date.now(),!live.connected||live.stale||!!live.error,circles) as Zone[];
    try{sessionStorage.setItem(TRACKER_STATE,JSON.stringify(tracker.snapshot()));}catch{}
    if(!entered.length)return;
    const events=entered.map(zone=>({id:++sequence.current,device_id:live.location!.device_id,zone_id:zone.id,zone_name:zone.name,entered_at:Date.now(),type:'hazard' as const,severity:'CRITICAL' as const,title:'Danger Zone',message:`已进入 ${zone.name}`,time:new Date().toLocaleString(),read:false}));
    setAlerts(rows=>[...events,...rows].slice(0,100));setToast(events[events.length-1]);
    if(enabled&&registration.current&&typeof Notification!=='undefined'&&Notification.permission==='granted'){
      for(const event of events)void registration.current.showNotification(t('SmartStep · 危险区','SmartStep · Danger Zone'),{body:eventMessage(event,t),tag:`smartstep-${event.device_id}-${event.zone_id}`,data:{url:import.meta.env.BASE_URL+'?view=alerts'},icon:import.meta.env.BASE_URL+'mobile-app/icon.svg'}).catch(()=>setNotice('系统提醒发送失败，App内通知仍已记录。'));
    }
  },[live.location,live.connected,live.stale,live.error,enabled,circles,tracker,t]);
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
  return <Context.Provider value={{zones:dangerZonesFor(live.location,circles),circles,custom,saveZone:z=>changeZones(custom.some(x=>x.id===z.id)?custom.map(x=>x.id===z.id?z:x):[...custom,z]),removeZone:id=>changeZones(custom.filter(z=>z.id!==id)),alerts,setAlerts,toast,dismiss:()=>setToast(null),enable,permission,notice,enabled,disable:()=>{saveSystemPreference(false);setEnabled(false);setNotice('已关闭系统提醒，App内通知仍会记录。');}}}>{children}</Context.Provider>;
}
export function DangerBadge(){
  const {t}=useLanguage();const {zones}=useDangerZones();const live=useLiveDevice();
  if(!zones.length)return null;
  return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800" aria-label={t("危险区状态","Danger Zone status")}><p className="font-extrabold">{t("危险区","Danger Zone")}{live.stale||live.error||live.location?.wifi_status==='held'?t(" · 上次确认位置"," · Last confirmed location"):''}</p><p className="mt-1 text-sm">{zones.map(z=>zoneName(z,t)).join(t('、',', '))}</p></div>;
}
export function DangerAlerts(){
  const {t,lang}=useLanguage();const {alerts,setAlerts,enable,disable,enabled,notice,custom,saveZone,removeZone}=useDangerZones();const live=useLiveDevice();
  const current=alerts.filter(a=>!live.location||a.device_id===live.location.device_id);
  return <div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">{t("危险区通知","Danger zone alerts")}</h2><button onClick={()=>void(enabled?disable():enable())} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#3949AB]">{enabled?t("关闭系统提醒","Disable system notifications"):t("开启系统提醒","Enable system notifications")}</button></div><p className="mt-3 text-sm text-slate-500">{t("App内提醒自动开启。系统提醒需授权，页面关闭后不支持后台推送。","In-app alerts are always on. Allow system notifications to receive them while the page is open.")}</p>{notice&&<p role="status" className="mt-3 text-sm text-slate-600">{lang==="zh"?notice:({"系统提醒发送失败，App内通知仍已记录。":"The system notification failed. The in-app alert was saved.","当前环境不支持系统提醒，App内通知仍可使用。":"System notifications are unavailable. In-app alerts still work.","系统提醒未获允许，请在浏览器设置中修改。":"System notifications were blocked. You can change this in browser settings.","尚未开启系统提醒。":"System notifications are off.","已开启页面运行期间的系统提醒。":"System notifications are enabled while the page is open.","系统提醒暂时无法开启，App内通知仍可使用。":"System notifications could not be enabled. In-app alerts still work.","已关闭系统提醒，App内通知仍会记录。":"System notifications are off. In-app alerts are still saved."} as Record<string,string>)[notice]??notice}</p>}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-extrabold">{t("危险区管理","Manage danger zones")}</h2><ul className="mt-3 space-y-2 text-sm text-slate-600">{INDOOR_DANGERS.map((z:Zone)=><li key={z.id}>{z.name} · {t("室内","Indoor")}</li>)}<li>{zoneName(OUTDOOR_DANGER,t)} · {OUTDOOR_DANGER.radius_m} m</li></ul><ZoneEditor zones={custom} onSave={saveZone} onRemove={removeZone}/><p className="mt-3 text-xs text-slate-500">{t("自定义危险区保存在当前浏览器，只根据 GPS 位置判断。","Custom zones are saved in this browser and use GPS positions only.")}</p></section>
    <div className="flex items-center justify-between"><h2 className="font-extrabold">{t("进入记录","Entry history")}</h2><button onClick={()=>setAlerts(rows=>rows.map(r=>({...r,read:true})))} className="text-sm font-bold text-[#3949AB]">{t("全部已读","Mark all as read")}</button></div>
    {!current.length?<p className="rounded-2xl bg-white p-6 text-sm text-slate-500">{t("暂无进入危险区的通知。","No danger zone entries yet.")}</p>:current.map(event=><button key={event.id} onClick={()=>setAlerts(rows=>rows.map(r=>r.id===event.id?{...r,read:true}:r))} className={`block w-full rounded-2xl border p-5 text-left ${event.read?'border-slate-200 bg-white':'border-red-200 bg-red-50'}`}><div className="flex items-center justify-between gap-3"><b className="text-red-700">{t("危险区","Danger Zone")}</b>{!event.read&&<span className="text-xs font-bold text-red-600">{t("未读","Unread")}</span>}</div><p className="mt-2 text-sm text-slate-800">{eventMessage(event,t)}</p><p className="mt-3 text-xs text-slate-500">{event.entered_at?new Date(event.entered_at).toLocaleString(lang==="zh"?"zh-CN":"en-SG"):event.time}</p></button>)}
    <p className="text-xs text-slate-400">{t("记录保存在当前浏览器，最多保留100条。保留旧点、过期位置及LTE粗定位不会触发新的进入通知。","This browser keeps up to 100 entries. Held, stale and LTE positions do not trigger new entry alerts.")}</p></div>;
}
export function DangerToast({onView}:{onView:()=>void}){
  const {t}=useLanguage();const {toast,dismiss}=useDangerZones();if(!toast)return null;
  return <div role="alert" className="fixed inset-x-3 top-3 z-[90] mx-auto max-w-lg rounded-2xl border border-red-300 bg-white p-4 shadow-xl"><div className="flex items-start justify-between gap-3"><div><b className="text-red-700">{t("危险区","Danger Zone")}</b><p className="mt-1 text-sm text-slate-800">{eventMessage(toast,t)}</p></div><button onClick={dismiss} className="rounded-lg px-2 py-1 text-sm text-slate-500" aria-label={t("关闭危险区提醒","Dismiss danger zone alert")}>{t("关闭","Close")}</button></div><button onClick={()=>{dismiss();onView();}} className="mt-3 text-sm font-bold text-red-700">{t("查看通知","View alerts")}</button></div>;
}
