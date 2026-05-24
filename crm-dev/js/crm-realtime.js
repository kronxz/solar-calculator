/**
 * crm-realtime.js — UI helpers: score, temperatura, tempo relativo, timeline.
 * Leitura sob demanda da subcoleção timeline (limit 10). Sem alterar services do lead engine.
 */

import {
    collection,
    query,
    orderBy,
    limit,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export function toDateFromFirestore(valor) {
    if (!valor) return null;
    if (typeof valor.toDate === 'function') return valor.toDate();
    if (valor.seconds) return new Date(valor.seconds * 1000);
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Tempo relativo em português (ex: "há 5 min") */
export function formatTempoRelativo(valor) {
    const data = toDateFromFirestore(valor);
    if (!data) return '—';
    const diffMs = Date.now() - data.getTime();
    if (diffMs < 0) return 'agora';
    const seg = Math.floor(diffMs / 1000);
    if (seg < 60) return 'agora';
    const min = Math.floor(seg / 60);
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const dias = Math.floor(h / 24);
    if (dias < 30) return `há ${dias} dia${dias > 1 ? 's' : ''}`;
    return data.toLocaleDateString('pt-BR');
}

/** Badge HTML de temperatura (Fria / Morno / Quente) */
export function badgeTemperaturaHtml(temperatura) {
    const t = String(temperatura || 'Fria').toLowerCase();
    let classe = 'temp-fria';
    let label = 'Fria';
    if (t.includes('quente')) {
        classe = 'temp-quente';
        label = 'Quente';
    } else if (t.includes('morno')) {
        classe = 'temp-morno';
        label = 'Morno';
    }
    return `<span class="crm-temp-badge ${classe}">${label}</span>`;
}

function escapeHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Bloco compacto para card do kanban */
export function crmCardIntel(lead) {
    const score = lead.score ?? 0;
    const ultima = lead.ultima_acao_nome || '—';
    const quando = formatTempoRelativo(lead.lastAction || lead.data || lead.createdAt);

    return `
<div class="crm-card-intel">
  <span class="crm-score-badge">⭐ ${score}</span>
  ${badgeTemperaturaHtml(lead.temperatura)}
</div>
<small class="crm-ultima-acao">${escapeHtml(ultima)} · ${quando}</small>
`;
}

/**
 * Busca timeline do lead (1 query, máx. N docs).
 */
export async function fetchTimelineLimited(db, leadId, max = 10) {
    if (!db || !leadId) return [];
    const q = query(
        collection(db, 'leads', leadId, 'timeline'),
        orderBy('criadoEm', 'desc'),
        limit(max)
    );
    const snapshot = await getDocs(q);
    const eventos = [];
    snapshot.forEach((docSnap) => {
        eventos.push({ id: docSnap.id, ...docSnap.data() });
    });
    return eventos;
}

/** HTML da mini timeline para o modal */
export function renderTimelineMiniHtml(eventos) {
    if (!eventos?.length) {
        return '<p class="crm-timeline-empty">Nenhum evento registrado ainda.</p>';
    }
    return `<ul class="crm-timeline-list">${eventos.map((e) => `
<li class="crm-timeline-item">
  <b>${escapeHtml(e.nome || e.tipo)}</b>
  <small>${formatTempoRelativo(e.criadoEm)}</small>
</li>`).join('')}</ul>`;
}
