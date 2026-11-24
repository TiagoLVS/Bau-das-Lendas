// Rodada 2: capturas de Álbum, Galeria, Perfil e Explorar com API simulada SOMENTE no navegador de teste.
// Uso: BAU_RV_DIST=<dist> BAU_RV_OUT=<pasta> node tests/revisao-visual-superficies.mjs
// Nenhum backend ou banco é acessado; o aplicativo não é alterado.
import { chromium, webkit } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
const dist=process.env.BAU_RV_DIST, out=process.env.BAU_RV_OUT
const engines=(process.env.BAU_RV_ENGINES||'Chromium,WebKit').split(',')
const views=(process.env.BAU_RV_VIEWS||'1366x768,390x844,844x390').split(',').map(v=>v.split('x').map(Number))
const T={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2'}
const lendas=JSON.parse(await readFile('public/lendas-ra.json','utf8'))
const desbloq=new Set([1,2,3,4,5,6,7,8,12,21,33])
const user={id:'u-teste',username:'visitante_teste',email:'teste@example.invalid'}
const album={positions:lendas.map(l=>({numero:l.numero,unlocked:desbloq.has(l.numero),legend:desbloq.has(l.numero)?l:null,collected_at:desbloq.has(l.numero)?'2026-11-20T21:00:00Z':null})),progress:{total:60,obtained:desbloq.size,remaining:60-desbloq.size,complete:false}}
const status={available:false,local_date:'2026-11-24',server_now:new Date().toISOString(),next_available_at:new Date(Date.now()+5*3600e3).toISOString(),timezone:'America/Sao_Paulo',complete:false,progress:album.progress,today_reward:{id:'r1',legend_id:lendas[7].id,claimed_at:'2026-11-24T10:00:00Z',is_new:true}}
const hist={items:[...desbloq].slice(0,6).map((n,i)=>({id:'h'+i,legend_id:lendas[n-1].id,legend:lendas[n-1],claimed_at:`2026-11-${20-i}T10:00:00Z`,reward_date:`2026-11-${20-i}`,is_new:true,legacy:false,successful:true})),total:6,limit:10,offset:0,has_more:false}
const server=createServer(async(q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);let f=join(dist,normalize(u));if(u.endsWith('/'))f=join(f,'index.html')
 try{const b=await readFile(f);s.writeHead(200,{'content-type':T[extname(f)]||'application/octet-stream'});s.end(b)}catch{const b=await readFile(join(dist,'index.html'));s.writeHead(200,{'content-type':'text/html'});s.end(b)}})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://localhost:${server.address().port}`
async function stub(ctx,logado){await ctx.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname.replace('/api','');const j=(o,c=200)=>r.fulfill({status:c,contentType:'application/json',body:JSON.stringify(o)})
 if(!logado)return j({detail:'Não autenticado'},401)
 if(p==='/auth/me')return j(user);if(p==='/album')return j(album);if(p==='/rewards/status')return j(status);if(p.startsWith('/rewards/history'))return j(hist);return j({detail:'?'},404)})}
await mkdir(out,{recursive:true});const report=[]
for(const name of engines){const engine=name==='WebKit'?webkit:chromium
 const env={...process.env};for(const k of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const browser=await engine.launch({env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 for(const[w,h]of views){const mobile=w<900
  for(const logado of [true,false]){const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:mobile,isMobile:mobile&&engine===chromium});await stub(ctx,logado);const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message))
   const shot=async l=>{await p.waitForTimeout(900);await p.screenshot({path:`${out}/${name}-${w}x${h}-${l}.png`})}
   const tag=logado?'logado':'visitante'
   try{
    await p.goto(origin+'/?album=1');await p.waitForTimeout(2500);await shot(`album-${tag}`)
    if(logado){const prox=p.getByRole('button',{name:/próxima folha/i});await prox.click({timeout:4000});await p.waitForTimeout(1400);await shot('album-folha')
     const c=p.locator('.posicao.revelada').filter({visible:true}).first();if(await c.count()){await c.click({timeout:4000});await shot('album-inspecao');const v=p.locator('.inspecao button',{hasText:/verso|virar/i}).first();if(await v.count()){await v.click({timeout:4000});await shot('album-inspecao-verso')}}}
    await p.goto(origin+'/?conta=1');await p.waitForTimeout(2000);await shot(`perfil-${tag}`)
    if(logado){await p.goto(origin+'/?portais=1');await p.waitForTimeout(2000);await shot('explorar')
     await p.goto(origin+'/casa/cartas.html');await p.waitForTimeout(2500);await shot('galeria')
     await p.locator('#mesa').scrollIntoViewIfNeeded();await shot('galeria-grade')
     const c=p.locator('#mesa .carta-x').first();if(await c.count()){await c.click({timeout:4000});await shot('galeria-carta-clicada')}}
   }catch(e){errs.push('HARNESS:'+e.message.slice(0,160))}
   report.push({engine:name,version:browser.version(),viewport:`${w}x${h}`,sessao:tag,errors:errs});await ctx.close()}}
 await browser.close()}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));server.close()
for(const r of report)console.log(r.engine,r.viewport,r.sessao,r.errors.length?r.errors:'ok')
