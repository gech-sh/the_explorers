import { test } from "node:test";
import assert from "node:assert/strict";
import { relativeHumidityIce, climateReport } from "../backend/climate";
import { buildTerrainModel } from "../backend/terrain-model";
import { GRID } from "../backend/terrain";

test("ice humidity uses pressure and molar vapor content without hiding supersaturation", () => {
  // Murphy & Koop saturation at 200 K is approximately 0.16269 Pa.
  assert.ok(Math.abs(relativeHumidityIce(200, 800, 0.0001) - 49.17) < 0.1);
  assert.equal(relativeHumidityIce(200, 800, 0), 0);
  assert.ok(relativeHumidityIce(180, 800, 0.0001) > 100);
  assert.throws(() => relativeHumidityIce(100, 800, 0.0001));
  assert.throws(() => relativeHumidityIce(200, 800, -1));
});
test("climate is an archived Arcadia summer model, with consistent units and hourly closure", () => {
  const report = climateReport();
  assert.equal(report.live, false);
  assert.equal(report.kind, "climate_model");
  assert.deepEqual(report.coordinate, [-171.375, 45.638]);
  assert.equal(report.solar_longitude_deg, 90);
  assert.equal(report.samples.length, 25);
  const noon = report.samples[12];
  assert.ok(Math.abs(noon.air_temperature_c + 32.983) < 0.001);
  for (const s of report.samples) {
    assert.ok(Number.isFinite(s.relative_humidity_ice_percent));
    assert.ok(s.pressure_pa > 0);
  }
  assert.equal(
    report.samples[0].air_temperature_k,
    report.samples[24].air_temperature_k,
  );
});
test("3D mesh preserves metric position, north-up texture and source elevations", () => {
  const m = buildTerrainModel();
  assert.equal(m.positions.length / 3, m.uv.length / 2);
  assert.ok(m.triangle_count > 20000);
  assert.equal(m.indices.length, m.triangle_count * 3);
  assert.equal(m.positions[0], -2390);
  assert.equal(m.positions[2], -1990);
  assert.ok(Math.abs(m.uv[1] - (1 - 0.5 / GRID.rows)) < 1e-10);
  const nx = Math.ceil((GRID.cols - 1) / 2) + 1;
  const ix = 30,
    iy = 40,
    sourceIndex = iy * 2 * GRID.cols + ix * 2,
    index = iy * nx + ix;
  assert.equal(
    m.positions[index * 3 + 1],
    GRID.elevations[sourceIndex]! - m.vertical_origin_m,
  );
  assert.ok(m.indices.every((v) => v >= 0 && v < m.positions.length / 3));
});
test("3D triangles never bridge missing source cells", () => {
  const m = buildTerrainModel(),
    nx = Math.ceil((GRID.cols - 1) / 2) + 1;
  for (let i = 0; i < m.indices.length; i += 3) {
    const vertices = m.indices.slice(i, i + 3),
      xs = vertices.map((v) => Math.min(GRID.cols - 1, (v % nx) * 2)),
      ys = vertices.map((v) => Math.min(GRID.rows - 1, Math.floor(v / nx) * 2));
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++)
      for (let x = Math.min(...xs); x <= Math.max(...xs); x++)
        assert.notEqual(GRID.elevations[y * GRID.cols + x], null);
  }
});
