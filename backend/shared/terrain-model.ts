export type TerrainModel = {
  region_id: string;
  source_dataset_id: string;
  units: string;
  axes: string;
  vertical_origin_m: number;
  source_grid_m: number;
  mesh_spacing_m: number;
  positions: number[];
  uv: number[];
  indices: number[];
  width_m: number;
  height_m: number;
  triangle_count: number;
  source_url: string;
};
