let passoAtual = 1;
const TOTAL_PASSOS = 7;
let dadosGerados = {};

document.addEventListener('DOMContentLoaded', () => { atualizarUI(); });

function proximoPasso() { if (passoAtual < TOTAL_PASSOS) irParaPasso(passoAtual + 1); }
function passoAnterior() { if (passoAtual > 1) irParaPasso(passoAtual - 1); }

function irParaPasso(novo) {
  document.querySelector(`.passo[data-step="${passoAtual}"]`)?.classList.remove('ativo');
  passoAtual = novo;
  const prox = document.querySelector(`.passo[data-step="${passoAtual}"]`);
  prox?.classList.add('ativo');
  atualizarUI();
  setTimeout(() => prox?.querySelector('input, textarea')?.focus(), 100);
}

function atualizarUI() {
  const pct = (passoAtual / TOTAL_PASSOS) * 100;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('step-counter').textContent = `${passoAtual} / ${TOTAL_PASSOS}`;
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');
  const btnGen  = document.getElementById('btn-generate');
  passoAtual > 1 ? btnBack.classList.add('visivel') : btnBack.classList.remove('visivel');
  if (passoAtual === TOTAL_PASSOS) { btnNext.classList.add('oculto'); btnGen.classList.add('visivel'); }
  else { btnNext.classList.remove('oculto'); btnGen.classList.remove('visivel'); }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement?.tagName !== 'TEXTAREA') {
    e.preventDefault();
    passoAtual < TOTAL_PASSOS ? proximoPasso() : gerarCurriculo();
  }
});

async function gerarCurriculo() {
  const dados = {
    nome: val('q-nome'), area: val('q-area'), cargo: val('q-cargo'),
    email: val('q-email'), telefone: val('q-telefone'), cidade: val('q-cidade'),
    experiencia: val('q-experiencia'), formacao: val('q-formacao'),
    habilidades: val('q-habilidades'), diferencial: val('q-diferencial'),
  };
  mostrarTela('tela-loading');
  animarMensagensLoading();
  try {
    const resposta = await chamarAPI(montarPrompt(dados));
    const curriculo = parsearResposta(resposta, dados);
    dadosGerados = curriculo;
    preencherEditor(curriculo);
    renderizarCV(curriculo);
    mostrarTela('tela-resultado');
  } catch (err) {
    console.error(err);
    const curriculo = fallbackSemIA(dados);
    dadosGerados = curriculo;
    preencherEditor(curriculo);
    renderizarCV(curriculo);
    mostrarTela('tela-resultado');
  }
}

function montarPrompt(d) {
  return `Você é um especialista em RH e redação de currículos profissionais em português brasileiro.
Com base nas informações abaixo, gere um currículo estruturado. Retorne APENAS um JSON válido, sem markdown, sem explicações.

- Nome: ${d.nome||'Não informado'}
- Área: ${d.area||'Não informado'}
- Cargo: ${d.cargo||'Não informado'}
- E-mail: ${d.email||''}
- Telefone: ${d.telefone||''}
- Cidade: ${d.cidade||''}
- Experiência: ${d.experiencia||'Não informado'}
- Formação: ${d.formacao||'Não informado'}
- Habilidades: ${d.habilidades||'Não informado'}
- Diferencial: ${d.diferencial||'Não informado'}

Retorne exatamente neste formato JSON:
{"nome":"","cargo":"","email":"","telefone":"","cidade":"","resumo":"parágrafo de 3-4 linhas persuasivo","experiencia":"formatado com cargo, empresa, período e descrição (use \\n)","formacao":"formatado com curso, instituição e período (use \\n)","habilidades":["hab1","hab2"],"idiomas":["Idioma (nível)"]}

Regras: português do Brasil, profissional e impactante, habilidades e idiomas como arrays.`;
}

async function chamarAPI(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
  });
  if (!res.ok) throw new Error('API error: ' + res.status);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

function parsearResposta(texto, dadosOriginais) {
  try {
    const obj = JSON.parse(texto.replace(/```json|```/g, '').trim());
    if (typeof obj.habilidades === 'string') obj.habilidades = obj.habilidades.split(',').map(s=>s.trim()).filter(Boolean);
    if (typeof obj.idiomas === 'string') obj.idiomas = obj.idiomas.split(',').map(s=>s.trim()).filter(Boolean);
    if (!Array.isArray(obj.habilidades)) obj.habilidades = [];
    if (!Array.isArray(obj.idiomas)) obj.idiomas = [];
    return obj;
  } catch(e) { return fallbackSemIA(dadosOriginais); }
}

function fallbackSemIA(d) {
  const habs = d.habilidades ? d.habilidades.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const idiomasKw = ['inglês','português','espanhol','francês','alemão','italiano','japonês','mandarim'];
  return {
    nome: d.nome||'Seu Nome', cargo: d.cargo||d.area||'Profissional',
    email: d.email||'', telefone: d.telefone||'', cidade: d.cidade||'',
    resumo: `Profissional da área de ${d.area||'sua área'} com experiência em ${d.cargo||'sua função'}. ${d.diferencial||''}`.trim(),
    experiencia: d.experiencia||'', formacao: d.formacao||'',
    habilidades: habs.filter(h=>!idiomasKw.some(k=>h.toLowerCase().includes(k))),
    idiomas: habs.filter(h=>idiomasKw.some(k=>h.toLowerCase().includes(k))),
  };
}

function animarMensagensLoading() {
  const msgs = ['Analisando suas informações…','Estruturando sua experiência…','Escrevendo seu resumo profissional…','Refinando linguagem…','Finalizando seu currículo…'];
  let i = 0;
  const el = document.getElementById('loading-msg');
  const iv = setInterval(() => {
    if (++i < msgs.length) { el.style.opacity='0'; setTimeout(()=>{ el.textContent=msgs[i]; el.style.opacity='1'; },300); }
    else clearInterval(iv);
  }, 1800);
}

function preencherEditor(cv) {
  setVal('e-nome', cv.nome||''); setVal('e-cargo', cv.cargo||'');
  setVal('e-email', cv.email||''); setVal('e-telefone', cv.telefone||'');
  setVal('e-cidade', cv.cidade||''); setVal('e-resumo', cv.resumo||'');
  setVal('e-experiencia', cv.experiencia||''); setVal('e-formacao', cv.formacao||'');
  setVal('e-habilidades', Array.isArray(cv.habilidades) ? cv.habilidades.join(', ') : (cv.habilidades||''));
  setVal('e-idiomas', Array.isArray(cv.idiomas) ? cv.idiomas.join(', ') : (cv.idiomas||''));
}

function sincronizar(campo, valor) {
  dadosGerados[campo] = valor;
  if (campo==='nome') document.getElementById('cv-nome').textContent = valor||'—';
  else if (campo==='cargo') document.getElementById('cv-cargo').textContent = valor||'—';
  else if (['email','telefone','cidade'].includes(campo)) renderizarContato();
  else if (campo==='resumo') renderizarSecao('cv-sec-resumo','cv-resumo-txt',valor,false);
  else if (campo==='experiencia') renderizarSecao('cv-sec-exp','cv-exp-txt',valor,true);
  else if (campo==='formacao') renderizarSecao('cv-sec-form','cv-form-txt',valor,true);
  else if (campo==='habilidades') renderizarTags('cv-sec-hab','cv-hab-tags',valor);
  else if (campo==='idiomas') renderizarTags('cv-sec-idi','cv-idi-tags',valor);
}

function renderizarCV(cv) {
  document.getElementById('cv-nome').textContent = cv.nome||'—';
  document.getElementById('cv-cargo').textContent = cv.cargo||'—';
  renderizarContato();
  renderizarSecao('cv-sec-resumo','cv-resumo-txt',cv.resumo,false);
  renderizarSecao('cv-sec-exp','cv-exp-txt',cv.experiencia,true);
  renderizarSecao('cv-sec-form','cv-form-txt',cv.formacao,true);
  renderizarTags('cv-sec-hab','cv-hab-tags', Array.isArray(cv.habilidades)?cv.habilidades.join(', '):(cv.habilidades||''));
  renderizarTags('cv-sec-idi','cv-idi-tags', Array.isArray(cv.idiomas)?cv.idiomas.join(', '):(cv.idiomas||''));
}

function renderizarContato() {
  const itens = [dadosGerados.email||val('e-email'), dadosGerados.telefone||val('e-telefone'), dadosGerados.cidade||val('e-cidade')].filter(Boolean);
  document.getElementById('cv-contato').innerHTML = itens.map(i=>`<span>${i}</span>`).join('');
}

function renderizarSecao(secId, txtId, conteudo, isPre) {
  const sec = document.getElementById(secId);
  const el  = document.getElementById(txtId);
  if (!conteudo?.trim()) { sec.style.display='none'; return; }
  sec.style.display='';
  el.textContent = conteudo;
}

function renderizarTags(secId, tagsId, valor) {
  const sec  = document.getElementById(secId);
  const wrap = document.getElementById(tagsId);
  const tags = valor ? valor.split(',').map(s=>s.trim()).filter(Boolean) : [];
  if (!tags.length) { sec.style.display='none'; return; }
  sec.style.display='';
  wrap.innerHTML = tags.map(t=>`<span class="cv-tag">${t}</span>`).join('');
}

function mostrarTela(id) { document.querySelectorAll('.tela').forEach(t=>t.classList.remove('ativa')); document.getElementById(id).classList.add('ativa'); }
function voltarQuiz() { mostrarTela('tela-quiz'); }
function imprimirCV() { window.print(); }
function val(id) { return (document.getElementById(id)?.value||'').trim(); }
function setVal(id, v) { const el=document.getElementById(id); if(el) el.value=v; }
