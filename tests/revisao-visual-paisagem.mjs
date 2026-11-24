// Alcance real das ações do limiar da casa (retrato e paisagem).
// Rodada 2: substitui a versão que usava scrollIntoView (que rola até contêineres
// overflow:hidden e, por isso, aprovava o build defeituoso).
//
// Regras: somente gestos de usuário (toque via CDP no Chromium; roda do mouse no
// WebKit e no desktop), hit testing pelo ponto central, controle inteiro dentro da
// viewport, clique real sem force e verificação do efeito do clique.
// Uso: node tests/revisao-visual-paisagem.mjs <dist> <prefixo-saida>
import { chromium, webkit } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const [dist, out] = process.argv.slice(2)
const T = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml' }
const server = createServer(async (q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0])
  if (u.startsWith('/api/')) { r.writeHead(401, { 'content-type': 'application/json' }); return r.end('{}') }
  try { const f = join(dist, u); const d = await readFile(f); r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }); r.end(d) }
  catch { r.writeHead(404); r.end() }
})
await new Promise(r => server.listen(0, r))
const origin = `http://localhost:${server.address().port}`
const env = { ...process.env }
for (const k of ['GTK_PATH', 'GTK_EXE_PREFIX', 'GIO_MODULE_DIR', 'GIO_EXTRA_MODULES', 'GI_TYPELIB_PATH']) if (env[k]?.includes('/snap/')) delete env[k]

const controles = [
  { nome: 'Entrar direto na casa', sel: '#nav-corredor', efeito: 'dentro' },
  { nome: 'Seguir as pegadas', sel: '#btn-entrar', efeito: 'abrindo' },
  { nome: 'Abrir o baú em RA', sel: '#limiar a[data-rota="ra"]', efeito: 'ra' },
]
const viewports = [[390, 844], [360, 800], [320, 568], [844, 390], [568, 320], [1366, 768]]
const report = []

async function abrir(browser, name, w, h) {
  const touch = w < 900
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && name === 'Chromium' })
  const p = await ctx.newPage()
  await p.goto(`${origin}/casa/index.html`)
  await p.waitForFunction(() => window.Bau?.corredor?.kit?.chao, null, { timeout: 30000 })
  await p.waitForTimeout(1200)
  return { ctx, p, touch }
}

// Estado do controle visto pelo usuário: inteiro na viewport e de fato sob o ponto central.
const estado = (p, sel) => p.evaluate(sel => {
  const el = document.querySelector(sel)
  if (!el) return { existe: false }
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2
  const dentro = r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth
  const topo = dentro ? document.elementFromPoint(cx, cy) : null
  const acertou = !!topo && (topo === el || el.contains(topo))
  // O limiar precisa continuar exibido: gestos que fazem atravessar o jardim escondem o texto.
  const limiar = document.getElementById('limiar')
  const exibido = !limiar.inert && Number(getComputedStyle(limiar).opacity) > 0.5 && !document.body.classList.contains('abrindo') && !document.body.classList.contains('dentro')
  return { existe: true, dentro, acertou: acertou && exibido, exibido, cobertoPor: acertou || !topo ? null : (topo.id || topo.className || topo.tagName), rect: [Math.round(r.top), Math.round(r.bottom)] }
}, sel)

// Um gesto de rolagem do usuário sobre o bloco de texto do limiar.
async function gesto(p, name, touch, cdp) {
  const box = await p.locator('#limiar-texto').boundingBox()
  const x = Math.round(box.x + Math.min(box.width / 2, 120)), y = Math.round(box.y + box.height * 0.8)
  if (name === 'Chromium' && touch) {
    // Arrasto real de toque (touchStart → touchMove → touchEnd). synthesizeScrollGesture
    // foi descartado: não rola nem um contêiner simples neste Chromium headless.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 14 }] }); await p.waitForTimeout(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } else {
    await p.mouse.move(x, y)
    await p.mouse.wheel(0, 140)
  }
  await p.waitForTimeout(250)
}

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await engine.launch({ env, args: engine === chromium ? ['--no-sandbox'] : [] })
  for (const [w, h] of viewports) {
    for (const c of controles) {
      const linha = { engine: name, viewport: `${w}x${h}`, controle: c.nome, gestos: 0, metodo: '', status: 'REPROVADO', motivo: '' }
      const { ctx, p, touch } = await abrir(browser, name, w, h)
      linha.metodo = name === 'Chromium' && touch ? 'arrasto de toque (CDP dispatchTouchEvent)' : 'roda do mouse'
      const cdp = name === 'Chromium' ? await ctx.newCDPSession(p) : null
      try {
        let s = await estado(p, c.sel)
        if (!s.existe) throw Error('controle inexistente')
        while (!(s.dentro && s.acertou) && linha.gestos < 8) { await gesto(p, name, touch, cdp); linha.gestos++; s = await estado(p, c.sel) }
        linha.rolagem = await p.evaluate(() => ({ limiarTexto: document.querySelector('#limiar-texto').scrollTop, documento: scrollY }))
        if (!(s.dentro && s.acertou)) throw Error(`inalcançável após ${linha.gestos} gestos: ${!s.exibido ? 'o gesto atravessou o jardim e escondeu o limiar' : s.dentro ? 'coberto por ' + s.cobertoPor : 'fora da viewport ' + JSON.stringify(s.rect)}`)
        // Clique real, sem force; o efeito confirma que o controle funcionou.
        let navegou = null
        if (c.efeito === 'ra') await p.route('**/ra.html', r => { navegou = r.request().url(); r.fulfill({ contentType: 'text/html', body: 'ok' }) })
        const antes = await p.evaluate(() => [...document.body.classList])
        if (antes.includes('abrindo') || antes.includes('dentro')) throw Error('efeito já presente antes do clique')
        await p.locator(c.sel).click({ timeout: 4000 })
        if (c.efeito === 'ra') { await p.waitForTimeout(800); if (!navegou) throw Error('clique não navegou para /ra.html') }
        else await p.waitForFunction(cls => document.body.classList.contains(cls) || document.body.classList.contains('dentro'), c.efeito, { timeout: 6000 })
        linha.status = 'APROVADO'
      } catch (e) { linha.motivo = e.message.split('\n')[0].slice(0, 200) }
      report.push(linha)
      console.log(name, linha.viewport, c.nome.padEnd(22), linha.status, `gestos=${linha.gestos}`, linha.motivo)
      await ctx.close()
    }
    const { ctx, p } = await abrir(browser, name, w, h)
    await p.screenshot({ path: `${out}-${name}-${w}x${h}.png` })
    await ctx.close()
  }
  await browser.close()
}
await writeFile(`${out}-report.json`, JSON.stringify(report, null, 2))
server.close()
const falhas = report.filter(r => r.status !== 'APROVADO').length
console.log(`\n${report.length - falhas}/${report.length} aprovados`)
process.exitCode = falhas ? 1 : 0
