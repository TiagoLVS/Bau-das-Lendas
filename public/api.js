// Mesmo cliente para React e scripts estáticos; tokens ficam apenas no cookie HttpOnly.
// Em produção encaminhe /api ao FastAPI no mesmo domínio.
export class ApiError extends Error {
  constructor(message, status, data = null) { super(message); this.status = status; this.data = data; this.code = data?.detail?.code; }
}

// React e módulos públicos podem coexistir no mesmo documento. Compartilhar
// o estado evita duas notificações locais e mantém uma única revisão da sessão.
const stateKey = Symbol.for('bau.auth.state');
const authState = typeof window !== 'undefined'
  ? (window[stateKey] ??= { version: 0, invalid: false, channel: null })
  : { version: 0, invalid: false, channel: null };
if (!authState.channel && typeof window !== 'undefined' && window.BroadcastChannel)
  authState.channel = new window.BroadcastChannel('bau-auth');
const authChannel = authState.channel;
function authChanged(invalid = false, broadcast = true) {
  authState.version += 1;
  authState.invalid = invalid;
  if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new Event('bau-auth-change'));
  if (broadcast) authChannel?.postMessage(invalid ? 'expired' : 'changed');
}
export function notifyReward() {
  if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new Event('bau-reward-change'));
  authChannel?.postMessage('reward');
}
if (authChannel) authChannel.onmessage = event => {
  if(event.data === 'reward' && typeof window !== 'undefined') window.dispatchEvent(new Event('bau-reward-change'));
  if (event.data === 'expired' || event.data === 'changed') authChanged(event.data === 'expired', false);
};

export async function api(path, options = {}) {
  const version = authState.version;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api${path}`, {
      ...options, credentials: 'include', signal: controller.signal,
      headers: { 'X-Bau-Request': '1', ...options.headers },
    });
    if (version !== authState.version) throw new ApiError('A sessão mudou. Atualize os dados da conta.', 409);
    if (response.status === 204) {
      if (path === '/auth/logout') authChanged();
      return null;
    }
    const body = await response.json().catch(() => null);
    if (version !== authState.version) throw new ApiError('A sessão mudou. Atualize os dados da conta.', 409);
    if (!response.ok) {
      if (response.status === 401 && path !== '/auth/login' && !authState.invalid) authChanged(true);
      const message = typeof body?.detail === 'string' ? body.detail : body?.detail?.message ? body.detail.message
        : response.status === 422 ? 'Confira os dados informados.' : 'Serviço indisponível. Tente novamente.';
      throw new ApiError(message, response.status, body);
    }
    if (!body) throw new ApiError('Resposta inválida da API.', 503);
    if (['/auth/login', '/auth/register'].includes(path) && options.method === 'POST') authChanged();
    if (['/draws', '/rewards/open'].includes(path) && options.method === 'POST') notifyReward();
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Não foi possível acessar a API. Confira a conexão e tente novamente.', 0);
  } finally { clearTimeout(timer); }
}
