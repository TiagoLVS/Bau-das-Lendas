// Relógio informativo: o backend é a única autoridade de disponibilidade.
export function rewardMessage(status, remainingMs) {
  if (status.available) return 'Recompensa disponível!';
  if (remainingMs <= 0) return 'Verificando a próxima recompensa…';
  const minutes = Math.ceil(remainingMs / 60000);
  return `Você já recebeu a recompensa de hoje. Próxima em ${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min.`;
}

export function watchReward({ load, onUpdate, onError, now = () => performance.now(), setTimer = setTimeout, clearTimer = clearTimeout }) {
  let alive = true, revision = 0, timer = null, snapshot = null, receivedAt = 0;
  function cancelTimer() { if (timer !== null) clearTimer(timer); timer = null; }
  function tick() {
    if (!alive || !snapshot) return;
    const remaining = Date.parse(snapshot.next_available_at) - Date.parse(snapshot.server_now) - (now() - receivedAt);
    onUpdate(snapshot, rewardMessage(snapshot, remaining));
    if (remaining <= 0) { timer = setTimer(refresh, 1000); return; }
    timer = setTimer(tick, Math.min(30000, remaining));
  }
  function accept(status) {
    if (!alive) return;
    revision++;cancelTimer();
    if(typeof status?.available !== 'boolean' || !Number.isFinite(Date.parse(status.server_now)) || !Number.isFinite(Date.parse(status.next_available_at))) {
      snapshot=null;onError(new Error('Não foi possível verificar a disponibilidade. Tente novamente.'));
      timer=setTimer(refresh,30000);return;
    }
    snapshot = status;receivedAt = now();tick();
  }
  async function refresh() {
    cancelTimer();const current = ++revision;
    try {
      const status = await load();
      if (alive && current === revision) accept(status);
    } catch (error) {
      if (alive && current === revision) { onError(error);timer = setTimer(refresh, 30000); }
    }
  }
  void refresh();
  return { refresh, accept, dispose() { alive = false;revision++;cancelTimer(); } };
}
