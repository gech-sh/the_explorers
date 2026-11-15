import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateRoute, type MissionInput } from "../backend/routing";
import { missionBrief, routeCsv } from "../backend/exports";
const mission: MissionInput = {
  name: "Arcadia research <script>alert(1)</script>",
  site_ids: ["terrace"],
  notes: "<img src=x onerror=alert(1)>",
  return_to_start: true,
  constraints: {
    max_slope_deg: 18,
    max_distance_m: 12000,
    max_duration_s: 21600,
    walking_speed_m_s: 0.5,
  },
};
const route = {
  ...calculateRoute(mission),
  mission_id: "test-mission",
  mission_snapshot: mission,
};
test("CSV has one correctly aligned Mars-coordinate row per profile sample", () => {
  const rows = routeCsv(route).trim().split("\r\n");
  assert.equal(rows.length, route.profile.length + 1);
  assert(rows[0].includes("mars_longitude_deg"));
  const first = rows[1].split(",").map(Number);
  assert.equal(first[0], 0);
  assert(Math.abs(first[1] - route.geometry.coordinates[0][0]) < 1e-7);
  assert.equal(first[3], route.profile[0].elevation_m);
});
test("printable briefing escapes user content and includes Arcadia context and itinerary", () => {
  const html = missionBrief(route);
  assert(!html.includes("<script>"));
  assert(!html.includes("<img src=x"));
  assert(html.includes("&lt;script&gt;"));
  assert(html.includes("ARCADIA PLANITIA"));
  assert(html.includes("Traverse itinerary"));
  assert(html.includes("Mission notebook"));
  assert(html.includes("Proposed observation stop"));
  assert(!html.includes("Perseverance"));
});
