# The Explorers standalone backend

Backend-only copy of the Arcadia API, database, routing and data modules, extended with every supplied dataset under `AR/AR/Data`. There is no frontend application in this folder. The original `arcadia-demo` is unchanged.

## Run

Requires Node.js >=22.13.

```powershell
cd C:\Users\getabalew\Documents\nasa\backend
npm ci
npm run db:local
npm start
```

API: `http://127.0.0.1:8787/api/v1`. `db:local` applies pending migrations once; it is safe to rerun. A separate local SQLite-compatible D1 database lives in ignored `.wrangler/state`. No cloud account or deployment is needed for local development. The API is bound to loopback and has no authentication.

## AR data integration

All five raw files were copied to `data/ar/raw`: `optical.JP2` and `Geology.shp/.shx/.dbf/.prj`. The three seed files were copied to `data/ar/seeds` with normalized `.json` names. Original data and filenames in `AR` are untouched. The raw image is approximately 1.06 GB; this local folder has not been uploaded to GitHub.

`scripts/prepare-ar.py` reads the real raster metadata, creates a masked contrast-stretched preview, extracts geology polygons intersecting the seed region or imagery footprint, and records source sizes and SHA-256 hashes in `data/ar/catalog.json`. All original raw data remain packaged, including the complete global shapefile. Prepared geology retains original coordinates and ring precision. `public/` contains API-served data assets only.

Run preparation again after replacing sources:

```powershell
python -m pip install -r requirements-data.txt
npm run data:prepare
```

Important source limitations found during inspection:

- The JP2 metadata places its bounds near longitude -172.04 to -171.91, latitude 73.96 to 74.22. The seed region is near latitude 39.09. They do not overlap. The API preserves actual stored bounds and exposes the preview separately.
- `Geology.dbf` has a malformed binary header. Geology shapes and point-in-polygon feature identifiers are usable; geological unit names remain null. A valid replacement DBF is required for unit labels.
- No DEM or slope raster exists in AR. Its topographic catalog entry is marked unavailable; AR elevation/slope are null and AR routing is disabled.
- Seed science descriptions, acquisition dates and source claims are preserved as unverified user-supplied metadata. The image product identity has not been independently verified.
- The existing measured HiRISE routing region, original processed grids and climate records are preserved separately. They are not assigned to AR coordinates.

## Endpoints for frontend integration

| Endpoint | Result |
| --- | --- |
| `GET /api/v1/ar` | AR source inventory, checksums, optical bounds and warnings |
| `GET /api/v1/datasets` | Original three datasets plus the three AR records |
| `GET /api/v1/datasets?region_id={id}&data_type={type}` | Filtered dataset catalog |
| `GET /api/v1/datasets/{id}` | Individual original or AR dataset |
| `GET /api/v1/regions` | Original measured region and AR seed region |
| `GET /api/v1/regions/{AR-id}/sites` | Supplied AR science-site records |
| `GET /api/v1/sites/{id}` | Individual AR science site |
| `GET /api/v1/regions/{AR-id}/layers` | AR dataset layer metadata |
| `GET /api/v1/regions/{AR-id}/geology` | Prepared polygon rings, source feature IDs and attribute status |
| `GET /api/v1/regions/{AR-id}/surface?lon=-170.21&lat=39.09` | Real geometry matches; null elevation, slope and unit names |
| `GET /data/ar/optical-preview.png` | Preview generated from the actual JP2 |

AR region ID: `8f4b2c1a-7d3e-4a9b-8c1f-2e5d6a7b8c9d`. Existing mission, route, directions, hazard, climate and export endpoints are documented in [docs/API.md](docs/API.md). The manifests also reference frontend atlas images not included in this backend package; regional layers and the AR preview are included. Raw JP2/shapefile downloads are not served by the API.

## Verification

```powershell
npm run typecheck
npm test
# With npm start running:
python tests/api-smoke.py
python tests/ar-api-smoke.py
```

HTTP tests default to port 8787; set `API_BASE_URL` to test another running instance. Mission smoke checks create and delete only their own temporary records.
