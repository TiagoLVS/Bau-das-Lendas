import { useEffect, useState, type FormEvent } from 'react'
import { api, type User } from './api'
import Recompensas from './Recompensas'

export default function Conta({ aoExplorar, aoAbrirAlbum }: { aoExplorar: () => void; aoAbrirAlbum: () => void }) {
  const [user, setUser] = useState<User | null>(null)
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true, version = 0
    const refresh = async () => {
      const current = ++version
      setUser(null); setBusy(true)
      try {
        const account = await api<User>('/auth/me')
        if (active && current === version) { setUser(account); setMessage('') }
      } catch (error) {
        if (active && current === version) setMessage((error as { status?: number; message: string }).status === 401
          ? 'Sua sessão não está ativa. Entre para continuar.' : (error as Error).message)
      } finally { if (active && current === version) setBusy(false) }
    }
    const visible = () => { if (document.visibilityState === 'visible') void refresh() }
    void refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('bau-auth-change', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false; version++
      window.removeEventListener('focus', refresh)
      window.removeEventListener('bau-auth-change', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const body = { email: data.get('email'), password: data.get('password'),
      ...(register ? { username: data.get('username') } : {}) }
    setBusy(true); setMessage('')
    try {
      setUser(await api<User>(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }))
      const retorno = new URLSearchParams(window.location.search).get('retorno')
      if (retorno === 'ritual') window.location.assign('/ra.html')
      else if (retorno === 'cartas') window.location.assign('/casa/cartas.html')
      else if (retorno === 'album') aoAbrirAlbum()
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }

  async function logout() {
    setBusy(true); setMessage('')
    try {
      await api('/auth/logout', { method: 'POST' })
      setUser(null)
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }

  return <div className="conta-texto">
    {user ? <>
      <p className="conta-boas-vindas">Bem-vindo, <strong>{user.username}</strong>. Sua coleção está salva na sua conta.</p>
      <Recompensas key={user.id} userId={user.id} />
      <nav className="conta-acoes" aria-label="Atalhos da conta">
        <button type="button" className="botao-ritual conta-acao" onClick={aoExplorar}>Explorar as lendas</button>
        <button type="button" className="botao-discreto conta-acao" onClick={aoAbrirAlbum}>Abrir meu grimório</button>
        <a className="botao-discreto conta-acao" href="/ra.html">Invocar o baú em RA</a>
        <a className="botao-discreto conta-acao" href="/casa/cartas.html">Ver cartas ilustradas</a>
      </nav>
      <button type="button" className="botao-discreto conta-sair" disabled={busy} onClick={logout}>Sair da conta</button>
    </> : <form onSubmit={submit}>
      {register && <p><label>Nome<br /><input name="username" autoComplete="nickname" minLength={2} maxLength={80} required /></label></p>}
      <p><label>E-mail<br /><input name="email" type="email" autoComplete="email" maxLength={254} required /></label></p>
      <p><label>Senha (10 a 128 caracteres)<br /><input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={10} maxLength={128} required /></label></p>
      <button className="botao-ritual conta-primario" disabled={busy}>{busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}</button>
      <p><button type="button" className="botao-discreto" disabled={busy} onClick={() => { setRegister(!register); setMessage('') }}>
        {register ? 'Já tenho conta' : 'Criar uma conta'}
      </button></p>
    </form>}
    <p role="status" aria-live="polite">{message}</p>
  </div>
}
