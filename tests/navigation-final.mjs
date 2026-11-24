import assert from'node:assert/strict'
import{chromium,webkit}from'@playwright/test'
import{writeFile}from'node:fs/promises'
import{randomUUID}from'node:crypto'
const origin=process.env.BAU_TEST_ORIGIN;if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Exige bau_test local')
const out=process.env.BAU_NAV_ARTIFACT_DIR||'tests/artifacts/etapa06-final';const results=[];const save=()=>writeFile(`${out}/report.json`,JSON.stringify(results,null,2))
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const browser=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]});const r={engine:name,checks:[]};results.push(r)
 try{
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:false,hasTouch:true});const p=await c.newPage();p.setDefaultTimeout(15000)
 const shot=async label=>p.screenshot({animations:'disabled',path:`${out}/${name}-${label}.png`,scale:'css',mask:[p.locator('input[name=email],input[name=password]')]})
 const goto=path=>p.goto(origin+path,{waitUntil:path.includes('?carta=')?'commit':'domcontentloaded'})
 const saciReady=async()=>{await p.locator('#revelar:not([hidden])').waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('#revelar img')].some(i=>i.src.endsWith('/casa/img/cartas/saci.jpg')&&i.complete&&i.naturalWidth>0))}
 async function test(label,fn){try{await fn();r.checks.push({label,status:'APROVADO'})}catch(e){r.checks.push({label,status:'REPROVADO',reason:e.message.slice(0,1400)});await shot('falha-'+r.checks.length).catch(()=>{})}await save()}
 async function keyTo(selector){const trace=[];for(let i=0;i<35;i++){if(await p.locator(selector).evaluateAll(xs=>xs.includes(document.activeElement)))return;await p.keyboard.press('Tab');trace.push(await p.evaluate(()=>document.activeElement.outerHTML.slice(0,160)));assert.ok(await p.evaluate(()=>{const a=document.activeElement,s=getComputedStyle(a),r=a.getBoundingClientRect();return a===document.body||s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}),'Elemento oculto no foco')}throw Error('Controle não alcançado por Tab: '+selector+' '+JSON.stringify(trace.slice(-8)))}
 await test('teclado',async()=>{
  for(const[query,label]of[['/','Início'],['/?portais=1','Explorar'],['/?album=1','Álbum']]){
   await goto(query);await p.locator('#menu-principal [aria-current=page]').waitFor({state:'attached'});assert.equal(await p.locator('#menu-principal [aria-current=page]').textContent(),label);assert.equal(await p.locator('#menu-principal .perfil-acesso').count(),0);if(query.includes('portais')){await p.getByRole('heading',{name:'Explorar',exact:true}).waitFor();await p.waitForFunction(()=>document.activeElement.closest('.portais'));await p.keyboard.press('Escape');await p.locator('.portais,.grimorio').waitFor({state:'hidden'})}if(query.includes('album')){await p.locator('.grimorio-fechar').waitFor();await p.waitForFunction(()=>document.activeElement.matches('.grimorio-fechar'));await p.keyboard.press('Escape');await p.locator('.portais,.grimorio').waitFor({state:'hidden'})}
   await keyTo('.menu-alternar');await p.keyboard.press('Space');await p.locator('#menu-principal.aberto').waitFor();await keyTo('#menu-principal a[href="/?portais=1"]');assert.ok(await p.evaluate(()=>{const s=getComputedStyle(document.activeElement);return s.outlineStyle!=='none'||s.boxShadow!=='none'}),'Foco sem indicador')
   await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent.trim()),'Início');await p.keyboard.press('Tab');await p.keyboard.press('Enter');await p.getByRole('heading',{name:'Explorar',exact:true}).waitFor()
   assert.equal(await p.locator('#menu-principal [aria-current=page]').textContent(),'Explorar');await p.waitForFunction(()=>document.activeElement.closest('.portais'));await p.keyboard.press('Escape');await p.locator('.portais,.grimorio').waitFor({state:'hidden'});await keyTo('.perfil-acesso');await p.keyboard.press('Enter');await p.getByRole('button',{name:'Entrar',exact:true}).waitFor()
  }
 })
 await test('links-diretos-reload-historico',async()=>{
  for(const path of['/','/?lendas=1','/?album=1','/?conta=1','/?portais=1','/casa/index.html','/casa/cartas.html','/casa/cartas.html?carta=saci-perere','/ra.html','/marcador.html','/qrcodes.html','/?assombracoes=1','/?demonstracao=1','/?apresentacao=1','/?demonstracao=1&apresentacao=1']){
   const response=await goto(path);assert.ok(response.status()<400,path);if(path.includes('marcador')||path.includes('qrcodes'))await p.waitForURL('**/?portais=1',{waitUntil:'domcontentloaded'});else assert.equal(new URL(p.url()).search,new URL(origin+path).search);if(path.includes('demonstracao=1&apresentacao=1'))await p.locator('.demonstracao-assombrada').waitFor();if(path.includes('?carta='))await saciReady()
   await p.reload({waitUntil:path.includes('?carta=')?'commit':'domcontentloaded'});if(path.includes('?carta='))await saciReady();assert.ok(!p.url().includes('undefined'));const ready=path.includes('marcador')||path.includes('qrcodes')||path.includes('portais=')?'.portal-qr':path.includes('casa/cartas')?'#mesa .carta-x':path.includes('casa/index')?'#nav-corredor':path.includes('/ra.html')?'#start':path.includes('lendas=')?'.indice-lendas':path.includes('album=')?'.grimorio':path.includes('conta=')?'.conta-texto':'.inicio-contexto';await p.locator(ready).first().waitFor();(r.routes??=[]).push(path)
  }
  await goto('/?conta=1');await goto('/?album=1');await p.goBack({waitUntil:'domcontentloaded'});assert.ok(p.url().includes('conta=1'));await p.goForward({waitUntil:'domcontentloaded'});assert.ok(p.url().includes('album=1'))
 })
 await test('retorno-login',async()=>{
  const email=`nav-final-${randomUUID()}@example.com`,password=randomUUID();const headers={Origin:origin,'X-Bau-Request':'1'}
  assert.equal((await c.request.post(origin+'/api/auth/register',{headers,data:{username:'Validação final',email,password}})).status(),201)
  for(const[target,expected]of[['ritual','/ra.html'],['cartas','/casa/cartas.html'],['album','/?conta=1&retorno=album']]){
   await c.request.post(origin+'/api/auth/logout',{headers});await goto('/?conta=1&retorno='+target);await p.locator('[name=email]').fill(email);await p.locator('[name=password]').fill(password);await p.getByRole('button',{name:'Entrar',exact:true}).click()
   if(target==='album')await p.locator('.grimorio').waitFor();else await p.waitForURL('**'+expected,{waitUntil:'domcontentloaded'})
  }
 })
 await test('responsividade-e-screenshots',async()=>{
  for(const[w,h]of[[320,568],[360,800],[390,844],[430,932],[568,320],[844,390]]){
   await p.setViewportSize({width:w,height:h})
   for(const[path,label,ready]of[['/','inicio','.inicio-contexto'],['/?portais=1','explorar','.portal-qr'],['/?album=1','album','.grimorio'],['/?conta=1','perfil','.conta-texto'],['/casa/index.html','casa','#nav-corredor'],['/casa/cartas.html','galeria','#mesa .carta-x']]){
    console.log(name,w,h,label);await goto(path);await p.locator(ready).first().waitFor();assert.ok(await p.evaluate(w=>innerWidth<=w+1&&document.documentElement.scrollWidth<=w+1,w),path+' '+w+'×'+h)
    if(label==='inicio'){if(await p.getByRole('button',{name:'Menu',exact:true}).isVisible()){await p.getByRole('button',{name:'Menu',exact:true}).click();await p.locator('#menu-principal.aberto').waitFor();}await p.waitForFunction(()=>getComputedStyle(document.querySelector('#menu-principal')).opacity==='1');const box=await p.locator('#menu-principal').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=w+1)}
    if(['explorar','album','perfil'].includes(label)){await p.waitForFunction(()=>{const el=document.querySelector('.painel,.grimorio');return el&&getComputedStyle(el).opacity==='1'});const close=await p.locator('.grimorio-fechar,.painel-topo button').first().boundingBox();assert.ok(close.y>=0&&close.y+close.height<=h+1,'Fechar fora da tela '+label)}if(label==='album'){
     const link=p.getByRole('link',{name:/Galeria pública/});await link.scrollIntoViewIfNeeded();assert.ok(await link.evaluate(el=>{const r=el.getClientRects()[0],hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit)}),'Galeria encoberta pelo livro');
     const next=p.locator('[data-flipbook-control=next]');await next.scrollIntoViewIfNeeded();assert.ok(await next.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&(hit===el||el.contains(hit))}),'Controle do livro inacessível');await p.locator('.grimorio').evaluate(el=>el.scrollTop=0)
    }if(!['casa','galeria'].includes(label))await shot(`${w}-${h}-${label}`)
   }
  }
 })
 await test('timeout-catalogo-isolado',async()=>{
  const errors=[];p.on('pageerror',e=>errors.push(e.message));const pending=[];p.on('request',q=>pending.push(q.url()));p.on('requestfinished',q=>{const i=pending.indexOf(q.url());if(i>=0)pending.splice(i,1)})
  await p.route('**/api/legends',route=>route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Falha de teste"}'}));await p.route('**/lendas-ra.json',route=>route.fulfill({status:503,body:'Falha de teste'}));const start=Date.now();await goto('/casa/index.html?compat=failure-final');await p.getByRole('alert').waitFor();assert.ok(await p.locator('#btn-entrar').isDisabled());await p.waitForTimeout(100);assert.ok(errors.some(e=>e.includes('Catálogo oficial indisponível')));r.timeout={alertMs:Date.now()-start,loadEventEnd:await p.evaluate(()=>performance.getEntriesByType('navigation')[0].loadEventEnd),pending:pending.map(x=>new URL(x).hostname)};await p.unrouteAll()
 })
 await c.close()
 }finally{await browser.close();await save();console.log(name,JSON.stringify(r.checks))}
}
if(results.some(r=>r.checks.some(x=>x.status==='REPROVADO')))process.exitCode=1
