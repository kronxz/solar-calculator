import { calcularSimulacao } from './calc.js';
import { criarLeadBase, atualizarLeadCalculadora } from '../services/leadService.js';
import { abrirWhatsApp } from './whatsapp.js';
import { captureUTM } from './utm.js';
import { salvarEvento, adicionarScore } from './analytics.js';
import { Storage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Captura UTM na entrada
    captureUTM();

    // 2. Event Listeners de UI
    const btnScrollSimulador = document.getElementById('btnScrollSimulador');
    if (btnScrollSimulador) {
        btnScrollSimulador.addEventListener('click', () => {
            const formGrid = document.querySelector('.card-form');
            if (formGrid) formGrid.scrollIntoView({ behavior: 'smooth' });
            if (typeof gtag === 'function') {
                gtag('event', 'click', { event_category: 'simulador', event_label: 'inicio_simulacao' });
            }
        });
    }

    const btnVerTelhado = document.getElementById('btnVerTelhado');
    if (btnVerTelhado) {
        btnVerTelhado.addEventListener('click', () => {
            const endereco = document.getElementById('endereco')?.value || '';
            if (endereco === "") {
                alert("Digite o endereço para visualizar o telhado.");
                return;
            }
            const mapa = "https://www.google.com/maps/search/" + encodeURIComponent(endereco);
            window.open(mapa, "_blank");
        });
    }

    const inputTelefone = document.getElementById('clienteTelefone') || document.getElementById('telefone');
    if (inputTelefone) {
        inputTelefone.addEventListener('input', function (e) {
            let val = e.target.value.replace(/\D/g, '');
            let x = val.match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');

            if (val.length === 11 && !window.telefoneSalvo) {
                window.telefoneSalvo = true;
                salvarEvento('telefone_digitado');
                adicionarScore(10);
                const enderecoInput = document.getElementById('endereco');
                if (enderecoInput) enderecoInput.focus();
            }
        });

        inputTelefone.addEventListener('blur', async () => {
            const nome = document.getElementById('clienteNome')?.value || "Não informado";
            const telefoneLimpo = inputTelefone.value.replace(/\D/g, '');
            if (telefoneLimpo.length >= 10) {
                try {
                    await criarLeadBase(nome, inputTelefone.value);
                } catch(err) {
                    console.log("Erro ao criar lead base", err);
                }
            }
        });
    }

    const btnCalcular = document.getElementById('btnCalcular');
    if (btnCalcular) {
        btnCalcular.addEventListener('click', async (e) => {
            e.preventDefault();
            if (typeof gtag === 'function') {
                gtag('event', 'click', { event_category: 'simulador', event_label: 'clicou_simular' });
            }
            await executarSimulacao();
        });
    }
});

async function executarSimulacao() {
    const nome = document.getElementById('clienteNome')?.value || document.getElementById('nome')?.value || "Não informado";
    const telefone = document.getElementById('clienteTelefone')?.value || document.getElementById('telefone')?.value || "";
    const contaDeLuzRaw = document.getElementById('conta')?.value || document.getElementById('bill')?.value || document.querySelector('input[placeholder*="conta"]')?.value;
    const contaDeLuz = parseFloat((contaDeLuzRaw || "0").replace(',', '.'));

    const tariffElement = document.getElementById('tariff');
    const tariff = tariffElement ? parseFloat(tariffElement.value) : 0.95;

    const cityElement = document.getElementById('city');
    const hsp = cityElement ? parseFloat(cityElement.value) : 4.5;

    const potenciaPlacaElement = document.getElementById('potenciaPlaca');
    const potenciaPlaca = potenciaPlacaElement ? parseFloat(potenciaPlacaElement.value) : 580;
    
    if (telefone.replace(/\D/g, '').length < 10 || !contaDeLuz) {
        alert("Preencha o telefone e o valor da conta corretamente para simular.");
        return;
    }

    // Registra evento de início da simulação
    salvarEvento('clicou_simular');
    adicionarScore(5);

    // Cria lead base apenas se ainda não existe na sessão
    // Evita disparar o flood cooldown quando o lead já foi criado no blur do telefone
    const leadJaExiste = !!Storage.getLeadId();
    if (!leadJaExiste) {
        try {
            await criarLeadBase(nome, telefone);
        } catch (err) {
            console.error("Erro ao criar lead base antes da simulação:", err);
            alert("Erro ao salvar lead. Verifique os dados e tente novamente.");
            return;
        }
    } else {
        console.log('[SIMULADOR] Lead já existe no cache, pulando criarLeadBase');
    }

    console.log('[SIMULADOR] iniciar cálculo');

    // Chama a simulação com os parâmetros dinâmicos corretos
    const { consumoMensal, geracaoMensal, kits, kitsDisponiveis } = calcularSimulacao(contaDeLuz, tariff, hsp, potenciaPlaca);
    console.log('[SIMULADOR] kits gerados:', kits.length);

    mostrarResultados(kits, contaDeLuz);

    try {
        console.log("[SIMULADOR] Kits carregados:", kitsDisponiveis);
        await atualizarLeadCalculadora({
            contaDeLuz,
            consumoMensal: Number(consumoMensal),
            geracaoMensal: Number(geracaoMensal),
            hsp,
            tarifa: tariff,
            potenciaPlaca,
            kitsDisponiveis
        });
        console.log("[SIMULADOR] Lead salvo");
        
        const resultSection = document.getElementById('result') || document.querySelector('.resultados-container');
        if (resultSection) {
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }
    } catch(err) {
        console.error("Erro ao salvar lead na calculadora:", err);
    }
}

function mostrarResultados(kits, contaDeLuz) {
    let container = document.getElementById('result') || document.querySelector('.resultados-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'result';
        document.querySelector('.container').appendChild(container);
    }
    
    // Garante que a seção de resultados está visível
    container.style.display = 'block';

    container.innerHTML = `
        <h2 class="form-title" style="text-align:center; font-size:28px; margin-top:20px; color:#22c55e;">Sua Simulação Personalizada:</h2>
        <p class="subheadline" style="text-align:center; color:#9ca3af; margin-bottom:30px; font-size:14px;">
            Encontramos os 3 melhores cenários para o seu consumo. Selecione o ideal e clique para falar direto com o engenheiro!
        </p>
        <div class="kits-wrapper" style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-top: 20px; width: 100%;"></div>
    `;

    const wrapper = container.querySelector('.kits-wrapper') || container;

    kits.forEach(k => {
        const div = document.createElement('div');
        div.className = 'kit-card';
        
        // Se for recomendado, vamos destacar premium com borda e badge
        const isRecomendado = k.kit.includes('Recomendado');
        if (isRecomendado) {
            div.style.border = '2px solid #22c55e';
            div.style.position = 'relative';
        }

        let corOverload = "#22c55e";
        let statusOverload = "Ideal (máxima eficiência)";
        if (k.overload < 90) {
            corOverload = "#f59e0b";
            statusOverload = "Subdimensionado (baixa eficiência)";
        } else if (k.overload > 130) {
            corOverload = "#ef4444";
            statusOverload = "Alto (risco de clipping)";
        }

        const economiaAnual = k.economia * 12;
        const economia25Anos = economiaAnual * 25;

        // Elemento visual do excedente de crédito
        const excedenteHtml = k.excedente > 0 
            ? `<div style="color:#22c55e; font-size:13px; font-weight:600; margin: 4px 0;">⚡ Crédito para uso futuro: R$ ${k.excedente.toFixed(0)}</div>` 
            : "";

        div.innerHTML = `
            ${isRecomendado ? `<div style="position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:#22c55e; color:#0f172a; padding:2px 12px; font-size:11px; font-weight:800; border-radius:12px; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;">Melhor Custo-Benefício ⭐</div>` : ""}
            <div style="font-size:24px; font-weight:800; color:#22c55e; margin-bottom:2px;">
                R$ ${k.economia.toFixed(0)}/mês
            </div>
            <div style="color:#9ca3af; font-size:12px; margin-bottom:12px; text-transform: uppercase; letter-spacing: 0.5px;">
                até 95% da conta eliminada
            </div>
            <div class="resultTitle" style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">${k.kit}</div>
            
            <div style="margin: 12px 0; color: #cbd5e1; font-size: 13px; line-height: 1.5; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px;">
                ${k.descricaoPlano}
            </div>

            <div style="text-align: left; font-size: 13px; color: #94a3b8; line-height: 1.8; margin-bottom: 20px;">
                📦 <strong>${k.placas} módulos</strong> de ${k.potenciaPlaca}W<br>
                📐 Potência total: <strong>${k.kwp.toFixed(2)} kWp</strong><br>
                ☀️ Geração mensal: <strong>${k.geracao.toFixed(0)} kWh/mês</strong><br>
                ${excedenteHtml}
                💰 Economia anual: <strong style="color: #ffffff;">R$ ${economiaAnual.toFixed(0)}</strong><br>
                💎 Economia em 25 anos: <strong style="color: #22c55e;">R$ ${economia25Anos.toFixed(0)}</strong><br>
                📈 Investimento estimado: <strong style="color: #ffffff;">R$ ${k.investimento.toFixed(0)}</strong><br>
                ⏱️ Retorno (Payback): <strong>${k.payback.toFixed(1)} anos</strong><br>
                🔌 Inversor sugerido: <strong>${k.inversor}</strong><br>
                <span style="color:${corOverload}; font-size:12px; display: inline-block; margin-top: 6px; font-weight: 500;">
                    ⚙️ Overload: ${k.overload.toFixed(0)}% — ${statusOverload}
                </span>
            </div>

            <button class="cta whatsapp-btn" style="width: 100%; border: none; font-weight: 700; padding: 12px 20px; border-radius: 8px; font-size: 14px; text-transform: uppercase; cursor: pointer; transition: all 0.2s;">
                🚀 Quero saber mais sobre o sistema
            </button>
        `;

        const btn = div.querySelector('.whatsapp-btn');
        btn.addEventListener('click', async () => {
            btn.innerHTML = "Aguarde...";
            btn.disabled = true;
            await abrirWhatsApp(k, "Microinversor");
            btn.innerHTML = "Redirecionando...";
        });

        wrapper.appendChild(div);
    });
}
