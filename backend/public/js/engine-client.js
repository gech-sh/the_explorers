class TerrainEngine {
  constructor() { this.next=0; this.pending=new Map(); this.started=null; }
  start() {
    if(!this.started) {
      this.worker=new Worker('/js/terrain-engine.js',{type:'module'});
      this.worker.onmessage=({data})=>{
        const task=this.pending.get(data.id);if(!task)return;
        clearTimeout(task.timer);this.pending.delete(data.id);
        data.error?task.reject(new Error(data.error)):task.resolve(data.result);
      };
      this.worker.onerror=()=>{for(const task of this.pending.values()){clearTimeout(task.timer);task.reject(new Error('Terrain worker failed. Refresh to reload.'));}this.pending.clear();};
      this.started=this.send('init',{});
    }
    return this.started;
  }
  send(type,input) {
    return new Promise((resolve,reject)=>{
      const id=++this.next;
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Terrain calculation timed out. Try closer endpoints.'));},12000);
      this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({id,type,input});
    });
  }
  async call(type,input) {await this.start();return this.send(type,input);}
}
export const terrainEngine=new TerrainEngine();
export const meshEngine=new TerrainEngine();
