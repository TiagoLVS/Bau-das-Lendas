// Autenticação real; executar somente com API configurada para o banco isolado bau_test.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chromium, webkit } from '@playwright/test'
const origin = process.env.BAU_TEST_ORIGIN
if (!['http://localhost:5175', 'http://127.0.0.1:5175'].includes(origin)) throw Error('Defina BAU_TEST_ORIGIN local de testes.')
const results = []
for (const [name, engine] of [['Chromium móvel', chromium], ['WebKit móvel', webkit]]) {
  let browser
  // O terminal Snap pode injetar módulos GIO incompatíveis com o WebKit baixado.
  // Isolamos apenas o ambiente do navegador, sem mudar o sistema ou suas proteções.
  const browserEnv = { ...process.env }
  if (engine === webkit) for (const key of ['GTK_PATH', 'GTK_EXE_PREFIX', 'GIO_MODULE_DIR', 'GIO_EXTRA_MODULES', 'GI_TYPELIB_PATH']) {
    if (browserEnv[key]?.includes('/snap/')) delete browserEnv[key]
  }
  try { browser = await engine.launch({ headless: true, env: browserEnv, args: engine === chromium ? ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] : [] }) }
  catch { results.push({ name, status: 'BLOQUEADO', reason: 'Bibliotecas do sistema indisponíveis' });continue }
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    const credentials = { email: `security-${randomUUID()}@example.com`, password: randomUUID() }
    await page.goto(`${origin}/?conta=1`)
    await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click()
    await page.locator('[name=username]').fill('Conta Segurança A')
    await page.locator('[name=email]').fill(credentials.email)
    await page.locator('[name=password]').fill(credentials.password)
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await page.getByText('Bem-vindo, Conta Segurança A.', { exact: false }).waitFor()
    await page.reload()
    await page.getByText('Bem-vindo, Conta Segurança A.', { exact: false }).waitFor()
    const headers = { Origin: origin, 'X-Bau-Request': '1' }
    assert.equal((await context.request.post(`${origin}/api/draws`, { headers: { ...headers, 'Idempotency-Key': randomUUID() } })).status(), 200)
    const ritual = await context.newPage()
    await ritual.goto(`${origin}/ra.html`)
    await ritual.waitForFunction(() => document.querySelector('#progress').textContent.startsWith('1 / 60'))
    const revoked = await context.request.post(`${origin}/api/auth/logout`, { headers })
    assert.equal(revoked.status(), 204)
    // A revogação ocorre no servidor; a outra aba descobre via 401 e informa as demais.
    await ritual.evaluate(async () => { const { api } = await import('/api.js');try { await api('/auth/me') } catch {} })
    await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor()
    await ritual.waitForFunction(() => document.querySelector('#openChest').hidden && document.querySelector('#rewardOverlay').hidden)
    assert.equal(await page.getByText('Bem-vindo, Conta Segurança A.', { exact: false }).count(), 0)
    await page.locator('[name=email]').fill(credentials.email)
    await page.locator('[name=password]').fill(credentials.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByText('Bem-vindo, Conta Segurança A.', { exact: false }).waitFor()
    await ritual.waitForFunction(() => document.querySelector('#progress').textContent.startsWith('1 / 60'))
    let release, captured
    const blocked = new Promise(resolve => { release = resolve })
    const ready = new Promise(resolve => { captured = resolve })
    await ritual.route('**/api/album', async route => { const response = await route.fetch();captured();await blocked;await route.fulfill({ response }) })
    await ritual.evaluate(() => { window.staleRequest = import('/api.js').then(m => m.api('/album')).then(() => 'private-data-returned', e => e.status) })
    await ready
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click()
    await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click()
    await page.locator('[name=username]').fill('Conta Segurança B')
    await page.locator('[name=email]').fill(`security-b-${randomUUID()}@example.com`)
    await page.locator('[name=password]').fill(randomUUID())
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await page.getByText('Bem-vindo, Conta Segurança B.', { exact: false }).waitFor()
    await ritual.waitForFunction(() => document.querySelector('#progress').textContent.startsWith('0 / 60'))
    release()
    assert.equal(await ritual.evaluate(() => window.staleRequest), 409)
    assert.equal((await (await context.request.get(`${origin}/api/album`)).json()).progress.obtained, 0)
    await page.route('**/api/**', route => route.abort())
    await page.reload()
    await page.getByText(/Não foi possível acessar a API/).waitFor()
    results.push({ name, status: 'APROVADO', checks: 'cadastro, login/logout, reload, sessão revogada, sincronização entre abas, RA, troca A/B, resposta atrasada descartada e falha de conexão' })
  } catch (error) { results.push({ name, status: 'REPROVADO', reason: error.message.split('\n').slice(0,3).join(' ') }) }
  finally { await browser.close() }
}
console.log(JSON.stringify(results, null, 2))
if(results.some(r => r.status === 'REPROVADO')) process.exitCode = 1
