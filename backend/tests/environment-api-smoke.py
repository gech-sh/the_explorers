"""Read-only integration checks for the local climate and 3D terrain services."""
import json,urllib.request
BASE='http://127.0.0.1:5173'
def get(path):
    with urllib.request.urlopen(BASE+path,timeout=30) as response:
        assert response.status==200
        return json.load(response)
region='/api/v1/regions/arcadia-planitia-hirise-v1'
c=get(region+'/climate')
assert not c['live'] and c['kind']=='climate_model'
assert c['coordinate']==[-171.375,45.638] and c['humidity_reference']=='ice'
assert len(c['samples'])==25
assert abs(c['samples'][12]['air_temperature_c']+32.983)<.001
m=get(region+'/terrain-model')
assert len(m['positions'])//3==len(m['uv'])//2
assert len(m['indices'])==3*m['triangle_count']
assert m['triangle_count']>20000 and m['units']=='meters'
assert m['mesh_spacing_m']==40 and m['source_grid_m']==20
print('PASS: climate provenance, humidity units, hourly data and metric 3D mesh API.')
print('Noon modeled air:',round(c['samples'][12]['air_temperature_c'],1),'C; RH/ice:',round(c['samples'][12]['relative_humidity_ice_percent'],1),'%; triangles:',m['triangle_count'])
r=get('/api/v1/regional')
assert r['width_m']==100000 and r['height_m']==100000 and r['area_km2']==10000
regional=get('/api/v1/regional/terrain-model')
assert regional['region_id']==r['id'] and regional['source_grid_m']==200
for layer in r['items']:
    with urllib.request.urlopen(BASE+layer['image_url']) as response:assert response.status==200
print('PASS: 100 x 100 km regional map, real terrain and four local layers.')
