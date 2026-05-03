/**
 * generate-pdf.mjs
 * ────────────────
 * Rend le template Handlebars + génère le PDF via Puppeteer (Chrome headless).
 *
 * Usage :
 *   node generate-pdf.mjs --data '{"pacte_firstname":"Mathieu","pacte_score":18,"pacte_tier":"Rouge","pacte_weakest_pillar":"Le Pacte"}'
 *   node generate-pdf.mjs --data-file ./user-data.json
 *   node generate-pdf.mjs --data-file ./user-data.json --out ./output/mathieu.pdf
 *
 * Pré-requis :
 *   npm install handlebars puppeteer
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";

// ── CLI args ──────────────────────────────────────────────
const { values } = parseArgs({
  options: {
    template: { type: "string", default: "./pacte-famille-sport.html" },
    data: { type: "string" },          // JSON inline
    "data-file": { type: "string" },   // ou chemin vers un .json
    out: { type: "string" },           // chemin du PDF en sortie
  },
});

// ── Charger les données utilisateur ───────────────────────
let userData;
if (values["data-file"]) {
  const raw = await readFile(resolve(values["data-file"]), "utf-8");
  userData = JSON.parse(raw);
} else if (values.data) {
  userData = JSON.parse(values.data);
} else {
  // Données de démo pour tester
  userData = {
    pacte_firstname: "Mathieu",
    pacte_score: 18,
    pacte_tier: "Rouge",
    pacte_weakest_pillar: "Le Pacte",
  };
  console.log("⚠️  Pas de --data ni --data-file → données de démo utilisées.");
}

// ── Charger et compiler le template ───────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = resolve(__dirname, values.template);
const templateHtml = await readFile(templatePath, "utf-8");

const template = Handlebars.compile(templateHtml);
const renderedHtml = template(userData);

// ── Nom du fichier de sortie ──────────────────────────────
const outPath = values.out
  ? resolve(values.out)
  : resolve(
      __dirname,
      `pacte-${(userData.pacte_firstname || "output").toLowerCase()}.pdf`
    );

// ── Générer le PDF avec Puppeteer ─────────────────────────
console.log(`🖨️  Génération du PDF pour ${userData.pacte_firstname}…`);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();

// setContent avec waitUntil: networkidle0 → attend que les fonts Google soient chargées
await page.setContent(renderedHtml, { waitUntil: "networkidle0" });

await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,           // indispensable pour les fonds colorés
  preferCSSPageSize: true,         // respecte ton @page { size: A4 }
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();

console.log(`✅ PDF généré → ${outPath}`);
console.log(`   Prénom : ${userData.pacte_firstname}`);
console.log(`   Score  : ${userData.pacte_score}/40`);
console.log(`   Tier   : ${userData.pacte_tier}`);
console.log(`   Pilier : ${userData.pacte_weakest_pillar}`);
