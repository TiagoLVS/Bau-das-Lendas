/* Relógios da casa: suspendem trabalho oculto e são descartados ao sair. */
window.Bau = window.Bau || {};
Bau.ciclo = (() => {
  const timers = new Map(), listeners = [];
  let next = 0, paused = document.hidden, disposed = false;
  const schedule = item => {
    item.started = performance.now();
    item.native = setTimeout(() => {
      if (disposed || paused) return;
      if (!item.interval) timers.delete(item.id);
      item.fn();
      if (item.interval && timers.has(item.id)) { item.remaining = item.delay; schedule(item); }
    }, item.remaining);
  };
  const timer = (fn, delay = 0, interval = false) => {
    if (disposed) return 0;
    const item = { id: ++next, fn, delay, remaining: delay, interval, started: 0, native: 0 };
    timers.set(item.id, item); if (!paused) schedule(item); return item.id;
  };
  const cancelar = id => { const t = timers.get(id); if (t) clearTimeout(t.native); timers.delete(id); };
  const ouvir = (node, type, fn, options) => { node.addEventListener(type, fn, options); listeners.push(() => node.removeEventListener(type, fn, options)); };
  const pausar = value => {
    if (paused === value || disposed) return;
    paused = value;
    for (const item of timers.values()) {
      if (value) { clearTimeout(item.native); item.remaining = Math.max(0, item.remaining - (performance.now() - item.started)); }
      else schedule(item);
    }
  };
  const dispose = () => { if (disposed) return; for (const id of timers.keys()) cancelar(id); listeners.splice(0).forEach(off => off()); disposed = true; };
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let stored;
  try { stored = localStorage.getItem('bau-das-lendas-movimento-reduzido'); } catch {}
  document.documentElement.dataset.reduzir = String(media.matches || stored === 'true');
  const reduzir = () => media.matches || document.documentElement.dataset.reduzir === 'true';
  ouvir(media, 'change', () => { if (media.matches) document.documentElement.dataset.reduzir = 'true'; });
  ouvir(document, 'visibilitychange', () => { pausar(document.hidden); if (document.hidden) Bau.corredor?.parar(); else Bau.corredor?.retomar(); Bau.som?.suspender(document.hidden); });
  ouvir(window, 'pagehide', event => {
    Bau.corredor?.parar(); Bau.som?.suspender(true); pausar(true);
    if (!event.persisted) { Bau.manifestacoes?.dispose(); Bau.som?.dispose(); dispose(); }
  });
  ouvir(window, 'pageshow', event => { if (event.persisted) { pausar(document.hidden); Bau.corredor?.retomar(); Bau.som?.suspender(document.hidden); } });
  return { depois: (fn, ms) => timer(fn, ms), repetir: (fn, ms) => timer(fn, ms, true), cancelar, ouvir, pausar, dispose, reduzir,
    inspecionar: () => ({ timers: timers.size, listeners: listeners.length, paused, disposed }) };
})();
