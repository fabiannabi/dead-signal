import { cargarRosterBase, getSession, setSession, cargarGramatica } from './main.js';
import { perfilCompleto } from './roster-store.js';

// Orden de capacidades — se usa solo para el ajuste de protocolo (fallback sin clave).
const STATS_ORDEN = ['físico', 'técnico', 'biológico', 'sigilo', 'mental', 'liderazgo'];

let agentes = [];        // roster base desplegable (sin bajas)
let perfiles = {};       // id → perfil persistente (cordura del cuartel)
let claveStats = [];     // capacidades clave de la misión (creature-tags)
let seleccionados = [];  // unidad ASIGNADA por el sistema (no seleccionada por el jugador)
let liderId = null;      // líder ASIGNADO

// Disponible/desplegable: fuera del cuartel por baja o recuperación no cuenta.
const seleccionable = (id) => perfiles[id] && perfiles[id].estado !== 'recuperacion';

async function init() {
  const evento = getSession('op_evento');
  if (!evento) { window.location.href = './index.html'; return; }

  document.getElementById('op-ev-id').textContent = evento.id;
  document.getElementById('mc-op').textContent    = evento.mision_asociada;
  document.getElementById('mc-obj').textContent   = evento.criatura_sospechada.replace(/_/g, ' ');
  document.getElementById('mc-ubic').textContent  = evento.ubicacion_descrita.slice(0, 60) + '…';
  document.getElementById('mc-nivel').textContent = `AMENAZA ${evento.nivel_amenaza_estimado}`;

  // Capacidades clave de la misión = stats que la criatura chequea. Definen el
  // ajuste de protocolo con que el sistema arma la unidad (no visible al jugador).
  try {
    const g = await cargarGramatica();
    const ct = g.creatureTags[evento.criatura_sospechada];
    if (ct) {
      claveStats = [...new Set([ct.stat_aproximacion, ct.stat_busqueda, ct.stat_accion].filter(Boolean))];
    }
  } catch { /* sin gramática → ajuste por competencia general */ }
  document.getElementById('mc-perfil').textContent = claveStats.length ? claveStats.join(' · ') : 'estándar';

  const { base } = await cargarRosterBase();
  perfiles = Object.fromEntries(base.map(a => [a.id, perfilCompleto(a)]));
  agentes = base.filter(a => perfiles[a.id].estado !== 'baja');

  autoEnsamblar();
  renderUnidad();
}

// ── Auto-armado de la unidad (§1.1) ─────────────────────────────────────────
// El jugador es despachador: NO elige a dedo. La institución asigna por
// disponibilidad y ajuste de protocolo (las capacidades que la misión chequea).
// Determinista: mismo evento + mismo roster ⇒ misma unidad. No escogiste al que
// mandas, y no ves su expediente hasta que el reporte vuelve: por eso la baja pega.
const TAM_UNIDAD = 3;

function ajusteProtocolo(a) {
  const keys = claveStats.length ? claveStats : STATS_ORDEN;
  return keys.reduce((s, k) => s + (a.stats[k] || 0), 0);
}

function autoEnsamblar() {
  const disponibles = agentes.filter(a => seleccionable(a.id));
  // Orden estable: mejor ajuste de protocolo, desempate por capacidad pico, luego id.
  const ordenados = [...disponibles].sort((x, y) =>
    ajusteProtocolo(y) - ajusteProtocolo(x)
    || Math.max(...Object.values(y.stats)) - Math.max(...Object.values(x.stats))
    || x.id.localeCompare(y.id));
  const equipo = ordenados.slice(0, TAM_UNIDAD);
  seleccionados = equipo.map(a => a.id);
  // Líder = mayor liderazgo de la unidad asignada; desempate por ajuste, luego id.
  liderId = equipo.slice().sort((x, y) =>
    (y.stats.liderazgo || 0) - (x.stats.liderazgo || 0)
    || ajusteProtocolo(y) - ajusteProtocolo(x)
    || x.id.localeCompare(y.id))[0]?.id || null;
}

// ── Identidad mínima: designación + nombres/rango, nada más ─────────────────
// El expediente (traits, condición, qué les pasó) se abre en el cierre. Aquí
// solo lo suficiente para que te importen cuando no vuelvan.
function renderUnidad() {
  const lista = document.getElementById('unidad-lista');
  const hint  = document.getElementById('sel-hint');
  const btn   = document.getElementById('btn-iniciar');
  const bm    = document.getElementById('btn-movil');
  const ah    = document.getElementById('actions-hint');

  const unidad = seleccionados.map(id => agentes.find(a => a.id === id));

  if (!unidad.length) {
    lista.innerHTML = '<div class="unidad-vacia">Sin personal desplegable — roster agotado.</div>';
    hint.textContent = 'Sin unidad disponible';
    btn.disabled = true; if (bm) bm.disabled = true;
    ah.textContent = 'No hay agentes para asignar';
    return;
  }

  lista.innerHTML = unidad.map(a => {
    const esLider = a.id === liderId;
    const apellidos = a.nombre_completo.split(' ').slice(1).join(' ') || a.nombre_completo;
    const pill = esLider ? '<span class="u-lead">★ LÍDER</span>' : '';
    return `<div class="unidad-row${esLider ? ' lead' : ''}">
      <span class="u-rank">${a.rango_abreviatura}</span>
      <span class="u-name">${apellidos}</span>
      ${pill}
    </div>`;
  }).join('');

  const lider = unidad.find(a => a.id === liderId);
  hint.textContent = `Unidad de ${unidad.length} · Líder: ${lider ? lider.rango_abreviatura + ' ' + lider.nombre_completo : '—'}`;
  btn.disabled = false; if (bm) bm.disabled = false;
  ah.textContent = 'Asignación por protocolo — no modificable';
}

function desplegar(destino) {
  if (seleccionados.length === 0) return;
  // Lleva la cordura persistente del cuartel a la operación.
  const equipo = seleccionados.map(id => {
    const a = JSON.parse(JSON.stringify(agentes.find(x => x.id === id)));
    a.estado.cordura = perfiles[id].cordura;
    return a;
  });
  setSession('op_equipo', equipo);
  setSession('op_lider_id', liderId);
  // Seed fresco por despliegue → cada operación generada es distinta.
  setSession('op_seed', Math.floor(Math.random() * 1e9));
  window.location.href = destino;
}

document.getElementById('btn-iniciar').addEventListener('click', () => desplegar('./coms.html'));
document.getElementById('btn-movil').addEventListener('click', () => desplegar('./movil.html'));

init().catch(err => {
  console.error('[CENVAC briefing]', err);
  const lista = document.getElementById('unidad-lista');
  if (lista) lista.innerHTML = `<div style="color:var(--red-hi);font-size:11px;padding:16px;line-height:1.6">No se pudo asignar la unidad: ${err.message}<br><a href="./index.html" style="color:var(--accent)">← Volver al mapa</a></div>`;
});
