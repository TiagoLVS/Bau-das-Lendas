import assert from 'node:assert/strict'
import {chromium,webkit} from '@playwright/test'
import {randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {writeFile} from 'node:fs/promises'
const out=process.env.BAU_EDUCATIONAL_OUT||'tests/artifacts/etapa07'
const origin=process.env.BAU_TEST_ORIGIN;if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Somente bau_test')
async function installCamera(context,qrs){
 await context.addInitScript(({qrs})=>{
  const images=qrs.map(src=>{const image=new Image();image.src=src;return image})
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');let marker=-1
  const streams=[];globalThis.compatCamera={set(value){marker=value;paint()},streams}
  function paint(){ctx.fillStyle='#888';ctx.fillRect(0,0,1280,720);if(marker>=0&&images[marker].complete)ctx.drawImage(images[marker],390,110,500,500)}
  compatCamera.getUserMedia=async()=>{compatCamera.stage='capture-support';if(!canvas.captureStream)throw new DOMException('Canvas captureStream indisponível','NotSupportedError');compatCamera.stage='image-decode';await Promise.all(images.map(image=>image.decode()));compatCamera.stage='paint';paint();const timer=setInterval(paint,66);addEventListener('pagehide',()=>clearInterval(timer),{once:true});compatCamera.stage='capture-stream';const stream=canvas.captureStream(15);streams.push(stream);compatCamera.stage='stream-returned';return stream};navigator.mediaDevices.getUserMedia=compatCamera.getUserMedia
 },{qrs})
}


const report=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]});const r={engine:name};report.push(r)
 try{const c=await b.newContext({hasTouch:true,viewport:{width:390,height:844}}),p=await c.newPage();p.setDefaultTimeout(15000);const headers={Origin:origin,'X-Bau-Request':'1'}
 async function register(){const response=await c.request.post(origin+'/api/auth/register',{headers,data:{username:'Compatibilidade móvel',email:randomUUID()+'@example.com',password:randomUUID()}});assert.equal(response.status(),201);return response.json()}
 const user=await register();execFileSync('backend/.venv/bin/python',['backend/tests/browser_compat_fixture.py',user.id,'seed'])
 await p.goto(origin+'/?album=1',{waitUntil:'domcontentloaded'});await p.getByText('1/60',{exact:true}).waitFor();await p.locator('[data-flipbook-control=next]').click();await p.getByRole('button',{name:'Abrir carta Loira do Banheiro',exact:true}).click();await p.locator('.inspecao .cx-toggle').click();await p.locator('.inspecao .educational-back').waitFor();await p.screenshot({animations:'disabled',path:`${out}/${name}-album.png`});await p.locator('.inspecao-fechar').click();await p.waitForFunction(()=>!document.querySelector('.inspecao')&&document.activeElement!==document.body);r.album='APROVADO'
 await register();const progress=await(await c.request.get(origin+'/api/album/progress')).json();assert.equal(progress.obtained,0);await p.goto(origin+'/?album=1',{waitUntil:'commit'});await p.getByText('0/60',{exact:true}).waitFor();assert.equal(await p.locator('.inspecao').count(),0);r.accountSwitch='APROVADO'
 await p.goto(origin+'/?portais=1',{waitUntil:'domcontentloaded'});await p.locator('.portal-qr svg').nth(1).waitFor();const qrs=await p.locator('.portal-qr svg').evaluateAll(async svgs=>Promise.all(svgs.map(async svg=>{const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg));await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=800;canvas.getContext('2d').drawImage(image,0,0,800,800);return canvas.toDataURL()})))
 await installCamera(c,qrs);await p.goto(origin+'/ra.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!document.querySelector('#start').disabled);await p.evaluate(()=>Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:compatCamera.getUserMedia,configurable:true}));await p.locator('#start').tap();await p.evaluate(()=>compatCamera.set(1));
 let markerDetected=false;try{await p.locator('#openChest:not([hidden])').waitFor();markerDetected=true;const response=p.waitForResponse(r=>r.url().endsWith('/api/rewards/open')&&r.request().method()==='POST');await p.locator('#openChest').tap();const result=await(await response).json();assert.ok(result.legend);await p.locator('#rewardOverlay:not([hidden])').waitFor();await p.locator('#flipButton').click();await p.locator('#faceB .educational-back').waitFor();const official=await(await c.request.get(origin+'/api/legends')).json();const expected=result.legend.cultura?.resumoEducativo||official.find(l=>l.id===result.legend.id)?.cultura?.resumoEducativo||'Conteúdo educativo em preparação.';assert.ok((await p.locator('#faceB .educational-back').textContent()).includes(expected));const box=await p.locator('#cardStage').boundingBox();assert.ok(Math.abs(box.width/box.height-2/3)<.02);assert.equal(await p.locator('#flipButton').getAttribute('aria-pressed'),'true');await p.screenshot({animations:'disabled',path:`${out}/${name}-reward.png`});r.reward='APROVADO'}catch(e){if(markerDetected)throw e;r.reward='BLOQUEADO';r.rewardReason=e.message;r.camera=await p.locator('#status').textContent()}
 await c.close()
 }catch(e){r.error=e.message;try{r.diagnostic=await b.contexts()[0].pages()[0].evaluate(()=>({url:location.href,title:document.title,progress:[...document.querySelectorAll('.grimorio-progresso')].map(e=>e.textContent),dialogs:[...document.querySelectorAll('[role=dialog]')].map(e=>e.getAttribute('aria-label')),body:document.body.textContent.slice(-700)}))}catch{}}finally{await b.close();await writeFile(`${out}/integration.json`,JSON.stringify(report,null,2));console.log(name,JSON.stringify(r))}
}
if(report.some(r=>r.error))process.exitCode=1
