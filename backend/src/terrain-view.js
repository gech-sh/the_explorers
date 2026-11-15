import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { meshEngine } from '../public/js/engine-client.js';

let renderer,scene,camera,controls,container,mesh,routeLine,resizeObserver;
let scope='detail',exaggeration=8,visible=false,revision=0,routeRevision=0,currentRoute=[];
const objects=new Map();
const frames={detail:{center:[-171.375,45.638],width:4800},regional:{center:[-171.375,45.638],width:100000}};
function render(){if(visible&&renderer)renderer.render(scene,camera);}
function resize(){if(!renderer)return;const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render();}
function lonLat(x,z){
  const R=3396190,DEG=Math.PI/180,[lon0,lat0]=frames[scope].center.map(v=>v*DEG),y=-z,rho=Math.hypot(x,y);
  if(!rho)return {lng:lon0/DEG,lat:lat0/DEG};
  const c=rho/R,s=Math.sin(c),co=Math.cos(c);
  return {lat:Math.asin(co*Math.sin(lat0)+y*s*Math.cos(lat0)/rho)/DEG,lng:(lon0+Math.atan2(x*s,rho*Math.cos(lat0)*co-y*Math.sin(lat0)*s))/DEG};
}
export async function initTerrainView(element,onPick){
  if(renderer)return;
  container=element;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  container.append(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color('#111c2a');
  camera=new THREE.PerspectiveCamera(45,1,.01,1000);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.maxPolarAngle=Math.PI/2-.03;controls.addEventListener('change',render);
  scene.add(new THREE.HemisphereLight(0xe5f4ff,0x594328,2.2));
  const sun=new THREE.DirectionalLight(0xffe4bb,2);sun.position.set(-3,8,-4);scene.add(sun);
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
  let down;
  renderer.domElement.addEventListener('pointerdown',event=>{down=[event.clientX,event.clientY];});
  renderer.domElement.addEventListener('pointerup',event=>{
    if(!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>4||!mesh)return;
    const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const hit=ray.intersectObject(mesh)[0];if(hit)onPick(lonLat(hit.point.x*1000,hit.point.z*1000));
  });
  const theme=()=>{scene.background=new THREE.Color(document.documentElement.dataset.theme==='light'?'#dbe6f0':'#111c2a');render();};
  new MutationObserver(theme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});theme();
}
export async function setTerrainScope(nextScope){
  const thisRevision=++revision;scope=nextScope;exaggeration=scope==='detail'?8:50;
  if(!objects.has(scope)){
    const model=await meshEngine.call('mesh',{scope});
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(model.positions,3));
    geometry.setAttribute('normal',new THREE.BufferAttribute(model.normals,3));
    geometry.setAttribute('uv',new THREE.BufferAttribute(model.uv,2));
    geometry.setIndex(new THREE.BufferAttribute(model.indices,1));
    const texture=new THREE.TextureLoader().load(scope==='detail'?'/data/arcadia-hirise.png':'/data/arcadia-regional-optical.webp',render);
    texture.colorSpace=THREE.SRGBColorSpace;
    const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide}));
    objects.set(scope,object);
  }
  if(thisRevision!==revision)return;
  if(mesh)scene.remove(mesh);mesh=objects.get(scope);mesh.scale.set(.001,exaggeration*.001,.001);scene.add(mesh);
  const width=frames[scope].width/1000;camera.position.set(width*.65,width*.7,width*.75);controls.target.set(0,0,0);controls.update();resize();
  document.getElementById('vertical-scale').value=String(exaggeration);
  await updateTerrainRoute(currentRoute);render();
}
export function setExaggeration(value){exaggeration=Number(value);if(mesh)mesh.scale.y=exaggeration*.001;updateTerrainRoute(currentRoute);render();}
export function showTerrainView(show){visible=show;if(show)resize();}
export async function updateTerrainRoute(coordinates){
  const routeVersion=++routeRevision;
  currentRoute=coordinates||[];if(!scene)return;
  const version=revision,selected=scope;
  if(routeLine){scene.remove(routeLine);routeLine.geometry.dispose();routeLine.material.dispose();routeLine=null;}
  if(!currentRoute.length)return render();
  const points=await meshEngine.call('project',{scope:selected,coordinates:currentRoute});
  if(version!==revision || routeVersion!==routeRevision)return;
  const valid=points.filter(p=>p[1]!==null);
  if(valid.length!==points.length)return render();
  routeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(valid.map(([x,y,z])=>new THREE.Vector3(x*.001,(y*exaggeration+10)*.001,z*.001))),new THREE.LineBasicMaterial({color:0x32ebc0}));
  scene.add(routeLine);render();
}
