import { renderEconomyChart } from './proposal-charts.js';

function readPayload(){
  try { return JSON.parse(localStorage.getItem('leadSelecionado') || 'null'); }
  catch (e) { return null; }
}

function setText(id, val){
  const el = document.getElementById(id);
  if(!el) return;
  if(val == null) el.textContent = '—';
  else if(typeof val === 'object') el.textContent = JSON.stringify(val);
  else el.textContent = String(val);
}
function formatCurrency(value){ return Number(value || 0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function normalizeEconomyData(data){
  const years = Array.isArray(data?.years) ? data.years : Array.isArray(data?.labels) ? data.labels : [1,2,3,4,5];
  const savings = Array.isArray(data?.savings) ? data.savings : Array.isArray(data?.values) ? data.values : [0,0,0,0,0];
  return { years, savings };
}

function renderKit(k){
  const el = document.getElementById('p-kit');
  if(!el) return;
  if(!k || typeof k !== 'object'){
    el.innerHTML = `<div class="kit-empty">Kit recomendado não disponível.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="kit-details">
      <div><span>Kit</span><strong>${k.nome || 'Recomendado'}</strong></div>
      <div><span>Placas</span><strong>${k.placas || '-'}</strong></div>
      <div><span>Inversor</span><strong>${k.inversor || '-'}</strong></div>
      <div><span>KWP</span><strong>${k.kwp || '-'}</strong></div>
      <div><span>Investimento</span><strong>R$ ${formatCurrency(k.investimento || k.valor || 0)}</strong></div>
      <div><span>Payback</span><strong>${k.payback ? `${k.payback} meses` : '-'}</strong></div>
      <div><span>Economia</span><strong>R$ ${formatCurrency(k.economia || k.savings || 0)}</strong></div>
    </div>
  `;
}

function renderFinanciamento(f){
  const el = document.getElementById('p-financiamento');
  if(!el) return;
  const items = Array.isArray(f) ? f : (f && typeof f === 'object' ? Object.values(f) : []);
  if(!items.length){ el.innerHTML = '<div class="financing-row"><span>Sem financiamento disponível</span></div>'; return; }
  el.innerHTML = items.map(item => {
    if(item == null) return '<div class="financing-row"><span>Financiamento inválido</span></div>';
    if(typeof item !== 'object'){
      return `<div class="financing-row"><span>${String(item)}</span></div>`;
    }
    const parcela = item.parcelas || item.parcela || item.cuotas || item.parcelamento || '-';
    const valor = item.valorParcela || item.parcela || item.valor || item.total || 0;
    const taxa = item.taxa || item.juros || item.taxaJuros || '';
    const title = item.tipo || item.nome || item.titulo || 'Financiamento';
    return `
      <div class="financing-row">
        <div><strong>${title}</strong></div>
        <div>${parcela}x de R$ ${formatCurrency(valor)}</div>
        ${taxa ? `<div>${taxa}</div>` : ''}
      </div>
    `;
  }).join('');
}

function renderAdditionalKits(payload){
  const el = document.getElementById('p-kits-adicionais');
  if(!el) return;
  let kits = payload.kits || payload.kitsAdicionais || payload.additionalKits;
  if(!kits || typeof kits !== 'object'){ el.innerHTML = '<div class="kit-empty">Nenhum kit adicional disponível.</div>'; return; }
  if(Array.isArray(kits)){
    kits = kits.reduce((acc, kit, index) => {
      acc[`kit_${index + 1}`] = kit;
      return acc;
    }, {});
  }

  const selected = payload.kitEscolhido || payload.kitSelecionado || 'recomendado';
  const entries = Object.entries(kits).filter(([key]) => key !== selected && key !== 'recomendado');
  if(!entries.length){ el.innerHTML = '<div class="kit-empty">Nenhum kit adicional disponível.</div>'; return; }

  el.innerHTML = entries.map(([key, kit]) => {
    if(!kit || typeof kit !== 'object'){
      return `<div class="additional-kit-card"><div class="kit-line"><strong>${String(key)}</strong></div><div class="kit-line">Dados indisponíveis</div></div>`;
    }
    const title = kit.nome || kit.titulo || key.replace(/_/g, ' ').toUpperCase();
    return `
      <div class="additional-kit-card">
        <div class="kit-line"><strong>${title}</strong></div>
        <div class="kit-line">Placas: ${kit.placas || kit.quantidadePlacas || '-'}</div>
        <div class="kit-line">KWP: ${kit.kwp || kit.potencia || '-'}</div>
        <div class="kit-line">Investimento: R$ ${formatCurrency(kit.investimento || kit.valor || kit.total || 0)}</div>
        <div class="kit-line">Economia: R$ ${formatCurrency(kit.economia || kit.savings || 0)}</div>
        <div class="kit-line">Payback: ${kit.payback || kit.tempoRetorno ? `${kit.payback || kit.tempoRetorno} meses` : '-'}</div>
      </div>
    `;
  }).join('');
}

function chooseKit(payload){
  const selected = payload.kitEscolhido || payload.kitSelecionado || payload.kit || 'recomendado';
  if(selected && payload.kits?.[selected]) return payload.kits[selected];
  if(selected && payload.kits?.[selected.toLowerCase()]) return payload.kits[selected.toLowerCase()];
  if(payload.kits?.recomendado) return payload.kits.recomendado;
  if(payload.kits?.essencial) return payload.kits.essencial;
  if(payload.kits?.premium) return payload.kits.premium;
  if(Array.isArray(payload.kits) && payload.kits.length) return payload.kits[0];
  return null;
}

function populate(payload){
  if(!payload) return;
  setText('p-title-main', 'PROPOSTA');
  setText('p-subtitle', payload.tipo || 'Comercial');

  setText('p-nome-cliente', payload.nome || '—');
  setText('p-endereco', payload.endereco || payload.rua || '—');
  setText('p-cidade', payload.cidade || payload.cidadeCliente || payload.cidadeEndereco || '—');
  setText('p-telefone', payload.telefone || payload.celular || payload.telefoneContato || '—');
  setText('p-propostaId-cover', payload.propostaId || payload.id || '—');
  setText('p-propostaId-table', payload.propostaId || payload.id || '—');
  setText('p-validade-cover', payload.validade || '30 dias');
  setText('p-validade-table', payload.validade || '30 dias');
  setText('p-data', payload.data || payload.dataProposta || payload.createdAt || payload.dataGeracao || new Date().toLocaleDateString('pt-BR'));
  setText('p-vendedor-cover', payload.vendedor || payload.vendedorNome || payload.responsavel || payload.vendedorResponsavel || '—');
  setText('p-vendedor-footer', payload.vendedor || payload.vendedorNome || payload.responsavel || payload.vendedorResponsavel || '—');

  const consumo = payload.consumoMensal || payload.consumo || payload.consumoReal || payload.consumoEstimado || '—';
  const geracao = payload.geracaoMensal || payload.geracao || payload.geracaoEstimada || payload.geracaoPrevista || '—';
  setText('p-consumo', consumo);
  setText('p-consumo-table', consumo);
  setText('p-geracao', geracao);
  setText('p-geracao-table', geracao);
  const economiaMensal = payload.economia || payload.economiaMensal || payload.savingsMensais || payload.savings || 0;
  const economiaAnual = payload.economiaAnual || payload.savingsAnual || economiaMensal * 12;
  const investimentoValor = payload.investimento || payload.valor || payload.total || payload.custo || payload.valorTotal || 0;
  const paybackTempo = payload.payback || payload.tempoRetorno || payload.retorno || null;
  const observacoesTexto = payload.observacoes || payload.notas || payload.descricao || payload.obs || '—';
  const scoreValor = payload.score ?? payload.classificacao ?? payload.rating;

  setText('p-economia', `R$ ${formatCurrency(economiaMensal)}`);
  setText('p-economia-mensal', `R$ ${formatCurrency(economiaMensal)}`);
  setText('p-economia-anual', `R$ ${formatCurrency(economiaAnual)}`);
  setText('p-investimento', `R$ ${formatCurrency(investimentoValor)}`);
  setText('p-payback', paybackTempo ? `${paybackTempo} meses` : '-');
  setText('p-inversor', payload.inversor || payload.sistema || payload.sistemaEscolhido || payload.inversorModelo || '-');
  setText('p-placas', payload.placas || payload.quantidadePlacas || payload.placasInstaladas || payload.numeroPlacas || '-');
  setText('p-kwp', payload.kwp || payload.potenciaSistema || payload.potencia || payload.kwpTotal || '-');
  setText('p-tarifa', payload.tarifa ? `R$ ${formatCurrency(payload.tarifa)}` : '-');
  setText('p-observacoes', observacoesTexto);
  setText('p-score', scoreValor != null ? String(scoreValor) : '-');

  const kit = chooseKit(payload);
  if(kit) renderKit(kit);
  else renderKit(null);

  renderAdditionalKits(payload);
  renderFinanciamento(payload.financiamentos || payload.financiamento || payload.financeiro || []);

  const economy = payload.economiaTimeline || payload.annualSavings || payload.annualEconomy || payload.savingsTimeline || { years: [1,2,3,4,5], savings: [0,0,0,0,0] };
  renderEconomyChart('chart-economia', normalizeEconomyData(economy));
}

window.addEventListener('DOMContentLoaded', ()=>{
  const payload = readPayload();
  populate(payload);

  document.getElementById('btn-print')?.addEventListener('click', ()=>window.print());
  document.getElementById('btn-export-pdf')?.addEventListener('click', ()=>{
    import('./proposal-pdf.js').then(m=>m.exportPdf()).catch(err=>{console.error(err);window.print();});
  });
});
