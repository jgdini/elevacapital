// Leilões Judiciais (leiloesjudiciais.com.br) — portal que reúne vários leiloeiros oficiais.
// API usada pelo próprio site: POST api.leiloesjudiciais.com.br/core/api/get-lotes (tipo 3 = Imóveis).
import { get, titulo, uf } from '../lib.js';
import { tipoImovel, areaDe, ocupacaoDe, naturezaDe, descontoDe } from '../imovel.js';

const BASE = 'https://www.leiloesjudiciais.com.br';
const API = 'https://api.leiloesjudiciais.com.br/core/api/get-lotes';
export const fonte = { id: 'leiloesjudiciais', nome: 'Leilões Judiciais', site: BASE };

const semHtml = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const num = (s) => (s == null || s === '' ? null : +s);

function mapear(l) {
  const desc = semHtml(l.nm_descricao);
  const foto = l.fotos?.[0];
  const dt = l.dt_fechamento ? l.dt_fechamento.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00') : null;
  const lance = num(l.vl_lance) ?? num(l.vl_lanceinicial);
  // A API não tem campo de avaliação; quando o texto traz "avaliado em R$ X", usamos.
  const aval = desc.match(/avalia(?:do|[cç][aã]o)[^R$]{0,40}R\$\s*([\d.]+,\d{2})/i)?.[1];
  const avaliacao = aval ? +aval.replace(/\./g, '').replace(',', '.') : null;
  return {
    id: `leiloesjudiciais-${l.lote_id}`,
    fonte: fonte.id,
    titulo: (l.nm_titulo_lote || '').split(/\s+-\s+/)[0],
    tituloOriginal: l.nm_titulo_lote,
    tipo: tipoImovel(l.nm_titulo_lote || '', l.nm_subcategoria || ''),
    areaM2: areaDe(`${l.nm_titulo_lote} ${desc.slice(0, 600)}`),
    endereco: null,
    bairro: null,
    cidade: l.nm_cidade ? titulo(l.nm_cidade) : null,
    uf: uf(l.nm_estado),
    natureza: naturezaDe(`${l.nm_titulo_leilao} ${l.nm_titulo_lote} ${desc.slice(0, 800)}`),
    comitente: l.nm_titulo_leilao ? titulo(l.nm_titulo_leilao).slice(0, 90) : null,
    leiloeiro: l.nm_leiloeiro || null,
    leiloeiroSite: l.nm_url_leiloeiro ? l.nm_url_leiloeiro.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null,
    avaliacao,
    lance,
    // Na 2ª praça o portal troca vl_lanceinicial pelo valor da 2ª; o da 1ª fica em vl_lanceminimo.
    lancePraca1: Math.max(num(l.vl_lanceminimo) || 0, num(l.vl_lanceinicial) || 0) || null,
    lancePraca2: num(l.vl_lanceinicialsegundoleilao),
    // Sem avaliação, compara com o valor da 1ª praça (no judicial costuma ser a própria avaliação).
    desconto: descontoDe(lance, avaliacao) ?? descontoDe(lance, Math.max(num(l.vl_lanceminimo) || 0, num(l.vl_lanceinicial) || 0)),
    encerra: dt,
    fimPraca1: null,
    status: l.nm_statuslote || null,
    ocupacao: ocupacaoDe(desc),
    codigo: `#${l.lote_id}`,
    imagem: foto ? `${foto.nm_path_incompleto}640x480/${foto.nm_path}` : null,
    url: `${BASE}/lote/${l.leilao_id}/${l.lote_id}`,
  };
}

export async function coletar({ porPagina = 100, maxPaginas = 30 } = {}) {
  const itens = [];
  for (let pg = 1; pg <= maxPaginas; pg++) {
    const qs = new URLSearchParams({
      pg, qtd_por_pagina: porPagina, tipo: 3, estado: 0, cidade: 0, valor_min: 0, valor_max: 0, palavra_chave: '',
      leilao_id: 0, lote_id: 0, ordenacao: 'max', ehvitrinesaladisputa: false, faixa_desconto: 0, com_foto: 0, categoria: 0,
    });
    const res = await get(`${API}?${qs}`, { method: 'POST', headers: { Origin: BASE, Referer: BASE + '/' } });
    const j = await res.json();
    for (const l of j.items || []) {
      if (!/aberto|aguardando/i.test(l.nm_statuslote || '')) continue;
      const it = mapear(l);
      if (it.tipo) itens.push(it);
    }
    if (!j.items?.length || pg >= (j.totalPages || 1)) break;
  }
  return itens;
}
