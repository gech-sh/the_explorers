import {
  CELL,
  COLS,
  ROWS,
  HOME,
  SITES,
  elevation,
  slope,
  blocked,
  toLonLat,
  inside,
  type Coord,
  DATA_VERSION,
  GRID,
} from "./terrain";
export { ApiError } from "./api-error";
import { ApiError } from "./api-error";
import { findGridPath } from "./grid-path";
export type MissionInput = {
  name: string;
  site_ids: string[];
  notes?: string;
  crew_count?: number;
  equipment?: string;
  model_local_hour?: number;
  observation_tasks?: {
    site_id: string;
    objective: string;
    dwell_time_s: number;
  }[];
  constraints: {
    max_slope_deg: number;
    max_distance_m: number;
    max_duration_s: number;
    walking_speed_m_s: number;
  };
  return_to_start: boolean;
};
const leg = (start: Coord, end: Coord, maxSlope: number) =>
  findGridPath(GRID, start, end, maxSlope);
export function calculateRoute(mission: MissionInput) {
  const sites = mission.site_ids.map((id) => {
    const site = SITES.find((s) => s.id === id);
    if (!site)
      throw new ApiError(
        "INVALID_SITE",
        "A selected site is not in the current dataset.",
      );
    const task = mission.observation_tasks?.find((t) => t.site_id === id);
    return {
      ...site,
      objective: task?.objective ?? site.objective,
      dwell_time_s: task?.dwell_time_s ?? site.dwell_time_s,
    };
  });
  const stops: Coord[] = [
    HOME,
    ...sites.map((s) => s.point),
    ...(mission.return_to_start ? [HOME] : []),
  ];
  let points: Coord[] = [];
  const segments: {
    from: string;
    to: string;
    distance_m: number;
    walking_duration_s: number;
    observation_duration_s: number;
    arrival_elapsed_s: number;
    departure_elapsed_s: number;
    site_id: string | null;
  }[] = [];
  let elapsed = 0;
  for (let i = 1; i < stops.length; i++) {
    const segment = leg(
      stops[i - 1],
      stops[i],
      mission.constraints.max_slope_deg,
    );
    points.push(...(i === 1 ? segment : segment.slice(1)));
    const length = segment
      .slice(1)
      .reduce(
        (sum, p, j) =>
          sum + Math.hypot(p[0] - segment[j][0], p[1] - segment[j][1]) * CELL,
        0,
      );
    const walking = Math.round(length / mission.constraints.walking_speed_m_s);
    const destination = sites[i - 1];
    const dwell = destination?.dwell_time_s ?? 0;
    segments.push({
      from: i === 1 ? "Proposed staging point" : sites[i - 2].name,
      to: destination?.name ?? "Return to origin",
      distance_m: Math.round(length),
      walking_duration_s: walking,
      observation_duration_s: dwell,
      arrival_elapsed_s: elapsed + walking,
      departure_elapsed_s: elapsed + walking + dwell,
      site_id: destination?.id ?? null,
    });
    elapsed += walking + dwell;
  }
  let distance = 0;
  const profile = points.map((p, i) => {
    if (i)
      distance +=
        Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) * CELL;
    return {
      distance_m: Math.round(distance),
      elevation_m: Math.round(elevation(...p) * 10) / 10,
      slope_deg: Math.round(slope(...p) * 10) / 10,
    };
  });
  const science = sites.reduce((n, s) => n + s.dwell_time_s, 0),
    walking = segments.reduce((n, s) => n + s.walking_duration_s, 0),
    duration = walking + science;
  if (distance > mission.constraints.max_distance_m)
    throw new ApiError(
      "DISTANCE_LIMIT",
      "The route exceeds your distance budget. Remove a stop or increase the budget.",
    );
  if (duration > mission.constraints.max_duration_s)
    throw new ApiError(
      "DURATION_LIMIT",
      "The route exceeds your time budget. Remove a stop or increase the budget.",
    );
  return {
    id: crypto.randomUUID(),
    status: "computed",
    synthetic: false,
    data_version: DATA_VERSION,
    coordinate_reference: GRID.coordinate_reference,
    grid_points: points,
    geometry: { type: "LineString", coordinates: points.map(toLonLat) },
    metrics: {
      distance_m: Math.round(distance),
      walking_duration_s: walking,
      science_duration_s: science,
      total_duration_s: duration,
      max_slope_deg: Math.max(...profile.map((p) => p.slope_deg)),
      ascent_m: Math.round(
        profile
          .slice(1)
          .reduce(
            (n, p, i) =>
              n + Math.max(0, p.elevation_m - profile[i].elevation_m),
            0,
          ),
      ),
    },
    profile,
    itinerary: segments,
    budget: {
      distance_limit_m: mission.constraints.max_distance_m,
      distance_remaining_m: Math.round(
        mission.constraints.max_distance_m - distance,
      ),
      duration_limit_s: mission.constraints.max_duration_s,
      duration_remaining_s: mission.constraints.max_duration_s - duration,
    },
    terrain_distribution: {
      gentle_percent: Math.round(
        (profile.filter((p) => p.slope_deg < 5).length / profile.length) * 100,
      ),
      moderate_percent: Math.round(
        (profile.filter((p) => p.slope_deg >= 5 && p.slope_deg < 10).length /
          profile.length) *
          100,
      ),
      steep_percent: Math.round(
        (profile.filter((p) => p.slope_deg >= 10).length / profile.length) *
          100,
      ),
    },
    assumptions: {
      terrain_grid_resolution_m: CELL,
      walking_speed_m_s: mission.constraints.walking_speed_m_s,
      duration_model: "constant_speed_plus_dwell",
      algorithm: "A* slope-weighted HiRISE grid v2",
      projection: GRID.crs,
      source_native_spacing_m: GRID.source_native_spacing_m,
      vertical_reference: GRID.vertical_reference,
      destination_snapping:
        "Nearest 20 m grid node; proposed coordinates retained separately",
    },
    warnings: [
      "Measured HiRISE terrain resampled to 20 m. Small rocks, sand and other unresolved hazards are not assessed.",
      "No-data cells are excluded. Observation targets and the staging origin are proposed planning inputs, not landed mission positions.",
      "Proposed traverse for research planning; not validated for astronaut operations. Duration excludes fatigue, suit performance and live conditions.",
    ],
    source_dataset_ids: [GRID.dtm_id],
    source_retrieved_at: GRID.retrieved_at,
    destinations: sites.map((s) => ({
      id: s.id,
      location_type: "proposed" as const,
      planned_coordinate: s.coordinate,
      snapped_coordinate: toLonLat(s.point),
      name: s.name,
      objective: s.objective,
      observation_duration_s: s.dwell_time_s,
    })),
  };
}
