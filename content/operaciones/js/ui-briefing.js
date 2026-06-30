import { cargarDatos, cargarMisionData, getSession, setSession } from './main.js';
import { generarAgente } from './agent-generator.js';

const SEEDS = [42, 137, 2026, 999, 3141, 7777];
const STATS_DISPLAY = [
  { key: 'físico',    label: 'F' },
  { key: 'técnico',   label: 'T' },
  { key: 'biológico', label: 'B' },
  { key: 'sigilo',    label: 'S' },
  { key: 'mental',    label: 'M' },
  { key: 'liderazgo', label: 'L' },
];

let agentes = [];
let seleccionados = [];  // array of agente.id in selection order
let liderId = null;

async function init() {
  const evento = getSession('op_evento');
  if (!evento) { window.location.href = './index.html'; return; }

  document.getElementById('op-ev-id').textContent = evento.id;
  document.getElementById('mc-op').textContent    = evento.mision_asociada;
  document.getElementById('mc-obj').textContent   = evento.criatura_sospechada.replace(/_/g, ' ');
  document.getElementById('mc-ubic').textContent  = evento.ubicacion_descrita.slice(0, 60) + '…';
  document.getElementById('mc-nivel').textContent = `AMENAZA ${evento.nivel_amenaza_estimado}`;

  const datos = await cargarDatos();
  const procedurales = SEEDS.map(s => generarAgente(s, datos));
  agentes = [...datos.named, ...procedurales];

  renderRoster();
}

function renderRoster() {
  const grid = document.getElementById('roster-grid');
  grid.innerHTML = '';

  agentes.forEach(a => {
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.dataset.id = a.id;

    const isSelected = seleccionados.includes(a.id);
    const isLider = a.id === liderId;
    if (isSelected)  card.classList.add('selected');
    if (isLider)     card.classList.add('leader');
    if (a.es_nombrado) card.classList.add('nombrado');

    const maxStat = Math.max(...Object.values(a.stats));
    const minStat = Math.min(...Object.values(a.stats));

    card.innerHTML = `
      <div class="agent-card-header">
        <span class="agent-rank">${a.rango_abreviatura}</span>
        <span class="agent-name">${a.nombre_completo}${a.es_nombrado ? '<span class="agent-named-badge">IDENT</span>' : ''}</span>
      </div>
      <div class="agent-rol">${a.nombre_rol} — ${a.operaciones_completadas} op${a.operaciones_completadas !== 1 ? 's' : ''}</div>
      <div class="agent-stats">
        ${STATS_DISPLAY.map(s => {
          const v = a.stats[s.key] || 0;
          const cls = v >= maxStat ? 'hi' : v <= minStat ? 'lo' : '';
          return `<span class="stat-chip ${cls}">${s.label}<span>${v}</span></span>`;
        }).join('')}
      </div>
      <div class="agent-traits">${a.rasgos.map(r => r.nombre).join(' · ')}</div>
    `;

    card.addEventListener('click', () => handleCardClick(a.id));
    grid.appendChild(card);
  });

  updateSelectionUI();
}

function handleCardClick(id) {
  if (seleccionados.includes(id)) {
    if (id === liderId) {
      // deselect leader → remove and reassign leader
      seleccionados = seleccionados.filter(x => x !== id);
      liderId = seleccionados[0] || null;
    } else {
      // promote to leader
      liderId = id;
    }
  } else {
    if (seleccionados.length >= 3) return;
    seleccionados.push(id);
    if (!liderId) liderId = id;
  }
  renderRoster();
}

function updateSelectionUI() {
  const slots = document.querySelectorAll('.slot');
  slots.forEach((sl, i) => {
    if (i < seleccionados.length) {
      sl.classList.add('filled');
      sl.textContent = i + 1;
    } else {
      sl.classList.remove('filled');
      sl.textContent = i + 1;
    }
  });

  const hint = document.getElementById('sel-hint');
  const btn  = document.getElementById('btn-iniciar');
  const ah   = document.getElementById('actions-hint');

  if (seleccionados.length === 0) {
    hint.textContent = 'Ningún agente seleccionado';
    btn.disabled = true;
    ah.textContent = 'Selecciona al menos un agente';
  } else {
    const lider = agentes.find(a => a.id === liderId);
    hint.textContent = `${seleccionados.length} agente${seleccionados.length > 1 ? 's' : ''} · Líder: ${lider?.nombre_completo || '—'}`;
    btn.disabled = false;
    ah.textContent = seleccionados.length < 3 ? 'Puedes añadir más agentes' : 'Equipo completo';
  }
}

document.getElementById('btn-iniciar').addEventListener('click', () => {
  if (seleccionados.length === 0) return;
  const equipo = seleccionados.map(id => agentes.find(a => a.id === id));
  setSession('op_equipo', equipo);
  setSession('op_lider_id', liderId);
  // Seed fresco por despliegue → cada operación generada es distinta.
  setSession('op_seed', Math.floor(Math.random() * 1e9));
  window.location.href = './coms.html';
});

init().catch(err => console.error('[CENVAC briefing]', err));
