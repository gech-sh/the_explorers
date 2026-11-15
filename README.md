# The Explorers backend

Backend contribution for the Arcadia Planitia Mars exploration workspace. Includes the API, D1 database schema/migration, measured terrain routing, regional directions, climate reports, hazard/resource identification, and mission exports.

## Install and check

Requires Node.js >=22.13.

```sh
npm ci
npm run typecheck
npm test
```

## Integrate with the frontend

This branch contains the backend package, not a standalone web application. Merge it with the frontend application and keep the `@/*` TypeScript alias pointing to the project root. `app/api/v1/[...path]/route.ts` exposes the handler in a Next/Vinext-compatible application. The runtime must support `cloudflare:workers` and supply a D1 database binding named `DB`. Apply `drizzle/0000_amused_blockbuster.sql` to a fresh database before using mission persistence. Do not commit the local database or environment credentials.

See [docs/API.md](docs/API.md) for endpoints and response contracts. The Python smoke checks in `tests/` require the integrated application to be running (see each script for its URL configuration); they create and clean up temporary records.

## Data and limitations

`data/processed/` contains prepared grids and climate products required by the API. `public/data/` contains source manifests, derived hazards, and the four regional image layers used by backend regression checks. Other optical/atlas images referenced by the manifests belong to the frontend/data integration package and are not included here. Raw source archives and data preparation tools remain in the original local workspace; [data/README.md](data/README.md) describes their provenance and upstream workflow.

The terrain uses measured NASA/USGS products. Proposed stops and resource investigations are not confirmed deposits or rover locations. Regional routes are conceptual; weather is archived modeled climatology, not a live forecast. This local collaboration API has no authentication; use loopback access until authentication is added.
