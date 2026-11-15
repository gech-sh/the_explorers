import { test } from "node:test";
import assert from "node:assert/strict";
import {
  terrainFlag,
  identifyPoint,
  hazardCatalog,
  resourceCatalog,
} from "../backend/intelligence";
import { GRID, toLonLat, HOME } from "../backend/terrain";
import { climateReport } from "../backend/climate";
import extras from "../data/processed/climate-extras.json";
test("danger labels distinguish slope thresholds, missing terrain and absence of a flag", () => {
  assert.equal(terrainFlag(null), "unknown");
  assert.equal(terrainFlag(NaN), "unknown");
  assert.equal(terrainFlag(0), "no_terrain_flag");
  assert.equal(terrainFlag(2.99), "no_terrain_flag");
  assert.equal(terrainFlag(3), "caution");
  assert.equal(terrainFlag(9.99), "caution");
  assert.equal(terrainFlag(10), "steep");
  const p = identifyPoint(toLonLat(HOME));
  assert.equal(p.resolution_m, 20);
  assert.ok(p.elevation_m !== null);
  assert.equal(p.resources.water_ice.probability, null);
  assert.equal(p.resources.water_ice.confirmed, false);
  const missing = GRID.elevations.findIndex((v) => v === null);
  const point = identifyPoint(
    toLonLat([missing % GRID.cols, Math.floor(missing / GRID.cols)]),
  );
  assert.equal(point.danger.classification, "unknown");
  assert.equal(point.elevation_m, null);
  assert.throws(() => identifyPoint([0, 0]), /outside/);
});
test("hazard polygon areas match source-cell counts at their stated resolution", () => {
  for (const summary of hazardCatalog.summaries)
    for (const category of ["caution", "steep", "unknown"] as const) {
      const area = hazardCatalog.features
        .filter(
          (f) =>
            f.properties.scope === summary.scope &&
            f.properties.category === category,
        )
        .reduce((n, f) => n + f.properties.area_m2, 0);
      assert.equal(area, summary.cells[category] * summary.resolution_m ** 2);
    }
  assert.ok(hazardCatalog.features.length > 0);
  assert.ok(hazardCatalog.limits.includes("not safe"));
});
test("resource identifiers are proposals and never imply measured reserves", () => {
  assert.equal(resourceCatalog.confirmed_deposits, 0);
  assert.equal(resourceCatalog.ice_raster_loaded, false);
  assert.equal(resourceCatalog.ice_probability, null);
  assert.equal(resourceCatalog.ice_depth_m, null);
  assert.equal(resourceCatalog.items.length, 3);
  assert.ok(
    resourceCatalog.items.every(
      (p) => !p.confirmed && p.status === "proposed_investigation",
    ),
  );
});
test("rainfall and radiation stay unknown while sourced climate extras use real units", () => {
  const report = climateReport();
  assert.equal(report.precipitation.rainfall_mm_h, null);
  assert.equal(report.precipitation.snowfall_mm_h, null);
  assert.equal(report.radiation.dose_rate_msv_h, null);
  assert.equal(report.live, false);
  assert.deepEqual(extras.coordinate, report.coordinate);
  assert.equal(extras.solar_longitude_deg, report.solar_longitude_deg);
  for (const s of report.samples) {
    assert.ok(s.wind_speed_m_s >= 0);
    assert.ok(s.dust_optical_depth >= 0);
    assert.ok(s.surface_solar_flux_w_m2 >= 0);
    assert.ok(s.surface_water_ice_kg_m2 >= 0);
  }
  assert.equal(report.samples[12].wind_speed_m_s, 3.77005);
});
