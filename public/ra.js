import { containDialogFocus } from '/dialog-focus.js';
import { educationalBack, enrichEducationalLegend } from '/educational-card.js';
import * as THREE from 'three';
import { QRTrackerThree } from '/qr-tracker.js';
import { watchReward } from '/reward-clock.js';
import { loadChest } from '/chest-model.js';
import { api } from '/api.js';
import { legendImages } from '/legend-images.js';

const $ = (selector) => document.querySelector(selector);
const STATUS = $('#status');
// Estado apenas visual da câmera (CSS); não participa da lógica de rastreio ou recompensa.
const marcarCamera = estado => { const corpo = document.body; if (corpo?.dataset) corpo.dataset.camera = estado; };
const faceA = $('#faceA');
const faceB = $('#faceB');
const flipLabels = ['FRENTE · ILUSTRAÇÃO', 'VERSO · SOBRE A LENDA'];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}
function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function easeOutCubic(t) { return 1 - Math.pow(1 - clamp01(t), 3); }
function setFace(element, entry, stage) {
  element.replaceChildren();element.inert=false;
  if(stage===1){const back=educationalBack(entry);back.tabIndex=0;element.append(back);return}
  if(entry.imagem){const img=document.createElement('img');img.src=entry.imagem;img.alt=`Carta ilustrada de ${entry.nome}`;img.style.cssText='width:100%;height:100%;object-fit:contain';img.onerror=()=>{const p=document.createElement('p');p.textContent=`${entry.nome} — Arte ainda não fornecida`;img.replaceWith(p)};element.append(img)}
  else {const p=document.createElement('p');p.textContent=`${entry.nome} — Arte ainda não fornecida`;element.append(p)}
}
function drawCanvasCard(ctx, item) {
  ctx.clearRect(0,0,512,724);
  const grad = ctx.createLinearGradient(0,0,0,724);
  grad.addColorStop(0,'#24141b'); grad.addColorStop(1,'#090b10');
  ctx.fillStyle=grad;ctx.fillRect(0,0,512,724);
  ctx.strokeStyle='#a56a70';ctx.lineWidth=12;ctx.strokeRect(18,18,476,688);
  ctx.strokeStyle='#5e4248';ctx.lineWidth=3;ctx.strokeRect(37,37,438,650);
  ctx.fillStyle='#c7ada7';ctx.font='23px Georgia';ctx.textAlign='center';
  ctx.fillText('BAÚ DAS LENDAS',256,105);
  ctx.fillStyle='#a05b61';ctx.font='165px Georgia';ctx.fillText('✦',256,334);
  ctx.fillStyle='#eadcd5';ctx.font='bold 34px Georgia';
  const words=item.nome.toUpperCase().split(/\s+/);
  const lines=[''];
  for (const word of words) {
    const last=lines.length-1;
    const test=(lines[last]+' '+word).trim();
    if (ctx.measureText(test).width>425 && lines[last]) lines.push(word);
    else lines[last]=test;
  }
  lines.slice(0,3).forEach((line,index)=>ctx.fillText(line,256,478+index*49));
  ctx.font='20px Georgia';ctx.fillStyle='#caa5a0';
  ctx.fillText(`${String(item.numero).padStart(3,'0')} / 060`,256,650);
}

async function startExperience() {
  let progress = { total: 60, obtained: 0, complete: false };
  let accountReady = false, accountError = null, accountVersion = 0;
  let pendingStorage = null;
  let openingKey = null;
  let rewardClock = null, daily = null, dailyText = 'Consultando recompensa…', rewardKind = null;

  let disposed=false,starting=false;const modelAbort=new AbortController();
  let current=null, phase='idle', detected=false, started=false;
  let cameraMessage='';
  let freshScanRequired=false, hasSeenTargetAway=false, openingAt=0;
  let flipStage=0, flipTurns=0;
  let releaseRewardFocus=null;
  const rotor=$('#cardRotor'), reward=$('#rewardOverlay'), stage=$('#cardStage');
  const startButton=$('#start'), openButton=$('#openChest'), rescanButton=$('#rescanButton');

  function updateProgress() { $('#progress').textContent=`${progress.obtained} / 60 REGISTROS DESCOBERTOS`; }
  $('#progress').textContent='Carregando coleção…';
  STATUS.textContent='Inicie a câmera e aponte para o QR 02 que abriu este ritual.';
  startButton.disabled=false;

  const tracker=new QRTrackerThree({container:$('#ar')});

  window.addEventListener('pageshow', event => { if(event.persisted) window.location.reload(); });

  const {renderer,scene,camera}=tracker;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const anchor=tracker.addAnchor(0), root=anchor.group;
  scene.add(new THREE.AmbientLight(0xffffff,1.2));
  const light=new THREE.DirectionalLight(0xf4c6b4,2.1);light.position.set(2,3,5);scene.add(light);
  const rim=new THREE.DirectionalLight(0x8a839f,1.0);rim.position.set(-3,-1,3);scene.add(rim);
  const innerGlow=new THREE.PointLight(0xdf4157,0,.95);innerGlow.position.set(0,.28,.2);root.add(innerGlow);

  const chest=new THREE.Group();chest.position.set(0,-.12,.16);root.add(chest);
  let chestAnimation = null;
  let modelError = null;
  loadChest(chest,{signal:modelAbort.signal}).then(controller => {
    if(disposed){controller.dispose();return}
    chestAnimation = controller;
    if(phase==='idle'||phase==='ready') showReady();
  }).catch(error => {
    if(disposed)return;console.error(error); modelError = error;
    if(phase==='idle'||phase==='ready') showReady();
  });
  let lastFrame = performance.now();

  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=724;
  const context=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const card3d=new THREE.Mesh(new THREE.PlaneGeometry(.42,.59),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,depthTest:false}));
  card3d.position.set(0,.05,.22);card3d.scale.setScalar(.13);card3d.visible=false;root.add(card3d);

  tracker.onError = error => {
    if (disposed) return;
    started = false; starting = false;
    renderer.setAnimationLoop(null);
    if (phase === 'opening' || phase === 'closing') {
      phase = 'ready'; current = null;
      card3d.visible = false; innerGlow.intensity = 0;
      chestAnimation?.play('Idle');
    }
    startButton.hidden = false; startButton.disabled = false; marcarCamera('erro');
    cameraMessage = error.name === 'CameraFramesError'
      ? 'A câmera não está fornecendo imagem. Tente novamente.'
      : 'A câmera foi interrompida. Toque em INICIAR CÂMERA para tentar novamente.';
    STATUS.textContent = cameraMessage;
  };

  function showReady() {
    if (!accountReady || !chestAnimation) {
      openButton.hidden=true;
      STATUS.textContent=modelError ? `Não foi possível carregar o baú: ${modelError.message}. Recarregue para tentar novamente.`
        : accountError ? `Câmera disponível. ${accountError.message} Entre na conta pelo início para sortear.`
        : 'Preparando o baú e a coleção. Você já pode iniciar a câmera.';
      return;
    }
    openButton.hidden=(!daily?.available && !openingKey) || !started || !detected || freshScanRequired;
    openButton.textContent=openingKey && !daily?.available ? 'RECUPERAR ABERTURA' : 'ABRIR BAÚ';
    if(!started) STATUS.textContent=cameraMessage || 'Toque em INICIAR CÂMERA para reconhecer o QR 02.';
    else if(!daily?.available && !openingKey) STATUS.textContent=dailyText;
    else if(freshScanRequired) STATUS.textContent=hasSeenTargetAway?'Aponte novamente para o QR 02 para iniciar outra abertura.':'Afaste a câmera do QR 02 e volte a apontar para ele.';
    else if(detected) STATUS.textContent=openingKey && !daily?.available ? 'Recupere a abertura anterior já confirmada, sem consumir uma nova recompensa.' : 'QR 02 reconhecido. Toque em ABRIR BAÚ para descobrir uma carta!';
    else STATUS.textContent=dailyText + ' Aponte para o QR 02 impresso ou exibido em outra tela.';
  }
  anchor.onTargetFound=()=>{
    detected=true;
    if(!disposed && freshScanRequired && hasSeenTargetAway && phase!=='closing') {
      freshScanRequired=false;
      phase='ready';
    }
    if(phase==='idle'||phase==='ready') showReady();
  };
  anchor.onTargetLost=()=>{
    detected=false;
    openButton.hidden=true;
    if(freshScanRequired) hasSeenTargetAway=true;
    if(phase==='idle'||phase==='ready') showReady();
  };

  function showReward() {
    phase='reward';card3d.visible=false;
    setFace(faceA,current,0);
    setFace(faceB,current,1);
    flipStage=0;flipTurns=0;
    rotor.style.transition='none';rotor.style.transform='rotateY(0deg)';
    void rotor.offsetWidth;rotor.style.transition=(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.reduzir==='true')?'none':'transform .55s ease';
    $('#flipLabel').textContent=flipLabels[0];faceA.inert=false;faceB.inert=true;faceA.setAttribute('aria-hidden','false');faceB.setAttribute('aria-hidden','true');$('#flipButton').setAttribute('aria-pressed','false');$('#flipButton').textContent='VIRAR CARTA';
    rescanButton.textContent='VOLTAR AO BAÚ';
    rescanButton.disabled=false;

    // Posição projetada da carta 3D: a carta em HTML parece vir de onde está o baú.
    let x=0,y=110;
    if(detected) {
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      const v=new THREE.Vector3();card3d.getWorldPosition(v);v.project(camera);
      if(Number.isFinite(v.x)&&Number.isFinite(v.y)) {
        x=Math.max(-innerWidth,Math.min(innerWidth,v.x*innerWidth*.5));
        y=Math.max(-innerHeight,Math.min(innerHeight,-v.y*innerHeight*.5));
      }
    }
    stage.style.setProperty('--from-x',`${x}px`);
    stage.style.setProperty('--from-y',`${y}px`);
    reward.hidden=false;reward.classList.remove('entrance');void reward.offsetWidth;reward.classList.add('entrance');
    releaseRewardFocus?.();
    releaseRewardFocus=containDialogFocus(reward,{onEscape:()=>rescanButton.click(),restoreFocus:false});
    $('#flipButton').focus();
    STATUS.textContent=rewardKind === false ? `${current.nome}: carta repetida. Sua coleção permanece completa.` : rewardKind === true ? `${current.nome} entrou na sua coleção.` : `${current.nome}: abertura anterior recuperada.`;
    $('#demoNotice').textContent=rewardKind === false ? 'Carta repetida registrada no histórico. Sua coleção permanece em 60/60.' : 'Recompensa confirmada. Consulte seu álbum e o histórico no perfil.';
    const albumLink=document.createElement('a');albumLink.href='/?album=1';albumLink.textContent='Abrir meu grimório';$('#demoNotice').append(' ',albumLink);
  }

  openButton.addEventListener('click',async()=>{
    if(disposed || !accountReady || !chestAnimation || !started || !detected || freshScanRequired || (phase!=='idle' && phase!=='ready')) return;
    if(!daily?.available && !openingKey){showReady();return;}
    const version = accountVersion;
    phase='requesting';openButton.hidden=true;
    STATUS.textContent='Consultando o baú…';
    openingKey ||= crypto.randomUUID();
    try { sessionStorage.setItem(pendingStorage, openingKey); } catch { /* chave em memória */ }
    try {
      const result = await api('/rewards/open', {method:'POST', headers:{'Idempotency-Key':openingKey}});
      if (disposed || version !== accountVersion) return;
      // Uma repetição devolve o snapshot original; progresso pode ter avançado em outra aba.
      progress=result.progress;updateProgress();
      // O sorteio idempotente é um snapshot; consulte também o progresso atual.
      api('/album/progress').then(latest => { if(version===accountVersion) { progress=latest;updateProgress(); } }).catch(() => {});
      if(!result.legend) { openingKey=null; try { sessionStorage.removeItem(pendingStorage); } catch {} phase='ready';showReady();return; }
      current=result.legend;rewardKind=result.is_new ?? null;
      if(!current.cultura){try{const catalog=await api('/legends');if(version!==accountVersion)return;current=enrichEducationalLegend(current,catalog)}catch{/* Snapshot confirmado continua válido; conteúdo pendente. */}if(version!==accountVersion)return;}
      void rewardClock?.refresh();
    } catch(error) {
      if (disposed || version !== accountVersion) return;
      phase='ready';
      if(error.code==='DAILY_REWARD_USED') {
        openingKey=null;try { sessionStorage.removeItem(pendingStorage); } catch {}
        rewardClock?.accept(error.data.detail.status);showReady();return;
      }
      showReady();
      if(error.status===401) { accountReady=false; accountError=error; openButton.hidden=true; }
      STATUS.textContent=`${error.message} Toque em ABRIR BAÚ para tentar recuperar esta abertura.`;
      if(error.status===401) {
        const link=document.createElement('a');link.href='/?conta=1&retorno=ritual';link.textContent=' Entrar na conta';STATUS.append(link);
      }
      return;
    }
    if (!started) {
      current = null; phase = 'ready'; chestAnimation?.play('Idle');
      cameraMessage = 'Abertura confirmada. Reinicie a câmera e recupere a mesma abertura.';
      STATUS.textContent = cameraMessage;
      return;
    }
    drawCanvasCard(context,current);texture.needsUpdate=true;
    const art = legendImages.find(image => image.id === current.id && image.src);
    if (art) {
      const card = current, image = new Image();
      image.onload = () => {
        if (current !== card) return;
        context.fillStyle='#151117';context.fillRect(64,136,384,258);
        const scale=Math.min(384/image.naturalWidth,258/image.naturalHeight);
        const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
        context.drawImage(image,256-w/2,265-h/2,w,h);texture.needsUpdate=true;
      };
      image.src=art.src;
    }
    chestAnimation.play('OpenChest');
    phase='opening';openingAt=performance.now();
    card3d.visible=false;
    openButton.hidden=true;
    STATUS.textContent='O baú foi aberto... algo está saindo de dentro dele!';
  });

  $('#flipButton').addEventListener('click',()=>{
    if(phase!=='reward') return;
    const next=(flipStage+1)%2;
    setFace(flipTurns%2===0?faceB:faceA,current,next);
    flipStage=next;flipTurns+=1;
    rotor.style.transform=`rotateY(${flipTurns*180}deg)`;
    $('#flipLabel').textContent=flipLabels[next];const rear=flipTurns%2===1;faceA.inert=rear;faceB.inert=!rear;faceA.setAttribute('aria-hidden',String(rear));faceB.setAttribute('aria-hidden',String(!rear));$('#flipButton').setAttribute('aria-pressed',String(next===1));$('#flipButton').textContent=next?'VOLTAR À FRENTE':'VIRAR CARTA';
  });

  rescanButton.addEventListener('click',()=>{
    if(phase!=='reward') return;
    openingKey=null;
    try { sessionStorage.removeItem(pendingStorage); } catch { /* chave em memória */ }
    releaseRewardFocus?.();releaseRewardFocus=null;
    reward.hidden=true;reward.classList.remove('entrance');
    $('#home').focus({preventScroll:true});
    card3d.visible=false;chestAnimation?.play('CloseChest');innerGlow.intensity=0;
    phase='closing';
    freshScanRequired=true;
    hasSeenTargetAway=!detected;
    showReady();
  });

  startButton.addEventListener('click',async()=>{
    if(disposed||started||starting)return;starting=true;
    startButton.disabled=true;STATUS.textContent='Abrindo a câmera para reconhecer o QR 02…';
    try {
      await tracker.start();if(disposed)return;starting=false;started=true;cameraMessage='';startButton.hidden=true;marcarCamera('ativa');showReady();
      lastFrame=performance.now();
      renderer.setAnimationLoop(()=>{
        if(disposed||document.hidden){lastFrame=performance.now();return}
        const now=performance.now();
        // O clipe e a recompensa precisam usar o mesmo tempo real. Limitar o
        // delta fazia a tampa atrasar em celulares com poucos quadros.
        chestAnimation?.update(Math.max(0,(now-lastFrame)/1000));
        lastFrame=now;
        if(phase==='closing' && !chestAnimation?.isRunning?.('CloseChest')){phase='ready';if(hasSeenTargetAway&&detected)freshScanRequired=false;showReady()}
        if(phase==='opening') {
          const elapsed=performance.now()-openingAt;
          const lid=easeOutCubic(elapsed/2000);
          innerGlow.intensity=8*lid;
          const t=easeOutCubic((elapsed-340)/1300);
          card3d.visible=elapsed>=360;
          card3d.position.set(0,.05+.68*t,.22+.8*t);
          card3d.scale.setScalar(.13+1.08*t);
          card3d.rotation.z=Math.sin(t*Math.PI)*-.06;
          if(elapsed>=2400) showReward();
        } else if(phase==='ready'||phase==='idle') {
          innerGlow.intensity=THREE.MathUtils.lerp(innerGlow.intensity,0,.12);
        }
        renderer.render(scene,camera);
      });
    } catch(error) {
      starting=false;if(disposed)return;console.error(error);marcarCamera('erro');
      STATUS.textContent=error.name==='NotAllowedError' ? 'Permita o acesso à câmera no navegador e tente novamente.'
        : error.name==='NotFoundError' ? 'Nenhuma câmera foi encontrada neste dispositivo.'
        : error.name==='NotReadableError' ? 'A câmera está ocupada ou indisponível. Feche outros aplicativos que usam a câmera e tente novamente.'
        : error.name==='CameraFramesError' ? 'A câmera não forneceu imagem. Tente novamente.'
        : error.name==='SecurityError' ? 'Abra o site por HTTPS para permitir o acesso à câmera.'
        : error.name==='NotSupportedError' ? 'Este navegador não oferece acesso à câmera. Tente abrir em um navegador compatível.'
        : 'Não foi possível iniciar a câmera. Confira HTTPS, suporte e permissão do navegador e tente novamente.';
      cameraMessage=STATUS.textContent;
      startButton.disabled=false;
    }
  });
  function refreshAccount() {
    if(disposed)return;releaseRewardFocus?.();releaseRewardFocus=null;chestAnimation?.play('Idle');innerGlow.intensity=0;
    const version = ++accountVersion;
    rewardClock?.dispose();rewardClock=null;daily=null;dailyText='Consultando recompensa…';
    accountReady=false;accountError=null;current=null;openingKey=null;pendingStorage=null;
    reward.hidden=true;faceA.innerHTML='';faceB.innerHTML='';card3d.visible=false;
    context.clearRect(0,0,512,724);texture.needsUpdate=true;
    phase='idle';openButton.hidden=true;
    $('#progress').textContent='Consultando sua conta…';
    Promise.all([api('/auth/me'), api('/album/progress')]).then(([user, latest]) => {
      if(version!==accountVersion) return;
      if(latest.total !== 60) throw Error('O catálogo do servidor ainda não está pronto.');
      progress=latest; pendingStorage=`bau-pending-draw:${user.id}`;
      try { openingKey=sessionStorage.getItem(pendingStorage); } catch {}
      accountReady=true;updateProgress();showReady();
      rewardClock=watchReward({ load: () => api('/rewards/status'),
        onUpdate(status, text) { if(version!==accountVersion) return;daily=status;dailyText=text;if(phase==='idle'||phase==='ready') showReady(); },
        onError(error) { if(version!==accountVersion) return;daily=null;dailyText=error.message;if(phase==='idle'||phase==='ready') showReady(); }
      });
    }).catch(error => {
      if(version!==accountVersion) return;
      accountError=error;$('#progress').textContent='Coleção indisponível';showReady();
    });
  }
  const refreshWhenVisible = () => { if(document.visibilityState==='visible') refreshAccount(); };
  document.addEventListener?.('visibilitychange', refreshWhenVisible);
  window.addEventListener('bau-auth-change', refreshAccount);
  const refreshReward = () => { void rewardClock?.refresh(); };
  window.addEventListener('online', refreshReward);
  window.addEventListener('bau-reward-change', refreshReward);
  window.addEventListener('focus', refreshAccount);
  function disposeExperience(){
    if(disposed)return;releaseRewardFocus?.();releaseRewardFocus=null;disposed=true;phase='disposed';reward.hidden=true;openButton.hidden=true;card3d.visible=false;faceA.replaceChildren();faceB.replaceChildren();modelAbort.abort();current=null;chestAnimation?.dispose();tracker.dispose();
    accountVersion++;rewardClock?.dispose();
    window.removeEventListener('online', refreshReward);
    window.removeEventListener('bau-reward-change', refreshReward);
    document.removeEventListener?.('visibilitychange', refreshWhenVisible);
    window.removeEventListener('bau-auth-change', refreshAccount);
    window.removeEventListener('focus', refreshAccount);
  }
  window.addEventListener('pagehide',disposeExperience,{once:true});
  renderer.domElement?.addEventListener('webglcontextlost',event=>{event.preventDefault();disposeExperience();STATUS.textContent='O contexto gráfico foi perdido. Recarregue para retomar com segurança.';startButton.hidden=false;startButton.disabled=false;startButton.textContent='RECARREGAR';startButton.addEventListener('click',()=>window.location.reload(),{once:true})},{once:true});
  refreshAccount();

}

startExperience().catch(error=>{
  console.error(error);
  STATUS.textContent=`Não foi possível preparar a RA: ${error.message}`;
  const retry=$('#start');
  retry.disabled=error.status===401;
  if(error.status!==401) {
    retry.textContent='TENTAR NOVAMENTE';
    retry.addEventListener('click',()=>window.location.reload(),{once:true});
  }
  if(error.status===401) {
    const link=document.createElement('a');link.href='/?conta=1&retorno=ritual';link.textContent=' Entrar na conta';STATUS.append(link);
  }
});
