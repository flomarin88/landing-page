// Contrôle des chemins d'assets : relatif (../assets/x.png) ou URL complète (https://florianmarin.me/assets/x.png),
// jamais « /assets/... » (cassé dès qu'on ouvre la page en fichier local ou hors racine).
// Vérifie aussi que le script Umami ne compte que la production (data-domains="florianmarin.me") : sans lui,
// les pages ouvertes en local (file:///Users/…) ou en preview remontent dans les stats.
// Lancé par build.mjs (le build échoue), ou seul : node _n8n/check-paths.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', 'node_modules', '_versions', '.claude']);
// attribut="/assets/…" (src, href, poster, data-*, content…) ou url(/assets/…) en CSS
const BAD = /=\s*["']\/assets\/|url\(\s*["']?\/assets\//g;
const UMAMI = /<script[^>]*cloud\.umami\.is\/script\.js[^>]*>/g;
const PROD_ONLY = 'data-domains="florianmarin.me"';

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
      const where = `${relative(root, file)}:${i + 1}`;
      if (line.match(BAD)) errors.push(`${where}  chemin /assets/ interdit (utiliser ../assets/ ou https://florianmarin.me/assets/) : ${line.trim().slice(0, 100)}`);
      for (const tag of line.match(UMAMI) || []) {
        if (!tag.includes(PROD_ONLY)) errors.push(`${where}  script Umami sans ${PROD_ONLY} (compterait le local)`);
      }
    });
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkPaths();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('chemins d\'assets et Umami prod seulement : OK');
}
