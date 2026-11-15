import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
const gzip=promisify(zlib.gzip);
const root=path.resolve(import.meta.dirname,'../..'), backend=path.join(root,'backend'),secrets=path.join(root,'.secrets');
for(const name of ['server-key.pem','server.pem','ca/rootCA.pem']){
  if(!fs.existsSync(path.join(secrets,name))){console.error('TLS setup is missing. Run Setup-Integrated.cmd first.');process.exit(1);}
}
const agent=new https.Agent({keepAlive:true,maxSockets:16,ca:fs.readFileSync(path.join(secrets,'ca/rootCA.pem'))});
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--ip','127.0.0.1','--port','8789','--local-protocol','https','--https-key-path',path.join(secrets,'server-key.pem'),'--https-cert-path',path.join(secrets,'server.pem')],{cwd:backend,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
child.on('error',error=>{console.error('Backend could not start:',error.message);process.exit(1);});
child.on('exit',code=>{console.error('Backend stopped. Restart the application.');process.exit(code||1);});
const headers={
  'Strict-Transport-Security':'max-age=31536000',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://trek.nasa.gov https://planetarymaps.usgs.gov; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Cache-Control':'private, no-store'
};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.woff':'font/woff'};
const staticCache=new Map();
async function serveFile(res,req,file){
  const stat=await fs.promises.stat(file).catch(()=>null);
  if(!stat?.isFile()){res.writeHead(404);res.end('Not found');return;}
  let record=staticCache.get(file);
  if(!record||record.time!==stat.mtimeMs){
    const promise=(async()=>{const data=await fs.promises.readFile(file),type=mime[path.extname(file)]||'application/octet-stream';return {data,type,gzip:/javascript|text\/|json|svg/.test(type)?await gzip(data):null,etag:'"'+crypto.createHash('sha256').update(data).digest('hex').slice(0,20)+'"'};})();
    record={time:stat.mtimeMs,promise};staticCache.set(file,record);
  }
  const asset=await record.promise;
  const useGzip=asset.gzip&&req.headers['accept-encoding']?.includes('gzip');
  res.setHeader('Content-Type',asset.type);res.setHeader('Vary','Accept-Encoding');
  if(path.extname(file)!=='.html'){res.setHeader('Cache-Control','private, no-cache');res.setHeader('ETag',asset.etag);}
  if(req.headers['if-none-match']===asset.etag){res.writeHead(304);return res.end();}
  if(useGzip)res.setHeader('Content-Encoding','gzip');
  res.writeHead(200);res.end(useGzip?asset.gzip:asset.data);
}
const server=https.createServer({key:fs.readFileSync(path.join(secrets,'server-key.pem')),cert:fs.readFileSync(path.join(secrets,'server.pem')),minVersion:'TLSv1.2'},async(req,res)=>{
  for(const [name,value]of Object.entries(headers))res.setHeader(name,value);
  const url=new URL(req.url,'https://localhost');
  try {
    if(!['GET','HEAD'].includes(req.method)&&req.headers.origin&&req.headers.origin!=='https://'+req.headers.host)return json(res,403,{error:{message:'Cross-origin changes are not allowed.'}});
    // Old bookmarked login URLs now open the planner directly.
    if(url.pathname==='/login.html'||url.pathname.startsWith('/auth/')){res.writeHead(303,{Location:'/'});return res.end();}
    if(url.pathname.startsWith('/api/')){
      const upstream=https.request({host:'127.0.0.1',port:8789,path:req.url,method:req.method,agent,headers:{'content-type':req.headers['content-type']||'application/json'}},response=>{
        const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>{res.setHeader('Content-Type',response.headers['content-type']||'application/json');res.writeHead(response.statusCode);res.end(Buffer.concat(chunks));});
      });
      upstream.setTimeout(12000,()=>upstream.destroy(new Error('API timeout')));
      upstream.on('error',()=>{if(!res.headersSent)json(res,503,{error:{message:'Backend is starting. Retry in a moment.'}});});
      req.pipe(upstream);return;
    }
    const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\//,'');
    const file=path.resolve(backend,'public',relative),base=path.resolve(backend,'public')+path.sep;
    if(!file.startsWith(base))return json(res,403,{error:{message:'Forbidden path'}});
    await serveFile(res,req,file);
  }catch{if(!res.headersSent)json(res,400,{error:{message:'Invalid request'}});else res.end();}
});
server.on('error',error=>{console.error('HTTPS server:',error.message);child.kill();process.exit(1);});
// Bind only TLS on the LAN. Wrangler and its database remain on loopback.
server.listen(8788,'0.0.0.0',()=>{
  console.log('The Explorers 1.0 — https://localhost:8788');
  for(const entries of Object.values(os.networkInterfaces()))for(const entry of entries||[])if(entry.family==='IPv4'&&!entry.internal)console.log('LAN: https://'+entry.address+':8788 (must be included in your TLS certificate)');
  console.log('Open access: no account or password required | Stop: Ctrl+C');
});
function stop(){server.close();child.kill();process.exit();}process.on('SIGINT',stop);process.on('SIGTERM',stop);
