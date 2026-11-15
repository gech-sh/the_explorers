"""Inspect AR sources without substituting seed claims for measured metadata."""
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.warp import transform_bounds
from PIL import Image
import shapefile

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/ar'
OUT = ROOT / 'public/data/ar'
OUT.mkdir(parents=True, exist_ok=True)

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

region = json.loads((DATA / 'seeds/region.json').read_text())
sites = json.loads((DATA / 'seeds/science_sites.json').read_text())
datasets = json.loads((DATA / 'seeds/datasets.json').read_text())
files = [{'name': p.name, 'bytes': p.stat().st_size, 'sha256': digest(p)}
         for p in sorted((DATA / 'raw').iterdir()) if p.is_file()]
with rasterio.open(DATA / 'raw/optical.JP2') as src:
    geographic = rasterio.crs.CRS.from_string('+proj=longlat +R=3389574.3490888 +no_defs')
    bounds = list(transform_bounds(src.crs, geographic, *src.bounds))
    height = min(2048, src.height)
    width = max(1, round(src.width * height / src.height))
    values = src.read(1, out_shape=(height, width), masked=True, resampling=Resampling.average)
    valid = values.compressed()
    low, high = np.percentile(valid, [2, 98])
    gray = (np.clip((values.filled(low).astype(float) - low) / max(high-low, 1) * 255, 0, 255)).astype('uint8')
    rgba = np.stack([gray, gray, gray, (~np.ma.getmaskarray(values)*255).astype('uint8')], axis=-1)
    Image.fromarray(rgba).save(OUT / 'optical-preview.png')
    optical = {'width': src.width, 'height': src.height, 'bands': src.count,
               'crs_wkt': src.crs.to_wkt(), 'bounds': bounds, 'native_pixel_m': list(src.res),
               'preview_url': '/data/ar/optical-preview.png', 'preview_stretch_percentiles': [2, 98]}

attribute_error = None
try:
    attributes = shapefile.Reader(str(DATA / 'raw/Geology.shp'))
    attributes.record(0)
except Exception as exc:
    attribute_error = f'{type(exc).__name__}: invalid DBF field/header; unit labels unavailable'

reader = shapefile.Reader(shp=str(DATA / 'raw/Geology.shp'), shx=str(DATA / 'raw/Geology.shx'))
def intersects(a, b):
    return a[0] <= b[2] and a[2] >= b[0] and a[1] <= b[3] and a[3] >= b[1]
features = []
for index, shape in enumerate(reader.iterShapes()):
    if not (intersects(shape.bbox, region['bounds']) or intersects(shape.bbox, bounds)):
        continue
    # Keep original vertex precision and polygon rings (including holes).
    breaks = list(shape.parts) + [len(shape.points)]
    rings = [[list(p) for p in shape.points[a:b]] for a, b in zip(breaks, breaks[1:])]
    features.append({'id': index, 'bbox': list(shape.bbox), 'rings': rings, 'unit': None})

warnings = ['AR seed metadata and science objectives are user-supplied and unverified.',
            'No DEM or slope raster is present in AR; AR routing/elevation are unavailable.',
            'Geology geometry is read in its declared Mars 2000 spherical CRS; it is not Earth WGS84.']
if not intersects(bounds, region['bounds']):
    warnings.append('The actual JP2 georeference does not overlap the AR seed region. Imagery is exposed at its measured bounds, not moved to the seed coordinates.')
if attribute_error:
    warnings.append('Geology.dbf is malformed; geometry is available but geological unit names cannot be verified.')
for item in datasets:
    item['seed_metadata_verified'] = False
    item['available'] = item['data_type'] != 'topographic'
    if item['data_type'] == 'imagery':
        item['measured_metadata'] = optical
    if item['data_type'] == 'geology':
        item['attributes_available'] = attribute_error is None
        item['geometry_available'] = True
        item['attribute_error'] = attribute_error
region['routing_available'] = False
region['warnings'] = warnings
payload = {'region': region, 'sites': sites, 'datasets': datasets,
           'optical': optical, 'files': files, 'geology': {'features': features,
           'source_feature_count': len(reader), 'attributes_available': attribute_error is None},
           'warnings': warnings}
(DATA / 'catalog.json').write_text(json.dumps(payload, separators=(',', ':'), allow_nan=False))
print(json.dumps({'raw_files': len(files), 'geology_features': len(features), 'optical_bounds': bounds, 'warnings': warnings}, indent=2))
