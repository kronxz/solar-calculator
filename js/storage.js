/**
 * js/storage.js — Fachada legada. Implementação em services/storageService.js
 */
import * as Store from '../services/storageService.js';

export const Storage = {
    set: (key, value) => Store.setJson(key, value),
    get: (key) => Store.getJson(key),
    remove: (key) => Store.remove(key),

    setLeadId: (id) => Store.setLeadId(id),
    getLeadId: () => Store.getLeadId(),

    setTelefoneDigitos: (d) => Store.setTelefoneDigitos(d),
    getTelefoneDigitos: () => Store.getTelefoneDigitos(),

    setKits: (kits) => Store.setKitsCalculados(kits),
    getKits: () => Store.getKitsCalculados(),

    setKitsDisponiveis: (obj) => Store.setKitsDisponiveis(obj),
    getKitsDisponiveis: () => Store.getKitsDisponiveis(),

    setKitSelecionado: (kit) => Store.setKitSelecionado(kit),
    getKitSelecionado: () => Store.getKitSelecionado()
};
