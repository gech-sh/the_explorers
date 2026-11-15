import grid from "@/data/processed/regional.json";
import manifest from "@/public/data/arcadia-regional-manifest.json";
import { buildTerrainModel } from "./terrain-model";
let model: ReturnType<typeof buildTerrainModel> | undefined;
export const regionalManifest = manifest;
export function regionalTerrainModel() {
  return (model ??= buildTerrainModel(grid, 4));
}
