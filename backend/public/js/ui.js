import { REGIONS } from "./config.js";
import { formatLatLng } from "./map.js";

export function showToast(msg) {
  const el = document.getElementById("toast");
  el.innerText = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2800);
}

export function updateRegionUI(regionId) {
  const r = REGIONS[regionId];
  document.getElementById("header-title").innerText = r.title;
  document.getElementById("scenario-region-tag").innerText = r.tag;
  document.getElementById("bottom-grid-label").innerHTML = `<b>${r.gridLabel}</b>`;

  document.querySelectorAll(".region-btn").forEach((btn) => {
    const active = btn.dataset.region === regionId || (btn.dataset.region === "arcadia" && regionId === "ar");
    btn.setAttribute("aria-pressed", String(active));
    btn.className = active
      ? "region-btn px-2.5 py-1 rounded-lg bg-cyan-600 text-white font-bold transition"
      : "region-btn px-2.5 py-1 rounded-lg text-slate-300 hover:bg-slate-800 transition";
  });
}

export function renderScenarios(regionId, onSelectScenario) {
  const r = REGIONS[regionId];
  const container = document.getElementById("scenario-buttons-container");
  container.innerHTML = r.scenarios.map((s) => `
    <button data-scen="${s.key}" class="scen-btn p-1.5 rounded border text-left transition truncate ${s.cls}">
      ${s.label}
    </button>`).join("");

  container.querySelectorAll(".scen-btn").forEach((btn) => {
    btn.addEventListener("click", () => onSelectScenario(btn.dataset.scen));
  });
}

export function updateSafetyAndRouteUI(regionId, pointA, pointB, auditA, auditB, routeData) {
  const set=(id,text)=>{const element=document.getElementById(id);if(element)element.textContent=text;};
  for(const [key,point,audit] of [['a',pointA,auditA],['b',pointB,auditB]]) {
    set('ice-label-'+key,'RESOURCE');
    set('badge-site-'+key,audit.status);
    document.getElementById('badge-site-'+key).className='px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-white';
    set('desc-site-'+key,point.name+' - '+audit.terrainShort);
    const elevation=document.getElementById('elev-site-'+key); elevation.parentElement.hidden=audit.elev===null;
    set('elev-site-'+key,audit.elev===null?'':audit.elev.toLocaleString()+' m');
    set('slope-site-'+key,audit.slopeDeg===null?'':Number(audit.slopeDeg).toFixed(2)+' deg');
    set('ice-site-'+key,'Unconfirmed');
    set('route-point-'+key+'-label',point.name);
    set('route-point-'+key+'-coords',formatLatLng(...point.coords));
  }
  set('dual-mission-badge','PLANNING ONLY');
  document.getElementById('dual-mission-badge').className='px-2 py-0.5 rounded text-[9px] bg-slate-700 text-white';
  set('telemetry-safety-badge','Safety unverified');
  document.getElementById('telemetry-safety-badge').className='px-2 py-1 rounded bg-slate-900 border border-amber-700 text-amber-200';
  set('dual-verdict-summary',auditA.reason+' '+auditB.reason);
  set('dossier-coords',formatLatLng(...pointB.coords));
  set('dossier-terrain',auditB.terrainShort);
  set('dossier-geology',auditB.terrainDesc);
  set('route-avoidance-title',routeData.available?(routeData.kind==='science_marswalk'?'Science Marswalk route':routeData.kind==='detailed_traverse'?'Measured terrain route':'Regional concept route'):'Outside routing coverage');
  set('route-avoidance-detail',routeData.message);
  document.getElementById('route-avoidance-banner').className='p-1.5 rounded bg-slate-950 border border-cyan-800 text-[10px] text-slate-200';
  document.getElementById('nav-travel-time').parentElement.parentElement.hidden=!routeData.available;
  document.getElementById('slope-site-a').parentElement.hidden=auditA.slopeDeg===null;
  document.getElementById('slope-site-b').parentElement.hidden=auditB.slopeDeg===null;
  set('nav-travel-time',routeData.timeString);
  set('nav-distance',routeData.totalTraverseKm===null?'Unavailable':routeData.totalTraverseKm.toFixed(2)+' km');


}

export function renderGallery(images, errorMsg = null) {
  const statusEl = document.getElementById("gallery-status");
  const gridEl = document.getElementById("gallery-grid");

  if (errorMsg) {
    statusEl.innerText = "Unable to load backend images.";
    gridEl.innerHTML = `
      <div class="col-span-full hud-subcard p-4 rounded-xl border border-amber-500/50 text-xs font-mono text-amber-200 space-y-2">
        <div>⚠️ Live API blocked by CORS or offline (${errorMsg}).</div>
        <div>Run via a local web server or open the official Mars 2020 archive:
          <a href="https://mars.nasa.gov/mars2020/multimedia/raw-images/" target="_blank" rel="noopener" class="text-cyan-300 underline font-bold">mars.nasa.gov/mars2020/multimedia/raw-images/ ↗</a>
        </div>
      </div>`;
    return;
  }

  if (!images.length) {
    statusEl.innerText = "No dataset images matched this filter.";
    gridEl.innerHTML = "";
    return;
  }

  statusEl.innerHTML = `<span class="text-emerald-400">DATASET</span> Loaded ${images.length} source images`;
  gridEl.innerHTML = images.map((img) => `
    <div class="hud-subcard rounded-xl overflow-hidden flex flex-col">
      <a href="${img.image_files?.full_res || img.image_files?.large}" target="_blank" rel="noopener" class="block bg-black">
        <img src="${img.image_files?.medium || img.image_files?.small}" alt="Source dataset image" class="w-full h-48 object-cover hover:opacity-90 transition" loading="lazy" />
      </a>
      <div class="p-3 space-y-1 text-xs font-mono flex-1 flex flex-col justify-between">
        <div>
          <div class="flex justify-between text-orange-300 font-bold">
            <span>${img.title}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-orange-950 border border-orange-700">${img.camera?.instrument || "CAM"}</span>
          </div>
          <p class="text-[11px] text-slate-300 mt-1">${img.caption || img.title || "Perseverance raw surface frame"}</p>
        </div>
        <div class="text-[10px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
          <span>${(img.date_taken_utc || "").slice(0, 10)}</span>
          <a href="${img.image_files.full_res}" target="_blank" rel="noopener" class="text-cyan-400 hover:underline">Open source image</a>
        </div>
      </div>
    </div>`).join("");
}

export function renderSavedMissions(missions, onLoadMission) {
  const listEl = document.getElementById("saved-missions-list");
  const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  if (!missions.length) {
    listEl.innerHTML = `<div class="text-slate-400 py-2">No saved mission plans yet. Click "Save Plan" on the Tactical Map tab.</div>`;
    return;
  }

  listEl.innerHTML = missions.map((m, i) => `
    <div class="p-3 rounded-lg bg-slate-900 border border-slate-700 flex flex-wrap items-center justify-between gap-2">
      <div>
        <div class="text-cyan-300 font-bold">${m.regionId.toUpperCase()}: ${escape(m.pointA.name)} → ${escape(m.pointB.name)}</div>
        <div class="text-[11px] text-slate-400">Distance: ${escape(m.distance)} | Speed: ${m.speedKmH} km/h | Saved: ${new Date(m.savedAt).toLocaleString()}</div>
      </div>
      <button data-idx="${i}" class="load-mission-btn px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]">
        Load on Map
      </button>
    </div>`).join("");

  listEl.querySelectorAll(".load-mission-btn").forEach((btn) => {
    btn.addEventListener("click", () => onLoadMission(missions[Number(btn.dataset.idx)]));
  });
}