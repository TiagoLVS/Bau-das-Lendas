// Atalhos de apresentação e easter eggs da casa, acionados como um visitante faria
// (teclas, cliques, mouse, rolagem e espera reais). Só observa DOM/estado; não chama
// funções internas para provocar efeitos.
// Uso: node tests/atalhos-easter-eggs-browser.mjs <dist> <saida.json> [chromium|webkit]
import { chromium, webkit } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'

const [dist, saida, motor = 'webkit'] = process.argv.slice(2)
const T = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' }
const server = createServer(async (q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0])
  if (u.startsWith('/api/')) { r.writeHead(401); return r.end('{}') }
  try { const f = join(dist, u); const d = await readFile(f); r.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' }); r.end(d) }
  catch { r.writeHead(404); r.end() }
})
await new Promise(r => server.listen(0, r))
const origin = `http://localhost:${server.address().port}`
const env = { ...process.env }
for (const k of ['GTK_PATH', 'GTK_EXE_PREFIX', 'GIO_MODULE_DIR', 'GIO_EXTRA_MODULES', 'GI_TYPELIB_PATH']) if (env[k]?.includes('/snap/')) delete env[k]
const engine = motor === 'chromium' ? chromium : webkit
const browser = await engine.launch(motor === 'chromium' ? { args: ['--no-sandbox'] } : { env })
const resultados = []
const registrar = (nome, status, detalhe) => { resultados.push({ nome, status, detalhe }); console.log(status.padEnd(10), nome.padEnd(42), detalhe) }

async function novaPagina() {
  const p = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const erros = []; p.on('pageerror', e => erros.push(e.message))
  await p.goto(origin + '/casa/index.html')
  await p.waitForFunction(() => window.Bau?.corredor?.kit?.chao && Bau.eggs && Bau.aparicoes, null, { timeout: 30000 })
  // Espiões apenas de leitura nos sons (o áudio não é audível no teste).
  await p.evaluate(() => { window.__sons = []; for (const k of Object.keys(Bau.som)) if (typeof Bau.som[k] === 'function') { const f = Bau.som[k]; Bau.som[k] = (...a) => { __sons.push(k); return f.apply(Bau.som, a) } } })
  await p.waitForTimeout(800)
  return { p, erros }
}
// Conta elementos adicionados e mudanças de classe do body numa janela de tempo.
const janela = (p, ms) => p.evaluate(ms => new Promise(res => {
  let add = 0; const classes = new Set()
  const mo = new MutationObserver(l => { for (const m of l) { if (m.type === 'childList') add += [...m.addedNodes].filter(n => n.nodeType === 1 && !n.closest?.('.manifestacao')).length; if (m.target === document.body && m.type === 'attributes') document.body.classList.forEach(c => classes.add(c)) } })
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  setTimeout(() => { mo.disconnect(); res({ add, classes: [...classes] }) }, ms)
}), ms)

// 1) Atalhos 1–0 e H, fora e dentro da casa
{
  const { p, erros } = await novaPagina()
  await p.mouse.click(1300, 400) // foco no documento, fora de botões
  const SEL = { 1: '.escrevendo', 2: '.marca-plano', 3: '.marca-plano', 4: '.marca-parede.surgindo', 6: '.olhos-fresta', 7: '.escorregando', 8: '.rachaduras', 9: '.riscos', 0: '.gosma-fresta' }
  const conta = sel => p.evaluate(sel => document.querySelectorAll(sel).length, sel)
  const todos = Object.values(SEL).join(',')
  const foraAntes = await conta(todos); await p.keyboard.press('2'); await p.keyboard.press('6'); await p.waitForTimeout(2000)
  const foraDepois = await conta(todos)
  registrar('Atalhos fora da casa (jardim)', foraDepois === foraAntes ? 'APROVADO' : 'REPROVADO', `sem efeito no jardim, como no código (${foraAntes} → ${foraDepois} marcas)`)
  await p.locator('#nav-corredor').click()
  await p.waitForFunction(() => document.body.classList.contains('dentro'))
  await p.waitForTimeout(9000) // deixa a manifestação de entrada terminar
  await p.mouse.click(1300, 700)
  const nomes = { 1: 'frase na parede', 2: 'pegadas', 3: 'passos no teto', 4: 'mãos', 5: 'apagão', 6: 'olhos na fresta', 7: 'mão escorregando', 8: 'rachaduras', 9: 'arranhões', 0: 'gosma' }
  for (const tecla of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
    if (tecla === '5') {
      const j = janela(p, 1500); await p.keyboard.press(tecla); const r = await j
      registrar('Tecla 5 — apagão', r.classes.includes('apagao') ? 'APROVADO' : 'REPROVADO', `classe apagao no body: ${r.classes.includes('apagao')}`)
    } else {
      // Conta inclusões (não o total): efeitos automáticos antigos podem sumir na mesma janela.
      const novos = p.evaluate(([sel, ms]) => new Promise(res => { let n = 0; const mo = new MutationObserver(l => { for (const m of l) for (const no of m.addedNodes) if (no.nodeType === 1 && (no.matches(sel) || no.querySelector?.(sel))) n++ }); mo.observe(document.body, { childList: true, subtree: true }); setTimeout(() => { mo.disconnect(); res(n) }, ms) }), [SEL[tecla], 2200])
      await p.keyboard.press(tecla); const n = await novos
      registrar(`Tecla ${tecla} — ${nomes[tecla]}`, n > 0 ? 'APROVADO' : 'REPROVADO', `${SEL[tecla]}: ${n} incluído(s)`)
    }
    await p.waitForTimeout(400)
  }
  await p.evaluate(() => { __sons.length = 0 })
  await p.keyboard.press('h'); await p.waitForTimeout(300)
  const sons = await p.evaluate(() => [...__sons])
  registrar('Tecla H — risada', sons.includes('risada') ? 'APROVADO' : 'REPROVADO', `sons chamados: ${sons.join(',') || '—'} (áudio não verificável)`)
  registrar('Erros de página (atalhos)', erros.length ? 'REPROVADO' : 'APROVADO', erros.join(' | ') || 'nenhum')
  await p.close()
}

// 2) Loira do Banheiro: digitar "loira" três vezes
{
  const { p } = await novaPagina()
  await p.locator('#nav-corredor').click(); await p.waitForFunction(() => document.body.classList.contains('dentro'))
  await p.mouse.click(1300, 700)
  let viu = false
  const obs = p.evaluate(() => new Promise(res => { const mo = new MutationObserver(() => { if (document.querySelector('.rosto-espelho')) { mo.disconnect(); res(true) } }); mo.observe(document.body, { childList: true }); setTimeout(() => res(false), 8000) }))
  for (let i = 0; i < 3; i++) { await p.keyboard.type('loira', { delay: 60 }); await p.waitForTimeout(300) }
  viu = await obs
  registrar('Easter egg Loira (digitar "loira" 3×)', viu ? 'APROVADO' : 'REPROVADO', viu ? 'rosto no espelho exibido' : 'rosto não apareceu')
  await p.close()
}

// 3) Saci: clicar no gorro vermelho (procura o registro em que ele está visível)
{
  const { p } = await novaPagina()
  await p.locator('#nav-corredor').click(); await p.waitForFunction(() => document.body.classList.contains('dentro'))
  // O gorro fica na parede direita da ala brasileira: o visitante precisa virar a
  // cabeça para a direita (mouse perto da borda) nos primeiros registros.
  let achou = null
  for (let i = 0; i < 8 && !achou; i++) {
    await p.evaluate(i => Bau.corredor.irPara(i), i) // navegação pública da casa (mesma dos botões ‹ ›)
    await p.waitForTimeout(1000)
    for (const mx of [683, 1250, 1360]) {
      await p.mouse.move(mx, 384); await p.waitForTimeout(900)
      achou = await p.evaluate(() => { const g = document.querySelector('.gorro-saci'); const r = g?.getBoundingClientRect(); if (!r || r.width < 8 || r.left < 0 || r.right > innerWidth) return null; const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return t && (t === g || g.contains(t)) ? { x, y } : null })
      if (achou) { achou.registro = i + 1; achou.mouse = mx; break }
    }
  }
  if (!achou) registrar('Easter egg Saci (clique no gorro)', 'BLOQUEADO', 'gorro não ficou clicável na tela em nenhum registro')
  else {
    await p.evaluate(() => { __sons.length = 0 })
    await p.mouse.click(achou.x, achou.y)
    await p.waitForTimeout(1300)
    const r = await p.evaluate(() => ({ redemoinho: !!document.querySelector('.redemoinho'), sons: [...__sons] }))
    registrar('Easter egg Saci (clique no gorro)', r.redemoinho || r.sons.includes('vento') ? 'APROVADO' : 'REPROVADO', `registro ${achou.registro}, olhando à direita (mouse x=${achou.mouse}); redemoinho=${r.redemoinho}; sons=${r.sons.join(',') || '—'}`)
  }
  await p.close()
}

// 4) Curupira: mover o mouse pelas pegadas na ala brasileira (registro 1)
{
  const { p } = await novaPagina()
  await p.locator('#nav-corredor').click(); await p.waitForFunction(() => document.body.classList.contains('dentro'))
  await p.waitForTimeout(1500)
  const antes = await p.evaluate(() => document.querySelectorAll('.pegada').length)
  for (let i = 0; i < 40; i++) { await p.mouse.move(300 + i * 20, 500 + (i % 2) * 30); await p.waitForTimeout(40) }
  const depois = await p.evaluate(() => document.querySelectorAll('.pegada').length)
  registrar('Easter egg Curupira (mouse na ala brasileira)', depois > antes ? 'APROVADO' : 'REPROVADO', `pegadas: ${antes} → ${depois}`)
  await p.close()
}

// 5) Kisaragi Station: avançar além da última lenda
{
  const { p } = await novaPagina()
  await p.locator('#nav-corredor').click(); await p.waitForFunction(() => document.body.classList.contains('dentro'))
  await p.mouse.click(1300, 700)
  for (let i = 0; i < 70 && !(await p.evaluate(() => Bau.corredor.estado.kisaragi)); i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(120) }
  await p.mouse.move(683, 400)
  for (let i = 0; i < 8 && !(await p.evaluate(() => Bau.corredor.estado.kisaragi)); i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(300) }
  await p.waitForTimeout(2500)
  const r = await p.evaluate(() => ({ k: Bau.corredor.estado.kisaragi, registro: Bau.corredor.estado.i + 1, placa: getComputedStyle(document.querySelector('.kisaragi')).opacity, sons: [...__sons] }))
  registrar('Easter egg Kisaragi (além da última lenda)', r.k && Number(r.placa) > 0.5 ? 'APROVADO' : 'REPROVADO', `registro ${r.registro}; placa opacidade ${r.placa}; trem=${r.sons.includes('trem')}`)
  await p.close()
}

// 6) Hachishakusama: ~30 s sem se mover dentro da casa
{
  const { p } = await novaPagina()
  await p.locator('#nav-corredor').click(); await p.waitForFunction(() => document.body.classList.contains('dentro'))
  await p.evaluate(() => { __sons.length = 0 })
  await p.waitForTimeout(25000)
  const cedo = await p.evaluate(() => __sons.includes('popopo'))
  await p.waitForTimeout(9000)
  const r = await p.evaluate(() => ({ som: __sons.includes('popopo'), pegadasGrandes: [...document.querySelectorAll('.marca-plano')].filter(m => m.style.transform.includes('rotate(180deg)')).length }))
  registrar('Easter egg Hachishakusama (~30 s parado)', !cedo && r.som && r.pegadasGrandes > 0 ? 'APROVADO' : 'REPROVADO', `antes de 25 s: ${cedo ? 'disparou cedo' : 'nada'}; após 34 s: po-po-po=${r.som}, pegadas grandes=${r.pegadasGrandes}`)
  await p.close()
}

await writeFile(saida, JSON.stringify({ motor, navegador: browser.version(), resultados }, null, 2))
await browser.close(); server.close()
const falhas = resultados.filter(r => r.status !== 'APROVADO').length
console.log(`\n${resultados.length - falhas}/${resultados.length} aprovados`)
