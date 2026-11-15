import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import frame from "../data/processed/regional-context.json";
import { regionalManifest, regionalTerrainModel } from "../backend/regional";
import { gridToLonLat, lonLatToGrid } from "../shared/projection";
test("regional frame covers 100 x 100 km = 10000 km2", () => {
  assert.equal(frame.width_m, 100000);
  assert.equal(frame.height_m, 100000);
  assert.equal((frame.width_m * frame.height_m) / 1e6, 10000);
  assert.equal(frame.area_km2, 10000);
  assert.equal(frame.cols * frame.cell_m, frame.width_m);
  for (const p of [
    [0, 0],
    [250, 250],
    [499, 499],
  ] as [number, number][]) {
    const roundTrip = lonLatToGrid(frame, gridToLonLat(frame, p));
    // Signed zero is the same raster cell index.
    assert.ok(roundTrip[0] === p[0] && roundTrip[1] === p[1]);
  }
});
test("regional mesh preserves real source scale and dataset identity", () => {
  const m = regionalTerrainModel();
  assert.equal(m.width_m, 100000);
  assert.equal(m.height_m, 100000);
  assert.equal(m.region_id, frame.id);
  assert.equal(m.source_grid_m, 200);
  assert.equal(m.mesh_spacing_m, 800);
  assert.ok(m.source_url.includes("planetarymaps.usgs.gov"));
  assert.ok(m.triangle_count > 30000);
  assert.equal(m.indices.length, m.triangle_count * 3);
  assert.ok(m.positions.every(Number.isFinite));
});
test("four regional layers exist locally with source credits", () => {
  assert.equal(regionalManifest.items.length, 4);
  for (const layer of regionalManifest.items) {
    assert.ok(existsSync("public" + layer.image_url));
    assert.ok(layer.source_url.startsWith("https://"));
    assert.ok(layer.credit);
  }
  assert.ok(frame.planning_note.includes("4.8 x 4 km"));
  assert.ok(frame.license.includes("CC BY-SA"));
});
