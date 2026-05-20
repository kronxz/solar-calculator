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
    setLeadId: (id) => Storage.set('leadAtualId', id),
    getLeadId: () => Storage.get('leadAtualId'),
    
    setKits: (kits) => Storage.set('kitsCalculados', kits),
    getKits: () => Storage.get('kitsCalculados') || []
};
