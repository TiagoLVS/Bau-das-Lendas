// Primeiro acesso em "celular de entrada" emulado: Chromium 390×844, toque, CPU 4× mais lenta.
// Mede transferência por tipo, tempos, trabalho em repouso (CDP), DOM e heap JS no build de produção.
// API simulada apenas no navegador de teste (usuário fictício). Nenhum banco é usado.
// Uso: node tests/mobile-entrada.mjs <dist> <saida.json> [amostras=2]
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const [dist, saida, n = '2'] = process.argv.slice(2)
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' }
const server = createServer(async (q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); let f = join(dist, u); if (u.endsWith('/')) f = join(f, 'index.html')
  try { const d = await readFile(f); r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream', 'content-length': d.length }); r.end(d) }
  catch { const d = await readFile(join(dist, 'index.html')); r.writeHead(200, { 'content-type': 'text/html' }); r.end(d) }
})
await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = `http://localhost:${server.address().port}`
const lendas = JSON.parse(await readFile('public/lendas-ra.json', 'utf8'))
const ok = new Set([1, 2, 3, 4, 5, 6, 7, 8])
const album = { positions: lendas.map(l => ({ numero: l.numero, unlocked: ok.has(l.numero), legend: ok.has(l.numero) ? l : null, collected_at: null })), progress: { total: 60, obtained: 8, remaining: 52, complete: false } }
const status = { available: true, local_date: '2026-11-25', server_now: new Date().toISOString(), next_available_at: new Date().toISOString(), timezone: 'America/Sao_Paulo', complete: false, progress: album.progress, today_reward: null }
const api = p => p.endsWith('/auth/me') ? { id: 'u', username: 'teste', email: 't@e.invalid' } : p.endsWith('/album') ? album : p.endsWith('/album/progress') ? album.progress : p.endsWith('/legends') ? lendas : p.includes('/rewards/history') ? { items: [], total: 0, limit: 10, offset: 0, has_more: false } : status

const telas = [['Início', '/'], ['Álbum', '/?album=1'], ['Casa', '/casa/index.html'], ['Galeria', '/casa/cartas.html'], ['RA (antes da câmera)', '/ra.html']]
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] })
const out = { condicoes: 'Chromium headless, 390x844, toque, CPU 4x (CDP), sem limitação de rede, GPU por software, build de produção', amostras: [] }
for (let a = 1; a <= Number(n); a++) {
  for (const [nome, rota] of telas) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await ctx.route('**/api/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(api(new URL(r.request().url()).pathname)) }))
    const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable')
    const bytes = {}; let reqs = 0
    p.on('response', async res => { if (res.url().includes('/api/')) return; reqs++; const t = (res.headers()['content-type'] || '?').split(/[/;]/)[res.headers()['content-type']?.startsWith('image') ? 0 : 1] || '?'; const l = Number(res.headers()['content-length'] || 0); bytes[t] = (bytes[t] || 0) + l })
    const t0 = Date.now(); await p.goto(origin + rota, { waitUntil: 'load', timeout: 120000 }); const load = Date.now() - t0
    await p.waitForTimeout(6000)
    const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]))
    await p.waitForTimeout(5000)
    const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]))
    const r = await p.evaluate(() => ({ dom: document.querySelectorAll('*').length, dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) }))
    const kb = Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, +(v / 1024).toFixed(0)]))
    const linha = { amostra: a, tela: nome, loadMs: load, dclMs: r.dcl, requisicoes: reqs, totalKB: +(Object.values(bytes).reduce((s, v) => s + v, 0) / 1024).toFixed(0), porTipoKB: kb, repousoTarefasMsPorSeg: +((m1.TaskDuration - m0.TaskDuration) * 1000 / 5).toFixed(0), dom: r.dom, heapMB: +(m1.JSHeapUsedSize / 1048576).toFixed(1) }
    out.amostras.push(linha)
    console.log(`${a} ${nome.padEnd(22)} load ${String(load).padStart(5)} ms  ${String(linha.totalKB).padStart(5)} KB/${reqs} req  repouso ${String(linha.repousoTarefasMsPorSeg).padStart(4)} ms/s  DOM ${r.dom}  heap ${linha.heapMB} MB  ${JSON.stringify(kb)}`)
    await ctx.close()
  }
}
await writeFile(saida, JSON.stringify(out, null, 2)); await browser.close(); server.close()
