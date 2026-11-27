// Sous-workflow n8n « Slack notification » : reçoit { text } (mrkdwn) et le poste dans un canal Slack.
// Les workflows métier l'appellent via slackCall() sans attendre la fin : une panne Slack ne casse ni
// la capture de lead ni le workflow Calendly. Lancé par build.mjs.
// Dans n8n : choisir le credential Slack sur le nœud « Slack », puis, dans les réglages de ce sous-workflow,
// « Error workflow » = Error notifications (pas de boucle : l'alerte d'erreur poste sur Slack sans passer par ici).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
export const SLACK_WORKFLOW = 'Slack notification';
// Canaux par défaut, modifiables dans n8n (le bot Slack doit être invité dans le canal).
export const SLACK_CHANNEL = '#leads';
export const ALERT_CHANNEL = '#alertes-n8n';

// Nœud Slack « poster un message » (utilisé par le sous-workflow et, en direct, par Error notifications).
export const slackPost = (name, position, channel, extra = {}) => ({
  name, type: 'n8n-nodes-base.slack', typeVersion: 2.3, position, ...extra,
  parameters: {
    select: 'channel',
    channelId: { __rl: true, mode: 'name', value: channel },
    messageType: 'text',
    text: '={{ $json.text }}',
    otherOptions: { includeLinkToWorkflow: false, mrkdwn: true, unfurl_links: false }
  }
});

// Nœud « Execute Workflow » qui appelle le sous-workflow avec text = textExpr (expression n8n sans « = »).
// Le sous-workflow est à sélectionner dans la liste après import (son id n'existe qu'une fois importé).
export const slackCall = (name, position, textExpr) => ({
  name, type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position, onError: 'continueRegularOutput',
  parameters: {
    source: 'database',
    workflowId: { __rl: true, mode: 'list', value: '', cachedResultName: SLACK_WORKFLOW },
    workflowInputs: {
      mappingMode: 'defineBelow',
      value: { text: `={{ ${textExpr} }}` },
      matchingColumns: [],
      schema: [{ id: 'text', displayName: 'text', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' }],
      attemptToConvertTypes: false,
      convertFieldsToString: true
    },
    options: { waitForSubWorkflow: false }
  }
});

const workflow = {
  name: SLACK_WORKFLOW,
  nodes: [
    {
      name: 'Appelé par un workflow', type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1.1, position: [0, 0],
      parameters: { inputSource: 'workflowInputs', workflowInputs: { values: [{ name: 'text' }] } }
    },
    slackPost('Slack', [220, 0], SLACK_CHANNEL)
  ],
  connections: {
    'Appelé par un workflow': { main: [[{ node: 'Slack', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1' }
};
writeFileSync(join(dir, 'slack-notification-workflow.json'), JSON.stringify(workflow, null, 2));
