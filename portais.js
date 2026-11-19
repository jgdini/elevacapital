// Peças comuns dos portais com marca (imobiliária, área do cliente e loja). Depende de comum.js.

const HALO = '<a href="https://haloconsulting.com.br/" target="_blank" rel="noopener" class="halo-credit" aria-label="Halo Company"><svg viewBox="0 0 32 32" width="16" height="16" aria-hidden="true" class="halo-sym"><g transform="rotate(-90 16 16)" fill="none" stroke-width="3.2" stroke-linecap="round"><circle cx="16" cy="16" r="11" pathLength="300" stroke="#E0506F" stroke-dasharray="86 214"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="#E7C493" stroke-dasharray="86 214" stroke-dashoffset="-100"/><circle cx="16" cy="16" r="11" pathLength="300" stroke="#1B2433" stroke-dasharray="86 214" stroke-dashoffset="-200"/></g></svg><span class="halo-nome">halo <small>company</small></span></a>';

/** Monta topo, abas e rodapé com a marca de quem atende (imobiliária ou Eleva). */
function montarPortal({ marca, cor, quem, abas, atual }) {
  document.body.style.setProperty('--marca', cor);
  $('#topo').innerHTML = `<div class="wrap"><a class="portal-logo" href="#/inicio"><i>${esc(iniciais(marca))}</i>${esc(marca)}</a><div class="quem"><span>${esc(quem.papel)}</span><div class="avatar">${esc(iniciais(quem.nome))}</div><b>${esc(quem.nome)}</b></div></div>`;
  $('#abas').innerHTML = `<div class="wrap">${abas.map(([id, nome]) => `<a href="#/${id}" class="${id === atual ? 'ativo' : ''}">${nome}</a>`).join('')}</div>`;
  $('#rodape').innerHTML = `<span>${esc(marca)}${marca === 'Eleva Capital' ? '' : ' · análises técnicas Eleva Capital'} · protótipo com imóveis reais e clientes fictícios</span><span>Desenvolvido por ${HALO}</span>`;
}

const ROTULO_CHECK = { ok: ['OK', 'verde'], at: ['Atenção', 'amb'], ri: ['Risco', 'verm'], '': ['Pendente', ''] };

/** Card de uma oportunidade entregue (imóvel + análise). */
function cardOportunidade({ imovel: x, analise: a }, { extra = '', acoes = '' } = {}) {
  const r = calcular(a?.custos || custosPadrao(x));
  const [pn, pc] = a?.parecer ? PARECERES[a.parecer] : ['Em análise', 'azul'];
  return `<article class="op-card entra">
    <div class="ft">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="et ${pc}">${pn}</span>${x.d ? `<span class="et vidro">−${x.d}%</span>` : ''}</div>
    <div class="cp">
      <span class="cinza">${esc(x.tp)}${x.a ? ' · ' + area(x.a) : ''} · leilão ${dataCurta(x.e)}</span>
      <h4>${esc(x.t)}</h4>
      <span class="cinza">${esc(local(x))}</span>
      ${extra}
      <div class="nums"><div><small>Lance atual</small><b>${curto(x.l)}</b></div><div><small>Limite recomendado</small><b>${curto(r.perfis.Alvo)}</b></div></div>
      <div class="acoes">${acoes}</div>
    </div>
  </article>`;
}

/** Análise resumida (o que o cliente e a imobiliária enxergam). */
function analiseResumida(x, a) {
  const r = calcular(a?.custos || custosPadrao(x));
  const [pn, pc] = a?.parecer ? PARECERES[a.parecer] : ['Em análise', 'azul'];
  return `
    ${x.img ? `<img src="${esc(x.img)}" alt="Foto do imóvel" referrerpolicy="no-referrer" style="width:100%;height:220px;object-fit:cover;border-radius:12px">` : ''}
    <div><span class="et ${pc}">${pn}</span> <span class="et">${x.n === 'J' ? 'Judicial' : 'Extrajudicial'}</span></div>
    <h3>${esc(x.t)}</h3><p class="cinza" style="margin:0">${esc(local(x))} · ${esc(x.tp)}${x.a ? ' · ' + area(x.a) : ''} · encerra ${x.e ? new Date(x.e).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–'}</p>
    ${a?.texto ? `<p style="margin:0;line-height:1.55">${esc(a.texto)}</p>` : ''}
    <div class="resumo-calc" style="margin-top:0"><div class="max"><small>Limite recomendado</small><b>${brl(r.perfis.Alvo)}</b></div><div><small>Lance atual</small><b>${brl(x.l)}</b></div><div><small>Lucro estimado</small><b>${brl(r.lucro)}</b></div><div><small>Retorno · ao mês</small><b>${pct(r.roi, 0)} · ${pct(r.tir, 1)}</b></div></div>
    <div>${CHECKLIST.map(([t], i) => { const s = ROTULO_CHECK[a?.checklist[i]?.s || '']; return `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--linha-2);font-size:14px"><span>${t}${a?.checklist[i]?.nota ? `<br><span class="cinza">${esc(a.checklist[i].nota)}</span>` : ''}</span><span class="et ${s[1]}">${s[0]}</span></div>`; }).join('')}</div>`;
}

/** Trilha das 8 etapas da operação. */
function trilha(etapa) {
  return `<div class="trilha" aria-label="Etapa ${etapa + 1} de 8: ${ETAPAS[etapa]}">${ETAPAS.map((_, i) => `<span class="${i < etapa ? 'feito' : i === etapa ? 'agora' : ''}"></span>`).join('')}</div><div class="trilha-rot"><span>Alinhamento</span><span><b>${etapa + 1}. ${ETAPAS[etapa]}</b></span><span>Venda</span></div>`;
}

function abrirModal(html, largura = 620) {
  const m = $('#modal');
  m.style.width = `min(${largura}px, calc(100% - 24px))`;
  m.innerHTML = `<div class="modal" style="max-height:calc(100vh - 40px);overflow:auto">${html}</div>`;
  m.showModal();
  return m;
}
$('#modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
