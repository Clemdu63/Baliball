'use strict';

/* ============================================================
   Baliball — casse-briques à balles multiples (type "Ballz")
   - Glisse pour viser, relâche pour tirer
   - Les balles rebondissent, les briques perdent 1 PV par impact
   - Chaque tour : nouvelle rangée en haut, tout descend d'un cran
   - Pastille ○ : +1 balle pour les tours suivants
   ============================================================ */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const COLS = 7;
const SAVE_KEY = 'baliball.save.v1';
const BEST_KEY = 'baliball.best.v1';

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
window.addEventListener('resize', resize);
resize();

// ---- état du jeu ----
let state = 'menu';            // menu | aim | flight | over
let round = 1;
let ballCount = 1;
let launchX = 0;
let nextLaunchX = null;        // x d'atterrissage de la 1re balle
let blocks = [];               // {col, row, hp, flash}
let bonuses = [];              // {col, row}
let balls = [];                // {x, y, vx, vy}
let toLaunch = 0;
let launchTimer = 0;
let collectedThisTurn = 0;
let aim = null;                // {sx, sy, cx, cy, valid, angle}
let timeScale = 1;
let userFast = false;
let flightTime = 0;
let shiftAnim = 1;             // 0→1 : animation de descente des rangées
let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
let particles = [];            // {x, y, vx, vy, life, color}
let floaters = [];             // {x, y, life, text}

const SPEED = () => cell * 16;         // vitesse des balles (px/s)
const RADIUS = () => cell * 0.13;
const BONUS_R = () => cell * 0.19;
const MIN_ANGLE = 0.14;                // ~8° au-dessus de l'horizontale

// ---- helpers grille ----
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

const PALETTE = ['#43b929', '#8bd52c', '#f0a63c', '#1f7fe0', '#7a4de0', '#e0447a'];
function blockColor(hp) {
  return PALETTE[Math.floor((hp - 1) / 4) % PALETTE.length];
}

// ---- cycle de jeu ----
function newGame() {
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
  spawnRow();
  state = 'aim';
  saveGame();
}

function spawnRow() {
  const cols = [0, 1, 2, 3, 4, 5, 6];
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cols[i], cols[j]] = [cols[j], cols[i]];
  }
  const n = 2 + Math.floor(Math.random() * 4); // 2 à 5 briques
  for (let i = 0; i < n; i++) {
    const hp = Math.random() < 0.18 ? round * 2 : round;
    blocks.push({ col: cols[i], row: 0, hp, flash: 0 });
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

  // tout descend d'un cran
  for (const b of blocks) b.row += 1;
  for (const bn of bonuses) bn.row += 1;
  // pastilles arrivées en bas : récupérées automatiquement
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
  spawnRow();
  state = 'aim';
  saveGame();
}

function gameOver() {
  state = 'over';
  if (round > best) {
    best = round;
    localStorage.setItem(BEST_KEY, String(best));
  }
  localStorage.removeItem(SAVE_KEY);
  document.getElementById('go-score').textContent = String(round);
  document.getElementById('go-best').textContent = 'Record : ' + best;
  document.getElementById('gameover').classList.remove('hidden');
}

function fire(angle) {
  toLaunch = ballCount;
  launchTimer = 0;
  aim = { angle };
  state = 'flight';
  flightTime = 0;
}

// ---- sauvegarde / reprise ----
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      round, ballCount,
      launchFrac: launchX / W,
      blocks: blocks.map((b) => [b.col, b.row, b.hp]),
      bonuses: bonuses.map((bn) => [bn.col, bn.row]),
    }));
  } catch (e) { /* stockage indisponible : on joue sans sauvegarde */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.blocks) || !s.round) return false;
    round = s.round;
    ballCount = s.ballCount || 1;
    launchX = Math.min(Math.max((s.launchFrac || 0.5) * W, RADIUS() + 2), W - RADIUS() - 2);
    blocks = s.blocks.map(([col, row, hp]) => ({ col, row, hp, flash: 0 }));
    bonuses = (s.bonuses || []).map(([col, row]) => ({ col, row }));
    balls = [];
    toLaunch = 0;
    collectedThisTurn = 0;
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
  const stepLen = r * 0.8; // sous-pas courts pour ne jamais traverser une brique
  let remaining = dist;

  while (remaining > 0 && !ball.dead) {
    const d = Math.min(stepLen, remaining);
    remaining -= d;
    const sp = Math.hypot(ball.vx, ball.vy) || 1;
    ball.x += (ball.vx / sp) * d;
    ball.y += (ball.vy / sp) * d;
    // murs
    if (ball.x < r) { ball.x = r; ball.vx = Math.abs(ball.vx); }
    if (ball.x > W - r) { ball.x = W - r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < boardTop + r) { ball.y = boardTop + r; ball.vy = Math.abs(ball.vy); }
    // sol : la balle atterrit
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

    const color = blockColor(b.hp);
    b.hp -= 1;
    b.flash = 1;
    if (b.hp <= 0) {
      const cx = (rc.x0 + rc.x1) / 2, cy = (rc.y0 + rc.y1) / 2;
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(a) * cell * 2.2, vy: Math.sin(a) * cell * 2.2,
          life: 1, color,
        });
      }
      blocks.splice(i, 1);
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
    }
  }
}

// ---- boucle principale ----
let lastT = 0;
function frame(t) {
  const dt = Math.min((t - lastT) / 1000 || 0, 1 / 30);
  lastT = t;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function update(dt) {
  if (shiftAnim < 1) shiftAnim = Math.min(1, shiftAnim + dt * 5);

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
  // accélération auto sur les longs tours, ou après un tap du joueur
  const autoFast = Math.min(3, 1 + Math.max(0, flightTime - 9) * 0.4);
  timeScale = Math.max(userFast ? 2.5 : 1, autoFast);
  const sdt = dt * timeScale;

  // lancement en rafale
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
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // fond
  ctx.fillStyle = '#101014';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e9e7df';
  ctx.fillRect(0, boardTop - 6, W, floorY - boardTop + 6);

  const yOff = -(1 - shiftAnim); // animation de descente

  // ligne de danger
  ctx.strokeStyle = 'rgba(224, 68, 122, 0.25)';
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, boardTop + deathRow * cell);
  ctx.lineTo(W, boardTop + deathRow * cell);
  ctx.stroke();
  ctx.setLineDash([]);

  // briques
  for (const b of blocks) {
    const rc = blockRect(b, yOff);
    const w = rc.x1 - rc.x0, h = rc.y1 - rc.y0;
    const grow = b.flash * cell * 0.03;
    ctx.fillStyle = blockColor(b.hp);
    roundRect(rc.x0 - grow, rc.y0 - grow, w + grow * 2, h + grow * 2, cell * 0.09);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + Math.round(cell * 0.32) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(b.hp), (rc.x0 + rc.x1) / 2, (rc.y0 + rc.y1) / 2 + 1);
  }

  // pastilles +1 balle
  const pulse = 1 + Math.sin(performance.now() / 300) * 0.08;
  for (const bn of bonuses) {
    const c = bonusCenter(bn, yOff);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = cell * 0.05;
    ctx.beginPath();
    ctx.arc(c.x, c.y, BONUS_R() * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c.x, c.y, BONUS_R() * pulse + cell * 0.03, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(c.x, c.y, cell * 0.075, 0, Math.PI * 2);
    ctx.fill();
  }

  // particules et textes flottants
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  ctx.globalAlpha = 1;
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = '#33a82e';
    ctx.font = '800 ' + Math.round(cell * 0.3) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // visée
  if (state === 'aim' && aim && aim.valid) {
    drawAimLine(aim.angle);
  }

  // balles en vol
  ctx.fillStyle = '#fff';
  for (const ball of balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, RADIUS(), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // lanceur + compteur de balles
  if (state === 'aim' || state === 'flight') {
    const r = RADIUS();
    const remaining = state === 'flight' ? toLaunch : ballCount;
    if (remaining > 0) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(launchX, floorY - r, r * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#2b2b28';
      ctx.font = '800 ' + Math.round(cell * 0.26) + 'px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('X' + remaining, launchX - r * 2, floorY - r);
    }
    // aperçu du point d'atterrissage de la première balle
    if (state === 'flight' && nextLaunchX !== null) {
      ctx.fillStyle = 'rgba(43,43,40,0.5)';
      ctx.beginPath();
      ctx.arc(nextLaunchX, floorY - r, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // HUD
  ctx.fillStyle = '#2b2b28';
  ctx.font = '800 ' + Math.round(cell * 0.42) + 'px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MANCHE ' + round, 14, boardTop - 26);
  ctx.fillStyle = '#8a8a85';
  ctx.font = '700 ' + Math.round(cell * 0.24) + 'px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('RECORD ' + Math.max(best, round), W - 14, boardTop - 26);

  if (state === 'flight' && timeScale > 1.05) {
    ctx.fillStyle = '#8a8a85';
    ctx.font = '700 ' + Math.round(cell * 0.22) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▶▶', W / 2, floorY + 30);
  } else if (state === 'flight') {
    ctx.fillStyle = 'rgba(138,138,133,0.6)';
    ctx.font = '600 ' + Math.round(cell * 0.2) + 'px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('touche l\'écran pour accélérer', W / 2, floorY + 30);
  }
}

function drawAimLine(angle) {
  const r = RADIUS();
  const dirX = Math.cos(angle), dirY = -Math.sin(angle);
  let x = launchX, y = floorY - r;
  const step = cell * 0.32;
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 24; i++) {
    x += dirX * step;
    y += dirY * step;
    if (x < r || x > W - r || y < boardTop + r) break;
    if (pointInBlock(x, y, r)) break;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2.5, r * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
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

// ---- entrées tactiles / souris ----
function clampAngle(dx, dy) {
  if (dy >= 0) return null; // on ne tire que vers le haut
  let a = Math.atan2(-dy, dx); // 0..π, π/2 = tout droit
  if (a < MIN_ANGLE) a = MIN_ANGLE;
  if (a > Math.PI - MIN_ANGLE) a = Math.PI - MIN_ANGLE;
  return a;
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
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

function endAim(e) {
  e.preventDefault();
  if (state !== 'aim' || !aim || aim.sx === undefined) return;
  if (aim.valid) fire(aim.angle);
  else aim = null;
}
canvas.addEventListener('pointerup', endAim);
canvas.addEventListener('pointercancel', (e) => {
  e.preventDefault();
  if (state === 'aim') aim = null;
});

// bloque le zoom/scroll iOS
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---- menus ----
const menuEl = document.getElementById('menu');
const gameoverEl = document.getElementById('gameover');
const resumeBtn = document.getElementById('btn-resume');

function showMenu() {
  state = 'menu';
  document.getElementById('menu-best').textContent = best > 0 ? 'Record : ' + best : '';
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  resumeBtn.style.display = hasSave ? '' : 'none';
  menuEl.classList.remove('hidden');
}

document.getElementById('btn-new').addEventListener('click', () => {
  menuEl.classList.add('hidden');
  newGame();
});
resumeBtn.addEventListener('click', () => {
  menuEl.classList.add('hidden');
  if (!loadGame()) newGame();
});
document.getElementById('btn-retry').addEventListener('click', () => {
  gameoverEl.classList.add('hidden');
  newGame();
});

showMenu();
requestAnimationFrame(frame);
