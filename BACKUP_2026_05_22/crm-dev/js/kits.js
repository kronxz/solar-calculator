import { Storage } from './storage.js';

// Função utilitária para padronizar todos os kits de acordo com a regra
export function criarKitPadrao(
    sistema,
    kitNome,
    kwp,
    geracao,
    economia,
    investimento,
    payback,
    inversor,
    overload,
    potenciaPlaca,
    placas
) {
    return {
        sistema: sistema,
        kit: kitNome,
        kwp: kwp,
        geracao: geracao,
        economia: economia,
        investimento: investimento,
        payback: payback,
        inversor: inversor,
        overload: overload,
        potenciaPlaca: potenciaPlaca,
        placas: placas
    };
}

// Lógica de investimento escalonado real da MF Soluções
export function calculateInvestment(kwp) {
    kwp = parseFloat(kwp);
    // MICRO SISTEMAS
    if (kwp <= 4) {
        return kwp * 3600;
    }
    // RESIDENCIAL PADRÃO
    if (kwp <= 8) {
        return kwp * 3400;
    }
    // RESIDENCIAL MÉDIO
    if (kwp <= 12) {
        return kwp * 3200;
    }
    // RESIDENCIAL PREMIUM
    if (kwp <= 20) {
        return kwp * 3000;
    }
    // COMERCIAL
    return kwp * 2850;
}

// Inversor sugerido real da MF Soluções
export function inverterSuggestion(kwp) {
    let alvo = kwp / 1.15; // mira em ~115% de overload
    if (alvo <= 3) return "3 kW";
    if (alvo <= 5) return "5 kW";
    if (alvo <= 8) return "8 kW";
    if (alvo <= 10) return "10 kW";
    if (alvo <= 12) return "12 kW";
    if (alvo <= 15) return "15 kW";
    if (alvo <= 20) return "20 kW";
    return "25 kW";
}

// Lógica de cálculo (adaptada do código original da MF Soluções)
export function calcularKits(contaDeLuz, tariff = 0.95, hsp = 4.5, potenciaPlaca = 580) {
    // Garantir tipos numéricos
    contaDeLuz = parseFloat(contaDeLuz) || 0;
    tariff = parseFloat(tariff) || 0.95;
    hsp = parseFloat(hsp) || 4.5;
    potenciaPlaca = parseFloat(potenciaPlaca) || 580;

    const consumoMensal = (contaDeLuz / tariff).toFixed(0);
    
    // FATOR MÉDIO BRASIL (MODELO AZUME)
    const fatorGeracao = 107;
    
    // DIMENSIONAMENTO SIMPLIFICADO
    const baseKwp = consumoMensal / fatorGeracao;
    
    // 1. Kit Essencial (80% da necessidade)
    const kwpEssencialBase = baseKwp * 0.8;
    const placasEssencial = Math.ceil((kwpEssencialBase * 1000) / potenciaPlaca);
    const kwpEssencialReal = (placasEssencial * potenciaPlaca) / 1000;
    const geracaoEssencial = kwpEssencialReal * hsp * 30 * 0.80;
    const economiaEssencial = geracaoEssencial * tariff;
    const excedenteEssencial = Math.max(0, economiaEssencial - contaDeLuz);
    const investimentoEssencial = calculateInvestment(kwpEssencialReal);
    const paybackEssencial = investimentoEssencial / (economiaEssencial * 12);
    const inversorEssencial = inverterSuggestion(kwpEssencialReal);
    const overloadEssencial = (kwpEssencialReal / parseFloat(inversorEssencial)) * 100;

    const kitEssencial = criarKitPadrao(
        "Microinversor",
        "Essencial",
        Number(kwpEssencialReal.toFixed(2)),
        Number(geracaoEssencial.toFixed(0)),
        Number(economiaEssencial.toFixed(0)),
        Number(investimentoEssencial.toFixed(0)),
        Number(paybackEssencial.toFixed(1)),
        inversorEssencial,
        Number(overloadEssencial.toFixed(0)),
        potenciaPlaca,
        placasEssencial
    );
    // Campos adicionais úteis
    kitEssencial.descricaoPlano = "✔ Menor investimento<br>✔ Resolve seu consumo atual";
    kitEssencial.excedente = Number(excedenteEssencial.toFixed(0));

    // 2. Kit Recomendado (110% da necessidade)
    const kwpRecomendadoBase = baseKwp * 1.1;
    const placasRecomendado = Math.ceil((kwpRecomendadoBase * 1000) / potenciaPlaca);
    const kwpRecomendadoReal = (placasRecomendado * potenciaPlaca) / 1000;
    const geracaoRecomendado = kwpRecomendadoReal * hsp * 30 * 0.80;
    const economiaRecomendado = geracaoRecomendado * tariff;
    const excedenteRecomendado = Math.max(0, economiaRecomendado - contaDeLuz);
    const investimentoRecomendado = calculateInvestment(kwpRecomendadoReal);
    const paybackRecomendado = investimentoRecomendado / (economiaRecomendado * 12);
    const inversorRecomendado = inverterSuggestion(kwpRecomendadoReal);
    const overloadRecomendado = (kwpRecomendadoReal / parseFloat(inversorRecomendado)) * 100;

    const kitRecomendado = criarKitPadrao(
        "Microinversor",
        "Recomendado ⭐",
        Number(kwpRecomendadoReal.toFixed(2)),
        Number(geracaoRecomendado.toFixed(0)),
        Number(economiaRecomendado.toFixed(0)),
        Number(investimentoRecomendado.toFixed(0)),
        Number(paybackRecomendado.toFixed(1)),
        inversorRecomendado,
        Number(overloadRecomendado.toFixed(0)),
        potenciaPlaca,
        placasRecomendado
    );
    kitRecomendado.descricaoPlano = "✔ Melhor custo-benefício<br>✔ Mais estabilidade<br>✔ Preparado para aumento de consumo";
    kitRecomendado.excedente = Number(excedenteRecomendado.toFixed(0));

    // 3. Kit Premium (130% da necessidade)
    const kwpPremiumBase = baseKwp * 1.3;
    const placasPremium = Math.ceil((kwpPremiumBase * 1000) / potenciaPlaca);
    const kwpPremiumReal = (placasPremium * potenciaPlaca) / 1000;
    const geracaoPremium = kwpPremiumReal * hsp * 30 * 0.80;
    const economiaPremium = geracaoPremium * tariff;
    const excedentePremium = Math.max(0, economiaPremium - contaDeLuz);
    const investimentoPremium = calculateInvestment(kwpPremiumReal);
    const paybackPremium = investimentoPremium / (economiaPremium * 12);
    const inversorPremium = inverterSuggestion(kwpPremiumReal);
    const overloadPremium = (kwpPremiumReal / parseFloat(inversorPremium)) * 100;

    const kitPremium = criarKitPadrao(
        "Microinversor",
        "Premium",
        Number(kwpPremiumReal.toFixed(2)),
        Number(geracaoPremium.toFixed(0)),
        Number(economiaPremium.toFixed(0)),
        Number(investimentoPremium.toFixed(0)),
        Number(paybackPremium.toFixed(1)),
        inversorPremium,
        Number(overloadPremium.toFixed(0)),
        potenciaPlaca,
        placasPremium
    );
    kitPremium.descricaoPlano = "✔ Máxima performance<br>✔ Maior geração<br>✔ Ideal para crescimento futuro";
    kitPremium.excedente = Number(excedentePremium.toFixed(0));

    const kits = [kitEssencial, kitRecomendado, kitPremium];

    // Mapear no formato dicionário para o kitsDisponiveis do CRM e window.kitsCalculados legado
    const kitsDisponiveis = {
        essencial: kitEssencial,
        recomendado: kitRecomendado,
        premium: kitPremium
    };

    // Sincronizar com window escopo global e local storage
    window.kitsCalculados = kitsDisponiveis;
    localStorage.setItem("kitsCalculados", JSON.stringify(kitsDisponiveis));
    
    Storage.setKits(kits);
    Storage.setKitsDisponiveis(kitsDisponiveis);

    return {
        consumoMensal,
        geracaoMensal: geracaoRecomendado,
        kits,
        kitsDisponiveis
    };
}
