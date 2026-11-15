import os
"""Read-only identifier and data-availability checks."""
import json,urllib.request,urllib.error
base=os.environ.get('API_BASE_URL', 'https://127.0.0.1:8789/api/v1')
def get(path):
 with urllib.request.urlopen(base+path,timeout=30) as r:return json.load(r)
h=get('/hazards');assert h['type']=='FeatureCollection' and len(h['features'])>0
r=get('/resources');assert r['confirmed_deposits']==0 and not r['ice_raster_loaded']
p=get('/identify?lon=-171.375&lat=45.638');assert p['resolution_m']==20 and p['resources']['water_ice']['probability'] is None
c=get('/regions/arcadia-planitia-hirise-v1/climate');assert c['precipitation']['rainfall_mm_h'] is None and c['samples'][12]['wind_speed_m_s']>0
for path in ['/identify','/identify?lon=400&lat=45','/identify?lon=0&lat=0']:
 try:get(path);raise AssertionError('Expected validation error: '+path)
 except urllib.error.HTTPError as error:assert error.code==422
print('PASS: hazard polygons, point identifier, proposed resources and unavailable rainfall/radiation.')
