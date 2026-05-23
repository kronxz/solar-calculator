/**
 * timelineService.js — Histórico cronológico leve por lead.
 * Subcoleção: leads/{leadId}/timeline/{eventId}
 * Dedupe client-side (30s) para evitar writes repetidos.
 */

import { db, collection, addDoc, serverTimestamp } from '../firebase/config.js';
import { getOrCreateSessionId, getCache, setCache } from './storageService.js';

/** Tipos de evento padronizados */
export const TIMELINE_TIPOS = {
    CRIOU_LEAD: 'criou_lead',
    SIMULOU: 'simulou',
    ATUALIZOU_SIMULACAO: 'atualizou_simulacao',
    ESCOLHEU_KIT: 'escolheu_kit',
    CLICOU_WHATSAPP: 'clicou_whatsapp',
    RETORNOU_AO_SITE: 'retornou_ao_site'
};

const LABELS = {
    [TIMELINE_TIPOS.CRIOU_LEAD]: 'Criou lead',
    [TIMELINE_TIPOS.SIMULOU]: 'Simulou',
    [TIMELINE_TIPOS.ATUALIZOU_SIMULACAO]: 'Atualizou simulação',
    [TIMELINE_TIPOS.ESCOLHEU_KIT]: 'Escolheu kit',
    [TIMELINE_TIPOS.CLICOU_WHATSAPP]: 'Clicou WhatsApp',
    [TIMELINE_TIPOS.RETORNOU_AO_SITE]: 'Retornou ao site'
};

const DEDUPE_TTL_MS = 30_000;
const CACHE_PREFIX = 'timeline_dedupe_';

/**
 * Sanitiza meta para objeto pequeno (evita payloads grandes).
 */
function sanitizarMeta(meta = {}) {
    if (!meta || typeof meta !== 'object') return {};
    const limpo = {};
    const chaves = Object.keys(meta).slice(0, 8);
    for (const k of chaves) {
        const v = meta[k];
        if (v == null) continue;
        if (typeof v === 'object') {
            limpo[k] = JSON.stringify(v).slice(0, 120);
        } else {
            limpo[k] = String(v).slice(0, 120);
        }
    }
    return limpo;
}

function chaveDedupe(leadId, tipo) {
    return `${CACHE_PREFIX}${leadId}_${tipo}`;
}

function jaRegistradoRecentemente(leadId, tipo) {
    return getCache(chaveDedupe(leadId, tipo)) === true;
}

function marcarRegistrado(leadId, tipo) {
    setCache(chaveDedupe(leadId, tipo), true, DEDUPE_TTL_MS);
}

/**
 * Registra um evento na timeline do lead (1 write).
 * Falhas não interrompem o fluxo principal — retorna null em erro.
 */
export async function registrarEventoTimeline(leadId, tipo, meta = {}) {
    if (!leadId || !tipo) {
        console.warn('[timelineService] leadId ou tipo ausente — evento ignorado');
        return null;
    }

    if (!LABELS[tipo]) {
        console.warn('[timelineService] tipo desconhecido:', tipo);
        return null;
    }

    if (jaRegistradoRecentemente(leadId, tipo)) {
        console.log('[timelineService] dedupe — ignorado:', tipo, leadId);
        return null;
    }

    try {
        const sessionId = getOrCreateSessionId();
        const timelineRef = collection(db, 'leads', leadId, 'timeline');

        const docRef = await addDoc(timelineRef, {
            tipo,
            nome: LABELS[tipo],
            criadoEm: serverTimestamp(),
            sessionId,
            meta: sanitizarMeta(meta)
        });

        marcarRegistrado(leadId, tipo);
        console.log('[timelineService] evento registrado:', tipo, docRef.id);
        return docRef.id;
    } catch (e) {
        console.warn('[timelineService] falha ao registrar:', tipo, e.message || e);
        return null;
    }
}

/**
 * Define se a próxima simulação é "simulou" ou "atualizou_simulacao".
 */
export function resolverTipoSimulacao(leadId) {
    const chave = `${CACHE_PREFIX}simulou_flag_${leadId}`;
    if (getCache(chave)) {
        return TIMELINE_TIPOS.ATUALIZOU_SIMULACAO;
    }
    setCache(chave, true, 24 * 60 * 60 * 1000);
    return TIMELINE_TIPOS.SIMULOU;
}
