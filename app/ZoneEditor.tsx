import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { ensureLeafletStyles } from "./leaflet-styles";
import { MAX_ZONES, validCenter, validRadius, type CircleZone } from "./custom-zones";
import { useLanguage } from "./language";

const field = "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-[#3949AB] disabled:opacity-50";
const ntu: [number,number] = [1.3483,103.6831];
type Place = {name:string;detail:string;latitude:number;longitude:number};

function ZoneMap({point,radius,onPick}: {point:[number,number]|null;radius:number;onPick:(lat:number,lon:number)=>void}) {
  const {t,lang} = useLanguage();
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map|null>(null);
  const circle = useRef<Leaflet.Circle|null>(null);
  const [zoom,setZoom]=useState<Leaflet.Control.Zoom|null>(null);
  const [ready, setReady] = useState(false);
  const [failed,setFailed] = useState(false);
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then(L => {
      if(cancelled || !node.current) return;
      ensureLeafletStyles();
      const view = L.map(node.current,{zoomControl:false}).setView(ntu, 15);
      map.current = view;
      view.attributionControl.setPrefix(false);
      setZoom(L.control.zoom().addTo(view));
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution:"© OpenStreetMap contributors",maxZoom:19}).addTo(view);
      view.on("click", e => pick.current(e.latlng.lat, ((e.latlng.lng+540)%360+360)%360-180));
      circle.current = L.circle(ntu,{radius:0,color:"#dc2626",fillOpacity:.18});
      setReady(true);
    }).catch(() => { if(!cancelled) setFailed(true); });
    return () => { cancelled = true; map.current?.remove(); map.current = null; circle.current = null; };
  },[]);
  useEffect(()=>{
    const buttons=zoom?.getContainer()?.querySelectorAll("a");
    buttons?.forEach((el,i)=>{
      const label=i?t("缩小","Zoom out"):t("放大","Zoom in");
      el.setAttribute("title",label);el.setAttribute("aria-label",label);
    });
  },[zoom,lang,t]);
  const lat=point?.[0], lon=point?.[1];
  useEffect(() => {
    if(!ready || lat==null || lon==null || !map.current) return;
    map.current.setView([lat,lon],Math.max(map.current.getZoom(),16),{animate:false});
  },[ready,lat,lon]);
  useEffect(() => {
    const view=map.current, ring=circle.current;
    if(!ready || !view || !ring) return;
    if(lat==null || lon==null || !validRadius(radius)) ring.remove();
    else ring.setLatLng([lat,lon]).setRadius(radius).addTo(view);
  },[ready,lat,lon,radius]);
  return <><div ref={node} className="relative z-0 h-56 overflow-hidden rounded-xl bg-slate-100" aria-label={t("危险区地图预览","Danger zone map preview")}/>{failed&&<p role="status">{t("地图暂时无法加载，仍可输入经纬度。","The map could not load. You can still enter coordinates.")}</p>}</>;
}

export default function ZoneEditor({zones,onSave,onRemove}: {zones:CircleZone[];onSave:(zone:CircleZone)=>void;onRemove:(id:string)=>void}) {
  const {t,lang} = useLanguage();
  const [open,setOpen]=useState(false);
  const [id,setId]=useState("");
  const [query,setQuery]=useState("");
  const [name,setName]=useState("");
  const [lat,setLat]=useState("");
  const [lon,setLon]=useState("");
  const [radius,setRadius]=useState("50");
  const [places,setPlaces]=useState<Place[]>([]);
  const [status,setStatus]=useState<"searching"|"empty"|"error"|"storage"|"">("");
  const [remove,setRemove]=useState("");
  const search=useRef<AbortController|null>(null);
  useEffect(()=>()=>search.current?.abort(),[]);
  const latitude=Number(lat),longitude=Number(lon),metres=Number(radius);
  const point:[number,number]|null=lat.trim()&&lon.trim()&&validCenter(latitude,longitude)?[latitude,longitude]:null;
  function pick(a:number,b:number) { setLat(a.toFixed(6)); setLon(b.toFixed(6)); }
  function start(zone?:CircleZone) {
    const previous=search.current;search.current=null;previous?.abort();setId(zone?.id??"");setQuery("");setName(zone?.name??"");
    setLat(zone?String(zone.latitude):"");setLon(zone?String(zone.longitude):"");
    setRadius(String(zone?.radius_m??50));setPlaces([]);setStatus("");setOpen(true);
  }
  async function find() {
    if(query.trim().length<2 || status==="searching") return;
    const controller=new AbortController();search.current=controller;
    const timeout=setTimeout(()=>controller.abort(),8000);
    setPlaces([]);setStatus("searching");
    try {
      const params=new URLSearchParams({q:query.trim(),limit:"5",lat:String(ntu[0]),lon:String(ntu[1])});
      if(lang==="en")params.set("lang","en");
      const res=await fetch("https://photon.komoot.io/api/?"+params,{signal:controller.signal,referrerPolicy:"no-referrer"});
      if(!res.ok)throw Error("Search failed");
      const data=await res.json();
      const matches:Place[]=[];
      for(const item of (Array.isArray(data.features)?data.features:[]).slice(0,5)){
        const [x,y]=Array.isArray(item?.geometry?.coordinates)?item.geometry.coordinates:[];
        const p=item?.properties??{};
        if(!validCenter(y,x)||typeof p.name!=="string"||!p.name.trim())continue;
        matches.push({name:p.name.slice(0,120),detail:[...new Set([p.street,p.city,p.state,p.country].filter(x=>typeof x==="string"&&x!==p.name))].join(", "),latitude:y,longitude:x});
      }
      if(search.current===controller){setPlaces(matches);setStatus(matches.length?"":"empty");}
    } catch {if(search.current===controller)setStatus("error");}
    finally{clearTimeout(timeout);if(search.current===controller)search.current=null;}
  }
  function close(){const active=search.current;search.current=null;active?.abort();setStatus("");setOpen(false);}
  return <div className="mt-4 space-y-3">
    {zones.map(z=><div key={z.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
      <div className="min-w-0 flex-1 break-words"><b>{z.name}</b><p className="text-slate-500">{z.latitude.toFixed(6)}, {z.longitude.toFixed(6)} · {z.radius_m} m</p></div>
      {remove===z.id?<><span>{t("确定删除？","Delete this zone?")}</span><button type="button" className={button} onClick={()=>{try{onRemove(z.id);setRemove("");if(id===z.id)close();}catch{setStatus("storage");}}}>{t("确认删除","Confirm deletion")}</button><button type="button" className={button} onClick={()=>setRemove("")}>{t("取消","Cancel")}</button></>:<><button type="button" className={button} onClick={()=>start(z)}>{t("编辑","Edit")}</button><button type="button" className={button} onClick={()=>setRemove(z.id)}>{t("删除","Delete")}</button></>}
    </div>)}
    {!open?<button type="button" className={button} disabled={zones.length>=MAX_ZONES} onClick={()=>start()}>{t("添加危险区","Add danger zone")}</button>:<form className="space-y-3 rounded-xl border border-slate-200 p-3 sm:p-4" onSubmit={e=>{
      e.preventDefault();if(!point||!validRadius(metres)||!name.trim()||(!id&&zones.length>=MAX_ZONES))return;
      try{onSave({id:id||"custom-"+crypto.randomUUID(),name:name.trim(),latitude,longitude,radius_m:metres});close();}
      catch{setStatus("storage");}
    }}>
      <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-sm font-semibold">{t("搜索地点","Search for a place")}<input className={field} value={query} maxLength={120} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.nativeEvent.isComposing){e.preventDefault();void find();}}}/></label><button type="button" className={button} disabled={query.trim().length<2||status==="searching"} onClick={()=>void find()}>{t("搜索","Search")}</button></div>
      {status==="searching"&&<p role="status">{t("正在搜索…","Searching…")}</p>}
      {(status==="empty"||status==="error")&&<p role="status" className="text-sm text-slate-600">{status==="empty"?t("未找到地点。你可以在地图上选点或输入坐标。","No results. Pick a point on the map or enter coordinates."):t("地点搜索暂时不可用，仍可手动选点。","Place search is unavailable. You can still pick a point manually.")}</p>}
      {!!places.length&&<ul className="space-y-1">{places.map((p,i)=><li key={i}><button type="button" className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-indigo-50" onClick={()=>{pick(p.latitude,p.longitude);setName(p.name);setPlaces([]);}}><b>{p.name}</b>{p.detail&&<span className="block text-slate-500">{p.detail}</span>}</button></li>)}</ul>}
      <p className="text-xs text-slate-500">{t("点地图可调整中心，也可直接输入坐标。","Click the map to move the centre, or enter coordinates below.")} <a className="underline" href="https://photon.komoot.io/" target="_blank" rel="noreferrer">Photon</a> / <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></p>
      <ZoneMap point={point} radius={metres} onPick={pick}/>
      <label className="block text-sm font-semibold">{t("危险区名称","Zone name")}<input required maxLength={120} className={field} value={name} onChange={e=>setName(e.target.value)}/></label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="text-sm font-semibold">{t("纬度","Latitude")}<input required type="number" step="any" min={-85} max={85} className={field} value={lat} onChange={e=>setLat(e.target.value)}/></label>
        <label className="text-sm font-semibold">{t("经度","Longitude")}<input required type="number" step="any" min={-180} max={180} className={field} value={lon} onChange={e=>setLon(e.target.value)}/></label>
        <label className="text-sm font-semibold">{t("半径（米）","Radius (m)")}<input required type="number" min={5} max={5000} className={field} value={radius} onChange={e=>setRadius(e.target.value)}/></label>
      </div>
      <div className="flex gap-2"><button className="rounded-xl bg-[#1A237E] px-4 py-2 text-sm font-bold text-white disabled:opacity-50" disabled={!point||!validRadius(metres)||!name.trim()}>{t("保存危险区","Save danger zone")}</button><button type="button" className={button} onClick={close}>{t("取消","Cancel")}</button></div>
    </form>}
    {status==="storage"&&<p role="alert" className="text-sm text-red-700">{t("当前浏览器无法保存危险区设置。","This browser could not save danger zone settings.")}</p>}
  </div>;
}
