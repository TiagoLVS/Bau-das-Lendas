import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { estimateQrPose, isRitualQr } from '../public/qr-pose.js'

for (const [name, rotation, translation] of [
  ['frontal', [0,0,0], [0,0,-3]],
  ['inclinado e deslocado', [.3,-.4,.15], [.2,-.1,-4]],
  ['girado', [-.3,.2,.8], [-.4,.3,-5]],
]) {
  test(`pose do QR ${name} reprojeta os quatro cantos`, () => {
    const width=960, height=720;
    const camera=new THREE.PerspectiveCamera(60,width/height,.01,150);
    camera.updateMatrixWorld();
    const expected=new THREE.Matrix4().compose(new THREE.Vector3(...translation),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(1,1,1));
    const corners=[[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]].map(([x,y]) => {
      const point=new THREE.Vector3(x,y,0).applyMatrix4(expected).project(camera);
      return {x:(point.x+1)*width/2,y:(1-point.y)*height/2};
    });
    const actual=estimateQrPose(corners,width,height);
    assert.ok(actual);
    expected.elements.forEach((value,index) => assert.ok(Math.abs(value-actual[index])<1e-6, `elemento ${index}`));
  });
}

test('pose rejeita quadriláteros degenerados e coordenadas inválidas', () => {
  assert.equal(estimateQrPose(Array(4).fill({x:100,y:100}),640,480),null);
  assert.equal(estimateQrPose([{x:NaN,y:1},{x:2,y:1},{x:2,y:2},{x:1,y:2}],640,480),null);
  assert.equal(estimateQrPose([],640,480),null);
});

test('somente QR 02 da mesma origem pode posicionar o baú', () => {
  const origin='https://bau.example';
  assert.ok(isRitualQr(`${origin}/ra.html`,origin));
  for (const value of [`${origin}/`,`${origin}/ra.html?lenda=kiyohime`,'https://evil.example/ra.html','javascript:alert(1)','ilegivel'])
    assert.equal(isRitualQr(value,origin),false);
});
test('pose rejeita dimensões/FOV não finitos e cantos fora do quadro',()=>{const q=[{x:200,y:100},{x:400,y:100},{x:400,y:300},{x:200,y:300}];for(const [w,h,f]of[[Infinity,480,60],[640,NaN,60],[640,480,NaN],[640,480,0],[640,480,180]])assert.equal(estimateQrPose(q,w,h,f),null);assert.equal(estimateQrPose(q.map(p=>({x:p.x-300,y:p.y})),640,480),null)})
test('QRs incompletos, cruzados e falsos destinos não são equivalentes',()=>{assert.equal(estimateQrPose([{x:100,y:100},{x:300,y:300},{x:300,y:100},{x:100,y:300}],640,480),null);for(const suffix of['/','/ra.html/','/ra.html#','/ra.html?','/ra.html?x=1','/RA.html','/%72a.html'])assert.equal(isRitualQr('https://bau.example'+suffix,'https://bau.example'),false);assert.equal(isRitualQr('https://bau.example:443/ra.html','https://bau.example'),true)})
