"""Use the supplied public CA, never disabled certificate verification."""
import http.cookiejar
import json
import ssl
import os
import urllib.request
import urllib.error
from pathlib import Path
root=Path(__file__).resolve().parents[2]
context=ssl.create_default_context(cafile=str(root/'security/explorers-local-ca.crt'))
jar=http.cookiejar.CookieJar()
client=urllib.request.build_opener(urllib.request.HTTPSHandler(context=context),urllib.request.HTTPCookieProcessor(jar))
base=os.environ.get('APP_PUBLIC_ORIGIN','https://localhost:8788')
def request(path,body=None,headers=None):
    req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(headers or {})})
    return client.open(req,timeout=15)
with request('/api/v1/datasets') as response:
    assert response.status==200 and 'Set-Cookie' not in response.headers
with request('/data/integrated-regional-map.json') as response:
    assert response.status==200
with request('/api/v1/arcadia') as response:
    catalog=json.load(response);assert len(catalog['sources'])==6;assert len(catalog['sites'])==5
with request('/js/terrain-engine.js',headers={'Accept-Encoding':'gzip'}) as response:
    assert response.status==200 and response.headers['Content-Encoding']=='gzip'
    print('Compressed terrain bundle:',len(response.read()),'bytes')
try:
    request('/api/v1/planner/plans',{}, {'Origin':'https://unexpected.example'})
    raise AssertionError('Cross-origin changes must fail')
except urllib.error.HTTPError as error:
    assert error.code==403
with request('/') as response:
    html=response.read().decode();assert 'cdn.tailwindcss.com' not in html and 'Arcadia terrain &amp; AR datasets' not in html
    assert 'terrain-3d' in html and 'nav-oxygen' not in html and 'nav-battery' not in html
    assert "script-src 'self'" in response.headers['Content-Security-Policy']
    assert 'id="sign-out"' not in html and 'id="login-form"' not in html
with request('/login.html') as response:
    assert response.geturl()==base+'/' and 'id="view-map"' in response.read().decode()
payload={'regionId':'arcadia','pointA':{'name':'Open access test','coords':[45.638,-171.375]},'pointB':{'name':'Test destination','coords':[45.639,-171.374]},'speedKmH':3,'distance':'0.2 km'}
with request('/api/v1/planner/plans',payload) as response:
    assert response.status==201 and 'Set-Cookie' not in response.headers
    plan=json.load(response)
try:
    with request('/api/v1/planner/plans') as response:
        assert any(item['id']==plan['id'] for item in json.load(response)['items'])
finally:
    req=urllib.request.Request(base+'/api/v1/planner/plans/'+plan['id'],method='DELETE')
    with client.open(req,timeout=15) as response:
        assert response.status==204
assert len(jar)==0,'Open access must not require session cookies'
print('PASS: password-free page, datasets, worker, save/list/delete and old login redirect; verified TLS, CSP and cross-origin protection remain.')
