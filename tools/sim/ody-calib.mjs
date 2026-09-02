/* Calibration : courbes de cumul (pierres, score) par tir avec budget
   large, et victoire des étapes boss selon la rafale de départ. */
import fs from 'fs';
import { playGame, decentBot, naiveBot } from './harness.mjs';
import { ODY_STAGES } from '../../js/odyssey.js';

const S_MAX = 16;
const out = { curves: {}, boss: {} };
const t0 = Date.now();
for (let idx = 0; idx < ODY_STAGES.length; idx++) {
  const def = ODY_STAGES[idx];
  if (def.t === 'break' || def.t === 'score') {
    const save = { g: def.g, s: def.s, balls: def.balls };
    def.g = 1e9; def.s = S_MAX + 1;
    def.balls = 1 + Math.floor(idx / 8);   // rafale de départ : 1 + île
    const runs = [];
    for (let k = 0; k < 42; k++) {
      const bot = k < 30 ? decentBot : naiveBot;
      const cumB = [], cumS = [];
      const r = playGame({ mode: 'odyssey', idx, bot, goal: def.t, maxShots: S_MAX, invariants: false,
        onShot: (st) => { cumB.push(st.broken); cumS.push(st.score); } });
      // onShot relève l'état AVANT chaque tir ; on ajoute l'état final
      cumB.push(r.broken); cumS.push(r.score);
      // cumB[i] = cumul après i+1 tirs (i = 0..shots-1)
      runs.push({ bot: k < 30 ? 'decent' : 'naive', cumB: cumB.slice(1), cumS: cumS.slice(1),
        shots: r.shots, died: r.result && r.result.kind === 'over' ? r.result.payload.reason : null });
    }
    def.g = save.g; def.s = save.s; def.balls = save.balls;
    out.curves[idx] = runs;
    console.log('étape', idx + 1, def.t, 'courbes ok');
  } else if (def.t === 'boss' && !process.env.SKIP_BOSS) {
    out.boss[idx] = {};
    for (const B of [4, 6, 8, 10, 12]) {
      const save = def.balls;
      def.balls = B;
      const runs = [];
      for (let k = 0; k < 24; k++) {
        const r = playGame({ mode: 'odyssey', idx, bot: decentBot, goal: 'boss', maxShots: 40, invariants: false });
        runs.push({ won: !!(r.result && r.result.kind === 'win'), round: r.round, reason: r.result && r.result.kind === 'over' ? r.result.payload.reason : null });
      }
      def.balls = save;
      const wr = runs.filter((x) => x.won).length / runs.length;
      const rounds = runs.filter((x) => x.won).map((x) => x.round).sort((a, b) => a - b);
      out.boss[idx][B] = runs;
      console.log('étape', idx + 1, 'boss', def.b, 'hp×' + def.hp, 'rafale', B, '→ victoire', Math.round(wr * 100) + '%',
        'manche du coup fatal (q1/med/q3) =', rounds.length ? [rounds[Math.floor(rounds.length * 0.25)], rounds[Math.floor(rounds.length / 2)], rounds[Math.floor(rounds.length * 0.75)]].join('/') : '-');
    }
  }
}
fs.writeFileSync(process.env.OUT || 'ody-calib.json', JSON.stringify(out));
console.log('durée', ((Date.now() - t0) / 1000).toFixed(0), 's');
process.exit(0);
