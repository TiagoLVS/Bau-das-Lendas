// Regras narrativas do diretor de manifestações da casa (public/casa/js/manifestacoes.js),
// testadas com os eventos reais do catálogo. Nenhum disparo é forçado: cada evento só
// começa quando as condições do próprio diretor são atendidas.
import test from 'node:test'
import assert from 'node:assert/strict'
import { MANIFESTACOES, criarDiretorDaCasa } from '../public/casa/js/manifestacoes.js'

const eventos = MANIFESTACOES.map(e => ({ ...e }))
function diretor(apresentacao = false) {
  const log = []
  const d = criarDiretorDaCasa(eventos, apresentacao, {
    iniciar: e => log.push(['inicio', e.id]), quadro: () => {}, limpar: e => log.push(['limpa', e.id]),
  })
  return { d, log }
}
// avança em passos de 1/60 s
function rodar(d, segundos, ctx) { for (let t = 0; t < segundos; t += 1 / 60) d.atualizar(1 / 60, ctx) }
const base = { dentro: true, perto: true, pausado: false, reduzir: false }

test('fora da casa (jardim/entrada) nenhuma manifestação começa', () => {
  const { d, log } = diretor()
  rodar(d, 30, { ...base, dentro: false, indice: 0 })
  assert.equal(log.length, 0)
})

test('cada evento só acontece no registro da sua lenda', () => {
  for (const e of eventos) {
    const { d, log } = diretor()
    const outro = eventos.find(x => x.indice !== e.indice).indice
    rodar(d, 10, { ...base, indice: outro })
    assert.ok(!log.some(([, id]) => id === e.id), `${e.id} apareceu fora do registro ${e.indice}`)
    const { d: d2, log: log2 } = diretor()
    rodar(d2, e.espera + 0.2, { ...base, indice: e.indice })
    assert.deepEqual(log2[0], ['inicio', e.id])
  }
})

test('exige proximidade: passando longe do registro, nada acontece', () => {
  const { d, log } = diretor()
  rodar(d, 20, { ...base, perto: false, indice: 0 })
  assert.equal(log.length, 0)
})

test('respeita o tempo de permanência de cada evento', () => {
  const loira = eventos.find(e => e.id === 'espelho')
  const { d, log } = diretor()
  rodar(d, loira.espera - 0.15, { ...base, indice: loira.indice })
  assert.equal(log.length, 0, 'apareceu antes da permanência mínima')
  rodar(d, 0.3, { ...base, indice: loira.indice })
  assert.deepEqual(log[0], ['inicio', 'espelho'])
})

test('pausa real: dossiê aberto ou aba oculta não consome espera nem duração', () => {
  const { d, log } = diretor()
  rodar(d, 30, { ...base, pausado: true, indice: 0 })
  assert.equal(log.length, 0)
  rodar(d, 1.3, { ...base, indice: 0 })
  assert.equal(log.length, 1)
  rodar(d, 30, { ...base, pausado: true, indice: 0 })
  assert.equal(log.length, 1, 'a manifestação terminou durante a pausa')
  assert.equal(d.inspecionar().ativo, 'espelho')
})

test('apenas uma manifestação ativa por vez e silêncio de 8 s depois de cada uma', () => {
  const { d, log } = diretor()
  const loira = eventos.find(e => e.id === 'espelho'), lobo = eventos.find(e => e.id === 'lobo')
  rodar(d, loira.espera + 0.1, { ...base, indice: loira.indice })
  // muda de registro durante a manifestação: a outra não começa por cima
  rodar(d, 1, { ...base, indice: lobo.indice })
  assert.equal(log.filter(([t]) => t === 'inicio').length, 1)
  // avança até a Loira ser limpa; o silêncio conta a partir daí
  while (!log.some(([t]) => t === 'limpa')) d.atualizar(1 / 60, { ...base, indice: lobo.indice })
  assert.deepEqual(log.at(-1), ['limpa', 'espelho'])
  rodar(d, 7.5, { ...base, indice: lobo.indice })
  assert.equal(log.filter(([t]) => t === 'inicio').length, 1, 'o silêncio de 8 s não foi respeitado')
  rodar(d, 0.5 + lobo.espera + 0.2, { ...base, indice: lobo.indice })
  assert.deepEqual(log.filter(([t]) => t === 'inicio').at(-1), ['inicio', 'lobo'])
})

test('cada manifestação acontece uma vez por visita (sem repetição)', () => {
  const { d, log } = diretor()
  rodar(d, 60, { ...base, indice: 0 })
  assert.equal(log.filter(([t, id]) => t === 'inicio' && id === 'espelho').length, 1)
})

test('limpeza ao sair da casa durante a manifestação', () => {
  const { d, log } = diretor()
  rodar(d, 1.3, { ...base, indice: 0 })
  d.atualizar(1 / 60, { ...base, dentro: false, indice: 0 })
  assert.deepEqual(log.at(-1), ['limpa', 'espelho'])
  assert.equal(d.inspecionar().ativo, null)
})

test('modo normal ignora a sequência de demonstração', () => {
  const { d, log } = diretor(false)
  // num registro sem manifestação, o modo normal fica em silêncio por todo o tempo
  rodar(d, 60, { ...base, indice: 40 })
  assert.equal(log.length, 0)
  // a demonstração, separada, percorre a sequência mesmo nesse registro
  const { d: demo, log: logDemo } = diretor(true)
  rodar(demo, 60, { ...base, indice: 40 })
  assert.ok(logDemo.filter(([t]) => t === 'inicio').length >= 2)
})

test('Loira do Banheiro só na demonstração; as outras quatro seguem automáticas na exploração', () => {
  const normal = MANIFESTACOES.filter(e => !e.somenteDemonstracao).map(e => e.id)
  assert.deepEqual(MANIFESTACOES.filter(e => e.somenteDemonstracao).map(e => e.id), ['espelho'])
  assert.deepEqual(normal.sort(), ['alta', 'boitata', 'lobo', 'saci'])
})
