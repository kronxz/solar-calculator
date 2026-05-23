// [MF-AI-CHANGE] crm-financeiro.js — Módulo Financeiro Consolidado CRM — 2026-05-23
// Gestão de: Fluxo financeiro pós-venda, parcelamentos, fluxo de caixa (receitas/despesas), status de pagamento, entrada/saldo e dashboard financeiro.

import {
  collection, doc, setDoc, onSnapshot, query, where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app } from '../../firebase/config.js';
import { toast, escHtml, formatBRL } from './crm-utils.js';

let _db = null;
let _userId = null;
let _financeiroMap = {}; // leadId -> dados financeiros
let _leadsList = []; // Cópia dos leads para cruzar dados
let _leadSelecionadoId = null;
let _abaAtiva = 'abaFinResumo';
let _unsubFinanceiro = null;

export function initFinanceiro(db) {
  _db = db;
}

export function getFinanceiroMap() {
  return _financeiroMap;
}

export function carregarDadosFinanceiro(leads) {
  _leadsList = leads || [];
  
  const user = getAuth(app).currentUser;
  if (!user || !_db) return;
  _userId = user.uid;

  if (_unsubFinanceiro) return;

  const q = query(
    collection(_db, 'financeiro_dados'),
    where('userId', '==', _userId)
  );

  _unsubFinanceiro = onSnapshot(q, (snapshot) => {
    _financeiroMap = {};
    snapshot.docs.forEach(doc => {
      _financeiroMap[doc.id] = doc.data();
    });
    
    if (document.getElementById('financeiroPage')?.classList.contains('active')) {
      renderizarFinanceiroPage();
    }
  }, (err) => {
    console.error('[CRM-FINANCEIRO] Erro Firebase Firestore:', err);
    toast('Erro de sincronização financeira offline. Ajustando...', 'error');
  });
}

export function pararFinanceiro() {
  if (_unsubFinanceiro) {
    _unsubFinanceiro();
    _unsubFinanceiro = null;
  }
}

// ─── OPERAÇÕES DB ──────────────────────────────────────────────

async function obterOuCriarDoc(leadId) {
  const ref = doc(_db, 'financeiro_dados', leadId);
  const dataExistente = _financeiroMap[leadId];
  
  if (dataExistente) {
    return { ref, data: { ...dataExistente } };
  }

  const lead = _leadsList.find(l => l.id === leadId);
  const valorEst = lead ? parseFloat(lead.investimento || lead.valor) || 0 : 0;

  const novoDoc = {
    leadId,
    userId: _userId,
    valorTotal: valorEst,
    entrada: 0,
    saldo: valorEst,
    parcelas: 1,
    statusPagamento: 'pendente',
    movimentacoes: [], // { id, tipo: 'receita'|'despesa', descricao, valor, data }
    criadoEm: new Date().toISOString()
  };

  return { ref, data: novoDoc };
}

export async function salvarConfigFinanceira(leadId, campos) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    data.valorTotal = Number(campos.valorTotal) || 0;
    data.entrada = Number(campos.entrada) || 0;
    data.saldo = Math.max(0, data.valorTotal - data.entrada);
    data.parcelas = Number(campos.parcelas) || 1;
    data.statusPagamento = campos.statusPagamento || 'pendente';

    await setDoc(ref, data, { merge: true });
    toast('Dados financeiros salvos!', 'success');
  } catch (err) {
    console.error('[CRM-FINANCEIRO] Erro ao salvar:', err);
    toast('Erro de gravação no Firebase', 'error');
  }
}

export async function adicionarMovimentacao(leadId, mov) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    const novaMov = {
      id: 'mv_' + Math.random().toString(36).substr(2, 9),
      data: new Date().toISOString(),
      ...mov
    };
    data.movimentacoes = data.movimentacoes || [];
    data.movimentacoes.push(novaMov);

    // Ajusta o status de pagamento automaticamente se adicionar receita correspondente ao saldo
    if (mov.tipo === 'receita') {
      const totalReceitas = data.movimentacoes
        .filter(m => m.tipo === 'receita')
        .reduce((sum, m) => sum + m.valor, 0);
      
      const pagoTotal = data.entrada + totalReceitas;
      if (pagoTotal >= data.valorTotal) {
        data.statusPagamento = 'pago';
      } else if (pagoTotal > data.entrada) {
        data.statusPagamento = 'pago_parcial';
      }
    }

    await setDoc(ref, data, { merge: true });
    toast('Movimentação financeira registrada!', 'success');
  } catch (err) {
    console.error('[CRM-FINANCEIRO] Erro ao adicionar movimentação:', err);
    toast('Erro ao processar fluxo de caixa', 'error');
  }
}

export async function excluirMovimentacao(leadId, movId) {
  try {
    const { ref, data } = await obterOuCriarDoc(leadId);
    data.movimentacoes = (data.movimentacoes || []).filter(m => m.id !== movId);
    await setDoc(ref, data, { merge: true });
    toast('Movimentação removida!', 'info');
  } catch (err) {
    console.error('[CRM-FINANCEIRO] Erro ao excluir movimentação:', err);
  }
}

// ─── RENDERIZAÇÃO DA PÁGINA ─────────────────────────────────────

export function renderizarFinanceiroPage() {
  const container = document.getElementById('financeiroPage');
  if (!container) return;

  const leadsFinanceiros = _leadsList.filter(l => {
    const possuiDados = _financeiroMap[l.id] !== undefined;
    const statusValido = ['fechado', 'instalacao', 'pos-venda'].includes(l.status);
    return (statusValido || possuiDados) && !l.excluido;
  }).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  container.innerHTML = `
    <div class="tecnico-header glass-card">
      <div>
        <h1>💰 Gestão Financeira Operacional</h1>
        <p class="crm-page-meta">Acompanhamento de fluxo de caixa, controle de entradas/saldos, parcelamentos e receitas/despesas de pós-venda.</p>
      </div>
    </div>

    <div class="tecnico-grid">
      <!-- Coluna da Esquerda: Clientes & Painel Geral -->
      <div class="tecnico-sidebar glass-card">
        <h3 class="sidebar-titulo">📊 Caixa & Relatórios</h3>
        <button class="btn-agenda-geral ${!_leadSelecionadoId ? 'active' : ''}" onclick="window.CRM_FINANCEIRO.selecionarCliente(null)">
          💸 Dashboard Geral & Caixa
        </button>
        
        <div class="clientes-lista">
          ${leadsFinanceiros.length === 0 ? `
            <p class="crm-timeline-empty">Nenhum cliente fechado elegível para faturamento.</p>
          ` : leadsFinanceiros.map(lead => {
            const selecionado = _leadSelecionadoId === lead.id ? 'active' : '';
            const fDados = _financeiroMap[lead.id];
            
            const total = fDados ? fDados.valorTotal : parseFloat(lead.investimento || lead.valor) || 0;
            const statusPag = fDados ? fDados.statusPagamento : 'pendente';
            
            const badges = {
              pendente: { label: '⏳ Pendente', cor: '#ef4444' },
              pago_parcial: { label: '🟠 Parcial', cor: '#f59e0b' },
              pago: { label: '🟢 Pago', cor: '#22c55e' }
            };
            const badge = badges[statusPag] || badges.pendente;

            return `
              <div class="cliente-item ${selecionado}" onclick="window.CRM_FINANCEIRO.selecionarCliente('${lead.id}')">
                <div class="cliente-info">
                  <span class="cliente-nome">${escHtml(lead.nome)}</span>
                  <span class="cliente-cidade">${formatBRL(total)}</span>
                </div>
                <span class="garantia-badge" style="background:${badge.cor}">${badge.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Coluna da Direita: Painel ou Workspace -->
      <div id="financeiroWorkspace" class="tecnico-workspace">
        ${_leadSelecionadoId ? renderizarWorkspaceCliente() : renderizarDashboardGeral()}
      </div>
    </div>
  `;
}

// ─── RENDERS ESPECÍFICOS ────────────────────────────────────────

function renderizarDashboardGeral() {
  // Consolidar dados gerais de fluxo de caixa
  let receitasEntradas = 0;
  let receitasAvulsas = 0;
  let totalDespesas = 0;
  let totalContratos = 0;

  Object.values(_financeiroMap).forEach(fin => {
    const lead = _leadsList.find(l => l.id === fin.leadId);
    if (!lead || lead.excluido) return;

    totalContratos += fin.valorTotal || 0;
    receitasEntradas += fin.entrada || 0;

    (fin.movimentacoes || []).forEach(m => {
      if (m.tipo === 'receita') receitasAvulsas += m.valor;
      if (m.tipo === 'despesa') totalDespesas += m.valor;
    });
  });

  const receitasTotais = receitasEntradas + receitasAvulsas;
  const saldoCaixa = receitasTotais - totalDespesas;
  const aReceber = Math.max(0, totalContratos - receitasEntradas - receitasAvulsas);

  return `
    <!-- KPI Dashboard Geral -->
    <div class="dashboard-metrics" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; margin-bottom:20px">
      <div class="glass-card metric-card">
        <b>📝 Total Contratos</b>
        <span class="metric-value" style="font-size:20px">${formatBRL(totalContratos)}</span>
      </div>
      <div class="glass-card metric-card">
        <b>📈 Total Recebido</b>
        <span class="metric-value" style="font-size:20px; color:#22c55e">${formatBRL(receitasTotais)}</span>
      </div>
      <div class="glass-card metric-card">
        <b>📉 Despesas Totais</b>
        <span class="metric-value" style="font-size:20px; color:#ef4444">${formatBRL(totalDespesas)}</span>
      </div>
      <div class="glass-card metric-card">
        <b>💰 Lucro / Saldo</b>
        <span class="metric-value" style="font-size:20px; color:${saldoCaixa >= 0 ? '#22c55e' : '#ef4444'}">${formatBRL(saldoCaixa)}</span>
      </div>
    </div>

    <!-- Relatório Geral Consolidado -->
    <div class="workspace-card glass-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
        <h2 style="margin:0">📄 Relatório Financeiro Geral</h2>
        <span class="status-badge" style="background:rgba(59, 130, 246, 0.2); color:#60a5fa">A Receber: ${formatBRL(aReceber)}</span>
      </div>
      
      <div style="overflow-x:auto">
        <table class="stats-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Valor Contrato</th>
              <th>Entrada Pago</th>
              <th>Status</th>
              <th>Movimentado</th>
              <th>Saldo a Receber</th>
            </tr>
          </thead>
          <tbody>
            ${_leadsList.filter(l => ['fechado', 'instalacao', 'pos-venda'].includes(l.status) && !l.excluido).length === 0 ? `
              <tr>
                <td colspan="6" class="crm-timeline-empty">Nenhum registro faturado disponível.</td>
              </tr>
            ` : _leadsList.filter(l => ['fechado', 'instalacao', 'pos-venda'].includes(l.status) && !l.excluido).map(lead => {
              const fin = _financeiroMap[lead.id] || { valorTotal: parseFloat(lead.investimento || lead.valor) || 0, entrada: 0, statusPagamento: 'pendente', movimentacoes: [] };
              
              const recs = (fin.movimentacoes || []).filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0);
              const desps = (fin.movimentacoes || []).filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0);
              const totalMov = recs - desps;
              
              const aRec = Math.max(0, fin.valorTotal - fin.entrada - recs);
              
              const badges = {
                pendente: { label: '⏳ Pendente', cor: '#ef4444' },
                pago_parcial: { label: '🟠 Parcial', cor: '#f59e0b' },
                pago: { label: '🟢 Pago', cor: '#22c55e' }
              };
              const badge = badges[fin.statusPagamento] || badges.pendente;

              return `
                <tr style="cursor:pointer" onclick="window.CRM_FINANCEIRO.selecionarCliente('${lead.id}')">
                  <td><b>${escHtml(lead.nome)}</b></td>
                  <td>${formatBRL(fin.valorTotal)}</td>
                  <td>${formatBRL(fin.entrada)}</td>
                  <td><span class="status-badge-peq" style="background:${badge.cor}; color:#fff">${badge.label}</span></td>
                  <td style="color:${totalMov >= 0 ? '#22c55e' : '#ef4444'}">${totalMov >= 0 ? '+' : ''}${formatBRL(totalMov)}</td>
                  <td><b>${formatBRL(aRec)}</b></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderizarWorkspaceCliente() {
  const lead = _leadsList.find(l => l.id === _leadSelecionadoId);
  if (!lead) return '<p>Cliente não encontrado.</p>';

  return `
    <div class="workspace-card glass-card">
      <div class="workspace-head">
        <div>
          <h2 style="margin:0">${escHtml(lead.nome)}</h2>
          <small>Faturamento & Fluxo Financeiro</small>
        </div>
        <button class="btn-fechar" onclick="window.CRM_FINANCEIRO.selecionarCliente(null)">✕</button>
      </div>

      <!-- Abas Workspace Financeiro -->
      <div class="modal-tabs" style="margin: 20px 0 15px">
        <button class="modal-tab ${_abaAtiva === 'abaFinResumo' ? 'active' : ''}" onclick="window.CRM_FINANCEIRO.trocarAba('abaFinResumo')">
          ⚙️ Ajustes Contratuais
        </button>
        <button class="modal-tab ${_abaAtiva === 'abaFinParcelas' ? 'active' : ''}" onclick="window.CRM_FINANCEIRO.trocarAba('abaFinParcelas')">
          🗓️ Parcelamento & Saldo
        </button>
        <button class="modal-tab ${_abaAtiva === 'abaFinCaixa' ? 'active' : ''}" onclick="window.CRM_FINANCEIRO.trocarAba('abaFinCaixa')">
          💸 Fluxo de Caixa (Lançamentos)
        </button>
      </div>

      <div class="workspace-content">
        ${renderAbaConteudo(lead)}
      </div>
    </div>
  `;
}

function renderAbaConteudo(lead) {
  const dados = _financeiroMap[lead.id] || {
    valorTotal: parseFloat(lead.investimento || lead.valor) || 0,
    entrada: 0,
    saldo: parseFloat(lead.investimento || lead.valor) || 0,
    parcelas: 1,
    statusPagamento: 'pendente',
    movimentacoes: []
  };

  switch (_abaAtiva) {
    case 'abaFinResumo':
      return renderResumoAjustes(lead, dados);
    case 'abaFinParcelas':
      return renderParcelamento(lead, dados);
    case 'abaFinCaixa':
      return renderCaixaCliente(lead, dados);
    default:
      return '';
  }
}

// ─── SUB-ABAS FINANCEIRAS ───────────────────────────────────────

function renderResumoAjustes(lead, dados) {
  return `
    <form onsubmit="window.CRM_FINANCEIRO.salvarConfigForm(event, '${lead.id}')" class="instalacoes-form" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px">
      <div>
        <label class="notas-label">💰 Valor Total do Contrato</label>
        <input type="number" id="f_total" class="input-busca" style="width:100%" value="${dados.valorTotal || 0}" required>
      </div>
      <div>
        <label class="notas-label">💸 Valor de Entrada</label>
        <input type="number" id="f_entrada" class="input-busca" style="width:100%" value="${dados.entrada || 0}">
      </div>
      <div>
        <label class="notas-label">🔄 Parcelamento do Saldo (Número de Parcelas)</label>
        <input type="number" id="f_parcelas" class="input-busca" style="width:100%" value="${dados.parcelas || 1}" min="1" max="72" required>
      </div>
      <div>
        <label class="notas-label">🚦 Status de Pagamento</label>
        <select id="f_status" class="input-busca" style="width:100%">
          <option value="pendente" ${dados.statusPagamento === 'pendente' ? 'selected' : ''}>⏳ Pendente (Aguardando Entrada)</option>
          <option value="pago_parcial" ${dados.statusPagamento === 'pago_parcial' ? 'selected' : ''}>🟠 Pago Parcial (Entrada e Saldo Aberto)</option>
          <option value="pago" ${dados.statusPagamento === 'pago' ? 'selected' : ''}>🟢 Pago Integrado (Faturado Total)</option>
        </select>
      </div>
      
      <div style="grid-column:span 2; margin-top:10px">
        <button type="submit" class="btn-primary" style="background:var(--verde-acento)">💾 Salvar Ajustes Financeiros</button>
      </div>
    </form>
  `;
}

function renderParcelamento(lead, dados) {
  const parcelasVal = Math.max(1, dados.parcelas || 1);
  const valorParcela = dados.saldo / parcelasVal;
  
  // Calcular quanto do saldo já foi quitado em receitas avulsas
  const totalReceitasAvulsas = (dados.movimentacoes || [])
    .filter(m => m.tipo === 'receita')
    .reduce((sum, m) => sum + m.valor, 0);

  const saldoPendenteFinal = Math.max(0, dados.saldo - totalReceitasAvulsas);
  const parcelasPagas = Math.min(parcelasVal, Math.floor(totalReceitasAvulsas / valorParcela));
  const parcelasRestantes = parcelasVal - parcelasPagas;

  return `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px">
      <!-- Painel Resumo Financeiro -->
      <div class="glass-card" style="padding:18px; display:grid; gap:12px">
        <h3 style="margin:0">🗓️ Quadro de Parcelamento</h3>
        <p>Valor total do contrato: <b>${formatBRL(dados.valorTotal)}</b></p>
        <p>Entrada paga: <b style="color:#22c55e">${formatBRL(dados.entrada)}</b></p>
        <p>Saldo restante parcelado: <b>${formatBRL(dados.saldo)}</b> em <b>${parcelasVal}x</b></p>
        <hr style="border-color:rgba(255,255,255,0.06)">
        <p style="font-size:16px">Valor de Cada Parcela: <b style="color:var(--verde-acento)">${formatBRL(valorParcela)} / mês</b></p>
      </div>

      <!-- Quadro de Liquidação -->
      <div class="glass-card" style="padding:18px; display:grid; gap:12px">
        <h3 style="margin:0">🔍 Liquidação do Saldo</h3>
        <p>Total Recebido no Saldo: <b style="color:#22c55e">${formatBRL(totalReceitasAvulsas)}</b></p>
        <p>Saldo Devedor em Aberto: <b style="color:#ef4444">${formatBRL(saldoPendenteFinal)}</b></p>
        <p>Status das Parcelas: <b>${parcelasPagas} pagas</b> de <b>${parcelasVal}</b></p>
        <div class="instalacao-progresso" style="margin-top:5px">
          <div class="progresso-bar">
            <div class="progresso-fill" style="width:${(parcelasPagas/parcelasVal)*100}%"></div>
          </div>
          <small>${parcelasRestantes} parcelas restantes</small>
        </div>
      </div>
    </div>
  `;
}

function renderCaixaCliente(lead, dados) {
  const movs = dados.movimentacoes || [];
  
  const receitas = movs.filter(m => m.tipo === 'receita').reduce((sum, m) => sum + m.valor, 0);
  const despesas = movs.filter(m => m.tipo === 'despesa').reduce((sum, m) => sum + m.valor, 0);
  const margem = dados.valorTotal - despesas;
  const pctMargem = dados.valorTotal > 0 ? Math.round((margem / dados.valorTotal) * 100) : 0;

  return `
    <div class="tecnico-grid" style="grid-template-columns: 1.1fr 1fr; gap:20px; align-items:stretch">
      <!-- Painel de Movimentações -->
      <div>
        <h3 style="margin-top:0">💸 Lançamentos do Projeto</h3>
        
        <form onsubmit="window.CRM_FINANCEIRO.salvarLactForm(event, '${lead.id}')" style="display:grid; grid-template-columns:1.2fr 1fr 1fr; gap:10px; margin-bottom:15px; align-items:end">
          <div>
            <label class="notas-label">Descrição</label>
            <input type="text" id="m_desc" class="input-busca" style="width:100%" placeholder="Ex: Pagamento Parcela 1 ou Cabo Flexível" required>
          </div>
          <div>
            <label class="notas-label">Tipo / Valor</label>
            <div style="display:flex; gap:6px">
              <select id="m_tipo" class="input-busca" style="width:60px; padding:0">
                <option value="receita">➕ Receita</option>
                <option value="despesa">➖ Despesa</option>
              </select>
              <input type="number" id="m_valor" class="input-busca" style="flex:1; width:70px" placeholder="Valor BRL" required>
            </div>
          </div>
          <button type="submit" class="btn-primary" style="background:var(--verde-acento)">💸 Lançar</button>
        </form>

        <div style="max-height:280px; overflow-y:auto; display:grid; gap:8px">
          ${movs.length === 0 ? `
            <p class="crm-timeline-empty">Nenhum lançamento financeiro para este projeto.</p>
          ` : movs.map(m => `
            <div class="cliente-item" style="padding:10px 12px; border-left:4px solid ${m.tipo === 'receita' ? '#22c55e' : '#ef4444'}">
              <div class="cliente-info" style="max-width:80%">
                <span class="cliente-nome" style="font-size:12px">${escHtml(m.descricao)}</span>
                <small style="font-size:10px; color:#94a3b8">${new Date(m.data).toLocaleDateString('pt-BR')} · ${m.tipo.toUpperCase()}</small>
              </div>
              <div style="display:flex; align-items:center; gap:10px">
                <span style="font-weight:700; font-size:13px; color:${m.tipo === 'receita' ? '#22c55e' : '#ef4444'}">
                  ${m.tipo === 'receita' ? '+' : '-'}${formatBRL(m.valor)}
                </span>
                <button onclick="window.CRM_FINANCEIRO.excluirMov('${lead.id}', '${m.id}')" style="color:#ef4444; font-size:12px; cursor:pointer" title="Remover">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Dashboard de Margem do Projeto -->
      <div class="glass-card" style="padding:18px; display:grid; gap:12px">
        <h3 style="margin:0">📈 Rentabilidade do Projeto</h3>
        
        <p>Valor total do contrato: <b>${formatBRL(dados.valorTotal)}</b></p>
        <p>Receitas Avulsas: <b style="color:#22c55e">${formatBRL(receitas)}</b></p>
        <p>Despesas / Custos: <b style="color:#ef4444">${formatBRL(despesas)}</b></p>
        
        <hr style="border-color:rgba(255,255,255,0.06)">
        <p style="font-size:16px">Margem Operacional Líquida: <b style="color:#22c55e">${formatBRL(margem)}</b></p>
        
        <div class="instalacao-progresso" style="margin-top:5px">
          <div class="progresso-bar">
            <div class="progresso-fill" style="width:${pctMargem}%; background:linear-gradient(90deg, #ef4444 0%, #22c55e 100%)"></div>
          </div>
          <small>Rentabilidade: <b>${pctMargem}%</b></small>
        </div>
      </div>
    </div>
  `;
}

// ─── CALLBACKS WINDOW ──────────────────────────────────────────

window.CRM_FINANCEIRO = {
  selecionarCliente: (id) => {
    _leadSelecionadoId = id;
    _abaAtiva = 'abaFinResumo';
    renderizarFinanceiroPage();
  },

  trocarAba: (aba) => {
    _abaAtiva = aba;
    const ws = document.getElementById('financeiroWorkspace');
    if (ws) {
      const lead = _leadsList.find(l => l.id === _leadSelecionadoId);
      if (lead) ws.innerHTML = renderizarWorkspaceCliente();
    }
  },

  salvarConfigForm: async (e, leadId) => {
    e.preventDefault();
    const valorTotal = parseFloat(document.getElementById('f_total').value) || 0;
    const entrada = parseFloat(document.getElementById('f_entrada').value) || 0;
    const parcelas = parseInt(document.getElementById('f_parcelas').value) || 1;
    const statusPagamento = document.getElementById('f_status').value;

    await salvarConfigFinanceira(leadId, {
      valorTotal,
      entrada,
      parcelas,
      statusPagamento
    });
    renderizarFinanceiroPage();
  },

  salvarLactForm: async (e, leadId) => {
    e.preventDefault();
    const descricao = document.getElementById('m_desc').value.trim();
    const tipo = document.getElementById('m_tipo').value;
    const valor = parseFloat(document.getElementById('m_valor').value) || 0;

    await adicionarMovimentacao(leadId, {
      descricao,
      tipo,
      valor
    });
    
    // Limpa campos
    document.getElementById('m_desc').value = '';
    document.getElementById('m_valor').value = '';
    
    // Re-render
    const ws = document.getElementById('financeiroWorkspace');
    if (ws) {
      const lead = _leadsList.find(l => l.id === _leadSelecionadoId);
      if (lead) ws.innerHTML = renderizarWorkspaceCliente();
    }
  },

  excluirMov: async (leadId, movId) => {
    if (confirm('Deseja excluir este lançamento?')) {
      await excluirMovimentacao(leadId, movId);
      const ws = document.getElementById('financeiroWorkspace');
      if (ws) {
        const lead = _leadsList.find(l => l.id === _leadSelecionadoId);
        if (lead) ws.innerHTML = renderizarWorkspaceCliente();
      }
    }
  }
};
