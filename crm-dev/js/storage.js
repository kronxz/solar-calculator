// storage.js - Wrapper para LocalStorage seguro
export const Storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error("Erro ao salvar no storage (Modo Privado?):", e);
        }
    },
    get: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Erro ao ler do storage:", e);
            return null;
        }
    },
    remove: (key) => {
        localStorage.removeItem(key);
    },
    
    // Funções específicas de negócio
    setLeadId: (id) => {
        try {
            if (id) {
                localStorage.setItem('leadAtualId', id);
            } else {
                localStorage.removeItem('leadAtualId');
            }
        } catch (e) {
            console.error("Erro ao salvar leadAtualId:", e);
        }
    },
    getLeadId: () => {
        try {
            return localStorage.getItem('leadAtualId');
        } catch (e) {
            console.error("Erro ao ler leadAtualId:", e);
            return null;
        }
    },
    
    setKits: (kits) => Storage.set('kitsCalculados', kits),
    getKits: () => Storage.get('kitsCalculados') || [],
    
    setKitsDisponiveis: (kitsObj) => Storage.set('kitsDisponiveis', kitsObj),
    getKitsDisponiveis: () => Storage.get('kitsDisponiveis') || {}
};
