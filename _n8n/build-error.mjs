// Assemble le workflow n8n « Error notifications » à partir de format-error.js, puis exécute le Code node
// sur des sorties d'Error Trigger d'exemple. Lancé par build.mjs.
// Usage dans n8n : dans les réglages de chaque workflow, « Error workflow » = Error notifications.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slackPost, ALERT_CHANNEL } from './build-slack.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(dir, 'format-error.js'), 'utf8');
const ALERT_TO = 'contact@florianmarin.me';

const workflow = {
  name: 'Error notifications',
  nodes: [
    {
      // Pas besoin d'activer ce workflow : n8n l'appelle quand un workflow qui le désigne échoue en production.
      name: 'Error Trigger', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {}
    },
    {
      name: "Prépare l'alerte", type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 0],
      parameters: { jsCode: code }
    },
    {
      // Même compte SMTP que l'email de bienvenue (credential choisi dans n8n à l'import).
      name: 'Email alerte', type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, position: [440, 0],
      parameters: {
        fromEmail: `n8n florianmarin.me <${ALERT_TO}>`,
        toEmail: ALERT_TO,
        subject: '={{ $json.subject }}',
        emailFormat: 'both',
        text: '={{ $json.text }}',
        html: '={{ $json.html }}',
        options: { appendAttribution: false }
      }
    },
    // Slack en direct (pas via le sous-workflow « Slack notification ») : si Slack tombe, pas de boucle
    // d'alertes, et l'email part quand même (onError).
    slackPost('Slack alerte', [440, 200], ALERT_CHANNEL, { onError: 'continueRegularOutput' })
  ],
  connections: {
    'Error Trigger': { main: [[{ node: "Prépare l'alerte", type: 'main', index: 0 }]] },
    "Prépare l'alerte": { main: [[{ node: 'Email alerte', type: 'main', index: 0 }, { node: 'Slack alerte', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1' }
};
writeFileSync(join(dir, 'error-notifications-workflow.json'), JSON.stringify(workflow, null, 2));

// ---------- Exécution locale du Code node
const run = (json) => new Function('$input', code)({ first: () => ({ json }) })[0].json;
const out = (label, v) => console.log(label.padEnd(28), JSON.stringify(v));

const execFail = run({
  execution: {
    id: '231', url: 'https://n8n.florianmarin.me/workflow/abc/executions/231', retryOf: '230', mode: 'webhook',
    lastNodeExecuted: 'Attio · Tag + source',
    error: {
      message: 'Bad request - please check your parameters', description: 'Option "Calculateur <Ressaisie>" introuvable',
      node: { name: 'Attio · Tag + source' }, timestamp: Date.UTC(2026, 10, 27, 9, 30),
      stack: 'NodeApiError: Bad request\n' + Array.from({ length: 30 }, (_, i) => `    at frame${i}`).join('\n')
    }
  },
  workflow: { id: 'abc', name: 'Lead capture florianmarin.me → Attio + email de bienvenue' }
});
writeFileSync(join(dir, 'preview-error.html'), execFail.html);
out('exécution : sujet', execFail.subject);
out('exécution : lien', execFail.text.includes('/executions/231'));
out('exécution : relance', execFail.text.includes('relance de 230'));
out('exécution : stack coupée', execFail.text.split('\n').filter((l) => l.includes('at frame')).length);
out('exécution : html échappé', !execFail.html.includes('<Ressaisie>') && execFail.html.includes('&lt;Ressaisie&gt;'));

const trigFail = run({
  trigger: { mode: 'trigger', error: { message: 'Calendly : webhook subscription failed', name: 'NodeOperationError' } },
  workflow: { id: 'cal', name: 'Calendly → Attio' }
});
out('déclencheur : sujet', trigFail.subject);
out('déclencheur : sans lien', !trigFail.html.includes('href='));

const empty = run({});
out('entrée vide : sujet', empty.subject);
out('url non http ignorée', !run({ execution: { url: 'javascript:alert(1)', error: { message: 'x' } }, workflow: { name: 'W' } }).html.includes('javascript:'));
out('tirets cadratins', /—|&mdash;/.test(execFail.html + execFail.text + trigFail.text + empty.text + code));
console.log('slack exécution\n' + execFail.slack.split('\n').map((l) => '    | ' + l).join('\n'));
out('slack déclencheur', trigFail.slack);
out('slack : < échappé', execFail.slack.includes('&lt;Ressaisie&gt;'));
out('slack : url non http absente', !run({ execution: { url: 'javascript:x', error: { message: 'x' } }, workflow: { name: 'W' } }).slack.includes('javascript'));
