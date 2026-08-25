#!/usr/bin/env node
/* Vérification de syntaxe fiable pour les modules ES.
   (`node --check` ne détecte pas certaines erreurs dans les fichiers module.)
   Une erreur d'exécution (window absent, etc.) est normale : seule une
   SyntaxError fait échouer. Usage : node tools/check-syntax.mjs */
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
for (const f of readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js'))) {
  try {
    await import(pathToFileURL(join(root, 'js', f)).href);
    console.log('OK      ', f);
  } catch (e) {
    if (e instanceof SyntaxError) {
      failed = true;
      console.log('SYNTAXE ', f, '—', e.message.split('\n')[0]);
    } else {
      console.log('OK*     ', f, '(erreur d\'exécution attendue hors navigateur)');
    }
  }
}
process.exit(failed ? 1 : 0);
