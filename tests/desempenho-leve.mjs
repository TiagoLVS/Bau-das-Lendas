// Medição leve de custo por quadro (uma aba, um motor, uma amostra).
// Mede o trabalho do navegador com métricas CDP do Chromium, que independem da GPU:
// recálculo de estilo, layout, script e tarefas; e conta quadros por RAF.
// Uso: node tests/desempenho-leve.mjs <origem|dist> <saida.json>
//   <origem> = http://localhost:5175 (Vite dev) ou caminho de um dist (servido localmente).
// A API é respondida com 401 quando servimos um dist; nenhum banco é usado.
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const [alvo, saida] = process.argv.slice(2)
let origin = alvo, server = null
if (!/^https?:/.test(alvo)) {
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml' }
  server = createServer(async (q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0])
    if (u.startsWith('/api/')) { r.writeHead(401, { 'content-type': 'application/json' }); return r.end('{}') }
    let f = join(alvo, u); if (u.endsWith('/')) f = join(f, 'index.html')
    try { const d = await readFile(f); r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }); r.end(d) }
    catch { r.writeHead(200, { 'content-type': 'text/html' }); r.end(await readFile(join(alvo, 'index.html'))) }
  })
  await new Promise(r => server.listen(0, r)); origin = `http://localhost:${server.address().port}`
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] })
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
const p = await ctx.newPage()
const cdp = await ctx.newCDPSession(p)
await cdp.send('Performance.enable')
const NOMES = ['RecalcStyleCount', 'RecalcStyleDuration', 'LayoutCount', 'LayoutDuration', 'ScriptDuration', 'TaskDuration', 'JSHeapUsedSize', 'Nodes']
const ler = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(m => NOMES.includes(m.name)).map(m => [m.name, m.value]))

async function janela(rotulo, ms, acao) {
  const a = await ler()
  const quadros = p.evaluate(ms => new Promise(res => { let n = 0; const t0 = performance.now(); (function f(t) { n++; if (t - t0 < ms) requestAnimationFrame(f); else res(n) })(t0) }), ms)
  if (acao) await acao()
  const n = await quadros
  const b = await ler()
  const d = k => +(b[k] - a[k]).toFixed(k.endsWith('Duration') ? 3 : 0)
  const s = ms / 1000
  return { rotulo, segundos: s, quadros: n,
    estilosPorSeg: +(d('RecalcStyleCount') / s).toFixed(1), estiloMsPorSeg: +(d('RecalcStyleDuration') * 1000 / s).toFixed(1),
    layoutsPorSeg: +(d('LayoutCount') / s).toFixed(1), layoutMsPorSeg: +(d('LayoutDuration') * 1000 / s).toFixed(1),
    scriptMsPorSeg: +(d('ScriptDuration') * 1000 / s).toFixed(1), tarefaMsPorSeg: +(d('TaskDuration') * 1000 / s).toFixed(1),
    heapMB: +(b.JSHeapUsedSize / 1048576).toFixed(1), nos: b.Nodes }
}

const r = { origem: alvo, navegador: browser.version(), modo: 'headless, SwiftShader (GPU por software): compara trabalho de CPU, não desempenho de aparelho', medidas: [] }
const t0 = Date.now()
await p.goto(origin + '/', { waitUntil: 'domcontentloaded' })
await p.locator('header.menu').waitFor()
r.inicioUiMs = Date.now() - t0
await p.waitForFunction(() => document.querySelector('.world3d canvas'), null, { timeout: 60000 })
r.inicio3dMs = Date.now() - t0
await p.waitForTimeout(3000)
r.medidas.push(await janela('Início em repouso', 5000))

await p.goto(origin + '/casa/index.html', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => window.Bau?.corredor?.kit?.chao, null, { timeout: 60000 })
await p.waitForTimeout(3000)
r.medidas.push(await janela('Casa: jardim em repouso', 5000))
await p.locator('#nav-corredor').click()
await p.waitForFunction(() => document.body.classList.contains('dentro'), null, { timeout: 15000 })
await p.waitForTimeout(4000)
r.medidas.push(await janela('Casa: corredor em repouso', 5000))
r.medidas.push(await janela('Casa: corredor caminhando', 5000, async () => {
  await p.mouse.move(683, 400)
  for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(450) }
}))
r.domCasa = await p.evaluate(() => document.querySelectorAll('*').length)
await writeFile(saida, JSON.stringify(r, null, 2))
for (const m of r.medidas) console.log(m.rotulo.padEnd(28), `estilos ${m.estilosPorSeg}/s (${m.estiloMsPorSeg} ms/s)`, `layout ${m.layoutsPorSeg}/s (${m.layoutMsPorSeg} ms/s)`, `script ${m.scriptMsPorSeg} ms/s`, `tarefas ${m.tarefaMsPorSeg} ms/s`, `quadros ${m.quadros}`, `heap ${m.heapMB} MB`)
console.log('UI', r.inicioUiMs, 'ms · 3D', r.inicio3dMs, 'ms · DOM casa', r.domCasa)
await browser.close(); server?.close()
