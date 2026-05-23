/**
 * validationService.js — Validação e sanitização do Lead Engine.
 * Camada pura (sem Firebase). Rate-limit via storageService.
 */

import {
    getFloodMap,
    setFloodMap,
    getFloodSessao,
    setFloodSessao
} from './storageService.js';

const LIMITES = {
    nome: { min: 2, max: 80 },
    telefone: { minDigits: 10, maxDigits: 11 },
    textoGenerico: { max: 500 },
    contaDeLuz: { min: 50, max: 50_000 },
    tarifa: { min: 0.1, max: 5 },
    hsp: { min: 3, max: 7 },
    potenciaPlaca: { min: 400, max: 800 },
    investimento: { min: 0, max: 2_000_000 },
    kwp: { min: 0, max: 500 },
    floodIntervalMs: 30_000,
    maxTentativasPorSessao: 20
};

/** DDDs válidos no Brasil (ANATEL) */
const DDD_VALIDOS = new Set([
    '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '24', '27', '28',
    '31', '32', '33', '34', '35', '37', '38',
    '41', '42', '43', '44', '45', '46',
    '47', '48', '49',
    '51', '53', '54', '55',
    '61', '62', '63', '64', '65', '66', '67', '68', '69',
    '71', '73', '74', '75', '77', '79',
    '81', '82', '83', '84', '85', '86', '87', '88', '89',
    '91', '92', '93', '94', '95', '96', '97', '98', '99'
]);

const PADROES_PERIGOSOS = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /\{\{|\}\}/,
    /[\x00-\x08\x0B\x0C\x0E-\x1F]/
];

const PADROES_SPAM_TEXTO = [
    /(.)\1{6,}/,
    /(https?:\/\/|www\.)/i
];

/** Nomes aceitos quando o usuário ainda não preencheu (compatível com ui.js atual) */
const NOMES_PLACEHOLDER = new Set(['não informado', 'nao informado']);

function falha(code, message) {
    return { ok: false, code, message };
}

function sucesso(value) {
    return { ok: true, value };
}

/** Remove caracteres não numéricos do telefone */
export function extrairDigitosTelefone(telefone) {
    return String(telefone ?? '').replace(/\D/g, '');
}

/** Sanitiza texto livre e bloqueia padrões perigosos */
export function sanitizarTexto(valor, maxLen = LIMITES.textoGenerico.max) {
    if (valor == null) return '';
    let s = String(valor).trim().normalize('NFC');
    if (s.length > maxLen) s = s.slice(0, maxLen);
    for (const re of PADROES_PERIGOSOS) {
        if (re.test(s)) return '';
    }
    return s.replace(/\s+/g, ' ');
}

/** Valida nome do lead */
export function validarNome(nome) {
    const bruto = sanitizarTexto(nome, LIMITES.nome.max);
    if (!bruto) {
        return falha('NOME_OBRIGATORIO', 'Informe um nome válido.');
    }

    const normalizado = bruto.toLowerCase();
    if (!NOMES_PLACEHOLDER.has(normalizado)) {
        if (bruto.length < LIMITES.nome.min) {
            return falha('NOME_CURTO', `Nome deve ter pelo menos ${LIMITES.nome.min} caracteres.`);
        }
        if (!/^[\p{L}\p{M}'\s.-]+$/u.test(bruto)) {
            return falha('NOME_CARACTERES', 'Nome contém caracteres não permitidos.');
        }
        for (const re of PADROES_SPAM_TEXTO) {
            if (re.test(bruto)) return falha('NOME_SPAM', 'Nome inválido.');
        }
    }

    return sucesso(bruto);
}

/** Valida telefone brasileiro (10 ou 11 dígitos) */
export function validarTelefoneBR(telefone) {
    const digitos = extrairDigitosTelefone(telefone);

    if (digitos.length < LIMITES.telefone.minDigits || digitos.length > LIMITES.telefone.maxDigits) {
        return falha('TELEFONE_TAMANHO', 'Telefone deve ter 10 ou 11 dígitos (BR).');
    }

    const ddd = digitos.slice(0, 2);
    if (!DDD_VALIDOS.has(ddd)) {
        return falha('TELEFONE_DDD', 'DDD inválido.');
    }

    if (digitos.length === 11 && digitos[2] !== '9') {
        // Aceita números 11 dígitos que vêm com máscara/country code confusa,
        // mas ainda bloqueia casos claramente inválidos por spam.
        console.warn('[validarTelefoneBR] número 11 dígitos sem 9 após o DDD, compatibilidade habilitada:', digitos);
    }

    if (digitos.length === 10 && !'2345678'.includes(digitos[2])) {
        return falha('TELEFONE_FIXO', 'Telefone fixo inválido.');
    }

    if (/^(\d)\1{7,}$/.test(digitos)) {
        return falha('TELEFONE_SPAM', 'Número de telefone inválido.');
    }

    const formatado =
        digitos.length === 11
            ? `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
            : `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;

    return sucesso({ digitos, formatado });
}

/** Valida número dentro de faixa */
export function validarNumero(valor, { min, max, campo = 'valor' }) {
    const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? '').replace(',', '.'));
    if (!Number.isFinite(n)) {
        return falha('NUMERO_INVALIDO', `${campo} inválido.`);
    }
    if (n < min || n > max) {
        return falha('NUMERO_FORA_FAIXA', `${campo} deve estar entre ${min} e ${max}.`);
    }
    return sucesso(n);
}

function validarNumeroOpcional(valor, min, max) {
    if (valor == null || valor === '') return null;
    const r = validarNumero(valor, { min, max, campo: 'métrica' });
    return r.ok ? r.value : null;
}

/**
 * Anti-flood: impede a mesma ação+fingerprint em menos de 30 segundos.
 * @param {string} acao - ex: criar_lead_base
 * @param {string} fingerprint - ex: criar_lead:21999999999
 */
export function verificarFlood(acao, fingerprint) {
    if (acao !== 'criar_lead_base') {
        return sucesso(true);
    }

    const agora = Date.now();
    const COOLDOWN_LEAD = 20_000; // 20s

    const ultimo = getFloodMap(acao);
    const ultimaChave = ultimo[fingerprint];

    if (ultimaChave && agora - ultimaChave < COOLDOWN_LEAD) {
        const segundos = Math.ceil((COOLDOWN_LEAD - (agora - ultimaChave)) / 1000);
        return falha('FLOOD_INTERVALO', `Aguarde ${segundos}s antes de enviar novamente.`);
    }

    const sessao = getFloodSessao();
    if (agora - sessao.resetAt > 60 * 60 * 1000) {
        sessao.count = 0;
        sessao.resetAt = agora;
    }
    sessao.count += 1;
    setFloodSessao(sessao);

    if (sessao.count > LIMITES.maxTentativasPorSessao) {
        return falha('FLOOD_SESSAO', 'Muitas tentativas. Recarregue a página e tente mais tarde.');
    }

    ultimo[fingerprint] = agora;
    setFloodMap(acao, ultimo);

    return sucesso(true);
}

/** Pacote: criação de lead base (nome + telefone) */
export function validarLeadBase({ nome, telefone }) {
    const rNome = validarNome(nome);
    if (!rNome.ok) return rNome;

    const telefoneNormalizado = String(telefone ?? '').replace(/\D/g, '');
    const rTel = validarTelefoneBR(telefoneNormalizado);
    if (!rTel.ok) return rTel;

    const rFlood = verificarFlood('criar_lead_base', `criar_lead:${rTel.value.digitos}`);
    if (!rFlood.ok) return rFlood;

    return sucesso({
        nome: rNome.value,
        telefone: rTel.value.formatado,
        telefoneDigitos: rTel.value.digitos
    });
}

/** Pacote: dados da calculadora */
export function validarDadosCalculadora(dados = {}) {
    const rConta = validarNumero(dados.contaDeLuz, {
        min: LIMITES.contaDeLuz.min,
        max: LIMITES.contaDeLuz.max,
        campo: 'Conta de luz'
    });
    if (!rConta.ok) return rConta;

    const rTarifa = validarNumero(dados.tarifa, {
        min: LIMITES.tarifa.min,
        max: LIMITES.tarifa.max,
        campo: 'Tarifa'
    });
    if (!rTarifa.ok) return rTarifa;

    const rHsp = validarNumero(dados.hsp, {
        min: LIMITES.hsp.min,
        max: LIMITES.hsp.max,
        campo: 'HSP'
    });
    if (!rHsp.ok) return rHsp;

    const rPlaca = validarNumero(dados.potenciaPlaca, {
        min: LIMITES.potenciaPlaca.min,
        max: LIMITES.potenciaPlaca.max,
        campo: 'Potência da placa'
    });
    if (!rPlaca.ok) return rPlaca;

    const fingerprint = dados.telefoneDigitos
        ? `simular:${dados.telefoneDigitos}`
        : `simular:${dados.leadId || 'anon'}`;

    const rFlood = verificarFlood('atualizar_calculadora', fingerprint);
    if (!rFlood.ok) return rFlood;

    return sucesso({
        contaDeLuz: rConta.value,
        tarifa: rTarifa.value,
        hsp: rHsp.value,
        potenciaPlaca: rPlaca.value,
        consumoMensal: validarNumeroOpcional(dados.consumoMensal, 0, 50_000),
        geracaoMensal: validarNumeroOpcional(dados.geracaoMensal, 0, 50_000)
    });
}

/** Pacote: kit selecionado no WhatsApp */
export function validarKitWhatsApp(kit = {}) {
    const nomeKit = sanitizarTexto(kit.kit || kit.nome || '', 120);
    if (!nomeKit) {
        return falha('KIT_OBRIGATORIO', 'Kit inválido.');
    }

    const rInvestimento = validarNumero(kit.investimento ?? 0, {
        min: LIMITES.investimento.min,
        max: LIMITES.investimento.max,
        campo: 'Investimento'
    });
    if (!rInvestimento.ok) return rInvestimento;

    const rKwp = validarNumero(kit.kwp ?? 0, {
        min: LIMITES.kwp.min,
        max: LIMITES.kwp.max,
        campo: 'kWp'
    });
    if (!rKwp.ok) return rKwp;

    const rFlood = verificarFlood('whatsapp_kit', `whatsapp:${nomeKit.slice(0, 20)}`);
    if (!rFlood.ok) return rFlood;

    return sucesso({
        ...kit,
        kit: nomeKit,
        nome: nomeKit,
        investimento: rInvestimento.value,
        kwp: rKwp.value
    });
}

/**
 * Interrompe o fluxo do leadService quando a validação falha.
 * @throws {Error} com propriedade .code
 */
export function assertValido(resultado) {
    if (!resultado?.ok) {
        const err = new Error(resultado?.message || 'Validação falhou');
        err.code = resultado?.code || 'VALIDACAO_FALHOU';
        throw err;
    }
    return resultado.value;
}
