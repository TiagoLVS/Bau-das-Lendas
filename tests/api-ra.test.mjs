import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { api, ApiError } from '../public/api.js'
import { watchReward as realWatchReward } from '../public/reward-clock.js'
import { legendImages } from '../public/legend-images.js'

test('cliente usa cookie, proteção CSRF e preserva a chave no erro de rede', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    if (calls.length === 1) throw Error('offline')
    return new Response(JSON.stringify({ id: 'draw-1' }), { headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const options = { method: 'POST', headers: { 'Idempotency-Key': 'same-opening' } }
    await assert.rejects(api('/draws', options), error => error instanceof ApiError && error.status === 0)
    assert.deepEqual(await api('/draws', options), { id: 'draw-1' })
    for (const call of calls) {
      assert.equal(call.url, '/api/draws')
      assert.equal(call.options.credentials, 'include')
      assert.equal(call.options.headers['X-Bau-Request'], '1')
      assert.equal(call.options.headers['Idempotency-Key'], 'same-opening')
    }
  } finally { globalThis.fetch = original }
})

test('cliente trata API indisponível e sessão expirada sem inventar resultado', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('<html>offline</html>', { status: 502 })
    await assert.rejects(api('/album'), error => error.status === 502)
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Entre na conta.' }), { status: 401 })
    await assert.rejects(api('/album'), error => error.status === 401 && error.message === 'Entre na conta.')
  } finally { globalThis.fetch = original }
})

async function prepareRa({ pending = false, complete = false, offline = false, available = true, conflict = false, suspended = false } = {}) {
  const elements = new Map()
  function element() {
    return { handlers: {}, style: { setProperty() {} }, classList: { add() {}, remove() {} },
      addEventListener(event, handler) { this.handlers[event] = handler }, setAttribute() {}, replaceChildren() {this.innerHTML=''}, append(...nodes) {this.innerHTML=(this.innerHTML||'')+nodes.map(n=>n.textContent||n.innerHTML||'').join('')}, focus() {}, querySelectorAll() { return [] },
      getContext() { return { clearRect() {}, createLinearGradient() { return { addColorStop() {} } },
        fillRect() {}, strokeRect() {}, fillText() {}, measureText() { return { width: 10 } } } } }
  }
  const document = { documentElement:{dataset:{}}, querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, element())
    return elements.get(selector)
  }, createElement: element }
  const objects = []
  class Object3D {
    constructor() {
      objects.push(this)
      this.position = { set(x, y, z) { this.x = x; this.y = y; this.z = z } }; this.rotation = { x: 0 }; this.scale = { setScalar() {} }
    }
    add() {}
  }
  const THREE = {
    Group: Object3D, Mesh: Object3D, AmbientLight: Object3D, DirectionalLight: Object3D,
    PointLight: Object3D, MeshStandardMaterial: Object3D, BoxGeometry: Object3D,
    CanvasTexture: Object3D, PlaneGeometry: Object3D, MeshBasicMaterial: Object3D,
    MathUtils: { lerp: (a, b, t) => a + (b - a) * t },
  }
  let mindar
  class MindARThree {
    constructor() {
      mindar = this
      this.scene = new Object3D(); this.camera = {}
      this.anchor = { group: new Object3D() }
      this.renderer = { setAnimationLoop: fn => { this.animate = fn }, render() {} }
    }
    addAnchor() { return this.anchor }
    async start() {}
    dispose(){this.disposed=true;this.renderer.setAnimationLoop(null)}
  }
  const animationUpdates = [], animationPlays = [];let activeClip="Idle",clipEnd=0
  let releaseReward;const rewardGate=new Promise(resolve=>releaseReward=resolve)
  const events = {}
  const calls = []
  let fail = true, clock = 0, canClaim = available
  const storage = new Map(pending ? [['bau-pending-draw:user-1', 'pending-opening']] : [])
  const context = vm.createContext({ containDialogFocus:()=>()=>{}, AbortController, document, matchMedia:()=>({matches:false}), THREE, watchReward: options => realWatchReward({ ...options, now: () => clock, setTimer: () => 0, clearTimer() {} }), loadChest: async () => ({ play(name) { animationPlays.push(name);activeClip=name;clipEnd=clock+2000 }, isRunning(name){return name===activeClip&&clock<clipEnd}, dispose(){animationPlays.push('dispose')}, update(delta) { animationUpdates.push(delta) } }), QRTrackerThree: MindARThree, console, crypto, legendImages,
    window: { addEventListener(type, handler) { (events[type] ||= []).push(handler) }, removeEventListener() {}, location: { reload() {} } },
    performance: { now: () => clock }, innerWidth: 800, innerHeight: 600,
    sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    api: async (path, options) => {
      calls.push({ path, options })
      if (offline) throw new ApiError('API offline', 0)
      if (path === '/legends') return []
      if (path === '/auth/me') return { id: 'user-1' }
      if (path === '/rewards/status') return { available: canClaim, server_now: '2026-11-20T12:00:00Z', next_available_at: '2026-11-21T03:00:00Z' }
      if (path === '/album/progress') return { total: 60, obtained: complete ? 60 : 0, complete }
      if (conflict) throw new ApiError('Você já recebeu a recompensa de hoje.', 409, { detail: { code: 'DAILY_REWARD_USED', status: { available: false, server_now: '2026-11-20T12:00:00Z', next_available_at: '2026-11-21T03:00:00Z' } } })
      if (fail) { fail = false; throw new ApiError('offline', 0) }
      if(suspended)await rewardGate
      canClaim = false
      return { is_new: !complete, legend: { id: 'real-server-card', numero: 1, nome: 'Carta do servidor' },
        progress: { obtained: complete ? 60 : 1, complete } }
    },
  })
  const source = (await readFile(new URL('../public/ra.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '')
  const education=(await readFile(new URL('../public/educational-card.js',import.meta.url),'utf8')).replaceAll('export ','')
  vm.runInContext(education,context)
  vm.runInContext(source.replace('startExperience().catch', 'globalThis.ready = startExperience().catch'), context)
  await context.ready
  await new Promise(resolve => setImmediate(resolve))
  return { elements, calls, mindar, storage, objects,releaseReward, setAvailable: value => { canClaim = value }, trigger: type => events[type]?.forEach(fn => fn()), animationUpdates, animationPlays, setTime: value => { clock = value } }
}

test('RA sorteia só no toque, reutiliza chave no retry e cria outra somente após renovação pelo servidor', async () => {
  const { elements: e, calls, mindar, objects, setTime, setAvailable, trigger } = await prepareRa()
  const click = id => e.get(id).handlers.click()
  await click('#start')
  mindar.anchor.onTargetFound()
  assert.equal(calls.filter(c => c.path === '/rewards/open').length, 0)
  await click('#openChest') // falha de rede
  await click('#openChest') // recupera a mesma abertura
  let draws = calls.filter(c => c.path === '/rewards/open')
  const first = draws[0].options.headers['Idempotency-Key']
  assert.equal(draws[1].options.headers['Idempotency-Key'], first)
  setTime(500); mindar.animate()
  assert.ok(objects.some(object => object.visible && object.position.y > .05 && object.position.z > .22), 'Carta emerge do baú')
  mindar.anchor.onTargetLost(); setTime(2500); mindar.animate()
  assert.match(e.get('#faceA').innerHTML, /Carta do servidor/)
  assert.equal(e.get('#rewardOverlay').hidden, false)
  await click('#flipButton')
  assert.match(e.get('#flipLabel').textContent, /VERSO/)
  await click('#flipButton')
  assert.match(e.get('#flipLabel').textContent, /FRENTE/)
  await click('#rescanButton')
  assert.equal(e.get('#openChest').hidden, true)
  setAvailable(true);trigger('online')
  await new Promise(resolve => setImmediate(resolve))
  mindar.anchor.onTargetFound()
  await click('#openChest')
  assert.equal(calls.filter(c=>c.path==='/rewards/open').length,2)
  setTime(4500);mindar.animate();mindar.anchor.onTargetFound()
  await click('#openChest')
  draws = calls.filter(c => c.path === '/rewards/open')
  assert.notEqual(draws[2].options.headers['Idempotency-Key'], first)
})

test('RA recupera abertura pendente mesmo se a última carta já completou 60/60', async () => {
  const { elements: e, calls, mindar } = await prepareRa({ pending: true, complete: true })
  await e.get('#start').handlers.click(); mindar.anchor.onTargetFound()
  assert.equal(e.get('#openChest').hidden, false)
  await e.get('#openChest').handlers.click()
  await e.get('#openChest').handlers.click()
  assert.equal(calls.filter(c => c.path === '/rewards/open')[1].options.headers['Idempotency-Key'], 'pending-opening')
})


test('câmera continua acessível quando a API está offline', async () => {
  const { elements, calls } = await prepareRa({ offline: true })
  assert.equal(elements.get('#start').disabled, false)
  await elements.get('#start').handlers.click()
  assert.equal(elements.get('#start').hidden, true)
  assert.equal(elements.get('#openChest').hidden, true)
  assert.equal(calls.filter(c => c.path === '/rewards/open').length, 0)
})


test('abertura acompanha o tempo real mesmo com poucos quadros no celular', async () => {
  const { elements, mindar, setTime, animationUpdates, animationPlays } = await prepareRa()
  await elements.get('#start').handlers.click()
  mindar.anchor.onTargetFound()
  await elements.get('#openChest').handlers.click() // falha de rede
  await elements.get('#openChest').handlers.click()
  assert.equal(animationPlays.at(-1), 'OpenChest')
  setTime(500); mindar.animate()
  mindar.anchor.onTargetLost()
  setTime(2500); mindar.animate()
  assert.ok(animationUpdates.reduce((a,b) => a+b, 0) >= 2, 'Clipe deve terminar antes de a recompensa cobrir o baú')
  await elements.get('#rescanButton').handlers.click()
  assert.equal(animationPlays.at(-1), 'CloseChest')
})


test('mudança de autenticação oculta imediatamente a recompensa anterior na RA', async () => {
  const { elements, mindar, setTime, trigger } = await prepareRa()
  await elements.get('#start').handlers.click(); mindar.anchor.onTargetFound()
  await elements.get('#openChest').handlers.click()
  await elements.get('#openChest').handlers.click()
  mindar.anchor.onTargetLost();setTime(2500);mindar.animate()
  assert.equal(elements.get('#rewardOverlay').hidden, false)
  trigger('bau-auth-change')
  assert.equal(elements.get('#rewardOverlay').hidden, true)
  assert.equal(elements.get('#faceA').innerHTML, '')
  assert.equal(elements.get('#faceB').innerHTML, '')
  assert.equal(elements.get('#openChest').hidden, true)
})


test('recompensa diária utilizada mantém câmera disponível sem simular abertura', async () => {
  const { elements, mindar, calls, animationPlays } = await prepareRa({ available: false })
  await elements.get('#start').handlers.click();mindar.anchor.onTargetFound()
  assert.equal(elements.get('#openChest').hidden, true)
  await elements.get('#openChest').handlers.click()
  assert.equal(calls.filter(c => c.path === '/rewards/open').length, 0)
  assert.ok(!animationPlays.includes('OpenChest'))
  assert.match(elements.get('#status').textContent, /Próxima/)
})


test('conflito diário recebido ao abrir não reproduz animação nem cria carta', async () => {
  const { elements, mindar, animationPlays } = await prepareRa({ conflict: true })
  await elements.get('#start').handlers.click();mindar.anchor.onTargetFound()
  await elements.get('#openChest').handlers.click()
  assert.equal(elements.get('#openChest').hidden, true)
  assert.ok(!animationPlays.includes('OpenChest'))
  assert.match(elements.get('#status').textContent, /Próxima/)
})

test('recompensa repetida após álbum completo é apresentada sem bloquear abertura', async () => {
  const { elements, mindar, setTime } = await prepareRa({ complete: true })
  await elements.get('#start').handlers.click();mindar.anchor.onTargetFound()
  await elements.get('#openChest').handlers.click();await elements.get('#openChest').handlers.click()
  mindar.anchor.onTargetLost();setTime(2500);mindar.animate()
  assert.equal(elements.get('#rewardOverlay').hidden, false)
  assert.match(elements.get('#status').textContent, /repetida/)
  assert.match(elements.get('#demoNotice').textContent, /60\/60/)
})

test('duplo toque e perda do marcador aguardam confirmação sem duplicar POST',async()=>{const r=await prepareRa({suspended:true});await r.elements.get('#start').handlers.click();r.mindar.anchor.onTargetFound();await r.elements.get('#openChest').handlers.click();const pending=r.elements.get('#openChest').handlers.click();await r.elements.get('#openChest').handlers.click();assert.equal(r.calls.filter(c=>c.path==='/rewards/open').length,2);assert.ok(!r.animationPlays.includes('OpenChest'));r.mindar.anchor.onTargetLost();r.releaseReward();await pending;assert.equal(r.animationPlays.filter(n=>n==='OpenChest').length,1);r.setTime(2500);r.mindar.animate();assert.equal(r.elements.get('#rewardOverlay').hidden,false)})
test('saída durante confirmação invalida resposta e encerra mixer/loop',async()=>{const r=await prepareRa({suspended:true});await r.elements.get('#start').handlers.click();r.mindar.anchor.onTargetFound();await r.elements.get('#openChest').handlers.click();const pending=r.elements.get('#openChest').handlers.click();r.trigger('pagehide');r.releaseReward();await pending;assert.ok(!r.animationPlays.includes('OpenChest'));assert.ok(r.animationPlays.includes('dispose'));assert.equal(r.mindar.animate,null);assert.equal(r.elements.get('#rewardOverlay').hidden,true)})
test('encerrar com recompensa visível oculta carta e bloqueia novos controles',async()=>{const r=await prepareRa();await r.elements.get('#start').handlers.click();r.mindar.anchor.onTargetFound();await r.elements.get('#openChest').handlers.click();await r.elements.get('#openChest').handlers.click();r.mindar.anchor.onTargetLost();r.setTime(2500);r.mindar.animate();assert.equal(r.elements.get('#rewardOverlay').hidden,false);r.trigger('pagehide');assert.equal(r.elements.get('#rewardOverlay').hidden,true);const calls=r.calls.length;await r.elements.get('#openChest').handlers.click();assert.equal(r.calls.length,calls);assert.equal(r.elements.get('#faceA').innerHTML,'')})

test('interrupção da câmera durante POST preserva chave para recuperar confirmação',async()=>{
  const r=await prepareRa({suspended:true}),e=r.elements;
  await e.get('#start').handlers.click();r.mindar.anchor.onTargetFound();
  await e.get('#openChest').handlers.click();const pending=e.get('#openChest').handlers.click();
  const key=r.storage.get('bau-pending-draw:user-1');
  r.mindar.anchor.onTargetLost();r.mindar.onError({name:'NotReadableError'});
  r.releaseReward();await pending;
  assert.ok(!r.animationPlays.includes('OpenChest'));assert.equal(r.mindar.animate,null);
  assert.equal(e.get('#start').hidden,false);assert.equal(r.storage.get('bau-pending-draw:user-1'),key);
  assert.match(e.get('#status').textContent,/Abertura confirmada/);
  await e.get('#start').handlers.click();r.mindar.anchor.onTargetFound();await e.get('#openChest').handlers.click();
  assert.equal(r.calls.filter(c=>c.path==='/rewards/open').at(-1).options.headers['Idempotency-Key'],key);
  assert.equal(r.animationPlays.filter(n=>n==='OpenChest').length,1);
});

test('interrupção durante abertura retorna Idle e permite recuperação com a mesma chave',async()=>{
  const r=await prepareRa(),e=r.elements;
  await e.get('#start').handlers.click();r.mindar.anchor.onTargetFound();
  await e.get('#openChest').handlers.click();await e.get('#openChest').handlers.click();
  const key=r.storage.get('bau-pending-draw:user-1');
  r.mindar.anchor.onTargetLost();r.mindar.onError({name:'CameraFramesError'});
  assert.equal(r.animationPlays.at(-1),'Idle');assert.equal(e.get('#openChest').hidden,true);
  await e.get('#start').handlers.click();r.mindar.anchor.onTargetFound();await e.get('#openChest').handlers.click();
  assert.equal(r.calls.filter(c=>c.path==='/rewards/open').at(-1).options.headers['Idempotency-Key'],key);
});

test('interrupção após revelação preserva o Flip da conquista confirmada',async()=>{
  const r=await prepareRa(),e=r.elements;
  await e.get('#start').handlers.click();r.mindar.anchor.onTargetFound();
  await e.get('#openChest').handlers.click();await e.get('#openChest').handlers.click();
  r.mindar.anchor.onTargetLost();r.setTime(2500);r.mindar.animate();r.mindar.onError({name:'NotReadableError'});
  assert.equal(e.get('#rewardOverlay').hidden,false);await e.get('#flipButton').handlers.click();
  assert.match(e.get('#flipLabel').textContent,/VERSO/);
  assert.equal(r.calls.filter(c=>c.path==='/rewards/open').length,2);
});
