// n8n Code node « Prepare lead » : valide le payload du site, prépare les valeurs Attio,
// la note (diagnostic) et l'email de bienvenue. Tout le contenu affiché est recalculé ici,
// rien du payload n'est injecté tel quel dans le HTML.

const SITE = 'https://florianmarin.me';
const CALENDLY = 'https://calendly.com/florian-marin/revops-sprint-discovery';
const DIAGNOSTIC_URL = SITE + '/diagnostic/';
const CALCULATEUR_URL = SITE + '/calculateur/';

// skipWelcomeIfTagged : pas de 2e email de bienvenue si la personne a déjà un de ces tags dans Attio.
// Le diagnostic n'en a pas : son email contient les résultats demandés, il part à chaque diagnostic.
const FORMS = {
  'newsletter': { tag: 'Newsletter RevOps', source: 'Inbound', skipWelcomeIfTagged: ['Newsletter RevOps', 'Diagnostic CRM 300', 'Calculateur Ressaisie'] },
  'ton-crm-tient-a-300': { tag: 'Diagnostic CRM 300', source: 'Lead Magnet', skipWelcomeIfTagged: [] },
  'calculateur-ressaisie': { tag: 'Calculateur Ressaisie', source: 'Lead Magnet', skipWelcomeIfTagged: [] }
};

// Anti-bot : champ piège rempli, ou formulaire envoyé moins de 2,5 s après le chargement de la page.
const MIN_ELAPSED_MS = 2500;

// Copie de diagnostic/index.html (DIMS + tierFor). À garder synchro si le quiz change.
const GAPS = {
  truth: ['Source de vérité unique', 'Le CRM devient la référence : fini les Sheets parallèles et les versions qui divergent.'],
  capture: ['Capture & routing des leads', 'Auto-création + assignation des leads : zéro lead qui tombe entre deux chaises.'],
  convo: ['Conversation intelligence', 'Logging auto des appels et résumés sur la bonne fiche, sans ressaisie.'],
  engage: ['Sales engagement synchronisé', 'Synchro bidirectionnelle outreach ↔ CRM : aucune double-saisie, statut toujours juste.'],
  revenue: ['Revenue & billing dans le CRM', 'Stripe dans le CRM : MRR, paiements et signaux de churn visibles côté commercial.'],
  alert: ['Alerting & handoffs', "Alertes Slack sur les events qui comptent : l'équipe réagit en minutes, pas en jours."],
  report: ['Reporting RevOps en live', 'Pipeline & forecast en temps réel, sans un seul export ni retraitement Excel.'],
  quality: ['Qualité de données', 'Dédup + enrichissement + validation automatisés : on arrête de décider sur des données pourries.'],
  automation: ["Couche d'automatisation", "Une couche d'orchestration (type n8n) remplace les tâches répétitives par des workflows."],
  ramp: ['Ramp des nouveaux reps', 'Tooling intégré = nouveaux reps opérationnels en jours, pas en semaines.']
};

function tierFor(pct) {
  if (pct <= 35) return { name: 'Cassera avant 150', color: '#EF5D6F', desc: 'Ton CRM ne tient déjà plus. Tes équipes compensent à la main, tes données ne sont pas fiables, ton forecast est faux. Plus tu ajoutes de monde, pire ça devient. Tu vas droit dans le mur avant 150 personnes.' };
  if (pct <= 65) return { name: 'Va fissurer entre 150 et 250', color: '#F1B24A', desc: 'Ça tient encore. Mais les premières fissures sont là : Zaps fragiles, exports manuels, source de vérité dispersée. Tu vas le sentir entre 150 et 250 personnes. Ton forecast va commencer à mentir.' };
  if (pct <= 85) return { name: "Tient pour l'instant", color: '#FF7A00', desc: 'Bonne base. Tu peux pousser jusqu\'à 250 sans douleur majeure. Au-delà, il te reste des angles morts qui vont coûter cher : qualité de données, automatisation, ramp des nouveaux reps. Optimisable vite.' };
  return { name: 'Tient à 300 et au-delà', color: '#3CC79A', desc: 'Solide. Ton CRM est un actif qui scale, pas un boulet qui freine. On parle d\'optimisation fine, pas de chantier. Tu peux pousser sans le remplacer.' };
}

const WEEKS = 47;
const LOADED = 45;

// Copie de calculateur/index.html (FREQ, bornes). À garder synchro si le calculateur change.
const FREQ = { jour: { perYear: WEEKS * 5, label: 'par jour' }, semaine: { perYear: WEEKS, label: 'par semaine' }, mois: { perYear: 11, label: 'par mois' } };

function esc(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function int(v, min, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

function euro(n) {
  // Espace insécable classique : l'espace fine (U+202F) d'Intl disparaît dans certaines polices et clients mail.
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n).replace(/ /g, ' ');
}

// ---------- Gabarit HTML (identité florianmarin.me : fond #1C1C1C, cartes #262626, accent #FF7A00, Montserrat)

const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";
const C = { ink: '#1C1C1C', ink2: '#262626', line: '#333333', text: '#FFFFFF', muted: '#B8B8B8', dim: '#6B6B6B', accent: '#FF7A00' };

function p(html, style) {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.muted};${style || ''}">${html}</p>`;
}

function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr>
<td bgcolor="${C.accent}" style="border-radius:8px">
<a href="${href}" target="_blank" style="display:inline-block;padding:15px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px">${label}</a>
</td></tr></table>`;
}

function layout({ preheader, eyebrow, title, body }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ink}" style="background:${C.ink}">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td style="padding:0 4px 24px;font-family:${FONT};font-size:18px;font-weight:700;color:#FFFFFF">
<a href="${SITE}" style="color:#FFFFFF;text-decoration:none">Florian Marin<span style="color:${C.accent}">.</span></a>
</td></tr>
<tr><td bgcolor="${C.ink2}" style="background:${C.ink2};border:1px solid ${C.line};border-radius:12px;padding:36px 32px">
<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.accent};margin:0 0 14px">${eyebrow}</div>
<h1 style="margin:0 0 22px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:700;color:#FFFFFF">${title}</h1>
${body}
${p('Réponds à cet email. Je lis tout.', 'color:#FFFFFF;font-weight:600')}
${p('Florian', 'margin:0;color:#FFFFFF')}
</td></tr>
<tr><td style="padding:24px 4px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.dim}">
Florian Marin · Ingénieur CRM RevOps · Montpellier<br>
<a href="${SITE}" style="color:${C.dim}">florianmarin.me</a> · <a href="https://www.linkedin.com/in/florian-marin" style="color:${C.dim}">LinkedIn</a><br>
Tu reçois cet email suite à ton inscription sur florianmarin.me. Pour ne plus rien recevoir, réponds STOP.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function newsletterEmail() {
  const body =
    p('Merci pour ton inscription.') +
    p("Chaque mardi, je t'envoie une idée RevOps tirée de mes chantiers : une intégration, un piège évité, une décision d'archi commerciale. Lisible en 3 minutes.") +
    p("Pour situer d'où je parle : 15 ans en software engineering, ex-CTO Tiime, ex-EM Aircall (j'y ai codé la sales tech depuis l'intérieur), ex-Teads. Aujourd'hui je fais scaler des CRM modernes comme Attio, Folk ou Close dans des scaleups B2B SaaS de 50 à 300 personnes.") +
    p("En attendant mardi, tu peux voir où en est ton CRM : 10 questions, un score, et ce que ta stack te coûte en heures perdues.") +
    button('Faire le diagnostic de mon CRM →', DIAGNOSTIC_URL) +
    p("Et une question pour démarrer : qu'est-ce qui te fait perdre le plus de temps dans ton CRM aujourd'hui ?");
  const text = [
    'Merci pour ton inscription.',
    "Chaque mardi, je t'envoie une idée RevOps tirée de mes chantiers : une intégration, un piège évité, une décision d'archi commerciale. Lisible en 3 minutes.",
    "Pour situer d'où je parle : 15 ans en software engineering, ex-CTO Tiime, ex-EM Aircall (j'y ai codé la sales tech depuis l'intérieur), ex-Teads. Aujourd'hui je fais scaler des CRM modernes comme Attio, Folk ou Close dans des scaleups B2B SaaS de 50 à 300 personnes.",
    'En attendant mardi, tu peux voir où en est ton CRM (10 questions) : ' + DIAGNOSTIC_URL,
    "Et une question pour démarrer : qu'est-ce qui te fait perdre le plus de temps dans ton CRM aujourd'hui ?",
    'Réponds à cet email. Je lis tout.',
    'Florian',
    '--\nPour ne plus rien recevoir, réponds STOP.'
  ].join('\n\n');
  return {
    subject: "C'est noté : une idée RevOps chaque mardi",
    html: layout({
      preheader: "Ce que tu vas recevoir, et une question pour démarrer.",
      eyebrow: 'Newsletter RevOps',
      title: 'Bienvenue. Rendez-vous mardi.',
      body
    }),
    text
  };
}

function diagnosticEmail(d) {
  const gaps = d.gaps.map(([gap, fix]) =>
    `<tr><td style="padding:0 0 14px">
<div style="font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;margin:0 0 4px"><span style="color:${C.accent}">■</span>&nbsp; ${gap}</div>
<div style="font-family:${FONT};font-size:14px;line-height:1.55;color:${C.muted}">${fix}</div>
</td></tr>`).join('');

  const body =
    p("Voici ton diagnostic. Garde-le : c'est ta base de comparaison le jour où tu voudras mesurer ce qui a bougé.") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border:1px solid ${C.line};border-radius:10px">
<tr><td style="padding:22px 22px 18px;background:${C.ink};border-radius:10px">
<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.dim}">Ton score</div>
<div style="font-family:${FONT};font-size:44px;font-weight:700;line-height:1.1;color:#FFFFFF;margin:6px 0 4px">${d.score}<span style="font-size:20px;color:${C.dim}">/100</span></div>
<div style="font-family:${FONT};font-size:17px;font-weight:700;color:${d.tier.color};margin:0 0 10px">${d.tier.name}</div>
<div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${C.muted}">${d.tier.desc}</div>
</td></tr></table>` +
    `<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.dim};margin:0 0 6px">Ce que ta stack te coûte</div>
<div style="font-family:${FONT};font-size:30px;font-weight:700;color:${C.accent};margin:0 0 6px">${euro(d.annual)} / an</div>` +
    p(`${d.reps} commerciaux × ${d.hours} h/sem × ${WEEKS} sem × ${LOADED} €/h chargé. Soit ${euro(d.weekly)} chaque semaine. Hors deals perdus pour cause de données sales ou de relances trop lentes.`, 'font-size:14px') +
    `<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.dim};margin:8px 0 14px">Tes 3 chantiers prioritaires</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${gaps}</table>` +
    p("Ton trou n°1 se bouche souvent en une semaine. C'est La Semaine Sans Ressaisie : j'automatise la tâche qui coûte le plus à ton équipe, en production le vendredi, ou je te rembourse. Je travaille seul : une semaine, un client.", 'margin-top:8px') +
    p("En 20 minutes, je chronomètre la tâche avec toi et je te dis franchement si elle tient en 7 jours.") +
    button('Réserver le Chrono 20 minutes →', CALENDLY) +
    p("Tu recevras aussi ma newsletter, une idée RevOps chaque mardi.", 'font-size:14px');

  const text = [
    "Voici ton diagnostic. Garde-le : c'est ta base de comparaison le jour où tu voudras mesurer ce qui a bougé.",
    `Score : ${d.score}/100 · ${d.tier.name}\n${d.tier.desc}`,
    `Ce que ta stack te coûte : ${euro(d.annual)} / an (${d.reps} commerciaux × ${d.hours} h/sem × ${WEEKS} sem × ${LOADED} €/h chargé, soit ${euro(d.weekly)} par semaine).`,
    'Tes 3 chantiers prioritaires :\n' + d.gaps.map(([g, f]) => `- ${g} : ${f}`).join('\n'),
    "Ton trou n°1 se bouche souvent en une semaine. C'est La Semaine Sans Ressaisie : j'automatise la tâche qui coûte le plus à ton équipe, en production le vendredi, ou je te rembourse.",
    'Réserve le Chrono 20 minutes : je chronomètre la tâche avec toi et je te dis si elle tient en 7 jours. ' + CALENDLY,
    'Réponds à cet email. Je lis tout.',
    'Florian',
    '--\nPour ne plus rien recevoir, réponds STOP.'
  ].join('\n\n');

  return {
    subject: `Ton diagnostic CRM : ${d.score}/100, ${d.tier.name.toLowerCase()}`,
    html: layout({
      preheader: `${d.tier.name} · ${euro(d.annual)} / an perdus · tes 3 chantiers prioritaires`,
      eyebrow: 'Diagnostic · Ton CRM tient-il à 300 ?',
      title: 'Ton diagnostic CRM',
      body
    }),
    text
  };
}

function calculateurEmail(c) {
  const rows = c.tasks.map((t) =>
    `<tr><td style="padding:10px 0;border-top:1px solid ${C.line};font-family:${FONT};font-size:14px;color:#FFFFFF">${t.top ? `<span style="color:${C.accent}">■</span>&nbsp; ` : ''}${esc(t.name)}<div style="font-size:12.5px;color:${C.dim}">${t.minutes} min ${FREQ[t.freq].label} × ${t.people} pers.</div></td>
<td align="right" style="padding:10px 0;border-top:1px solid ${C.line};font-family:${FONT};font-size:14px;font-weight:700;color:#FFFFFF;white-space:nowrap">${t.hours} h · ${euro(t.cost)}</td></tr>`).join('');
  const top = c.tasks.find((t) => t.top);
  const body =
    p("Voici votre résultat. Gardez-le : c'est votre point de départ le jour où vous voudrez mesurer ce qui a changé.") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;border:1px solid ${C.line};border-radius:10px">
<tr><td style="padding:22px;background:${C.ink};border-radius:10px">
<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.dim}">Ce que la ressaisie vous coûte</div>
<div style="font-family:${FONT};font-size:40px;font-weight:700;line-height:1.1;color:#FFFFFF;margin:6px 0 4px">${c.hours} h<span style="font-size:18px;color:${C.dim}"> / an</span></div>
<div style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.accent}">${euro(c.cost)} / an</div>
<div style="font-family:${FONT};font-size:13px;color:${C.muted};margin-top:8px">Soit ${c.weeks} semaines de travail à temps plein. Base : ${c.rate} €/h chargé.</div>
</td></tr></table>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">${rows}</table>` +
    p(`Votre tâche la plus coûteuse : <strong style="color:#FFFFFF">${esc(top.name)}</strong>, ${top.hours} h et ${euro(top.cost)} par an.`) +
    p("C'est exactement ce que supprime La Semaine Sans Ressaisie : j'automatise cette tâche en 7 jours, en production le vendredi, ou je vous rembourse. Audit, roadmap et transfert de connaissance offerts. Je travaille seul : une semaine, un client.") +
    button('Réserver le Chrono 20 minutes →', CALENDLY) +
    p('En 20 minutes, je chronomètre la tâche avec vous et je vous dis si elle tient en 7 jours.', 'font-size:14px');
  const text = [
    "Voici votre résultat. Gardez-le : c'est votre point de départ le jour où vous voudrez mesurer ce qui a changé.",
    `Ce que la ressaisie vous coûte : ${c.hours} h / an, ${euro(c.cost)} / an (${c.weeks} semaines de travail à temps plein, base ${c.rate} €/h chargé).`,
    c.tasks.map((t) => `- ${t.name} : ${t.minutes} min ${FREQ[t.freq].label} × ${t.people} pers. = ${t.hours} h, ${euro(t.cost)} / an`).join('\n'),
    `Votre tâche la plus coûteuse : ${top.name}, ${top.hours} h et ${euro(top.cost)} par an.`,
    "C'est exactement ce que supprime La Semaine Sans Ressaisie : j'automatise cette tâche en 7 jours, en production le vendredi, ou je vous rembourse.",
    'Réservez le Chrono 20 minutes : ' + CALENDLY,
    'Répondez à cet email. Je lis tout.',
    'Florian',
    '--\nPour ne plus rien recevoir, répondez STOP.'
  ].join('\n\n');
  return {
    subject: `La ressaisie vous coûte ${c.hours} h par an`,
    html: layout({
      preheader: `${euro(c.cost)} par an · votre tâche la plus coûteuse : ${esc(top.name)}`,
      eyebrow: 'Calculateur · Combien vous coûte la ressaisie ?',
      title: 'Votre résultat',
      body
    }),
    text
  };
}

// ---------- Traitement du payload

const b = $input.first().json.body || {};
const elapsed = Number(b.elapsed_ms);
if (String(b.hp || '') !== '' || !Number.isFinite(elapsed) || elapsed < MIN_ELAPSED_MS) {
  return [{ json: { bot: true } }];
}
const lead = b.lead || {};
const email = String(lead.email || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('email invalide');
const form = FORMS[b.source];
if (!form) throw new Error('source inconnue: ' + b.source);

const values = { tags: [form.tag], source: [form.source] };

// Téléphone (diagnostic) : seulement s'il est propre, sinon Attio rejette toute la requête.
const phone = String(lead.phone || '').replace(/[\s.()-]/g, '');
if (/^(\+\d{10,15}|0\d{9})$/.test(phone)) {
  values.phone_numbers = [{ original_phone_number: phone, country_code: 'FR' }];
}

let mail;
let note = null;

if (b.source === 'ton-crm-tient-a-300') {
  const score = int(b.score, 0, 100);
  const reps = int(b.reps, 1, 1000);
  const hours = int(b.hours_lost_per_week, 0, 20);
  const d = {
    score, reps, hours,
    tier: tierFor(score),
    annual: reps * hours * WEEKS * LOADED,
    weekly: reps * hours * LOADED,
    gaps: (Array.isArray(b.top_gaps) ? b.top_gaps : []).filter((k) => GAPS[k]).slice(0, 3).map((k) => GAPS[k])
  };
  mail = diagnosticEmail(d);
  note = {
    title: `Diagnostic CRM 300 : ${score}/100 (${d.tier.name})`,
    content: [
      `Score : ${score}/100 · ${d.tier.name}`,
      `Commerciaux : ${reps} · Heures perdues : ${hours} h/sem/personne`,
      `Coût estimé : ${euro(d.annual)} / an (${euro(d.weekly)} / semaine)`,
      'Chantiers prioritaires : ' + d.gaps.map(([g]) => g).join(', '),
      phone ? `Téléphone saisi : ${lead.phone}` : 'Téléphone : non renseigné'
    ].join('\n')
  };
} else if (b.source === 'calculateur-ressaisie') {
  const rate = int(b.rate, 15, 200);
  const tasks = (Array.isArray(b.tasks) ? b.tasks : []).slice(0, 5).map((t, i) => {
    const freq = FREQ[t && t.freq] ? t.freq : 'semaine';
    const minutes = int(t && t.minutes, 1, 480);
    const people = int(t && t.people, 1, 200);
    const hours = Math.round(minutes / 60 * FREQ[freq].perYear * people);
    const name = String((t && t.name) || '').trim().slice(0, 80) || `Tâche ${i + 1}`;
    return { name, freq, minutes, people, hours, cost: hours * rate };
  });
  if (tasks.length === 0) throw new Error('aucune tâche');
  const top = tasks.reduce((a, t) => (t.hours > a.hours ? t : a), tasks[0]);
  top.top = true;
  const hours = tasks.reduce((n, t) => n + t.hours, 0);
  const c = { rate, tasks, hours, cost: hours * rate, weeks: Math.round(hours / 35) };
  mail = calculateurEmail(c);
  note = {
    title: `Calculateur ressaisie : ${hours} h/an (${euro(c.cost)})`,
    content: [
      `Total : ${hours} h/an · ${euro(c.cost)}/an (base ${rate} €/h)`,
      ...tasks.map((t) => `${t.top ? '★ ' : '- '}${t.name} : ${t.minutes} min ${FREQ[t.freq].label} × ${t.people} pers. = ${t.hours} h/an`)
    ].join('\n')
  };
} else {
  mail = newsletterEmail();
}

return [{ json: { bot: false, email, values, note, mail, skipWelcomeIfTagged: form.skipWelcomeIfTagged } }];
