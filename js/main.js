/* Écrans, modes de jeu, boutique, tournoi, réglages et démarrage. */

import { settings, persistSettings, KEYS, loadJSON, store } from './storage.js';
import { setThemeMode, DECORS } from './theme.js';
import { initAudio, syncAmbience, sfx } from './audio.js';
import { LEVELS } from './levels.js';
import * as game from './game.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['screen-home', 'screen-modes', 'screen-levels', 'screen-settings',
  'screen-over', 'screen-win', 'screen-shop', 'screen-progress', 'screen-legend',
  'screen-tournoi', 'screen-tournoi-host', 'screen-tournoi-join', 'screen-countdown',
  'screen-confirm'];

setThemeMode(settings.theme);

function show(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  $('btn-home').classList.add('hidden');
  $('btn-restart').classList.add('hidden');
}

function showGame() {
  for (const s of SCREENS) $(s).classList.add('hidden');
  $('btn-home').classList.remove('hidden');
  $('btn-restart').classList.remove('hidden');
}

/* Derniers paramètres de partie : sert à REJOUER et à RECOMMENCER
   (indispensable pour rejouer la même graine en Défi du jour / Tournoi). */
let lastStart = { mode: 'classic', level: 0, seed: null };

function startGame(mode, level = 0, seed = null) {
  initAudio();
  lastStart = { mode, level, seed };
  game.newGame(mode, level, seed);
  showGame();
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
  if (saved && game.resumeGame(saved)) {
    lastStart = { mode: saved, level: 0, seed: null };
  } else {
    lastStart = { mode: 'classic', level: 0, seed: null };
    game.newGame('classic');
  }
  showGame();
});

$('btn-settings').addEventListener('click', () => show('screen-settings'));

// ---- choix du mode ----
$('btn-mode-classic').addEventListener('click', () => startGame('classic'));
$('btn-mode-tide').addEventListener('click', () => startGame('tide'));
$('btn-mode-zen').addEventListener('click', () => startGame('zen'));
$('btn-mode-puzzle').addEventListener('click', () => {
  renderLevels();
  show('screen-levels');
});
$('btn-modes-back').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- défi du jour ----
function dailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

$('btn-mode-daily').addEventListener('click', () => startGame('daily', 0, dailySeed()));

// ---- tournoi entre amis (plusieurs téléphones, même code) ----
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newTournoiCode() {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function codeSeed(code) {
  let h = 2166136261;
  for (const ch of code) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

let tournoiCode = null;

$('btn-mode-tournoi').addEventListener('click', () => show('screen-tournoi'));
$('btn-tournoi-back').addEventListener('click', () => show('screen-modes'));

$('btn-tournoi-host').addEventListener('click', () => {
  tournoiCode = newTournoiCode();
  $('tournoi-code').textContent = tournoiCode;
  show('screen-tournoi-host');
});
$('btn-host-back').addEventListener('click', () => show('screen-tournoi'));
$('btn-host-go').addEventListener('click', () => startCountdown(tournoiCode));

$('btn-tournoi-join').addEventListener('click', () => {
  $('join-code').value = '';
  $('join-error').textContent = '';
  show('screen-tournoi-join');
});
$('btn-join-back').addEventListener('click', () => show('screen-tournoi'));
$('btn-join-go').addEventListener('click', () => {
  const code = $('join-code').value.trim().toUpperCase();
  if (code.length !== 4 || [...code].some((c) => !CODE_ALPHABET.includes(c))) {
    $('join-error').textContent = 'Code invalide : 4 lettres/chiffres (sans I, L, O, 0, 1).';
    return;
  }
  startCountdown(code);
});

function startCountdown(code) {
  initAudio();
  show('screen-countdown');
  let n = 3;
  $('countdown-num').textContent = String(n);
  sfx.newRow();
  const timer = setInterval(() => {
    n -= 1;
    if (n > 0) {
      $('countdown-num').textContent = String(n);
      sfx.newRow();
    } else {
      clearInterval(timer);
      sfx.bonus();
      startGame('tournament', 0, codeSeed(code));
    }
  }, 1000);
}

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
      btn.addEventListener('click', () => startGame('puzzle', i));
    }
    grid.appendChild(btn);
  });
  $('levels-progress').textContent = earned + ' ★ sur ' + LEVELS.length * 3;
}

$('btn-levels-back').addEventListener('click', () => show('screen-modes'));

// ---- boutique ----
const BALL_SKINS = {
  coco: { name: 'Noix de coco', emoji: '🥥', price: 0 },
  beachball: { name: 'Ballon de plage', emoji: '🏐', price: 50 },
  flower: { name: 'Frangipanier', emoji: '🌸', price: 80 },
  lantern: { name: 'Lampion', emoji: '🏮', price: 100 },
  durian: { name: 'Durian', emoji: '🍈', price: 120 },
  starfish: { name: 'Étoile de mer', emoji: '⭐', unlock: 2500 },
  shell: { name: 'Coquillage', emoji: '🐚', unlock: 5000 },
};

let shop = loadJSON(KEYS.SHOP, { owned: ['coco', 'lagoon'], ball: 'coco', decor: 'lagoon' });
game.setCosmetics(shop);

function wallet() {
  return parseInt(store.get(KEYS.PEARLS) || '0', 10) || 0;
}

function cumulativeBestScore() {
  return loadJSON(KEYS.STATS, {}).bestScore || 0;
}

function persistShop() {
  store.set(KEYS.SHOP, JSON.stringify(shop));
  game.setCosmetics(shop);
}

function shopItem(id, def, kind) {
  const scoreUnlocked = def.unlock !== undefined && cumulativeBestScore() >= def.unlock;
  const owned = shop.owned.includes(id) || scoreUnlocked;
  const equipped = shop[kind] === id;
  const div = document.createElement('div');
  div.className = 'shop-item';
  const sub = equipped ? 'Équipé'
    : owned ? 'Possédé'
      : def.unlock !== undefined ? 'Se débloque à ' + def.unlock + ' pts en une partie'
        : '◉ ' + def.price;
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
  } else if (def.unlock !== undefined) {
    btn.textContent = '🔒';
    btn.className = 'owned';
    btn.disabled = true;
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

// ---- légende ----
const LEGEND_POWERUPS = [
  ['ball', '+1 noix de coco', 'Une noix de plus dans ta rafale, dès le tour suivant.'],
  ['sword', 'Espadon', 'File le long de sa ligne et détruit tout sur son passage.'],
  ['durian', 'Durian', 'Explose et blesse toutes les pierres voisines.'],
  ['chili', 'Piment', 'Dégâts doublés jusqu\'à la fin du tir.'],
  ['pearl', 'Perle', 'Monnaie de la boutique (skins et décors).'],
  ['flower', 'Frangipanier', 'Renvoie la noix qui la touche tout droit vers le haut.'],
];

const LEGEND_STONES = [
  ['stone', 'Pierre de temple', 'Perd 1 PV par impact ; son style change avec sa solidité (grès, mousse, volcanique, dorée).'],
  ['tri', 'Toit de temple', 'Demi-pierre : l\'hypoténuse renvoie la noix en diagonale.'],
  ['armored', 'Pierre volcanique', 'Blindée : elle n\'encaisse qu\'1 dégât par tir, quelle que soit la pluie de noix.'],
  ['mystery', 'Pierre mystère', 'Révèle une surprise en se brisant : noix, perles, explosion ou points.'],
];

function legendRow([kind, name, desc]) {
  const div = document.createElement('div');
  div.className = 'legend-item';
  const cv = document.createElement('canvas');
  cv.width = 88;
  cv.height = 88;
  game.drawLegendIcon(cv, kind);
  div.appendChild(cv);
  const info = document.createElement('span');
  info.className = 'legend-info';
  info.innerHTML = '<div class="legend-name">' + name + '</div>'
    + '<div class="legend-desc">' + desc + '</div>';
  div.appendChild(info);
  return div;
}

function renderLegend() {
  const p = $('legend-powerups');
  p.innerHTML = '';
  for (const row of LEGEND_POWERUPS) p.appendChild(legendRow(row));
  const s = $('legend-stones');
  s.innerHTML = '';
  for (const row of LEGEND_STONES) s.appendChild(legendRow(row));
}

$('btn-legend').addEventListener('click', () => {
  renderLegend();
  show('screen-legend');
});
$('btn-legend-back').addEventListener('click', () => {
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

// ---- boutons accueil / recommencer en jeu ----
$('btn-home').addEventListener('click', () => {
  game.toMenu();
  refreshHome();
  show('screen-home');
});

$('btn-restart').addEventListener('click', () => show('screen-confirm'));
$('btn-confirm-no').addEventListener('click', () => showGame());
$('btn-confirm-yes').addEventListener('click', () => {
  game.newGame(lastStart.mode, lastStart.level, lastStart.seed);
  showGame();
});

// ---- fin de partie ----
const OVER_TITLES = {
  line: 'PARTIE TERMINÉE',
  time: 'TEMPS ÉCOULÉ',
  shots: 'PLUS DE TIRS',
};

/* Cosmétiques débloqués par un score en une partie. */
const SCORE_UNLOCKS = [
  { threshold: 2500, label: '⭐ Étoile de mer débloquée !' },
  { threshold: 5000, label: '🐚 Coquillage débloqué !' },
  { threshold: 8000, label: '🪼 Décor Bioluminescence débloqué !' },
];

let bestScoreAtStart = cumulativeBestScore();
let lastOver = null;

game.initGame($('game'), {
  onGameOver(s) {
    $('over-title').textContent = OVER_TITLES[s.reason] || 'PARTIE TERMINÉE';
    $('over-score').textContent = String(s.score);
    if (s.mode === 'tide') {
      $('over-best').textContent = 'Record marée : ' + s.tideBest + ' pts';
      $('stat-round-label').textContent = 'Manches jouées';
      $('stat-round').textContent = String(s.round);
    } else if (s.mode === 'tournament') {
      $('over-best').textContent = '📡 Comparez vos scores !';
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
    // nouveaux cosmétiques débloqués par ce score ?
    const newUnlocks = SCORE_UNLOCKS
      .filter((u) => u.threshold > bestScoreAtStart && s.score >= u.threshold)
      .map((u) => u.label);
    if (newUnlocks.length) {
      $('over-best').textContent += ' — ' + newUnlocks.join(' · ');
    }
    bestScoreAtStart = cumulativeBestScore();
    $('stat-broken').textContent = String(s.broken);
    $('stat-pearls').textContent = String(s.pearls);
    $('stat-balls').textContent = String(s.balls);
    $('stat-shots').textContent = String(s.shots);
    lastOver = s;
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

$('btn-retry').addEventListener('click', () => {
  if (lastStart.mode === 'tournament') {
    show('screen-tournoi');
    return;
  }
  startGame(lastStart.mode, lastStart.level, lastStart.seed);
});

$('btn-over-home').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

$('btn-win-next').addEventListener('click', (e) => {
  const next = parseInt(e.currentTarget.dataset.next || '0', 10);
  startGame('puzzle', next);
});
$('btn-win-levels').addEventListener('click', () => {
  renderLevels();
  show('screen-levels');
});
$('btn-win-home').addEventListener('click', () => {
  refreshHome();
  show('screen-home');
});

// ---- partage du score (image générée hors ligne) ----
const MODE_LABELS = {
  classic: 'Mode classique', tide: 'Marée montante', puzzle: 'Temples',
  zen: 'Plage', daily: 'Défi du jour', tournament: 'Tournoi entre amis',
};

function shareCardBlob(s) {
  const c = document.createElement('canvas');
  c.width = 720;
  c.height = 900;
  const x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, '#bfe9ef');
  sky.addColorStop(1, '#eef9f0');
  x.fillStyle = sky;
  x.fillRect(0, 0, 720, 520);
  x.fillStyle = '#ffe9a8';
  x.beginPath();
  x.arc(570, 150, 70, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#3f7a6e';
  x.beginPath();
  x.moveTo(-40, 520); x.lineTo(200, 240); x.lineTo(290, 340);
  x.lineTo(340, 290); x.lineTo(560, 520);
  x.closePath();
  x.fill();
  const sea = x.createLinearGradient(0, 520, 0, 700);
  sea.addColorStop(0, '#2fae9f');
  sea.addColorStop(1, '#a7ecdc');
  x.fillStyle = sea;
  x.fillRect(0, 520, 720, 180);
  x.fillStyle = '#f0e0b6';
  x.fillRect(0, 700, 720, 200);
  x.fillStyle = 'rgba(255,255,255,0.8)';
  x.fillRect(0, 696, 720, 6);
  x.fillStyle = '#7a5230';
  x.beginPath(); x.arc(360, 620, 46, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#55361c'; x.lineWidth = 6; x.stroke();
  x.fillStyle = '#a3794e';
  x.beginPath(); x.arc(344, 604, 18, 0, Math.PI * 2); x.fill();
  x.textAlign = 'center';
  x.fillStyle = '#0d4b43';
  x.font = '800 64px -apple-system, sans-serif';
  x.fillText('BALIBALL', 360, 110);
  x.font = '700 30px -apple-system, sans-serif';
  x.fillStyle = '#305650';
  x.fillText(MODE_LABELS[s.mode] || '', 360, 170);
  x.font = '800 150px -apple-system, sans-serif';
  x.fillStyle = '#0d4b43';
  x.fillText(String(s.score), 360, 330);
  x.font = '700 34px -apple-system, sans-serif';
  x.fillStyle = '#305650';
  x.fillText(s.mode === 'puzzle' ? 'niveau ' + (s.level + 1) : 'manche ' + s.round, 360, 390);
  x.font = '600 26px -apple-system, sans-serif';
  x.fillStyle = '#8a6f4d';
  x.fillText(new Date().toLocaleDateString('fr-FR'), 360, 780);
  x.fillText('clemdu63.github.io/Baliball', 360, 830);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

$('btn-share').addEventListener('click', async () => {
  if (!lastOver) return;
  try {
    const blob = await shareCardBlob(lastOver);
    const file = new File([blob], 'baliball.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Baliball',
        text: 'Mon score sur Baliball 🥥',
      });
    } else if (navigator.share) {
      await navigator.share({
        title: 'Baliball',
        text: 'J\'ai fait ' + lastOver.score + ' pts sur Baliball 🥥 !',
      });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'baliball.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  } catch (e) { /* partage annulé */ }
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
