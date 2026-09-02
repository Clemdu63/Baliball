/* Arbitrages de design par-dessus la politique automatique. */
import fs from 'fs';
const prop = JSON.parse(fs.readFileSync('ody-proposal.json', 'utf8'));
const calib = JSON.parse(fs.readFileSync('ody-calib-merged.json', 'utf8'));
const BOSS = { 7: { balls: 4, stars: [7, 9] }, 15: { balls: 6, stars: [8, 10] }, 23: { balls: 8, stars: [6, 8] },
  31: { balls: 8, stars: [7, 9] }, 39: { balls: 8, stars: [8, 10] }, 47: { balls: 8, stars: [10, 12] } };
for (const [idx, o] of Object.entries(BOSS)) Object.assign(prop[+idx], o);
// étape 6 (score, île 1) : 150 pts paraît maigre après 300 à l'étape 3 —
// on monte à 250 si le bot correct garde ≥ 85 %
{
  const p = prop[5];
  const runs = calib.curves[5];
  const dec = runs.filter((r) => r.bot === 'decent').map((r) => (r.cumS.length >= p.s ? r.cumS[p.s - 1] : -1));
  const win = (g) => dec.filter((v) => v >= g).length / dec.length;
  console.log('étape 6 : win(150) =', Math.round(win(150) * 100) + '%', '| win(250) =', Math.round(win(250) * 100) + '%', '| win(300) =', Math.round(win(300) * 100) + '%');
  if (win(250) >= 0.85) {
    p.g = 250;
    const used = runs.filter((r) => r.bot === 'decent').map((r) => r.cumS.findIndex((v) => v >= 250)).filter((i) => i >= 0).map((i) => i + 1).sort((a, b) => a - b);
    const q = (arr, pp) => arr[Math.min(arr.length - 1, Math.floor(arr.length * pp))];
    p.stars = [q(used, 0.25), Math.max(q(used, 0.25) + 1, q(used, 0.6))];
    console.log('  → g = 250, ★', JSON.stringify(p.stars));
  }
}
fs.writeFileSync('ody-proposal.json', JSON.stringify(prop, null, 1));
console.log('arbitrages appliqués');
