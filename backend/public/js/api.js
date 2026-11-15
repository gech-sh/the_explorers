import { API_CONFIG, REGIONS, KM_PER_DEG_LAT } from './config.js';
import { terrainEngine, meshEngine } from './engine-client.js';
import { planningSettings } from './planning-safety.js';

const getCache=new Map();
export async function request(path, options) {
  const cacheable=(!options || !options.method || options.method==='GET') && !path.includes('/planner/') && !path.includes('/missions') && path!=='/ready';
  if(cacheable && getCache.has(path)) return getCache.get(path);
  const task=(async()=>{
    const response=await fetch(API_CONFIG.backendBaseUrl+path,{...options,signal:AbortSignal.timeout(10000)});
    const data=response.status===204?null:await response.json();
    if(!response.ok) throw new Error(data.error?.message || `Backend returned HTTP ${response.status}`);
    return data;
  })();
  if(cacheable){getCache.set(path,task);task.catch(()=>getCache.delete(path));}
  return task;
}
export function latLngToKm(regionId, lat, lng) {
  const r = REGIONS[regionId];
  return { x: (lng-r.center[1])*KM_PER_DEG_LAT*Math.cos(r.center[0]*Math.PI/180), y: (lat-r.center[0])*KM_PER_DEG_LAT };
}
export function kmToLatLng(regionId, x, y) {
  const r = REGIONS[regionId];
  return {lat:r.center[0]+y/KM_PER_DEG_LAT,lng:r.center[1]+x/(KM_PER_DEG_LAT*Math.cos(r.center[0]*Math.PI/180))};
}
export async function connectBackend() {
  const engineReady=typeof Worker!=='undefined'?terrainEngine.start():Promise.resolve();
  const [region, sites, ar, regional, unified, jezero] = await Promise.all([
    request('/regions/arcadia-planitia-hirise-v1'), request('/regions/arcadia-planitia-hirise-v1/sites'), request('/ar'), request('/regional'), request('/arcadia'), request('/jezero')
  ]);
  for (const r of Object.values(REGIONS)) { r.hazards=[]; r.iceDeposits=[]; r.scenarios=[]; r.iceLabel='ICE / RESOURCE'; }
  const a = [...region.start].reverse(), b = [...sites.items[0].coordinate].reverse();
  Object.assign(REGIONS.arcadia, {title:'Arcadia Planitia - measured terrain planner', center:[45.638,-171.375], halfLat:0.84, halfLng:1.2,
    defaultZoom:5, pointA:{name:'Proposed staging origin',coords:a},pointB:{name:sites.items[0].name || 'Proposed terrace study',coords:b},
    scenarios:sites.items.map((site,i)=>({key:'measured-'+i,label:site.name || site.id,cls:'border-cyan-700 text-cyan-200',a:{name:'Proposed staging origin',coords:a},b:{name:site.name || site.id,coords:[...site.coordinate].reverse()}}))});
  Object.assign(REGIONS.jezero,{pointA:{name:jezero.home.name,coords:[...jezero.home.coordinate].reverse()},pointB:{name:jezero.sites[0].name,coords:[...jezero.sites[0].coordinate].reverse()},routingOutline:jezero.bounds,defaultZoom:12,gridLabel:'JEZERO | MEASURED TERRAIN OUTLINED',scaleTicks:[],scenarios:jezero.sites.map(site=>({key:site.id,label:site.name,cls:'border-cyan-700 text-cyan-200',a:{name:jezero.home.name,coords:[...jezero.home.coordinate].reverse()},b:{name:site.name,coords:[...site.coordinate].reverse()}}))});
  const [w,s,e,n]=ar.region.bounds;
  REGIONS.ar={...REGIONS.arcadia,id:'ar',tag:'AR DATA',title:'AR supplied study region - terrain unavailable',center:[ar.region.center[1],ar.region.center[0]],halfLat:(n-s)/2,halfLng:(e-w)/2,
    gridLabel:'AR STUDY BOUNDS',scaleTicks:[],defaultZoom:9,arId:ar.region.id,
    pointA:{name:'AR study center',coords:[ar.region.center[1],ar.region.center[0]]},pointB:{name:ar.sites[0].name,coords:[...ar.sites[0].coordinate].reverse()},
    scenarios:ar.sites.map((site,i)=>({key:'ar-'+i,label:site.name,cls:'border-amber-700 text-amber-200',a:{name:'AR study center',coords:[ar.region.center[1],ar.region.center[0]]},b:{name:site.name,coords:[...site.coordinate].reverse()}}))};
  REGIONS.arcadia.scenarios.push(...ar.sites.map((site,i)=>({key:'ar-source-'+i,label:'AR: '+site.name,cls:'border-cyan-700 text-cyan-200',a:{name:'AR study center',coords:[ar.region.center[1],ar.region.center[0]]},b:{name:site.name,coords:[...site.coordinate].reverse()}})));
  REGIONS.arcadia.title='Arcadia Planitia - Measured Terrain Planner';
  REGIONS.arcadia.gridLabel='MARS EXPLORER | ARCADIA COVERAGE OUTLINED';
  REGIONS.arcadia.scaleTicks=[];
  REGIONS.arcadia.unified=unified;
  const raster = await fetch("/data/integrated-regional-map.json").then(response => { if(!response.ok) throw new Error("Regional map asset missing"); return response.json(); });
  REGIONS.arcadia.localRaster = raster;
  REGIONS.arcadia.detailRaster = await fetch('/data/integrated-detail-optical.json').then(response=>{if(!response.ok)throw new Error('Detailed imagery metadata is missing');return response.json();});
  const catalog = await request("/datasets");
  const panel = document.getElementById("dataset-catalog");
  panel.replaceChildren();
  for(const dataset of catalog.items) { const row=document.createElement("p"); row.textContent=(dataset.title || dataset.name)+" | "+dataset.data_type+(dataset.available===false?" | unavailable":""); panel.append(row); }
  for(const warning of ar.warnings) {const row=document.createElement("p"); row.textContent=warning; panel.append(row);}
  await engineReady;
  if(typeof Worker!=="undefined") { const warm=()=>{const image=new Image();image.src="/data/arcadia-hirise.png";return meshEngine.start().then(()=>meshEngine.call("mesh",{scope:"detail"})).catch(()=>{});}; if("requestIdleCallback" in window) requestIdleCallback(warm,{timeout:1500}); else setTimeout(warm,0); }
  return { ar, regional, unified };
}
const neutral = {isSafe:false,isMarginal:false,slopeDeg:null,elev:null,iceDepth:'Unconfirmed',status:'UNKNOWN',badgeClass:'bg-slate-700 text-white',borderClass:'border-slate-600',bgClass:'bg-slate-950/70'};
export async function evaluateSiteAPI(regionId,lat,lng) {
  try {
    if(regionId==='ar') {
      const data=await request(`/regions/${REGIONS.ar.arId}/surface?lon=${lng}&lat=${lat}`);
      return {...neutral,terrainShort:'AR geology geometry only',terrainDesc:data.warnings.join(' '),reason:'DEM missing; geological unit labels unavailable.'};
    }
    if(regionId==='jezero'){const data=typeof Worker!=='undefined'?await terrainEngine.call('identify-jezero',[lng,lat]):await request(`/identify?region=jezero&lon=${lng}&lat=${lat}`);const flag=data.danger.classification;return {...neutral,elev:data.elevation_m,slopeDeg:data.slope_deg,status:flag==='steep'?'STEEP':flag==='caution'?'CAUTION':flag==='unknown'?'UNKNOWN':'LOW SLOPE',terrainShort:'20 m Jezero terrain',terrainDesc:data.danger.basis,reason:'Measured slope only; other surface hazards remain unresolved.'};}
    if(regionId!=='arcadia') return {...neutral,terrainShort:'Reference map only',terrainDesc:'No measured backend terrain is loaded for this region.',reason:'Terrain assessment unavailable.'};
    const data=typeof Worker!=='undefined' ? await terrainEngine.call('identify',[lng,lat]) : await request(`/identify?lon=${lng}&lat=${lat}`);
    const flag=data.danger.classification;
    return {...neutral,elev:data.elevation_m,slopeDeg:data.slope_deg,status:flag==='steep'?'STEEP':flag==='caution'?'CAUTION':flag==='unknown'?'UNKNOWN':'LOW SLOPE',
      isMarginal:flag==='caution',terrainShort:data.resolution_m===null?"AR geology geometry":`${data.resolution_m} m ${data.scope} terrain`,terrainDesc:data.danger.basis,
      reason:'Slope is a planning indicator; site safety and resource availability are unverified.'};
  } catch(error) {return {...neutral,terrainShort:'Outside available terrain',terrainDesc:error.message,reason:error.message};}
}
export function unavailableRoute(message) {
  return {available:false,routePoints:[],isDetour:false,totalTraverseKm:null,timeString:'Unavailable',batteryKwh:null,oxygenReserve:'Unavailable',message};
}
export async function computeRouteAPI(regionId,pointA,pointB,speedKmH,objective='balanced') {
  if(!['arcadia','jezero'].includes(regionId)) return unavailableRoute('Routing is unavailable: this region has no loaded elevation grid.');
  try {
    const input={region:regionId,objective,start:[...pointA.coords].reverse(),end:[...pointB.coords].reverse(),walking_speed_m_s:speedKmH/3.6,max_slope_deg:planningSettings.maxSlope,resolution:'auto'};
    const data=typeof Worker!=='undefined' ? await terrainEngine.call('route',input) : await request('/directions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    return {available:true,routePoints:data.geometry.coordinates.map(c=>[c[1],c[0]]),isDetour:false,totalTraverseKm:data.metrics.distance_m/1000,
      timeString:`${Math.round(data.metrics.duration_s/60)} min`,batteryKwh:null,oxygenReserve:'Unavailable',
      message:data.warnings.join(' '),kind:data.kind,resolution_m:data.resolution_m,raw:data};
  } catch(error) {
    const message=/^Choose both endpoints inside the 100s*(?:x|×)s*100 km Arcadia map.$/i.test(error.message) ? 'No measured terrain is loaded for these locations. Try a measured study route.' : error.message;
    return unavailableRoute(message);
  }
}
export async function fetchMars2020ImagesAPI(filter='') {
  const ar=await request('/ar');
  // Use bundled source images; no simulated rover photographs or live-feed fallback.
  const images=[{title:'AR JP2 preview - actual stored footprint (outside supplied study region)',image_files:{full_res:ar.optical.preview_url,medium:ar.optical.preview_url},camera:{instrument:'AR HiRISE'},sol:'Orbital',caption:ar.warnings.join(' ')},
    ...['optical','relief','slope','thermal'].map(name=>({title:`Arcadia regional ${name}`,image_files:{full_res:`/data/arcadia-regional-${name}.${['optical','thermal'].includes(name)?'webp':'png'}`,medium:`/data/arcadia-regional-${name}.${['optical','thermal'].includes(name)?'webp':'png'}`},camera:{instrument:'Regional '+name},sol:'Orbital'}))];
  return filter ? images.filter(image=>(image.title+' '+image.camera.instrument).toLowerCase().includes(filter.toLowerCase())) : images;
}
export async function saveMissionPlanAPI(plan) {
  return request('/planner/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(plan)});
}
export async function getSavedMissionsAPI() { return (await request('/planner/plans')).items; }
