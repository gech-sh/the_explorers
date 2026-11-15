import { GRID } from "./terrain";
import type { TerrainModel } from "@/shared/terrain-model";
type MeshGrid = Pick<
  typeof GRID,
  | "id"
  | "cols"
  | "rows"
  | "cell_m"
  | "width_m"
  | "height_m"
  | "elevation_min_m"
  | "elevations"
  | "dtm_id"
> & { source_url?: string };
export function buildTerrainModel(
  grid: MeshGrid = GRID,
  stride = 2,
): TerrainModel {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [],
    valid: boolean[] = [];
  const xs = Array.from(
    { length: Math.ceil((grid.cols - 1) / stride) },
    (_, i) => i * stride,
  );
  xs.push(grid.cols - 1);
  const ys = Array.from(
    { length: Math.ceil((grid.rows - 1) / stride) },
    (_, i) => i * stride,
  );
  ys.push(grid.rows - 1);
  const origin = grid.elevation_min_m;
  for (const y of ys)
    for (const x of xs) {
      const h = grid.elevations[y * grid.cols + x];
      valid.push(h !== null && Number.isFinite(h));
      positions.push(
        (x + 0.5) * grid.cell_m - grid.width_m / 2,
        h === null ? 0 : h - origin,
        (y + 0.5) * grid.cell_m - grid.height_m / 2,
      );
      uv.push((x + 0.5) / grid.cols, 1 - (y + 0.5) / grid.rows);
    }
  for (let j = 0; j < ys.length - 1; j++)
    for (let i = 0; i < xs.length - 1; i++) {
      // Every skipped source cell must also be valid. Never bridge a no-data hole.
      let covered = true;
      for (let y = ys[j]; y <= ys[j + 1]; y++)
        for (let x = xs[i]; x <= xs[i + 1]; x++)
          if (grid.elevations[y * grid.cols + x] === null) covered = false;
      const a = j * xs.length + i,
        b = a + 1,
        c = a + xs.length,
        d = c + 1;
      if (covered && [a, b, c, d].every((v) => valid[v]))
        indices.push(a, c, b, b, c, d);
    }
  return {
    region_id: grid.id,
    source_dataset_id: grid.dtm_id,
    units: "meters",
    axes: "X east, Y up, Z south; texture north at top",
    vertical_origin_m: origin,
    source_grid_m: grid.cell_m,
    mesh_spacing_m: grid.cell_m * stride,
    width_m: grid.width_m,
    height_m: grid.height_m,
    positions,
    uv,
    indices,
    triangle_count: indices.length / 3,
    source_url:
      grid.source_url ??
      "https://www.uahirise.org/dtm/dtm.php?ID=ESP_034082_2260",
  };
}
let cached: TerrainModel | undefined;
export function terrainModel() {
  return (cached ??= buildTerrainModel());
}
