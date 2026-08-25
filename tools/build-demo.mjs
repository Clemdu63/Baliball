#!/usr/bin/env node
/* Assemble la démo mono-fichier (jouable telle quelle, sans service worker).

   Usage : node tools/build-demo.mjs [sortie.html]

   Tout est dérivé des sources réelles :
   - le corps de la page vient d'index.html (script module retiré) ;
   - style.css est inliné ;
   - les modules js/ sont concaténés en un script classique (lignes `import`
     retirées, préfixes `export` supprimés — aucun nom de premier niveau en
     double entre modules) ;
   - l'objet `game` (import d'espace de noms de main.js) est reconstruit à
     partir des fonctions exportées de game.js ;
   - la fin de main.js (service worker + astuce d'installation) est coupée :
     la démo n'est pas installable. */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = ['storage', 'theme', 'audio', 'net', 'levels', 'game', 'main'];
const CUT_MARKER = '// service worker : hors ligne';

const read = (p) => readFileSync(join(root, p), 'utf8');

// ---- scripts ----
let js = '';
const topLevelNames = new Map(); // nom → module
for (const name of ORDER) {
  let src = read(join('js', name + '.js'));
  for (const m of src.matchAll(/^(?:export )?(?:const|let|var|function|class)\s+(\w+)/gm)) {
    const id = m[1];
    if (topLevelNames.has(id)) {
      throw new Error('collision de nom de premier niveau « ' + id + ' » entre js/'
        + topLevelNames.get(id) + '.js et js/' + name + '.js — renommer l\'un des deux');
    }
    topLevelNames.set(id, name);
  }
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
    const names = [...read(join('js', 'game.js')).matchAll(/^export function (\w+)/gm)]
      .map((m) => m[1]);
    js += '\nconst game = { ' + names.join(', ') + ' };\n';
  }
}
js += '\ndocument.getElementById(\'install-hint\').textContent = '
  + '\'Version démo en ligne — la version installable et jouable hors ligne est sur GitHub Pages.\';\n'
  + '// le bac à sable de la démo ne permet ni partage, ni téléchargement, ni réseau\n'
  + 'document.getElementById(\'btn-share\').style.display = \'none\';\n'
  + 'document.getElementById(\'btn-tournoi-online\').style.display = \'none\';\n';

// ---- page ----
const index = read('index.html');
const bodyMatch = index.match(/<body>([\s\S]*)<\/body>/);
const themeMatch = index.match(/<script>[\s\S]*?<\/script>/);
if (!bodyMatch || !themeMatch) throw new Error('structure index.html inattendue');
const body = bodyMatch[1].replace(/\s*<script type="module"[^>]*><\/script>/, '');

// la police est inlinée : la démo mono-fichier n'a pas accès à fonts/
const fontB64 = readFileSync(join(root, 'fonts', 'baloo2-latin.woff2')).toString('base64');
const css = read('style.css').replace(
  "url('fonts/baloo2-latin.woff2')",
  "url(data:font/woff2;base64," + fontB64 + ')'
);

const out = '<title>Baliball</title>\n'
  + themeMatch[0] + '\n'
  + '<style>\n' + css + '</style>\n'
  + body.replace(/\s*<link rel="preload"[^>]*>/, '')
  + '\n<script>\n' + js + '\n</script>\n';

const dest = process.argv[2] || join(root, 'demo.html');
writeFileSync(dest, out);
console.log('écrit', dest, '(' + out.length + ' octets)');
