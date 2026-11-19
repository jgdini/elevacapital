// E-Leilões — API JSON do próprio site (plataforma Suporte Leilões).
//   GET /api/categorias/imoveis?limit=100&page=N   (judiciais e extrajudiciais)
import { get, titulo, uf } from '../lib.js';
import { tipoImovel, areaDe, ocupacaoDe, descontoDe } from '../imovel.js';

const BASE = 'https://www.e-leiloes.com.br';
export const fonte = { id: 'eleiloes', nome: 'E-Leilões', site: BASE };

const iso = (s) => (s ? s.replace(' ', 'T') + '-03:00' : null);

function mapear(l) {
  const ev = l.evento || {};
  const [cidade, estado] = (l.localidade || '').split(/\s+-\s+/);
  // Praça vigente: a primeira data ainda no futuro.
  const datas = [ev.data1, ev.data2, ev.data3].map(iso).filter(Boolean);
  const encerra = datas.find((d) => new Date(d) > Date.now()) || datas.at(-1) || iso(ev.dataFimLances);
  const avaliacao = l.valores?.avaliacao || l.valorAvaliacao || null;
  const lance = l.valores?.lanceAtual || l.valores?.lanceMinimo || l.valorInicial || null;
  const texto = `${l.titulo || ''} ${l.descricao || ''}`;
  return {
    id: `eleiloes-${l.id}`,
    fonte: fonte.id,
    titulo: (l.titulo || '').split(/\s+[-–]\s+/)[0],
    tituloOriginal: l.titulo,
    tipo: tipoImovel(l.titulo || '', l.subcategoria?.nome || ''),
    areaM2: areaDe(texto),
    endereco: null,
    bairro: null,
    cidade: cidade ? titulo(cidade) : null,
    uf: uf(estado),
    natureza: ev.judicial ? 'Judicial' : 'Extrajudicial',
    comitente: l.comitente?.nome || null,
    avaliacao,
    lance,
    lancePraca1: l.valorInicial || null,
    lancePraca2: l.valorInicial2 && l.valorInicial2 !== l.valorInicial ? l.valorInicial2 : null,
    desconto: descontoDe(lance, avaliacao),
    encerra,
    fimPraca1: datas.length > 1 ? datas[0] : null,
    status: l.status?.label || null,
    ocupacao: ocupacaoDe(texto),
    codigo: `Lote ${l.numero}`,
    imagem: l.imagem?.url || null,
    url: l.canonicalUrl || BASE + (l._website?.path || ''),
  };
}

export async function coletar({ limite = 100, maxPaginas = 10 } = {}) {
  const itens = [];
  for (let page = 1; page <= maxPaginas; page++) {
    const j = await (await get(`${BASE}/api/categorias/imoveis?limit=${limite}&page=${page}`)).json();
    for (const l of j.results?.result || []) {
      if (!/aberto|breve|aguard/i.test(l.status?.label || '')) continue;
      const it = mapear(l);
      if (it.tipo) itens.push(it);
    }
    if (page * limite >= (j.results?.total || 0)) break;
  }
  return itens;
}
