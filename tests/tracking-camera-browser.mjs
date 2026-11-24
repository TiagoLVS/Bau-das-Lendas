import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

const origin = process.env.BAU_TEST_ORIGIN
if (origin !== 'http://localhost:5175' || process.env.BAU_TEST_DATABASE !== 'bau_test') throw Error('Somente bau_test')
const out = process.env.BAU_TRACKING_OUT || 'tests/artifacts/etapa09'
const report = []
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const env = {...process.env}
  for (const key of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH']) if (env[key]?.includes('/snap/')) delete env[key]
  const browser = await engine.launch({headless:true, env, args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
  const result = {engine:name, errors:[], viewports:[]}; report.push(result)
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}, hasTouch:true})
    const page = await context.newPage(); page.setDefaultTimeout(15000)
    const response = await context.request.post(origin+'/api/auth/register', {headers:{Origin:origin,'X-Bau-Request':'1'}, data:{username:'Teste RA',email:randomUUID()+'@example.com',password:randomUUID()}})
    assert.equal(response.status(),201)
    await page.goto(origin+'/?portais=1',{waitUntil:'domcontentloaded'})
    await page.locator('.portal-qr svg').nth(1).waitFor()
    const qrs = await page.locator('.portal-qr svg').evaluateAll(elements=>elements.map(svg=>'data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg))))
    await context.addInitScript(({qrs})=>{
      const images=qrs.map(src=>{const img=new Image();img.src=src;return img})
      const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720
      const ctx=canvas.getContext('2d'); let marker=-1
      const fixture=globalThis.trackingCamera={calls:0,error:null,streams:[],set(value){marker=value;paint()}}
      function paint(){ctx.fillStyle='#888';ctx.fillRect(0,0,1280,720);if(marker>=0&&images[marker].complete)ctx.drawImage(images[marker],490,210,300,300)}
      fixture.getUserMedia=async constraints=>{
        fixture.calls++;fixture.constraints=constraints
        if(fixture.error)throw new DOMException('Falha sintética sem dados pessoais',fixture.error)
        await Promise.all(images.map(img=>img.decode()));paint()
        const timer=setInterval(paint,66);addEventListener('pagehide',()=>clearInterval(timer),{once:true})
        const stream=canvas.captureStream(15);fixture.streams.push(stream);return stream
      }
      if(globalThis.MediaDevices)Object.defineProperty(MediaDevices.prototype,'getUserMedia',{value:fixture.getUserMedia,configurable:true})
    },{qrs})
    await page.goto(origin+'/?portais=1',{waitUntil:'domcontentloaded'})
    assert.equal(await page.evaluate(()=>trackingCamera.calls),0)
    await page.goto(origin+'/ra.html',{waitUntil:'domcontentloaded'})
    await page.waitForFunction(()=>!document.querySelector('#start').disabled)
    // WebKit pode restaurar a propriedade nativa entre navegações.
    await page.evaluate(()=>Object.defineProperty(MediaDevices.prototype,'getUserMedia',{value:trackingCamera.getUserMedia,configurable:true}))
    assert.equal(await page.evaluate(()=>trackingCamera.calls),0)
    await page.evaluate(()=>Object.defineProperty(window,'isSecureContext',{value:false,configurable:true}))
    await page.locator('#start').press('Enter')
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('HTTPS'))
    assert.equal(await page.evaluate(()=>trackingCamera.calls),0)
    result.errors.push({name:'SecurityError',status:'APROVADO'})
    await page.evaluate(()=>{Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});Object.defineProperty(MediaDevices.prototype,'getUserMedia',{value:undefined,configurable:true})})
    await page.locator('#start').press('Enter')
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('não oferece acesso'))
    assert.equal(await page.evaluate(()=>trackingCamera.calls),0)
    result.errors.push({name:'NotSupportedError',status:'APROVADO'})
    await page.evaluate(()=>Object.defineProperty(MediaDevices.prototype,'getUserMedia',{value:trackingCamera.getUserMedia,configurable:true}))
    for(const [error,pattern] of [['NotAllowedError',/Permita/],['NotFoundError',/Nenhuma câmera/],['NotReadableError',/ocupada/],['OverconstrainedError',/Não foi possível/]]) {
      await page.evaluate(error=>trackingCamera.error=error,error)
      const calls=await page.evaluate(()=>trackingCamera.calls)
      await page.locator('#start').press('Enter')
      await page.waitForFunction(wanted=>trackingCamera.calls===wanted,calls+1)
      await page.waitForFunction(()=>!document.querySelector('#start').disabled)
      assert.match(await page.locator('#status').textContent(),pattern)
      assert.equal(await page.locator('.ritual-camera').evaluate(video=>video.srcObject),null)
      result.errors.push({name:error,status:'APROVADO'})
    }
    await page.evaluate(()=>{trackingCamera.error=null;trackingCamera.set(0)})
    await page.locator('#start').tap()
    await page.waitForFunction(()=>document.querySelector('#start').hidden&&document.querySelector('video').currentTime>.6)
    assert.equal(await page.locator('#openChest').isVisible(),false)
    assert.deepEqual(await page.evaluate(()=>trackingCamera.constraints),{audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}})
    await page.evaluate(()=>trackingCamera.set(1)); await page.locator('#openChest:not([hidden])').waitFor()
    await page.screenshot({path:`${out}/${name}-marker.png`})
    await page.evaluate(()=>trackingCamera.set(-1));await page.waitForFunction(()=>document.querySelector('#openChest').hidden)
    await page.screenshot({path:`${out}/${name}-lost.png`})
    await page.evaluate(()=>trackingCamera.set(1));await page.locator('#openChest:not([hidden])').waitFor()
    for(const [width,height] of [[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[568,320],[844,390]]){
      await page.setViewportSize({width,height})
      await page.waitForFunction(({width,height})=>{
        const rect=document.querySelector('#ar canvas')?.getBoundingClientRect()
        return rect&&Math.abs(rect.width-width)<1&&Math.abs(rect.height-height)<1
      },{width,height})
      await page.locator('#openChest:not([hidden])').waitFor()
      const bounds=await page.locator('#openChest').boundingBox()
      assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1)
      const dimensions=await page.evaluate(()=>{const v=document.querySelector('video'),c=document.querySelector('#ar canvas');return {width:innerWidth,height:innerHeight,vw:v.videoWidth,vh:v.videoHeight,video:v.getBoundingClientRect().toJSON(),canvas:c?.getBoundingClientRect().toJSON(),fit:getComputedStyle(v).objectFit}})
      assert.equal(dimensions.fit,'cover');assert.ok(dimensions.vw>0&&dimensions.vh>0)
      result.viewports.push({width,height,status:'APROVADO',dimensions})
    }
    await page.screenshot({path:`${out}/${name}-landscape.png`})
    await page.evaluate(()=>trackingCamera.streams.at(-1).getVideoTracks()[0].dispatchEvent(new Event('ended')))
    await page.locator('#start:not([hidden])').waitFor()
    assert.equal(await page.locator('#openChest').isVisible(),false)
    assert.ok(await page.evaluate(()=>trackingCamera.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))))
    await page.locator('#start').tap();await page.locator('#openChest:not([hidden])').waitFor()
    result.retry='APROVADO'
    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')))
    assert.equal(await page.locator('video').count(),0)
    assert.ok(await page.evaluate(()=>trackingCamera.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))))
    result.lifecycle='APROVADO';result.status='APROVADO'
    await context.close()
  } catch(error){result.status='REPROVADO';result.reason=error.message;result.diagnostic=await browser.contexts()[0]?.pages()[0]?.evaluate(()=>({status:document.querySelector('#status')?.textContent,calls:trackingCamera.calls,error:trackingCamera.error,mocked:navigator.mediaDevices.getUserMedia===trackingCamera.getUserMedia,streams:trackingCamera.streams.map(s=>s.getTracks().map(t=>t.readyState))})).catch(()=>null)}
  finally {await browser.close();await writeFile(`${out}/camera-browser.json`,JSON.stringify(report,null,2));console.log(name,result.status,result.reason??'')}
}
if(report.some(r=>r.status!=='APROVADO'))process.exitCode=1
