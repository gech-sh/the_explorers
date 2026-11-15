> Historical implementation notes. The access-code/session workflow below was removed; current behavior is described in README.md.

# Arcadia integrated terrain workspace

The tactical frontend and the Arcadia/AR backend are integrated in this folder. Source folders outside `integrated` were not changed.

## Open securely

**https://172.31.98.222:8788**

The server now accepts HTTPS, not HTTP. A team access code protects the app's dataset and API endpoints. Find the code locally in `.secrets/access-code.txt`. Never put it in a URL. Session cookies are Secure, HttpOnly and SameSite=Strict, and expire after eight hours or a server restart.

Before opening the page on either PC, install the public certificate in `security/explorers-local-ca.crt` into that Windows user's Trusted Root Certification Authorities store. Copy the `security` folder to the other PC and run `Trust-Explorers-Certificate.ps1`, accepting Windows' certificate installation prompt. Alternatively, double-click the certificate, choose Install Certificate, Current User, and explicitly select Trusted Root Certification Authorities. Restart the browser if needed. Do not bypass browser certificate warnings.

The automatic trust attempt was canceled. No automatic trust installation is assumed. The public certificate is safe to copy; never copy `.secrets/ca/rootCA-key.pem` or `server-key.pem`. Share only the team access code with authorized teammates.

Keep this PC awake and both PCs on the same Wi-Fi. The existing firewall rule permits port 8788 only from the local subnet on Wi-Fi 2. The address may change after reconnecting; a new address must also be included in the server certificate. No router port forwarding is configured.

## Start and build

Node.js >=22.13 is required. Dependencies, compiled frontend assets and the local database are prepared on this computer.

```powershell
cd C:\Users\getabalew\Documents\nasa\integrated
npm start
```

Or double-click `Start-WiFi.cmd`. The HTTPS gateway listens on 8788; its backend uses verified TLS on loopback port 8789. No backend port is exposed directly on Wi-Fi.

After editing frontend code:

```powershell
npm run build
```

A fresh dependency/database setup uses `npm run setup`. Local TLS certificates and the team access code are intentionally excluded from Git; this workspace's certificate setup must exist before starting. The local database remains in ignored `backend/.wrangler/state`.

## Responsive terrain interface

- Leaflet, icons, Three.js and precompiled Tailwind styles are served locally. There are no external scripts or runtime CSS compilation on startup. The optional Jezero reference image service remains external and loads asynchronously.
- Terrain elevation arrays preload into a dedicated Web Worker. Slope caches remain resident. Point queries and A* pathfinding run in that worker, not the UI thread.
- A separate worker builds meshes and normals, transferring typed buffers to WebGL. Meshes/GPU objects are reused across view changes. Rendering is event-driven, with a capped pixel ratio.
- Route geometry is cached by endpoints, slope setting and resolution. Route calculations reuse cached geometry after Get directions is pressed; editing speed invalidates displayed paths and slider events are coalesced over 100 ms. Request revisions prevent older route results replacing newer selections.
- Press feedback and status messages appear immediately. API requests have timeouts. Static assets are cached in server memory, compressed asynchronously and revalidated with ETags.

## Arcadia source collection

The pill is **Arcadia**. `/api/v1/arcadia` provides one unified catalog with six source records and five study sites. Measured HiRISE/regional grids, AR optical metadata and AR geology records share the same source panel and study-point controls; there is no separate AR region tab.

Combining the catalog does not relocate sources or fabricate a missing DEM. AR points retain their original coordinates, the AR optical footprint remains near latitude 74 N, and measured route coverage remains near 45.638 N. The AR DBF is malformed, so only valid geometry is used; unit names are not fabricated. Choose an AR study location to inspect its geometry. Terrain metrics are hidden where no elevation grid exists.

## Working map controls

- **2D map:** place/drag endpoints; choose local imagery, relief, slope or nighttime infrared; toggle proposed study points and study boundaries.
- **3D terrain:** orbit by dragging, zoom by scrolling and click the terrain to place the active waypoint. Choose detailed HiRISE or the 100 km regional mesh. Relief defaults to 8x for detail and 50x regionally; 1x is available. Exaggeration is labeled. Missing-data holes remain holes.
- Saved plans use the database; routes and terrain cards use measured data. Jezero supports measured directions and point assessments inside its prepared terrain coverage. Arcadia-only thermal layers and 3D controls stay hidden there.
- Oxygen, battery, unconfirmed resource metrics, inactive hazard overlays and other dead controls have been removed from the visible interface. Missing-route metrics are hidden rather than filled with placeholders. Slope flags remain planning indicators, not a safety certification.

## Validation

```powershell
npm run typecheck
npm test
node backend/tests/terrain-worker.test.mjs
python backend/tests/security-smoke.py
```

The security test validates the supplied public CA and hostname; certificate verification is never disabled. It checks authenticated dataset/worker access, secure cookies and cross-origin request rejection.

HTTP/API adapter regression tests target only the private loopback TLS backend and need the CA configured:

```powershell
$env:NODE_EXTRA_CA_CERTS = "$PWD/security/explorers-local-ca.crt"
$env:SSL_CERT_FILE = $env:NODE_EXTRA_CA_CERTS
node backend/tests/frontend-integration.mjs
python backend/tests/api-smoke.py
python backend/tests/ar-api-smoke.py
```

Worker measurements on this PC: preload 654 ms, regional path 46 ms, cached speed update 1 ms and detailed mesh 59 ms. These measure the actual browser worker bundle under Node worker threads, not a claim about every device's rendering or Wi-Fi speed. Browser/WebGL visual verification remains pending certificate trust and available browser automation.

## Global map exploration

The 2D map now uses the global NASA Mars Trek Viking mosaic underneath all local overlays. Arcadia opens at a wider zoom, and Reset Mission View returns to that wider view. The cyan unfilled outline follows the 100 x 100 km measured grid in its Mars projection; it is a coverage marker, not a navigation boundary. Imagery remains visible when panning beyond it or changing local terrain layers. Global imagery requires internet access. Elevation routing and 3D retain their actual loaded-data coverage.

## Left-panel hazard and safety planning

The left panel includes measured slope/missing-data overlays with a focus control, live A/B planning-condition cards, and a route slope-limit slider (1-30 degrees). The default 5-degree limit and 2.8-degree caution setting come from the original frontend's heuristic rules. They are not a NASA safety standard. The selected route limit is passed to the real terrain pathfinder and cached with its route key; settings persist in the browser.

Expand **Original frontend hazard examples** to show the original Arcadia or Jezero crater/scarp zones. Dashed purple shapes are explicitly illustrative and retain their original coordinates and nominal radii. Click a zone or its left-panel entry to inspect it, or focus all examples. Those source examples never substitute for measured terrain or invent a route beyond elevation coverage. All new controls and condition cards are in the left panel.

`node backend/tests/planning-safety.test.mjs` verifies threshold boundaries, missing-data behavior, original scenario locations and Mars-distance geometry.

## From / Destination directions form

The top of the left panel has searchable From and Destination fields, map-pin pickers, a swap button, and Get directions. Suggestions come from loaded Mars study places and Jezero reference locations; no Earth geocoder is used. Coordinate input is `latitude, longitude`, accepting west-negative or 0-360 east longitude. Invalid values produce field-specific errors.

The fields stay synchronized with map clicks, dragged waypoints, scenarios and loaded plans. Editing a field clears the old route display and disables saving until the new endpoints are applied. Successful routes display distance, walking time, source-grid resolution and expandable grid direction segments; the fit button shows both endpoints on the 2D map. Routing retains the actual elevation coverage.

`node backend/tests/directions-form.test.mjs` exercises the real form DOM and live loopback API: suggestions/keyboard selection, coordinate normalization, validation, swapped endpoints, route calculation and displayed direction steps. Configure `NODE_EXTRA_CA_CERTS` as shown above before running it.

## NASA Space Apps: Interplanetary Survival Guide / Martian Map

The **Challenge** page now explains the science-first workflow from the supplied challenge brief. The **Marswalk** workspace adds a complete proposed surface-science mission:

- Select and reorder the three measured Arcadia science stops; edit each objective and observation duration.
- Record crew size and equipment, set walking speed and distance/time/slope limits, and include a return-to-staging leg.
- Calculate the multi-stop traverse in the terrain worker. Budgets include both walking and science time; infeasible missions are rejected and old briefings invalidated.
- Review the itinerary, remaining budgets, peak slope, provenance and limitations; show the complete traverse on the 2D/3D map.
- Save mission inputs and the computed route in the existing database, restore inputs, export a JSON briefing or print the briefing. Crew, equipment and the selected climate-model reference hour are preserved.

The map now combines correctly positioned MRO HiRISE optical context, stereo terrain/slope data and a blendable Mars Odyssey THEMIS nighttime image. These represent optical, topographic and thermal-infrared data from two NASA missions. Topography constrains routing; optical and infrared imagery provide science context. Thermal brightness is not calibrated temperature.

The environmental timeline uses the existing archived Mars Climate Database 6.2 samples (northern summer solstice, one model column at the Arcadia center). Temperature, pressure, wind, dust optical depth and sunlight are modeled context, not live conditions. Radiation, current storms, suit consumables, fatigue and small-rock trafficability remain explicit evidence gaps. No operational safety certification is claimed.

Run `node backend/tests/marswalk-form.test.mjs` with the public CA configured as above. It exercises the real mission form, terrain-worker bundle and API/database together, including a return traverse, science-time accounting, infeasible budgets, saved metadata, environment-hour changes and exported source records. Visual browser review was limited by minimized browser windows; automated form/integration checks passed.


## Jezero Get directions repair

Jezero was shown as a destination view but its directions handler rejected every request because only Arcadia routing was enabled. The app now routes using the previously packaged `data/processed/jezero.json` elevation/slope grid, through both the backend API and browser terrain worker. Region is included in the route cache key.

The default Jezero route is Octavia E. Butler landing to the measured Delta approach waypoint (about 2.50 km with a 5-degree slope limit). Northern traverse and Crater-floor stop are also loaded. The grid covers 6 x 5 km, with about 79.59% valid terrain; no-data is excluded. Neretva Vallis / Bright Angel extends beyond this prepared grid and is not silently given a fake route. **Try a measured study route** restores covered endpoints and computes a route. The border shows coverage while the wider map stays explorable.

`GET /api/v1/jezero` exposes prepared-grid metadata and loaded waypoints. `POST /api/v1/directions` accepts `region: "arcadia" | "jezero"` (Arcadia is the backward-compatible default). `GET /api/v1/identify?region=jezero&lon=...&lat=...` inspects the loaded Jezero grid. Source attribution is to the archived prepared HiRISE grid and USGS HiRISE DTM catalog; an exact original DTM product ID is not asserted by this repair.

## Manual route comparison

Directions are now calculated **only after pressing Get directions**. Startup, changing regions, dragging/selecting map points, swapping endpoints, choosing example endpoints, and editing speed/slope limits clear old route lines and update terrain evidence without automatically finding a new path.

After submission, two alternatives are calculated off the UI thread and displayed together in 2D:

- **Best path - shortest** (blue): shortest feasible grid distance under the chosen slope limit.
- **Safest by slope** (green dashed): minimizes the peak measured slope, then finds the shortest feasible path under that optimal threshold. It may be longer. This does not assess radiation, rocks, sand, suit consumables or all other safety factors.

Select either route card to inspect its distance, time, peak slope and directions; 3D displays the selected route. If both objectives return the same geometry, the UI says so. Missing-data cells and invalid diagonal crossings remain excluded. Browser-worker cache keys include the chosen objective, region, endpoints and limit.

`node backend/tests/manual-directions.test.mjs` verifies the actual app startup/map-drag/speed/swap/example event flows make no routing requests and that Get directions requests both objectives. Algorithm tests verify a shorter steep route and a longer gentle route are correctly distinguished.
