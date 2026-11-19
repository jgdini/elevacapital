// Utilitários compartilhados pelos coletores (base: coleta do Veículo Judicial).

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch com user-agent de navegador, timeout e pequena pausa entre chamadas
// (educado com o servidor de origem).
export async function get(url, opts = {}) {
  await sleep(opts.delay ?? 800);
  const res = await fetch(url, {
    ...opts,
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout ?? 30000),
    redirect: opts.redirect ?? 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res;
}

// Entidades nomeadas comuns em sites brasileiros (acentos, º/ª, m²).
const ENTIDADES = Object.fromEntries('aacute:á,eacute:é,iacute:í,oacute:ó,uacute:ú,Aacute:Á,Eacute:É,Iacute:Í,Oacute:Ó,Uacute:Ú,atilde:ã,otilde:õ,Atilde:Ã,Otilde:Õ,acirc:â,ecirc:ê,ocirc:ô,Acirc:Â,Ecirc:Ê,Ocirc:Ô,agrave:à,Agrave:À,ccedil:ç,Ccedil:Ç,ordf:ª,ordm:º,deg:°,uuml:ü,sup2:²,ndash:–,mdash:—'.split(',').map((p) => p.split(':')));

export function decode(s = '') {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENTIDADES[n] ?? m);
}

export const clean = (s = '') => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// "R$ 9.961,50" -> 9961.5
export function brl(s) {
  if (s == null) return null;
  const m = String(s).match(/[\d.]+,\d{2}|\d[\d.]*/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// "25/09/2026" + "10:30" -> ISO em horário de Brasília (-03:00)
export function dataBR(d, h = '00:00') {
  const m = d && d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const hm = (h && h.match(/\d{2}:\d{2}/)?.[0]) || '00:00';
  return `${m[3]}-${m[2]}-${m[1]}T${hm}:00-03:00`;
}

// Primeira letra maiúscula por palavra ("SÃO PAULO" -> "São Paulo"), preposições em minúscula.
export function titulo(s = '') {
  return s
    .toLowerCase()
    .replace(/(^|[\s/(-])([a-zà-ú])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\s(D[aeo]s?|E)(?=\s)/g, (m) => m.toLowerCase())
    .trim();
}

export const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
export const uf = (s = '') => (UFS.includes(String(s).trim().toUpperCase()) ? String(s).trim().toUpperCase() : null);
