import { containDialogFocus } from '../../dialog-focus.js'
import { educationalBack } from '../../educational-card.js'
import { api } from '../../api.js'
import { collection } from './colecao.js'
import { mountCard } from './card-view.js'
import { exhibitCards, canonicalCardId, cardBack } from '../../card-art.js'

const $ = id => document.getElementById(id)
let legends = [], filter = 'todas', requested = canonicalCardId(new URLSearchParams(location.search).get('carta'))
let releaseFocus = null
let opener = null, activeExhibit = false, activeCard = null
let catalogFallback = false
let catalogLoadError = ''
const modal = $('revelar')
modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Carta ilustrada')
$('revelar-fechar').textContent = 'VOLTAR ÀS CARTAS'
$('revelar-fechar').classList.add('mostrar')
function close() {
  releaseFocus?.(); releaseFocus=null
  const fallback=[...document.querySelectorAll('#mesa .carta-x')].find(el=>el.dataset.legendId===activeCard?.id)?.parentElement.querySelector('button.filtro')
  activeCard=null;activeExhibit = false
  modal.hidden = true; document.body.classList.remove('revelando'); $('revelar-carta').replaceChildren()
  ;(opener?.isConnected?opener:fallback)?.focus({preventScroll:true})
}
function open(card, source) {
  opener = source;activeCard=card
  activeExhibit = Boolean(card.extra)
  const unlocked = collection.has(card.id)
  const mounted = mountCard(card, { unlocked, extra: card.extra, preview: !card.extra })
  mounted.classList.add('carta-grande')
  $('revelar-carta').replaceChildren(mounted)
  $('revelar-instrucao').textContent = card.extra
    ? 'EXPOSIÇÃO · NÃO CONTA NAS 60 LENDAS'
    : unlocked
      ? 'SALVA NA SUA CONTA · CLIQUE PARA VIRAR'
      : 'PRÉVIA PÚBLICA · VIRAR NÃO DESBLOQUEIA A CARTA'
  modal.hidden = false; document.body.classList.add('revelando');
  releaseFocus?.();releaseFocus=containDialogFocus(modal,{onEscape:close,initialFocus:mounted,restoreFocus:false})
}
function render() {
  const focusedId=document.activeElement?.closest('.mesa-registro')?.querySelector('.carta-x')?.dataset.legendId
  // O modal apresenta catálogo público. Refresh não interrompe leitura nem conserva propriedade antiga.
  if(!modal.hidden && activeCard && !activeExhibit){
    const owned=collection.has(activeCard.id);$('revelar-carta').querySelector('.carta-x')?.setAccess(owned);$('revelar-instrucao').textContent=owned?'SALVA NA SUA CONTA · CLIQUE PARA VIRAR':'PRÉVIA PÚBLICA · VIRAR NÃO DESBLOQUEIA A CARTA'
  }
  const cards = [...legends, ...exhibitCards]
  const search = $('busca-cartas').value.trim().toLocaleLowerCase('pt-BR')
  const content = cards.map(card => {
    const wrapper = document.createElement('div'); wrapper.className = 'mesa-registro'
    const matchesSearch = `${card.nome} ${card.origem || ''}`.toLocaleLowerCase('pt-BR').includes(search)
    wrapper.hidden = (!matchesSearch || filter !== 'todas' && cardBack(card.id) !== filter)
    const unlocked = collection.has(card.id)
    const mounted = mountCard(card, { unlocked, extra: card.extra, preview: !card.extra })
    wrapper.append(mounted)
    const details = document.createElement('button'); details.className = 'filtro'; details.textContent = `AMPLIAR ${card.nome}`
    details.addEventListener('click', () => open(card, details)); wrapper.append(details)
    if (!card.extra) {
      const dossier = document.createElement('details'), summary = document.createElement('summary')
      summary.textContent = 'FICHA DA LENDA'; dossier.append(summary)
      dossier.append(educationalBack(card))
      wrapper.append(dossier)
    }
    return wrapper
  })
  $('mesa').replaceChildren(...content)
  if(focusedId)[...document.querySelectorAll('#mesa .carta-x')].find(el=>el.dataset.legendId===focusedId)?.parentElement.querySelector('button.filtro')?.focus({preventScroll:true})
  $('contagem').textContent = String(collection.cards.size)
  const illustrated = legends.filter(legend => legend.imagem).length
  const collectionStatus = collection.error || (collection.user
    ? `Coleção de ${collection.user.username}. ${illustrated} artes oficiais; 60 registros públicos. Saci em exposição, fora das 60 lendas.`
    : `Entre para consultar sua coleção. ${illustrated} artes oficiais; 60 registros públicos.`)
  $('collection-status').textContent = catalogFallback
    ? `${collectionStatus} O catálogo foi carregado do arquivo oficial porque a API pública está indisponível.`
    : collectionStatus
  if (requested) {
    const card = cards.find(card => card.id === requested)
    if (card && (card.extra || collection.has(card.id))) { open(card); requested = null }
  }
}
try {
  legends = await api('/legends')
} catch {
  catalogFallback = true
  try {
    const response = await fetch('/lendas-ra.json')
    if (!response.ok) throw Error(`Catálogo indisponível (${response.status}).`)
    legends = await response.json()
  } catch (error) {
    catalogLoadError = `Não foi possível carregar o catálogo pela API nem pelo arquivo oficial: ${error.message}`
    $('collection-status').textContent = catalogLoadError
  }
}
if (!Array.isArray(legends) || legends.length !== 60 || new Set(legends.map(legend => legend.id)).size !== 60 ||
    legends.map(legend => legend.numero).sort((a, b) => a - b).some((number, index) => number !== index + 1)) {
  if (!catalogLoadError) $('collection-status').textContent = 'Catálogo oficial inválido: são necessárias 60 posições numeradas e IDs únicos.'
} else {
  collection.addEventListener('change', render)
  render()
}
document.querySelectorAll('[data-filtro]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filtro
  document.querySelectorAll('[data-filtro]').forEach(other => { other.classList.toggle('ativo', other === button); other.setAttribute('aria-pressed', String(other === button)) })
  render()
}))
$('busca-cartas').addEventListener('input', render)
$('virar-todas').addEventListener('click', () => $('mesa').querySelectorAll('.mesa-registro:not([hidden]) .carta-x').forEach((card, index) => card.virar(index > 0)))
$('refresh-collection').addEventListener('click', () => collection.refresh())
$('revelar-fechar').addEventListener('click', close)
