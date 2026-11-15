import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
const {document,window}=parseHTML(fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8'));
globalThis.document=document;globalThis.window=window;
globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);
window.HTMLElement.prototype.scrollIntoView=function(){};
Object.defineProperty(window.HTMLElement.prototype,'innerText',{configurable:true,get(){return this.textContent;},set(value){this.textContent=String(value);}});
const lines=[],markers=[],requests=[];
class Layer{
  constructor(type){this.type=type;this.events={};this.layers=[];this.points=[];}
  addTo(target){target.addLayer(this);return this;}addLayer(layer){this.layers.push(layer);return this;}clearLayers(){this.layers=[];return this;}getLayers(){return this.layers;}
  on(event,callback){this.events[event]=callback;return this;}bindTooltip(){return this;}setStyle(style){this.style=style;return this;}setOpacity(){return this;}bringToFront(){return this;}
  setLatLng(point){this.point=point;return this;}getLatLng(){return this.point;}setLatLngs(points){this.points=points;return this;}getBounds(){return [];}
  setContent(){return this;}openOn(){return this;}
}
const map=new Layer('map');map.removeLayer=layer=>{map.layers=map.layers.filter(value=>value!==layer);return map;};map.hasLayer=layer=>map.layers.includes(layer);
for(const method of ['fitBounds','setView','invalidateSize','closePopup'])map[method]=()=>map;
globalThis.L={CRS:{EPSG4326:{}},map:()=>map,control:{zoom:()=>({addTo(){}})},tileLayer:()=>new Layer('tile'),imageOverlay:()=>new Layer('image'),
  marker:point=>{const marker=new Layer('marker').setLatLng(point);markers.push(marker);return marker;},divIcon:()=>({}),
  polyline:points=>{const line=new Layer('line').setLatLngs(points);lines.push(line);return line;},layerGroup:()=>new Layer('group'),featureGroup:()=>new Layer('group'),
  polygon:()=>new Layer('polygon'),rectangle:()=>new Layer('rectangle'),circleMarker:()=>new Layer('circle'),popup:()=>new Layer('popup')};
const nativeFetch=globalThis.fetch,origin=process.env.APP_TEST_ORIGIN||'https://127.0.0.1:8789';
globalThis.fetch=(url,options)=>{if(String(url).endsWith('/directions'))requests.push(JSON.parse(options.body));return nativeFetch(new URL(url,origin),options);};
const el=id=>document.getElementById(id);
const wait=async predicate=>{for(let n=0;n<500;n++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,20));}throw new Error('Timeout: '+el('interaction-status').textContent);};
await import('../public/js/main.js');document.dispatchEvent(new window.Event('DOMContentLoaded'));
await wait(()=>el('interaction-status').textContent==='Waypoints ready. Click Get directions.');
assert.equal(requests.length,0,'Initial load must not calculate a route');assert.ok(lines.every(line=>line.points.length===0));
el('directions-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
await wait(()=>el('route-comparison').querySelectorAll('.route-choice').length===2);
assert.deepEqual(requests.map(request=>request.objective).sort(),['gentlest','shortest']);assert.ok(lines.every(line=>line.points.length>1));
const safe=el('route-comparison').querySelector('[data-objective=gentlest]');safe.click();assert.equal(safe.getAttribute('aria-pressed'),'true');assert.equal(requests.length,2,'Selecting an alternative reuses its calculation');
markers[1].events.dragend({target:{getLatLng:()=>({lat:45.637,lng:-171.37})}});
await wait(()=>el('interaction-status').textContent==='Waypoints ready. Click Get directions.');
assert.equal(requests.length,2,'Dragging a pin must not calculate routes');assert.ok(lines.every(line=>line.points.length===0));assert.equal(el('route-comparison').hidden,true);
el('speed-slider').value='3';el('speed-slider').dispatchEvent(new window.Event('input'));
await wait(()=>el('interaction-status').textContent==='Waypoints ready. Click Get directions.');assert.equal(requests.length,2,'Changing speed must wait for Get directions');
el('btn-swap-ab').click();await wait(()=>el('interaction-status').textContent==='Waypoints ready. Click Get directions.');assert.equal(requests.length,2,'Swapping endpoints must wait for Get directions');
el('use-measured-route').click();await wait(()=>el('interaction-status').textContent==='Waypoints ready. Click Get directions.');assert.equal(requests.length,2,'Example endpoints must wait for Get directions');
console.log('PASS: actual app startup/drag/speed/swap/example flows make no route requests; Get directions alone computes both options and selection reuses them.');
