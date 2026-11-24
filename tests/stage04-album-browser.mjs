import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium, webkit } from '@playwright/test'
const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Execute apenas com API local de testes isolados.')
for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env}
 if(engine===webkit)for(const key of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[key]?.includes('/snap/'))delete env[key]
 const browser=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 try{
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true})
  const page=await context.newPage();const headers={Origin:origin,'X-Bau-Request':'1'}
  async function register(){const r=await context.request.post(`${origin}/api/auth/register`,{headers,data:{username:'Etapa 04 Álbum',email:`album-${randomUUID()}@example.com`,password:randomUUID()}});assert.equal(r.status(),201)}
  await register()
  const result=await(await context.request.post(`${origin}/api/rewards/open`,{headers:{...headers,'Idempotency-Key':randomUUID()}})).json()
  assert.equal(result.is_new,true)
  await page.goto(`${origin}/?album=1`)
  await page.getByText('1/60',{exact:true}).waitFor()
  assert.equal(await page.locator('.posicao.revelada').count(),1)
  assert.equal(await page.locator(`[data-posicao="${result.legend.numero}"].revelada`).count(),1)
  const deny=await context.request.post(`${origin}/api/draws`,{headers:{...headers,'Idempotency-Key':randomUUID()}});assert.equal(deny.status(),409)
  await page.reload();await page.getByText('1/60',{exact:true}).waitFor()
  assert.equal(await page.locator('.posicao.revelada').count(),1)
  await register();await page.reload();await page.getByText('0/60',{exact:true}).waitFor()
  assert.equal(await page.locator('.posicao.revelada').count(),0)
  console.log(`${name}: APROVADO — carta revelada no álbum, reload sem duplicação e troca de conta sem carta anterior.`)
 }finally{await browser.close()}
}
