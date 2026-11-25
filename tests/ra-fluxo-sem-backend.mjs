// Fluxo completo da RA no build de produção, sem backend: câmera sintética (canvas com o
// QR 02 real gerado pela tela Explorar), API simulada no navegador de teste.
// Verifica: câmera só após o toque, reconhecimento, perda do marcador, abertura do baú,
// revelação e Flip da carta, POST único por toque e liberação da câmera ao sair.
// Uso: node tests/ra-fluxo-sem-backend.mjs <dist> [chromium|webkit]
import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const [dist = 'dist', motor = 'chromium'] = process.argv.slice(2)
const T = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const server = createServer(async (q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); let f = join(dist, u); if (u.endsWith('/')) f = join(f, 'index.html')
  try { const d = await readFile(f); r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }); r.end(d) }
  catch { r.writeHead(200, { 'content-type': 'text/html' }); r.end(await readFile(join(dist, 'index.html'))) }
})
await new Promise(r => server.listen(0, r)); const origin = `http://localhost:${server.address().port}`
const lendas = JSON.parse(await readFile('public/lendas-ra.json', 'utf8'))
const carta = lendas.find(l => l.id === 'kiyohime')
let posts = 0
const progresso = { total: 60, obtained: 3, remaining: 57, complete: false }
const status = () => ({ available: posts === 0, local_date: '2026-11-25', server_now: new Date().toISOString(), next_available_at: new Date(Date.now() + 36e5).toISOString(), timezone: 'America/Sao_Paulo', complete: false, progress: progresso, today_reward: null })
const env = { ...process.env }
for (const k of ['GTK_PATH', 'GTK_EXE_PREFIX', 'GIO_MODULE_DIR', 'GIO_EXTRA_MODULES', 'GI_TYPELIB_PATH']) if (env[k]?.includes('/snap/')) delete env[k]
const browser = await (motor === 'webkit' ? webkit : chromium).launch(motor === 'webkit' ? { env } : { args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })
await ctx.route('**/api/**', r => {
  const p = new URL(r.request().url()).pathname
  if (p.endsWith('/rewards/open')) { posts++; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ legend: carta, is_new: true, progress: { ...progresso, obtained: 4, remaining: 56 } }) }) }
  const body = p.endsWith('/auth/me') ? { id: 'u', username: 'teste', email: 't@e.invalid' } : p.endsWith('/legends') ? lendas : p.endsWith('/album/progress') ? progresso : status()
  r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
})
const passos = []; const ok = (nome, detalhe = '') => { passos.push(nome); console.log('APROVADO ', nome, detalhe) }
const page = await ctx.newPage(); page.setDefaultTimeout(20000)
const erros = []; page.on('pageerror', e => erros.push(e.message))
try {
  await page.goto(origin + '/?portais=1'); await page.locator('.portal-qr svg').nth(1).waitFor()
  const qr = await page.locator('.portal-qr svg').nth(1).evaluate(svg => 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg)))
  await ctx.addInitScript(qr => {
    const img = new Image(); img.src = qr
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720
    const g = canvas.getContext('2d'); let visivel = true
    const cam = globalThis.camTeste = { chamadas: 0, streams: [], mostrar(v) { visivel = v; pintar() } }
    function pintar() { g.fillStyle = '#888'; g.fillRect(0, 0, 1280, 720); if (visivel && img.complete) g.drawImage(img, 490, 210, 300, 300) }
    cam.getUserMedia = async () => { cam.chamadas++; await img.decode(); pintar(); const t = setInterval(pintar, 66); addEventListener('pagehide', () => clearInterval(t), { once: true }); const s = canvas.captureStream(15); cam.streams.push(s); return s }
    if (globalThis.MediaDevices) Object.defineProperty(MediaDevices.prototype, 'getUserMedia', { value: cam.getUserMedia, configurable: true })
  }, qr)
  await page.goto(origin + '/ra.html'); await page.waitForFunction(() => !document.querySelector('#start').disabled)
  await page.evaluate(() => Object.defineProperty(MediaDevices.prototype, 'getUserMedia', { value: camTeste.getUserMedia, configurable: true }))
  assert.equal(await page.evaluate(() => camTeste.chamadas), 0); ok('câmera não é pedida antes do toque')
  await page.locator('#start').tap()
  await page.waitForFunction(() => document.body.dataset.camera === 'ativa'); ok('câmera iniciada pelo toque')
  await page.locator('#openChest').waitFor({ state: 'visible' }); ok('QR 02 reconhecido', await page.textContent('#status'))
  await page.evaluate(() => camTeste.mostrar(false))
  await page.waitForFunction(() => document.querySelector('#openChest').hidden, null, { timeout: 15000 }); ok('perda do marcador esconde ABRIR BAÚ', await page.textContent('#status'))
  await page.evaluate(() => camTeste.mostrar(true))
  await page.locator('#openChest').waitFor({ state: 'visible' }); ok('marcador reencontrado')
  await page.locator('#openChest').tap(); await page.locator('#openChest').tap({ force: false, trial: false, timeout: 1000 }).catch(() => {})
  await page.locator('#rewardOverlay').waitFor({ state: 'visible', timeout: 20000 })
  assert.equal(posts, 1); ok('baú aberto e carta revelada com um único POST', `(${await page.locator('#rewardOverlay .cardName, #rewardOverlay h2').first().textContent()})`)
  await page.locator('#flipButton').tap(); await page.waitForTimeout(800)
  assert.ok(await page.locator('#rewardOverlay .educational-back').count()); ok('Flip mostra o verso educativo')
  // Sair da RA: o navegador emite pagehide; o handler real libera câmera e WebGL.
  const antes = await page.evaluate(() => camTeste.streams.flatMap(s => s.getTracks().map(t => t.readyState)))
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })))
  await page.waitForTimeout(300)
  const depois = await page.evaluate(() => camTeste.streams.flatMap(s => s.getTracks().map(t => t.readyState)))
  assert.ok(depois.length && depois.every(e => e === 'ended'), `faixas: ${depois}`)
  ok('saída libera a câmera', `${antes.join(',')} → ${depois.join(',')}`)
  console.log(`\n${passos.length}/8 passos aprovados; erros de página: ${erros.length ? erros.join(' | ') : 'nenhum'}`)
} catch (e) {
  console.log('REPROVADO', e.message.split('\n')[0], '\n status:', await page.textContent('#status').catch(() => '?'), '\n erros:', erros.join(' | '))
  process.exitCode = 1
}
await browser.close(); server.close()
