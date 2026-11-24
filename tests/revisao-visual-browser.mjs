// Revisão visual: capturas e métricas comparáveis de um dist estático.
// Uso: BAU_RV_DIST=<dist> BAU_RV_OUT=<pasta> node tests/revisao-visual-browser.mjs
// API é respondida com 401 local (visitante); nenhum banco é acessado.
import { chromium, webkit } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
const dist=process.env.BAU_RV_DIST, out=process.env.BAU_RV_OUT, samples=Number(process.env.BAU_RV_SAMPLES||3)
const engines=(process.env.BAU_RV_ENGINES||'Chromium,WebKit').split(',')
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.mp3':'audio/mpeg'}
const server=createServer(async(q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/api/')){s.writeHead(401,{'content-type':'application/json'});return s.end('{"detail":"Não autenticado"}')}
 let f=join(dist,normalize(u));if(u.endsWith('/'))f=join(f,'index.html');try{const b=await readFile(f);s.writeHead(200,{'content-type':types[extname(f)]||'application/octet-stream'});s.end(b)}catch{try{const b=await readFile(join(dist,'index.html'));s.writeHead(200,{'content-type':'text/html'});s.end(b)}catch{s.writeHead(404);s.end()}}})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://localhost:${server.address().port}`
await mkdir(out,{recursive:true});const report=[]
const frames=()=>new Promise(res=>{const f=[],t0=performance.now();let pv=t0;function k(n){f.push(n-pv);pv=n;if(n-t0<2500)requestAnimationFrame(k);else{f.sort((a,b)=>a-b);res({frames:f.length,medianMs:+f[f.length>>1].toFixed(1),p95Ms:+f[Math.floor(f.length*.95)].toFixed(1),fps:+(1000/(f.reduce((a,b)=>a+b,0)/f.length)).toFixed(1)})}}requestAnimationFrame(k)})
for(const name of engines){const engine=name==='WebKit'?webkit:chromium
 const env={...process.env};for(const k of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const browser=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 const r={engine:name,version:browser.version(),mode:'headless',home:[],casa:[],shots:[],errors:[]};report.push(r)
 for(let i=0;i<samples;i++){const c=await browser.newContext({viewport:{width:1366,height:768}});const p=await c.newPage();p.on('pageerror',e=>r.errors.push('home:'+e.message))
  const t0=Date.now();await p.goto(origin+'/',{waitUntil:'domcontentloaded'});await p.locator('header.menu').waitFor();const ui=Date.now()-t0
  await p.waitForFunction(()=>document.querySelector('.world3d canvas'),null,{timeout:30000}).catch(()=>{});const canvas=Date.now()-t0
  const m=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];const res=performance.getEntriesByType('resource');return{dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd),jsKB:+(res.filter(x=>x.name.endsWith('.js')).reduce((a,x)=>a+(x.encodedBodySize||0),0)/1024).toFixed(1),dom:document.querySelectorAll('*').length}})
  r.home.push({sample:i+1,uiVisibleMs:ui,canvasMs:canvas,...m,...(await p.evaluate(frames))});await c.close()}
 for(let i=0;i<samples;i++){const c=await browser.newContext({viewport:{width:1366,height:768}});const p=await c.newPage();p.on('pageerror',e=>r.errors.push('casa:'+e.message))
  await p.goto(origin+'/casa/index.html?lua=cheia',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.Bau?.corredor?.kit?.chao&&Bau.lendas?.length===60,null,{timeout:30000});if(process.env.BAU_RV_CSS)await p.addStyleTag({content:process.env.BAU_RV_CSS})
  await p.waitForTimeout(1500);const m=await p.evaluate(()=>({dom:document.querySelectorAll('*').length,scene:document.querySelector('#cena')?.querySelectorAll('*').length}))
  r.casa.push({sample:i+1,...m,...(await p.evaluate(frames))});await c.close()}
 for(const[w,h]of[[1366,768],[390,844],[844,390]]){const c=await browser.newContext({viewport:{width:w,height:h}});const p=await c.newPage()
  const shot=async l=>{const path=`${out}/${name}-${w}x${h}-${l}.png`;await p.screenshot({path});r.shots.push(path)}
  await p.goto(origin+'/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(4000);await shot('inicio')
  await p.goto(origin+'/casa/index.html?lua=cheia',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.Bau?.corredor?.kit?.chao,null,{timeout:30000});await p.waitForTimeout(7000);await shot('casa-portao')
  await c.close()}
 await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));server.close()
for(const r of report){console.log(r.engine,r.version);console.log(' home',JSON.stringify(r.home));console.log(' casa',JSON.stringify(r.casa));console.log(' errors',r.errors.slice(0,5))}
