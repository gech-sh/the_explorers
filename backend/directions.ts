import regional from "@/data/processed/regional.json";
import { GRID as detail } from "./terrain";
import { findGridPath } from "./grid-path";
import { ApiError } from "./api-error";
import { gridToLonLat, lonLatToGrid, type Coord } from "@/shared/projection";
type Request = {
  start: Coord;
  end: Coord;
  max_slope_deg: number;
  walking_speed_m_s: number;
  resolution: "auto" | "regional" | "detail";
};
let regionalSlopes: (number | null)[] | undefined;
function slopes() {
  if (regionalSlopes) return regionalSlopes;
  const { cols, rows, cell_m, elevations } = regional;
  regionalSlopes = elevations.map((h, i) => {
    const x = i % cols,
      y = Math.floor(i / cols);
    if (h === null || x === 0 || y === 0 || x === cols - 1 || y === rows - 1)
      return null;
    const neighbors = [
      elevations[i - 1],
      elevations[i + 1],
      elevations[i - cols],
      elevations[i + cols],
    ];
    if (neighbors.some((v) => v === null)) return null;
    return (
      (Math.atan(
        Math.hypot(
          (neighbors[1]! - neighbors[0]!) / (2 * cell_m),
          (neighbors[3]! - neighbors[2]!) / (2 * cell_m),
        ),
      ) *
        180) /
      Math.PI
    );
  });
  return regionalSlopes;
}
export function calculateDirections(input: Request) {
  const inside = (
    grid: Pick<
      typeof regional,
      "cols" | "rows" | "center" | "cell_m" | "width_m" | "height_m"
    >,
    p: Coord,
  ) => {
    const [x, y] = lonLatToGrid(grid, p);
    return x >= 1 && y >= 1 && x < grid.cols - 1 && y < grid.rows - 1;
  };
  if (!inside(regional, input.start) || !inside(regional, input.end))
    throw new ApiError(
      "OUTSIDE_COVERAGE",
      "Choose both endpoints inside the 100 × 100 km Arcadia map.",
    );
  const fine = inside(detail, input.start) && inside(detail, input.end);
  if (input.resolution === "detail" && !fine)
    throw new ApiError(
      "OUTSIDE_DETAIL",
      "20 m directions require both endpoints within the HiRISE planning inset.",
    );
  const grid =
    input.resolution === "detail" || (input.resolution === "auto" && fine)
      ? detail
      : { ...regional, slopes: slopes() };
  const start = lonLatToGrid(grid, input.start),
    end = lonLatToGrid(grid, input.end);
  if (start[0] === end[0] && start[1] === end[1])
    throw new ApiError(
      "SAME_CELL",
      `Choose endpoints at least one ${grid.cell_m} m grid cell apart.`,
    );
  const path = findGridPath(grid, start, end, input.max_slope_deg),
    mapPoints = path.map((p) => [
      (p[0] + 0.5) * grid.cell_m - grid.width_m / 2,
      grid.height_m / 2 - (p[1] + 0.5) * grid.cell_m,
    ]);
  const compass = [
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
  ];
  const steps: {
    instruction: string;
    heading: string;
    distance_m: number;
    duration_s: number;
    coordinate: Coord;
    path_index: number;
  }[] = [];
  let distance = 0,
    ascent = 0,
    maxSlope = 0;
  let cautionSamples = 0,
    steepSamples = 0;
  for (let i = 0; i < path.length; i++) {
    const p = path[i],
      slope = grid.slopes[p[1] * grid.cols + p[0]]!;
    maxSlope = Math.max(maxSlope, slope);
    if (slope >= 10) steepSamples++;
    else if (slope >= 3) cautionSamples++;
    if (!i) continue;
    const previous = path[i - 1],
      dx = p[0] - previous[0],
      dy = p[1] - previous[1];
    const length = Math.hypot(dx, dy) * grid.cell_m;
    distance += length;
    ascent += Math.max(
      0,
      grid.elevations[p[1] * grid.cols + p[0]]! -
        grid.elevations[previous[1] * grid.cols + previous[0]]!,
    );
    const direction =
        compass[(Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) + 8) % 8],
      last = steps.at(-1);
    if (last?.heading === direction) {
      last.distance_m += length;
      last.duration_s = last.distance_m / input.walking_speed_m_s;
    } else
      steps.push({
        instruction: `${steps.length ? "Continue" : "Head"} ${direction}`,
        heading: direction,
        distance_m: length,
        duration_s: length / input.walking_speed_m_s,
        coordinate: gridToLonLat(grid, previous),
        path_index: i - 1,
      });
  }
  const fineUsed = grid.id === detail.id;
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    data_version: grid.id,
    kind: fineUsed ? "detailed_traverse" : "regional_concept_route",
    resolution_m: grid.cell_m,
    terrain_flags: {
      caution_samples: cautionSamples,
      steep_samples: steepSamples,
      total_samples: path.length,
      thresholds_deg: { caution: 3, steep: 10 },
      note: "Slope flags only; heuristic thresholds, not a complete astronaut hazard assessment.",
    },
    coordinate_reference: regional.coordinate_reference,
    start: { requested: input.start, snapped: gridToLonLat(grid, start) },
    end: { requested: input.end, snapped: gridToLonLat(grid, end) },
    geometry: {
      type: "LineString" as const,
      coordinates: path.map((p) => gridToLonLat(grid, p)),
    },
    map_points: mapPoints,
    metrics: {
      distance_m: Math.round(distance),
      duration_s: Math.round(distance / input.walking_speed_m_s),
      ascent_m: Math.round(ascent),
      max_slope_deg: Math.round(maxSlope * 10) / 10,
    },
    steps: steps.map((s) => ({
      ...s,
      distance_m: Math.round(s.distance_m),
      duration_s: Math.round(s.duration_s),
    })),
    settings: input,
    source_dataset_id: grid.dtm_id,
    source_url: fineUsed
      ? "https://www.uahirise.org/dtm/dtm.php?ID=ESP_034082_2260"
      : regional.source_url,
    warnings: [
      fineUsed
        ? "20 m HiRISE grid; individual rocks and sand hazards remain unresolved."
        : "200 m regional terrain gives conceptual directions only; it cannot establish a walkable astronaut route.",
      `Endpoints snap to ${grid.cell_m} m grid nodes; turn instructions follow the grid, not mapped roads.`,
      "Walking time assumes constant speed and excludes observations, fatigue, suit limits and current conditions.",
    ],
  };
}
