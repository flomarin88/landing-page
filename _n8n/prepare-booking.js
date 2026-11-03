// n8n Code node « Prépare le rendez-vous » : lit le webhook Calendly (invitee.created ou
// invitee.canceled) et prépare ce qu'il faut écrire dans Attio : l'email de la personne, son nom,
// une note (créneau, réponses au formulaire, provenance) et, pour une réservation, une tâche
// « Préparer le Chrono » avant l'heure du rendez-vous. Zéro item en sortie = événement ignoré.

// Types d'événements Calendly traités, testés sur le nom de l'événement. Les autres sont ignorés.
const KEEP_EVENT = /chrono|revops|sprint/i;
// La tâche de préparation tombe 2 h avant le rendez-vous (ou à l'heure du rendez-vous si on réserve à la dernière minute).
const PREP_HOURS_BEFORE = 2;
const TZ = 'Europe/Paris';
// Domaines grand public : pas de « société » à déduire de l'email.
const FREE_MAIL = new Set(['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'live.fr', 'live.com', 'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'orange.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'wanadoo.fr', 'proton.me', 'protonmail.com', 'gmx.fr', 'bluewin.ch', 'skynet.be']);

const clean = (v, max = 500) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const when = (iso) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const body = $input.first().json;
const event = body.event;
if (event !== 'invitee.created' && event !== 'invitee.canceled') return [];

const p = body.payload || {};
const ev = p.scheduled_event || {};
const eventName = clean(ev.name, 120);
if (!KEEP_EVENT.test(eventName)) return [];

const email = clean(p.email, 254).toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Calendly : email de l\'invité invalide');
const start = new Date(ev.start_time);
if (isNaN(start)) throw new Error('Calendly : start_time manquant ou invalide');

// Nom : Calendly envoie first_name/last_name si le formulaire les demande, sinon seulement name.
let first = clean(p.first_name, 100);
let last = clean(p.last_name, 100);
const full = clean(p.name, 200) || [first, last].filter(Boolean).join(' ');
if (!first && !last && full) {
  const parts = full.split(/\s+/);
  first = parts.shift();
  last = parts.join(' ');
}
const name = full ? { first_name: first, last_name: last, full_name: full } : null;

const domain = email.split('@')[1];
const company = FREE_MAIL.has(domain) ? null : domain;
const slot = when(start.toISOString());
const who = full ? `${full} <${email}>` : email;

let kind = 'created';
if (event === 'invitee.canceled') kind = p.rescheduled ? 'rescheduled' : 'canceled';

const lines = [];
if (kind === 'created') {
  lines.push(`${eventName} · ${slot} (heure de Paris)`);
  lines.push(`Invité : ${who}`);
  if (company) lines.push(`Société (domaine de l'email) : ${company}`);
  const join = ev.location && clean(ev.location.join_url, 300);
  if (join) lines.push(`Visio : ${join}`);
  if (p.timezone && p.timezone !== TZ) lines.push(`Fuseau de l'invité : ${clean(p.timezone, 60)}`);
  const answers = (Array.isArray(p.questions_and_answers) ? p.questions_and_answers : [])
    .filter((qa) => qa && clean(qa.answer))
    .map((qa) => `- ${clean(qa.question, 200)} : ${clean(qa.answer, 2000)}`);
  if (answers.length) lines.push('', 'Réponses au formulaire', ...answers);
  const t = p.tracking || {};
  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .filter((k) => clean(t[k])).map((k) => `${k}=${clean(t[k], 100)}`);
  if (utm.length) lines.push('', `Provenance : ${utm.join(' · ')}`);
  if (p.reschedule_url) lines.push('', `Déplacer : ${clean(p.reschedule_url, 300)}`);
} else {
  const c = p.cancellation || {};
  lines.push(`Créneau ${kind === 'rescheduled' ? 'libéré' : 'annulé'} : ${slot} (heure de Paris)`);
  lines.push(`Invité : ${who}`);
  if (kind === 'rescheduled') lines.push('Le nouveau créneau arrive dans une note « Chrono réservé » séparée.');
  else {
    if (c.canceled_by) lines.push(`Annulé par : ${clean(c.canceled_by, 200)}`);
    if (c.reason) lines.push(`Raison : ${clean(c.reason, 1000)}`);
  }
  lines.push('', 'Pense à fermer la tâche « Préparer le Chrono » de ce créneau.');
}

const titles = { created: 'Chrono réservé', canceled: 'Chrono annulé', rescheduled: 'Chrono déplacé' };
const note = { title: `${titles[kind]} · ${slot}`, content: lines.join('\n') };

let task = null;
if (kind === 'created') {
  const prepAt = new Date(Math.max(start.getTime() - PREP_HOURS_BEFORE * 3600e3, Math.min(Date.now(), start.getTime())));
  task = {
    content: `Préparer le Chrono avec ${full || email} (${slot}) : relire la fiche, les signaux, les derniers DM et les comptes rendus, noter 3 questions.`,
    deadline_at: prepAt.toISOString()
  };
}

return [{ json: { kind, email, name, company, note, task } }];
