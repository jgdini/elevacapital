// Gera vitrine/dados.json (enxuto) a partir de coleta/data/imoveis.json.
// Uso: node vitrine/gerar-dados.mjs   (rodar depois de cada coleta)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const bruto = JSON.parse(await readFile(path.join(aqui, '..', 'coleta', 'data', 'imoveis.json'), 'utf8'));
const nomes = Object.fromEntries(bruto.fontes.map((f) => [f.id, f.nome]));
const pct = (lance, base) => (lance && base && lance < base ? Math.round((1 - lance / base) * 100) : null);
// Desconto sempre sobre o lance de agora: avaliação quando existe; no Zuk, a 1ª praça.
const desconto = (l) => (l.avaliacao ? pct(l.lance, l.avaliacao) : l.fonte === 'zuk' ? pct(l.lance, l.lancePraca1) : l.desconto);

const imoveis = bruto.imoveis
  .filter((l) => l.lance)
  .map((l) => ({
    id: l.id,
    f: nomes[l.fonte] || l.fonte,
    t: l.titulo,
    o: l.tituloOriginal?.slice(0, 160) || null,
    tp: l.tipo,
    a: l.areaM2,
    b: l.bairro,
    c: l.cidade,
    u: l.uf,
    n: l.natureza === 'Judicial' ? 'J' : 'E',
    cm: l.comitente,
    av: l.avaliacao,
    l: l.lance,
    p1: l.lancePraca1,
    p2: l.lancePraca2,
    d: desconto(l),
    e: l.encerra,
    oc: l.ocupacao,
    img: l.imagem,
    url: l.url,
  }));

await writeFile(
  path.join(aqui, 'dados.json'),
  JSON.stringify({ geradoEm: bruto.geradoEm, fontes: bruto.fontes.map((f) => f.nome), total: imoveis.length, imoveis })
);
console.log(`${imoveis.length} imóveis em vitrine/dados.json`);
