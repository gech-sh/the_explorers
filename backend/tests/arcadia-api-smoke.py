import os
"""Local Arcadia integration verification. Creates/deletes only its own test records."""
import json,urllib.request,urllib.error
from pathlib import Path
BASE=os.environ.get('API_BASE_URL', 'https://127.0.0.1:8789/api/v1')
def request(path,body=None,method=None):
    r=urllib.request.urlopen(urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),method=method,headers={'Content-Type':'application/json'}),timeout=90)
    b=r.read();return r.status,json.loads(b) if b else None
def fails(path,status,body=None,method=None):
    try:request(path,body,method)
    except urllib.error.HTTPError as e:
        assert e.code==status,(path,e.code,status);return json.load(e)
    raise AssertionError('Expected error: '+path)
assert request('/ready')[1]['status']=='ready'
region=request('/regions')[1]['items'][0]
assert region['name']=='Arcadia Planitia' and region['synthetic'] is False
registry=request('/datasets?region_id='+region['id'])[1]
assert len(registry['items'])==3
assert {d['data_type'] for d in registry['items']}=={'optical','topographic','thermal_infrared'}
lon,lat=request('/regions/'+region['id'])[1]['start']
surface=request(f'/regions/{region["id"]}/surface?lon={lon}&lat={lat}')[1]
assert surface['synthetic'] is False and surface['geology'] is None
assert surface['source_dataset_id']=='DTEEC_034082_2260_033014_2260_A01'
assert request('/regions/'+region['id']+'/traverse')[1]['available'] is False
assert request('/regions/'+region['id']+'/geology')[1]['available'] is False
fails('/regions/'+region['id']+'/surface?lon=400&lat=45',422)
fails('/missions',422,{'name':''})
payload={'name':'AUTOMATED ARCADIA CHECK - disposable','site_ids':['terrace','plains'],'notes':'Notebook <script>alert(1)</script>','observation_tasks':[{'site_id':'terrace','objective':'Inspect orbital terrace morphology','dwell_time_s':1200},{'site_id':'plains','objective':'Compare surface texture','dwell_time_s':900}],'return_to_start':True,'constraints':{'max_slope_deg':18,'max_distance_m':12000,'max_duration_s':21600,'walking_speed_m_s':.5}}
invalid={**payload,'observation_tasks':[{'site_id':'terrace','objective':'Task','dwell_time_s':9999}]}
fails('/missions',422,invalid)
status,mission=request('/missions',payload);assert status==201
copy_id=None
try:
    status,route=request('/missions/'+mission['id']+'/routes',{},'POST')
    assert status==201 and route['synthetic'] is False
    assert route['data_version']==region['id']
    assert len(route['provenance']['items'])==3
    assert route['metrics']['science_duration_s']==2100
    assert len(route['itinerary'])==3
    assert route['itinerary'][-1]['departure_elapsed_s']==route['metrics']['total_duration_s']
    assert route['budget']['duration_remaining_s']==21600-route['metrics']['total_duration_s']
    assert route['grid_points'][0]==route['grid_points'][-1]
    restored=request('/missions/'+mission['id'])[1]
    assert restored['notes']==payload['notes'] and restored['observation_tasks']==payload['observation_tasks']
    exported=request('/routes/'+route['id']+'/export?format=json')[1]
    assert exported['mission_snapshot']['notes']==payload['notes']
    assert exported['source_dataset_ids']==['DTEEC_034082_2260_033014_2260_A01']
    with urllib.request.urlopen(BASE+'/routes/'+route['id']+'/export?format=csv') as r:
        csv=r.read().decode();assert r.headers.get_content_type()=='text/csv';assert len(csv.strip().splitlines())==len(route['profile'])+1
    with urllib.request.urlopen(BASE+'/routes/'+route['id']+'/export?format=brief') as r:
        html=r.read().decode();assert r.headers.get_content_type()=='text/html';assert 'ARCADIA PLANITIA' in html;assert '<script>' not in html;assert '&lt;script&gt;' in html;assert 'Perseverance' not in html
    _,copy=request('/missions',{**payload,'name':payload['name']+' COPY'});copy_id=copy['id'];assert copy_id!=mission['id']
    assert request('/missions/'+copy_id)[1]['notes']==payload['notes']
    print('Measured Arcadia route:',route['metrics'])
finally:
    if copy_id:assert request('/missions/'+copy_id,method='DELETE')[0]==204
    assert request('/missions/'+mission['id'],method='DELETE')[0]==204
if 'route' in globals():fails('/routes/'+route['id'],404)
print('PASS: Arcadia data, task validation, notebook persistence, mission copy, itinerary, budgets, JSON/CSV/brief exports, escaping and cascade deletion.')
