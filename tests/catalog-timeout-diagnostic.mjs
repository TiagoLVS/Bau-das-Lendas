import {chromium} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
const b=await chromium.launch({headless:true,env,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});const results=[]
try{for(const instrumented of[true,false]){
const p=await b.newPage();const pending=new Set(),errors=[];if(instrumented){p.on('request',r=>pending.add(r.url()));for(const e of['requestfinished','requestfailed'])p.on(e,r=>pending.delete(r.url()));p.on('pageerror',e=>errors.push(e.message))}
await p.route('**/api/legends',r=>r.fulfill({status:503,body:'{}'}));await p.route('**/lendas-ra.json',r=>r.fulfill({status:503,body:'Erro de teste'}));let timeout=false;try{await p.goto('http://localhost:5175/casa/index.html?compat=failure',{waitUntil:'load',timeout:20000})}catch(e){if(!e.message.includes('Timeout'))throw e;timeout=true}
await p.getByRole('alert').waitFor();results.push({instrumented,timeout,disabled:await p.locator('#btn-entrar').isDisabled(),alert:await p.getByRole('alert').textContent(),timing:await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return{domContentLoadedEventEnd:n.domContentLoadedEventEnd,loadEventEnd:n.loadEventEnd}}),errors,pending:[...pending]});await p.close()
}}finally{await b.close();await writeFile('tests/artifacts/etapa06-final/timeout-diagnostic.json',JSON.stringify(results,null,2))}
