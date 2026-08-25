/* Moteur et rendu du jeu (canvas) — thème Bali.
   Le plateau est un lagon : les pierres de temple descendent dans l'eau
   claire vers la plage, et on les casse à coups de noix de coco.
   - Glisse pour viser, relâche pour tirer
   - Les pierres perdent 1 PV par impact, tout descend à chaque tour
   - Petite noix cerclée : +1 noix de coco pour les tours suivants */

import { store, KEYS, settings } from './storage.js';
import { getTheme, stoneStyle } from './theme.js';
import { initAudio, sfx } from './audio.js';

const COLS = 7;

let canvas = null;
let ctx = null;
let hooks = {};

// ---- layout ----
let W = 0, H = 0, dpr = 1;
let cell = 0, boardTop = 0, floorY = 0, deathRow = 8;

function readSafeInset(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return parseFloat(v) || 0;
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  cell = W / COLS;
  boardTop = readSafeInset('--sat') + 58;
  floorY = H - readSafeInset('--sab') - 66;
  deathRow = Math.max(4, Math.floor((floorY - boardTop) / cell) - 1);
}

// ---- état ----
let state = 'menu';            // menu | aim | flight | over
let round = 1;
let ballCount = 1;
let launchX = 0;
let nextLaunchX = null;
let blocks = [];               // {col, row, hp, flash, seed}
let bonuses = [];              // {col, row}
let balls = [];                // {x, y, vx, vy, dead}
let toLaunch = 0;
let launchTimer = 0;
let collectedThisTurn = 0;
let aim = null;
let timeScale = 1;
let userFast = false;
let flightTime = 0;
let shiftAnim = 1;
let best = parseInt(store.get(KEYS.BEST) || '0', 10) || 0;
let particles = [];
let floaters = [];
let stats = { broken: 0, shots: 0 };
let fishes = [];               // décor : {x, y, dir, speed, size, phase}
let fishTimer = 2;

const SPEED = () => cell * 16 * (settings.fast ? 1.35 : 1);
const RADIUS = () => cell * 0.13;
const BONUS_R = () => cell * 0.19;
const MIN_ANGLE = 0.14;

// ---- API ----
export function initGame(canvasEl, h) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  hooks = h || {};
  resize();
  window.addEventListener('resize', resize);
  wireInput();
  requestAnimationFrame(frame);
}

export function newGame() {
  round = 1;
  ballCount = 1;
  launchX = W / 2;
  nextLaunchX = null;
  blocks = [];
  bonuses = [];
  balls = [];
  toLaunch = 0;
  collectedThisTurn = 0;
  particles = [];
  floaters = [];
  shiftAnim = 1;
  stats = { broken: 0, shots: 0 };
  spawnRow();
  state = 'aim';
  saveGame();
}

export function resumeGame() {
  return loadGame();
}

export function hasSave() {
  return !!store.get(KEYS.SAVE);
}

export function getBest() {
  return best;
}

export function toMenu() {
  // quitter en plein vol : on retrouvera le début du tour à la reprise
  state = 'menu';
  balls = [];
  toLaunch = 0;
  aim = null;
  timeScale = 1;
  userFast = false;
}

export function isPlaying() {
  return state === 'aim' || state === 'flight';
}

// ---- grille ----
function blockRect(b, yOffset) {
  const pad = cell * 0.055;
  return {
    x0: b.col * cell + pad,
    y0: boardTop + (b.row + yOffset) * cell + pad,
    x1: (b.col + 1) * cell - pad,
    y1: boardTop + (b.row + 1 + yOffset) * cell - pad,
  };
}

function bonusCenter(bn, yOffset) {
  return {
    x: (bn.col + 0.5) * cell,
    y: boardTop + (bn.row + 0.5 + yOffset) * cell,
  };
}

// ---- cycle ----
function spawnRow() {
  const cols = [0, 1, 2, 3, 4, 5, 6];
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cols[i], cols[j]] = [cols[j], cols[i]];
  }
  const n = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const hp = Math.random() < 0.18 ? round * 2 : round;
    blocks.push({ col: cols[i], row: 0, hp, flash: 0, seed: Math.random() });
  }
  if (n < COLS) {
    bonuses.push({ col: cols[n], row: 0 });
  }
}

function endTurn() {
  ballCount += collectedThisTurn;
  collectedThisTurn = 0;
  if (nextLaunchX !== null) launchX = nextLaunchX;
  nextLaunchX = null;
  timeScale = 1;
  userFast = false;
  flightTime = 0;

  for (const b of blocks) b.row += 1;
  for (const bn of bonuses) bn.row += 1;
  bonuses = bonuses.filter((bn) => {
    if (bn.row >= deathRow) {
      ballCount += 1;
      const c = bonusCenter(bn, 0);
      floaters.push({ x: c.x, y: c.y, life: 1, text: '+1' });
      return false;
    }
    return true;
  });
  shiftAnim = 0;

  if (blocks.some((b) => b.row >= deathRow)) {
    gameOver();
    return;
  }
  round += 1;
  sfx.newRow();
  spawnRow();
  state = 'aim';
  saveGame();
}

function gameOver() {
  state = 'over';
  if (round > best) {
    best = round;
    store.set(KEYS.BEST, String(best));
  }
  store.remove(KEYS.SAVE);
  sfx.over();
  if (hooks.onGameOver) {
    hooks.onGameOver({
      round,
      best,
      broken: stats.broken,
      shots: stats.shots,
      balls: ballCount,
    });
  }
}

function fire(angle) {
  toLaunch = ballCount;
  launchTimer = 0;
  aim = { angle };
  state = 'flight';
  flightTime = 0;
  stats.shots += 1;
  sfx.launch();
}

// ---- sauvegarde ----
function saveGame() {
  store.set(KEYS.SAVE, JSON.stringify({
    round, ballCount,
    launchFrac: launchX / W,
    blocks: blocks.map((b) => [b.col, b.row, b.hp]),
    bonuses: bonuses.map((bn) => [bn.col, bn.row]),
    stats,
  }));
}

function loadGame() {
  try {
    const raw = store.get(KEYS.SAVE);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.blocks) || !s.round) return false;
    round = s.round;
    ballCount = s.ballCount || 1;
    launchX = Math.min(Math.max((s.launchFrac || 0.5) * W, RADIUS() + 2), W - RADIUS() - 2);
    blocks = s.blocks.map(([col, row, hp]) => ({ col, row, hp, flash: 0, seed: Math.random() }));
    bonuses = (s.bonuses || []).map(([col, row]) => ({ col, row }));
    stats = s.stats && typeof s.stats.broken === 'number' ? s.stats : { broken: 0, shots: 0 };
    balls = [];
    toLaunch = 0;
    collectedThisTurn = 0;
    nextLaunchX = null;
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
    if (ball.y < boardTop + r) { ball.y = boardTop + r; ball.vy = Math.abs(ball.vy); sfx.wall(); }
    // la noix retombe sur la plage
    if (ball.y > floorY - r && ball.vy > 0) {
      ball.dead = true;
      if (nextLaunchX === null) {
        nextLaunchX = Math.min(Math.max(ball.x, r + 2), W - r - 2);
      }
      break;
    }
    collideBlocks(ball, r);
    collideBonuses(ball, r);
  }
}

function collideBlocks(ball, r) {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    const rc = blockRect(b, 0);
    if (ball.x <= rc.x0 - r || ball.x >= rc.x1 + r || ball.y <= rc.y0 - r || ball.y >= rc.y1 + r) continue;

    const dLeft = ball.x - (rc.x0 - r);
    const dRight = (rc.x1 + r) - ball.x;
    const dTop = ball.y - (rc.y0 - r);
    const dBottom = (rc.y1 + r) - ball.y;
    const m = Math.min(dLeft, dRight, dTop, dBottom);

    if (m === dLeft) { ball.x = rc.x0 - r; if (ball.vx > 0) ball.vx = -ball.vx; }
    else if (m === dRight) { ball.x = rc.x1 + r; if (ball.vx < 0) ball.vx = -ball.vx; }
    else if (m === dTop) { ball.y = rc.y0 - r; if (ball.vy > 0) ball.vy = -ball.vy; }
    else { ball.y = rc.y1 + r; if (ball.vy < 0) ball.vy = -ball.vy; }

    // anti-blocage : évite les trajectoires quasi horizontales infinies
    const sp = SPEED();
    if (Math.abs(ball.vy) < sp * 0.02) {
      ball.vy = (ball.vy < 0 ? -1 : 1) * sp * 0.05 || -sp * 0.05;
      const k = sp / Math.hypot(ball.vx, ball.vy);
      ball.vx *= k; ball.vy *= k;
    }

    const style = stoneStyle(b.hp);
    b.hp -= 1;
    b.flash = 1;
    if (b.hp <= 0) {
      const cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
      for (let p = 0; p < 9; p++) {
        const a = (p / 9) * Math.PI * 2;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(a) * cell * (1.6 + Math.random()),
          vy: Math.sin(a) * cell * (1.6 + Math.random()),
          life: 1,
          color: p % 3 === 0 ? style.edge : style.base,
        });
      }
      blocks.splice(i, 1);
      stats.broken += 1;
      sfx.brk();
    } else {
      sfx.hit();
    }
  }
}

function collideBonuses(ball, r) {
  for (let i = bonuses.length - 1; i >= 0; i--) {
    const c = bonusCenter(bonuses[i], 0);
    if (Math.hypot(ball.x - c.x, ball.y - c.y) < r + BONUS_R()) {
      collectedThisTurn += 1;
      floaters.push({ x: c.x, y: c.y, life: 1, text: '+1' });
      bonuses.splice(i, 1);
      sfx.bonus();
    }
  }
}

// ---- boucle ----
let lastT = 0;
function frame(t) {
  const dt = Math.min((t - lastT) / 1000 || 0, 1 / 30);
  lastT = t;
  update(dt);
  draw(t / 1000);
  requestAnimationFrame(frame);
}

function update(dt) {
  if (shiftAnim < 1) shiftAnim = Math.min(1, shiftAnim + dt * 5);

  // poissons du décor
  fishTimer -= dt;
  if (fishTimer <= 0 && fishes.length < 3) {
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
  for (const b of blocks) if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 6);

  if (state !== 'flight') return;

  flightTime += dt;
  const autoFast = Math.min(3, 1 + Math.max(0, flightTime - 9) * 0.4);
  timeScale = Math.max(userFast ? 2.5 : 1, autoFast);
  const sdt = dt * timeScale;

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
  // reflet
  ctx.fillStyle = c.light;
  ctx.beginPath();
  ctx.arc(x - r * 0.32, y - r * 0.34, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  // fibres
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = Math.max(0.6, r * 0.08);
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x + r * 0.15, y + r * 0.1, r * 0.62, 0.3, 1.4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // les trois yeux
  if (r >= 5) {
    ctx.fillStyle = c.dark;
    const er = Math.max(0.8, r * 0.11);
    ctx.beginPath(); ctx.arc(x - r * 0.18, y - r * 0.05, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.22, er, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.16, y + r * 0.12, er, 0, Math.PI * 2); ctx.fill();
  }
}

/* Pierre de temple : bloc taillé, biseau, rainures, mousse/éclats selon le palier. */
function drawStone(b, yOff, T) {
  const rc = blockRect(b, yOff);
  const w = rc.x1 - rc.x0, h = rc.y1 - rc.y0;
  const grow = b.flash * cell * 0.03;
  const x = rc.x0 - grow, y = rc.y0 - grow;
  const ww = w + grow * 2, hh = h + grow * 2;
  const style = stoneStyle(b.hp);
  const rad = cell * 0.07;

  ctx.fillStyle = style.base;
  roundRect(x, y, ww, hh, rad);
  ctx.fill();
  ctx.strokeStyle = style.edge;
  ctx.lineWidth = 2;
  ctx.stroke();

  // arête claire en haut, ombre en bas
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + rad, y + 1.5);
  ctx.lineTo(x + ww - rad, y + 1.5);
  ctx.stroke();
  ctx.strokeStyle = style.groove;
  ctx.beginPath();
  ctx.moveTo(x + rad, y + hh - 1.5);
  ctx.lineTo(x + ww - rad, y + hh - 1.5);
  ctx.stroke();

  // rainures de taille de pierre
  ctx.strokeStyle = style.groove;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + ww * 0.12, y + hh * 0.36);
  ctx.lineTo(x + ww * 0.88, y + hh * 0.36);
  ctx.stroke();

  // détails du palier (positions stables grâce à seed)
  const s = b.seed;
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
    roundRect(x, y, ww, hh, rad);
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

  // le nombre, lisible sur toutes les pierres
  ctx.font = '700 ' + Math.round(cell * 0.32) + 'px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = T.blockTextHalo;
  ctx.strokeText(String(b.hp), (rc.x0 + rc.x1) / 2, (rc.y0 + rc.y1) / 2 + 1);
  ctx.fillStyle = T.blockText;
  ctx.fillText(String(b.hp), (rc.x0 + rc.x1) / 2, (rc.y0 + rc.y1) / 2 + 1);
}

function blob(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.7, y + r * 0.25, r * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

/* Décor du lagon : eau, reflets, poissons, palmes, plage. */
function drawLagoon(t, T) {
  // eau
  const grad = ctx.createLinearGradient(0, boardTop, 0, floorY);
  grad.addColorStop(0, T.waterTop);
  grad.addColorStop(1, T.waterBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, boardTop - 6, W, floorY - boardTop + 6);

  // la nuit : reflet chaud du couchant en haut de l'eau
  if (T.waterGlow) {
    const g2 = ctx.createLinearGradient(0, boardTop, 0, boardTop + 120);
    g2.addColorStop(0, T.waterGlow);
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, boardTop - 6, W, 126);
  }

  // caustiques : trois ondes lumineuses qui dérivent lentement
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

  // scintillements
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

  // poissons
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

  // palmes qui dépassent dans les coins hauts
  ctx.fillStyle = T.palm;
  palmFrond(-6, boardTop + 6, 1, t);
  palmFrond(W + 6, boardTop + 10, -1, t);
}

function palmFrond(x0, y0, dir, t) {
  const sway = Math.sin(t * 0.7 + dir) * 3;
  ctx.save();
  ctx.translate(x0, y0);
  for (let i = 0; i < 3; i++) {
    const ang = dir * (0.25 + i * 0.35) + sway * 0.01;
    ctx.rotate(0);
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

function drawBeach(t, T) {
  // plage
  ctx.fillStyle = T.sand;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.fillStyle = T.sandDark;
  ctx.fillRect(0, floorY + 26, W, 3);

  // écume du bord de l'eau, animée
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

/* Ligne de marée : petites arches d'écume au niveau où la partie se perd. */
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

function draw(t) {
  const T = getTheme();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = T.page;
  ctx.fillRect(0, 0, W, H);

  drawLagoon(t, T);
  drawTideLine(t, T);

  const yOff = -(1 - shiftAnim);

  // pierres de temple
  for (const b of blocks) drawStone(b, yOff, T);

  // petites noix « +1 »
  const pulse = 1 + Math.sin(t * 3.3) * 0.08;
  for (const bn of bonuses) {
    const c = bonusCenter(bn, yOff);
    ctx.strokeStyle = T.aimDot;
    ctx.lineWidth = cell * 0.045;
    ctx.beginPath();
    ctx.arc(c.x, c.y, BONUS_R() * pulse, 0, Math.PI * 2);
    ctx.stroke();
    drawCoconut(c.x, c.y, cell * 0.105, T);
  }

  // éclats de pierre et textes flottants
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.font = '800 ' + Math.round(cell * 0.3) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,40,40,0.4)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = T.floater;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // visée
  if (state === 'aim' && aim && aim.valid) {
    drawAimLine(aim.angle, T);
  }

  drawBeach(t, T);

  // noix de coco en vol
  for (const ball of balls) {
    drawCoconut(ball.x, ball.y, RADIUS(), T);
  }

  // lanceur + compteur
  if (state === 'aim' || state === 'flight') {
    const r = RADIUS();
    const remaining = state === 'flight' ? toLaunch : ballCount;
    if (remaining > 0) {
      drawCoconut(launchX, floorY - r, r * 1.15, T);
      ctx.fillStyle = T.sandText;
      ctx.font = '800 ' + Math.round(cell * 0.26) + 'px -apple-system, sans-serif';
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

  // HUD
  ctx.fillStyle = T.hud;
  ctx.font = '800 ' + Math.round(cell * 0.42) + 'px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MANCHE ' + round, 14, boardTop - 26);
  ctx.fillStyle = T.hudSub;
  ctx.font = '700 ' + Math.round(cell * 0.24) + 'px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('RECORD ' + Math.max(best, round), W - 58, boardTop - 26);

  if (state === 'flight' && timeScale > 1.05) {
    ctx.fillStyle = T.sandText;
    ctx.font = '700 ' + Math.round(cell * 0.22) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▶▶', W / 2, floorY + 44);
  } else if (state === 'flight') {
    ctx.fillStyle = T.sandText;
    ctx.globalAlpha = 0.7;
    ctx.font = '600 ' + Math.round(cell * 0.2) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('touche l\'écran pour accélérer', W / 2, floorY + 44);
    ctx.globalAlpha = 1;
  }
}

function drawAimLine(angle, T) {
  const r = RADIUS();
  const dirX = Math.cos(angle), dirY = -Math.sin(angle);
  let x = launchX, y = floorY - r;
  const step = cell * 0.32;
  for (let i = 0; i < 24; i++) {
    x += dirX * step;
    y += dirY * step;
    if (x < r || x > W - r || y < boardTop + r) break;
    if (pointInBlock(x, y, r)) break;
    ctx.fillStyle = T.aimDot;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2.5, r * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = T.aimDotStroke;
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
    if (state === 'flight') { userFast = true; return; }
    if (state !== 'aim') return;
    aim = { sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, valid: false, angle: Math.PI / 2 };
  });

  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    if (state !== 'aim' || !aim || aim.sx === undefined) return;
    aim.cx = e.clientX;
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

  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}
