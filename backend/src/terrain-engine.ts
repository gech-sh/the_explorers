import { calculateDirections, warmDirections } from '../backend/directions';
import { identifyPoint } from '../backend/intelligence';
import { buildTerrainModel } from '../backend/terrain-model';
import detail from '../data/processed/arcadia.json';
import regional from '../data/processed/regional.json';
import { lonLatToGrid } from '../shared/projection';
import { arSurface } from '../backend/ar';
import { calculateRoute } from '../backend/routing';
import {identifyJezero} from '../backend/jezero';

const routes = new Map<string, ReturnType<typeof calculateDirections>>();
const meshes = new Map<string, ReturnType<typeof buildTerrainModel>>();
function normals(positions: Float32Array, indices: Uint32Array) {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]*3, b = indices[i+1]*3, c = indices[i+2]*3;
    const ux=positions[b]-positions[a], uy=positions[b+1]-positions[a+1], uz=positions[b+2]-positions[a+2];
    const vx=positions[c]-positions[a], vy=positions[c+1]-positions[a+1], vz=positions[c+2]-positions[a+2];
    const x=uy*vz-uz*vy, y=uz*vx-ux*vz, z=ux*vy-uy*vx;
    for(const p of [a,b,c]) {out[p]+=x;out[p+1]+=y;out[p+2]+=z;}
  }
  for(let i=0;i<out.length;i+=3) {const length=Math.hypot(out[i],out[i+1],out[i+2])||1;out[i]/=length;out[i+1]/=length;out[i+2]/=length;}
  return out;
}
const handle = (type: string, input: any): any => {
  if(type==='init') {
    warmDirections();
    // JSON modules, elevation arrays and slope caches remain resident in this worker.
    return { detail_cells: detail.elevations.length, regional_cells: regional.elevations.length };
  }
  if(type==='identify') {
    try {return identifyPoint(input);} catch(error) {
      try {const surface=arSurface(input);return {...surface,scope:'AR geometry',resolution_m:null,
        danger:{classification:'unknown',basis:'AR geology feature IDs: '+surface.geology_feature_ids.join(', ')+'. Geological unit labels and elevation measurements are not present.'}};}
      catch {throw error;}
    }
  }
  if(type==='science-route') return calculateRoute(input);
  if(type==='identify-jezero')return identifyJezero(input);
  if(type==='route') {
    const key=JSON.stringify([input.region||'arcadia',input.start,input.end,input.max_slope_deg,input.resolution,input.objective||'balanced']);
    let result=routes.get(key);
    if(!result) {
      result=calculateDirections({...input,walking_speed_m_s:1});
      if(routes.size>=64) routes.delete(routes.keys().next().value!);
      routes.set(key,result);
    }
    const speed=input.walking_speed_m_s;
    return {...result,settings:input,metrics:{...result.metrics,duration_s:Math.round(result.metrics.distance_m/speed)},
      steps:result.steps.map(step=>({...step,duration_s:Math.round(step.distance_m/speed)}))};
  }
  if(type==='mesh') {
    const scope=input.scope==='detail'?'detail':'regional';
    let model=meshes.get(scope);
    if(!model) {model=buildTerrainModel(scope==='detail'?detail:regional,scope==='detail'?2:4);meshes.set(scope,model);}
    const positions=new Float32Array(model.positions), indices=new Uint32Array(model.indices), uv=new Float32Array(model.uv);
    return {...model,positions,indices,uv,normals:normals(positions,indices)};
  }
  if(type==='project') {
    const grid=input.scope==='detail'?detail:regional;
    return input.coordinates.map((p:[number,number])=>{
      const [x,y]=lonLatToGrid(grid,p),h=grid.elevations[y*grid.cols+x];
      return [(x+.5)*grid.cell_m-grid.width_m/2,h===null||h===undefined?null:h-grid.elevation_min_m,(y+.5)*grid.cell_m-grid.height_m/2];
    });
  }
  throw new Error('Unknown terrain task');
};
// Works in browser Web Workers and in a Node worker adapter for regression tests.
(globalThis as any).onmessage = (event: MessageEvent) => {
  const {id,type,input}=event.data;
  try {
    const result=handle(type,input);
    const transfer=type==='mesh'?[result.positions.buffer,result.indices.buffer,result.uv.buffer,result.normals.buffer]:[];
    (globalThis as any).postMessage({id,result},transfer);
  } catch(error) { (globalThis as any).postMessage({id,error:error instanceof Error?error.message:String(error)}); }
};
