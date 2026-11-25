// Correspondências explícitas fornecidas pela usuária. Sem numeração paralela.
export const officialArtFiles = {
  'a-maldicao-de-kayako-saeki': 'kayako.jpg',
  'kisaragi-station': 'kisaragi.jpg',
  'meng-jiangnu': 'meng-jiangnu.jpg',
  kuldhara: 'kuldhara.jpg',
  'tamamo-no-mae': 'tamamo.jpg',
  'loira-do-banheiro': 'loira.jpg',
  kiyohime: 'kiyohime.jpg',
  hachishakusama: 'hachishakusama.jpg',
}
export const exhibitCards = [{ id: 'saci-perere', nome: 'Saci Pererê',
  imagem: '/casa/img/cartas/saci.jpg', extra: true }]
export const canonicalCardId = id => id === 'kayako-saeki' ? 'a-maldicao-de-kayako-saeki' : id
export const cardBack = id => ['kuldhara', 'meng-jiangnu', 'kisaragi-station', 'loira-do-banheiro'].includes(id) ? 'vitral' : 'boitata'
// Versões menores (scripts/gerar-miniaturas.mjs) para o navegador baixar só o
// tamanho exibido; o JPG original (768 px) continua disponível para a ampliação.
export const cardSrcSet = (id, src) => src?.startsWith('/casa/img/cartas/')
  ? [320, 480, 640].map(w => `/lendas/${canonicalCardId(id)}-carta-${w}.webp ${w}w`).concat(`${src} 768w`).join(', ')
  : ''
// Estimativa inicial; card-view.js troca pela largura real medida da carta.
export const CARD_SIZES = '(max-width: 600px) 46vw, 260px'
