// Executar somente com a API do banco bau_test explicitamente confirmado.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { chromium, webkit } from '@playwright/test'
const origin=process.env.BAU_TEST_ORIGIN
if(!['http://localhost:5175','http://127.0.0.1:5175'].includes(origin) || process.env.BAU_TEST_DATABASE!=='bau_test') throw Error('Confirme BAU_TEST_ORIGIN local e BAU_TEST_DATABASE=bau_test.')
const results=[]

async function cameraOpening(page, context) {
  await page.goto(`${origin}/?portais=1`)
  const qrs=await page.locator('.portal-qr svg').evaluateAll(async elements=>Promise.all(elements.map(async svg=>{
    const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg));await image.decode()
    const canvas=document.createElement('canvas');canvas.width=canvas.height=800;canvas.getContext('2d').drawImage(image,0,0,800,800);return canvas.toDataURL()
  })))
  await context.addInitScript(({qrs})=>{
    const images=qrs.map(src=>{const image=new Image();image.src=src;return image})
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');let marker=-1
    const paint=()=>{ctx.fillStyle='#888';ctx.fillRect(0,0,1280,720);if(marker>=0&&images[marker].complete)ctx.drawImage(images[marker],390,110,500,500)}
    globalThis.stage04Camera={marker(value){marker=value;paint()}}
    navigator.mediaDevices.getUserMedia=async()=>{await Promise.all(images.map(image=>image.decode()));paint();const timer=setInterval(paint,66);addEventListener('pagehide',()=>clearInterval(timer),{once:true});return canvas.captureStream(15)}
  },{qrs})
  await page.goto(`${origin}/ra.html`)
  await page.getByRole('button',{name:'INICIAR CÂMERA',exact:true}).click()
  await page.evaluate(()=>stage04Camera.marker(0));await page.waitForTimeout(500)
  assert.equal(await page.locator('#openChest').isHidden(),true)
  await page.evaluate(()=>stage04Camera.marker(1))
  await page.locator('#openChest:not([hidden])').waitFor()
  const response=page.waitForResponse(r=>r.url().endsWith('/api/rewards/open')&&r.request().method()==='POST')
  await page.locator('#openChest').click();const result=await(await response).json()
  await page.locator('#rewardOverlay:not([hidden])').waitFor()
  await page.waitForTimeout(1100)
  await page.screenshot({path:'/tmp/bau-etapa04-ra.png'})
  assert.equal(result.is_new,true)
  await page.getByRole('button',{name:'VOLTAR AO BAÚ',exact:true}).click()
  assert.equal(await page.locator('#openChest').isHidden(),true)
  return result
}

for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 if(process.env.BAU_TEST_BROWSER && process.env.BAU_TEST_BROWSER!==name)continue
 const env={...process.env}
 if(engine===webkit)for(const key of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[key]?.includes('/snap/'))delete env[key]
 let browser
 try{browser=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})}
 catch(error){results.push({name,status:'BLOQUEADO',reason:error.message.split('\n')[0]});continue}
 try{
  for(const [width,height] of [[320,568],[360,800],[390,844],[412,915]]){
   if(process.env.BAU_TEST_WIDTH && Number(process.env.BAU_TEST_WIDTH)!==width)continue
   let context, phase='start'
   try{
    context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true})
    const page=await context.newPage();page.setDefaultTimeout(20000)
    const credentials={email:`daily-${randomUUID()}@example.com`,password:randomUUID()}
    await page.goto(`${origin}/?conta=1`)
    await page.getByRole('button',{name:'Criar uma conta',exact:true}).click()
    await page.locator('[name=username]').fill('Etapa 04 Teste')
    await page.locator('[name=email]').fill(credentials.email);await page.locator('[name=password]').fill(credentials.password)
    await page.getByRole('button',{name:'Criar conta',exact:true}).click()
    await page.getByText('Bem-vindo, Etapa 04 Teste.',{exact:false}).waitFor()
    const user=await(await context.request.get(`${origin}/api/auth/me`)).json()
    const mode=width===320?'legacy':width===390?'complete':null
    if(mode)execFileSync('backend/.venv/bin/python',['backend/tests/browser_reward_fixture.py',user.id,mode],{stdio:'pipe'})
    await page.reload()
    const region=page.getByRole('region',{name:'Recompensas diárias'})
    await region.getByText('Recompensa disponível!',{exact:true}).waitFor()
    await region.locator('summary').click();phase='initial-history'
    if(mode==='legacy')await page.waitForFunction(()=>document.querySelectorAll('[aria-label="Recompensas diárias"] li').length===10)
    else await region.getByText('Você ainda não recebeu recompensas.',{exact:true}).waitFor()
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
    // Mudar o relógio de parede do navegador não altera elegibilidade no servidor.
    await page.evaluate(()=>{Date.now=()=>Date.parse('2099-01-01T00:00:00Z')})
    await page.evaluate(()=>{globalThis.stage04RewardEvents=0;addEventListener('bau-reward-change',()=>globalThis.stage04RewardEvents++)})
    let result
    if(engine===chromium&&width===360){
      result=await cameraOpening(page,context);await page.goto(`${origin}/?conta=1`)
    }else{
      result=await page.evaluate(async()=>{const {api}=await import('/api.js');return api('/rewards/open',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()}})})
    }
    if(!(engine===chromium&&width===360)){
      await page.waitForTimeout(150)
      assert.equal(await page.evaluate(()=>globalThis.stage04RewardEvents),1,'Uma notificação por resgate no documento')
    }
    assert.equal(result.is_new,mode!=='complete')
    assert.equal(result.progress.obtained,mode==='legacy'?13:mode==='complete'?60:1)
    phase='countdown-after-claim';await region.getByRole('status').filter({hasText:'Próxima'}).waitFor()
    if(!await region.locator('details').getAttribute('open')){
      // atributo open é string vazia quando presente
      if(!await region.locator('details').evaluate(el=>el.open))await region.locator('summary').click();phase='initial-history'
    }
    await region.getByText(result.legend.nome,{exact:true}).first().waitFor()
    assert.match(await region.locator('li').first().textContent(),mode==='complete'?/Carta repetida/:/Nova carta/)
    if(mode==='legacy'){
      phase='history-pagination';await region.getByRole('button',{name:'Carregar mais registros',exact:true}).click()
      await page.waitForFunction(()=>document.querySelectorAll('[aria-label="Recompensas diárias"] li').length===13)
      assert.match(await region.locator('li').last().textContent(),/tipo não informado/)
      await page.screenshot({path:`/tmp/bau-etapa04-${name.toLowerCase()}-320.png`})
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
    const blocked=await context.request.post(`${origin}/api/draws`,{headers:{Origin:origin,'X-Bau-Request':'1','Idempotency-Key':randomUUID()}})
    assert.equal(blocked.status(),409)
    assert.equal((await blocked.json()).detail.code,'DAILY_REWARD_USED')
    await page.reload();await region.getByRole('status').filter({hasText:'Próxima'}).waitFor()
    await page.getByRole('button',{name:'Sair da conta',exact:true}).click()
    await page.locator('[name=email]').fill(credentials.email);await page.locator('[name=password]').fill(credentials.password)
    await page.getByRole('button',{name:'Entrar',exact:true}).click()
    await region.getByRole('status').filter({hasText:'Próxima'}).waitFor()
    phase='ra-unavailable';await page.goto(`${origin}/ra.html`)
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Próxima'))
    assert.equal(await page.locator('#openChest').isHidden(),true)
    await page.route('**/api/rewards/status',route=>route.abort())
    phase='offline';await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Não foi possível acessar a API'))
    phase='online-recovery';await page.unroute('**/api/rewards/status');await page.evaluate(()=>dispatchEvent(new Event('online')))
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Próxima'))
    results.push({name,width,height,status:'APROVADO',mode:mode||'new',camera:engine===chromium&&width===360?'QR/vídeo sintéticos':'não executada'})
   }catch(error){results.push({name,width,height,status:'REPROVADO',phase,reason:error.message.split('\n').slice(0,3).join(' ')})}
   finally{await context?.close()}
  }
 }finally{await browser.close()}
}
console.log(JSON.stringify(results,null,2))
if(results.some(r=>r.status==='REPROVADO'))process.exitCode=1
