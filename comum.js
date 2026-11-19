// Código comum da demonstração Eleva (vitrine, painel, portal da imobiliária, área do cliente e loja).
// Imóveis vêm da coleta real (dados.json); clientes, pacotes e operações são fictícios e ficam salvos
// só neste navegador (localStorage), compartilhados entre todas as telas do mesmo endereço.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (v) => (v == null || !Number.isFinite(v) ? '–' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }));
const curto = (v) => (v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : v >= 1e3 ? 'R$ ' + Math.round(v / 1e3) + ' mil' : brl(v));
const pct = (v, casas = 1) => (Number.isFinite(v) ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas }) + '%' : '–');
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const area = (a) => (a == null ? null : a >= 10000 ? (a / 10000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' ha' : a.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' m²');
const dataCurta = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '–');
const dias = (iso) => (iso ? Math.floor((new Date(iso) - Date.now()) / 864e5) : null);
const numero = (s) => +String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.') || 0;
const local = (x) => [x.b, x.c && x.u ? `${x.c}/${x.u}` : x.c].filter(Boolean).join(' · ');
const foto = (x, cls = 'miniimg') => (x?.img ? `<img class="${cls}" src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : `<div class="${cls}"></div>`);

const ICONES = {
  inicio: '<path d="M3 11.5 12 4l9 7.5M5 10v10h14V10"/>',
  imoveis: '<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6"/>',
  analises: '<path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="2"/>',
  entregas: '<path d="M3 7h13v10H3zM16 10h3l2 3v4h-5"/><circle cx="7" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
  operacoes: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',
  clientes: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 0 1 0 6M21 20c0-2.6-1.6-4.8-4-5.6"/>',
  financeiro: '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  fontes: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/>',
};
const ico = (n, t = 18) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;

// ---------------------------------------------------------------- dados
let IMOVEIS = [], POR_ID = new Map(), COLETA = null;
const ETAPAS = ['Alinhamento', 'Perfil e objetivos', 'Busca de imóveis', 'Análise financeira', 'Viabilidade jurídica', 'Disputa e arrematação', 'Registro e desocupação', 'Orientação para venda'];
const CHECKLIST = [
  ['Matrícula atualizada', 'Proprietário, ônus, penhoras e averbações'],
  ['Edital conferido', 'Praças, comissão, forma de pagamento e regras do leiloeiro'],
  ['Processo judicial', 'Fase, recursos pendentes e risco de anulação'],
  ['Débitos de IPTU', 'Valor e quem paga depois da arrematação'],
  ['Débitos de condomínio', 'Valor e quem paga depois da arrematação'],
  ['Ocupação', 'Ocupado ou desocupado, por quem, e caminho para desocupar'],
  ['Localização e vistoria externa', 'Rua, entorno, fotos e estado aparente'],
  ['Valor de mercado confirmado', 'Comparáveis da região ou validação do corretor parceiro'],
];
const PARECERES = { rec: ['Recomendo', 'verde'], res: ['Recomendo com ressalvas', 'amb'], nao: ['Não recomendo', 'verm'] };

const CHAVE = 'eleva-painel-prototipo-v1';
let E = null; // estado salvo

function semente() {
  // Escolhe imóveis reais com foto, área e prazo para montar o exemplo.
  const bons = IMOVEIS.filter((x) => x.img && x.a && x.c && dias(x.e) >= 3 && ['Apartamento', 'Casa', 'Comercial', 'Terreno'].includes(x.tp));
  const pega = (f, n, usados = new Set()) => bons.filter((x) => f(x) && !usados.has(x.id)).slice(0, n);
  const usados = new Set();
  const marca = (arr) => (arr.forEach((x) => usados.add(x.id)), arr);
  const aptoSP = marca(pega((x) => x.tp === 'Apartamento' && x.u === 'SP' && x.l < 600000, 4, usados));
  const casaMG = marca(pega((x) => x.tp === 'Casa' && x.u === 'MG' && x.l < 500000, 3, usados));
  const terrGO = marca(pega((x) => x.tp === 'Terreno' && x.u === 'GO' && x.l < 200000, 7, usados));
  const salaSP = marca(pega((x) => x.tp === 'Comercial' && x.u === 'SP' && x.l < 400000, 3, usados));
  const outros = marca(pega((x) => x.l < 900000, 10, usados));
  const aptoMG = marca(pega((x) => x.tp === 'Apartamento' && x.u === 'MG' && x.l < 450000, 2, usados));
  const id = (arr, i) => arr[i]?.id || outros[i % outros.length]?.id;

  const imobiliarias = [
    { id: 'silva', nome: 'Imobiliária Silva', cidade: 'Belo Horizonte/MG', corretores: 4, desde: '2026-08-12', cor: '#7A1F2B', dominio: 'leiloes.imobiliariasilva.com.br' },
    { id: 'horizonte', nome: 'Horizonte Imóveis', cidade: 'São Paulo/SP', corretores: 7, desde: '2026-09-03', cor: '#1F4E79', dominio: 'horizonteimoveis.com.br/leilao' },
    { id: 'casanova', nome: 'Casa Nova Negócios', cidade: 'Goiânia/GO', corretores: 2, desde: '2026-10-20', cor: '#2E6B3F', dominio: 'casanova.eleva.app' },
  ];
  const clientes = [
    { id: 'paulo', nome: 'Dr. Paulo Mendes', via: 'silva', capital: 450000, uf: 'MG', tipos: ['Casa', 'Apartamento'], objetivo: 'Revenda', prazo: 12 },
    { id: 'marina', nome: 'Marina Souza', via: null, capital: 400000, uf: 'SP', tipos: ['Comercial'], objetivo: 'Aluguel', prazo: 24 },
    { id: 'grupor', nome: 'Grupo R. Participações', via: 'horizonte', capital: 1200000, uf: 'SP', tipos: ['Apartamento'], objetivo: 'Revenda', prazo: 18 },
    { id: 'carlos', nome: 'Carlos Teixeira', via: null, capital: 200000, uf: 'GO', tipos: ['Terreno'], objetivo: 'Revenda', prazo: 24 },
    { id: 'fernanda', nome: 'Fernanda Lima', via: 'casanova', capital: 250000, uf: 'GO', tipos: ['Terreno', 'Casa'], objetivo: 'Construir e vender', prazo: 24 },
    { id: 'rafael', nome: 'Rafael Costa', via: null, capital: 600000, uf: 'SP', tipos: ['Apartamento'], objetivo: 'Aluguel', prazo: 36 },
    { id: 'juliana', nome: 'Juliana Prado', via: 'silva', capital: 450000, uf: 'MG', tipos: ['Apartamento'], objetivo: 'Aluguel', prazo: 24 },
    { id: 'roberto', nome: 'Roberto Alves', via: 'silva', capital: 700000, uf: 'MG', tipos: ['Casa', 'Apartamento'], objetivo: 'Revenda', prazo: 12 },
  ];
  const pacotes = [
    { id: 'p1', cliente: 'marina', tipo: 'Pacote 5 oportunidades', preco: 1500, total: 5, entregues: salaSP.slice(0, 2).map((x) => x.id), comprado: '2026-11-10', prazoEntrega: '2026-11-28' },
    { id: 'p2', cliente: 'carlos', tipo: 'Pacote 10 oportunidades', preco: null, total: 10, entregues: terrGO.slice(0, 6).map((x) => x.id), comprado: '2026-11-02', prazoEntrega: '2026-11-30' },
    { id: 'p3', cliente: 'rafael', tipo: 'Oportunidade avulsa', preco: 200, total: 1, entregues: [], comprado: '2026-11-18', prazoEntrega: '2026-11-21' },
    { id: 'p5', cliente: 'juliana', tipo: 'Curadoria da imobiliária', preco: 0, total: 3, entregues: aptoMG.slice(0, 1).map((x) => x.id), comprado: '2026-11-12', prazoEntrega: '2026-11-26' },
    { id: 'p4', cliente: 'paulo', tipo: 'Curadoria da imobiliária', preco: 0, total: 3, entregues: casaMG.slice(0, 2).map((x) => x.id), comprado: '2026-11-05', prazoEntrega: '2026-11-25' },
  ];
  const nova = (imovel, analista, status, parecer, preench) => ({
    id: 'a-' + imovel, imovel, analista, status, criada: new Date(Date.now() - 864e5 * (status === 'Concluída' ? 6 : 1)).toISOString(),
    checklist: CHECKLIST.map((_, i) => ({ s: i < preench ? (i === 3 && parecer === 'res' ? 'at' : 'ok') : '', nota: i === 3 && parecer === 'res' ? 'IPTU em aberto de R$ 8.400; edital diz que fica com o arrematante.' : '' })),
    // Análise concluída do exemplo: valor de mercado já verificado pela equipe (acima da 1ª praça).
    custos: parecer ? custosVerificados(POR_ID.get(imovel)) : null, parecer, texto: parecer === 'rec' ? 'Imóvel com matrícula limpa, desocupado e preço abaixo dos comparáveis da região. Lance até o limite indicado mantém retorno acima de 25%.' : parecer === 'res' ? 'Boa localização e desconto relevante, mas há IPTU em aberto que fica com o arrematante. Recomendo considerar o débito no lance.' : '',
  });
  const analises = [
    nova(id(casaMG, 0), 'Antonio', 'Concluída', 'rec', 8),
    nova(id(salaSP, 0), 'Beatriz', 'Concluída', 'res', 8),
    nova(id(aptoSP, 0), 'Antonio', 'Em análise', '', 5),
    nova(id(aptoSP, 1), 'Beatriz', 'Em análise', '', 2),
    nova(id(terrGO, 6), 'Antonio', 'Em análise', '', 1),
  ];
  const op = (imovel, cliente, etapa, resp, prazo) => ({ id: 'o-' + imovel + etapa, imovel, cliente, etapa, resp, prazo });
  const operacoes = [
    op(id(outros, 0), 'grupor', 0, 'Antonio', '2026-11-22'),
    op(id(outros, 1), 'rafael', 1, 'Beatriz', '2026-11-24'),
    op(id(aptoSP, 2), 'grupor', 2, 'Antonio', '2026-11-26'),
    op(id(aptoSP, 0), 'grupor', 3, 'Beatriz', '2026-11-21'),
    op(id(casaMG, 1), 'paulo', 4, 'Antonio', '2026-11-23'),
    op(id(casaMG, 0), 'paulo', 5, 'Antonio', '2026-11-27'),
    op(id(outros, 2), 'fernanda', 6, 'Beatriz', '2026-12-10'),
    op(id(outros, 3), 'marina', 7, 'Antonio', '2027-01-15'),
    op(id(aptoMG, 1), 'roberto', 6, 'Beatriz', '2026-12-05'),
  ];
  // Tudo que já foi entregue a um cliente tem análise concluída.
  for (const p of pacotes) for (const im of p.entregues) if (!analises.some((a) => a.imovel === im)) analises.push(nova(im, 'Beatriz', 'Concluída', 'rec', 8));
  return { imobiliarias, clientes, pacotes, analises, operacoes, extrasFontes: [], aprovacoes: [], consultorias: [], pedidos: [] };
}

function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch {} }
function carregarEstado() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE));
    // Se a coleta do dia tirou da base algum imóvel usado no exemplo, recomeça o exemplo com os imóveis de hoje.
    const usados = [...(s?.analises || []).map((a) => a.imovel), ...(s?.pacotes || []).flatMap((p) => p.entregues), ...(s?.operacoes || []).map((o) => o.imovel)];
    if (s && usados.every((id) => POR_ID.has(id))) return { aprovacoes: [], consultorias: [], pedidos: [], extrasFontes: [], ...s };
  } catch {}
  return semente();
}
function recomecarDemo() { try { localStorage.removeItem(CHAVE); } catch {} location.reload(); }
const cliente = (id) => E.clientes.find((c) => c.id === id);
const imob = (id) => E.imobiliarias.find((i) => i.id === id);
const analiseDe = (imovelId) => E.analises.find((a) => a.imovel === imovelId);
const combina = (c) => IMOVEIS.filter((x) => x.u === c.uf && c.tipos.includes(x.tp) && x.l <= c.capital && dias(x.e) >= 0);

// ---------------------------------------------------------------- cálculo
// Exemplo de análise concluída: valor de mercado em que o limite do perfil alvo (25%) fica 12% acima do lance atual.
function custosVerificados(x) {
  const k = custosPadrao(x);
  const c = (k.comissao + k.itbi + k.registro) / 100, fixos = k.dividas + k.desocupacao + k.reforma;
  const custo = x.l * 1.12 * (1 + c) + fixos;
  k.mercado = Math.round(((custo * (0.25 + 0.85)) / 0.85) / (1 - k.corretagem / 100) / 1000) * 1000;
  return k;
}
function custosPadrao(x) {
  const reformaM2 = x.tp === 'Terreno' || x.tp === 'Rural' ? 0 : 350;
  return { mercado: Math.round(x.av || x.p1 || x.l), lance: Math.round(x.l), comissao: 5, itbi: 3, registro: 1.5, dividas: 0, desocupacao: x.oc === 'Ocupado' ? 15000 : 0, reforma: Math.round(Math.min(x.a || 0, 400) * reformaM2), corretagem: 6, prazo: 12, cdi: 1 };
}
function calcular(k) {
  const c = (k.comissao + k.itbi + k.registro) / 100;
  const fixos = k.dividas + k.desocupacao + k.reforma;
  const vendaLiq = k.mercado * (1 - k.corretagem / 100);
  const custo = k.lance * (1 + c) + fixos;
  const bruto = vendaLiq - custo;
  const ir = Math.max(0, bruto) * 0.15;
  const lucro = bruto - ir;
  const roi = custo ? lucro / custo : 0;
  const tir = custo && custo + lucro > 0 ? Math.pow((custo + lucro) / custo, 1 / Math.max(1, k.prazo)) - 1 : -1;
  const vpl = (custo + lucro) / Math.pow(1 + k.cdi / 100, k.prazo) - custo;
  const maxPara = (r) => Math.max(0, ((0.85 * vendaLiq) / (r + 0.85) - fixos) / (1 + c));
  return { custo, vendaLiq, lucro, ir, roi, tir, vpl, perfis: { Conservador: maxPara(0.35), Alvo: maxPara(0.25), Agressivo: maxPara(0.15) } };
}


let tmr;
function avisar(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tmr); tmr = setTimeout(() => t.classList.remove('on'), 3400); }

// ---------------------------------------------------------------- consultas usadas pelos portais
const pacotesDo = (cid) => E.pacotes.filter((p) => p.cliente === cid);
const entreguesDo = (cid) => pacotesDo(cid).flatMap((p) => p.entregues.map((im) => ({ imovel: POR_ID.get(im), pacote: p, analise: analiseDe(im) }))).filter((e) => e.imovel);
const aprovacao = (cid, im) => E.aprovacoes.find((a) => a.cliente === cid && a.imovel === im);
const clientesDaImob = (iid) => E.clientes.filter((c) => c.via === iid);
const iniciais = (n) => n.replace(/^(Dr|Dra)\.\s*/i, '').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

// Carrega a base de imóveis e o estado da demonstração.
async function carregarBase(caminho) {
  const d = await (await fetch(caminho)).json();
  COLETA = d.geradoEm;
  IMOVEIS = d.imoveis.map((x) => ({ ...x, _busca: norm([x.t, x.o, x.tp, x.b, x.c, x.u].join(' ')) }));
  POR_ID = new Map(IMOVEIS.map((x) => [x.id, x]));
  E = carregarEstado();
  salvar();
  return d;
}

// Assinatura da vitrine (simulada): visitante vê preço e desconto; assinante vê edital, leiloeiro e calculadora.
const ehAssinante = () => { try { return localStorage.getItem('eleva-assinante') === '1'; } catch { return false; } };
const definirAssinante = (v) => { try { localStorage.setItem('eleva-assinante', v ? '1' : '0'); } catch {} };

// Barra "Ver como" da demonstração: troca de tela entre os papéis da plataforma.
function barraDemo(atual, raiz = '') {
  const itens = [
    ['visitante', 'Vitrine · visitante', raiz + 'index.html?ver=visitante'],
    ['assinante', 'Vitrine · assinante', raiz + 'index.html?ver=assinante'],
    ['loja', 'Comprar pacote', raiz + 'comprar/'],
    ['painel', 'Painel Eleva', raiz + 'painel/'],
    ['imobiliaria', 'Imobiliária Silva', raiz + 'imobiliaria/?id=silva'],
    ['paulo', 'Cliente: Dr. Paulo', raiz + 'cliente/?id=paulo'],
    ['marina', 'Cliente: Marina', raiz + 'cliente/?id=marina'],
  ];
  const el = document.createElement('nav');
  el.className = 'demo-barra';
  el.setAttribute('aria-label', 'Demonstração: ver a plataforma como');
  el.innerHTML = `<span class="demo-rot">Ver como</span>${itens.map(([id, nome, href]) => `<a href="${href}" class="${id === atual ? 'ativo' : ''}">${nome}</a>`).join('')}<button type="button" title="Apaga o que foi clicado e recomeça o exemplo">Recomeçar</button>`;
  el.querySelector('button').addEventListener('click', () => { if (confirm('Recomeçar a demonstração? Entregas, compras e aprovações feitas aqui serão apagadas.')) recomecarDemo(); });
  document.body.append(el);
  document.body.classList.add('com-demo');
}

// Confirmação de diálogo pelo envio do formulário (o evento "close" não dispara em todos os navegadores).
function aoConfirmar(dlg, fn) {
  dlg.querySelector('form').addEventListener('submit', (e) => { if (e.submitter?.value === 'ok') fn(); });
}

// Inclinação 3D leve e luz que segue o mouse nos cards (só mouse; desligado com "reduzir movimento").
(function efeitosPremium() {
  const SEL = '.card, .op-card, .pacote, .kpi, .plano';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let atual = null;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.(SEL);
    if (atual && atual !== el) { atual.style.transform = ''; atual = null; }
    if (!el) return;
    atual = el;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 6}deg) translateY(-4px)`;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { if (atual) atual.style.transform = ''; atual = null; }, true);
})();
