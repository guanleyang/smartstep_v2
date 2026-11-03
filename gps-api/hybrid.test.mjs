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
 for(const b of [base,{...base,source:'wifi',zone_id:'Glys_Room'},{...base,source:'lte',accuracy_m:550},{...base,source:'unavailable'}]){
   const url='https://test/v2/devices/shoe_001/location';
   assert.equal((await api.fetch(new Request(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({...b,...telemetry})}),env)).status,200);
   const data=await (await api.fetch(new Request(url,{headers:{Authorization:'Bearer '+read}}),env)).json();
   assert.equal(data.battery_percent,0);assert.equal(data.battery_voltage_v,3.4);assert.equal(data.diagnostics.previous_upload_http,715);assert.equal(data.diagnostics.wifi_scan_count,0);assert.equal(data.diagnostics.secret,undefined);
 }
});

test('missing and null battery are supported; malformed telemetry is rejected',()=>{
 assert.equal(normalize(base,'shoe_001').battery_voltage_v,undefined);
 assert.equal(normalize({...base,battery_percent:null,battery_voltage_v:null},'shoe_001').battery_percent,null);
 for(const extra of [{battery_percent:101},{battery_percent:'50'},{battery_voltage_v:-1},{diagnostics:[]},{diagnostics:{uptime_ms:-1}},{diagnostics:{wifi_scan_count:1.5}},{diagnostics:{previous_upload_error:'token text'}}])assert.throws(()=>normalize({...base,...extra},'shoe_001'));
});
