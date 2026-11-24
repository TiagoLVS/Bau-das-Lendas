// Rodada 2: capturas da RA (tela inicial e câmera negada). Sem câmera real; API simulada no navegador de teste.
import { chromium, webkit } from '@playwright/test'
import { createServer } from 'node:http'; import { readFile, mkdir } from 'node:fs/promises'; import { join, extname } from 'node:path'
const [dist,out]=process.argv.slice(2);await mkdir(out,{recursive:true})
const T={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.json':'application/json','.glb':'model/gltf-binary','.svg':'image/svg+xml'}
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);try{const f=join(dist,u);const d=await readFile(f);r.writeHead(200,{'content-type':T[extname(f)]||'application/octet-stream'});r.end(d)}catch{r.writeHead(404);r.end()}})
await new Promise(r=>s.listen(0,r))
const env={...process.env};for(const k of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
const lendas=JSON.parse(await readFile('public/lendas-ra.json','utf8'))
const status={available:true,local_date:'2026-11-24',server_now:new Date().toISOString(),next_available_at:new Date().toISOString(),timezone:'America/Sao_Paulo',complete:false,progress:{total:60,obtained:11,remaining:49,complete:false},today_reward:null}
for(const[n,e]of[['Chromium',chromium],['WebKit',webkit]]){const b=await e.launch({env,args:e===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 for(const[w,h]of[[390,844],[844,390],[1366,768]]){const c=await b.newContext({viewport:{width:w,height:h},hasTouch:w<900})
  await c.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;r.fulfill({contentType:'application/json',body:JSON.stringify(p.endsWith('/auth/me')?{id:'u',username:'visitante_teste',email:'t@e.invalid'}:p.endsWith('/album/progress')?status.progress:p.endsWith('/legends')?lendas:status)})})
  await c.addInitScript(()=>{if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('Permission denied','NotAllowedError'))})
  const p=await c.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message))
  await p.goto(`http://localhost:${s.address().port}/ra.html`);await p.waitForTimeout(2500);await p.screenshot({path:`${out}/${n}-${w}x${h}-ra-inicio.png`})
  await p.locator('#start').click({timeout:5000}).catch(x=>errs.push('start:'+x.message.slice(0,80)));await p.waitForTimeout(2000);await p.screenshot({path:`${out}/${n}-${w}x${h}-ra-camera-negada.png`})
  console.log(n,`${w}x${h}`,errs.length?errs:'ok');await c.close()}
 await b.close()}
s.close()
