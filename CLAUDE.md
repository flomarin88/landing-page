# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Static marketing site for **florianmarin.me**: Florian Marin's CRM RevOps offer (the "Sprint RevOps 6 semaines" for B2B SaaS scaleups of 50 to 300 people). Copy is in French. Every page is a self-contained HTML file: no build step, no package manager, no tests. Deployed via GitHub Pages with the custom domain set in `CNAME`. **Everything in the repo is public**, so never commit secrets or internal files.

To preview, open the file directly in a browser (e.g. `open index.html`) or serve the folder (`python3 -m http.server 8000`). To deploy, commit and push to `main`; GitHub Pages serves the repo root.

## Files

- `index.html`: the landing page. ~1.7k lines of HTML with **all CSS and JS inlined** (no external stylesheet). This is the bulk of the work. A comment block at the top of `<head>` lists placeholders still to fill and the offer version applied.
- `reseaux/index.html`: page dédiée aux têtes de réseau (franchiseurs, groupements multi-sites), offre « livraison 4 semaines → abonnement ». Vouvoiement (dirigeants), une seule action (Calendly, `data-loc="reseaux-*"`), pas de newsletter. Son `<style>` reprend celui de `index.html` plus un bloc « PAGE RÉSEAUX » en fin : si tu modifies un style partagé, reporte-le. Le commentaire en tête de `<head>` liste ce qui reste à valider avant diffusion.
- `diagnostic/index.html`: lead magnet quiz "Ton CRM tient-il à 300 ?" (10 questions, score, tier, cost estimate, email gate before results). Tutoiement, SaaS audience; its offer block points to La Semaine Sans Ressaisie (Chrono 20 minutes).
- `calculateur/index.html`: lead magnet "Combien vous coûte la ressaisie ?" (vouvoiement). Up to 5 manual tasks → hours and euros lost per year, costliest task highlighted, result shown without a gate; optional email to receive it. `FREQ` and bounds are copied in `_n8n/prepare-lead.js`: change both together.
- `vcard.html`: digital business card with a QR code to Calendly (QR lib from cdnjs). Links are built from a `CONFIG` object in its script.
- `menu/index.html`: standalone printable A4 weekly family menu (light theme, `@page` print rules). Unrelated to the landing page; do not share styles between the two.
- `value-assets/`: internal visual board ("Méthode Stack Possédée") plus `scalezia/` material. Not linked from the site. Exception: `prompt-audit-crm-attio-entreprises.html` is a public lead magnet (prompt to copy, CTA to the Chrono 20 minutes and the calculator).
- `banniere-linkedin-le-cadre-v1.html`: legacy LinkedIn banner template (1584×396) from the previous "Le Cadre" offer.
- `generate-pdf.mjs`: legacy script for the old "Pacte Famille-Sport" lead magnet; its template is no longer in the repo.
- `_n8n/`: the lead capture workflow (see below). Folders starting with `_` are not published by GitHub Pages (Jekyll build), which is why it lives here.
- `_config.yml`: Jekyll `exclude` list for repo files that must not be served (`CLAUDE.md`, `README.md`, `generate-pdf.mjs`). Add any new internal file there.
- `assets/`: images, the client-case videos (`cas-client-crm-16x9.mp4` / `-1x1.mp4` + posters), `opengraph.png` (1200×627), `favicon.png`, `logo.png`, `profile.png`.

## Conventions that aren't obvious from the code

- **Inline everything per page.** CSS lives in one `<style>` block, JS in `<script>` blocks. Don't extract to separate files.
- **Copy:** raw UTF-8 characters (é, à, ·) are the norm in current pages; older pages use HTML entities. Match the surrounding style. No em dashes (`—`, `&mdash;`) in copy: use a colon, parentheses or two short sentences.
- **Brand palette is defined as CSS custom properties** at the top of each file's `<style>`. Landing page is dark (`--ink: #1C1C1C`, `--ink-2: #262626`, `--accent: #FF7A00`, `--accent-2: #FFD84D`); menu is light. Reuse the existing variables; don't hardcode colors.
- **Font is Montserrat** loaded from Google Fonts in every page. Keep the same `display=swap` link.
- **Commit message format**: `feat(<area>): <short note>` where `<area>` is the page or topic (`landing`, `diagnostic`, `vcard`, `menu`, `scalezia`...).

## Analytics: Umami Cloud

Every public page loads `https://cloud.umami.is/script.js` with `data-website-id="5e14483e-d3dc-4855-90ee-d3461fc6dcc2"`. Umami is cookieless (no consent banner needed); don't replace it with a cookie-based tool such as Google Analytics without adding a CNIL-compliant consent banner. Pageviews are automatic; outbound clicks are not (only Calendly is tracked, via the event below). Custom events are sent from JS through a local `track(name, props)` helper that calls `window.umami.track(name, props)` only if the script has loaded:

| Event | Page | Props |
|---|---|---|
| `Calendly Click` | landing, diagnostic, calculateur, prompt Attio, vcard | `location` |
| `Newsletter Signup` | landing (only after the email is saved) | `location` |
| `Diagnostic Start` / `Diagnostic Completed` / `Diagnostic Lead` | diagnostic | `tier` on `Diagnostic Lead` |
| `Calculateur Completed` / `Calculateur Lead` / `Calculateur Share` | calculateur | `via` (`copie`, `linkedin`) on `Calculateur Share` |
| `Prompt Copied` | prompt Attio | `prompt` |

- On the landing, Calendly clicks are wired automatically for every `a[href*="calendly.com"]`; give a new link a `data-loc="<section>"` attribute instead of adding a handler.
- Events and their props show up in Umami without any declaration.
- The old hero A/B test script was removed; don't reintroduce it.

## Lead capture: email → n8n → Attio

The site is static, so the Attio API key never goes in a page. Forms POST JSON to a self-hosted **n8n webhook**, which upserts the person in Attio (People, matched on email) and adds a Tags option and a Source:

| Form | `source` in payload | Attio Tags | Attio Source |
|---|---|---|---|
| Landing newsletter (`form[data-lead]`, hero + section) | `newsletter` | Newsletter RevOps | Inbound |
| Diagnostic email gate | `ton-crm-tient-a-300` | Diagnostic CRM 300 | Lead Magnet |
| Calculateur (optional email) | `calculateur-ressaisie` | Calculateur Ressaisie | Lead Magnet |

- One workflow serves all forms: Webhook → Prepare lead → bot filter (bots get the same `{ ok: true }` and nothing else happens) → Attio upsert (by email) → Attio tags + source → Attio note (diagnostic: score, tier, cost, gaps; calculateur: tasks and hours) → response to the site → first-welcome check → welcome email (SMTP, from `contact@florianmarin.me`).
- **Anti-bot:** every form has a hidden honeypot `<div class="hp"><input name="website"></div>` and sends `hp` + `elapsed_ms` (time since page load). n8n drops the lead if `hp` is filled, or `elapsed_ms` is missing or under 2.5 s. Keep both on any new form.
- **No duplicate welcome:** `_n8n/first-welcome-only.js` reads the tags the person already had in Attio. The newsletter welcome is skipped if they already have Newsletter RevOps, Diagnostic CRM 300 or Calculateur Ressaisie; the diagnostic and calculateur emails (they carry the results) are sent every time.
- Source of truth is `_n8n/prepare-lead.js` (validation, bot filter, Attio values, both welcome emails in HTML + text) and `_n8n/first-welcome-only.js`. `node _n8n/build.mjs` regenerates `_n8n/lead-capture-workflow.json` (the file to import in n8n), runs the Code node on sample payloads and writes `_n8n/preview-*.html` (gitignored). Never edit the JSON by hand; never put credentials in these files (they are referenced by name in n8n).
- `prepare-lead.js` copies the diagnostic tiers and gaps from `diagnostic/index.html` (`tierFor`, `DIMS`): change both together.
- Payload shape: `{ source, ts, lead: { email, phone?, consent }, hp, elapsed_ms, ...extra }`. The tag mapping lives in the n8n workflow, not in the pages.
- Endpoint constants: `LEAD_ENDPOINT` in `index.html`, `ENDPOINT` in `diagnostic/index.html` and `calculateur/index.html`. When empty, the page only `console.log`s the payload (local testing): never deploy with an empty endpoint.
- A new form = add `data-lead="<location>"` on the landing, or reuse the same payload shape elsewhere, then add its `source` to the n8n mapping. Attio rejects Tags/Source values that don't already exist as select options: create them in Attio first.

## External links

- **Calendly**: the booking CTA everywhere is `https://calendly.com/florian-marin/revops-sprint-discovery`. If it changes, update all pages (`grep -rn calendly.com`).
- **Substack**: still a `YOURSUBSTACK` placeholder in the landing footer.

## Things not to do

- Don't add a build tool, bundler, or framework. The site is intentionally one-file-per-page static HTML.
- Don't extract CSS/JS into separate files.
- Don't put API keys, tokens or n8n credentials in any file of this repo (it is served publicly).
- Don't translate copy to English. The audience is French-speaking.
