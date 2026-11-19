// Gera dados.json (enxuto) a partir de coleta/data/imoveis.json.
// Uso: node gerar-dados.mjs   (rodar depois de cada coleta: node coleta/run.js)
//
// Proteções para a atualização automática diária:
// - Fonte que falhou nesta coleta: mantém os imóveis dela da vitrine anterior (só os que ainda não encerraram).
// - Se o total cair para menos da metade do anterior, não grava e sai com erro (algo quebrou; a vitrine fica como estava).
// - status.json registra o resultado de cada fonte; sai com código 1 se alguma falhou (o GitHub marca a execução em vermelho).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const ler = async (f) => JSON.parse(await readFile(f, 'utf8'));
const bruto = await ler(path.join(aqui, 'coleta', 'data', 'imoveis.json'));
let anterior = null;
try { anterior = await ler(path.join(aqui, 'dados.json')); } catch {}

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

// Fontes que falharam (ou vieram vazias): reaproveita o que a vitrine anterior tinha delas.
const corte = Date.now() - 2 * 3600e3;
const falhas = bruto.fontes.filter((f) => !f.ok || !f.total);
const status = bruto.fontes.map((f) => ({ fonte: f.nome, ok: !!f.ok && f.total > 0, imoveis: f.total, erro: f.erro || (f.ok && !f.total ? 'veio vazia' : undefined) }));
for (const f of falhas) {
  const velhos = (anterior?.imoveis || []).filter((l) => l.f === f.nome && (!l.e || new Date(l.e).getTime() > corte));
  imoveis.push(...velhos);
  const s = status.find((x) => x.fonte === f.nome);
  s.mantidosDaColetaAnterior = velhos.length;
  console.warn(`! ${f.nome} falhou (${s.erro}); mantidos ${velhos.length} imóveis da coleta anterior`);
}

if (anterior && imoveis.length < anterior.total * 0.5) {
  console.error(`✖ Total caiu de ${anterior.total} para ${imoveis.length}: vitrine NÃO atualizada.`);
  await writeFile(path.join(aqui, 'status.json'), JSON.stringify({ quando: new Date().toISOString(), ok: false, publicado: false, motivo: `total caiu de ${anterior.total} para ${imoveis.length}`, fontes: status }, null, 1));
  process.exit(1);
}

await writeFile(
  path.join(aqui, 'dados.json'),
  JSON.stringify({ geradoEm: bruto.geradoEm, fontes: bruto.fontes.map((f) => f.nome), total: imoveis.length, imoveis })
);
await writeFile(path.join(aqui, 'status.json'), JSON.stringify({ quando: bruto.geradoEm, ok: !falhas.length, publicado: true, total: imoveis.length, fontes: status }, null, 1));
console.log(`${imoveis.length} imóveis em dados.json`);
if (falhas.length) process.exit(1);
