/**
 * crm-utils.js — UI global, formatação, status sync
 */

let _toastTimer = null;

export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatBRL(valor) {
  return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
}

export function parseDataFirestore(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toast(msg, tipo = 'info') {
  const el = document.getElementById('crmToast');
  if (!el) return;
  el.className = `crm-toast crm-toast--${tipo}`;
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('crm-toast--show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('crm-toast--show'), 3200);
}

export function setGlobalLoading(on, text = 'Carregando CRM...') {
  const el = document.getElementById('crmLoading');
  if (!el) return;
  el.classList.toggle('ativo', on);
  el.setAttribute('aria-hidden', on ? 'false' : 'true');
  const t = el.querySelector('.crm-loading-text');
  if (t) t.textContent = text;
}

export function setSyncStatus(estado, detalhe = '') {
  const el = document.getElementById('crmSyncStatus');
  if (!el) return;
  el.className = 'crm-sync-status crm-sync-status--' + estado;
  const labels = {
    syncing: '🔄 Sincronizando',
    online: '🟢 Online',
    offline: '🔴 Offline',
    error: '⚠️ Erro sync'
  };
  el.textContent = detalhe || labels[estado] || estado;
  el.title = detalhe || labels[estado] || '';
}

export function flashSync() {
  document.body.classList.add('crm-sync-pulse');
  setTimeout(() => document.body.classList.remove('crm-sync-pulse'), 450);
}

export function showKanbanSkeleton(on) {
  document.getElementById('kanbanBoard')?.classList.toggle('kanban-skeleton', on);
}

export function showDashboardSkeleton(on) {
  document.getElementById('dashboardMetrics')?.classList.toggle('crm-skeleton-block', on);
  document.getElementById('analytics')?.classList.toggle('crm-skeleton-block', on);
  document.querySelector('.dashboard-grid')?.classList.toggle('crm-skeleton-block', on);
}

export function emptyStateHtml(icon, titulo, texto) {
  return `<div class="crm-empty glass-card" role="status">
    <span class="crm-empty-icon">${icon}</span>
    <b>${escHtml(titulo)}</b>
    <p>${escHtml(texto)}</p>
  </div>`;
}

export function iniciarSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('btnSidebarToggle');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar || !toggle) return;

  const fechar = () => {
    sidebar.classList.remove('aberto');
    backdrop?.classList.remove('ativo');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('aberto') ? fechar() : (sidebar.classList.add('aberto'), backdrop?.classList.add('ativo'), document.body.style.overflow = 'hidden');
  });

  backdrop?.addEventListener('click', fechar);
  document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { if (window.innerWidth <= 768) fechar(); });
  });
}

export function bindEscapeModals() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.getElementById('sidebar')?.classList.remove('aberto');
    document.getElementById('sidebarBackdrop')?.classList.remove('ativo');
    document.body.style.overflow = '';
    ['modalDetalhes', 'modalLixeira'].forEach(id => {
      const m = document.getElementById(id);
      if (m?.classList.contains('ativo')) {
        m.classList.remove('ativo');
        m.setAttribute('aria-hidden', 'true');
      }
    });
  });
}

export function iniciarMonitorConexao() {
  const upd = () => setSyncStatus(navigator.onLine ? 'online' : 'offline');
  window.addEventListener('online', () => { upd(); toast('Conexão restaurada', 'success'); });
  window.addEventListener('offline', () => { upd(); toast('Sem internet', 'warn'); });
  upd();
}

