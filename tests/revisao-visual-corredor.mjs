import { chromium } from '@playwright/test'
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path'
const dist=process.argv[2], out=process.argv[3]
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.json':'application/json'}
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/api/')){r.writeHead(401);return r.end('{}')}try{const f=join(dist,u.endsWith('/')?u+'index.html':u);r.writeHead(200,{'content-type':T[extname(f)]||'application/octet-stream'});r.end(await readFile(f))}catch{r.writeHead(200,{'content-type':'text/html'});r.end(await readFile(join(dist,'index.html')))}})
await new Promise(r=>s.listen(0,r))
const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});const p=await b.newPage({viewport:{width:1366,height:768}})
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
await p.goto(`http://localhost:${s.address().port}/`);await p.waitForSelector('.world3d canvas',{timeout:30000});await p.waitForTimeout(2000)
for(let i=0;i<14;i++){await p.mouse.move(683,400);await p.mouse.wheel(0,500);await p.waitForTimeout(350)}
await p.waitForTimeout(5000);await p.screenshot({path:out+'-a.png'})
for(let i=0;i<6;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(300)}
await p.waitForTimeout(5000);await p.screenshot({path:out+'-b.png'});console.log(errs);await b.close();s.close()
