import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Somente bau_test')
const out=process.env.BAU_TOUCH_OUT||'tests/artifacts/etapa10/interactions';await mkdir(out,{recursive:true});const results=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]].filter(([name])=>!process.env.BAU_TOUCH_ENGINE||name===process.env.BAU_TOUCH_ENGINE)){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const browser=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]})
 const r={engine:name,checks:[],dpr:[],capabilities:{nativeMobilePan:engine===chromium?'CDP':'Não disponível pelo Playwright; sequência DOM suplementar',mobileReadingScroll:engine===webkit?'DOM scrollBy; gesto físico pendente; wheel nativo testado em desktop':'teclado/entrada nativa'}};results.push(r)
 try{
  const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2})
  const p=await c.newPage();p.setDefaultTimeout(15000)
  async function test(label,fn){if(process.env.BAU_TOUCH_SKIP?.split(',').includes(label)||(process.env.BAU_TOUCH_ONLY&&!process.env.BAU_TOUCH_ONLY.split(',').includes(label))){r.checks.push({label,status:'NÃO EXECUTADO'});return}try{await fn();r.checks.push({label,status:'APROVADO'})}catch(e){r.checks.push({label,status:'REPROVADO',reason:e.message})}console.log(name,label,r.checks.at(-1).status,r.checks.at(-1).reason?.slice(0,180)||'');await writeFile(`${out}/report.json`,JSON.stringify(results,null,2))}
  const email=randomUUID()+'@example.com',password=randomUUID()
  await test('cadastro-login-logout-formulario',async()=>{
   await p.goto(origin+'/?conta=1',{waitUntil:'domcontentloaded'});await p.locator('input[name=email]').waitFor()
   await p.locator('.painel-topo button').focus();await p.keyboard.press('Tab');assert.equal(await p.locator('input[name=email]').evaluate(el=>el===document.activeElement),true)
   await p.locator('.painel-topo button').focus();await p.keyboard.press('Shift+Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('.painel')))
   await p.getByRole('button',{name:'Criar uma conta',exact:true}).tap();await p.getByLabel('Nome',{exact:true}).fill('Compatibilidade móvel');await p.getByLabel('E-mail',{exact:true}).fill(email);await p.getByLabel('Senha (10 a 128 caracteres)',{exact:true}).fill(password)
   // Altura reduzida exercita rolagem do formulário; não simula teclado iOS físico.
   await p.setViewportSize({width:390,height:360});await p.getByRole('button',{name:'Criar conta',exact:true}).tap();await p.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor()
   const user=await(await c.request.get(origin+'/api/auth/me')).json();execFileSync('backend/.venv/bin/python',['backend/tests/browser_compat_fixture.py',user.id,'seed'],{stdio:'pipe'})
   await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Sair da conta',exact:true}).tap();await p.getByLabel('E-mail',{exact:true}).fill(email);await p.getByLabel('Senha (10 a 128 caracteres)',{exact:true}).fill(password);await p.getByRole('button',{name:'Entrar',exact:true}).tap();await p.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor();await p.setViewportSize({width:390,height:844})
  })
  await test('tres-abas-perfil-menu-historico',async()=>{
   await p.goto(origin,{waitUntil:'domcontentloaded'});await p.locator('.menu-alternar').tap();assert.deepEqual(await p.getByRole('navigation',{name:'Principal',exact:true}).locator('a').allTextContents(),['Início','Explorar','Álbum']);assert.equal(await p.locator('.menu nav .perfil-acesso').count(),0)
   await p.locator('.menu nav a[href="/?portais=1"]').tap();await p.locator('.portal-qr svg').nth(1).waitFor();assert.equal(await p.locator('.menu nav a[href="/?portais=1"]').getAttribute('aria-current'),'page')
   await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement.classList.contains('menu-alternar'));await p.keyboard.press('Space');await p.locator('#menu-principal.aberto').waitFor();await p.keyboard.press('Escape')
   await p.goto(origin+'/?conta=1',{waitUntil:'domcontentloaded'});await p.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor();await p.goto(origin+'/?album=1',{waitUntil:'domcontentloaded'});await p.getByText('1/60',{exact:true}).waitFor();await p.goBack({waitUntil:'domcontentloaded'});await p.getByText('Bem-vindo, Compatibilidade móvel.',{exact:false}).waitFor();await p.goForward({waitUntil:'domcontentloaded'});await p.getByText('1/60',{exact:true}).waitFor()
  })
  await test('dossie-nome-longo',async()=>{
   const catalog=await(await c.request.get(origin+'/api/legends')).json(),card=[...catalog].sort((a,b)=>Math.max(...b.nome.split(/\s/).map(w=>w.length))-Math.max(...a.nome.split(/\s/).map(w=>w.length)))[0]
   await p.goto(origin+'/?lendas=1',{waitUntil:'domcontentloaded'});await p.locator('.indice-busca input').fill(card.nome);await p.getByRole('button',{name:`Abrir dossiê de ${card.nome}, ${card.origem}`,exact:true}).tap();await p.locator('.dossie').waitFor();r.longName={name:card.nome,...await p.locator('.dossie').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}))};assert.ok(r.longName.scroll<=r.longName.width+1,'Nome expande o dossiê');await p.keyboard.press('Escape')
  })
  await test('album-aninhado-teclado-retorno',async()=>{
   await p.goto(origin+'/?album=1',{waitUntil:'domcontentloaded'});await p.getByText('1/60',{exact:true}).waitFor();await p.locator('[data-flipbook-control=next]').tap();const card=p.getByRole('button',{name:'Abrir carta Loira do Banheiro',exact:true});await card.tap();await p.locator('.inspecao .carta-x').focus();await p.keyboard.press('Space');assert.equal(await p.locator('.inspecao .carta-x').getAttribute('data-face'),'verso')
   await p.locator('.inspecao .cx-virador').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished))});
   r.albumGeometry=await p.locator('.grimorio').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,overflow:[...el.querySelectorAll('*')].map(n=>({name:n.className?.baseVal||n.className,r:n.getBoundingClientRect().toJSON(),position:getComputedStyle(n).position})).filter(n=>n.r.right>innerWidth+1).slice(0,12)}));
   await p.locator('.inspecao .educational-back').focus();await p.keyboard.press('End');assert.equal(await p.locator('.inspecao .carta-x').getAttribute('data-face'),'verso');await p.locator('.inspecao-fechar').focus();await p.keyboard.press('Shift+Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('.inspecao')))
   r.albumRotated=[]
   for(const[width,height]of[[568,320],[320,568],[844,390],[390,844]]){
    await p.setViewportSize({width,height});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
    r.albumRotated.push(await p.locator('.grimorio').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,modal:document.querySelector('.inspecao').getBoundingClientRect().toJSON()})))
    assert.ok(r.albumRotated.at(-1).modal.y>=-.5,'Inspeção deslocada pela rolagem do livro')
   }
   await p.keyboard.press('Escape');await p.locator('.inspecao').waitFor({state:'hidden'});await p.waitForFunction(()=>document.activeElement.matches('button.posicao.revelada'));r.closedAlbum=await p.locator('.grimorio').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));assert.ok(r.closedAlbum.scroll<=r.closedAlbum.width+1);assert.equal(await p.locator('.grimorio').evaluate(el=>el.inert),false)
   await p.keyboard.press('Escape');await p.locator('.grimorio').waitFor({state:'hidden'});await p.waitForFunction(()=>document.activeElement.classList.contains('menu-alternar'))
  })
  await test('livro-arrasto',async()=>{
   await p.goto(origin+'/?album=1',{waitUntil:'domcontentloaded'});await p.getByText('1/60',{exact:true}).waitFor();await p.locator('[data-flipbook-control=next]').tap();await p.waitForFunction(()=>document.querySelector('.grimorio-indicacao').textContent.includes('Folhas 1'))
   await p.locator('.stf__item.--shown').last().scrollIntoViewIfNeeded();const box=await p.locator('.stf__item.--shown').last().boundingBox(),start={x:box.x+box.width-8,y:box.y+box.height-8},end={x:Math.max(2,box.x-box.width/2),y:box.y+box.height-8};const before=await p.locator('.grimorio-indicacao').textContent()
   r.bookDragGeometry={box,start,end}
   await p.evaluate(()=>{window.bookInputTrace=[];const host=document.querySelector('.stf__parent');for(const type of['pointerdown','pointermove','pointerup','pointercancel'])host.addEventListener(type,event=>bookInputTrace.push({type,x:event.clientX,y:event.clientY,target:event.target.tagName,class:event.target.className,pointerType:event.pointerType}),{capture:true})})
   if(engine===chromium){const session=await c.newCDPSession(p);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});for(let step=1;step<=8;step++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*step/8,y:start.y+(end.y-start.y)*step/8}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();r.bookDrag='touch nativo CDP'}
   else{await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:8});await p.mouse.up();r.bookDrag='mouse nativo; tap das setas também validado'}
   r.bookInputTrace=await p.evaluate(()=>bookInputTrace);await p.waitForFunction(before=>document.querySelector('.grimorio-indicacao').textContent!==before,before);assert.ok(await p.locator('.stf__item.--shown').count()>0)
  })
  await test('galeria-filtros-links-fechamento',async()=>{
   await p.goto(origin+'/casa/cartas.html',{waitUntil:'domcontentloaded'});await p.locator('#mesa .carta-x').first().waitFor();assert.equal(await p.locator('#mesa .carta-x').count(),61);await p.locator('#busca-cartas').fill('Loira');assert.equal(await p.locator('#mesa .mesa-registro:visible').count(),1);await p.locator('[data-filtro=vitral]').tap();assert.equal(await p.locator('[data-filtro=vitral]').getAttribute('aria-pressed'),'true');await p.locator('[data-filtro=todas]').tap();await p.getByRole('button',{name:'AMPLIAR Loira do Banheiro',exact:true}).tap();await p.locator('#revelar .cx-toggle').tap();await p.locator('#revelar .cx-virador').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished))});await p.locator('#revelar-fechar').tap();await p.waitForFunction(()=>document.activeElement.textContent==='AMPLIAR Loira do Banheiro')
   await p.goto(origin+'/casa/cartas.html?carta=saci-perere',{waitUntil:'domcontentloaded'});await p.locator('#revelar:not([hidden])').waitFor();await p.locator('#revelar .cx-toggle').tap();await p.keyboard.press('Escape');await p.locator('#revelar').waitFor({state:'hidden'});assert.equal(await p.locator('#mesa .carta-x').count(),61)
  })
  await test('texto-longo-rolagem-flip-movimento-reduzido',async()=>{
   await p.goto(origin+'/casa/cartas.html?carta=saci-perere',{waitUntil:'domcontentloaded'});await p.locator('#revelar:not([hidden])').waitFor();await p.evaluate(async()=>{const{mountCard}=await import('/casa/js/card-view.js');const card=mountCard({id:'fixture',nome:'Texto de teste',cultura:{resumoEducativo:'Parágrafo de teste. '.repeat(600),contextoCultural:'Contexto de teste. '.repeat(100)}},{preview:true});card.classList.add('carta-grande');document.querySelector('#revelar-carta').replaceChildren(card);card.virar(true)})
   const back=p.locator('#revelar .educational-back');await back.waitFor();await p.locator('#revelar .cx-virador').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished))});await back.focus();await p.keyboard.press('PageDown');
   r.longScroll=await back.evaluate(el=>({top:el.scrollTop,height:el.clientHeight,scroll:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth}))
   if(r.longScroll.top===0){if(engine===webkit){await back.evaluate(el=>el.scrollBy(0,400));r.longScroll.method='DOM scrollBy; WebKit móvel não oferece wheel no Playwright'}else{await back.hover();await p.mouse.wheel(0,400);await p.waitForFunction(()=>document.querySelector('#revelar .educational-back').scrollTop>0);r.longScroll.method='wheel nativo'}}else r.longScroll.method='PageDown'
   r.longScroll.afterTop=await back.evaluate(el=>el.scrollTop);assert.ok(await back.evaluate(el=>el.scrollTop>0&&el.scrollWidth<=el.clientWidth+1));assert.equal(await p.locator('#revelar .carta-x').getAttribute('data-face'),'verso')
   await p.screenshot({path:`${out}/${name}-texto-longo.png`,animations:'disabled'});await p.locator('#revelar .cx-toggle').focus();await p.keyboard.press('Space');assert.equal(await p.locator('#revelar .carta-x').getAttribute('data-face'),'frente');await p.keyboard.press('Enter');assert.equal(await p.locator('#revelar .carta-x').getAttribute('data-face'),'verso')
   await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('#revelar .cx-virador').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');await p.locator('#revelar-fechar').tap();await p.emulateMedia({reducedMotion:'no-preference'})
  })
  await test('casa-gestos-foco-som-efeitos',async()=>{
   await p.goto(origin+'/casa/index.html?lua=cheia',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>globalThis.Bau?.eggs&&globalThis.Bau?.exposicao?.length===1)
   assert.equal(await p.locator('#ficha').evaluate(el=>el.inert),true)
   const old=await p.evaluate(()=>Bau.corredor.estado.alvoZ)
   const target=await p.locator('#limiar-texto').boundingBox(),x=target.x+target.width/2,y=target.y+Math.min(90,target.height/2)
   if(engine===chromium){
    const session=await c.newCDPSession(p)
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-50}]})
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach()
   }else{
    // WebKit expõe tap nativo; a sequência de swipe suplementar é DOM sintética.
    await p.evaluate(({x,y})=>{const el=document.querySelector('#limiar-texto');for(const[type,py]of[['touchstart',y],['touchend',y-50]]){const event=new Event(type,{bubbles:true});Object.defineProperty(event,type==='touchstart'?'touches':'changedTouches',{value:[{clientX:x,clientY:py,target:el}]});el.dispatchEvent(event)}},{x,y})
   }
   assert.equal(await p.evaluate(()=>Bau.corredor.estado.alvoZ),old,'Arrastar texto não pode caminhar')
   await p.locator('#nav-corredor').tap();await p.waitForFunction(()=>document.body.classList.contains('dentro'),null,{timeout:30000})
   await p.locator('#btn-prox').tap();await p.waitForFunction(()=>Bau.corredor.estado.i===1);await p.locator('#btn-ant').tap();await p.waitForFunction(()=>Bau.corredor.estado.i===0)
   await p.locator('#btn-dossie').tap();await p.locator('#btn-fechar').focus();await p.keyboard.press('Shift+Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('#dossie')));await p.keyboard.press('Escape');await p.locator('#dossie').waitFor({state:'hidden'});assert.ok(await p.locator('#btn-dossie').evaluate(el=>el===document.activeElement))
   await p.locator('#btn-som').tap();const before=await p.locator('#btn-som').getAttribute('aria-pressed');await p.locator('#btn-som').tap();assert.notEqual(await p.locator('#btn-som').getAttribute('aria-pressed'),before)
   await p.setViewportSize({width:1366,height:768});await p.locator('#planta-svg .carta-ponto').nth(1).focus();await p.keyboard.press('Space');await p.waitForFunction(()=>Bau.corredor.estado.i===1)
   const count=await p.locator('.marca-parede').count();await p.evaluate(()=>Bau.aparicoes.forcar(1));assert.ok(await p.locator('.marca-parede').count()>count)
   assert.ok(await p.evaluate(()=>{Bau.eggs.saci({clientX:100,clientY:100});return !!document.querySelector('.redemoinho')}));assert.ok(await p.locator('body').evaluate(el=>el.classList.contains('lua-cheia')))
  })
  await c.close()
  for(const [width,height,dpr]of[[320,568,2],[393,852,3]]){
   await test(`DPR-${dpr}-${width}`,async()=>{
    const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:true,hasTouch:true}),p=await c.newPage();p.setDefaultTimeout(15000);await p.goto(origin,{waitUntil:'domcontentloaded'});await p.locator('.menu-alternar').tap();await p.locator('.menu nav a[href="/?portais=1"]').tap();await p.locator('.portal-qr svg').nth(1).waitFor();assert.ok(await p.evaluate(width=>innerWidth<=width+1&&document.documentElement.scrollWidth<=width+1,width));const measured=await p.evaluate(()=>devicePixelRatio);assert.equal(measured,dpr);r.dpr.push({width,height,dpr:measured});await p.screenshot({path:`${out}/${name}-DPR-${dpr}.png`,scale:'css',animations:'disabled'});await p.keyboard.press('Escape');await c.close()
   })
  }
  await test('desktop-mouse-teclado',async()=>{
   const c=await browser.newContext({viewport:{width:1366,height:768}}),p=await c.newPage();await p.goto(origin,{waitUntil:'domcontentloaded'});await p.locator('.menu .marca').waitFor();await p.waitForFunction(()=>getComputedStyle(document.querySelector('.menu')).position==='absolute');r.desktop=await p.evaluate(()=>({width:innerWidth,media:matchMedia('(max-width:1050px)').matches,menu:getComputedStyle(document.querySelector('.menu-alternar')).display}));assert.equal(await p.locator('.menu-alternar').isVisible(),false);await p.getByRole('link',{name:'Explorar',exact:true}).click();await p.locator('.portal-qr svg').nth(1).waitFor();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement.classList.contains('marca'));await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
   await p.goto(origin+'/casa/cartas.html?carta=saci-perere',{waitUntil:'domcontentloaded'});await p.locator('#revelar:not([hidden])').waitFor();
   await p.evaluate(async()=>{const{mountCard}=await import('/casa/js/card-view.js');const card=mountCard({id:'scroll-test',nome:'Teste de rolagem',cultura:{resumoEducativo:'Texto de teste. '.repeat(600)}},{preview:true});card.classList.add('carta-grande');document.querySelector('#revelar-carta').replaceChildren(card);card.virar(true)});
   await p.locator('#revelar .cx-virador').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished))});
   await p.locator('#revelar .educational-back').hover();await p.mouse.wheel(0,400);await p.waitForFunction(()=>document.querySelector('#revelar .educational-back').scrollTop>0);r.desktop.nativeReadingScroll=true;await c.close()
  })
 }catch(e){r.fatal=e.message}finally{await browser.close();await writeFile(`${out}/report.json`,JSON.stringify(results,null,2))}
}
if(results.some(r=>r.fatal||r.checks.some(c=>c.status==='REPROVADO')))process.exitCode=1
