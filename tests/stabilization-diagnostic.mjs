import assert from 'node:assert/strict'
import {webkit,chromium} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
const origin=process.env.BAU_TEST_ORIGIN
assert.equal(origin,'http://localhost:5175');assert.equal(process.env.BAU_TEST_DATABASE,'bau_test')
const results=[]
for(const[name,engine]of[['WebKit',webkit],['Chromium',chromium]]){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]});const r={engine:name,events:[],saci:[]};results.push(r)
 try{const c=await b.newContext({viewport:{width:390,height:844}});await c.addInitScript(()=>{const id=crypto.randomUUID();for(const type of['beforeunload','pagehide','pageshow'])addEventListener(type,e=>console.debug('BAU-LIFECYCLE '+JSON.stringify({id,type,path:location.pathname,persisted:e.persisted})))})
 const p=await c.newPage();p.setDefaultTimeout(15000);let phase='normal',attempt=0;const ids=new Map();let sequence=0
 const event=(type,data)=>r.events.push({type,phase,attempt,at:Date.now(),...data})
 p.on('request',q=>{ids.set(q,++sequence);if(q.url().includes('/api/'))event('request',{id:ids.get(q),url:q.url(),method:q.method()})})
 p.on('requestfinished',q=>{if(q.url().includes('/api/'))event('finished',{id:ids.get(q),url:q.url()})})
 p.on('requestfailed',q=>event('failed',{id:ids.get(q),url:q.url(),error:q.failure()?.errorText,frame:p.url()}))
 p.on('pageerror',e=>event('pageerror',{message:e.message,stack:e.stack,frame:p.url()}));p.on('console',m=>{if(m.type()==='error'||m.text().startsWith('BAU-LIFECYCLE'))event('console',{kind:m.type(),message:m.text(),location:m.location()})})
 const headers={Origin:origin,'X-Bau-Request':'1'};assert.equal((await c.request.post(origin+'/api/auth/register',{headers,data:{username:'Diagnóstico fictício',email:`diag-${randomUUID()}@example.com`,password:randomUUID()}})).status(),201)
 phase='forced-navigation'
 for(attempt=0;attempt<8;attempt++){
  await p.goto(origin+'/casa/cartas.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelectorAll('#mesa .carta-x').length===61)
  let hit,release;const requested=new Promise(resolve=>hit=resolve),gate=new Promise(resolve=>release=resolve)
  await p.route('**/api/legends',async route=>{hit();await gate;await route.abort('aborted').catch(()=>{})})
  await p.goto(origin+'/casa/index.html',{waitUntil:'commit'});await requested;event('back-start',{});const back=p.goBack({waitUntil:'domcontentloaded'});release();await back;await p.waitForTimeout(150);await p.unroute('**/api/legends');await p.waitForFunction(()=>document.querySelectorAll('#mesa .carta-x').length===61);event('back-ready',{})
 }
 phase='controls';r.normal=(await c.request.get(origin+'/api/auth/me')).status();assert.equal(r.normal,200)
 r.badOrigin=(await c.request.post(origin+'/api/auth/logout',{headers:{...headers,Origin:'https://evil.invalid'}})).status();assert.equal(r.badOrigin,403);assert.equal((await c.request.get(origin+'/api/auth/me')).status(),200)
 await p.goto(origin+'/casa/cartas.html',{waitUntil:'domcontentloaded'});await p.route('**/api/auth/me',route=>route.abort('failed'));r.activeNetwork=await p.evaluate(async()=>{try{await(await import('/api.js')).api('/auth/me');return'success'}catch(e){return e.status}});assert.equal(r.activeNetwork,0);await p.unroute('**/api/auth/me')
 phase='saci'
 for(attempt=0;attempt<8;attempt++){
  const row={attempt,reload:attempt%2===1,start:Date.now()};r.saci.push(row)
  try{if(row.reload)await p.reload({waitUntil:'commit'});else await p.goto(origin+'/casa/cartas.html?carta=saci-perere',{waitUntil:'commit'});await p.locator('#revelar:not([hidden])').waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('#revelar img')].some(i=>i.complete&&i.naturalWidth>0));row.status='APROVADO';row.ms=Date.now()-row.start;row.timing=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return{dom:n.domContentLoadedEventEnd,load:n.loadEventEnd}})}catch(e){row.status='REPROVADO';row.reason=e.message}
 }
 await c.close();r.status='APROVADO'
 }catch(e){r.status='REPROVADO';r.reason=e.message}finally{await b.close();await writeFile('tests/artifacts/etapa06-2/diagnostic.json',JSON.stringify(results,null,2));console.log(name,r.status,r.reason??'')}
}
if(results.some(r=>r.status!=='APROVADO'||r.saci.some(s=>s.status!=='APROVADO')))process.exitCode=1
