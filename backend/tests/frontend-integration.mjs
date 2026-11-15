import assert from 'node:assert/strict';
const origin=process.env.APP_TEST_ORIGIN || 'https://127.0.0.1:8789';
const fetchHTTP=globalThis.fetch;
globalThis.fetch=(url,options)=>fetchHTTP(new URL(url,origin),options);
// A minimal DOM test double for the source-list renderer; no browser is controlled.
const rows=[];
globalThis.document={getElementById:()=>({replaceChildren(){rows.length=0;},append(row){rows.push(row);}}),createElement:()=>({textContent:''})};
const api=await import('../public/js/api.js');
const {REGIONS}=await import('../public/js/config.js');
await api.connectBackend();
assert.equal(rows.length,11);
assert.equal(REGIONS.ar.arId,'8f4b2c1a-7d3e-4a9b-8c1f-2e5d6a7b8c9d');
const {pointA,pointB}=REGIONS.arcadia;
const audit=await api.evaluateSiteAPI('arcadia',...pointA.coords);
assert.equal(typeof audit.elev,'number');
assert.equal(audit.iceDepth,'Unconfirmed');
const route=await api.computeRouteAPI('arcadia',pointA,pointB,3.5);
assert.equal(route.available,true,route.message);
assert.ok(route.routePoints.length>1);
assert.ok(route.totalTraverseKm>0);
assert.equal(route.batteryKwh,null);
const ar=await api.evaluateSiteAPI('ar',...REGIONS.ar.pointA.coords);
assert.equal(ar.elev,null);
assert.equal((await api.computeRouteAPI('ar',REGIONS.ar.pointA,REGIONS.ar.pointB,3.5)).available,false);
assert.equal((await api.computeRouteAPI('gale',pointA,pointB,3.5)).available,false);
const saved=await api.saveMissionPlanAPI({regionId:'arcadia',pointA,pointB,speedKmH:3.5,distance:route.totalTraverseKm.toFixed(2)+' km'});
try {
 const restored=(await api.getSavedMissionsAPI()).find(plan=>plan.id===saved.id);
 assert.deepEqual(restored.pointA,pointA);
 assert.deepEqual(restored.pointB,pointB);
 assert.equal(restored.speedKmH,3.5);
} finally {const res=await fetch('/api/v1/planner/plans/'+saved.id,{method:'DELETE'});assert.equal(res.status,204);}
await assert.rejects(()=>api.saveMissionPlanAPI({regionId:'arcadia',pointA,pointB,speedKmH:100,distance:'invalid'}));
for(const image of await api.fetchMars2020ImagesAPI()) {
 const response=await fetch(image.image_files.medium);assert.equal(response.status,200);assert.ok(response.headers.get('Content-Type').startsWith('image/'));
}
for(const path of ['/','/css/styles.css','/js/main.js','/js/api.js','/data/integrated-regional-map.png']) assert.equal((await fetch(path)).status,200,path);
console.log('PASS: actual frontend adapters connect to API, use measured routes, expose missing AR data, round-trip database plans, reject invalid input and serve all source images/assets.');
