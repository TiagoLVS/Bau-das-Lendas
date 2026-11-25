// Início: 3D só quando visível, e o site continua utilizável sem WebGL.
// Uso: node tests/inicio-compatibilidade.mjs <dist>
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path'
const dist = process.argv[2] || 'dist'
const T = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' }
const s = createServer(async (q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u.startsWith('/api/')) { r.writeHead(401); return r.end('{}') } try { const f = join(dist, u); const d = await readFile(f); r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }); r.end(d) } catch { r.writeHead(200, { 'content-type': 'text/html' }); r.end(await readFile(join(dist, 'index.html'))) } })
await new Promise(r => s.listen(0, r)); const origin = `http://localhost:${s.address().port}`
const casos = [
  ['Álbum por link direto não baixa o 3D', [], '/?album=1', async (p, js) => { await p.locator('.grimorio').waitFor(); await p.waitForTimeout(2500); assert.ok(!js.some(u => u.includes('World3D')), 'World3D baixado') }],
  ['Fechar o Álbum carrega o 3D do Início', [], '/?album=1', async p => { await p.locator('.grimorio').waitFor(); await p.getByRole('button', { name: /fechar/i }).first().click(); await p.waitForSelector('.world3d canvas', { timeout: 30000 }) }],
  ['Sem WebGL: Início, menu e Álbum continuam funcionando', ['--disable-3d-apis', '--disable-webgl'], '/', async (p, js, erros) => {
    await p.locator('header.menu').waitFor(); await p.waitForTimeout(3000)
    assert.ok(await p.locator('.world3d--carregando').isVisible(), 'fundo em CSS ausente')
    assert.equal(await p.locator('.world3d canvas').count(), 0)
    await p.goto(origin + '/?album=1'); await p.locator('.grimorio').waitFor()
    return `erros capturados pela contenção: ${erros.length}` }],
]
const b0 = []
for (const [nome, args, rota, verificar] of casos) {
  const b = await chromium.launch({ args: ['--no-sandbox', ...args, ...(args.length ? [] : ['--use-gl=angle', '--use-angle=swiftshader'])] })
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const js = []; const erros = []
  p.on('request', r => r.url().endsWith('.js') && js.push(r.url())); p.on('pageerror', e => erros.push(e.message))
  try { await p.goto(origin + rota); const extra = await verificar(p, js, erros); console.log('APROVADO ', nome, extra || '') }
  catch (e) { console.log('REPROVADO', nome, e.message.split('\n')[0]); process.exitCode = 1 }
  await b.close()
}
s.close()

// RA sem WebGL: mensagem clara, botão desabilitado e caminho para o Grimório.
{
  const s2 = createServer(async (q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u.startsWith('/api/')) { r.writeHead(401); return r.end('{}') } try { const f = join(dist, u); const d = await readFile(f); r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }); r.end(d) } catch { r.writeHead(404); r.end() } })
  await new Promise(r => s2.listen(0, r))
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-3d-apis', '--disable-webgl'] }); const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  try {
    await p.goto(`http://localhost:${s2.address().port}/ra.html`); await p.waitForFunction(() => /WebGL/.test(document.querySelector('#status').textContent), null, { timeout: 15000 })
    assert.equal(await p.locator('#start').isDisabled(), true); assert.equal(await p.locator('#status a[href="/?album=1"]').count(), 1)
    console.log('APROVADO  RA sem WebGL: mensagem clara, botão desabilitado e link para o Grimório')
  } catch (e) { console.log('REPROVADO RA sem WebGL', e.message.split('\n')[0]); process.exitCode = 1 }
  await b.close(); s2.close()
}
