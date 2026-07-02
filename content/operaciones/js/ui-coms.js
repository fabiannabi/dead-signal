import { getSession, setSession, cargarMisionData, cargarGramatica, hashSeed } from './main.js';
import { cargarMision, obtenerNodo, procesarNodo, procesarOpcion, filtrarOpciones } from './mission-engine.js';
import { generarMision } from './mission-generator.js';
import { iniciarMision } from './state.js';
import { consolidarOperacion } from './roster-store.js';
import { crearNarradorRasgos } from './trait-narrative.js';

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
let narrador = null;
let procesando = false;
let senalDespacho = 100;   // señal con la que se desplegó (gastada al escanear) — §5

// (El esquemático táctico/mapa se retiró — la operación es narrativa por radio.)

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

  mision = cargarMision(misionRaw);
  estado = iniciarMision(evento, misionRaw, equipo.map(a => JSON.parse(JSON.stringify(a))), liderId);
  narrador = crearNarradorRasgos();

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

  // Nivel de información de este tramo según la señal de despacho (§5)
  const info = infoTier(nodo.audio_hint);
  if (info.tier !== 'claro') appendDegradado(info);

  // Process node — applies effects, records historial, advances time
  const resultado = procesarNodo(nodo, estado, mision, {});

  // Cada bloque cae con su propia pausa: se lee como feed de radio, no como muro de texto.
  // Ambient line
  if (nodo.ambiente) { await delay(320); appendAmbiente(nodo.ambiente, info); scrollBottom(); }

  // Peso narrativo de las limitaciones provocadas por el entorno (drenaje, encierro, calma…)
  for (const m of narrador.porAmbiente(estado, nodo)) { await delay(650); appendRasgoInsert(m, info); scrollBottom(); }

  // Messages (staggered)
  for (const msg of resultado.mensajes) {
    await delay(500);
    appendMessage(msg, info);
    scrollBottom();
  }

  // Resultado del check — su visibilidad es parte de la mecánica de señal (§5)
  if (resultado.check_resultado) {
    await delay(480);
    appendCheckResult(resultado.check_resultado, info);
    scrollBottom();
    // Un fallo saca la limitación de quien actuó; un crítico de éxito, su ventaja.
    for (const m of narrador.porCheck(estado, resultado.check_resultado)) { await delay(650); appendRasgoInsert(m, info); scrollBottom(); }
  }

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
    // Un solo camino = "Continuar" (no es una decisión); dos o más = decisión real.
    if (resultado.opciones_disponibles.length === 1) {
      showAdvanceOption(nodo, resultado.opciones_disponibles[0]);
      return;
    }
    showDecisionButtons(nodo, resultado.opciones_disponibles, info);
    return;
  }

  // Avance controlado: un clic = un beat. Antes el motor encadenaba solo por los
  // checks (que se auto-resuelven) hasta la próxima decisión, volcando varios nodos
  // de una. Ahora cada nodo espera "▶ Continuar". Los nodos de resolución son
  // plumbing (resolución → final), así que esos sí avanzan solos.
  if (resultado.siguiente) {
    if (nodo.tipo === 'resolucion') {
      await delay(450);
      stepNode(resultado.siguiente);
    } else {
      showContinueButton(resultado.siguiente);
    }
  }
}

function showContinueButton(siguiente) {
  const zone = document.getElementById('decision-zone');
  zone.innerHTML = '';
  const btns = document.createElement('div');
  btns.className = 'decision-btns';
  const b = document.createElement('button');
  b.className = 'decision-btn continue';
  b.textContent = '▶ Continuar';
  b.addEventListener('click', async () => {
    b.disabled = true;
    zone.innerHTML = '';
    await stepNode(siguiente);
  });
  btns.appendChild(b);
  zone.appendChild(btns);
  scrollBottom();
}

// Nodo de un solo camino (reconocimiento/acuse de Control): botón Continuar que
// aplica esa única opción (sus efectos) y avanza. No se presenta como "decisión".
function showAdvanceOption(nodo, op) {
  const zone = document.getElementById('decision-zone');
  zone.innerHTML = '';
  const btns = document.createElement('div');
  btns.className = 'decision-btns';
  const b = document.createElement('button');
  b.className = 'decision-btn continue';
  b.textContent = '▶ Continuar';
  b.addEventListener('click', async () => {
    b.disabled = true;
    zone.innerHTML = '';
    appendSelectedOption(op.texto);
    const siguiente = procesarOpcion(nodo, estado, 0);
    renderStatusPanel();
    scrollBottom();
    if (siguiente) await stepNode(siguiente);
  });
  btns.appendChild(b);
  zone.appendChild(btns);
  scrollBottom();
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

  const isControl = msg.canal === 'CONTROL';
  const isSistema = msg.canal === 'SISTEMA';
  const chanCls   = isControl ? 'control' : isSistema ? 'sistema' : 'agent';
  row.className = `coms-message ${chanCls}`;
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

// Insert de rasgo: la ventaja/limitación de un agente aflorando en la transmisión.
function appendRasgoInsert(m, info) {
  const log = document.getElementById('coms-log');
  const el = document.createElement('div');
  const neg = m.polaridad === '-';
  el.className = `coms-rasgo ${neg ? 'neg' : 'pos'} ${sigClase(info)}`;
  const tag = document.createElement('span');
  tag.className = 'rasgo-tag';
  tag.textContent = `${neg ? '▽ limitación' : '▲ ventaja'} · ${m.rasgo}`;
  const txt = document.createElement('div');
  txt.className = 'rasgo-text';
  txt.textContent = corromper(m.texto, info ? info.corrupt : 0);
  el.appendChild(tag);
  el.appendChild(txt);
  log.appendChild(el);
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
  row.className = 'coms-message sistema';
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
