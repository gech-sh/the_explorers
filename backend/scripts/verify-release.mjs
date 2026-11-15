import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
process.env.NODE_EXTRA_CA_CERTS=path.join(root,'security/explorers-local-ca.crt');
const commands=[
  ['node',['backend/node_modules/typescript/bin/tsc','--noEmit','-p','backend/tsconfig.json']],
  ['node',['tests/run.mjs'],'backend'],
  ...['terrain-worker.test.mjs','planning-safety.test.mjs','frontend-integration.mjs','directions-form.test.mjs','manual-directions.test.mjs','marswalk-form.test.mjs'].map(file=>['node',['backend/tests/'+file]]),
  ['python',['backend/tests/security-smoke.py']]
];
for(const [command,args,dir] of commands){
  console.log('\nChecking '+args.join(' '));
  const result=spawnSync(command,args,{cwd:dir?path.join(root,dir):root,stdio:'inherit',env:process.env});
  if(result.status!==0){console.error(result.error?.message||'Release verification failed. Start the app before running integration checks.');process.exit(result.status||1);}
}
console.log('\nRelease verification passed.');
