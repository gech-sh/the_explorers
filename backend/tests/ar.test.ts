import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { arCatalog, arSurface, handleAr } from "../backend/ar";

test("all supplied AR source files are packaged with integrity metadata", () => {
  assert.equal(arCatalog.files.length, 5);
  for (const item of arCatalog.files) {
    assert.equal(statSync(`data/ar/raw/${item.name}`).size, item.bytes);
    assert.match(item.sha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(arCatalog.datasets.length, 3);
  assert.equal(arCatalog.sites.length, 2);
  assert.ok(existsSync("public/data/ar/optical-preview.png"));
});
test("AR preserves missing elevation and damaged geology attributes", () => {
  const result = arSurface([-170.21, 39.09]);
  assert.equal(result.elevation_m, null);
  assert.equal(result.slope_deg, null);
  assert.equal(result.geology_unit, null);
  assert.equal(arCatalog.region.routing_available, false);
  assert.ok(arCatalog.geology.features.length > 0);
  assert.ok(result.geology_feature_ids.length > 0);
  assert.throws(() => arSurface([0, 0]), /outside/);
});
test("optical bounds are read from the actual raster and are not replaced by seed bounds", () => {
  assert.ok(arCatalog.optical.bounds[1] > arCatalog.region.bounds[3]);
  assert.ok(arCatalog.warnings.some(w => w.includes("does not overlap")));
});
test("AR endpoint keeps legacy region endpoints available and validates coordinates", async () => {
  const region = arCatalog.region.id;
  const url = new URL(`http://localhost/api/v1/regions/${region}/surface?lon=-170.21&lat=39.09`);
  const result = await handleAr(["regions", region, "surface"], url)!.json() as { elevation_m: number | null };
  assert.equal(result.elevation_m, null);
  assert.equal(handleAr(["regions", "arcadia-planitia-hirise-v1"], url), null);
  assert.throws(() => handleAr(["regions", region, "surface"], new URL('http://localhost/?lon=abc&lat=39')), /Valid lon/);
});
