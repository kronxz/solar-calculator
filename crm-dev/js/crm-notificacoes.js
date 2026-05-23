// [MF-AI-CHANGE] crm-notificacoes.js — Central de Notificações & WhatsApp — 2026-05-23
// Gestão de: Fila de mensagens, templates de WhatsApp, alertas automáticos (vencimentos e garantias), logs de envio e fila de disparos.

import {
  collection, doc, addDoc, onSnapshot, query, where, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { app } from '../../firebase/config.js';
import { toast, escHtml } from './crm-utils.js';

let _db = null;
let _userId = null;
let _logsList = []; // Histórico de envios Firestore
let _leadsList = [];
let _instalacoesList = [];
let _tecnicoMap = {};
let _financeiroMap = {};
let _unsubLogs = null;

// Templates de Mensagens Operacionais Reutilizáveis (Preparados para futura API/IA)
const TEMPLATES = {
  parcela_vencendo: (cliente, valor) => 
    `Olá ${cliente}, a MF Soluções Elétricas lembra que sua próxima parcela no valor de R$ ${Number(valor).toFixed(0)} está próxima do vencimento. Caso precise do Pix de pagamento ou segunda via, estamos à disposição! ⚡`,
  
  garantia_vencendo: (cliente, equipamento) => 
    `Olá ${cliente}! Esperamos que seu sistema solar esteja gerando muita economia. Lembramos que a garantia técnica do seu ${equipamento} está próxima do vencimento. Caso queira agendar uma vistoria preventiva completa com tarifa especial, fale conosco! 🛠️`,
  
  followup_pos_instalacao: (cliente) => 
    `Olá ${cliente}, tudo bem? Faz 7 dias que concluímos a instalação do seu sistema solar. Gostaríamos de saber se está tudo funcionando perfeitamente e como foi sua experiência com nossa equipe. Seu feedback é muito importante para nós da MF Soluções! ☀️`
};

export function initNotificacoes(db) {
  _db = db;
}

export function carregarNotificacoes(leads, instalacoes, tecnicoMap, financeiroMap) {
  _leadsList = leads || [];
  _instalacoesList = instalacoes || [];
  _tecnicoMap = tecnicoMap || {};
  _financeiroMap = financeiroMap || {};

  const user = getAuth(app).currentUser;
  if (!user || !_db) return;
  _userId = user.uid;

  if (_unsubLogs) return; // Evita duplicação

  const q = query(
    collection(_db, 'notificacoes_logs'),
    where('userId', '==', _userId),
    orderBy('dataEnvio', 'desc'),
    limit(50)
  );

  _unsubLogs = onSnapshot(q, (snapshot) => {
    _logsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (document.getElementById('notificacoesPage')?.classList.contains('active')) {
      renderizarNotificacoesPage();
    }
  }, (err) => {
    console.error('[CRM-NOTIFICACOES] Erro nos logs de envio:', err);
  });
}

export function pararNotificacoes() {
  if (_unsubLogs) {
    _unsubLogs();
    _unsubLogs = null;
  }
}

// ─── ANÁLISE EM TEMPO REAL E GERAÇÃO DE ALERTAS (BAIXO CUSTO) ───

function compilarNotificacoesEAlerta() {
  const filaMensagens = [];
  const alertasAtivos = [];
  const hoje = new Date();

  _leadsList.forEach(lead => {
    if (lead.excluido) return;

    // 1. Alerta de Parcelamento e Vencimento Financeiro
    const fin = _financeiroMap[lead.id];
    if (fin && fin.statusPagamento !== 'pago' && fin.saldo > 0) {
      const valorParc = fin.saldo / (fin.parcelas || 1);
      
      alertasAtivos.push({
        id: `al_fin_${lead.id}`,
        tipo: 'financeiro',
        icone: '⏳',
        titulo: `Cobrança Pendente: ${escHtml(lead.nome)}`,
        desc: `Faturamento em aberto. Saldo devedor de R$ ${fin.saldo.toFixed(0)} parcelado em ${fin.parcelas}x.`,
        cor: '#f59e0b'
      });

      filaMensagens.push({
        id: `msg_fin_${lead.id}`,
        clienteId: lead.id,
        clienteNome: lead.nome,
        clienteTelefone: lead.telefone,
        tipo: 'Parcela Vencendo',
        icone: '💳',
        texto: TEMPLATES.parcela_vencendo(lead.nome, valorParc),
        referencia: 'Financiamento'
      });
    }

    // 2. Alerta de Garantias Próximas ao Vencimento
    const tec = _tecnicoMap[lead.id];
    if (tec?.garantias?.inicioGarantia) {
      const inicio = new Date(tec.garantias.inicioGarantia);
      
      // Cálculo de Expiração do Inversor
      const fimInversor = new Date(inicio);
      fimInversor.setMonth(fimInversor.getMonth() + (tec.garantias.mesesInversor || 120));
      
      const difMeses = (fimInversor.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (difMeses > 0 && difMeses <= 3) {
        alertasAtivos.push({
          id: `al_gar_${lead.id}_inv`,
          tipo: 'garantia',
          icone: '🛡️',
          titulo: `Garantia Expirando: ${escHtml(lead.nome)}`,
          desc: `Garantia do inversor expira em ${Math.ceil(difMeses)} meses (${fimInversor.toLocaleDateString('pt-BR')}).`,
          cor: '#ef4444'
        });

        filaMensagens.push({
          id: `msg_gar_${lead.id}_inv`,
          clienteId: lead.id,
          clienteNome: lead.nome,
          clienteTelefone: lead.telefone,
          tipo: 'Garantia Inversor',
          icone: '⚡',
          texto: TEMPLATES.garanty_vencendo ? TEMPLATES.garanty_vencendo(lead.nome, 'Inversor') : TEMPLATES.garantia_vencendo(lead.nome, 'Inversor Solar'),
          referencia: 'Garantia'
        });
      }
    }

    // 3. Alerta de Follow-up Pós-Instalação (7 dias)
    const inst = _instalacoesList.find(i => i.leadId === lead.id);
    if (inst?.status === 'concluido' && inst.criadoEm) {
      const dataConclusao = new Date(inst.criadoEm);
      const difDias = Math.floor((hoje.getTime() - dataConclusao.getTime()) / (1000 * 60 * 60 * 24));
      
      // Se concluiu há pelo menos 7 dias e não tem log recente de follow-up pós-venda
      if (difDias >= 7 && difDias <= 14) {
        alertasAtivos.push({
          id: `al_fol_${lead.id}`,
          tipo: 'followup',
          icone: '💬',
          titulo: `Follow-up 7 Dias: ${escHtml(lead.nome)}`,
          desc: `Instalação concluída há ${difDias} dias. Hora do contato de pós-venda.`,
          cor: '#10b981'
        });

        filaMensagens.push({
          id: `msg_fol_${lead.id}`,
          clienteId: lead.id,
          clienteNome: lead.nome,
          clienteTelefone: lead.telefone,
          tipo: 'Follow-up Pós-Venda',
          icone: '🌞',
          texto: TEMPLATES.followup_pos_instalacao(lead.nome),
          referencia: 'Instalações'
        });
      }
    }
  });

  return { alertasAtivos, filaMensagens };
}

// ─── RENDER DA CENTRAL DE NOTIFICAÇÕES ──────────────────────────

export function renderizarNoticificacoesPage() {
  renderizarNotificacoesPage();
}

export function renderizarNotificacoesPage() {
  const container = document.getElementById('notificacoesPage');
  if (!container) return;

  const { alertasAtivos, filaMensagens } = compilarNotificacoesEAlerta();

  container.innerHTML = `
    <div class="tecnico-header glass-card">
      <div>
        <h1>🔔 Central de Notificações & WhatsApp</h1>
        <p class="crm-page-meta">Disparos de mensagens ativas, alertas de pós-venda, garantias e histórico de acompanhamento.</p>
      </div>
    </div>

    <!-- Layout da Central: Esquerda Fila de Mensagens / Direita Alertas & Logs -->
    <div class="tecnico-grid" style="grid-template-columns: 1.1fr 0.9fr">
      
      <!-- Fila de Disparos de WhatsApp -->
      <div class="workspace-card glass-card">
        <h3 style="margin-top:0; display:flex; align-items:center; gap:8px">
          💬 Fila de Disparos Pendentes
          <span class="status-badge" style="background:#3b82f6">${filaMensagens.length}</span>
        </h3>
        <p class="crm-page-meta" style="margin-bottom:15px">Clique em "Disparar WhatsApp" para abrir o WhatsApp Web com o template pré-preenchido e registrar o log automaticamente.</p>
        
        <div style="display:grid; gap:14px; max-height:600px; overflow-y:auto; padding-right:5px">
          ${filaMensagens.length === 0 ? `
            <p class="crm-timeline-empty">Nenhum disparo pendente na fila de WhatsApp.</p>
          ` : filaMensagens.map(msg => `
            <div class="agenda-card">
              <div class="agenda-head">
                <span class="agenda-icon" style="background:rgba(34,197,94,0.15); color:#22c55e">📱</span>
                <div>
                  <h4 style="margin:0">${escHtml(msg.clienteNome)}</h4>
                  <small>Motivo: <b>${escHtml(msg.tipo)}</b> · Ref: ${escHtml(msg.referencia)}</small>
                </div>
                <button class="btn-card" style="margin-left:auto; background:#22c55e; color:#022c22; font-weight:700"
                        onclick="window.CRM_NOTIFICACOES.dispararWhatsApp('${msg.clienteId}', '${escHtml(msg.clienteNome)}', '${escHtml(msg.clienteTelefone)}', \`${escHtml(msg.texto)}\`, '${escHtml(msg.tipo)}')">
                  🟢 Disparar WhatsApp
                </button>
              </div>
              <div style="margin-top:8px; background:rgba(255,255,255,0.02); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.05); font-size:12px; line-height:1.4">
                "${escHtml(msg.texto)}"
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Lado Direito: Alertas Ativos & Histórico Logs -->
      <div style="display:grid; gap:20px; align-content:start">
        
        <!-- Alertas Técnicos & Financeiros -->
        <div class="workspace-card glass-card" style="padding:20px">
          <h3 style="margin-top:0">⚠️ Alertas Internos Ativos</h3>
          <div style="display:grid; gap:10px; max-height:220px; overflow-y:auto">
            ${alertasAtivos.length === 0 ? `
              <p class="crm-timeline-empty" style="padding:10px">Nenhum alerta crítico ativo.</p>
            ` : alertasAtivos.map(al => `
              <div class="cliente-item" style="border-left:4px solid ${al.cor}; padding:10px 12px">
                <div class="cliente-info" style="max-width:85%">
                  <span class="cliente-nome" style="font-size:12px">${al.icone} ${escHtml(al.titulo)}</span>
                  <span class="cliente-cidade" style="font-size:10px; color:#cbd5e1">${escHtml(al.desc)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Logs de Envio -->
        <div class="workspace-card glass-card" style="padding:20px">
          <h3 style="margin-top:0">📄 Histórico de Mensagens</h3>
          <p class="crm-page-meta">Registro dos últimos 50 disparos realizados pelos operadores no WhatsApp Web.</p>
          
          <div style="display:grid; gap:8px; max-height:280px; overflow-y:auto; padding-right:5px">
            ${_logsList.length === 0 ? `
              <p class="crm-timeline-empty" style="padding:10px">Nenhuma mensagem registrada no log.</p>
            ` : _logsList.map(log => `
              <div class="cliente-item" style="padding:10px 12px; background:rgba(255,255,255,0.01)">
                <div class="cliente-info" style="max-width:80%">
                  <span class="cliente-nome" style="font-size:12px">👤 ${escHtml(log.clienteNome)}</span>
                  <span class="cliente-cidade" style="font-size:10px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap" title="${escHtml(log.mensagem)}">
                    "${escHtml(log.mensagem)}"
                  </span>
                </div>
                <div style="text-align:right">
                  <span class="status-badge-peq" style="background:rgba(34,197,94,0.1); color:#22c55e; border:1px solid rgba(34,197,94,0.2)">ENVIADO</span>
                  <small style="display:block; font-size:9px; color:#94a3b8; margin-top:4px">${new Date(log.dataEnvio).toLocaleDateString('pt-BR')}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

    </div>
  `;
}

// ─── DISPARADOR WHATSAPP E LOGS ──────────────────────────────────

export async function registrarLogEnvio(clienteId, clienteNome, mensagem, canal) {
  try {
    const log = {
      userId: _userId,
      clienteId,
      clienteNome,
      mensagem,
      canal,
      dataEnvio: new Date().toISOString()
    };
    await addDoc(collection(_db, 'notificacoes_logs'), log);
  } catch (err) {
    console.error('[CRM-NOTIFICACOES] Erro ao salvar log de envio:', err);
  }
}

window.CRM_NOTIFICACOES = {
  dispararWhatsApp: async (clienteId, clienteNome, telefone, texto, tipo) => {
    if (!telefone) {
      toast('Cliente sem telefone cadastrado!', 'error');
      return;
    }

    // Limpa caracteres especiais do telefone
    const telLimpo = String(telefone).replace(/\D/g, '');
    const ddi = telLimpo.startsWith('55') ? '' : '55';
    const linkWhatsApp = `https://wa.me/${ddi}${telLimpo}?text=${encodeURIComponent(texto)}`;

    // Registra o log no Firestore primeiro (Garante persistência de controle)
    await registrarLogEnvio(clienteId, clienteNome, `[${tipo}] ${texto}`, 'whatsapp');

    // Abre o WhatsApp Web em nova aba
    window.open(linkWhatsApp, '_blank');
    toast(`Mensagem enviada com sucesso para ${clienteNome}!`, 'success');
  }
};
