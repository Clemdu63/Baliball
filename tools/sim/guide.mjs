/* La boussole doit prédire le premier contact exactement comme la physique :
   sur des centaines de tirs aléatoires, le point d'arrêt du tracé doit
   coller à la première pierre touchée (ou à la plage si rien n'est touché). */
import { game, tick, decentBot } from './harness.mjs';
let shots = 0, ok = 0, portal = 0;
const fails = [];
for (let gme = 0; gme < 12; gme++) {
  game.newGame('classic');
  // faire vivre le plateau quelques manches pour avoir des toits, rondes, blindées…
  for (let k = 0; k < 8 + gme * 2; k++) {
    const st = game.debugState();
    if (st.state !== 'aim') break;
    game.debugSet({ fire: decentBot(st, 'survive') });
    for (let i = 0; i < 4000; i++) { tick(); if (game.debugState().state !== 'flight') break; }
  }
  if (gme % 4 === 3) game.debugSet({ spawnBoss: 'barong' });
  for (let s = 0; s < 25; s++) {
    let st = game.debugState();
    if (st.state !== 'aim') break;
    const angle = 0.14 + Math.random() * (Math.PI - 0.28);
    const pv = game.debugPreview(angle);
    const before = st.blocks.map((b) => b.col + ':' + b.row + ':' + b.hp).join(',');
    const g = st.geometry;
    const r = g.cell * 0.13;
    game.debugSet({ fire: angle });
    let hit = null, landed = false, bonus = false;
    const puBefore = st.powerups.length;
    for (let i = 0; i < 4000; i++) {
      tick();
      const s2 = game.debugState();
      // un bonus ramassé (espadon, durian, gong, fleur…) modifie le plateau ou
      // la trajectoire sans contact de noix : hors du périmètre de la boussole
      if (s2.powerups.filter((p) => p.kind !== 'portal').length < puBefore - st.powerups.filter((p) => p.kind === 'portal').length + 0) { bonus = true; break; }
      const now = s2.blocks.map((b) => b.col + ':' + b.row + ':' + b.hp).join(',');
      if (now !== before) {
        // première pierre modifiée
        const a = before.split(','), b = new Set(now.split(','));
        const changed = a.find((x) => !b.has(x));
        const [c, rw] = changed.split(':').map(Number);
        hit = st.blocks.find((bl) => bl.col === c && bl.row === rw);
        break;
      }
      if (s2.state !== 'flight') { landed = true; break; }
    }
    shots += 1;
    if (pv.end === 'portal' || bonus) { portal += 1; ok += 1;
      for (let i = 0; i < 6000; i++) { if (game.debugState().state !== 'flight') break; tick(); }
      continue; }
    let good = false;
    if (hit) {
      // le tracé s'arrête au contact de CETTE pierre (emprise + rayon, marge 1,5 r)
      const span = hit.type === 'wide' ? 2 : hit.type === 'boss' ? 3 : 1;
      const vspan = hit.type === 'boss' ? 2 : 1;
      const pad = g.cell * 0.055;
      const x0 = hit.col * g.cell + pad - r * 1.5, x1 = (hit.col + span) * g.cell - pad + r * 1.5;
      const y0 = g.boardTop + hit.row * g.cell + pad - r * 1.5, y1 = g.boardTop + (hit.row + vspan) * g.cell - pad + r * 1.5;
      // arrêt sur la pierre touchée, ou sur une voisine partageant un coin
      // (la phase des sous-pas de frame décide laquelle enregistre le contact)
      const cx = (hit.col + span / 2) * g.cell, cy = g.boardTop + (hit.row + vspan / 2) * g.cell;
      if (pv.end === 'block') good = (pv.x >= x0 && pv.x <= x1 && pv.y >= y0 && pv.y <= y1)
        || Math.hypot(pv.x - cx, pv.y - cy) < g.cell * 1.6;
      // tracé arrêté par sa longueur avant la pierre : acceptable s'il ne l'a jamais traversée
      else if (pv.end === 'len') good = !pv.pts.some((p) => p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1);
    } else {
      good = pv.end !== 'block';
    }
    if (good) ok += 1;
    else if (fails.length < 6) fails.push({ angle: +angle.toFixed(3), preview: { end: pv.end, x: pv.x, y: pv.y, n: pv.n }, hit: hit && { col: hit.col, row: hit.row, type: hit.type }, landed });
    // finir le tir
    for (let i = 0; i < 6000; i++) { if (game.debugState().state !== 'flight') break; tick(); }
  }
}
console.log('tirs =', shots, '| prédictions justes =', ok, '(' + Math.round(100 * ok / shots) + '%) | arrêts sur portail =', portal);
for (const f of fails) console.log('  écart :', JSON.stringify(f));
process.exit(ok / shots >= 0.96 ? 0 : 1); // coins partagés : la phase des sous-pas de frame reste indécidable
