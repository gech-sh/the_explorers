# Arcadia Planitia API

Base: `/api/v1`. JSON requests/responses, except CSV and printable HTML exports. Errors use `{ "error": { "code": "...", "message": "..." } }`.

Active region: `arcadia-planitia-hirise-v1`. Coordinates are **Mars [longitude, latitude]**, longitude -180..180. Geometry is not Earth EPSG:4326. Distances use meters, durations seconds, slopes degrees, elevations meters relative to the Mars aeroid.

| Method | Endpoint | Purpose | Owner |
| --- | --- | --- | --- |
| GET | /health | API status and dataset version | g |
| GET | /ready | Database and prepared-grid readiness | g |
| GET | /hazards | Derived slope/unknown-terrain polygons, thresholds, grid hashes and source scales; projected Mars meters | e; y consumes |
| GET | /resources | Proposed study points and regional ice evidence; no confirmed deposits or quantitative ice raster | g; k consumes |
| GET | /identify?lon=-171.375&lat=45.638 | Point elevation, slope, terrain flag, resource evidence and unresolved hazards | e with g; y consumes |
| POST | /directions | Custom begin/end coordinates, slope-weighted directions and grid-based steps; no database write | g/e; y consumes |
| GET | /regional | 100 x 100 km (10,000 km²) regional frame, sources, coverage and four layers | g; y consumes |
| GET | /regional/terrain-model | Regional MOLA/HRSC mesh; 200 m grid, 800 m mesh sampling | e with g |
| GET | /regions | Available measured regions | g; y consumes |
| GET | /regions/{region} | Region, resolution, coverage and proposed origin | g |
| GET | /regions/{region}/layers | Optical, topographic, slope and infrared catalog | g; y consumes |
| GET | /regions/{region}/sites | Proposed observation areas and defaults | Member 5 |
| GET | /regions/{region}/surface?lon=-171.375&lat=45.638 | Nearest grid sample; elevation, slope and source | e |
| GET | /regions/{region}/climate | Archived MCD 6.2 summer daily cycle; K, °C, Pa, vapor mol/mol and derived RH relative to ice | g; k consumes |
| GET | /regions/{region}/terrain-model | Cached metric triangle mesh, UVs and HiRISE provenance; 40 m sampling, no-data holes preserved | e with g; y consumes |
| GET | /regions/{region}/geology | Explicit unavailable status; no invented units | Member 5 |
| GET | /regions/{region}/traverse | Explicit unavailable status; no rover history | Member 5 |
| GET | /datasets | Three-source provenance registry | Member 5 |
| GET | /datasets/{id} | Individual source record | Member 5 |
| GET | /images | Six-view image atlas and provenance | g; y consumes |
| GET | /images/{id} | Image asset URLs, frame and source metadata | g; y consumes |
| POST | /missions | Save mission, objectives, dwell times and notebook | g; k consumes |
| GET | /missions | Latest 50 missions, including legacy-region records | g |
| GET | /missions/{id} | Read a mission | g |
| DELETE | /missions/{id} | Delete mission and dependent routes | g |
| POST | /missions/{id}/routes | Compute and store a sourced route | e |
| GET | /missions/{id}/routes | Calculated routes in creation order | e |
| GET | /routes/{id} | Geometry, metrics, itinerary and provenance | e |
| GET | /routes/{id}/profile | Measured-grid profile samples | e |
| GET | /routes/{id}/export?format=json | Full original record and input snapshot | Member 5 |
| GET | /routes/{id}/export?format=csv | Profile samples and Mars coordinates | Member 5 |
| GET | /routes/{id}/export?format=brief | Printable HTML briefing; browser can save PDF | Member 5 |

## Save a mission

The point identifier selects the 20 m inset where covered, otherwise the regional 200 m grid. It preserves unknown terrain instead of silently substituting a coarse safety claim. Flags are `unknown`, `steep` (>=10 degrees), `caution` (>=3 and <10), or `no_terrain_flag`. These are heuristic planning thresholds, not NASA astronaut safety standards. Polygon coordinates from `/hazards` are local Mars `[east, north]` meters; do not interpret them as Earth GeoJSON longitude/latitude. Resource points have `confirmed:false` and `status:proposed_investigation`; ice probability and depth remain null. The climate endpoint now includes archived wind, dust optical depth, surface solar flux and modeled surface water-ice loading with separate query provenance. Rain/snow rates and radiation dose remain null. Directions include sampled slope-flag counts; these are not an assessment of rocks, dust storms or radiation.

Custom point-to-point directions are separate from saved science missions. `POST /api/v1/directions` accepts `{ "start": [-171.4037, 45.62096], "end": [-171.37235, 45.64121], "max_slope_deg": 18, "walking_speed_m_s": 0.5, "resolution": "auto" }`. Coordinates are Mars `[longitude, latitude]` using longitude -180..180. Optional defaults: slope 18 degrees, speed 0.5 m/s, resolution `auto`. `auto` uses HiRISE 20 m when both endpoints fall inside the inset; otherwise it uses the regional 200 m elevation grid. Explicit `detail` or `regional` selects that source. The result includes requested/snapped endpoints, geometry, projected metric `map_points` (east, north), grouped heading steps, walking metrics, settings and source warnings. Outside coverage, identical grid endpoints, unsupported terrain and infeasible slope limits return validation errors. Regional routes are conceptual; the service cannot certify astronaut trafficability. It creates no mission or route database records.

```json
{
  "name": "Arcadia terrace investigation",
  "site_ids": ["terrace", "plains"],
  "return_to_start": true,
  "notes": "Compare orbital morphology before proposing field sampling.",
  "observation_tasks": [
    { "site_id": "terrace", "objective": "Document terrace morphology", "dwell_time_s": 1200 },
    { "site_id": "plains", "objective": "Compare plains texture", "dwell_time_s": 900 }
  ],
  "constraints": {
    "max_slope_deg": 18,
    "max_distance_m": 12000,
    "max_duration_s": 21600,
    "walking_speed_m_s": 0.5
  }
}
```

Returns 201 with ID, data_version, region_id, revision and created_at. `site_ids` must contain 1-3 unique IDs from `terrace`, `plains`, `rim`, in visit order. Observation overrides are optional and unique per site; omitted overrides use the proposed site defaults. Objectives are 1-500 characters; dwell times are integer seconds from 60 to 3600. Notes are at most 3000 characters. Unknown fields are rejected.

POST `/missions/{id}/routes` requires no body. It returns 201 with:

- Mars geometry, grid points, profile, total distance, walking/science/total duration, peak grid slope and ascent.
- An itinerary with each leg's destination, distance, walking time, observation time and elapsed arrival/departure.
- Remaining time and distance budgets, and sampled slope distribution.
- Proposed destination coordinates, objectives and dwell times; original input snapshot.
- Dataset IDs, full provenance, source retrieval time, projection, model assumptions and scientific limits.

Walking time is rounded per leg; itinerary totals equal the reported mission duration. A* minimizes slope-weighted travel over the prepared grid, with no-data exclusion and no diagonal corner cutting. Stops follow the selected order; this is not an automatic optimal-tour solver.

## Exports and persistence

JSON includes provenance and the mission snapshot. CSV contains distance, Mars longitude/latitude, measured-grid elevation and slope. Brief HTML escapes user content and offers print/save-as-PDF through the browser. CSV and brief exports reject routes from other dataset versions; JSON preserves their original record.

Edited plans are saved as new immutable mission records. PATCH is not implemented. Copies use POST with the copied configuration. Old-region records stay readable but cannot be recalculated on Arcadia terrain. Deletion cascades to routes.

## Errors

- 400: invalid JSON or unsupported export format.
- 404: resource absent.
- 409 LEGACY_MISSION / LEGACY_ROUTE: incompatible region or dataset.
- 422: invalid inputs, no feasible path, distance/time budget exceeded, out of coverage or no elevation data.
- 503: local storage unavailable.

The surface response distinguishes requested coordinates from the sampled grid center. `geology` is null because no verified local geologic-unit layer is loaded for this Arcadia sector. Thermal imagery is display context, not a calibrated temperature or ice measurement.

This is one local workspace without authentication. Add identity, ownership and rate limits before any public exposure.
