// Gera dados.json (enxuto) a partir de coleta/data/imoveis.json.
// Uso: node gerar-dados.mjs   (rodar depois de cada coleta: node coleta/run.js [fontes])
//
// Cada fonte é tratada à parte, para a atualização automática aguentar falhas e coletas parciais:
// - Fonte coletada com sucesso: entra com os imóveis novos e a data de hoje em status.json (ultimaColetaOk).
// - Fonte que falhou ou não foi coletada desta vez (ex.: Lance Judicial, que bloqueia o GitHub e é coletado no PC):
//   ficam os imóveis dela da vitrine anterior que ainda não encerraram.
// - Se o total cair para menos da metade do anterior, não grava dados.json (algo quebrou; a vitrine fica como estava).
// - Sai com código 1 (execução vermelha no GitHub) se uma fonte tentada falhou ou se alguma fonte está há mais de
//   DIAS_ALERTA dias sem coleta boa.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIAS_ALERTA = 3;
const aqui = path.dirname(fileURLToPath(import.meta.url));
const ler = async (f, padrao) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch (e) { if (padrao !== undefined) return padrao; throw e; } };
const bruto = await ler(path.join(aqui, 'coleta', 'data', 'imoveis.json'));
const anterior = await ler(path.join(aqui, 'dados.json'), null);
const statusAnterior = await ler(path.join(aqui, 'status.json'), null);

const nomes = Object.fromEntries(bruto.fontes.map((f) => [f.id, f.nome]));
const pct = (lance, base) => (lance && base && lance < base ? Math.round((1 - lance / base) * 100) : null);
// Desconto sempre sobre o lance de agora: avaliação quando existe; no Zuk, a 1ª praça.
const desconto = (l) => (l.avaliacao ? pct(l.lance, l.avaliacao) : l.fonte === 'zuk' ? pct(l.lance, l.lancePraca1) : l.desconto);

const novos = bruto.imoveis
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

// Todas as fontes conhecidas: as desta coleta + as que já estavam na vitrine.
const ordem = [...new Set([...(anterior?.fontes || []), ...bruto.fontes.map((f) => f.nome)])];
const corte = Date.now() - 2 * 3600e3;
const imoveis = [];
const fontes = [];
let falhou = false;
for (const nome of ordem) {
  const agora = bruto.fontes.find((f) => f.nome === nome);
  const antes = statusAnterior?.fontes?.find((s) => s.fonte === nome) || {};
  const ok = !!agora?.ok && agora.total > 0;
  if (ok) {
    const meus = novos.filter((l) => l.f === nome);
    imoveis.push(...meus);
    fontes.push({ fonte: nome, ok: true, imoveis: meus.length, ultimaColetaOk: bruto.geradoEm });
    continue;
  }
  const velhos = (anterior?.imoveis || []).filter((l) => l.f === nome && (!l.e || new Date(l.e).getTime() > corte));
  imoveis.push(...velhos);
  const erro = agora ? agora.erro || 'veio vazia' : undefined;
  if (agora) falhou = true;
  fontes.push({
    fonte: nome,
    ok: agora ? false : antes.ok ?? null,
    imoveis: velhos.length,
    ultimaColetaOk: antes.ultimaColetaOk || (antes.ok ? statusAnterior.quando : null),
    ...(erro ? { erro } : { naoColetadaAgora: true }),
  });
  console.warn(`! ${nome}: ${erro || 'não coletada nesta execução'}; mantidos ${velhos.length} imóveis da coleta anterior`);
}

const atrasadas = fontes.filter((f) => !f.ultimaColetaOk || Date.now() - new Date(f.ultimaColetaOk).getTime() > DIAS_ALERTA * 864e5);
for (const f of atrasadas) console.error(`✖ ${f.fonte}: sem coleta boa há mais de ${DIAS_ALERTA} dias (última: ${f.ultimaColetaOk || 'nunca'})`);

const gravarStatus = (extra) =>
  writeFile(path.join(aqui, 'status.json'), JSON.stringify({ quando: bruto.geradoEm, ok: !falhou && !atrasadas.length, ...extra, fontes }, null, 1));

if (anterior && imoveis.length < anterior.total * 0.5) {
  console.error(`✖ Total caiu de ${anterior.total} para ${imoveis.length}: vitrine NÃO atualizada.`);
  // Mantém as datas da última coleta boa como estavam, para o alerta de atraso continuar valendo.
  fontes.forEach((f) => (f.ultimaColetaOk = statusAnterior?.fontes?.find((s) => s.fonte === f.fonte)?.ultimaColetaOk || null));
  await gravarStatus({ ok: false, publicado: false, motivo: `total caiu de ${anterior.total} para ${imoveis.length}` });
  process.exit(1);
}

await writeFile(path.join(aqui, 'dados.json'), JSON.stringify({ geradoEm: bruto.geradoEm, fontes: ordem, total: imoveis.length, imoveis }));
await gravarStatus({ publicado: true, total: imoveis.length });
console.log(`${imoveis.length} imóveis em dados.json`);
if (falhou || atrasadas.length) process.exit(1);
