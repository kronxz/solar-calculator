import { captureUTM } from './utm.js';
import { criarLeadBase, atualizarLeadCalculadora } from './lead.js';
import { calcularKits } from './kits.js';
import { abrirWhatsApp } from './whatsapp.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Captura UTM na entrada
    captureUTM();

    const form = document.getElementById('calcForm');
    if (!form) return;

    const btnSimular = document.querySelector('button[onclick="calcular()"]');
    if (btnSimular) {
        // Remove onclick inline and use event listener
        btnSimular.removeAttribute('onclick');
        btnSimular.addEventListener('click', async (e) => {
            e.preventDefault();
            await simular();
        });
    }

    const inputTelefone = document.getElementById('telefone');
    if (inputTelefone) {
        // Máscara básica e criação do lead base
        inputTelefone.addEventListener('input', function (e) {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
            e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
        });

        // Quando perder o foco e tiver 11 digitos, cria Lead Base
        inputTelefone.addEventListener('blur', async () => {
            const nome = document.getElementById('nome')?.value || "Não informado";
            const telefoneLimpo = inputTelefone.value.replace(/\D/g, '');
            if (telefoneLimpo.length >= 10) {
                // Tenta criar lead base
                try {
                    await criarLeadBase(nome, inputTelefone.value);
                } catch(err) {
                    console.log("Erro silencioso ao criar lead base", err);
                }
            }
        });
    }
});

async function simular() {
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const contaDeLuz = parseFloat(document.getElementById('conta').value.replace(',', '.'));
    
    // Validations
    if (!nome || telefone.replace(/\D/g, '').length < 10 || !contaDeLuz) {
        alert("Preencha os dados corretamente para simular.");
        return;
    }

    // Calcula os Kits
    const { consumoMensal, geracaoMensal, kits } = calcularKits(contaDeLuz, 0.95);

    // Atualiza UI (Isso vai depender dos IDs exatos do HTML original, adaptando para a logica)
    mostrarResultados(kits);

    // Atualiza Lead no Firebase
    try {
        await atualizarLeadCalculadora({
            contaDeLuz,
            consumoMensal
        });
        
        // Scroll to results
        const resultSection = document.getElementById('result');
        if (resultSection) {
            resultSection.style.display = 'block';
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }
    } catch(err) {
        console.error(err);
    }
}

function mostrarResultados(kits) {
    const container = document.getElementById('result');
    if (!container) return;
    
    // Limpa a tela e renderiza
    container.innerHTML = `
        <h2 class="form-title" style="text-align:center; font-size:24px;">Qual a melhor opção para você?</h2>
        <p class="subheadline">Selecione o kit abaixo para receber o orçamento via WhatsApp</p>
    `;

    kits.forEach(k => {
        const div = document.createElement('div');
        div.className = 'kit-card';
        div.innerHTML = `
            <h3>${k.kit}</h3>
            <p><strong>Geração:</strong> ${k.geracao} kWh/mês</p>
            <p><strong>Economia:</strong> R$ ${k.economia}/mês</p>
            <p><strong>Potência:</strong> ${k.kwp} kWp (${k.placas} placas de ${k.potenciaPlaca}W)</p>
            <button class="cta whatsapp-btn">Receber Orçamento via WhatsApp</button>
        `;

        const btn = div.querySelector('.whatsapp-btn');
        btn.addEventListener('click', () => {
            btn.innerHTML = "Salvando...";
            abrirWhatsApp(k, "Microinversor");
            setTimeout(() => btn.innerHTML = "Redirecionando...", 500);
        });

        container.appendChild(div);
    });
}
