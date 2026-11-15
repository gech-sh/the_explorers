import catalog from "@/data/ar/catalog.json";
import { ApiError } from "./api-error";

export const arCatalog = catalog;
type Point = [number, number];
function inRing([x, y]: Point, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function arSurface(point: Point) {
  const [x, y] = point, [w, s, e, n] = catalog.region.bounds;
  if (x < w || x > e || y < s || y > n)
    throw new ApiError("OUTSIDE_COVERAGE", "Point is outside the AR seed region.", 422);
  const features = catalog.geology.features.filter(feature =>
    feature.rings.reduce((inside, ring) => inside !== inRing(point, ring), false));
  return { coordinate: point, coordinate_reference: "GCS_Mars_2000_Sphere",
    elevation_m: null, slope_deg: null, geology_unit: null,
    geology_feature_ids: features.map(f => f.id),
    source_dataset_ids: features.length ? [catalog.datasets[2].id] : [],
    warnings: catalog.warnings };
}
export function handleAr(path: string[], url: URL): Response | null {
  const send = (value: unknown) => Response.json(value, { headers: { "Cache-Control": "no-store" } });
  if (path[0] === "ar" && path.length === 1)
    return send({ ...catalog, geology: { ...catalog.geology, features: undefined,
      prepared_feature_count: catalog.geology.features.length } });
  if (path[0] === "sites" && path.length === 2) {
    const site = catalog.sites.find(item => item.id === path[1]);
    if (site) return send({ ...site, seed_metadata_verified: false });
    throw new ApiError("NOT_FOUND", "Science site not found.", 404);
  }
  if (path[0] !== "regions" || path[1] !== catalog.region.id) return null;
  if (path.length === 2) return send(catalog.region);
  if (path.length !== 3) throw new ApiError("NOT_FOUND", "AR endpoint not found.", 404);
  switch (path[2]) {
    case "sites": return send({ items: catalog.sites.map(s => ({ ...s, seed_metadata_verified: false })) });
    case "geology": return send({ ...catalog.geology, coordinate_reference: "GCS_Mars_2000_Sphere", warnings: catalog.warnings });
    case "layers": return send({ items: catalog.datasets });
    case "surface": {
      const lon = Number(url.searchParams.get("lon")), lat = Number(url.searchParams.get("lat"));
      if (!url.searchParams.get("lon") || !url.searchParams.get("lat") ||
          !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90)
        throw new ApiError("INVALID_POINT", "Valid lon and lat are required.", 400);
      return send(arSurface([lon, lat]));
    }
    default: throw new ApiError("NOT_FOUND", "AR endpoint not found.", 404);
  }
}
