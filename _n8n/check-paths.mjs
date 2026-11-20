// Contrôle des chemins d'assets : relatif (../assets/x.png) ou URL complète (https://florianmarin.me/assets/x.png),
// jamais « /assets/... » (cassé dès qu'on ouvre la page en fichier local ou hors racine).
// Lancé par build.mjs (le build échoue), ou seul : node _n8n/check-paths.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', '_versions', '.claude']);
// attribut="/assets/…" (src, href, poster, data-*, content…) ou url(/assets/…) en CSS
const BAD = /=\s*["']\/assets\/|url\(\s*["']?\/assets\//g;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return /\.html$/.test(name) && !/^preview-/.test(name) ? [p] : [];
  });
}

export function checkPaths() {
  const errors = [];
  for (const file of htmlFiles(root)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (line.match(BAD)) errors.push(`${relative(root, file)}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkPaths();
  if (errors.length) {
    console.error('Chemins /assets/ interdits (utiliser ../assets/ ou https://florianmarin.me/assets/) :\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('chemins d\'assets : OK');
}
