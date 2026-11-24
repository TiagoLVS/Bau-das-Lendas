// A preferência do projeto acompanha a navegação entre React e páginas estáticas.
if(typeof document!=='undefined'){try{if(localStorage.getItem('bau-das-lendas-movimento-reduzido')==='true')document.documentElement.dataset.reduzir='true'}catch{/* Storage indisponível: CSS ainda respeita a preferência do sistema. */}}
// Adaptação única dos dados públicos; nunca usa historia nem revisão editorial.
export function educationalContent(legend) {
  const c = legend.cultura || {}
  const text = value => typeof value === 'string' ? value.trim() : ''
  return {
    name: text(legend.nome), origin: text(c.pais) || text(c.regiao) || text(legend.origem),
    tradition: text(c.tradicao), summary: text(c.resumoEducativo) || 'Conteúdo educativo em preparação.',
    context: text(c.contextoCultural), facts: Array.isArray(c.curiosidades) ? c.curiosidades.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()) : [],
  }
}
export function educationalBack(legend) {
  const data = educationalContent(legend), root = document.createElement('section')
  root.className = 'educational-back'; root.setAttribute('aria-label', `Sobre ${data.name}`)
  function add(tag, text, parent = root) { const node=document.createElement(tag);node.textContent=text;parent.append(node);return node }
  add('h3', data.name)
  if(data.origin)add('p',data.origin).className='education-origin'
  if(data.tradition)add('p',data.tradition)
  add('h4','A história');add('p',data.summary)
  if(data.context){add('h4','Contexto cultural');add('p',data.context)}
  if(data.facts.length){add('h4','Curiosidades');const list=add('ul','');data.facts.forEach(f=>add('li',f,list))}
  return root
}
export function enrichEducationalLegend(legend, catalog) {
  const official = catalog.find(item => item.id === legend.id)
  return {...legend, cultura: legend.cultura ?? official?.cultura, imagem: legend.imagem ?? official?.imagem}
}
