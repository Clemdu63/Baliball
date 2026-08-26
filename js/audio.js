/* Sons générés en WebAudio, façon gamelan balinais : percussions
   métalliques pentatoniques, gong grave, et ressac en fond (optionnel).
   Aucun fichier audio : tout marche hors ligne.
   L'AudioContext ne peut démarrer qu'après un geste utilisateur (iOS). */

import { settings } from './storage.js';

let actx = null;
let surf = null;                 // noeuds du ressac {gain}
const last = {};

// gamme pentatonique approchant un slendro
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0];

export function initAudio() {
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume();
    syncAmbience();
  } catch (e) { /* pas de son */ }
}

/* Frappe métallique : fondamentale + partiel inharmonique (timbre gamelan). */
function strike(freq, { t = 0.3, g = 0.06, when = 0 } = {}) {
  if (!actx || !settings.sound) return;
  try {
    const t0 = actx.currentTime + when;
    const mk = (f, gain, dur) => {
      const o = actx.createOscillator();
      const gn = actx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      gn.gain.setValueAtTime(gain, t0);
      gn.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
      o.connect(gn).connect(actx.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    };
    mk(freq, g, t);
    mk(freq * 2.756, g * 0.32, t * 0.55);   // partiel métallique
  } catch (e) { /* pas de son */ }
}

function noiseBurst({ t = 0.09, g = 0.05, cutoff = 900, when = 0 } = {}) {
  if (!actx || !settings.sound) return;
  try {
    const t0 = actx.currentTime + when;
    const len = Math.max(1, Math.floor(actx.sampleRate * t));
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const gn = actx.createGain();
    gn.gain.setValueAtTime(g, t0);
    gn.gain.exponentialRampToValueAtTime(0.0004, t0 + t);
    src.connect(lp).connect(gn).connect(actx.destination);
    src.start(t0);
  } catch (e) { /* pas de son */ }
}

function note(i) {
  return SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length];
}

/* Glissando : sert aux voix des boss (rugissements, cris, grondements). */
function sweep(f1, f2, { t = 0.4, g = 0.06, type = 'sine', when = 0 } = {}) {
  if (!actx || !settings.sound) return;
  try {
    const t0 = actx.currentTime + when;
    const o = actx.createOscillator();
    const gn = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t);
    gn.gain.setValueAtTime(g, t0);
    gn.gain.exponentialRampToValueAtTime(0.0004, t0 + t);
    o.connect(gn).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + t + 0.03);
  } catch (e) { /* pas de son */ }
}

/* Mode Plage : chaque pierre brisée joue la note suivante d'une mélodie
   pentatonique — casser devient un morceau de gamelan. */
const ZEN_MELODY = [0, 2, 4, 3, 2, 4, 1, 0, 2, 3, 4, 2, 0, 1, 3, 2];
let zenStep = 0;

function throttled(key, ms) {
  const n = performance.now();
  if (last[key] && n - last[key] < ms) return false;
  last[key] = n;
  return true;
}

export const sfx = {
  wall() { if (throttled('wall', 40)) strike(164, { t: 0.06, g: 0.025 }); },
  hit() { if (throttled('hit', 30)) strike(note(Math.floor(Math.random() * 5)), { t: 0.2, g: 0.04 }); },
  brk() {
    if (!throttled('brk', 45)) return;
    strike(note(Math.floor(Math.random() * 5)), { t: 0.35, g: 0.05 });
    noiseBurst({ t: 0.08, g: 0.035 });
  },
  bonus() { strike(note(0), { t: 0.25 }); strike(note(2), { t: 0.25, when: 0.07 }); strike(note(4), { t: 0.35, when: 0.14 }); },
  launch() { strike(392, { t: 0.08, g: 0.02 }); },
  newRow() { strike(131, { t: 0.4, g: 0.045 }); },
  over() {
    strike(98, { t: 1.3, g: 0.09 });          // gong
    strike(note(2), { t: 0.4, g: 0.05, when: 0.3 });
    strike(note(0), { t: 0.6, g: 0.05, when: 0.55 });
  },
  sword() { noiseBurst({ t: 0.18, g: 0.05, cutoff: 2400 }); strike(note(4), { t: 0.3, g: 0.04, when: 0.05 }); },
  boom() { noiseBurst({ t: 0.25, g: 0.08, cutoff: 500 }); strike(74, { t: 0.8, g: 0.08 }); },
  chili() { noiseBurst({ t: 0.12, g: 0.04, cutoff: 3600 }); strike(note(3), { t: 0.2, g: 0.035, when: 0.06 }); },
  pearl() { strike(note(4) * 2, { t: 0.35, g: 0.045 }); },
  flower() { strike(note(1), { t: 0.22, g: 0.04 }); strike(note(3), { t: 0.28, g: 0.04, when: 0.06 }); },
  mystery() { strike(note(0), { t: 0.2, g: 0.04 }); strike(note(4), { t: 0.3, g: 0.045, when: 0.08 }); },
  milestone() {
    strike(131, { t: 0.7, g: 0.07 });
    strike(note(0), { t: 0.25, g: 0.05, when: 0.08 });
    strike(note(2), { t: 0.25, g: 0.05, when: 0.18 });
    strike(note(4), { t: 0.4, g: 0.055, when: 0.28 });
  },
  zenNote() {
    if (!throttled('zen', 70)) return;
    const octave = zenStep % 32 >= 16 ? 2 : 1;
    strike(note(ZEN_MELODY[zenStep % ZEN_MELODY.length]) * octave, { t: 0.5, g: 0.05 });
    zenStep += 1;
  },
  /* Chaque boss a sa voix, tout en synthèse. */
  bossVoice(kind) {
    if (!throttled('boss', 400)) return;
    switch (kind) {
      case 'rangda': // ricanement suraigu qui plonge
        sweep(760, 240, { t: 0.5, g: 0.06 });
        sweep(920, 300, { t: 0.45, g: 0.04, when: 0.12 });
        break;
      case 'naga': // gong abyssal et sifflement
        strike(65, { t: 1.4, g: 0.1 });
        noiseBurst({ t: 0.5, g: 0.03, cutoff: 3200, when: 0.1 });
        break;
      case 'garuda': // cri d'aigle
        sweep(600, 1250, { t: 0.22, g: 0.05 });
        sweep(700, 1400, { t: 0.2, g: 0.045, when: 0.24 });
        break;
      case 'leyak': // caquètement de flammes
        strike(note(4) * 2, { t: 0.12, g: 0.05 });
        strike(note(3) * 2, { t: 0.12, g: 0.05, when: 0.1 });
        strike(note(4) * 2, { t: 0.16, g: 0.05, when: 0.2 });
        noiseBurst({ t: 0.3, g: 0.03, cutoff: 4200 });
        break;
      case 'hanuman': // hululements espiègles
        sweep(380, 620, { t: 0.14, g: 0.05 });
        sweep(380, 620, { t: 0.14, g: 0.05, when: 0.18 });
        break;
      case 'bedawang': // grondement tellurique
        sweep(70, 38, { t: 1.2, g: 0.11, type: 'triangle' });
        noiseBurst({ t: 0.9, g: 0.06, cutoff: 240 });
        break;
      case 'dewi': // scintillement d'eau
        strike(note(2) * 2, { t: 0.6, g: 0.04 });
        strike(note(4) * 2, { t: 0.7, g: 0.04, when: 0.12 });
        strike(note(0) * 4, { t: 0.8, g: 0.03, when: 0.24 });
        break;
      case 'raksasa': // mastication gloutonne
        noiseBurst({ t: 0.16, g: 0.08, cutoff: 700 });
        noiseBurst({ t: 0.16, g: 0.08, cutoff: 600, when: 0.2 });
        sweep(160, 90, { t: 0.4, g: 0.07, type: 'sawtooth', when: 0.36 });
        break;
      default: // barong : rugissement
        sweep(150, 70, { t: 0.8, g: 0.1, type: 'sawtooth' });
        noiseBurst({ t: 0.5, g: 0.05, cutoff: 900 });
    }
  },
};

/* ---- ressac (boucle de bruit filtré, volume modulé lentement) ---- */
function startSurf() {
  if (!actx || surf) return;
  try {
    const len = actx.sampleRate * 2;
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const gn = actx.createGain();
    gn.gain.value = 0.012;
    const lfo = actx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = actx.createGain();
    depth.gain.value = 0.008;
    lfo.connect(depth).connect(gn.gain);
    src.connect(lp).connect(gn).connect(actx.destination);
    src.start();
    lfo.start();
    surf = { src, lfo, gn };
  } catch (e) { surf = null; }
}

function stopSurf() {
  if (!surf) return;
  try { surf.src.stop(); surf.lfo.stop(); } catch (e) { /* déjà arrêté */ }
  surf = null;
}

export function syncAmbience() {
  const on = settings.sound && settings.ambience && !document.hidden;
  if (on) startSurf();
  else stopSurf();
}

document.addEventListener('visibilitychange', () => {
  try {
    if (document.hidden && actx) actx.suspend();
    else if (actx) actx.resume();
    syncAmbience();
  } catch (e) { /* pas de son */ }
});
