/* Simulation des 48 étapes de l'Odyssée : bot correct ×30, bot naïf ×12.
   Sortie : ody-results.json (par étape : victoires, métrique d'étoiles). */
import fs from 'fs';
import { playGame, decentBot, naiveBot } from './harness.mjs';
import { ODY_STAGES } from '../../js/odyssey.js';

const N_DECENT = 30, N_NAIVE = 12;
const out = [];
const t0 = Date.now();
for (let idx = 0; idx < ODY_STAGES.length; idx++) {
  const def = ODY_STAGES[idx];
  const runs = [];
  for (let k = 0; k < N_DECENT + N_NAIVE; k++) {
    const bot = k < N_DECENT ? decentBot : naiveBot;
    const r = playGame({ mode: 'odyssey', idx, bot, goal: def.t, maxShots: 80, invariants: false });
    const won = !!(r.result && r.result.kind === 'win');
    // métrique d'étoiles : tirs utilisés (break/score), noix à l'arrivée (survive), manche (boss)
    let metric = null;
    if (won) {
      if (def.t === 'break' || def.t === 'score') metric = r.shots;
      else if (def.t === 'survive') metric = r.ballCount;
      else metric = r.round;
    }
    runs.push({ bot: k < N_DECENT ? 'decent' : 'naive', won, metric, shots: r.shots, round: r.round,
      score: r.score, balls: r.ballCount, reason: r.result && r.result.kind === 'over' ? r.result.payload.reason : null,
      stars: won && r.result.payload.stars });
  }
  out.push({ idx, def, runs });
  const dec = runs.filter((x) => x.bot === 'decent');
  const nai = runs.filter((x) => x.bot === 'naive');
  const wr = (a) => Math.round(100 * a.filter((x) => x.won).length / a.length);
  const met = dec.filter((x) => x.won).map((x) => x.metric).sort((a, b) => a - b);
  console.log(String(idx + 1).padStart(2), def.t.padEnd(7), def.n.padEnd(22), 'g=' + String(def.g || def.b).padEnd(8),
    'correct', String(wr(dec)).padStart(3) + '%', 'naïf', String(wr(nai)).padStart(3) + '%',
    '| métrique gagnants (min/q1/med/q3/max) =', met.length ? [met[0], met[Math.floor(met.length * 0.25)], met[Math.floor(met.length / 2)], met[Math.floor(met.length * 0.75)], met[met.length - 1]].join('/') : '-',
    '| ★ actuelles', JSON.stringify(def.stars),
    '| ★ obtenues', JSON.stringify(dec.filter((x) => x.won).map((x) => x.stars).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {})));
}
fs.writeFileSync(process.env.OUT || 'ody-results.json', JSON.stringify(out));
console.log('durée', ((Date.now() - t0) / 1000).toFixed(0), 's');
process.exit(0);
