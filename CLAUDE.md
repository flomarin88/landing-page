# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Static marketing site for **florianmarin.me** ("Le Cadre Endurance" — coaching offer for tech-exec fathers, copy in French). Three independent, self-contained HTML pages — no build step, no package manager, no tests. Deployed via GitHub Pages with the custom domain set in `CNAME`.

To preview, open the file directly in a browser (e.g. `open index.html`) or serve the folder (`python3 -m http.server 8000`). To deploy, commit and push to `main`; GitHub Pages serves the repo root.

## Files

- `index.html` — the landing page. ~1.6k lines of HTML with **all CSS and JS inlined** (no external stylesheet). This is the bulk of the work.
- `menu/index.html` — standalone printable A4 weekly family menu (light theme, `@page` print rules). Unrelated to the landing page; do not share styles between the two.
- `banniere-linkedin-le-cadre-v1.html` — LinkedIn banner template (1584×396), exported to image manually.
- `assets/` — `logo.png`, `favicon.png`, `profile.png`, `opengraph.png` (1200×627), `client-agenda-01.jpeg`.

## Conventions that aren't obvious from the code

- **Inline everything in `index.html`.** CSS lives in one `<style>` block, JS in `<script>` blocks. Don't extract to separate files — the deploy is a single static page and the inline approach is intentional.
- **French copy uses HTML entities** (`&eacute;`, `&agrave;`, `&mdash;`, `&laquo;`, etc.) rather than raw UTF-8 characters in most places. Match the surrounding style when editing.
- **Brand palette is defined as CSS custom properties** at the top of each file's `<style>`. Landing page is dark (`--bg: #1C1C1C`, `--accent: #FF7A00`); menu is light. Reuse the existing variables — don't hardcode colors.
- **Font is Montserrat** loaded from Google Fonts in every page. Keep the same `display=swap` link.
- **Commit message format**: `feat(<area>): v<version> - <short note>` where `<area>` is one of `homepage`, `menu`, `linkedin`. Version bumps are loose semver in the message, not in any file.

## A/B test system (`index.html`)

The hero headline + subhead are swapped at runtime by an inline IIFE near the top of `<head>` (around line 41). Three variants `a` / `b` / `c` are defined in a `VARIANTS` object. Selection priority:

1. `?v=a|b|c` URL parameter (overrides everything, persisted to `localStorage`)
2. Existing `localStorage.lce_variant` (sticky across visits)
3. Random pick

The chosen variant writes `data-variant` on `<body>` and exposes `window.__LCE_VARIANT`. The script also wires Umami events (`ab_exposed`, `ab_cta_click`, `ab_lead_magnet_click`) to all `a[href*="calendly.com"]` and `a[href*="tally.so"]` links automatically — **don't add manual click handlers for those**, the IIFE already covers them. Variant slots in the DOM are marked with `data-ab="headline"` and `data-ab="sub"`; preserve those attributes when restructuring the hero.

When adding a variant, update the `VARIANTS` object only — no other code change is needed.

## Analytics & external integrations

- **Umami** (cloud, `data-website-id="5e14483e-..."`) — page-level tracking is automatic. Add `data-umami-event="<event-name>"` to any new CTA so it shows up in the dashboard. Existing names follow `<location>-cta-<purpose>` (e.g. `hero-cta-diagnostic`, `nav-cta-click`, `sticky-cta-diagnostic`). Match that pattern.
- **Calendly** — primary CTA target is `https://calendly.com/florian-marin/audit-triangle` (the free 30-min diagnostic). Used in nav, hero, post-problem, pricing, final, sticky. If the booking URL changes, update all occurrences.
- **Tally** — lead magnet quiz at `https://tally.so/r/68OLD5`.
- **WhatsApp** — secondary contact CTA in pricing/final sections.

## Things not to do

- Don't add a build tool, bundler, or framework. The site is intentionally one-file-per-page static HTML.
- Don't extract CSS/JS into separate files in `index.html` — see above.
- Don't add tracking on Calendly/Tally links by hand; the A/B IIFE already wires them.
- Don't translate copy to English. The audience is French-speaking.
