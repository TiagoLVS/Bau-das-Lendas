import { useEffect, useRef, useState } from 'react'
import { api, type RewardStatus, type RewardHistory } from './api'
import LegendImage from './LegendImage'
// @ts-expect-error relógio compartilhado com a RA estática
import { watchReward } from '../public/reward-clock.js'

export default function Recompensas({ userId }: { userId: string }) {
  const [message, setMessage] = useState('Consultando recompensa…')
  const [items, setItems] = useState<RewardHistory['items']>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [more, setMore] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyRevision, setHistoryRevision] = useState(0)
  const version = useRef(0)
  const mounted = useRef(false)
  const loading = useRef(false)

  useEffect(() => {
    mounted.current = true
    const clock = watchReward({ load: () => api<RewardStatus>('/rewards/status'),
      onUpdate: (_status: RewardStatus, text: string) => setMessage(text),
      onError: (failure: Error) => setMessage(failure.message) })
    const refresh = () => { void clock.refresh() }
    const rewardChanged = () => {
      refresh();version.current++;loading.current=false;setBusy(false);setItems([]);setLoaded(false);setMore(false);setHistoryRevision(value => value + 1)
    }
    const visible = () => { if(document.visibilityState === 'visible') refresh() }
    window.addEventListener('bau-reward-change', rewardChanged);window.addEventListener('focus', refresh);window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      mounted.current = false;version.current++;clock.dispose()
      window.removeEventListener('bau-reward-change', rewardChanged);window.removeEventListener('focus', refresh);window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [userId])

  async function history(reset = false) {
    if(loading.current) return
    loading.current = true
    const current = ++version.current
    setBusy(true);setError('')
    try {
      const result = await api<RewardHistory>(`/rewards/history?limit=10&offset=${reset ? 0 : items.length}`)
      if (!mounted.current || current !== version.current) return
      setItems(previous => reset ? result.items : [...previous, ...result.items])
      setMore(result.has_more);setLoaded(true)
    } catch (failure) {
      if(mounted.current && current === version.current) setError((failure as Error).message)
    } finally {
      if(mounted.current && current === version.current) { setBusy(false);loading.current = false }
    }
  }

  useEffect(() => { if(historyOpen && !loaded) void history(true) }, [historyOpen, loaded, historyRevision])

  return <section aria-label="Recompensas diárias" style={{ maxWidth: '100%', overflowWrap: 'anywhere', fontSize: '1rem' }}>
    <p role="status" aria-live="polite">{message}</p>
    <details onToggle={event => setHistoryOpen(event.currentTarget.open)}>
      <summary style={{ cursor: 'pointer', minHeight: 44 }}>Histórico de recompensas</summary>
      {busy && <p role="status">Carregando histórico…</p>}
      {error && <p role="alert">{error} <button className="botao-discreto" onClick={() => void history(!loaded)}>Tentar novamente</button></p>}
      {loaded && !items.length && <p>Você ainda não recebeu recompensas.</p>}
      <ul style={{ padding: 0, listStyle: 'none' }}>
        {items.map(item => <li key={item.id} style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center', borderBottom: '1px solid currentColor', fontSize: '0.9rem' }}>
          {item.legend?.imagem && <span style={{ width: 48, flexShrink: 0 }}><LegendImage id={item.legend.id} src={item.legend.imagem} alt={`Carta de ${item.legend.nome}`} style={{ width: '100%', height: 'auto' }} /></span>}
          <span style={{ minWidth: 0 }}><strong>{item.legend?.nome ?? 'Registro sem carta concedida'}</strong><br />
            <time dateTime={item.claimed_at}>{new Date(item.claimed_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time><br />
            {item.is_new === true ? 'Nova carta' : item.is_new === false ? 'Carta repetida' : 'Registro anterior: tipo não informado'}
          </span>
        </li>)}
      </ul>
      {more && <button className="botao-discreto" style={{ minHeight: 44 }} disabled={busy} onClick={() => void history()}>Carregar mais registros</button>}
    </details>
  </section>
}
