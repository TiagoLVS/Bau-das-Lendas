import { readFileSync, writeFileSync } from 'node:fs'

const catalogo = JSON.parse(
  readFileSync('public/lendas-ra.json', 'utf8')
)

const ids = new Set(catalogo.map(item => item.id))

if (catalogo.length !== 60 || ids.size !== 60) {
  throw new Error('O catálogo precisa ter 60 lendas com IDs diferentes.')
}

const codigo = `// Gerado automaticamente. Edite public/lendas-ra.json.
export type ConteudoCultural = {
  pais: string | null
  codigoPais: string | null
  regiao: string
  tradicao: string | null
  tipoNarrativa: string
  resumoEducativo: string | null
  contextoCultural: string | null
  curiosidades: string[]
  revisao: {
    estado: 'parcial' | 'pendente'
    resumo: 'adaptado_do_texto' | 'extrativo_do_texto' | 'pendente'
  }
}

export type Lenda = {
  id: string
  numero: number
  nome: string
  subtitulo: string
  origem: string
  historia: string
  ameaca: number | null
  encontro: number | null
  notaEncontro: string
  categoria: string
  imagem: string
  provisoria?: boolean
  cultura?: ConteudoCultural | null
}

export const lendas: Lenda[] = ${JSON.stringify(catalogo, null, 2)}
`

writeFileSync('src/data/lendas.ts', codigo, 'utf8')

console.log(`Catálogo sincronizado: ${catalogo.length} lendas.`)
