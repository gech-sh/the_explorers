import { REGIONS } from './config.js';
import { planningSettings,originalHazards,metersToLatLng,demoRing } from './planning-safety.js';
let detailImagery,thermalOverlay,thermalEnabled=true,thermalOpacity=.35;
let safestRouteLine;
let planetBasemap,measuredHazardLayer,demoHazardLayer,hazardsReady;
let map, basemaps={}, markerA,markerB,routeLine,studyLayer,boundsLayer,clickPopup,callbacks,currentRegion='arcadia';
export function formatLatLng(lat,lng){return `${Math.abs(lat).toFixed(3)}\u00b0${lat>=0?'N':'S'}, ${Math.abs(lng).toFixed(3)}\u00b0${lng>=0?'E':'W'}`;}
function pin(label,color){return L.divIcon({className:'waypoint-pin',html:`<span class="pin-label" style="background:${color}">${label}</span><span class="pin-dot" style="background:${color}"></span>`,iconSize:[60,42],iconAnchor:[30,40]});}
export function initMap(events){
 callbacks=events;
 map=L.map('map',{crs:L.CRS.EPSG4326,center:REGIONS.arcadia.center,zoom:5,minZoom:1,maxZoom:17,zoomControl:false,preferCanvas:true});
 L.control.zoom({position:'bottomright'}).addTo(map);
 planetBasemap=L.tileLayer('https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',{maxNativeZoom:8,maxZoom:17,noWrap:true,attribution:'NASA Mars Trek | Viking global mosaic'}).addTo(map);
 const raster=REGIONS.arcadia.localRaster;
 const detail=REGIONS.arcadia.detailRaster;detailImagery=L.imageOverlay(detail.image_url,detail.bounds,{opacity:1});
 thermalOverlay=L.imageOverlay("/data/integrated-thermal.png",raster.bounds,{opacity:thermalOpacity});
 for(const [key,url]of Object.entries({local:raster.image_url,relief:'/data/integrated-relief.png',slope:'/data/integrated-slope.png',thermal:'/data/integrated-thermal.png'}))basemaps[key]=L.imageOverlay(url,raster.bounds,{opacity:1});

 basemaps.jezero=L.tileLayer('https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/{z}/{y}/{x}.png',{maxZoom:17,maxNativeZoom:14,bounds:[[18.3067994,77.2229331],[18.669315,77.583964]]});
 markerA=L.marker(REGIONS.arcadia.pointA.coords,{draggable:true,icon:pin('A','#16866d')}).addTo(map);
 markerB=L.marker(REGIONS.arcadia.pointB.coords,{draggable:true,icon:pin('B','#087eab')}).addTo(map);
 routeLine=L.polyline([],{color:'#21cca0',weight:4,opacity:.95,interactive:false,smoothFactor:1}).addTo(map);
 safestRouteLine=L.polyline([],{color:'#2dd6aa',weight:4,dashArray:'8 6',opacity:.95,interactive:false,smoothFactor:1}).addTo(map);
 studyLayer=L.layerGroup().addTo(map);boundsLayer=L.layerGroup().addTo(map);measuredHazardLayer=L.featureGroup();demoHazardLayer=L.featureGroup();hazardsReady=loadMeasuredHazards();clickPopup=L.popup({autoClose:true,closeOnClick:true});
 map.on('click',event=>events.onMapClick(event.latlng));
 let moveFrame=0,lastPoint;
 map.on('mousemove',event=>{lastPoint=event.latlng;if(!moveFrame)moveFrame=requestAnimationFrame(()=>{moveFrame=0;events.onMouseMove(lastPoint);});});
 markerA.on('dragend',event=>events.onMarkerDrag('A',event.target.getLatLng()));
 markerB.on('dragend',event=>events.onMarkerDrag('B',event.target.getLatLng()));
 for(const layer of Object.values(basemaps))if(layer.getElement){const image=new Image();image.src=layer._url;}
}
export function rebuildRegionOverlays(regionId){
 currentRegion=regionId;studyLayer.clearLayers();boundsLayer.clearLayers();
 Object.values(basemaps).forEach(layer=>map.removeLayer(layer));map.removeLayer(detailImagery);map.removeLayer(thermalOverlay);
 if(regionId==='arcadia'){
 const r=REGIONS.arcadia;detailImagery.addTo(map);if(thermalEnabled)thermalOverlay.addTo(map);
  for(const item of r.scenarios){const marker=L.circleMarker(item.b.coords,{radius:5,color:item.key.startsWith('ar-')?'#ffbf69':'#67d7f3',fillOpacity:.9});marker.bindTooltip(item.b.name);marker.on('click',()=>window.setPointBFromCoords(...item.b.coords,item.b.name));marker.addTo(studyLayer);}
  L.polygon(measuredBoundary(),{color:'#67d7f3',weight:2,fill:false,interactive:true}).bindTooltip('Arcadia measured-data boundary: 100 x 100 km (10,000 km2)',{sticky:true}).addTo(boundsLayer);
  const ar=r.unified.coverage.ar_region.bounds;L.rectangle([[ar[1],ar[0]],[ar[3],ar[2]]],{color:'#ffbf69',weight:1,fill:false,dashArray:'5 5',interactive:false}).addTo(boundsLayer);
 }else if(regionId==='jezero'){basemaps.jezero.addTo(map);L.polygon(REGIONS.jezero.routingOutline.map(([lon,lat])=>[lat,lon]),{color:'#67d7f3',weight:2,fill:false,interactive:false}).addTo(boundsLayer);for(const item of REGIONS.jezero.scenarios){const marker=L.circleMarker(item.b.coords,{radius:5,color:'#67d7f3',fillOpacity:.9,bubblingMouseEvents:false});marker.bindTooltip(item.b.name+' | measured study waypoint');marker.on('click',()=>window.setPointBFromCoords(...item.b.coords,item.b.name));marker.addTo(studyLayer);}}
 refreshHazardOverlays(regionId);
}
export function setMarkerPositions(a,b){markerA.setLatLng(a);markerB.setLatLng(b);}
export function updateRouteVisuals(regionId,data){
 const alternatives=data.alternatives||[],best=alternatives.find(route=>route.raw.objective==='shortest'),safe=alternatives.find(route=>route.raw.objective==='gentlest');
 routeLine.setLatLngs(best?.routePoints||data.routePoints||[]);routeLine.setStyle({color:best?'#4aa8ff':'#21cca0',weight:best?6:4,opacity:data.raw?.objective==='gentlest'?.6:.95});
 safestRouteLine.setLatLngs(safe?.routePoints||[]);safestRouteLine.setStyle({opacity:data.raw?.objective==='shortest'?.7:1});if(safe)safestRouteLine.bringToFront();
}
export function showClickPopup(latlng,audit){
 const wrapper=document.createElement('div');wrapper.className='coordinate-card';
 const title=document.createElement('strong');title.textContent=formatLatLng(latlng.lat,latlng.lng);wrapper.append(title);
 const evidence=document.createElement('p');evidence.textContent=audit.terrainShort;wrapper.append(evidence);
 if(audit.elev!==null){const metric=document.createElement('p');metric.textContent=`Elevation ${audit.elev.toFixed(1)} m | Slope ${Number(audit.slopeDeg).toFixed(2)} deg`;wrapper.append(metric);}
 const actions=document.createElement('div');actions.className='popup-actions';
 for(const target of ['A','B']){const button=document.createElement('button');button.textContent=target==='A'?'Set start':'Set destination';button.addEventListener('click',()=>window['setPoint'+target+'FromCoords'](latlng.lat,latlng.lng,'Custom Site '+target));actions.append(button);}wrapper.append(actions);
 clickPopup.setLatLng(latlng).setContent(wrapper).openOn(map);
}
export function closeMapPopup(){map.closePopup();}
export function switchBasemapLayer(key){if(!basemaps[key])return;Object.values(basemaps).forEach(layer=>map.removeLayer(layer));map.removeLayer(detailImagery);if(key!=='local')basemaps[key].addTo(map);else detailImagery.addTo(map);if(thermalEnabled&&currentRegion==='arcadia')thermalOverlay.bringToFront();}
export function toggleOverlayLayer(key,visible){const layer=key==='ice'?studyLayer:key==='grid'?boundsLayer:null;if(layer)visible?layer.addTo(map):map.removeLayer(layer);}
export function resetRegionBounds(regionId){const r=REGIONS[regionId];if(regionId==='arcadia')map.setView(r.center,5);else if(r.routingOutline)map.fitBounds(r.routingOutline.map(([lon,lat])=>[lat,lon]),{padding:[45,45],maxZoom:12});else map.fitBounds([[r.center[0]-r.halfLat,r.center[1]-r.halfLng],[r.center[0]+r.halfLat,r.center[1]+r.halfLng]],{padding:[32,32]});}
export function fitPoints(a,b,maxZoom){map.fitBounds([a,b],{padding:[60,60],maxZoom});}
export function invalidateMapSize(){requestAnimationFrame(()=>map?.invalidateSize());}

// Outline the actual 100 km local projection, not its geographic bounding box.
function measuredBoundary(){
 const R=3396190,deg=Math.PI/180,lon0=-171.375*deg,lat0=45.638*deg;
 const convert=(x,y)=>{const rho=Math.hypot(x,y),c=rho/R,s=Math.sin(c),co=Math.cos(c);return [Math.asin(co*Math.sin(lat0)+y*s*Math.cos(lat0)/rho)/deg,(lon0+Math.atan2(x*s,rho*Math.cos(lat0)*co-y*Math.sin(lat0)*s))/deg];};
 const points=[];
 for(let i=0;i<20;i++)points.push(convert(-50000+i*5000,50000));
 for(let i=0;i<20;i++)points.push(convert(50000,50000-i*5000));
 for(let i=0;i<20;i++)points.push(convert(50000-i*5000,-50000));
 for(let i=0;i<20;i++)points.push(convert(-50000,-50000+i*5000));
 return points;
}

async function loadMeasuredHazards(){
 const status=document.getElementById('hazard-source-status');
 try{
  const response=await fetch('/data/arcadia-hazards.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Could not load slope polygons');
  const catalog=await response.json();
  for(const feature of catalog.features){
   const category=feature.properties.category,color={caution:'#f0af35',steep:'#ef627b',unknown:'#8698a8'}[category]||'#8698a8';
   const rings=feature.geometry.coordinates.map(ring=>ring.map(point=>metersToLatLng(point,catalog.center)));
   const polygon=L.polygon(rings,{color,weight:1,fillOpacity:.22,bubblingMouseEvents:false});
   polygon.bindTooltip(feature.properties.label+' | '+feature.properties.resolution_m+' m source');
   polygon.on('click',event=>callbacks.onMapClick(event.latlng));polygon.addTo(measuredHazardLayer);
  }
  status.textContent=catalog.features.length+' measured slope / missing-data polygons loaded.';
  refreshHazardOverlays(currentRegion);
 }catch(error){status.textContent=error.message;}
}
export function refreshHazardOverlays(region=currentRegion){
 if(!map||!measuredHazardLayer)return;
 demoHazardLayer.clearLayers();
 for(const hazard of originalHazards(region)){
  const polygon=L.polygon(demoRing(hazard),{color:'#e58bff',weight:2,dashArray:'6 5',fillOpacity:.12,bubblingMouseEvents:false});
  polygon.bindTooltip('Illustrative example: '+hazard.name);
  polygon.on('click',()=>inspectDemoHazard(hazard,false));polygon.addTo(demoHazardLayer);
 }
 if(planningSettings.measuredHazards&&region==='arcadia')measuredHazardLayer.addTo(map);else map.removeLayer(measuredHazardLayer);
 if(planningSettings.demoHazards)demoHazardLayer.addTo(map);else map.removeLayer(demoHazardLayer);
}
export async function focusHazards(kind){
 if(kind==='measured'){
  await hazardsReady;
  map.fitBounds([metersToLatLng([-2600,-2200]),metersToLatLng([2600,2200])],{padding:[45,45],maxZoom:13});
 }else if(demoHazardLayer.getLayers().length)map.fitBounds(demoHazardLayer.getBounds(),{padding:[50,50]});
}
export function inspectDemoHazard(hazard,focus=true){
 if(focus)map.fitBounds(demoRing(hazard),{padding:[45,45]});
 const wrapper=document.createElement('div');wrapper.className='coordinate-card';
 const title=document.createElement('strong');title.textContent=hazard.name;
 const note=document.createElement('p');note.textContent='Illustrative zone from the original frontend. Not a measured hazard or verified safety condition.';
 const description=document.createElement('p');description.textContent=hazard.desc+' | Example slope '+hazard.slope+' deg.';
 const button=document.createElement('button');button.className='hazard-location';button.textContent='Inspect as destination B';button.addEventListener('click',()=>window.setPointBFromCoords(hazard.lat,hazard.lng,hazard.name));
 wrapper.append(title,note,description,button);clickPopup.setLatLng([hazard.lat,hazard.lng]).setContent(wrapper).openOn(map);
}

export function setThermalOverlay(enabled,opacity=.35){thermalEnabled=enabled;thermalOpacity=opacity;thermalOverlay.setOpacity(opacity);if(enabled&&currentRegion==='arcadia')thermalOverlay.addTo(map).bringToFront();else map.removeLayer(thermalOverlay);}
export function fitRoute(coordinates){if(coordinates?.length)map.fitBounds(coordinates.map(([lon,lat])=>[lat,lon]),{padding:[55,55],maxZoom:13});}
