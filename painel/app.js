// Painel da equipe Eleva (protótipo). Usa ../comum.js para dados, estado e cálculos.

// ---------------------------------------------------------------- telas
const TELAS = [
  ['inicio', 'Início'], ['imoveis', 'Imóveis'], ['analises', 'Análises'], ['entregas', 'Entregas e pacotes'],
  ['operacoes', 'Operações'], ['sep'], ['clientes', 'Clientes e parceiros'], ['financeiro', 'Financeiro'], ['agenda', 'Agenda'], ['fontes', 'Fontes de leilão'],
];

function menu(atual) {
  const conta = { analises: E.analises.filter((a) => a.status !== 'Concluída').length, entregas: E.pacotes.filter((p) => p.entregues.length < p.total).length };
  $('#menu').innerHTML = TELAS.map(([id, nome]) => (id === 'sep' ? '<div class="sep"></div>' : `<a href="#/${id}" class="${atual === id ? 'ativo' : ''}">${ico(id)}${nome}${conta[id] ? `<span class="n">${conta[id]}</span>` : ''}</a>`)).join('');
}
function cabecalho(titulo, migalha = 'Painel', acoes = '') {
  $('#titulo').textContent = titulo;
  $('#migalha').textContent = migalha;
  $('#acoes-barra').innerHTML = acoes + '<span class="aviso-proto">Protótipo · imóveis reais, clientes fictícios</span>';
}

function telaInicio() {
  cabecalho('Bom dia, Antonio', 'Painel · ' + new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
  const semana = IMOVEIS.filter((x) => { const d = dias(x.e); return d != null && d >= 0 && d <= 7; }).length;
  const pend = E.pacotes.filter((p) => p.entregues.length < p.total);
  const faltam = pend.reduce((s, p) => s + p.total - p.entregues.length, 0);
  const andamento = E.analises.filter((a) => a.status !== 'Concluída');
  const tarefas = [
    // O que chega dos outros portais: lances aprovados pelos clientes e consultorias pagas.
    ...E.aprovacoes.map((a) => { const x = POR_ID.get(a.imovel); const c = cliente(a.cliente); return { ic: 'operacoes', cor: 'var(--verde-claro)', t: `${c.nome} aprovou lance até ${brl(a.limite)}`, s: `${x.t} · ${local(x)} · leilão ${dataCurta(x.e)}`, et: ['Lance aprovado', 'verde'], href: '#/operacoes' }; }),
    ...E.consultorias.map((k) => ({ ic: 'agenda', cor: 'var(--gold-claro)', t: `Consultoria paga: ${k.nome}`, s: `${k.formato} · ${k.quando}`, et: ['Nova', 'ouro'], href: '#/agenda' })),
    ...[...pend].sort((x, y) => (y.novo ? 1 : 0) - (x.novo ? 1 : 0)).map((p) => ({ ic: 'entregas', cor: 'var(--gold-claro)', t: `${cliente(p.cliente).nome}: faltam ${p.total - p.entregues.length} de ${p.total}`, s: `${p.tipo} · entregar até ${dataCurta(p.prazoEntrega)}`, et: p.novo ? ['Compra nova', 'verde'] : dias(p.prazoEntrega) <= 3 ? ['Urgente', 'verm'] : ['Pacote', 'ouro'], href: '#/entregas' })),
    ...andamento.map((a) => { const x = POR_ID.get(a.imovel); return { ic: 'analises', cor: 'var(--azul-claro)', t: `Análise: ${x.t}`, s: `${local(x)} · ${a.analista} · encerra ${dataCurta(x.e)}`, et: ['Em análise', 'azul'], href: '#/analise/' + a.imovel }; }),
    ...E.operacoes.filter((o) => dias(o.prazo) <= 3).map((o) => ({ ic: 'operacoes', cor: 'var(--verm-claro)', t: `${ETAPAS[o.etapa]}: ${cliente(o.cliente).nome}`, s: `${POR_ID.get(o.imovel).t} · prazo ${dataCurta(o.prazo)}`, et: ['Prazo', 'verm'], href: '#/operacoes' })),
  ];
  const porEtapa = ETAPAS.map((e, i) => [e, E.operacoes.filter((o) => o.etapa === i).length]);
  const max = Math.max(1, ...porEtapa.map((p) => p[1]));
  $('#tela').innerHTML = `
  <div class="kpis entra">
    <div class="kpi escuro"><small>Imóveis na base</small><b>${IMOVEIS.length.toLocaleString('pt-BR')}</b><span>coleta de ${dataCurta(COLETA)} · ${semana} encerram em 7 dias</span></div>
    <div class="kpi"><small>Pacotes a entregar</small><b>${pend.length}</b><span>${faltam} oportunidades pendentes</span></div>
    <div class="kpi"><small>Análises em andamento</small><b>${andamento.length}</b><span>${E.analises.length - andamento.length} concluídas este mês</span></div>
    <div class="kpi"><small>Operações ativas</small><b>${E.operacoes.length}</b><span>${E.operacoes.filter((o) => o.etapa === 5).length} em disputa esta semana</span></div>
  </div>
  <div class="grade-21">
    <div class="caixa entra"><h3>Fila do dia <small>${tarefas.length} itens</small></h3><div class="fila">
      ${tarefas.map((t) => `<a class="tarefa" href="${t.href}" style="text-decoration:none"><span class="ic" style="background:${t.cor}">${ico(t.ic)}</span><span><b>${esc(t.t)}</b><small>${esc(t.s)}</small></span><span class="et ${t.et[1]}">${t.et[0]}</span></a>`).join('')}
    </div></div>
    <div class="caixa entra"><h3>Operações por etapa</h3><div class="funil">
      ${porEtapa.map(([e, n]) => `<div><span>${e}</span><i style="width:${(n / max) * 100}%;opacity:${n ? 1 : 0.15}"></i><em>${n}</em></div>`).join('')}
    </div></div>
  </div>
  <div class="caixa entra"><h3>Imóveis que combinam com cada cliente <small>cruzamento automático do perfil com a base</small></h3>
    <div class="tabela-rolar"><table class="tabela"><thead><tr><th>Cliente</th><th>Origem</th><th>Perfil</th><th class="num">Capital</th><th class="num">Combinam hoje</th><th></th></tr></thead><tbody>
    ${E.clientes.map((c) => `<tr><td class="forte">${esc(c.nome)}</td><td>${c.via ? `<span class="et">${esc(imob(c.via).nome)}</span>` : '<span class="et ouro">Direto (B2C)</span>'}</td><td class="cinza">${c.tipos.join(', ')} · ${c.uf} · ${c.objetivo}</td><td class="num">${curto(c.capital)}</td><td class="num forte">${combina(c).length}</td><td><a class="btn peq" href="#/imoveis?cliente=${c.id}">Ver imóveis</a></td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

let filtroImoveis = { q: '', uf: '', tp: '', desc: '', pagina: 1, cliente: '' };
function telaImoveis(params) {
  if (params.get('cliente')) filtroImoveis = { ...filtroImoveis, cliente: params.get('cliente'), pagina: 1 };
  const cl = filtroImoveis.cliente && cliente(filtroImoveis.cliente);
  cabecalho('Imóveis', 'Painel · base da coleta');
  const ufs = [...new Set(IMOVEIS.map((x) => x.u).filter(Boolean))].sort();
  const tipos = [...new Set(IMOVEIS.map((x) => x.tp))].sort();
  const termos = norm(filtroImoveis.q).split(/\s+/).filter(Boolean);
  let lista = (cl ? combina(cl) : IMOVEIS).filter((x) =>
    (!filtroImoveis.uf || x.u === filtroImoveis.uf) && (!filtroImoveis.tp || x.tp === filtroImoveis.tp) && (!filtroImoveis.desc || (x.d || 0) >= +filtroImoveis.desc) &&
    termos.every((t) => x._busca.includes(t)));
  lista.sort((a, b) => (a.e ? new Date(a.e) : Infinity) - (b.e ? new Date(b.e) : Infinity));
  const porPag = 40, total = lista.length, pags = Math.max(1, Math.ceil(total / porPag));
  filtroImoveis.pagina = Math.min(filtroImoveis.pagina, pags);
  const parte = lista.slice((filtroImoveis.pagina - 1) * porPag, filtroImoveis.pagina * porPag);
  $('#tela').innerHTML = `
  ${cl ? `<div class="caixa entra" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="et navy">Perfil</span><b>${esc(cl.nome)}</b><span class="cinza">${cl.tipos.join(', ')} em ${cl.uf}, até ${curto(cl.capital)} · ${cl.objetivo}</span><button class="btn peq" id="sem-cliente" style="margin-left:auto">Ver toda a base</button></div>` : ''}
  <div class="filtros">
    <label class="filtro"><input id="fi-q" type="search" placeholder="Buscar cidade, bairro, tipo…" value="${esc(filtroImoveis.q)}" aria-label="Buscar"></label>
    <label class="filtro"><select id="fi-uf" aria-label="Estado"><option value="">Todos os estados</option>${ufs.map((u) => `<option ${u === filtroImoveis.uf ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
    <label class="filtro"><select id="fi-tp" aria-label="Tipo"><option value="">Todos os tipos</option>${tipos.map((t) => `<option ${t === filtroImoveis.tp ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="filtro"><select id="fi-desc" aria-label="Desconto"><option value="">Qualquer desconto</option>${[30, 40, 50].map((d) => `<option value="${d}" ${String(d) === filtroImoveis.desc ? 'selected' : ''}>${d}% ou mais</option>`).join('')}</select></label>
    <span class="cinza" style="margin-left:auto">${total.toLocaleString('pt-BR')} imóveis · página ${filtroImoveis.pagina} de ${pags}</span>
  </div>
  <div class="caixa entra" style="padding:6px 8px"><div class="tabela-rolar"><table class="tabela"><thead><tr><th></th><th>Imóvel</th><th>Local</th><th class="num">Lance atual</th><th class="num">Desconto</th><th>Encerra</th><th>Fonte</th><th></th></tr></thead><tbody>
    ${parte.map((x) => { const a = analiseDe(x.id); return `<tr><td>${foto(x)}</td><td><b>${esc(x.t)}</b><div class="cinza">${esc(x.tp)}${x.a ? ' · ' + area(x.a) : ''} · ${x.n === 'J' ? 'Judicial' : 'Extrajudicial'}</div></td><td class="cinza">${esc(local(x))}</td><td class="num forte">${brl(x.l)}</td><td class="num">${x.d ? `<span class="et ouro">−${x.d}%</span>` : '–'}</td><td>${dias(x.e) <= 2 ? `<span class="et verm">${dataCurta(x.e)}</span>` : dataCurta(x.e)}</td><td class="cinza">${esc(x.f)}</td><td>${a ? `<a class="btn peq" href="#/analise/${encodeURIComponent(x.id)}">${a.status === 'Concluída' ? 'Ver análise' : 'Continuar'}</a>` : `<a class="btn peq ouro" href="#/analise/${encodeURIComponent(x.id)}">Analisar</a>`}</td></tr>`; }).join('')}
  </tbody></table></div></div>
  <div style="display:flex;gap:8px;justify-content:center">${filtroImoveis.pagina > 1 ? '<button class="btn" id="pg-ant">Anterior</button>' : ''}${filtroImoveis.pagina < pags ? '<button class="btn" id="pg-prox">Próxima</button>' : ''}</div>`;
  const re = () => telaImoveis(new URLSearchParams());
  let t;
  $('#fi-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { filtroImoveis.q = e.target.value; filtroImoveis.pagina = 1; re(); const i = $('#fi-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); });
  [['#fi-uf', 'uf'], ['#fi-tp', 'tp'], ['#fi-desc', 'desc']].forEach(([s, k]) => $(s).addEventListener('change', (e) => { filtroImoveis[k] = e.target.value; filtroImoveis.pagina = 1; re(); }));
  $('#pg-ant')?.addEventListener('click', () => { filtroImoveis.pagina--; re(); scrollTo(0, 0); });
  $('#pg-prox')?.addEventListener('click', () => { filtroImoveis.pagina++; re(); scrollTo(0, 0); });
  $('#sem-cliente')?.addEventListener('click', () => { filtroImoveis.cliente = ''; history.replaceState(null, '', '#/imoveis'); re(); });
}

function telaAnalises() {
  cabecalho('Análises', 'Painel', '<a class="btn ouro" href="#/imoveis">Nova análise</a>');
  const linhas = [...E.analises].sort((a, b) => (a.status === b.status ? 0 : a.status === 'Concluída' ? 1 : -1));
  $('#tela').innerHTML = `<div class="caixa entra" style="padding:6px 8px"><div class="tabela-rolar"><table class="tabela"><thead><tr><th></th><th>Imóvel</th><th>Analista</th><th>Checklist</th><th>Parecer</th><th>Encerra</th><th>Entregue para</th></tr></thead><tbody>
  ${linhas.map((a) => { const x = POR_ID.get(a.imovel); const feitos = a.checklist.filter((c) => c.s).length; const para = E.pacotes.filter((p) => p.entregues.includes(a.imovel)).map((p) => cliente(p.cliente).nome); return `<tr class="click" data-href="#/analise/${encodeURIComponent(a.imovel)}"><td>${foto(x)}</td><td><b>${esc(x.t)}</b><div class="cinza">${esc(local(x))}</div></td><td>${esc(a.analista)}</td><td style="min-width:120px"><div class="progresso"><i style="width:${(feitos / CHECKLIST.length) * 100}%"></i></div><span class="cinza">${feitos} de ${CHECKLIST.length}</span></td><td>${a.parecer ? `<span class="et ${PARECERES[a.parecer][1]}">${PARECERES[a.parecer][0]}</span>` : '<span class="et azul">Em análise</span>'}</td><td>${dataCurta(x.e)}</td><td class="cinza">${esc(para.join(', ') || '–')}</td></tr>`; }).join('')}
  </tbody></table></div></div>`;
  $$('tr.click').forEach((tr) => tr.addEventListener('click', () => (location.hash = tr.dataset.href)));
}

let abaAnalise = 'checklist';
function telaAnalise(imovelId) {
  const x = POR_ID.get(imovelId);
  if (!x) return (location.hash = '#/imoveis');
  let a = analiseDe(imovelId);
  if (!a) {
    a = { id: 'a-' + imovelId, imovel: imovelId, analista: 'Antonio', status: 'Em análise', criada: new Date().toISOString(), checklist: CHECKLIST.map(() => ({ s: '', nota: '' })), custos: null, parecer: '', texto: '' };
    E.analises.push(a); salvar(); abaAnalise = 'checklist';
  }
  if (!a.custos) a.custos = custosPadrao(x);
  cabecalho('Análise do imóvel', 'Análises · ' + x.f, `<a class="btn" href="#/relatorio/${encodeURIComponent(imovelId)}">Ver relatório</a><button class="btn ouro" id="entregar">Entregar ao cliente</button>`);
  const feitos = a.checklist.filter((c) => c.s).length;
  $('#tela').innerHTML = `
  <div class="caixa entra cab-imovel">
    ${x.img ? `<img src="${esc(x.img)}" alt="Foto do imóvel" referrerpolicy="no-referrer">` : '<div class="semfoto"></div>'}
    <div>
      <span class="et ${x.n === 'J' ? 'navy' : ''}">${x.n === 'J' ? 'Judicial' : 'Extrajudicial'}</span> <span class="et">${esc(x.tp)}${x.a ? ' · ' + area(x.a) : ''}</span>
      <h2 style="margin-top:8px">${esc(x.t)}</h2>
      <p>${esc(x.o || '')}</p>
      <div class="fatos"><div><small>Local</small><b>${esc(local(x)) || '–'}</b></div><div><small>Lance atual</small><b>${brl(x.l)}</b></div><div><small>${x.av ? 'Avaliação' : '1ª praça'}</small><b>${brl(x.av || x.p1)}</b></div>${x.p2 ? `<div><small>2ª praça</small><b>${brl(x.p2)}</b></div>` : ''}<div><small>Encerra</small><b>${x.e ? new Date(x.e).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–'}</b></div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
      <span class="et ${a.status === 'Concluída' ? 'verde' : 'azul'}">${a.status}</span>
      <span class="cinza">Analista: <b>${esc(a.analista)}</b></span>
      <a class="btn peq" href="${esc(x.url)}" target="_blank" rel="noopener">Abrir edital no leiloeiro</a>
    </div>
  </div>
  <div class="caixa entra">
    <div class="abas" role="tablist">
      ${[['checklist', `Checklist jurídico (${feitos}/${CHECKLIST.length})`], ['calculo', 'Custos e cálculo'], ['parecer', 'Parecer'], ['anexos', 'Anexos']].map(([id, n]) => `<button role="tab" aria-selected="${abaAnalise === id}" data-aba="${id}">${n}</button>`).join('')}
    </div>
    <div id="aba"></div>
  </div>`;
  $$('[data-aba]').forEach((b) => b.addEventListener('click', () => { abaAnalise = b.dataset.aba; telaAnalise(imovelId); }));
  $('#entregar').addEventListener('click', () => modalEntregar(imovelId));
  const alvo = $('#aba');
  if (abaAnalise === 'checklist') {
    alvo.innerHTML = `<div class="progresso" style="margin-bottom:6px"><i style="width:${(feitos / CHECKLIST.length) * 100}%"></i></div>` + CHECKLIST.map(([t, d], i) => `<div class="check"><div><b>${t}</b><p>${d}</p></div><div class="seg" role="group" aria-label="${t}">${[['ok', 'OK'], ['at', 'Atenção'], ['ri', 'Risco']].map(([v, n]) => `<button class="${v}" data-i="${i}" data-v="${v}" aria-pressed="${a.checklist[i].s === v}">${n}</button>`).join('')}</div><input data-nota="${i}" placeholder="Observação (aparece no relatório)" value="${esc(a.checklist[i].nota)}"></div>`).join('');
    $$('.seg button', alvo).forEach((b) => b.addEventListener('click', () => { const c = a.checklist[+b.dataset.i]; c.s = c.s === b.dataset.v ? '' : b.dataset.v; salvar(); telaAnalise(imovelId); }));
    $$('[data-nota]', alvo).forEach((i) => i.addEventListener('change', () => { a.checklist[+i.dataset.nota].nota = i.value; salvar(); }));
  } else if (abaAnalise === 'calculo') {
    const campos = [['mercado', 'Valor de mercado (R$)'], ['lance', 'Lance considerado (R$)'], ['prazo', 'Prazo até vender (meses)'], ['comissao', 'Comissão do leiloeiro (%)'], ['itbi', 'ITBI (%)'], ['registro', 'Registro e escritura (%)'], ['dividas', 'Dívidas que ficam (R$)'], ['desocupacao', 'Desocupação (R$)'], ['reforma', 'Reforma (R$)'], ['corretagem', 'Corretagem na venda (%)'], ['cdi', 'CDI ao mês (%)']];
    alvo.innerHTML = `<div class="custos">${campos.map(([k, n]) => `<div class="campo"><label for="k-${k}">${n}</label><input id="k-${k}" data-k="${k}" inputmode="decimal" value="${a.custos[k].toLocaleString('pt-BR')}"></div>`).join('')}</div><div id="res"></div>`;
    const mostrar = () => {
      const r = calcular(a.custos);
      const folga = r.perfis.Alvo - a.custos.lance;
      $('#res').innerHTML = `<div class="resumo-calc"><div class="max"><small>Lance máximo (alvo 25%)</small><b>${brl(r.perfis.Alvo)}</b></div><div><small>Lucro líquido</small><b>${brl(r.lucro)}</b></div><div><small>ROI · TIR ao mês</small><b>${pct(r.roi)} · ${pct(r.tir, 2)}</b></div><div><small>VPL (contra o CDI)</small><b>${brl(r.vpl)}</b></div></div>
      <div class="perfis3">${Object.entries(r.perfis).map(([p, v]) => `<div><small>${p} (${{ Conservador: 35, Alvo: 25, Agressivo: 15 }[p]}%)</small><b>${brl(v)}</b></div>`).join('')}</div>
      <div class="veredito ${folga >= 0 ? 'bom' : 'ruim'}">${folga >= 0 ? `O lance considerado está ${brl(folga)} abaixo do limite do perfil alvo.` : `O lance considerado passa ${brl(-folga)} do limite do perfil alvo.`} Custo total da operação: ${brl(r.custo)}. Imposto estimado: ${brl(r.ir)}.</div>`;
    };
    $$('[data-k]', alvo).forEach((i) => i.addEventListener('input', () => { a.custos[i.dataset.k] = numero(i.value); salvar(); mostrar(); }));
    mostrar();
  } else if (abaAnalise === 'parecer') {
    const r = calcular(a.custos);
    alvo.innerHTML = `<div class="parecer-opcoes">${Object.entries(PARECERES).map(([k, [n]]) => `<button data-p="${k}" aria-pressed="${a.parecer === k}"><b>${n}</b><small>${{ rec: 'Imóvel aprovado dentro do limite de lance', res: 'Aprovado, com pontos que o cliente precisa saber', nao: 'Risco ou conta que não fecha' }[k]}</small></button>`).join('')}</div>
    <div class="grade-2"><div class="campo"><label for="p-texto">Justificativa (vai no relatório)</label><textarea id="p-texto" placeholder="Por que recomendar ou não este imóvel…">${esc(a.texto)}</textarea></div>
    <div class="campo"><label>Limite de lance recomendado</label><div class="kpi escuro"><small>Perfil alvo</small><b>${brl(r.perfis.Alvo)}</b><span>Conservador ${brl(r.perfis.Conservador)} · Agressivo ${brl(r.perfis.Agressivo)}</span></div>
    <button class="btn navy" id="concluir" style="margin-top:8px">${a.status === 'Concluída' ? 'Análise concluída' : 'Concluir análise'}</button></div></div>`;
    $$('[data-p]', alvo).forEach((b) => b.addEventListener('click', () => { a.parecer = b.dataset.p; salvar(); telaAnalise(imovelId); }));
    $('#p-texto').addEventListener('change', (e) => { a.texto = e.target.value; salvar(); });
    $('#concluir').addEventListener('click', () => {
      if (!a.parecer) return avisar('Escolha um parecer antes de concluir.');
      a.status = 'Concluída'; salvar(); avisar('Análise concluída. Já pode ser entregue e gerar o relatório.'); telaAnalise(imovelId);
    });
  } else {
    alvo.innerHTML = `<div class="anexos">${[['Edital do leilão', 'PDF · baixado do leiloeiro'], ['Matrícula atualizada', 'PDF · cartório'], ['Certidão de débitos de IPTU', 'PDF · prefeitura'], ['Fotos da vistoria externa', '6 imagens']].map(([n, d]) => `<div class="anexo">${ico('analises', 16)}<b>${n}</b><small>${d}</small></div>`).join('')}<div class="soltar">Arraste arquivos aqui (no sistema final, ficam guardados com a análise)</div></div>`;
  }
}

function modalEntregar(imovelId) {
  if (analiseDe(imovelId)?.status !== 'Concluída') return avisar('Conclua a análise (aba Parecer) antes de entregar ao cliente.');
  const m = $('#modal');
  const destinos = E.pacotes.filter((p) => p.entregues.length < p.total && !p.entregues.includes(imovelId));
  m.innerHTML = `<form class="modal" method="dialog"><h3>Entregar esta análise</h3><p class="cinza" style="margin:0">O cliente recebe o imóvel com a análise na área dele. Para cliente de imobiliária, o card sai com a marca da imobiliária.</p>
  ${destinos.map((p, i) => { const c = cliente(p.cliente); return `<label class="opcao"><input type="radio" name="d" value="${p.id}" ${i ? '' : 'checked'}><span><b>${esc(c.nome)}</b><br><span class="cinza">${esc(p.tipo)} · ${p.entregues.length} de ${p.total} entregues${c.via ? ' · via ' + esc(imob(c.via).nome) : ''}</span></span></label>`; }).join('') || '<p>Nenhum pacote com vaga para este imóvel.</p>'}
  <div class="acoes"><button class="btn" value="cancelar">Cancelar</button>${destinos.length ? '<button class="btn ouro" value="ok">Entregar</button>' : ''}</div></form>`;
  aoConfirmar(m, () => {
    const p = E.pacotes.find((x) => x.id === $('input[name=d]:checked', m)?.value);
    if (!p || p.entregues.includes(imovelId) || p.entregues.length >= p.total) return;
    p.entregues.push(imovelId); salvar(); menu('analises');
    avisar(`Entregue para ${cliente(p.cliente).nome} (${p.entregues.length} de ${p.total}).`);
  });
  m.showModal();
}

function telaEntregas() {
  cabecalho('Entregas e pacotes', 'Painel', '<button class="btn ouro" id="novo-pacote">Registrar venda de pacote</button>');
  $('#tela').innerHTML = `<div class="pacotes">${E.pacotes.map((p) => { const c = cliente(p.cliente); const n = p.entregues.length; return `<div class="pacote entra">
    <div class="topo"><div class="avatar" style="width:38px;height:38px">${esc(c.nome.split(' ').map((s) => s[0]).slice(0, 2).join(''))}</div><div><h4>${esc(c.nome)}</h4><span class="cinza">${c.via ? 'via ' + esc(imob(c.via).nome) : 'Cliente direto'}</span></div><span class="et ${n >= p.total ? 'verde' : dias(p.prazoEntrega) <= 3 ? 'verm' : 'ouro'}" style="margin-left:auto">${n >= p.total ? 'Completo' : 'Entregar até ' + dataCurta(p.prazoEntrega)}</span></div>
    <p><b>${esc(p.tipo)}</b>${p.preco ? ' · ' + brl(p.preco) : p.preco === null ? ' · R$ [__]' : ''}<br>Perfil: ${c.tipos.join(', ')} em ${c.uf}, até ${curto(c.capital)} · ${c.objetivo}</p>
    <div class="linha"><span>${n} de ${p.total} entregues</span><span>${Math.round((n / p.total) * 100)}%</span></div>
    <div class="progresso"><i style="width:${(n / p.total) * 100}%"></i></div>
    <div class="entregues">${p.entregues.map((id) => { const x = POR_ID.get(id); return x?.img ? `<img src="${esc(x.img)}" alt="" title="${esc(x.t)}" referrerpolicy="no-referrer">` : '<span>✓</span>'; }).join('')}${Array.from({ length: Math.min(p.total - n, 6) }, () => '<span>+</span>').join('')}</div>
    ${n < p.total ? `<a class="btn peq ouro" href="#/imoveis?cliente=${c.id}">Buscar imóveis para este perfil</a>` : ''}
  </div>`; }).join('')}</div>`;
  $('#novo-pacote').addEventListener('click', () => avisar('No sistema final, a venda entra sozinha quando o pagamento é aprovado.'));
}

function telaOperacoes() {
  cabecalho('Operações', 'Painel · assessoria completa', '<span class="cinza">Arraste os cartões entre as etapas</span>');
  $('#tela').innerHTML = `<div class="kanban">${ETAPAS.map((e, i) => `<div class="coluna" data-etapa="${i}"><h4><span>${i + 1}. ${e}</span><span>${E.operacoes.filter((o) => o.etapa === i).length}</span></h4>
    ${E.operacoes.filter((o) => o.etapa === i).map((o) => { const x = POR_ID.get(o.imovel); const c = cliente(o.cliente); return `<div class="cartao" draggable="true" data-op="${o.id}"><b>${esc(x.t)}</b><span class="cinza">${esc(local(x))}</span><span>${esc(c.nome)}${c.via ? ` <span class="et">${esc(imob(c.via).nome)}</span>` : ''}</span><div class="rodape"><span>${esc(o.resp)}</span><span class="et ${dias(o.prazo) <= 3 ? 'verm' : ''}">${dataCurta(o.prazo)}</span></div></div>`; }).join('')}
  </div>`).join('')}</div>`;
  let arrastado = null;
  $$('.cartao').forEach((c) => {
    c.addEventListener('dragstart', () => { arrastado = c.dataset.op; c.classList.add('arrastando'); });
    c.addEventListener('dragend', () => c.classList.remove('arrastando'));
  });
  $$('.coluna').forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('sobre'); });
    col.addEventListener('dragleave', () => col.classList.remove('sobre'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      const o = E.operacoes.find((x) => x.id === arrastado);
      if (o) { o.etapa = +col.dataset.etapa; salvar(); avisar(`Movido para "${ETAPAS[o.etapa]}". O cliente e a imobiliária veem a nova etapa.`); telaOperacoes(); }
    });
  });
}

function telaClientes() {
  cabecalho('Clientes e parceiros', 'Painel', '<button class="btn ouro" id="nova-imob">Nova imobiliária parceira</button>');
  $('#tela').innerHTML = `
  <div class="grade-3">${E.imobiliarias.map((i) => { const cs = E.clientes.filter((c) => c.via === i.id); const ops = E.operacoes.filter((o) => cs.some((c) => c.id === o.cliente)); return `<div class="caixa entra" style="border-top:4px solid ${i.cor}">
    <h3>${esc(i.nome)} <small>desde ${new Date(i.desde).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</small></h3>
    <p class="cinza" style="margin:0 0 10px">${esc(i.cidade)} · ${i.corretores} corretores<br>Portal: <b>${esc(i.dominio)}</b></p>
    <div class="fatos"><div><small>Clientes</small><b>${cs.length}</b></div><div><small>Operações</small><b>${ops.length}</b></div><div><small>Honorários a receber</small><b>${brl(ops.length * 6000)}</b></div></div>
  </div>`; }).join('')}</div>
  <div class="caixa entra" style="padding:6px 8px"><div class="tabela-rolar"><table class="tabela"><thead><tr><th>Investidor</th><th>Origem</th><th>Procura</th><th class="num">Capital</th><th>Objetivo</th><th class="num">Entregas</th><th class="num">Operações</th></tr></thead><tbody>
  ${E.clientes.map((c) => `<tr><td class="forte">${esc(c.nome)}</td><td>${c.via ? `<span class="et">${esc(imob(c.via).nome)}</span>` : '<span class="et ouro">Direto (B2C)</span>'}</td><td class="cinza">${c.tipos.join(', ')} · ${c.uf}</td><td class="num">${curto(c.capital)}</td><td>${esc(c.objetivo)} · ${c.prazo} meses</td><td class="num">${E.pacotes.filter((p) => p.cliente === c.id).reduce((s, p) => s + p.entregues.length, 0)}</td><td class="num">${E.operacoes.filter((o) => o.cliente === c.id).length}</td></tr>`).join('')}
  </tbody></table></div></div>`;
  $('#nova-imob').addEventListener('click', () => avisar('No sistema final: contrato, logo, cores e domínio; o portal com a marca dela fica pronto na hora.'));
}

function telaFinanceiro() {
  cabecalho('Financeiro', 'Painel · novembro de 2026');
  const pacotes = E.pacotes.filter((p) => p.preco).reduce((s, p) => s + p.preco, 0);
  const consult = 4 * 350, hon = E.operacoes.filter((o) => o.etapa >= 5).length * 12000;
  const repasse = E.operacoes.filter((o) => o.etapa >= 5 && cliente(o.cliente).via).length * 6000;
  $('#tela').innerHTML = `
  <div class="kpis entra">
    <div class="kpi"><small>Pacotes e avulsas</small><b>${brl(pacotes)}</b><span>${E.pacotes.filter((p) => p.preco).length} vendas no mês</span></div>
    <div class="kpi"><small>Consultorias</small><b>${brl(consult)}</b><span>4 horas vendidas</span></div>
    <div class="kpi"><small>Honorários de operações</small><b>${brl(hon)}</b><span>operações arrematadas ou em registro</span></div>
    <div class="kpi escuro"><small>Repasse a parceiros</small><b>${brl(repasse)}</b><span>50% dos honorários de operações via imobiliária</span></div>
  </div>
  <div class="caixa entra"><h3>Repasses às imobiliárias <small>valores de exemplo</small></h3><div class="tabela-rolar"><table class="tabela"><thead><tr><th>Imobiliária</th><th>Operação</th><th>Cliente</th><th class="num">Honorário</th><th class="num">Parte do parceiro</th><th>Situação</th></tr></thead><tbody>
  ${E.operacoes.filter((o) => cliente(o.cliente).via).map((o, i) => { const c = cliente(o.cliente); return `<tr><td class="forte">${esc(imob(c.via).nome)}</td><td>${esc(POR_ID.get(o.imovel).t)}</td><td>${esc(c.nome)}</td><td class="num">${brl(12000)}</td><td class="num forte">${brl(6000)}</td><td>${o.etapa >= 6 ? '<span class="et verde">Pago</span>' : o.etapa === 5 ? '<span class="et amb">A pagar após arrematação</span>' : '<span class="et">Previsto</span>'}</td></tr>`; }).join('')}
  </tbody></table></div><p class="cinza" style="margin:10px 0 0">Na revenda, a comissão pode ir até 100% para o parceiro, conforme o contrato de cada imobiliária.</p></div>`;
}

function telaAgenda() {
  cabecalho('Agenda de consultorias', 'Painel', '<button class="btn" id="horarios">Definir horários disponíveis</button>');
  const diasSem = ['Seg 24', 'Ter 25', 'Qua 26', 'Qui 27', 'Sex 28'];
  const horas = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  const ev = { '0-1': ['Marina Souza', '1 hora · dúvidas sobre sala comercial'], '1-3': ['Rafael Costa', '30 min · antes do lance'], '2-0': ['Livre'], '2-4': ['Lucas Andrade', '1 hora · primeira compra'], '3-2': ['Livre'], '4-1': ['Carlos Teixeira', 'Pacote 3 horas · sessão 2 de 3'] };
  for (const k of E.consultorias) ev[k.slot] = [k.nome, k.formato + ' · pago pela loja'];
  $('#tela').innerHTML = `<div class="caixa entra"><h3>Semana de 24 a 28 de novembro <small>clientes fictícios</small></h3><div class="semana"><div class="cab"></div>${diasSem.map((d) => `<div class="cab">${d}</div>`).join('')}
  ${horas.map((h, hi) => `<div class="hora">${h}</div>${diasSem.map((_, di) => { const e = ev[`${di}-${hi}`]; return `<div>${e ? (e[0] === 'Livre' ? '<div class="evento livre">Horário livre</div>' : `<div class="evento">${esc(e[0])}<br><span class="cinza">${esc(e[1])}</span></div>`) : ''}</div>`; }).join('')}`).join('')}
  </div></div>
  <div class="caixa entra"><h3>Tabela de preços <small>a definir com o Antonio</small></h3><table class="tabela"><tbody><tr><td>30 minutos</td><td class="num forte">R$ [__]</td></tr><tr><td>1 hora</td><td class="num forte">R$ [__]</td></tr><tr><td>Pacote de 3 horas</td><td class="num forte">R$ [__]</td></tr></tbody></table></div>`;
  $('#horarios').addEventListener('click', () => avisar('No sistema final, o cliente só enxerga e paga os horários que você liberar aqui.'));
}

function telaFontes() {
  cabecalho('Fontes de leilão', 'Painel · coleta automática diária', '<button class="btn ouro" id="add-fonte">Adicionar site</button>');
  const por = IMOVEIS.reduce((o, x) => ((o[x.f] = (o[x.f] || 0) + 1), o), {});
  const tipos = { 'Leilões Judiciais': 'Portal (API)', 'Mega Leilões': 'Site próprio', 'Lance Judicial': 'Site próprio', 'Portal Zuk': 'Site próprio', 'E-Leilões': 'Plataforma Suporte Leilões' };
  const linhas = [...Object.entries(por).map(([f, n]) => ({ f, n, tipo: tipos[f] || 'Site', st: ['Ativa', 'verde'] })), ...E.extrasFontes, { f: 'Caixa (venda de imóveis)', n: 0, tipo: 'Bloqueia robô', st: ['Importar planilha', 'amb'] }];
  $('#tela').innerHTML = `<div class="caixa entra" style="padding:6px 8px"><div class="tabela-rolar"><table class="tabela"><thead><tr><th>Fonte</th><th>Como é lida</th><th class="num">Imóveis hoje</th><th>Última coleta</th><th>Situação</th><th></th></tr></thead><tbody>
  ${linhas.map((l) => `<tr><td class="forte">${esc(l.f)}</td><td class="cinza">${esc(l.tipo)}</td><td class="num">${l.n ? l.n.toLocaleString('pt-BR') : '–'}</td><td>${l.n ? dataCurta(COLETA) + ' · 06:00' : '–'}</td><td><span class="et ${l.st[1]}">${l.st[0]}</span></td><td>${l.st[0] === 'Ativa' ? '<button class="btn peq pausar">Pausar</button>' : ''}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="caixa entra"><h3>Como funciona</h3><p class="cinza" style="margin:0;line-height:1.6">Muitos leiloeiros usam a mesma plataforma. Quando o site colado é de uma plataforma que a coleta já lê, ele entra na próxima coleta automaticamente. Se for uma plataforma nova, fica como "Aguardando coletor" até a equipe técnica criar a leitura. Sites que bloqueiam robô, como a Caixa, não são contornados: a planilha oficial é importada por uma pessoa.</p></div>`;
  $$('.pausar').forEach((b) => b.addEventListener('click', () => avisar('No sistema final, a fonte sai da próxima coleta e os imóveis dela somem da vitrine.')));
  $('#add-fonte').addEventListener('click', () => {
    const m = $('#modal');
    m.innerHTML = `<form class="modal" method="dialog"><h3>Adicionar site de leilão</h3><div class="campo"><label for="url-fonte">Endereço do site</label><input id="url-fonte" placeholder="www.leiloeiroexemplo.com.br" required></div><p class="cinza" id="det-fonte" style="margin:0">Cole o endereço: o sistema identifica a plataforma.</p><div class="acoes"><button class="btn" value="cancelar" formnovalidate>Cancelar</button><button class="btn ouro" value="ok">Adicionar</button></div></form>`;
    const conhecidas = /leiloesjudiciais|megaleiloes|lancejudicial|grupolance|portalzuk|e-leiloes|suporteleiloes|leilao\.?pro|spl/i;
    $('#url-fonte', m).addEventListener('input', (e) => { const v = e.target.value; $('#det-fonte', m).textContent = !v ? 'Cole o endereço: o sistema identifica a plataforma.' : conhecidas.test(v) ? 'Plataforma reconhecida: entra na próxima coleta.' : 'Plataforma nova: fica aguardando a criação do coletor.'; });
    aoConfirmar(m, () => {
      const v = $('#url-fonte', m).value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!v) return;
      const ok = conhecidas.test(v);
      E.extrasFontes.push({ f: v, n: 0, tipo: ok ? 'Plataforma conhecida' : 'Plataforma nova', st: ok ? ['Entra na próxima coleta', 'azul'] : ['Aguardando coletor', 'amb'] });
      salvar(); telaFontes();
    });
    m.showModal();
  });
}

function telaRelatorio(imovelId) {
  const x = POR_ID.get(imovelId), a = analiseDe(imovelId);
  if (!x || !a) return (location.hash = '#/analises');
  if (!a.custos) a.custos = custosPadrao(x);
  const r = calcular(a.custos);
  const dono = E.pacotes.find((p) => p.entregues.includes(imovelId));
  const imb = dono && cliente(dono.cliente).via ? imob(cliente(dono.cliente).via) : null;
  const marcas = [{ id: 'eleva', nome: 'ELEVA CAPITAL', cor: '#C8A04A' }, ...(imb ? [{ id: imb.id, nome: imb.nome.toUpperCase(), cor: imb.cor }] : E.imobiliarias.slice(0, 1).map((i) => ({ id: i.id, nome: i.nome.toUpperCase(), cor: i.cor })))];
  const marca = marcas.find((m) => m.id === (telaRelatorio.marca || 'eleva')) || marcas[0];
  cabecalho('Relatório da análise', 'Análises · relatório', `<div class="seg nao-imprimir">${marcas.map((m) => `<button data-m="${m.id}" aria-pressed="${m.id === marca.id}" class="ok">${m.id === 'eleva' ? 'Marca Eleva' : 'Marca da imobiliária'}</button>`).join('')}</div><a class="btn" href="#/analise/${encodeURIComponent(imovelId)}">Voltar</a><button class="btn navy" onclick="print()">Imprimir ou salvar PDF</button>`);
  const st = { ok: ['OK', '#1F7A4D'], at: ['Atenção', '#9A6B0E'], ri: ['Risco', '#A3352B'], '': ['Pendente', '#5B6472'] };
  const [pn, pc] = a.parecer ? PARECERES[a.parecer] : ['Análise em andamento', ''];
  $('#tela').innerHTML = `<article class="relatorio entra" style="--rel-cor:${marca.cor}">
    <header><span class="logo" style="color:${marca.cor}">${esc(marca.nome)}</span><span class="cinza">Análise de oportunidade · ${new Date().toLocaleDateString('pt-BR')}</span></header>
    <h2>${esc(x.t)}</h2><p class="cinza" style="margin:0">${esc(local(x))} · ${esc(x.tp)}${x.a ? ' · ' + area(x.a) : ''} · Leilão ${x.n === 'J' ? 'judicial' : 'extrajudicial'} · ${esc(x.f)}</p>
    ${x.img ? `<img src="${esc(x.img)}" alt="Foto do imóvel" referrerpolicy="no-referrer" style="width:100%;max-height:300px;object-fit:cover;border-radius:10px;margin-top:16px">` : ''}
    <h4>Parecer</h4><span class="selo-parecer et ${pc}" style="font-size:15px">${pn}</span><p style="line-height:1.6">${esc(a.texto || 'Parecer ainda não escrito.')}</p>
    <h4>Números da operação</h4><table><tbody>
      <tr><td>Lance atual no leilão</td><td>${brl(x.l)}</td></tr><tr><td>Valor de mercado considerado</td><td>${brl(a.custos.mercado)}</td></tr>
      <tr><td><b>Lance máximo recomendado (perfil alvo, 25%)</b></td><td style="color:${marca.cor}">${brl(r.perfis.Alvo)}</td></tr>
      <tr><td>Custo total da operação no lance considerado</td><td>${brl(r.custo)}</td></tr><tr><td>Lucro líquido estimado</td><td>${brl(r.lucro)}</td></tr>
      <tr><td>Retorno sobre o capital (ROI)</td><td>${pct(r.roi)}</td></tr><tr><td>Rendimento ao mês (TIR) em ${a.custos.prazo} meses</td><td>${pct(r.tir, 2)}</td></tr>
    </tbody></table>
    <h4>Verificação jurídica e documental</h4><table><tbody>${CHECKLIST.map(([t], i) => `<tr><td>${t}${a.checklist[i].nota ? `<br><span class="cinza">${esc(a.checklist[i].nota)}</span>` : ''}</td><td style="color:${st[a.checklist[i].s][1]}">${st[a.checklist[i].s][0]}</td></tr>`).join('')}</tbody></table>
    <p class="rodape-rel">Escopo: esta análise identifica, estuda e recomenda o imóvel. Não garante a arrematação nem o resultado do leilão. Valores de mercado e custos são estimativas na data do relatório; confira o edital e as condições do leiloeiro antes de dar lance.${imb && marca.id !== 'eleva' ? ' Análise técnica: Eleva Capital.' : ''}</p>
  </article>`;
  $$('[data-m]').forEach((b) => b.addEventListener('click', () => { telaRelatorio.marca = b.dataset.m; telaRelatorio(imovelId); }));
}

// ---------------------------------------------------------------- navegação
function rota() {
  const [caminho, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const [tela, arg] = caminho.split('/');
  const params = new URLSearchParams(qs || '');
  const t = tela || 'inicio';
  menu(t === 'analise' || t === 'relatorio' ? 'analises' : t);
  scrollTo(0, 0);
  ({ inicio: telaInicio, imoveis: () => telaImoveis(params), analises: telaAnalises, analise: () => telaAnalise(decodeURIComponent(arg || '')), entregas: telaEntregas, operacoes: telaOperacoes, clientes: telaClientes, financeiro: telaFinanceiro, agenda: telaAgenda, fontes: telaFontes, relatorio: () => telaRelatorio(decodeURIComponent(arg || '')) }[t] || telaInicio)();
}


carregarBase('../dados.json').then(() => {
  addEventListener('hashchange', rota);
  rota();
  barraDemo('painel', '../');
}).catch(() => { $('#titulo').textContent = 'Não foi possível carregar os imóveis.'; });
