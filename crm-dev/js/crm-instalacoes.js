// [MF-AI-CHANGE] crm-instalacoes.js — Gestão de instalações, checklist e timeline — 2026-05-22
// Handles: CRUD instalações, checklist técnico, timeline de instalação, upload de anexos

import {
  collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, orderBy, onSnapshot, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app } from '../firebase/config.js';
import { toast, escHtml, formatDate } from './crm-utils.js';

const CHECKLIST_ITENS = [
  { id: 'documentacao', label: 'Documentação do cliente', icon: '📄' },
  { id: 'projeto', label: 'Projeto elétrico aprovado', icon: '📐' },
  { id: 'materiais', label: 'Materiais comprados', icon: '📦' },
  { id: 'estrutura', label: 'Estrutura de fixação', icon: '🔩' },
  { id: 'painéis', label: 'Painéis instalados', icon: '☀️' },
  { id: 'inversor', label: 'Inversor instalado', icon: '⚡' },
  { id: 'string', label: 'String box instalada', icon: '🔌' },
  { id: 'aterramento', label: 'Aterramento', icon: '⏚' },
  { id: 'protecoes', label: 'Proteções elétricas', icon: '🛡️' },
  { id: 'comissionamento', label: 'Comissionamento', icon: '✅' },
  { id: 'homologacao', label: 'Homologação concessionária', icon: '📋' },
  { id: 'entrega', label: 'Entrega ao cliente', icon: '🎉' }
];

const STATUS_INSTALACAO = {
  agendado: { label: '📅 Agendado', cor: '#3b82f6' },
  em_andamento: { label: '🔧 Em Andamento', cor: '#f59e0b' },
  concluido: { label: '✅ Concluído', cor: '#22c55e' },
  pendente: { label: '⏳ Pendente', cor: '#ef4444' },
  cancelado: { label: '❌ Cancelado', cor: '#6b7280' }
};

let _db = null;
let _instalacoes = [];
let _leadsMap = {};

export function initInstalacoes(db) {
  _db = db;
}

export function carregarInstalacoes(onUpdate) {
  const uid = getAuth(app).currentUser?.uid;
  if (!uid) return;

  const q = query(
    collection(_db, 'instalacoes'),
    where('userId', '==', uid),
    orderBy('dataInstalacao', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    _instalacoes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    onUpdate(_instalacoes);
  });
}

export function carregarLeadsMap(onUpdate) {
  const uid = getAuth(app).currentUser?.uid;
  if (!uid) return;

  const q = query(collection(_db, 'leads'), where('userId', '==', uid));
  return onSnapshot(q, (snapshot) => {
    _leadsMap = {};
    snapshot.docs.forEach(doc => {
      _leadsMap[doc.id] = { id: doc.id, ...doc.data() };
    });
    onUpdate(_leadsMap);
  });
}

export function getInstalacoes() {
  return _instalacoes;
}

export function getLeadsMap() {
  return _leadsMap;
}

export async function criarInstalacao(leadId, dataInstalacao, responsavel, observacoes = '') {
  const uid = getAuth(app).currentUser?.uid;
  if (!uid) return null;

  const instalacao = {
    leadId,
    userId: uid,
    status: 'agendado',
    dataInstalacao: dataInstalacao,
    responsavel: responsavel || '',
    observacoes: observacoes,
    checklist: {},
    anexos: [],
    timeline: [{
      acao: 'Instalação criada',
      data: new Date().toISOString(),
      responsavel: responsavel || ''
    }],
    criadoEm: new Date().toISOString()
  };

  const ref = await addDoc(collection(_db, 'instalacoes'), instalacao);
  
  // Atualiza lead para status instalação
  await updateDoc(doc(_db, 'leads', leadId), {
    status: 'instalacao',
    ultima_acao_nome: 'Instalação agendada',
    lastAction: new Date().toISOString()
  });

  toast('Instalação criada com sucesso!', 'success');
  return ref.id;
}

export async function atualizarStatusInstalacao(instalacaoId, novoStatus) {
  const ref = doc(_db, 'instalacoes', instalacaoId);
  const instalacao = _instalacoes.find(i => i.id === instalacaoId);
  if (!instalacao) return;

  const timeline = instalacao.timeline || [];
  timeline.push({
    acao: `Status alterado para: ${STATUS_INSTALACAO[novoStatus]?.label || novoStatus}`,
    data: new Date().toISOString()
  });

  await updateDoc(ref, {
    status: novoStatus,
    timeline
  });

  toast(`Status: ${STATUS_INSTALACAO[novoStatus]?.label || novoStatus}`, 'success');
}

export async function atualizarChecklist(instalacaoId, checklistItem, concluido) {
  const ref = doc(_db, 'instalacoes', instalacaoId);
  const instalacao = _instalacoes.find(i => i.id === instalacaoId);
  if (!instalacao) return;

  const checklist = instalacao.checklist || {};
  checklist[checklistItem] = {
    concluido,
    data: new Date().toISOString()
  };

  await updateDoc(ref, { checklist });
}

export async function adicionarAnexo(instalacaoId, anexo) {
  const ref = doc(_db, 'instalacoes', instalacaoId);
  const instalacao = _instalacoes.find(i => i.id === instalacaoId);
  if (!instalacao) return;

  const anexos = instalacao.anexos || [];
  anexos.push({
    ...anexo,
    data: new Date().toISOString()
  });

  await updateDoc(ref, { anexos });
  toast('Anexo adicionado!', 'success');
}

export async function adicionarTimelineItem(instalacaoId, acao, responsavel = '') {
  const ref = doc(_db, 'instalacoes', instalacaoId);
  const instalacao = _instalacoes.find(i => i.id === instalacaoId);
  if (!instalacao) return;

  const timeline = instalacao.timeline || [];
  timeline.push({
    acao,
    data: new Date().toISOString(),
    responsavel
  });

  await updateDoc(ref, { timeline });
}

export function renderizarListaInstalacoes(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (_instalacoes.length === 0) {
    container.innerHTML = '<p class="crm-timeline-empty">Nenhuma instalação cadastrada.</p>';
    return;
  }

  container.innerHTML = _instalacoes.map(inst => {
    const lead = _leadsMap[inst.leadId] || {};
    const status = STATUS_INSTALACAO[inst.status] || STATUS_INSTALACAO.agendado;
    const dataFormatada = inst.dataInstalacao ? formatDate(new Date(inst.dataInstalacao)) : '-';
    const progresso = inst.checklist ? Object.values(inst.checklist).filter(c => c.concluido).length : 0;
    const total = CHECKLIST_ITENS.length;
    const pct = Math.round((progresso / total) * 100);

    return `
    <div class="instalacao-card glass-card" data-instalacao-id="${inst.id}">
      <div class="instalacao-header">
        <div>
          <b>${escHtml(lead.nome || 'Lead desconhecido')}</b>
          <span class="status-badge" style="background:${status.cor}">${status.label}</span>
        </div>
        <small>${dataFormatada}</small>
      </div>
      <div class="instalacao-progresso">
        <div class="progresso-bar">
          <div class="progresso-fill" style="width:${pct}%"></div>
        </div>
        <small>${progresso}/${total} (${pct}%)</small>
      </div>
      ${inst.observacoes ? `<p class="instalacao-obs">${escHtml(inst.observacoes)}</p>` : ''}
      <div class="instalacao-actions">
        <button class="btn-card btn-detalhes" onclick="window.CRM_INSTALACOES.detalhar('${inst.id}')">📋 Detalhes</button>
        <button class="btn-card btn-avancar" onclick="window.CRM_INSTALACOES.checklist('${inst.id}')">✅ Checklist</button>
        ${inst.status !== 'concluido' ? `<button class="btn-card btn-fechar-venda" onclick="window.CRM_INSTALACOES.concluir('${inst.id}')">🏁 Concluir</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

export function renderizarDetalhesInstalacao(instalacaoId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const inst = _instalacoes.find(i => i.id === instalacaoId);
  if (!inst) {
    container.innerHTML = '<p>Instalação não encontrada.</p>';
    return;
  }

  const lead = _leadsMap[inst.leadId] || {};
  const status = STATUS_INSTALACAO[inst.status] || STATUS_INSTALACAO.agendado;

  container.innerHTML = `
    <div class="detalhes-instalacao">
      <h3>📋 Dados da Instalação</h3>
      <div class="info-grid">
        <p><b>Cliente:</b> ${escHtml(lead.nome || '-')}</p>
        <p><b>Telefone:</b> ${escHtml(lead.telefone || '-')}</p>
        <p><b>Endereço:</b> ${escHtml(lead.endereco || '-')}</p>
        <p><b>Data:</b> ${inst.dataInstalacao ? formatDate(new Date(inst.dataInstalacao)) : '-'}</p>
        <p><b>Responsável:</b> ${escHtml(inst.responsavel || '-')}</p>
        <p><b>Status:</b> <span style="color:${status.cor}">${status.label}</span></p>
      </div>

      <h3 style="margin-top:20px">✅ Checklist Técnico</h3>
      <div class="checklist-grid">
        ${CHECKLIST_ITENS.map(item => {
          const concluido = inst.checklist?.[item.id]?.concluido || false;
          return `
          <label class="checklist-item ${concluido ? 'concluido' : ''}">
            <input type="checkbox" ${concluido ? 'checked' : ''} 
                   onchange="window.CRM_INSTALACOES.toggleChecklist('${inst.id}', '${item.id}', this.checked)">
            <span class="check-icon">${item.icon}</span>
            <span class="check-label">${item.label}</span>
          </label>`;
        }).join('')}
      </div>

      <h3 style="margin-top:20px">📝 Timeline</h3>
      <div class="timeline-list">
        ${(inst.timeline || []).map(t => `
          <div class="timeline-item">
            <small>${new Date(t.data).toLocaleString('pt-BR')}</small>
            <p>${escHtml(t.acao)}</p>
            ${t.responsavel ? `<small>— ${escHtml(t.responsavel)}</small>` : ''}
          </div>
        `).join('') || '<p class="crm-timeline-empty">Nenhuma atividade registrada.</p>'}
      </div>

      <h3 style="margin-top:20px">📎 Anexos</h3>
      <div class="anexos-list">
        ${(inst.anexos || []).map(a => `
          <div class="anexo-item">
            <span>📎 ${escHtml(a.nome || 'Anexo')}</span>
            <small>${new Date(a.data).toLocaleString('pt-BR')}</small>
          </div>
        `).join('') || '<p class="crm-timeline-empty">Nenhum anexo.</p>'}
      </div>

      <div class="instalacao-actions" style="margin-top:20px">
        <button class="btn-card btn-voltar" onclick="window.CRM_INSTALACOES.voltar()">← Voltar</button>
      </div>
    </div>`;
}

// Expor funções globalmente para callbacks HTML
window.CRM_INSTALACOES = {
  detalhar: (id) => renderizarDetalhesInstalacao(id, 'instalacoesConteudo'),
  checklist: (id) => renderizarDetalhesInstalacao(id, 'instalacoesConteudo'),
  concluir: async (id) => {
    if (confirm('Confirmar conclusão da instalação?')) {
      await atualizarStatusInstalacao(id, 'concluido');
      // Atualiza lead para pós-venda
      const inst = _instalacoes.find(i => i.id === id);
      if (inst?.leadId) {
        await updateDoc(doc(_db, 'leads', inst.leadId), {
          status: 'pos-venda',
          ultima_acao_nome: 'Instalação concluída',
          lastAction: new Date().toISOString()
        });
      }
      renderizarListaInstalacoes('instalacoesLista');
    }
  },
  toggleChecklist: async (instalacaoId, item, concluido) => {
    await atualizarChecklist(instalacaoId, item, concluido);
    toast('Checklist atualizado!', 'success');
  },
  voltar: () => renderizarListaInstalacoes('instalacoesConteudo')
};

export { CHECKLIST_ITENS, STATUS_INSTALACAO };