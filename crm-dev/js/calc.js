import { calcularKits } from './kits.js';

export function calcularSimulacao(contaDeLuz, tarifa = 0.95, hsp = 4.5, potenciaPlaca = 580) {
    // Calcula os Kits baseado nos inputs dinâmicos do usuário
    const { consumoMensal, geracaoMensal, kits, kitsDisponiveis } = calcularKits(contaDeLuz, tarifa, hsp, potenciaPlaca);
    
    return {
        consumoMensal,
        geracaoMensal,
        kits,
        kitsDisponiveis
    };
}
