/**
 * crm-finance.js — Kits, financiamentos e render da aba financeira
 */

export function resolverKitsLead(lead) {
  if (lead?.kitsDisponiveis && typeof lead.kitsDisponiveis === 'object') {
    return { kits: lead.kitsDisponiveis, estimado: false };
  }
  if (lead?.kits && typeof lead.kits === 'object') {
    return { kits: lead.kits, estimado: false };
  }
  return { kits: calcularKitsFallback(lead), estimado: true };
}

export function calcularKitsFallback(lead) {
  const conta = parseFloat(lead?.valor || lead?.contaDeLuz) || 500;
  const tarifa = parseFloat(lead?.tarifa) || 0.95;
  const hsp = parseFloat(lead?.hsp) || 4.5;
  const potPlaca = parseFloat(lead?.potenciaPlaca) || 580;
  const consumoMensal = conta / tarifa;
  const fatorGeracao = 107;
  const baseKwp = consumoMensal / fatorGeracao;

  const calcInv = k => {
    if (k <= 4) return k * 3600;
    if (k <= 8) return k * 3400;
    if (k <= 12) return k * 3200;
    if (k <= 20) return k * 3000;
    return k * 2850;
  };

  const buildKit = (fator, nome) => {
    const kwp = (Math.ceil((baseKwp * fator * 1000) / potPlaca) * potPlaca) / 1000;
    const placas = Math.ceil((baseKwp * fator * 1000) / potPlaca);
    const geracao = kwp * hsp * 30 * 0.80;
    const economia = geracao * tarifa;
    const investimento = calcInv(kwp);
    const payback = investimento / (economia * 12);
    return {
      nome,
      kwp: +kwp.toFixed(2),
      geracao: +geracao.toFixed(0),
      economia: +economia.toFixed(0),
      investimento: +investimento.toFixed(0),
      payback: +payback.toFixed(1),
      placas
    };
  };

  return {
    essencial: buildKit(0.8, 'Essencial'),
    recomendado: buildKit(1.1, 'Recomendado ⭐'),
    premium: buildKit(1.3, 'Premium')
  };
}

function calcularParcela(valor, taxa, meses) {
  const v = Number(valor) || 0;
  if (!v) return '0';
  return ((v * taxa) / (1 - Math.pow(1 + taxa, -meses))).toFixed(0);
}

export function gerarFinanciamentos(kits, contaDeLuz) {
  const bancos = { santander: 0.0199, bv: 0.0215, sicoob: 0.0185, bradesco: 0.0220 };
  const result = {};
  Object.entries(kits || {}).forEach(([tipo, kit]) => {
    const v = Number(String(kit.investimento).replace(/\D/g, '')) || Number(kit.investimento) || 0;
    result[tipo] = {
      santander24: calcularParcela(v, bancos.santander, 24),
      santander36: calcularParcela(v, bancos.santander, 36),
      santander48: calcularParcela(v, bancos.santander, 48),
      bv48: calcularParcela(v, bancos.bv, 48),
      sicoob60: calcularParcela(v, bancos.sicoob, 60),
      bradesco72: calcularParcela(v, bancos.bradesco, 72),
      contaLuz: contaDeLuz
    };
  });
  return result;
}

export function renderHtmlKitResumo(lead, esc) {
  const { kits, estimado } = resolverKitsLead(lead);
  const escolhido = lead.kitEscolhido || lead.sistema || lead.sistemaEscolhido || '—';
  const inv = Number(lead.investimento || 0);
  const tag = estimado ? ' <small style="color:#f59e0b">(estimado)</small>' : '';

  const cards = Object.entries(kits).map(([, kit]) => `
<div class="glass-card" style="padding:12px;margin-bottom:8px;font-size:13px">
  <b style="color:var(--verde-acento)">${esc(kit.nome)}</b>
  <p style="margin:6px 0 0">📦 ${kit.kwp} kWp · 🧩 ${kit.placas} placas · ⚡ ${kit.geracao} kWh/mês</p>
  <p style="margin:4px 0 0">💰 R$ ${Number(kit.investimento).toLocaleString('pt-BR')} · 💸 R$ ${kit.economia}/mês · ⏳ ${kit.payback}a</p>
</div>`).join('');

  return `
<h3 style="margin:16px 0 8px;font-size:15px">🏷️ Kit selecionado</h3>
<p><b>${esc(escolhido)}</b>${inv ? ` · Investimento lead: <b>R$ ${inv.toLocaleString('pt-BR')}</b>` : ''}</p>
<h3 style="margin:16px 0 8px;font-size:15px">📦 Kits disponíveis${tag}</h3>
${cards}`;
}

export function renderHtmlFinanciamento(lead, esc) {
  const { kits, estimado } = resolverKitsLead(lead);
  const conta = parseFloat(lead.valor || lead.contaDeLuz) || 0;
  const financiamentos = lead.financiamentos || gerarFinanciamentos(kits, conta);

  const kitHtml = Object.entries(kits).map(([, kit]) => `
<div class="glass-card" style="padding:16px;margin-bottom:12px">
  <div style="font-size:18px;font-weight:700;color:var(--verde-acento);margin-bottom:10px">⚡ ${esc(kit.nome)}</div>
  <p>📦 Potência: <b>${kit.kwp} kWp</b></p>
  <p>⚡ Geração: <b>${kit.geracao} kWh/mês</b></p>
  <p>💰 Investimento: <b>R$ ${Number(kit.investimento).toLocaleString('pt-BR')}</b></p>
  <p>💸 Economia: <b>R$ ${kit.economia}/mês</b></p>
  <p>🧩 Placas: <b>${kit.placas}</b></p>
  <p>⏳ Payback: <b>${kit.payback} anos</b></p>
</div>`).join('');

  const parcColor = (parcela, c) => Number(parcela) <= c ? '#22c55e' : '#f59e0b';

  const finHtml = Object.entries(financiamentos).map(([tipo, bancos]) => {
    const kit = kits[tipo];
    return `
<div class="glass-card" style="padding:16px;margin-bottom:12px">
  <div style="font-size:16px;font-weight:700;color:var(--verde-acento);margin-bottom:12px">💳 ${esc(kit?.nome || tipo.toUpperCase())}</div>
  <div style="display:grid;gap:8px">
    <div class="glass-card" style="padding:10px">🏦 <b>Santander</b><br>24x: <b>R$ ${bancos.santander24}</b><br>36x: <b>R$ ${bancos.santander36}</b><br>48x: <b style="color:${parcColor(bancos.santander48, conta)}">R$ ${bancos.santander48}</b></div>
    <div class="glass-card" style="padding:10px">🏦 <b>BV</b> 48x: <b>R$ ${bancos.bv48}</b></div>
    <div class="glass-card" style="padding:10px">🏦 <b>Sicoob</b> 60x: <b style="color:${parcColor(bancos.sicoob60, conta)}">R$ ${bancos.sicoob60}</b></div>
    <div class="glass-card" style="padding:10px">🏦 <b>Bradesco</b> 72x: <b>R$ ${bancos.bradesco72}</b></div>
  </div>
  <p style="margin-top:8px;font-size:12px;color:#9ca3af">Conta atual: R$ ${conta.toFixed(0)}/mês — verde = parcela ≤ conta</p>
</div>`;
  }).join('');

  const melhor = Object.entries(kits).sort((a, b) => a[1].payback - b[1].payback)[0];
  const rec = melhor ? `<p style="margin-bottom:16px">⭐ <b>Recomendação:</b> ${esc(melhor[1].nome)} (menor payback: ${melhor[1].payback}a)</p>` : '';

  return `
<h2 style="margin:0 0 16px">⚡ Dimensionamento${estimado ? ' <small style="color:#f59e0b;font-size:12px">(estimado)</small>' : ''}</h2>
${rec}
${kitHtml}
<hr style="border-color:rgba(255,255,255,0.08);margin:20px 0">
<h2 style="margin:0 0 16px">💳 Financiamentos</h2>
${finHtml}`;
}
