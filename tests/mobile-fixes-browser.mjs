import assert from 'node:assert/strict'
import {chromium,webkit,devices}from'@playwright/test'
import{mkdir,writeFile}from'node:fs/promises'
const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Exige serviços locais em bau_test.')
const phase=process.env.BAU_MOBILE_PHASE||'after'
const out=`tests/artifacts/mobile-fixes/${new Date().toISOString().replace(/[:.]/g,'-')}-${phase}`
await mkdir(out,{recursive:true})
const report={phase,physicalDevices:false,cases:[]}
const save=()=>writeFile(`${out}/report.json`,JSON.stringify(report,null,2))
const sizes=phase==='before'?[[320,568],[390,844]]:[[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[1300,900]]
async function metrics(page){return page.evaluate(()=>{
 const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}
 const button=document.querySelector('#revelar-fechar'),b=rect(button),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)
 const card=document.querySelector('#revelar .cx-frente .face'),image=card?.querySelector('img')
 return{inner:[innerWidth,innerHeight],client:[document.documentElement.clientWidth,document.documentElement.clientHeight],visual:visualViewport?{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null,scrollWidth:document.documentElement.scrollWidth,button:b,hit:hit?.outerHTML.slice(0,220),buttonReceives:hit===button||button.contains(hit),art:card?rect(card):null,image:image?{natural:[image.naturalWidth,image.naturalHeight],fit:getComputedStyle(image).objectFit}:null,overflow:[...document.querySelectorAll('.topo,.pagina,.revelar-palco,#revelar-carta,.cx-legenda,.revelar-instrucao')].map(el=>({class:el.className||el.id,...rect(el)}))}
})}
for(const [name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 try{
 const configs=sizes.map(([w,h])=>({w,h,dpr:1}));if(phase!=='before')configs.push({w:320,h:568,dpr:engine===webkit?3:2.75},{w:390,h:844,dpr:engine===webkit?3:2.75})
 for(const{w,h,dpr}of configs){
  const desktop=w>1000,key=`${name.toLowerCase()}-${w}-${dpr}`,result={engine:name,size:[w,h],dpr,checks:[],errors:[]};report.cases.push(result)
  const c=await b.newContext({...devices[engine===webkit?'iPhone 13':'Pixel 5'],isMobile:!desktop,hasTouch:!desktop,deviceScaleFactor:dpr,viewport:{width:w,height:h}})
  const p=await c.newPage();p.setDefaultTimeout(7000);p.on('pageerror',e=>result.errors.push(e.message))
  const activate=locator=>desktop?locator.click():locator.tap()
  const shot=async label=>{const path=`${out}/${key}-${label}.png`;await p.screenshot({path,scale:'css',timeout:7000,animations:'allow'});return path}
  async function check(label,fn){try{await fn();result.checks.push({label,status:'APROVADO'})}catch(e){result.checks.push({label,status:'REPROVADO',reason:e.message.slice(0,1800)});await shot('falha-'+result.checks.length).catch(()=>{})}await save()}
  try{
   await p.goto(`${origin}/casa/cartas.html`);await p.waitForFunction(()=>document.querySelectorAll('#mesa .carta-x').length===61&&!document.querySelector('#collection-status').textContent.includes('Consultando'))
   for(const[width,height]of desktop?[[w,h]]:[[w,h],[h,w]]){
    await p.setViewportSize({width,height});const orientation=width>height?'paisagem':'retrato'
    await check(orientation,async()=>{
     const open=()=>activate(p.getByRole('button',{name:'AMPLIAR Loira do Banheiro',exact:true}))
     await open();await p.locator('#revelar:not([hidden])').waitFor();const article=p.locator('#revelar .carta-x')
     await p.waitForFunction(()=>document.querySelector('#revelar .cx-frente img')?.naturalWidth>0)
     await p.waitForTimeout(1100);const first=await metrics(p);result[orientation]={first}
     if(w===320||w===390&&dpr===1)result[orientation].screenshot=await shot(orientation)
     if(phase==='before'){
      await activate(article);await p.waitForTimeout(1100);await activate(article);await p.waitForTimeout(1100);result[orientation].rotated=await metrics(p)
      try{await activate(p.locator('#revelar-fechar'));await p.locator('#revelar').waitFor({state:'hidden'});result[orientation].realClose=true}catch(e){result[orientation].realClose=false;result[orientation].closeReason=e.message.slice(0,800)}
      if(await p.locator('#revelar').isVisible()){
       await p.addStyleTag({content:'.revelar-fechar{position:relative;z-index:2}#revelar-carta{position:relative;z-index:0;isolation:isolate}'});result[orientation].isolated=await metrics(p);await activate(p.locator('#revelar-fechar'))
      }
      return
     }
     assert.ok(Math.abs(first.inner[0]-width)<=1,`Layout expandido: ${first.inner[0]} / ${width}`)
     assert.ok(first.scrollWidth<=width+1,'Documento mais largo que a viewport')
     assert.ok(first.button.y>=-1&&first.button.bottom<=height+1,'Botão fora da altura disponível')
     assert.ok(first.button.x>=-1&&first.button.right<=width+1,'Botão fora da largura disponível')
     assert.equal(first.buttonReceives,true,'Outro elemento intercepta o botão')
     assert.ok(Math.abs(first.art.width/first.art.height-2/3)<.015,'Arte sem proporção 2:3')
     assert.equal(first.image.fit,'contain');assert.deepEqual(first.image.natural,[768,1152])
     // Fechar durante a virada, sem esperar a animação e sem clique forçado.
     await activate(article);assert.equal(await article.getAttribute('data-face'),'verso');await p.waitForTimeout(150);await activate(p.locator('#revelar-fechar'));await p.locator('#revelar').waitFor({state:'hidden'})
     await open();await p.waitForTimeout(1100);await activate(p.locator('#revelar .carta-x'));await p.waitForTimeout(1100);assert.equal(await p.locator('#revelar .carta-x').getAttribute('data-face'),'verso');await activate(p.locator('#revelar-fechar'));await p.locator('#revelar').waitFor({state:'hidden'})
     await open();await p.waitForTimeout(1100);await activate(p.locator('#revelar .carta-x'));await p.waitForTimeout(1100);await activate(p.locator('#revelar .carta-x'));await p.waitForTimeout(1100);assert.equal(await p.locator('#revelar .carta-x').getAttribute('data-face'),'frente');await activate(p.locator('#revelar-fechar'));await p.locator('#revelar').waitFor({state:'hidden'})
     await open();await p.keyboard.press('Escape');await p.locator('#revelar').waitFor({state:'hidden'})
     await open();await p.keyboard.press('Tab');await p.locator('#revelar-fechar').waitFor();assert.equal(await p.locator('#revelar-fechar').evaluate(el=>el===document.activeElement),true);await p.keyboard.press('Enter');await p.locator('#revelar').waitFor({state:'hidden'})
    })
    if(await p.locator('#revelar').isVisible())await p.keyboard.press('Escape')
   }
  }catch(e){result.setupError=e.message;await save()}
  finally{await c.close();await save();console.log(key,result.checks.map(x=>x.status).join('/'))}
 }
 }finally{await b.close()}
}
await save();console.log('Evidências:',out)
if(phase!=='before'&&report.cases.some(c=>c.setupError||c.checks.some(x=>x.status!=='APROVADO')))process.exitCode=1
