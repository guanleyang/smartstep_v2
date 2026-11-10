export const OUTDOOR_DANGER = Object.freeze({id:'outdoor_red_circle',name:'室外危险区',latitude:1.341917,longitude:103.680252,radius_m:50});
export const INDOOR_DANGERS = Object.freeze([
  {id:'Canteen_B_South_Spine',name:'Canteen B South Spine'},
  {id:'Garage_EEE',name:'Garage EEE'},
]);
export function distanceMeters(a,b) {
  const rad=x=>x*Math.PI/180, dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
  const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;
  return 6371008.8*2*Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)));
}
/** @param {any} fix @param {import('./custom-zones').CircleZone[]} [circles] */
export function dangerZonesFor(fix, circles=[OUTDOOR_DANGER]) {
  if(!fix)return [];
  if(fix.source==='wifi')return INDOOR_DANGERS.filter(z=>fix.zone_id===z.id||(!fix.zone_id&&fix.zone_name===z.name));
  if(fix.source==='gps'&&Number.isFinite(fix.latitude)&&Math.abs(fix.latitude)<=90&&Number.isFinite(fix.longitude)&&Math.abs(fix.longitude)<=180)return circles.filter(zone=>distanceMeters(fix,zone)<=zone.radius_m);
  return [];
}
// Unknown/held/coarse positions do not prove either entry or exit. Outdoor exit
// uses 5m hysteresis to prevent repeated notifications from boundary jitter.
/** @param {any} [initial] @param {import('./custom-zones').CircleZone[]} [circles] */
export function createDangerTracker(initial={}, circles=[OUTDOOR_DANGER]) {
  const devices=new Map();
  const validIds=new Set([...INDOOR_DANGERS.map(z=>z.id),...circles.map(z=>z.id)]);
  if(initial&&typeof initial==='object'&&!Array.isArray(initial))for(const [id,state] of Object.entries(initial).slice(-100)) {
    if(state&&Array.isArray(state.active)&&Number.isFinite(state.received))devices.set(id,{active:new Set(state.active.filter(z=>validIds.has(z))),received:state.received});
  }
  return {
    snapshot(){return Object.fromEntries([...devices].slice(-100).map(([id,state])=>[id,{active:[...state.active],received:state.received}]));},
    /** @param {import('./custom-zones').CircleZone[]} [outdoor] */
    observe(fix,now=Date.now(),blocked=false, outdoor=circles) {
      if(blocked||!fix||!fix.device_id||fix.stale||!Number.isFinite(fix.recorded_at)||!Number.isFinite(fix.received_at)||now-fix.recorded_at>120000||now-fix.received_at>120000||fix.recorded_at>now+30000||fix.received_at>now+30000)return [];
      if(!['wifi','gps'].includes(fix.source)||fix.wifi_status==='held')return [];
      if(fix.source==='wifi'&&Number.isFinite(fix.wifi_confirmed_at)&&now-fix.wifi_confirmed_at>=120000)return [];
      const old=devices.get(fix.device_id)||{active:new Set(),received:-Infinity};
      if(fix.received_at<=old.received)return [];
      const hits=dangerZonesFor(fix,outdoor), next=new Set(hits.map(z=>z.id));
      if(fix.source==='gps'&&Number.isFinite(fix.latitude)&&Number.isFinite(fix.longitude))for(const zone of outdoor)if(old.active.has(zone.id)&&distanceMeters(fix,zone)<=zone.radius_m+5)next.add(zone.id);
      const entered=hits.filter(z=>!old.active.has(z.id));
      devices.set(fix.device_id,{active:next,received:fix.received_at});
      return entered;
    }
  };
}
