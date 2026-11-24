import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const origin=process.env.BAU_TEST_ORIGIN
assert.equal(origin,'http://localhost:5175');assert.equal(process.env.BAU_TEST_DATABASE,'bau_test')
const headed=process.env.BAU_HOUSE_HEADED==='1'
const phase=process.env.BAU_HOUSE_PHASE||'after',out=`${process.env.BAU_HOUSE_OUT||'tests/artifacts/etapa11'}/${phase}`
await mkdir(out,{recursive:true})
const reports=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]].filter(([name])=>!process.env.BAU_HOUSE_ENGINE||name===process.env.BAU_HOUSE_ENGINE)){
 const env={...process.env};for(const k of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const browser=await engine.launch({headless:!headed,env,args:engine===chromium?(headed?['--no-sandbox']:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']):[]})
 const r={engine:name,version:browser.version(),mode:headed?'janela local':'headless',phase,checks:[],captures:[],metrics:[],errors:[]};reports.push(r)
 try{
  const c=await browser.newContext({viewport:{width:1366,height:768},hasTouch:true})
  await c.addInitScript(()=>{
   let seed=314159;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}
   window.houseMetrics={longTasks:[]}
   try{new PerformanceObserver(list=>houseMetrics.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true})}catch{}
  })
  const p=await c.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>r.errors.push(e.message))
  const save=()=>writeFile(`${out}/report.json`,JSON.stringify(reports,null,2))
  async function check(label,fn){
   if(process.env.BAU_HOUSE_CHECKS&&!process.env.BAU_HOUSE_CHECKS.split(',').includes(label))return
   try{await p.bringToFront();await fn();r.checks.push({label,status:'APROVADO'})}
   catch(e){r.checks.push({label,status:'REPROVADO',reason:e.message,stack:e.stack,state:await p.evaluate(()=>({hidden:document.hidden,classes:document.body.className,focus:document.activeElement?.id,dossie:document.getElementById('dossie')?.hidden,camera:window.Bau?.corredor?.estado})).catch(()=>null)})}
   console.log(name,label,r.checks.at(-1).status,r.checks.at(-1).reason?.slice(0,180)||'');await save()
  }
  async function shot(label){
   if(process.env.BAU_HOUSE_NO_PHOTOS==='1')return
   const size=p.viewportSize(),path=`${out}/${name}-${size.width}x${size.height}-${label}.png`
   // Stabilise only the photograph. Gameplay and performance samples run normally.
   await p.evaluate(()=>{const original=requestAnimationFrame,queued=[];window.requestAnimationFrame=fn=>{queued.push(fn);return -1};window.resumeHousePhoto=()=>{window.requestAnimationFrame=original;queued.forEach(fn=>original(fn));delete window.resumeHousePhoto}})
   try{await p.screenshot({path,animations:'allow',style:'*,*::before,*::after{animation-play-state:paused!important;transition:none!important}'});r.captures.push({label,...size,path,status:'APROVADO',method:'RAF/CSS temporariamente pausados somente para fotografia'})}
   catch(error){r.captures.push({label,...size,status:'REPROVADO',reason:error.message});console.log(name,label,'CAPTURA REPROVADA',error.message.slice(0,100))}
   finally{await p.evaluate(()=>window.resumeHousePhoto?.())}
   await save()
  }
  async function sample(label){
   if(process.env.BAU_HOUSE_STABLE_SAMPLE==='1')await p.locator('#palco').evaluate(el=>Promise.all(el.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))))
   let client;if(engine===chromium){client=await c.newCDPSession(p);await client.send('Performance.enable')}
   const metrics=await p.evaluate(async()=>{
    const frames=[],start=performance.now();let previous=start
    await new Promise(resolve=>{function frame(now){frames.push(now-previous);previous=now;if(now-start<2500)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)})
    frames.sort((a,b)=>a-b);const n=performance.getEntriesByType('navigation')[0]
    const counts={};for(const el of document.querySelector('#cena').querySelectorAll('*')){const key=el.classList?.[0]||el.tagName;counts[key]=(counts[key]||0)+1}
    return{dom:document.querySelectorAll('*').length,sceneNodes:document.querySelector('#cena').querySelectorAll('*').length,largestGroups:Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10),dcl:n.domContentLoadedEventEnd,ready:window.houseReady,heap:performance.memory?.usedJSHeapSize??null,frames:frames.length,medianFrameMs:frames[Math.floor(frames.length*.5)],p95FrameMs:frames[Math.floor(frames.length*.95)],estimatedFps:1000/(frames.reduce((s,x)=>s+x,0)/frames.length),longTasks:window.houseMetrics.longTasks,cam:{...Bau.corredor.estado}}
   })
   if(client){metrics.chromium=Object.fromEntries((await client.send('Performance.getMetrics')).metrics.filter(m=>['JSHeapUsedSize','Nodes','LayoutCount','LayoutDuration','RecalcStyleCount','RecalcStyleDuration','TaskDuration'].includes(m.name)).map(m=>[m.name,m.value]));await client.detach()}
   r.metrics.push({label,sampling:process.env.BAU_HOUSE_STABLE_SAMPLE==='1'?'RAF normal; aguarda somente transição finita do palco':'RAF normal; pode incluir transição do palco',...metrics});await save()
  }
  await check('carga-e-recursos',async()=>{
   await p.goto(origin+'/casa/index.html?lua=cheia',{waitUntil:'domcontentloaded'})
   await p.waitForFunction(()=>Bau?.corredor?.kit?.chao&&Bau?.eggs&&Bau.lendas?.length===60)
   await p.evaluate(()=>window.houseReady=performance.now());assert.equal(await p.locator('#ficha').evaluate(el=>el.inert),true)
   assert.equal(await p.locator('#topo nav a').count(),3)
  })
  await sample('portao');await shot('portao')
  await check('jardim-e-porta',async()=>{
   // Identical camera coordinates before/after; public movement API, no fake visuals.
   await p.evaluate(()=>{Bau.corredor.estado.camZ=Bau.corredor.estado.alvoZ=-2050;Bau.corredor.estado.ultimoZ=-2050})
   await p.waitForFunction(()=>document.body.classList.contains('abrindo'))
   await shot('jardim');await sample('jardim')
   await p.evaluate(()=>{Bau.corredor.estado.camZ=Bau.corredor.estado.alvoZ=-1380;Bau.corredor.estado.ultimoZ=-1380})
   await p.waitForFunction(()=>document.querySelector('.j-folha.aberta'))
   await shot('entrada')
  })
  await check('corredor-e-dossie',async()=>{
   await p.evaluate(()=>Bau.corredor.sair());await p.waitForFunction(()=>!document.body.classList.contains('abrindo'))
   const start=await p.evaluate(()=>performance.now())
   await p.locator('#nav-corredor').tap();await p.waitForFunction(()=>document.body.classList.contains('dentro'),null,{timeout:30000})
   r.entry={untilInsideMs:await p.evaluate(start=>performance.now()-start,start)}
   await p.waitForFunction(()=>Math.abs(Bau.corredor.estado.camZ-Bau.corredor.estado.alvoZ)<1)
   r.entry.untilSettledMs=await p.evaluate(start=>performance.now()-start,start)
   await shot('corredor');await sample('corredor')
   await p.locator('#btn-dossie').tap();await p.locator('#btn-fechar').waitFor();await shot('dossie')
   if(phase.startsWith('after'))assert.equal(await p.locator('body').evaluate(el=>el.classList.contains('dossie-aberto')),true)
   await p.locator('#btn-fechar').focus();await p.keyboard.press('Shift+Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('#dossie')))
   await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement.id==='btn-dossie')
   if(phase.startsWith('after'))assert.equal(await p.locator('body').evaluate(el=>el.classList.contains('dossie-aberto')),false)
  })
  for(const[width,height]of[[320,568],[390,844],[430,932],[568,320],[844,390]]){
   await check(`layout-${width}x${height}`,async()=>{
    await p.setViewportSize({width,height});await p.evaluate(()=>Bau.corredor.sair());await p.waitForFunction(()=>!document.body.classList.contains('dentro'));await shot('portao')
    await p.locator('#nav-corredor').tap();await p.waitForFunction(()=>document.body.classList.contains('dentro'),null,{timeout:30000});await shot('corredor')
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    for(const selector of ['#btn-prox','#btn-dossie','#btn-som','.perfil-acesso']){
     const el=p.locator(selector);if(!await el.count())continue
     const box=await el.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{hit:hit===el||el.contains(hit),x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom}})
     assert.ok(box.hit&&box.x>=0&&box.y>=0&&box.right<=width+1&&box.bottom<=height+1,selector+JSON.stringify(box));assert.ok(box.w>=43.5&&box.h>=43.5)
    }
   })
  }
  if(phase.startsWith('after'))await check('manifestacoes-integradas',async()=>{
   await p.setViewportSize({width:1366,height:768})
   await p.goto(origin+'/casa/index.html?apresentacao=1&demonstracao=1',{waitUntil:'domcontentloaded'})
   await p.waitForFunction(()=>Bau.manifestacoes)
   await p.locator('#nav-corredor').tap()
   const seen=[]
   for(let i=0;i<5;i++){
    await p.waitForFunction(()=>Bau.manifestacoes.inspecionar().ativo!==null,null,{timeout:30000})
    const state=await p.evaluate(()=>Bau.manifestacoes.inspecionar());seen.push(state.ativo)
    await p.waitForFunction(()=>Bau.manifestacoes.inspecionar().progresso>.4)
    await shot('aparicao-'+state.ativo)
    await p.waitForFunction(()=>Bau.manifestacoes.inspecionar().ativo===null,null,{timeout:20000})
   }
   assert.deepEqual(seen,['espelho','lobo','saci','alta','boitata']);r.sequence=seen
   await p.waitForFunction(()=>Bau.manifestacoes.inspecionar().completa)
   await p.locator('#marca').tap();await p.waitForFunction(()=>!document.body.classList.contains('dentro'))
   assert.equal(await p.evaluate(()=>Bau.manifestacoes.inspecionar().ativo),null)
  })
  await check('primeira-interacao-entrada',async()=>{
   await p.goto(origin+'/casa/index.html',{waitUntil:'domcontentloaded'})
   await p.waitForFunction(()=>Bau.corredor&&Bau.eggs)
   const ready=await p.evaluate(()=>performance.now())
   await p.locator('#nav-corredor').tap()
   await p.waitForFunction(()=>Bau.corredor.estado.auto!==null||Bau.corredor.estado.dentro)
   const response=await p.evaluate(()=>performance.now())
   await p.waitForFunction(()=>document.body.classList.contains('dentro'),null,{timeout:30000})
   r.firstInteraction={readyMs:ready,actualEntryResponseMs:response,insideMs:await p.evaluate(()=>performance.now()),cache:'nova navegação no contexto já usado; cache local aquecido'}
  })
  if(phase.startsWith('after'))await check('preferencias-audio-ciclo',async()=>{
   await p.goto(origin+'/casa/index.html',{waitUntil:'domcontentloaded'})
   await p.waitForFunction(()=>Bau.manifestacoes&&Bau.eggs)
   assert.equal(await p.evaluate(()=>Bau.som.inspecionar().estado),'não iniciado')
   await p.locator('#btn-movimento').tap()
   assert.equal(await p.locator('#btn-movimento').getAttribute('aria-pressed'),'true')
   await p.locator('#btn-som').tap()
   await p.waitForFunction(()=>Bau.som.inspecionar().estado==='running')
   await p.locator('#btn-som').tap()
   assert.equal(await p.evaluate(()=>Bau.som.inspecionar().ligado),false)
   await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>Bau.manifestacoes)
   assert.equal(await p.locator('#btn-movimento').getAttribute('aria-pressed'),'true')
   assert.equal(await p.evaluate(()=>Bau.ciclo.reduzir()),true)
   await p.locator('#nav-corredor').tap();await p.waitForFunction(()=>document.body.classList.contains('dentro'),null,{timeout:30000})
   assert.equal(await p.evaluate(()=>Bau.som.inspecionar().ligado),false,'Entrar deve respeitar silêncio salvo')
   for(const[width,height]of[[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[568,320],[667,375],[844,390],[932,430],[1366,768]]){
    await p.setViewportSize({width,height})
    const box=await p.locator('#btn-movimento').evaluate(el=>{const b=el.getBoundingClientRect(),top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{hit:top===el||el.contains(top),x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom}})
    assert.ok(box.hit&&box.x>=0&&box.y>=0&&box.right<=width+1&&box.bottom<=height+1&&box.w>=43.5&&box.h>=43.5,JSON.stringify({width,height,...box}))
   }
   // Exercita os contratos pagehide/pageshow; não certifica BFCache de um aparelho físico.
   await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})))
   assert.equal(await p.evaluate(()=>Bau.ciclo.inspecionar().paused),true)
   await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})))
   assert.equal(await p.evaluate(()=>Bau.ciclo.inspecionar().paused),false)
   await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})))
   const state=await p.evaluate(()=>({ciclo:Bau.ciclo.inspecionar(),manifestacoes:Bau.manifestacoes.inspecionar(),som:Bau.som.inspecionar()}))
   assert.equal(state.ciclo.disposed,true);assert.equal(state.ciclo.timers,0);assert.equal(state.ciclo.listeners,0)
   assert.equal(state.manifestacoes.disposed,true);assert.equal(state.som.estado,'não iniciado')
  })
  await c.close()
 }catch(e){r.fatal=e.message}finally{await browser.close();await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2))}
}
if(reports.some(r=>r.fatal||r.errors.length||r.checks.some(c=>c.status==='REPROVADO')||r.captures.some(c=>c.status==='REPROVADO')))process.exitCode=1
