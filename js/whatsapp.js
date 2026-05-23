import { atualizarLeadWhatsApp, criarLeadBase } from '../services/leadService.js';
import { salvarEvento, adicionarScore } from './analytics.js';
import { Storage } from './storage.js';

const NUMERO_WHATSAPP = "5521972381004"; // Telefone Oficial da MF Soluções

export async function abrirWhatsApp(kit, sistema) {
    try {
        // Registra evento de clique no WhatsApp e adiciona score
        salvarEvento('clicou_whatsapp');
        adicionarScore(25);

        const nome = document.getElementById('clienteNome')?.value || document.getElementById('nome')?.value || 'Não informado';
        const telefone = document.getElementById('clienteTelefone')?.value || document.getElementById('telefone')?.value || '';

        if (!Storage.getLeadId()) {
            if (telefone.replace(/\D/g, '').length >= 10) {
                await criarLeadBase(nome, telefone);
            } else {
                throw new Error('Telefone inválido para salvar lead antes do WhatsApp');
            }
        }

        // 1. Atualiza no Firebase primeiro (REGRA CRÍTICA para persistência no mobile)
        await atualizarLeadWhatsApp(kit, sistema);

        // 2. Aguarda 700ms para garantir a fluidez e persistência em webviews (Instagram, Safari)
        await new Promise(resolve => setTimeout(resolve, 700));

        // 3. Monta a mensagem
        const mensagem = `Olá, vim pelo simulador e gostaria de mais informações sobre o Kit ${kit.kit || kit.nome} (${sistema}) de ${kit.kwp} kWp. O investimento estimado ficou em R$ ${kit.investimento}.`;
        
        // 4. Abre o WhatsApp
        const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
        
        // Em mobile, idealmente abrir na mesma tab, pois window.open falha no webview do Instagram/Safari
        window.location.href = url;

    } catch (e) {
        console.error("Erro ao processar redirecionamento pro WhatsApp:", e);
        alert("Ocorreu um erro ao conectar com o servidor. Tente novamente.");
    }
}
