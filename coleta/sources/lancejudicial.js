// Lance Judicial / Grupo Lance — seção /imoveis (HTML renderizado no servidor, 32 cards por página).
import { get, clean, brl, dataBR, titulo, uf } from '../lib.js';
import { tipoImovel, areaDe, ocupacaoDe } from '../imovel.js';

const BASE = 'https://www.grupolance.com.br';
export const fonte = { id: 'lancejudicial', nome: 'Lance Judicial', site: 'https://www.lancejudicial.com.br' };

function parseCard(key, html) {
  const href = html.match(/class="card-title" href="([^"]+)"/)?.[1];
  if (!href) return null;
  const nome = clean(html.match(/class="card-title"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
  const categoria = href.match(/\/imoveis\/([^/]+)\//)?.[1]?.replace(/-+/g, ' ') || '';
  const local = clean(html.match(/class="card-locality"[^>]*>([\s\S]*?)<\/a>/)?.[1] || '');
  const [cidade, estado] = local.split(/,\s*/);
  const partes = nome.split(/\s+-\s+/);
  const img = html.match(/class="card-image[^"]*"[^>]*url\(([^)]+)\)/)?.[1];
  const status = clean(html.match(/class="card-status[^"]*">([\s\S]*?)<\/span>/)?.[1] || '');

  // Cada praça: início, fim e valor.
  const agora = Date.now();
  const pracas = [...html.matchAll(/<ol class="card-instance-date">([\s\S]*?)<\/ol>/g)].map(([, b]) => {
    const lis = [...b.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => clean(m[1]));
    const fim = lis[1]?.match(/(\d{2}\/\d{2}\/\d{4})\s*às\s*(\d{2}:\d{2})/);
    const data = fim ? dataBR(fim[1], fim[2]) : null;
    return { data, valor: brl(lis[2]), passada: data ? new Date(data).getTime() < agora : false };
  });
  const ativa = pracas.find((p) => !p.passada) || pracas.at(-1) || {};
  const texto = clean(html);
  const desconto = texto.match(/(\d+)%\s*abaixo/)?.[1];

  return {
    id: `lancejudicial-${key}`,
    fonte: fonte.id,
    titulo: partes[0] || nome,
    tituloOriginal: nome,
    tipo: tipoImovel(nome, categoria),
    areaM2: areaDe(nome),
    endereco: null,
    bairro: partes.length >= 4 ? partes.at(-3) : null,
    cidade: cidade ? titulo(cidade) : null,
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
    codigo: key,
    imagem: img ? (img.startsWith('//') ? 'https:' + img : img).replace(/_thumb\.(jpe?g|png)$/i, '.$1') : null,
    url: href.startsWith('http') ? href : BASE + href,
  };
}

export async function coletar({ maxPaginas = 40 } = {}) {
  const itens = [];
  const vistos = new Set();
  for (let p = 1; p <= maxPaginas; p++) {
    const html = await (await get(`${BASE}/imoveis?pagina=${p}`)).text();
    const blocos = html.split(/<div class="card-item [^"]*" data-key="/).slice(1);
    let novos = 0;
    for (const b of blocos) {
      const key = b.match(/^(\d+)"/)?.[1];
      if (!key || vistos.has(key)) continue;
      vistos.add(key);
      const it = parseCard(key, b);
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
