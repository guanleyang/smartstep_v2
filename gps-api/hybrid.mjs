// Standalone v2 Worker. Deploy after running hybrid-schema.sql.
const ZONES = Object.freeze({Garage_EEE:"Garage EEE",Glys_Room:"Gly's Room",TR62_inside:'TR62 教室内',TR63_door:'TR63 门口',TR65_door:'TR65 门口',TR67_door:'TR67 门口',TR69_door:'TR69 门口','SS2-3_elevator_B1':'B1 · 电梯 SS2-3',SS2_stairs_to_rooftop_B1:'B1 · SS2 Stairs to 天台','SS2-3_elevator_L1':'1楼 · 电梯 SS2-3',EEE_White_Door_B3:'B3 · EEE White Door',UNDER_LKC_LT_B3:'B3 · UNDER LKC LT',Canteen_B_South_Spine:'Canteen B South Spine'});
export function normalize(body, device, now=Date.now()) {
  const number=(v,lo,hi)=>typeof v==='number' && Number.isFinite(v) && v>=lo && v<=hi;
  if(!body || body.device_id!==device || !['gps','wifi','lte','unavailable'].includes(body.source)) throw Error('Invalid source/device');
  const fix=body.recorded_at??now;
  if(!number(fix,now-120000,now+30000)) throw Error('Invalid fix time');
  const result={device_id:device,source:body.source,recorded_at:fix,received_at:now};
  for(const [key,hi] of [['battery_percent',100],['battery_voltage_v',6],['pdop',100]]) {
    if(body[key]===undefined)continue;
    if(body[key]!==null&&!number(body[key],0,hi))throw Error('Invalid measurement');
    result[key]=body[key];
  }
  if(body.diagnostics!==undefined) {
    const d=body.diagnostics;
    if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid diagnostics');
    const out={};
    for(const [key,lo,hi] of [['uptime_ms',0,4294967295],['previous_upload_http',100,799],['wifi_scan_count',0,1000]]) {
      if(d[key]===undefined)continue;
      if(d[key]!==null&&(!number(d[key],lo,hi)||!Number.isInteger(d[key])))throw Error('Invalid diagnostic number');
      out[key]=d[key];
    }
    if(d.previous_upload_error!==undefined) {
      if(d.previous_upload_error!==null&&!['upload_config','lte_unregistered','clock_unavailable','tls_setup','http_init','http_transfer','http_timeout','http_status'].includes(d.previous_upload_error))throw Error('Unknown error code');
      out.previous_upload_error=d.previous_upload_error;
    }
    result.diagnostics=out;
  }
  if(body.source==='wifi') {
    if(!Object.hasOwn(ZONES,body.zone_id)) throw Error('Unknown indoor zone');
    result.zone_id=body.zone_id;result.zone_name=ZONES[body.zone_id];
  } else if(body.source==='gps'||body.source==='lte') {
    if(!number(body.latitude,-90,90)||!number(body.longitude,-180,180)) throw Error('Invalid coordinates');
    result.latitude=body.latitude;result.longitude=body.longitude;
    if(body.source==='lte') {
      if(!number(body.accuracy_m,1,100000)) throw Error('LTE accuracy required');
      result.accuracy_m=body.accuracy_m;
    }
  }
  return result;
}
export default {async fetch(request,env) {
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin'};
  const reply=(s,b)=>new Response(JSON.stringify(b),{status:s,headers});
  if(origin) {
    if(!(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin)) return reply(403,{error:'Origin denied'});
    headers['Access-Control-Allow-Origin']=origin;
  }
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type'}});
  const match=new URL(request.url).pathname.match(/^\/v2\/devices\/([a-zA-Z0-9_-]{1,64})\/location$/);
  if(!match)return reply(404,{error:'Not found'});
  if(!['POST','GET'].includes(request.method))return reply(405,{error:'Method not allowed'});
  try {
    const creds=JSON.parse(env.DEVICE_CREDENTIALS||'{}');
    const c=Object.hasOwn(creds,match[1])?creds[match[1]]:null;
    if(!c||!env.DB||typeof c.upload!=='string'||typeof c.read!=='string'||c.upload.length<32||c.read.length<32||c.upload===c.read)return reply(503,{error:'Service not configured'});
    if(request.headers.get('Authorization')!=='Bearer '+c[request.method==='POST'?'upload':'read'])return reply(401,{error:'Invalid credentials'});
    if(request.method==='GET') {
      const row=await env.DB.prepare('SELECT payload FROM hybrid_locations WHERE device_id=?').bind(match[1]).first();
      if(!row)return reply(404,{error:'No location received yet'});
      const data=JSON.parse(row.payload);
      return reply(200,{...data,stale:Date.now()-data.recorded_at>120000||Date.now()-data.received_at>120000});
    }
    if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply(415,{error:'Use application/json'});
    const reader=request.body?.getReader();if(!reader)return reply(400,{error:'Missing body'});
    const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413,{error:'Body too large'});}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    let data;
    try{data=normalize(JSON.parse(new TextDecoder().decode(bytes)),match[1]);}catch{return reply(400,{error:'Invalid location payload'});}
    const r=await env.DB.prepare('INSERT INTO hybrid_locations(device_id,recorded_at,payload) VALUES(?,?,?) ON CONFLICT(device_id) DO UPDATE SET recorded_at=excluded.recorded_at,payload=excluded.payload WHERE excluded.recorded_at>hybrid_locations.recorded_at').bind(match[1],data.recorded_at,JSON.stringify(data)).run();
    return reply(200,{ok:true,updated:(r.meta?.changes??0)>0});
  }catch{return reply(503,{error:'Location service temporarily unavailable'});}
}};
