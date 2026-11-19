// Portal da imobiliária parceira (protótipo, marca própria). Endereço: imobiliaria/?id=silva

const ID = new URLSearchParams(location.search).get('id') || 'silva';
let I = null; // imobiliária atual
const ABAS = [['inicio', 'Início'], ['clientes', 'Meus clientes'], ['oportunidades', 'Oportunidades'], ['operacoes', 'Operações'], ['honorarios', 'Honorários'], ['marca', 'Minha marca']];
const HONORARIO = 12000; // exemplo por operação arrematada

function dadosImob() {
  const cs = clientesDaImob(I.id);
  const entregas = cs.flatMap((c) => entreguesDo(c.id).map((e) => ({ ...e, cliente: c })));
  const ops = E.operacoes.filter((o) => cs.some((c) => c.id === o.cliente));
  return { cs, entregas, ops };
}

function telaInicio() {
  const { cs, entregas, ops } = dadosImob();
  const aprov = E.aprovacoes.filter((a) => cs.some((c) => c.id === a.cliente));
  const aReceber = ops.filter((o) => o.etapa >= 5).length * HONORARIO * 0.5;
  $('#tela').innerHTML = `
  <div><h2 class="saudacao">Olá, equipe ${esc(I.nome)}</h2><p class="sub">Imóveis de leilão analisados para os seus clientes, com a sua marca. A parte técnica fica com a Eleva.</p></div>
  <div class="kpis entra">
    <div class="kpi"><small>Clientes</small><b>${cs.length}</b><span>investidores na sua carteira</span></div>
    <div class="kpi"><small>Oportunidades</small><b>${entregas.length}</b><span>analisadas e prontas para enviar</span></div>
    <div class="kpi"><small>Operações</small><b>${ops.length}</b><span>em andamento com a Eleva</span></div>
    <div class="kpi escuro"><small>Seus honorários</small><b>${brl(aReceber)}</b><span>50% das operações arrematadas</span></div>
  </div>
  ${aprov.length ? `<div class="caixa entra"><h3>Novidades dos seus clientes</h3>${aprov.map((a) => { const x = POR_ID.get(a.imovel); return `<div class="tarefa"><span class="ic" style="background:var(--verde-claro);color:var(--verde)">✓</span><span><b>${esc(cliente(a.cliente).nome)} aprovou lance até ${brl(a.limite)}</b><small>${esc(x.t)} · ${esc(local(x))} · a Eleva já assumiu a disputa</small></span></div>`; }).join('')}</div>` : ''}
  <div class="caixa entra"><h3>Últimas oportunidades para enviar <small><a href="#/oportunidades">ver todas</a></small></h3>
    <div class="oport">${entregas.slice(-3).reverse().map((e) => cardOportunidade(e, { extra: `<span class="et">Para ${esc(e.cliente.nome)}</span>`, acoes: `<button class="btn peq marca" data-wpp="${esc(e.imovel.id)}|${e.cliente.id}">Enviar no WhatsApp</button><button class="btn peq" data-ver="${esc(e.imovel.id)}">Ver análise</button>` })).join('') || '<p class="cinza">Ainda não há oportunidades. Cadastre um cliente e a Eleva começa a busca.</p>'}</div>
  </div>`;
  ligarAcoes();
}

function telaClientes() {
  const { cs } = dadosImob();
  $('#tela').innerHTML = `
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div><h2 class="saudacao">Meus clientes</h2><p class="sub">Cada cliente tem um perfil. A Eleva cruza o perfil com os leilões do Brasil todo e manda as oportunidades para você.</p></div><button class="btn marca" id="novo" style="margin-left:auto">Cadastrar cliente</button></div>
  <div class="caixa entra" style="padding:6px 8px"><div class="tabela-rolar"><table class="tabela"><thead><tr><th>Cliente</th><th>Procura</th><th class="num">Capital</th><th>Objetivo</th><th class="num">Imóveis hoje</th><th class="num">Recebidos</th><th></th></tr></thead><tbody>
  ${cs.map((c) => `<tr><td class="forte">${esc(c.nome)}</td><td class="cinza">${c.tipos.join(', ')} · ${c.uf}</td><td class="num">${curto(c.capital)}</td><td>${esc(c.objetivo)} · ${c.prazo} meses</td><td class="num">${combina(c).length}</td><td class="num">${entreguesDo(c.id).length}</td><td><a class="btn peq" href="../cliente/?id=${c.id}">Área do cliente</a></td></tr>`).join('')}
  </tbody></table></div></div>`;
  $('#novo').addEventListener('click', () => {
    const ufs = [...new Set(IMOVEIS.map((x) => x.u).filter(Boolean))].sort();
    const m = abrirModal(`<form method="dialog" style="display:flex;flex-direction:column;gap:14px"><h3>Novo cliente</h3>
      <div class="form-grade"><div class="campo"><label for="n-nome">Nome</label><input id="n-nome" required placeholder="Nome do investidor"></div>
      <div class="campo"><label for="n-cap">Capital disponível (R$)</label><input id="n-cap" inputmode="numeric" value="500.000"></div>
      <div class="campo"><label for="n-uf">Estado</label><select id="n-uf">${ufs.map((u) => `<option ${u === I.cidade.slice(-2) ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
      <div class="campo"><label for="n-obj">Objetivo</label><select id="n-obj"><option>Revenda</option><option>Aluguel</option><option>Construir e vender</option></select></div></div>
      <div class="campo"><label>Tipos de imóvel</label><div class="chips-sel">${['Apartamento', 'Casa', 'Terreno', 'Comercial', 'Rural'].map((t, i) => `<label><input type="checkbox" value="${t}" ${i < 2 ? 'checked' : ''}>${t}</label>`).join('')}</div></div>
      <p class="cinza" id="n-prev" style="margin:0"></p>
      <div class="acoes"><button class="btn" value="cancelar" formnovalidate>Cancelar</button><button class="btn marca" value="ok">Cadastrar e pedir curadoria</button></div></form>`);
    const prever = () => { const c = { uf: $('#n-uf', m).value, tipos: $$('.chips-sel input:checked', m).map((i) => i.value), capital: numero($('#n-cap', m).value) }; $('#n-prev', m).textContent = `${combina(c).length} imóveis em leilão combinam com esse perfil hoje.`; };
    $$('input,select', m).forEach((el) => el.addEventListener('input', prever)); prever();
    aoConfirmar(m, () => {
      if (!$('#n-nome', m).value.trim()) return;
      const id = 'c' + Date.now().toString(36);
      E.clientes.push({ id, nome: $('#n-nome', m).value.trim(), via: I.id, capital: numero($('#n-cap', m).value), uf: $('#n-uf', m).value, tipos: $$('.chips-sel input:checked', m).map((i) => i.value), objetivo: $('#n-obj', m).value, prazo: 12 });
      E.pacotes.push({ id: 'p' + Date.now().toString(36), cliente: id, tipo: 'Curadoria da imobiliária', preco: 0, total: 3, entregues: [], comprado: new Date().toISOString().slice(0, 10), prazoEntrega: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), novo: true });
      salvar(); avisar('Cliente cadastrado. O pedido de curadoria já está na fila da Eleva.'); telaClientes();
    });
  });
}

function telaOportunidades() {
  const { entregas } = dadosImob();
  $('#tela').innerHTML = `<div><h2 class="saudacao">Oportunidades</h2><p class="sub">Imóveis já analisados pela Eleva para os seus clientes. Envie com a sua marca; o cliente aprova o lance pela área dele.</p></div>
  <div class="oport">${entregas.map((e) => { const ap = aprovacao(e.cliente.id, e.imovel.id); return cardOportunidade(e, { extra: `<span class="et">Para ${esc(e.cliente.nome)}</span>${ap ? ` <span class="et verde">Lance aprovado até ${curto(ap.limite)}</span>` : ''}`, acoes: `<button class="btn peq marca" data-wpp="${esc(e.imovel.id)}|${e.cliente.id}">Enviar no WhatsApp</button><button class="btn peq" data-ver="${esc(e.imovel.id)}">Ver análise</button>` }); }).join('') || '<p class="cinza">Nenhuma oportunidade ainda.</p>'}</div>`;
  ligarAcoes();
}

function telaOperacoes() {
  const { ops } = dadosImob();
  $('#tela').innerHTML = `<div><h2 class="saudacao">Operações</h2><p class="sub">Acompanhe cada arrematação sem precisar perguntar. A Eleva atualiza as etapas.</p></div>
  ${ops.map((o) => { const x = POR_ID.get(o.imovel); return `<div class="caixa entra"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${foto(x)}<div><b>${esc(x.t)}</b><div class="cinza">${esc(local(x))} · cliente ${esc(cliente(o.cliente).nome)}</div></div><span class="et ${dias(o.prazo) <= 3 ? 'verm' : ''}" style="margin-left:auto">Próximo passo até ${dataCurta(o.prazo)}</span></div>${trilha(o.etapa)}</div>`; }).join('') || '<p class="cinza">Nenhuma operação em andamento.</p>'}`;
}

function telaHonorarios() {
  const { ops } = dadosImob();
  const linhas = ops.map((o) => ({ o, x: POR_ID.get(o.imovel), st: o.etapa >= 6 ? ['Pago', 'verde'] : o.etapa === 5 ? ['A receber após arrematação', 'amb'] : ['Previsto', ''] }));
  const soma = (f) => linhas.filter(f).length * HONORARIO * 0.5;
  $('#tela').innerHTML = `<div><h2 class="saudacao">Honorários</h2><p class="sub">Divisão dos honorários de assessoria: 50% para você, 50% para a Eleva. Na revenda, até 100% da comissão fica com você.</p></div>
  <div class="kpis entra"><div class="kpi"><small>Recebido</small><b>${brl(soma((l) => l.st[0] === 'Pago'))}</b><span>operações registradas</span></div><div class="kpi"><small>A receber</small><b>${brl(soma((l) => l.st[1] === 'amb'))}</b><span>após a arrematação</span></div><div class="kpi"><small>Previsto</small><b>${brl(soma((l) => l.st[0] === 'Previsto'))}</b><span>operações em andamento</span></div><div class="kpi escuro"><small>Adesão</small><b>${brl(10000)}</b><span>paga em ${new Date(I.desde).toLocaleDateString('pt-BR')}</span></div></div>
  <div class="caixa entra" style="padding:6px 8px"><div class="tabela-rolar"><table class="tabela"><thead><tr><th>Operação</th><th>Cliente</th><th>Etapa</th><th class="num">Honorário total</th><th class="num">Sua parte</th><th>Situação</th></tr></thead><tbody>
  ${linhas.map(({ o, x, st }) => `<tr><td class="forte">${esc(x.t)}</td><td>${esc(cliente(o.cliente).nome)}</td><td class="cinza">${o.etapa + 1}. ${ETAPAS[o.etapa]}</td><td class="num">${brl(HONORARIO)}</td><td class="num forte">${brl(HONORARIO / 2)}</td><td><span class="et ${st[1]}">${st[0]}</span></td></tr>`).join('')}
  </tbody></table></div><p class="cinza" style="margin:10px 8px">Valores de exemplo. As condições reais ficam no contrato de cada parceiro.</p></div>`;
}

function telaMarca() {
  $('#tela').innerHTML = `<div><h2 class="saudacao">Minha marca</h2><p class="sub">O investidor vê a sua marca no portal, nos cards e nos relatórios. A Eleva aparece só como responsável técnica.</p></div>
  <div class="grade-2"><div class="caixa entra" style="display:flex;flex-direction:column;gap:14px">
    <div class="campo"><label for="m-nome">Nome exibido</label><input id="m-nome" value="${esc(I.nome)}"></div>
    <div class="campo"><label for="m-cor">Cor principal</label><input id="m-cor" type="color" value="${esc(I.cor)}" style="height:48px;padding:4px"></div>
    <div class="campo"><label for="m-dom">Endereço do portal</label><input id="m-dom" value="${esc(I.dominio)}"></div>
    <p class="cinza" style="margin:0">Mude a cor e veja o portal inteiro trocar. No sistema final, entra também o logo em arquivo.</p>
    <button class="btn marca" id="m-salvar">Salvar marca</button></div>
    <div class="caixa entra"><h3>Prévia do card enviado ao cliente</h3>${previaWpp(entreguesDo(clientesDaImob(I.id)[0]?.id)[0], clientesDaImob(I.id)[0])}</div></div>`;
  $('#m-cor').addEventListener('input', (e) => document.body.style.setProperty('--marca', e.target.value));
  $('#m-salvar').addEventListener('click', () => { I.nome = $('#m-nome').value.trim() || I.nome; I.cor = $('#m-cor').value; I.dominio = $('#m-dom').value.trim(); salvar(); avisar('Marca atualizada no portal, nos cards e nos relatórios.'); rota(); });
}

function linkCliente(c) { return new URL(`../cliente/?id=${c.id}`, location.href).href; }
function mensagem(x, c) {
  const r = calcular(analiseDe(x.id)?.custos || custosPadrao(x));
  return `Olá, ${c.nome.split(' ')[0] === 'Dr.' ? c.nome.split(' ').slice(0, 2).join(' ') : c.nome.split(' ')[0]}! Separamos um imóvel em leilão para o seu perfil:\n${x.t} · ${local(x)}\nLance atual: ${brl(x.l)}\nLimite recomendado: ${brl(r.perfis.Alvo)}\nAnálise completa: ${linkCliente(c)}`;
}
function previaWpp(e, c) {
  if (!e || !c) return '<p class="cinza">Cadastre um cliente para ver a prévia.</p>';
  const x = e.imovel;
  return `<div class="wpp"><div class="bolha"><div class="cartao-wpp">${x.img ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer">` : ''}<div class="faixa"><span>${esc(I.nome)}</span><span>${x.d ? '−' + x.d + '%' : 'Leilão'}</span></div><div class="tx"><b>${esc(x.t)}</b><br>${esc(local(x))}<br>Lance atual ${brl(x.l)}</div></div><div class="msg">${esc(mensagem(x, c))}</div></div></div>`;
}

function ligarAcoes() {
  $$('[data-ver]').forEach((b) => b.addEventListener('click', () => { const x = POR_ID.get(b.dataset.ver); abrirModal(`${analiseResumida(x, analiseDe(x.id))}<div class="acoes"><button class="btn" onclick="this.closest('dialog').close()">Fechar</button></div>`, 680); }));
  $$('[data-wpp]').forEach((b) => b.addEventListener('click', () => {
    const [im, cid] = b.dataset.wpp.split('|');
    const x = POR_ID.get(im), c = cliente(cid);
    const m = abrirModal(`<h3>Enviar para ${esc(c.nome)}</h3>${previaWpp({ imovel: x }, c)}<div class="acoes"><button class="btn" id="copiar">Copiar mensagem</button><a class="btn marca" href="${esc(linkCliente(c))}">Abrir como o cliente vê</a></div>`, 520);
    $('#copiar', m).addEventListener('click', async () => { try { await navigator.clipboard.writeText(mensagem(x, c)); avisar('Mensagem copiada. No sistema final, sai direto pelo WhatsApp da imobiliária.'); } catch { avisar('Não foi possível copiar neste navegador.'); } });
  }));
}

function rota() {
  const t = location.hash.replace(/^#\/?/, '') || 'inicio';
  montarPortal({ marca: I.nome, cor: I.cor, quem: { nome: 'Carlos Silva', papel: 'Corretor responsável' }, abas: ABAS, atual: t });
  ({ inicio: telaInicio, clientes: telaClientes, oportunidades: telaOportunidades, operacoes: telaOperacoes, honorarios: telaHonorarios, marca: telaMarca }[t] || telaInicio)();
  scrollTo(0, 0);
}

carregarBase('../dados.json').then(() => {
  I = imob(ID) || E.imobiliarias[0];
  document.title = `${I.nome} · Leilões (protótipo)`;
  addEventListener('hashchange', rota);
  rota();
  barraDemo('imobiliaria', '../');
}).catch(() => { $('#tela').innerHTML = '<p>Não foi possível carregar os imóveis.</p>'; });
