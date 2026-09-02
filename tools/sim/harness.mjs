/* Harnais de simulation : exécute le VRAI js/game.js sous Node, sans
   navigateur. DOM/canvas minimaux, horloge virtuelle à 30 i/s, rendu
   coupé. Fournit un bot et des vérificateurs d'invariants physiques. */

// ---- environnement navigateur minimal ----
const noop = () => {};
const listeners = {};
let rafCb = null;
globalThis.window = globalThis;
globalThis.innerWidth = 390;
globalThis.innerHeight = 844;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = noop;
globalThis.removeEventListener = noop;
globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
globalThis.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '0' });
globalThis.Image = class { constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; } set src(v) { this._src = v; } get src() { return this._src; } };
const mem = new Map();
try {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
      clear: () => mem.clear(),
    },
    configurable: true, writable: true,
  });
} catch (e) { /* déjà défini */ }
const elStub = () => ({ dataset: {}, style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  appendChild: noop, removeChild: noop, remove: noop, addEventListener: noop, setAttribute: noop, click: noop, textContent: '' });
globalThis.document = {
  documentElement: elStub(), body: elStub(), head: elStub(), hidden: false,
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
  createElement: elStub, addEventListener: noop, removeEventListener: noop,
};
const ctxStub = new Proxy({}, {
  get(t, p) {
    if (p === 'measureText') return () => ({ width: 10 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (p in t) return t[p];
    return noop;
  },
  set(t, p, v) { t[p] = v; return true; },
});
const canvas = { width: 0, height: 0, style: {}, getContext: () => ctxStub, addEventListener: noop };

const game = await import(new URL('../../js/game.js', import.meta.url));
const { settings } = await import(new URL('../../js/storage.js', import.meta.url));
settings.ambience = false;
settings.sound = false;
settings.music = false;

// ---- horloge virtuelle ----
const FRAME_MS = 1000 / 30;
let now = 1000;
let lastResult = null;   // {kind:'win'|'over', payload}
game.initGame(canvas, {
  onGameOver(s) { lastResult = { kind: 'over', payload: s }; },
  onPuzzleWin(s) { lastResult = { kind: 'win', payload: s }; },
  onOdysseyWin(s) { lastResult = { kind: 'win', payload: s }; },
  onTurnEnd() {},
});
game.debugSet({ noDraw: true });
// pousse le temps réel utilisé par les anti-rebonds (buzz/sfx throttles)
export function tick() {
  now += FRAME_MS;
  const cb = rafCb;
  rafCb = null;
  cb(now);
}

// ---- invariants physiques ----
export function checkInvariants(st, anomalies, ctxLabel) {
  const g = st.geometry;
  const r = g.cell * 0.13;
  const speed = g.cell * 9 * (settings.fast ? 1.4 : 1);
  for (const b of st.balls) {
    if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.vy)) {
      anomalies.push({ t: 'nan', ctx: ctxLabel, ball: b }); continue;
    }
    if (b.x < r - 1 || b.x > g.W - r + 1 || b.y < (g.boardTop - g.cell) + r - 1 || b.y > g.floorY + 2) {
      anomalies.push({ t: 'out-of-bounds', ctx: ctxLabel, ball: { x: +b.x.toFixed(1), y: +b.y.toFixed(1) } });
    }
    const sp = Math.hypot(b.vx, b.vy);
    // vitesses légitimes : normale, rapide (réglage ou salon), mutateur +25 %
    const base = g.cell * 9;
    const ok = [1, 1.4, 1.25, 1.75].some((f) => Math.abs(sp - base * f) <= base * f * 0.06);
    if (!ok) {
      anomalies.push({ t: 'speed-drift', ctx: ctxLabel, sp: +sp.toFixed(1), expected: +speed.toFixed(1) });
    }
    for (const k of st.blocks) {
      const span = k.type === 'wide' ? 2 : k.type === 'boss' ? 3 : 1;
      const vspan = k.type === 'boss' ? 2 : 1;
      const pad = g.cell * 0.055;
      const x0 = k.col * g.cell + pad, x1 = (k.col + span) * g.cell - pad;
      const y0 = g.boardTop + k.row * g.cell + pad, y1 = g.boardTop + (k.row + vspan) * g.cell - pad;
      // noix nettement À L'INTÉRIEUR d'une pierre (pas juste en contact)
      if (b.x > x0 + r * 0.6 && b.x < x1 - r * 0.6 && b.y > y0 + r * 0.6 && b.y < y1 - r * 0.6) {
        let inside = true;
        if (k.type === 'round') {
          const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = (x1 - x0) / 2;
          inside = Math.hypot(b.x - cx, b.y - cy) < R - r * 0.6;
        } else if (k.type === 'tri') {
          // moitié pleine seulement : côté intérieur de l'hypoténuse
          const o = k.orient || 0;
          const n = o === 0 ? [1, -1] : o === 1 ? [-1, -1] : o === 2 ? [1, 1] : [-1, 1];
          const a = (o === 0 || o === 3) ? [x0, y0] : [x0, y1];
          const sd = ((b.x - a[0]) * n[0] + (b.y - a[1]) * n[1]) / Math.SQRT2;
          inside = sd < -r * 0.6;
        }
        if (inside) anomalies.push({ t: 'ball-inside-block', ctx: ctxLabel, block: k, ball: { x: +b.x.toFixed(1), y: +b.y.toFixed(1) } });
      }
    }
  }
  // occupation des cases : deux pierres sur la même case, bonus dans une pierre
  const occ = new Map();
  for (const k of st.blocks) {
    const span = k.type === 'wide' ? 2 : k.type === 'boss' ? 3 : 1;
    const vspan = k.type === 'boss' ? 2 : 1;
    if (k.col < 0 || k.col + span > 9 || k.row < 0) anomalies.push({ t: 'block-off-grid', ctx: ctxLabel, block: k });
    for (let c = 0; c < span; c++) for (let rr = 0; rr < vspan; rr++) {
      const key = (k.col + c) + ':' + (k.row + rr);
      if (occ.has(key)) anomalies.push({ t: 'blocks-overlap', ctx: ctxLabel, a: occ.get(key), b: k });
      occ.set(key, k);
    }
  }
  for (const p of st.powerups) {
    if (occ.has(p.col + ':' + p.row)) anomalies.push({ t: 'powerup-in-block', ctx: ctxLabel, powerup: p, block: occ.get(p.col + ':' + p.row) });
  }
  if (st.state === 'flight' && st.balls.length === 0) {
    // toLaunch non exposé : on tolère 2 s de rafale ; au-delà, c'est un tir figé
  }
}

// ---- bot ----
function launchPoint(st) {
  return { x: st.launchX, y: st.geometry.floorY - st.geometry.cell * 0.13 };
}
function cellCenter(st, col, row, span = 1, vspan = 1) {
  const g = st.geometry;
  return { x: (col + span / 2) * g.cell, y: g.boardTop + (row + vspan / 2) * g.cell };
}
function angleTo(st, pt, noise = 0) {
  const lp = launchPoint(st);
  const dx = pt.x - lp.x, dy = lp.y - pt.y;
  let a = Math.atan2(Math.max(dy, 1), dx) + (Math.random() - 0.5) * noise;
  return Math.min(Math.PI - 0.14, Math.max(0.14, a));
}

/* Bot « correct » : vise les +1 noix quand il y en a (la noix continue
   ensuite vers les pierres), sinon la cible selon l'objectif. */
export function decentBot(st, goal) {
  const balls = st.powerups.filter((p) => p.kind === 'ball');
  const stones = st.blocks;
  if (goal === 'boss') {
    const boss = stones.find((b) => b.type === 'boss');
    if (balls.length && Math.random() < 0.5) {
      const p = balls.sort((a, b) => b.row - a.row)[0];
      return angleTo(st, cellCenter(st, p.col, p.row), 0.04);
    }
    if (boss) return angleTo(st, cellCenter(st, boss.col, boss.row, 3, 2), 0.06);
  }
  if (balls.length && Math.random() < 0.6) {
    const p = balls.sort((a, b) => b.row - a.row)[0];
    return angleTo(st, cellCenter(st, p.col, p.row), 0.04);
  }
  if (!stones.length) return Math.PI / 2;
  let target;
  if (goal === 'break') {
    target = [...stones].filter((b) => b.type !== 'boss').sort((a, b) => a.hp - b.hp || b.row - a.row)[0] || stones[0];
  } else if (goal === 'score') {
    // la pierre la plus entourée (combos)
    const score = (b) => stones.filter((o) => Math.abs(o.col - b.col) <= 1 && Math.abs(o.row - b.row) <= 1).length;
    target = [...stones].sort((a, b) => score(b) - score(a) || b.row - a.row)[0];
  } else {
    // survie / classique : la pierre la plus basse, la plus solide d'abord
    target = [...stones].sort((a, b) => b.row - a.row || b.hp - a.hp)[0];
  }
  const span = target.type === 'wide' ? 2 : target.type === 'boss' ? 3 : 1;
  return angleTo(st, cellCenter(st, target.col, target.row, span, target.type === 'boss' ? 2 : 1), 0.05);
}

/* Bot « naïf » : vise une pierre au hasard, sans souci des noix. */
export function naiveBot(st) {
  if (!st.blocks.length) return Math.PI / 2;
  const b = st.blocks[Math.floor(Math.random() * st.blocks.length)];
  return angleTo(st, cellCenter(st, b.col, b.row), 0.12);
}

/* Joue une partie complète. Retourne {result, shots, rounds, anomalies, ...}. */
export function playGame({ mode, idx = 0, seed = null, bot, goal = null, maxShots = 400, invariants = true, onShot = null }) {
  lastResult = null;
  game.newGame(mode, idx, seed);
  const anomalies = [];
  let shots = 0;
  let frames = 0;
  let maxBalls = 0;
  let safetyNets = 0;
  let longestShotFrames = 0;
  let shotFrames = 0;
  let exception = null;
  while (frames < 400000) {
    let st;
    try {
      st = game.debugState();
    } catch (e) { exception = e; break; }
    if (st.state === 'over') break;
    if (st.state === 'aim') {
      if (shots >= maxShots) break;
      if (onShot) onShot(st, shots);
      const angle = bot(st, goal);
      try { game.debugSet({ fire: angle }); } catch (e) { exception = e; break; }
      shots += 1;
      shotFrames = 0;
    }
    try { tick(); } catch (e) { exception = e; break; }
    frames += 1;
    shotFrames += 1;
    longestShotFrames = Math.max(longestShotFrames, shotFrames);
    if (invariants && frames % 2 === 0) {
      const s2 = game.debugState();
      maxBalls = Math.max(maxBalls, s2.balls.length);
      checkInvariants(s2, anomalies, mode + '#' + idx + ' tir ' + shots + ' manche ' + s2.round);
      if (shotFrames === 40 * 30) safetyNets += 1;
    }
  }
  const st = game.debugState();
  return {
    result: lastResult, shots, round: st.round, score: st.score, ballCount: st.ballCount, broken: st.broken,
    frames, anomalies, maxBalls, longestShotSec: +(longestShotFrames / 30).toFixed(1),
    exception: exception ? String(exception && exception.stack || exception) : null,
    odyssey: st.odyssey, state: st.state,
  };
}

export { game, settings };
