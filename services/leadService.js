import { db, collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where, limit } from '../firebase/config.js';
import { Storage } from '../js/storage.js';
import { getUTM } from '../js/utm.js';
import {
    validarLeadBase,
    validarDadosCalculadora,
    validarKitWhatsApp,
    assertValido
} from './validationService.js';
import {
    registrarEventoTimeline,
    resolverTipoSimulacao,
    TIMELINE_TIPOS
} from './timelineService.js';
import { aplicarScoreIncremental, sincronizarScoreCache } from './scoreService.js';

/** Timeline não bloqueia o fluxo principal */
function timeline(leadId, tipo, meta) {
    if (!leadId) return;
    registrarEventoTimeline(leadId, tipo, meta);
}

/** Score incremental — não bloqueia o fluxo principal */
function score(leadId, tipo) {
    if (!leadId) return;
    aplicarScoreIncremental(leadId, tipo);
}

export async function carregarLeads() {
    try {
        const snapshot = await getDocs(collection(db, "leads"));
        const leads = [];
        snapshot.forEach((docSnap) => {
            leads.push({ id: docSnap.id, ...docSnap.data() });
        });
        return leads;
    } catch (e) {
        console.error("Erro ao carregar leads:", e);
        throw e;
    }
}

/**
 * Busca 1 lead por telefoneDigitos (1 read no máximo).
 */
async function buscarLeadPorTelefoneDigitos(telefoneDigitos) {
    const q = query(
        collection(db, 'leads'),
        where('telefoneDigitos', '==', telefoneDigitos),
        limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Reativa lead existente sem criar documento novo.
 */
async function reutilizarLeadExistente(leadId, dadosValidados) {
    const leadRef = doc(db, 'leads', leadId);
    await updateDoc(leadRef, {
        lastAction: serverTimestamp(),
        ultima_acao_nome: 'Deixou Contato'
    });
    Storage.setLeadId(leadId);
    Storage.setTelefoneDigitos(dadosValidados.telefoneDigitos);
    console.log('[leadService] Lead reutilizado (dedupe):', leadId);
    timeline(leadId, TIMELINE_TIPOS.RETORNOU_AO_SITE);
    score(leadId, TIMELINE_TIPOS.RETORNOU_AO_SITE);
    return leadId;
}

// Função para criar o lead BASE (Nome + Telefone)
export async function criarLeadBase(nome, telefone) {
    try {
        const dadosValidados = assertValido(validarLeadBase({ nome, telefone }));
        const { telefoneDigitos } = dadosValidados;
        console.log('[leadService] Validação OK — criar lead base', telefoneDigitos);

        // Fast path: mesmo telefone na sessão local — 0 reads
        const leadIdCache = Storage.getLeadId();
        const telefoneCache = Storage.getTelefoneDigitos();
        if (leadIdCache && telefoneCache === telefoneDigitos) {
            return await reutilizarLeadExistente(leadIdCache, dadosValidados);
        }

        // Dedupe Firestore por telefoneDigitos — 1 read
        const existente = await buscarLeadPorTelefoneDigitos(telefoneDigitos);
        if (existente?.id) {
            sincronizarScoreCache(existente.id, existente.score);
            return await reutilizarLeadExistente(existente.id, dadosValidados);
        }

        const utm = getUTM();
        const leadData = {
            nome: dadosValidados.nome,
            telefone: dadosValidados.telefone,
            telefoneDigitos,
            status: 'Novo',
            score: 0,
            temperatura: 'Fria',
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
        console.log('[leadService] Lead base criado (novo):', docRef.id);

        Storage.setLeadId(docRef.id);
        Storage.setTelefoneDigitos(telefoneDigitos);
        timeline(docRef.id, TIMELINE_TIPOS.CRIOU_LEAD, { telefoneDigitos });
        score(docRef.id, TIMELINE_TIPOS.CRIOU_LEAD);
        return docRef.id;

    } catch (e) {
        if (e.code) {
            console.warn('[leadService] Lead base bloqueado:', e.code, e.message);
        } else {
            console.error('[leadService] Erro ao criar lead base:', e);
        }
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

        const dadosValidados = assertValido(
            validarDadosCalculadora({
                ...dadosCalculo,
                leadId,
                telefoneDigitos: Storage.getTelefoneDigitos()
            })
        );
        console.log('[leadService] Validação OK — atualizar calculadora', leadId);

        // Recupera kits para salvar no lead
        const kits = Storage.getKits();

        await updateDoc(leadRef, {
            ...dadosValidados,
            kits: kits,
            valor: Number(dadosValidados.contaDeLuz || 0),
            consumo: Number(dadosValidados.consumoMensal || 0),
            lastAction: serverTimestamp(),
            ultima_acao_nome: 'Fez Simulação'
        });

        console.log("Lead atualizado com dados da calculadora.");
        const tipoSimulacao = resolverTipoSimulacao(leadId);
        timeline(leadId, tipoSimulacao, { contaDeLuz: dadosValidados.contaDeLuz });
        score(leadId, tipoSimulacao);
    } catch (e) {
        if (e.code) {
            console.warn('[leadService] Calculadora bloqueada:', e.code, e.message);
        } else {
            console.error('[leadService] Erro ao atualizar lead na calculadora:', e);
        }
        throw e;
    }
}

// Função para quando o Lead escolhe um kit e clica no WhatsApp
export async function atualizarLeadWhatsApp(kit, sistemaEscolhido) {
    const leadId = Storage.getLeadId();
    if (!leadId) {
        console.error("ID não encontrado para o WhatsApp");
        return;
    }

    try {
        const kitValidado = assertValido(validarKitWhatsApp(kit));
        console.log('[leadService] Validação OK — atualizar WhatsApp', leadId);

        const leadRef = doc(db, "leads", leadId);
        await updateDoc(leadRef, {
            kitEscolhido: kitValidado.kit || kitValidado.nome || "",
            sistemaEscolhido: sistemaEscolhido || kitValidado.sistema || "Microinversor",
            investimento: Number(kitValidado.investimento || 0),
            geracao: Number(kitValidado.geracao || 0),
            economia: Number(kitValidado.economia || 0),
            kwp: Number(kitValidado.kwp || 0),
            placas: Number(kitValidado.placas || 0),
            inversor: kitValidado.inversor || "",
            potenciaPlaca: Number(kitValidado.potenciaPlaca || 0),
            overload: Number(kitValidado.overload || 0),
            payback: Number(kitValidado.payback || 0),
            status: 'Negociação',
            lastAction: serverTimestamp(),
            ultima_acao_nome: 'Clicou WhatsApp',
            atualizadoEm: new Date().toISOString()
        });
        console.log("Lead atualizado para WhatsApp com sucesso com detalhes do Kit.");
        timeline(leadId, TIMELINE_TIPOS.ESCOLHEU_KIT, {
            kit: kitValidado.kit,
            kwp: kitValidado.kwp
        });
        score(leadId, TIMELINE_TIPOS.ESCOLHEU_KIT);
        timeline(leadId, TIMELINE_TIPOS.CLICOU_WHATSAPP, {
            sistema: sistemaEscolhido || kitValidado.sistema
        });
        score(leadId, TIMELINE_TIPOS.CLICOU_WHATSAPP);
    } catch (e) {
        if (e.code) {
            console.warn('[leadService] WhatsApp bloqueado:', e.code, e.message);
        } else {
            console.error('[leadService] Erro ao atualizar lead para WhatsApp:', e);
        }
        throw e;
    }
}
