// Mega Leilões — seção /imoveis (HTML renderizado no servidor, 48 cards por página).
// Título do card: "Terreno 477 m² - Santa Lúcia - Belo Horizonte - MG"; categoria vem na URL (/imoveis/{categoria}/...).
import { get, clean, brl, dataBR, titulo, uf } from '../lib.js';
import { tipoImovel, areaDe, ocupacaoDe } from '../imovel.js';

const BASE = 'https://www.megaleiloes.com.br';
export const fonte = { id: 'megaleiloes', nome: 'Mega Leilões', site: BASE };

function parseCard(key, html) {
  const href = html.match(/class="card-title" href="([^"?]+)/)?.[1];
  if (!href) return null;
  const nome = clean(html.match(/class="card-title"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
  const categoria = href.match(/\/imoveis\/([^/]+)\//)?.[1]?.replace(/-+/g, ' ') || '';
  const local = clean(html.match(/class="card-locality"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
  const [cidade, estado] = local.split(/,\s*/);
  const partes = nome.split(/\s+-\s+/);
  const bairro = partes.length >= 4 ? partes.at(-3) : null;
  const img = html.match(/data-bg="([^"]+)"/)?.[1];
  const status = clean(html.match(/class="card-status">([\s\S]*?)<\/div>/)?.[1] || '');

  const pracas = [...html.matchAll(/<div class="instance([^"]*)">([\s\S]*?)<\/div>/g)].map(([, cls, b]) => {
    const t = clean(b);
    const d = t.match(/(\d{2}\/\d{2}\/\d{4})\s*às\s*(\d{2}:\d{2})/);
    return { ativa: /active/.test(cls), passada: /passed/.test(cls), data: d ? dataBR(d[1], d[2]) : null, valor: brl(t.match(/R\$\s*[\d.,]+/)?.[0]) };
  });
  const ativa = pracas.find((p) => p.ativa) || pracas.find((p) => !p.passada) || pracas.at(-1) || {};
  const texto = clean(html);
  const desconto = texto.match(/(\d+)%\s*abaixo/)?.[1];

  return {
    id: `megaleiloes-${key}`,
    fonte: fonte.id,
    titulo: partes[0] || nome,
    tituloOriginal: nome,
    tipo: tipoImovel(nome, categoria),
    areaM2: areaDe(nome),
    endereco: null,
    bairro,
    cidade: cidade && !/sem informa/i.test(cidade) ? titulo(cidade) : null,
    uf: uf(estado),
    natureza: /Extrajudicial/i.test(texto) ? 'Extrajudicial' : /Judicial/i.test(texto) ? 'Judicial' : null,
    comitente: null,
    avaliacao: null,
    lance: ativa.valor ?? brl(clean(html.match(/class="card-price">([\s\S]*?)<\/div>/)?.[1] || '')),
    lancePraca1: pracas[0]?.valor ?? null,
    lancePraca2: pracas[1]?.valor ?? null,
    desconto: desconto ? +desconto : null,
    encerra: ativa.data || null,
    fimPraca1: pracas.length > 1 ? pracas[0].data || null : null,
    status: status || null,
    ocupacao: ocupacaoDe(texto),
    codigo: clean(html.match(/class="card-number[^"]*">([\s\S]*?)<\/div>/)?.[1] || '') || null,
    imagem: img && !/no-image/.test(img) ? img.replace(/_320x240\./, '_640x480.') : null,
    url: href,
  };
}

export async function coletar({ maxPaginas = 40 } = {}) {
  const itens = [];
  const vistos = new Set();
  let falhas = 0;
  for (let p = 1; p <= maxPaginas; p++) {
    // O Mega devolve 500 em algumas páginas: tenta de novo com pausa maior e, se persistir, pula a página.
    // Três páginas seguidas com erro encerram a fonte com o que já veio.
    let html;
    try {
      html = await (await get(`${BASE}/imoveis?pagina=${p}`)).text();
    } catch {
      try {
        html = await (await get(`${BASE}/imoveis?pagina=${p}`, { delay: 6000 })).text();
      } catch (e) {
        if (p === 1) throw e;
        console.warn(`  ↳ Mega: página ${p} com erro (${e.message})`);
        if (++falhas >= 3) break;
        continue;
      }
    }
    falhas = 0;
    const blocos = [...html.matchAll(/<div class="col-sm-6 col-md-4 col-lg-3" data-key="(\d+)">([\s\S]*?)(?=<div class="col-sm-6 col-md-4 col-lg-3" data-key=|<div class="text-center pagination-bottom|$)/g)];
    let novos = 0;
    for (const [, key, bloco] of blocos) {
      if (vistos.has(key)) continue;
      vistos.add(key);
      const it = parseCard(key, bloco);
      if (!it) continue;
      novos++;
      if (/encerrad|cancelad|suspens|vendido|arrematad/i.test(it.status || '')) continue;
      if (!it.tipo) continue;
      itens.push(it);
    }
    if (!novos || !html.includes(`pagina=${p + 1}`)) break;
  }
  return itens;
}
