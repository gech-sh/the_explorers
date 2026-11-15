import regional from "@/data/processed/regional.json";
import { GRID as detail } from "./terrain";
import { lonLatToGrid, type Coord } from "@/shared/projection";
import resources from "@/data/processed/resources.json";
import hazards from "@/public/data/arcadia-hazards.json";
import { ApiError } from "./api-error";
export const hazardCatalog = hazards,
  resourceCatalog = resources;
export function terrainFlag(slope: number | null) {
  return slope === null || !Number.isFinite(slope)
    ? "unknown"
    : slope >= 10
      ? "steep"
      : slope >= 3
        ? "caution"
        : "no_terrain_flag";
}
export function identifyPoint(coordinate: Coord) {
  const inside = (g: typeof regional, p: Coord) => {
    const [x, y] = lonLatToGrid(g, p);
    return x >= 0 && y >= 0 && x < g.cols && y < g.rows;
  };
  if (!inside(regional, coordinate))
    throw new ApiError(
      "OUTSIDE_COVERAGE",
      "Point is outside the 100 × 100 km map.",
    );
  const [fx, fy] = lonLatToGrid(detail, coordinate),
    fine = fx >= 0 && fy >= 0 && fx < detail.cols && fy < detail.rows;
  const g = fine ? detail : regional,
    [x, y] = lonLatToGrid(g, coordinate),
    index = y * g.cols + x,
    h = g.elevations[index];
  let slope: number | null = null;
  if (fine) slope = detail.slopes[index];
  else if (x > 0 && y > 0 && x < g.cols - 1 && y < g.rows - 1) {
    const neighbors = [
      g.elevations[index - 1],
      g.elevations[index + 1],
      g.elevations[index - g.cols],
      g.elevations[index + g.cols],
    ];
    if (neighbors.every((v) => v !== null))
      slope =
        (Math.atan(
          Math.hypot(
            (neighbors[1]! - neighbors[0]!) / (2 * g.cell_m),
            (neighbors[3]! - neighbors[2]!) / (2 * g.cell_m),
          ),
        ) *
          180) /
        Math.PI;
  }
  const neighbors: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (x + dx < 0 || x + dx >= g.cols || y + dy < 0 || y + dy >= g.rows)
        continue;
      const v = g.elevations[(y + dy) * g.cols + x + dx];
      if (v !== null) neighbors.push(v);
    }
  const classification = h === null ? "unknown" : terrainFlag(slope);
  return {
    coordinate,
    scope: fine ? "detail" : "regional",
    resolution_m: g.cell_m,
    elevation_m: h,
    slope_deg: slope,
    local_3x3_relief_m:
      neighbors.length === 9
        ? Math.max(...neighbors) - Math.min(...neighbors)
        : null,
    danger: {
      classification,
      thresholds_deg: { caution: 3, steep: 10 },
      basis:
        "Elevation-derived slope and data coverage only; heuristic planning thresholds, not a NASA astronaut risk standard.",
      message: {
        unknown:
          "Terrain or slope data is missing here; local safety is unresolved.",
        steep:
          "Steeper measured terrain. Review this area and your route slope limit.",
        caution:
          "Slope caution at this grid resolution. Inspect imagery and unresolved hazards.",
        no_terrain_flag:
          "No slope threshold triggered. This does not establish safe or trafficable ground.",
      }[classification],
    },
    resources: {
      water_ice: {
        status: "regional_evidence_only",
        confirmed: false,
        probability: null,
        depth_m: null,
        source_url: resources.regional_evidence_url,
        note: "Arcadia ice research does not verify a deposit at this coordinate.",
      },
      regolith: {
        status: "composition_unknown",
        confirmed_minerals: [],
        note: "Surface composition and extractability require measurements; no assay is loaded.",
      },
      solar: {
        status: "regional_model_only",
        note: "The climate panel shows modeled sunlight at the sector center; local horizon, panel yield and installed infrastructure are unknown.",
      },
    },
    unavailable_hazards: [
      "Rock and sand trafficability",
      "Radiation dose",
      "Current dust storm and wind",
      "Verified subsurface stability",
    ],
    source_dataset_id: g.dtm_id,
    source_url: fine
      ? "https://www.uahirise.org/dtm/dtm.php?ID=ESP_034082_2260"
      : regional.source_url,
  };
}
