// Área do cliente (investidor). Endereço: cliente/?id=paulo
// Cliente de imobiliária vê a marca da imobiliária; cliente direto (B2C) vê a marca da Eleva.

const CID = new URLSearchParams(location.search).get('id') || 'paulo';
let C = null;
const ABAS = [['inicio', 'Oportunidades'], ['operacoes', 'Minhas operações'], ['perfil', 'Meu perfil'], ['pacotes', 'Meus pacotes']];

function telaInicio() {
  const ent = entreguesDo(C.id);
  const pacs = pacotesDo(C.id);
  $('#tela').innerHTML = `
  <div><h2 class="saudacao">Olá, ${esc(C.nome.split(' ').slice(0, C.nome.startsWith('Dr') ? 2 : 1).join(' '))}</h2><p class="sub">Imóveis de leilão escolhidos para o seu perfil (${esc(C.tipos.join(', '))} em ${esc(C.uf)}, até ${curto(C.capital)}), cada um com análise jurídica e financeira.</p></div>
  ${pacs.map((p) => `<div class="caixa entra"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(p.tipo)}</b><span class="cinza">${p.entregues.length} de ${p.total} entregues · ${p.entregues.length >= p.total ? 'completo' : 'próximas até ' + dataCurta(p.prazoEntrega)}</span></div><div class="progresso" style="margin-top:10px"><i style="width:${(p.entregues.length / p.total) * 100}%;background:var(--marca)"></i></div></div>`).join('')}
  <div class="oport">${ent.map((e) => { const ap = aprovacao(C.id, e.imovel.id); return cardOportunidade(e, { extra: ap ? `<span class="et verde">Você aprovou lance até ${curto(ap.limite)}</span>` : '', acoes: `<button class="btn peq marca" data-abrir="${esc(e.imovel.id)}">${ap ? 'Ver análise' : 'Ver análise e aprovar lance'}</button>` }); }).join('') || '<div class="caixa"><p class="cinza" style="margin:0">A equipe está analisando imóveis para você. Assim que um for aprovado, ele aparece aqui.</p></div>'}</div>`;
  $$('[data-abrir]').forEach((b) => b.addEventListener('click', () => abrirImovel(b.dataset.abrir)));
}

function abrirImovel(im) {
  const x = POR_ID.get(im), a = analiseDe(im), ap = aprovacao(C.id, im);
  const r = calcular(a?.custos || custosPadrao(x));
  const m = abrirModal(`${analiseResumida(x, a)}
    ${ap ? `<div class="veredito bom">Lance aprovado até ${brl(ap.limite)} em ${new Date(ap.quando).toLocaleDateString('pt-BR')}. A Eleva cuida da disputa e avisa o resultado.</div>`
    : `<div class="caixa" style="background:var(--fundo);border:0"><h3>Aprovar lance</h3><p class="cinza" style="margin:0 0 10px">Até quanto a Eleva pode dar lance por você? O valor recomendado mantém o retorno de 25%.</p>
      <div class="campo"><label for="lim">Limite de lance (R$)</label><input id="lim" inputmode="numeric" value="${Math.round(r.perfis.Alvo).toLocaleString('pt-BR')}"></div>
      <label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;margin-top:10px"><input type="checkbox" id="ciente" style="margin-top:3px"><span>Entendo que a análise recomenda o imóvel, mas não garante a arrematação nem o resultado do leilão.</span></label>
      <p class="cinza" id="erro" style="color:var(--verm);margin:6px 0 0" hidden>Marque a confirmação para aprovar.</p></div>`}
    <div class="acoes"><a class="btn" href="${esc(x.url)}" target="_blank" rel="noopener">Ver edital</a>${ap ? '' : '<button class="btn marca" id="aprovar">Aprovar lance</button>'}</div>`, 680);
  $('#aprovar', m)?.addEventListener('click', () => {
    if (!$('#ciente', m).checked) { $('#erro', m).hidden = false; return; }
    const limite = numero($('#lim', m).value);
    E.aprovacoes.push({ cliente: C.id, imovel: im, limite, quando: new Date().toISOString() });
    if (!E.operacoes.some((o) => o.cliente === C.id && o.imovel === im)) E.operacoes.push({ id: 'o-' + im + '5', imovel: im, cliente: C.id, etapa: 5, resp: 'Antonio', prazo: x.e?.slice(0, 10) || new Date().toISOString().slice(0, 10) });
    salvar(); m.close(); avisar('Lance aprovado. A Eleva recebeu o pedido e assume a disputa.'); telaInicio();
  });
}

function telaOperacoes() {
  const ops = E.operacoes.filter((o) => o.cliente === C.id);
  $('#tela').innerHTML = `<div><h2 class="saudacao">Minhas operações</h2><p class="sub">Do alinhamento à venda: veja em que etapa está cada imóvel.</p></div>
  ${ops.map((o) => { const x = POR_ID.get(o.imovel); const ap = aprovacao(C.id, o.imovel); return `<div class="caixa entra"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${foto(x)}<div><b>${esc(x.t)}</b><div class="cinza">${esc(local(x))}${ap ? ' · lance aprovado até ' + brl(ap.limite) : ''}</div></div><span class="et" style="margin-left:auto">Atualizado pela Eleva</span></div>${trilha(o.etapa)}</div>`; }).join('') || '<div class="caixa"><p class="cinza" style="margin:0">Nenhuma operação ainda. Quando você aprovar um lance, ela aparece aqui.</p></div>'}`;
}

function telaPerfil() {
  const ufs = [...new Set(IMOVEIS.map((x) => x.u).filter(Boolean))].sort();
  $('#tela').innerHTML = `<div><h2 class="saudacao">Meu perfil e desejos</h2><p class="sub">É com base nisso que a equipe escolhe os imóveis para você.</p></div>
  <div class="caixa entra" style="display:flex;flex-direction:column;gap:14px;max-width:720px">
    <div class="form-grade"><div class="campo"><label for="p-cap">Capital disponível (R$)</label><input id="p-cap" inputmode="numeric" value="${C.capital.toLocaleString('pt-BR')}"></div>
    <div class="campo"><label for="p-uf">Estado</label><select id="p-uf">${ufs.map((u) => `<option ${u === C.uf ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    <div class="campo"><label for="p-obj">Objetivo</label><select id="p-obj">${['Revenda', 'Aluguel', 'Construir e vender'].map((o) => `<option ${o === C.objetivo ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
    <div class="campo"><label for="p-prazo">Prazo para o retorno (meses)</label><input id="p-prazo" inputmode="numeric" value="${C.prazo}"></div></div>
    <div class="campo"><label>Tipos de imóvel</label><div class="chips-sel">${['Apartamento', 'Casa', 'Terreno', 'Comercial', 'Rural', 'Galpão/Industrial'].map((t) => `<label><input type="checkbox" value="${t}" ${C.tipos.includes(t) ? 'checked' : ''}>${t}</label>`).join('')}</div></div>
    <p class="cinza" id="p-prev" style="margin:0"></p>
    <button class="btn marca" id="p-salvar" style="align-self:flex-start">Salvar perfil</button></div>`;
  const ler = () => ({ capital: numero($('#p-cap').value), uf: $('#p-uf').value, objetivo: $('#p-obj').value, prazo: numero($('#p-prazo').value) || 12, tipos: $$('.chips-sel input:checked').map((i) => i.value) });
  const prever = () => { $('#p-prev').textContent = `${combina({ ...C, ...ler() }).length} imóveis em leilão combinam com esse perfil hoje.`; };
  $$('#tela input, #tela select').forEach((el) => el.addEventListener('input', prever)); prever();
  $('#p-salvar').addEventListener('click', () => { Object.assign(C, ler()); salvar(); avisar('Perfil salvo. A equipe recebe a mudança na hora.'); });
}

function telaPacotes() {
  const pacs = pacotesDo(C.id);
  $('#tela').innerHTML = `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div><h2 class="saudacao">Meus pacotes</h2><p class="sub">Oportunidades compradas e quantas já chegaram.</p></div>${C.via ? '' : '<a class="btn marca" href="../comprar/" style="margin-left:auto">Comprar mais oportunidades</a>'}</div>
  <div class="caixa entra" style="padding:6px 8px"><table class="tabela"><thead><tr><th>Pacote</th><th>Compra</th><th class="num">Entregues</th><th>Prazo</th><th class="num">Valor</th></tr></thead><tbody>
  ${pacs.map((p) => `<tr><td class="forte">${esc(p.tipo)}</td><td>${new Date(p.comprado).toLocaleDateString('pt-BR')}</td><td class="num">${p.entregues.length} de ${p.total}</td><td>${dataCurta(p.prazoEntrega)}</td><td class="num">${p.preco ? brl(p.preco) : p.preco === 0 ? 'Incluso na parceria' : 'R$ [__]'}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function rota() {
  const t = location.hash.replace(/^#\/?/, '') || 'inicio';
  const im = C.via ? imob(C.via) : null;
  montarPortal({ marca: im ? im.nome : 'Eleva Capital', cor: im ? im.cor : '#0E1A2B', quem: { nome: C.nome, papel: im ? 'Cliente' : 'Cliente Eleva' }, abas: ABAS, atual: t });
  ({ inicio: telaInicio, operacoes: telaOperacoes, perfil: telaPerfil, pacotes: telaPacotes }[t] || telaInicio)();
  scrollTo(0, 0);
}

carregarBase('../dados.json').then(() => {
  C = cliente(CID) || E.clientes[0];
  document.title = `Área de ${C.nome} (protótipo)`;
  addEventListener('hashchange', rota);
  rota();
  barraDemo(['paulo', 'marina'].includes(C.id) ? C.id : '', '../');
}).catch(() => { $('#tela').innerHTML = '<p>Não foi possível carregar os imóveis.</p>'; });
