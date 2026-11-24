import assert from'node:assert/strict'
import {observeNavigationErrors} from './navigation-errors.mjs'
import{randomUUID}from'node:crypto'
import{execFileSync}from'node:child_process'
import{chromium,webkit}from'@playwright/test'
import{mkdir,writeFile}from'node:fs/promises'
const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Exige bau_test local.')
const out=`tests/artifacts/mobile-fixes/${new Date().toISOString().replace(/[:.]/g,'-')}-regression`
await mkdir(out,{recursive:true});const results=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 const r={engine:name,checks:[],catalogue:{attempts:6,navigationErrors:[],activeErrors:[],trace:[],failedRequests:[]}};results.push(r)
 try{
 const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});if(process.env.BAU_MOBILE_TRACE==='1')await c.addInitScript(()=>{for(const type of ['beforeunload','pagehide','pageshow'])addEventListener(type,event=>console.debug('MOBILE-LIFECYCLE '+JSON.stringify({type,persisted:event.persisted,url:location.pathname+location.search}))) });const p=await c.newPage();p.setDefaultTimeout(20000)
 const observer=observeNavigationErrors(p,name,origin);
 const headers={Origin:origin,'X-Bau-Request':'1'};let phase=''
 p.on('console',m=>{if(phase==='catalog-navigation'&&m.text().startsWith('MOBILE-LIFECYCLE '))r.catalogue.trace.push(JSON.parse(m.text().slice(17)))})
 p.on('requestfailed',req=>{if(phase==='catalog-navigation')r.catalogue.failedRequests.push({path:new URL(req.url()).pathname,error:req.failure()?.errorText})})
 p.on('pageerror',e=>{if(phase==='catalog-navigation')r.catalogue.navigationErrors.push(e.message);else if(phase==='catalog-failure')r.catalogue.activeErrors.push(e.message)})
 async function check(label,fn){if(process.env.BAU_MOBILE_CHECKS&&!process.env.BAU_MOBILE_CHECKS.split(',').includes(label)){r.checks.push({label,status:'NÃO EXECUTADO'});return}phase=label;try{await fn();r.checks.push({label,status:'APROVADO'})}catch(e){r.checks.push({label,status:'REPROVADO',reason:e.message.slice(0,1800)})}await writeFile(`${out}/report.json`,JSON.stringify(results,null,2))}
 await check('recompensa-historico-contador-album',async()=>{
  const register=await c.request.post(`${origin}/api/auth/register`,{headers,data:{username:'Compatibilidade móvel',email:`mobile-fix-${randomUUID()}@example.com`,password:randomUUID()}});assert.equal(register.status(),201);const user=await register.json();execFileSync('backend/.venv/bin/python',['backend/tests/browser_compat_fixture.py',user.id,'seed'],{stdio:'pipe'})
  const claim=await c.request.post(`${origin}/api/rewards/open`,{headers:{...headers,'Idempotency-Key':randomUUID()}});assert.equal(claim.status(),200);const reward=await claim.json();assert.equal(reward.progress.obtained,2)
  assert.equal((await(await c.request.get(`${origin}/api/rewards/status`)).json()).available,false);assert.equal((await(await c.request.get(`${origin}/api/rewards/history`)).json()).total,1)
  assert.equal((await c.request.post(`${origin}/api/draws`,{headers:{...headers,'Idempotency-Key':randomUUID()}})).status(),409)
  await p.goto(`${origin}/?conta=1`);await p.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor();await p.getByRole('region',{name:'Recompensas diárias'}).getByText(/Próxima/).waitFor();await p.locator('[aria-label="Recompensas diárias"] summary').tap();await p.getByRole('region',{name:'Recompensas diárias'}).getByText(reward.legend.nome,{exact:true}).first().waitFor()
  await p.goto(`${origin}/?album=1`);await p.getByText('2/60',{exact:true}).waitFor();assert.equal(await p.locator('.posicao.revelada').count(),2);await p.reload();await p.getByText('2/60',{exact:true}).waitFor()
 })
 await check('galeria-autenticada-rotacao-aberta',async()=>{
  await p.setViewportSize({width:320,height:568});await p.goto(`${origin}/casa/cartas.html`);await p.waitForFunction(()=>globalThis.Bau?.colecao?.user&&document.querySelectorAll('#mesa .carta-x').length===61);await p.getByRole('button',{name:'AMPLIAR Loira do Banheiro',exact:true}).tap();await p.locator('#revelar .carta-x[data-unlocked="true"]').waitFor();await p.waitForTimeout(1100)
  await p.locator('#revelar .carta-x').tap();await p.setViewportSize({width:568,height:320});await p.waitForTimeout(150)
  const box=await p.locator('#revelar-fechar').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=320);await p.locator('#revelar-fechar').tap();await p.locator('#revelar').waitFor({state:'hidden'})
  const open=p.getByRole('button',{name:'AMPLIAR Loira do Banheiro',exact:true});assert.equal(await open.evaluate(el=>el===document.activeElement),true)
  await open.tap();await p.locator('#revelar-fechar').tap();await p.locator('#revelar').waitFor({state:'hidden'});await p.setViewportSize({width:390,height:844})
 })
 await check('ra-glb-animacoes',async()=>{
  await p.goto(`${origin}/ra.html`);await p.locator('#ar canvas').waitFor();await p.waitForFunction(()=>!document.querySelector('#start').disabled)
  const model=await p.evaluate(async()=>{const THREE=await import('three');const{GLTFLoader}=await import('/vendor/loaders/GLTFLoader.js');const g=await new GLTFLoader().loadAsync('/models/bau-das-lendas.glb');let triangles=0;const mats=new Set();g.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;mats.add(o.material)}});const clips=[];for(const clip of g.animations){const mixer=new THREE.AnimationMixer(g.scene),a=mixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();mixer.update(0);const lid=g.scene.getObjectByName('Tampa'),q=lid.quaternion.clone();mixer.update(clip.duration);clips.push({name:clip.name,angle:q.angleTo(lid.quaternion)*180/Math.PI});mixer.stopAllAction()}g.scene.traverse(o=>o.geometry?.dispose());mats.forEach(m=>m.dispose());return{triangles,materials:mats.size,clips}})
  assert.equal(model.triangles,6572);assert.equal(model.materials,8);assert.equal(model.clips.length,3);for(const clip of model.clips)assert.ok(clip.name==='Idle'?clip.angle<.1:Math.abs(clip.angle-105)<.1);r.model=model
 })
 await check('catalog-navigation',async()=>{
  const errorStart=observer.errors.length
  for(let n=0;n<r.catalogue.attempts;n++){
   observer.begin();await p.goto(`${origin}/casa/cartas.html`);await p.waitForFunction(()=>document.querySelectorAll('#mesa .carta-x').length===61)
   let hit,release;const requested=new Promise(resolve=>hit=resolve),gate=new Promise(resolve=>release=resolve)
   await p.route('**/api/legends',async route=>{if(p.url().includes('/casa/index.html')){hit();await gate;await route.abort('aborted').catch(()=>{})}else await route.continue()})
   observer.begin();await p.goto(`${origin}/casa/index.html`,{waitUntil:'commit'});await Promise.race([requested,new Promise((_,reject)=>setTimeout(()=>reject(Error('Catálogo não solicitado')),5000))]);observer.begin();const back=p.goBack({waitUntil:'domcontentloaded'});release();await back;await p.waitForTimeout(100);await p.unroute('**/api/legends')
  }
  r.catalogue.diagnostic={errors:observer.classify().slice(errorStart),requests:observer.requests.filter(q=>q.failure),intents:observer.intents};r.catalogue.expectedCancellations=r.catalogue.diagnostic.errors.filter(e=>e.expected);const unexpected=r.catalogue.diagnostic.errors.filter(e=>!e.expected);assert.equal(unexpected.length,0,JSON.stringify(unexpected))
 })
 await check('catalog-restauracao',async()=>{
  await p.goto(`${origin}/casa/cartas.html`);await p.waitForFunction(()=>document.querySelectorAll('#mesa .carta-x').length===61)
  let hit,release;const requested=new Promise(resolve=>hit=resolve),gate=new Promise(resolve=>release=resolve)
  await p.route('**/api/legends',async route=>{hit();await gate;await route.abort('aborted').catch(()=>{})})
  await p.goto(`${origin}/casa/index.html?compat=restore`,{waitUntil:'commit'});await requested;const back=p.goBack({waitUntil:'domcontentloaded'});release();await back;await p.unroute('**/api/legends')
  await p.goForward({waitUntil:'commit'});await p.waitForFunction(()=>globalThis.Bau?.exposicao?.length===1);assert.equal(await p.evaluate(()=>Bau.lendas.length),60)
 })
 await check('catalog-api-fallback-legitimo',async()=>{
  await p.route('**/api/legends',route=>route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Falha simulada da API"}'}))
  await p.goto(`${origin}/casa/index.html?compat=fallback`);await p.waitForFunction(()=>globalThis.Bau?.exposicao?.length===1);assert.equal(await p.evaluate(()=>Bau.lendas.length),60);await p.unroute('**/api/legends')
 })
 await check('catalog-failure',async()=>{
  await p.route('**/api/legends',route=>route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Falha simulada da API"}'}));await p.route('**/lendas-ra.json',route=>route.fulfill({status:503,body:'Falha simulada do arquivo oficial'}))
  // O aviso funcional não depende de fontes externas nem do evento load.
  await p.goto(`${origin}/casa/index.html?compat=failure`,{waitUntil:'domcontentloaded'});await p.getByRole('alert').filter({hasText:'Não foi possível carregar as lendas oficiais. Atualize a página.'}).waitFor();await p.waitForTimeout(100);assert.ok(r.catalogue.activeErrors.some(e=>e.includes('Catálogo oficial indisponível')));assert.equal(await p.locator('#btn-entrar').isDisabled(),true)
  await p.unroute('**/api/legends');await p.unroute('**/lendas-ra.json')
 })
 await c.close()
 }finally{await b.close();await writeFile(`${out}/report.json`,JSON.stringify(results,null,2));console.log(name,JSON.stringify(r.checks))}
}
console.log('Regressão:',out)
if(results.some(r=>r.checks.some(c=>c.status==='REPROVADO')))process.exitCode=1
