"""Read-only custom-directions endpoint checks; no database records are created."""
import json,urllib.request,urllib.error
base='http://127.0.0.1:5173/api/v1'
def post(payload,status=200):
    try:
        with urllib.request.urlopen(urllib.request.Request(base+'/directions',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'}),timeout=60) as response:
            assert response.status==status
            return json.load(response)
    except urllib.error.HTTPError as error:
        assert error.code==status,(error.code,error.read().decode())
        return json.load(error)
with urllib.request.urlopen(base+'/regions/arcadia-planitia-hirise-v1/sites') as response:sites=json.load(response)['items']
with urllib.request.urlopen(base+'/regions/arcadia-planitia-hirise-v1') as response:start=json.load(response)['start']
payload={'start':start,'end':sites[0]['coordinate']}
r=post(payload);assert r['resolution_m']==20 and r['kind']=='detailed_traverse'
assert r['geometry']['type']=='LineString' and len(r['steps'])>0
coarse=post({'start':[-171.9,46.0],'end':[-170.9,45.3]})
assert coarse['resolution_m']==200 and coarse['kind']=='regional_concept_route'
assert post({'start':[0,0],'end':start},422)['error']['code']=='OUTSIDE_COVERAGE'
assert post({'start':start,'end':start},422)['error']['code']=='SAME_CELL'
post({'start':start,'end':sites[0]['coordinate'],'walking_speed_m_s':0},422)
print('PASS: custom detailed/regional directions, steps, validation and coverage errors.')
