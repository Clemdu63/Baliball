/* Régénère le tableau ODY_STAGES de js/odyssey.js à partir de
   ody-proposal.json (politique) — noms, types, îles inchangés.
   Rafale de départ : 1 + île pour briser/marquer/survivre ; celle de la
   calibration pour les boss. */
import fs from 'fs';
const proposal = JSON.parse(fs.readFileSync(process.argv[2] || 'ody-proposal.json', 'utf8'));
const ISLANDS = ['Île 1 : Plage de Sanur (douce)', 'Île 2 : Rizières d\'Ubud', 'Île 3 : Lagon de Nusa',
  'Île 4 : Falaises d\'Uluwatu', 'Île 5 : Volcan Batur', 'Île 6 : Île des Esprits'];
const esc = (s) => s.replace(/'/g, "\\'");
let body = '';
for (const p of proposal) {
  if (p.idx % 8 === 0) body += `  // ---- ${ISLANDS[p.idx / 8]} ----\n`;
  const balls = p.t === 'boss' ? p.balls : 1 + Math.floor(p.idx / 8);
  const ballsTxt = balls > 1 ? `, balls: ${balls}` : '';
  if (p.t === 'boss') {
    body += `  { n: '${esc(p.n)}', t: 'boss', b: '${p.b}', hp: ${p.hp}${ballsTxt}, stars: [${p.stars[0]}, ${p.stars[1]}] },\n`;
  } else if (p.t === 'survive') {
    body += `  { n: '${esc(p.n)}', t: 'survive', g: ${p.g}${ballsTxt}, stars: [${p.stars[0]}, ${p.stars[1]}] },\n`;
  } else {
    body += `  { n: '${esc(p.n)}', t: '${p.t}', g: ${p.g}, s: ${p.s}${ballsTxt}, stars: [${p.stars[0]}, ${p.stars[1]}] },\n`;
  }
}
const path = new URL('../../js/odyssey.js', import.meta.url);
const src = fs.readFileSync(path, 'utf8');
const start = src.indexOf('export const ODY_STAGES = [');
const end = src.indexOf('];', start) + 2;
const header = `export const ODY_STAGES = [\n`;
const out = src.slice(0, start) + header + body + '];' + src.slice(end);
fs.writeFileSync(path, out);
console.log('odyssey.js régénéré :', proposal.length, 'étapes');
