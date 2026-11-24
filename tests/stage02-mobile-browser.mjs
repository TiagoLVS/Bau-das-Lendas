// Somente API de teste explicitamente autorizada; não aponta para produção por padrão.
import assert from 'node:assert/strict'
import { chromium, webkit } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const origin = process.env.BAU_TEST_ORIGIN
if (!origin || !['http://localhost:5175', 'http://127.0.0.1:5175'].includes(origin))
  throw Error('Defina BAU_TEST_ORIGIN local e use exclusivamente a API com banco bau_test.')
const results = []
for (const [name, engine, viewport] of [
  ['Android Chromium', chromium, { width: 360, height: 800 }],
  ['iPhone WebKit', webkit, { width: 390, height: 844 }],
]) {
  let browser
  try {
    browser = await engine.launch({ headless: true, args: name.includes('Chromium') ? ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] : [] })
  } catch {
    results.push({ name, status: 'BLOQUEADO', reason: 'Navegador ou bibliotecas do sistema indisponíveis' })
    continue
  }
  try {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    const email = `stage02-${randomUUID()}@example.com`
    const password = `stage02-${randomUUID()}`
    await page.goto(`${origin}/?conta=1`)
    await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click()
    await page.locator('input[name=username]').fill('Teste Etapa Dois')
    await page.locator('input[name=email]').fill(email)
    await page.locator('input[name=password]').fill(password)
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await page.getByText('Bem-vindo, Teste Etapa Dois.', { exact: false }).waitFor()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    assert.equal(overflow, false, 'Rolagem horizontal no perfil')
    await page.reload()
    await page.getByText('Bem-vindo, Teste Etapa Dois.', { exact: false }).waitFor()
    const headers = { Origin: origin, 'X-Bau-Request': '1' }
    assert.equal((await context.request.get(`${origin}/api/legends`)).status(), 200)
    const draw = await context.request.post(`${origin}/api/draws`, { headers: { ...headers, 'Idempotency-Key': randomUUID() } })
    assert.equal(draw.status(), 200)
    assert.equal((await (await context.request.get(`${origin}/api/album`)).json()).progress.obtained, 1)
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click()
    await page.locator('input[name=email]').fill(email)
    await page.locator('input[name=password]').fill(password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByText('Bem-vindo, Teste Etapa Dois.', { exact: false }).waitFor()
    assert.equal((await context.request.get(`${origin}/models/bau-das-lendas.glb`)).status(), 200)
    assert.equal((await context.request.get(`${origin}/casa/img/cartas/loira.jpg`)).status(), 200)
    await page.goto(`${origin}/?album=1`)
    await page.getByRole('dialog', { name: 'Grimório dos Esquecidos', exact: true }).waitFor()
    await page.route('**/api/**', route => route.abort())
    await page.goto(`${origin}/?conta=1`)
    await page.getByText(/Não foi possível acessar a API/).waitFor()
    results.push({ name, status: 'APROVADO', overflowPerfil: overflow, checks: 'cadastro, sessão após reload, catálogo, sorteio, álbum, logout/login, GLB/imagem e falha de rede' })
  } catch (error) {
    results.push({ name, status: 'REPROVADO', reason: error.message.split('\n').slice(0, 3).join(' ') })
  } finally { await browser.close() }
}
console.log(JSON.stringify(results, null, 2))
if (results.some(r => r.status === 'REPROVADO')) process.exitCode = 1
