import assert from 'node:assert/strict'
import {chromium,webkit} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {observeNavigationErrors} from './navigation-errors.mjs'
const origin=process.env.BAU_TEST_ORIGIN;assert.equal(origin,'http://localhost:5175');assert.equal(process.env.BAU_TEST_DATABASE,'bau_test')
const results=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]});const r={engine:name,saci:[],security:{}};results.push(r)
 try{const c=await b.newContext();const p=await c.newPage();p.setDefaultTimeout(15000);const headers={Origin:origin,'X-Bau-Request':'1'};assert.equal((await c.request.post(origin+'/api/auth/register',{headers,data:{username:'Controle fictício',email:`controle-${randomUUID()}@example.com`,password:randomUUID()}})).status(),201)
 const normal=await c.request.get(origin+'/api/auth/me',{headers:{Origin:origin}});assert.equal(normal.status(),200);const identity=(await normal.json()).id;assert.equal(normal.headers()['access-control-allow-origin'],origin)
 const preflight=await c.request.fetch('http://127.0.0.1:8000/api/auth/me',{method:'OPTIONS',headers:{Origin:'http://localhost:5176','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'X-Bau-Request'}});assert.equal(preflight.status(),400);assert.equal(preflight.headers()['access-control-allow-origin'],undefined)
 assert.equal((await c.request.post(origin+'/api/auth/logout',{headers:{...headers,Origin:'http://localhost:5176'}})).status(),403)
 const evil=await c.newPage();await evil.route('http://localhost:5176/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Origem de controle</title>'}));await evil.goto('http://localhost:5176/');const blocked=await evil.evaluate(async origin=>{try{await fetch(origin+'/api/auth/me',{credentials:'include',headers:{'X-Bau-Request':'1'}});return false}catch{return true}},'http://127.0.0.1:8000');assert.equal(blocked,true);await evil.close();r.security={normal:200,allowedOrigin:origin,preflightDenied:400,badOriginPost:403,browserCorsBlocked:blocked}
 await p.goto(origin+'/casa/cartas.html',{waitUntil:'domcontentloaded'});await p.locator('#mesa .carta-x').first().waitFor();const observer=observeNavigationErrors(p,name,origin)
 await p.route('**/api/auth/me',route=>route.abort('failed'));const activeFailure=await p.evaluate(async()=>{try{await(await import('/api.js')).api('/auth/me');return'success'}catch(e){return e.status}});assert.equal(activeFailure,0);assert.equal(observer.classify().filter(e=>e.expected).length,0);await p.unroute('**/api/auth/me');r.security.activeNetworkFailure=activeFailure
 const preserved=await c.request.get(origin+'/api/auth/me');assert.equal(preserved.status(),200);assert.equal((await preserved.json()).id,identity);r.security.sameIdentity=true
 for(let n=0;n<12;n++){
  const row={n,mode:n<4?'DOMContentLoaded':n<8?'commit':'cold-context'};r.saci.push(row);let current=p,extra=null;const pending=new Set();let errors=[]
  if(n>=8){extra=await b.newContext();current=await extra.newPage();current.setDefaultTimeout(15000)}
  const onReq=q=>pending.add(q.url()),onDone=q=>pending.delete(q.url()),onError=e=>errors.push(e.message)
  current.on('request',onReq);current.on('requestfinished',onDone);current.on('requestfailed',onDone);current.on('pageerror',onError)
  const start=Date.now();try{
   if(n%2===1&&n<8)await current.reload({waitUntil:n<4?'domcontentloaded':'commit'});else await current.goto(origin+'/casa/cartas.html?carta=saci-perere',{waitUntil:n<4?'domcontentloaded':'commit'})
   await current.locator('#revelar:not([hidden])').waitFor();await current.waitForFunction(()=>[...document.querySelectorAll('#revelar img')].some(i=>i.src.endsWith('/casa/img/cartas/saci.jpg')&&i.complete&&i.naturalWidth>0));assert.equal(new URL(current.url()).search,'?carta=saci-perere');row.ms=Date.now()-start;row.status='APROVADO';row.timing=await current.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return{dom:n.domContentLoadedEventEnd,load:n.loadEventEnd}});assert.deepEqual(errors,[],'A carta não deve produzir erros JavaScript ativos')
  }catch(e){row.status='REPROVADO';row.reason=e.message}finally{row.pending=[...pending];row.errors=errors;current.off('request',onReq);current.off('requestfinished',onDone);current.off('requestfailed',onDone);current.off('pageerror',onError);if(extra)await extra.close()}
 }
 // Uma fonte binária pendente bloqueia load, mas não é requisito de abertura da carta.
 let heldFonts=0;await p.route('https://fonts.gstatic.com/**',()=>{heldFonts++});await p.goto(origin+'/casa/cartas.html?carta=saci-perere',{waitUntil:'commit'});await p.locator('#revelar:not([hidden])').waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('#revelar img')].some(i=>i.complete&&i.naturalWidth>0));await p.evaluate(()=>new Promise(requestAnimationFrame));r.pendingFont={opened:true,heldRequests:heldFonts,status:heldFonts?'APROVADO':'NÃO EXECUTADO: nenhum novo pedido de fonte',load:await p.evaluate(()=>performance.getEntriesByType('navigation')[0].loadEventEnd)};await p.unrouteAll({behavior:'ignoreErrors'})
 assert.equal((await c.request.post(origin+'/api/auth/logout',{headers})).status(),204);assert.equal((await c.request.get(origin+'/api/auth/me')).status(),401);r.security.logout401=true;r.status=r.saci.every(s=>s.status==='APROVADO')?'APROVADO':'REPROVADO';await c.close()
 }catch(e){r.status='REPROVADO';r.reason=e.message}finally{await b.close();await writeFile('tests/artifacts/etapa06-2/controls.json',JSON.stringify(results,null,2));console.log(name,r.status,r.reason??'')}
}
if(results.some(r=>r.status!=='APROVADO'))process.exitCode=1
