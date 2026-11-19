// Portal Zuk — seção /leilao-de-imoveis.
//   GET  /leilao-de-imoveis          -> 30 primeiros cards + _token (Laravel) + cookies de sessão
//   POST /leilao-de-imoveis/mais     -> próximos cards (limit e count_imovel_zuk = quantos já vieram)
// O comitente vem no alt da foto (" em leilão - Rua F, 210 - Anápolis/GO - Creditas ... | Z37926").
import { get, clean, decode, brl, dataBR, titulo, uf } from '../lib.js';
import { tipoImovel, areaDe, ocupacaoDe, naturezaDe, descontoDe } from '../imovel.js';

const BASE = 'https://www.portalzuk.com.br';
const PAGINA = `${BASE}/leilao-de-imoveis`;
export const fonte = { id: 'zuk', nome: 'Portal Zuk', site: PAGINA };

function parseCards(html) {
  return html
    .split(/<div class="card-property card_lotes_div"/)
    .slice(1)
    .map((c) => {
      const url = c.match(/href="(https:\/\/www\.portalzuk\.com\.br\/imovel\/[^"]+)"/)?.[1];
      if (!url) return null;
      const alt = decode(c.match(/<img[^>]+alt="([^"]*)"/)?.[1] || '');
      const tipoTxt = clean(c.match(/class="card-property-price-lote">([\s\S]*?)<\/span>/)?.[1] || '');
      const local = clean(c.match(/<span style="font-weight: 600;">([\s\S]*?)<\/span>/)?.[1] || '');
      const [cidadeUf, bairro] = local.split(/\s+-\s+/);
      const [cidade, estado] = (cidadeUf || '').split(/\s*\/\s*/);
      const rua = clean(c.match(/<span style="flex-basis: 100%;[^"]*">([\s\S]*?)<\/span>/)?.[1] || '');
      const infos = clean(c.match(/<ul class="card-property-infos">([\s\S]*?)<\/ul>/)?.[1] || '');
      const pracas = c
        .split(/<li class="card-property-price"/)
        .slice(1)
        .map((seg) => clean(seg.split(/<\/li>/)[0].replace(/^[^>]*>/, '')))
        // Leilão traz "1º/2º leilão"; venda direta traz só o valor. Qualquer linha com R$ é um preço.
        .filter((t) => /R\$/.test(t))
        .map((t) => {
          const d = t.match(/(\d{2}\/\d{2}\/\d{4})\s*(?:às)?\s*(\d{2}:\d{2})?/);
          return { valor: brl(t.match(/R\$\s*([\d.,]+)/)?.[1]), data: d ? dataBR(d[1], d[2]) : null };
        });
      const comitente = (alt.split(/\s+-\s+/).pop() || '').replace(/\s*\|.*$/, '').trim();
      return { url, alt, tipoTxt, cidade, estado, bairro, rua, infos, pracas, comitente, texto: clean(c), imagem: c.match(/<img[^>]+src="([^"]+)"/)?.[1] };
    })
    .filter(Boolean);
}

function mapear(c) {
  const agora = Date.now();
  const ativa = c.pracas.find((p) => p.data && new Date(p.data) > agora) || c.pracas.at(-1) || {};
  const primeira = c.pracas[0] || {};
  const segunda = c.pracas[1] || null;
  const id = c.url.split('/').pop();
  return {
    id: `zuk-${id}`,
    fonte: fonte.id,
    titulo: [c.tipoTxt, c.bairro].filter(Boolean).join(' · ') || 'Imóvel',
    tituloOriginal: c.alt.trim(),
    tipo: tipoImovel(c.tipoTxt, c.tipoTxt) || 'Outro',
    areaM2: areaDe(`${c.infos} ${c.texto}`),
    endereco: c.rua || null,
    bairro: c.bairro || null,
    cidade: c.cidade ? titulo(c.cidade.trim()) : null,
    uf: uf(c.estado),
    natureza: naturezaDe(c.comitente),
    comitente: c.comitente || null,
    // No Zuk o valor da 1ª praça costuma ser a avaliação; a 2ª é o desconto real.
    avaliacao: null,
    lance: ativa.valor ?? null,
    lancePraca1: primeira.valor ?? null,
    lancePraca2: segunda?.valor ?? null,
    // Desconto do lance de agora: na 1ª praça ainda não há desconto sobre a própria 1ª praça.
    desconto: descontoDe(ativa.valor, primeira.valor),
    encerra: ativa.data || null,
    fimPraca1: segunda ? primeira.data || null : null,
    status: 'Aberto para lances',
    ocupacao: ocupacaoDe(c.texto),
    codigo: c.alt.match(/\|\s*(Z\d+)/)?.[1] || null,
    imagem: c.imagem || null,
    url: c.url,
  };
}

export async function coletar({ max = 900 } = {}) {
  const res = await get(PAGINA);
  const html = await res.text();
  const cookie = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
  const token = (html.match(/name=["']_token["'][^>]*value=["']([^"']+)/) || html.match(/value=["']([^"']+)["'][^>]*name=["']_token/))?.[1] || '';

  const cards = parseCards(html);
  while (cards.length < max) {
    // No site, "limit" é quantos cards já estão na tela (funciona como deslocamento).
    const body = new URLSearchParams({ limit: cards.length, count_imovel_zuk: cards.length, path: PAGINA, order: 'data_leilao', div_parceiro_count: 0, _token: token });
    const pedir = (delay) =>
      get(`${PAGINA}/mais`, {
        method: 'POST',
        delay,
        headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token, Referer: PAGINA },
        body: body.toString(),
      });
    // O Zuk limita a frequência (429): espera e tenta de novo; se persistir, fica com o que já veio.
    let r;
    try {
      r = await pedir(1500);
    } catch {
      try {
        r = await pedir(15000);
      } catch (e) {
        console.warn(`  ↳ Zuk parou em ${cards.length} (${e.message})`);
        break;
      }
    }
    const novos = parseCards(await r.text()).filter((n) => !cards.some((c) => c.url === n.url));
    if (!novos.length) break;
    cards.push(...novos);
  }
  return cards.map(mapear);
}
