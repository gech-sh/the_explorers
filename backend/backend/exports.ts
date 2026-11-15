import type { calculateRoute, MissionInput } from "./routing";
type ExportRoute = ReturnType<typeof calculateRoute> & {
  mission_id: string;
  mission_snapshot?: MissionInput;
  created_at?: string;
};
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const minutes = (s: number) => {
  const total = Math.round(s / 60);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
};
export function routeCsv(route: ExportRoute) {
  const rows = [
    "distance_m,mars_longitude_deg,mars_latitude_deg,elevation_m_aeroid,slope_deg",
  ];
  route.profile.forEach((p, i) => {
    const c = route.geometry.coordinates[i];
    rows.push(
      [
        p.distance_m,
        c[0].toFixed(8),
        c[1].toFixed(8),
        p.elevation_m,
        p.slope_deg,
      ].join(","),
    );
  });
  return rows.join("\r\n") + "\r\n";
}
export function missionBrief(route: ExportRoute) {
  const m = route.metrics,
    mission = route.mission_snapshot;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(mission?.name ?? "Mission briefing")} | Arcadia</title><style>
 *{box-sizing:border-box}body{font:14px/1.7 system-ui,sans-serif;color:#223440;background:#edf2f5;margin:0}main{max-width:900px;margin:35px auto;background:white;padding:45px;border:1px solid #dce4e9;border-radius:10px}header{border-bottom:2px solid #263f50;padding-bottom:22px}.kicker{font-size:10px;letter-spacing:2px;color:#57788a}h1{font-size:29px;line-height:1.3;margin:12px 0}h2{font-size:17px;margin-top:30px}p{color:#587081}.metrics{display:flex;gap:35px;padding:20px 0;border-bottom:1px solid #dfe6eb}.metrics strong{font-size:24px;display:block;color:#203b4d}.metrics span{font-size:10px;color:#6e8593}table{border-collapse:collapse;width:100%;font-size:12px}td,th{padding:11px 7px;border-bottom:1px solid #dce4e9;text-align:left}th{font-size:10px;color:#6b8492}small{color:#718998}.note{white-space:pre-wrap;background:#f3f7f9;padding:15px;border-radius:5px;overflow-wrap:anywhere}li{margin:9px 0}.actions{max-width:900px;margin:25px auto 0;display:flex;justify-content:space-between;align-items:center}.actions button{background:#25495e;color:white;padding:11px 17px;border:0;border-radius:5px;cursor:pointer}a{color:#30647e}code{font-size:11px;overflow-wrap:anywhere}footer{border-top:1px solid #dce4e9;margin-top:30px;padding-top:15px;font-size:10px;color:#708995}@media print{body{background:white}main{margin:0;border:0;padding:10mm;max-width:none}.actions{display:none}tr,li{break-inside:avoid}h2{break-after:avoid}.metrics{gap:30px}}@media(max-width:650px){main{padding:22px;margin:15px}.actions{margin:15px}.metrics{gap:20px;flex-wrap:wrap}table{font-size:10px}td,th{padding:7px 3px}}
 </style></head><body><div class="actions"><a href="/">← Back to Arcadia</a><button onclick="window.print()">Print / Save as PDF</button></div><main><header><div class="kicker">ARCADIA / ARCADIA PLANITIA SURFACE OPERATIONS</div><h1>${escape(mission?.name ?? "Mission briefing")}</h1><small>Research planning brief · ${escape(route.data_version)} · ${escape(route.created_at ?? "")}</small></header><div class="metrics"><div><span>TOTAL DISTANCE</span><strong>${(m.distance_m / 1000).toFixed(2)} km</strong></div><div><span>ESTIMATED DURATION</span><strong>${minutes(m.total_duration_s)}</strong></div><div><span>PEAK GRID SLOPE</span><strong>${m.max_slope_deg.toFixed(1)}°</strong></div><div><span>ASCENT</span><strong>${m.ascent_m} m</strong></div></div><h2>Traverse itinerary</h2><table><thead><tr><th>LEG</th><th>DESTINATION</th><th>DISTANCE</th><th>WALK</th><th>OBSERVE</th><th>ARRIVE +</th></tr></thead><tbody>${(route.itinerary ?? []).map((leg, i) => `<tr><td>${i + 1}</td><td>${escape(leg.to)}</td><td>${(leg.distance_m / 1000).toFixed(2)} km</td><td>${Math.round(leg.walking_duration_s / 60)} min</td><td>${leg.observation_duration_s / 60} min</td><td>${minutes(leg.arrival_elapsed_s)}</td></tr>`).join("")}</tbody></table><h2>Observation objectives</h2><ol>${route.destinations.map((d) => `<li><strong>${escape(d.name ?? d.id)}</strong> · Proposed observation stop<p>${escape(d.objective ?? "See mission source.")}</p><small>Planned position ${d.planned_coordinate.map((v) => v.toFixed(6)).join(", ")} · route snapped to a 20 m grid node</small></li>`).join("")}</ol>${mission?.notes ? `<h2>Mission notebook</h2><div class="note">${escape(mission.notes)}</div>` : ""}<h2>Sources and assumptions</h2><p>Measured HiRISE terrain and matching imagery in Arcadia Planitia; Mars Odyssey THEMIS nighttime infrared context. Surface stops and staging origin are proposed, not rover observations. Snapshot ${escape(route.source_retrieved_at)}.</p><p>Walking speed ${route.assumptions.walking_speed_m_s} m/s. Duration = walking time + planned observations. Elevation is relative to the Mars aeroid; analysis grid ${route.assumptions.terrain_grid_resolution_m} m. All coordinates are Martian longitude/latitude.</p><ul>${route.warnings.map((w) => `<li>${escape(w)}</li>`).join("")}</ul><footer>Mission ${escape(route.mission_id)} · Route ${escape(route.id)}<br>Original source metadata and coordinate reference are included in the JSON export. This brief is not an operational astronaut clearance.</footer></main></body></html>`;
}
