/**
 * crm-trash.js — Lixeira: busca, restaurar, excluir permanente
 */

import { doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { toast, escHtml } from './crm-utils.js';

let _db = null;
let _leads = [];
let _debounce = null;

function formatarData(dataISO) {
  if (!dataISO) return '—';
  const d = new Date(dataISO);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} - ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function iniciarLixeira(db) {
  _db = db;
  document.getElementById('btn-lixeira')?.addEventListener('click', abrirLixeira);
  document.getElementById('btn-fechar-lixeira')?.addEventListener('click', fecharLixeira);
  document.getElementById('modalLixeira')?.addEventListener('click', e => {
    if (e.target.id === 'modalLixeira') fecharLixeira();
  });
  document.getElementById('pesquisaLixeira')?.addEventListener('input', () => {
    if (_debounce) clearTimeout(_debounce);
    _debounce = setTimeout(() => renderLixeira(), 300);
  });
  document.getElementById('listaLixeira')?.addEventListener('click', e => {
    const btnRestore = e.target.closest('[data-restaurar]');
    const btnDelete = e.target.closest('[data-excluir-perm]');
    if (btnRestore) restaurarLead(btnRestore.dataset.restaurar);
    if (btnDelete) excluirPermanentemente(btnDelete.dataset.excluirPerm);
  });
}

export const iniciarTrash = iniciarLixeira;

export function atualizarLeadsLixeira(leads) {
  _leads = leads;
  const modal = document.getElementById('modalLixeira');
  if (modal?.classList.contains('ativo')) renderLixeira();
}

export const atualizarLeadsTrash = atualizarLeadsLixeira;

export function abrirLixeira() {
  const modal = document.getElementById('modalLixeira');
  if (!modal) return;
  modal.classList.add('ativo');
  modal.setAttribute('aria-hidden', 'false');
  const inp = document.getElementById('pesquisaLixeira');
  if (inp) inp.value = '';
  renderLixeira();
}

export function fecharLixeira() {
  const modal = document.getElementById('modalLixeira');
  if (!modal) return;
  modal.classList.remove('ativo');
  modal.setAttribute('aria-hidden', 'true');
}

function renderLixeira() {
  const lista = document.getElementById('listaLixeira');
  if (!lista) return;

  const busca = (document.getElementById('pesquisaLixeira')?.value || '').toLowerCase();
  const excluidos = _leads
    .filter(l => l.deletado)
    .filter(l =>
      (l.nome || '').toLowerCase().includes(busca) ||
      (l.telefone || '').includes(busca)
    )
    .sort((a, b) => new Date(b.deletadoEm || 0) - new Date(a.deletadoEm || 0));

  if (!excluidos.length) {
    lista.innerHTML = '<div class="lixeira-vazia" role="status">Nenhum lead na lixeira.</div>';
    return;
  }

  lista.innerHTML = excluidos.map(l => `
<div class="lixeira-card glass-card" role="listitem">
  <div class="lixeira-info">
    <b>${escHtml(l.nome || 'Sem nome')}</b>
    <small>📞 ${escHtml(l.telefone || '-')}</small>
    <small>💰 R$ ${escHtml(l.valor || '-')}</small>
    <small style="color:var(--texto-secundario)">Excluído: ${formatarData(l.deletadoEm)}</small>
  </div>
  <div class="lixeira-actions">
    <button type="button" class="btn-card btn-whatsapp" data-restaurar="${l.id}">♻️ Restaurar</button>
    <button type="button" class="btn-card btn-excluir" data-excluir-perm="${l.id}">❌ Excluir</button>
  </div>
</div>`).join('');
}

async function restaurarLead(id) {
  try {
    await updateDoc(doc(_db, 'leads', id), {
      deletado: false,
      restauradoEm: new Date().toISOString()
    });
    renderLixeira();
    toast('Lead restaurado', 'success');
  } catch (e) {
    console.error('[CRM-Trash]', e);
    toast('Erro ao restaurar lead', 'error');
  }
}

async function excluirPermanentemente(id) {
  if (!confirm('Excluir permanentemente? Esta ação não pode ser desfeita.')) return;
  try {
    await deleteDoc(doc(_db, 'leads', id));
    renderLixeira();
    toast('Lead excluído permanentemente', 'warn');
  } catch (e) {
    console.error('[CRM-Trash]', e);
    toast('Erro ao excluir lead', 'error');
  }
}
