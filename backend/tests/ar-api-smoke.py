"""Verify AR sources through the standalone HTTP API."""
import json
import os
import urllib.error
import urllib.request

BASE = os.environ.get('API_BASE_URL', 'https://127.0.0.1:8789/api/v1')
def get(path):
    with urllib.request.urlopen(BASE + path, timeout=30) as response:
        return json.load(response)

catalog = get('/ar')
region = catalog['region']['id']
assert len(get('/datasets')['items']) == 6
assert len(get('/datasets?region_id=' + region)['items']) == 3
assert any(r['id'] == region for r in get('/regions')['items'])
assert len(catalog['files']) == 5
for dataset in catalog['datasets']:
    assert get('/datasets/' + dataset['id'])['id'] == dataset['id']
assert get('/regions/' + region)['routing_available'] is False
sites = get('/regions/' + region + '/sites')['items']
assert len(sites) == 2
assert get('/sites/' + sites[0]['id'])['seed_metadata_verified'] is False
surface = get('/regions/' + region + '/surface?lon=-170.21&lat=39.09')
assert surface['elevation_m'] is None and surface['slope_deg'] is None
assert surface['geology_unit'] is None and surface['geology_feature_ids']
assert get('/regions/' + region + '/geology')['attributes_available'] is False
try:
    get('/regions/' + region + '/surface?lon=0&lat=0')
    raise AssertionError('Expected outside-coverage error')
except urllib.error.HTTPError as error:
    assert error.code == 422
preview = BASE.removesuffix('/api/v1') + catalog['optical']['preview_url']
with urllib.request.urlopen(preview, timeout=30) as response:
    assert response.read(8) == b'\x89PNG\r\n\x1a\n'
print('PASS: all AR dataset records, region/sites, geology geometry, preview asset, missing-data flags and coverage errors.')
