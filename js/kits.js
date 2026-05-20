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

// Lógica de cálculo (adaptada do código original)
// As regras exatas de cálculo da MF Soluções podem ser injetadas aqui
export function calcularKits(contaDeLuz, tarifa) {
    const consumoMensal = (contaDeLuz / tarifa).toFixed(0);
    
    // Configurações base
    const potenciaPlaca = 580; // W
    const horasSol = 4.5;
    const taxaDesempenho = 0.8;
    
    // Potência necessária
    const kwpNecessario = (consumoMensal / (30 * horasSol * taxaDesempenho));
    const qtdPlacas = Math.ceil((kwpNecessario * 1000) / potenciaPlaca);
    const kwpReal = (qtdPlacas * potenciaPlaca) / 1000;
    
    // Retorno estimado
    const geracaoMensal = kwpReal * 30 * horasSol * taxaDesempenho;
    const economiaMensal = geracaoMensal * tarifa;
    
    // Valores Fictícios (Substitua pela lógica real da MF Soluções)
    const valorBase = kwpReal * 3000; 

    // Cria os kits usando o Padrão Oficial
    const kitEssencial = criarKitPadrao(
        "Microinversor",
        "Essencial",
        kwpReal.toFixed(2),
        geracaoMensal.toFixed(0),
        economiaMensal.toFixed(2),
        (valorBase).toFixed(2),
        "45", // meses
        "Inversor String Padrão",
        "20%",
        potenciaPlaca,
        qtdPlacas
    );

    const kitRecomendado = criarKitPadrao(
        "Microinversor",
        "Recomendado ⭐",
        kwpReal.toFixed(2),
        geracaoMensal.toFixed(0),
        economiaMensal.toFixed(2),
        (valorBase * 1.1).toFixed(2),
        "48",
        "Microinversor Hoymiles",
        "25%",
        potenciaPlaca,
        qtdPlacas
    );

    const kitPremium = criarKitPadrao(
        "Microinversor",
        "Premium",
        kwpReal.toFixed(2),
        geracaoMensal.toFixed(0),
        economiaMensal.toFixed(2),
        (valorBase * 1.25).toFixed(2),
        "52",
        "Microinversor Enphase",
        "30%",
        potenciaPlaca,
        qtdPlacas
    );

    const kits = [kitEssencial, kitRecomendado, kitPremium];
    
    // Salva no storage (window e localStorage sincronizados)
    window.kitsCalculados = kits;
    Storage.setKits(kits);

    return {
        consumoMensal,
        geracaoMensal,
        kits
    };
}
