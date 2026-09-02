import { playGame, decentBot, naiveBot, game, settings } from './harness.mjs';

const agg = {};
const samples = {};
let exceptions = [];
let games = 0, shots = 0, longest = 0;
function absorb(label, r) {
  games += 1; shots += r.shots; longest = Math.max(longest, r.longestShotSec);
  for (const a of r.anomalies) {
    const k = a.t + (a.block ? ' [' + a.block.type + ']' : '') + (a.powerup ? ' [' + a.powerup.kind + ']' : '');
    agg[k] = (agg[k] || 0) + 1;
    if (!samples[k]) samples[k] = { label, ...a };
  }
  if (r.exception) exceptions.push({ label, e: r.exception.split('\n').slice(0, 4).join(' | ') });
}

const t0 = Date.now();
// 1. classique : 40 parties, bot correct (va loin) + 20 naïves
for (let i = 0; i < 40; i++) absorb('classic decent', playGame({ mode: 'classic', bot: decentBot, goal: 'survive', maxShots: 120 }));
for (let i = 0; i < 20; i++) absorb('classic naive', playGame({ mode: 'classic', bot: naiveBot, maxShots: 120 }));
// 2. vitesse rapide (tunneling ?)
settings.fast = true;
for (let i = 0; i < 20; i++) absorb('classic fast', playGame({ mode: 'classic', bot: decentBot, goal: 'survive', maxShots: 120 }));
settings.fast = false;
// 3. Boss Rush
for (let i = 0; i < 15; i++) absorb('rush', playGame({ mode: 'rush', bot: decentBot, goal: 'boss', maxShots: 120 }));
// 4. marée montante, plage
for (let i = 0; i < 10; i++) absorb('tide', playGame({ mode: 'tide', bot: decentBot, goal: 'survive', maxShots: 200 }));
for (let i = 0; i < 5; i++) absorb('zen', playGame({ mode: 'zen', bot: decentBot, goal: 'survive', maxShots: 80 }));
// 5. temples 1-48
for (let i = 0; i < 48; i++) absorb('puzzle ' + (i + 1), playGame({ mode: 'puzzle', idx: i, bot: decentBot, goal: 'break', maxShots: 60 }));
// 6. défi du jour / semaine (graines)
for (let i = 0; i < 5; i++) absorb('daily', playGame({ mode: 'daily', bot: decentBot, goal: 'survive', maxShots: 120 }));
for (let i = 0; i < 5; i++) absorb('weekly', playGame({ mode: 'weekly', bot: decentBot, goal: 'survive', maxShots: 120 }));
// 7. tournoi (événements, chaos)
game.setTournamentOptions({ fast: true, chaos: true });
for (let i = 0; i < 10; i++) absorb('tournament chaos', playGame({ mode: 'tournament', seed: 1000 + i, bot: decentBot, goal: 'survive', maxShots: 120 }));
game.setTournamentOptions({ fast: false, chaos: false });

// 8. déterminisme tournoi : deux joueurs, même graine, bots différents →
//    les signatures de rangée 0 (spawnLog) doivent coïncider
let detOk = 0, detTotal = 0;
for (let s = 0; s < 6; s++) {
  const a = playGame({ mode: 'tournament', seed: 777 + s, bot: decentBot, goal: 'survive', maxShots: 60, invariants: false });
  const logA = game.debugState().spawnLog.slice();
  const b = playGame({ mode: 'tournament', seed: 777 + s, bot: naiveBot, maxShots: 60, invariants: false });
  const logB = game.debugState().spawnLog.slice();
  const n = Math.min(logA.length, logB.length);
  detTotal += 1;
  // on ne compare que la rangée 0 (les jumeaux de portail plongent selon le plateau)
  const row0 = (l) => l.slice(0, n).map((x) => x.split('|')[0]);
  if (JSON.stringify(row0(logA)) === JSON.stringify(row0(logB))) detOk += 1;
  else console.log('DÉSYNCHRO graine', 777 + s, row0(logA).find((x, i) => x !== row0(logB)[i]));
}
console.log('déterminisme tournoi :', detOk + '/' + detTotal, 'graines synchrones');

console.log('parties', games, '| tirs', shots, '| tir le plus long', longest, 's | durée', ((Date.now() - t0) / 1000).toFixed(1), 's');
console.log('\nANOMALIES par type :');
for (const [k, v] of Object.entries(agg).sort((a, b) => b[1] - a[1])) console.log(' ', v, k, '\n     ex:', JSON.stringify(samples[k]).slice(0, 260));
console.log('\nEXCEPTIONS :', exceptions.length);
for (const e of exceptions.slice(0, 5)) console.log(' ', e.label, '→', e.e);
process.exit(0);
