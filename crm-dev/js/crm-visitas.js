/**
 * crm-visitas.js — Sessões e visitas (eventos realtime)
 */

import { escHtml, parseDataFirestore, emptyStateHtml } from './crm-utils.js';

function fmtData(ev) {
  const d = parseDataFirestore(ev.criadoEm || ev.data);
  if (!d) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function renderizarVisitas(eventos) {
  const el = document.getElementById('visitasConteudo');
  const meta = document.getElementById('visitasMeta');
  if (!el) return;

  const sessoes = new Map();
  let pageviews = 0;

  (eventos || []).forEach(ev => {
    if (ev.evento !== 'pagina_abriu') return;
    pageviews += 1;
    const sid = ev.sessionId || ev.id;
    const prev = sessoes.get(sid);
    const tNew = parseDataFirestore(ev.criadoEm)?.getTime() || 0;
    const tOld = prev ? parseDataFirestore(prev.criadoEm)?.getTime() || 0 : 0;
    if (!prev || tNew > tOld) sessoes.set(sid, ev);
  });

  const lista = [...sessoes.values()].sort((a, b) => {
    const ta = parseDataFirestore(a.criadoEm)?.getTime() || 0;
    const tb = parseDataFirestore(b.criadoEm)?.getTime() || 0;
    return tb - ta;
  }).slice(0, 40);

  if (meta) {
    meta.textContent = `${lista.length} sessões · ${pageviews} pageviews · tempo real`;
  }

  if (!lista.length) {
    el.innerHTML = emptyStateHtml('👁️', 'Nenhuma visita ainda', 'Os eventos da landing aparecem aqui automaticamente.');
    return;
  }

  el.innerHTML = lista.map(ev => `
<div class="visita-card glass-card">
  <div class="visita-head">
    <b>${escHtml(ev.utm_source || 'direto')}</b>
    <small>${fmtData(ev)}</small>
  </div>
  <p>📢 ${escHtml(ev.utm_campaign || '—')} · 📱 ${escHtml(ev.utm_medium || '—')}</p>
  <p class="visita-sid">Sessão: <code>${escHtml(String(ev.sessionId || '').slice(0, 14))}</code></p>
</div>`).join('');
}
