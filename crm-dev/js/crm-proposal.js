/**
 * crm-proposal.js — Abre proposta.html com dados reais do lead
 */

import { resolverKitsLead, gerarFinanciamentos } from './crm-finance.js';

export function montarPayloadProposta(lead) {
  const { kits } = resolverKitsLead(lead);
  const conta = lead.valor ?? lead.contaDeLuz ?? 0;
  const geracao = Number(lead.geracaoMensal || lead.geracao || kits?.recomendado?.geracao || 0);
  const inv = lead.investimento || kits?.recomendado?.investimento || 0;
  return {
    ...lead,
    nome: lead.nome || 'Cliente',
    telefone: lead.telefone || '',
    endereco: lead.endereco || '',
    valor: lead.valor ?? lead.contaDeLuz ?? 0,
    contaDeLuz: lead.contaDeLuz ?? lead.valor ?? 0,
    consumo: lead.consumoMensal ?? lead.consumo ?? '',
    consumoMensal: lead.consumoMensal ?? lead.consumo ?? '',
    geracao,
    geracaoMensal: geracao,
    kwp: lead.kwp || kits?.recomendado?.kwp || 0,
    placas: lead.placas || kits?.recomendado?.placas || 0,
    potenciaPlaca: lead.potenciaPlaca || 550,
    inversor: lead.inversor || lead.sistemaEscolhido || '-',
    investimento: inv,
    economia: lead.economia || kits?.recomendado?.economia || 0,
    payback: lead.payback || kits?.recomendado?.payback || 0,
    kitsDisponiveis: kits,
    kits,
    financiamentos: lead.financiamentos || gerarFinanciamentos(kits, conta),
    tarifa: lead.tarifa || 0.95,
    hsp: lead.hsp || 4.5,
    kitEscolhido: lead.kitEscolhido || '',
    sistema: lead.sistema || lead.sistemaEscolhido || '',
    utm_source: lead.utm_source || 'direto',
    utm_campaign: lead.utm_campaign || '-'
  };
}

export function abrirProposta(lead) {
  if (!lead) {
    return false;
  }

  const payload = montarPayloadProposta(lead);

  localStorage.setItem('leadSelecionado', JSON.stringify(payload));
  localStorage.setItem('geracaoMensal', String(payload.geracaoMensal || 1200));
  localStorage.setItem('nomePdf', `PROPOSTA SOLAR - ${(payload.nome || 'CLIENTE').toUpperCase()}`);

  if (payload.kitsDisponiveis) {
    localStorage.setItem('kitsDisponiveis', JSON.stringify(payload.kitsDisponiveis));
  }
  if (payload.kits) {
    localStorage.setItem('kitsCalculados', JSON.stringify(payload.kits));
  }
  if (payload.financiamentos) {
    localStorage.setItem('financiamentosLead', JSON.stringify(payload.financiamentos));
  }

  localStorage.setItem('propostaAbertaEm', new Date().toISOString());
  // open proposal page from root
  window.open('../proposta.html', '_blank');
  return true;
}
