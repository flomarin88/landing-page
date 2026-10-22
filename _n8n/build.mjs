// Assemble le workflow n8n à partir de prepare-lead.js, puis exécute le Code node sur des payloads
// d'exemple pour produire des aperçus HTML et vérifier les cas d'erreur.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(dir, 'prepare-lead.js'), 'utf8');

const ATTIO_AUTH = { authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth' };
const PREP = "$('Prepare lead').first().json";
const RECORD_ID = "$('Attio · Upsert person').first().json.data.id.record_id";

const nodes = [
  {
    name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: 'lead-capture',
    parameters: {
      httpMethod: 'POST', path: 'lead-capture', responseMode: 'responseNode',
      options: { allowedOrigins: 'https://florianmarin.me,https://www.florianmarin.me' }
    }
  },
  {
    name: 'Prepare lead', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 0],
    parameters: { jsCode: code }
  },
  {
    name: 'Attio · Upsert person', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [440, 0],
    parameters: {
      method: 'PUT', url: 'https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses', ...ATTIO_AUTH,
      sendBody: true, specifyBody: 'json',
      jsonBody: '={{ JSON.stringify({ data: { values: { email_addresses: [$json.email] } } }) }}', options: {}
    }
  },
  {
    name: 'Attio · Tag + source', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [660, 0],
    parameters: {
      method: 'PATCH', url: `=https://api.attio.com/v2/objects/people/records/{{ ${RECORD_ID} }}`, ...ATTIO_AUTH,
      sendBody: true, specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({ data: { values: ${PREP}.values } }) }}`, options: {}
    }
  },
  {
    name: 'Diagnostic ?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [880, 0],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'has-note', leftValue: `={{ ${PREP}.note !== null }}`, rightValue: true,
          operator: { type: 'boolean', operation: 'true', singleValue: true }
        }],
        combinator: 'and'
      },
      options: {}
    }
  },
  {
    name: 'Attio · Note diagnostic', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1100, -120],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST', url: 'https://api.attio.com/v2/notes', ...ATTIO_AUTH,
      sendBody: true, specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({ data: { parent_object: 'people', parent_record_id: ${RECORD_ID}, title: ${PREP}.note.title, format: 'plaintext', content: ${PREP}.note.content } }) }}`,
      options: {}
    }
  },
  {
    name: 'Réponse au site', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, position: [1320, 0],
    parameters: { respondWith: 'json', responseBody: '={{ { "ok": true } }}', options: {} }
  },
  {
    name: 'Email de bienvenue', type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, position: [1540, 0],
    parameters: {
      fromEmail: 'Florian Marin <contact@florianmarin.me>',
      toEmail: `={{ ${PREP}.email }}`,
      subject: `={{ ${PREP}.mail.subject }}`,
      emailFormat: 'both',
      text: `={{ ${PREP}.mail.text }}`,
      html: `={{ ${PREP}.mail.html }}`,
      options: { appendAttribution: false, replyTo: 'contact@florianmarin.me' }
    }
  }
];

const link = (to, index = 0) => ({ node: to, type: 'main', index });
const workflow = {
  name: 'Lead capture florianmarin.me → Attio + email de bienvenue',
  nodes,
  connections: {
    'Webhook': { main: [[link('Prepare lead')]] },
    'Prepare lead': { main: [[link('Attio · Upsert person')]] },
    'Attio · Upsert person': { main: [[link('Attio · Tag + source')]] },
    'Attio · Tag + source': { main: [[link('Diagnostic ?')]] },
    'Diagnostic ?': { main: [[link('Attio · Note diagnostic')], [link('Réponse au site')]] },
    'Attio · Note diagnostic': { main: [[link('Réponse au site')]] },
    'Réponse au site': { main: [[link('Email de bienvenue')]] }
  },
  settings: { executionOrder: 'v1' }
};
writeFileSync(join(dir, 'lead-capture-workflow.json'), JSON.stringify(workflow, null, 2));

// ---------- Exécution locale du Code node
const run = (body) => new Function('$input', code)({ first: () => ({ json: { body } }) })[0].json;

const news = run({ source: 'newsletter', location: 'hero', lead: { email: ' Jane@Scaleup.io ', consent: true } });
const diag = run({
  source: 'ton-crm-tient-a-300', lead: { email: 'cro@scaleup.fr', phone: '06 12 34 56 78', consent: true },
  score: 42, tier: 'ignored', reps: 12, hours_lost_per_week: 6, top_gaps: ['revenue', 'report', '<script>', 'quality']
});
writeFileSync(join(dir, 'preview-newsletter.html'), news.mail.html);
writeFileSync(join(dir, 'preview-diagnostic.html'), diag.mail.html);

const out = (label, v) => console.log(label.padEnd(28), JSON.stringify(v));
out('newsletter email/values', [news.email, news.values, news.note]);
out('newsletter subject', news.mail.subject);
out('diagnostic values', diag.values);
out('diagnostic subject', diag.mail.subject);
out('diagnostic note', diag.note);
out('html contains <script>', diag.mail.html.includes('<script>'));
out('em dashes (—) in emails', /—/.test(news.mail.html + news.mail.text + diag.mail.html + diag.mail.text));
for (const bad of [
  { source: 'newsletter', lead: { email: 'nope' } },
  { source: 'autre', lead: { email: 'a@b.fr' } },
  {}
]) {
  try { run(bad); out('SHOULD HAVE FAILED', bad); } catch (e) { out('rejected', e.message); }
}
out('low score tier', run({ source: 'ton-crm-tient-a-300', lead: { email: 'a@b.fr' }, score: 'abc', reps: -3, hours_lost_per_week: 99 }).note.title);
