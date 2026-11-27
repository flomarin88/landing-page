// Contrôle des chemins d'assets : relatif (../assets/x.png) ou URL complète (https://florianmarin.me/assets/x.png),
// jamais « /assets/... » (cassé dès qu'on ouvre la page en fichier local ou hors racine).
// Vérifie aussi que le script Umami ne compte que la production (data-domains="florianmarin.me") : sans lui,
// les pages ouvertes en local (file:///Users/…) ou en preview remontent dans les stats.
// Et le SEO : canonical ou noindex sur chaque page servie, cohérence avec sitemap.xml, JSON-LD valide.
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
// Aucun prix sur le site ni dans les emails (décision du 2026-11-27) : « 2 000 € HT », prix du JSON-LD.
// Les euros des outils (coût de la ressaisie, €/h) restent permis : ils n'ont pas « HT ».
const PRICE = /(€|&euro;)(\s|&nbsp;|\u00a0|\u202f)*HT\b|"price"\s*:|priceCurrency/;
const PRICE_EXTRA = ['llms.txt', '_n8n/prepare-lead.js', '_n8n/prepare-booking.js'];

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return htmlFiles(p);
    return /\.html$/.test(name) && !/^preview-/.test(name) ? [p] : [];
  });
}

// SEO : chaque page servie (hors dossiers « _ », non publiés) est soit indexable (canonical + présente dans
// sitemap.xml), soit en noindex. Le JSON-LD doit parser.
function checkSeo(files) {
  const errors = [];
  const sitemap = new Set([...readFileSync(join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const canonicals = new Set();
  for (const file of files) {
    const rel = relative(root, file);
    if (rel.split('/').some((part) => part.startsWith('_'))) continue;
    const html = readFileSync(file, 'utf8');
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
    if (!canonical === !noindex) errors.push(`${rel}  il faut soit <link rel="canonical">, soit <meta name="robots" content="noindex"> (un seul des deux)`);
    if (canonical) {
      canonicals.add(canonical);
      if (!sitemap.has(canonical)) errors.push(`${rel}  canonical ${canonical} absente de sitemap.xml`);
    }
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch (e) { errors.push(`${rel}  JSON-LD invalide : ${e.message}`); }
    }
  }
  for (const url of sitemap) if (!canonicals.has(url)) errors.push(`sitemap.xml  ${url} ne correspond à aucune page avec cette canonical`);
  return errors;
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
  const served = htmlFiles(root).filter((f) => !relative(root, f).split('/').some((part) => part.startsWith('_')));
  for (const file of served.concat(PRICE_EXTRA.map((p) => join(root, p)))) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (PRICE.test(line)) errors.push(`${relative(root, file)}:${i + 1}  prix interdit sur le site (donné en appel) : ${line.trim().slice(0, 100)}`);
    });
  }
  return errors.concat(checkSeo(htmlFiles(root)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkPaths();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('chemins d\'assets, Umami prod seulement, canonical/noindex/sitemap, aucun prix : OK');
}
