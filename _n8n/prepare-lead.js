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
  'newsletter': { tag: 'Newsletter RevOps', source: 'Inbound', skipWelcomeIfTagged: ['Newsletter RevOps', 'Diagnostic CRM 300', 'Diagnostic Ressaisie', 'Calculateur Ressaisie'] },
  'diagnostic-ressaisie': { tag: 'Diagnostic Ressaisie', source: 'Lead Magnet', skipWelcomeIfTagged: [] },
  'calculateur-ressaisie': { tag: 'Calculateur Ressaisie', source: 'Lead Magnet', skipWelcomeIfTagged: [] }
};

// Anti-bot : champ piège rempli, ou formulaire envoyé moins de 2,5 s après le chargement de la page.
const MIN_ELAPSED_MS = 2500;

// Questions, profils et calcul du diagnostic : bloc DIAG de diagnostic/index.html, injecté ici par
// build.mjs à la place de la ligne ci-dessous (une seule source, rien à garder synchro à la main).
// @@DIAG@@

const TONES = { green: '#3CC79A', amber: '#F1B24A', red: '#EF5D6F' };

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
    p("En attendant mardi, tu peux faire le diagnostic : 10 questions, ton profil, ce que la ressaisie te coûte et la fiche de poste de ton premier agent.") +
    button('Faire le diagnostic →', DIAGNOSTIC_URL) +
    p("Et une question pour démarrer : qu'est-ce qui te fait perdre le plus de temps dans ton CRM aujourd'hui ?");
  const text = [
    'Merci pour ton inscription.',
    "Chaque mardi, je t'envoie une idée RevOps tirée de mes chantiers : une intégration, un piège évité, une décision d'archi commerciale. Lisible en 3 minutes.",
    "Pour situer d'où je parle : 15 ans en software engineering, ex-CTO Tiime, ex-EM Aircall (j'y ai codé la sales tech depuis l'intérieur), ex-Teads. Aujourd'hui je fais scaler des CRM modernes comme Attio, Folk ou Close dans des scaleups B2B SaaS de 50 à 300 personnes.",
    'En attendant mardi, tu peux faire le diagnostic (10 questions, 3 minutes) : ' + DIAGNOSTIC_URL,
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
  const r = d.r;
  const label = (k, mt) => `<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.dim};margin:${mt || '8px'} 0 10px">${k}</div>`;
  const h3 = (t) => `<div style="font-family:${FONT};font-size:17px;font-weight:700;color:#FFFFFF;margin:24px 0 8px">${t}</div>`;
  const bars = r.axes.map((a) => {
    const tag = a.key === r.weakest.key && r.profileKey !== 'solide' ? 'Ton plafond' : a.level.name;
    return `<tr><td style="padding:0 0 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:${FONT};font-size:14px;font-weight:700;color:#FFFFFF">${a.label}</td>
<td align="right" style="font-family:${FONT};font-size:13px;color:${TONES[a.level.tone]};white-space:nowrap">${a.pct} % · ${tag}</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:5px"><tr>
<td width="${Math.max(a.pct, 3)}%" height="8" bgcolor="${TONES[a.level.tone]}" style="border-radius:4px;font-size:0;line-height:0">&nbsp;</td>
<td height="8" bgcolor="${C.line}" style="font-size:0;line-height:0">&nbsp;</td></tr></table>
</td></tr>`;
  }).join('');
  const mirrors = r.mirrors.map((m) =>
    `<tr><td style="padding:0 0 8px;font-family:${FONT};font-size:15px;line-height:1.55;color:#FFFFFF"><span style="color:${TONES.red}">■</span>&nbsp; ${m}</td></tr>`).join('');
  const prios = r.profile.prios.map((x, i) =>
    `<tr><td style="padding:0 0 14px">
<div style="font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;margin:0 0 4px"><span style="color:${C.accent}">${i + 1}.</span>&nbsp; ${x.t}</div>
<div style="font-family:${FONT};font-size:14px;line-height:1.55;color:${C.muted}">${x.d}</div>
</td></tr>`).join('');
  const recipeRow = (k, v) => `<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.accent};margin:12px 0 2px">${k}</div>
<div style="font-family:${FONT};font-size:14px;line-height:1.55;color:${C.muted}">${v}</div>`;
  const formula = `${r.people} ${r.people > 1 ? 'personnes' : 'personne'} × ${r.hours} h par semaine × ${DIAG.weeks} semaines × ${DIAG.loaded} €/h chargé`;

  const body =
    p(`${d.firstName ? esc(d.firstName) + ', voici' : 'Voici'} ton diagnostic. Garde-le : c'est ta base de comparaison le jour où tu voudras mesurer ce qui a bougé.`) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px;border:1px solid ${C.line};border-radius:10px">
<tr><td style="padding:22px;background:${C.ink};border-radius:10px">
<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.dim}">Ton profil</div>
<div style="font-family:${FONT};font-size:28px;font-weight:700;line-height:1.2;color:#FFFFFF;margin:6px 0 6px">${r.profile.name}</div>
<div style="font-family:${FONT};font-size:15px;font-weight:600;color:${C.accent};margin:0 0 18px">${r.profile.ceil}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${bars}</table>
<div style="font-family:${FONT};font-size:13px;color:${C.muted}">Score global : ${r.score} / 100</div>
</td></tr></table>` +
    h3('Ce qui te plafonne') + p(r.profile.ceilText) +
    h3('Où tu en es') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${mirrors}</table>` +
    p(`Ton point fort : <strong style="color:${TONES.green}">${r.strongest.label} (${r.strongest.pct} %)</strong>.`, 'font-size:14px') +
    label('Ce que la ressaisie te coûte', '16px') +
    `<div style="font-family:${FONT};font-size:30px;font-weight:700;color:${C.accent};margin:0 0 6px">${euro(r.annual)} / an</div>` +
    p(`${formula}. Soit ${euro(r.weekly)} chaque semaine, sans compter les deals perdus sur des données en retard.`, 'font-size:14px') +
    (fteLine(r) ? p(`<strong style="color:#FFFFFF">${fteLine(r)}</strong>`, 'font-size:14px') : '') +
    h3('Ce que ça te coûte de rester comme ça') + p(r.profile.cost) +
    p(`<strong style="color:#FFFFFF">Fais le calcul.</strong> ${r.profile.calc}`, `border-left:3px solid ${C.accent};padding-left:14px`) +
    h3('Tes 3 priorités') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${prios}</table>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border:1px solid ${C.line};border-radius:10px">
<tr><td style="padding:22px;background:${C.ink};border-radius:10px">
<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.accent}">La fiche de poste de ton premier agent</div>
<div style="font-family:${FONT};font-size:22px;font-weight:700;color:#FFFFFF;margin:8px 0 6px;line-height:1.25">${r.recette.name}</div>
${recipeRow('Il se déclenche quand', r.recette.trigger)}${recipeRow('Ce qu\'il fait', r.recette.actions)}${recipeRow('Ce qu\'il supprime', r.recette.removes)}
</td></tr></table>` +
    h3('Fais écrire sa fiche de poste par ton IA') +
    p("Copie le bloc ci-dessous dans ChatGPT ou Claude. Il te pose 5 questions sur tes outils, puis il écrit la fiche complète : données, règles, cas limites, tests. Il est déjà rempli avec tes réponses.", 'font-size:14px') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border:1px solid ${C.line};border-radius:10px">
<tr><td style="padding:18px;background:${C.ink2};border-radius:10px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted}">${esc(d.prompt).replace(/\n/g, '<br>')}</td></tr></table>` +
    (d.small
      ? p("Sous 50 personnes, mon Sprint n'est pas taillé pour ton équipe aujourd'hui : commence par la première priorité ci-dessus. Chaque mardi, la newsletter t'apporte un cas terrain pour avancer.")
      : (d.hiring ? p("Tu recrutes un RevOps : avant de publier l'offre, regarde lesquelles de ses tâches des agents peuvent reprendre.") : '') +
        p(OFFER_DIAG) +
        p("En 20 minutes, on regarde tes tâches Ops ligne par ligne et je te dis franchement lesquelles des agents peuvent reprendre.") +
        button('Envoie-moi ta fiche de poste · 20 min →', CALENDLY)) +
    p('Tu recevras aussi ma newsletter, une idée RevOps chaque mardi.', 'font-size:14px');

  const text = [
    `${d.firstName ? d.firstName + ', voici' : 'Voici'} ton diagnostic. Garde-le : c'est ta base de comparaison le jour où tu voudras mesurer ce qui a bougé.`,
    `Ton profil : ${r.profile.name}\n${r.profile.ceil}`,
    r.axes.map((a) => `- ${a.label} : ${a.pct} % (${a.key === r.weakest.key && r.profileKey !== 'solide' ? 'ton plafond' : a.level.name})`).join('\n') + `\nScore global : ${r.score} / 100`,
    `Ce qui te plafonne\n${r.profile.ceilText}`,
    'Où tu en es\n' + r.mirrors.map((m) => `- ${m}`).join('\n') + `\nTon point fort : ${r.strongest.label} (${r.strongest.pct} %).`,
    `Ce que la ressaisie te coûte : ${euro(r.annual)} / an (${formula}, soit ${euro(r.weekly)} par semaine).` + (fteLine(r) ? '\n' + fteLine(r) : ''),
    `Ce que ça te coûte de rester comme ça\n${r.profile.cost}\nFais le calcul. ${r.profile.calc}`,
    'Tes 3 priorités\n' + r.profile.prios.map((x, i) => `${i + 1}. ${x.t} : ${x.d}`).join('\n'),
    `La fiche de poste de ton premier agent : ${r.recette.name}\nIl se déclenche quand : ${r.recette.trigger}\nCe qu'il fait : ${r.recette.actions}\nCe qu'il supprime : ${r.recette.removes}`,
    `Fais écrire sa fiche de poste par ton IA : copie ce prompt dans ChatGPT ou Claude, il est déjà rempli avec tes réponses.\n\n${d.prompt}`,
    ...(d.small
      ? ["Sous 50 personnes, mon Sprint n'est pas taillé pour ton équipe aujourd'hui : commence par la première priorité ci-dessus."]
      : [(d.hiring ? "Tu recrutes un RevOps : avant de publier l'offre, regarde lesquelles de ses tâches des agents peuvent reprendre.\n\n" : '') + OFFER_DIAG,
         'Envoie-moi ta fiche de poste, 20 minutes : ' + CALENDLY]),
    'Réponds à cet email. Je lis tout.',
    'Florian',
    '--\nPour ne plus rien recevoir, réponds STOP.'
  ].join('\n\n');

  return {
    subject: `Ton diagnostic : ${r.profile.name}`,
    html: layout({
      preheader: `${r.profile.ceil} ${euro(r.annual)} par an en ressaisie, et la fiche de poste de ton premier agent.`,
      eyebrow: 'Diagnostic · Tes équipes saisissent tout deux fois ?',
      title: 'Ton diagnostic',
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
    p("Voici ton résultat. Garde-le : c'est ton point de départ le jour où tu voudras mesurer ce qui a changé.") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;border:1px solid ${C.line};border-radius:10px">
<tr><td style="padding:22px;background:${C.ink};border-radius:10px">
<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.dim}">Ce que la ressaisie te coûte</div>
<div style="font-family:${FONT};font-size:40px;font-weight:700;line-height:1.1;color:#FFFFFF;margin:6px 0 4px">${c.hours} h<span style="font-size:18px;color:${C.dim}"> / an</span></div>
<div style="font-family:${FONT};font-size:22px;font-weight:700;color:${C.accent}">${euro(c.cost)} / an</div>
<div style="font-family:${FONT};font-size:13px;color:${C.muted};margin-top:8px">Soit ${c.weeks} semaines de travail à temps plein. Base : ${c.rate} €/h chargé.</div>
</td></tr></table>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">${rows}</table>` +
    p(`Ta tâche la plus coûteuse : <strong style="color:#FFFFFF">${esc(top.name)}</strong>, ${top.hours} h et ${euro(top.cost)} par an.`) +
    p(OFFER_CALC) +
    button('Envoie-moi ta fiche de poste · 20 min →', CALENDLY) +
    p('En 20 minutes, on regarde tes tâches Ops ligne par ligne et je te dis lesquelles des agents peuvent reprendre.', 'font-size:14px');
  const text = [
    "Voici ton résultat. Garde-le : c'est ton point de départ le jour où tu voudras mesurer ce qui a changé.",
    `Ce que la ressaisie te coûte : ${c.hours} h / an, ${euro(c.cost)} / an (${c.weeks} semaines de travail à temps plein, base ${c.rate} €/h chargé).`,
    c.tasks.map((t) => `- ${t.name} : ${t.minutes} min ${FREQ[t.freq].label} × ${t.people} pers. = ${t.hours} h, ${euro(t.cost)} / an`).join('\n'),
    `Ta tâche la plus coûteuse : ${top.name}, ${top.hours} h et ${euro(top.cost)} par an.`,
    OFFER_CALC,
    'Envoie-moi ta fiche de poste, 20 minutes : ' + CALENDLY,
    'Réponds à cet email. Je lis tout.',
    'Florian',
    '--\nPour ne plus rien recevoir, réponds STOP.'
  ].join('\n\n');
  return {
    subject: `La ressaisie te coûte ${c.hours} h par an`,
    html: layout({
      preheader: `${euro(c.cost)} par an · ta tâche la plus coûteuse : ${esc(top.name)}`,
      eyebrow: 'Calculateur · Combien te coûte la ressaisie ?',
      title: 'Ton résultat',
      body
    }),
    text
  };
}

// ---------- Offre (Le Premier Agent, depuis le 2026-11-25) et question « Qui fait le travail Ops ? »
// OPS reprend les libellés de la page diagnostic (liste hors bloc DIAG) : changer les deux ensemble.
const OPS = {
  personne: 'Personne, quand on y pense',
  'a-cote': 'Le VP Sales ou un commercial, en plus de son poste',
  revops: 'Un RevOps ou Sales Ops en poste',
  recrute: 'On recrute un RevOps'
};
const OFFER_DIAG = "Tes 3 priorités, c'est l'étape 1 de la Méthode Fiche de Poste. La suite, c'est Le Premier Agent : en 7 jours, je décortique les tâches Ops de ton équipe, je mets un premier agent en production et je chiffre le reste. 2 000 € HT, crédités à 100 % sur le Sprint si tu signes sous 30 jours. Pas en production le vendredi : remboursé.";
const OFFER_CALC = "C'est souvent la première tâche qu'un agent reprend. Le Premier Agent : en 7 jours, je mets en production l'agent qui la supprime, je décortique tes autres tâches Ops et je chiffre la suite. 2 000 € HT, crédités à 100 % sur le Sprint si tu signes sous 30 jours. Pas en production le vendredi : remboursé.";
function fteLine(r) {
  const fte = r.people * r.hours / 35;
  if (!(fte > 0)) return '';
  if (fte < 1) return `Soit l'équivalent de ${Math.round(fte * 100)} % d'un poste à temps plein (base 35 h), payé à recopier.`;
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(fte);
  return fte >= 2 ? `Soit l'équivalent de ${n} postes à temps plein (base 35 h), payés à recopier.` : `Soit l'équivalent de ${n} poste à temps plein (base 35 h), payé à recopier.`;
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

let mail;
let note = null;

if (b.source === 'diagnostic-ressaisie') {
  // Tout est recalculé depuis les réponses brutes (points 0-3 par question, le reste ignoré).
  const raw = b.answers && typeof b.answers === 'object' ? b.answers : {};
  const answers = {};
  DIAG.questions.forEach((q) => { answers[q.id] = diagPts(raw[q.id]); });
  const r = diagCompute(answers, { people: b.people, hours: b.hours });
  const size = DIAG.sizes.find((x) => x.id === b.size);
  const crm = DIAG.crms.find((x) => x.id === b.crm);
  const firstName = String(lead.first_name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const small = !!size && (size.id === 'lt20' || size.id === '20-50');
  const ops = OPS[b.ops];
  mail = diagnosticEmail({ r, firstName, small, hiring: b.ops === 'recrute', prompt: diagPrompt(r, b.size, b.crm) });
  note = {
    title: `Diagnostic ressaisie : ${r.profile.name} (${r.score}/100)`,
    content: [
      `Profil : ${r.profile.name} · score ${r.score}/100`,
      'Axes : ' + r.axes.map((a) => `${a.label} ${a.pct} %`).join(' · '),
      `Taille : ${size ? size.label : 'non renseignée'}${size && (small || size.id === 'gt500') ? ' (hors cible 50-300)' : ''} · CRM : ${crm ? crm.label : 'non renseigné'}`,
      `Travail Ops : ${ops || 'non renseigné'}${b.ops === 'recrute' ? ' (signal : recrute un RevOps)' : ''}`,
      `Ressaisie : ${r.people} pers. × ${r.hours} h/sem = ${euro(r.annual)} / an (${euro(r.weekly)} / semaine)`,
      'Ses réponses les plus basses :\n' + r.mirrors.map((m) => `- ${m}`).join('\n'),
      `Premier agent proposé : ${r.recette.name}`,
      `Prénom saisi : ${firstName || 'aucun'}`
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
