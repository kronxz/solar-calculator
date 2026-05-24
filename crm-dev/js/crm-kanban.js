// [MF-AI-CHANGE] crm-kanban.js — Kanban board, cards, drag-drop, progression — 2026-05-22
// Handles: board render, card HTML, drag-and-drop, mover/voltar, excluir, whatsapp, proposta, fechar

import {
  doc, updateDoc, addDoc, collection, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app } from '../firebase/config.js';
import {
  crmCardIntel,
  toDateFromFirestore
} from './crm-realtime.js';
import { abrirProposta as abrirPropostaLead } from './crm-proposal.js';
import { toast, escHtml } from './crm-utils.js';

const COLUNAS = ['novo', 'contato', 'proposta', 'negociacao', 'fechado', 'instalacao', 'pos-venda', 'manutencao'];
const TITULOS = {
  novo: '🟡 Novos',
  contato: '🔵 Contato',
  proposta: '🟠 Proposta',
  negociacao: '🟣 Negociação',
  fechado: '🟢 Fechado',
  instalacao: '🔧 Instalação',
  'pos-venda': '💼 Pós-Venda',
  manutencao: '🛠️ Manutenção'
};

// ─── ESTADO INTERNO ───────────────────────────────────────────
let _db = null;
let _leads = [];
let _onDetalhes = null;
let _dragId = null;
let _filtro = { busca: '', status: '', ordenar: 'recente' };

// ─── UTILITÁRIOS ──────────────────────────────────────────────
export function normalizarStatus(status) {
  const chave = String(status || 'novo').toLowerCase().trim();
  const mapa = {
    novo: 'novo',
    contato: 'contato',
    proposta: 'proposta',
    negociacao: 'negociacao',
    'negociação': 'negociacao',
    fechado: 'fechado',
    instalacao: 'instalacao',
    'pós-venda': 'pos-venda',
    'pos-venda': 'pos-venda',
    manutencao: 'manutencao',
    'manutenção': 'manutencao'
  };
  return mapa[chave] || 'novo';
}

function alertaCard(statusColuna, dias) {
  if (statusColuna === 'proposta' && dias >= 1) return { texto: '🔥 FECHAR HOJE', cor: '#ef4444' };
  if (statusColuna === 'instalacao' && dias >= 7) return { texto: '⚠️ ATRASO', cor: '#f59e0b' };
  if (statusColuna === 'pos-venda' && dias >= 3) return { texto: '⏰ FOLLOW-UP', cor: '#8b5cf6' };
  if (dias >= 5) return { texto: '⚠️ PARADO', cor: '#f59e0b' };
  return { texto: '🟢 ANDAMENTO', cor: '#22c55e' };
}

// ─── HTML DO CARD ─────────────────────────────────────────────
function criarCardHtml(lead) {
  const refData = toDateFromFirestore(lead.lastAction || lead.createdAt || lead.data);
  const dias = refData ? Math.floor((Date.now() - refData.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const status = normalizarStatus(lead.status);
  const alerta = alertaCard(status, dias);
  const valor = lead.valor ?? lead.contaDeLuz ?? '-';
  const origem = lead.utm_source || 'direto';
  const campanha = lead.utm_campaign || '-';
  const meio = lead.utm_medium || '-';
  const kit = lead.kitEscolhido || lead.sistema || '-';

  return `
<div class="card" draggable="true" data-lead-id="${lead.id}">
  <b class="card-nome">${escHtml(lead.nome || 'Sem nome')}</b>
  ${crmCardIntel(lead)}
  <div class="card-alerta" style="color:${alerta.cor}">${alerta.texto}</div>
  <small>📞 ${escHtml(lead.telefone || '-')}</small><br>
  <div class="card-utm glass-card" style="margin-top:8px;padding:8px;font-size:11px;line-height:1.7">
    📍 Origem: <b style="color:#22c55e">${escHtml(origem)}</b><br>
    📢 Campanha: <b style="color:#38bdf8">${escHtml(campanha)}</b><br>
    Meio: <b style="color:#f59e0b">${escHtml(meio)}</b><br>
    🏷️ Kit: <b style="color:#e879f9">${escHtml(kit)}</b>
  </div>
  <small>💡 Conta: R$ ${escHtml(valor)}</small>
  <div class="card-actions">
    <button type="button" class="btn-card btn-whatsapp" data-whatsapp="${lead.id}">💬 WhatsApp</button>
    <button type="button" class="btn-card btn-avancar" data-mover="${lead.id}">👉 Avançar</button>
    <button type="button" class="btn-card btn-voltar" data-voltar="${lead.id}">👈 Voltar</button>
    <button type="button" class="btn-card btn-excluir" data-excluir="${lead.id}">🗑️ Excluir</button>
    <button type="button" class="btn-card btn-detalhes" data-detalhes="${lead.id}">📊 Detalhes</button>
    <button type="button" class="btn-card btn-proposta" data-proposta="${lead.id}">📄 Proposta</button>
    <button type="button" class="btn-card btn-fechar-venda" data-fechar="${lead.id}">💰 Fechar Venda</button>
  </div>
</div>`;
}

function tsLead(l) {
  const d = toDateFromFirestore(l.lastAction || l.createdAt || l.data || l.criadoEm);
  return d ? d.getTime() : 0;
}

function filtrarLeadsKanban(leads) {
  let lista = (leads || []).filter(l => !l.deletado);
  const busca = _filtro.busca.trim().toLowerCase();
  if (busca) {
    lista = lista.filter(l =>
      (l.nome || '').toLowerCase().includes(busca) ||
      String(l.telefone || '').includes(busca)
    );
  }
  if (_filtro.status) {
    lista = lista.filter(l => normalizarStatus(l.status) === _filtro.status);
  }
  lista.sort((a, b) => {
    switch (_filtro.ordenar) {
      case 'antigo': return tsLead(a) - tsLead(b);
      case 'valor': return (parseFloat(b.valor) || 0) - (parseFloat(a.valor) || 0);
      case 'score': return (Number(b.score) || 0) - (Number(a.score) || 0);
      case 'nome': return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
      default: return tsLead(b) - tsLead(a);
    }
  });
  return lista;
}

// ─── RENDERIZAR BOARD ─────────────────────────────────────────
export function renderizarKanban(leads) {
  _leads = leads;
  const ativos = filtrarLeadsKanban(leads);
  const colunaHtml = {};
  COLUNAS.forEach(col => { colunaHtml[col] = `<h2>${TITULOS[col]}</h2>`; });

  ativos.forEach(lead => {
    const col = normalizarStatus(lead.status);
    colunaHtml[col] += criarCardHtml(lead);
  });

  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) return;
    if (!colunaHtml[col].includes('class="card"')) {
      colunaHtml[col] += '<p class="crm-col-empty">Nenhum lead nesta coluna</p>';
    }
    el.innerHTML = colunaHtml[col];
  });

  if (window.matchMedia('(max-width: 768px)').matches) mostrarColunaMobile('novo');
}

// ─── INICIALIZAR BOARD (eventos delegados) ────────────────────
export function iniciarKanban(db, onDetalhes) {
  _db = db;
  _onDetalhes = onDetalhes;

  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  // Delegação de eventos: todos os botões de card
  board.addEventListener('click', e => {
    const btn = e.target.closest('[data-mover],[data-voltar],[data-excluir],[data-detalhes],[data-proposta],[data-fechar],[data-whatsapp]');
    if (!btn) return;

    if (btn.dataset.mover) moverLead(btn.dataset.mover);
    else if (btn.dataset.voltar) voltarLead(btn.dataset.voltar);
    else if (btn.dataset.excluir) excluirLead(btn.dataset.excluir);
    else if (btn.dataset.detalhes && _onDetalhes) _onDetalhes(btn.dataset.detalhes);
    else if (btn.dataset.proposta) abrirProposta(btn.dataset.proposta);
    else if (btn.dataset.fechar) fecharVenda(btn.dataset.fechar);
    else if (btn.dataset.whatsapp) whatsappLead(btn.dataset.whatsapp);
  });

  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) return;
    el.addEventListener('dragenter', e => {
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', e => {
      if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over');
    });
    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain') || _dragId;
      if (id) moverParaColuna(id, col);
    });
  });

  board.addEventListener('dragstart', e => {
    if (e.target.closest('button')) {
      e.preventDefault();
      return;
    }
    const card = e.target.closest('.card[data-lead-id]');
    if (!card) return;
    _dragId = card.dataset.leadId;
    e.dataTransfer.setData('text/plain', _dragId);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  board.addEventListener('dragend', e => {
    const card = e.target.closest('.card');
    if (card) card.classList.remove('dragging');
    COLUNAS.forEach(c => document.getElementById(c)?.classList.remove('drag-over'));
    _dragId = null;
  });

  // Mobile tabs
  const tabs = document.getElementById('kanbanTabs');
  if (tabs) {
    tabs.addEventListener('click', e => {
      const btn = e.target.closest('[data-coluna]');
      if (!btn) return;
      tabs.querySelectorAll('.kanban-btn').forEach(b => {
        b.classList.remove('active-tab');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active-tab');
      btn.setAttribute('aria-selected', 'true');
      const col = btn.dataset.coluna;
      if (col === 'todos') mostrarTodasColunas();
      else mostrarColunaMobile(col);
    });
  }

  document.getElementById('btn-novo-lead')?.addEventListener('click', novoLead);

  document.getElementById('kanbanBusca')?.addEventListener('input', e => {
    _filtro.busca = e.target.value;
    renderizarKanban(_leads);
  });
  document.getElementById('kanbanFiltroStatus')?.addEventListener('change', e => {
    _filtro.status = e.target.value;
    renderizarKanban(_leads);
  });
  document.getElementById('kanbanOrdenar')?.addEventListener('change', e => {
    _filtro.ordenar = e.target.value;
    renderizarKanban(_leads);
  });
}

// ─── AÇÕES DOS LEADS ──────────────────────────────────────────
async function moverParaColuna(id, novoStatus) {
  const ref = doc(_db, 'leads', id);
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const historico = lead.historico || [];
  historico.push({ acao: 'Movido para ' + novoStatus, data: new Date().toISOString() });
  await updateDoc(ref, {
    status: novoStatus,
    historico,
    ultima_acao_nome: 'Movido para ' + novoStatus,
    lastAction: new Date().toISOString()
  });
  toast(`Lead → ${novoStatus}`, 'success');
}

async function moverLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const atual = normalizarStatus(lead.status);
  const i = COLUNAS.indexOf(atual);
  if (i < COLUNAS.length - 1) await moverParaColuna(id, COLUNAS[i + 1]);
}

async function voltarLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const atual = normalizarStatus(lead.status);
  const i = COLUNAS.indexOf(atual);
  if (i > 0) await moverParaColuna(id, COLUNAS[i - 1]);
}

async function excluirLead(id) {
  if (!confirm('Mover lead para a lixeira?')) return;
  const ref = doc(_db, 'leads', id);
  await updateDoc(ref, { deletado: true, deletadoEm: new Date().toISOString() });
  toast('Lead movido para lixeira', 'warn');
}

async function fecharVenda(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;

  // Atualiza estatísticas locais por kit
  const est = JSON.parse(localStorage.getItem('estatisticas')) || {};
  const sistema = String(lead.sistema || lead.kitEscolhido || '');
  if (sistema.includes('Essencial')) est.essencialFechados = (est.essencialFechados || 0) + 1;
  if (sistema.includes('Recomendado')) est.recomendadoFechados = (est.recomendadoFechados || 0) + 1;
  if (sistema.includes('Premium')) est.premiumFechados = (est.premiumFechados || 0) + 1;
  localStorage.setItem('estatisticas', JSON.stringify(est));

  await updateDoc(doc(_db, 'leads', id), { status: 'fechado' });
  toast('🚀 Venda fechada!', 'success');
}

function whatsappLead(id) {
  const lead = _leads.find(l => l.id === id);
  if (!lead) return;
  const numero = String(lead.telefone || '').replace(/\D/g, '');
  const msg = `Olá ${lead.nome}, preparei sua proposta de energia solar.\n\nHoje ainda consigo manter as condições especiais.\n\nPosso te explicar em 2 minutos?`;
  window.open('https://wa.me/55' + numero + '?text=' + encodeURIComponent(msg));
}

function abrirProposta(id) {
  const lead = _leads.find(l => l.id === id);
  if (abrirPropostaLead(lead)) toast('Proposta aberta', 'info');
}

async function novoLead() {
  const nome = prompt('Nome do cliente:');
  if (!nome) return;
  const telefone = prompt('Telefone:');
  const valor = prompt('Conta de luz (R$):');
  const investimento = prompt('Valor do sistema (R$):');
  const kwp = prompt('Potência do sistema (kWp):');

  const utm = JSON.parse(localStorage.getItem('utm') || '{}');
  const kit = JSON.parse(localStorage.getItem('kitSelecionado') || '{}');

  const uid = getAuth(app).currentUser?.uid || null;
  if (!uid) {
    toast('Usuário não autenticado', 'error');
    return;
  }

  const tel = String(telefone || '').replace(/\D/g, '');

  await addDoc(collection(_db, 'leads'), {
    nome, telefone, telefoneDigitos: tel, valor,
    sistema: kit?.sistema || '-',
    investimento: kit?.investimento || investimento || 0,
    geracao: kit?.geracao || 0,
    geracaoMensal: kit?.geracao || 0,
    kwp: kit?.kwp || kwp || 0,
    payback: kit?.payback || '-',
    inversor: kit?.inversor || '-',
    overload: kit?.overload || '-',
    potenciaPlaca: kit?.potenciaPlaca || '-',
    placas: kit?.placas || 0,
    status: 'novo',
    userId: uid,
    data: new Date().toISOString(),
    criadoEm: new Date().toISOString(),
    utm_source: utm.source,
    utm_campaign: utm.campaign,
    utm_medium: utm.medium
  });
}

// ─── MOBILE KANBAN TABS ───────────────────────────────────────
export function mostrarColunaMobile(status) {
  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) return;
    el.classList.remove('active-mobile', 'show-all');
  });
  const alvo = document.getElementById(status);
  if (alvo) alvo.classList.add('active-mobile');
}

export function mostrarTodasColunas() {
  COLUNAS.forEach(col => {
    const el = document.getElementById(col);
    if (!el) return;
    el.classList.remove('active-mobile');
    el.classList.add('show-all');
  });
}

// ─── EXPORTAR BACKUP ──────────────────────────────────────────
export function exportarBackup(leads, eventos) {
  if (!confirm('⚠️ Deseja baixar o backup do CRM?')) return;
  const blob = new Blob(
    [JSON.stringify({ leads, eventos, exportadoEm: new Date().toISOString() }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-crm-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
