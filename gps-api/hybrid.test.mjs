import {test} from 'node:test';
import assert from 'node:assert/strict';
import api,{normalize} from './hybrid.mjs';
const base={device_id:'shoe_001',source:'gps',latitude:1.35,longitude:103.68};
test('GPS, indoor, LTE and unavailable are mutually exclusive payloads',()=>{
 const gps=normalize({...base,speed:100,altitude:90},'shoe_001');assert.equal(gps.speed,undefined);
 const wifi=normalize({...base,source:'wifi',zone_id:'TR62_inside'},'shoe_001');assert.equal(wifi.latitude,undefined);assert.equal(wifi.zone_name,'TR62 教室内');
 const lte=normalize({...base,source:'lte',accuracy_m:550},'shoe_001');assert.equal(lte.accuracy_m,550);
 assert.equal(normalize({...base,source:'unavailable'},'shoe_001').latitude,undefined);
});
test('reject invalid, stale, swapped coordinates and unknown rooms',()=>{
 for(const b of [{...base,latitude:103.6},{...base,source:'wifi',zone_id:'not_a_collected_zone'},{...base,source:'lte'},{...base,recorded_at:1},{...base,device_id:'other'}])assert.throws(()=>normalize(b,'shoe_001'));
});
test('auth and storage roundtrip preserves source changes',async()=>{
 let row;const u='u'.repeat(64),r='r'.repeat(64);
 const env={DEVICE_CREDENTIALS:JSON.stringify({shoe_001:{upload:u,read:r}}),DB:{prepare(){return{bind(...args){return{async first(){return row;},async run(){row={payload:args[2]};return{meta:{changes:1}};}};}};}}};
 const request=(method,token,b)=>new Request('https://test/v2/devices/shoe_001/location',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(b?{body:JSON.stringify(b)}:{})});
 assert.equal((await api.fetch(request('POST',r,base),env)).status,401);
 for(const b of [base,{...base,source:'wifi',zone_id:'TR69_door'},{...base,source:'lte',accuracy_m:550},{...base,source:'unavailable'}]){
 assert.equal((await api.fetch(request('POST',u,b),env)).status,200);
 const response=await api.fetch(request('GET',r),env);const data=await response.json();assert.equal(data.source,b.source);assert.equal(response.headers.get('Cache-Control'),'no-store');}
});

test("Glys Room accepted without coordinates",()=>{const r=normalize({...base,source:"wifi",zone_id:"Glys_Room"},"shoe_001");assert.equal(r.zone_name,"Gly\'s Room");assert.equal(r.latitude,undefined);});

test('telemetry survives authenticated storage for every location source without arbitrary diagnostic text',async()=>{
 let row;const token='u'.repeat(64),read='r'.repeat(64);
 const env={DEVICE_CREDENTIALS:JSON.stringify({shoe_001:{upload:token,read}}),DB:{prepare(){return{bind(...args){return{async first(){return row;},async run(){row={payload:args[2]};return{meta:{changes:1}};}};}};}}};
 const telemetry={battery_percent:0,battery_voltage_v:3.4,pdop:2.1,diagnostics:{uptime_ms:10000,previous_upload_http:715,previous_upload_error:'http_status',wifi_scan_count:0,secret:'never store'}};
 const currentBySource={gps:-125.6,wifi:53.3,lte:0,unavailable:null};
 for(const b of [base,{...base,source:'wifi',zone_id:'Glys_Room'},{...base,source:'lte',accuracy_m:550},{...base,source:'unavailable'}]){
   const url='https://test/v2/devices/shoe_001/location';
   const current=currentBySource[b.source];
   assert.equal((await api.fetch(new Request(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({...b,...telemetry,battery_current_ma:current})}),env)).status,200);
   const data=await (await api.fetch(new Request(url,{headers:{Authorization:'Bearer '+read}}),env)).json();
   assert.equal(data.battery_current_ma,current);
   assert.equal(data.battery_percent,0);assert.equal(data.battery_voltage_v,3.4);assert.equal(data.diagnostics.previous_upload_http,715);assert.equal(data.diagnostics.wifi_scan_count,0);assert.equal(data.diagnostics.secret,undefined);
 }
});

test('missing and null battery are supported; malformed telemetry is rejected',()=>{
 assert.equal(normalize(base,'shoe_001').battery_voltage_v,undefined);
 assert.equal(normalize(base,'shoe_001').battery_current_ma,undefined);
 assert.throws(()=>normalize({...base,battery_current_ma:'-125.6'},'shoe_001'));
 assert.throws(()=>normalize({...base,battery_current_ma:3201},'shoe_001'));
 assert.equal(normalize({...base,battery_percent:null,battery_voltage_v:null},'shoe_001').battery_percent,null);
 for(const extra of [{battery_percent:101},{battery_percent:'50'},{battery_voltage_v:-1},{diagnostics:[]},{diagnostics:{uptime_ms:-1}},{diagnostics:{wifi_scan_count:1.5}},{diagnostics:{previous_upload_error:'token text'}}])assert.throws(()=>normalize({...base,...extra},'shoe_001'));
});

test("Garage EEE is accepted and resolves to the app display name",()=>{const r=normalize({...base,source:"wifi",zone_id:"Garage_EEE"},"shoe_001");assert.equal(r.zone_name,"Garage EEE");assert.equal(r.zone_id,"Garage_EEE");assert.equal(r.latitude,undefined);});

test('held WiFi preserves its actual confirmation time across heartbeats',()=>{
 const t=1800000000000;
 const b={device_id:'shoe_001',source:'wifi',zone_id:'TR63_door',wifi_status:'held'};
 const first=normalize({...b,wifi_age_ms:10000},'shoe_001',t);
 const next=normalize({...b,wifi_age_ms:20000},'shoe_001',t+10000);
 assert.equal(first.wifi_confirmed_at,t-10000);assert.equal(next.wifi_confirmed_at,first.wifi_confirmed_at);
 assert.equal(next.wifi_status,'held');assert.equal(next.received_at,t+10000);
 const confirmed=normalize({...b,zone_id:'TR65_door',wifi_status:'confirmed',wifi_age_ms:0},'shoe_001',t+20000);
 assert.equal(confirmed.wifi_confirmed_at,t+20000);assert.equal(confirmed.zone_name,'TR65 门口');
});
test('WiFi age cannot exceed the hold window or silently invent a held fix',()=>{
 const b={device_id:'shoe_001',source:'wifi',zone_id:'TR63_door',wifi_status:'held'};
 for(const extra of [{},{wifi_age_ms:120000},{wifi_age_ms:-1},{wifi_age_ms:'10'},{wifi_age_ms:1,wifi_status:'other'}])assert.throws(()=>normalize({...b,...extra},'shoe_001'));
 const legacy=normalize({...b,wifi_status:undefined},'shoe_001');assert.equal(legacy.wifi_status,'confirmed');
 assert.equal(normalize({device_id:'shoe_001',source:'unavailable',status_reason:'waiting_wifi'},'shoe_001').status_reason,'waiting_wifi');
});
test('GET marks a held location stale even if a heartbeat was recently received',async()=>{
 const now=Date.now();const read='r'.repeat(64);
 const payload=JSON.stringify({device_id:'shoe_001',source:'wifi',zone_name:'TR63 门口',wifi_status:'held',wifi_confirmed_at:now-120001,recorded_at:now,received_at:now});
 const env={DEVICE_CREDENTIALS:JSON.stringify({shoe_001:{read,upload:'u'.repeat(64)}}),DB:{prepare(){return{bind(){return{async first(){return{payload};}};}};}}};
 const result=await api.fetch(new Request('https://test/v2/devices/shoe_001/location',{headers:{Authorization:'Bearer '+read}}),env);
 assert.equal((await result.json()).stale,true);
});

test('held POST retains the server-known confirmation timestamp despite upload delay',async()=>{
 const confirmed=Date.now()-50000;const upload='u'.repeat(64),read='r'.repeat(64);
 let row={payload:JSON.stringify({device_id:'shoe_001',source:'wifi',zone_id:'TR63_door',wifi_confirmed_at:confirmed,recorded_at:confirmed,received_at:confirmed})};
 const env={DEVICE_CREDENTIALS:JSON.stringify({shoe_001:{upload,read}}),DB:{prepare(){return{bind(...args){return{async first(){return row;},async run(){row={payload:args[2]};return{meta:{changes:1}};}};}};}}};
 const result=await api.fetch(new Request('https://test/v2/devices/shoe_001/location',{method:'POST',headers:{Authorization:'Bearer '+upload,'Content-Type':'application/json'},body:JSON.stringify({device_id:'shoe_001',source:'wifi',zone_id:'TR63_door',wifi_status:'held',wifi_age_ms:10000})}),env);
 assert.equal(result.status,200);assert.equal(JSON.parse(row.payload).wifi_confirmed_at,confirmed);assert.ok(JSON.parse(row.payload).wifi_age_ms>=50000);
});
