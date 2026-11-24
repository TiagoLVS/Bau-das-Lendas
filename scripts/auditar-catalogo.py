"""Inventário somente leitura de conteúdo e imagens; escreve documentação derivada."""
from pathlib import Path
from PIL import Image
import hashlib,json,collections
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'public/lendas-ra.json').read_text())
rows=[]
for folder in ['cartas','assets','public']:
 for p in sorted((ROOT/folder).rglob('*')):
  if p.is_file()and p.suffix.lower()in('.png','.jpg','.jpeg','.webp','.gif','.svg'):
   related=[e['id']for e in data if e['imagem']and ('public'+e['imagem'])==str(p.relative_to(ROOT))]
   if p.suffix.lower()=='.svg':size='vetorial';fmt='SVG';ratio='viewBox; verso/ornamento, não arte frontal'
   else:
    with Image.open(p)as im:w,h=im.size;fmt=im.format
    size=f'{w}×{h}';ratio=f'{w/h:.4f}'+(' (2:3)'if w*3==h*2 else'')
   rows.append({'arquivo':str(p.relative_to(ROOT)),'formato':fmt,'dimensoes':size,'proporcao':ratio,'ids':related,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
byhash=collections.defaultdict(list)
for r in rows:byhash[r['sha256']].append(r['arquivo'])
lines=['# Inventário de ilustrações — Etapa 05','','Derivado por `scripts/auditar-catalogo.py`. Não modifica imagens. Arquivos SVG de verso/ornamento não contam como ilustrações frontais. WebP e PNG da Loira/Kuldhara não acrescentam personagens. Arquivos sem associação direta abaixo podem ser derivados, fontes ou exposição; não significam necessariamente recursos inúteis.','','Oito artes oficiais, 52 ausentes. Saci permanece exposição, sem posição oficial. Não há dez cartas completas. Para atingir dez, fornecer pelo menos duas artes 2:3 de personagens oficiais ainda ausentes; prioridade sugerida: Bakunawa (`bakunawa.jpg`) e O Flautista de Hamelin (`o-flautista-de-hamelin.jpg`). Associação e aprovação visual dependem de recebimento/revisão, não foram simuladas.','','## Arquivos encontrados','','| Arquivo | Personagem / uso | Formato | Dimensões | Proporção | Associação direta |','| --- | --- | --- | --- | --- | --- |']
for r in rows:
 name=', '.join(e['nome']for e in data if e['id']in r['ids'])or ('Loira — fonte/derivado não ativo'if 'loira' in r['arquivo'].lower()else'Kuldhara — derivado legado não ativo'if 'kuldhara'in r['arquivo']else'Saci — exposição, sem conquista'if'saci'in r['arquivo']else'Verso ornamental, não personagem')
 lines.append(f"| `{r['arquivo']}` | {name} | {r['formato']} | {r['dimensoes']} | {r['proporcao']} | {', '.join(r['ids'])or'Não direta; ver observações'} |")
lines += ['','## Duplicação binária','','Hashes iguais:']
lines += ['- '+', '.join(f'`{f}`'for f in fs)for fs in byhash.values()if len(fs)>1]or[]
if not any(len(fs)>1 for fs in byhash.values()):lines.append('- Nenhuma cópia binária idêntica. Derivados redimensionados não são personagens novos.')
lines += ['','## Todas as posições oficiais','','| Nº | ID | Lenda | Arte integrada | Ação |','| --- | --- | --- | --- | --- |']
for e in data:lines.append(f"| {e['numero']} | `{e['id']}` | {e['nome']} | {e['imagem']or'Ausente'} | {'Preservar'if e['imagem']else'Fornecer arte própria, sem reutilizar personagem diferente'} |")
lines += ['','## Nomenclatura e exposição','','`kayako-saeki` é alias do protótipo; o ID oficial continua `a-maldicao-de-kayako-saeki`. `saci.jpg` não corresponde a Boitatá nem a outra posição. A origem da Loira em PNG e os derivados WebP não devem ser contados novamente. Não se escolhe bandeira nova para origem multinacional/ambígua.']
lines += ['','## Revisão visual humana pendente','','A prancha de inspeção confirma nove cartas com moldura, nome e bandeira, sem atributos de jogo impressos. Em `kuldhara.jpg`, a paisagem de muralhas/arquitetura aparenta referências do leste asiático, enquanto o catálogo situa a narrativa no Rajastão. Solicitar revisão artística e cultural; não foi trocada a associação nem editada a imagem. Os títulos impressos de Kiyohime e Tamamo incluem outros elementos do enredo e não justificam criar personagens/IDs novos.']
(ROOT/'docs/INVENTARIO-ILUSTRACOES.md').write_text('\n'.join(lines)+'\n')
print(f'{len(rows)} recursos visuais inventariados; 8 artes oficiais, 52 pendentes.')
