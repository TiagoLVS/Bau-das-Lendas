// Captura rápida do Início (Chromium headless) para um dist estático.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path'
const [dist,out]=process.argv.slice(2)
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'}
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/api/')){r.writeHead(401);return r.end('{}')}try{const f=join(dist,u.endsWith('/')?u+'index.html':u);const b=await readFile(f);r.writeHead(200,{'content-type':T[extname(f)]||'application/octet-stream'});r.end(b)}catch{r.writeHead(200,{'content-type':'text/html'});r.end(await readFile(join(dist,'index.html')))}})
await new Promise(r=>s.listen(0,r))
const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']})
for(const[w,h]of[[1366,768],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});const e=[];p.on('pageerror',x=>e.push(x.message))
await p.goto(`http://localhost:${s.address().port}/`);await p.waitForSelector('.world3d canvas',{timeout:30000});await p.waitForTimeout(5000);await p.screenshot({path:`${out}-${w}x${h}.png`});console.log(w,e);await p.close()}
await b.close();s.close()
