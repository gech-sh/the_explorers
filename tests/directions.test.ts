import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateDirections } from "../backend/directions";
import { findGridPath } from "../backend/grid-path";
import { GRID, HOME, SITES, toLonLat } from "../backend/terrain";
import regional from "../data/processed/regional-context.json";
import { gridToLonLat, lonLatToMeters } from "../shared/projection";
const settings = {
  max_slope_deg: 18,
  walking_speed_m_s: 0.5,
  resolution: "auto" as const,
};
test("custom directions begin at the requested point and automatically use detailed HiRISE terrain", () => {
  const a = toLonLat(HOME),
    b = SITES[0].coordinate;
  const r = calculateDirections({ ...settings, start: a, end: b });
  assert.equal(r.kind, "detailed_traverse");
  assert.equal(r.resolution_m, 20);
  assert.deepEqual(r.geometry.coordinates[0], a);
  assert.deepEqual(r.geometry.coordinates.at(-1), toLonLat(SITES[0].point));
  assert.ok(
    Math.abs(r.metrics.duration_s - Math.round(r.metrics.distance_m / 0.5)) <=
      1,
  );
  assert.ok(r.steps.length > 0);
  assert.ok(r.metrics.max_slope_deg <= 18);
});
test("regional directions span custom points and label their coarse source", () => {
  const start = gridToLonLat(regional, [100, 100]),
    end = gridToLonLat(regional, [350, 350]);
  const r = calculateDirections({ ...settings, start, end });
  assert.equal(r.kind, "regional_concept_route");
  assert.equal(r.resolution_m, 200);
  assert.equal(r.data_version, regional.id);
  assert.deepEqual(r.start.snapped, start);
  assert.deepEqual(r.end.snapped, end);
  assert.ok(r.metrics.distance_m > 70000);
  assert.ok(r.warnings[0].includes("conceptual"));
  assert.ok(
    Math.abs(
      r.steps.reduce((n, s) => n + s.distance_m, 0) - r.metrics.distance_m,
    ) <= r.steps.length,
  );
  assert.ok(
    r.steps.every((s, i) => !i || s.path_index > r.steps[i - 1].path_index),
  );
  const reverse = calculateDirections({ ...settings, start: end, end: start });
  assert.deepEqual(reverse.geometry.coordinates[0], end);
  assert.deepEqual(reverse.geometry.coordinates.at(-1), start);
});
test("outside, same-cell and unavailable-detail requests are rejected", () => {
  const start = gridToLonLat(regional, [100, 100]),
    end = gridToLonLat(regional, [350, 350]);
  assert.throws(
    () => calculateDirections({ ...settings, start: [0, 0], end }),
    /inside/,
  );
  assert.throws(
    () => calculateDirections({ ...settings, start, end: start }),
    /apart/,
  );
  assert.throws(
    () =>
      calculateDirections({ ...settings, start, end, resolution: "detail" }),
    /inset/,
  );
});
test("shared pathfinder cannot cross a missing-data diagonal corner", () => {
  const grid = {
    cols: 5,
    rows: 5,
    elevations: Array<number | null>(25).fill(0),
    slopes: Array<number | null>(25).fill(0),
  };
  grid.elevations[1 * 5 + 2] = null;
  grid.elevations[2 * 5 + 1] = null;
  assert.throws(
    () => findGridPath(grid, [1, 1], [2, 2], 18),
    /connected route/,
  );
  grid.elevations.fill(0);
  grid.slopes[2 * 5 + 2] = 30;
  assert.throws(() => findGridPath(grid, [1, 1], [2, 2], 18), /slope limit/);
});
test("continuous map projection preserves sub-cell custom pins", () => {
  const p: [number, number] = [117.25, 81.75],
    coord = gridToLonLat(GRID, p),
    [x, y] = lonLatToMeters(GRID, coord);
  assert.ok(Math.abs(x - ((p[0] + 0.5) * 20 - GRID.width_m / 2)) < 1e-6);
  assert.ok(Math.abs(y - (GRID.height_m / 2 - (p[1] + 0.5) * 20)) < 1e-6);
});
