#!/usr/bin/env node
/* Assemble la démo mono-fichier (jouable telle quelle, sans service worker).

   Usage : node tools/build-demo.mjs [sortie.html]

   Les modules sont concaténés en un seul script classique : les lignes
   `import` sont retirées et les préfixes `export` supprimés — les modules
   n'ont volontairement aucun nom de premier niveau en double. La fin de
   main.js (service worker + astuce d'installation) est coupée : la démo
   n'est pas installable. */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = ['storage', 'theme', 'audio', 'game', 'main'];
const CUT_MARKER = '// service worker : hors ligne';

let js = '';
for (const name of ORDER) {
  let src = readFileSync(join(root, 'js', name + '.js'), 'utf8');
  if (name === 'main') {
    const cut = src.indexOf(CUT_MARKER);
    if (cut === -1) throw new Error('marqueur de coupe introuvable dans main.js');
    src = src.slice(0, cut);
  }
  src = src
    .replace(/^import .*$/gm, '')
    .replace(/^export /gm, '');
  js += '\n// ---- js/' + name + '.js ----\n' + src;
  if (name === 'game') {
    // main.js importe le moteur en espace de noms (`import * as game`) :
    // on recrée l'objet équivalent une fois les fonctions à plat
    js += '\nconst game = { initGame, newGame, resumeGame, hasSave, getBest, toMenu, isPlaying };\n';
  }
}

const css = readFileSync(join(root, 'style.css'), 'utf8');
const head = readFileSync(join(root, 'tools', 'demo-head.html'), 'utf8')
  .replace('<!--STYLE-->', '<style>\n' + css + '</style>');

const out = head + '\n<script>\n' + js + '\n</script>\n';
const dest = process.argv[2] || join(root, 'demo.html');
writeFileSync(dest, out);
console.log('écrit', dest, '(' + out.length + ' octets)');
