import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import * as Three from 'three'
import { estimateQrPose, isRitualQr } from '../public/qr-pose.js'

async function trackerFixture({ secure = true, denied = false, deferred = false, videoReady = true, unavailable = false } = {}) {
  let scheduled;const track=new EventTarget();track.stop=()=>stopped++;
  let decoded = null, stopped = 0, requests = 0, decodes = 0, release;const gate=new Promise(resolve=>release=resolve)
  const video = Object.assign(new EventTarget(), { videoWidth: 1280, videoHeight: 720, readyState: videoReady?2:0, currentTime:0, setAttribute() {},
    async play() {}, pause() {} })
  class Renderer {
    setPixelRatio() {} setClearColor() {} setSize() {} setAnimationLoop() {} dispose() {}
  }
  const context = { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }) }
  const document = { hidden: false, addEventListener() {}, removeEventListener() {},
    createElement: type => type === 'video' ? video : { getContext: () => context } }
  const sandbox = vm.createContext({ setTimeout,clearTimeout,DOMException, THREE: { ...Three, WebGLRenderer: Renderer }, estimateQrPose, isRitualQr,
    document, devicePixelRatio: 1, requestAnimationFrame(fn) { scheduled=fn;return 1 }, cancelAnimationFrame() {},
    window: { isSecureContext: secure, location: { origin: 'http://localhost:5175' }, addEventListener() {}, removeEventListener() {} },
    navigator: { mediaDevices: unavailable ? undefined : { async getUserMedia() {
      requests++;if(deferred)await gate
      if (denied) { const error = new Error('negada'); error.name = typeof denied === 'string' ? denied : 'NotAllowedError'; throw error }
      return { getTracks: () => [track] }
    } } },
  })
  const source = (await readFile('public/qr-tracker.js', 'utf8')).replace(/^import .*;\r?\n/gm, '').replace('export class', 'class')
  vm.runInContext(`${source}\nglobalThis.Tracker = QRTrackerThree`, sandbox)
  const tracker = new sandbox.Tracker({ container: { append() {}, replaceChildren() {}, getBoundingClientRect: () => ({ width: 390, height: 844 }) }, decoder: () => { decodes++; return decoded } })
  return { tracker, video, document,release,track,tick:time=>scheduled(time), counts: () => ({ stopped, requests, decodes }),
    qr(value, corners) { decoded = value ? { data: value, location: corners || {
      topLeftCorner: { x: 235, y: 95 }, topRightCorner: { x: 485, y: 95 },
      bottomRightCorner: { x: 485, y: 310 }, bottomLeftCorner: { x: 235, y: 310 },
    } } : null } }
}

test('câmera exige contexto seguro, trata negação e libera o stream', async () => {
  const insecure = await trackerFixture({ secure: false })
  await assert.rejects(insecure.tracker.start(), /HTTPS/)
  assert.equal(insecure.counts().requests, 0)
  const denied = await trackerFixture({ denied: true })
  await assert.rejects(denied.tracker.start(), { name: 'NotAllowedError' })
  assert.equal(denied.tracker.running, false)
  const allowed = await trackerFixture()
  await allowed.tracker.start()
  assert.equal(allowed.tracker.running, true)
  allowed.tracker.dispose()
  assert.equal(allowed.counts().stopped, 1)
  assert.equal(allowed.video.srcObject, null)
})

test('rastreador rejeita outro QR, tolera perda breve e exige reenquadramento', async () => {
  const f = await trackerFixture()
  let found = 0, lost = 0
  f.tracker.anchor.onTargetFound = () => found++
  f.tracker.anchor.onTargetLost = () => lost++
  f.qr('http://localhost:5175/')
  f.tracker.scanFrame(100); f.tracker.scanFrame(200)
  assert.equal(found, 0)
  f.qr('http://localhost:5175/ra.html')
  f.tracker.scanFrame(300); f.tracker.scanFrame(400)
  assert.equal(found, 1)
  assert.equal(f.tracker.anchor.group.visible, true)
  assert.ok(f.tracker.anchor.group.position.z < 0)
  assert.ok(f.tracker.anchor.group.position.toArray().every(Number.isFinite))
  f.qr(null); f.tracker.scanFrame(600)
  assert.equal(lost, 0)
  f.tracker.scanFrame(800)
  assert.equal(lost, 1)
  assert.equal(f.tracker.anchor.group.visible, false)
  f.qr('http://localhost:5175/ra.html')
  f.tracker.scanFrame(900); f.tracker.scanFrame(1000)
  assert.equal(found, 2)
  f.document.hidden = true; f.tracker.onVisibility()
  assert.equal(lost, 2)
})

test('stream tardio após dispose é encerrado; início duplo compartilha permissão',async()=>{const f=await trackerFixture({deferred:true});const a=f.tracker.start(),b=f.tracker.start();assert.equal(f.counts().requests,1);f.tracker.dispose();f.release();await assert.rejects(a,{name:'AbortError'});await assert.rejects(b,{name:'AbortError'});assert.equal(f.counts().stopped,1);assert.equal(f.tracker.running,false);assert.equal(f.video.srcObject,null);f.tracker.dispose();assert.equal(f.counts().stopped,1)})
test('vídeo sem quadros tem prazo e permite nova tentativa',async()=>{const f=await trackerFixture({videoReady:false});f.tracker.frameTimeout=1;await assert.rejects(f.tracker.start(),{name:'CameraFramesError'});assert.equal(f.counts().stopped,1);f.video.readyState=2;await f.tracker.start();assert.equal(f.counts().requests,2);f.tracker.dispose()})
test('track encerrado oculta marcador, informa falha e libera tentativa',async()=>{const f=await trackerFixture();let error;f.tracker.onError=e=>error=e;await f.tracker.start();f.qr('http://localhost:5175/ra.html');f.tracker.scanFrame(100);f.tracker.scanFrame(200);f.track.dispatchEvent(new Event('ended'));assert.equal(f.tracker.running,false);assert.equal(f.tracker.found,false);assert.equal(error.name,'NotReadableError');await f.tracker.start();assert.equal(f.counts().requests,2);f.tracker.dispose()})
test('quadros congelados não mantêm reconhecimento e não geram decodificações indefinidas',async()=>{const f=await trackerFixture();let error;f.tracker.onError=e=>error=e;await f.tracker.start();f.qr('http://localhost:5175/ra.html');f.tick(100);f.video.currentTime=.1;f.tick(200);assert.equal(f.tracker.found,true);f.tick(600);assert.equal(f.tracker.found,false);f.tick(2201);assert.equal(f.tracker.running,false);assert.equal(error.name,'CameraFramesError');f.tracker.dispose()})

test('API ausente e erros distintos não iniciam loops nem impedem descarte', async () => {
  const missing = await trackerFixture({unavailable:true});
  await assert.rejects(missing.tracker.start(), {name:'NotSupportedError'});
  assert.equal(missing.counts().requests,0);
  for(const name of ['NotFoundError','NotReadableError','OverconstrainedError']) {
    const f=await trackerFixture({denied:name});
    await assert.rejects(f.tracker.start(),{name});
    assert.equal(f.tracker.running,false);assert.equal(f.video.srcObject,null);f.tracker.dispose();
  }
});

test('suavização tem a mesma resposta por tempo, preserva pose parada e converge após salto',async()=>{
  async function sequence(step){
    const f=await trackerFixture();f.qr('http://localhost:5175/ra.html');
    f.tracker.scanFrame(100);f.tracker.scanFrame(200);
    const origin=f.tracker.anchor.group.position.clone();
    f.tracker.scanFrame(300);assert.ok(origin.distanceTo(f.tracker.anchor.group.position)<1e-12);
    const corners={topLeftCorner:{x:275,y:95},topRightCorner:{x:525,y:95},bottomRightCorner:{x:525,y:310},bottomLeftCorner:{x:275,y:310}};
    f.qr('http://localhost:5175/ra.html',corners);
    for(let t=300+step;t<=700;t+=step)f.tracker.scanFrame(t);
    const position=f.tracker.anchor.group.position.clone(),rotation=f.tracker.anchor.group.quaternion.clone();
    assert.ok(position.x>origin.x);assert.deepEqual(f.tracker.anchor.group.scale.toArray(),[1,1,1]);
    f.tracker.dispose();return {position,rotation};
  }
  const fast=await sequence(100),slow=await sequence(200);
  assert.ok(fast.position.distanceTo(slow.position)<1e-10);
  assert.ok(fast.rotation.angleTo(slow.rotation)<1e-6);
});

test('projeção preserva cover e escala nos nove tamanhos com vídeo retrato/paisagem',async()=>{
  const f=await trackerFixture();
  for(const [vw,vh]of[[1280,720],[720,1280]])for(const [w,h]of[[320,568],[360,800],[375,667],[390,844],[393,852],[412,915],[430,932],[568,320],[844,390]]){
    f.tracker.container.getBoundingClientRect=()=>({width:w,height:h});f.video.videoWidth=vw;f.video.videoHeight=vh;
    f.video.dispatchEvent(new Event('resize'));
    const factor=Math.min(1,720/Math.max(vw,vh)),sw=Math.round(vw*factor),sh=Math.round(vh*factor);
    const size=Math.min(sw,sh)*.3,cx=sw/2,cy=sh/2;
    const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:cx+x*size/2,y:cy+y*size/2}));
    const matrix=new Three.Matrix4().fromArray(estimateQrPose(corners,sw,sh));
    const points=[[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]];
    points.forEach(([x,y],i)=>{
      const ndc=new Three.Vector3(x,y,0).applyMatrix4(matrix).project(f.tracker.camera);
      const cover=Math.max(w/sw,h/sh),expectedX=(corners[i].x-sw/2)*cover+w/2,expectedY=(corners[i].y-sh/2)*cover+h/2;
      assert.ok(Math.abs((ndc.x+1)*w/2-expectedX)<1e-6);
      assert.ok(Math.abs((1-ndc.y)*h/2-expectedY)<1e-6);
    });
  }
  f.tracker.dispose();
});

test('aba oculta pausa análises; quadro repetido não é decodificado; retorno exige dois acertos',async()=>{
  const f=await trackerFixture();await f.tracker.start();f.qr('http://localhost:5175/ra.html');
  f.tick(100);f.tick(200);f.tick(300);assert.equal(f.counts().decodes,1);assert.equal(f.tracker.found,false);
  f.video.currentTime=.1;f.tick(310);assert.equal(f.tracker.found,true);
  f.document.hidden=true;f.tracker.onVisibility();f.tick(1000);assert.equal(f.counts().decodes,2);assert.equal(f.tracker.found,false);
  f.document.hidden=false;f.tracker.onVisibility();f.video.currentTime=.2;f.tick(1100);assert.equal(f.tracker.found,false);
  f.video.currentTime=.3;f.tick(1200);assert.equal(f.tracker.found,true);f.tracker.dispose();
});

test('saída cancela video.play pendente e descarta o stream uma única vez',async()=>{
  const f=await trackerFixture();f.video.play=()=>new Promise(()=>{});
  const pending=f.tracker.start();await new Promise(resolve=>setImmediate(resolve));
  f.tracker.dispose();await assert.rejects(pending,{name:'AbortError'});
  assert.equal(f.counts().stopped,1);assert.equal(f.video.srcObject,null);assert.equal(f.tracker.running,false);
});
