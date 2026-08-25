/* Écrans, modes de jeu, réglages et démarrage. */

import { settings, persistSettings, KEYS, loadJSON, store } from './storage.js';
import { setThemeMode, DECORS } from './theme.js';
import { initAudio, syncAmbience } from './audio.js';
import { LEVELS } from './levels.js';
import * as game from './game.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['screen-home', 'screen-modes', 'screen-levels', 'screen-settings',
  'screen-over', 'screen-win', 'screen-duel-intro', 'screen-handoff', 'screen-duel-result',
  'screen-shop', 'screen-progress'];

setThemeMode(settings.theme);

function show(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  $('btn-home').classList.add('hidden');
}

function showGame() {
  for (const s of SCREENS) $(s).classList.add('hidden');
  $('btn-home').classList.remove('hidden');
}

function refreshHome() {
  const best = game.getBest();
  const bestScore = game.getBestScore();
  const tideBest = parseInt(store.get(KEYS.TIDE_BEST) || '0', 10) || 0;
  const parts = [];
  if (best > 0) parts.push('Classique : manche ' + best + ' · ' + bestScore + ' pts');
  if (tideBest > 0) parts.push('Marée : ' + tideBest + ' pts');
  $('home-best').textContent = parts.join(' — ');

  const saved = game.savedMode();
  const resumeBtn = $('btn-resume');
  resumeBtn.style.display = saved ? '' : 'none';
  resumeBtn.textContent = saved === 'zen' ? 'REPRENDRE (PLAGE)' : 'REPRENDRE';
}

// ---- accueil ----
$('btn-play').addEventListener('click', () => show('screen-modes'));

$('btn-resume').addEventListener('click', () => {
  initAudio();
  const saved = game.savedMode();
  if (!saved || !game.resumeGame(saved)) game.newGame('classic');
  showGame();
});

$('btn-settings').addEventListener('click', () => show('screen-settings'));

// ---- choix du mode ----
function startMode(m) {
  initAudio();
  game.newGame(m);
  showGame();
}

$('btn-mode-classic').addEventListener('click', () => startMode('classic'));
$('btn-mode-tide').addEventListener('click', () => startMode('tide'));
$('btn-mode-zen').addEventListener('click', () => startMode('zen'));
$('btn-mode-puzzle').addEventListener('click', () => {
  renderLevels();
  show('screen-levels');
});
$('btn-modes-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- duel de plage (2 joueurs, tour par tour, même graine) ----
let duel = null;

function startDuelGame() {
  initAudio();
  game.newGame('duel', 0, duel.seed);
  showGame();
}

$('btn-mode-duel').addEventListener('click', () => show('screen-duel-intro'));
$('btn-duel-back').addEventListener('click', () => show('screen-modes'));
$('btn-duel-start').addEventListener('click', () => {
  duel = { seed: Math.floor(Math.random() * 2 ** 31), phase: 1, p1: null };
  startDuelGame();
});
$('btn-handoff-go').addEventListener('click', () => {
  duel.phase = 2;
  startDuelGame();
});
$('btn-duel-again').addEventListener('click', () => {
  duel = { seed: Math.floor(Math.random() * 2 ** 31), phase: 1, p1: null };
  startDuelGame();
});
$('btn-duel-home').addEventListener('click', () => {
  duel = null;
  refreshHome();
  show('screen-home');
});

function playerLine(p) {
  return 'manche ' + p.round + ' · ' + p.score + ' pts';
}

function endDuelGame(s) {
  const me = { round: s.round, score: s.score };
  if (duel && duel.phase === 1) {
    duel.p1 = me;
    $('handoff-p1').textContent = playerLine(me);
    show('screen-handoff');
    return;
  }
  if (duel && duel.phase === 2) {
    const p1 = duel.p1;
    let title = 'ÉGALITÉ PARFAITE !';
    if (p1.round !== me.round) title = p1.round > me.round ? 'JOUEUR 1 GAGNE !' : 'JOUEUR 2 GAGNE !';
    else if (p1.score !== me.score) title = p1.score > me.score ? 'JOUEUR 1 GAGNE !' : 'JOUEUR 2 GAGNE !';
    $('duel-winner').textContent = title;
    $('result-p1').textContent = playerLine(p1);
    $('result-p2').textContent = playerLine(me);
    show('screen-duel-result');
    return;
  }
  // duel abandonné entre-temps : retour au menu
  refreshHome();
  show('screen-home');
}

// ---- défi du jour ----
$('btn-mode-daily').addEventListener('click', () => {
  initAudio();
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  game.newGame('daily', 0, seed);
  showGame();
});

// ---- boutique ----
const BALL_SKINS = {
  coco: { name: 'Noix de coco', emoji: '🥥', price: 0 },
  beachball: { name: 'Ballon de plage', emoji: '🏐', price: 50 },
  flower: { name: 'Frangipanier', emoji: '🌸', price: 80 },
  lantern: { name: 'Lampion', emoji: '🏮', price: 100 },
  durian: { name: 'Durian', emoji: '🍈', price: 120 },
};

let shop = loadJSON(KEYS.SHOP, { owned: ['coco', 'lagoon'], ball: 'coco', decor: 'lagoon' });
game.setCosmetics(shop);

function wallet() {
  return parseInt(store.get(KEYS.PEARLS) || '0', 10) || 0;
}

function persistShop() {
  store.set(KEYS.SHOP, JSON.stringify(shop));
  game.setCosmetics(shop);
}

function shopItem(id, def, kind) {
  const owned = shop.owned.includes(id);
  const equipped = shop[kind] === id;
  const div = document.createElement('div');
  div.className = 'shop-item';
  const sub = equipped ? 'Équipé' : owned ? 'Possédé' : '◉ ' + def.price;
  div.innerHTML = '<span class="shop-emoji">' + def.emoji + '</span>'
    + '<span class="shop-info"><span class="shop-name">' + def.name + '</span>'
    + '<span class="shop-sub">' + sub + '</span></span>';
  const btn = document.createElement('button');
  if (equipped) {
    btn.textContent = '✓ ÉQUIPÉ';
    btn.className = 'equipped';
    btn.disabled = true;
  } else if (owned) {
    btn.textContent = 'CHOISIR';
    btn.className = 'owned';
    btn.addEventListener('click', () => {
      shop[kind] = id;
      persistShop();
      renderShop();
    });
  } else {
    btn.textContent = 'ACHETER';
    btn.disabled = wallet() < def.price;
    btn.addEventListener('click', () => {
      if (wallet() < def.price) return;
      store.set(KEYS.PEARLS, String(wallet() - def.price));
      shop.owned.push(id);
      shop[kind] = id;
      persistShop();
      renderShop();
    });
  }
  div.appendChild(btn);
  return div;
}

function renderShop() {
  $('shop-wallet').textContent = '◉ ' + wallet() + ' perle' + (wallet() > 1 ? 's' : '')
    + ' — gagne des perles en jouant';
  const balls = $('shop-balls');
  balls.innerHTML = '';
  for (const [id, def] of Object.entries(BALL_SKINS)) {
    balls.appendChild(shopItem(id, def, 'ball'));
  }
  const decors = $('shop-decors');
  decors.innerHTML = '';
  for (const [id, def] of Object.entries(DECORS)) {
    decors.appendChild(shopItem(id, def, 'decor'));
  }
}

$('btn-shop').addEventListener('click', () => {
  renderShop();
  show('screen-shop');
});
$('btn-shop-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- progrès & succès ----
const ACHIEVEMENTS = [
  { name: 'Casseur de cailloux', desc: 'Briser 100 pierres', test: (c) => (c.bricksBroken || 0) >= 100 },
  { name: 'Démolisseur de temple', desc: 'Briser 1 000 pierres', test: (c) => (c.bricksBroken || 0) >= 1000 },
  { name: 'Légende du lagon', desc: 'Briser 5 000 pierres', test: (c) => (c.bricksBroken || 0) >= 5000 },
  { name: 'Marée haute', desc: 'Atteindre la manche 10', test: (c) => (c.bestRound || 0) >= 10 },
  { name: 'Gardien du récif', desc: 'Atteindre la manche 20', test: (c) => (c.bestRound || 0) >= 20 },
  { name: 'Esprit de Bali', desc: 'Atteindre la manche 30', test: (c) => (c.bestRound || 0) >= 30 },
  { name: 'Grand marqueur', desc: '5 000 points en une partie', test: (c) => (c.bestScore || 0) >= 5000 },
  { name: 'Collier de perles', desc: 'Gagner 50 perles en tout', test: (c) => (c.pearlsEarned || 0) >= 50 },
  { name: 'Trésor de la baie', desc: 'Gagner 200 perles en tout', test: (c) => (c.pearlsEarned || 0) >= 200 },
  { name: 'Pèlerin des temples', desc: '12 ★ au mode Temples', test: (c, x) => x.stars >= 12 },
  { name: 'Libérateur des temples', desc: 'Toutes les étoiles des Temples', test: (c, x) => x.stars >= LEVELS.length * 3 },
  { name: 'Habitué de la plage', desc: 'Jouer 25 parties', test: (c) => (c.gamesPlayed || 0) >= 25 },
];

function renderProgress() {
  const c = loadJSON(KEYS.STATS, {});
  const prog = loadJSON(KEYS.PUZZLE, { stars: {} });
  const stars = Object.values(prog.stars || {}).reduce((a, b) => a + b, 0);
  const rows = [
    ['Parties jouées', c.gamesPlayed || 0],
    ['Pierres brisées', c.bricksBroken || 0],
    ['Tirs', c.shotsFired || 0],
    ['Perles gagnées ◉', c.pearlsEarned || 0],
    ['Meilleure manche', c.bestRound || 0],
    ['Meilleur score', c.bestScore || 0],
    ['Étoiles des Temples ★', stars + ' / ' + LEVELS.length * 3],
  ];
  $('prog-stats').innerHTML = rows
    .map(([k, v]) => '<div class="row"><span>' + k + '</span><b>' + v + '</b></div>')
    .join('');
  const extra = { stars };
  $('ach-list').innerHTML = ACHIEVEMENTS.map((a) => {
    const done = a.test(c, extra);
    return '<div class="ach-item' + (done ? ' done' : '') + '">'
      + '<span class="ach-check">' + (done ? '🏆' : '·') + '</span>'
      + '<span class="ach-info"><div class="ach-name">' + a.name + '</div>'
      + '<div class="ach-desc">' + a.desc + '</div></span></div>';
  }).join('');
}

$('btn-progress').addEventListener('click', () => {
  renderProgress();
  show('screen-progress');
});
$('btn-progress-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- niveaux du mode Temples ----
function renderLevels() {
  const prog = loadJSON(KEYS.PUZZLE, { unlocked: 1, stars: {} });
  const grid = $('levels-grid');
  grid.innerHTML = '';
  let earned = 0;
  LEVELS.forEach((def, i) => {
    const unlocked = i < (prog.unlocked || 1);
    const stars = prog.stars[i] || 0;
    earned += stars;
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (unlocked ? '' : ' locked');
    btn.disabled = !unlocked;
    btn.innerHTML = '<span class="level-num">' + (unlocked ? (i + 1) : '🔒') + '</span>'
      + '<span class="level-stars">' + '★'.repeat(stars) + '<span class="dim">'
      + '★'.repeat(unlocked ? 3 - stars : 0) + '</span></span>';
    if (unlocked) {
      btn.addEventListener('click', () => {
        initAudio();
        game.newGame('puzzle', i);
        showGame();
      });
    }
    grid.appendChild(btn);
  });
  $('levels-progress').textContent = earned + ' ★ sur ' + LEVELS.length * 3;
}

$('btn-levels-back').addEventListener('click', () => show('screen-modes'));

// ---- bouton accueil en jeu ----
$('btn-home').addEventListener('click', () => {
  game.toMenu();
  duel = null; // quitter en plein duel l'abandonne
  refreshHome();
  show('screen-home');
});

// ---- fin de partie ----
const OVER_TITLES = {
  line: 'PARTIE TERMINÉE',
  time: 'TEMPS ÉCOULÉ',
  shots: 'PLUS DE TIRS',
};

game.initGame($('game'), {
  onGameOver(s) {
    if (s.mode === 'duel') {
      endDuelGame(s);
      return;
    }
    $('over-title').textContent = OVER_TITLES[s.reason] || 'PARTIE TERMINÉE';
    $('over-score').textContent = String(s.score);
    if (s.mode === 'tide') {
      $('over-best').textContent = 'Record marée : ' + s.tideBest + ' pts';
      $('stat-round-label').textContent = 'Manches jouées';
      $('stat-round').textContent = String(s.round);
    } else if (s.mode === 'puzzle') {
      $('over-best').textContent = LEVELS[s.level] ? '« ' + LEVELS[s.level].name + ' »' : '';
      $('stat-round-label').textContent = 'Niveau';
      $('stat-round').textContent = String(s.level + 1);
    } else if (s.mode === 'daily') {
      $('over-best').textContent = '🌅 Défi du jour · meilleur aujourd\'hui : ' + s.dailyBest + ' pts';
      $('stat-round-label').textContent = 'Manche atteinte';
      $('stat-round').textContent = String(s.round);
    } else {
      $('over-best').textContent = 'Record : manche ' + s.best + ' · ' + s.bestScore + ' pts';
      $('stat-round-label').textContent = 'Manche atteinte';
      $('stat-round').textContent = String(s.round);
    }
    $('stat-broken').textContent = String(s.broken);
    $('stat-pearls').textContent = String(s.pearls);
    $('stat-balls').textContent = String(s.balls);
    $('stat-shots').textContent = String(s.shots);
    const retry = $('btn-retry');
    retry.dataset.mode = s.mode;
    retry.dataset.level = String(s.level || 0);
    show('screen-over');
  },
  onPuzzleWin(s) {
    $('win-name').textContent = '« ' + s.name + ' » — niveau ' + (s.level + 1);
    $('win-stars').innerHTML = '★'.repeat(s.stars) + '<span class="dim">' + '★'.repeat(3 - s.stars) + '</span>';
    $('win-shots').textContent = s.shotsUsed + ' tir' + (s.shotsUsed > 1 ? 's' : '')
      + (s.pearls > 0 ? ' · ' + s.pearls + ' perle' + (s.pearls > 1 ? 's' : '') + ' ◉' : '');
    $('btn-win-next').style.display = s.hasNext ? '' : 'none';
    $('btn-win-next').dataset.next = String(s.level + 1);
    show('screen-win');
  },
});

$('btn-retry').addEventListener('click', (e) => {
  const m = e.currentTarget.dataset.mode || 'classic';
  const lvl = parseInt(e.currentTarget.dataset.level || '0', 10);
  game.newGame(m, lvl);
  showGame();
});

$('btn-over-home').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

$('btn-win-next').addEventListener('click', (e) => {
  const next = parseInt(e.currentTarget.dataset.next || '0', 10);
  game.newGame('puzzle', next);
  showGame();
});
$('btn-win-levels').addEventListener('click', () => {
  renderLevels();
  show('screen-levels');
});
$('btn-win-home').addEventListener('click', () => {
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

// accès de debug pour les tests automatisés
window.baliball = game;

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
