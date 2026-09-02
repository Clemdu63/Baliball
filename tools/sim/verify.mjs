/* Test de non-régression des correctifs moteur v4.2 (harnais Node). */
import { game, tick, playGame, decentBot, checkInvariants } from './harness.mjs';
const results = [];
const check = (name, ok, detail = '') => { results.push([ok, name, detail]); };

// 1. cascade : mystère → explosion pendant collideBlocks, plus de crash
{
  game.newGame('classic');
  game.debugSet({ clearBlocks: true });
  const g = game.debugState().geometry;
  game.debugSet({ addBlocks: [
    { col: 3, row: 3, hp: 1 }, { col: 5, row: 3, hp: 1 }, { col: 4, row: 3, hp: 1, type: 'mystery' },
  ] });
  game.debugSet({ setBall: { x: 4.5 * g.cell, y: g.boardTop + 5 * g.cell, vx: 0, vy: -g.cell * 9 } });
  const real = Math.random;
  Math.random = () => 0.7;
  let err = null;
  try { game.debugSet({ fire: Math.PI / 2 }); for (let i = 0; i < 120; i++) tick(); } catch (e) { err = e; }
  Math.random = real;
  check('cascade mystère→explosion sans exception', !err, err ? err.message : 'ok');
}

// 2. apparition du boss : rien sous l'emprise (rangée 1, colonnes 3-5)
{
  let seen = 0, dirty = 0;
  for (let gme = 0; gme < 25 && seen < 15; gme++) {
    game.newGame('classic');
    for (let shot = 0; shot < 60; shot++) {
      const st = game.debugState();
      if (st.state !== 'aim') break;
      if (st.round === 10 && st.boss) {
        seen += 1;
        const under = st.blocks.filter((b) => b.type !== 'boss' && b.row <= 1 && b.col >= 3 && b.col <= 5).length
          + st.powerups.filter((p) => p.row <= 1 && p.col >= 3 && p.col <= 5).length;
        if (under) dirty += 1;
        break;
      }
      game.debugSet({ fire: decentBot(st, 'survive') });
      for (let i = 0; i < 3000; i++) { tick(); if (game.debugState().state !== 'flight') break; }
      if (game.debugState().state === 'over') break;
    }
  }
  check('boss : emprise vide à l\'apparition', seen >= 5 && dirty === 0, seen + ' apparitions, ' + dirty + ' sales');
}

// 3. invariants sur 25 parties classiques + 5 rush : aucune anomalie
{
  let anomalies = 0, exceptions = 0, games = 0;
  for (let i = 0; i < 25; i++) { const r = playGame({ mode: 'classic', bot: decentBot, goal: 'survive', maxShots: 100 }); anomalies += r.anomalies.length; if (r.exception) exceptions += 1; games += 1; }
  for (let i = 0; i < 5; i++) { const r = playGame({ mode: 'rush', bot: decentBot, goal: 'boss', maxShots: 100 }); anomalies += r.anomalies.length; if (r.exception) exceptions += 1; games += 1; }
  check('invariants physiques (portail dans pierre, hors mur, superposition, dérive)', anomalies === 0 && exceptions === 0, games + ' parties, ' + anomalies + ' anomalies, ' + exceptions + ' exceptions');
}

// 4. déterminisme tournoi conservé (rangée 0 identique pour deux joueurs)
{
  let ok = 0;
  for (let s = 0; s < 4; s++) {
    playGame({ mode: 'tournament', seed: 4242 + s, bot: decentBot, goal: 'survive', maxShots: 50, invariants: false });
    const a = game.debugState().spawnLog.map((x) => x.split('|')[0]);
    playGame({ mode: 'tournament', seed: 4242 + s, bot: (st) => Math.PI / 2 + (Math.random() - 0.5), maxShots: 50, invariants: false });
    const b = game.debugState().spawnLog.map((x) => x.split('|')[0]);
    const n = Math.min(a.length, b.length);
    if (JSON.stringify(a.slice(0, n)) === JSON.stringify(b.slice(0, n))) ok += 1;
  }
  check('déterminisme tournoi', ok === 4, ok + '/4 graines');
}

for (const [ok, name, detail] of results) console.log(ok ? 'OK  ' : 'FAIL', name, '—', detail);
process.exit(results.every((r) => r[0]) ? 0 : 1);
