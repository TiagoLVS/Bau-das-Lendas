// Gera versões WebP menores das cartas oficiais (320 e 640 px de largura, mesma
// proporção 2:3, sem recorte). Os JPG originais não são alterados.
// Requer ffmpeg no PATH; sem ele, nada é gerado e o site usa os originais.
// Uso: node scripts/gerar-miniaturas.mjs
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { officialArtFiles, exhibitCards } from '../public/card-art.js'

export const LARGURAS = [320, 480, 640]
export const variante = (id, w) => `/lendas/${id}-carta-${w}.webp`
const cartas = [...Object.entries(officialArtFiles).map(([id, f]) => [id, `public/casa/img/cartas/${f}`]),
  ...exhibitCards.map(c => [c.id, `public${c.imagem}`])]

if (import.meta.url === `file://${process.argv[1]}`) {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }) } catch { console.log('ffmpeg ausente: miniaturas não geradas.'); process.exit(0) }
  for (const [id, origem] of cartas) for (const w of LARGURAS) {
    const destino = `public${variante(id, w)}`
    if (existsSync(destino) && statSync(destino).mtimeMs > statSync(origem).mtimeMs) continue
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', origem, '-vf', `scale=${w}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '82', destino])
    console.log(destino)
  }
}
