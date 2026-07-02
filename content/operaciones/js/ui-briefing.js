import { cargarRosterBase, getSession, setSession, cargarGramatica } from './main.js';
import { perfilCompleto } from './roster-store.js';

// Orden y etiqueta larga de capacidades (mockup Opción B v2).
const STATS_ORDEN = [
  { key: 'físico',    label: 'Físico'    },
  { key: 'técnico',   label: 'Técnico'   },
  { key: 'biológico', label: 'Biológico' },
  { key: 'sigilo',    label: 'Sigilo'    },
  { key: 'mental',    label: 'Mental'    },
  { key: 'liderazgo', label: 'Liderazgo' },
];

// Abreviaturas para el efecto mecánico mostrado en los chips de rasgo.
const STAT_ABBR = { 'físico': 'fís', 'técnico': 'téc', 'biológico': 'bio', 'sigilo': 'sig', 'mental': 'men', 'liderazgo': 'lid' };
const ESTADO_LABEL = {
  estamina_max: 'estam. máx', cordura_max: 'cord. máx',
  cordura_equipo_en_encuentro: 'cord. equipo',
};
const CAP = (s) => s.charAt(0).toUpperCase() + s.slice(1);

let agentes = [];
let perfiles = {};       // id → perfil persistente
let nombres = {};        // id → nombre corto (vínculos)
let claveStats = [];     // capacidades clave de la misión (creature-tags)
let seleccionados = [];
let liderId = null;

const seleccionable = (id) => perfiles[id] && perfiles[id].estado !== 'recuperacion';

// ── Formato del efecto mecánico de un rasgo (derivado de sus modificadores) ──
function sgn(n) { return (n > 0 ? '+' : '−') + Math.abs(n); }
function efectoDe(rasgo) {
  const parts = [];
  for (const [k, v] of Object.entries(rasgo.modificadores_stat || {})) {
    if (typeof v !== 'number' || v === 0) continue;
    const m = k.match(/^(.+?)_(?:contra|en)_(.+)$/);   // p.ej. técnico_contra_arana_hidraulica
    if (m) {
      const ab = STAT_ABBR[m[1]] || m[1];
      parts.push(`${sgn(v)} ${ab} vs ${m[2].replace(/_/g, ' ').replace(/arana/g, 'araña')}`);
    } else {
      parts.push(`${sgn(v)} ${STAT_ABBR[k] || k}`);
    }
  }
  for (const [k, v] of Object.entries(rasgo.modificadores_estado || {})) {
    if (typeof v !== 'number' || v === 0) continue;   // valores de texto → solo narrativos
    parts.push(`${sgn(v)} ${ESTADO_LABEL[k] || k.replace(/_/g, ' ')}`);
  }
  return parts.join(' · ');
}

// ── Texto de perfil (mejores dos capacidades / la más floja) ──
function perfilTexto(stats) {
  const ord = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  if (ord.length < 2) return '';
  return `Destaca en <b>${ord[0][0]}</b> y <b>${ord[1][0]}</b>; flojo en ${ord[ord.length - 1][0]}.`;
}

async function init() {
  const evento = getSession('op_evento');
  if (!evento) { window.location.href = './index.html'; return; }

  document.getElementById('op-ev-id').textContent = evento.id;
  document.getElementById('mc-op').textContent    = evento.mision_asociada;
  document.getElementById('mc-obj').textContent   = evento.criatura_sospechada.replace(/_/g, ' ');
  document.getElementById('mc-ubic').textContent  = evento.ubicacion_descrita.slice(0, 60) + '…';
  document.getElementById('mc-nivel').textContent = `AMENAZA ${evento.nivel_amenaza_estimado}`;

  // Capacidades clave de la misión = stats que la criatura chequea (aproximación / búsqueda / acción).
  try {
    const g = await cargarGramatica();
    const ct = g.creatureTags[evento.criatura_sospechada];
    if (ct) {
      claveStats = [...new Set([ct.stat_aproximacion, ct.stat_busqueda, ct.stat_accion].filter(Boolean))];
    }
  } catch { /* sin gramática → sin resalte de clave */ }
  document.getElementById('mc-perfil').textContent = claveStats.length ? claveStats.join(' · ') : 'estándar';

  const { base } = await cargarRosterBase();
  nombres = Object.fromEntries(base.map(a => [a.id, a.nombre_completo.split(' ')[0]]));
  perfiles = Object.fromEntries(base.map(a => [a.id, perfilCompleto(a)]));
  agentes = base.filter(a => perfiles[a.id].estado !== 'baja');

  renderRoster();
}

function chipsHTML(rasgos, pol) {
  const arr = rasgos.filter(r => (r.polaridad || '+') === pol);
  if (!arr.length) return '';
  const cls = pol === '+' ? 'pos' : 'neg';
  const sign = pol === '+' ? '+' : '−';
  const chips = arr.map(r => {
    const ef = efectoDe(r);
    return `<span class="rchip ${cls}"><span class="sign">${sign}</span>${r.nombre}${ef ? `<span class="ef">${ef}</span>` : ''}</span>`;
  }).join('');
  return `<div class="rgroup ${cls}"><span class="rlbl">${pol === '+' ? 'Ventajas' : 'Limitaciones'}</span><div class="rchips">${chips}</div></div>`;
}

function renderRoster() {
  const grid = document.getElementById('roster-grid');
  grid.innerHTML = '';

  agentes.forEach(a => {
    const p = perfiles[a.id];
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.dataset.id = a.id;

    const isSelected = seleccionados.includes(a.id);
    const isLider = a.id === liderId;
    const enRecup = p.estado === 'recuperacion';
    if (isSelected)  card.classList.add('selected');
    if (isLider)     card.classList.add('leader');
    if (a.es_nombrado) card.classList.add('nombrado');
    if (enRecup)     card.classList.add('recuperacion');
    if (p.estado === 'herida') card.classList.add('afectada');

    const maxStat = Math.max(...Object.values(a.stats));
    const cordPct = Math.round((p.cordura / p.cordura_max) * 100);
    const corCls = cordPct < 30 ? 'crit' : cordPct < 60 ? 'low' : '';

    // Vínculo no disponible si el par está en recuperación.
    const parRecup = p.vinculo && perfiles[p.vinculo.otro] && perfiles[p.vinculo.otro].estado === 'recuperacion';
    const vincNota = parRecup ? `<div class="agent-vinculo-na">vínculo ↔ ${nombres[p.vinculo.otro]} no disponible</div>` : '';

    const estadoTag = enRecup ? `<span class="estado-pill recuperacion">RECUPERACIÓN · ${p.recuperacion_ops} ops</span>`
      : p.estado === 'herida' ? `<span class="estado-pill herida">AFECTADA</span>` : '';

    const ident = (a.es_nombrado && a.identificado !== false) ? '<span class="agent-named-badge">IDENT</span>' : '';
    const selPill = isLider ? '<span class="sel-pill lead">★ LÍDER</span>'
      : isSelected ? '<span class="sel-pill">● EN EQUIPO</span>' : '';

    const filas = STATS_ORDEN.map(s => {
      const v = a.stats[s.key] || 0;
      const esClave = claveStats.includes(s.key);
      const esTop = v === maxStat;
      return `<div class="srow${esClave ? ' clave' : ''}${esTop ? ' top' : ''}">
        <span class="slbl">${s.label}</span>
        <div class="track"><div class="fill" style="width:${v * 10}%"></div></div>
        <span class="snum">${v}</span></div>`;
    }).join('');

    const claveLbl = claveStats.length ? `clave: ${claveStats.map(CAP).join(' · ')}` : 'sin clave definida';

    card.innerHTML = `
      <div class="agent-card-header">
        <span class="agent-rank">${a.rango_abreviatura}</span>
        <span class="agent-name">${a.nombre_completo}${ident}</span>
        ${selPill}
        ${estadoTag}
      </div>
      <div class="agent-rol">${a.nombre_rol} — ${p.ops} op${p.ops !== 1 ? 's' : ''} · cordura ${cordPct}%</div>
      <div class="bar-row"><span class="bar-lbl">COR</span><div class="bar-track"><div class="bar-fill mind ${corCls}" style="width:${cordPct}%"></div></div></div>
      <div class="cap-block">
        <div class="cap-head"><span>Capacidades · 0–10</span><span class="cap-clave">${claveLbl}</span></div>
        ${filas}
      </div>
      <div class="agent-perfil">Perfil: ${perfilTexto(a.stats)}</div>
      <div class="rasgos">${chipsHTML(a.rasgos, '+')}${chipsHTML(a.rasgos, '-')}</div>
      ${vincNota}
    `;

    card.addEventListener('click', () => handleCardClick(a.id));
    grid.appendChild(card);
  });

  updateSelectionUI();
}

function handleCardClick(id) {
  if (!seleccionable(id)) return;   // en recuperación: no desplegable
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

  const yieldEl = document.getElementById('briefing-yield');

  if (seleccionados.length === 0) {
    hint.textContent = 'Ningún agente seleccionado';
    btn.disabled = true;
    const bm0 = document.getElementById('btn-movil'); if (bm0) bm0.disabled = true;
    ah.textContent = 'Selecciona al menos un agente';
    if (yieldEl) yieldEl.textContent = '';
  } else {
    const lider = agentes.find(a => a.id === liderId);
    hint.textContent = `${seleccionados.length} agente${seleccionados.length > 1 ? 's' : ''} · Líder: ${lider?.nombre_completo || '—'}`;
    btn.disabled = false;
    const bm = document.getElementById('btn-movil'); if (bm) bm.disabled = false;
    ah.textContent = seleccionados.length < 3 ? 'Puedes añadir más agentes' : 'Equipo completo';

    // Yield proyectado: potencia media del equipo. Cohesión: vínculos dentro del equipo.
    const power = seleccionados.reduce((s, id) => s + Math.max(...Object.values(agentes.find(a => a.id === id).stats)), 0) / seleccionados.length;
    const yld = power >= 8 ? 'alto' : power >= 6 ? 'medio' : 'bajo';
    let pares = 0;
    for (const id of seleccionados) {
      const v = perfiles[id].vinculo;
      if (v && seleccionados.includes(v.otro)) pares++;
    }
    pares = pares / 2;   // cada vínculo cuenta dos veces
    const coh = pares >= 1.5 ? 'alta' : pares >= 0.5 ? 'media' : 'baja';
    if (yieldEl) yieldEl.innerHTML = `Yield proyectado <b class="y-${yld}">${yld}</b> · cohesión <b class="y-${coh}">${coh}</b>`;
  }
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
  const grid = document.getElementById('roster-grid');
  if (grid) grid.innerHTML = `<div style="color:var(--red-hi);font-size:11px;padding:16px;line-height:1.6">No se pudo cargar el roster: ${err.message}<br><a href="./index.html" style="color:var(--accent)">← Volver al mapa</a></div>`;
});
