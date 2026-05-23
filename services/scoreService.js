/**
 * scoreService.js — Score incremental e temperatura automática do lead.
 * Sem leitura do Firestore: usa cache local + 1 write por novo tipo de evento.
 */

import { db, doc, updateDoc } from '../firebase/config.js';
import { getCache, setCache, getJson, setJson } from './storageService.js';

const SCORE_MAX = 100;
const CACHE_SCORE_PREFIX = 'mf_score_valor_';
const CACHE_EVENTOS_PREFIX = 'mf_score_aplicados_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Pesos configuráveis por tipo de evento (soma máx. possível = 100) */
export const PESOS = {
    criou_lead: 10,
    retornou_ao_site: 5,
    simulou: 20,
    atualizou_simulacao: 10,
    escolheu_kit: 25,
    clicou_whatsapp: 30
};

/**
 * Temperatura comercial automática.
 * 0-29 Frio | 30-69 Morno | 70-100 Quente
 */
export function calcularTemperatura(score) {
    const s = Math.min(SCORE_MAX, Math.max(0, Math.round(Number(score) || 0)));
    if (s >= 70) return 'Quente';
    if (s >= 30) return 'Morno';
    return 'Fria';
}

function chaveScore(leadId) {
    return `${CACHE_SCORE_PREFIX}${leadId}`;
}

function chaveEventos(leadId) {
    return `${CACHE_EVENTOS_PREFIX}${leadId}`;
}

function getScoreCache(leadId) {
    const cached = getCache(chaveScore(leadId));
    if (cached != null) return Number(cached) || 0;
    return 0;
}

function setScoreCache(leadId, score) {
    setCache(chaveScore(leadId), score, CACHE_TTL_MS);
}

function getEventosAplicados(leadId) {
    return getJson(chaveEventos(leadId), []) || [];
}

function marcarEventoAplicado(leadId, tipo) {
    const lista = getEventosAplicados(leadId);
    if (!lista.includes(tipo)) {
        lista.push(tipo);
        setJson(chaveEventos(leadId), lista);
    }
}

/**
 * Sincroniza cache local com score já existente no Firestore (ex.: dedupe).
 */
export function sincronizarScoreCache(leadId, scoreFirestore) {
    if (!leadId || scoreFirestore == null) return;
    const s = Math.min(SCORE_MAX, Math.max(0, Number(scoreFirestore) || 0));
    setScoreCache(leadId, s);
}

/**
 * Aplica pontos de um tipo de evento (1x por tipo por lead no cache).
 * 0 reads — 1 write no documento leads/{id}.
 */
export async function aplicarScoreIncremental(leadId, tipo) {
    if (!leadId || !tipo) return null;

    const pontos = PESOS[tipo];
    if (!pontos) {
        console.warn('[scoreService] tipo sem peso:', tipo);
        return null;
    }

    const aplicados = getEventosAplicados(leadId);
    if (aplicados.includes(tipo)) {
        console.log('[scoreService] evento já pontuado:', tipo, leadId);
        return { score: getScoreCache(leadId), temperatura: calcularTemperatura(getScoreCache(leadId)), duplicado: true };
    }

    const scoreAtual = getScoreCache(leadId);
    const novoScore = Math.min(SCORE_MAX, scoreAtual + pontos);
    const temperatura = calcularTemperatura(novoScore);

    try {
        await updateDoc(doc(db, 'leads', leadId), {
            score: novoScore,
            temperatura
        });

        setScoreCache(leadId, novoScore);
        marcarEventoAplicado(leadId, tipo);

        console.log('[scoreService] score atualizado:', {
            leadId,
            tipo,
            delta: pontos,
            score: novoScore,
            temperatura
        });

        return { score: novoScore, temperatura, delta: pontos };
    } catch (e) {
        console.warn('[scoreService] falha ao atualizar score:', tipo, e.message || e);
        return null;
    }
}
