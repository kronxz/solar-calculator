/**
 * storageService.js — Persistência client-side do Lead Engine.
 * Centraliza localStorage, sessionStorage, chaves legadas e flood.
 * Não importa Firebase nem DOM (exceto crypto no browser).
 */

const PREFIX = 'mf_';

/** Chaves legadas do projeto — não renomear sem migração explícita */
export const LEGACY_KEYS = {
    leadId: 'leadAtualId',
    sessionId: 'sessionId',
    utmData: 'utmData',
    kitsCalculados: 'kitsCalculados',
    kitsDisponiveis: 'kitsDisponiveis',
    kitSelecionado: 'kitSelecionado',
    telefoneDigitos: `${PREFIX}telefone_digitos`,
    sessionData: 'sessionData',
    ultimaVisitaSession: 'ultimaVisitaSession',
    leadScore: 'leadScore',
    eventosDisparados: 'eventosDisparados',
    logado: 'logado',
    floodSessao: `${PREFIX}lead_tentativas_sessao`
};

const FLOOD_PREFIX = `${PREFIX}lead_flood_`;
const CACHE_PREFIX = `${PREFIX}cache_`;
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;

function safeParse(raw, fallback = null) {
    if (raw == null || raw === '') return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function readLocal(key, fallback = null) {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
    } catch (e) {
        console.warn('[storageService] readLocal falhou:', key, e);
        return fallback;
    }
}

export function writeLocal(key, value) {
    try {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, String(value));
        }
        return true;
    } catch (e) {
        console.warn('[storageService] writeLocal falhou:', key, e);
        return false;
    }
}

export function removeLocal(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.warn('[storageService] removeLocal falhou:', key, e);
        return false;
    }
}

export function readJsonLocal(key, fallback = null) {
    return safeParse(readLocal(key), fallback);
}

export function writeJsonLocal(key, value) {
    try {
        writeLocal(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn('[storageService] writeJsonLocal falhou:', key, e);
        return false;
    }
}

export function readSession(key, fallback = null) {
    try {
        const v = sessionStorage.getItem(key);
        return v === null ? fallback : v;
    } catch (e) {
        console.warn('[storageService] readSession falhou:', key, e);
        return fallback;
    }
}

export function writeSession(key, value) {
    try {
        if (value === null || value === undefined) {
            sessionStorage.removeItem(key);
        } else {
            sessionStorage.setItem(key, String(value));
        }
        return true;
    } catch (e) {
        console.warn('[storageService] writeSession falhou:', key, e);
        return false;
    }
}

export function readJsonSession(key, fallback = null) {
    return safeParse(readSession(key), fallback);
}

export function writeJsonSession(key, value) {
    try {
        writeSession(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn('[storageService] writeJsonSession falhou:', key, e);
        return false;
    }
}

export function getOrCreateSessionId() {
    let id = readLocal(LEGACY_KEYS.sessionId);
    if (!id) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        writeLocal(LEGACY_KEYS.sessionId, id);
        console.log('[storageService] sessionId criado:', id);
    }
    return id;
}

export function getLeadId() {
    return readLocal(LEGACY_KEYS.leadId);
}

export function setLeadId(id) {
    if (id) {
        writeLocal(LEGACY_KEYS.leadId, id);
    } else {
        removeLocal(LEGACY_KEYS.leadId);
    }
}

export function getTelefoneDigitos() {
    return readLocal(LEGACY_KEYS.telefoneDigitos);
}

export function setTelefoneDigitos(digitos) {
    if (digitos) {
        writeLocal(LEGACY_KEYS.telefoneDigitos, digitos);
    } else {
        removeLocal(LEGACY_KEYS.telefoneDigitos);
    }
}

export function getUtmData() {
    return readJsonLocal(LEGACY_KEYS.utmData, {});
}

export function setUtmData(data) {
    writeJsonLocal(LEGACY_KEYS.utmData, data);
}

export function getKitsCalculados() {
    return readJsonLocal(LEGACY_KEYS.kitsCalculados, []);
}

export function setKitsCalculados(kits) {
    writeJsonLocal(LEGACY_KEYS.kitsCalculados, kits);
}

export function getKitsDisponiveis() {
    return readJsonLocal(LEGACY_KEYS.kitsDisponiveis, {});
}

export function setKitsDisponiveis(kitsObj) {
    writeJsonLocal(LEGACY_KEYS.kitsDisponiveis, kitsObj);
}

export function getKitSelecionado() {
    return readJsonLocal(LEGACY_KEYS.kitSelecionado, null);
}

export function setKitSelecionado(kit) {
    if (kit == null) {
        removeLocal(LEGACY_KEYS.kitSelecionado);
    } else {
        writeJsonLocal(LEGACY_KEYS.kitSelecionado, kit);
    }
}

export function getFloodMap(acao) {
    return readJsonLocal(`${FLOOD_PREFIX}${acao}`, {});
}

export function setFloodMap(acao, map) {
    writeJsonLocal(`${FLOOD_PREFIX}${acao}`, map);
}

export function getFloodSessao() {
    return readJsonLocal(LEGACY_KEYS.floodSessao, { count: 0, resetAt: Date.now() });
}

export function setFloodSessao(data) {
    writeJsonLocal(LEGACY_KEYS.floodSessao, data);
}

export function clearFlood(acao = null) {
    if (acao) {
        removeLocal(`${FLOOD_PREFIX}${acao}`);
    } else {
        try {
            Object.keys(localStorage).forEach((k) => {
                if (k.startsWith(FLOOD_PREFIX)) removeLocal(k);
            });
        } catch (e) {
            console.warn('[storageService] clearFlood iter falhou:', e);
        }
        removeLocal(LEGACY_KEYS.floodSessao);
    }
    console.log('[storageService] flood limpo', acao || 'todos');
}

export function setCache(key, value, ttlMs = DEFAULT_CACHE_TTL_MS) {
    const payload = {
        value,
        expiresAt: Date.now() + ttlMs
    };
    writeJsonLocal(`${CACHE_PREFIX}${key}`, payload);
}

export function getCache(key) {
    const payload = readJsonLocal(`${CACHE_PREFIX}${key}`);
    if (!payload) return null;
    if (payload.expiresAt < Date.now()) {
        removeLocal(`${CACHE_PREFIX}${key}`);
        return null;
    }
    return payload.value;
}

export function removeCache(key) {
    removeLocal(`${CACHE_PREFIX}${key}`);
}

export function getEventosDisparados() {
    return readJsonSession(LEGACY_KEYS.eventosDisparados, []);
}

export function setEventosDisparados(lista) {
    writeJsonSession(LEGACY_KEYS.eventosDisparados, lista);
}

export function getLeadScore() {
    return Number(readLocal(LEGACY_KEYS.leadScore, '0')) || 0;
}

export function setLeadScore(score) {
    writeLocal(LEGACY_KEYS.leadScore, String(score));
}

export function setJson(key, value) {
    return writeJsonLocal(key, value);
}

export function getJson(key, fallback = null) {
    return readJsonLocal(key, fallback);
}

export function remove(key) {
    return removeLocal(key);
}

export function clearLeadSession() {
    setLeadId(null);
    setTelefoneDigitos(null);
    setKitSelecionado(null);
    removeCache('lead_snapshot');
    console.log('[storageService] sessão de lead limpa');
}
