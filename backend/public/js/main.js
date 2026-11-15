import { API_CONFIG, REGIONS } from "./config.js";
import { evaluateSiteAPI, computeRouteAPI, fetchMars2020ImagesAPI, saveMissionPlanAPI, getSavedMissionsAPI, connectBackend } from "./api.js";
import {
  initMap, rebuildRegionOverlays, setMarkerPositions, updateRouteVisuals,
  showClickPopup, closeMapPopup, switchBasemapLayer, toggleOverlayLayer,
  resetRegionBounds, fitPoints, invalidateMapSize, formatLatLng, refreshHazardOverlays, focusHazards, inspectDemoHazard, setThermalOverlay, fitRoute
} from "./map.js";
import { showToast, updateRegionUI, renderScenarios, updateSafetyAndRouteUI, renderGallery, renderSavedMissions } from "./ui.js";

import { initSafetyPanel, updateSafetyPanel, changeSafetyRegion } from "./safety-panel.js";

import { createDirectionsPanel } from "./directions-panel.js";

import { createMarswalk } from './marswalk.js';
import { scienceRouteForMap } from './marswalk-model.js';
import { savePlanningSettings } from './planning-safety.js';
let marswalkController;
let directionsPanel,routeAlternatives=[],routeAudits;
let terrainView, mode3D=false, lastRoute,modeRevision=0;
const status=(text,busy=false)=>{const element=document.getElementById("interaction-status");element.textContent=text;element.dataset.busy=String(busy);};
const STATE = {
  regionId: "arcadia",
  speedKmH: 3.5,
  activeTarget: "B",
  pointA: { ...REGIONS.arcadia.pointA, coords: [...REGIONS.arcadia.pointA.coords] },
  pointB: { ...REGIONS.arcadia.pointB, coords: [...REGIONS.arcadia.pointB.coords] }
};

function clampCoords(lat,lng) {return [Math.max(-90,Math.min(90,lat)),Math.max(-180,Math.min(180,lng))];}
let recomputeTimer;
function scheduleRecompute(){clearTimeout(recomputeTimer);++requestRevision;clearDisplayedRoutes();status('Settings changed. Click Get directions to compare paths.');recomputeTimer=setTimeout(()=>recomputeAll(false),100);}
let requestRevision = 0;
function clearDisplayedRoutes(){
  lastRoute=null;routeAlternatives=[];routeAudits=null;directionsPanel?.resetRoute();
  updateRouteVisuals(STATE.regionId,{routePoints:[]});terrainView?.updateTerrainRoute([]);
  document.getElementById('nav-travel-time').parentElement.parentElement.hidden=true;
  document.getElementById('btn-save-mission').disabled=true;
}
function displaySelectedRoute(route){
  lastRoute=route;directionsPanel?.setRoute(route);
  const[auditA,auditB]=routeAudits;
  updateSafetyPanel({regionId:STATE.regionId,pointA:STATE.pointA,pointB:STATE.pointB,auditA,auditB,routeData:route});
  updateSafetyAndRouteUI(STATE.regionId,STATE.pointA,STATE.pointB,auditA,auditB,route);
  updateRouteVisuals(STATE.regionId,{...route,alternatives:routeAlternatives});terrainView?.updateTerrainRoute(route.raw?.geometry.coordinates||[]);
  document.getElementById('btn-save-mission').disabled=false;
  status(route.available?(route.raw?.objective==='gentlest'?'Safest by measured slope selected':'Best path by distance selected'):route.message);
}
async function recomputeAll(calculate=false) {
  const revision=++requestRevision;directionsPanel?.sync(STATE);clearDisplayedRoutes();
  if(calculate){directionsPanel?.setBusy(true);status('Comparing shortest and lowest-slope paths...',true);}
  const audits=Promise.all([evaluateSiteAPI(STATE.regionId,...STATE.pointA.coords),evaluateSiteAPI(STATE.regionId,...STATE.pointB.coords)]);
  try{
    const routes=calculate?await Promise.all([
      computeRouteAPI(STATE.regionId,STATE.pointA,STATE.pointB,STATE.speedKmH,'shortest'),
      computeRouteAPI(STATE.regionId,STATE.pointA,STATE.pointB,STATE.speedKmH,'gentlest')]):[];
    const[auditA,auditB]=await audits;if(revision!==requestRevision)return;
    routeAudits=[auditA,auditB];
    if(calculate){
      routeAlternatives=routes.filter(route=>route.available);
      directionsPanel?.setAlternatives(routeAlternatives);
      const selected=routeAlternatives[0]||routes[0];displaySelectedRoute(selected);
      document.getElementById('btn-save-mission').disabled=!selected.available;
    }else{
      const pending={available:false,routePoints:[],message:'Click Get directions to calculate and compare both paths.',totalTraverseKm:null,timeString:''};
      updateSafetyPanel({regionId:STATE.regionId,pointA:STATE.pointA,pointB:STATE.pointB,auditA,auditB,routeData:pending});
      updateSafetyAndRouteUI(STATE.regionId,STATE.pointA,STATE.pointB,auditA,auditB,pending);
      document.getElementById('route-avoidance-title').textContent='Ready to compare paths';
      document.getElementById('safety-route-note').textContent='Choose Get directions to compare the shortest path and the lowest-slope path.';
      status('Waypoints ready. Click Get directions.');
    }
  }catch(error){if(revision===requestRevision){status(error.message);showToast(error.message);}}
  finally{if(revision===requestRevision)directionsPanel?.setBusy(false);}
}

function switchTab(tabName) {
  document.querySelectorAll(".view-section").forEach((el) => el.classList.add("hidden"));
  document.getElementById(`view-${tabName}`).classList.remove("hidden");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.className = active
      ? "tab-btn px-2.5 py-1 rounded bg-cyan-600 text-white font-bold transition"
      : "tab-btn px-2.5 py-1 rounded text-slate-300 hover:bg-slate-800 transition";
  });

  if (tabName === "map") invalidateMapSize();
  if (tabName === "gallery") loadGallery();
  if (tabName === "sources") refreshSavedMissions();
  if (tabName === "science") marswalkController?.then(controller=>controller?.refreshArchive());
}

function switchRegion(regionId) {
  if(regionId==="ar")regionId="arcadia";
  STATE.regionId = regionId;
  if(regionId!=="arcadia" && mode3D) document.getElementById("view-2d").click();
  document.getElementById("terrain-toolbar").hidden=regionId!=="arcadia";
  document.getElementById("terrain-layers").hidden=regionId!=="arcadia";
  document.getElementById("walking-controls").hidden=!["arcadia","jezero"].includes(regionId);
  document.querySelector(".thermal-comparison").hidden=regionId!=="arcadia";
  document.getElementById("drawer-right").classList.toggle("hidden",!["arcadia","jezero"].includes(regionId));
  document.getElementById("float-open-right").classList.add("hidden");
  const r = REGIONS[regionId];
  STATE.pointA = { ...r.pointA, coords: [...r.pointA.coords] };
  STATE.pointB = { ...r.pointB, coords: [...r.pointB.coords] };

  updateRegionUI(regionId);
  changeSafetyRegion(regionId);
  renderScenarios(regionId, runScenario);
  rebuildRegionOverlays(regionId);
  setMarkerPositions(STATE.pointA.coords, STATE.pointB.coords);
  resetRegionBounds(regionId);
  recomputeAll();
}

function runScenario(key) {
  const r = REGIONS[STATE.regionId];
  const s = r.scenarios.find((item) => item.key === key);
  if (!s) return;
  STATE.pointA = { name: s.a.name, coords: [...s.a.coords] };
  STATE.pointB = { name: s.b.name, coords: [...s.b.coords] };
  setMarkerPositions(STATE.pointA.coords, STATE.pointB.coords);
  fitPoints(s.a.coords, s.b.coords, r.defaultZoom + 2);
  recomputeAll();
}

async function loadGallery() {
  const cam = document.getElementById("raw-cam-filter").value;
  document.getElementById("gallery-status").innerText = "Loading cached source images…";
  try {
    const images = await fetchMars2020ImagesAPI(cam);
    renderGallery(images, null);
  } catch (err) {
    renderGallery([], err.message);
  }
}

async function refreshSavedMissions() {
  let missions;
  try { missions = await getSavedMissionsAPI(); } catch (error) { showToast(error.message); return; }
  renderSavedMissions(missions, (mission) => {
    switchTab("map");
    if (!REGIONS[mission.regionId]) { showToast("Saved region unavailable"); return; }
    switchRegion(mission.regionId);
    STATE.pointA = mission.pointA;
    STATE.pointB = mission.pointB;
    STATE.speedKmH = mission.speedKmH;
    document.getElementById("speed-slider").value = mission.speedKmH;
    document.getElementById("speed-number-input").value = mission.speedKmH.toFixed(2);
    setMarkerPositions(STATE.pointA.coords, STATE.pointB.coords);
    recomputeAll();
    showToast("Mission plan loaded!");
  });
}

// Expose helpers needed inside Leaflet HTML popups
window.setPointAFromCoords = (lat, lng, name) => {
  STATE.pointA = { name: name || "Custom Site A", coords: clampCoords(lat, lng) };
  setMarkerPositions(STATE.pointA.coords, STATE.pointB.coords);
  closeMapPopup();
  recomputeAll();
};

window.setPointBFromCoords = (lat, lng, name) => {
  STATE.pointB = { name: name || "Custom Site B", coords: clampCoords(lat, lng) };
  setMarkerPositions(STATE.pointA.coords, STATE.pointB.coords);
  closeMapPopup();
  recomputeAll();
};

// Boot App
document.addEventListener("DOMContentLoaded", async () => {
  document.addEventListener("click",event=>{const button=event.target.closest("button");if(button){button.classList.add("pressed");setTimeout(()=>button.classList.remove("pressed"),180);}});
  try { await connectBackend(); status("Terrain loaded into memory"); } catch(error) {
    document.getElementById("backend-status-badge").textContent="Backend unavailable";
    status(error.message,false);showToast(error.message); return;
  }
  if (API_CONFIG.useBackend) {
    document.getElementById("backend-status-badge").innerHTML = `<i class="fa-solid fa-server text-emerald-400 mr-1"></i>Backend Connected`;
  }

  initMap({
    onMapClick: async (latlng) => {
      if(STATE.activeTarget === "A") window.setPointAFromCoords(latlng.lat,latlng.lng,"Custom Site A");
      else window.setPointBFromCoords(latlng.lat,latlng.lng,"Custom Site B");
      const audit=await evaluateSiteAPI(STATE.regionId,latlng.lat,latlng.lng);
      showClickPopup(latlng,audit);
    },
    onMarkerDrag: (which, latlng) => {
      const clamped = clampCoords(latlng.lat, latlng.lng);
      if (which === "A") STATE.pointA = { name: `Site A (${formatLatLng(...clamped)})`, coords: clamped };
      else STATE.pointB = { name: `Site B (${formatLatLng(...clamped)})`, coords: clamped };
      setMarkerPositions(STATE.pointA.coords, STATE.pointB.coords);
      recomputeAll();
    },
    onMouseMove: (latlng) => {
      document.getElementById("cursor-pos").innerText = formatLatLng(latlng.lat, latlng.lng);
    }
  });

  for(const target of ["A","B"]) {
    document.getElementById("btn-select-target-"+target.toLowerCase()).addEventListener("click",()=>{
      for(const [key,point]of Object.entries(directionsPanel?.knownPoints()||{}))STATE["point"+key]=point;
      STATE.activeTarget=target;
      directionsPanel?.setActiveTarget(target);
      for(const key of ["a","b"]) document.getElementById("btn-select-target-"+key).setAttribute("aria-pressed",String(key===target.toLowerCase()));
      showToast("Click the map to choose point "+target);
    });
  }
  // Tab & Region buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  document.querySelectorAll(".region-btn, [data-region-context]").forEach((btn) => btn.addEventListener("click", () => switchRegion(btn.dataset.regionContext || btn.dataset.region)));
  document.querySelectorAll(".jump-region-btn").forEach((btn) => btn.addEventListener("click", () => {
    switchTab("map");
    switchRegion(btn.dataset.jumpRegion);
  }));

  // Speed controls
  const setSpeed = (val) => {
    const num = Math.max(0.36, Math.min(5.4, parseFloat(val) || 3.5));
    STATE.speedKmH = num;
    document.getElementById("speed-slider").value = num;
    document.getElementById("speed-number-input").value = num.toFixed(2);

    scheduleRecompute();
  };
  document.getElementById("speed-slider").addEventListener("input", (e) => setSpeed(e.target.value));
  document.getElementById("speed-number-input").addEventListener("change", (e) => setSpeed(e.target.value));
  document.querySelectorAll(".speed-preset-btn").forEach((btn) => btn.addEventListener("click", () => setSpeed(btn.dataset.speed)));

  // Basemaps & Overlays
  document.querySelectorAll(".basemap-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchBasemapLayer(btn.dataset.basemap);
      document.querySelectorAll(".basemap-btn").forEach((b) => {
        b.className = b === btn
          ? "basemap-btn py-1.5 px-1.5 rounded-lg border border-cyan-500 bg-cyan-950/60 text-cyan-200 font-bold"
          : "basemap-btn py-1.5 px-1.5 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-300";
      });
    });
  });

  document.querySelectorAll(".overlay-chk").forEach((chk) => {
    chk.addEventListener("change", () => toggleOverlayLayer(chk.dataset.layer, chk.checked));
  });

  // Drawers & Actions
  let panelsVisible = true;
  const toggleSide = (side, show) => {
    if(side==="right" && !["arcadia","jezero"].includes(STATE.regionId))return;
    document.getElementById(`drawer-${side}`).classList.toggle("hidden", !show);
    document.getElementById(`float-open-${side}`).classList.toggle("hidden", show);
  };
  document.getElementById("btn-collapse-left").addEventListener("click", () => toggleSide("left", false));
  document.getElementById("btn-collapse-right").addEventListener("click", () => toggleSide("right", false));
  document.getElementById("float-open-left").addEventListener("click", () => toggleSide("left", true));
  document.getElementById("float-open-right").addEventListener("click", () => toggleSide("right", true));
  document.getElementById("btn-toggle-panels").addEventListener("click", () => {
    panelsVisible = !panelsVisible;
    toggleSide("left", panelsVisible);
    toggleSide("right", panelsVisible);
  });

  document.getElementById("btn-swap-ab").addEventListener("click", () => {
    directionsPanel.swap();
  });

  document.getElementById("btn-reset-view").addEventListener("click", () => resetRegionBounds(STATE.regionId));

  document.getElementById("btn-toggle-strat").addEventListener("click", () => {
    const body = document.getElementById("stratigraphy-body");
    const hidden = body.classList.toggle("hidden");
    document.getElementById("icon-strat-toggle").className = `fa-solid fa-chevron-${hidden ? "down" : "up"} text-cyan-400 text-[10px]`;
  });

  document.getElementById("btn-save-mission").addEventListener("click", async () => {
    try { await saveMissionPlanAPI({
      regionId: STATE.regionId,
      pointA: STATE.pointA,
      pointB: STATE.pointB,
      speedKmH: STATE.speedKmH,
      distance: document.getElementById("nav-distance").innerText
    });
    showToast("Mission plan saved to backend!");
    } catch(error) { showToast("Save failed: " + error.message); }
  });

  document.getElementById("btn-copy-dossier").addEventListener("click", () => {
    const report = `NASA SPACE APPS MISSION DOSSIER (${REGIONS[STATE.regionId].tag})
Point A: ${STATE.pointA.name} (${formatLatLng(...STATE.pointA.coords)}) | ${document.getElementById("badge-site-a").innerText}
Point B: ${STATE.pointB.name} (${formatLatLng(...STATE.pointB.coords)}) | ${document.getElementById("badge-site-b").innerText}
Distance: ${document.getElementById("nav-distance").innerText} | Time: ${document.getElementById("nav-travel-time").innerText}`;
    navigator.clipboard.writeText(report).then(() => showToast("Mission Dossier copied!"));
  });

  document.getElementById("btn-refresh-gallery").addEventListener("click", loadGallery);
  document.getElementById("raw-cam-filter").addEventListener("change", loadGallery);

  const setMode=async use3D=>{
    const version=++modeRevision;
    document.getElementById('view-3d').setAttribute('aria-pressed',String(use3D));
    document.getElementById('view-2d').setAttribute('aria-pressed',String(!use3D));
    document.getElementById('terrain-scope-label').hidden=!use3D;
    document.getElementById('vertical-scale-label').hidden=!use3D;
    if(use3D){
      status('Opening cached 3D terrain...',true);
      document.getElementById('terrain-3d').hidden=false;
      try{
        terrainView ??= await import('./terrain-view.js');
        await terrainView.initTerrainView(document.getElementById('terrain-3d'),latlng=>window['setPoint'+STATE.activeTarget+'FromCoords'](latlng.lat,latlng.lng,'3D selected site'));
        await terrainView.setTerrainScope(document.getElementById('terrain-scope').value);
        if(version!==modeRevision)return;
        terrainView.showTerrainView(true);terrainView.updateTerrainRoute(lastRoute?.raw?.geometry.coordinates||[]);
        document.getElementById('map').hidden=true;mode3D=true;
        status('3D: drag to orbit, scroll to zoom, click to place a waypoint.');
      }catch(error){if(version===modeRevision){showToast('3D could not open: '+error.message);setMode(false);}}
    }else{
      mode3D=false;document.getElementById('map').hidden=false;document.getElementById('terrain-3d').hidden=true;
      terrainView?.showTerrainView(false);invalidateMapSize();status('2D map ready');
    }
  };
  document.getElementById('view-2d').addEventListener('click',()=>setMode(false));
  document.getElementById('view-3d').addEventListener('click',()=>setMode(true));
  document.getElementById('terrain-scope').addEventListener('change',async event=>{status('Switching cached terrain...',true);try{await terrainView.setTerrainScope(event.target.value);status('3D terrain ready');}catch(error){status(error.message);}});
  document.getElementById('vertical-scale').addEventListener('change',event=>terrainView.setExaggeration(event.target.value));
  directionsPanel=createDirectionsPanel({
    getState:()=>STATE,
    onSubmit:(from,to,calculate=true)=>{STATE.pointA=from;STATE.pointB=to;setMarkerPositions(from.coords,to.coords);recomputeAll(calculate);},
    onSelectRoute:displaySelectedRoute,
    onDraft:()=>{++requestRevision;clearTimeout(recomputeTimer);directionsPanel?.setBusy(false);clearDisplayedRoutes();document.getElementById('btn-save-mission').disabled=true;document.getElementById('nav-travel-time').parentElement.parentElement.hidden=true;document.getElementById('route-avoidance-title').textContent='Enter your places';document.getElementById('route-avoidance-detail').textContent='';status('Choose your places, then get directions.');},
    onFit:()=>{if(mode3D)document.getElementById('view-2d').click();fitPoints(STATE.pointA.coords,STATE.pointB.coords,14);}
  });
  document.getElementById('open-science-planner').addEventListener('click',()=>switchTab('science'));
  document.querySelectorAll('[data-open-science]').forEach(button=>button.addEventListener('click',()=>switchTab('science')));
  const updateThermal=()=>{const enabled=document.getElementById('blend-thermal').checked;const opacity=Number(document.getElementById('thermal-opacity').value)/100;document.getElementById('thermal-blend-controls').hidden=!enabled;document.getElementById('thermal-opacity-value').textContent=Math.round(opacity*100)+'%';setThermalOverlay(enabled,opacity);};
  document.getElementById('blend-thermal').addEventListener('change',updateThermal);document.getElementById('thermal-opacity').addEventListener('input',updateThermal);
  marswalkController=createMarswalk({showRoute:async(input,route,sites)=>{
    if(STATE.regionId!=='arcadia')switchRegion('arcadia');
    const revision=++requestRevision;clearTimeout(recomputeTimer);
    savePlanningSettings({maxSlope:input.constraints.max_slope_deg});document.getElementById('safety-slope-limit').value=String(input.constraints.max_slope_deg);document.getElementById('safety-limit-value').textContent=input.constraints.max_slope_deg+' deg';
    STATE.speedKmH=input.constraints.walking_speed_m_s*3.6;document.getElementById('speed-slider').value=String(STATE.speedKmH);document.getElementById('speed-number-input').value=STATE.speedKmH.toFixed(2);
    STATE.pointA={name:'Proposed staging origin',coords:[...REGIONS.arcadia.pointA.coords]};const last=route.destinations.at(-1);STATE.pointB={name:last.name,coords:[...last.planned_coordinate].reverse()};
    routeAlternatives=[];directionsPanel.resetRoute();directionsPanel.sync(STATE);const data=scienceRouteForMap(route);lastRoute=data;
    setMarkerPositions(STATE.pointA.coords,STATE.pointB.coords);updateRouteVisuals('arcadia',data);directionsPanel.setRoute(data);terrainView?.updateTerrainRoute(route.geometry.coordinates);
    switchTab('map');if(mode3D)document.getElementById('view-2d').click();fitRoute(route.geometry.coordinates);status('Science Marswalk: '+input.site_ids.length+' stops, '+Math.round(route.metrics.total_duration_s/60)+' minutes including observations.');
    const [auditA,auditB]=await Promise.all([evaluateSiteAPI('arcadia',...STATE.pointA.coords),evaluateSiteAPI('arcadia',...STATE.pointB.coords)]);
    if(revision!==requestRevision)return;updateSafetyPanel({regionId:'arcadia',pointA:STATE.pointA,pointB:STATE.pointB,auditA,auditB,routeData:data});updateSafetyAndRouteUI('arcadia',STATE.pointA,STATE.pointB,auditA,auditB,data);
  }}).catch(error=>{document.getElementById('marswalk-message').textContent=error.message;showToast(error.message);});
  initSafetyPanel({
    overlays:()=>{if(mode3D)document.getElementById('view-2d').click();refreshHazardOverlays(STATE.regionId);},
    recompute:scheduleRecompute,
    focus:kind=>{if(mode3D)document.getElementById('view-2d').click();focusHazards(kind);},
    inspect:hazard=>{if(mode3D)document.getElementById('view-2d').click();inspectDemoHazard(hazard);}
  });

  // Start in Arcadia Planitia
  switchRegion("arcadia");
});