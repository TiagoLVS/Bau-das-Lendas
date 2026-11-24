import assert from 'node:assert/strict'
import {chromium,webkit} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175')throw Error('Somente servidor local de testes')
const out=process.env.BAU_NAV_ARTIFACT_DIR||'tests/artifacts/etapa06-final'
const results=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 if(process.env.BAU_HTML_ENGINE&&process.env.BAU_HTML_ENGINE!==name)continue
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 try{const p=await b.newPage();p.setDefaultTimeout(15000)
 for(const[w,h]of[[320,568],[360,800],[390,844],[430,932],[568,320],[844,390]])for(const path of['/casa/index.html','/casa/cartas.html']){
  const row={engine:name,width:w,height:h,path};results.push(row)
  try{await p.setViewportSize({width:w,height:h});const response=await p.goto(origin+path,{waitUntil:'domcontentloaded'});row.http=response.status();assert.equal(row.http,200);const nav=p.getByRole('navigation',{name:'Principal',exact:true});await nav.locator('a').first().waitFor();assert.deepEqual((await nav.locator('a').allTextContents()).map(t=>t.trim()),['Início','Explorar','Álbum']);
   for(const link of[...await nav.locator('a').all(),p.locator('.perfil-acesso')]){await link.scrollIntoViewIfNeeded();assert.ok(await link.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&(hit===el||el.contains(hit))}),'Link encoberto ou fora da área de toque')}
   row.status='APROVADO'
  }catch(e){row.status='REPROVADO';row.reason=e.message.slice(0,700);row.url=p.url();row.dom=await p.evaluate(()=>({title:document.title,navs:[...document.querySelectorAll('nav')].map(n=>({name:n.getAttribute('aria-label'),text:n.textContent,display:getComputedStyle(n).display,width:n.getBoundingClientRect().width}))})).catch(()=>null)}
  await writeFile(out+'/' +(process.env.BAU_HTML_ENGINE?'html-controls-recheck.json':'html-controls.json'),JSON.stringify(results,null,2))
 }
 }finally{await b.close()}
}
console.log(JSON.stringify(results));if(results.some(r=>r.status==='REPROVADO'))process.exitCode=1
