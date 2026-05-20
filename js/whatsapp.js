import { atualizarLeadWhatsApp } from './lead.js';

const NUMERO_WHATSAPP = "5521972821094"; // Exemplo (Substituir pelo da MF Soluções)

export async function abrirWhatsApp(kit, sistema) {
    try {
        // 1. Atualiza no Firebase primeiro (REGRA CRÍTICA)
        await atualizarLeadWhatsApp(kit.kit, sistema);

        // 2. Aguarda 700ms para garantir a fluidez e persistência em webviews (Instagram, Safari)
        await new Promise(resolve => setTimeout(resolve, 700));

        // 3. Monta a mensagem
        const mensagem = `Olá, vim pelo simulador e gostaria de mais informações sobre o Kit ${kit.kit} (${sistema}) de ${kit.kwp} kWp. O investimento estimado ficou em R$ ${kit.investimento}.`;
        
        // 4. Abre o WhatsApp
        const url = `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${encodeURIComponent(mensagem)}`;
        
        // Em mobile, idealmente abrir em nova janela ou direto na mesma tab, window.open nem sempre funciona no Instagram browser
        window.location.href = url;

    } catch (e) {
        console.error("Erro ao processar redirecionamento pro WhatsApp:", e);
        alert("Ocorreu um erro ao conectar com o servidor. Tente novamente.");
    }
}
