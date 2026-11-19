// Classificação e campos próprios de imóvel: tipo, área, ocupação, natureza e desconto.

// Ordem importa: o primeiro que bater define o tipo.
const TIPOS = [
  ['Garagem', /\b(vagas? de garagem|box de garagem|dep[oó]sito de garagem|garagens?)\b/i],
  ['Apartamento', /\b(apartamentos?|apto\.?|flat|cobertura|kitnet|kitinete|studio|duplex|triplex)\b/i],
  ['Casa', /\b(casas?|sobrados?|resid[eê]ncias?|residencial|edícula|bangal[oô])\b/i],
  ['Galpão/Industrial', /\b(galp[aã]o|galp[oõ]es|industri(al|ais)|armaz[eé]m|barrac[aã]o|f[aá]brica|dep[oó]sito)\b/i],
  ['Comercial', /\b(salas?|lojas?|comercia(l|is)|conjunto comercial|pr[eé]dio|edif[ií]cio|hotel|hot[eé]is|hospita(l|is)|posto de combust|ponto comercial|consult[oó]rio)\b/i],
  ['Rural', /\b(fazendas?|s[ií]tios?|ch[aá]caras?|rura(l|is)|glebas?|hectares?|\bha\b|alqueires?)\b/i],
  ['Terreno', /\b(terrenos?|lotes? de terreno|lote urbano|[aá]rea de terra|[aá]rea urbana|incorpora[cç][aã]o)\b/i],
];

const NAO_IMOVEL = /\b(quotas?|a[cç][oõ]es|ve[ií]culos?|m[aá]quinas?|equipamentos?|sucata|semoventes?|gado|combust[ií]vel|gasolina|diesel|etanol|litros|\d[\d.]*\s*L de)\b/i;

/** Tipo do imóvel a partir da categoria da fonte e do título. null = não é imóvel. */
export function tipoImovel(texto = '', categoria = '') {
  const cat = TIPOS.find(([, re]) => re.test(categoria || ''))?.[0];
  const txt = TIPOS.find(([, re]) => re.test(texto || ''))?.[0];
  if (!txt && NAO_IMOVEL.test(texto)) return null;
  // O título costuma ser mais específico que a categoria ("Imóveis comerciais" vs "Sala comercial").
  return txt || cat || 'Outro';
}

/** Área em m² ("390,48m²", "477 m2", "16.040 hectares"). */
export function areaDe(texto = '') {
  const ha = texto.match(/([\d.]+(?:,\d+)?)\s*(hectares?|ha)\b/i);
  if (ha) return Math.round(parseFloat(ha[1].replace(/\./g, '').replace(',', '.')) * 10000);
  const m = texto.match(/([\d.]+(?:,\d+)?)\s*(m²|m2|mts?²|metros quadrados)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ocupacaoDe(texto = '') {
  if (/desocupad/i.test(texto)) return 'Desocupado';
  if (/\bocupad/i.test(texto)) return 'Ocupado';
  return null;
}

const JUDICIAL = /TRIBUNAL|JUSTI[CÇ]A|\bVARA\b|\bTRT\b|\bTJ[A-Z]{2}\b|JU[IÍ]ZO|\bFORO\b|PROCESSO|\bAUTOS\b|EXEQUENTE|EXECUTAD|\d{7}-\d{2}\.\d{4}/i;
export const naturezaDe = (texto = '') => (/extrajudicial/i.test(texto) ? 'Extrajudicial' : JUDICIAL.test(texto) ? 'Judicial' : 'Extrajudicial');

/** Desconto em % do lance sobre a avaliação. */
export const descontoDe = (lance, avaliacao) =>
  lance && avaliacao && lance < avaliacao ? Math.round((1 - lance / avaliacao) * 100) : null;
