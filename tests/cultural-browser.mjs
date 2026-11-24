import assert from'node:assert/strict'
import{chromium,webkit}from'@playwright/test'
import{writeFile,readFile}from'node:fs/promises'
const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Exige bau_test local.')
const results=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const browser=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage()
 const api=await context.request.get(`${origin}/api/legends`);assert.equal(api.status(),200);const legends=await api.json();assert.equal(legends.length,60);assert.deepEqual(legends,JSON.parse(await readFile('public/lendas-ra.json','utf8')));assert.equal(legends.filter(l=>l.cultura?.resumoEducativo).length,57);assert.equal(legends[57].cultura.resumoEducativo,null);assert.equal(legends[2].cultura.curiosidades.length,1)
 const album=await context.request.get(`${origin}/api/album`);assert.equal(album.status(),401)
 await page.goto(`${origin}/casa/cartas.html`);await page.waitForFunction(()=>document.querySelectorAll('#mesa .carta-x').length===61);await page.getByRole('button',{name:'AMPLIAR Loira do Banheiro',exact:true}).tap();await page.locator('#revelar .carta-x').tap();await page.locator('#revelar-fechar').tap();await page.locator('#revelar').waitFor({state:'hidden'})
 await page.screenshot({path:`tests/artifacts/etapa05/${name.toLowerCase()}-galeria.png`,scale:'css'})
 results.push({engine:name,status:'APROVADO',catalog:60,summaries:57,privateAlbum:401,viewport:[390,844]})
 }finally{await browser.close()}
}
await writeFile('tests/artifacts/etapa05/browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results))
