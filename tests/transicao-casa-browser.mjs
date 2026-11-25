// Transição Início → casa: capturas durante a travessia e regras de uso.
// Uso: node tests/transicao-casa-browser.mjs <dist> <pasta-saida>
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'; import { readFile, mkdir } from 'node:fs/promises'; import { join, extname } from 'node:path'
const [dist = 'dist', out = 'tests/artifacts/transicao'] = process.argv.slice(2); await mkdir(out, { recursive: true })
const T = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' }
const s = createServer(async (q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u.startsWith('/api/')) { r.writeHead(401); return r.end('{}') } let f = join(dist, u); if (u.endsWith('/')) f = join(f, 'index.html'); try { const d = await readFile(f); r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }); r.end(d) } catch { r.writeHead(200, { 'content-type': 'text/html' }); r.end(await readFile(join(dist, 'index.html'))) } })
await new Promise(r => s.listen(0, r)); const origin = `http://localhost:${s.address().port}`
const b = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] })
const ok = (n, d = '') => console.log('APROVADO ', n, d)
try {
  // 1) Travessia normal, com capturas
  { const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
    await p.goto(origin + '/'); await p.locator('header.menu').waitFor(); await p.waitForTimeout(2500)
    const t0 = Date.now(); await p.mouse.move(195, 420); await p.mouse.wheel(0, 300)
    for (const ms of [250, 550]) { await p.waitForTimeout(Math.max(0, ms - (Date.now() - t0))); await p.screenshot({ path: `${out}/1-inicio-${ms}ms.png` }) }
    await p.waitForURL('**/casa/index.html', { timeout: 5000 }); const nav = Date.now() - t0
    const t1 = Date.now(); assert.equal(await p.evaluate(() => document.documentElement.classList.contains('chegando')), true)
    for (const ms of [150, 650, 1500]) { await p.waitForTimeout(Math.max(0, ms - (Date.now() - t1))); await p.screenshot({ path: `${out}/2-casa-${ms}ms.png` }) }
    assert.equal(await p.evaluate(() => sessionStorage.getItem('bau-travessia')), null)
    await p.locator('#nav-corredor').tap(); await p.waitForFunction(() => document.body.classList.contains('dentro'), null, { timeout: 8000 })
    ok('travessia com véu', 'casa clicável depois da chegada'); await p.close() }
  // 1b) Duração da saída medida dentro da página (da classe .saindo até o beforeunload);
  //     o relógio do teste inclui o atraso do Playwright para entregar a rolagem.
  { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); await p.goto(origin + '/'); await p.locator('header.menu').waitFor(); await p.waitForTimeout(2000)
    await p.evaluate(() => { const t = {}; new MutationObserver(() => { if (document.querySelector('.saindo') && !t.saindo) t.saindo = performance.now() }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }); addEventListener('beforeunload', () => sessionStorage.setItem('t-saida', String(performance.now() - t.saindo))) })
    await p.mouse.move(195, 420); await p.mouse.wheel(0, 300); await p.waitForURL('**/casa/index.html', { timeout: 8000 })
    const ms = Math.round(Number(await p.evaluate(() => sessionStorage.getItem('t-saida'))))
    assert.ok(ms >= 650 && ms < 900, `${ms} ms`); ok('duração da saída', `${ms} ms do véu até chamar a casa`); await p.close() }
  // 2) Casa aberta diretamente: sem véu
  { const p = await b.newPage({ viewport: { width: 390, height: 844 } }); await p.goto(origin + '/casa/index.html')
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('chegando')), false); ok('acesso direto à casa sem véu'); await p.close() }
  // 3) Movimento reduzido: troca imediata
  { const c = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await c.newPage()
    await p.goto(origin + '/'); await p.locator('header.menu').waitFor(); await p.waitForTimeout(1500)
    await p.evaluate(() => new MutationObserver(() => { if (document.querySelector('.saindo')) sessionStorage.setItem('viu-saindo', '1') }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }))
    await p.mouse.move(195, 420); await p.mouse.wheel(0, 300); await p.waitForURL('**/casa/index.html', { timeout: 8000, waitUntil: 'commit' })
    await p.waitForLoadState('domcontentloaded')
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('chegando')), true, 'casa não recebeu o véu de chegada')
    assert.equal(await p.evaluate(() => sessionStorage.getItem('viu-saindo')), null, 'houve véu de saída com movimento reduzido')
    assert.ok(parseFloat(await p.evaluate(() => getComputedStyle(document.documentElement, '::after').animationDuration)) < 0.05, 'véu de chegada não é instantâneo')
    ok('movimento reduzido: saída imediata e véu de chegada instantâneo'); await c.close() }
} catch (e) { console.log('REPROVADO', e.message.split('\n')[0]); process.exitCode = 1 }
await b.close(); s.close()
