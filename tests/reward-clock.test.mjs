import test from 'node:test'
import assert from 'node:assert/strict'
import { watchReward, rewardMessage } from '../public/reward-clock.js'

const status = { available: false, server_now: '2026-11-21T02:59:00Z', next_available_at: '2026-11-21T03:00:00Z' }
const flush = () => new Promise(resolve => setImmediate(resolve))
test('contador usa tempo monotônico do servidor, revalida zero e libera timer', async () => {
  let now = 0, calls = 0, id = 0
  const timers = new Map(), messages = []
  const clock = watchReward({ now: () => now,
    setTimer: (fn, ms) => { timers.set(++id, { fn, ms });return id }, clearTimer: key => timers.delete(key),
    load: async () => ++calls === 1 ? status : { ...status, available: true, server_now: '2026-11-21T03:00:00Z', next_available_at: '2026-11-22T03:00:00Z' },
    onUpdate: (data, text) => messages.push([data, text]), onError: error => { throw error } })
  await flush()
  assert.match(messages.at(-1)[1], /0h 01min/)
  const original = Date.now;Date.now = () => Date.parse('2099-01-01')
  try {
    now=30000;const step=[...timers.values()][0].fn;timers.clear();step()
    assert.match(messages.at(-1)[1], /0h 01min/)
  } finally { Date.now = original }
  now = 60000
  const tick = [...timers.values()][0].fn;timers.clear();tick()
  assert.match(messages.at(-1)[1], /Verificando/)
  const refresh = [...timers.values()][0].fn;timers.clear();await refresh()
  assert.equal(calls, 2);assert.equal(messages.at(-1)[1], 'Recompensa disponível!')
  clock.dispose();assert.equal(timers.size, 0)
})

test('resposta antiga não altera relógio após dispose ou refresh mais recente', async () => {
  let resolveFirst, called = 0
  const values = []
  const watcher = watchReward({ load: () => ++called === 1 ? new Promise(resolve => { resolveFirst = resolve }) : Promise.resolve({ ...status, available: true }),
    onUpdate: value => values.push(value), onError() {}, setTimer: () => 1, clearTimer() {} })
  await watcher.refresh();resolveFirst(status);await flush()
  assert.equal(values.length, 1);assert.equal(values[0].available, true)
  watcher.dispose()
})


test('status malformado não cria timer acelerado nem simula disponibilidade', async () => {
  const delays=[],errors=[],updates=[]
  const clock=watchReward({load:async()=>({available:true}),onUpdate:value=>updates.push(value),onError:error=>errors.push(error),setTimer:(_fn,ms)=>{delays.push(ms);return 1},clearTimer(){}})
  await flush();assert.equal(updates.length,0);assert.equal(errors.length,1);assert.deepEqual(delays,[30000]);clock.dispose()
})
