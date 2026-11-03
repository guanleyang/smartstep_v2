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
test('reject invalid, stale, swapped coordinates and development room',()=>{
 for(const b of [{...base,latitude:103.6},{...base,source:'wifi',zone_id:'Glys_Room'},{...base,source:'lte'},{...base,recorded_at:1},{...base,device_id:'other'}])assert.throws(()=>normalize(b,'shoe_001'));
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
