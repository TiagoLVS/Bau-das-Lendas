import test from 'node:test'
import assert from 'node:assert/strict'

async function fixture(run) {
  const previousFetch = globalThis.fetch, previousWindow = globalThis.window
  globalThis.window = new EventTarget()
  let changes = 0
  window.addEventListener('bau-auth-change', () => changes++)
  const { api } = await import(`../public/api.js?security=${Math.random()}`)
  try { await run(api, () => changes) }
  finally {
    globalThis.fetch = previousFetch
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
}

test('resposta privada atrasada é descartada depois de trocar a sessão', async () => {
  await fixture(async (api, changes) => {
    let release
    globalThis.fetch = async path => path === '/api/album' ? new Promise(resolve => { release = resolve })
      : new Response(JSON.stringify({ id: 'new-account' }), { status: 200 })
    const stale = api('/album')
    await api('/auth/login', { method: 'POST' })
    release(new Response(JSON.stringify({ private: 'old-account' })))
    await assert.rejects(stale, error => error.status === 409)
    assert.equal(changes(), 1)
  })
})

test('401 privado limpa sessão uma vez sem loop; login incorreto não invalida outra sessão', async () => {
  await fixture(async (api, changes) => {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Sessão expirada.' }), { status: 401 })
    await assert.rejects(api('/auth/login', { method: 'POST' }), error => error.status === 401)
    assert.equal(changes(), 0)
    await assert.rejects(api('/album'), error => error.status === 401)
    await assert.rejects(api('/auth/me'), error => error.status === 401)
    assert.equal(changes(), 1)
    globalThis.fetch = async () => new Response(null, { status: 204 })
    await api('/auth/logout', { method: 'POST' })
    assert.equal(changes(), 2)
  })
})

test('erro 429 é apresentado sem inventar dados locais', async () => {
  await fixture(async api => {
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Muitas tentativas. Aguarde.' }), { status: 429, headers: { 'Retry-After': '60' } })
    await assert.rejects(api('/draws', { method: 'POST' }), error => error.status === 429 && error.message.includes('Aguarde'))
  })
})


test('duas importações do cliente na mesma página emitem uma notificação por resgate', async () => {
  await fixture(async () => {
    const channels=[]
    window.BroadcastChannel=class {
      constructor(){channels.push(this)}
      postMessage(data){for(const channel of channels)if(channel!==this)channel.onmessage?.({data})}
    }
    const first=await import(`../public/api.js?first=${Math.random()}`)
    const second=await import(`../public/api.js?second=${Math.random()}`)
    let notifications=0
    window.addEventListener('bau-reward-change',()=>notifications++)
    first.notifyReward();assert.equal(notifications,1)
    second.notifyReward();assert.equal(notifications,2)
  })
})
