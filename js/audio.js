/* Sons générés en WebAudio : aucun fichier audio, tout marche hors ligne.
   L'AudioContext ne peut démarrer qu'après un geste utilisateur (iOS). */

import { settings } from './storage.js';

let actx = null;
const last = {};

export function initAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch (e) { /* pas de son */ }
}

function tone({ f = 440, f2 = null, t = 0.06, type = 'sine', g = 0.06, when = 0 }) {
  if (!actx || !settings.sound) return;
  try {
    const o = actx.createOscillator();
    const gn = actx.createGain();
    const t0 = actx.currentTime + when;
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + t);
    gn.gain.setValueAtTime(g, t0);
    gn.gain.exponentialRampToValueAtTime(0.0005, t0 + t);
    o.connect(gn).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + t + 0.02);
  } catch (e) { /* pas de son */ }
}

/* Beaucoup de balles = beaucoup d'impacts : on limite la cadence par type. */
function throttled(key, ms) {
  const n = performance.now();
  if (last[key] && n - last[key] < ms) return false;
  last[key] = n;
  return true;
}

export const sfx = {
  wall() { if (throttled('wall', 35)) tone({ f: 200 + Math.random() * 60, t: 0.03, g: 0.03 }); },
  hit() { if (throttled('hit', 25)) tone({ f: 330 + Math.random() * 80, t: 0.04, type: 'triangle', g: 0.05 }); },
  brk() { if (throttled('brk', 40)) tone({ f: 520, f2: 180, t: 0.12, type: 'square', g: 0.045 }); },
  bonus() { tone({ f: 660, t: 0.07 }); tone({ f: 990, t: 0.09, when: 0.07 }); },
  launch() { tone({ f: 480, f2: 640, t: 0.05, g: 0.03 }); },
  newRow() { tone({ f: 130, t: 0.06, g: 0.05 }); },
  over() {
    tone({ f: 392, t: 0.15, g: 0.07 });
    tone({ f: 311, t: 0.15, g: 0.07, when: 0.16 });
    tone({ f: 233, t: 0.3, g: 0.07, when: 0.32 });
  },
};
