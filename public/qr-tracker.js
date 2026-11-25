import * as THREE from 'three';
import { estimateQrPose, isRitualQr } from '/qr-pose.js';

// Detector do próprio QR 02. Não usa imagem MIND, plano invisível ou alvo extra.
// A pose é estimada dos quatro cantos; limites e validação: docs/ETAPA-09-RA-RASTREAMENTO.md.
export class QRTrackerThree {
  constructor({ container, decoder = globalThis.jsQR, frameTimeout = 15000 }) {
    if (typeof decoder !== 'function') throw Error('O leitor de QR não carregou. Recarregue a página.');
    this.container = container; this.decoder = decoder;
    this.intervaloScan = 100; this.custoScan = 0;
    this.frameTimeout = frameTimeout; this.trackListeners = [];
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, .01, 150);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.video = document.createElement('video');
    this.video.muted = true; this.video.playsInline = true; this.video.autoplay = true;
    this.video.setAttribute('playsinline', ''); this.video.setAttribute('aria-hidden', 'true');
    this.video.className = 'ritual-camera';
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d', { willReadFrequently: true });
    this.anchor = { group: new THREE.Group(), onTargetFound: null, onTargetLost: null };
    this.anchor.group.visible = false; this.scene.add(this.anchor.group);
    container.append(this.video, this.renderer.domElement);
    this.disposed=false;this.generation=0;
    this.found = false; this.hits = 0; this.lastScan = 0; this.lastFound = 0;
    this.resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      this.renderer.setSize(width, height);
      const vw = this.video.videoWidth || width, vh = this.video.videoHeight || height;
      const focal = vh / (2 * Math.tan(Math.PI/6)) * Math.max(width/vw, height/vh);
      this.camera.fov = 2*Math.atan(height/(2*focal))*180/Math.PI;
      this.camera.aspect = width/height; this.camera.updateProjectionMatrix();
    };
    this.onVisibility = () => {
      if (document.hidden) { this.loseTarget(); this.video.pause(); }
      else if (this.running) {
        this.lastVideoAt = null;
        this.video.play().catch(() => this.failCamera(new DOMException('Não foi possível retomar o vídeo.','NotReadableError')));
      }
    };
    this.video.addEventListener?.('resize',this.resize);
    this.videoError=()=>{if(this.running)this.failCamera(new DOMException('O vídeo da câmera foi interrompido.','NotReadableError'))};
    this.video.addEventListener?.('error',this.videoError);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
  }

  addAnchor() { return this.anchor; }

  async start() {
    if(this.disposed)throw new DOMException("Experiência encerrada.","AbortError");
    if(this.starting)return this.starting;
    this.starting=this.startCamera();
    try{return await this.starting}finally{this.starting=null}
  }

  async startCamera() {
    const generation=this.generation;
    if (this.running) return;
    if (!window.isSecureContext)
      throw new DOMException('Abra o site por HTTPS para acessar a câmera.','SecurityError');
    if (!navigator.mediaDevices?.getUserMedia)
      throw new DOMException('Este navegador não oferece acesso à câmera.','NotSupportedError');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if(this.disposed||generation!==this.generation){stream.getTracks().forEach(t=>t.stop());throw new DOMException('Experiência encerrada.','AbortError')}
      this.stream=stream;this.video.srcObject = stream;
      for (const track of stream.getVideoTracks?.() || stream.getTracks()) {
        const ended = () => this.failCamera(new DOMException('A câmera foi interrompida. Tente novamente.','NotReadableError'));
        track.addEventListener?.('ended',ended,{once:true});
        this.trackListeners.push([track,ended]);
      }
      await this.waitForVideo();
      if(this.disposed||generation!==this.generation)throw new DOMException('Experiência encerrada.','AbortError');
      this.resize(); this.running = true;
      const scan = now => {
        if (!this.running) return;
        if (!document.hidden) {
          const time = this.video.currentTime;
          if (this.lastVideoAt == null || time !== this.lastVideoTime) {
            this.lastVideoAt = now; this.lastVideoTime = time;
          }
          const age = now-this.lastVideoAt;
          if (this.video.readyState < 2 || age > 350) this.loseTarget();
          if (age > 2000) {
            this.failCamera(new DOMException('A câmera não está fornecendo quadros. Tente novamente.','CameraFramesError'));
            return;
          }
          if (this.video.readyState >= 2 && now-this.lastScan >= this.intervaloScan && age <= 350 &&
              (!Number.isFinite(time) || time !== this.lastDecodedTime)) {
            this.lastScan = now; this.lastDecodedTime = time;
            const inicio = Date.now();
            try { this.scanFrame(now); } catch { this.loseTarget(); }
            // Celular lento: se a leitura custa caro, analisa com menos frequência
            // (100–250 ms). A resolução analisada, e o alcance do reconhecimento, não mudam.
            this.custoScan = this.custoScan * 0.8 + (Date.now() - inicio) * 0.2;
            this.intervaloScan = Math.min(250, Math.max(100, this.custoScan * 2.5));
          }
        }
        this.frame = requestAnimationFrame(scan);
      };
      this.frame = requestAnimationFrame(scan);
    } catch (error) { this.stop(); throw error; }
  }

  waitForVideo() {
    return new Promise((resolve,reject) => {
      let played = false, done = false;
      const events = ['loadeddata','canplay','playing','resize'];
      const finish = error => {
        if (done) return;
        done = true; clearTimeout(timer);
        events.forEach(e => this.video.removeEventListener?.(e,check));
        this.video.removeEventListener?.('error',bad);
        this.cancelVideoWait = null;
        error ? reject(error) : resolve();
      };
      const check = () => {
        if (played && this.video.readyState >= 2 && this.video.videoWidth > 0 && this.video.videoHeight > 0) finish();
      };
      const bad = () => finish(new DOMException('Falha no vídeo da câmera.','NotReadableError'));
      const timer = setTimeout(() => finish(new DOMException('A câmera não forneceu quadros. Tente novamente.','CameraFramesError')),this.frameTimeout);
      this.cancelVideoWait = finish;
      events.forEach(e => this.video.addEventListener?.(e,check));
      this.video.addEventListener?.('error',bad);
      Promise.resolve().then(() => this.video.play()).then(() => { played = true; check(); },finish);
    });
  }

  failCamera(error) {
    if (this.disposed) return;
    this.stop(); this.onError?.(error);
  }

  scanFrame(now) {
    const video = this.video;
    const factor = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth*factor), height = Math.round(video.videoHeight*factor);
    if (!width || !height) {this.loseTarget();return}
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    this.context.drawImage(video,0,0,width,height);
    const pixels = this.context.getImageData(0,0,width,height);
    const result = this.decoder(pixels.data,width,height,{ inversionAttempts: 'dontInvert' });
    let pose = null;
    if (result && isRitualQr(result.data, window.location.origin)) {
      const l = result.location;
      if(l)pose = estimateQrPose([l.topLeftCorner,l.topRightCorner,l.bottomRightCorner,l.bottomLeftCorner],width,height);
    }
    if (pose) {
      const matrix = new THREE.Matrix4().fromArray(pose);
      const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
      matrix.decompose(position,rotation,scale);
      const group = this.anchor.group;
      if (!this.found) { group.position.copy(position); group.quaternion.copy(rotation); }
      else {
        // Mantém 0,55 a cada 100 ms e a mesma resposta com FPS variável.
        const alpha = 1-Math.pow(.45,Math.max(0,now-this.lastFound)/100);
        group.position.lerp(position,alpha); group.quaternion.slerp(rotation,alpha);
      }
      this.lastFound = now; this.hits++;
      if (this.hits >= 2 && !this.found) {
        this.found = true; group.visible = true; this.anchor.onTargetFound?.();
      }
    } else {
      this.hits = 0;
      if (now-this.lastFound > 350) this.loseTarget();
    }
  }

  loseTarget() {
    this.hits = 0; this.anchor.group.visible = false;
    if (this.found) { this.found = false; this.anchor.onTargetLost?.(); }
  }

  stop() {
    this.generation++;
    this.cancelVideoWait?.(new DOMException('Experiência interrompida.','AbortError'));
    this.lastVideoAt = null; this.lastDecodedTime = null;
    for (const [track,fn] of this.trackListeners) track.removeEventListener?.('ended',fn);
    this.trackListeners = [];
    this.running = false; cancelAnimationFrame(this.frame);
    this.video.pause();
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream=null;this.video.srcObject = null; this.loseTarget();
  }

  dispose() {
    if(this.disposed)return;this.disposed=true;
    this.stop(); this.renderer.setAnimationLoop(null);
    this.video.removeEventListener?.('resize',this.resize);this.video.removeEventListener?.('error',this.videoError);
    window.removeEventListener('resize',this.resize);
    document.removeEventListener('visibilitychange',this.onVisibility);
    this.scene.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach(material => { material.map?.dispose(); material.dispose(); });
    });
    this.renderer.dispose(); this.container.replaceChildren();
  }
}
