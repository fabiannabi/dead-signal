import { getSession, setSession, cargarMisionData, cargarGramatica, hashSeed } from './main.js';
import { cargarMision, obtenerNodo, procesarNodo, procesarOpcion, filtrarOpciones } from './mission-engine.js';
import { generarMision } from './mission-generator.js';
import { iniciarMision } from './state.js';
import { consolidarOperacion } from './roster-store.js';

const delay = ms => new Promise(r => setTimeout(r, ms));

const SIGNAL = {
  silencio:       { bars: '▇▇▇▇', cls: '' },
  estatica_baja:  { bars: '▇▇▇░', cls: '' },
  estatica_media: { bars: '▇▇░░', cls: 'low' },
  estatica_alta:  { bars: '▇░░░', cls: 'low' },
  alerta_critica: { bars: '!!!!', cls: 'crit' },
};

let estado = null;
let mision = null;
let procesando = false;
let senalDespacho = 100;   // señal con la que se desplegó (gastada al escanear) — §5

// ── Esquemático táctico en vivo: posición del equipo por cuarto ──────────────────
let siteTpl = null;
let displayZonas = [];
const visitadas = new Set();

function construirDisplayZonas() {
  displayZonas = [];
  if (!siteTpl || !siteTpl.zonas) return;
  const zonas = siteTpl.zonas;
  const acceso = zonas.find(z => /acceso/.test(z.id)) || zonas[0];
  const foco = zonas.find(z => z.es_foco);
  const mids = zonas.filter(z => z !== acceso && z !== foco);
  displayZonas = [acceso, ...mids, foco].filter(Boolean);
}

// Mapea un nodo de la historia a un cuarto del sitio (entrada → foco → salida).
function posicionDe(id) {
  if (!displayZonas.length) return null;
  const acceso = displayZonas[0];
  const foco = displayZonas.find(z => z.es_foco) || displayZonas[displayZonas.length - 1];
  const mid = displayZonas.find(z => z !== acceso && !z.es_foco) || acceso;
  if (/^nodo_(insercion|ventaja|aprox)/.test(id)) return acceso.id;
  if (/^nodo_busqueda/.test(id)) return mid.id;
  if (/^nodo_(encuentro|accion|observacion|documentacion|objetivo|senal)/.test(id)) return foco.id;
  if (/^nodo_(retirada|emergencia)/.test(id)) return acceso.id;
  if (/^nodo_exterior/.test(id)) return 'exterior';
  return null;
}

let mapaBuilt = false;
let roomPos = {};

// Construye el plano SVG una sola vez: cuadrícula de cuartos grandes + corredores + escuadrón.
function construirMapa() {
  const el = document.getElementById('tactico');
  if (!el) return;
  if (!displayZonas.length) { el.innerHTML = '<div class="tac-vacio">sin esquemático del sitio</div>'; return; }
  const N = displayZonas.length;
  const cols = 2;
  const bw = 132, bh = 60, gapX = 16, gapY = 22, padX = 8, padY = 10;
  const rows = Math.ceil(N / cols);
  const W = padX * 2 + cols * bw + (cols - 1) * gapX;
  const H = padY * 2 + rows * bh + (rows - 1) * gapY;
  roomPos = {};
  const pts = displayZonas.map((z, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = padX + col * (bw + gapX) + bw / 2;
    const y = padY + row * (bh + gapY) + bh / 2;
    roomPos[z.id] = { x, y };
    return { x, y, z };
  });
  let corr = '', rooms = '', labels = '';
  // corredores entre cuartos consecutivos (la ruta por el sitio)
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    corr += `<path class="tac-corr" d="M ${a.x} ${a.y} L ${b.x} ${a.y} L ${b.x} ${b.y}"/>`;
  }
  pts.forEach(({ x, y, z }) => {
    rooms += `<rect class="tac-svg-room${z.es_foco ? ' foco' : ''}" data-zid="${z.id}" x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="2"/>`;
    const tag = z.es_foco ? '◉ FOCO' : 'ZONA';
    const nombre = (z.etiqueta || z.id).split(' — ')[0].slice(0, 22);
    const lx = x - bw / 2 + 9;
    labels += `<text class="tac-svg-tag${z.es_foco ? ' foco' : ''}" data-zid="${z.id}" x="${lx}" y="${y - bh / 2 + 16}">${tag}</text>`;
    labels += `<text class="tac-svg-name" data-zid="${z.id}" x="${lx}" y="${y - bh / 2 + 31}">${nombre}</text>`;
  });
  const squad = `<g class="tac-squad" id="tac-squad" transform="translate(${pts[0].x},${pts[0].y})">
    <circle class="tac-ping" cx="0" cy="0" r="6"/>
    <circle class="tac-dot" cx="-9" cy="9" r="3.4"/><circle class="tac-dot" cx="9" cy="8" r="3.4"/><circle class="tac-dot" cx="0" cy="-10" r="3.4"/></g>`;
  el.innerHTML = `<svg class="tac-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${corr}${rooms}${labels}${squad}</svg><div class="tac-caption" id="tac-caption">— en inserción —</div>`;
  mapaBuilt = true;
}

// Mueve el escuadrón (dots) al cuarto actual y marca lo visitado. CSS anima el deslizamiento.
function renderTactico(zid) {
  if (!mapaBuilt) construirMapa();
  if (!mapaBuilt) return;
  const cap = document.getElementById('tac-caption');
  const squad = document.getElementById('tac-squad');
  if (zid && zid !== 'exterior') visitadas.add(zid);
  document.querySelectorAll('.tac-svg-room, .tac-svg-name, .tac-svg-tag').forEach(r => {
    const id = r.getAttribute('data-zid');
    r.classList.toggle('actual', id === zid);
    if (id === zid || visitadas.has(id)) r.classList.add('visitada');
  });
  if (zid === 'exterior') {
    if (cap) cap.textContent = '▸ equipo en superficie';
  } else if (zid && roomPos[zid] && squad) {
    squad.setAttribute('transform', `translate(${roomPos[zid].x},${roomPos[zid].y})`);
    const z = displayZonas.find(x => x.id === zid);
    if (cap) cap.textContent = '▸ ' + ((z && z.etiqueta) || '').split(' — ')[0];
  }
}

// Penalización de comunicación por tramo (audio_hint del nodo) sobre la señal de despacho.
const PENAL_AUDIO = { silencio: 0, estatica_baja: 5, estatica_media: 20, estatica_alta: 40, alerta_critica: 10 };

// Nivel de información disponible en un nodo: combina la señal de despacho con el tramo.
function infoTier(audio_hint) {
  const eff = Math.max(0, senalDespacho - (PENAL_AUDIO[audio_hint] ?? 0));
  // Sin corrupción de caracteres: el texto queda 100% legible. La degradación
  // se muestra SOLO con estática visual (CSS sig-deg / sig-crit).
  if (eff >= 60) return { tier: 'claro', eff, corrupt: 0 };
  if (eff >= 35) return { tier: 'degradado', eff, corrupt: 0 };
  return { tier: 'critico', eff, corrupt: 0 };
}

// Corrompe una fracción de caracteres con █ (no toca espacios ni saltos).
function corromper(txt, prob) {
  if (!prob) return txt;
  let out = '';
  for (const ch of txt) out += (ch === ' ' || ch === '\n') ? ch : (Math.random() < prob ? '█' : ch);
  return out;
}

async function init() {
  const evento  = getSession('op_evento');
  const equipo  = getSession('op_equipo');
  const liderId = getSession('op_lider_id');

  if (!evento || !equipo?.length) {
    window.location.href = './briefing.html';
    return;
  }

  // Señal de despacho con la que se desplegó (la que se gastó al escanear) — §5
  const despacho = getSession('op_despacho');
  senalDespacho = (despacho && typeof despacho.senal_pct === 'number') ? despacho.senal_pct : 100;
  const sigPct = document.getElementById('sig-pct');
  if (sigPct) {
    const cls = senalDespacho < 20 ? 'crit' : senalDespacho < 35 ? 'low' : '';
    sigPct.textContent = `SEÑAL ${senalDespacho}%`;
    sigPct.className = `op-freq op-signal ${cls}`;
  }

  // Misión generada para criaturas con soporte de gramática; si no, la hand-authored.
  let misionRaw;
  let grammar = null;
  try { grammar = await cargarGramatica(); } catch { /* sin gramática → fallback */ }
  if (grammar && grammar.creatureTags[evento.criatura_sospechada]) {
    const seed = getSession('op_seed') ?? hashSeed(evento.id);
    const scan = getSession('op_scan_estado') || { nivel: 0 };
    misionRaw = generarMision(evento, seed, { grammar, scan_estado: scan });
  } else {
    misionRaw = await cargarMisionData(evento.mision_asociada);
  }
  setSession('op_mision_obj', misionRaw);

  siteTpl = (grammar && grammar.siteTemplates && grammar.siteTemplates[evento.sitio_tipo]) || null;
  construirDisplayZonas();
  renderTactico(null);

  mision = cargarMision(misionRaw);
  estado = iniciarMision(evento, misionRaw, equipo.map(a => JSON.parse(JSON.stringify(a))), liderId);

  // Header
  document.getElementById('ev-id').textContent    = evento.id;
  document.getElementById('ev-mision').textContent = misionRaw.nombre;
  document.getElementById('strip-ev').textContent  = evento.id;
  document.getElementById('strip-mis').textContent  = misionRaw.nombre;

  renderStatusPanel();
  await stepNode(mision.nodo_inicial);
}

// ── Game loop ───────────────────────────────────────────────────────────────

async function stepNode(nodo_id) {
  if (procesando) return;
  procesando = true;

  const nodo = obtenerNodo(mision, nodo_id);
  if (!nodo) {
    appendSystemMsg(`[ERROR] Nodo no encontrado: ${nodo_id}`);
    procesando = false;
    return;
  }

  appendNodeSep(nodo.tipo, nodo_id);
  updateSignal(nodo.audio_hint);
  renderTactico(posicionDe(nodo_id));   // mover las tropas por el esquemático en vivo

  // Nivel de información de este tramo según la señal de despacho (§5)
  const info = infoTier(nodo.audio_hint);
  if (info.tier !== 'claro') appendDegradado(info);

  // Process node — applies effects, records historial, advances time
  const resultado = procesarNodo(nodo, estado, mision, {});

  // Ambient line
  if (nodo.ambiente) appendAmbiente(nodo.ambiente, info);

  // Messages (staggered)
  for (const msg of resultado.mensajes) {
    await delay(100);
    appendMessage(msg, info);
  }

  // Resultado del check — su visibilidad es parte de la mecánica de señal (§5)
  if (resultado.check_resultado) appendCheckResult(resultado.check_resultado, info);

  renderStatusPanel();
  scrollBottom();
  procesando = false;

  // ── Branch on node outcome ───────────────────────────────────────────────

  if (resultado.es_final) {
    appendFinalBlock(nodo);
    setSession('op_estado_final', estado);
    setSession('op_mision_id', mision.id);
    // Consolidar en el cuartel — una sola vez por operación (recargar coms re-juega).
    if (getSession('op_consolidada') !== mision.id) {
      try { consolidarOperacion(estado, mision, getSession('op_evento')); setSession('op_consolidada', mision.id); }
      catch (e) { console.warn('[CENVAC] cuartel no disponible', e); }
    }
    showFinalActions();
    return;
  }

  if (resultado.requiere_decision) {
    showDecisionButtons(nodo, resultado.opciones_disponibles, info);
    return;
  }

  // Auto-advance (check, resolucion, narrativo with no options)
  if (resultado.siguiente) {
    await delay(nodo.tipo === 'check' ? 1100 : 450);
    stepNode(resultado.siguiente);
  }
}

// ── Decision buttons ────────────────────────────────────────────────────────

function showDecisionButtons(nodo, opciones, info = { tier: 'claro', corrupt: 0 }) {
  const zone = document.getElementById('decision-zone');
  zone.innerHTML = '';

  const prompt = document.createElement('div');
  prompt.className = 'decision-prompt';
  prompt.textContent = info.tier === 'critico'
    ? '— Protocolo 9 — solo códigos de estado disponibles —'
    : '— Esperando instrucción de Control —';
  zone.appendChild(prompt);

  const btns = document.createElement('div');
  btns.className = 'decision-btns';

  opciones.forEach((op, idx) => {
    const btn = document.createElement('button');
    btn.className = `decision-btn${info.tier !== 'claro' ? ' ' + sigClase(info) : ''}`;
    // Protocolo 9: con señal crítica antepone el código de estado; el texto queda legible con estática.
    if (info.tier === 'critico') {
      btn.innerHTML = `<span class="op-codigo">CÓDIGO ${idx + 1}</span> ${op.texto}`;
    } else {
      btn.textContent = op.texto;
    }
    btn.addEventListener('click', async () => {
      btns.querySelectorAll('button').forEach(b => { b.disabled = true; });
      zone.innerHTML = '';
      appendSelectedOption(op.texto);
      const siguiente = procesarOpcion(nodo, estado, idx);
      renderStatusPanel();
      scrollBottom();
      if (siguiente) await stepNode(siguiente);
    });
    btns.appendChild(btn);
  });

  zone.appendChild(btns);
  scrollBottom();
}

function showFinalActions() {
  const zone = document.getElementById('decision-zone');
  zone.innerHTML = '';
  const btns = document.createElement('div');
  btns.className = 'decision-btns';
  const bReporte = document.createElement('button');
  bReporte.className = 'btn-op primary';
  bReporte.textContent = '→ VER EXPEDIENTE';
  bReporte.addEventListener('click', () => { window.location.href = './reporte.html'; });
  const bMapa = document.createElement('button');
  bMapa.className = 'btn-op';
  bMapa.textContent = '← Volver al mapa';
  bMapa.addEventListener('click', () => { window.location.href = './index.html'; });
  btns.appendChild(bReporte);
  btns.appendChild(bMapa);
  zone.appendChild(btns);
}

// ── DOM helpers ─────────────────────────────────────────────────────────────

function appendNodeSep(tipo, id) {
  const el = document.createElement('div');
  el.className = 'node-sep';
  el.textContent = tipo;
  document.getElementById('coms-log').appendChild(el);
}

const sigClase = (info) => (!info || info.tier === 'claro') ? '' : (info.tier === 'critico' ? 'sig-crit' : 'sig-deg');

function appendAmbiente(texto, info) {
  const el = document.createElement('div');
  el.className = `coms-ambient ${sigClase(info)}`;
  el.textContent = corromper(texto, info ? info.corrupt : 0);
  document.getElementById('coms-log').appendChild(el);
}

function appendMessage(msg, info) {
  const log = document.getElementById('coms-log');
  const row = document.createElement('div');
  row.className = 'coms-message';

  const isControl = msg.canal === 'CONTROL';
  const isSistema = msg.canal === 'SISTEMA';
  const chanCls   = isControl ? 'control' : isSistema ? 'sistema' : 'agent';
  const textCls   = isControl ? 'control' : isSistema ? 'sistema' : '';

  const chanEl = document.createElement('div');
  chanEl.className = `coms-channel ${chanCls}`;
  chanEl.textContent = msg.canal;

  const textEl = document.createElement('div');
  textEl.className = `coms-text ${textCls} ${sigClase(info)}`;
  textEl.textContent = corromper(msg.texto, info ? info.corrupt : 0);

  row.appendChild(chanEl);
  row.appendChild(textEl);
  log.appendChild(row);
}

function appendDegradado(info) {
  const log = document.getElementById('coms-log');
  const el = document.createElement('div');
  el.className = `coms-degradado ${info.tier}`;
  el.textContent = info.tier === 'critico'
    ? `// SEÑAL CRÍTICA (${info.eff}%) — Protocolo 9 activo: solo códigos de estado`
    : `// señal degradada (${info.eff}%) — transmisión parcial`;
  log.appendChild(el);
}

// Flavor diegético por resultado — sin dados ni números (el jugador es analista, no ve mecánicas).
const CHECK_FLAVOR = {
  'crítico_éxito': 'El equipo ejecuta con margen de sobra.',
  'éxito':         'El equipo resuelve el paso.',
  'fallo':         'El paso se complica.',
  'crítico_fallo': 'Algo sale mal.',
};
function appendCheckResult(cr, info = { tier: 'claro' }) {
  const log = document.getElementById('coms-log');
  const el = document.createElement('div');
  if (info.tier === 'critico') {
    el.className = 'check-flavor critico';
    el.textContent = '— sin confirmación · señal degradada —';
  } else {
    const cls = (cr.resultado === 'crítico_éxito' || cr.resultado === 'éxito') ? 'ok'
      : cr.resultado === 'fallo' ? 'warn' : 'bad';
    el.className = `check-flavor ${cls}`;
    el.textContent = `— ${CHECK_FLAVOR[cr.resultado] || ''} —`;
  }
  log.appendChild(el);
}

function appendSelectedOption(texto) {
  const log = document.getElementById('coms-log');
  const el = document.createElement('div');
  el.className = 'selected-option-echo';
  el.textContent = `→ ${texto}`;
  log.appendChild(el);
}

function appendFinalBlock(nodo) {
  const log = document.getElementById('coms-log');
  const el = document.createElement('div');
  el.className = 'final-block';
  const isFracaso = (nodo.resultado || '').includes('fracaso') || (nodo.resultado || '').includes('pirrico');
  el.innerHTML = `<div class="final-title ${isFracaso ? 'fracaso' : ''}">${nodo.titulo || 'Operación concluida'}</div>`;
  log.appendChild(el);
}

function appendSystemMsg(texto) {
  const log = document.getElementById('coms-log');
  const row = document.createElement('div');
  row.className = 'coms-message';
  row.innerHTML = `<div class="coms-channel sistema">SISTEMA</div><div class="coms-text sistema">${texto}</div>`;
  log.appendChild(row);
}

function scrollBottom() {
  const log = document.getElementById('coms-log');
  log.scrollTop = log.scrollHeight;
}

// ── Signal indicator ────────────────────────────────────────────────────────

function updateSignal(hint) {
  const el = document.getElementById('sig-indicator');
  const s = SIGNAL[hint] || SIGNAL['silencio'];
  el.textContent = s.bars;
  el.className = `op-signal ${s.cls}`;
}

// ── Status panel ────────────────────────────────────────────────────────────

function renderStatusPanel() {
  const panel = document.getElementById('status-panel');

  // Keep mission-strip and section-label, rebuild cards + tiempo
  const toRemove = panel.querySelectorAll('.status-card, .tiempo-strip');
  toRemove.forEach(el => el.remove());

  estado.equipo.forEach(a => {
    const card = document.createElement('div');
    const vivo = a.estado.vivo;
    const isLider = a.es_lider;
    card.className = `status-card${isLider ? ' lider' : ''}${!vivo ? ' baja' : ''}`;

    const estPct = Math.round((a.estado.estamina / a.estado.estamina_max) * 100);
    const corPct = Math.round((a.estado.cordura  / a.estado.cordura_max)  * 100);
    const estCls = estPct < 30 ? 'crit' : estPct < 60 ? 'low' : '';
    const corCls = corPct < 30 ? 'crit' : corPct < 60 ? 'low' : '';

    const heridasHTML = a.estado.heridas.length > 0
      ? `<div class="heridas-list">${a.estado.heridas.map(h =>
          `${h.tipo} — ${h.parte_cuerpo} (${h.severidad})`
        ).join('<br>')}</div>`
      : '';

    const bajaHTML = !vivo ? '<div class="baja-label">BAJA</div>' : '';

    card.innerHTML = `
      <div class="status-card-header">
        <span class="status-rank">${a.rango_abreviatura}</span>
        <span class="status-name">${a.nombre_completo.split(' ')[0]}</span>
      </div>
      <div class="status-rol">${a.nombre_rol}</div>
      <div class="bar-row">
        <span class="bar-lbl">E</span>
        <div class="bar-track"><div class="bar-fill ${estCls}" style="width:${estPct}%"></div></div>
        <span class="bar-val">${a.estado.estamina}/${a.estado.estamina_max}</span>
      </div>
      <div class="bar-row">
        <span class="bar-lbl">C</span>
        <div class="bar-track"><div class="bar-fill mind ${corCls}" style="width:${corPct}%"></div></div>
        <span class="bar-val">${a.estado.cordura}/${a.estado.cordura_max}</span>
      </div>
      ${heridasHTML}
      ${bajaHTML}
    `;

    // Insert before tiempo-strip (we'll append it after)
    panel.insertBefore(card, null);
  });

  // Tiempo strip
  const ts = document.createElement('div');
  ts.className = 'tiempo-strip';
  ts.innerHTML = `Tiempo op: <b>${estado.tiempo_simulado}</b>`;
  panel.appendChild(ts);

  document.getElementById('tiempo-display')?.remove();
  document.getElementById('op-tiempo').textContent = estado.tiempo_simulado;

  renderRendimiento();
}

// ── Panel de rendimiento (yield acumulándose en vivo) ─────────────────────────
const YIELD_LABEL = {
  extraccion_4a: 'Muestra biológica',
  contencion_8a: 'Neutralización',
  reconocimiento: 'Documentación conductual',
  observacion_15: 'Telemetría',
};
function renderRendimiento() {
  const labelEl = document.getElementById('rend-prim-label');
  if (!labelEl || !mision) return;
  labelEl.textContent = YIELD_LABEL[mision.objetivo] || 'Objetivo';
  const fill = document.getElementById('rend-prim-fill');
  const st = document.getElementById('rend-prim-state');
  if (estado.muestra_obtenida) {
    const parcial = String(estado.muestra_tipo || '').includes('parcial');
    fill.style.width = parcial ? '60%' : '100%';
    fill.className = 'rend-fill ok';
    st.textContent = parcial ? 'parcial' : 'confirmado';
    st.className = 'rend-state ok';
  } else {
    fill.style.width = `${Math.min(85, (estado.historial.length || 0) * 7)}%`;
    fill.className = 'rend-fill';
    st.textContent = '— pendiente';
    st.className = 'rend-state na';
  }
}

// ── Boot ────────────────────────────────────────────────────────────────────

init().catch(err => {
  console.error('[CENVAC coms]', err);
  document.getElementById('coms-log').innerHTML =
    `<div style="color:var(--red-hi);font-size:11px;padding:20px">
      ERROR: ${err.message}<br><br>
      <a href="./briefing.html" style="color:var(--accent)">← Volver al briefing</a>
    </div>`;
});
