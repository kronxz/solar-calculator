import { db, collection, addDoc, updateDoc, doc, serverTimestamp } from './firebase.js';
import { Storage } from './storage.js';
import { getUTM } from './utm.js';

// Função para criar o lead BASE (Nome + Telefone)
export async function criarLeadBase(nome, telefone) {
    try {
        const utm = getUTM();
        const leadData = {
            nome: nome,
            telefone: telefone,
            status: 'Novo',
            temperatura: 'Fria',
            score: 10, // +10 digitou telefone
            utm_source: utm.source,
            utm_medium: utm.medium,
            utm_campaign: utm.campaign,
            fbclid: utm.fbclid,
            gclid: utm.gclid,
            sessionId: utm.sessionId,
            bairroQR: utm.bairroQR,
            dispositivo: utm.dispositivo,
            pagina_origem: utm.pagina,
            createdAt: serverTimestamp(),
            lastAction: serverTimestamp(),
            ultima_acao_nome: 'Deixou Contato'
        };

        const docRef = await addDoc(collection(db, "leads"), leadData);
        console.log("Lead Base criado com ID: ", docRef.id);
        
        // Salva ID no Storage local
        Storage.setLeadId(docRef.id);
        return docRef.id;

    } catch (e) {
        console.error("Erro ao criar lead base: ", e);
        throw e;
    }
}

// Função para atualizar lead com dados da calculadora
export async function atualizarLeadCalculadora(dadosCalculo) {
    const leadId = Storage.getLeadId();
    if (!leadId) {
        console.error("Nenhum lead encontrado no cache para atualizar.");
        return;
    }

    try {
        const leadRef = doc(db, "leads", leadId);
        
        // Recupera kits para salvar no lead
        const kits = Storage.getKits();

        await updateDoc(leadRef, {
            ...dadosCalculo, // ex: contaDeLuz, consumoMensal
            kits: kits,
            score: 25, // 10 (telefone) + 15 (simulou)
            lastAction: serverTimestamp(),
            ultima_acao_nome: 'Fez Simulação'
        });

        console.log("Lead atualizado com dados da calculadora.");
    } catch (e) {
        console.error("Erro ao atualizar lead na calculadora:", e);
        throw e;
    }
}

// Função para quando o Lead escolhe um kit e clica no WhatsApp
export async function atualizarLeadWhatsApp(kitEscolhido, sistemaEscolhido) {
    const leadId = Storage.getLeadId();
    if (!leadId) {
        console.error("ID não encontrado para o WhatsApp");
        return;
    }

    try {
        const leadRef = doc(db, "leads", leadId);
        await updateDoc(leadRef, {
            kitEscolhido: kitEscolhido,
            sistemaEscolhido: sistemaEscolhido,
            status: 'Negociação',
            temperatura: 'Quente',
            score: 50, // 25 + 25 (clicou whatsapp)
            lastAction: serverTimestamp(),
            ultima_acao_nome: 'Clicou WhatsApp'
        });
        console.log("Lead atualizado para WhatsApp com sucesso.");
    } catch (e) {
        console.error("Erro ao atualizar lead para WhatsApp:", e);
        throw e;
    }
}
