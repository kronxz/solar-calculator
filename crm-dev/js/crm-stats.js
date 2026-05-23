// [MF-AI-CHANGE] crm-stats.js — Kit stats table + Chart.js line graph — 2026-05-22
// Handles: kit performance table (Essencial/Recomendado/Premium), 14-day lead trend chart

let _chartInstance = null;

// ─── KIT STATS TABLE ─────────────────────────────────────────
export function renderizarStatsKits(leads) {
  const el = document.getElementById('statsKits');
  if (!el) return;

  const est = JSON.parse(localStorage.getItem('estatisticas') || '{}');

  // Single-pass counting to avoid multiple filters
  const counters = {
    essencial: { cliques: 0, propostas: 0, fechados: 0 },
    recomendado: { cliques: 0, propostas: 0, fechados: 0 },
    premium: { cliques: 0, propostas: 0, fechados: 0 }
  };

  (leads || []).forEach(l => {
    if (l.deletado) return;
    const sys = String(l.sistema || l.kitEscolhido || '').toLowerCase();
    if (sys.includes('essencial')) {
      counters.essencial.cliques += 1;
      if (String(l.status || '').toLowerCase() === 'fechado') counters.essencial.fechados += 1;
      if (['proposta','fechado','negociacao','negociação'].includes(String(l.status || '').toLowerCase())) counters.essencial.propostas += 1;
    }
    if (sys.includes('recomendado')) {
      counters.recomendado.cliques += 1;
      if (String(l.status || '').toLowerCase() === 'fechado') counters.recomendado.fechados += 1;
      if (['proposta','fechado','negociacao','negociação'].includes(String(l.status || '').toLowerCase())) counters.recomendado.propostas += 1;
    }
    if (sys.includes('premium')) {
      counters.premium.cliques += 1;
      if (String(l.status || '').toLowerCase() === 'fechado') counters.premium.fechados += 1;
      if (['proposta','fechado','negociacao','negociação'].includes(String(l.status || '').toLowerCase())) counters.premium.propostas += 1;
    }
  });

  const kits = [
    { emoji: '🥇', nome: 'Essencial', chave: 'essencial', cliques: Math.max(est.essencialCliques || 0, counters.essencial.cliques), propostas: Math.max(est.essencialPropostas || 0, counters.essencial.propostas), fechados: Math.max(est.essencialFechados || 0, counters.essencial.fechados) },
    { emoji: '🥈', nome: 'Recomendado', chave: 'recomendado', cliques: Math.max(est.recomendadoCliques || 0, counters.recomendado.cliques), propostas: Math.max(est.recomendadoPropostas || 0, counters.recomendado.propostas), fechados: Math.max(est.recomendadoFechados || 0, counters.recomendado.fechados) },
    { emoji: '🥉', nome: 'Premium', chave: 'premium', cliques: Math.max(est.premiumCliques || 0, counters.premium.cliques), propostas: Math.max(est.premiumPropostas || 0, counters.premium.propostas), fechados: Math.max(est.premiumFechados || 0, counters.premium.fechados) }
  ];

  el.innerHTML = `
<div class="stats-kits-grid">
  <div class="stats-kits-header">
    <span>Kit</span><span>Leads</span><span>Propostas</span><span>Fechados</span><span>Conv.</span>
  </div>
  ${kits.map(k => {
    const conv = k.cliques > 0 ? ((k.fechados / k.cliques) * 100).toFixed(0) : 0;
    return `
  <div class="stats-kits-row glass-card">
    <span class="kit-nome">${k.emoji} ${k.nome}</span>
    <span class="kit-val">${k.cliques}</span>
    <span class="kit-val">${k.propostas}</span>
    <span class="kit-val" style="color:var(--verde-acento)">${k.fechados}</span>
    <span class="kit-conv" style="color:${conv >= 20 ? '#22c55e' : conv >= 10 ? '#f59e0b' : '#ef4444'}">${conv}%</span>
  </div>`;
  }).join('')}
</div>`;
}

// ─── CHART.JS LEADS POR DIA ───────────────────────────────────
export function renderizarGraficoLeads(leads) {
  const canvas = document.getElementById('graficoLeads');
  if (!canvas || typeof Chart === 'undefined') return;

  // Gera array dos últimos 14 dias
  const dias = [];
  const labels = [];
  const hoje = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dias.push(d);
    labels.push(`${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  }

  // Build count map in single pass keyed by YYYY-MM-DD
  const counts = {};
  (leads || []).forEach(l => {
    if (l.deletado) return;
    const d = parseDataLead(l);
    if (!d) return;
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    counts[key] = (counts[key] || 0) + 1;
  });

  const data = dias.map(dia => {
    const key = dia.getFullYear() + '-' + String(dia.getMonth() + 1).padStart(2, '0') + '-' + String(dia.getDate()).padStart(2, '0');
    return counts[key] || 0;
  });

  if (_chartInstance) {
    try {
      _chartInstance.data.labels = labels;
      _chartInstance.data.datasets[0].data = data;
      _chartInstance.update();
      return;
    } catch (e) {
      _chartInstance.destroy();
      _chartInstance = null;
    }
  }

  _chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Leads por dia',
        data,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.15)',
        pointBackgroundColor: '#22c55e',
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e2e8f0', font: { family: 'Inter' } } },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#22c55e',
          bodyColor: '#e2e8f0'
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, stepSize: 1 },
          grid: { color: 'rgba(255,255,255,0.05)' },
          beginAtZero: true
        }
      }
    }
  });
}

// ─── HELPER DATA ─────────────────────────────────────────────
function parseDataLead(l) {
  const val = l.data || l.createdAt || l.criadoEm;
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}
