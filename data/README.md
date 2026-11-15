# Arcadia Planitia measured-data package

Derived intelligence lives in `../public/data/arcadia-hazards.json` (139 source-backed slope/missing-data polygons, local projected meters) and `processed/resources.json` (three unconfirmed investigation proposals). Run `python scripts/prepare-intelligence.py` after changing elevation grids. Hazard metadata preserves source-grid hashes and thresholds (3/10 degrees); no flag is a safety guarantee. Published regional ice evidence is linked, while local quantitative ice/mineral resources remain unknown.

`processed/climate-extras.json` packages the archived official MCD query for wind, dust optical depth, monthly-mean surface ice loading and incident solar flux. Raw output and exact query URL are in `source/arcadia/climate/`. `prepare-climate-extras.py --refresh` performs one fresh query; without the flag it repackages the archive. The API preserves null rainfall/snowfall rates and radiation measurements because those products are not loaded.

The default regional view now covers 100 x 100 km (10,000 km²), with `processed/regional.json` for a 200 m MOLA/HRSC elevation grid and `processed/regional-context.json` for display metadata. Regional assets and source tile URLs are in `../public/data/arcadia-regional-manifest.json`; raw cached window/tiles are in `source/arcadia/regional/`. The server builds an 800 m sampled display mesh. Source: Fergason, Hare & Laura (2018), USGS, MOLA CC0 / HRSC CC BY-SA 3.0 IGO. Viking color and THEMIS nighttime infrared tiles come from NASA Trek. Run `python scripts/prepare-regional-data.py` to reproduce, fetching the DEM window with `fetch-regional-dem.py` if absent. This package is separate from the HiRISE planning grid below and supports separate conceptual directions on the 200 m grid; it does not add detailed hazard measurements or regional weather observations.

The active package is `processed/arcadia.json`, with a 240 x 200 grid at 20 m, covering 4.8 x 4 km around 45.638 N / 188.625 E. `processed/map-context.json` omits numerical elevation/slope arrays for a smaller frontend payload.

- DTM: HiRISE `DTEEC_034082_2260_033014_2260_A01`, discovered through official USGS STAC.
- Optical: matching HiRISE red-band orthophoto; original 4 m display plus 2 m image-atlas assets used by the map.
- Infrared: NASA Mars Trek THEMIS Night IR controlled mosaic v2, 100 m product, reprojected from its published WMTS tiles using nearest-neighbor sampling.

`source/arcadia/` preserves discovery metadata, WMTS capabilities and fetched thermal tiles. `processed/datasets.json` and `../public/data/manifest.json` record URLs, processing, timestamps and the derived-grid SHA-256. Null grid values are unsupported terrain; they are never replaced with generated heights.

The staging point and three observation anchors are explicitly proposed planning inputs selected on measured terrain. There are no rover traverses, confirmed ice deposits, local geologic-unit assignments or calibrated temperatures in this package.

Refresh with `python scripts/prepare-arcadia-data.py` from the project root, after backing up the generated package. Historical Jezero files may remain on disk for provenance, but are not loaded by the active application. The current generic preparation command delegates to Arcadia, preventing accidental regeneration of the old active dataset.

The additional `processed/climate.json` is an archived MCD 6.2 climate-model query for this sector center, Ls 90 degrees, local hours 0-24, 1.5 m above the surface. It contains modeled air/surface temperatures, pressure and water-vapor volume mixing ratio. This is separate from NASA orbital observations and THEMIS brightness. RH over ice is derived by the API using Murphy & Koop (2005); it is not a humidity sensor observation. Raw ASCII output, query URL and response metadata are under `source/arcadia/climate/`. Repackage with `python scripts/prepare-climate.py`; add `--refresh` for one upstream query.

The 3D backend builds a metric, UV-mapped mesh from every second 20 m grid sample, retaining edges and excluding quads that cross any missing source cell. It does not synthesize heights from imagery. Frontend image blending uses registered sector views only; the original false-color observation is excluded. The server retains the full analysis rasters and sends a display mesh on demand. GLB exports preserve true vertical scale; viewing exaggeration is explicit.
