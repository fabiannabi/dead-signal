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

// Gramática completa para el generador de misiones
export async function cargarGramatica() {
  const g = `${DATA_BASE}/missions/grammar`;
  const [beats, creatureTags, objectiveTemplates, siteTemplates] = await Promise.all([
    fetchJSON(`${g}/beats.json`),
    fetchJSON(`${g}/creature-tags.json`),
    fetchJSON(`${g}/objective-templates.json`),
    fetchJSON(`${g}/site-templates.json`),
  ]);
  return { beats, creatureTags, objectiveTemplates, siteTemplates };
}

// Hash determinístico de string → entero (para seeds estables por evento)
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function getSession(key) {
  try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}

export function setSession(key, val) {
  sessionStorage.setItem(key, JSON.stringify(val));
}
