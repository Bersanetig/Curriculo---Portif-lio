const GROQ_KEY = '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';

let passo = 1;
const TOTAL = 8;
let fotoBase64 = null;
let estiloFoto = "redonda";
let dadosCV = {};
let modoIA = true; // true = com IA, false = sem IA

document.addEventListener('DOMContentLoaded', () => atualizarUI());

// ── TELAS ──
function irParaQuiz(modo) {
  modoIA = (modo === 'ia');
  // Atualiza tag de modo no header do quiz
  const tag = document.getElementById('modo-tag');
  if (modoIA) {
    tag.textContent = '✨ Com IA';
    tag.classList.remove('manual');
    document.getElementById('hint-exp').textContent = 'Descreva em poucas palavras. A IA vai organizar tudo.';
  } else {
    tag.textContent = '📝 Sem IA';
    tag.classList.add('manual');
    document.getElementById('hint-exp').textContent = 'Suas respostas serão usadas diretamente no currículo.';
  }
  // Atualiza texto do botão gerar
  document.getElementById('btn-gen').textContent = modoIA ? '✨ Gerar meu Currículo' : '📝 Montar meu Currículo';
  mostrarTela('tela-quiz');
  atualizarUI();
}

function irParaHome()  { mostrarTela('tela-home'); }
function voltarQuiz()  { mostrarTela('tela-quiz'); }
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
}

// ── NAVEGAÇÃO QUIZ ──
function proximoPasso()  { if (passo < TOTAL) irPasso(passo + 1); }
function passoAnterior() { if (passo > 1)     irPasso(passo - 1); }

function irPasso(n) {
  document.querySelector(`.passo[data-step="${passo}"]`)?.classList.remove('ativo');
  passo = n;
  const el = document.querySelector(`.passo[data-step="${passo}"]`);
  el?.classList.add('ativo');
  atualizarUI();
  setTimeout(() => el?.querySelector('input,textarea')?.focus(), 100);
}

function atualizarUI() {
  const bar  = document.getElementById('prog-bar');
  const num  = document.getElementById('prog-num');
  const back = document.getElementById('btn-back');
  const next = document.getElementById('btn-next');
  const gen  = document.getElementById('btn-gen');
  if (!bar) return;
  bar.style.width = (passo / TOTAL * 100) + '%';
  num.textContent = passo + ' / ' + TOTAL;
  passo > 1 ? back.classList.add('show') : back.classList.remove('show');
  if (passo === TOTAL) { next.classList.add('hide'); gen.classList.add('show'); }
  else                 { next.classList.remove('hide'); gen.classList.remove('show'); }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement?.tagName !== 'TEXTAREA') {
    e.preventDefault();
    passo < TOTAL ? proximoPasso() : gerarCurriculo();
  }
});

// ── GERAR CURRÍCULO ──
async function gerarCurriculo() {
  const d = {
    nome:        gv('q-nome'),
    area:        gv('q-area'),
    cargo:       gv('q-cargo'),
    email:       gv('q-email'),
    telefone:    gv('q-telefone'),
    cidade:      gv('q-cidade'),
    experiencia: gv('q-experiencia'),
    formacao:    gv('q-formacao'),
    habilidades: gv('q-habilidades'),
    diferencial: gv('q-diferencial'),
  };

  mostrarTela('tela-loading');

  if (modoIA) {
    animarLoading(['Analisando seu perfil…','Identificando seus pontos fortes…','Escrevendo seu resumo…','Refinando linguagem…','Finalizando…']);
    try {
      const resp = await groq(montarPrompt(d));
      const cv   = parseCV(resp, d);
      dadosCV = cv;
      preencherEditor(cv);
      renderCV(cv);
      atualizarFotoCV();
      mostrarTela('tela-resultado');
    } catch(err) {
      console.error('Erro IA:', err);
      // fallback sem IA se der erro
      const cv = semIA(d);
      dadosCV = cv;
      preencherEditor(cv);
      renderCV(cv);
      mostrarTela('tela-resultado');
    }
  } else {
    animarLoading(['Organizando suas informações…','Montando seu currículo…','Finalizando…']);
    setTimeout(() => {
      const cv = semIA(d);
      dadosCV = cv;
      preencherEditor(cv);
      renderCV(cv);
      atualizarFotoCV();
      mostrarTela('tela-resultado');
      // Mostra botão "Testar com IA" só no modo sem IA
      document.getElementById('btn-testar-ia').style.display = 'block';
    }, 2000);
  }
}

// ── MODO SEM IA — só organiza os dados ──
function semIA(d) {
  const habs = d.habilidades ? d.habilidades.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const idi  = ['inglês','espanhol','francês','alemão','italiano','japonês','mandarim','português'];
  return {
    nome:        d.nome        || 'Seu Nome',
    cargo:       d.cargo       || d.area || 'Profissional',
    email:       d.email       || '',
    telefone:    d.telefone    || '',
    cidade:      d.cidade      || '',
    resumo:      d.diferencial || '',
    experiencia: d.experiencia || '',
    formacao:    d.formacao    || '',
    habilidades: habs.filter(h => !idi.some(k => h.toLowerCase().includes(k))),
    idiomas:     habs.filter(h =>  idi.some(k => h.toLowerCase().includes(k))),
  };
}

// ── MODO COM IA ──
function montarPrompt(d) {
  return `Você é um especialista em RH com 20 anos de experiência criando currículos que geram entrevistas em grandes empresas.

Transforme as informações abaixo no melhor currículo possível para ${d.nome||'este profissional'}.
Use linguagem profissional, verbos de ação, destaque resultados e o valor único desta pessoa.

INFORMAÇÕES:
- Nome: ${d.nome||''}
- Área: ${d.area||''}
- Cargo: ${d.cargo||''}
- E-mail: ${d.email||''}
- Telefone: ${d.telefone||''}
- Cidade: ${d.cidade||''}
- Experiência: ${d.experiencia||''}
- Formação: ${d.formacao||''}
- Habilidades e idiomas: ${d.habilidades||''}
- Diferenciais: ${d.diferencial||''}

Retorne APENAS JSON válido, sem markdown, sem texto extra:
{"nome":"","cargo":"","email":"","telefone":"","cidade":"","resumo":"3-4 linhas persuasivas destacando valor único do profissional","experiencia":"reescrita com linguagem profissional e verbos de ação (use \\n\\n entre experiências)","formacao":"formatada com curso, instituição e período (use \\n)","habilidades":["h1","h2"],"idiomas":["Idioma (nível)"]}`;
}

async function groq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 2000,
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('❌ Groq erro:', res.status, err?.error?.message || '');
    throw new Error('Groq ' + res.status);
  }
  console.log('✅ Groq OK');
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseCV(texto, orig) {
  try {
    const obj = JSON.parse(texto.replace(/```json|```/g, '').trim());
    if (typeof obj.habilidades === 'string') obj.habilidades = obj.habilidades.split(',').map(s=>s.trim()).filter(Boolean);
    if (typeof obj.idiomas === 'string')     obj.idiomas     = obj.idiomas.split(',').map(s=>s.trim()).filter(Boolean);
    if (!Array.isArray(obj.habilidades)) obj.habilidades = [];
    if (!Array.isArray(obj.idiomas))     obj.idiomas     = [];
    return obj;
  } catch { return semIA(orig); }
}

// ── LOADING ──
function animarLoading(msgs) {
  let i = 0;
  const el = document.getElementById('loading-msg');
  el.textContent = msgs[0];
  const iv = setInterval(() => {
    if (++i < msgs.length) {
      el.style.opacity = '0';
      setTimeout(() => { el.textContent = msgs[i]; el.style.opacity = '1'; }, 300);
    } else clearInterval(iv);
  }, 1600);
}

// ── EDITOR ──
function preencherEditor(cv) {
  sv('e-nome', cv.nome||''); sv('e-cargo', cv.cargo||'');
  sv('e-email', cv.email||''); sv('e-telefone', cv.telefone||''); sv('e-cidade', cv.cidade||'');
  sv('e-resumo', cv.resumo||''); sv('e-experiencia', cv.experiencia||''); sv('e-formacao', cv.formacao||'');
  sv('e-habilidades', Array.isArray(cv.habilidades) ? cv.habilidades.join(', ') : '');
  sv('e-idiomas',     Array.isArray(cv.idiomas)     ? cv.idiomas.join(', ')     : '');
}

function sync(campo, valor) {
  dadosCV[campo] = valor;
  if      (campo === 'nome')        gi('cv-nome').textContent = valor || '—';
  else if (campo === 'cargo')       gi('cv-cargo').textContent = valor || '—';
  else if (['email','telefone','cidade'].includes(campo)) renderContato();
  else if (campo === 'resumo')      renderSec('s-res','cv-res', valor);
  else if (campo === 'experiencia') renderSec('s-exp','cv-exp', valor);
  else if (campo === 'formacao')    renderSec('s-form','cv-form', valor);
  else if (campo === 'habilidades') renderTags('s-hab','cv-hab', valor);
  else if (campo === 'idiomas')     renderTags('s-idi','cv-idi', valor);
}

// ── RENDER CV ──
function renderCV(cv) {
  gi('cv-nome').textContent  = cv.nome  || '—';
  gi('cv-cargo').textContent = cv.cargo || '—';
  renderContato();
  renderSec('s-res','cv-res', cv.resumo);
  renderSec('s-exp','cv-exp', cv.experiencia);
  renderSec('s-form','cv-form', cv.formacao);
  renderTags('s-hab','cv-hab', Array.isArray(cv.habilidades) ? cv.habilidades.join(', ') : '');
  renderTags('s-idi','cv-idi', Array.isArray(cv.idiomas)     ? cv.idiomas.join(', ')     : '');
}

function renderContato() {
  const itens = [dadosCV.email||gv('e-email'), dadosCV.telefone||gv('e-telefone'), dadosCV.cidade||gv('e-cidade')].filter(Boolean);
  gi('cv-contato').innerHTML = itens.map(i => `<span>${i}</span>`).join('');
}

function renderSec(secId, txtId, conteudo) {
  const sec = gi(secId), el = gi(txtId);
  if (!conteudo?.trim()) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  el.textContent = conteudo;
}

function renderTags(secId, tagsId, valor) {
  const sec = gi(secId), wrap = gi(tagsId);
  const tags = valor ? valor.split(',').map(s => s.trim()).filter(Boolean) : [];
  if (!tags.length) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  wrap.innerHTML = tags.map(t => `<span class="cv-tag">${t}</span>`).join('');
}

function imprimirCV() { window.print(); }

const gi = id => document.getElementById(id);
const gv = id => (gi(id)?.value || '').trim();
const sv = (id, v) => { const e = gi(id); if (e) e.value = v; };

// ── TESTAR COM IA ──
async function testarComIA() {
  const btn = document.getElementById('btn-testar-ia');
  btn.disabled = true;
  btn.textContent = '⏳ Gerando...';

  const d = {
    nome:        gv('e-nome'),
    area:        dadosCV.area        || '',
    cargo:       gv('e-cargo'),
    email:       gv('e-email'),
    telefone:    gv('e-telefone'),
    cidade:      gv('e-cidade'),
    experiencia: gv('e-experiencia'),
    formacao:    gv('e-formacao'),
    habilidades: gv('e-habilidades'),
    diferencial: gv('e-resumo'),
  };

  try {
    const resp = await groq(montarPrompt(d));
    const cv   = parseCV(resp, d);
    dadosCV = cv;
    preencherEditor(cv);
    renderCV(cv);
    // Esconde o botão após usar
    btn.style.display = 'none';
  } catch(err) {
    console.error('Erro IA:', err);
    btn.textContent = '✨ Testar com IA';
  }

  btn.disabled = false;
}

// ── MODAL PIX ──
function abrirModal() {
  document.getElementById('modal-pix').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('modal-pix').style.display = 'none';
  document.body.style.overflow = '';
}

function copiarPix() {
  navigator.clipboard.writeText('19998900045').then(() => {
    const btn = document.querySelector('.btn-copiar');
    btn.textContent = '✓ Copiado!';
    setTimeout(() => btn.textContent = 'Copiar', 2000);
  });
}

// Fechar clicando fora do modal
document.addEventListener('click', e => {
  if (e.target.id === 'modal-pix') fecharModal();
});

// ── FOTO ──
function mostrarUploadFoto() {
  document.getElementById('foto-sim').style.border = '1px solid var(--gold)';
  document.getElementById('foto-nao').style.border = '1px solid rgba(255,255,255,.12)';
  document.getElementById('upload-foto-wrap').style.display = 'block';
}

function pularFoto() {
  fotoBase64 = null;
  document.getElementById('foto-nao').style.border = '1px solid var(--gold)';
  document.getElementById('foto-sim').style.border = '1px solid rgba(255,255,255,.12)';
  document.getElementById('upload-foto-wrap').style.display = 'none';
}

function previewFoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    fotoBase64 = e.target.result;
    const wrap = document.getElementById('foto-preview-wrap');
    wrap.innerHTML = `<img src="${fotoBase64}" class="foto-preview-img"/>
      <p style="font-size:13px;color:rgba(255,255,255,.5)">Foto selecionada ✓</p>
      <span class="foto-upload-hint">Clique para trocar</span>`;
    atualizarFotoCV();
  };
  reader.readAsDataURL(file);
}

function escolherEstilo(estilo) {
  estiloFoto = estilo;
  document.getElementById('estilo-redonda').classList.toggle('ativo', estilo === 'redonda');
  document.getElementById('estilo-quadrada').classList.toggle('ativo', estilo === 'quadrada');
  atualizarFotoCV();
}

function atualizarFotoCV() {
  const img = document.getElementById('cv-foto');
  if (fotoBase64) {
    img.src = fotoBase64;
    img.className = 'cv-foto ' + estiloFoto;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
}
