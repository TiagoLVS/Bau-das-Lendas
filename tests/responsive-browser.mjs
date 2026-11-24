import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'

const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Somente bau_test local')
const mode=process.env.BAU_RESPONSIVE_MODE||'verify',out=`${process.env.BAU_RESPONSIVE_ROOT||'tests/artifacts/etapa10'}/${process.env.BAU_RESPONSIVE_OUT||(mode==='verify'?'final':mode)}`
await mkdir(out,{recursive:true})
const sizes=[[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[568,320],[667,375],[844,390],[932,430],[1366,768]]
const captures=new Set(['320x568','390x844','430x932','568x320','844x390'])
const only=process.env.BAU_RESPONSIVE_ONLY?.split(',')
const enabled=surface=>!only||only.includes(surface)
const reports=[]
for(const [name,engine]of[['Chromium',chromium],['WebKit',webkit]].filter(([name])=>!process.env.BAU_RESPONSIVE_ENGINE||name===process.env.BAU_RESPONSIVE_ENGINE)){
 const env={...process.env}
 for(const key of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[key]?.includes('/snap/'))delete env[key]
 const browser=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 const report={engine:name,version:browser.version(),mode,checks:[],layouts:[],errors:[]};reports.push(report)
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true})
  const page=await context.newPage();page.setDefaultTimeout(15000)
  page.on('pageerror',error=>report.errors.push({message:error.message,path:new URL(page.url()).pathname}))
  const headers={Origin:origin,'X-Bau-Request':'1'}
  const registration=await context.request.post(origin+'/api/auth/register',{headers,data:{username:'Compatibilidade móvel',email:randomUUID()+'@example.com',password:randomUUID()}})
  assert.equal(registration.status(),201)
  const user=await registration.json()
  execFileSync('backend/.venv/bin/python',['backend/tests/browser_compat_fixture.py',user.id,'seed'],{stdio:'pipe'})
  async function check(label,fn){try{await fn();report.checks.push({label,status:'APROVADO'})}catch(error){report.checks.push({label,status:'REPROVADO',reason:error.message})}console.log(name,label,report.checks.at(-1).status,report.checks.at(-1).reason?.slice(0,180)||'');await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2))}
  async function layout(label,selectors){
   if(!label.startsWith('casa'))await page.evaluate(async()=>{
    const nodes=[...document.querySelectorAll('.painel,.grimorio,.inspecao,.cx-virador,.carta-grande,#cardStage')]
    await Promise.all(nodes.flatMap(el=>el.getAnimations()).filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})))
   })
   const data=await page.evaluate(({label,selectors})=>{
    const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}
    const controls=selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>{
      const r=rect(el),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y)
      return{selector,text:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,100),...r,hit:!!top&&(el===top||el.contains(top)),inViewport:r.x>=-.5&&r.y>=-.5&&r.x+r.width<=innerWidth+.5&&r.y+r.height<=innerHeight+.5,font:getComputedStyle(el).fontSize,disabled:!!el.disabled,inert:!!el.closest('[inert]')}
    }))
    return{label,width:innerWidth,height:innerHeight,visualWidth:visualViewport?.width,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,controls,regions:[...document.querySelectorAll('.menu,#topo,#planta')].filter(el=>el.getClientRects().length).map(el=>({name:el.id||el.className,...rect(el)})),scrollAreas:[...document.querySelectorAll('.painel,.dossie,.grimorio,.inspecao-face,.educational-back,#dossie,#rewardOverlay')].filter(el=>el.getClientRects().length).map(el=>({class:el.className||el.id,...rect(el),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,inactive:!!el.closest('[inert],[hidden],[aria-hidden="true"]')}))}
   },{label,selectors})
   if(!report.performance?.some(item=>item.label===label)){
    const metrics=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],resources=performance.getEntriesByType('resource');return{domNodes:document.getElementsByTagName('*').length,domContentLoadedMs:n?.domContentLoadedEventEnd-n?.startTime,resources:resources.length,transferredBytes:resources.reduce((total,r)=>total+(r.transferSize||0),0)}})
    ;(report.performance||=[]).push({label,...metrics})
   }
   report.layouts.push(data)
   if(captures.has(`${data.width}x${data.height}`)){
    const path=`${out}/${name}-${data.width}x${data.height}-${label}.png`
    try{await page.screenshot({path,animations:label.startsWith('casa')?'allow':'disabled'});(report.captures||=[]).push({label,width:data.width,height:data.height,path,status:'APROVADO'})}
    catch(error){
      let recovered=false
      if(label.startsWith('casa')){
       // Congela somente a captura: não altera a cena nem a qualidade dos assets.
       await page.evaluate(()=>{
        const original=requestAnimationFrame,queued=[]
        window.requestAnimationFrame=callback=>{queued.push(callback);return -1}
        window.resumeResponsiveCapture=()=>{window.requestAnimationFrame=original;queued.forEach(callback=>original(callback));delete window.resumeResponsiveCapture}
       })
       try{
        await page.screenshot({path,animations:'allow',style:'*,*::before,*::after { animation-play-state:paused!important; transition:none!important; }'})
        recovered=true;(report.captures||=[]).push({label,width:data.width,height:data.height,path,status:'APROVADO',method:'RAF e CSS pausados apenas para captura; interações em tempo normal',firstAttempt:error.message})
       }catch(failure){(report.captures||=[]).push({label,width:data.width,height:data.height,status:'REPROVADO',reason:failure.message,firstAttempt:error.message})}
       finally{await page.evaluate(()=>window.resumeResponsiveCapture?.())}
      }
      if(!recovered&&!label.startsWith('casa'))(report.captures||=[]).push({label,width:data.width,height:data.height,status:'REPROVADO',reason:error.message})
    }
   }
   return data
  }
  async function reachable(locator,minimum=44){
   for(let index=0;index<await locator.count();index++){
    const node=locator.nth(index);if(!await node.isVisible()||await node.isDisabled())continue
    await node.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}))
    await page.waitForFunction(el=>{
      const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)
      return !!top&&(top===el||el.contains(top))
    },await node.elementHandle(),{timeout:2000})
    const result=await node.evaluate(el=>{const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{x:r.x,y:r.y,width:r.width,height:r.height,hit:!!top&&(el===top||el.contains(top)),hitTarget:top?.outerHTML.slice(0,140),viewport:r.x>=-.5&&r.y>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5}})
    assert.ok(result.hit&&result.viewport,`Controle inacessível: ${await node.textContent()} ${JSON.stringify(result)}`)
    assert.ok(result.width>=minimum-.5&&result.height>=minimum-.5,`Alvo pequeno: ${JSON.stringify(result)}`)
   }
  }
  const important={inicio:'.menu .marca,.menu-alternar,.perfil-acesso,.menu-movimento,.botao-explorar,.botao-ra,.inicio-contexto button,.grimorio-botao',explorar:'.painel-topo button,.portais-folha .botao-ritual,.portais-imprimir',perfil:'.painel-topo button,.conta-texto button,.conta-texto .botao-discreto,summary',album:'.grimorio-fechar,.grimorio-galeria a,[data-flipbook-control],.grimorio-indicacao a','album-frente':'.inspecao-fechar,.inspecao .cx-toggle','album-verso':'.inspecao-fechar,.inspecao .cx-toggle',galeria:'.topo a,#busca-cartas,.filtros button,#refresh-collection','carta-frente':'#revelar-fechar,#revelar .cx-toggle','carta-verso':'#revelar-fechar,#revelar .cx-toggle','casa-entrada':'#topo a,#btn-entrar,#nav-corredor,#limiar .j-link,#btn-som',casa:'#topo a,#btn-dossie,#btn-ant,#btn-prox,#btn-som','casa-dossie':'#btn-fechar,#btn-grimorio,.dossie-texto .btn-fantasma',ra:'#home,#start','recompensa-frente':'#flipButton,#rescanButton','recompensa-verso':'#flipButton,#rescanButton'}
  async function profiles(label,selectors){
   for(const[width,height]of sizes){
    await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
    const snapshot=await layout(label,selectors)
    if(mode==='verify')await check(`${label}-${width}x${height}`,async()=>{
     assert.ok(snapshot.width<=width+1&&snapshot.scrollWidth<=width+1,`Overflow horizontal: ${snapshot.width}/${snapshot.scrollWidth}/${width}`)
     const overflow=snapshot.scrollAreas.filter(area=>!area.inactive&&area.scrollWidth>area.clientWidth+1)
     assert.deepEqual(overflow,[],'Overflow horizontal em contêiner ativo')
     await reachable(page.locator(important[label]))
     if(label.includes('frente')||label.includes('verso')){
      const selector=label.startsWith('album')?'.inspecao .cx-inclina':label.startsWith('carta')?'#revelar .cx-inclina':'#cardStage'
      const rect=await page.locator(selector).boundingBox();assert.ok(Math.abs(rect.width/rect.height-2/3)<.02,'Proporção da carta')
     }
    })
   }
  }
  if(enabled('inicio')){
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.limiar').waitFor()
  await profiles('inicio',['.menu .marca','.menu-alternar','.menu nav a','.perfil-acesso','.menu-movimento','.botao-explorar','.botao-ra','.inicio-contexto button','.grimorio-botao','.limiar h1'])
  await check('menu-teclado',async()=>{
   await page.setViewportSize({width:390,height:844});const button=page.locator('.menu-alternar');await button.tap();assert.equal(await button.getAttribute('aria-expanded'),'true');assert.deepEqual(await page.locator('.menu nav a').allTextContents(),['Início','Explorar','Álbum']);await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');assert.ok(await button.evaluate(el=>el===document.activeElement))
  })
  }
  await page.goto(origin+'/?portais=1',{waitUntil:'domcontentloaded'});await page.locator('.portal-qr svg').nth(1).waitFor()
  const qrs=await page.locator('.portal-qr svg').evaluateAll(svgs=>svgs.map(svg=>'data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg))))
  if(enabled('explorar'))await profiles('explorar',['.painel-topo button','.portais-folha .botao-ritual','.portal-qr','button.portais-imprimir'])
  if(enabled('explorar'))await check('foco-painel',async()=>{await page.setViewportSize({width:390,height:844});await page.locator('.painel-topo button').focus();await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('[role=dialog]')),'Foco escapou do painel para conteúdo coberto');await page.keyboard.press('Escape');await page.locator('.menu-alternar').waitFor()})
  if(enabled('perfil')){
  await page.goto(origin+'/?conta=1',{waitUntil:'domcontentloaded'});await page.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor()
  await profiles('perfil',['.painel-topo button','.conta-texto button','.conta-texto a','summary'])
  }
  if(enabled('album')){
  await page.goto(origin+'/?album=1',{waitUntil:'domcontentloaded'});await page.getByText('1/60',{exact:true}).waitFor()
  await profiles('album',['.grimorio-fechar','.grimorio-galeria a','[data-flipbook-control]','.grimorio-indicacao a'])
  await check('album-flip-toque',async()=>{
   await page.setViewportSize({width:390,height:844});await page.locator('[data-flipbook-control=next]').tap();await page.getByRole('button',{name:'Abrir carta Loira do Banheiro',exact:true}).tap();await profiles('album-frente',['.inspecao-fechar','.inspecao .cx-toggle','.inspecao .cx-inclina']);await page.locator('.inspecao .cx-toggle').tap();await profiles('album-verso',['.inspecao-fechar','.inspecao .cx-toggle','.inspecao .educational-back']);await page.locator('.inspecao-fechar').focus();await page.keyboard.press('Shift+Tab');
   if(mode==='verify')assert.ok(await page.evaluate(()=>!!document.activeElement.closest('.inspecao')))
   await page.locator('.inspecao-fechar').tap();await page.locator('.inspecao').waitFor({state:'hidden'})
  })
  }
  if(enabled('galeria')){
  await page.goto(origin+'/casa/cartas.html',{waitUntil:'domcontentloaded'});await page.locator('#mesa .carta-x').first().waitFor()
  await profiles('galeria',['.topo a','#busca-cartas','.filtros button','#refresh-collection'])
  await check('galeria-flip-toque',async()=>{
   await page.setViewportSize({width:390,height:844});await page.locator('#busca-cartas').fill('Loira');await page.getByRole('button',{name:'AMPLIAR Loira do Banheiro',exact:true}).tap();await profiles('carta-frente',['#revelar-fechar','#revelar .cx-toggle','#revelar .cx-inclina']);await page.locator('#revelar .cx-toggle').tap();await profiles('carta-verso',['#revelar-fechar','#revelar .cx-toggle','#revelar .educational-back']);await page.locator('#revelar-fechar').focus();await page.keyboard.press('Tab');
   if(mode==='verify')assert.ok(await page.evaluate(()=>!!document.activeElement.closest('#revelar')))
   await page.locator('#revelar-fechar').tap();await page.locator('#revelar').waitFor({state:'hidden'})
  })
  }
  if(enabled('casa')){
  await page.goto(origin+'/casa/index.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.Bau?.corredor&&globalThis.Bau?.exposicao?.length===1)
  await profiles('casa-entrada',['#topo a','#btn-entrar','#nav-corredor','#limiar .j-link','#btn-som','#limiar h1'])
  await check('casa-toque',async()=>{
   await page.setViewportSize({width:390,height:844});await page.locator('#nav-corredor').tap();await page.waitForFunction(()=>document.body.classList.contains('dentro'),null,{timeout:30000});await profiles('casa',['#topo a','#btn-dossie','#btn-ant','#btn-prox','#btn-som','#ficha-nome']);await page.locator('#btn-dossie').tap();await profiles('casa-dossie',['#btn-fechar','#btn-grimorio','.dossie-texto .btn-fantasma']);await page.locator('#btn-fechar').tap();await page.locator('#dossie').waitFor({state:'hidden'})
  })
  }
  if(enabled('ra')){
  await page.goto(origin+'/ra.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('#start').disabled)
  await profiles('ra',['#home','#start','#status'])
  await check('ra-recompensa-toque',async()=>{
   await page.setViewportSize({width:390,height:844})
   await page.evaluate(async qrs=>{
    const image=new Image();image.src=qrs[1];await image.decode();const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');const paint=()=>{ctx.fillStyle='#888';ctx.fillRect(0,0,1280,720);ctx.drawImage(image,490,210,300,300)};paint();const timer=setInterval(paint,66);addEventListener('pagehide',()=>clearInterval(timer),{once:true});globalThis.responsiveStream=canvas.captureStream(15);Object.defineProperty(MediaDevices.prototype,'getUserMedia',{value:async()=>responsiveStream,configurable:true})
   },qrs)
   await page.locator('#start').tap();await page.locator('#openChest:not([hidden])').waitFor();await page.locator('#openChest').tap();await page.locator('#rewardOverlay:not([hidden])').waitFor();await profiles('recompensa-frente',['#flipButton','#rescanButton','#demoNotice a','#cardStage']);await page.locator('#flipButton').tap();await profiles('recompensa-verso',['#flipButton','#rescanButton','#demoNotice a','#faceB .educational-back']);await page.locator('#flipButton').focus();await page.keyboard.press('Shift+Tab');
   if(mode==='verify')assert.ok(await page.evaluate(()=>!!document.activeElement.closest('#rewardOverlay')))
   await page.evaluate(()=>dispatchEvent(new Event('pagehide')));assert.ok(await page.evaluate(()=>responsiveStream.getTracks().every(t=>t.readyState==='ended')))
  })
  }
  if(mode==='verify')await check('sem-erros-javascript',async()=>assert.deepEqual(report.errors,[]))
  await context.close()
 }catch(error){report.fatal=error.message}
 finally{await browser.close();await writeFile(`${out}/report.json`,JSON.stringify(reports,null,2));console.log(name,JSON.stringify({passed:report.checks.filter(x=>x.status==='APROVADO').length,failed:report.checks.filter(x=>x.status!=='APROVADO').length,fatal:report.fatal,layouts:report.layouts.length}))}
}
if(mode==='verify'&&reports.some(r=>r.fatal||r.checks.some(c=>c.status!=='APROVADO')||r.captures?.some(c=>c.status!=='APROVADO')))process.exitCode=1
