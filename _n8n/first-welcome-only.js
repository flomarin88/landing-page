// n8n Code node « Premier email seulement » : lit les tags que la personne avait dans Attio AVANT
// ce formulaire (réponse de l'upsert, qui n'écrit que l'email) et arrête la branche si un des tags
// de skipWelcomeIfTagged y est déjà. Zéro item en sortie = l'email de bienvenue ne part pas.

const lead = $('Prepare lead').first().json;
const tags = ($('Attio · Upsert person').first().json.data.values.tags || [])
  .map((t) => t.option && t.option.title);

if (tags.some((title) => lead.skipWelcomeIfTagged.includes(title))) return [];
return [{ json: { email: lead.email } }];
