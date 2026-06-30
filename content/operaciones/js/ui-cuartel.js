import { cargarRosterBase } from './main.js';
import { construirRoster, getMemorial, CUPO_ROSTER } from './roster-store.js';

const glyph = (nombre) => nombre.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const corCls = (pct) => (pct < 30 ? 'crit' : pct < 60 ? 'low' : '');

function pill(p) {
  if (p.estado === 'recuperacion') return `<span class="estado-pill recuperacion">RECUPERACIÓN · ${p.recuperacion_ops} ops</span>`;
  if (p.estado === 'herida') return `<span class="estado-pill herida">AFECTADA</span>`;
  return `<span class="estado-pill activa">${p.genero === 'f' ? 'ACTIVA' : 'ACTIVO'}</span>`;
}

function tags(p) {
  const t = [];
  for (const r of p.rasgos) {
    const mod = Object.entries(r.modificadores_stat || {})[0];
    const sufijo = mod && typeof mod[1] === 'number' ? ` ${mod[1] > 0 ? '+' : ''}${mod[1]} ${mod[0]}` : '';
    t.push(`<span class="tag">${r.nombre}${sufijo}</span>`);
  }
  for (const c of p.cicatrices) {
    const ef = Object.entries(c.efecto || {})[0];
    const sufijo = ef ? ` ${ef[0]} ${ef[1]}` : '';
    t.push(`<span class="tag cicatriz">${c.tipo} · ${c.parte}${sufijo}</span>`);
  }
  return t.join('');
}

function rosterRow(p) {
  const cordPct = Math.round((p.cordura / p.cordura_max) * 100);
  const vinc = p.vinculo ? `<span class="roster-vinculo">↔ ${nombreCorto(p.vinculo.otro)}</span>` : '';
  const cls = `roster-row${p.estado === 'recuperacion' ? ' en-recuperacion' : ''}${p.estado === 'herida' ? ' afectada' : ''}`;
  return `
    <a class="${cls}" href="./expediente.html?id=${encodeURIComponent(p.id)}">
      <div class="roster-glyph">${glyph(p.nombre)}</div>
      <div class="roster-main">
        <div class="roster-id">
          <span class="roster-nombre">${p.nombre}</span>
          <span class="roster-meta">${p.rango} · ${p.arquetipo}</span>
        </div>
        <div class="roster-sub">${p.ops} ops ${vinc}</div>
        <div class="bar-row">
          <span class="bar-lbl">COR</span>
          <div class="bar-track"><div class="bar-fill mind ${corCls(cordPct)}" style="width:${cordPct}%"></div></div>
        </div>
        <div class="roster-tags">${tags(p)}</div>
      </div>
      <div class="roster-estado">${pill(p)}</div>
    </a>`;
}

// Mapa id→nombre corto para vínculos (se rellena al cargar el roster).
let NOMBRES = {};
function nombreCorto(id) { return NOMBRES[id] || id.replace('agente_', '').replace(/_/g, ' '); }

async function init() {
  const { base } = await cargarRosterBase();
  NOMBRES = Object.fromEntries(base.map((a) => [a.id, a.nombre_completo.split(' ')[0]]));
  const roster = construirRoster(base);
  const memorial = getMemorial();

  document.getElementById('roster-count').textContent = `ROSTER ${roster.length} activos · cupo ${CUPO_ROSTER}`;

  const recup = roster.filter((p) => p.estado === 'recuperacion').length;
  const duelo = memorial.length
    ? ` · <span class="strip-duelo">DUELO ACTIVO −3 cordura (baja ${memorial[0].op.replace('OP-', '')})</span>`
    : '';
  document.getElementById('cuartel-strip').innerHTML =
    `RECUPERACIÓN ${recup} / ${Math.max(1, Math.ceil(CUPO_ROSTER / 3))} cupos${duelo}`;

  document.getElementById('roster-list').innerHTML = roster.map(rosterRow).join('');

  const wall = document.getElementById('memorial-wall');
  if (!memorial.length) {
    wall.innerHTML = `<div class="memorial-titulo">Muro conmemorativo</div><div class="memorial-vacio">Sin bajas registradas.</div>`;
  } else {
    wall.innerHTML = `<div class="memorial-titulo">Muro conmemorativo</div>` +
      memorial.map((m) => `<div class="memorial-row"><span class="mem-nombre">${m.rango} ${m.nombre}</span> — ${m.causa} · ${m.op} · ${m.sitio}</div>`).join('');
  }
}

init().catch((err) => {
  console.error('[CENVAC cuartel]', err);
  document.getElementById('roster-list').innerHTML = `<div style="color:var(--red-hi);padding:20px">Error: ${err.message}</div>`;
});
