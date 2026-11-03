// n8n Code node « Nom à compléter » : l'upsert Attio n'écrit que l'email. Le nom saisi dans Calendly
// n'est ajouté que si la fiche n'en a pas déjà un (Groovin ou une saisie manuelle priment).
// Zéro item en sortie = rien à compléter, la branche s'arrête là.

const prep = $('Prépare le rendez-vous').first().json;
const current = ($('Attio · Upsert person').first().json.data.values.name || [])[0];

if (!prep.name || (current && current.full_name)) return [];
return [{ json: { values: { name: [prep.name] } } }];
