// Roda os coletores de imóveis e grava data/imoveis.json + data/resumo.json.
// Uso: node run.js [fonte1 fonte2 ...]
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import * as leiloesjudiciais from './sources/leiloesjudiciais.js';
import * as megaleiloes from './sources/megaleiloes.js';
import * as lancejudicial from './sources/lancejudicial.js';
import * as zuk from './sources/zuk.js';
import * as eleiloes from './sources/eleiloes.js';

const FONTES = [leiloesjudiciais, megaleiloes, lancejudicial, zuk, eleiloes];
const pasta = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const filtro = process.argv.slice(2);
// COLETA_PULAR=lancejudicial pula fontes que bloqueiam o lugar onde a coleta roda (ex.: Lance Judicial barra o GitHub).
const pular = (process.env.COLETA_PULAR || '').split(',').map((s) => s.trim()).filter(Boolean);

const imoveis = [];
const fontes = [];
for (const f of FONTES) {
  if ((filtro.length && !filtro.includes(f.fonte.id)) || pular.includes(f.fonte.id)) continue;
  const t0 = Date.now();
  try {
    const itens = await f.coletar();
    imoveis.push(...itens);
    fontes.push({ ...f.fonte, total: itens.length, ok: true, segundos: Math.round((Date.now() - t0) / 1000) });
    console.log(`✔ ${f.fonte.nome}: ${itens.length} imóveis (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } catch (e) {
    fontes.push({ ...f.fonte, total: 0, ok: false, erro: e.message });
    console.error(`✖ ${f.fonte.nome}: ${e.message}`);
  }
}

// Remove encerrados e duplicatas.
const agora = Date.now();
const unicos = [...new Map(imoveis.map((l) => [l.id, l])).values()].filter(
  (l) => !l.encerra || new Date(l.encerra).getTime() > agora - 2 * 3600e3
);
unicos.sort((a, b) => (a.encerra ? new Date(a.encerra) : Infinity) - (b.encerra ? new Date(b.encerra) : Infinity));

// Resumo por fonte: o que cada uma entrega de dado útil para a análise.
const pct = (arr, f) => (arr.length ? Math.round((arr.filter(f).length / arr.length) * 100) : 0);
const conta = (arr, k) => Object.entries(arr.reduce((o, l) => ((o[l[k] ?? '—'] = (o[l[k] ?? '—'] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]);
const resumo = {
  geradoEm: new Date().toISOString(),
  total: unicos.length,
  fontes: fontes.map((f) => {
    const l = unicos.filter((x) => x.fonte === f.id);
    return {
      ...f,
      ativos: l.length,
      judicial: l.filter((x) => x.natureza === 'Judicial').length,
      comArea: pct(l, (x) => x.areaM2),
      comCidade: pct(l, (x) => x.cidade && x.uf),
      comDesconto: pct(l, (x) => x.desconto != null),
      comAvaliacao: pct(l, (x) => x.avaliacao),
      comOcupacao: pct(l, (x) => x.ocupacao),
      comFoto: pct(l, (x) => x.imagem),
    };
  }),
  porTipo: conta(unicos, 'tipo'),
  porUF: conta(unicos, 'uf'),
  porNatureza: conta(unicos, 'natureza'),
};

await mkdir(pasta, { recursive: true });
await writeFile(path.join(pasta, 'imoveis.json'), JSON.stringify({ geradoEm: resumo.geradoEm, total: unicos.length, fontes, imoveis: unicos }, null, 1));
await writeFile(path.join(pasta, 'resumo.json'), JSON.stringify(resumo, null, 1));

console.log(`\n${unicos.length} imóveis ativos gravados em data/imoveis.json\n`);
console.table(resumo.fontes.map((f) => ({ fonte: f.nome, imoveis: f.ativos, judicial: f.judicial, 'área%': f.comArea, 'cidade%': f.comCidade, 'desconto%': f.comDesconto, 'ocupação%': f.comOcupacao, 'foto%': f.comFoto })));
console.log('Por tipo:', resumo.porTipo.map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('Por UF:', resumo.porUF.slice(0, 12).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('Natureza:', resumo.porNatureza.map(([k, v]) => `${k} ${v}`).join(' · '));
