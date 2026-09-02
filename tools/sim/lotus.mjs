/* Grande marée (deux crans) avec deux rangées qui atteignent la plage
   le même tour : un seul lotus doit s'ouvrir. */
import { game, tick } from './harness.mjs';
game.newGame('classic');
// palier « Grande marée » : score ≥ 50 000, et (manche + 1) % 5 === 0 → manche 4
game.debugSet({ addScore: 60000 });
for (let k = 0; k < 3; k++) {
  game.debugSet({ clearBlocks: true });
  game.debugSet({ fire: Math.PI / 2 });
  for (let i = 0; i < 3000; i++) { tick(); if (game.debugState().state !== 'flight') break; }
}
let st = game.debugState();
const d = st.geometry.deathRow;
game.debugSet({ clearBlocks: true, shield: 2 });
game.debugSet({ addBlocks: [
  { col: 0, row: d - 1, hp: 9 },   // atteint la plage au 1er cran
  { col: 8, row: d - 2, hp: 9 },   // … et celle-ci au 2e cran
] });
console.log('avant : manche', st.round, '| bouclier =', game.debugState().shield, '| pierres', JSON.stringify(game.debugState().blocks.map((b) => b.row)));
game.debugSet({ fire: Math.PI / 2 });
for (let i = 0; i < 3000; i++) { tick(); if (game.debugState().state !== 'flight') break; }
st = game.debugState();
console.log('après : manche', st.round, '| état', st.state, '| bouclier =', st.shield, '(1 attendu : un seul lotus pour la Grande marée)');
process.exit(st.shield === 1 && st.state === 'aim' ? 0 : 1);
