// Auditoria de compatibilidade. Não modifica a aplicação; usa somente bau_test.
import assert from 'node:assert/strict'
import { chromium, webkit, devices } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Exige API local explicitamente isolada em bau_test.')
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1'
const runId=new Date().toISOString().replace(/[:.]/g,'-')
const destination=`tests/artifacts/compat-mobile/${runId}`
await mkdir(destination,{recursive:true})
const report={runId,origin,physicalDevices:false,environment:{playwright:JSON.parse(execFileSync('node',['-p',"JSON.stringify(require('@playwright/test/package.json').version)"],{encoding:'utf8'})),snapVariables:[]},cases:[]}
for(const key of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(process.env[key]?.includes('/snap/'))report.environment.snapVariables.push(key)
try{report.environment.libmanette=execFileSync('dpkg-query',['-W','-f=${Status} ${Version}','libmanette-0.2-0'],{encoding:'utf8'}).trim()}catch{report.environment.libmanette='ausente'}
const profiles=[
 ['se-320','iPhone SE',320,568],['se-375','iPhone SE equivalente',375,667],['iphone12','iPhone 12',390,844],['iphone13','iPhone 13',390,844],
 ['iphone15','iPhone 15',393,852],['iphone15max','iPhone 15 Pro Max',430,932],['android-small','Android pequeno',360,800],['pixel','Google Pixel',412,915],
]
const headers={Origin:origin,'X-Bau-Request':'1'}
async function save(){await writeFile(`${destination}/report.json`,JSON.stringify(report,null,2))}
function normalizedEnv(){const env={...process.env};for(const key of report.environment.snapVariables)delete env[key];return env}

async function measure(page){return page.evaluate(()=>{
 const vw=innerWidth,vh=innerHeight
 const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&r.bottom>0&&r.top<vh}
 const controls=[...document.querySelectorAll('button,a,input,summary,[role="button"]')].filter(visible)
 const texts=[...document.querySelectorAll('p,label,small,button,a')].filter(visible)
 const safe=document.createElement('div');safe.style.cssText='position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.append(safe);const s=getComputedStyle(safe);const insets=[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft];safe.remove()
 const nav=performance.getEntriesByType('navigation')[0]
 const resources=performance.getEntriesByType('resource')
 return {viewport:[vw,vh],visualViewport:window.visualViewport?{width:visualViewport.width,height:visualViewport.height,offsetTop:visualViewport.offsetTop}:null,
  horizontalOverflow:document.documentElement.scrollWidth>vw+1,safeAreaInsets:insets,
  smallTargets:controls.filter(el=>{const r=el.getBoundingClientRect();return r.width<44||r.height<44}).slice(0,20).map(el=>({label:(el.getAttribute('aria-label')||el.textContent||el.tagName).trim().slice(0,55),width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)})),
  smallText:texts.filter(el=>parseFloat(getComputedStyle(el).fontSize)<12).slice(0,15).map(el=>({text:el.textContent.trim().slice(0,55),px:getComputedStyle(el).fontSize})),
  clippedControls:controls.filter(el=>{const r=el.getBoundingClientRect();return r.x< -2||r.right>vw+2}).slice(0,12).map(el=>(el.getAttribute('aria-label')||el.textContent||el.tagName).trim().slice(0,55)),
  navigation:nav?{domContentLoadedMs:nav.domContentLoadedEventEnd,loadMs:nav.loadEventEnd,transferSize:nav.transferSize}:null,
  resources:{count:resources.length,transferSize:resources.reduce((s,e)=>s+(e.transferSize||0),0),encodedBodySize:resources.reduce((s,e)=>s+(e.encodedBodySize||0),0),glb:resources.filter(e=>e.name.includes('.glb')).map(e=>({duration:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize}))},
  css:{dvh:CSS.supports('height','100dvh'),svh:CSS.supports('height','100svh'),perspective:CSS.supports('perspective','1200px'),backface:CSS.supports('backface-visibility','hidden'),pointerEvents:'PointerEvent'in window,touch:navigator.maxTouchPoints},
 }
})}

async function capture(page,key,label,force=false){
 if(!force&&!key.includes('iphone13')&&!key.includes('se-320'))return null
 const path=`${destination}/${key}-${label}.png`
 const captured=await page.screenshot({path,scale:'css',timeout:7000,animations:'disabled',mask:[page.locator('input[name="email"],input[name="password"]')]}).then(()=>true,()=>false)
 return captured?path:null
}
async function makeQrs(page){
 await page.goto(`${origin}/?portais=1`,{waitUntil:'domcontentloaded'})
 await page.locator('.portal-qr svg').nth(1).waitFor()
 return page.locator('.portal-qr svg').evaluateAll(async svgs=>Promise.all(svgs.map(async svg=>{const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg));await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=800;canvas.getContext('2d').drawImage(image,0,0,800,800);return canvas.toDataURL()})))
}
async function installCamera(context,qrs){
 await context.addInitScript(({qrs})=>{
  const images=qrs.map(src=>{const image=new Image();image.src=src;return image})
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');let marker=-1
  const streams=[];globalThis.compatCamera={set(value){marker=value;paint()},streams}
  function paint(){ctx.fillStyle='#888';ctx.fillRect(0,0,1280,720);if(marker>=0&&images[marker].complete)ctx.drawImage(images[marker],390,110,500,500)}
  compatCamera.getUserMedia=async()=>{compatCamera.stage='capture-support';if(!canvas.captureStream)throw new DOMException('Canvas captureStream indisponível','NotSupportedError');compatCamera.stage='image-decode';await Promise.all(images.map(image=>image.decode()));compatCamera.stage='paint';paint();const timer=setInterval(paint,66);addEventListener('pagehide',()=>clearInterval(timer),{once:true});compatCamera.stage='capture-stream';const stream=canvas.captureStream(15);streams.push(stream);compatCamera.stage='stream-returned';return stream};navigator.mediaDevices.getUserMedia=compatCamera.getUserMedia
 },{qrs})
}

// Diagnóstico independente: o WebKit pode iniciar e falhar só no processo de rede Snap.
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 let b
 try{b=await engine.launch({headless:true,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]});const p=await b.newPage();await p.goto(`${origin}/api/health`,{timeout:7000});report.environment[name+'RawHTTP']='APROVADO'}
 catch(error){report.environment[name+'RawHTTP']={status:'BLOQUEADO',reason:error.message.split('\n')[0]}}
 finally{await b?.close()}
}
for(const [engineName,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 if(process.env.BAU_COMPAT_ENGINE&&process.env.BAU_COMPAT_ENGINE!==engineName)continue
 for(const [id,label,width,height]of profiles){
   if(process.env.BAU_COMPAT_CASE&&!process.env.BAU_COMPAT_CASE.split(',').includes(id))continue
   if(process.env.BAU_COMPAT_EXCLUDE?.split(',').includes(id))continue
   let browser
   try{browser=await engine.launch({headless:true,env:engine===webkit?normalizedEnv():process.env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]});report.environment[engineName+'Version']=browser.version()}
   catch(error){report.cases.push({engine:engineName,profile:label,status:'BLOQUEADO',reason:error.message.split('\n')[0]});await save();continue}
   try{
   const deviceName=engine===webkit?(devices[label]?label:'iPhone 13'):(id==='pixel'?'Pixel 7':'Pixel 5')
   const {defaultBrowserType,...device}=devices[deviceName]
   const key=`${engineName.toLowerCase()}-${id}`
   const result={engine:engineName,profile:label,devicePreset:deviceName,viewport:[width,height],presetViewport:device.viewport,deviceScaleFactor:Number(process.env.BAU_COMPAT_DPR)||device.deviceScaleFactor,presetDeviceScaleFactor:device.deviceScaleFactor,steps:[],pageErrors:[],consoleErrors:[],failedRequests:[],httpErrors:[],evidence:[]}
   report.cases.push(result)
   const context=await browser.newContext({...device,deviceScaleFactor:result.deviceScaleFactor,viewport:{width,height},screen:{width,height},reducedMotion:'no-preference'})
   // Instrumentação de estado do áudio, sem mudar a política de autoplay.
   await context.addInitScript(()=>{globalThis.compatAudio=[];const C=window.AudioContext||window.webkitAudioContext;if(C){const wrapped=new Proxy(C,{construct(target,args){const instance=new target(...args);compatAudio.push(instance);return instance}});if(window.AudioContext)window.AudioContext=wrapped;else window.webkitAudioContext=wrapped}})
   const page=await context.newPage();page.setDefaultTimeout(15000)
   let phase='',user=null,qrs=null,claimed=null
   page.on('pageerror',e=>result.pageErrors.push({phase,message:e.message}))
   page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push({phase,text:m.text().slice(0,500)})})
   page.on('requestfailed',r=>result.failedRequests.push({phase,path:new URL(r.url()).pathname,error:r.failure()?.errorText,intentional:phase.includes('falha-rede')}))
   page.on('response',r=>{if(r.status()>=400)result.httpErrors.push({phase,path:new URL(r.url()).pathname,status:r.status()})})
   const credentials={email:`compat-${randomUUID()}@example.com`,password:randomUUID()}
   async function step(name,action){if(process.env.BAU_COMPAT_STEPS&&!process.env.BAU_COMPAT_STEPS.split(',').includes(name)){result.steps.push({name,status:'NÃO EXECUTADO',reason:'Fora do filtro de repetição dirigida.'});await save();return}phase=name;const started=performance.now();try{const data=await action();result.steps.push({name,status:'APROVADO',durationMs:Math.round(performance.now()-started),data})}catch(error){const shot=await capture(page,key,`falha-${result.steps.length}`,true);if(shot)result.evidence.push(shot);result.steps.push({name,status:page.isClosed()||!browser.isConnected()?'BLOQUEADO':'REPROVADO',durationMs:Math.round(performance.now()-started),reason:error.message.split('\n').slice(0,15).join(' ')})}await save()}
   const screenshot=async label=>{const path=await capture(page,key,label);if(path)result.evidence.push(path)}
   try{
    await step('inicio-webgl-navegacao',async()=>{
     await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.world3d canvas').waitFor();await screenshot('inicio')
     const info=await measure(page)
     await page.locator('.botao-explorar').tap();await page.waitForURL('**/casa/index.html')
     await page.goBack();await page.locator('.world3d canvas').waitFor()
     return info
    })
    await step('cadastro-login-cookie-reload',async()=>{
     await page.goto(`${origin}/?conta=1`,{waitUntil:'domcontentloaded'});await screenshot('login')
     await page.getByRole('button',{name:'Criar uma conta',exact:true}).tap();await screenshot('cadastro')
     await page.locator('[name=username]').fill('Compatibilidade móvel');await page.locator('[name=email]').fill(credentials.email);await page.locator('[name=password]').fill(credentials.password)
     await page.getByRole('button',{name:'Criar conta',exact:true}).tap();await page.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor()
     user=await(await context.request.get(`${origin}/api/auth/me`)).json()
     execFileSync('backend/.venv/bin/python',['backend/tests/browser_compat_fixture.py',user.id,'seed'],{stdio:'pipe'})
     await page.reload();await page.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor();await screenshot('perfil')
     const cookies=(await context.cookies()).map(({name,httpOnly,secure,sameSite,path})=>({name,httpOnly,secure,sameSite,path}))
     assert.ok(cookies.some(c=>c.name==='bau_session'&&c.httpOnly&&c.sameSite==='Lax'&&c.path==='/api'))
     const layout=await measure(page)
     await page.getByRole('button',{name:'Sair da conta',exact:true}).tap();await page.locator('[name=email]').fill(credentials.email);await page.locator('[name=password]').fill('senha-invalida-123')
     await page.getByRole('button',{name:'Entrar',exact:true}).tap();await page.getByText('E-mail ou senha inválidos.',{exact:true}).waitFor()
     await page.locator('[name=password]').fill(credentials.password);await page.getByRole('button',{name:'Entrar',exact:true}).tap();await page.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor()
     return{cookies,layout}
    })
    if(process.env.BAU_COMPAT_SKIP_HOUSE==='1'){result.steps.push({name:'casa-toque-audio-aparicao-easter-egg',status:'BLOQUEADO',reason:'Cenário pesado isolado: consultar execuções anteriores; não repetir na matriz após timeouts/encerramento do WebKit.'});await save()}else await step('casa-toque-audio-aparicao-easter-egg',async()=>{
     await page.goto(`${origin}/casa/index.html?lua=cheia`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.Bau?.lendas?.length===60)
     await screenshot('casa');await page.locator('#btn-entrar').tap();
     const follow=await page.evaluate(()=>({auto:!!Bau.corredor.estado.auto,z:Bau.corredor.estado.camZ}));assert.equal(follow.auto,true)
     // O link Explorar é uma entrada existente que pula o jardim; não alteramos a animação.
     const entryStarted=performance.now();await page.locator('#nav-corredor').tap();await page.waitForFunction(()=>globalThis.Bau?.corredor?.estado?.dentro,null,{timeout:45000});const entryMs=performance.now()-entryStarted
     const before=await page.evaluate(()=>Bau.corredor.estado.i);await page.locator('#btn-prox').tap();await page.waitForFunction(value=>Bau.corredor.estado.i>value,before)
     await page.locator('#btn-ant').tap()
     await page.locator('#btn-dossie').tap();await page.locator('#dossie:not([hidden])').waitFor();await screenshot('casa-dossie');await page.locator('#btn-fechar').tap();assert.equal(await page.locator('#dossie').isHidden(),true)
     const audio=await page.evaluate(()=>({enabled:Bau.som.ligado,contexts:compatAudio.map(c=>c.state)}))
     assert.equal(audio.enabled,true);assert.ok(audio.contexts.includes('running'))
     const effects=await page.evaluate(()=>{const before=document.querySelectorAll('.marca-parede').length;Bau.aparicoes.forcar(1);Bau.eggs?.saci?.({clientX:100,clientY:150});return{before,after:document.querySelectorAll('.marca-parede').length,luaCheia:document.body.classList.contains('lua-cheia'),eggAvailable:typeof Bau.eggs?.saci}})
     // A API do easter egg pode ter outro namespace; registrar sem fabricar suporte.
     assert.ok(effects.after>effects.before)
     const swipe=await page.evaluate(()=>{const before=Bau.corredor.estado.alvoZ;const a=new Event('touchstart');Object.defineProperty(a,'touches',{value:[{clientY:350}]});dispatchEvent(a);const b=new Event('touchend');Object.defineProperty(b,'changedTouches',{value:[{clientY:200}]});dispatchEvent(b);return{before,after:Bau.corredor.estado.alvoZ}})
     assert.notEqual(swipe.before,swipe.after)
     return{audio,effects,swipe,follow,entryViaNavigationMs:entryMs,layout:await measure(page)}
    })
    await step('galeria-flip-toque-ampliacao-paisagem',async()=>{
     await page.goto(`${origin}/casa/cartas.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelectorAll('#mesa .carta-x').length===61&&globalThis.Bau?.colecao?.user)
     const card=page.locator('#mesa [data-legend-id="loira-do-banheiro"]');const img=card.locator('.cx-frente img');await img.evaluate(el=>{el.loading='eager'});await img.waitFor();await page.waitForFunction(()=>document.querySelector('#mesa [data-legend-id="loira-do-banheiro"] img').naturalWidth>0)
     const image=await img.evaluate(el=>({width:el.naturalWidth,height:el.naturalHeight,fit:getComputedStyle(el).objectFit}));assert.equal(image.width/image.height,2/3);assert.equal(image.fit,'contain')
     await card.tap();assert.equal(await card.getAttribute('data-face'),'verso');await page.waitForTimeout(1100);await card.tap();assert.equal(await card.getAttribute('data-face'),'frente')
     await page.getByRole('button',{name:'AMPLIAR Loira do Banheiro',exact:true}).tap();await page.locator('#revelar:not([hidden])').waitFor();await screenshot('galeria-ampliada')
     const portrait=await measure(page);await page.locator('#revelar-fechar').tap()
     await page.setViewportSize({width:height,height:width});await page.getByRole('button',{name:'AMPLIAR Loira do Banheiro',exact:true}).tap();await page.locator('#revelar:not([hidden])').waitFor()
     const box=await page.locator('#revelar .carta-x').boundingBox();const close=await page.locator('#revelar-fechar').boundingBox();const landscape=await measure(page);result.gallery={image,portrait,landscape,box,close};await screenshot('paisagem')
     assert.ok(box&&box.y>=-1&&box.y+box.height<=width+1,'Carta ampliada fora da paisagem');assert.ok(close&&close.y>=-1&&close.y+close.height<=width+1,'Fechar modal fora da paisagem')
     await page.locator('#revelar-fechar').tap();await page.setViewportSize({width,height})
     return{image,portrait,landscape}
    })
    await step('album-bloqueadas-desbloqueadas-virada',async()=>{
     await page.setViewportSize({width,height});await page.goto(`${origin}/?album=1`,{waitUntil:'domcontentloaded'});await page.getByText('1/60',{exact:true}).waitFor();assert.equal(await page.locator('.posicao').count(),60);assert.equal(await page.locator('.posicao.revelada').count(),1);assert.equal(await page.locator('.posicao.selada').count(),59)
     await screenshot('album');await page.getByRole('button',{name:'Próxima folha',exact:true}).tap();const loira=page.getByRole('button',{name:'Abrir carta Loira do Banheiro',exact:true});await loira.tap();await page.getByRole('dialog',{name:'Carta Loira do Banheiro',exact:true}).waitFor()
     await page.getByRole('button',{name:/Virar carta/}).tap();await page.getByRole('heading',{name:'O relato',exact:true}).waitFor();await screenshot('carta-album');await page.locator('.inspecao-fechar').tap();await page.locator('.inspecao').waitFor({state:'hidden'});await page.locator('.grimorio-fechar').tap()
     return await measure(page)
    })
    await step('portais-e-css-safari',async()=>{qrs=await makeQrs(page);assert.equal(qrs.length,2);await screenshot('portais');const portrait=await measure(page);await page.setViewportSize({width,height:Math.max(320,height-150)});const barsReduced=await measure(page);await page.setViewportSize({width,height});await page.locator('.portais .painel-topo .botao-discreto').tap();return{portrait,barsReduced}})
    await step('ra-glb-animacoes-materiais',async()=>{
     await page.goto(`${origin}/ra.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Aponte'))
     const media=await page.evaluate(()=>({secure:isSecureContext,mediaDevices:!!navigator.mediaDevices,getUserMedia:typeof navigator.mediaDevices?.getUserMedia,captureStream:typeof HTMLCanvasElement.prototype.captureStream,webgl:!!document.querySelector('#ar canvas'),playsInline:document.querySelector('video')?.playsInline,muted:document.querySelector('video')?.muted}))
     const layout=await measure(page);await screenshot('ra')
     const model=await page.evaluate(async()=>{const THREE=await import('three');const{GLTFLoader}=await import('/vendor/loaders/GLTFLoader.js');const start=performance.now();const gltf=await new GLTFLoader().loadAsync('/models/bau-das-lendas.glb');const loadMs=performance.now()-start;const materials=new Set();let triangles=0;gltf.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;materials.add(o.material)}});const animations=[];for(const clip of gltf.animations){const mixer=new THREE.AnimationMixer(gltf.scene);const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.update(0);const lid=gltf.scene.getObjectByName('Tampa'),q=lid.quaternion.clone();mixer.update(clip.duration);animations.push({name:clip.name,duration:clip.duration,travelDegrees:q.angleTo(lid.quaternion)*180/Math.PI});mixer.stopAllAction()}gltf.scene.traverse(o=>o.geometry?.dispose());for(const m of materials)m.dispose();return{loadMs,triangles,materials:materials.size,animations}})
     assert.equal(model.triangles,6572);assert.equal(model.materials,8);assert.equal(model.animations.length,3);for(const a of model.animations)assert.ok(a.name==='Idle'?a.travelDegrees<.1:Math.abs(a.travelDegrees-105)<.1)
     return{media,layout,model}
    })
    for(const [errorName,expected]of [['NotAllowedError','Permita o acesso'],['NotFoundError','Nenhuma câmera'],['NotReadableError','ocupada']])await step(`camera-erro-${errorName}`,async()=>{
     await page.goto(`${origin}/ra.html`,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'INICIAR CÂMERA',exact:true}).waitFor();await page.evaluate(name=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Erro simulado',name)}},errorName);await page.getByRole('button',{name:'INICIAR CÂMERA',exact:true}).tap();await page.waitForFunction(text=>document.querySelector('#status').textContent.includes(text),expected);assert.equal(await page.locator('#start').isEnabled(),true);return{simulated:true,status:await page.locator('#status').textContent()}
    })
    await step('recompensa-api-qr-simulado-persistencia',async()=>{
     if(!user)throw Error('Cadastro não disponível')
     const canCapture=await page.evaluate(()=>typeof HTMLCanvasElement.prototype.captureStream==='function')
     if(id==='iphone13'&&canCapture&&qrs){
      try {
      await installCamera(context,qrs);await page.goto(`${origin}/ra.html?compat=simulated-camera`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Aponte'));result.cameraHook=await page.evaluate(()=>{const fn=compatCamera.getUserMedia;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:fn,configurable:true,writable:true});return{type:typeof fn,installed:navigator.mediaDevices.getUserMedia===fn,keys:Object.keys(compatCamera)}});assert.equal(result.cameraHook.type,'function');assert.equal(result.cameraHook.installed,true);await page.getByRole('button',{name:'INICIAR CÂMERA',exact:true}).tap();await page.evaluate(()=>compatCamera.set(0));await page.waitForTimeout(500);assert.equal(await page.locator('#openChest').isHidden(),true);await page.evaluate(()=>compatCamera.set(1));await page.locator('#openChest:not([hidden])').waitFor();const response=page.waitForResponse(r=>r.url().endsWith('/api/rewards/open')&&r.request().method()==='POST');await page.locator('#openChest').tap();claimed=await(await response).json();await page.locator('#rewardOverlay:not([hidden])').waitFor();await page.waitForTimeout(1100);await screenshot('recompensa')
      const cleanup=await page.evaluate(()=>{dispatchEvent(new Event('pagehide'));return{allTracksEnded:compatCamera.streams.flatMap(s=>s.getTracks()).every(t=>t.readyState==='ended'),canvases:document.querySelectorAll('#ar canvas').length}});assert.equal(cleanup.allTracksEnded,true);assert.equal(cleanup.canvases,0);result.cameraCleanup=cleanup;result.qrSimulation={status:'APROVADO'}
      }catch(error){
       result.qrSimulation={status:result.cameraHook?.installed===false||result.cameraHook?.type!=='function'?'BLOQUEADO':'REPROVADO',reason:error.message.split('\n')[0],diagnostics:await page.evaluate(()=>{const v=document.querySelector('video');return{stage:globalThis.compatCamera?.stage,hookInstalled:navigator.mediaDevices.getUserMedia===globalThis.compatCamera?.getUserMedia,status:document.querySelector('#status')?.textContent,video:v?{paused:v.paused,readyState:v.readyState,width:v.videoWidth,height:v.videoHeight,currentTime:v.currentTime}:null,tracks:globalThis.compatCamera?.streams.flatMap(s=>s.getTracks().map(t=>({state:t.readyState,muted:t.muted,enabled:t.enabled})))}})};if(result.qrSimulation.diagnostics.hookInstalled===false&&result.qrSimulation.diagnostics.tracks?.length===0){result.qrSimulation.status='BLOQUEADO';result.qrSimulation.limitation='Adaptador de câmera não permaneceu instalado; nenhum stream sintético criado.'}await screenshot('qr-simulado-falha');
       await page.evaluate(()=>dispatchEvent(new Event('pagehide')));
       const response=await context.request.post(`${origin}/api/rewards/open`,{headers:{...headers,'Idempotency-Key':randomUUID()}});assert.equal(response.status(),200);claimed=await response.json()
      }
     }else{const response=await context.request.post(`${origin}/api/rewards/open`,{headers:{...headers,'Idempotency-Key':randomUUID()}});assert.equal(response.status(),200);claimed=await response.json()}
     assert.equal(claimed.progress.obtained,2);assert.equal(claimed.is_new,true)
     const denied=await context.request.post(`${origin}/api/draws`,{headers:{...headers,'Idempotency-Key':randomUUID()}});assert.equal(denied.status(),409)
     await page.goto(`${origin}/?conta=1`,{waitUntil:'domcontentloaded'});await page.getByRole('region',{name:'Recompensas diárias'}).getByText(/Próxima/).waitFor();await page.locator('[aria-label="Recompensas diárias"] summary').tap();await page.getByText(claimed.legend.nome,{exact:true}).first().waitFor();await screenshot('historico')
     await page.goto(`${origin}/?album=1`,{waitUntil:'domcontentloaded'});await page.getByText('2/60',{exact:true}).waitFor();await page.reload();await page.getByText('2/60',{exact:true}).waitFor();assert.equal(await page.locator('.posicao.revelada').count(),2)
     return{simulatedCamera:id==='iphone13'&&canCapture,qrScenario:id==='iphone13'?(canCapture?result.qrSimulation?.status:'BLOQUEADO'):'NÃO EXECUTADO',canCapture,progress:2,dailyConflict:409}
    })
    await step('sessao-expirada-troca-conta-falha-rede',async()=>{
     if(!user)throw Error('Cadastro não disponível')
     await page.goto(`${origin}/?conta=1`,{waitUntil:'domcontentloaded'});await page.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor()
     execFileSync('backend/.venv/bin/python',['backend/tests/browser_compat_fixture.py',user.id,'expire'],{stdio:'pipe'})
     await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.getByRole('button',{name:'Entrar',exact:true}).waitFor();assert.equal(await page.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).count(),0)
     await page.locator('[name=email]').fill(credentials.email);await page.locator('[name=password]').fill(credentials.password);await page.getByRole('button',{name:'Entrar',exact:true}).tap();await page.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor()
     await page.getByRole('button',{name:'Sair da conta',exact:true}).tap();await page.getByRole('button',{name:'Entrar',exact:true}).waitFor();assert.equal((await context.request.get(`${origin}/api/album`)).status(),401)
     await page.goto(`${origin}/?album=1`,{waitUntil:'domcontentloaded'});await page.locator('.grimorio-aviso').waitFor();assert.equal(await page.locator('.posicao.revelada').count(),0)
     const other=await context.request.post(`${origin}/api/auth/register`,{headers,data:{username:'Compatibilidade móvel B',email:`compat-b-${randomUUID()}@example.com`,password:randomUUID()}});assert.equal(other.status(),201)
     await page.goto(`${origin}/?album=1`,{waitUntil:'domcontentloaded'});await page.getByText('0/60',{exact:true}).waitFor();assert.equal(await page.locator('.posicao.revelada').count(),0)
     await context.request.post(`${origin}/api/auth/logout`,{headers})
     await page.goto(`${origin}/?conta=1`,{waitUntil:'domcontentloaded'});await page.route('**/api/auth/login',route=>route.abort());await page.locator('[name=email]').fill(credentials.email);await page.locator('[name=password]').fill(credentials.password);await page.getByRole('button',{name:'Entrar',exact:true}).tap();await page.getByText(/Não foi possível acessar a API/).waitFor();await page.unroute('**/api/auth/login')
     return{expiredServerSession:true,loggedOutAlbumEmpty:true,networkErrorShown:true,layout:await measure(page)}
    })
   }finally{await context.close();await save();console.log(`${key}: ${result.steps.filter(s=>s.status==='APROVADO').length}/${result.steps.length} verificações aprovadas`)}
   }finally{await browser.close()}
  }
}
await save();console.log('Evidências:',destination)
console.log('Resumo:',JSON.stringify(report.cases.map(c=>({engine:c.engine,profile:c.profile,failed:c.steps?.filter(s=>s.status==='REPROVADO').map(s=>s.name)}))))

if(report.cases.some(c=>c.status==='BLOQUEADO'||(c.qrSimulation&&c.qrSimulation.status!=='APROVADO')||c.steps?.some(s=>['REPROVADO','BLOQUEADO'].includes(s.status))))process.exitCode=1
