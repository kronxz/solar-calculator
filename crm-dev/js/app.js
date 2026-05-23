// [MF-AI-CHANGE] app.js — Orquestrador CRM Dev — 2026-05-22
// Integra auth, realtime leads/eventos, e conecta todos os módulos

import { app, db } from '../../firebase/config.js';
import {
  getAuth, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection, query, where, orderBy, limit, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { LEADS_LIMIT } from './crm-config.js';

// Módulos CRM Dev
import { iniciarNotepad, atualizarDashboardCompleto } from './crm-dashboard.js';
import { iniciarRealtimeEventos, pararRealtimeEventos } from './crm-events.js';
import { iniciarKanban, renderizarKanban, exportarBackup } from './crm-kanban.js';
import { iniciarLixeira, atualizarLeadsLixeira } from './crm-trash.js';
import { iniciarDetails, atualizarLeadsDetails, abrirDetalhes } from './crm-details.js';
import { renderizarStatsKits, renderizarGraficoLeads } from './crm-stats.js';
import { iniciarAnalytics, renderizarAnalytics } from './crm-analytics.js';
import { renderizarVisitas } from './crm-visitas.js';
import {
  toast, setGlobalLoading, flashSync, showKanbanSkeleton, showDashboardSkeleton,
  setSyncStatus, iniciarSidebarMobile, bindEscapeModals, iniciarMonitorConexao
} from './crm-utils.js';
import { initInstalacoes, carregarInstalacoes, carregarLeadsMap, renderizarListaInstalacoes, criarInstalacao, getLeadsMap, getInstalacoes } from './crm-instalacoes.js';
import { initTecnico, carregarDadosTecnico, pararTecnico, renderizarTecnicoPage, getTecnicoMap } from './crm-tecnico.js';
import { initFinanceiro, carregarDadosFinanceiro, pararFinanceiro, renderizarFinanceiroPage, getFinanceiroMap } from './crm-financeiro.js';
import { initNotificacoes, carregarNotificacoes, pararNotificacoes, renderizarNotificacoesPage } from './crm-notificacoes.js';

// ─── ESTADO GLOBAL ────────────────────────────────────────────
let leads = [];
let eventos = [];
let eventosSyncEm = null;
let unsubscribeLeads = null;
let unsubscribeEventos = null;
let _primeiraSync = true;
let _syncFlashTimer = null;
let _backupSaveTimer = null;
let _leadsMap = new Map();
let _atualizarTimer = null;

// ─── NAVEGAÇÃO ────────────────────────────────────────────────
function mostrarPagina(pageId) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.setAttribute('aria-hidden', 'true');
  });
  const alvo = document.getElementById(pageId);
  if (alvo) {
    alvo.classList.add('active');
    alvo.removeAttribute('aria-hidden');
  }

  // Atualiza sidebar active state
  document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
    btn.setAttribute('aria-current', btn.dataset.page === pageId ? 'page' : 'false');
  });

  // Renderiza gráfico ao abrir stats (Chart.js precisa de elemento visível)
  if (pageId === 'statsPage') {
    renderizarStatsKits(leads);
    renderizarGraficoLeads(leads);
  }
  if (pageId === 'analyticsPage') renderizarAnalytics(eventos, leads, eventosSyncEm);
  if (pageId === 'visitasPage') renderizarVisitas(eventos);
  if (pageId === 'dashboardPage') atualizarDashboardCompleto(leads, eventos);
  if (pageId === 'kanbanPage') renderizarKanban(leads);
  if (pageId === 'instalacoesPage') {
    atualizarOpcoesInstalacao();
    renderizarListaInstalacoes('instalacoesLista');
  }
  if (pageId === 'tecnicoPage') {
    renderizarTecnicoPage();
  }
  if (pageId === 'financeiroPage') {
    renderizarFinanceiroPage();
  }
  if (pageId === 'notificacoesPage') {
    renderizarNotificacoesPage();
  }
}

function iniciarNavegacao() {
  // Sidebar buttons
  document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => mostrarPagina(btn.dataset.page));
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    const auth = getAuth(app);
    signOut(auth).then(() => {
      window.location.href = 'login.html';
    });
  });

  // Backup
  document.getElementById('btn-backup')?.addEventListener('click', () => {
    exportarBackup(leads, eventos);
    toast('Backup exportado', 'success');
  });
}

// ─── ATUALIZAR TUDO ───────────────────────────────────────────
function atualizarTudo() {
  showKanbanSkeleton(false);
  const paginaAtiva = document.querySelector('.page.active')?.id;
  if (paginaAtiva === 'kanbanPage') renderizarKanban(leads);
  if (paginaAtiva === 'dashboardPage') atualizarDashboardCompleto(leads, eventos);

  // Lixeira e detalhes sempre sincronizados em segundo plano
  atualizarLeadsLixeira(leads);
  atualizarLeadsDetails(leads);

  // Sincroniza dados técnicos e financeiros
  carregarDadosTecnico(leads, getInstalacoes());
  carregarDadosFinanceiro(leads);

  // Stats (somente se página visível)
  const statsAtiva = document.getElementById('statsPage')?.classList.contains('active');
  if (statsAtiva) {
    renderizarStatsKits(leads);
    renderizarGraficoLeads(leads);
  }

  const analyticsAtiva = document.getElementById('analyticsPage')?.classList.contains('active');
  if (analyticsAtiva) renderizarAnalytics(eventos, leads, eventosSyncEm);

  const visitasAtiva = document.getElementById('visitasPage')?.classList.contains('active');
  if (visitasAtiva) renderizarVisitas(eventos);

  const financeiroAtiva = document.getElementById('financeiroPage')?.classList.contains('active');
  if (financeiroAtiva) renderizarFinanceiroPage();

  const notifAtiva = document.getElementById('notificacoesPage')?.classList.contains('active');
  if (notifAtiva) renderizarNotificacoesPage();

  // Atualiza dados de notificações em memória (sem custo Firestore)
  carregarNotificacoes(leads, getInstalacoes(), getTecnicoMap(), getFinanceiroMap());

  // Backup localStorage com debounce leve para evitar gravações contínuas
  if (_backupSaveTimer) clearTimeout(_backupSaveTimer);
  _backupSaveTimer = setTimeout(() => {
    try { localStorage.setItem('backup_leads', JSON.stringify(leads)); } catch (err) { console.warn('[CRM] backup localStorage falhou', err); }
  }, 300);

  if (!_primeiraSync) {
    clearTimeout(_syncFlashTimer);
    _syncFlashTimer = setTimeout(() => flashSync(), 300);
  }
}

// ─── LISTENERS REALTIME ───────────────────────────────────────
function limparListeners() {
  if (typeof unsubscribeLeads === 'function') { unsubscribeLeads(); unsubscribeLeads = null; }
  pararRealtimeEventos();
  unsubscribeEventos = null;
  pararTecnico();
  pararFinanceiro();
  pararNotificacoes();
}

function iniciarRealtimeLeads(userId) {
  if (unsubscribeLeads) { unsubscribeLeads(); }
  // Limit the realtime listen to recent leads to reduce read costs
  const leadsQuery = userId
    ? query(collection(db, 'leads'), where('userId', '==', userId), orderBy('data', 'desc'), limit(LEADS_LIMIT))
    : query(collection(db, 'leads'), orderBy('data', 'desc'), limit(LEADS_LIMIT));

  // Keep a map for incremental updates to avoid full rebuilds on large datasets
  _leadsMap.clear();
  unsubscribeLeads = onSnapshot(
    leadsQuery,
    snapshot => {
      // Process incremental changes
      snapshot.docChanges().forEach(change => {
        const id = change.doc.id;
        const data = { id, ...change.doc.data() };
        if (change.type === 'added' || change.type === 'modified') {
          _leadsMap.set(id, data);
        } else if (change.type === 'removed') {
          _leadsMap.delete(id);
        }
      });

      leads = Array.from(_leadsMap.values());
      console.log(`[CRM] Leads sincronizados (map): ${leads.length}`);

      if (_primeiraSync) {
        _primeiraSync = false;
        setGlobalLoading(false);
        showDashboardSkeleton(false);
        setSyncStatus('online', `${leads.length} leads`);
        toast(`${leads.length} leads sincronizados`, 'success');
      }

      // Debounce UI updates to avoid thrashing
      if (_atualizarTimer) clearTimeout(_atualizarTimer);
      _atualizarTimer = setTimeout(() => { atualizarTudo(); _atualizarTimer = null; }, 150);
    },
    err => {
      console.error('[CRM] onSnapshot leads erro:', err);
      setGlobalLoading(false);
      showDashboardSkeleton(false);
      setSyncStatus('error');
      toast('Erro ao sincronizar leads', 'error');
    }
  );
}

function iniciarRealtimeEventosCRM(userId) {
  unsubscribeEventos = iniciarRealtimeEventos(
    db,
    userId,
    lista => {
      eventos = lista;
      eventosSyncEm = new Date().toISOString();
      setSyncStatus('online', `${lista.length} eventos`);
      atualizarTudo();
    },
    () => {
      setSyncStatus('error');
      toast('Erro ao sincronizar eventos', 'error');
    }
  );
}

// ─── AUTH ─────────────────────────────────────────────────────
const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  limparListeners();
  console.log('[CRM] Auth state:', user?.uid || null);

  if (!user) {
    setGlobalLoading(false);
    window.location.href = 'login.html';
    return;
  }

  setSyncStatus('syncing');
  setGlobalLoading(true, 'Conectando ao Firebase...');
  showKanbanSkeleton(true);
  showDashboardSkeleton(true);
  _primeiraSync = true;

  // Exibir email
  const emailEl = document.getElementById('userEmail');
  if (emailEl) emailEl.textContent = (user.email || '').split('@')[0];

  // Carregar leads do localStorage imediatamente (UX)
  const backup = localStorage.getItem('backup_leads');
  if (backup) {
    try {
      leads = JSON.parse(backup);
      atualizarTudo();
    } catch (_) { /* ignora backup corrompido */ }
  }

  // Iniciar notepad
  iniciarNotepad(db, user.uid);

  // Realtime leads
  iniciarRealtimeLeads(user.uid);

  iniciarRealtimeEventosCRM(user.uid);

  initInstalacoes(db);
  initTecnico(db);
  initFinanceiro(db);
  initNotificacoes(db);
  carregarInstalacoes(() => {
    if (document.getElementById('instalacoesPage')?.classList.contains('active')) {
      renderizarListaInstalacoes('instalacoesLista');
    }
    carregarDadosTecnico(leads, getInstalacoes());
    carregarDadosFinanceiro(leads);
  });
  carregarLeadsMap(() => atualizarOpcoesInstalacao());
});

// ─── INICIALIZAR MÓDULOS ──────────────────────────────────────
iniciarSidebarMobile();
bindEscapeModals();
iniciarMonitorConexao();
iniciarNavegacao();
iniciarLixeira(db);
iniciarDetails(db);
iniciarAnalytics();
iniciarInstalacoesPage();

// Kanban: callback para abrir detalhes
iniciarKanban(db, (leadId) => abrirDetalhes(leadId));

// Página inicial
mostrarPagina('dashboardPage');


function atualizarOpcoesInstalacao() {
  const select = document.getElementById('instalacaoLeadSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Selecionar lead</option>';
  const leadsObj = getLeadsMap() || {};
  Object.values(leadsObj)
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    .forEach(lead => {
      const option = document.createElement('option');
      option.value = lead.id;
      option.textContent = `${lead.nome || 'Lead sem nome'} — ${lead.status || 'Sem status'}`;
      select.appendChild(option);
    });
}

function iniciarInstalacoesPage() {
  const btnCriar = document.getElementById('btnCriarInstalacao');
  btnCriar?.addEventListener('click', async () => {
    const leadId = document.getElementById('instalacaoLeadSelect')?.value;
    const dataInstalacao = document.getElementById('instalacaoData')?.value;
    const responsavel = document.getElementById('instalacaoResponsavel')?.value.trim();
    const observacoes = document.getElementById('instalacaoObservacoes')?.value.trim();

    if (!leadId || !dataInstalacao) {
      toast('Selecione lead e data da instalação', 'error');
      return;
    }

    setGlobalLoading(true, 'Agendando instalação...');
    try {
      await criarInstalacao(leadId, dataInstalacao, responsavel, observacoes);
      toast('Instalação agendada com sucesso', 'success');
      atualizarOpcoesInstalacao();
      if (document.getElementById('instalacoesPage')?.classList.contains('active')) {
        renderizarListaInstalacoes('instalacoesLista');
      }
    } catch (err) {
      console.error('[CRM] criarInstalacao', err);
      toast('Erro ao agendar instalação', 'error');
    } finally {
      setGlobalLoading(false);
    }
  });
}

console.log('[CRM] App inicializado — MF Soluções Dev');
