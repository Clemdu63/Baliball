/* Écrans, réglages et démarrage. */

import { settings, persistSettings } from './storage.js';
import { setThemeMode } from './theme.js';
import { initAudio, syncAmbience } from './audio.js';
import * as game from './game.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['screen-home', 'screen-settings', 'screen-over'];

setThemeMode(settings.theme);

function show(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  $('btn-home').classList.toggle('hidden', id !== null);
}

function showGame() {
  for (const s of SCREENS) $(s).classList.add('hidden');
  $('btn-home').classList.remove('hidden');
}

function refreshHome() {
  const best = game.getBest();
  const bestScore = game.getBestScore();
  $('home-best').textContent = best > 0
    ? 'Record : manche ' + best + ' · ' + bestScore + ' pts'
    : '';
  $('btn-resume').style.display = game.hasSave() ? '' : 'none';
}

// ---- accueil ----
$('btn-new').addEventListener('click', () => {
  initAudio();
  game.newGame();
  showGame();
});

$('btn-resume').addEventListener('click', () => {
  initAudio();
  if (!game.resumeGame()) game.newGame();
  showGame();
});

$('btn-settings').addEventListener('click', () => show('screen-settings'));

// ---- bouton accueil en jeu ----
$('btn-home').addEventListener('click', () => {
  game.toMenu();
  refreshHome();
  show('screen-home');
});

// ---- fin de partie ----
game.initGame($('game'), {
  onGameOver(s) {
    $('over-score').textContent = String(s.score);
    $('over-best').textContent = 'Record : manche ' + s.best + ' · ' + s.bestScore + ' pts';
    $('stat-round').textContent = String(s.round);
    $('stat-broken').textContent = String(s.broken);
    $('stat-pearls').textContent = String(s.pearls);
    $('stat-balls').textContent = String(s.balls);
    $('stat-shots').textContent = String(s.shots);
    show('screen-over');
  },
});

$('btn-retry').addEventListener('click', () => {
  game.newGame();
  showGame();
});

$('btn-over-home').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- réglages ----
function bindSegmented(containerId, key, apply) {
  const box = $(containerId);
  const sync = () => {
    for (const btn of box.querySelectorAll('button')) {
      btn.classList.toggle('active', btn.dataset.value === String(settings[key]));
    }
  };
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const v = btn.dataset.value;
    settings[key] = v === 'true' ? true : v === 'false' ? false : v;
    persistSettings();
    sync();
    if (apply) apply();
  });
  sync();
}

bindSegmented('seg-theme', 'theme', () => setThemeMode(settings.theme));
bindSegmented('seg-sound', 'sound', syncAmbience);
bindSegmented('seg-ambience', 'ambience', syncAmbience);
bindSegmented('seg-speed', 'fast');

$('btn-settings-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- démarrage ----
refreshHome();
show('screen-home');

// audio iOS : ne peut démarrer qu'après un geste
document.addEventListener('pointerdown', initAudio, { capture: true });

// service worker : hors ligne
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(() => {
      $('offline-badge').textContent = '✓ Disponible hors ligne';
    }).catch(() => { /* http:// local : le jeu marche quand même */ });
  });
}

// astuce d'installation iOS (Safari seulement, pas une fois installé)
(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !standalone) {
    $('install-hint').innerHTML =
      'Pour jouer hors ligne : bouton <strong>Partager</strong> ⬆︎ puis ' +
      '<strong>« Sur l\'écran d\'accueil »</strong>, et ouvre l\'app une première fois avec Internet.';
  }
})();
