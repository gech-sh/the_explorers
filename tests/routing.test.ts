import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRoute,
  ApiError,
  type MissionInput,
} from "../backend/routing";
import {
  HOME,
  SITES,
  slope,
  blocked,
  GRID,
  fromLonLat,
  toLonLat,
  elevation,
  geologyAt,
} from "../backend/terrain";
const input: MissionInput = {
  name: "Test traverse",
  site_ids: ["terrace", "plains"],
  return_to_start: true,
  constraints: {
    max_slope_deg: 18,
    max_distance_m: 12000,
    max_duration_s: 21600,
    walking_speed_m_s: 0.5,
  },
};
test("route visits stops in order, respects measured slopes and coverage, and returns", () => {
  const r = calculateRoute(input);
  assert.deepEqual(r.grid_points[0], HOME);
  assert.deepEqual(r.grid_points.at(-1), HOME);
  let last = -1;
  for (const site of SITES.filter((s) => input.site_ids.includes(s.id))) {
    const i = r.grid_points.findIndex(
      (p, j) => j > last && p[0] === site.point[0] && p[1] === site.point[1],
    );
    assert(i > last);
    last = i;
  }
  for (const p of r.grid_points) {
    assert(!blocked(...p));
    assert(slope(...p) <= 18);
  }
  assert(r.metrics.distance_m > 0);
  assert(r.metrics.distance_m <= 12000);
  assert.equal(r.synthetic, false);
  assert(r.source_dataset_ids.includes("DTEEC_034082_2260_033014_2260_A01"));
  assert.equal(r.metrics.total_duration_s, r.metrics.walking_duration_s + 1020);
  assert.equal(r.profile.length, r.grid_points.length);
});
test("Mars coordinates round-trip for the proposed Arcadia anchors", () => {
  for (const s of SITES) {
    assert.deepEqual(fromLonLat(s.coordinate), s.point);
    const c = toLonLat(s.point);
    assert(Math.abs(c[0] - s.coordinate[0]) < 0.0003);
    assert(Math.abs(c[1] - s.coordinate[1]) < 0.0003);
  }
});
test("no-data is excluded and proposed origin uses measured Arcadia terrain", () => {
  assert(blocked(0, 0));
  assert(Number.isNaN(elevation(0, 0)));
  assert(Number.isFinite(elevation(...HOME)));
  assert(
    elevation(...HOME) >= GRID.elevation_min_m &&
      elevation(...HOME) <= GRID.elevation_max_m,
  );
  assert(GRID.valid_percent < 100 && GRID.valid_percent > 90);
  assert.equal(geologyAt(SITES[0].point), null);
});
test("one-way route ends at the destination", () => {
  const r = calculateRoute({
    ...input,
    site_ids: ["terrace"],
    return_to_start: false,
  });
  assert.deepEqual(r.grid_points.at(-1), SITES[0].point);
});
test("infeasible distance budget returns a specific error", () => {
  assert.throws(
    () =>
      calculateRoute({
        ...input,
        constraints: { ...input.constraints, max_distance_m: 100 },
      }),
    (e: unknown) => e instanceof ApiError && e.code === "DISTANCE_LIMIT",
  );
});
test("infeasible duration budget is rejected", () => {
  assert.throws(
    () =>
      calculateRoute({
        ...input,
        constraints: { ...input.constraints, max_duration_s: 600 },
      }),
    (e: unknown) => e instanceof ApiError && e.code === "DURATION_LIMIT",
  );
});
test("strict slope can make a route infeasible", () => {
  assert.throws(
    () =>
      calculateRoute({
        ...input,
        constraints: { ...input.constraints, max_slope_deg: 1 },
      }),
    (e: unknown) => e instanceof ApiError && e.code === "NO_FEASIBLE_ROUTE",
  );
});
test("custom observations drive the itinerary and total mission time", () => {
  const r = calculateRoute({
    ...input,
    observation_tasks: [
      {
        site_id: "terrace",
        objective: "Document the proposed terrace study area",
        dwell_time_s: 1200,
      },
      {
        site_id: "plains",
        objective: "Compare orbital textures",
        dwell_time_s: 900,
      },
    ],
  });
  assert.equal(r.metrics.science_duration_s, 2100);
  assert.equal(r.itinerary.length, 3);
  assert.equal(r.itinerary[0].observation_duration_s, 1200);
  assert.equal(r.itinerary[1].observation_duration_s, 900);
  assert.equal(r.itinerary[2].observation_duration_s, 0);
  assert.equal(
    r.itinerary.at(-1)!.departure_elapsed_s,
    r.metrics.total_duration_s,
  );
  assert.equal(
    r.metrics.walking_duration_s,
    r.itinerary.reduce((n, l) => n + l.walking_duration_s, 0),
  );
  assert.equal(
    r.budget.duration_remaining_s,
    input.constraints.max_duration_s - r.metrics.total_duration_s,
  );
  assert.equal(
    r.destinations[0].objective,
    "Document the proposed terrace study area",
  );
});
test("reordered observation stops are visited in the requested sequence", () => {
  const r = calculateRoute({ ...input, site_ids: ["plains", "terrace"] });
  assert.equal(r.itinerary[0].site_id, "plains");
  assert.equal(r.itinerary[1].site_id, "terrace");
});
