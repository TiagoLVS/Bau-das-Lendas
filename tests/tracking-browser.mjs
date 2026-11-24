import assert from 'node:assert/strict'
import {chromium,webkit} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
const origin=process.env.BAU_TEST_ORIGIN;if(origin!=='http://localhost:5175'||process.env.BAU_TEST_DATABASE!=='bau_test')throw Error('Somente bau_test')
const results=[]
for(const[name,engine]of[['Chromium',chromium],['WebKit',webkit]]){
 const env={...process.env};for(const k of['GTK_PATH','GTK_EXE_PREFIX','GIO_MODULE_DIR','GIO_EXTRA_MODULES','GI_TYPELIB_PATH'])if(env[k]?.includes('/snap/'))delete env[k]
 const b=await engine.launch({headless:true,env,args:engine===chromium?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']:[]});const r={engine:name,version:b.version()};results.push(r)
 try{const p=await b.newPage({viewport:{width:390,height:844}});p.setDefaultTimeout(15000);await p.goto(origin+'/?portais=1',{waitUntil:'domcontentloaded'});await p.locator('.portal-qr svg').nth(1).waitFor();const codes=await p.locator('.portal-qr svg').evaluateAll(svgs=>svgs.map(s=>'data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(s))))
 await p.goto(origin+'/ra.html',{waitUntil:'domcontentloaded'});
 r.corpus=await p.evaluate(async codes=>{const THREE=await import('three'),{estimateQrPose,isRitualQr}=await import('/qr-pose.js');const images=await Promise.all(codes.map(async src=>{const image=new Image();image.src=src;await image.decode();return image}));const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d',{willReadFrequently:true});const decoded=[];
 function paint(id=1,x=180,y=100,size=280){ctx.fillStyle='#aaa';ctx.fillRect(0,0,640,480);ctx.drawImage(images[id],x,y,size,size)}
 function sample(name){const input=ctx.getImageData(0,0,640,480),start=performance.now(),qr=jsQR(input.data,640,480,{inversionAttempts:'dontInvert'});const ms=performance.now()-start;let pose=null;if(qr&&isRitualQr(qr.data,location.origin)){const l=qr.location;pose=estimateQrPose([l.topLeftCorner,l.topRightCorner,l.bottomRightCorner,l.bottomLeftCorner],640,480)}decoded.push({name,decoded:qr?.data??null,accepted:!!pose,ms,corners:qr?.location??null,pose});return pose}
 paint();sample('central');paint(1,0,120,240);sample('edge');paint(1,300,220,40);sample('small');paint(1,100,20,440);sample('large');paint(1,-120,100,300);sample('partial');paint();ctx.save();ctx.fillStyle='#aaa';ctx.fillRect(0,0,640,480);ctx.translate(320,240);ctx.rotate(.45);ctx.drawImage(images[1],-140,-140,280,280);ctx.restore();sample('rotated');
 // Homografia de uma imagem sintética para cantos projetados por câmera pinhole.
 const camera=new THREE.PerspectiveCamera(60,640/480,.01,100),matrix=new THREE.Matrix4().compose(new THREE.Vector3(0,0,-2.8),new THREE.Quaternion().setFromEuler(new THREE.Euler(.5,-.4,.2)),new THREE.Vector3(1,1,1));camera.updateMatrixWorld();const q=[[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]].map(([x,y])=>{const p=new THREE.Vector3(x,y,0).applyMatrix4(matrix).project(camera);return{x:(p.x+1)*320,y:(1-p.y)*240}});const[x0,x1,x2,x3]=q.map(p=>p.x),[y0,y1,y2,y3]=q.map(p=>p.y),dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,d=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/d,h=(dx1*dy3-dx3*dy1)/d;const inverse=new THREE.Matrix3().set(x1-x0+g*x1,x3-x0+h*x3,x0,y1-y0+g*y1,y3-y0+h*y3,y0,g,h,1).invert();const src=document.createElement('canvas');src.width=src.height=400;src.getContext('2d').drawImage(images[1],0,0,400,400);const pixels=src.getContext('2d').getImageData(0,0,400,400).data;ctx.fillStyle='#aaa';ctx.fillRect(0,0,640,480);const frame=ctx.getImageData(0,0,640,480);for(let y=0;y<480;y++)for(let x=0;x<640;x++){const uv=new THREE.Vector3(x,y,1).applyMatrix3(inverse),u=uv.x/uv.z,v=uv.y/uv.z;if(u>=0&&u<1&&v>=0&&v<1){const from=(Math.floor(v*400)*400+Math.floor(u*400))*4,to=(y*640+x)*4;frame.data.set(pixels.subarray(from,from+4),to)}}ctx.putImageData(frame,0,0);sample('perspective');
 paint();const copy=document.createElement('canvas');copy.width=640;copy.height=480;copy.getContext('2d').drawImage(canvas,0,0);ctx.filter='blur(4px)';ctx.drawImage(copy,0,0);ctx.filter='none';sample('blurred');paint();ctx.fillStyle='#000b';ctx.fillRect(0,0,640,480);sample('dim');paint();ctx.fillStyle='#888e';ctx.fillRect(0,0,640,480);sample('low-contrast');paint(0);sample('wrong');ctx.fillStyle='#aaa';ctx.fillRect(0,0,640,480);sample('none');paint(0,10,100,240);ctx.drawImage(images[1],380,100,240,240);sample('multiple');window.syntheticFrame=canvas.toDataURL();return decoded},codes)
 for(const label of['central','edge','large','rotated','perspective'])assert.ok(r.corpus.find(x=>x.name===label).accepted,label)
 for(const label of['wrong','none','partial'])assert.equal(r.corpus.find(x=>x.name===label).accepted,false,label)
 r.performance=await p.evaluate(async code=>{
   const img=new Image();img.src=code;await img.decode();const c=document.createElement('canvas');c.width=720;c.height=405;const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#aaa';x.fillRect(0,0,720,405);x.drawImage(img,220,62,280,280);
   const frame=x.getImageData(0,0,720,405),times=[];
   for(let i=0;i<21;i++){const start=performance.now(),qr=jsQR(frame.data,720,405,{inversionAttempts:'dontInvert'});if(!qr)throw Error('Benchmark perdeu QR');if(i)times.push(performance.now()-start)}
   times.sort((a,b)=>a-b);return{width:720,height:405,samples:times.length,medianMs:times[10],p95Ms:times[18],minMs:times[0],maxMs:times.at(-1),pixelBufferBytes:frame.data.byteLength};
 },codes[1])
 r.tracking=await p.evaluate(async codes=>{
  const T=await import('three'),{QRTrackerThree}=await import('/qr-tracker.js');
  const images=await Promise.all(codes.map(async src=>{const img=new Image();img.src=src;await img.decode();return img}));
  const input=document.createElement('canvas');input.width=640;input.height=480;const ctx=input.getContext('2d');
  const container=document.createElement('div');container.style.cssText='position:fixed;inset:0;pointer-events:none';document.body.append(container);
  const tracker=new QRTrackerThree({container});
  Object.defineProperties(tracker.video,{videoWidth:{value:640},videoHeight:{value:480}});
  // Entrada determinística no canvas; o jsQR, homografia, grupo e renderer são reais.
  const draw=tracker.context.drawImage.bind(tracker.context);
  tracker.context.drawImage=(_video,...args)=>draw(input,...args);
  const states=[],events=[];tracker.anchor.onTargetFound=()=>events.push('found');tracker.anchor.onTargetLost=()=>events.push('lost');
  function paint(id=1,x=180,size=280,angle=0){ctx.fillStyle='#aaa';ctx.fillRect(0,0,640,480);if(id>=0){ctx.save();ctx.translate(x+size/2,240);ctx.rotate(angle);ctx.drawImage(images[id],-size/2,-size/2,size,size);ctx.restore()}}
  function step(name,time){tracker.scanFrame(time);const g=tracker.anchor.group;states.push({name,time,found:tracker.found,position:g.position.toArray(),quaternion:g.quaternion.toArray(),scale:g.scale.toArray()})}
  paint();step('first-hit',100);step('acquired',200);step('stationary',300);
  paint(1,190);step('slow',400);paint(1,200);step('slow-2',500);paint(1,230,300,.25);step('fast-rotated',600);
  paint(1,140,360);step('closer',700);paint(-1);step('brief-loss',900);step('lost',1100);
  paint();step('return-first',1200);step('returned',1300);paint(0);step('wrong-replaces',1800);
  const projection=[];
  for(const [width,height]of[[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[568,320],[844,390]]){
   container.style.width=width+'px';container.style.height=height+'px';tracker.resize();
   const camera=tracker.camera,point=new T.Vector3(0,0,-3).project(camera);projection.push({width,height,aspect:camera.aspect,fov:camera.fov,center:point.toArray(),canvas:tracker.renderer.domElement.getBoundingClientRect().toJSON()});
  }
  tracker.dispose();container.remove();return{states,events,projection};
 },codes)
 const state=label=>r.tracking.states.find(s=>s.name===label)
 assert.equal(state('first-hit').found,false);assert.equal(state('acquired').found,true)
 assert.ok(state('acquired').position.every((n,i)=>Math.abs(n-state('stationary').position[i])<1e-12))
 assert.ok(state('slow').position[0]>state('stationary').position[0]);assert.ok(state('fast-rotated').position[0]>state('slow').position[0])
 assert.ok(Math.abs(state('fast-rotated').quaternion[2])>.01)
 assert.ok(Math.abs(state('closer').position[2])<Math.abs(state('stationary').position[2]))
 for(const label of['brief-loss','returned'])assert.equal(state(label).found,true)
 for(const label of['lost','return-first','wrong-replaces'])assert.equal(state(label).found,false)
 assert.deepEqual(r.tracking.events,['found','lost','found','lost'])
 for(const state of r.tracking.states){assert.deepEqual(state.scale,[1,1,1]);assert.ok(state.position.every(Number.isFinite))}
 for(const v of r.tracking.projection){assert.ok(Math.abs(v.aspect-v.width/v.height)<1e-9);assert.ok(Math.abs(v.canvas.width-v.width)<1);assert.ok(Math.abs(v.center[0])<1e-9)}
 r.status='APROVADO'
 }catch(e){r.status='REPROVADO';r.reason=e.message}finally{await b.close();await writeFile(`${process.env.BAU_TRACKING_OUT||'tests/artifacts/etapa09'}/browser.json`,JSON.stringify(results,null,2));console.log(name,r.status,r.reason??'')}
}
if(results.some(r=>r.status!=='APROVADO'))process.exitCode=1
