// n8n Code node « Prépare l'alerte » du workflow « Error notifications » : lit la sortie de l'Error Trigger
// et prépare un email (sujet, texte, HTML). Générique : il sert à tout workflow qui le déclare comme
// « Error workflow » dans ses réglages. Deux formes possibles en entrée :
// - une exécution qui a échoué : { execution: { id, url, error, lastNodeExecuted, mode, retryOf }, workflow }
// - le déclencheur lui-même qui a échoué (pas d'exécution) : { trigger: { error, mode }, workflow }

const TZ = 'Europe/Paris';
const STACK_LINES = 12;

const clean = (v, max = 2000) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max);
const esc = (v) => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const when = (t) => {
  const d = new Date(t);
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, dateStyle: 'full', timeStyle: 'medium' }).format(isNaN(d) ? new Date() : d);
};

const d = $input.first().json || {};
const workflow = d.workflow || {};
const execution = d.execution || null;
const trigger = d.trigger || null;
const error = (execution && execution.error) || (trigger && trigger.error) || {};

const wfName = clean(workflow.name, 200) || 'Workflow sans nom';
const node = clean((error.node && error.node.name) || (execution && execution.lastNodeExecuted), 200) || (trigger ? 'Déclencheur' : 'inconnu');
const message = clean(error.message, 1000) || 'Erreur sans message';
const description = clean(error.description, 1000);
const mode = clean((execution && execution.mode) || (trigger && trigger.mode), 50);
const url = /^https?:\/\//.test(String(execution && execution.url || '')) ? clean(execution.url, 500) : '';
const stack = clean(error.stack, 4000).split('\n').slice(0, STACK_LINES).join('\n');

const rows = [
  ['Workflow', wfName + (workflow.id ? ` (id ${clean(workflow.id, 50)})` : '')],
  ['Nœud', node],
  ['Quand', when(error.timestamp || Date.now())],
  ['Mode', mode],
  ['Exécution', execution && execution.id ? clean(execution.id, 50) + (execution.retryOf ? ` (relance de ${clean(execution.retryOf, 50)})` : '') : (trigger ? 'aucune : le déclencheur a échoué' : '')],
].filter(([, v]) => v);

const subject = `[n8n] ${wfName} : échec sur « ${node} »`.slice(0, 200);

const text = [
  `${wfName} a échoué.`,
  `Erreur : ${message}` + (description ? `\n${description}` : ''),
  rows.map(([k, v]) => `${k} : ${v}`).join('\n'),
  url ? `Ouvrir l'exécution : ${url}` : "Pas de lien vers l'exécution (exécutions non enregistrées, ou déclencheur en échec).",
  stack ? `Stack :\n${stack}` : '',
].filter(Boolean).join('\n\n');

const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";
const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:24px;background:#1C1C1C;font-family:${FONT};color:#FFFFFF">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;background:#262626;border:1px solid #333333;border-radius:10px">
<tr><td style="padding:24px">
<div style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#FF7A00">Échec n8n</div>
<div style="font-size:20px;font-weight:700;margin:6px 0 14px">${esc(wfName)}</div>
<div style="font-size:15px;line-height:1.55;color:#FFFFFF;border-left:3px solid #FF7A00;padding-left:12px;margin:0 0 18px">${esc(message)}${description ? `<div style="color:#B8B8B8;font-size:14px;margin-top:6px">${esc(description)}</div>` : ''}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.5;margin:0 0 18px">
${rows.map(([k, v]) => `<tr><td style="color:#6B6B6B;padding:2px 16px 2px 0;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="color:#B8B8B8">${esc(v)}</td></tr>`).join('\n')}
</table>
${url ? `<a href="${esc(url)}" style="display:inline-block;background:#FF7A00;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px">Ouvrir l'exécution</a>` : `<div style="font-size:13px;color:#6B6B6B">Pas de lien vers l'exécution (exécutions non enregistrées, ou déclencheur en échec).</div>`}
${stack ? `<pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.5;color:#B8B8B8;background:#1C1C1C;border-radius:8px;padding:12px;margin:18px 0 0">${esc(stack)}</pre>` : ''}
</td></tr></table></body></html>`;

return [{ json: { subject, text, html } }];
