import { app, db } from '../../firebase/config.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
    crmCardIntel,
    fetchTimelineLimited,
    renderTimelineMiniHtml,
    formatTempoRelativo,
    badgeTemperaturaHtml
} from '../../crm/crm-realtime.js';

const COLUNAS = ['novo', 'contato', 'proposta', 'fechado'];
const TITULOS_COLUNA = {
    novo: '🟡 Novos',
    contato: '🔵 Contato',
    proposta: '🟠 Proposta',
    fechado: '🟢 Fechado'
};

let leads = [];
let unsubscribeLeads = null;

function normalizarStatus(status) {
    if (!status) return 'novo';
    const mapa = {
        novo: 'novo',
        contato: 'contato',
        proposta: 'proposta',
        fechado: 'fechado',
        negociacao: 'contato',
        negociação: 'contato'
    };
    const chave = String(status).toLowerCase().trim();
    if (status === 'Novo') return 'novo';
    if (status === 'Negociação') return 'contato';
    return mapa[chave] || 'novo';
}

function escapeHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function criarCardLead(lead) {
    const valor = lead.valor ?? lead.contaDeLuz ?? '-';
    const origem = lead.utm_source || 'direto';
    const campanha = lead.utm_campaign || '-';
    const kit = lead.kitEscolhido || '-';

    return `
        <div class="card" draggable="true" data-lead-id="${lead.id}">
            <b>${escapeHtml(lead.nome || 'Sem nome')}</b>
            ${crmCardIntel(lead)}
            <small style="color:#22c55e; font-weight:bold">🔥 ${escapeHtml(origem)}</small><br>
            <small style="color:#9ca3af">Campanha: ${escapeHtml(campanha)}</small><br>
            <small>📞 ${escapeHtml(lead.telefone || '-')}</small><br>
            <small>💡 Conta: R$ ${escapeHtml(valor)}</small><br>
            <small>🏷 Kit: ${escapeHtml(kit)}</small>
            <button type="button" class="btn-sec" data-detalhes="${lead.id}" style="margin-top:8px">📊 Detalhes</button>
        </div>
    `;
}

export function renderizarKanban(lista) {
    leads = lista;
    const ativos = leads.filter((l) => !l.deletado);

    COLUNAS.forEach((coluna) => {
        const el = document.getElementById(coluna);
        if (el) el.innerHTML = `<h2>${TITULOS_COLUNA[coluna]}</h2>`;
    });

    const total = ativos.length;
    const negociacao = ativos.filter((l) => {
        const s = normalizarStatus(l.status);
        return s === 'contato' || s === 'proposta';
    }).length;
    const fechados = ativos.filter((l) => normalizarStatus(l.status) === 'fechado').length;

    const elTotal = document.getElementById('totalLeads');
    const elNegociacao = document.getElementById('negociacao');
    const elFechados = document.getElementById('fechados');

    if (elTotal) elTotal.textContent = total;
    if (elNegociacao) elNegociacao.textContent = negociacao;
    if (elFechados) elFechados.textContent = fechados;

    ativos.forEach((lead) => {
        const coluna = normalizarStatus(lead.status);
        const container = document.getElementById(coluna);
        if (!container) return;
        container.innerHTML += criarCardLead(lead);
    });
}

async function abrirDetalhes(leadId) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const modal = document.getElementById('modalDetalhes');
    const conteudo = document.getElementById('modalDetalhesConteudo');
    if (!modal || !conteudo) return;

    conteudo.innerHTML = '<p class="crm-timeline-empty">Carregando...</p>';
    modal.classList.add('ativo');
    modal.setAttribute('aria-hidden', 'false');

    let timelineHtml = '';
    try {
        const eventos = await fetchTimelineLimited(db, leadId, 10);
        timelineHtml = renderTimelineMiniHtml(eventos);
    } catch (e) {
        console.warn('[CRM] timeline:', e);
        timelineHtml = '<p class="crm-timeline-empty">Timeline indisponível.</p>';
    }

    conteudo.innerHTML = `
        <div class="crm-card-intel" style="margin-bottom:10px">
          <span class="crm-score-badge">⭐ ${lead.score ?? 0}</span>
          ${badgeTemperaturaHtml(lead.temperatura)}
        </div>
        <p class="crm-ultima-acao"><b>Última ação:</b> ${escapeHtml(lead.ultima_acao_nome || '—')} · ${formatTempoRelativo(lead.lastAction || lead.createdAt)}</p>
        <h3 style="font-size:15px;margin:12px 0 8px">🕐 Timeline</h3>
        ${timelineHtml}
        <hr style="margin:16px 0;border-color:rgba(255,255,255,0.08)">
        <p><b>Telefone:</b> ${escapeHtml(lead.telefone || '—')}</p>
        <p><b>Origem:</b> ${escapeHtml(lead.utm_source || 'direto')}</p>
    `;
}

function fecharModal() {
    const modal = document.getElementById('modalDetalhes');
    if (modal) {
        modal.classList.remove('ativo');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function iniciarRealtimeLeads() {
    if (unsubscribeLeads) {
        unsubscribeLeads();
        unsubscribeLeads = null;
    }

    unsubscribeLeads = onSnapshot(
        collection(db, 'leads'),
        (snapshot) => {
            const lista = [];
            snapshot.forEach((docSnap) => {
                lista.push({ id: docSnap.id, ...docSnap.data() });
            });
            renderizarKanban(lista);
            console.log(`[CRM] realtime: ${lista.length} leads`);
        },
        (err) => console.error('[CRM] onSnapshot erro:', err)
    );
}

document.getElementById('btnFecharModal')?.addEventListener('click', fecharModal);
document.getElementById('modalDetalhes')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalDetalhes') fecharModal();
});

document.querySelector('.board')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-detalhes]');
    if (btn) {
        abrirDetalhes(btn.getAttribute('data-detalhes'));
    }
});

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    iniciarRealtimeLeads();
});
