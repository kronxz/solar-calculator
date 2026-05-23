// [MF-AI-CHANGE] crm-tecnico.js — Módulo Técnico Operacional CRM — 2026-05-23
// Gestão de: Garantias, Chamados Técnicos, Manutenções, Histórico Técnico, Anexos/Fotos e Agenda Técnica.

import {
  collection, doc, setDoc, updateDoc, onSnapshot, query, where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app } from '../../firebase/config.js';
import { toast, escHtml, formatDate } from './crm-utils.js';

let _db = null;
let _userId = null;
let _tecnicoMap = {}; // leadId -> dados técnicos
let _leadsList = []; // Cópia dos leads para cruzamento
let _instalacoesList = []; // Cópia das instalações para a agenda
let _leadSelecionadoId = null;
let _abaAtiva = 'abaTecTimeline';
let _unsubTecnico = null;

export function initTecnico(db) {
  _db = db;
}

export function getTecnicoMap() {
  return _tecnicoMap;
}

export function carregarDadosTecnico(leads, instalacoes) {
  _leadsList = leads || [];
  _instalacoesList = instalacoes || [];
  
  const user = getAuth(app).currentUser;
  if (!user || !_db) return;
  _userId = user.uid;

  if (_unsubTecnico) return; // Evita listeners duplicados

  const q = query(
    collection(_db, 'tecnico_dados'),
    where('userId', '==', _userId)
  );

  _unsubTecnico = onSnapshot(q, (snapshot) => {
    _tecnicoMap = {};
    snapshot.docs.forEach(doc => {
      _tecnicoMap[doc.id] = doc.data();
    });
    
    // Recarrega a UI se a página técnica estiver ativa
    if (document.getElementById('tecnicoPage')?.classList.contains('active')) {
      renderizarTecnicoPage();
    }
  }, (err) => {
    console.error('[CRM-TECNICO] Erro ao sincronizar dados técnicos:', err);
  });
}

export function pararTecnico() {
  if (_unsubTecnico) {
    _unsubTecnico();
    _unsubTecnico = null;
  }
}

// ─── OPERAÇÕES DB ──────────────────────────────────────────────

async function obterOuCriarDoc(leadId) {
  const ref = doc(_db, 'tecnico_dados', leadId);
  const dataExistente = _tecnicoMap[leadId];
  
  if (dataExistente) {
    return { ref, data: { ...dataExistente } };
  }

  // Objeto base caso ainda não exista no Firestore
  const novoDoc = {
    leadId,
    userId: _userId,
    garantias: {
      inicioGarantia: '',
      mesesInversor: 120,
      mesesPaineis: 300,
      mesesInstalacao: 12,
      notas: ''
    },
    chamados: [],
    manutencoes: [],
    anexos: [],
    criadoEm: new Date().toISOString()
  };

  return { ref, data: novoDoc };
}

export async function salvarGarantia(leadId, campos) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    data.garantias = {
      ...data.garantias,
      ...campos
    };
    await setDoc(ref, data, { merge: true });
    toast('Garantia atualizada com sucesso!', 'success');
  } catch (err) {
    console.error('[CRM-TECNICO] Erro ao salvar garantia:', err);
    toast('Erro ao atualizar garantia', 'error');
  }
}

export async function adicionarChamado(leadId, chamado) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    const novoChamado = {
      id: 'ch_' + Math.random().toString(36).substr(2, 9),
      status: 'aberto',
      dataAbertura: new Date().toISOString(),
      ...chamado
    };
    data.chamados = data.chamados || [];
    data.chamados.push(novoChamado);
    
    await setDoc(ref, data, { merge: true });
    toast('Chamado técnico aberto!', 'success');
    
    // Atualiza status do lead no Kanban se necessário
    await registrarAcaoNoLead(leadId, `Chamado técnico aberto: "${chamado.titulo}"`);
  } catch (err) {
    console.error('[CRM-TECNICO] Erro ao abrir chamado:', err);
    toast('Erro ao abrir chamado', 'error');
  }
}

export async function atualizarStatusChamado(leadId, chamadoId, novoStatus) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    data.chamados = (data.chamados || []).map(ch => {
      if (ch.id === chamadoId) {
        const atualizado = { ...ch, status: novoStatus };
        if (novoStatus === 'resolvido') {
          atualizado.dataResolvido = new Date().toISOString();
        }
        return atualizado;
      }
      return ch;
    });

    await setDoc(ref, data, { merge: true });
    toast(`Chamado alterado para: ${novoStatus}`, 'success');
    
    const chamado = data.chamados.find(ch => ch.id === chamadoId);
    await registrarAcaoNoLead(leadId, `Chamado "${chamado?.titulo}" alterado para ${novoStatus}`);
  } catch (err) {
    console.error('[CRM-TECNICO] Erro ao atualizar chamado:', err);
  }
}

export async function adicionarManutencao(leadId, manutencao) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    const novaManutencao = {
      id: 'mn_' + Math.random().toString(36).substr(2, 9),
      status: 'agendado',
      ...manutencao
    };
    data.manutencoes = data.manutencoes || [];
    data.manutencoes.push(novaManutencao);

    await setDoc(ref, data, { merge: true });
    toast('Manutenção agendada com sucesso!', 'success');
    await registrarAcaoNoLead(leadId, `Manutenção ${manutencao.tipo} agendada para ${formatDate(new Date(manutencao.dataAgendada))}`);
  } catch (err) {
    console.error('[CRM-TECNICO] Erro ao agendar manutenção:', err);
    toast('Erro ao agendar manutenção', 'error');
  }
}

export async function concluirManutencao(leadId, manutencaoId, parecerTecnico) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    data.manutencoes = (data.manutencoes || []).map(mn => {
      if (mn.id === manutencaoId) {
        return {
          ...mn,
          status: 'concluido',
          parecerTecnico: parecerTecnico || 'Serviço concluído com sucesso.',
          dataConclusao: new Date().toISOString()
        };
      }
      return mn;
    });

    await setDoc(ref, data, { merge: true });
    toast('Manutenção concluída!', 'success');
    await registrarAcaoNoLead(leadId, 'Manutenção concluída e parecer emitido');
  } catch (err) {
    console.error('[CRM-TECNICO] Erro ao concluir manutenção:', err);
  }
}

export async function adicionarAnexo(leadId, nome, url, categoria) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    const novoAnexo = {
      id: 'ax_' + Math.random().toString(36).substr(2, 9),
      nome,
      url,
      categoria,
      data: new Date().toISOString()
    };
    data.anexos = data.anexos || [];
    data.anexos.push(novoAnexo);

    await setDoc(ref, data, { merge: true });
    toast('Anexo técnico adicionado!', 'success');
  } catch (err) {
    console.error('[CRM-TECNICO] Erro ao adicionar anexo:', err);
    toast('Erro ao salvar anexo', 'error');
  }
}

// ─── UTILITÁRIOS INTERNOS ──────────────────────────────────────

async function registrarAcaoNoLead(leadId, acaoDesc) {
  try {
    const leadRef = doc(_db, 'leads', leadId);
    await updateDoc(leadRef, {
      ultima_acao_nome: acaoDesc,
      lastAction: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[CRM-TECNICO] Falha ao registrar timeline no lead principal:', err);
  }
}

function calcularStatusGarantia(garantias) {
  if (!garantias || !garantias.inicioGarantia) return { label: 'Sem Garantia', cor: '#6b7280' };
  
  const inicio = new Date(garantias.inicioGarantia);
  const mesesMax = Math.max(garantias.mesesInversor || 0, garantias.mesesPaineis || 0, garantias.mesesInstalacao || 0);
  const fim = new Date(inicio);
  fim.setMonth(fim.getMonth() + mesesMax);

  const hoje = new Date();
  if (hoje > fim) {
    return { label: 'Expirada', cor: '#ef4444' };
  }
  
  // Verifica se faltam menos de 3 meses para expirar (alerta)
  const limiteAlerta = new Date(fim);
  limiteAlerta.setMonth(limiteAlerta.getMonth() - 3);
  if (hoje >= limiteAlerta) {
    return { label: 'Vencimento Próximo', cor: '#f59e0b' };
  }

  return { label: 'Vigente', cor: '#22c55e' };
}

// ─── RENDERIZAÇÃO DA PÁGINA ─────────────────────────────────────

export function renderizarTecnicoPage() {
  const container = document.getElementById('tecnicoPage');
  if (!container) return;

  // Filtrar leads qualificados para a área técnica (Instalação, Pós-Venda, Manutenção ou que já possuem dados cadastrados)
  const leadsTecnicos = _leadsList.filter(l => {
    const possuiDados = _tecnicoMap[l.id] !== undefined;
    const statusValido = ['fechado', 'instalacao', 'pos-venda', 'manutencao'].includes(l.status);
    return (statusValido || possuiDados) && !l.excluido;
  }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  container.innerHTML = `
    <div class="tecnico-header glass-card">
      <div>
        <h1>🛠️ Área Técnica & Pós-Venda</h1>
        <p class="crm-page-meta">Controle operacional de garantias, chamados técnicos, manutenções e documentação por cliente.</p>
      </div>
    </div>

    <div class="tecnico-grid">
      <!-- Coluna da Esquerda: Seletor de Cliente & Agenda Geral -->
      <div class="tecnico-sidebar glass-card">
        <h3 class="sidebar-titulo">💼 Clientes Técnicos</h3>
        <button class="btn-agenda-geral ${!_leadSelecionadoId ? 'active' : ''}" onclick="window.CRM_TECNICO.selecionarCliente(null)">
          📅 Agenda Técnica Geral
        </button>
        
        <div class="clientes-lista">
          ${leadsTecnicos.length === 0 ? `
            <p class="crm-timeline-empty">Nenhum cliente apto para a área técnica no momento.</p>
          ` : leadsTecnicos.map(lead => {
            const selecionado = _leadSelecionadoId === lead.id ? 'active' : '';
            const tDados = _tecnicoMap[lead.id];
            const garantia = calcularStatusGarantia(tDados?.garantias);
            
            return `
              <div class="cliente-item ${selecionado}" onclick="window.CRM_TECNICO.selecionarCliente('${lead.id}')">
                <div class="cliente-info">
                  <span class="cliente-nome">${escHtml(lead.nome)}</span>
                  <span class="cliente-cidade">${escHtml((lead.endereco || '').split('—')[1] || lead.endereco || 'MF Cliente')}</span>
                </div>
                <span class="garantia-badge" style="background:${garantia.cor}">${garantia.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Coluna da Direita: Workspace Dinâmico -->
      <div id="tecnicoWorkspace" class="tecnico-workspace">
        ${_leadSelecionadoId ? renderizarWorkspaceCliente() : renderizarAgendaGeral()}
      </div>
    </div>
  `;
}

// ─── RENDER 1: AGENDA GERAL ────────────────────────────────────

function renderizarAgendaGeral() {
  // Coletar todos os eventos agendados:
  // 1. Instalações
  // 2. Manutenções agendadas
  // 3. Chamados abertos/em atendimento
  const eventos = [];

  _instalacoesList.forEach(inst => {
    const lead = _leadsList.find(l => l.id === inst.leadId);
    if (!lead || lead.excluido) return;

    if (inst.dataInstalacao) {
      eventos.push({
        tipo: 'Instalação',
        titulo: `Instalação do Sistema Solar`,
        cliente: lead.nome,
        leadId: lead.id,
        data: new Date(inst.dataInstalacao),
        responsavel: inst.responsavel || 'Equipe MF',
        status: inst.status === 'concluido' ? 'Concluído' : 'Agendado',
        cor: '#3b82f6',
        icone: '🔧'
      });
    }
  });

  Object.values(_tecnicoMap).forEach(dados => {
    const lead = _leadsList.find(l => l.id === dados.leadId);
    if (!lead || lead.excluido) return;

    // Manutenções
    (dados.manutencoes || []).forEach(mn => {
      eventos.push({
        tipo: `Manutenção ${mn.tipo === 'preventiva' ? 'Preventiva' : 'Corretiva'}`,
        titulo: `Manutenção Técnica`,
        cliente: lead.nome,
        leadId: lead.id,
        data: new Date(mn.dataAgendada),
        responsavel: mn.responsavel || 'Técnico MF',
        status: mn.status === 'concluido' ? 'Concluído' : 'Agendado',
        cor: mn.tipo === 'preventiva' ? '#10b981' : '#f59e0b',
        icone: '🛠️'
      });
    });

    // Chamados (somente abertos/em atendimento)
    (dados.chamados || []).forEach(ch => {
      if (ch.status !== 'resolvido') {
        eventos.push({
          tipo: 'Visita Chamado',
          titulo: `Chamado: ${ch.titulo} (${ch.prioridade})`,
          cliente: lead.nome,
          leadId: lead.id,
          data: new Date(ch.dataAbertura), // Usamos data de abertura como referência
          responsavel: ch.responsavel || 'Suporte MF',
          status: ch.status === 'em_atendimento' ? 'Em Andamento' : 'Aberto',
          cor: '#ef4444',
          icone: '🚨'
        });
      }
    });
  });

  // Ordenar cronologicamente por data
  eventos.sort((a, b) => b.data.getTime() - a.data.getTime());

  return `
    <div class="workspace-card glass-card">
      <h2 class="workspace-titulo">📅 Agenda Técnica Geral</h2>
      <p class="crm-page-meta" style="margin-bottom:20px">Linha do tempo integrada de todas as visitas técnicas de instalação, preventivas e suporte.</p>
      
      <div class="agenda-timeline">
        ${eventos.length === 0 ? `
          <p class="crm-timeline-empty">Nenhum evento técnico agendado ou pendente.</p>
        ` : eventos.map(ev => {
          const concluido = ev.status === 'Concluído' ? 'concluido' : '';
          return `
            <div class="agenda-card ${concluido}">
              <div class="agenda-head">
                <span class="agenda-icon" style="background:${ev.cor}">${ev.icone}</span>
                <div>
                  <h4 style="margin:0">${escHtml(ev.tipo)}</h4>
                  <small>${ev.cliente ? `Cliente: <b>${escHtml(ev.cliente)}</b>` : ''}</small>
                </div>
                <button class="btn-card" style="margin-left:auto; background:rgba(255,255,255,0.05)" onclick="window.CRM_TECNICO.selecionarCliente('${ev.leadId}')">
                  👁️ Workspace
                </button>
              </div>
              <div class="agenda-body">
                <p style="margin:6px 0; font-size:13px">${escHtml(ev.titulo)}</p>
                <div class="agenda-meta">
                  <span>📅 ${formatDate(ev.data)}</span>
                  <span>👤 ${escHtml(ev.responsavel)}</span>
                  <span class="status-badge-peq" style="border:1px solid ${ev.cor}; color:${ev.cor}">${escHtml(ev.status)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── RENDER 2: WORKSPACE DO CLIENTE ─────────────────────────────

function renderizarWorkspaceCliente() {
  const lead = _leadsList.find(l => l.id === _leadSelecionadoId);
  if (!lead) return '<p>Cliente não encontrado.</p>';

  return `
    <div class="workspace-card glass-card">
      <div class="workspace-head">
        <div>
          <h2 style="margin:0">${escHtml(lead.nome)}</h2>
          <small>📞 ${escHtml(lead.telefone || '—')} · 📍 ${escHtml(lead.endereco || '—')}</small>
        </div>
        <button class="btn-fechar" onclick="window.CRM_TECNICO.selecionarCliente(null)">✕</button>
      </div>

      <!-- Abas Internas Workspace -->
      <div class="modal-tabs" style="margin: 20px 0 15px">
        <button class="modal-tab ${_abaAtiva === 'abaTecTimeline' ? 'active' : ''}" onclick="window.CRM_TECNICO.trocarAba('abaTecTimeline')">
          🕐 Histórico & Timeline
        </button>
        <button class="modal-tab ${_abaAtiva === 'abaTecGarantia' ? 'active' : ''}" onclick="window.CRM_TECNICO.trocarAba('abaTecGarantia')">
          🛡️ Garantia
        </button>
        <button class="modal-tab ${_abaAtiva === 'abaTecChamados' ? 'active' : ''}" onclick="window.CRM_TECNICO.trocarAba('abaTecChamados')">
          🚨 Chamados (${(_tecnicoMap[lead.id]?.chamados || []).filter(c=>c.status!=='resolvido').length})
        </button>
        <button class="modal-tab ${_abaAtiva === 'abaTecManutencoes' ? 'active' : ''}" onclick="window.CRM_TECNICO.trocarAba('abaTecManutencoes')">
          🛠️ Manutenções
        </button>
        <button class="modal-tab ${_abaAtiva === 'abaTecAnexos' ? 'active' : ''}" onclick="window.CRM_TECNICO.trocarAba('abaTecAnexos')">
          📸 Fotos & Anexos
        </button>
      </div>

      <div class="workspace-content">
        ${renderAbaConteudo(lead)}
      </div>
    </div>
  `;
}

function renderAbaConteudo(lead) {
  const dados = _tecnicoMap[lead.id] || {
    garantias: { inicioGarantia: '', mesesInversor: 120, mesesPaineis: 300, mesesInstalacao: 12, notas: '' },
    chamados: [],
    manutencoes: [],
    anexos: []
  };

  switch (_abaAtiva) {
    case 'abaTecTimeline':
      return renderHistoricoTimeline(lead, dados);
    case 'abaTecGarantia':
      return renderGarantia(lead, dados);
    case 'abaTecChamados':
      return renderChamados(lead, dados);
    case 'abaTecManutencoes':
      return renderManutencoes(lead, dados);
    case 'abaTecAnexos':
      return renderAnexos(lead, dados);
    default:
      return '';
  }
}

// ─── SUB-ABA 1: TIMELINE / HISTÓRICO TÉCNICO ─────────────────────

function renderHistoricoTimeline(lead, dados) {
  // Mesclar eventos para montar um histórico técnico completo do cliente
  const historico = [];

  // 1. Criação do Lead
  historico.push({
    acao: 'Cliente cadastrado no CRM',
    data: lead.createdAt || lead.data || new Date().toISOString(),
    icone: '📋',
    responsavel: 'Sistema'
  });

  // 2. Instalações
  _instalacoesList.filter(i => i.leadId === lead.id).forEach(inst => {
    historico.push({
      acao: `Instalação agendada para: ${formatDate(new Date(inst.dataInstalacao))}`,
      data: inst.criadoEm || inst.dataInstalacao,
      icone: '🗓️',
      responsavel: inst.responsavel
    });
    
    if (inst.status === 'concluido') {
      historico.push({
        acao: `Instalação CONCLUÍDA com sucesso! Checklist técnico fechado.`,
        data: inst.criadoEm, // fallback
        icone: '✅',
        responsavel: inst.responsavel
      });
    }

    // Passos do checklist concluídos
    if (inst.checklist) {
      Object.entries(inst.checklist).forEach(([item, val]) => {
        if (val.concluido) {
          historico.push({
            acao: `Item Checklist aprovado: ${item.toUpperCase()}`,
            data: val.data || inst.criadoEm,
            icone: '✓',
            responsavel: inst.responsavel
          });
        }
      });
    }
  });

  // 3. Chamados
  (dados.chamados || []).forEach(ch => {
    historico.push({
      acao: `Chamado técnico aberto: "${ch.titulo}" — Prioridade: ${ch.prioridade.toUpperCase()}`,
      data: ch.dataAbertura,
      icone: '🚨',
      responsavel: ch.responsavel
    });
    if (ch.status === 'resolvido') {
      historico.push({
        acao: `Chamado técnico RESOLVIDO: "${ch.titulo}"`,
        data: ch.dataResolvido || new Date().toISOString(),
        icone: '🟢',
        responsavel: ch.responsavel
      });
    }
  });

  // 4. Manutenções
  (dados.manutencoes || []).forEach(mn => {
    historico.push({
      acao: `Manutenção ${mn.tipo.toUpperCase()} agendada`,
      data: mn.dataAgendada,
      icone: '🛠️',
      responsavel: mn.responsavel
    });
    if (mn.status === 'concluido') {
      historico.push({
        acao: `Manutenção CONCLUÍDA. Parecer: "${mn.parecerTecnico}"`,
        data: mn.dataConclusao || new Date().toISOString(),
        icone: '✓',
        responsavel: mn.responsavel
      });
    }
  });

  // Ordenar timeline (mais recente primeiro)
  historico.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return `
    <h3 style="margin-top:0">🕐 Histórico Técnico Unificado</h3>
    <p class="crm-page-meta">Timeline operacional completa integrando dados de checklist da instalação, chamados abertos e vistorias de manutenção.</p>
    
    <div class="timeline-list" style="margin-top:15px">
      ${historico.map(h => `
        <div class="timeline-item">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <b>${h.icone} ${escHtml(h.acao)}</b>
            <small style="color:var(--azul-claro)">${new Date(h.data).toLocaleString('pt-BR')}</small>
          </div>
          ${h.responsavel ? `<small style="color:#94a3b8">— Responsável: ${escHtml(h.responsavel)}</small>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// ─── SUB-ABA 2: GARANTIA ────────────────────────────────────────

function renderGarantia(lead, dados) {
  const g = dados.garantias || { inicioGarantia: '', mesesInversor: 120, mesesPaineis: 300, mesesInstalacao: 12, notas: '' };
  const status = calcularStatusGarantia(g);

  // Calcular datas futuras estimadas
  const fmtFutura = (meses) => {
    if (!g.inicioGarantia) return '—';
    const d = new Date(g.inicioGarantia);
    d.setMonth(d.getMonth() + Number(meses));
    return d.toLocaleDateString('pt-BR');
  };

  return `
    <div class="garantia-workspace">
      <div class="glass-card status-garantia-painel" style="border-left:5px solid ${status.cor}; padding:18px; margin-bottom:20px">
        <h4 style="margin:0; font-size:14px; text-transform:uppercase; color:#94a3b8">Status da Garantia</h4>
        <div style="font-size:24px; font-weight:800; color:${status.cor}; margin:6px 0">${status.label}</div>
        <p style="margin:0; font-size:12px">Baseado na data de ativação do sistema e nos prazos definidos abaixo.</p>
      </div>

      <form id="formGarantia" onsubmit="window.CRM_TECNICO.salvarGarantiaForm(event, '${lead.id}')" class="instalacoes-form" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px">
        <div>
          <label class="notas-label">📅 Data de Ativação / Startup</label>
          <input type="date" id="g_inicio" class="input-busca" style="width:100%" value="${g.inicioGarantia || ''}">
          <small class="crm-page-meta">Normalmente a data de conclusão da instalação elétrica.</small>
        </div>
        
        <div>
          <label class="notas-label">🛡️ Garantia de Instalação (Meses)</label>
          <input type="number" id="g_instalacao" class="input-busca" style="width:100%" value="${g.mesesInstalacao ?? 12}">
          <small class="crm-page-meta">Vence em: <b>${fmtFutura(g.mesesInstalacao ?? 12)}</b></small>
        </div>

        <div>
          <label class="notas-label">⚡ Garantia do Inversor (Meses)</label>
          <input type="number" id="g_inversor" class="input-busca" style="width:100%" value="${g.mesesInversor ?? 120}">
          <small class="crm-page-meta">Vence em: <b>${fmtFutura(g.mesesInversor ?? 120)}</b></small>
        </div>

        <div>
          <label class="notas-label">☀️ Garantia dos Módulos / Painéis (Meses)</label>
          <input type="number" id="g_paineis" class="input-busca" style="width:100%" value="${g.mesesPaineis ?? 300}">
          <small class="crm-page-meta">Vence em: <b>${fmtFutura(g.mesesPaineis ?? 300)}</b></small>
        </div>

        <div style="grid-column: span 2">
          <label class="notas-label">📝 Observações e Termos Especiais</label>
          <textarea id="g_notas" class="input-busca" style="width:100%; min-height:80px" placeholder="Observações adicionais de contratos, extensões de garantias etc.">${escHtml(g.notas || '')}</textarea>
        </div>

        <div style="grid-column: span 2">
          <button type="submit" class="btn-primary" style="background:var(--verde-acento)">💾 Salvar Configurações de Garantia</button>
        </div>
      </form>
    </div>
  `;
}

// ─── SUB-ABA 3: CHAMADOS TÉCNICOS ───────────────────────────────

function renderChamados(lead, dados) {
  const chamados = dados.chamados || [];

  return `
    <div class="chamados-container" style="display:grid; grid-template-columns: 1fr 1.2fr; gap:20px">
      <!-- Formulário de Criação -->
      <div class="glass-card" style="padding:16px">
        <h3 style="margin-top:0">🚨 Abrir Chamado Técnico</h3>
        <form onsubmit="window.CRM_TECNICO.salvarChamadoForm(event, '${lead.id}')" style="display:grid; gap:12px">
          <div>
            <label class="notas-label">Título / Assunto</label>
            <input type="text" id="ch_titulo" class="input-busca" style="width:100%" placeholder="Ex: Inversor com erro Alerta 504" required>
          </div>
          <div>
            <label class="notas-label">Descrição do Problema</label>
            <textarea id="ch_desc" class="input-busca" style="width:100%; min-height:70px" placeholder="Detalhes relatados pelo cliente..." required></textarea>
          </div>
          <div>
            <label class="notas-label">Prioridade</label>
            <select id="ch_prioridade" class="input-busca" style="width:100%">
              <option value="baixa">🟡 Baixa</option>
              <option value="media" selected>🟠 Média</option>
              <option value="alta">🔴 Alta</option>
            </select>
          </div>
          <div>
            <label class="notas-label">Técnico Responsável</label>
            <input type="text" id="ch_responsavel" class="input-busca" style="width:100%" placeholder="Ex: Lucas Silva" required>
          </div>
          <button type="submit" class="btn-primary" style="background:#ef4444; color:#fff">🚨 Abrir Chamado</button>
        </form>
      </div>

      <!-- Lista de Chamados Ativos/Concluídos -->
      <div>
        <h3 style="margin-top:0">Lista de Chamados</h3>
        <div class="chamados-lista" style="display:grid; gap:12px; max-height:400px; overflow-y:auto">
          ${chamados.length === 0 ? `
            <p class="crm-timeline-empty">Nenhum chamado aberto para este cliente.</p>
          ` : chamados.map(ch => {
            const cores = { aberta: '#ef4444', em_atendimento: '#f59e0b', resolvido: '#22c55e' };
            const priorityBadge = ch.prioridade === 'alta' ? '🔴 ALTA' : ch.prioridade === 'media' ? '🟠 MÉDIA' : '🟡 BAIXA';
            
            return `
              <div class="chamado-card glass-card" style="padding:14px; border-left:4px solid ${cores[ch.status] || '#9ca3af'}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start">
                  <h4 style="margin:0">${escHtml(ch.titulo)}</h4>
                  <span class="status-badge-peq" style="background:rgba(255,255,255,0.05); color:${cores[ch.status]}">${ch.status.toUpperCase()}</span>
                </div>
                <p style="font-size:12px; color:#cbd5e1; margin:6px 0">${escHtml(ch.descricao)}</p>
                <div class="agenda-meta" style="margin-top:10px">
                  <span>📅 Abertura: ${new Date(ch.dataAbertura).toLocaleDateString('pt-BR')}</span>
                  <span>👤 Técnico: ${escHtml(ch.responsavel)}</span>
                  <span>⚠️ ${priorityBadge}</span>
                </div>
                
                ${ch.status !== 'resolvido' ? `
                  <div class="instalacao-actions" style="margin-top:10px">
                    ${ch.status === 'aberto' ? `
                      <button class="btn-card" onclick="window.CRM_TECNICO.statusChamado('${lead.id}', '${ch.id}', 'em_atendimento')">⚙️ Iniciar Suporte</button>
                    ` : ''}
                    <button class="btn-card" style="background:rgba(34,197,94,0.15); color:#22c55e" onclick="window.CRM_TECNICO.statusChamado('${lead.id}', '${ch.id}', 'resolvido')">🟢 Marcar Resolvido</button>
                  </div>
                ` : `
                  <small style="color:#22c55e; display:block; margin-top:8px">✓ Resolvido em: ${new Date(ch.dataResolvido).toLocaleDateString('pt-BR')}</small>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─── SUB-ABA 4: MANUTENÇÕES ─────────────────────────────────────

function renderManutencoes(lead, dados) {
  const manutencoes = dados.manutencoes || [];

  return `
    <div class="manutencoes-container" style="display:grid; grid-template-columns: 1fr 1.2fr; gap:20px">
      <!-- Formulário de Agendamento -->
      <div class="glass-card" style="padding:16px">
        <h3 style="margin-top:0">🗓️ Agendar Manutenção</h3>
        <form onsubmit="window.CRM_TECNICO.salvarManutencaoForm(event, '${lead.id}')" style="display:grid; gap:12px">
          <div>
            <label class="notas-label">Tipo de Manutenção</label>
            <select id="mn_tipo" class="input-busca" style="width:100%">
              <option value="preventiva">🟢 Preventiva (Limpeza/Revisão)</option>
              <option value="corretiva">🟡 Corretiva (Reparos/Substituição)</option>
            </select>
          </div>
          <div>
            <label class="notas-label">Data Agendada</label>
            <input type="date" id="mn_data" class="input-busca" style="width:100%" required>
          </div>
          <div>
            <label class="notas-label">Responsável Técnico</label>
            <input type="text" id="mn_responsavel" class="input-busca" style="width:100%" placeholder="Ex: Rodrigo MF" required>
          </div>
          <button type="submit" class="btn-primary" style="background:#10b981">🗓️ Salvar Agendamento</button>
        </form>
      </div>

      <!-- Lista de Vistorias -->
      <div>
        <h3 style="margin-top:0">Vistorias & Manutenções</h3>
        <div class="manutencoes-lista" style="display:grid; gap:12px; max-height:400px; overflow-y:auto">
          ${manutencoes.length === 0 ? `
            <p class="crm-timeline-empty">Nenhuma manutenção registrada para este cliente.</p>
          ` : manutencoes.map(mn => {
            const cores = { agendado: '#3b82f6', concluido: '#22c55e' };
            
            return `
              <div class="chamado-card glass-card" style="padding:14px; border-left:4px solid ${cores[mn.status] || '#9ca3af'}">
                <div style="display:flex; justify-content:space-between; align-items:center">
                  <h4 style="margin:0; text-transform:uppercase">${mn.tipo === 'preventiva' ? '🟢 Preventiva' : '🟡 Corretiva'}</h4>
                  <span class="status-badge-peq" style="background:rgba(255,255,255,0.05); color:${cores[mn.status]}">${mn.status.toUpperCase()}</span>
                </div>
                
                <div class="agenda-meta" style="margin-top:8px">
                  <span>📅 Agenda: ${new Date(mn.dataAgendada).toLocaleDateString('pt-BR')}</span>
                  <span>👤 Técnico: ${escHtml(mn.responsavel)}</span>
                </div>

                ${mn.status === 'agendado' ? `
                  <div style="margin-top:12px; display:grid; gap:8px">
                    <input type="text" id="p_tecnico_${mn.id}" class="input-busca" placeholder="Parecer Técnico Diagnóstico..." style="width:100%">
                    <button class="btn-primary" style="background:#22c55e; color:#022c22; font-size:12px; padding:8px" onclick="window.CRM_TECNICO.finalizarManutencao('${lead.id}', '${mn.id}')">
                      🏁 Concluir & Registrar Parecer
                    </button>
                  </div>
                ` : `
                  <div style="margin-top:10px; background:rgba(255,255,255,0.02); padding:8px; border-radius:8px; border:1px solid rgba(255,255,255,0.05)">
                    <small style="color:#94a3b8; display:block">📝 Parecer Técnico:</small>
                    <p style="margin:4px 0 0; font-size:12px; color:#22c55e">"${escHtml(mn.parecerTecnico)}"</p>
                    <small style="color:#cbd5e1; display:block; margin-top:6px; font-size:10px">Concluído em: ${new Date(mn.dataConclusao).toLocaleDateString('pt-BR')}</small>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─── SUB-ABA 5: ANEXOS & FOTOS TÉCNICAS ──────────────────────────

function renderAnexos(lead, dados) {
  const anexos = dados.anexos || [];

  return `
    <div class="anexos-container">
      <h3 style="margin-top:0">📸 Anexos Técnicos e Fotos</h3>
      <p class="crm-page-meta">Gestão de relatórios, diagramas unifilares, fotos de inversores, placas e vistorias técnicas.</p>

      <!-- Formulário de Envio -->
      <form onsubmit="window.CRM_TECNICO.enviarAnexo(event, '${lead.id}')" class="instalacoes-form" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; align-items:end">
        <div>
          <label class="notas-label">Título do Anexo</label>
          <input type="text" id="ax_nome" class="input-busca" style="width:100%" placeholder="Ex: Fotos do Inversor Conectado" required>
        </div>
        <div>
          <label class="notas-label">Categoria</label>
          <select id="ax_cat" class="input-busca" style="width:100%">
            <option value="instalacao">🔧 Instalação</option>
            <option value="manutencao">🛠️ Manutenção</option>
            <option value="chamado">🚨 Chamado Técnico</option>
            <option value="documento">📄 Documentos / Outros</option>
          </select>
        </div>
        <div>
          <label class="notas-label">Imagem ou Arquivo (Arquivo/Mock)</label>
          <input type="file" id="ax_arquivo" class="input-busca" style="width:100%; padding:5px" accept="image/*,application/pdf" onchange="window.CRM_TECNICO.processarUploadMock(this)">
          <input type="hidden" id="ax_base64">
        </div>
        <div style="grid-column: span 3">
          <button type="submit" class="btn-primary" style="background:var(--verde-acento); margin-top:10px">📎 Fazer Upload do Anexo</button>
        </div>
      </form>

      <!-- Galeria Grid -->
      <div class="anexos-galeria-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:16px">
        ${anexos.length === 0 ? `
          <p class="crm-timeline-empty" style="grid-column: 1 / -1">Nenhum anexo registrado para este cliente.</p>
        ` : anexos.map(ax => {
          const isImg = ax.url.startsWith('data:image') || ax.url.endsWith('.png') || ax.url.endsWith('.jpg') || ax.url.endsWith('.jpeg') || ax.url.startsWith('http');
          
          return `
            <div class="anexo-card-visual glass-card" style="overflow:hidden; border:1px solid rgba(255,255,255,0.05)">
              ${isImg ? `
                <div class="anexo-preview" style="height:120px; background-image:url('${ax.url}'); background-size:cover; background-position:center; cursor:pointer" onclick="window.CRM_TECNICO.abrirPreview('${ax.url}', '${escHtml(ax.nome)}')"></div>
              ` : `
                <div class="anexo-preview-file" style="height:120px; display:grid; place-items:center; background:#1e293b; font-size:32px; cursor:pointer" onclick="window.CRM_TECNICO.abrirPreview('${ax.url}', '${escHtml(ax.nome)}')">📄</div>
              `}
              <div style="padding:10px">
                <h5 style="margin:0 0 4px 0; font-size:13px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap" title="${escHtml(ax.nome)}">${escHtml(ax.nome)}</h5>
                <div style="display:flex; justify-content:space-between; align-items:center">
                  <small style="font-size:10px; color:#94a3b8">${new Date(ax.data).toLocaleDateString('pt-BR')}</small>
                  <span class="status-badge-peq" style="font-size:9px; background:rgba(255,255,255,0.05); color:var(--azul-claro)">${ax.categoria.toUpperCase()}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── CALLBACKS PARA WINDOW (HTML INTERACTIVO) ───────────────────

window.CRM_TECNICO = {
  selecionarCliente: (id) => {
    _leadSelecionadoId = id;
    _abaAtiva = 'abaTecTimeline'; // Reseta aba ao trocar
    renderizarTecnicoPage();
  },
  
  trocarAba: (aba) => {
    _abaAtiva = aba;
    // Rápido re-render do workspace mantendo o cliente selecionado
    const ws = document.getElementById('tecnicoWorkspace');
    if (ws) {
      ws.innerHTML = renderizarWorkspaceCliente();
    }
  },

  salvarGarantiaForm: async (e, leadId) => {
    e.preventDefault();
    const g_inicio = document.getElementById('g_inicio').value;
    const g_instalacao = Number(document.getElementById('g_instalacao').value);
    const g_inversor = Number(document.getElementById('g_inversor').value);
    const g_paineis = Number(document.getElementById('g_paineis').value);
    const g_notas = document.getElementById('g_notas').value;

    await salvarGarantia(leadId, {
      inicioGarantia: g_inicio,
      mesesInstalacao: g_instalacao,
      mesesInversor: g_inversor,
      mesesPaineis: g_paineis,
      notas: g_notas
    });
    
    renderizarTecnicoPage();
  },

  salvarChamadoForm: async (e, leadId) => {
    e.preventDefault();
    const titulo = document.getElementById('ch_titulo').value.trim();
    const descricao = document.getElementById('ch_desc').value.trim();
    const prioridade = document.getElementById('ch_prioridade').value;
    const responsavel = document.getElementById('ch_responsavel').value.trim();

    await adicionarChamado(leadId, {
      titulo,
      descricao,
      prioridade,
      responsavel
    });

    renderizarTecnicoPage();
  },

  statusChamado: async (leadId, chamadoId, novoStatus) => {
    await atualizarStatusChamado(leadId, chamadoId, novoStatus);
    renderizarTecnicoPage();
  },

  salvarManutencaoForm: async (e, leadId) => {
    e.preventDefault();
    const tipo = document.getElementById('mn_tipo').value;
    const dataAgendada = document.getElementById('mn_data').value;
    const responsavel = document.getElementById('mn_responsavel').value.trim();

    if (!dataAgendada) {
      toast('Por favor, informe a data.', 'error');
      return;
    }

    await adicionarManutencao(leadId, {
      tipo,
      dataAgendada,
      responsavel
    });

    renderizarTecnicoPage();
  },

  finalizarManutencao: async (leadId, manutencaoId) => {
    const input = document.getElementById(`p_tecnico_${manutencaoId}`);
    const parecer = input ? input.value.trim() : '';
    
    if (!parecer) {
      toast('Insira o parecer técnico antes de concluir.', 'error');
      return;
    }

    await concluirManutencao(leadId, manutencaoId, parecer);
    renderizarTecnicoPage();
  },

  processarUploadMock: (input) => {
    const file = input.files[0];
    if (!file) return;

    // Se for imagem, podemos salvar como base64 para simular o upload perfeitamente
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        document.getElementById('ax_base64').value = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF ou outro arquivo - criamos um link virtual/datauri mockado
      document.getElementById('ax_base64').value = 'data:application/pdf;base64,';
    }
  },

  enviarAnexo: async (e, leadId) => {
    e.preventDefault();
    const nome = document.getElementById('ax_nome').value.trim();
    const categoria = document.getElementById('ax_cat').value;
    let url = document.getElementById('ax_base64').value;

    if (!url) {
      // Se não enviou arquivo, criamos uma imagem solar placeholder espetacular
      url = 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&auto=format&fit=crop&q=60';
    }

    await adicionarAnexo(leadId, nome, url, categoria);
    renderizarTecnicoPage();
  },

  abrirPreview: (url, titulo) => {
    // Abre um popup/modal espetacular de visualização da foto/documento
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay ativo';
    overlay.style.zIndex = '100000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.onclick = () => overlay.remove();

    const isImg = url.startsWith('data:image') || url.startsWith('http');

    const box = document.createElement('div');
    box.className = 'modal-box';
    box.style.maxWidth = '80%';
    box.style.maxHeight = '85vh';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.padding = '15px';
    box.onclick = (e) => e.stopPropagation();

    box.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">${escHtml(titulo)}</h3>
        <button class="btn-fechar" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="flex:1; display:flex; justify-content:center; align-items:center; overflow:hidden; margin-top:10px">
        ${isImg ? `
          <img src="${url}" style="max-width:100%; max-height:70vh; border-radius:10px; object-fit:contain">
        ` : `
          <div style="padding:40px; text-align:center">
            <span style="font-size:60px">📄</span>
            <p style="margin-top:15px">Arquivo PDF / Documento Técnico Simulador</p>
            <a href="${url}" download="${titulo}" class="btn-primary" style="margin-top:10px; display:inline-block">Baixar Arquivo</a>
          </div>
        `}
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
};
