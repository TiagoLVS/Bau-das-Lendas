// Exploração normal (sem ?apresentacao/?demonstracao): quando a 1ª manifestação começa
// depois de entrar na casa. Nada é forçado; apenas observa Bau.manifestacoes.inspecionar().
import { webkit } from '@playwright/test'
import { createServer } from 'node:http'; import { readFile, writeFile } from 'node:fs/promises'; import { join, extname } from 'node:path'
const [dist, saida] = process.argv.slice(2)
const T={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.png':'image/png'}
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/api/')){r.writeHead(401);return r.end('{}')}try{const f=join(dist,u);const d=await readFile(f);r.writeHead(200,{'content-type':T[extname(f)]||'application/octet-stream'});r.end(d)}catch{r.writeHead(404);r.end()}})
await new Promise(r=>s.listen(0,r))
const env={...process.env};for(const k of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
const b=await webkit.launch({env}); const res={}
for(const caminho of ['entrar-direto','caminhando-pelo-jardim','demonstracao']){
 const p=await b.newPage({viewport:{width:1366,height:768}})
 await p.goto(`http://localhost:${s.address().port}/casa/index.html${caminho==='demonstracao'?'?apresentacao=1&demonstracao=1':''}`);await p.waitForFunction(()=>window.Bau?.manifestacoes&&Bau.corredor?.kit?.chao,null,{timeout:30000});await p.waitForTimeout(1500)
 const antesDeEntrar=await p.evaluate(()=>Bau.manifestacoes.inspecionar().ativo)
 if(caminho!=='caminhando-pelo-jardim')await p.locator('#nav-corredor').click()
 else{await p.mouse.move(683,400);for(let i=0;i<40&&!(await p.evaluate(()=>Bau.corredor.estado.dentro));i++){await p.mouse.wheel(0,200);await p.waitForTimeout(250)}}
 const r=await p.evaluate(()=>new Promise(res=>{const t0=performance.now();const linha=[];const id=setInterval(()=>{const e=Bau.corredor.estado,i=Bau.manifestacoes.inspecionar();linha.push({t:+((performance.now()-t0)/1000).toFixed(1),dentro:e.dentro,registro:e.i+1,ativo:i.ativo});if(performance.now()-t0>14000){clearInterval(id);res(linha)}},200)}))
 const primeira=r.find(x=>x.ativo); res[caminho]={antesDeEntrar,primeiraManifestacao:primeira?{segundos:primeira.t,id:primeira.ativo,registro:primeira.registro}:null,registroAoEntrar:r.find(x=>x.dentro)?.registro,simultaneas:Math.max(0,...r.map(x=>x.ativo?1:0))}
 console.log(caminho,JSON.stringify(res[caminho]));await p.close()}
await writeFile(saida,JSON.stringify(res,null,2));await b.close();s.close()

// As outras quatro manifestações continuam na exploração normal: visita o registro de cada
// uma pela navegação pública da casa (mesma dos botões ‹ ›) e espera o gatilho natural.
{ const s2=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/api/')){r.writeHead(401);return r.end('{}')}try{const f=join(dist,u);const d=await readFile(f);r.writeHead(200,{'content-type':T[extname(f)]||'application/octet-stream'});r.end(d)}catch{r.writeHead(404);r.end()}})
  await new Promise(r=>s2.listen(0,r)); const b2=await webkit.launch({env}); const vistas={}
  const p=await b2.newPage({viewport:{width:1366,height:768}})
  await p.goto(`http://localhost:${s2.address().port}/casa/index.html`);await p.waitForFunction(()=>window.Bau?.manifestacoes&&Bau.corredor?.kit?.chao,null,{timeout:30000})
  await p.locator('#nav-corredor').click();await p.waitForFunction(()=>Bau.corredor.estado.dentro)
  const alvos=await p.evaluate(()=>[['lobo','peter-stumpp'],['alta','hachishakusama'],['boitata','boitata'],['saci',null]].map(([id,l])=>[id,l?Bau.lendas.findIndex(x=>x.id===l):31]))
  for(const [id,i] of alvos){await p.evaluate(i=>Bau.corredor.irPara(i),i);const viu=await p.evaluate(id=>new Promise(r=>{const t=setInterval(()=>{if(Bau.manifestacoes.inspecionar().ativo===id){clearInterval(t);r(true)}},100);setTimeout(()=>{clearInterval(t);r(false)},20000)}),id);vistas[id]=viu;await p.waitForTimeout(9000)}
  console.log('outras manifestações (modo normal):',JSON.stringify(vistas)); await b2.close(); s2.close()
  if(Object.values(vistas).some(v=>!v))process.exitCode=1 }
