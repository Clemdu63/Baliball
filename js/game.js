/* Moteur et rendu du jeu (canvas) — thème Bali.
   Le plateau est un lagon : les pierres de temple descendent dans l'eau
   claire vers la plage, et on les casse à coups de noix de coco.

   Pierres : normales, toit de temple (triangle), volcanique blindée
   (1 dégât max par tir), mystère (bonus surprise à la casse).
   Bonus flottants : +1 noix, espadon (nettoie la ligne), durian (explose
   les voisines), piment (dégâts x2 le reste du tir), perle (monnaie),
   fleur de frangipanier (renvoie la noix tout droit vers le haut). */

import { store, KEYS, settings, loadJSON } from './storage.js';
import { getTheme, stoneStyle, DECORS } from './theme.js';
import { initAudio, sfx } from './audio.js';
import { LEVELS } from './levels.js';

const COLS = 9;
const FONT = "'Baloo 2', -apple-system, sans-serif";

let canvas = null;
let ctx = null;
let hooks = {};

// ---- layout ----
let W = 0, H = 0, dpr = 1;
let cell = 0, boardTop = 0, floorY = 0, deathRow = 8;
let ceilY = 0;   // plafond des rebonds : un couloir libre au-dessus de la grille
let offX = 0;    // iPad / paysage : plateau plafonné en largeur et centré

/* Paysage injouable : seulement quand l'écran couché est trop bas
   (téléphone) — un iPad couché garde assez de hauteur pour jouer. */
function flatBlocked() {
  return window.innerWidth > H && H < 600;
}

function readSafeInset(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return parseFloat(v) || 0;
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  H = window.innerHeight;
  // écrans larges (iPad, paysage, ordinateur) : le plateau garde des
  // proportions de téléphone et se centre, bandes latérales neutres —
  // sauf téléphone couché (pause) : plein écran pour le message
  W = flatBlocked() ? window.innerWidth
    : Math.min(window.innerWidth, Math.round(H * 0.55));
  offX = Math.round((window.innerWidth - W) / 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.style.marginLeft = offX + 'px';
  cell = W / COLS;
  ceilY = readSafeInset('--sat') + 58;
  // la grille commence une cellule sous le plafond : les noix peuvent
  // toujours filer AU-DESSUS de la rangée du haut et y rebondir
  boardTop = ceilY + cell;
  floorY = H - readSafeInset('--sab') - 66;
  deathRow = Math.max(4, Math.floor((floorY - boardTop) / cell) - 1);
}

// ---- état ----
let state = 'menu';            // menu | aim | flight | over
let round = 1;
let ballCount = 1;
let launchX = 0;
let nextLaunchX = null;
let blocks = [];               // {col,row,hp,flash,seed,type,orient?,lastHitShot?}
let powerups = [];             // {col,row,kind}
let balls = [];                // {x,y,vx,vy,dead}
let toLaunch = 0;
let launchTimer = 0;
let collectedThisTurn = 0;     // +1 noix ramassées pendant le tir
let aim = null;
let timeScale = 1;
let userFast = false;
let flightTime = 0;
let shiftAnim = 1;
let best = parseInt(store.get(KEYS.BEST) || '0', 10) || 0;
let bestScore = parseInt(store.get(KEYS.BEST_SCORE) || '0', 10) || 0;
let particles = [];
let floaters = [];
let effects = [];              // {type:'sword', y, x, dir, life} | {type:'boom', x, y, life}
let stats = { broken: 0, shots: 0 };
let score = 0;
let pearls = 0;                // perles gagnées dans cette partie
let chiliActive = false;       // dégâts x2 jusqu'à la fin du tir
let shotId = 0;                // pour le blindage « 1 dégât par tir »
let brokenThisShot = 0;
let gameClock = 0;             // temps de jeu écoulé (accélération comprise)
let lastProgress = 0;          // dernier dégât ou bonus du tir en cours
let fishes = [];
let fishTimer = 2;
let mode = 'classic';          // classic | tide | zen | puzzle | daily | weekly | tournament
let tideTime = 0;              // secondes restantes (marée montante)
let puzzle = null;             // {idx, def, shotsLeft}
let tutoActive = false;        // aides de la première partie
let ghost = null;              // défi du jour : scores par manche du meilleur run
let ghostTrace = [];           // trace du run en cours
let fever = 0;                 // jauge Gamelan (0..1), remplie par les combos
let feverActive = false;       // tir « fièvre » en cours : dégâts x2
let shieldCharges = 0;         // lotus : sauve la partie quand une pierre touche la plage
let guideShots = 0;            // boussole : la visée révèle toute la trajectoire
let weeklyMut = null;          // mutateur du défi de la semaine

const TIDE_DURATION = 90;

/* Échelle de fin de partie : le jeu se corse à mesure que le score grimpe.
   En Tournoi et Défi du jour (parties à graine partagée), les paliers se
   déclenchent à la manche pour que tous les joueurs gardent la même grille. */
const LATE_TIERS = [
  { at: 10000, round: 20, name: '🪨 Pierres larges !' },
  { at: 30000, round: 30, name: '⚪ Pierres rondes !' },
  { at: 50000, round: 38, name: '🌊 Grande marée !' },
  { at: 80000, round: 44, name: '⚡ Tempête sur le lagon !' }, // rangées denses
  { at: 100000, round: 50, name: '🔥 Pierres ardentes !' },
];

/* Courbe de difficulté : le début doit être simple et satisfaisant,
   c'est vers les manches 40-50 que le lagon se déchaîne.
   0 jusqu'à la manche 25, puis montée linéaire jusqu'à 1 à la manche 50. */
function difficulty() {
  return Math.max(0, Math.min(1, (round - 25) / 25));
}

/* PV des pierres blindées : lents à monter et plafonnés — chaque PV
   coûte ~1,2 s de pilonnage, au-delà de 6 c'était un mur infranchissable. */
function armorHpFor() {
  return Math.max(1, Math.min(6, Math.ceil(round / 8)));
}
let nextTier = 0;

const isSeeded = () => mode === 'tournament' || mode === 'daily' || mode === 'weekly';

/* Défi de la semaine : la graine vient du numéro de semaine ISO, et elle
   choisit un mutateur qui change les règles pour sept jours. */
export const MUTATORS = [
  { id: 'fog', name: '🌫 Brouillard', desc: 'Le haut du lagon est voilé' },
  { id: 'mirror', name: '🪞 Tir miroir', desc: 'La noix part à l\'opposé de la visée' },
  { id: 'rain', name: '🎁 Pluie de bonus', desc: 'Un bonus de plus par rangée' },
  { id: 'hard', name: '🗿 Pierres dures', desc: 'Pierres +50 % de solidité' },
  { id: 'speed', name: '💨 Noix rapides', desc: 'Vitesse +25 %' },
];

function isoWeekSeed() {
  const d = new Date();
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3); // jeudi de la semaine courante
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  const week = 1 + Math.round((t - firstThu) / (7 * 24 * 3600 * 1000));
  return t.getUTCFullYear() * 100 + week;
}

export function weeklyInfo() {
  const seed = isoWeekSeed();
  const m = MUTATORS[seed % MUTATORS.length];
  return { seed, id: m.id, name: m.name, desc: m.desc };
}

function tierUnlocked(i) {
  const t = LATE_TIERS[i];
  if (!t) return false;
  return isSeeded() ? round >= t.round : score >= t.at;
}

function unlockCount() {
  let n = 0;
  while (n < LATE_TIERS.length && tierUnlocked(n)) n += 1;
  return n;
}

function announceTiers() {
  while (nextTier < LATE_TIERS.length && tierUnlocked(nextTier)) {
    effects.push({ type: 'milestone', text: LATE_TIERS[nextTier].name, life: 1, color: '#7ef0d8' });
    sfx.milestone();
    nextTier += 1;
  }
}

/* Mode chronométré : marée montante. */
const isTimed = () => mode === 'tide';

/* ---- missions du jour : 3 objectifs tirés de la date, perles à la clé ---- */
const MISSION_POOL = [
  { id: 'break40', name: 'Brise 40 pierres', target: 40, reward: 10 },
  { id: 'shots30', name: 'Tire 30 fois', target: 30, reward: 8 },
  { id: 'combo6', name: 'Fais un combo ×6', target: 1, reward: 12 },
  { id: 'pearls5', name: 'Ramasse 5 perles en jeu', target: 5, reward: 10 },
  { id: 'boss1', name: 'Vaincs un Barong', target: 1, reward: 15 },
  { id: 'play3', name: 'Termine 3 parties', target: 3, reward: 8 },
  { id: 'score2k', name: 'Atteins 2 000 pts en une partie', target: 1, reward: 12 },
  { id: 'fever1', name: 'Déclenche une fièvre Gamelan', target: 1, reward: 10 },
];

let missionState = null;

function dailySeedNum() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function missionsToday() {
  const today = todayKey();
  if (missionState && missionState.date === today) return missionState;
  const saved = loadJSON(KEYS.MISSIONS, null);
  if (saved && saved.date === today && Array.isArray(saved.ids)) {
    missionState = saved;
  } else {
    const r = mulberry32(dailySeedNum() >>> 0);
    const pool = MISSION_POOL.map((_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    missionState = {
      date: today,
      ids: pool.slice(0, 3).map((i) => MISSION_POOL[i].id),
      progress: {}, done: {},
    };
    store.set(KEYS.MISSIONS, JSON.stringify(missionState));
  }
  return missionState;
}

function missionAdd(id, n = 1) {
  const st = missionsToday();
  if (!st.ids.includes(id) || st.done[id]) return;
  const def = MISSION_POOL.find((m) => m.id === id);
  st.progress[id] = Math.min(def.target, (st.progress[id] || 0) + n);
  if (st.progress[id] >= def.target) {
    st.done[id] = true;
    const wallet = parseInt(store.get(KEYS.PEARLS) || '0', 10) || 0;
    store.set(KEYS.PEARLS, String(wallet + def.reward));
    effects.push({
      type: 'milestone',
      text: '📜 Mission accomplie ! +' + def.reward + ' ◉',
      life: 1, color: '#ffd34d',
    });
    sfx.milestone();
    store.set(KEYS.MISSIONS, JSON.stringify(st));
  }
}

function missionPersist() {
  if (missionState) store.set(KEYS.MISSIONS, JSON.stringify(missionState));
}

export function getMissions() {
  const st = missionsToday();
  return st.ids.map((id) => {
    const def = MISSION_POOL.find((m) => m.id === id);
    return Object.assign({}, def, {
      progress: st.done[id] ? def.target : (st.progress[id] || 0),
      done: !!st.done[id],
    });
  });
}

/* Options du tournoi : vitesse commune et objectif de course éventuel. */
let tourOpts = { fast: false, target: null, chaos: false };

export function setTournamentOptions(o) {
  tourOpts = Object.assign({ fast: false, target: null, chaos: false }, o);
}

/* Fin imposée de l'extérieur (course gagnée par un autre joueur). */
export function forceGameOver(reason) {
  if (state === 'aim' || state === 'flight') {
    balls = [];
    toLaunch = 0;
    gameOver(reason);
  }
}

/* Cosmétiques équipés (boutique) : peau de balle, décor et sillage. */
let cosmetics = { ball: 'coco', decor: 'lagoon', trail: 'none' };

export function setCosmetics(c) {
  cosmetics = Object.assign({ ball: 'coco', decor: 'lagoon', trail: 'none' }, c);
}

/* Sillage cosmétique derrière les noix. */
const TRAILS = {
  petals: { colors: ['#ffc7dd', '#fff4f8'], vy: 26, life: 0.7 },
  embers: { colors: ['#ffb648', '#ff7847'], vy: 42, life: 0.5 },
  stars: { colors: ['#bfffe9', '#ffffff'], vy: 12, life: 0.6 },
  foam: { colors: ['#e6fbff', '#bfeef5', '#ffffff'], vy: 18, life: 0.55 },
  gold: { colors: ['#ffd34d', '#ffb648', '#fff3c4'], vy: 30, life: 0.6 },
  esprit: { colors: ['#c9b8ff', '#ffffff', '#9ff4e4'], vy: 10, life: 0.75 },
};

/* Applique le décor équipé par-dessus le thème jour/nuit. */
function themed() {
  const T = getTheme();
  const d = DECORS[cosmetics.decor];
  if (!d || !d.overrides) return T;
  return Object.assign({}, T, d.overrides);
}

const SPEED = () => cell * 9 * ((mode === 'tournament' ? tourOpts.fast : settings.fast) ? 1.4 : 1)
  * (mode === 'weekly' && weeklyMut === 'speed' ? 1.25 : 1);
const RADIUS = () => cell * 0.13;
const BONUS_R = () => cell * 0.19;
const MIN_ANGLE = 0.14;

/* Nombre maximal de téléportations d'une même noix pendant un tir :
   au-delà, les portails la laissent passer (anti-boucle infinie). */
const PORTAL_MAX = 6;

const POWERUP_KINDS = ['pearl', 'pearl', 'pearl', 'sword', 'durian', 'chili', 'flower', 'gecko', 'lotus', 'guide', 'gong'];

/* Générateur aléatoire à graine : en duel, les deux joueurs reçoivent
   exactement la même séquence de pierres et de bonus. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng = Math.random; // ne sert qu'à l'apparition des rangées (déterministe en tournoi)
let currentSeed = null;
let spawnLog = [];             // signatures des rangées apparues (tests de déterminisme)
let replaying = false;

// ---- API ----
export function initGame(canvasEl, h) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  hooks = h || {};
  resize();
  window.addEventListener('resize', resize);
  // iOS ne signale pas toujours les changements de taille (lancement,
  // rotation, barre d'outils) : on écoute aussi le viewport visuel
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 80));
  wireInput();
  requestAnimationFrame(frame);
}

/* Coup de pouce 🤝 choisi au salon : quelques noix et un lotus d'avance,
   pour jouer avec un débutant sans que ce soit plié. N'affecte que le
   plateau local — le flux de rangées partagé reste identique. */
let playerHandicap = false;

export function setPlayerHandicap(on) {
  playerHandicap = !!on;
}

export function newGame(m = 'classic', levelIdx = 0, seed = null) {
  mode = m;
  spawnLog = [];
  if (m === 'daily') {
    // la « map » du jour est la même pour toutes les parties de la journée
    const d = new Date();
    seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  } else if (m === 'weekly') {
    // même partie toute la semaine, mutateur compris
    seed = isoWeekSeed();
  }
  weeklyMut = m === 'weekly' ? MUTATORS[seed % MUTATORS.length].id : null;
  currentSeed = seed;
  rng = seed !== null ? mulberry32(seed) : Math.random;
  round = 1;
  ballCount = 1;
  launchX = W / 2;
  nextLaunchX = null;
  blocks = [];
  powerups = [];
  balls = [];
  toLaunch = 0;
  collectedThisTurn = 0;
  particles = [];
  floaters = [];
  effects = [];
  shiftAnim = 1;
  stats = { broken: 0, shots: 0 };
  score = 0;
  pearls = 0;
  chiliActive = false;
  shotId = 0;
  tideTime = TIDE_DURATION;
  puzzle = null;
  nextMilestone = 1000;
  nextTier = 0;
  fever = 0;
  feverActive = false;
  shieldCharges = 0;
  guideShots = 0;
  fogUntil = 0;
  ghostTrace = [];
  ghost = null;
  if (mode === 'daily') {
    // fantôme : les scores par manche du meilleur run du jour
    const d = loadJSON(KEYS.DAILY, {});
    if (d.date === todayKey() && Array.isArray(d.trace)) ghost = d.trace;
  }

  tutoActive = mode === 'classic' && !store.get(KEYS.TUTO);

  if (mode === 'puzzle') {
    const def = LEVELS[levelIdx] || LEVELS[0];
    puzzle = { idx: levelIdx, def, shotsLeft: def.shots };
    ballCount = def.balls;
    loadLevel(def);
  } else if (isTimed()) {
    // deux rangées d'entrée pour avoir des cibles tout de suite
    spawnRow();
    for (const b of blocks) b.row += 1;
    for (const p of powerups) p.row += 1;
    spawnRow();
  } else {
    spawnRow();
  }
  if (mode === 'weekly') {
    const m2 = MUTATORS.find((x) => x.id === weeklyMut);
    if (m2) effects.push({ type: 'milestone', text: m2.name, life: 1, color: '#7ef0d8' });
  }
  if (mode === 'tournament' && playerHandicap) {
    ballCount += 2;
    shieldCharges = Math.min(2, shieldCharges + 1);
    effects.push({ type: 'milestone', text: '🤝 Coup de pouce : +2 🥥 et un lotus !', life: 1, color: '#ffc7dd' });
  }
  state = 'aim';
  saveGame();
}

export function resumeGame(m = 'classic') {
  return loadGame(m);
}

/* Quel mode a une partie sauvegardée ? ('classic', 'zen' ou null) */
export function savedMode() {
  if (store.get(KEYS.SAVE)) return 'classic';
  if (store.get(KEYS.ZEN_SAVE)) return 'zen';
  return null;
}

export function hasSave() {
  return savedMode() !== null;
}

export function getMode() {
  return mode;
}

export function getBest() {
  return best;
}

export function getBestScore() {
  return bestScore;
}

export function toMenu() {
  // quitter en plein vol : on retrouvera le début du tour à la reprise
  if (mode === 'zen' && (state === 'aim' || state === 'flight')) {
    // le mode zen ne se termine jamais : on encaisse la session en sortant
    if (stats.shots > 0) addHistory({ mode: 'zen', score, round });
    bankPearls();
    addCumulative();
    pearls = 0;
    stats = { broken: 0, shots: 0 };
    saveGame();
  }
  state = 'menu';
  balls = [];
  toLaunch = 0;
  aim = null;
  timeScale = 1;
  userFast = false;
  chiliActive = false;
}

export function isPlaying() {
  return state === 'aim' || state === 'flight';
}

/* Dessine une icône (bonus ou pierre) dans un petit canvas pour la légende. */
export function drawLegendIcon(cv, kind) {
  const c2 = cv.getContext('2d');
  const size = cv.width;
  const oldCtx = ctx, oldCell = cell, oldBoardTop = boardTop;
  const T = themed();
  ctx = c2;
  c2.setTransform(1, 0, 0, 1, 0, 0);
  c2.clearRect(0, 0, cv.width, cv.height);
  try {
    if (['ball', 'sword', 'durian', 'chili', 'pearl', 'flower', 'gecko', 'portal', 'lotus', 'guide', 'gong'].includes(kind)) {
      cell = size * 1.35;
      boardTop = cv.height / 2 - cell / 2;
      c2.setTransform(1, 0, 0, 1, size / 2 - cell / 2, 0);
      drawPowerup({ col: 0, row: 0, kind }, 0, T, 1.2);
    } else if (kind === 'boss') {
      cell = size * 0.31;
      boardTop = cv.height / 2 - cell;
      c2.setTransform(1, 0, 0, 1, size / 2 - cell * 1.5, 0);
      drawStone({
        col: 0, row: 0, hp: 88, maxHp: 88, roarIn: 3, bossKind: 'barong',
        flash: 0, seed: 0.42, type: 'boss', orient: 0, lastHitShot: -1,
      }, 0, T);
    } else if (kind === 'coconut-ball') {
      cell = size;
      drawCoconut(size / 2, cv.height / 2, size * 0.3, T);
    } else if (kind === 'wide') {
      cell = size * 0.48;
      boardTop = cv.height / 2 - cell / 2;
      c2.setTransform(1, 0, 0, 1, size / 2 - cell, 0);
      drawStone({ col: 0, row: 0, hp: 12, flash: 0, seed: 0.42, type: 'wide', orient: 0, lastHitShot: -1 }, 0, T);
    } else {
      cell = size * 0.95;
      boardTop = cv.height / 2 - cell / 2;
      c2.setTransform(1, 0, 0, 1, size / 2 - cell / 2, 0);
      const hp = kind === 'mystery' ? 3 : kind === 'armored' ? 2 : kind === 'tri' ? 2 : kind === 'round' ? 8 : 7;
      drawStone({ col: 0, row: 0, hp, flash: 0, seed: 0.42, type: kind, orient: 1, lastHitShot: -1 }, 0, T);
    }
  } finally {
    c2.setTransform(1, 0, 0, 1, 0, 0);
    ctx = oldCtx;
    cell = oldCell;
    boardTop = oldBoardTop;
  }
}

/* Instantané compact du plateau (mode spectateur du tournoi en ligne). */
export function getBoardSnapshot() {
  return {
    blocks: blocks.map((b) => [b.col, b.row, b.hp, b.type === 'stone' ? 0 : b.type,
      b.type === 'boss' ? Math.max(0, BOSS_KINDS.indexOf(b.bossKind)) : (b.orient || 0)]),
    balls: ballCount,
  };
}

/* Dessine un instantané reçu dans un canvas (écran spectateur). */
export function drawBoardSnapshot(cv, snap) {
  const c2 = cv.getContext('2d');
  const oldCtx = ctx, oldCell = cell, oldBoardTop = boardTop;
  const T = themed();
  ctx = c2;
  // un plateau plein fait ~15 rangées : la cellule s'adapte pour que le
  // bas ne soit jamais coupé, la grille reste centrée
  cell = Math.min(cv.width / COLS, cv.height / 15);
  boardTop = 0;
  try {
    c2.setTransform(1, 0, 0, 1, 0, 0);
    const g = c2.createLinearGradient(0, 0, 0, cv.height);
    g.addColorStop(0, T.waterTop);
    g.addColorStop(1, T.waterBottom);
    c2.fillStyle = g;
    c2.fillRect(0, 0, cv.width, cv.height);
    c2.fillStyle = T.sand;
    c2.fillRect(0, cv.height - cell * 0.4, cv.width, cell * 0.4);
    c2.fillStyle = T.foam;
    c2.fillRect(0, cv.height - cell * 0.4, cv.width, 2.5);
    c2.setTransform(1, 0, 0, 1, Math.round((cv.width - cell * COLS) / 2), 0);
    for (const [col, row, hp, type, orient] of (snap && snap.blocks) || []) {
      drawStone({
        col, row, hp,
        type: type === 0 ? 'stone' : type,
        orient: orient || 0,
        maxHp: hp, bossKind: type === 'boss' ? BOSS_KINDS[orient || 0] : undefined,
        flash: 0, seed: ((col * 7 + row) % 10) / 10, lastHitShot: -1,
      }, 0, T);
    }
  } finally {
    ctx = oldCtx;
    cell = oldCell;
    boardTop = oldBoardTop;
  }
}

/* Réglage direct d'états volatils — réservé aux tests automatisés. */
export function debugSet(o) {
  if (o && typeof o.guide === 'number') guideShots = o.guide;
  if (o && typeof o.fever === 'number') fever = o.fever;
  if (o && o.clearBlocks) blocks = [];
  if (o && o.setBall) {
    // place une noix précise (tests de trajectoire : boucles de portails…)
    balls = [{ x: o.setBall.x, y: o.setBall.y, vx: o.setBall.vx, vy: o.setBall.vy, dead: false }];
    toLaunch = 0;
  }
  if (o && Array.isArray(o.spawnPortals)) {
    const [c1, r1, c2, r2] = o.spawnPortals;
    powerups.push({ col: c1, row: r1, kind: 'portal', pair: 999 });
    powerups.push({ col: c2, row: r2, kind: 'portal', pair: 999 });
  }
  if (o && typeof o.spawnBoss === 'string' && BOSS_KINDS.includes(o.spawnBoss)) {
    blocks.push({
      col: Math.floor((COLS - 3) / 2), row: 0, hp: 60, maxHp: 60, roarIn: 1, bossKind: o.spawnBoss,
      flash: 0, seed: Math.random(), type: 'boss', orient: 0, lastHitShot: -1,
    });
  }
}

/* État minimal exposé pour les tests automatisés. */
export function debugState() {
  const b = blocks.find((x) => x.type === 'boss');
  return {
    state, mode, round, score, pearls, ballCount, launchX, lastFiredAngle,
    timeScale, accelBtn: accelBtnRect(), spawnLog,
    fever, shield: shieldCharges, weeklyMut, fogUntil,
    ghostLen: ghost ? ghost.length : 0,
    guideShots, aimSteps: aimSteps(),
    boss: b ? { hp: b.hp, maxHp: b.maxHp, roarIn: b.roarIn, kind: b.bossKind } : null,
    shotsLeft: puzzle ? puzzle.shotsLeft : null,
    blocks: blocks.map((x) => ({ col: x.col, row: x.row, hp: x.hp, type: x.type })),
    geometry: { W, boardTop, floorY, cell, deathRow },
  };
}

// ---- grille ----
function blockRect(b, yOffset) {
  const pad = cell * 0.055;
  const span = b.type === 'wide' ? 2 : b.type === 'boss' ? 3 : 1;
  const vspan = b.type === 'boss' ? 2 : 1;
  return {
    x0: b.col * cell + pad,
    y0: boardTop + (b.row + yOffset) * cell + pad,
    x1: (b.col + span) * cell - pad,
    y1: boardTop + (b.row + vspan + yOffset) * cell - pad,
  };
}

/* Rangée du bas d'une pierre (le Barong occupe deux rangées). */
function bottomRow(b) {
  return b.row + (b.type === 'boss' ? 1 : 0);
}

function powerupCenter(p, yOffset) {
  return {
    x: (p.col + 0.5) * cell,
    y: boardTop + (p.row + 0.5 + yOffset) * cell,
  };
}

// ---- cycle ----

/* Charge une grille du mode Temples (voir js/levels.js pour les symboles). */
function loadLevel(def) {
  blocks = [];
  powerups = [];
  // grilles dessinées sur 7 colonnes : centrées sur le plateau élargi
  const gw = Math.max(...def.grid.map((r) => r.length));
  const off = Math.max(0, Math.floor((COLS - gw) / 2));
  const addStone = (col, row, hp, type, orient = 0) => {
    blocks.push({ col: col + off, row, hp, flash: 0, seed: Math.random(), type, orient, lastHitShot: -1 });
  };
  const addPowerup = (col, row, kind) => {
    powerups.push({ col: col + off, row, kind });
  };
  def.grid.forEach((rowStr, row) => {
    for (let col = 0; col < rowStr.length; col++) {
      const ch = rowStr[col] || '.';
      if (ch === '.') continue;
      // symboles spéciaux d'abord : « o » est un bonus, pas une pierre a-v
      if (ch === 'o') addPowerup(col, row, 'ball');
      else if (ch === '*') addPowerup(col, row, 'pearl');
      else if (ch === 'F') addPowerup(col, row, 'flower');
      else if (ch === 'D') addPowerup(col, row, 'durian');
      else if (ch === 'C') addPowerup(col, row, 'chili');
      else if (ch === 'W') addPowerup(col, row, 'sword');
      else if (ch === 'X') addStone(col, row, 2, 'armored');
      else if (ch === 'Y') addStone(col, row, 3, 'armored');
      else if (ch >= 'P' && ch <= 'S') addStone(col, row, 2, 'tri', ch.charCodeAt(0) - 80);
      else if (ch === '?') addStone(col, row, 3, 'mystery');
      else if (ch >= '1' && ch <= '9') addStone(col, row, +ch, 'stone');
      else if (ch >= 'a' && ch <= 'v') addStone(col, row, 10 + ch.charCodeAt(0) - 97, 'stone');
    }
  });
}

/* Événements communs du tournoi : toutes les 5 manches (hors manches à
   Barong), le même pour tous les joueurs — dérivé de la graine, donc
   valable aussi en tournoi hors ligne, sans aucun message réseau. */
const TOUR_EVENTS = [
  { id: 'rain', name: '🎁 Pluie de bonus !' },
  { id: 'gift', name: '🥥 Marée généreuse : +2 noix !' },
  { id: 'fog', name: '🌫 Brume sur le lagon !' },
  { id: 'wind', name: '🌋 Vent du volcan : pierres durcies !' },
];
let fogUntil = 0;              // brume d'événement : voile jusqu'à cette manche

function tourEventFor(r) {
  // option Chaos du salon : un événement toutes les 3 manches au lieu de 5
  const step = tourOpts.chaos ? 3 : 5;
  if (mode !== 'tournament' || r < step || r % step !== 0 || bossRound(r)) return null;
  const roll = mulberry32(((currentSeed || 0) ^ Math.imul(r, 7919)) >>> 0)();
  return TOUR_EVENTS[Math.floor(roll * TOUR_EVENTS.length)];
}

/* Sabotage amical (option de salon du tournoi en ligne) : une vague
   adverse fait surgir une pierre blindée sur le plateau. */
/* Cases libres des rangées 1 à 3 (renforts de boss, vagues adverses). */
function freeCells() {
  const occupied = new Set();
  for (const b of blocks) {
    const span = b.type === 'wide' ? 2 : b.type === 'boss' ? 3 : 1;
    const vspan = b.type === 'boss' ? 2 : 1;
    for (let c = 0; c < span; c++) {
      for (let r = 0; r < vspan; r++) occupied.add((b.col + c) + ':' + (b.row + r));
    }
  }
  for (const p of powerups) occupied.add(p.col + ':' + p.row);
  const free = [];
  for (let r = 1; r <= 3; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!occupied.has(c + ':' + r)) free.push([c, r]);
    }
  }
  return free;
}

function placeStones(rand, free, n, type, hp) {
  while (n > 0 && free.length > 0) {
    const i = Math.floor(rand() * free.length);
    const [c, r] = free.splice(i, 1)[0];
    blocks.push({
      col: c, row: r, hp,
      flash: 1, seed: Math.random(), type, orient: 0, lastHitShot: -1,
    });
    n -= 1;
  }
}

/* Mode Versus ⚔️ : attaque reçue d'un adversaire (combo ×3/×5/×7). */
export function applyAttack(power, who) {
  if (state !== 'aim' && state !== 'flight') return false;
  const free = freeCells();
  const p = Math.max(1, Math.min(3, power | 0));
  if (p === 1) {
    placeStones(Math.random, free, 1, 'stone', Math.max(2, round));
  } else if (p === 2) {
    placeStones(Math.random, free, 1, 'armored', armorHpFor());
    placeStones(Math.random, free, 1, 'stone', Math.max(2, round));
  } else {
    fogUntil = Math.max(fogUntil, round + 1);
    placeStones(Math.random, free, 1, 'armored', armorHpFor());
  }
  effects.push({
    type: 'milestone',
    text: '⚔️ ' + (who ? '« ' + who + ' » attaque' : 'Attaque') + ' ×' + p + ' !',
    life: 1, color: '#ff7d6e',
  });
  sfx.boom();
  buzz([30, 40, 50]);
  return true;
}

/* Sabotage reçu d'un adversaire : trois effets possibles. */
export function applySabotage(kind) {
  if (state !== 'aim' && state !== 'flight') return false;
  if (kind === 'fog') {
    fogUntil = Math.max(fogUntil, round + 1);
    effects.push({ type: 'milestone', text: '🌫 Brume adverse !', life: 1, color: '#9fd7e8' });
    sfx.boom();
    buzz(30);
    return true;
  }
  if (kind === 'steal') {
    if (ballCount > 1) {
      ballCount -= 1;
      floaters.push({ x: launchX, y: floorY - cell * 0.6, life: 1, text: '−1 🥥' });
    }
    effects.push({ type: 'milestone', text: '🐒 Singe voleur adverse !', life: 1, color: '#ffb648' });
    sfx.boom();
    buzz(30);
    return true;
  }
  return dropSurpriseStone();
}

export function dropSurpriseStone() {
  if (state !== 'aim' && state !== 'flight') return false;
  const free = freeCells();
  if (!free.length) return false;
  placeStones(Math.random, free, 1, 'armored', armorHpFor());
  effects.push({ type: 'milestone', text: '🌊 Vague adverse !', life: 1, color: '#7ef0d8' });
  sfx.boom();
  return true;
}

/* Le Barong apparaît toutes les 10 manches dans les modes sans fin.
   La décision ne dépend que de la manche : en tournoi, tous les joueurs
   le voient au même moment et le flux aléatoire principal reste intact. */
function bossRound(r) {
  return r >= 10 && r % 10 === 0 && mode !== 'puzzle' && !isTimed();
}

/* Six boss se relaient toutes les 10 manches, chacun son pouvoir :
   Barong (10) appelle 2 blindées · Rangda (20) se régénère · Naga (30)
   dresse un mur · Garuda (40) fait surgir une pierre large · le Léak (50)
   maudit des pierres en blindées · Hanuman (60) chipe une noix. */
const BOSS_KINDS = ['barong', 'rangda', 'naga', 'garuda', 'leyak', 'hanuman',
  'bedawang', 'dewi', 'raksasa'];
const BOSS_NAMES = {
  barong: '🎭 Le Barong', rangda: '👺 Rangda', naga: '🐉 Le Naga',
  garuda: '🦅 Garuda', leyak: '🔥 Le Léak', hanuman: '🐒 Hanuman',
  bedawang: '🐢 Bedawang', dewi: '🌊 Dewi Danu', raksasa: '👹 Le Raksasa',
};

/* Illustrations des masques (chargées en fond ; repli vectoriel sinon).
   Chemins littéraux : la démo mono-fichier les remplace par des data URI. */
const BOSS_ART_SRC = {
  barong: 'art/boss-barong.webp',
  rangda: 'art/boss-rangda.webp',
  naga: 'art/boss-naga.webp',
  garuda: 'art/boss-garuda.webp',
  leyak: 'art/boss-leyak.webp',
  hanuman: 'art/boss-hanuman.webp',
  bedawang: 'art/boss-bedawang.webp',
  dewi: 'art/boss-dewi.webp',
  raksasa: 'art/boss-raksasa.webp',
};
const BOSS_ART = {};
for (const k of BOSS_KINDS) {
  const img = new Image();
  img.src = BOSS_ART_SRC[k];
  BOSS_ART[k] = img;
}

function bossArtReady(kind) {
  const img = BOSS_ART[kind];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

function spawnRow() {
  if (bossRound(round)) {
    const kind = BOSS_KINDS[(Math.floor(round / 10) - 1) % BOSS_KINDS.length];
    // premiers boss abordables (~2 manches), les tardifs redoutables
    const mult = 4.5 + 3.5 * difficulty();
    const hp = Math.max(30, Math.round(round * mult * (unlockCount() >= 5 ? 1.3 : 1)));
    blocks.push({
      col: Math.floor((COLS - 3) / 2), row: 0, hp, maxHp: hp,
      roarIn: round < 30 ? 4 : 3, bossKind: kind,
      flash: 0, seed: Math.random(), type: 'boss', orient: 0, lastHitShot: -1,
    });
    if (!replaying) {
      spawnLog.push(round + ':BOSS-' + kind + hp);
      effects.push({ type: 'bossIntro', kind, life: 1 });
      sfx.bossVoice(kind);
      buzz(40);
    }
    return;
  }
  const lvl = unlockCount();
  const ev = tourEventFor(round);
  let hpMult = lvl >= 5 ? 1.3 : 1; // pierres ardentes : tout durcit
  if (lvl >= 4) hpMult *= 1.15;    // tempête : pierres renforcées
  if (mode === 'weekly' && weeklyMut === 'hard') hpMult *= 1.5;
  if (ev && ev.id === 'wind') hpMult *= 1.25;
  const used = new Set();

  // palier 1 : pierre large sur deux colonnes
  if (lvl >= 1 && rng() < 0.22) {
    const c = Math.floor(rng() * (COLS - 1));
    blocks.push({
      col: c, row: 0,
      hp: Math.max(2, Math.round(round * 1.5 * hpMult)),
      flash: 0, seed: Math.random(), type: 'wide', orient: 0, lastHitShot: -1,
    });
    used.add(c);
    used.add(c + 1);
  }

  const cols = Array.from({ length: COLS }, (_, i) => i).filter((c) => !used.has(c));
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cols[i], cols[j]] = [cols[j], cols[i]];
  }
  // tempête (80 000) : une pierre de plus par rangée (rangées légères au
  // début ; sur 9 colonnes, 2-4 pierres puis 3-6 laissent l'espace qui
  // rend les tirs visés intéressants)
  const n = Math.min(cols.length - 1,
    (round < 12 ? 2 : 3) + Math.floor(rng() * (round < 12 ? 3 : 4)) + (lvl >= 4 ? 1 : 0));
  // blindées : rares au début (3 %), elles se multiplient vers les manches 40-50
  const armoredChance = lvl >= 5 ? 0.2 : 0.03 + 0.09 * difficulty();
  for (let i = 0; i < n; i++) {
    const roll = rng();
    let type = 'stone';
    if (roll < armoredChance && round >= 8) type = 'armored';
    else if (roll < armoredChance + 0.14 && round >= 2) type = 'tri';
    else if (roll < armoredChance + 0.20 && round >= 3) type = 'mystery';
    else if (lvl >= 2 && roll < armoredChance + 0.42) type = 'round'; // palier 2
    const hp = type === 'armored'
      ? armorHpFor()
      : Math.max(1, Math.round(round * (rng() < 0.18 && round >= 12 ? 2 : 1) * hpMult));
    blocks.push({
      col: cols[i], row: 0, hp, flash: 0, seed: Math.random(), type,
      orient: type === 'tri' ? Math.floor(rng() * 4) : 0,
      lastHitShot: -1,
    });
  }
  let free = n;
  if (free < cols.length) {
    powerups.push({ col: cols[free], row: 0, kind: 'ball' });
    free += 1;
  }
  if (free < cols.length && rng() < 0.4) {
    const kind = POWERUP_KINDS[Math.floor(rng() * POWERUP_KINDS.length)];
    powerups.push({ col: cols[free], row: 0, kind });
    free += 1;
  }
  if (mode === 'weekly' && weeklyMut === 'rain' && free < cols.length) {
    const kind = POWERUP_KINDS[Math.floor(rng() * POWERUP_KINDS.length)];
    powerups.push({ col: cols[free], row: 0, kind });
    free += 1;
  }
  // événement « pluie de bonus » : deux bonus de plus dans la rangée
  if (ev && ev.id === 'rain') {
    for (let k = 0; k < 2 && free < cols.length; k++) {
      const kind = POWERUP_KINDS[Math.floor(rng() * POWERUP_KINDS.length)];
      powerups.push({ col: cols[free], row: 0, kind });
      free += 1;
    }
  }
  // portails jumeaux : la noix qui entre dans l'un ressort de l'autre
  if (round >= 5 && free + 1 < cols.length && rng() < 0.12) {
    powerups.push({ col: cols[free], row: 0, kind: 'portal', pair: round });
    powerups.push({ col: cols[free + 1], row: 0, kind: 'portal', pair: round });
    free += 2;
  }
  if (!replaying) {
    spawnLog.push(round + ':'
      + blocks.filter((b) => b.row === 0).map((b) => b.col + b.type + b.hp).join(',')
      + '|' + powerups.filter((p) => p.row === 0).map((p) => p.col + p.kind).join(','));
  }
}

function endTurn() {
  ballCount += collectedThisTurn;
  collectedThisTurn = 0;
  chiliActive = false;
  feverActive = false;
  if (mode === 'tournament' && tourOpts.target && score >= tourOpts.target) {
    gameOver('race');
    return;
  }
  if (nextLaunchX !== null) launchX = nextLaunchX;
  nextLaunchX = null;
  timeScale = 1;
  userFast = false;
  flightTime = 0;

  if (mode === 'puzzle') {
    // pas de descente : on vérifie la victoire ou l'épuisement des tirs
    if (blocks.length === 0) {
      puzzleWin();
      return;
    }
    if (puzzle.shotsLeft <= 0) {
      gameOver('shots');
      return;
    }
    state = 'aim';
    return;
  }

  if (mode === 'daily') ghostTrace[round] = score;

  // palier 3 (Grande marée) : toutes les 5 manches, tout descend de DEUX crans
  const bigTide = tierUnlocked(2) && (round + 1) % 5 === 0;
  const shifts = bigTide ? 2 : 1;
  if (bigTide) {
    effects.push({ type: 'milestone', text: '🌊 Grande marée !', life: 1, color: '#7ef0d8' });
  }
  for (let s = 0; s < shifts; s++) {
    for (const b of blocks) b.row += 1;
    for (const p of powerups) p.row += 1;
    powerups = powerups.filter((p) => {
      if (p.row >= deathRow) {
        // arrivés sur la plage : les +1 noix sont ramassés, le reste est perdu
        if (p.kind === 'ball') {
          ballCount += 1;
          const c = powerupCenter(p, 0);
          floaters.push({ x: c.x, y: c.y, life: 1, text: '+1' });
        }
        return false;
      }
      return true;
    });
    const reached = blocks.filter((b) => bottomRow(b) >= deathRow);
    if (reached.length > 0) {
      if (mode === 'classic' || mode === 'daily' || mode === 'weekly' || mode === 'tournament') {
        if (shieldCharges > 0) {
          // le lotus s'ouvre : la marée engloutit les pierres au lieu de perdre
          shieldCharges -= 1;
          effects.push({ type: 'milestone', text: '🪷 Le lotus te sauve !', life: 1, color: '#ffc7dd' });
          sfx.milestone();
        } else {
          gameOver('line');
          return;
        }
      }
      // la marée emporte les pierres du bas (zen, marée… ou lotus ouvert)
      blocks = blocks.filter((b) => bottomRow(b) < deathRow);
      for (const b of reached) {
        const rc = blockRect(b, 0);
        const cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
        for (let p = 0; p < 6 && particles.length < MAX_PARTICLES; p++) {
          particles.push({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * cell * 2,
            vy: -Math.random() * cell,
            life: 1, color: 'rgba(255,255,255,0.8)',
          });
        }
      }
      if (reached.length) sfx.wall();
    }
  }
  // un portail dont le jumeau a été emporté par la marée devient inerte
  const pairCount = {};
  for (const p of powerups) {
    if (p.kind === 'portal') pairCount[p.pair] = (pairCount[p.pair] || 0) + 1;
  }
  powerups = powerups.filter((p) => p.kind !== 'portal' || pairCount[p.pair] === 2);

  shiftAnim = 0;
  round += 1;
  if (isSeeded()) announceTiers();

  // cap de manche : tous les 25 crans, une pluie de perles
  if (round % 25 === 0 && mode !== 'puzzle' && !isTimed()) {
    pearls += 10;
    effects.push({
      type: 'milestone', text: '🏝 Cap de la manche ' + round + ' ! +10 ◉',
      life: 1, color: '#ffd34d',
    });
    sfx.milestone();
  }

  // événement commun du tournoi (bannière et effets hors-apparition ;
  // la pluie de bonus et le vent s'appliquent dans spawnRow)
  const ev2 = tourEventFor(round);
  if (ev2) {
    effects.push({ type: 'milestone', text: ev2.name, life: 1, color: '#7ef0d8' });
    sfx.milestone();
    if (ev2.id === 'gift') ballCount += 2;
    if (ev2.id === 'fog') fogUntil = round + 2;
    if (!replaying) spawnLog.push('E' + round + ':' + ev2.id);
  }

  sfx.newRow();
  spawnRow();

  // le boss agit s'il survit 3 tours : chaque boss a son pouvoir
  const boss = blocks.find((b) => b.type === 'boss');
  if (boss) {
    boss.roarIn = (boss.roarIn || 3) - 1;
    if (boss.roarIn <= 0) {
      boss.roarIn = round < 30 ? 4 : 3;
      if (bossRoar(boss)) return; // séisme fatal : la partie vient de finir
    }
  }

  missionPersist();
  state = 'aim';
  saveGame();
  if (hooks.onTurnEnd) hooks.onTurnEnd({ mode, score, round, combo: brokenThisShot });
}

/* Pouvoir du boss. Le flux aléatoire principal (rangées) ne doit pas
   dépendre du joueur : on tire dans un flux dérivé de la graine et de la
   manche, identique pour tous ceux dont le boss est encore en vie.
   - Barong : rugit, 2 pierres blindées surgissent
   - Rangda : jette un sort, se régénère et appelle 1 blindée
   - Naga   : déferle, un mur de 3 pierres surgit */
function bossRoar(boss) {
  const side = currentSeed !== null
    ? mulberry32((currentSeed ^ Math.imul(round, 2654435761)) >>> 0)
    : Math.random;
  const free = freeCells();
  const armorHp = armorHpFor();
  sfx.bossVoice(boss.bossKind);
  if (boss.bossKind === 'rangda') {
    const heal = Math.min(boss.maxHp - boss.hp, Math.max(4, Math.ceil(round / 2)));
    boss.hp += heal;
    effects.push({ type: 'milestone', text: '👺 Rangda jette un sort !', life: 1, color: '#ff8c3d' });
    if (heal > 0) {
      const rc = blockRect(boss, 0);
      floaters.push({ x: (rc.x0 + rc.x1) / 2, y: rc.y0, life: 1, text: '+' + heal });
    }
    placeStones(side, free, 1, 'armored', armorHp);
  } else if (boss.bossKind === 'naga') {
    effects.push({ type: 'milestone', text: '🐉 Le Naga déferle !', life: 1, color: '#ff8c3d' });
    placeStones(side, free, 3, 'stone', Math.max(2, round));
  } else if (boss.bossKind === 'garuda') {
    // un battement d'ailes : une pierre large s'abat sur le lagon
    effects.push({ type: 'milestone', text: '🦅 Garuda déchaîne les vents !', life: 1, color: '#ff8c3d' });
    let placed = false;
    for (let i = 0; i < free.length && !placed; i++) {
      const [c, r] = free[i];
      if (c + 1 < COLS && free.some(([c2, r2]) => c2 === c + 1 && r2 === r)) {
        blocks.push({
          col: c, row: r, hp: Math.max(2, Math.round(round * 1.5)),
          flash: 1, seed: Math.random(), type: 'wide', orient: 0, lastHitShot: -1,
        });
        placed = true;
      }
    }
    if (!placed) placeStones(side, free, 2, 'stone', Math.max(2, round));
  } else if (boss.bossKind === 'leyak') {
    // malédiction : jusqu'à 2 pierres normales deviennent blindées
    effects.push({ type: 'milestone', text: '🔥 Le Léak maudit les pierres !', life: 1, color: '#ff8c3d' });
    const targets = blocks.filter((x) => x.type === 'stone');
    for (let k = 0; k < 2 && targets.length > 0; k++) {
      const i = Math.floor(side() * targets.length);
      const t = targets.splice(i, 1)[0];
      t.type = 'armored';
      t.hp = armorHpFor();
      t.flash = 1;
    }
  } else if (boss.bossKind === 'hanuman') {
    // le singe blanc chipe une noix de la rafale
    effects.push({ type: 'milestone', text: '🐒 Hanuman chipe une noix !', life: 1, color: '#ff8c3d' });
    if (ballCount > 1) {
      ballCount -= 1;
      const rc = blockRect(boss, 0);
      floaters.push({ x: (rc.x0 + rc.x1) / 2, y: rc.y1, life: 1, text: '−1 🥥' });
    } else {
      placeStones(side, free, 1, 'armored', armorHp);
    }
  } else if (boss.bossKind === 'bedawang') {
    // séisme : tout descend d'un cran immédiatement, sans nouvelle rangée
    effects.push({ type: 'milestone', text: '🐢 Bedawang fait trembler l\'île !', life: 1, color: '#ff8c3d' });
    for (const b2 of blocks) b2.row += 1;
    for (const p2 of powerups) p2.row += 1;
    powerups = powerups.filter((p2) => {
      if (p2.row >= deathRow) {
        if (p2.kind === 'ball') ballCount += 1;
        return false;
      }
      return true;
    });
    const reached = blocks.filter((b2) => bottomRow(b2) >= deathRow);
    if (reached.length > 0) {
      if (mode === 'zen' || isTimed()) {
        blocks = blocks.filter((b2) => bottomRow(b2) < deathRow);
      } else if (shieldCharges > 0) {
        shieldCharges -= 1;
        effects.push({ type: 'milestone', text: '🪷 Le lotus te sauve !', life: 1, color: '#ffc7dd' });
        sfx.milestone();
        blocks = blocks.filter((b2) => bottomRow(b2) < deathRow);
      } else {
        gameOver('line');
        return true;
      }
    }
    stats.quake = true; // séisme survécu (succès)
    shiftAnim = 0;
  } else if (boss.bossKind === 'dewi') {
    // la déesse du lac noie le lagon dans la brume pour 2 manches
    effects.push({ type: 'milestone', text: '🌊 Dewi Danu voile le lagon !', life: 1, color: '#9fd7e8' });
    fogUntil = round + 2;
    placeStones(side, free, 1, 'armored', armorHp);
  } else if (boss.bossKind === 'raksasa') {
    // l'ogre dévore tous les bonus flottants du plateau
    effects.push({ type: 'milestone', text: '👹 Le Raksasa dévore les bonus !', life: 1, color: '#ff8c3d' });
    if (powerups.length > 0) {
      for (const p2 of powerups) {
        const c2 = powerupCenter(p2, 0);
        floaters.push({ x: c2.x, y: c2.y, life: 1, text: '😋' });
      }
      powerups = [];
    } else {
      placeStones(side, free, 1, 'armored', armorHp);
    }
  } else {
    effects.push({ type: 'milestone', text: '🎭 Le Barong rugit !', life: 1, color: '#ff8c3d' });
    placeStones(side, free, 2, 'armored', armorHp);
  }
}

function bankPearls() {
  const wallet = parseInt(store.get(KEYS.PEARLS) || '0', 10) || 0;
  store.set(KEYS.PEARLS, String(wallet + pearls));
}

/* Historique des parties récentes (écran Progrès). */
function addHistory(entry) {
  const h = loadJSON(KEYS.HISTORY, []);
  h.unshift(Object.assign({ ts: Date.now() }, entry));
  store.set(KEYS.HISTORY, JSON.stringify(h.slice(0, 20)));
}

/* Statistiques cumulées (succès et écran Progrès). */
function addCumulative(puzzleWon) {
  const c = loadJSON(KEYS.STATS, {});
  c.gamesPlayed = (c.gamesPlayed || 0) + 1;
  c.bricksBroken = (c.bricksBroken || 0) + stats.broken;
  c.shotsFired = (c.shotsFired || 0) + stats.shots;
  c.pearlsEarned = (c.pearlsEarned || 0) + pearls;
  c.bestRound = Math.max(c.bestRound || 0, mode === 'puzzle' ? 0 : round);
  c.bestScore = Math.max(c.bestScore || 0, score);
  // par mode : record de manche/score, nombre de parties, victoires Temples
  c.byMode = c.byMode || {};
  const m = c.byMode[mode] || { games: 0, round: 0, score: 0, wins: 0 };
  m.games += 1;
  m.round = Math.max(m.round, mode === 'puzzle' ? 0 : round);
  m.score = Math.max(m.score, score);
  if (puzzleWon) m.wins += 1;
  c.byMode[mode] = m;
  // panthéon des boss vaincus + séisme survécu
  if (stats.kills && stats.kills.length) {
    c.bossKills = c.bossKills || {};
    for (const k of stats.kills) c.bossKills[k] = (c.bossKills[k] || 0) + 1;
  }
  if (stats.quake) c.quakeSurvived = true;
  store.set(KEYS.STATS, JSON.stringify(c));
}

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

function gameOver(reason) {
  state = 'over';
  if (mode === 'classic') {
    if (round > best) {
      best = round;
      store.set(KEYS.BEST, String(best));
    }
    if (score > bestScore) {
      bestScore = score;
      store.set(KEYS.BEST_SCORE, String(bestScore));
    }
    store.remove(KEYS.SAVE);
  } else if (mode === 'tide') {
    const tb = parseInt(store.get(KEYS.TIDE_BEST) || '0', 10) || 0;
    if (score > tb) store.set(KEYS.TIDE_BEST, String(score));
  } else if (mode === 'daily') {
    const today = todayKey();
    const d = loadJSON(KEYS.DAILY, {});
    if (d.date !== today) { d.score = 0; d.round = 0; d.trace = null; }
    d.date = today;
    if (score >= (d.score || 0)) {
      ghostTrace[round] = score;
      d.trace = ghostTrace; // nouveau meilleur run : il devient le fantôme
    }
    d.score = Math.max(d.score || 0, score);
    d.round = Math.max(d.round || 0, round);
    store.set(KEYS.DAILY, JSON.stringify(d));
  } else if (mode === 'weekly') {
    const wk = isoWeekSeed();
    const w = loadJSON(KEYS.WEEKLY, {});
    if (w.week !== wk) { w.score = 0; w.round = 0; }
    w.week = wk;
    w.score = Math.max(w.score || 0, score);
    w.round = Math.max(w.round || 0, round);
    store.set(KEYS.WEEKLY, JSON.stringify(w));
  }
  if (mode === 'tournament') store.remove(KEYS.TOUR_SAVE);
  missionAdd('play3');
  if (score >= 2000) missionAdd('score2k');
  missionPersist();
  addHistory({ mode, score, round, reason });
  bankPearls();
  addCumulative();
  sfx.over();
  buzz([50, 60, 90]);
  const bossAtDeath = blocks.find((b) => b.type === 'boss');
  if (hooks.onGameOver) {
    const daily = loadJSON(KEYS.DAILY, {});
    const weekly = loadJSON(KEYS.WEEKLY, {});
    hooks.onGameOver({
      mode,
      reason,
      round,
      best,
      score,
      bestScore,
      tideBest: parseInt(store.get(KEYS.TIDE_BEST) || '0', 10) || 0,
      dailyBest: daily.date === todayKey() ? daily.score || 0 : 0,
      weeklyBest: weekly.week === isoWeekSeed() ? weekly.score || 0 : 0,
      level: puzzle ? puzzle.idx : 0,
      pearls,
      broken: stats.broken,
      shots: stats.shots,
      balls: ballCount,
      bossKind: reason === 'line' && bossAtDeath ? bossAtDeath.bossKind : null,
      bossName: reason === 'line' && bossAtDeath ? BOSS_NAMES[bossAtDeath.bossKind] : null,
    });
  }
}

function puzzleWin() {
  state = 'over';
  const used = puzzle.def.shots - puzzle.shotsLeft;
  const [s3, s2] = puzzle.def.stars;
  const starCount = used <= s3 ? 3 : used <= s2 ? 2 : 1;
  const prog = loadJSON(KEYS.PUZZLE, { unlocked: 1, stars: {} });
  prog.stars[puzzle.idx] = Math.max(prog.stars[puzzle.idx] || 0, starCount);
  prog.unlocked = Math.max(prog.unlocked || 1, puzzle.idx + 2);
  store.set(KEYS.PUZZLE, JSON.stringify(prog));
  missionAdd('play3');
  missionPersist();
  addHistory({ mode: 'puzzle', score, level: puzzle.idx, stars: starCount, win: true });
  bankPearls();
  addCumulative(true);
  sfx.bonus();
  if (hooks.onPuzzleWin) {
    hooks.onPuzzleWin({
      level: puzzle.idx,
      name: puzzle.def.name,
      stars: starCount,
      shotsUsed: used,
      pearls,
      hasNext: puzzle.idx + 1 < LEVELS.length,
    });
  }
}

function fire(angle) {
  // mutateur miroir : la noix part à l'opposé de la visée
  if (mode === 'weekly' && weeklyMut === 'mirror') angle = Math.PI - angle;
  // jauge Gamelan pleine : ce tir est une fièvre à dégâts doublés
  if (fever >= 1) {
    feverActive = true;
    fever = 0;
    effects.push({ type: 'milestone', text: '🔥 FIÈVRE GAMELAN !', life: 1, color: '#ff9d3c' });
    sfx.chili();
    missionAdd('fever1');
  }
  missionAdd('shots30');
  if (guideShots > 0) guideShots -= 1;
  toLaunch = ballCount;
  launchTimer = 0;
  aim = { angle };
  state = 'flight';
  flightTime = 0;
  stats.shots += 1;
  shotId += 1;
  brokenThisShot = 0;
  lastProgress = gameClock;
  if (puzzle) puzzle.shotsLeft -= 1;
  lastFiredAngle = angle;
  sfx.launch();
  // dans le geste du toucher : le tic du lancer passe même quand iOS
  // exige une activation utilisateur récente
  buzz(12);
}

let lastFiredAngle = null;

// ---- score ----
let nextMilestone = 1000;
const CONFETTI = ['#ffd34d', '#52d332', '#3b96f5', '#f75f92', '#ff9d3c'];

function addPoints(n) {
  score += n;
  if (score >= nextMilestone) {
    celebrate(Math.floor(score / 1000) * 1000);
    nextMilestone = Math.floor(score / 1000) * 1000 + 1000;
  }
  if (!isSeeded()) announceTiers();
}

/* Palier franchi : bannière, confettis et gong. */
function celebrate(value) {
  effects.push({ type: 'milestone', text: value.toLocaleString('fr-FR') + ' pts !', life: 1 });
  for (let i = 0; i < 26 && particles.length < MAX_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      x: W / 2 + (Math.random() - 0.5) * cell * 2,
      y: boardTop + (floorY - boardTop) * 0.3,
      vx: Math.cos(a) * cell * (1 + Math.random() * 2),
      vy: Math.sin(a) * cell * (1 + Math.random() * 2) - cell,
      life: 1.4,
      color: CONFETTI[i % CONFETTI.length],
    });
  }
  sfx.milestone();
}

function addScore(damage) {
  const comboMult = 1 + Math.min(brokenThisShot, 10) * 0.25;
  addPoints(Math.round(damage * 10 * comboMult));
}

// ---- dégâts ----
function damageBlock(b, amount, cx, cy) {
  if (b.type === 'armored') {
    // le blindage encaisse au plus 1 dégât par ~1,2 s de jeu
    if (gameClock - (b.lastArmorHit || -9) < 1.2) return false;
    b.lastArmorHit = gameClock;
    amount = 1;
  }
  lastProgress = gameClock;
  const style = stoneStyle(b.hp);
  b.hp -= amount;
  b.flash = 1;
  addScore(Math.min(amount, Math.max(0, b.hp + amount)));
  if (b.hp <= 0) {
    breakBlock(b, style, cx, cy);
    return true;
  }
  return false;
}

const MAX_PARTICLES = 280;

/* Vibrations. Android : navigator.vibrate (motifs réels). iOS ne
   l'expose pas ; depuis iOS 17.4, actionner le label d'un
   <input switch> natif déclenche l'haptique du système. Montage
   éprouvé tel quel : un label jetable dans <head>, cliqué puis retiré
   — display:none n'empêche pas le retour haptique. Selon la version
   d'iOS, l'effet peut exiger un toucher récent de l'utilisateur. */
let hapticMount = null;

function iosTick() {
  try {
    if (!hapticMount) {
      // monté en permanence et réellement rendu (2×2 px quasi invisibles
      // dans un coin) : certaines versions d'iOS ignorent un élément
      // display:none ou hors écran
      hapticMount = document.createElement('label');
      hapticMount.setAttribute('aria-hidden', 'true');
      hapticMount.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;'
        + 'height:2px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:1;';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      hapticMount.appendChild(input);
      document.body.appendChild(hapticMount);
    }
    hapticMount.click();
  } catch (e) { /* pas d'haptique */ }
}

/* Test direct depuis les Réglages — lancé DANS le geste du toucher,
   et sans passer par le réglage : il doit sonder le matériel. */
export function hapticTest() {
  try {
    if (navigator.vibrate) { navigator.vibrate([30, 80, 30, 80, 60]); return; }
    iosTick();
    setTimeout(iosTick, 130);
    setTimeout(iosTick, 260);
  } catch (e) { /* pas de vibreur */ }
}

function buzz(pattern) {
  if (!settings.haptics) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(pattern); return; }
    // iOS : un tic par segment de vibration du motif (3 max)
    const segs = Array.isArray(pattern) ? pattern : [pattern];
    let delay = 0;
    let n = 0;
    for (let i = 0; i < segs.length && n < 3; i += 2) {
      if (delay === 0) iosTick();
      else setTimeout(iosTick, delay);
      n += 1;
      delay += segs[i] + (segs[i + 1] || 0);
    }
  } catch (e) { /* pas de vibreur */ }
}

/* Tic léger à chaque rebond sur une pierre — bridé pour rester agréable
   quand une rafale de noix pilonne le plateau. */
let lastBounceBuzz = 0;

function buzzBounce() {
  if (!settings.haptics || !settings.hapticsBounce) return;
  const n = performance.now();
  if (n - lastBounceBuzz < 70) return;
  lastBounceBuzz = n;
  try {
    if (navigator.vibrate) navigator.vibrate(8);
    else iosTick();
  } catch (e) { /* pas de vibreur */ }
}

/* Bouton « accélérer » : apparaît sur la plage après 8 s de vol.
   Toujours au-dessus de la zone de la barre iOS du bas. */
function accelBtnRect() {
  if (state !== 'flight' || userFast || flightTime < 8) return null;
  const w = cell * 2.6, h = cell * 0.78;
  let y = floorY + Math.max(8, (H - floorY - h) / 2);
  y = Math.min(y, H - readSafeInset('--sab') - h - 6);
  y = Math.max(y, floorY + 4);
  return { x: W / 2 - w / 2, y, w, h };
}

function breakBlock(b, style, cx, cy) {
  const idx = blocks.indexOf(b);
  if (idx === -1) return;
  blocks.splice(idx, 1);
  stats.broken += 1;
  brokenThisShot += 1;
  missionAdd('break40');
  if (brokenThisShot === 6) missionAdd('combo6');
  // les combos chauffent la jauge Gamelan (fièvre au prochain tir)
  fever = Math.min(1, fever + 0.035 + brokenThisShot * 0.006);
  if (brokenThisShot > 1) {
    addPoints(25 * (brokenThisShot - 1)); // bonus de combo
  }
  if (b.type === 'boss') {
    addPoints(1000);
    pearls += 15;
    missionAdd('boss1');
    missionAdd('pearls5', 15);
    effects.push({ type: 'milestone', text: '🎭 Barong vaincu ! +1000', life: 1, color: '#ffd34d' });
    floaters.push({ x: cx, y: cy, life: 1, text: '+15 ◉' });
    for (let p = 0; p < 22 && particles.length < MAX_PARTICLES; p++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * cell * (1.5 + Math.random() * 2),
        vy: Math.sin(a) * cell * (1.5 + Math.random() * 2),
        life: 1.3,
        color: p % 2 === 0 ? '#ffd34d' : '#a32b20',
      });
    }
    sfx.milestone();
  }
  for (let p = 0; p < 9 && particles.length < MAX_PARTICLES; p++) {
    const a = (p / 9) * Math.PI * 2;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(a) * cell * (1.6 + Math.random()),
      vy: Math.sin(a) * cell * (1.6 + Math.random()),
      life: 1,
      color: p % 3 === 0 ? style.edge : style.base,
    });
  }
  if (b.type === 'mystery') {
    mysteryReward(cx, cy);
  }
  if (b.type === 'boss') {
    // panthéon : on retient quels boss ont été vaincus (succès)
    if (!stats.kills) stats.kills = [];
    if (!stats.kills.includes(b.bossKind)) stats.kills.push(b.bossKind);
    buzz([30, 40, 60]);
  }
  if (mode === 'zen') sfx.zenNote();
  else sfx.brk();
}

function mysteryReward(cx, cy) {
  const roll = Math.random();
  sfx.mystery();
  if (roll < 0.35) {
    collectedThisTurn += 1;
    floaters.push({ x: cx, y: cy, life: 1, text: '+1' });
  } else if (roll < 0.65) {
    pearls += 3;
    missionAdd('pearls5', 3);
    floaters.push({ x: cx, y: cy, life: 1, text: '+3 ◉' });
  } else if (roll < 0.85) {
    explodeAt(cx, cy, Math.max(2, Math.ceil(round / 2)));
  } else {
    addPoints(250);
    floaters.push({ x: cx, y: cy, life: 1, text: '+250' });
  }
}

/* Explosion (durian ou mystère) : dégâts aux pierres voisines. */
function explodeAt(cx, cy, damage) {
  effects.push({ type: 'boom', x: cx, y: cy, life: 1 });
  sfx.boom();
  const col = Math.floor(cx / cell);
  const row = Math.floor((cy - boardTop) / cell);
  for (const b of [...blocks]) {
    if (Math.abs(b.col - col) <= 1 && Math.abs(b.row - row) <= 1) {
      const rc = blockRect(b, 0);
      damageBlock(b, damage, (rc.x0 + rc.x1) / 2, (rc.y0 + rc.y1) / 2);
    }
  }
}

/* Espadon : traverse la ligne et nettoie tout sur son passage. */
function swordSweep(row, y) {
  effects.push({ type: 'sword', y, life: 1 });
  sfx.sword();
  for (const b of [...blocks]) {
    if (b.row !== row) continue;
    const rc = blockRect(b, 0);
    const cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
    damageBlock(b, b.type === 'armored' ? 1 : b.type === 'boss' ? 10 : b.hp, cx, cy);
  }
}

// ---- sauvegarde ----
// classique, zen et tournoi se reprennent (marée = chrono, temples = niveaux)
function saveKey(m) {
  return m === 'zen' ? KEYS.ZEN_SAVE
    : m === 'classic' ? KEYS.SAVE
      : m === 'tournament' ? KEYS.TOUR_SAVE : null;
}

function saveGame() {
  const key = saveKey(mode);
  if (!key) return;
  store.set(key, JSON.stringify({
    round, ballCount, score, pearls,
    seed: currentSeed, ts: Date.now(),
    launchFrac: launchX / W,
    fever, shield: shieldCharges, fogUntil, guide: guideShots,
    blocks: blocks.map((b) => [b.col, b.row, b.hp, b.type, b.orient,
      b.type === 'boss' ? { m: b.maxHp, r: b.roarIn, k: b.bossKind } : 0]),
    powerups: powerups.map((p) => [p.col, p.row, p.kind, p.pair || 0]),
    stats,
  }));
}

function loadGame(m) {
  try {
    const raw = store.get(saveKey(m));
    if (!raw) return false;
    mode = m;
    tideTime = TIDE_DURATION;
    puzzle = null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.blocks) || !s.round) return false;
    round = s.round;
    ballCount = s.ballCount || 1;
    score = s.score || 0;
    pearls = s.pearls || 0;
    nextMilestone = (Math.floor(score / 1000) + 1) * 1000;
    nextTier = 0;
    while (nextTier < LATE_TIERS.length && score >= LATE_TIERS[nextTier].at) nextTier += 1;
    launchX = Math.min(Math.max((s.launchFrac || 0.5) * W, RADIUS() + 2), W - RADIUS() - 2);
    fever = s.fever || 0;
    feverActive = false;
    shieldCharges = s.shield || 0;
    guideShots = s.guide || 0;
    fogUntil = s.fogUntil || 0;
    weeklyMut = null;
    blocks = s.blocks.map(([col, row, hp, type, orient, extra]) => ({
      col, row, hp,
      type: type || 'stone',
      orient: orient || 0,
      maxHp: extra && extra.m ? extra.m : hp,
      roarIn: extra && extra.r ? extra.r : 3,
      bossKind: extra && extra.k ? extra.k : 'barong',
      flash: 0, seed: Math.random(), lastHitShot: -1,
    }));
    const oldBonuses = s.powerups || s.bonuses || [];
    powerups = oldBonuses.map(([col, row, kind, pair]) => ({ col, row, kind: kind || 'ball', pair }));
    stats = s.stats && typeof s.stats.broken === 'number' ? s.stats : { broken: 0, shots: 0 };
    if (m === 'tournament') {
      // repositionner le générateur aléatoire exactement là où il était :
      // on rejoue les apparitions des manches 1..round dans le vide
      if (typeof s.seed !== 'number') return false;
      currentSeed = s.seed;
      rng = mulberry32(s.seed);
      const keepBlocks = blocks, keepPowerups = powerups, keepRound = round;
      replaying = true;
      blocks = [];
      powerups = [];
      for (let r = 1; r <= keepRound; r++) {
        round = r;
        spawnRow();
      }
      replaying = false;
      round = keepRound;
      blocks = keepBlocks;
      powerups = keepPowerups;
    }
    balls = [];
    toLaunch = 0;
    collectedThisTurn = 0;
    nextLaunchX = null;
    chiliActive = false;
    shiftAnim = 1;
    state = 'aim';
    return true;
  } catch (e) {
    return false;
  }
}

// ---- physique ----
function stepBall(ball, dist) {
  const r = RADIUS();
  const stepLen = r * 0.8; // sous-pas courts pour ne jamais traverser une pierre
  let remaining = dist;

  while (remaining > 0 && !ball.dead) {
    const d = Math.min(stepLen, remaining);
    remaining -= d;
    const sp = Math.hypot(ball.vx, ball.vy) || 1;
    ball.x += (ball.vx / sp) * d;
    ball.y += (ball.vy / sp) * d;
    // bords du lagon
    if (ball.x < r) { ball.x = r; ball.vx = Math.abs(ball.vx); sfx.wall(); }
    if (ball.x > W - r) { ball.x = W - r; ball.vx = -Math.abs(ball.vx); sfx.wall(); }
    if (ball.y < ceilY + r) { ball.y = ceilY + r; ball.vy = Math.abs(ball.vy); sfx.wall(); }
    // la noix retombe sur la plage
    if (ball.y > floorY - r && ball.vy > 0) {
      ball.dead = true;
      if (nextLaunchX === null) {
        nextLaunchX = Math.min(Math.max(ball.x, r + 2), W - r - 2);
      }
      break;
    }
    collideBlocks(ball, r);
    collidePowerups(ball, r);
  }
}

function collideBlocks(ball, r) {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    const rc = blockRect(b, 0);
    if (ball.x <= rc.x0 - r || ball.x >= rc.x1 + r || ball.y <= rc.y0 - r || ball.y >= rc.y1 + r) continue;

    if (b.type === 'tri') {
      if (!collideTriangle(ball, r, b, rc)) continue;
    } else if (b.type === 'round') {
      if (!collideRound(ball, r, rc)) continue;
    } else {
      collideAABB(ball, r, rc);
    }

    // anti-blocage : jamais de trajectoire quasi horizontale (ping-pong
    // entre les murs) ni quasi verticale (coincée sous le plafond ou
    // contre une pierre blindée)
    const sp = SPEED();
    if (Math.abs(ball.vy) < sp * 0.02) {
      ball.vy = (ball.vy < 0 ? -1 : 1) * sp * 0.05 || -sp * 0.05;
      const k = sp / Math.hypot(ball.vx, ball.vy);
      ball.vx *= k; ball.vy *= k;
    }
    if (Math.abs(ball.vx) < sp * 0.02) {
      const dir = ball.vx !== 0 ? Math.sign(ball.vx) : (ball.x < W / 2 ? 1 : -1);
      ball.vx = dir * sp * 0.05;
      const k2 = sp / Math.hypot(ball.vx, ball.vy);
      ball.vx *= k2; ball.vy *= k2;
    }

    const wasArmoredTick = b.type === 'armored' && gameClock - (b.lastArmorHit || -9) < 1.2;
    const broke = damageBlock(b, (chiliActive ? 2 : 1) * (feverActive ? 2 : 1),
      (rc.x0 + rc.x1) / 2, (rc.y0 + rc.y1) / 2);
    buzzBounce();
    if (!broke && !wasArmoredTick) sfx.hit();
    else if (!broke && wasArmoredTick) sfx.wall();
  }
}

function collideAABB(ball, r, rc) {
  const dLeft = ball.x - (rc.x0 - r);
  const dRight = (rc.x1 + r) - ball.x;
  const dTop = ball.y - (rc.y0 - r);
  const dBottom = (rc.y1 + r) - ball.y;
  const m = Math.min(dLeft, dRight, dTop, dBottom);

  if (m === dLeft) { ball.x = rc.x0 - r; if (ball.vx > 0) ball.vx = -ball.vx; }
  else if (m === dRight) { ball.x = rc.x1 + r; if (ball.vx < 0) ball.vx = -ball.vx; }
  else if (m === dTop) { ball.y = rc.y0 - r; if (ball.vy > 0) ball.vy = -ball.vy; }
  else { ball.y = rc.y1 + r; if (ball.vy < 0) ball.vy = -ball.vy; }
}

/* Toit de temple : demi-pierre triangulaire.
   orient : 0 = angle droit en bas-gauche, 1 = bas-droite,
            2 = haut-gauche, 3 = haut-droite.
   L'hypoténuse renvoie la noix en diagonale. */
function triGeometry(b, rc) {
  const { x0, y0, x1, y1 } = rc;
  switch (b.orient) {
    case 0: return { a: { x: x0, y: y0 }, bpt: { x: x1, y: y1 }, corner: { x: x0, y: y1 }, n: { x: 1 / Math.SQRT2, y: -1 / Math.SQRT2 } };
    case 1: return { a: { x: x0, y: y1 }, bpt: { x: x1, y: y0 }, corner: { x: x1, y: y1 }, n: { x: -1 / Math.SQRT2, y: -1 / Math.SQRT2 } };
    case 2: return { a: { x: x0, y: y1 }, bpt: { x: x1, y: y0 }, corner: { x: x0, y: y0 }, n: { x: 1 / Math.SQRT2, y: 1 / Math.SQRT2 } };
    default: return { a: { x: x0, y: y0 }, bpt: { x: x1, y: y1 }, corner: { x: x1, y: y0 }, n: { x: -1 / Math.SQRT2, y: 1 / Math.SQRT2 } };
  }
}

function collideTriangle(ball, r, b, rc) {
  const g = triGeometry(b, rc);
  // distance signée à l'hypoténuse (normale vers l'extérieur du triangle)
  const sd = (ball.x - g.a.x) * g.n.x + (ball.y - g.a.y) * g.n.y;
  if (sd > r) return false; // du côté vide, hors de portée

  // au-delà de l'hypoténuse (côté plein) : les deux côtés droits agissent
  // comme une pierre normale
  if (sd < -r * 0.4) {
    collideAABB(ball, r, rc);
    return true;
  }

  // rebond sur l'hypoténuse (projection du point de contact sur le segment)
  const abx = g.bpt.x - g.a.x, aby = g.bpt.y - g.a.y;
  const tt = ((ball.x - g.a.x) * abx + (ball.y - g.a.y) * aby) / (abx * abx + aby * aby);
  if (tt < -0.1 || tt > 1.1) return false;
  const dot = ball.vx * g.n.x + ball.vy * g.n.y;
  if (dot < 0) {
    ball.vx -= 2 * dot * g.n.x;
    ball.vy -= 2 * dot * g.n.y;
  }
  ball.x = g.a.x + g.n.x * (r + 0.5) + Math.max(0, Math.min(1, tt)) * abx;
  ball.y = g.a.y + g.n.y * (r + 0.5) + Math.max(0, Math.min(1, tt)) * aby;
  return true;
}

/* Pierre ronde : rebond courbe sur la sphère. */
function collideRound(ball, r, rc) {
  const cx = (rc.x0 + rc.x1) / 2;
  const cy = (rc.y0 + rc.y1) / 2;
  const R = (rc.x1 - rc.x0) / 2;
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= r + R) return false;
  const nx = d > 0 ? dx / d : 0;
  const ny = d > 0 ? dy / d : -1;
  const dot = ball.vx * nx + ball.vy * ny;
  if (dot < 0) {
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;
  }
  ball.x = cx + nx * (r + R + 0.5);
  ball.y = cy + ny * (r + R + 0.5);
  return true;
}

function collidePowerups(ball, r) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    const c = powerupCenter(p, 0);
    if (Math.hypot(ball.x - c.x, ball.y - c.y) >= r + BONUS_R()) continue;
    if (p.kind === 'portal') {
      // pas consommé : téléporte vers le portail jumeau (avec un délai
      // anti-aller-retour par noix). Une noix qui a déjà beaucoup voyagé
      // les traverse sans effet : sinon deux portails bien placés se
      // renvoient la noix indéfiniment et le tir ne finit jamais.
      const partner = powerups.find((q) => q !== p && q.kind === 'portal' && q.pair === p.pair);
      if (!partner || gameClock - (ball.lastPortal || -9) < 0.6) continue;
      if ((ball.portals || 0) >= PORTAL_MAX) continue;
      const dst = powerupCenter(partner, 0);
      ball.x = dst.x;
      ball.y = dst.y;
      ball.lastPortal = gameClock;
      ball.portals = (ball.portals || 0) + 1;
      // légère déviation à la sortie : casse les cycles géométriques
      // parfaits (la noix ne repart jamais exactement du même angle)
      const sp = Math.hypot(ball.vx, ball.vy) || SPEED();
      const a2 = Math.atan2(ball.vy, ball.vx) + (Math.random() - 0.5) * 0.35;
      ball.vx = Math.cos(a2) * sp;
      ball.vy = Math.sin(a2) * sp;
      // NB : une téléportation n'est PAS un progrès — sans quoi le filet
      // de sécurité ci-dessous ne se déclenche jamais dans une boucle.
      floaters.push({ x: dst.x, y: dst.y, life: 1, text: '🌀' });
      sfx.mystery();
      continue;
    }
    lastProgress = gameClock;
    powerups.splice(i, 1);
    switch (p.kind) {
      case 'ball':
        collectedThisTurn += 1;
        floaters.push({ x: c.x, y: c.y, life: 1, text: '+1' });
        sfx.bonus();
        break;
      case 'sword':
        swordSweep(p.row, c.y);
        break;
      case 'durian':
        explodeAt(c.x, c.y, Math.max(2, round));
        break;
      case 'chili':
        chiliActive = true;
        floaters.push({ x: c.x, y: c.y, life: 1, text: 'x2 !' });
        sfx.chili();
        break;
      case 'pearl':
        pearls += 1;
        missionAdd('pearls5');
        floaters.push({ x: c.x, y: c.y, life: 1, text: '+1 ◉' });
        sfx.pearl();
        break;
      case 'flower':
        ball.vx = 0;
        ball.vy = -SPEED();
        floaters.push({ x: c.x, y: c.y, life: 1, text: '↑' });
        sfx.flower();
        break;
      case 'gecko':
        // la noix se dédouble pour le reste du tir
        if (balls.length < 60) {
          balls.push({
            x: ball.x, y: ball.y, vx: -ball.vx, vy: ball.vy, dead: false,
            portals: ball.portals || 0, lastPortal: ball.lastPortal,
          });
        }
        floaters.push({ x: c.x, y: c.y, life: 1, text: '🦎 ×2' });
        sfx.bonus();
        break;
      case 'lotus':
        shieldCharges = Math.min(2, shieldCharges + 1);
        floaters.push({ x: c.x, y: c.y, life: 1, text: '🪷' });
        sfx.flower();
        break;
      case 'guide':
        // boussole : les 2 prochains tirs montrent toute la trajectoire
        guideShots = Math.min(3, guideShots + 2);
        floaters.push({ x: c.x, y: c.y, life: 1, text: '🧭' });
        sfx.mystery();
        break;
      case 'gong': {
        // le gong résonne : TOUTES les pierres perdent 1 PV
        effects.push({ type: 'milestone', text: '🥁 GONG !', life: 1, color: '#ffd34d' });
        sfx.boom();
        for (const b2 of [...blocks]) {
          const rc2 = blockRect(b2, 0);
          damageBlock(b2, 1, (rc2.x0 + rc2.x1) / 2, (rc2.y0 + rc2.y1) / 2);
        }
        break;
      }
    }
  }
}

// ---- boucle ----
let lastT = 0;
function frame(t) {
  // filet de sécurité : iOS peut changer la taille de la fenêtre sans
  // événement resize fiable → bande noire en bas si on ne suit pas
  if (W !== window.innerWidth || H !== window.innerHeight) resize();
  const dt = Math.min((t - lastT) / 1000 || 0, 1 / 30);
  lastT = t;
  update(dt);
  draw(t / 1000);
  requestAnimationFrame(frame);
}

function update(dt) {
  // téléphone couché : le plateau n'a plus de sens en paysage bas, on met
  // le jeu en pause plutôt que de laisser la marée « tuer » la partie
  // avec une géométrie d'écran fausse
  if (flatBlocked()) return;
  if (shiftAnim < 1) shiftAnim = Math.min(1, shiftAnim + dt * 5);

  // poissons du décor (immobiles si l'utilisateur préfère moins d'animations)
  fishTimer -= dt;
  if (fishTimer <= 0 && fishes.length < 3 && !calmMode()) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const span = boardTop + 30;
    fishes.push({
      x: dir === 1 ? -30 : W + 30,
      y: span + Math.random() * Math.max(40, (boardTop + deathRow * cell) - span - 30),
      dir,
      speed: 26 + Math.random() * 30,
      size: cell * (0.16 + Math.random() * 0.1),
      phase: Math.random() * Math.PI * 2,
    });
    fishTimer = 5 + Math.random() * 8;
  }
  for (let i = fishes.length - 1; i >= 0; i--) {
    const f = fishes[i];
    f.x += f.dir * f.speed * dt;
    if (f.x < -60 || f.x > W + 60) fishes.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life -= dt * 2.4;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.y -= dt * 40;
    f.life -= dt * 1.2;
    if (f.life <= 0) floaters.splice(i, 1);
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const rate = effects[i].type === 'sword' ? 2.2
      : effects[i].type === 'milestone' ? 0.55
        : effects[i].type === 'bossIntro' ? 0.38 : 1.8;
    effects[i].life -= dt * rate;
    if (effects[i].life <= 0) effects.splice(i, 1);
  }
  for (const b of blocks) if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 6);

  // modes chronométrés : le chrono tourne pendant la visée et le vol
  if (isTimed() && (state === 'aim' || state === 'flight')) {
    tideTime -= dt;
    if (tideTime <= 0) {
      tideTime = 0;
      gameOver('time');
      return;
    }
  }

  if (state !== 'flight') return;

  // modes chronométrés : dès que la première noix retombe, on rappelle les autres
  if (isTimed() && nextLaunchX !== null && (balls.length > 0 || toLaunch > 0)) {
    toLaunch = 0;
    for (const b of balls) b.dead = true;
    balls = [];
  }

  flightTime += dt;
  const tideBoost = isTimed() ? 1.5 : 1;
  const autoFast = Math.min(3, 1 + Math.max(0, flightTime - 14) * 0.4);
  timeScale = Math.max(userFast ? 2.5 : tideBoost, autoFast);
  const sdt = dt * timeScale;
  gameClock += sdt;

  if (toLaunch > 0) {
    launchTimer -= sdt;
    if (launchTimer <= 0) {
      const a = aim.angle;
      balls.push({
        x: launchX, y: floorY - RADIUS(),
        vx: Math.cos(a) * SPEED(), vy: -Math.sin(a) * SPEED(),
        dead: false,
      });
      toLaunch -= 1;
      launchTimer = 0.07;
    }
  }

  // filet de sécurité : des noix qui volent longtemps sans causer le
  // moindre dégât ni ramasser de bonus tournent en rond — la marée les rappelle
  if (balls.length > 0 && toLaunch === 0
    && (gameClock - lastProgress > 10 || flightTime > 40)) {
    for (const b of balls) {
      if (nextLaunchX === null) {
        nextLaunchX = Math.min(Math.max(b.x, RADIUS() + 2), W - RADIUS() - 2);
      }
      floaters.push({ x: b.x, y: b.y, life: 1, text: '🌊' });
      b.dead = true;
    }
    sfx.wall();
  }

  // traînée de braises pendant un tir de fièvre, sillage cosmétique sinon
  const trail = feverActive ? TRAILS.embers : TRAILS[cosmetics.trail];
  if (trail && !calmMode()) {
    for (const b of balls) {
      if (particles.length < MAX_PARTICLES && Math.random() < (feverActive ? 0.35 : 0.22)) {
        particles.push({
          x: b.x, y: b.y,
          vx: (Math.random() - 0.5) * 30, vy: trail.vy,
          life: trail.life,
          color: trail.colors[Math.floor(Math.random() * trail.colors.length)],
        });
      }
    }
  }

  for (const ball of balls) {
    if (!ball.dead) stepBall(ball, SPEED() * sdt);
  }
  balls = balls.filter((b) => !b.dead);

  if (toLaunch === 0 && balls.length === 0) endTurn();
}

// ---- rendu ----

/* Noix de coco : sphère brune, reflet, fibres et ses trois « yeux ». */
function drawCoconut(x, y, r, T) {
  const c = T.coconut;
  ctx.fillStyle = c.base;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.stroke();
  ctx.fillStyle = c.light;
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = Math.max(0.6, r * 0.08);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x + r * 0.15, y + r * 0.1, r * 0.62, 0.3, 1.4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (r >= 5) {
    ctx.fillStyle = c.dark;
    const er = Math.max(0.8, r * 0.11);
    ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.05, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.22, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.16, y + r * 0.12, er, 0, Math.PI * 2); ctx.fill();
  }
}

/* Balle selon la peau équipée (boutique). */
function drawBall(x, y, r, T) {
  switch (cosmetics.ball) {
    case 'beachball': {
      ctx.fillStyle = '#f6f2ea';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      const seg = ['#e2493c', '#f5b93c', '#2f8fd6'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = seg[i];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r, (i * 2 * Math.PI) / 3 + 0.5, (i * 2 * Math.PI) / 3 + Math.PI / 3 + 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'flower': {
      ctx.fillStyle = '#fff4f8';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5,
          r * 0.5, r * 0.3, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lantern': {
      ctx.fillStyle = '#ff9d3c';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97b1e';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.98, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      for (const k of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.ellipse(x + k * r * 0.8, y, r * Math.sqrt(1 - k * k) * 0.6, r * 0.95, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,240,180,0.8)';
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'durian': {
      ctx.fillStyle = '#a8b83e';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8ba02c';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05);
        ctx.lineTo(x + Math.cos(a + 0.35) * r * 0.55, y + Math.sin(a + 0.35) * r * 0.55);
        ctx.lineTo(x + Math.cos(a - 0.35) * r * 0.55, y + Math.sin(a - 0.35) * r * 0.55);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'starfish': {
      ctx.fillStyle = '#f2784b';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? r * 1.05 : r * 0.5;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c9553a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffb48f';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'turtle': {
      // carapace de tortue
      ctx.fillStyle = '#3a8f5a';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1d5c36';
      ctx.lineWidth = Math.max(1, r * 0.14);
      ctx.stroke();
      ctx.strokeStyle = '#2a7346';
      ctx.lineWidth = Math.max(0.8, r * 0.1);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5);
        ctx.lineTo(x + Math.cos(a) * r * 0.96, y + Math.sin(a) * r * 0.96);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'moon': {
      // pleine lune et ses cratères
      ctx.fillStyle = '#e8e4da';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b8b2a4';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#c9c3b4';
      for (const [fx, fy, fr] of [[-0.3, -0.2, 0.22], [0.28, 0.12, 0.16], [-0.05, 0.42, 0.13], [0.32, -0.4, 0.1]]) {
        ctx.beginPath();
        ctx.arc(x + fx * r, y + fy * r, fr * r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'bubble': {
      // bulle translucide
      ctx.fillStyle = 'rgba(190,240,255,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1, r * 0.14);
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.55, Math.PI * 0.9, Math.PI * 1.5);
      ctx.stroke();
      break;
    }
    case 'lava': {
      // pierre volcanique fissurée de lave
      ctx.fillStyle = '#3a3532';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#211d1a';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.stroke();
      ctx.strokeStyle = '#ff7847';
      ctx.lineWidth = Math.max(1, r * 0.11);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - r * 0.1);
      ctx.lineTo(x - r * 0.15, y + r * 0.12);
      ctx.lineTo(x + r * 0.2, y - r * 0.22);
      ctx.lineTo(x + r * 0.62, y + r * 0.05);
      ctx.stroke();
      ctx.fillStyle = '#ffb648';
      ctx.beginPath();
      ctx.arc(x - r * 0.15, y + r * 0.12, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'shell': {
      ctx.fillStyle = '#f3e2c9';
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.9);
      ctx.arc(x, y - r * 0.1, r, 0.15 * Math.PI, 0.85 * Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d8b990';
      ctx.lineWidth = Math.max(1, r * 0.09);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y + r * 0.85);
        ctx.lineTo(x + i * r * 0.4, y - r * 0.75 + Math.abs(i) * r * 0.18);
        ctx.stroke();
      }
      ctx.strokeStyle = '#c9a97a';
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.9);
      ctx.arc(x, y - r * 0.1, r, 0.15 * Math.PI, 0.85 * Math.PI, true);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    default:
      drawCoconut(x, y, r, T);
  }
}

function stonePath(b, rc, grow) {
  const rad = cell * 0.07;
  const x = rc.x0 - grow, y = rc.y0 - grow;
  const x1 = rc.x1 + grow, y1 = rc.y1 + grow;
  if (b.type === 'tri') {
    const g = triGeometry(b, { x0: x, y0: y, x1, y1 });
    ctx.beginPath();
    ctx.moveTo(g.a.x, g.a.y);
    ctx.lineTo(g.bpt.x, g.bpt.y);
    ctx.lineTo(g.corner.x, g.corner.y);
    ctx.closePath();
  } else if (b.type === 'round') {
    ctx.beginPath();
    ctx.arc((x + x1) / 2, (y + y1) / 2, (x1 - x) / 2, 0, Math.PI * 2);
  } else {
    roundRect(x, y, x1 - x, y1 - y, rad);
  }
}

/* Masques de boss (3 colonnes × 2 rangées) : chacun sa palette. */
const BOSS_STYLES = {
  barong: { base: '#a32b20', accent: '#ffd34d', mouth: '#5e120c', eye: '#20140a' },
  rangda: { base: '#ded5c2', accent: '#c0392b', mouth: '#6e1414', eye: '#7a1f1f' },
  naga: { base: '#1f6e4d', accent: '#ffd34d', mouth: '#0e3d2a', eye: '#101c14' },
  garuda: { base: '#d9c7a3', accent: '#ffb648', mouth: '#8a5a1e', eye: '#3d2c12' },
  leyak: { base: '#155e46', accent: '#9ff4e4', mouth: '#0a2e24', eye: '#101c14' },
  hanuman: { base: '#e9ded0', accent: '#e2493c', mouth: '#7a1f1f', eye: '#20140a' },
  bedawang: { base: '#3a6b4a', accent: '#ffd34d', mouth: '#1d3a27', eye: '#20140a' },
  dewi: { base: '#b9cfe0', accent: '#e8f4ff', mouth: '#5b7f9a', eye: '#28455c' },
  raksasa: { base: '#6b4a2f', accent: '#c0392b', mouth: '#33200f', eye: '#ff9d3c' },
};

/* Barre de vie et points restants, posés par-dessus le masque. */
function drawBossHud(b, rc, T) {
  const w = rc.x1 - rc.x0;
  const bw = w * 0.6, bx = rc.x0 + w * 0.2, by = rc.y1 - 10;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(bx, by, bw, 6, 3);
  ctx.fill();
  const frac = Math.max(0, Math.min(1, b.hp / (b.maxHp || b.hp || 1)));
  if (frac > 0) {
    ctx.fillStyle = frac > 0.4 ? '#7ef0d8' : '#ff8c3d';
    roundRect(bx, by, Math.max(4, bw * frac), 6, 3);
    ctx.fill();
  }
  ctx.font = '800 ' + Math.round(cell * 0.24) + 'px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,20,20,0.75)';
  ctx.strokeText(String(b.hp), rc.x0 + w / 2, by - 13);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(b.hp), rc.x0 + w / 2, by - 13);
}

function drawBoss(b, yOff, T) {
  const img = bossArtReady(b.bossKind || 'barong');
  if (img) {
    const rc = blockRect(b, yOff);
    const w = rc.x1 - rc.x0, h = rc.y1 - rc.y0;
    const grow = 1 + b.flash * 0.06;
    // le masque déborde un peu de sa case : présence maximale
    const scale = Math.min((w * 1.16) / img.naturalWidth, (h * 1.26) / img.naturalHeight) * grow;
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    const cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
    drawBossHud(b, rc, T);
    return;
  }
  drawBossVector(b, yOff, T);
}

function drawBossVector(b, yOff, T) {
  const st = BOSS_STYLES[b.bossKind] || BOSS_STYLES.barong;
  const rc = blockRect(b, yOff);
  const grow = b.flash * cell * 0.04;
  const x = rc.x0 - grow, y = rc.y0 - grow;
  const w = rc.x1 - rc.x0 + grow * 2, h = rc.y1 - rc.y0 + grow * 2;

  roundRect(x, y, w, h, cell * 0.16);
  ctx.fillStyle = st.base;
  ctx.fill();
  ctx.strokeStyle = st.accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  // couronne
  ctx.fillStyle = st.accent;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const cx = x + w * (0.14 + i * 0.18);
    ctx.moveTo(cx - w * 0.05, y + h * 0.17);
    ctx.lineTo(cx, y + h * 0.03);
    ctx.lineTo(cx + w * 0.05, y + h * 0.17);
  }
  ctx.fill();

  // yeux exorbités et sourcils
  const ey = y + h * 0.46, er = h * 0.14;
  for (const ex of [x + w * 0.3, x + w * 0.7]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, er * 1.3, er, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.eye;
    ctx.beginPath();
    ctx.arc(ex, ey, er * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.accent;
    ctx.lineWidth = Math.max(2, h * 0.045);
    ctx.beginPath();
    ctx.arc(ex, ey + er * 0.4, er * 1.6, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // gueule et crocs
  ctx.fillStyle = st.mouth;
  roundRect(x + w * 0.22, y + h * 0.74, w * 0.56, h * 0.18, h * 0.08);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    const fx = x + w * (0.28 + i * 0.11);
    ctx.beginPath();
    ctx.moveTo(fx - w * 0.025, y + h * 0.75);
    ctx.lineTo(fx, y + h * 0.87);
    ctx.lineTo(fx + w * 0.025, y + h * 0.75);
    ctx.closePath();
    ctx.fill();
  }

  drawBossHud(b, rc, T);
}

/* Pierre de temple : bloc taillé, biseau, rainures, mousse/éclats selon le
   palier ; variantes toit (triangle), blindée (volcanique) et mystère. */
function drawStone(b, yOff, T) {
  if (b.type === 'boss') {
    drawBoss(b, yOff, T);
    return;
  }
  const rc = blockRect(b, yOff);
  const w = rc.x1 - rc.x0, h = rc.y1 - rc.y0;
  const grow = b.flash * cell * 0.03;
  const style = b.type === 'armored' ? T.armor : stoneStyle(b.hp);

  stonePath(b, rc, grow);
  ctx.fillStyle = style.base;
  ctx.fill();
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = b.type === 'armored' ? 3 : 2;
  ctx.stroke();

  const x = rc.x0 - grow, y = rc.y0 - grow;
  const ww = w + grow * 2, hh = h + grow * 2;

  if (b.type === 'round') {
    // sphère sculptée : anneau intérieur et reflet
    const rcx = x + ww / 2, rcy = y + hh / 2, rr = ww / 2;
    ctx.strokeStyle = style.groove;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(rcx, rcy, rr * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(rcx, rcy, rr * 0.82, -2.3, -0.9);
    ctx.stroke();
  } else if (b.type !== 'tri') {
    // arête claire en haut, ombre en bas
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 1.5);
    ctx.lineTo(x + ww - 4, y + 1.5);
    ctx.stroke();
    ctx.strokeStyle = style.groove;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + hh - 1.5);
    ctx.lineTo(x + ww - 4, y + hh - 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + ww * 0.12, y + hh * 0.36);
    ctx.lineTo(x + ww * 0.88, y + hh * 0.36);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const s = b.seed;
  if (b.type === 'armored') {
    // fissures de lave incandescentes
    ctx.strokeStyle = style.crack;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x + ww * 0.2, y + hh * 0.62);
    ctx.lineTo(x + ww * 0.38, y + hh * 0.5);
    ctx.lineTo(x + ww * 0.46, y + hh * 0.66);
    ctx.moveTo(x + ww * 0.62, y + hh * 0.28);
    ctx.lineTo(x + ww * 0.76, y + hh * 0.42);
    ctx.lineTo(x + ww * 0.88, y + hh * 0.34);
    ctx.stroke();
    // rivets du blindage
    ctx.fillStyle = style.speck || style.edge;
    const rr = 2.2;
    for (const [fx, fy] of [[0.16, 0.2], [0.84, 0.2], [0.16, 0.8], [0.84, 0.8]]) {
      ctx.beginPath();
      ctx.arc(x + ww * fx, y + hh * fy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (b.type !== 'tri' && b.type !== 'round') {
    if (style.moss) {
      ctx.fillStyle = style.moss;
      ctx.globalAlpha = 0.8;
      blob(x + ww * (0.18 + s * 0.2), y + hh * 0.2, ww * 0.14);
      blob(x + ww * (0.65 + s * 0.15), y + hh * (0.6 + s * 0.2), ww * 0.11);
      ctx.globalAlpha = 1;
    }
    if (style.speck) {
      ctx.fillStyle = style.speck;
      for (let i = 0; i < 4; i++) {
        const px = x + ww * ((s * (i + 3) * 7.13) % 0.8 + 0.1);
        const py = y + hh * ((s * (i + 5) * 3.71) % 0.7 + 0.15);
        ctx.fillRect(px, py, 2.4, 2.4);
      }
    }
    if (style.shine) {
      ctx.save();
      stonePath(b, rc, grow);
      ctx.clip();
      ctx.fillStyle = style.shine;
      ctx.beginPath();
      ctx.moveTo(x + ww * 0.15, y);
      ctx.lineTo(x + ww * 0.35, y);
      ctx.lineTo(x + ww * 0.05, y + hh);
      ctx.lineTo(x - ww * 0.15, y + hh);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // position du nombre : centre, ou près de l'angle droit pour les toits
  let tx = (rc.x0 + rc.x1) / 2;
  let ty = (rc.y0 + rc.y1) / 2 + 1;
  let fontScale = 0.32;
  if (b.type === 'tri') {
    const g = triGeometry(b, rc);
    tx = (g.corner.x * 2 + g.a.x + g.bpt.x) / 4;
    ty = (g.corner.y * 2 + g.a.y + g.bpt.y) / 4 + 1;
    fontScale = 0.26;
  }
  const label = b.type === 'mystery' ? '?' : String(b.hp);
  ctx.font = '700 ' + Math.round(cell * fontScale) + 'px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = T.blockTextHalo;
  ctx.strokeText(label, tx, ty);
  ctx.fillStyle = T.blockText;
  ctx.fillText(label, tx, ty);

  if (b.type === 'mystery') {
    // lueur discrète qui pulse
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.2 * Math.sin(performance.now() / 300 + s * 6)) + ')';
    ctx.lineWidth = 1.5;
    stonePath(b, rc, grow + 2);
    ctx.stroke();
  }
}

function blob(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.7, y + r * 0.25, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

/* ---- icônes des bonus ---- */
function drawPowerup(p, yOff, T, t) {
  const c = powerupCenter(p, yOff);
  const pulse = 1 + Math.sin(t * 3.3 + p.col) * 0.08;
  const ringColors = {
    ball: T.aimDot, sword: '#9fd7e8', durian: '#c9e06a',
    chili: '#ff6b4a', pearl: '#f3e7ff', flower: '#ffc7dd',
    gecko: '#8fd45f', portal: '#b48cff', lotus: '#ff9fcc', guide: '#ffe28a',
    gong: '#e8b04b',
  };
  ctx.strokeStyle = ringColors[p.kind] || T.aimDot;
  ctx.lineWidth = cell * 0.045;
  ctx.beginPath();
  ctx.arc(c.x, c.y, BONUS_R() * pulse, 0, Math.PI * 2);
  ctx.stroke();

  const r = cell * 0.115;
  switch (p.kind) {
    case 'ball':
      // la bulle « +1 » montre la peau équipée (étoile de mer, coquillage…)
      drawBall(c.x, c.y, cell * 0.105, T);
      break;
    case 'sword': {
      // espadon stylisé
      ctx.fillStyle = '#7db8cc';
      ctx.beginPath();
      ctx.ellipse(c.x + r * 0.2, c.y, r * 0.85, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d98ac';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x - r * 0.6, c.y);
      ctx.lineTo(c.x - r * 1.5, c.y - r * 0.15);
      ctx.stroke();
      ctx.fillStyle = '#5d98ac';
      ctx.beginPath();
      ctx.moveTo(c.x + r * 0.9, c.y);
      ctx.lineTo(c.x + r * 1.4, c.y - r * 0.5);
      ctx.lineTo(c.x + r * 1.4, c.y + r * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'durian': {
      ctx.fillStyle = '#a8b83e';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8ba02c';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const sx = c.x + Math.cos(a) * r * 0.8;
        const sy = c.y + Math.sin(a) * r * 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(c.x + Math.cos(a + 0.2) * r * 0.5, c.y + Math.sin(a + 0.2) * r * 0.5);
        ctx.lineTo(c.x + Math.cos(a - 0.2) * r * 0.5, c.y + Math.sin(a - 0.2) * r * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'chili': {
      ctx.strokeStyle = '#e33f2b';
      ctx.lineWidth = r * 0.55;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(c.x, c.y - r * 0.1, r * 0.62, 0.5, 2.4);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#3f8f3a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(c.x + r * 0.45, c.y - r * 0.5);
      ctx.lineTo(c.x + r * 0.75, c.y - r * 0.85);
      ctx.stroke();
      break;
    }
    case 'pearl': {
      ctx.fillStyle = '#f6efff';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(c.x - r * 0.2, c.y - r * 0.22, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a97a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y + r * 0.35, r * 0.75, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'flower': {
      ctx.fillStyle = '#fff4f8';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(c.x + Math.cos(a) * r * 0.45, c.y + Math.sin(a) * r * 0.45,
          r * 0.42, r * 0.26, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'gecko': {
      // petit gecko vert : queue, corps, tête, pattes
      ctx.strokeStyle = '#4f9e3f';
      ctx.lineWidth = r * 0.26;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x - r * 0.95, c.y + r * 0.55);
      ctx.quadraticCurveTo(c.x - r * 0.5, c.y + r * 0.05, c.x - r * 0.1, c.y + r * 0.05);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#5cb64a';
      ctx.beginPath();
      ctx.ellipse(c.x + r * 0.15, c.y, r * 0.55, r * 0.32, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c.x + r * 0.62, c.y - r * 0.32, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f9e3f';
      for (const [fx, fy] of [[-0.15, 0.4], [0.45, 0.3], [-0.28, -0.3], [0.2, -0.38]]) {
        ctx.beginPath();
        ctx.arc(c.x + fx * r, c.y + fy * r, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#183012';
      ctx.beginPath();
      ctx.arc(c.x + r * 0.7, c.y - r * 0.36, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'portal': {
      // spirale qui tourne
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(t * 2.2 + p.col);
      for (const [colr, off] of [['#b48cff', 0], ['#7ef0d8', Math.PI]]) {
        ctx.strokeStyle = colr;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let a = 0; a <= 2.2; a += 0.18) {
          const rr = r * 0.18 + a * r * 0.32;
          const px = Math.cos(a * 2.2 + off) * rr;
          const py = Math.sin(a * 2.2 + off) * rr;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'guide': {
      // boussole marine
      ctx.fillStyle = '#f6f2ea';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9a97a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e2493c';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - r * 0.55);
      ctx.lineTo(c.x - r * 0.18, c.y);
      ctx.lineTo(c.x + r * 0.18, c.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2f8fd6';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + r * 0.55);
      ctx.lineTo(c.x - r * 0.18, c.y);
      ctx.lineTo(c.x + r * 0.18, c.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#20140a';
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'gong': {
      // gong de bronze suspendu
      ctx.strokeStyle = '#7a5a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x - r * 0.8, c.y - r * 0.75);
      ctx.lineTo(c.x + r * 0.8, c.y - r * 0.75);
      ctx.stroke();
      ctx.fillStyle = '#d3a13c';
      ctx.beginPath();
      ctx.arc(c.x, c.y + r * 0.08, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#96701f';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = '#b8892e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y + r * 0.08, r * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#8a5a1e';
      ctx.beginPath();
      ctx.arc(c.x, c.y + r * 0.08, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lotus': {
      ctx.fillStyle = '#ff9fcc';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(c.x + i * r * 0.32, c.y + Math.abs(i) * r * 0.1,
          r * 0.28, r * 0.55, i * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.arc(c.x, c.y + r * 0.18, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

/* Fond marin peint (jour/nuit) — repli sur le dégradé si non chargé.
   Chemins littéraux : la démo mono-fichier les remplace par des data URI. */
const BOARD_ART_SRC = { day: 'art/board-day.webp', night: 'art/board-night.webp' };
const BOARD_ART = {};
for (const k of ['day', 'night']) {
  const img = new Image();
  img.src = BOARD_ART_SRC[k];
  BOARD_ART[k] = img;
}

function boardArtReady() {
  const k = document.documentElement.dataset.theme === 'dark' ? 'night' : 'day';
  const img = BOARD_ART[k];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/* Les dégradés d'eau sont recréés seulement quand le thème/décor change. */
const bgCache = { key: '', grad: null, glow: null };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
/* Animations réduites : réglage système OU choix dans les Réglages. */
const calmMode = () => reduceMotion.matches || settings.calm;

/* Décor du lagon : eau, reflets, poissons, palmes, plage. */
function drawLagoon(rawT, T) {
  const t = calmMode() ? 0 : rawT;
  // l'eau couvre aussi le couloir de rebond au-dessus de la grille
  const key = T.waterTop + T.waterBottom + (T.waterGlow || '') + W + 'x' + ceilY + ':' + floorY;
  if (bgCache.key !== key) {
    bgCache.key = key;
    bgCache.grad = ctx.createLinearGradient(0, ceilY, 0, floorY);
    bgCache.grad.addColorStop(0, T.waterTop);
    bgCache.grad.addColorStop(1, T.waterBottom);
    if (T.waterGlow) {
      bgCache.glow = ctx.createLinearGradient(0, ceilY, 0, ceilY + 120);
      bgCache.glow.addColorStop(0, T.waterGlow);
      bgCache.glow.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      bgCache.glow = null;
    }
  }
  const art = boardArtReady();
  if (art) {
    // illustration en couverture de la zone d'eau…
    const zy = ceilY - 6, zh = floorY - ceilY + 6;
    const s = Math.max(W / art.naturalWidth, zh / art.naturalHeight);
    const sw = W / s, sh = zh / s;
    ctx.drawImage(art, (art.naturalWidth - sw) / 2, (art.naturalHeight - sh) / 2,
      sw, sh, 0, zy, W, zh);
    // …unifiée par la teinte du thème et du décor équipé (boutique)
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = bgCache.grad;
    ctx.fillRect(0, zy, W, zh);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = bgCache.grad;
    ctx.fillRect(0, ceilY - 6, W, floorY - ceilY + 6);
  }
  if (bgCache.glow) {
    ctx.fillStyle = bgCache.glow;
    ctx.fillRect(0, ceilY - 6, W, 126);
  }

  ctx.strokeStyle = T.caustic;
  ctx.lineWidth = 12;
  const span = floorY - boardTop;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    const baseY = boardTop + span * (0.22 + 0.26 * k);
    for (let x = -10; x <= W + 10; x += 14) {
      const y = baseY + Math.sin(x * 0.018 + t * (0.35 + k * 0.12) + k * 2.1) * 7;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = T.sparkle;
  for (let i = 0; i < 14; i++) {
    const sx = ((i * 73.7) % 1) * W;
    const sy = boardTop + (((i * 41.3) % 1) * 0.85 + 0.05) * span;
    const a = 0.5 + 0.5 * Math.sin(t * 1.6 + i * 2.4);
    if (a > 0.55) {
      ctx.globalAlpha = (a - 0.55) * 0.9;
      ctx.fillRect(sx, sy, 2.2, 2.2);
    }
  }
  ctx.globalAlpha = 1;

  for (const f of fishes) {
    const wob = Math.sin(t * 6 + f.phase) * f.size * 0.25;
    ctx.fillStyle = T.fish;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y + wob * 0.3, f.size, f.size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(f.x - f.dir * f.size * 0.8, f.y + wob * 0.3);
    ctx.lineTo(f.x - f.dir * f.size * 1.5, f.y - f.size * 0.45 + wob);
    ctx.lineTo(f.x - f.dir * f.size * 1.5, f.y + f.size * 0.45 + wob);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = T.palm;
  palmFrond(-6, ceilY + 6, 1, t);
  palmFrond(W + 6, ceilY + 10, -1, t);
}

function palmFrond(x0, y0, dir, t) {
  const sway = Math.sin(t * 0.7 + dir) * 3;
  ctx.save();
  ctx.translate(x0, y0);
  for (let i = 0; i < 3; i++) {
    const ang = dir * (0.25 + i * 0.35) + sway * 0.01;
    ctx.beginPath();
    const len = cell * (1.4 - i * 0.25);
    const tipX = Math.cos(ang) * len * dir;
    const tipY = Math.sin(ang) * len * 0.9 + i * 6;
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(tipX * 0.5, tipY * 0.2 - 12, tipX + sway, tipY);
    ctx.quadraticCurveTo(tipX * 0.5, tipY * 0.55, 0, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBeach(rawT, T) {
  const t = calmMode() ? 0 : rawT;
  ctx.fillStyle = T.sand;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.fillStyle = T.sandDark;
  ctx.fillRect(0, floorY + 26, W, 3);

  ctx.strokeStyle = T.foam;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -5; x <= W + 5; x += 10) {
    const y = floorY + Math.sin(x * 0.045 + t * 1.3) * 2.2;
    if (x === -5) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawTideLine(t, T) {
  const y = boardTop + deathRow * cell;
  ctx.strokeStyle = T.tideFoam;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6 + 0.25 * Math.sin(t * 2);
  for (let x = 8; x < W; x += 26) {
    ctx.beginPath();
    ctx.arc(x + 6, y, 7, Math.PI, 0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawEffects(T) {
  for (const e of effects) {
    if (e.type === 'sword') {
      ctx.globalAlpha = Math.max(0, e.life);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(0, e.y - 4, W, 8);
      ctx.fillStyle = '#7db8cc';
      const fx = W * (1 - e.life);
      ctx.beginPath();
      ctx.ellipse(fx, e.y, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - 12, e.y);
      ctx.lineTo(fx - 26, e.y - 8);
      ctx.lineTo(fx - 26, e.y + 8);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'milestone') {
      const a = Math.min(1, e.life * 2.2);
      const scale = 1 + (1 - e.life) * 0.25;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(W / 2, boardTop + (floorY - boardTop) * 0.32);
      ctx.scale(scale, scale);
      ctx.font = '800 ' + Math.round(cell * 0.5) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,40,40,0.55)';
      ctx.strokeText(e.text, 0, 0);
      ctx.fillStyle = e.color || '#ffd34d';
      ctx.fillText(e.text, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else if (e.type === 'bossIntro') {
      // entrée théâtrale : le masque surgit en grand, nom en dessous
      const a = Math.min(1, e.life * 2.6);
      const pop = 1 + Math.max(0, e.life - 0.85) * 1.6;
      ctx.globalAlpha = a;
      const iy = boardTop + (floorY - boardTop) * 0.34;
      const img = bossArtReady(e.kind);
      if (img) {
        const dw = Math.min(W * 0.58, 250) * pop;
        const dh = dw * img.naturalHeight / img.naturalWidth;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 26;
        ctx.drawImage(img, W / 2 - dw / 2, iy - dh / 2, dw, dh);
        ctx.restore();
      }
      ctx.font = '800 ' + Math.round(cell * 0.42) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,20,20,0.7)';
      const label = (BOSS_NAMES[e.kind] || 'Boss') + ' apparaît !';
      const ty2 = iy + (img ? Math.min(W * 0.58, 250) * 0.62 : 0) + cell * 0.5;
      ctx.strokeText(label, W / 2, ty2);
      ctx.fillStyle = '#ffd34d';
      ctx.fillText(label, W / 2, ty2);
      ctx.globalAlpha = 1;
    } else if (e.type === 'boom') {
      const rr = (1 - e.life) * cell * 1.6 + cell * 0.3;
      ctx.globalAlpha = Math.max(0, e.life) * 0.7;
      ctx.strokeStyle = '#ffb648';
      ctx.lineWidth = 6 * e.life + 1;
      ctx.beginPath();
      ctx.arc(e.x, e.y, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function draw(t) {
  const T = themed();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = T.page;
  ctx.fillRect(0, 0, W, H);

  if (flatBlocked()) {
    // paysage : partie en pause, invitation à remettre le téléphone droit
    ctx.fillStyle = T.hud;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.round(H * 0.16) + 'px ' + FONT;
    ctx.fillText('🔄', W / 2, H * 0.4);
    ctx.font = '800 ' + Math.round(H * 0.07) + 'px ' + FONT;
    ctx.fillText('Tourne ton téléphone', W / 2, H * 0.62);
    if (isPlaying()) {
      ctx.font = '700 ' + Math.round(H * 0.045) + 'px ' + FONT;
      ctx.fillText('La partie est en pause, rien n\'est perdu !', W / 2, H * 0.74);
    }
    return;
  }

  drawLagoon(t, T);
  if (mode !== 'puzzle') drawTideLine(t, T);

  const yOff = -(1 - shiftAnim);

  for (const b of blocks) drawStone(b, yOff, T);
  for (const p of powerups) drawPowerup(p, yOff, T, t);

  // mutateur brouillard (hebdo), brume d'événement (tournoi) ou de boss
  if ((mode === 'weekly' && weeklyMut === 'fog') || round < fogUntil) {
    const fh = boardTop + cell * 3;
    const fg = ctx.createLinearGradient(0, ceilY, 0, fh + cell);
    fg.addColorStop(0, 'rgba(216,236,238,0.95)');
    fg.addColorStop(0.7, 'rgba(216,236,238,0.85)');
    fg.addColorStop(1, 'rgba(216,236,238,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, ceilY - 6, W, fh - ceilY + cell + 6);
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
  drawEffects(T);
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.font = '800 ' + Math.round(cell * 0.3) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,40,40,0.4)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = T.floater;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (state === 'aim' && aim && aim.valid) {
    drawAimLine(aim.angle, T);
  }

  drawBeach(t, T);

  for (const ball of balls) {
    if (feverActive) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ff9d3c';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, RADIUS() * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawBall(ball.x, ball.y, RADIUS(), T);
  }

  if (state === 'aim' || state === 'flight') {
    const r = RADIUS();
    const remaining = state === 'flight' ? toLaunch : ballCount;
    if (remaining > 0) {
      drawBall(launchX, floorY - r, r * 1.15, T);
      ctx.fillStyle = T.sandText;
      ctx.font = '800 ' + Math.round(cell * 0.26) + 'px ' + FONT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('X' + remaining, launchX - r * 2.2, floorY - r);
    }
    if (state === 'flight' && nextLaunchX !== null) {
      ctx.fillStyle = T.ghost;
      ctx.beginPath();
      ctx.arc(nextLaunchX, floorY - r, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // HUD selon le mode — jamais en état menu : il transparaissait
  // à travers les écrans translucides (bug visuel « MANCHE 1 » fantôme)
  if (state === 'menu') {
    drawTutorial(T);
    return;
  }
  ctx.fillStyle = T.hud;
  ctx.font = '800 ' + Math.round(cell * 0.34) + 'px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (isTimed()) {
    const mm = Math.floor(tideTime / 60);
    const ss = String(Math.floor(tideTime % 60)).padStart(2, '0');
    ctx.fillStyle = tideTime <= 10 ? '#ff5a4e' : T.hud;
    ctx.fillText(mm + ':' + ss, 14, ceilY - 26);
    ctx.fillStyle = T.hud;
  } else if (mode === 'puzzle') {
    ctx.fillText('NIVEAU ' + (puzzle.idx + 1), 14, ceilY - 26);
  } else {
    const label = 'MANCHE ' + round;
    ctx.fillText(label, 14, ceilY - 26);
    // fantôme du défi du jour : le score du meilleur run à cette manche
    if (mode === 'daily' && ghost && ghost[round] != null) {
      const gw = ctx.measureText(label).width;
      ctx.font = '700 ' + Math.round(cell * 0.19) + 'px ' + FONT;
      ctx.fillStyle = score >= ghost[round] ? '#7ef0d8' : '#ff8c8c';
      ctx.fillText('👻 ' + ghost[round], 20 + gw, ceilY - 26);
      ctx.fillStyle = T.hud;
      ctx.font = '800 ' + Math.round(cell * 0.34) + 'px ' + FONT;
    }
  }
  ctx.textAlign = 'center';
  ctx.font = '800 ' + Math.round(cell * 0.3) + 'px ' + FONT;
  ctx.fillText(String(score), W / 2, ceilY - 26);

  // jauge Gamelan : les combos la remplissent, pleine = tir de fièvre
  if (mode !== 'puzzle') {
    const gy = ceilY - 9;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(14, gy, W - 28, 5, 2.5);
    ctx.fill();
    const frac = feverActive ? 1 : Math.min(1, fever);
    if (frac > 0.02) {
      const hot = feverActive || fever >= 1;
      ctx.fillStyle = hot
        ? (Math.sin(performance.now() / 120) > 0 ? '#ffb648' : '#ff7847')
        : '#f5a24b';
      roundRect(14, gy, (W - 28) * frac, 5, 2.5);
      ctx.fill();
    }
  }
  ctx.fillStyle = T.hudSub;
  ctx.font = '700 ' + Math.round(cell * 0.22) + 'px ' + FONT;
  ctx.textAlign = 'right';
  if (mode === 'puzzle') {
    ctx.fillText('TIRS ' + puzzle.shotsLeft, W - 58, ceilY - 26);
  } else {
    ctx.fillText('◉ ' + pearls, W - 58, ceilY - 26);
  }

  const ab = accelBtnRect();
  if (ab) {
    roundRect(ab.x, ab.y, ab.w, ab.h, ab.h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 ' + Math.round(cell * 0.26) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶▶ ACCÉLÉRER', ab.x + ab.w / 2, ab.y + ab.h / 2 + 1);
  } else if (state === 'flight' && timeScale > 1.05) {
    ctx.fillStyle = T.sandText;
    ctx.font = '700 ' + Math.round(cell * 0.22) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶▶', W / 2, floorY + 44);
  }
  if (chiliActive && state === 'flight') {
    ctx.fillStyle = '#e33f2b';
    ctx.font = '800 ' + Math.round(cell * 0.24) + 'px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('🌶 x2', 14, floorY + 22);
  }
  if (shieldCharges > 0 && (state === 'aim' || state === 'flight')) {
    ctx.font = '800 ' + Math.round(cell * 0.24) + 'px ' + FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff9fcc';
    ctx.fillText('🪷' + (shieldCharges > 1 ? ' x' + shieldCharges : ''), W - 14, floorY + 44);
  }
  if (guideShots > 0 && state === 'aim') {
    ctx.font = '800 ' + Math.round(cell * 0.24) + 'px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe28a';
    ctx.fillText('🧭 x' + guideShots, 14, floorY + 22);
  }

  drawTutorial(T);
}

/* Aides de la première partie (mode classique uniquement). */
function drawTutorial(T) {
  if (!tutoActive) return;
  if (round >= 3) {
    tutoActive = false;
    store.set(KEYS.TUTO, '1');
    return;
  }
  if (state !== 'aim') return;
  const lines = round === 1
    ? ['Glisse ton doigt dans la direction du tir,', 'puis relâche pour lancer la noix de coco !']
    : ['Ramasse les bonus qui flottent :', '○ = une noix de plus à chaque tir !'];
  const cy = boardTop + (floorY - boardTop) * 0.58;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 ' + Math.round(cell * 0.24) + 'px ' + FONT;
  lines.forEach((line, i) => {
    const y = cy + i * cell * 0.42;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,40,40,0.5)';
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, W / 2, y);
  });
}

/* La visée raccourcit à mesure que la partie avance : viser devient un
   vrai talent aux grosses manches. La boussole (bonus rare) rétablit la
   trajectoire complète, rebonds sur les murs compris. */
function aimSteps() {
  if (mode === 'puzzle') return 24;
  return Math.max(8, 24 - Math.floor(round / 2));
}

function drawAimLine(angle, T) {
  const r = RADIUS();
  const guided = guideShots > 0;
  let a = angle;
  // sous le mutateur miroir, la boussole montre la VRAIE trajectoire
  if (guided && mode === 'weekly' && weeklyMut === 'mirror') a = Math.PI - a;
  let dirX = Math.cos(a), dirY = -Math.sin(a);
  let x = launchX, y = floorY - r;
  const step = cell * 0.32;
  const steps = guided ? 64 : aimSteps();
  for (let i = 0; i < steps; i++) {
    x += dirX * step;
    y += dirY * step;
    if (guided) {
      if (x < r) { x = r + (r - x); dirX = Math.abs(dirX); }
      if (x > W - r) { x = (W - r) - (x - (W - r)); dirX = -Math.abs(dirX); }
      if (y < ceilY + r) { y = ceilY + r + (ceilY + r - y); dirY = Math.abs(dirY); }
      if (y > floorY - r) break;
    } else if (x < r || x > W - r || y < boardTop + r) {
      break;
    }
    if (pointInBlock(x, y, r)) break;
    ctx.fillStyle = guided ? '#ffe28a' : T.aimDot;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2.5, r * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guided ? 'rgba(0,40,40,0.5)' : T.aimDotStroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function pointInBlock(x, y, r) {
  for (const b of blocks) {
    const rc = blockRect(b, 0);
    if (x > rc.x0 - r && x < rc.x1 + r && y > rc.y0 - r && y < rc.y1 + r) return true;
  }
  return false;
}

function roundRect(x, y, w, h, rad) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// ---- entrées ----
function clampAngle(dx, dy) {
  if (dy >= 0) return null;
  let a = Math.atan2(-dy, dx);
  if (a < MIN_ANGLE) a = MIN_ANGLE;
  if (a > Math.PI - MIN_ANGLE) a = Math.PI - MIN_ANGLE;
  return a;
}

function wireInput() {
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initAudio();
    if (flatBlocked()) return; // paysage bas : jeu en pause
    const x = e.clientX - offX;
    if (state === 'flight') {
      const b = accelBtnRect();
      if (b && x >= b.x && x <= b.x + b.w
        && e.clientY >= b.y && e.clientY <= b.y + b.h) {
        userFast = true;
      }
      return;
    }
    if (state !== 'aim') return;
    aim = { sx: x, sy: e.clientY, cx: x, cy: e.clientY, valid: false, angle: Math.PI / 2 };
  });

  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (state !== 'aim' || !aim || aim.sx === undefined) return;
    aim.cx = e.clientX - offX;
    aim.cy = e.clientY;
    const dx = aim.cx - aim.sx, dy = aim.cy - aim.sy;
    if (Math.hypot(dx, dy) < 14) { aim.valid = false; return; }
    const a = clampAngle(dx, dy);
    if (a === null) { aim.valid = false; return; }
    aim.angle = a;
    aim.valid = true;
  });

  canvas.addEventListener('pointerup', (e) => {
    e.preventDefault();
    if (state !== 'aim' || !aim || aim.sx === undefined) return;
    if (aim.valid) fire(aim.angle);
    else aim = null;
  });

  canvas.addEventListener('pointercancel', (e) => {
    e.preventDefault();
    if (state === 'aim') aim = null;
  });

  // bloque le rebond/défilement de la page pendant le jeu seulement :
  // l'écouteur vit sur le canvas, les écrans (boutique, progrès…)
  // défilent librement au doigt
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}
