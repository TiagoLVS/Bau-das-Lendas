import assert from'node:assert/strict'
import{chromium,webkit}from'@playwright/test'
import{writeFile}from'node:fs/promises'
const origin=process.env.BAU_TEST_ORIGIN;if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Somente bau_test local')
const results=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 try{const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await c.newPage();p.setDefaultTimeout(15000)
 for(const[w,h]of[[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[844,390]]){
  await p.setViewportSize({width:w,height:h});await p.goto(origin,{waitUntil:'domcontentloaded'});const nav=p.locator('#menu-principal');assert.deepEqual(await nav.locator('a').allTextContents(),['Início','Explorar','Álbum']);assert.equal(await nav.getByRole('link',{name:'Perfil',exact:true}).count(),0);await p.getByRole('link',{name:'Perfil',exact:true}).waitFor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 await p.setViewportSize({width:390,height:844});await p.goto(`${origin}/?portais=1`);await p.getByRole('heading',{name:'Explorar',exact:true}).waitFor();assert.equal(await p.locator('.portal-qr svg').count(),2);assert.equal(await p.locator('video').count(),0);await p.screenshot({path:`tests/artifacts/etapa06/${name}-explorar.png`,scale:'css'});
 await p.goto(`${origin}/?album=1`);await p.getByRole('link',{name:/Galeria pública/}).waitFor();await p.getByRole('link',{name:/Galeria pública/}).tap();await p.waitForURL('**/casa/cartas.html');assert.deepEqual((await p.getByRole('navigation',{name:'Principal'}).getByRole('link').allTextContents()).map(s=>s.trim()),['Início','Explorar','Álbum']);await p.goBack();await p.getByRole('link',{name:/Galeria pública/}).waitFor();await p.reload();await p.getByRole('link',{name:/Galeria pública/}).waitFor()
 await p.goto(`${origin}/?conta=1&retorno=ritual`);await p.getByRole('button',{name:'Entrar',exact:true}).waitFor();await p.screenshot({path:`tests/artifacts/etapa06/${name}-perfil.png`,scale:'css'});
 await p.goto(`${origin}/casa/index.html`);await p.locator('#nav-corredor').waitFor();assert.equal(await p.getByRole('navigation',{name:'Principal'}).getByRole('link').count(),3)
 await p.goto(`${origin}/ra.html`);await p.locator('#start').waitFor();assert.equal(await p.locator('#start').isVisible(),true)
 results.push({engine:name,status:'APROVADO',viewports:8});await c.close()
 }catch(e){results.push({engine:name,status:'REPROVADO',reason:e.message})}finally{await b.close();await writeFile('tests/artifacts/etapa06/browser.json',JSON.stringify(results,null,2))}
}
console.log(JSON.stringify(results));if(results.some(r=>r.status==='REPROVADO'))process.exitCode=1
