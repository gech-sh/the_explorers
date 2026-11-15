import { ORIGINAL_PLANNING } from './original-planning-data.js';
const defaults={maxSlope:5,measuredHazards:true,demoHazards:false};
let saved={};try{saved=JSON.parse(localStorage.getItem('explorers-planning-safety')||'{}');}catch{}
export const planningSettings={...defaults,
  maxSlope:Number.isFinite(saved.maxSlope)?Math.max(1,Math.min(30,saved.maxSlope)):5,
  measuredHazards:typeof saved.measuredHazards==='boolean'?saved.measuredHazards:true,
  demoHazards:typeof saved.demoHazards==='boolean'?saved.demoHazards:false};
export function savePlanningSettings(changes){
  Object.assign(planningSettings,changes);
  planningSettings.maxSlope=Math.max(1,Math.min(30,Number(planningSettings.maxSlope)||5));
  try{localStorage.setItem('explorers-planning-safety',JSON.stringify(planningSettings));}catch{}
}
export function originalHazards(region){return ORIGINAL_PLANNING[region]?.hazards||[];}
export function marsDistance(a,b){
  const d=Math.PI/180,lat1=a[0]*d,lat2=b[0]*d,dlat=lat2-lat1,dlon=(b[1]-a[1])*d;
  const h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
  return 2*3396190*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function demoZoneAt(region,coordinate){return originalHazards(region).find(hazard=>marsDistance(coordinate,[hazard.lat,hazard.lng])<=hazard.radius)||null;}
export function conditionFor(audit,coordinate,region,settings=planningSettings){
  const demo=settings.demoHazards?demoZoneAt(region,coordinate):null;
  if(demo)return {kind:'demo',label:'Illustrative hazard',detail:demo.name+' — original frontend example; not a measured hazard.',demo};
  const slope=audit.slopeDeg;
  if(slope===null||!Number.isFinite(Number(slope)))return {kind:'unknown',label:'Needs survey',detail:'No measured slope at this location. No safety conclusion can be made.'};
  if(Number(slope)>settings.maxSlope)return {kind:'blocked',label:'Over slope limit',detail:`Measured ${Number(slope).toFixed(2)} deg exceeds your ${settings.maxSlope} deg route limit.`};
  if(Number(slope)>=Math.min(2.8,settings.maxSlope))return {kind:'caution',label:'Slope caution',detail:`Measured ${Number(slope).toFixed(2)} deg is within the route limit; inspect this terrain.`};
  return {kind:'within',label:'Within slope limit',detail:`Measured ${Number(slope).toFixed(2)} deg. Rocks, sand and other hazards remain unresolved.`};
}
export function metersToLatLng([x,y],center=[-171.375,45.638]){
  const d=Math.PI/180,lon0=center[0]*d,lat0=center[1]*d,rho=Math.hypot(x,y);
  if(!rho)return [center[1],center[0]];
  const c=rho/3396190,s=Math.sin(c),co=Math.cos(c);
  return [Math.asin(co*Math.sin(lat0)+y*s*Math.cos(lat0)/rho)/d,(lon0+Math.atan2(x*s,rho*Math.cos(lat0)*co-y*Math.sin(lat0)*s))/d];
}
export function demoRing(hazard){
  const d=Math.PI/180,lat=hazard.lat*d,lon=hazard.lng*d,angle=hazard.radius/3396190;
  return Array.from({length:64},(_,i)=>{const bearing=i*2*Math.PI/64;
    const y=Math.asin(Math.sin(lat)*Math.cos(angle)+Math.cos(lat)*Math.sin(angle)*Math.cos(bearing));
    const x=lon+Math.atan2(Math.sin(bearing)*Math.sin(angle)*Math.cos(lat),Math.cos(angle)-Math.sin(lat)*Math.sin(y));
    return [y/d,x/d];});
}
