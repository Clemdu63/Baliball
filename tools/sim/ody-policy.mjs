/* Transforme les courbes de calibration en nouveaux paramètres d'étape.
   Usage : node ody-policy.mjs ody-calib.json [ody-results.json]
   - break/score : budget s conservé, objectif g = quantile tel que le bot
     correct gagne au taux cible de l'île ; étoiles = q25 / q60 des tirs
     utilisés par les gagnants.
   - boss : plus petite rafale B atteignant le taux cible ; étoiles = q25 /
     q60 de la manche du coup fatal.
   - survive : g conservé ; étoiles = q75 / q40 des noix à l'arrivée. */
import fs from 'fs';
import { ODY_STAGES } from '../../js/odyssey.js';
const calib = JSON.parse(fs.readFileSync(process.argv[2] || 'ody-calib.json', 'utf8'));
const results = fs.existsSync(process.argv[3] || 'ody-results.json') ? JSON.parse(fs.readFileSync(process.argv[3] || 'ody-results.json', 'utf8')) : null;
const TARGET = [0.9, 0.85, 0.8, 0.72, 0.65, 0.6];          // taux de victoire visé (bot correct) par île
const TARGET_BOSS = [0.8, 0.75, 0.7, 0.65, 0.6, 0.55];
const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
const nice = (v, t) => {
  if (t === 'break') return Math.max(3, Math.round(v));
  const step = v >= 3000 ? 100 : v >= 800 ? 50 : 25;
  return Math.max(50, Math.round(v / step) * step);
};
const proposal = [];
for (let idx = 0; idx < ODY_STAGES.length; idx++) {
  const def = ODY_STAGES[idx];
  const island = Math.floor(idx / 8);
  const p = { idx, n: def.n, t: def.t };
  if (def.t === 'break' || def.t === 'score') {
    const runs = calib.curves[idx];
    const s = def.s;
    const key = def.t === 'break' ? 'cumB' : 'cumS';
    const val = (r) => (r[key].length >= s ? r[key][s - 1] : -1);
    const dec = runs.filter((r) => r.bot === 'decent').map(val).sort((a, b) => a - b);
    const nai = runs.filter((r) => r.bot === 'naive').map(val).sort((a, b) => a - b);
    const gRaw = q(dec, 1 - TARGET[island]);
    const g = nice(gRaw, def.t);
    const winD = dec.filter((v) => v >= g).length / dec.length;
    const winN = nai.filter((v) => v >= g).length / nai.length;
    const used = runs.filter((r) => r.bot === 'decent').map((r) => r[key].findIndex((v) => v >= g)).filter((i) => i >= 0).map((i) => i + 1).sort((a, b) => a - b);
    let s3 = used.length ? q(used, 0.25) : Math.max(1, s - 2);
    let s2 = used.length ? q(used, 0.6) : Math.max(s3 + 1, s - 1);
    if (s2 <= s3) s2 = s3 + 1;
    if (s2 > s) s2 = s;
    if (s3 >= s2) s3 = s2 - 1;
    Object.assign(p, { g, s, stars: [s3, s2], winD: Math.round(winD * 100), winN: Math.round(winN * 100), oldG: def.g, usedMed: used.length ? q(used, 0.5) : null });
  } else if (def.t === 'boss') {
    const byB = calib.boss[idx];
    let chosen = null;
    for (const B of Object.keys(byB).map(Number).sort((a, b) => a - b)) {
      const runs = byB[B];
      const wr = runs.filter((r) => r.won).length / runs.length;
      if (wr >= TARGET_BOSS[island]) { chosen = { B, wr, runs }; break; }
    }
    if (!chosen) {
      const B = Math.max(...Object.keys(byB).map(Number));
      const runs = byB[B];
      chosen = { B, wr: runs.filter((r) => r.won).length / runs.length, runs, tooHard: true };
    }
    const rounds = chosen.runs.filter((r) => r.won).map((r) => r.round).sort((a, b) => a - b);
    let s3 = rounds.length ? q(rounds, 0.25) : 5;
    let s2 = rounds.length ? q(rounds, 0.6) : s3 + 2;
    if (s2 <= s3) s2 = s3 + 1;
    Object.assign(p, { b: def.b, hp: def.hp, balls: chosen.B, stars: [s3, s2], winD: Math.round(chosen.wr * 100), tooHard: !!chosen.tooHard });
  } else {
    const st = results && results.find((r) => r.idx === idx);
    const balls = st ? st.runs.filter((r) => r.bot === 'decent' && r.won).map((r) => r.balls).sort((a, b) => a - b) : [];
    let s3 = balls.length ? q(balls, 0.75) : def.stars[0];
    let s2 = balls.length ? q(balls, 0.4) : def.stars[1];
    if (s2 >= s3) s2 = Math.max(2, s3 - 1);
    Object.assign(p, { g: def.g, stars: [s3, s2], ballsMed: balls.length ? q(balls, 0.5) : null });
  }
  proposal.push(p);
}
fs.writeFileSync('ody-proposal.json', JSON.stringify(proposal, null, 1));
for (const p of proposal) {
  console.log(String(p.idx + 1).padStart(2), p.t.padEnd(7), p.n.padEnd(22),
    p.t === 'boss' ? `${p.b} hp×${p.hp} rafale=${p.balls} ★${JSON.stringify(p.stars)} win=${p.winD}%${p.tooHard ? ' TROP DUR' : ''}`
      : p.t === 'survive' ? `g=${p.g} ★${JSON.stringify(p.stars)} (noix méd ${p.ballsMed})`
        : `g=${p.g} (avant ${p.oldG}) s=${p.s} ★${JSON.stringify(p.stars)} win cor=${p.winD}% naïf=${p.winN}% tirs méd=${p.usedMed}`);
}
