# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Static marketing site for **florianmarin.me**. Positioning since 2026-11-25: « Avant de recruter ton RevOps, donne sa fiche de poste à des agents. » (Méthode Fiche de Poste). The homepage sells the entry offer **Le Premier Agent** (7 jours, 2 000 € HT crédités à 100 % sur le Sprint signé sous 30 jours, Garantie Vendredi; SaaS and tech B2B, 50 to 300 people, FR/BE/CH, tutoiement) and presents the **Sprint Fiche de Poste** (6 semaines, 25 000 € HT, garantie Go-Live). It replaced La Semaine Sans Ressaisie (2026-11-01 to 2026-11-25). The old Sprint page `/sprint/` stays unlinked and predates this positioning. Copy is in French. Every page is a self-contained HTML file: no build step, no package manager, no tests. Deployed via GitHub Pages with the custom domain set in `CNAME`. **Everything in the repo is public**, so never commit secrets or internal files.

To preview, open the file directly in a browser (e.g. `open index.html`) or serve the folder (`python3 -m http.server 8000`). To deploy, commit and push to `main`; GitHub Pages serves the repo root.

## Files

- `index.html`: the homepage, Le Premier Agent + Méthode Fiche de Poste (rewritten 2026-11-25 from the Semaine Sans Ressaisie page). All CSS and JS inlined. Single action: Calendly (« Envoie-moi ta fiche de poste », 20 minutes); section `#methode` embeds the board `value-assets/methode-fiche-de-poste/?embed` in an iframe; a « Pas prêt pour un appel ? » section links the calculateur and the diagnostic. No newsletter form. The head comment holds the positioning sentence. The OG image and the LinkedIn banner come from `_print/visuels-positionnement.html` (updated to the new headline 2026-11-25): re-render them.
- `sprint/index.html`: the former landing (Sprint RevOps 6 semaines, ~1.7k lines, newsletter forms). **Not linked** from the homepage or any page: sent directly to clients after a Semaine Sans Ressaisie. Uses relative `../assets/` paths; Umami locations are prefixed `sprint-`.
- `reseaux/index.html`: **en ligne mais liée de nulle part** (décision du 2026-11-01, hors cible du plan GTM). Page dédiée aux têtes de réseau (franchiseurs, groupements multi-sites), offre « livraison 4 semaines → abonnement ». Vouvoiement (dirigeants), une seule action (Calendly, `data-loc="reseaux-*"`), pas de newsletter. Son `<style>` reprend celui de `sprint/index.html` plus un bloc « PAGE RÉSEAUX » en fin : si tu modifies un style partagé, reporte-le. Le commentaire en tête de `<head>` liste ce qui reste à valider avant diffusion.
- `diagnostic/index.html`: lead magnet quiz « Tes équipes saisissent tout deux fois ? » (refonte du 2026-11-20). One question per screen, options shuffled, 10 questions on 4 axes (Saisie, Flux entre outils, Automatisation, Adoption du CRM), then a context screen outside the score (company size, CRM, people × hours of ressaisie). Weakest axis gives one of 4 profiles (Le CRM-tableur, La stack spaghetti, L'Ops fantôme, Le CRM qu'on contourne; « La stack branchée » if every axis is ≥ 85 %). Profile, axes and first automation are shown; the rest (mirror sentences, cost, « Fais le calcul », 3 priorities, automation plan, offer) stays blurred until the gate (prénom + email pro + consent). Questions, profiles and the scoring function live in the `/* DIAG:start */ … /* DIAG:end */` block: keep it ES5 and self-contained, `_n8n/build.mjs` copies it into the n8n workflow. Since 2026-11-25 the context screen also asks « Qui fait le travail Ops aujourd'hui ? » (list `OPS` kept outside the DIAG block, sent as `ops`; the same labels live in `OPS` in `_n8n/prepare-lead.js`: change both together), the cost card adds a full-time-equivalent line (people × hours ÷ 35), and the final card sells Le Premier Agent and links the method board. Since 2026-11-27 the first automation is shown as « Ton premier agent » (own card before the gate, trigger visible) and the unlocked part adds a copyable prompt that makes the visitor's AI write the agent's fiche de poste: `diagPrompt(r, size, crm)` in the DIAG block, with the per-agent edge cases `recette.pieges`, so the page and the email carry the same text. Under 50 people (`lt20`, `20-50`) the final card hides the Calendly button and points to the newsletter (the email does the same).
- `calculateur/index.html`: lead magnet "Combien te coûte la ressaisie ?" (tutoiement since 2026-11-01, like its email in `prepare-lead.js`). Up to 5 manual tasks → hours and euros lost per year, costliest task highlighted, result shown without a gate; optional email to receive it. `FREQ` and bounds are copied in `_n8n/prepare-lead.js`: change both together. Its offer card sells Le Premier Agent since 2026-11-25.
- `cas-client/reseau-franchise/index.html`: the client case page (2026-11-27), anonymised: « réseau de ~60 points de vente franchisés, ~380 ventes/mois », never the client's name, a first name or an agency city (written consent not obtained). Built from the case study and build-in-public journal kept in the client's own repo (local, outside this one), whose publication rules (section A of the journal) apply. Never write the client's name or repo path here or in a page comment: this repo is public. Only figures marked measured there; the « Ce que les chiffres ne disent pas » box states the limits. Structured as the RevOps job description, task by task. Linked from the homepage case section; Umami locations `cas-*`.
- `mentions-legales/index.html`: legal notice (LCEN) and privacy policy (RGPD) of Studio Florian Marin (SAS, SIRET, siège, TVA, hébergeur GitHub), with the table of data collected per form and the processors (n8n on Hetzner, Attio, Private Email, Calendly, Umami, Google Fonts). Linked from the diagnostic and calculateur consents and the homepage footer. Update it when a form, a tool receiving personal data, or the hosting changes.
- `vcard.html`: digital business card with a QR code to Calendly (QR lib from cdnjs). Links are built from a `CONFIG` object in its script.
- `menu/index.html`: standalone printable A4 weekly family menu (light theme, `@page` print rules). Unrelated to the landing page; do not share styles between the two.
- `value-assets/`: internal visual board ("Méthode Stack Possédée", `index.html`) plus `scalezia/` material, not linked from the site. Exceptions: `prompt-audit-crm-attio-entreprises.html` is a public lead magnet (prompt to copy, CTA to the 20-minute call and the calculator), and `methode-fiche-de-poste/index.html` is the public board of the Méthode Fiche de Poste (2026-11-25), linked from the homepage (iframe + footer) and the diagnostic. Same engine as the Stack Possédée and Scalezia boards; in an iframe or with `?embed` the mouse wheel no longer changes steps and a « Plein écran » button appears. Its client figures are the anonymised ones of the homepage. Its `<header class="intro">` (H1, intro paragraph, links to the homepage, diagnostic and calculateur, `target="_top"` for the iframe) and the `<h2>` step titles are the only text structure crawlers see: keep them when editing the board.
- `banniere-linkedin-le-cadre-v1.html`: legacy LinkedIn banner template (1584×396) from the previous "Le Cadre" offer.
- `_print/visuels-positionnement.html`: source of `assets/opengraph.png` (`?v=og`, 1200×627) and of the LinkedIn banner `_print/banniere-linkedin.png` (`?v=banner`, 1584×396). Render command in its head comment (headless Chrome). Change the positioning there, then re-render both. `?v=og-diagnostic` renders `assets/opengraph-diagnostic.png` at 2× (2400×1254, `--force-device-scale-factor=2`; at 1× LinkedIn shows it blurry; bump `?v=` on its `og:image` after each render), the share image of the diagnostic (used as a LinkedIn Featured link): re-render it if the quiz title or profiles change.
- `_versions/`: earlier homepage drafts (v1 réseaux, v2 SaaS, v3 neutral), **local only, never committed** (their comments name a client).
- `generate-pdf.mjs`: legacy script for the old "Pacte Famille-Sport" lead magnet; its template is no longer in the repo.
- `_n8n/`: the lead capture workflow and the Calendly → Attio workflow (see below). Folders starting with `_` are not published by GitHub Pages (Jekyll build), which is why it lives here.
- `_config.yml`: Jekyll `exclude` list for repo files that must not be served (`CLAUDE.md`, `README.md`, `generate-pdf.mjs`). Add any new internal file there.
- `assets/`: images, the client-case videos (`cas-client-crm-16x9.mp4` / `-1x1.mp4` + posters), `opengraph.png` (1200×627), `favicon.png`, `logo.png`, `profile.png`.

## Conventions that aren't obvious from the code

- **Inline everything per page.** CSS lives in one `<style>` block, JS in `<script>` blocks. Don't extract to separate files.
- **Copy:** raw UTF-8 characters (é, à, ·) are the norm in current pages; older pages use HTML entities. Match the surrounding style. No em dashes (`—`, `&mdash;`) in copy: use a colon, parentheses or two short sentences.
- **Brand palette is defined as CSS custom properties** at the top of each file's `<style>`. Landing page is dark (`--ink: #1C1C1C`, `--ink-2: #262626`, `--accent: #FF7A00`, `--accent-2: #FFD84D`); menu is light. Reuse the existing variables; don't hardcode colors.
- **Font is Montserrat** loaded from Google Fonts in every page. Keep the same `display=swap` link.
- **No prices on the site** (decision of 2026-11-27): the offers say « prix fixe » and « crédité à 100 % sur le Sprint », amounts are given on the call. No price in the JSON-LD `Offer` either, nor in the welcome emails. `node _n8n/check-paths.mjs` fails on « € HT » or a JSON-LD `price` in served pages, `llms.txt` and `_n8n/prepare-*.js`. The euros computed by the diagnostic and the calculateur (cost of ressaisie, €/h) are not prices and stay.
- **Commit message format**: `feat(<area>): <short note>` where `<area>` is the page or topic (`landing`, `diagnostic`, `vcard`, `menu`, `scalezia`...).

## Analytics: Umami Cloud

Every public page loads `https://cloud.umami.is/script.js` with `data-website-id="5e14483e-d3dc-4855-90ee-d3461fc6dcc2"` and `data-domains="florianmarin.me"` (only production is counted: pages opened locally as `file:///Users/…` or served on localhost send nothing, custom events included; `node _n8n/check-paths.mjs` fails on a Umami tag without it). Umami is cookieless (no consent banner needed); don't replace it with a cookie-based tool such as Google Analytics without adding a CNIL-compliant consent banner. Pageviews are automatic; outbound clicks are not (only Calendly is tracked, via the event below). Custom events are sent from JS through a local `track(name, props)` helper that calls `window.umami.track(name, props)` only if the script has loaded:

| Event | Page | Props |
|---|---|---|
| `Calendly Click` | homepage, sprint (`sprint-` prefix), client case (`cas-` prefix), diagnostic, calculateur, prompt Attio, vcard, method board (`methode`, `methode-embed` inside the homepage iframe) | `location` |
| `Newsletter Signup` | sprint (only after the email is saved, `sprint-` prefix) | `location` |
| `Diagnostic Start` / `Diagnostic Step` / `Diagnostic Completed` / `Diagnostic Lead` / `Diagnostic Abandon` | diagnostic | `n` on Step, `profil` + `score` on Completed, `profil` + `taille` + `ops` on Lead, `etape` on Abandon (best effort, sent when the tab is hidden before the email) |
| `Calculateur Completed` / `Calculateur Lead` / `Calculateur Share` | calculateur | `via` (`copie`, `linkedin`) on `Calculateur Share` |
| `Prompt Copied` | prompt Attio, diagnostic | `prompt` (`audit-crm-attio`, `diagnostic-<profileKey>`) |

- On the homepage and the sprint page, Calendly clicks are wired automatically for every `a[href*="calendly.com"]`; give a new link a `data-loc="<section>"` attribute instead of adding a handler.
- Events and their props show up in Umami without any declaration.
- The old hero A/B test script was removed; don't reintroduce it.

## Lead capture: email → n8n → Attio

The site is static, so the Attio API key never goes in a page. Forms POST JSON to a self-hosted **n8n webhook**, which upserts the person in Attio (People, matched on email) and adds a Tags option and a Source:

| Form | `source` in payload | Attio Tags | Attio Source |
|---|---|---|---|
| Sprint page newsletter (`form[data-lead]`, hero + section) | `newsletter` | Newsletter RevOps | Inbound |
| Diagnostic email gate | `diagnostic-ressaisie` | Diagnostic Ressaisie | Lead Magnet |
| Calculateur (optional email) | `calculateur-ressaisie` | Calculateur Ressaisie | Lead Magnet |

- One workflow serves all forms: Webhook → Prepare lead → bot filter (bots get the same `{ ok: true }` and nothing else happens) → Attio upsert (by email) → Attio tags + source → Attio note (diagnostic: profile, axes, size, CRM, cost, lowest answers, proposed automation; calculateur: tasks and hours) → response to the site → first-welcome check → welcome email (SMTP, from `contact@florianmarin.me`).
- **Anti-bot:** every form has a hidden honeypot `<div class="hp"><input name="website"></div>` and sends `hp` + `elapsed_ms` (time since page load). n8n drops the lead if `hp` is filled, or `elapsed_ms` is missing or under 2.5 s. Keep both on any new form.
- **No duplicate welcome:** `_n8n/first-welcome-only.js` reads the tags the person already had in Attio. The newsletter welcome is skipped if they already have Newsletter RevOps, Diagnostic CRM 300 (old quiz), Diagnostic Ressaisie or Calculateur Ressaisie; the diagnostic and calculateur emails (they carry the results) are sent every time.
- Source of truth is `_n8n/prepare-lead.js` (validation, bot filter, Attio values, both welcome emails in HTML + text) and `_n8n/first-welcome-only.js`. `node _n8n/build.mjs` regenerates `_n8n/lead-capture-workflow.json` (the file to import in n8n), runs the Code node on sample payloads and writes `_n8n/preview-*.html` (gitignored). Never edit the JSON by hand; never put credentials in these files (they are referenced by name in n8n).
- The diagnostic content is not copied: `prepare-lead.js` has a `// @@DIAG@@` line that `build.mjs` replaces with the `DIAG` block of `diagnostic/index.html` (the build fails if either marker is missing). After any change to the quiz, rerun `node _n8n/build.mjs` and re-import the workflow.
- Payload shape: `{ source, ts, lead: { email, first_name?, consent }, hp, elapsed_ms, ...extra }` (diagnostic extra: `answers` as `{ questionId: points 0-3 }`, `size`, `crm`, `ops`, `people`, `hours`; n8n recomputes everything from them). The tag mapping lives in the n8n workflow, not in the pages.
- Endpoint constants: `LEAD_ENDPOINT` in `sprint/index.html`, `ENDPOINT` in `diagnostic/index.html` and `calculateur/index.html`. When empty, the page only `console.log`s the payload (local testing): never deploy with an empty endpoint.
- A new form = add `data-lead="<location>"` on the sprint page, or reuse the same payload shape elsewhere, then add its `source` to the n8n mapping. Attio rejects Tags/Source values that don't already exist as select options: create them in Attio first.

## Calendly → Attio (préparation du Chrono)

`_n8n/calendly-attio-workflow.json` (generated, import it in n8n): Calendly trigger (`invitee.created`, `invitee.canceled`) → Prépare le rendez-vous → Attio upsert person (by email) → in parallel: add the Calendly name only if the record has none, and a note (« Chrono réservé / annulé / déplacé », slot in Paris time, form answers, UTM) → for a booking, an Attio task « Préparer le Chrono » 2 h before the slot.

- Source of truth: `_n8n/prepare-booking.js` (filter `KEEP_EVENT` on the Calendly event name, note and task content) and `_n8n/complete-person.js`. `node _n8n/build.mjs` regenerates both workflows and runs the booking test cases (via `build-booking.mjs`).
- Credentials are referenced in n8n only: Calendly API (personal access token, paid Calendly plan required for webhooks) and the same Attio header auth as the lead workflow.
- A cancellation does not close the earlier task: the note reminds to close it by hand.

## Slack notifications

`_n8n/slack-notification-workflow.json` (generated, import it first): sub-workflow « Slack notification », Execute Workflow Trigger with one input `text` (Slack mrkdwn) → Slack post to `#leads` (`SLACK_CHANNEL` in `_n8n/build-slack.mjs`). The lead workflow calls it when `prepare-lead.js` returns a `slack` text (diagnostic only; newsletter and calculateur return `null`), the Calendly workflow calls it for every booking, cancellation and reschedule (`slack` from `prepare-booking.js`). Callers use `slackCall()` from `build-slack.mjs`: fire and forget (`waitForSubWorkflow: false`, `onError: continue`), placed above the other branch so it runs first in v1 order. After import, pick the sub-workflow in each « Slack · notification » node (its id only exists once imported) and the Slack credential on its « Slack » node; the bot must be invited in the channel. Escape `&`, `<`, `>` in any text sent to Slack.

## Error notifications

`_n8n/error-notifications-workflow.json` (generated, import it in n8n): Error Trigger → Prépare l'alerte → in parallel, email to `contact@florianmarin.me` (same SMTP credential as the welcome email) and a Slack post to `#alertes-n8n` (`ALERT_CHANNEL`). The Slack node is direct, not the sub-workflow, so a Slack outage cannot loop alerts, and it has `onError: continue` so the email always leaves. Set « Error workflow » = Error notifications on the lead, Calendly and Slack notification workflows. Generic: any workflow points to it in its settings (« Error workflow »). It fires only on production executions (not manual test runs) and does not need to be activated. The alert gives workflow, failing node, message, time (Paris), mode, a link to the execution when n8n provides one, and the first 12 lines of the stack. Source of truth: `_n8n/format-error.js`; `node _n8n/build.mjs` regenerates it and runs its test cases (via `build-error.mjs`).

## SEO and GEO

- `robots.txt` allows everything, AI assistants named explicitly (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…), and points to `sitemap.xml`. No `Disallow`: pages kept out of search carry `<meta name="robots" content="noindex">` instead (sprint, réseaux, menu, Stack Possédée board, Scalezia, LinkedIn banner, vcard).
- Indexable pages (homepage, diagnostic, calculateur, method board, prompt Attio, client case, mentions légales) have a `<link rel="canonical">` equal to their `sitemap.xml` entry, plus `og:*` and `twitter:card`. `node _n8n/check-paths.mjs` fails if a served page has neither canonical nor noindex, if canonicals and sitemap differ, or if a JSON-LD block does not parse. A new public page = canonical + sitemap entry; a new internal page = noindex.
- The homepage carries JSON-LD (`Person`, `ProfessionalService` with both offers, without prices, `FAQPage` copied from the visible FAQ): when the FAQ, the offers or the bio change, update it too.
- `llms.txt` summarises the positioning, offers, free tools and contact for AI assistants: keep it in sync with the homepage.

## External links

- **Calendly**: the booking CTA everywhere is `https://calendly.com/florian-marin/revops-sprint-discovery`. If it changes, update all pages (`grep -rn calendly.com`).
- **Substack**: still a `YOURSUBSTACK` placeholder in the sprint page footer; the homepage has no Substack link until the URL is known.

## Asset paths

Reference assets with a relative path (`../assets/x.png` from a subfolder, `assets/x.png` from the root) or a full URL (`https://florianmarin.me/assets/x.png`, required for `og:image`), never `/assets/...`. `node _n8n/check-paths.mjs` enforces it on every HTML file and `node _n8n/build.mjs` fails if it doesn't pass.

## Things not to do

- Don't add a build tool, bundler, or framework. The site is intentionally one-file-per-page static HTML.
- Don't extract CSS/JS into separate files.
- Don't put API keys, tokens or n8n credentials in any file of this repo (it is served publicly).
- Don't translate copy to English. The audience is French-speaking.
