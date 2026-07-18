/**
 * ui-voz-lab.js — Banco de pruebas del modulador de voz.
 *
 * Herramienta interna: monta voz-sim.js con todos sus parámetros expuestos como
 * sliders, reproduce guiones reales del recon y escupe un JSON con los ajustes
 * para pegarlo en el chat y fijarlos como valores por defecto.
 *
 * No es parte del archivo narrativo — no se enlaza desde ninguna página pública.
 */
import { AJUSTES, CANALES, EMOCIONES, crearVozSim, perfilVoz, ritmoChar } from './voz-sim.js';
import { crearAmbiente, CATALOGO_SFX, TENSION_POR_EMOCION } from './ambiente.js';
import { crearMusica, ESTADOS as ESTADOS_MUS, ESTILOS as ESTILOS_MUS } from './musica.js';
import { crearAudioLib } from './audio-lib.js';

const $ = (id) => document.getElementById(id);

// ── Escenas reales del recon (copiadas de ui-sala.js) ────────────────────────
const ESCENAS = {
  'Patrulla — silencio': [
    'miembro/frio: Sector muerto. Ni un perro.',
    'lider/tenso: Mantengan formación. No me gusta este silencio.',
    'control/neutral: Sigan el corredor. No se desvíen.',
  ],
  'Hallazgo de intel': [
    'lider/neutral: Registrado. Hay datos aquí — Calle Juárez. Documentando.',
    'control/neutral: Recibido. Buen material. Sigan.',
  ],
  'Rastro fresco': [
    'miembro/tenso: Marcas frescas... algo pasó por aquí. No hace mucho.',
    'control/tenso: Marcado. Ojo con lo que despertaron.',
  ],
  'Contacto — avistamiento': [
    'miembro/asustado: ¡Movimiento! A las diez.',
    'lider/tenso: Alto. Nadie dispara. Control, ¿ven esto?',
    'control/frio: Negativo desde aquí. Ustedes son mis ojos.',
  ],
  'Asalto': [
    'lider/agitado: ¡Contacto encima! ¡Formen, cúbranse!',
    'control/tenso: Unidad, los tengo en cámara. Aguanten.',
    'miembro/herido: ¡Me rozó! Aguanto.',
    'control/enojado: Aguanten. Rómpanlo hacia el norte.',
    'lider/agitado: ¡Lo repelimos limpio! Se replegó.',
  ],
  'Decisión a Control': [
    'lider/tenso: Control, paso bloqueado. ¿Forzamos o rodeamos?',
    'control/frio: Autorizado. Rápido.',
    'miembro/agitado: Cede... pero sonó por todo el sector.',
  ],
  'Baja': [
    'lider/triste: Nos dio duro... pero se replegó. Tenemos un herido.',
    'control/frio: Recibido. Sáquenlo de ahí.',
    'miembro/triste: Me congelé. Lo dejo — y con él, lo que sabía.',
  ],
  'Nervios / falsa alarma': [
    'miembro/asustado: ...creí ver algo. Nada. Falsa alarma.',
    'miembro/tenso: Fue una rata. Solo una rata.',
    'lider/frio: Sombras y nervios. Manténganse.',
  ],
  // Arco completo: rutina → sospecha → contacto → asalto → pérdida.
  // Sirve para juzgar si las emociones se sienten EN SECUENCIA, que es como
  // se van a oír en la sala: una sola línea aislada no dice nada.
  'ARCO COMPLETO — patrulla, contacto, asalto, baja': [
    'control/frio: Unidad Cuatro, aquí Control. Están en el sector. Reporten al entrar.',
    'lider/neutral: Copiado, Control. Cruzando Madero. Todo tranquilo.',
    'miembro/neutral: Hay sol todavía. Se ve el mercado desde aquí.',
    'control/frio: Recibido. Documenten lo que encuentren y sigan al norte.',
    'lider/neutral: Entendido. Avanzamos.',

    'miembro/tenso: Líder... ¿esas puertas estaban abiertas?',
    'lider/tenso: No lo sé. Alto. Nadie se mueve.',
    'control/frio: Unidad, ¿qué ven?',
    'lider/tenso: Marcas en el piso. Frescas. Algo grande pasó por aquí.',
    'miembro/asustado: Hay algo respirando. Lo oigo. Lo oigo desde acá.',
    'control/tenso: Mantengan posición. No lo provoquen.',

    'miembro/asustado: ¡Se movió! ¡Se movió a la derecha!',
    'lider/agitado: ¡Contacto! ¡Formen, cúbranse!',
    'control/enojado: ¡Aguanten esa línea! ¡No corran!',
    'miembro/agitado: ¡Me tiene! ¡Me tiene el brazo!',
    'lider/enojado: ¡Suéltalo! ¡Rómpanlo hacia el norte, ahora!',
    'miembro/herido: Ah... ah, no puedo. No puedo mover el brazo.',
    'lider/agitado: ¡Lo tengo! ¡Se replegó! ¡Se está yendo!',
    'control/tenso: Unidad, reporten. Unidad, reporten estado.',

    'lider/herido: Control... aquí Cuatro. Se fue. Se fue solo.',
    'lider/triste: Tenemos un hombre en el piso. No responde.',
    'control/frio: Recibido, Cuatro. Confirmen estado del hombre.',
    'lider/triste: No hay estado que confirmar, Control.',
    'miembro/triste: Traía las fotos de su hija en el bolsillo. Las traía siempre.',
    'control/triste: ...Recibido. Tráiganlo de vuelta. Control fuera.',
    'lider/triste: Copiado. Cuatro fuera.',
  ],
  'Comparar canales (Control vs unidad)': [
    'control/frio: Unidad, aquí Control. Reporten posición.',
    'lider/neutral: Control, aquí unidad. En el cruce, sin novedad.',
    'control/frio: Recibido. Avancen dos cuadras y vuelvan a reportar.',
    'miembro/tenso: Copiado, Control.',
  ],
  'Comparar emociones (misma línea)': [
    'miembro/neutral: Hay algo en la calle. No se mueve.',
    'miembro/tenso: Hay algo en la calle. No se mueve.',
    'miembro/asustado: Hay algo en la calle. No se mueve.',
    'miembro/agitado: Hay algo en la calle. No se mueve.',
    'miembro/enojado: Hay algo en la calle. No se mueve.',
    'miembro/triste: Hay algo en la calle. No se mueve.',
    'miembro/herido: Hay algo en la calle. No se mueve.',
    'miembro/frio: Hay algo en la calle. No se mueve.',
  ],
};

// ── Macros ───────────────────────────────────────────────────────────────────
// Cuatro perillas que mueven varios parámetros a la vez. Es lo único que se ve
// por defecto; los sliders finos quedan plegados abajo para casos puntuales.
// Cada macro define `aplicar(v, ajustes, perfil)` con v de 0 a 100.
const MACROS = [
  {
    k: 'tono', etiqueta: 'Tono', desc: 'Grave = peso y amenaza. Agudo = juventud, nervio.',
    valor: (perfil) => perfil.base,
    min: 70, max: 340, paso: 1, unidad: 'Hz',
    aplicar: (v, A, perfil) => { perfil.base = v; },
  },
  {
    k: 'aspereza', etiqueta: 'Aspereza', desc: 'Suciedad de la voz: onda, saturación y realce nasal juntos.',
    min: 0, max: 100, paso: 1,
    aplicar: (v, A, perfil) => {
      A.crunch = 2 + v * 0.28;
      A.busPeakG = 1 + v * 0.09;
      perfil.onda = v > 55 ? 'sawtooth' : 'square';
    },
  },
  {
    k: 'velocidad', etiqueta: 'Velocidad', desc: 'El pulso del habla: tecleo y largo de sílaba a la vez.',
    min: 0, max: 100, paso: 1,
    aplicar: (v, A, perfil) => {
      A.charMs = 90 - v * 0.72;
      perfil.dur = 1.3 - v * 0.0055;
    },
  },
  {
    k: 'radio', etiqueta: 'Radio', desc: 'Cuánto se nota el walkie: banda, estática y squelch.',
    min: 0, max: 100, paso: 1,
    aplicar: (v, A) => {
      A.busHP = 120 + v * 2.2;
      A.busLP = 5200 - v * 35;
      A.estatica = v * 0.00022;   // apenas un hilo de ruido, no una cascada
      A.squelch = 0.01 + v * 0.0011;
    },
  },
];
// Posiciones que reproducen los valores base del módulo.
const MACROS_BASE = { aspereza: 36, velocidad: 67, radio: 54 };
let macros = { ...MACROS_BASE };

// ── Definición de sliders ────────────────────────────────────────────────────
// [clave, etiqueta, min, max, paso, descripción]
const SLIDERS = {
  'sliders-entonacion': [
    ['contorno', 'Caída de la frase', 0, 0.6, 0.01, 'Cuánto baja el tono hacia el final. Alto = resignado, bajo = plano.'],
    ['jitter', 'Jitter / humanidad', 0, 0.5, 0.01, 'Variación aleatoria por sílaba. En 0 suena a robot.'],
    ['pregunta', 'Subida en pregunta', 0, 1, 0.02, 'Cuánto sube el tono en una línea con "?".'],
    ['exclamacion', 'Golpe en exclamación', 1, 1.6, 0.01, 'Multiplicador de tono cuando la línea lleva "!".'],
  ],
  'sliders-articulacion': [
    ['porSilaba', 'Pulso por sílaba', 0, 1, 1, '1 = solo las vocales suenan (habla). 0 = suena cada letra (máquina de escribir).'],
    ['consonantes', 'Ruido de consonante', 0, 1, 0.02, 'Cuánto se oyen las consonantes. Alto = golpe de tecla; bajo = soplo de boca.'],
    ['durVocal', 'Largo de vocal', 0.02, 0.16, 0.005, 'Duración del blip de vocal. Largo = arrastrado.'],
    ['durCons', 'Largo de consonante', 0.01, 0.1, 0.002, 'Duración del blip de consonante sonora.'],
    ['glissando', 'Barrido por sílaba', 0, 0.2, 0.005, 'Cuánto se mueve el tono dentro de un mismo blip.'],
    ['volVoz', 'Presencia de la voz', 0.3, 6, 0.1, 'Ganancia general. Si la voz se pierde bajo el ambiente, subila.'],
    ['cuerpo', 'Cuerpo / fundamental', 0, 1.5, 0.05, 'Camino sin filtrar. Bajo = voz fina y lejana; alto = pecho y peso.'],
    ['qFormante', 'Resonancia F1', 0.5, 14, 0.5, 'Alto = vocales más marcadas y nasales.'],
    ['qFormante2', 'Resonancia F2', 0.5, 16, 0.5, 'Define cuánto se distinguen la "i" y la "e".'],
  ],
  'sliders-ritmo': [
    ['charMs', 'Velocidad de tecleo (ms)', 12, 110, 1, 'Milisegundos por carácter. Es el pulso del habla.'],
    ['msFinFrase', 'Pausa en punto (×)', 1, 14, 0.5, 'Cuánto respira en ". ! ? …".'],
    ['msPausa', 'Pausa en coma (×)', 1, 10, 0.5, 'Cuánto respira en ", ; : —".'],
    ['msEspacio', 'Pausa entre palabras (×)', 1, 4, 0.1, 'Separación entre palabras.'],
  ],
  'sliders-radio': [
    ['busHP', 'Corte de graves (Hz)', 80, 900, 10, 'Sube = bocina más chica y lejana.'],
    ['busLP', 'Corte de agudos (Hz)', 1200, 8000, 100, 'Baja = banda más angosta, más walkie.'],
    ['busPeakF', 'Realce nasal (Hz)', 600, 3000, 50, 'Dónde pega el realce típico de radio.'],
    ['busPeakG', 'Fuerza del realce (dB)', 0, 14, 0.5, 'Cuánto se marca ese realce.'],
    ['crunch', 'Saturación', 0, 40, 1, 'Suciedad de la señal. Alto = transmisión forzada.'],
    ['estatica', 'Estática de fondo', 0, 0.25, 0.005, 'Ruido mientras el canal está abierto.'],
    ['squelch', 'Squelch (apertura)', 0, 0.25, 0.005, 'El golpe seco al abrir y cerrar el canal.'],
  ],
};

// Multiplicadores de la emoción seleccionada (1.00 = no toca nada).
const SLIDERS_EMO = [
  ['tono', 'Tono', 0.6, 1.6, 0.01, 'Agudo = miedo o pánico; grave = pesadumbre o amenaza.'],
  ['jitter', 'Temblor', 0, 4, 0.05, 'Inestabilidad de la voz. Alto = le tiembla; bajo = control total.'],
  ['contorno', 'Caída de frase', 0, 3, 0.05, 'Alto = la frase se desinfla al final (tristeza, agotamiento).'],
  ['vel', 'Velocidad', 0.4, 2.2, 0.02, 'Menor a 1 = habla más rápido; mayor = arrastra las palabras.'],
  ['vol', 'Fuerza', 0.3, 2, 0.02, 'Cuánto proyecta. Alto = grita; bajo = casi no puede.'],
  ['dur', 'Largo de sílaba', 0.5, 1.8, 0.02, 'Corto = seco y entrecortado; largo = arrastrado.'],
  ['gliss', 'Quiebre de voz', 0, 3, 0.05, 'Cuánto se le quiebra el tono dentro de cada sílaba.'],
];

const SLIDERS_VOZ = [
  ['base', 'Tono base (Hz)', 70, 340, 1, 'La altura de la voz. Grave = más peso.'],
  ['formante', 'Tracto vocal', 0.6, 1.6, 0.02, 'Bajo = cuerpo grande y voz cavernosa; alto = voz chica.'],
  ['dur', 'Velocidad de articulación', 0.5, 2, 0.05, 'Multiplicador del largo de cada blip.'],
  ['vol', 'Volumen de la voz', 0.01, 0.2, 0.005, 'Qué tan fuerte transmite este rol.'],
];

// ── Estado ───────────────────────────────────────────────────────────────────
const BASE_AJUSTES = { ...AJUSTES, charMs: AJUSTES.charMs ?? 42 };
let ajustes = { ...BASE_AJUSTES };
const basePerfiles = () => ({
  miembro: perfilVoz('lab-miembro', {}),
  lider: perfilVoz('lab-lider', { lider: true }),
  control: perfilVoz('control', { control: true }),
});
let perfiles = basePerfiles();
const BASE_PERFILES = JSON.parse(JSON.stringify(perfiles));

let emociones = JSON.parse(JSON.stringify(EMOCIONES));
const BASE_EMOCIONES = JSON.parse(JSON.stringify(EMOCIONES));
const ETIQUETA_EMO = {
  neutral: 'Neutral', tenso: 'Tenso', asustado: 'Asustado', agitado: 'Agitado',
  enojado: 'Enojado', triste: 'Triste', herido: 'Herido', frio: 'Frío / procedimental',
};

const NOMBRE = { miembro: 'CBO. MIEMBRO DE UNIDAD', lider: 'SGTO. LÍDER DE UNIDAD', control: 'CENVAC CONTROL' };

let ctx = null, master = null, busAmb = null, sim = null, amb = null, mus = null, lib = null;
let volMaster = 0.35, volAmb = 0.8, volMus = 0.5;
let tw = null, reproduciendo = false, cancelado = false;
let ambienteOn = true;

function ensureAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Voz y ambiente cuelgan de buses SEPARADOS, los dos directo a la salida.
    // Antes el ambiente iba dentro del bus de voz y se comía dos atenuaciones
    // encadenadas (0.55 × 0.35), por eso no se oía.
    master = ctx.createGain(); master.gain.value = volMaster; master.connect(ctx.destination);
    busAmb = ctx.createGain(); busAmb.gain.value = 1; busAmb.connect(ctx.destination);
    sim = crearVozSim(ctx, master, ajustes);
    // La librería de archivos se consulta primero; lo que no exista cae al sinte.
    lib = crearAudioLib(ctx, busAmb);
    lib.precargar().then(r => {
      if (!r) return;
      const et = $('lab-assets');
      if (et) et.textContent = r.sfx
        ? `${r.sfx} sonidos con grabación · ${r.cargados} archivos cargados`
        : 'sin grabaciones — todo sintetizado (ver content/data/operaciones/audio/README.md)';
      repintarSFX();
    });
    amb = crearAmbiente(ctx, busAmb, lib);
    mus = crearMusica(ctx, busAmb);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return sim;
}

// ── Ambiente reactivo ────────────────────────────────────────────────────────
// La tensión sigue la emoción de la línea que se está diciendo, y los golpes se
// disparan en las TRANSICIONES: el primer grito, la primera muerte.
let tensionPrev = 0, huboContacto = false, huboBaja = false;

let huboHallazgo = false;

function reaccionarAmbiente(emo) {
  if (!amb || !ambienteOn) return;
  const t = TENSION_POR_EMOCION[emo] ?? 0.2;

  // Primera subida de la calma a la sospecha = encontraron algo.
  if (!huboHallazgo && t >= 0.38 && tensionPrev < 0.38) { mus.golpe('hallazgo'); huboHallazgo = true; }
  // Primer salto a pánico = contacto. Golpe una sola vez por reproducción.
  if (!huboContacto && t >= 0.9 && tensionPrev < 0.9) {
    amb.golpe('contacto'); mus.golpe('impacto'); huboContacto = true;
  } else if (t >= 0.7 && tensionPrev < 0.7) {
    mus.golpe('susto');           // el respingo antes del choque
  }
  // Entrar en duelo después de haber estado en combate = baja.
  if (!huboBaja && emo === 'triste' && huboContacto) {
    amb.golpe('baja'); amb.setLuto(true); huboBaja = true;
  }
  // La música sigue el mismo estado que el mundo.
  mus.setEstado(mus.porTension(t, amb.luto));
  // Rampa corta si la tensión sube (susto), larga si baja (el alivio cuesta).
  amb.setTension(t, t > tensionPrev ? 0.5 : 3.5);
  tensionPrev = t;
  pintarTension(t);
}

function pintarTension(t) {
  const barra = $('amb-barra'); if (!barra) return;
  barra.style.width = `${Math.round(t * 100)}%`;
  barra.classList.toggle('alta', t >= 0.7);
  $('amb-val').textContent = amb && amb.luto ? 'DUELO' : `${Math.round(t * 100)}%`;
}

function reiniciarAmbiente() {
  tensionPrev = 0; huboContacto = false; huboBaja = false; huboHallazgo = false;
  if (amb) { amb.setLuto(false, 0.4); amb.setTension(0.12, 0.4); }
  if (mus) mus.setEstado('recon', 0.4);
  pintarTension(0.12);
}

// ── Construcción de la UI ────────────────────────────────────────────────────
function crearSlider(cont, clave, etiqueta, min, max, paso, desc, get, set) {
  const wrap = document.createElement('div'); wrap.className = 'lab-slider';
  wrap.innerHTML = `
    <div class="lab-slider-top">
      <span class="lab-slider-name">${etiqueta}</span>
      <span class="lab-slider-val" data-val="${clave}"></span>
    </div>
    <input type="range" min="${min}" max="${max}" step="${paso}" data-k="${clave}">
    <div class="lab-slider-desc">${desc}</div>`;
  const input = wrap.querySelector('input');
  const out = wrap.querySelector('[data-val]');
  const pintar = () => { const v = get(); input.value = v; out.textContent = fmt(v); };
  input.addEventListener('input', () => { set(+input.value); out.textContent = fmt(+input.value); aplicar(); });
  cont.appendChild(wrap);
  return pintar;
}

const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''));

// Dos listas: las macros y los finos se repintan por separado para que mover una
// macro actualice los finos sin que los finos muevan la macro de vuelta.
const repMacro = [], repFino = [];

function montarMacros() {
  const cont = $('sliders-macro');
  MACROS.forEach(m => {
    repMacro.push(crearSlider(cont, `macro-${m.k}`, m.etiqueta, m.min, m.max, m.paso, m.desc,
      // El tono lee directo del perfil del rol; las demás guardan su posición.
      () => m.valor ? m.valor(perfiles[rolActual()]) : macros[m.k],
      (v) => {
        if (!m.valor) macros[m.k] = v;
        m.aplicar(v, ajustes, perfiles[rolActual()]);
        repintarFinos();
      }));
  });
}

function montarSliders() {
  for (const [contId, defs] of Object.entries(SLIDERS)) {
    const cont = $(contId);
    defs.forEach(([k, etiqueta, min, max, paso, desc]) => {
      repFino.push(crearSlider(cont, k, etiqueta, min, max, paso, desc,
        () => ajustes[k], (v) => { ajustes[k] = v; }));
    });
  }
  const contVoz = $('sliders-voz');
  SLIDERS_VOZ.forEach(([k, etiqueta, min, max, paso, desc]) => {
    repFino.push(crearSlider(contVoz, k, etiqueta, min, max, paso, desc,
      () => perfiles[rolActual()][k], (v) => { perfiles[rolActual()][k] = v; }));
  });
  const contEmo = $('sliders-emocion');
  SLIDERS_EMO.forEach(([k, etiqueta, min, max, paso, desc]) => {
    repFino.push(crearSlider(contEmo, k, etiqueta, min, max, paso, desc,
      () => emociones[emoActual()][k], (v) => { emociones[emoActual()][k] = v; }));
  });
}

const rolActual = () => $('sel-rol').value;
const emoActual = () => $('sel-emocion').value;

/** Solo los finos — lo que llama una macro al moverse. */
function repintarFinos() {
  repFino.forEach(f => f());
  $('sel-onda').value = perfiles[rolActual()].onda;
}

function repintar() {
  repMacro.forEach(f => f());
  repintarFinos();
  // Canal del rol que se está editando
  const canalRol = perfiles[rolActual()].canal;
  $('sel-canal').value = canalRol;
  $('canal-desc').textContent = (CANALES[canalRol] || {}).desc || '';
  document.querySelectorAll('.lab-canal').forEach(c => c.classList.toggle('asignado', c.dataset.canal === canalRol));
  $('lab-emo-nombre').textContent = ETIQUETA_EMO[emoActual()] || emoActual();
  document.querySelectorAll('.lab-chip').forEach(c => c.classList.toggle('on', c.dataset.emo === emoActual()));
  aplicar();
}

/** Reaplica las tres macros de rango sobre el rol activo (al cambiar de rol o resetear). */
function aplicarMacros() {
  MACROS.forEach(m => { if (!m.valor) m.aplicar(macros[m.k], ajustes, perfiles[rolActual()]); });
}

/** Empuja los ajustes al sintetizador vivo y refresca la salida JSON. */
function aplicar() {
  if (sim) sim.setAjustes(ajustes);
  $('out-json').value = serializar();
}

// ── Reproducción ─────────────────────────────────────────────────────────────
/** Cada renglón es `rol/emocion: texto`; ambos prefijos son opcionales. */
function parsearGuion() {
  return $('txt-guion').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(control|lider|miembro)(?:\s*\/\s*([a-záéíóú]+))?\s*:\s*(.+)$/i);
    if (!m) return { rol: 'miembro', emo: emoActual(), t: l };
    const emo = (m[2] || '').toLowerCase();
    return { rol: m[1].toLowerCase(), emo: emociones[emo] ? emo : emoActual(), t: m[3] };
  });
}

async function reproducir() {
  parar();
  ensureAudio();
  reiniciarAmbiente();
  if (ambienteOn) { amb.start(volAmb); mus.start(volMus); }
  cancelado = false; reproduciendo = true;
  for (const { rol, emo, t } of parsearGuion()) {
    if (cancelado) break;
    reaccionarAmbiente(emo);
    await decirLinea(t, perfiles[rol], emociones[emo], rol, emo);
    if (cancelado) break;
    // El silencio entre líneas lo dicta la emoción: el pánico atropella,
    // el duelo se queda callado un rato antes de contestar.
    await esperar(sim.pausaDe(emociones[emo]));
  }
  reproduciendo = false;
  // Al terminar, el ambiente baja solo pero no se corta: queda el eco de la escena.
  if (amb && !cancelado) amb.setTension(0.1, 6);
}

/** Enciende el canal que transmite y apaga los demás. */
function marcarCanal(canal) {
  document.querySelectorAll('.lab-canal').forEach(c => c.classList.toggle('on', c.dataset.canal === canal));
}

/** Lado del log según el paneo del canal: la vista sigue al oído. */
const ladoDe = (C) => C.pan < -0.1 ? 'izq' : C.pan > 0.1 ? 'der' : 'centro';

/** Agrega una transmisión al log, alineada y coloreada según su canal. */
function nuevaTx(rol, emo, canal) {
  const C = CANALES[canal] || CANALES.campo;
  const lado = ladoDe(C);
  const flecha = lado === 'der' ? '►' : lado === 'izq' ? '◄' : '▲';
  const log = $('lab-log');
  log.querySelectorAll('.lab-tx').forEach(e => e.classList.add('vieja'));
  const el = document.createElement('div');
  el.className = `lab-tx ${lado}`;
  el.style.setProperty('--tint', C.tint);
  el.innerHTML = `<div class="lab-tx-cab">${flecha} ${NOMBRE[rol] || rol.toUpperCase()} · ${C.nombre} · ${(ETIQUETA_EMO[emo] || emo).toUpperCase()}</div><div class="lab-tx-txt"></div>`;
  log.appendChild(el);
  while (log.children.length > 12) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
  return el.querySelector('.lab-tx-txt');
}

// ── Sonidos del sector: probarlos de a uno ───────────────────────────────────
const ETIQUETA_SFX = {
  rafaga: 'Ráfaga de viento', pajaro: 'Pájaro', grillos: 'Grillos', gota: 'Gota de agua',
  perro: 'Perro lejano', metal: 'Lámina de metal', papel: 'Basura arrastrada',
  pasos: 'Pasos en grava', piedra: 'Piedra que cae', crujido: 'Estructura crujiendo',
  respiracionLejana: 'Algo respirando', chillido: 'Chillido de criatura', rugido: 'Rugido cercano',
  garras: 'Garras sobre concreto', vidrio: 'Vidrio reventando', corrida: 'Corrida',
  campanaLejana: 'Campana lejana',
};
const GRUPO_SFX = {
  calma: 'Calma', inquieto: 'Inquietud', acecho: 'Acecho', combate: 'Combate', duelo: 'Duelo',
};

function montarSFX() {
  const cont = $('lab-sfx-grupos');
  const vistos = new Set();
  Object.entries(CATALOGO_SFX).forEach(([grupo, lista]) => {
    const h = document.createElement('div');
    h.className = 'lab-sfx-grupo';
    h.innerHTML = `<div class="lab-sfx-titulo">${grupo}</div>`;
    const fila = document.createElement('div'); fila.className = 'lab-emo-row';
    lista.forEach(n => {
      if (vistos.has(`${grupo}:${n}`)) return;
      vistos.add(`${grupo}:${n}`);
      const b = document.createElement('button');
      b.className = 'lab-chip'; b.dataset.sfx = n; b.textContent = ETIQUETA_SFX[n] || n;
      b.addEventListener('click', () => { ensureAudio(); marcarOrigen(b, amb.sfx(n)); });
      fila.appendChild(b);
    });
    h.appendChild(fila); cont.appendChild(h);
  });
}

/** Distingue visualmente lo grabado de lo sintetizado. */
function marcarOrigen(boton, origen) {
  boton.classList.toggle('real', origen === 'archivo');
}
function repintarSFX() {
  if (!amb) return;
  document.querySelectorAll('[data-sfx]').forEach(b => {
    b.classList.toggle('real', amb.origen(b.dataset.sfx) === 'archivo');
  });
}

// ── Canales: lista comparable + asignación por rol ───────────────────────────
function montarCanales() {
  const sel = $('sel-canal'), lista = $('lab-canal-lista');
  Object.entries(CANALES).forEach(([k, C]) => {
    const o = document.createElement('option'); o.value = k; o.textContent = C.nombre; sel.appendChild(o);

    const b = document.createElement('button');
    b.className = 'lab-canal'; b.dataset.canal = k; b.style.setProperty('--tint', C.tint);
    b.innerHTML = `<span class="lab-canal-luz"></span>
      <span class="lab-canal-nom">${C.nombre}</span>
      <span class="lab-canal-freq">${C.freq}</span>
      <span class="lab-canal-det">${C.desc}</span>`;
    // Click = escuchar ese canal con la voz del rol actual, sin asignarlo.
    b.addEventListener('click', () => probarCanal(k));
    lista.appendChild(b);
  });
  sel.addEventListener('change', () => {
    perfiles[rolActual()].canal = sel.value;
    repintar();
    probarCanal(sel.value);
  });
}

/** Dice la primera línea del guion por un canal dado, sin cambiar la asignación. */
async function probarCanal(canal) {
  parar(); ensureAudio(); cancelado = false;
  const linea = parsearGuion()[0] || { rol: rolActual(), emo: emoActual(), t: 'Unidad, aquí Control. Reporten posición.' };
  const perfil = { ...perfiles[linea.rol], canal };
  await decirLinea(linea.t, perfil, emociones[linea.emo], linea.rol, linea.emo);
}

function decirLinea(texto, perfil, emo, rol = 'miembro', emoNom = '') {
  return new Promise(res => {
    const canal = perfil.canal || 'campo';
    const el = nuevaTx(rol, emoNom, canal);
    marcarCanal(canal);
    const tono = /\?/.test(texto) ? 'alto' : /!/.test(texto) ? 'fuerte' : null;
    sim.abrirCanal(canal);
    sim.aliento(perfil, emo);   // respira antes de la primera sílaba
    let i = 0;
    const paso = () => {
      if (cancelado) { sim.cerrarCanal(); marcarCanal(null); return res(); }
      const ch = texto[i++];
      el.innerHTML = texto.slice(0, i) + '<span class="lab-cursor">▍</span>';
      sim.blip(ch, perfil, i / texto.length, tono, emo);
      if (i >= texto.length) {
        el.textContent = texto; sim.cerrarCanal(); marcarCanal(null);
        $('lab-log').scrollTop = $('lab-log').scrollHeight;
        return res();
      }
      tw = setTimeout(paso, ritmoChar(ch, ajustes.charMs, ajustes, emo));
    };
    paso();
  });
}

const esperar = (ms) => new Promise(r => { tw = setTimeout(r, ms); });

function parar() {
  cancelado = true; reproduciendo = false;
  clearTimeout(tw);
  if (sim) sim.cerrarCanal();
  if (amb) amb.stop();
  if (mus) mus.stop();
  marcarCanal(null);
}

// ── Salida ───────────────────────────────────────────────────────────────────
/** JSON con SOLO lo que difiere de los valores base — así el diff es legible. */
function serializar() {
  const difAjustes = {};
  for (const k of Object.keys(ajustes)) {
    if (ajustes[k] !== BASE_AJUSTES[k]) difAjustes[k] = redondear(ajustes[k]);
  }
  const difPerfiles = diffMapa(perfiles, BASE_PERFILES);
  const difEmociones = diffMapa(emociones, BASE_EMOCIONES);
  const sinCambios = !Object.keys(difAjustes).length && !Object.keys(difPerfiles).length && !Object.keys(difEmociones).length;
  return JSON.stringify({
    _nota: sinCambios ? 'sin cambios respecto a los valores base' : 'ajustes que cambié en el banco de pruebas',
    ajustes: difAjustes,
    perfiles: difPerfiles,
    emociones: difEmociones,
  }, null, 2);
}
/** Compara dos mapas anidados y devuelve solo lo que difiere. */
function diffMapa(actual, base) {
  const out = {};
  for (const grupo of Object.keys(actual)) {
    const d = {};
    for (const k of Object.keys(actual[grupo])) {
      if (actual[grupo][k] !== base[grupo][k]) d[k] = redondear(actual[grupo][k]);
    }
    if (Object.keys(d).length) out[grupo] = d;
  }
  return out;
}
const redondear = (v) => typeof v === 'number' ? +v.toFixed(4) : v;

// ── Cableado ─────────────────────────────────────────────────────────────────
function montarEscenas() {
  const sel = $('sel-escena');
  Object.keys(ESCENAS).forEach(nombre => {
    const o = document.createElement('option'); o.value = nombre; o.textContent = nombre; sel.appendChild(o);
  });
  sel.addEventListener('change', () => { $('txt-guion').value = ESCENAS[sel.value].join('\n'); });
  sel.value = 'Contacto — avistamiento';
  $('txt-guion').value = ESCENAS[sel.value].join('\n');
}

function montarEmociones() {
  const sel = $('sel-emocion'), chips = $('lab-emo-chips');
  Object.keys(emociones).forEach(k => {
    const o = document.createElement('option'); o.value = k; o.textContent = ETIQUETA_EMO[k] || k; sel.appendChild(o);
    // Chip = prueba rápida: dice la línea actual con esa emoción sin cambiar el selector.
    const b = document.createElement('button');
    b.className = 'lab-chip'; b.dataset.emo = k; b.textContent = ETIQUETA_EMO[k] || k;
    b.addEventListener('click', () => { sel.value = k; repintar(); probarEmocion(k); });
    chips.appendChild(b);
  });
  sel.value = 'tenso';
  sel.addEventListener('change', repintar);
}

/** Dice una sola línea de muestra con la emoción elegida (para comparar de a una). */
async function probarEmocion(emo) {
  parar(); ensureAudio(); cancelado = false;
  const linea = parsearGuion()[0] || { rol: 'miembro', t: 'Hay algo en la calle. No se mueve.' };
  await decirLinea(linea.t, perfiles[linea.rol], emociones[emo], linea.rol, emo);
}

montarEscenas();
montarEmociones();
montarCanales();
montarSFX();
montarMacros();
montarSliders();
repintar();

$('btn-play').addEventListener('click', reproducir);
$('btn-stop').addEventListener('click', parar);
$('btn-reset').addEventListener('click', () => {
  parar();
  ajustes = { ...BASE_AJUSTES };
  perfiles = JSON.parse(JSON.stringify(BASE_PERFILES));
  emociones = JSON.parse(JSON.stringify(BASE_EMOCIONES));
  macros = { ...MACROS_BASE };
  repintar();
});
// Al cambiar de rol, las macros globales se reaplican sobre ese perfil.
$('sel-rol').addEventListener('change', () => { aplicarMacros(); repintar(); });
$('sel-onda').addEventListener('change', () => { perfiles[rolActual()].onda = $('sel-onda').value; aplicar(); });
$('rng-amb').addEventListener('input', (e) => {
  volAmb = +e.target.value / 100;
  $('val-amb').textContent = e.target.value;
  if (amb) amb.master.gain.value = ambienteOn ? volAmb : 0;
});
$('rng-mus').addEventListener('input', (e) => {
  volMus = +e.target.value / 100;
  $('val-mus').textContent = e.target.value;
  if (mus) mus.setVolumen(volMus);
});
// Botones para escuchar cada estado musical y cada golpe por separado.
function montarMusica() {
  const cont = $('lab-mus-botones');
  const ESTADO_LBL = { recon: 'Recon / patrulla', sospecha: 'Sospecha', combate: 'Combate', duelo: 'Duelo' };
  Object.keys(ESTADOS_MUS).forEach(k => {
    const b = document.createElement('button');
    b.className = 'lab-chip'; b.textContent = `${ESTADO_LBL[k] || k} · ${ESTADOS_MUS[k].bpm} bpm`;
    b.addEventListener('click', () => {
      ensureAudio(); mus.start(volMus); mus.setEstado(k, 0.3);
      cont.querySelectorAll('.lab-chip').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
    });
    cont.appendChild(b);
  });
  const golpes = $('lab-mus-golpes');
  [['hallazgo', 'Hallazgo'], ['susto', 'Susto'], ['impacto', 'Impacto']].forEach(([k, lbl]) => {
    const b = document.createElement('button');
    b.className = 'lab-chip'; b.textContent = lbl;
    b.addEventListener('click', () => { ensureAudio(); mus.golpe(k); });
    golpes.appendChild(b);
  });
}
montarMusica();
// Selector de estilo musical: misma dramaturgia, otra banda tocándola.
function montarEstilos() {
  const sel = $('sel-estilo');
  Object.entries(ESTILOS_MUS).forEach(([k, E]) => {
    const o = document.createElement('option'); o.value = k; o.textContent = E.nombre; sel.appendChild(o);
  });
  const pintar = () => { $('estilo-desc').textContent = ESTILOS_MUS[sel.value].desc; };
  sel.addEventListener('change', () => {
    ensureAudio(); mus.setEstilo(sel.value); mus.start(volMus); pintar();
  });
  pintar();
}
montarEstilos();
$('chk-amb').addEventListener('change', (e) => {
  ambienteOn = e.target.checked;
  if (!amb) return;
  if (ambienteOn) { if (reproduciendo) { amb.start(volAmb); mus.start(volMus); } }
  else { amb.stop(); mus.stop(); }
});
$('rng-vol').addEventListener('input', (e) => {
  volMaster = +e.target.value / 100;
  $('val-vol').textContent = e.target.value;
  if (master) master.gain.value = volMaster;
});
$('btn-copiar').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('out-json').value); }
  catch { $('out-json').select(); document.execCommand('copy'); }
  const c = $('lab-copiado'); c.classList.add('on'); setTimeout(() => c.classList.remove('on'), 1400);
});
// Espacio reproduce, salvo mientras se escribe en el guion.
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
    e.preventDefault(); reproduciendo ? parar() : reproducir();
  }
});
