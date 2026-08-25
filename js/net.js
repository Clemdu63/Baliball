/* Tournoi en ligne : pub/sub minimal au-dessus de ntfy.sh (service public
   gratuit, sans compte). Chaque salon est un topic ; les messages sont de
   petits JSON {t, uid, name, ...}. Internet requis pour ce mode uniquement.
   Les tests peuvent rediriger vers un serveur local via window.BALIBALL_NTFY. */

const BASE = () => window.BALIBALL_NTFY || 'https://ntfy.sh/';

function topicFor(code) {
  return 'baliball-v1-' + code.toLowerCase();
}

/* Identifiant de session : distingue deux joueurs portant le même pseudo. */
export const myUid = Math.random().toString(36).slice(2, 8);

/* Envoi fiable pendant la fermeture de la page (sendBeacon). */
export function netBeacon(code, data) {
  try {
    navigator.sendBeacon(BASE() + topicFor(code), JSON.stringify(data));
  } catch (e) { /* tant pis */ }
}

export function netPublish(code, data) {
  return fetch(BASE() + topicFor(code), {
    method: 'POST',
    body: JSON.stringify(data),
  }).catch(() => { /* hors ligne ou service indisponible : message perdu */ });
}

/* S'abonne au salon. onMsg(data, ageSeconds) reçoit chaque message (y compris
   l'historique récent, avec son âge). Renvoie une fonction de désabonnement. */
export function netSubscribe(code, onMsg, onStatus) {
  let es = null;
  let closed = false;

  function open() {
    if (closed) return;
    es = new EventSource(BASE() + topicFor(code) + '/sse?since=30m');
    es.onopen = () => { if (onStatus) onStatus('ok'); };
    es.onerror = () => {
      if (onStatus) onStatus('err');
      // EventSource retente tout seul ; rien à faire
    };
    es.onmessage = (e) => {
      try {
        const env = JSON.parse(e.data);
        if (env.event !== 'message' || !env.message) return;
        const data = JSON.parse(env.message);
        const age = env.time ? Math.max(0, Date.now() / 1000 - env.time) : 0;
        onMsg(data, age);
      } catch (err) { /* message étranger : ignoré */ }
    };
  }

  open();
  return () => {
    closed = true;
    if (es) es.close();
  };
}
