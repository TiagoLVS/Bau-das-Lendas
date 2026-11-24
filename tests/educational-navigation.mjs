import assert from 'node:assert/strict'
import {chromium,webkit} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
const origin=process.env.BAU_TEST_ORIGIN;if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Somente bau_test')
const results=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]});const r={engine:name};results.push(r)
 try{const p=await b.newPage({viewport:{width:360,height:800},hasTouch:true});p.setDefaultTimeout(15000);await p.goto(origin,{waitUntil:'domcontentloaded'});const nav=p.getByRole('navigation',{name:'Principal',exact:true});await p.locator('.menu-alternar').waitFor();await p.locator('.menu-alternar').tap();await nav.locator('a').first().waitFor();assert.deepEqual(await nav.locator('a').allTextContents(),['Início','Explorar','Álbum']);assert.equal(await nav.getByRole('link',{name:'Perfil',exact:true}).count(),0);await p.locator('.perfil-acesso').waitFor();await nav.getByRole('link',{name:'Explorar',exact:true}).tap();await p.getByRole('heading',{name:'Explorar',exact:true}).waitFor();assert.equal(await p.locator('.portal-qr svg').count(),2);await p.getByRole('button',{name:'Fechar',exact:false}).tap();await p.locator('.menu-alternar').tap();await nav.getByRole('link',{name:'Álbum',exact:true}).tap();await p.locator('.grimorio').waitFor();await p.getByRole('link',{name:/Galeria pública/}).tap();await p.locator('#mesa .carta-x').first().waitFor();assert.equal(await p.locator('#mesa .carta-x').count(),61);await p.getByRole('navigation',{name:'Principal',exact:true}).getByRole('link',{name:'Início',exact:true}).tap();await p.locator('.inicio-contexto').waitFor();r.status='APROVADO'
 }catch(e){r.status='REPROVADO';r.reason=e.message}finally{await b.close();await writeFile(`${process.env.BAU_EDUCATIONAL_OUT||'tests/artifacts/etapa07'}/navigation.json`,JSON.stringify(results,null,2));console.log(name,r.status,r.reason??'')}
}
if(results.some(r=>r.status!=='APROVADO'))process.exitCode=1
