import { getSession, setSession, cargarMisionData, cargarGramatica, hashSeed } from './main.js';
import { cargarMision, obtenerNodo, procesarNodo, procesarOpcion } from './mission-engine.js';
import { generarMision } from './mission-generator.js';
import { iniciarMision } from './state.js';
import { consolidarOperacion } from './roster-store.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const SIG_BARS = { silencio: '▇▇▇▇', estatica_baja: '▇▇▇░', estatica_media: '▇▇░░', estatica_alta: '▇░░░', alerta_critica: '!!!!' };
const PENAL = { silencio: 0, estatica_baja: 5, estatica_media: 20, estatica_alta: 40, alerta_critica: 10 };
const CHECK_FLAVOR = {
  'crítico_éxito': 'El equipo ejecuta con margen de sobra.',
  'éxito': 'El equipo resuelve el paso.',
  'fallo': 'El paso se complica.',
  'crítico_fallo': 'Algo sale mal.',
};

let estado = null, mision = null, senalDespacho = 100;

function infoTier(audio) {
  const eff = Math.max(0, senalDespacho - (PENAL[audio] ?? 0));
  if (eff >= 60) return { tier: 'claro', eff, corrupt: 0 };
  if (eff >= 35) return { tier: 'degradado', eff, corrupt: 0.025 };
  return { tier: 'critico', eff, corrupt: 0.08 };
}
const sigClase = (info) => (!info || info.tier === 'claro') ? '' : (info.tier === 'critico' ? 'sig-crit' : 'sig-deg');
function corromper(t, p) {
  if (!p) return t;
  let o = ''; for (const ch of t) o += (ch === ' ' || ch === '\n') ? ch : (Math.random() < p ? '█' : ch);
  return o;
}

// Reloj real del teléfono
function tickReloj() {
  const n = new Date();
  document.getElementById('mr-clock').textContent =
    `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

const thread = () => document.getElementById('mr-thread');
function scrollAbajo() { const t = thread(); t.scrollTop = t.scrollHeight; }

function burbuja(tipo, canal, texto, hora, sig = '') {
  const row = document.createElement('div');
  row.className = `mr-bubble ${tipo}`;
  row.innerHTML = `<div class="mr-canal">${canal}</div><div class="mr-texto ${sig}">${texto}</div><div class="mr-hora">${hora}</div>`;
  thread().appendChild(row);
  scrollAbajo();
}
function sistemaLinea(texto) {
  const el = document.createElement('div');
  el.className = 'mr-sistema';
  el.textContent = texto;
  thread().appendChild(el);
  scrollAbajo();
}

// Ventana de contacto: cuenta regresiva antes de la siguiente transmisión.
async function ventana(segs) {
  const cd = document.getElementById('mr-countdown');
  for (let s = segs; s > 0; s--) {
    cd.textContent = `próxima ventana de contacto en ${s}s…`;
    await delay(1000);
  }
  cd.textContent = '';
}

async function avanzar(nodoId) {
  const nodo = obtenerNodo(mision, nodoId);
  if (!nodo) { sistemaLinea(`[error: nodo ${nodoId}]`); return; }

  const info = infoTier(nodo.audio_hint);
  document.getElementById('mr-sig').textContent = SIG_BARS[nodo.audio_hint] || SIG_BARS.silencio;
  document.getElementById('mr-sig').className = `op-signal ${info.tier === 'critico' ? 'crit' : info.tier === 'degradado' ? 'low' : ''}`;

  const resultado = procesarNodo(nodo, estado, mision, {});
  const hora = estado.tiempo_simulado;

  if (info.tier !== 'claro') sistemaLinea(info.tier === 'critico' ? `señal crítica ${info.eff}% — Protocolo 9` : `señal degradada ${info.eff}%`);

  for (const msg of resultado.mensajes) {
    await delay(420);
    const esControl = msg.canal === 'CONTROL';
    const esSistema = msg.canal === 'SISTEMA';
    const tipo = esControl ? 'saliente' : esSistema ? 'sistema' : 'entrante';
    burbuja(tipo, msg.canal, corromper(msg.texto, info.corrupt), hora, sigClase(info));
  }

  if (resultado.check_resultado) {
    const cr = resultado.check_resultado;
    await delay(300);
    const txt = info.tier === 'critico' ? 'sin confirmación · señal degradada' : (CHECK_FLAVOR[cr.resultado] || '');
    sistemaLinea(`— ${txt} —`);
  }

  if (resultado.es_final || nodo.tipo === 'final') {
    burbuja('sistema', 'CIERRE', nodo.titulo || 'Operación concluida', hora);
    setSession('op_estado_final', estado);
    setSession('op_mision_id', mision.id);
    if (getSession('op_consolidada') !== mision.id) {
      try { consolidarOperacion(estado, mision, getSession('op_evento')); setSession('op_consolidada', mision.id); } catch {}
    }
    finalReplies();
    return;
  }

  if (resultado.requiere_decision) {
    showReplies(nodo, resultado.opciones_disponibles, info);
    return;
  }

  if (resultado.siguiente) {
    await ventana(nodo.tipo === 'check' ? 4 : 3);
    avanzar(resultado.siguiente);
  }
}

function showReplies(nodo, opciones, info) {
  const zone = document.getElementById('mr-replies');
  zone.innerHTML = '';
  opciones.forEach((op, idx) => {
    const btn = document.createElement('button');
    btn.className = 'mr-code-btn';
    const label = info.tier === 'claro' ? op.texto : corromper(op.texto, Math.max(info.corrupt, 0.18));
    btn.innerHTML = `<span class="mr-code">CÓD ${idx + 1}</span> ${label}`;
    btn.addEventListener('click', async () => {
      zone.innerHTML = '';
      burbuja('saliente', 'CONTROL', `CÓD ${idx + 1}`, estado.tiempo_simulado);
      const siguiente = procesarOpcion(nodo, estado, idx);
      if (siguiente) { await ventana(3); avanzar(siguiente); }
    });
    zone.appendChild(btn);
  });
  scrollAbajo();
}

function finalReplies() {
  const zone = document.getElementById('mr-replies');
  zone.innerHTML = '';
  const a = document.createElement('a');
  a.className = 'mr-code-btn'; a.href = './reporte.html';
  a.innerHTML = `<span class="mr-code">CÓD 1</span> ver cierre`;
  const b = document.createElement('a');
  b.className = 'mr-code-btn'; b.href = './index.html';
  b.innerHTML = `<span class="mr-code">CÓD 0</span> volver al mapa`;
  zone.appendChild(a); zone.appendChild(b);
}

async function init() {
  tickReloj(); setInterval(tickReloj, 30000);
  const evento = getSession('op_evento');
  const equipo = getSession('op_equipo');
  const liderId = getSession('op_lider_id');
  if (!evento || !equipo?.length) { window.location.href = './briefing.html'; return; }

  const despacho = getSession('op_despacho');
  senalDespacho = (despacho && typeof despacho.senal_pct === 'number') ? despacho.senal_pct : 100;

  document.getElementById('mr-title').textContent = (evento.icono_mapa && evento.icono_mapa.etiqueta) || 'Equipo en campo';
  document.getElementById('mr-sub').textContent = `FREC 7 · ${evento.criatura_sospechada.replace(/_/g, ' ')}`;

  let misionRaw, grammar = null;
  try { grammar = await cargarGramatica(); } catch { /* fallback */ }
  if (grammar && grammar.creatureTags[evento.criatura_sospechada]) {
    const seed = getSession('op_seed') ?? hashSeed(evento.id);
    misionRaw = generarMision(evento, seed, { grammar, scan_estado: getSession('op_scan_estado') || { nivel: 0 } });
  } else {
    misionRaw = await cargarMisionData(evento.mision_asociada);
  }
  setSession('op_mision_obj', misionRaw);
  mision = cargarMision(misionRaw);
  estado = iniciarMision(evento, misionRaw, equipo.map((a) => JSON.parse(JSON.stringify(a))), liderId);

  sistemaLinea('Canal abierto con el equipo en campo. Esperando primera transmisión.');
  await ventana(2);
  avanzar(mision.nodo_inicial);
}

init().catch((err) => {
  console.error('[CENVAC movil]', err);
  document.getElementById('mr-thread').innerHTML = `<div class="mr-sistema" style="color:var(--red-hi)">Error: ${err.message}</div>`;
});
