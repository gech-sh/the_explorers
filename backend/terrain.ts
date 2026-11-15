import grid from "@/data/processed/arcadia.json";
import { gridToLonLat, lonLatToGrid } from "@/shared/projection";
export type Coord = [number, number];
export const DATA_VERSION = grid.id;
export const COLS = grid.cols,
  ROWS = grid.rows,
  CELL = grid.cell_m;
export const GRID = grid;
export const HOME = grid.home.point as Coord;
export const SITES = grid.sites.map((s) => ({
  ...s,
  point: s.point as Coord,
  coordinate: s.coordinate as Coord,
}));
export const REGION = {
  id: grid.id,
  name: "Arcadia Planitia",
  sector: "Terraced-crater investigation sector",
  coordinate_reference: grid.coordinate_reference,
  body: "mars",
  resolution_m: CELL,
  source_native_spacing_m: grid.source_native_spacing_m,
  synthetic: false,
  bounds_m: [grid.width_m, grid.height_m],
  valid_percent: grid.valid_percent,
};
export function inside(p: Coord) {
  return (
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    p[0] >= 1 &&
    p[0] < COLS - 1 &&
    p[1] >= 1 &&
    p[1] < ROWS - 1
  );
}
function sample(values: (number | null)[], x: number, y: number) {
  const ix = Math.round(x),
    iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= COLS || iy >= ROWS) return NaN;
  return values[iy * COLS + ix] ?? NaN;
}
export function elevation(x: number, y: number) {
  return sample(grid.elevations, x, y);
}
export function slope(x: number, y: number) {
  return sample(grid.slopes, x, y);
}
export function blocked(x: number, y: number) {
  return !Number.isFinite(elevation(x, y)) || !Number.isFinite(slope(x, y));
}
export const toLonLat = (p: Coord) => gridToLonLat(grid, p);
export const fromLonLat = (p: Coord) => lonLatToGrid(grid, p);
// No verified local geologic-unit dataset is loaded for this Arcadia sector.
export function geologyAt(_p: Coord): null {
  return null;
}
