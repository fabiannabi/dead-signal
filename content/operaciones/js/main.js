export const DATA_BASE = '../data/operaciones';

export async function fetchJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`fetch ${path} → ${r.status}`);
  return r.json();
}

export async function cargarDatos() {
  const b = DATA_BASE;
  const [archetypes, traits, names, ranks, eventos, named] = await Promise.all([
    fetchJSON(`${b}/agents/archetypes.json`),
    fetchJSON(`${b}/agents/traits.json`),
    fetchJSON(`${b}/agents/names.json`),
    fetchJSON(`${b}/org/ranks.json`),
    fetchJSON(`${b}/events/active-events.json`),
    fetchJSON(`${b}/agents/named-agents.json`),
  ]);
  return { archetypes, traits, names, ranks, eventos, named };
}

export async function cargarMisionData(id) {
  return fetchJSON(`${DATA_BASE}/missions/${id}.json`);
}

// Gramática procedural (site-templates por ahora; beats/tags/objetivos en fases posteriores)
export async function cargarSiteTemplates() {
  return fetchJSON(`${DATA_BASE}/missions/grammar/site-templates.json`);
}

export function getSession(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}

export function setSession(key, val) {
  sessionStorage.setItem(key, JSON.stringify(val));
}
