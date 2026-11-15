/** Spherical Mars azimuthal-equidistant transform, matching the prepared raster CRS. */
export type Coord = [number, number];
type Frame = {
  center: number[];
  cell_m: number;
  width_m: number;
  height_m: number;
};
const R = 3396190,
  DEG = Math.PI / 180;
export function gridToLonLat(frame: Frame, p: Coord): Coord {
  const lon0 = frame.center[0] * DEG,
    lat0 = frame.center[1] * DEG;
  const x = (p[0] + 0.5) * frame.cell_m - frame.width_m / 2,
    y = frame.height_m / 2 - (p[1] + 0.5) * frame.cell_m,
    rho = Math.hypot(x, y);
  if (rho === 0) return [...frame.center] as Coord;
  const c = rho / R,
    s = Math.sin(c),
    co = Math.cos(c);
  const lat = Math.asin(co * Math.sin(lat0) + (y * s * Math.cos(lat0)) / rho);
  const lon =
    lon0 +
    Math.atan2(x * s, rho * Math.cos(lat0) * co - y * Math.sin(lat0) * s);
  return [lon / DEG, lat / DEG];
}
export function lonLatToMeters(frame: Frame, p: Coord): Coord {
  const lat0 = frame.center[1] * DEG,
    lon = p[0] * DEG,
    lat = p[1] * DEG,
    dl = lon - frame.center[0] * DEG;
  const c = Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        Math.sin(lat0) * Math.sin(lat) +
          Math.cos(lat0) * Math.cos(lat) * Math.cos(dl),
      ),
    ),
  );
  const k = c < 1e-10 ? 1 : c / Math.sin(c);
  const x = R * k * Math.cos(lat) * Math.sin(dl),
    y =
      R *
      k *
      (Math.cos(lat0) * Math.sin(lat) -
        Math.sin(lat0) * Math.cos(lat) * Math.cos(dl));
  return [x, y];
}
export function lonLatToGrid(frame: Frame, p: Coord): Coord {
  const [x, y] = lonLatToMeters(frame, p);
  return [
    Math.round((x + frame.width_m / 2) / frame.cell_m - 0.5),
    Math.round((frame.height_m / 2 - y) / frame.cell_m - 0.5),
  ];
}
