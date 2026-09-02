/* Dernier réglage : étoiles des étapes survivre depuis la simulation de
   contrôle (rafale par île), et léger assouplissement de 4 étapes de
   l'île 6 sous la cible. */
import fs from 'fs';
const prop = JSON.parse(fs.readFileSync('ody-proposal.json', 'utf8'));
const res = JSON.parse(fs.readFileSync('ody-results2.json', 'utf8'));
const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
for (const p of prop) {
  if (p.t !== 'survive') continue;
  const st = res.find((r) => r.idx === p.idx);
  const balls = st.runs.filter((r) => r.bot === 'decent' && r.won).map((r) => r.balls).sort((a, b) => a - b);
  let s3 = q(balls, 0.75), s2 = q(balls, 0.4);
  if (s2 >= s3) s2 = Math.max(2, s3 - 1);
  p.stars = [s3, s2];
  console.log('survive', p.idx + 1, p.n, '★', JSON.stringify(p.stars), '(noix min/med/max', balls[0] + '/' + q(balls, 0.5) + '/' + balls[balls.length - 1] + ')');
}
const NUDGE = { 26: { g: 1900 }, 30: { g: 26 }, 41: { g: 28 }, 42: { g: 3600 } };
for (const [i, o] of Object.entries(NUDGE)) { Object.assign(prop[+i], o); console.log('assoupli', +i + 1, prop[+i].n, '→ g =', o.g); }
fs.writeFileSync('ody-proposal.json', JSON.stringify(prop, null, 1));
