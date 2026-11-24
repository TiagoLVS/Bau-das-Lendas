import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

function release(model) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  model.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const material of(Array.isArray(object.material)?object.material:[object.material]))if(material){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value)}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());model.removeFromParent();
}
export function createChestController(gltf,parent) {
  const model=gltf.scene;
  for(const name of['Idle','OpenChest','CloseChest'])if(!gltf.animations.some(c=>c.name===name)){release(model);throw Error(`Animação ausente: ${name}`)}
  model.scale.setScalar(.52);model.position.y=-.23;
  const mixer=new THREE.AnimationMixer(model);
  const actions=Object.fromEntries(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  let current=null,disposed=false;
  function play(name){
    if(disposed) return;
    if(!actions[name])throw Error(`Animação ausente: ${name}`);
    if(current===name)return;
    mixer.stopAllAction();current=name;
    const action=actions[name];action.reset().setLoop(name==='Idle'?THREE.LoopRepeat:THREE.LoopOnce,name==='Idle'?Infinity:1);action.clampWhenFinished=true;action.play();mixer.update(0);
  }
  play('Idle');parent.add(model);
  return {play,isRunning:name=>!disposed&&current===name&&actions[name].isRunning(),duration:name=>actions[name]?.getClip().duration,
    update(delta){if(!disposed&&Number.isFinite(delta)&&delta>=0)mixer.update(delta)},
    dispose(){if(disposed)return;disposed=true;mixer.stopAllAction();mixer.uncacheRoot(model);release(model)} };
}
export async function loadChest(parent,{signal,timeout=30000}={}) {
  const controller=new AbortController(),abort=()=>controller.abort();
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeout);
  try{
    const response=await fetch('/models/bau-das-lendas.glb',{signal:controller.signal});
    if(!response.ok)throw Error(`GLB indisponível (${response.status})`);
    const buffer=await response.arrayBuffer();const gltf=await new GLTFLoader().parseAsync(buffer,'/models/');
    if(controller.signal.aborted){release(gltf.scene);throw new DOMException('Carregamento do baú interrompido.','AbortError')}
    return createChestController(gltf,parent);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
