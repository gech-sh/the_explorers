import { parentPort } from 'node:worker_threads';
globalThis.postMessage=(message,transfer)=>parentPort.postMessage(message,transfer);
await import('../public/js/terrain-engine.js');
parentPort.on('message',data=>globalThis.onmessage({data}));
