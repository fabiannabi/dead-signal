import { getSession, setSession, cargarMisionData, cargarGramatica, hashSeed } from './main.js';
import { cargarMision, obtenerNodo, procesarNodo, procesarOpcion, filtrarOpciones } from './mission-engine.js';
import { generarMision } from './mission-generator.js';
import { iniciarMision } from './state.js';

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

async function init() {
  const evento  = getSession('op_evento');
  const equipo  = getSession('op_equipo');
  const liderId = getSession('op_lider_id');

  if (!evento || !equipo?.length) {
    window.location.href = './briefing.html';
    return;
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

  // Process node — applies effects, records historial, advances time
  const resultado = procesarNodo(nodo, estado, mision, {});

  // Ambient line
  if (nodo.ambiente) appendAmbiente(nodo.ambiente);

  // Messages (staggered)
  for (const msg of resultado.mensajes) {
    await delay(100);
    appendMessage(msg);
  }


  renderStatusPanel();
  scrollBottom();
  procesando = false;

  // ── Branch on node outcome ───────────────────────────────────────────────

  if (resultado.es_final) {
    appendFinalBlock(nodo);
    setSession('op_estado_final', estado);
    setSession('op_mision_id', mision.id);
    showFinalActions();
    return;
  }

  if (resultado.requiere_decision) {
    showDecisionButtons(nodo, resultado.opciones_disponibles);
    return;
  }

  // Auto-advance (check, resolucion, narrativo with no options)
  if (resultado.siguiente) {
    await delay(nodo.tipo === 'check' ? 1100 : 450);
    stepNode(resultado.siguiente);
  }
}

// ── Decision buttons ────────────────────────────────────────────────────────

function showDecisionButtons(nodo, opciones) {
  const zone = document.getElementById('decision-zone');
  zone.innerHTML = '';

  const prompt = document.createElement('div');
  prompt.className = 'decision-prompt';
  prompt.textContent = '— Esperando instrucción de Control —';
  zone.appendChild(prompt);

  const btns = document.createElement('div');
  btns.className = 'decision-btns';

  opciones.forEach((op, idx) => {
    const btn = document.createElement('button');
    btn.className = 'decision-btn';
    btn.textContent = op.texto;
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

function appendAmbiente(texto) {
  const el = document.createElement('div');
  el.className = 'coms-ambient';
  el.textContent = texto;
  document.getElementById('coms-log').appendChild(el);
}

function appendMessage(msg) {
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
  textEl.className = `coms-text ${textCls}`;
  textEl.textContent = msg.texto.replace(/█/g, '');

  row.appendChild(chanEl);
  row.appendChild(textEl);
  log.appendChild(row);
}

function appendCheckResult(cr) {
  const log = document.getElementById('coms-log');
  const el = document.createElement('div');
  const resCls = cr.resultado.replace('_', '').replace('í', 'i').replace('é', 'e');
  el.className = `check-block ${cr.resultado.replace('ó', 'o').replace(/\_/g,'')}`;

  const resultLabel = {
    'crítico_éxito': 'CRÍTICO ÉXITO',
    'éxito':         'ÉXITO',
    'fallo':         'FALLO',
    'crítico_fallo': 'CRÍTICO FALLO',
  }[cr.resultado] || cr.resultado.toUpperCase();

  const resultCls = cr.resultado === 'crítico_éxito' ? 'critico_exito'
    : cr.resultado === 'crítico_fallo' ? 'critico_fallo'
    : cr.resultado === 'éxito' ? 'exito' : 'fallo';

  el.innerHTML = `<span class="check-label">CHECK ${cr.stat.toUpperCase()} · ${cr.agente}</span><br>` +
    `<span class="check-dice">d10=${cr.tirada}</span> · ` +
    `<span class="check-label">total=${cr.total} vs dif.${cr.dificultad}</span><br>` +
    `<span class="check-result ${resultCls}">${resultLabel}</span>`;

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
