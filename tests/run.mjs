import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
await mkdir(".sites-runtime/tests", { recursive: true });
for (const suite of [
  "routing",
  "exports",
  "environment",
  "regional",
  "directions",
  "intelligence",
]) {
  const target = path.resolve(`.sites-runtime/tests/${suite}.mjs`);
  await build({
    entryPoints: [`tests/${suite}.test.ts`],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: target,
  });
  await import(pathToFileURL(target).href);
}
