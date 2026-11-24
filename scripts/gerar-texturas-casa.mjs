// Pré-calcula as mesmas texturas procedurais, sem mudar dimensões ou JPEG original.
import {chromium} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
const origin=process.env.BAU_TEST_ORIGIN
if(origin!=='http://localhost:5175')throw Error('Use somente o servidor local de desenvolvimento/teste na porta 5175.')
const env={...process.env};for(const key of ['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[key]?.includes('/snap/'))delete env[key]
const browser=await chromium.launch({headless:true,env,args:['--no-sandbox']})
const out='public/casa/img/cenario/texturas';await mkdir(out,{recursive:true})
try{
 const p=await browser.newPage()
 await p.route(origin+'/gerar-texturas-local.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="pt-BR"><title>Geração local</title></html>'}))
 await p.goto(origin+'/gerar-texturas-local.html');await p.addScriptTag({url:origin+'/casa/js/texturas.js'})
 const data=await p.evaluate(async()=>{
  const source=Bau.texturas.originais||Bau.texturas,result={}
  result['assoalho.jpg']=source.chao();result['lambri.jpg']=source.lambri()
  for(const tipo of ['saguao','brasil','japao','china','india','filipinas'])result[`parede-${tipo}.jpg`]=source.estampa(tipo)
  const image=new Image();image.src='/casa/img/cenario/grao.svg';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;canvas.getContext('2d').drawImage(image,0,0);result['grao.png']=canvas.toDataURL('image/png');
  return result
 })
 const report=[]
 for(const[name,url]of Object.entries(data)){
  if(!/^data:image\/(jpeg|png);base64,/.test(url))throw Error('Formato procedural inesperado')
  const bytes=Buffer.from(url.split(',')[1],'base64');await writeFile(`${out}/${name}`,bytes)
  report.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
 }
 await writeFile('tests/artifacts/etapa11/textures-generated.json',JSON.stringify(report,null,2))
 console.log('Texturas originais pré-calculadas:',report.reduce((s,r)=>s+r.bytes,0),'bytes')
}finally{await browser.close()}
