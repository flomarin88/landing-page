// Assemble le workflow n8n « Calendly → Attio » à partir de prepare-booking.js et complete-person.js,
// puis exécute les deux Code nodes sur des payloads Calendly d'exemple. Lancé par build.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(dir, 'prepare-booking.js'), 'utf8');
const completeCode = readFileSync(join(dir, 'complete-person.js'), 'utf8');

const ATTIO_AUTH = { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' };
const PREP = "$('Prépare le rendez-vous').first().json";
const RECORD_ID = "$('Attio · Upsert person').first().json.data.id.record_id";
const attio = (name, position, method, url, jsonBody, extra = {}) => ({
  name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position, ...extra,
  parameters: { method, url, ...ATTIO_AUTH, sendBody: true, specifyBody: 'json', jsonBody, options: {} }
});

const nodes = [
  {
    // Crée l'abonnement webhook Calendly à l'activation du workflow (compte Calendly payant requis).
    name: 'Calendly', type: 'n8n-nodes-base.calendlyTrigger', typeVersion: 1, position: [0, 0],
    parameters: { scope: 'user', events: ['invitee.created', 'invitee.canceled'] }
  },
  {
    name: 'Prépare le rendez-vous', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 0],
    parameters: { jsCode: code }
  },
  attio('Attio · Upsert person', [440, 0], 'PUT',
    'https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses',
    '={{ JSON.stringify({ data: { values: { email_addresses: [$json.email] } } }) }}'),
  {
    name: 'Nom à compléter', type: 'n8n-nodes-base.code', typeVersion: 2, position: [660, -160],
    parameters: { jsCode: completeCode }
  },
  attio('Attio · Ajoute le nom', [880, -160], 'PATCH',
    `=https://api.attio.com/v2/objects/people/records/{{ ${RECORD_ID} }}`,
    '={{ JSON.stringify({ data: { values: $json.values } }) }}', { onError: 'continueRegularOutput' }),
  attio('Attio · Note rendez-vous', [660, 0], 'POST', 'https://api.attio.com/v2/notes',
    `={{ JSON.stringify({ data: { parent_object: 'people', parent_record_id: ${RECORD_ID}, title: ${PREP}.note.title, format: 'plaintext', content: ${PREP}.note.content } }) }}`),
  {
    name: 'Réservation ?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [880, 0],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'is-created', leftValue: `={{ ${PREP}.task !== null }}`, rightValue: true,
          operator: { type: 'boolean', operation: 'true', singleValue: true }
        }],
        combinator: 'and'
      },
      options: {}
    }
  },
  attio('Attio · Tâche préparer le Chrono', [1100, -80], 'POST', 'https://api.attio.com/v2/tasks',
    `={{ JSON.stringify({ data: { content: ${PREP}.task.content, format: 'plaintext', deadline_at: ${PREP}.task.deadline_at, is_completed: false, linked_records: [{ target_object: 'people', target_record_id: ${RECORD_ID} }], assignees: [] } }) }}`)
];

const link = (to) => ({ node: to, type: 'main', index: 0 });
const workflow = {
  name: 'Calendly → Attio : fiche, note et tâche de préparation du Chrono',
  nodes,
  connections: {
    'Calendly': { main: [[link('Prépare le rendez-vous')]] },
    'Prépare le rendez-vous': { main: [[link('Attio · Upsert person')]] },
    'Attio · Upsert person': { main: [[link('Nom à compléter'), link('Attio · Note rendez-vous')]] },
    'Nom à compléter': { main: [[link('Attio · Ajoute le nom')]] },
    'Attio · Note rendez-vous': { main: [[link('Réservation ?')]] },
    'Réservation ?': { main: [[link('Attio · Tâche préparer le Chrono')], []] }
  },
  settings: { executionOrder: 'v1' }
};
writeFileSync(join(dir, 'calendly-attio-workflow.json'), JSON.stringify(workflow, null, 2));

// ---------- Exécution locale des Code nodes
const run = (body) => {
  const out = new Function('$input', code)({ first: () => ({ json: body }) });
  return out.length ? out[0].json : null;
};
const complete = (prep, currentName) => new Function('$', completeCode)((node) => ({
  first: () => ({ json: node === 'Prépare le rendez-vous' ? prep : { data: { values: { name: currentName ? [{ full_name: currentName }] : [] } } } })
}));

const inDays = (d, h = 10) => { const t = new Date(); t.setUTCDate(t.getUTCDate() + d); t.setUTCHours(h, 0, 0, 0); return t.toISOString(); };
const created = (over = {}) => ({
  event: 'invitee.created',
  payload: {
    email: ' Jane.Doe@Scaleup.io ', name: 'Jane Doe', first_name: null, last_name: null, timezone: 'Europe/Brussels',
    rescheduled: false, reschedule_url: 'https://calendly.com/reschedulings/abc',
    questions_and_answers: [
      { question: 'Quelle tâche ton équipe refait le plus à la main ?', answer: 'Recopier les deals gagnés dans Pennylane\u0007' },
      { question: 'Taille de l\'équipe revenue', answer: '' }
    ],
    tracking: { utm_source: 'linkedin', utm_medium: null, utm_campaign: 'video-2', utm_content: 'hero' },
    scheduled_event: { name: 'Chrono 20 minutes', start_time: inDays(3), location: { type: 'google_conference', join_url: 'https://meet.google.com/abc-defg-hij' } },
    ...over
  }
});

const out = (label, v) => console.log(label.padEnd(30), JSON.stringify(v));
const a = run(created());
out('réservation kind/email', [a.kind, a.email, a.company]);
out('réservation name', a.name);
out('réservation note title', a.note.title);
console.log(a.note.content.split('\n').map((l) => '    | ' + l).join('\n'));
out('tâche 2 h avant', (new Date(inDays(3)) - new Date(a.task.deadline_at)) / 3600e3);
out('caractère de contrôle retiré', !a.note.content.includes('\u0007'));
out('réponse vide ignorée', !a.note.content.includes('Taille de'));

const soon = new Date(Date.now() + 30 * 60e3).toISOString();
const b = run(created({ scheduled_event: { name: 'Chrono 20 minutes', start_time: soon } }));
out('réservation dans 30 min', [b.task.deadline_at >= new Date(Date.now() - 5e3).toISOString(), b.task.deadline_at <= soon]);
out('gmail : pas de société', run(created({ email: 'jean@gmail.com', name: '', first_name: 'Jean', last_name: 'Martin' })).company);
out('prénom + nom séparés', run(created({ name: null, first_name: 'Jean', last_name: 'Martin' })).name);
out('sans nom', run(created({ name: '' })).name);

const c = run({ event: 'invitee.canceled', payload: { ...created().payload, cancellation: { canceled_by: 'Jane Doe', reason: 'Conflit d\'agenda' } } });
out('annulation', [c.kind, c.note.title.split(' · ')[0], c.task]);
const r = run({ event: 'invitee.canceled', payload: { ...created().payload, rescheduled: true } });
out('déplacement', [r.kind, r.note.title.split(' · ')[0], r.task]);

out('autre type d\'événement', run(created({ scheduled_event: { name: 'Dîner famille', start_time: inDays(1) } })));
out('autre webhook', run({ event: 'routing_form_submission.created', payload: {} }));
for (const bad of [created({ email: 'pas-un-email' }), created({ scheduled_event: { name: 'Chrono 20 minutes' } })]) {
  try { run(bad); out('SHOULD HAVE FAILED', bad.payload.email); } catch (e) { out('rejeté', e.message); }
}

out('nom : fiche vide → ajouté', complete(a, null));
out('nom : fiche déjà nommée → rien', complete(a, 'Jane Doe (Groovin)').length);
out('nom : Calendly sans nom → rien', complete({ ...a, name: null }, null).length);
out('tirets cadratins', /—/.test(JSON.stringify([a, b, c, r])));
