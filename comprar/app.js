// Loja B2C da Eleva (protótipo): pacotes de oportunidades analisadas e consultoria por hora.
// O pagamento é simulado; a compra entra na fila do painel e cria a área do cliente.

const ABAS = [['pacotes', 'Pacotes de oportunidades'], ['consultoria', 'Consultoria por hora']];
const PLANOS = [
  { id: 'p1', nome: '1 oportunidade', total: 1, preco: 200, txt: 'Um imóvel no seu perfil, com análise completa e limite de lance.' },
  { id: 'p5', nome: '5 oportunidades', total: 5, preco: 1500, txt: 'Cinco imóveis ao longo de até 30 dias, todos estudados pela equipe.' },
  { id: 'p10', nome: '10 oportunidades', total: 10, preco: null, txt: 'Para quem quer comparar mais opções antes de decidir.' },
];
const DIAS = ['Seg 24/11', 'Ter 25/11', 'Qua 26/11', 'Qui 27/11', 'Sex 28/11'];
const HORAS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
const OCUPADOS = ['0-1', '1-3', '2-4', '4-1']; // já marcados na agenda do painel
const FORMATOS = ['30 minutos', '1 hora', 'Pacote de 3 horas'];
let plano = 'p5';

const ESCOPO = '<p class="cinza" style="margin:0;font-size:13px"><b>Escopo:</b> a Eleva encontra, analisa (imóvel, edital, débitos e números) e recomenda. A análise não garante a arrematação nem o resultado do leilão.</p>';

function telaPacotes() {
  const ufs = [...new Set(IMOVEIS.map((x) => x.u).filter(Boolean))].sort();
  $('#tela').innerHTML = `
  <div><h2 class="saudacao">Receba imóveis de leilão já analisados</h2><p class="sub">Você diz o que procura. O time da Eleva encontra, levanta débitos, faz a conta e recomenda o lance máximo. Você só decide.</p></div>
  <div class="planos" role="group" aria-label="Escolha o pacote">${PLANOS.map((p) => `<button type="button" class="plano entra" data-plano="${p.id}" aria-pressed="${p.id === plano}">${p.id === 'p5' ? '<span class="destaque">Exemplo do Antonio</span>' : ''}<small>${p.nome}</small><b>${p.preco ? brl(p.preco) : 'R$ [__]'}</b><span>${p.txt}</span>${p.preco && p.total > 1 ? `<span>${brl(p.preco / p.total)} por imóvel</span>` : ''}</button>`).join('')}</div>
  <form class="caixa entra" id="form" style="display:flex;flex-direction:column;gap:14px">
    <h3>O que você procura</h3>
    <div class="form-grade"><div class="campo"><label for="f-nome">Seu nome</label><input id="f-nome" required placeholder="Como quer ser chamado"></div>
    <div class="campo"><label for="f-cap">Quanto quer investir (R$)</label><input id="f-cap" inputmode="numeric" value="300.000"></div>
    <div class="campo"><label for="f-uf">Estado</label><select id="f-uf">${ufs.map((u) => `<option ${u === 'SP' ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    <div class="campo"><label for="f-obj">Objetivo</label><select id="f-obj"><option>Revenda</option><option>Aluguel</option><option>Construir e vender</option></select></div></div>
    <div class="campo"><label>Tipo de imóvel</label><div class="chips-sel">${['Apartamento', 'Casa', 'Terreno', 'Comercial', 'Rural'].map((t, i) => `<label><input type="checkbox" value="${t}" ${i === 0 ? 'checked' : ''}>${t}</label>`).join('')}</div></div>
    <p id="f-prev" style="margin:0;font-weight:700"></p>
    ${ESCOPO}
    <p id="f-erro" style="margin:0;color:var(--verm);font-size:13px" hidden></p>
    <button class="btn marca" type="submit" style="align-self:flex-start">Pagar e enviar perfil (simulação)</button>
  </form>`;
  $$('[data-plano]').forEach((b) => b.addEventListener('click', () => { plano = b.dataset.plano; $$('[data-plano]').forEach((o) => o.setAttribute('aria-pressed', o === b)); }));
  const ler = () => ({ capital: numero($('#f-cap').value), uf: $('#f-uf').value, tipos: $$('.chips-sel input:checked').map((i) => i.value), objetivo: $('#f-obj').value });
  const prever = () => { $('#f-prev').textContent = `Hoje há ${combina(ler()).length} imóveis em leilão com esse perfil para a equipe escolher.`; };
  $$('#form input, #form select').forEach((el) => el.addEventListener('input', () => { prever(); $('#f-erro').hidden = true; }));
  prever();
  $('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = $('#f-nome').value.trim(), p = ler();
    const erro = !nome ? 'Diga o seu nome.' : !p.tipos.length ? 'Escolha pelo menos um tipo de imóvel.' : !p.capital ? 'Informe quanto quer investir.' : '';
    if (erro) { $('#f-erro').textContent = erro; $('#f-erro').hidden = false; return; }
    const pl = PLANOS.find((x) => x.id === plano);
    const id = 'c' + Date.now().toString(36);
    E.clientes.push({ id, nome, via: null, ...p, prazo: 12 });
    E.pacotes.push({ id: 'p' + Date.now().toString(36), cliente: id, tipo: pl.total === 1 ? 'Oportunidade avulsa' : `Pacote ${pl.total} oportunidades`, preco: pl.preco, total: pl.total, entregues: [], comprado: new Date().toISOString().slice(0, 10), prazoEntrega: new Date(Date.now() + (pl.total === 1 ? 3 : 7) * 864e5).toISOString().slice(0, 10), novo: true });
    salvar();
    $('#tela').innerHTML = `<div class="caixa entra ok-grande"><div class="circ"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h2 class="saudacao">Pronto, ${esc(nome.split(' ')[0])}!</h2><p class="sub" style="max-width:520px">Seu pacote de ${pl.total === 1 ? '1 oportunidade' : pl.total + ' oportunidades'} entrou na fila da equipe. Cada imóvel aprovado aparece na sua área com a análise completa.</p>
    <div class="acoes" style="justify-content:center;display:flex;gap:10px;flex-wrap:wrap"><a class="btn marca" href="../cliente/?id=${id}">Ir para minha área</a><a class="btn" href="../painel/#/entregas">Ver na fila da Eleva</a></div></div>`;
  });
}

function telaConsultoria() {
  const ocupado = new Set([...OCUPADOS, ...E.consultorias.map((k) => k.slot)]);
  const livres = DIAS.flatMap((d, di) => HORAS.map((h, hi) => ({ slot: `${di}-${hi}`, rot: `${d} · ${h}` }))).filter((s) => !ocupado.has(s.slot)).slice(0, 12);
  $('#tela').innerHTML = `
  <div><h2 class="saudacao">Converse com um especialista em leilão</h2><p class="sub">Tire dúvidas antes de dar um lance ou antes de contratar um pacote. Escolha o formato e o horário; o link da reunião chega por e-mail e WhatsApp.</p></div>
  <form class="caixa entra" id="form-c" style="display:flex;flex-direction:column;gap:14px">
    <div class="campo"><label>Formato</label><div class="chips-sel">${FORMATOS.map((f, i) => `<label><input type="radio" name="fmt" value="${f}" ${i === 1 ? 'checked' : ''}>${f} · R$ [__]</label>`).join('')}</div></div>
    <div class="campo"><label>Horários livres na semana</label><div class="horarios">${livres.map((s, i) => `<label><input type="radio" name="hora" value="${s.slot}" data-rot="${s.rot}" ${i ? '' : 'checked'}>${s.rot}</label>`).join('')}</div></div>
    <div class="campo" style="max-width:420px"><label for="c-nome">Seu nome</label><input id="c-nome" placeholder="Como quer ser chamado"></div>
    <p id="c-erro" style="margin:0;color:var(--verm);font-size:13px" hidden>Diga o seu nome para reservar.</p>
    <button class="btn marca" type="submit" style="align-self:flex-start">Pagar e reservar (simulação)</button>
  </form>`;
  $('#c-nome').addEventListener('input', () => { $('#c-erro').hidden = true; });
  $('#form-c').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = $('#c-nome').value.trim();
    if (!nome) { $('#c-erro').hidden = false; return; }
    const h = $('input[name=hora]:checked');
    E.consultorias.push({ slot: h.value, quando: h.dataset.rot, nome, formato: $('input[name=fmt]:checked').value });
    salvar();
    $('#tela').innerHTML = `<div class="caixa entra ok-grande"><div class="circ"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h2 class="saudacao">Horário reservado</h2><p class="sub">${esc(h.dataset.rot)} · ${esc($('input[name=fmt]:checked')?.value || '')}. O link da reunião chega por e-mail e WhatsApp.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn" href="../painel/#/agenda">Ver na agenda da Eleva</a><a class="btn marca" href="#/pacotes">Conhecer os pacotes</a></div></div>`;
  });
}

function rota() {
  const t = location.hash.replace(/^#\/?/, '') || 'pacotes';
  montarPortal({ marca: 'Eleva Capital', cor: '#0E1A2B', quem: { nome: 'Visitante', papel: 'Compra segura' }, abas: ABAS, atual: t });
  ({ pacotes: telaPacotes, consultoria: telaConsultoria }[t] || telaPacotes)();
  scrollTo(0, 0);
}

carregarBase('../dados.json').then(() => {
  addEventListener('hashchange', rota);
  rota();
  barraDemo('loja', '../');
}).catch(() => { $('#tela').innerHTML = '<p>Não foi possível carregar os imóveis.</p>'; });
