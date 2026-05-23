/**
 * crm-events.js — Eventos Firestore em tempo real (1 listener)
 */

import { collection, query, where, orderBy, limit, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { EVENTS_LIMIT } from './crm-config.js';

let _unsub = null;

function parseTs(ev) {
  const v = ev.criadoEm || ev.data;
  if (!v) return 0;
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (v.seconds) return v.seconds * 1000;
  return new Date(v).getTime() || 0;
}

export function pararRealtimeEventos() {
  if (_unsub) {
    _unsub();
    _unsub = null;
  }
}

export function iniciarRealtimeEventos(db, userId, onUpdate, onError) {
  pararRealtimeEventos();
  if (!db || typeof onUpdate !== 'function') return null;

  const eventosQuery = userId
    ? query(collection(db, 'eventos'), where('userId', '==', userId), orderBy('criadoEm', 'desc'), limit(EVENTS_LIMIT))
    : collection(db, 'eventos');

  _unsub = onSnapshot(
    eventosQuery,
    snapshot => {
      const eventos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      onUpdate(eventos, { total: eventos.length, fromCache: snapshot.metadata.fromCache });
    },
    err => {
      console.error('[CRM-Events] onSnapshot erro:', err);
      if (typeof onError === 'function') onError(err);
    }
  );

  return _unsub;
}
