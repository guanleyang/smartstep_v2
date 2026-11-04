import {test} from 'node:test';import assert from 'node:assert/strict';
import {createDangerTracker,dangerZonesFor,distanceMeters,OUTDOOR_DANGER} from '../app/danger-zones.mjs';
const now=1800000000000;
const wifi=(zone,stamp=now)=>({device_id:'shoe_001',source:'wifi',zone_id:zone,zone_name:zone,recorded_at:stamp,received_at:stamp,wifi_status:'confirmed',wifi_confirmed_at:stamp,stale:false});
const gps=(meters,stamp=now)=>({device_id:'shoe_001',source:'gps',latitude:OUTDOOR_DANGER.latitude+meters/111195.0802,longitude:OUTDOOR_DANGER.longitude,recorded_at:stamp,received_at:stamp,stale:false});
test('only the two named indoor zones are dangerous; legacy zone names still work',()=>{
 assert.equal(dangerZonesFor(wifi('Garage_EEE'))[0].name,'Garage EEE');
 assert.equal(dangerZonesFor(wifi('Canteen_B_South_Spine'))[0].name,'Canteen B South Spine');
 assert.deepEqual(dangerZonesFor(wifi('TR62_inside')),[]);
 assert.equal(dangerZonesFor({...wifi(undefined),zone_name:'Garage EEE'}).length,1);
});
test('outdoor circle is 25m radius, not diameter, and latitude/longitude are not swapped',()=>{
 assert.equal(OUTDOOR_DANGER.latitude,1.341917);assert.equal(OUTDOOR_DANGER.longitude,103.680252);assert.equal(OUTDOOR_DANGER.radius_m,25);
 assert.ok(Math.abs(distanceMeters(gps(24),OUTDOOR_DANGER)-24)<.01);
 assert.equal(dangerZonesFor(gps(24)).length,1);assert.equal(dangerZonesFor(gps(26)).length,0);
 assert.equal(dangerZonesFor({...gps(0),source:'lte',accuracy_m:550}).length,0);
});
test('enter once, stable polling does not repeat, confirmed exit rearms',()=>{
 const t=createDangerTracker();assert.equal(t.observe(wifi('Garage_EEE'),now).length,1);
 assert.equal(t.observe(wifi('Garage_EEE',now+10000),now+10000).length,0);
 t.observe(wifi('TR62_inside',now+20000),now+20000);
 assert.equal(t.observe(wifi('Garage_EEE',now+30000),now+30000).length,1);
 assert.equal(t.observe(wifi('Canteen_B_South_Spine',now+40000),now+40000).length,1);
});
test('held, stale, read-error and expired positions never generate a new entry',()=>{
 for(const [fix,time,blocked] of [[{...wifi('Garage_EEE'),wifi_status:'held'},now,false],[{...wifi('Garage_EEE'),stale:true},now,false],[wifi('Garage_EEE'),now,true],[wifi('Garage_EEE'),now+120001,false]])assert.equal(createDangerTracker().observe(fix,time,blocked).length,0);
});
test('unknown/coarse data does not falsely signal an exit and retrigger on recovery',()=>{
 const t=createDangerTracker();t.observe(gps(0),now);
 t.observe({...gps(0,now+10000),source:'lte'},now+10000);
 assert.equal(t.observe(gps(0,now+20000),now+20000).length,0);
});
test('GPS boundary jitter has 5m exit hysteresis; real exit and reentry alert',()=>{
 const t=createDangerTracker();assert.equal(t.observe(gps(24),now).length,1);
 t.observe(gps(27,now+10000),now+10000);
 assert.equal(t.observe(gps(24,now+20000),now+20000).length,0);
 t.observe(gps(31,now+30000),now+30000);
 assert.equal(t.observe(gps(24,now+40000),now+40000).length,1);
});
test('devices are tracked separately and older responses cannot rearm a zone',()=>{
 const t=createDangerTracker();t.observe(wifi('Garage_EEE'),now);
 t.observe(wifi('TR62_inside',now-1000),now);
 assert.equal(t.observe(wifi('Garage_EEE',now+1000),now+1000).length,0);
 assert.equal(t.observe({...wifi('Garage_EEE'),device_id:'shoe_002'},now).length,1);
});
test('restored tab state prevents duplicate entry on refresh and preserves reentry detection',()=>{
 const first=createDangerTracker();first.observe(wifi('Garage_EEE'),now);
 const restored=createDangerTracker(JSON.parse(JSON.stringify(first.snapshot())));
 assert.equal(restored.observe(wifi('Garage_EEE',now+10000),now+10000).length,0);
 restored.observe(wifi('TR62_inside',now+20000),now+20000);
 assert.equal(restored.observe(wifi('Garage_EEE',now+30000),now+30000).length,1);
});
