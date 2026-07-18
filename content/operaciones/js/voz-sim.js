/**
 * voz-sim.js — Simulador de voz del códec (estilo Undertale / Papers Please).
 *
 * No hay archivos de audio ni TTS: cada carácter que se teclea en el códec dispara
 * un "blip" sintetizado. El truco para que suene a habla y no a máquina de escribir:
 *
 *   - El TIMBRE depende de la letra. Las vocales abren un filtro de formante en su
 *     frecuencia real (a/e/i/o/u suenan distinto); las consonantes se dividen en
 *     fricativas (ruido), oclusivas (click) y nasales/líquidas (tono corto).
 *   - La ENTONACIÓN recorre la frase: el tono cae hacia el final, sube en '?' y
 *     golpea más fuerte en '!'. Con jitter por blip para que no quede robótico.
 *   - Cada personaje tiene un PERFIL estable (onda, tono base, ritmo) derivado de
 *     su id, así la misma voz suena igual siempre sin hornear nada.
 *
 * Todo pasa por un bus de RADIO (banda angosta + saturación + estática + squelch)
 * para que salga por el walkie y no de estudio. Escala infinito: una línea nueva
 * no cuesta nada, ni un MP3 ni una llamada a API.
 *
 * Todos los números vivos están en AJUSTES; `voz-lab.html` los mueve en vivo y
 * escupe el JSON para pegarlo acá abajo.
 */

// ── Ajustes globales (los que mueve el playground) ───────────────────────────
export const AJUSTES = {
  // Entonación y articulación
  contorno: 0.15,       // cuánto cae el tono hacia el final de la frase
  jitter: 0.12,         // variación aleatoria de tono por blip (0 = robot)
  pregunta: 0.28,       // cuánto sube el tono en una línea con '?'
  exclamacion: 1.12,    // multiplicador de tono en una línea con '!'
  durVocal: 0.095,      // duración del blip de vocal — ahora sostiene la sílaba entera
  durCons: 0.042,       // duración del blip de consonante sonora (s)
  glissando: 0.04,      // micro-barrido de tono dentro del blip
  qFormante: 4,         // resonancia del formante F1 (alto = más "vocal")
  qFormante2: 6,        // resonancia del formante F2
  cuerpo: 0.45,         // camino directo sin filtrar: el fundamental, el peso de la voz
  volVoz: 2.2,          // ganancia general del bus de voz
  vibrato: 1,           // escala global del temblor por emoción
  aliento: 1,           // escala global de la respiración audible
  pausaBase: 520,       // ms de silencio entre líneas antes de aplicar la emoción
  // Densidad: la voz pulsa por SÍLABA, no por letra. Un sonido por carácter es
  // exactamente lo que hace que suene a máquina de escribir.
  porSilaba: 1,         // 1 = solo las vocales disparan el pulso tonal
  consonantes: 0,       // cuánto se oyen las consonantes (0 = mudas, 1 = golpe seco)
  // Ritmo de tecleo
  charMs: 42,           // milisegundos por carácter — el pulso del habla
  msFinFrase: 7,        // pausa en . ! ? …
  msPausa: 4,           // pausa en , ; : —
  msEspacio: 1.4,
  // Bus de radio
  busHP: 240,           // corta graves (bocina chica) — sin comerse el fundamental
  busLP: 3300,          // corta agudos (banda angosta de radio)
  busPeakF: 1650,       // realce nasal de walkie
  busPeakG: 4,
  crunch: 12,           // saturación
  estatica: 0.012,      // ruido de fondo — apenas perceptible, solo "canal vivo"
  squelch: 0.07,        // golpe de apertura/cierre del canal
};

// ── Canales ──────────────────────────────────────────────────────────────────
// Control y la unidad en calle no se distinguen por la voz sino por la RADIO que
// los trae. Cada canal tiene su propia cadena, su lugar en el estéreo y su tono
// de apertura, que es la pista más fuerte: antes de la primera sílaba ya sabés
// quién habla. Coincide con el lado del retrato en pantalla.
export const CANALES = {
  // ── El de la unidad en calle ────────────────────────────────────────────
  campo: {
    nombre: 'PORTÁTIL', desc: 'Handy pegado a la boca. Ancho, seco, inmediato.',
    tint: '#33ff66', freq: '141.00',
    pan: -0.45, hp: 200, lp: 3600, peakF: 1500, peakG: 3, crunch: 8,
    vol: 1, eco: 0, latencia: 0, apertura: [[1500, 0.045]],       // click seco de PTT
  },

  // ── Candidatos para Control: elegí uno ──────────────────────────────────
  control: {
    nombre: 'ESTACIÓN BASE', desc: 'Sala de operaciones. Angosto, saturado, con cola de cuarto.',
    tint: '#d9c84a', freq: '140.85',
    pan: 0.45, hp: 480, lp: 2300, peakF: 1900, peakG: 7, crunch: 24,
    vol: 0.95, eco: 0.22, latencia: 0, apertura: [[1180, 0.07], [880, 0.11]],
  },
  repetidora: {
    nombre: 'REPETIDORA', desc: 'Rebotado por un cerro. Lejano, delgado, con tono de enlace.',
    tint: '#d99a4a', freq: '146.52',
    pan: 0.6, hp: 620, lp: 1900, peakF: 1500, peakG: 9, crunch: 32,
    vol: 0.8, eco: 0.12, latencia: 0, apertura: [[1600, 0.05], [1600, 0.11], [1200, 0.17]],
  },
  satelital: {
    nombre: 'ENLACE SATELITAL', desc: 'Llega tarde. Limpio pero con retardo — se nota la distancia.',
    tint: '#5aa0ff', freq: '—',
    pan: 0.25, hp: 380, lp: 2800, peakF: 1700, peakG: 4, crunch: 12,
    vol: 0.9, eco: 0.06, latencia: 0.22, apertura: [[900, 0.06], [1350, 0.13]],
  },
  bunker: {
    nombre: 'BÚNKER PROFUNDO', desc: 'Habla desde abajo de la tierra. Grave, con mucha sala.',
    tint: '#8affc0', freq: '140.20',
    pan: 0.4, hp: 300, lp: 1800, peakF: 900, peakG: 6, crunch: 18,
    vol: 1, eco: 0.42, latencia: 0, apertura: [[700, 0.08], [520, 0.14]],
  },
  megafono: {
    nombre: 'ALTOPARLANTE', desc: 'Perifoneo institucional al centro. Duro, plano, con plaza detrás.',
    tint: '#c8a84a', freq: 'PA',
    pan: 0, hp: 520, lp: 2400, peakF: 2100, peakG: 10, crunch: 30,
    vol: 1, eco: 0.35, latencia: 0, apertura: [[1000, 0.05]],
  },
  intervenido: {
    nombre: 'SEÑAL INTERVENIDA', desc: 'Alguien más en la frecuencia. Sucio, angosto, inestable.',
    tint: '#d24a3a', freq: '???',
    pan: 0.15, hp: 700, lp: 1700, peakF: 1250, peakG: 11, crunch: 40,
    vol: 0.85, eco: 0.1, latencia: 0.05, apertura: [[420, 0.04], [1750, 0.09], [610, 0.15]],
  },
  cinta: {
    nombre: 'GRABACIÓN RECUPERADA', desc: 'No es en vivo: es una cinta. Opaco, sin brillo, con hueco.',
    tint: '#9fdcb0', freq: 'REC',
    pan: -0.15, hp: 260, lp: 2200, peakF: 1100, peakG: 5, crunch: 16,
    vol: 0.85, eco: 0.18, latencia: 0, apertura: [[300, 0.03]],
  },
};

// ── Emociones ────────────────────────────────────────────────────────────────
// Multiplicadores que se aplican encima del perfil de la voz, así cualquier
// personaje puede decir cualquier línea en cualquier estado. La regla de oro:
// el miedo agudiza y acelera, la tristeza grava y arrastra, la ira aprieta.
// Además del timbre, tres cosas que es donde de verdad se siente el estado:
//   pausa   — cuánto se demora ANTES de contestar. El silencio actúa.
//   aliento — respiración audible al abrir el micrófono (miedo, dolor, cansancio).
//   vibrato — temblor sostenido dentro de la sílaba, no entre sílabas.
export const EMOCIONES = {
  neutral:  { tono: 1.00, jitter: 1.0, contorno: 1.0, vel: 1.00, vol: 1.00, dur: 1.00, gliss: 1.0, pausa: 1.0, aliento: 0,    vibrato: 0 },
  tenso:    { tono: 1.05, jitter: 1.4, contorno: 0.8, vel: 0.92, vol: 0.95, dur: 0.92, gliss: 1.2, pausa: 1.3, aliento: 0.15, vibrato: 0.004 },
  asustado: { tono: 1.20, jitter: 2.4, contorno: 0.5, vel: 0.78, vol: 0.85, dur: 0.78, gliss: 1.7, pausa: 0.5, aliento: 0.75, vibrato: 0.02 },
  agitado:  { tono: 1.12, jitter: 1.7, contorno: 0.7, vel: 0.62, vol: 1.15, dur: 0.82, gliss: 1.3, pausa: 0.3, aliento: 0.5,  vibrato: 0.01 },
  enojado:  { tono: 0.94, jitter: 1.3, contorno: 1.1, vel: 0.85, vol: 1.40, dur: 1.10, gliss: 0.7, pausa: 0.6, aliento: 0.25, vibrato: 0.006 },
  triste:   { tono: 0.84, jitter: 0.7, contorno: 2.1, vel: 1.45, vol: 0.72, dur: 1.28, gliss: 0.6, pausa: 2.6, aliento: 0.4,  vibrato: 0.008 },
  herido:   { tono: 0.90, jitter: 2.0, contorno: 1.6, vel: 1.30, vol: 0.65, dur: 1.15, gliss: 0.9, pausa: 1.9, aliento: 1.0,  vibrato: 0.024 },
  frio:     { tono: 0.97, jitter: 0.4, contorno: 0.6, vel: 1.05, vol: 0.90, dur: 1.00, gliss: 0.5, pausa: 1.1, aliento: 0,    vibrato: 0 },
};
const EMO_NEUTRAL = EMOCIONES.neutral;

// Formantes aproximados del español (F1, F2) en Hz.
const VOCALES = {
  a: [720, 1240], e: [500, 1900], i: [320, 2300], o: [500, 900], u: [330, 780],
  á: [720, 1240], é: [500, 1900], í: [320, 2300], ó: [500, 900], ú: [330, 780],
};
const FRICATIVAS = 'sfjzxhvc';       // ruido sostenido
const OCLUSIVAS = 'ptkbdgq';         // click seco
const NASALES = 'mnñlrywáéíóú';      // tono corto y grave

const FIN_FRASE = '.!?…';
const PAUSA = ',;:—-';

/** Perfil de voz estable a partir de un texto semilla (id del agente). */
export function perfilVoz(semilla, { control = false, lider = false } = {}) {
  let h = 0;
  for (const c of String(semilla)) h = (h * 31 + c.charCodeAt(0)) | 0;
  const r = (n) => Math.abs((h >> n) % 100) / 100;

  if (control) {
    // Control es institucional: grave, parejo, sin prisa. Habla desde una silla.
    return { onda: 'square', base: 104, formante: 0.78, dur: 1.35, vol: 0.075, canal: 'control' };
  }
  return {
    onda: r(2) < 0.5 ? 'square' : 'sawtooth',
    // La unidad vive una octava arriba de Control: separación de registro, no de matiz.
    base: lider ? 176 + r(4) * 16 : 205 + r(6) * 60,
    formante: 1.05 + r(10) * 0.3,                      // tracto más corto = voz más chica
    dur: 0.85 + r(14) * 0.3,                           // y habla más rápido que Control
    vol: 0.06 + r(16) * 0.02,
    canal: 'campo',
  };
}

/**
 * Crea el sintetizador sobre un AudioContext vivo.
 * @param ajustes  overrides parciales de AJUSTES (el playground manda los suyos)
 */
export function crearVozSim(ctx, destino, ajustes = {}) {
  const A = { ...AJUSTES, ...ajustes };

  // Un bus de radio POR CANAL: cada fuente suena por un aparato distinto.
  const buses = {};
  function busDe(nombre) {
    const key = CANALES[nombre] ? nombre : 'campo';
    if (buses[key]) return buses[key];
    const C = CANALES[key];

    const bus = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass';
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.Q.value = 0.9;
    const shaper = ctx.createWaveShaper();
    const salida = ctx.createGain();
    bus.connect(hp); hp.connect(lp); lp.connect(peak); peak.connect(shaper); shaper.connect(salida);

    // Cola de sala: Control transmite desde un búnker, no desde la calle.
    if (C.eco > 0) {
      const d = ctx.createDelay(0.5); d.delayTime.value = 0.075;
      const fb = ctx.createGain(); fb.gain.value = 0.28;
      const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 1600;
      const mezcla = ctx.createGain(); mezcla.gain.value = C.eco;
      shaper.connect(d); d.connect(damp); damp.connect(fb); fb.connect(d);
      damp.connect(mezcla); mezcla.connect(salida);
    }

    // Latencia: el enlace tarda en llegar. Retarda TODO lo del canal, voz y tonos,
    // así que la transmisión se oye después de que el texto ya empezó a escribirse.
    let ultimo = salida;
    if (C.latencia > 0) {
      const lat = ctx.createDelay(1.5); lat.delayTime.value = C.latencia;
      salida.connect(lat); ultimo = lat;
    }
    // Posición estéreo: coincide con el lado del retrato en pantalla.
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner(); pan.pan.value = C.pan;
      ultimo.connect(pan); ultimo = pan;
    }
    ultimo.connect(destino);

    buses[key] = { bus, hp, lp, peak, shaper, salida, C };
    aplicarBus(buses[key]);
    return buses[key];
  }

  function aplicarBus(b) {
    const { C } = b;
    // Los ajustes globales del lab se aplican como DESVÍO sobre el canal, para que
    // mover una perilla no borre la diferencia entre Control y campo.
    const dHP = A.busHP - AJUSTES.busHP, dLP = A.busLP - AJUSTES.busLP;
    const dPeak = A.busPeakG - AJUSTES.busPeakG, dCrunch = A.crunch - AJUSTES.crunch;
    b.bus.gain.value = A.volVoz * C.vol;
    b.hp.frequency.value = Math.max(40, C.hp + dHP);
    b.lp.frequency.value = Math.max(800, C.lp + dLP);
    b.peak.frequency.value = C.peakF;
    b.peak.gain.value = Math.max(0, C.peakG + dPeak);
    b.shaper.curve = curvaCrunch(Math.max(0.5, C.crunch + dCrunch));
  }
  /** Cambia ajustes en caliente (el playground llama esto en cada slider). */
  function setAjustes(nuevos) { Object.assign(A, nuevos); Object.values(buses).forEach(aplicarBus); }

  let ruido = null;
  function bufferRuido() {
    if (ruido) return ruido;
    ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ruido;
  }

  /**
   * Un blip por carácter.
   * @param ch    carácter recién tecleado
   * @param p     perfil de la voz
   * @param prog  0..1 posición dentro de la línea (para la entonación)
   * @param tono  'alto' (pregunta) | 'fuerte' (exclamación) | null
   */
  let ultimoEraVocal = false;   // para no repicar dentro de un diptongo

  function blip(ch, p, prog = 0, tono = null, emocion = 'neutral') {
    const c = String(ch).toLowerCase();
    if (!c.trim() || FIN_FRASE.includes(c) || PAUSA.includes(c)) { ultimoEraVocal = false; return; }

    const E = (typeof emocion === 'object' ? emocion : EMOCIONES[emocion]) || EMO_NEUTRAL;
    const t = ctx.currentTime;
    // Contorno de entonación: cae hacia el final de la frase, con jitter por sílaba.
    const jit = A.jitter * E.jitter;
    let f = p.base * E.tono * (1 - prog * A.contorno * E.contorno) * (1 - jit / 2 + Math.random() * jit);
    if (tono === 'alto') f *= 1 + prog * A.pregunta;    // la pregunta sube al final
    if (tono === 'fuerte') f *= A.exclamacion;

    const vocal = VOCALES[c];
    const esFric = FRICATIVAS.includes(c);
    const esOclu = OCLUSIVAS.includes(c);
    const esNasal = NASALES.includes(c);

    // Diptongo: "ue", "ai" son UNA sílaba, así que la segunda vocal no repica.
    const seguido = vocal && ultimoEraVocal;
    ultimoEraVocal = !!vocal;
    if (seguido) return;

    // Consonantes: apenas un soplo que articula la sílaba siguiente. Fuerte y
    // brillante suena a tecla; suave y grave suena a boca.
    const cons = A.consonantes;
    if (esFric && !vocal) {
      if (cons > 0.01) ruidoCorto(t, 1900 * p.formante, 0.05 * p.dur * E.dur, p.vol * E.vol * cons * 0.9, p.canal);
      return;
    }
    if (esOclu && !vocal) {
      if (cons > 0.01) ruidoCorto(t, 700 * p.formante, 0.02 * p.dur * E.dur, p.vol * E.vol * cons * 0.7, p.canal);
      return;
    }
    // Nasales y líquidas: en modo sílaba no pulsan solas, solo colorean.
    if (!vocal && A.porSilaba >= 0.5) {
      if (esNasal && cons > 0.01) ruidoCorto(t, 420 * p.formante, 0.03 * p.dur * E.dur, p.vol * E.vol * cons * 0.5, p.canal);
      return;
    }

    // Vocales y sonoras: oscilador + par de formantes.
    const [f1, f2] = vocal || (esNasal ? [380, 1100] : [560, 1500]);
    const dur = (vocal ? A.durVocal : A.durCons) * p.dur * E.dur;
    const vol = p.vol * E.vol * (vocal ? 1 : 0.7) * (tono === 'fuerte' ? 1.35 : 1);

    const o = ctx.createOscillator(); o.type = p.onda;
    // Micro-glissando: el tono se mueve dentro del propio blip, como una sílaba real.
    const gl = A.glissando * E.gliss;
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * (vocal ? 1 + gl : 1 - gl), t + dur);

    // Vibrato: temblor DENTRO de la sílaba. El jitter varía de sílaba a sílaba;
    // esto es la voz que no se le queda quieta mientras habla.
    if (E.vibrato > 0) {
      const lfo = ctx.createOscillator(); lfo.frequency.value = 6.5 + Math.random() * 2;
      const prof = ctx.createGain(); prof.gain.value = f * E.vibrato * A.vibrato;
      lfo.connect(prof); prof.connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.02);
    }

    // Los formantes van en PARALELO y se suman — encadenarlos en serie apagaba la
    // voz, porque un bandpass angosto en 1900 Hz no deja pasar un tono de 200 Hz.
    // El camino directo ("cuerpo") conserva el fundamental: es el peso de la voz.
    const suma = ctx.createGain(); suma.gain.value = 1;
    const formante = (freq, q, amp) => {
      const b = ctx.createBiquadFilter(); b.type = 'bandpass';
      b.frequency.value = freq; b.Q.value = q;
      const bg = ctx.createGain(); bg.gain.value = amp;
      o.connect(b); b.connect(bg); bg.connect(suma);
    };
    formante(f1 * p.formante, A.qFormante, 1);
    formante(f2 * p.formante, A.qFormante2, 0.55);
    const cuerpo = ctx.createGain(); cuerpo.gain.value = A.cuerpo;
    o.connect(cuerpo); cuerpo.connect(suma);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    suma.connect(g); g.connect(busDe(p.canal).bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function ruidoCorto(t, freq, dur, vol, canal) {
    const n = ctx.createBufferSource(); n.buffer = bufferRuido();
    // Q bajo = soplo ancho y difuso (boca). Q alto = click estrecho (tecla).
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); g.connect(busDe(canal).bus);
    n.start(t, Math.random() * 0.15, dur + 0.01);
  }

  // ── Apertura y cierre de transmisión ──────────────────────────────────────
  // El tono de apertura es la pista más fuerte de todas: suena ANTES de la primera
  // sílaba, así que ya sabés quién habla sin haber oído la voz.
  let abierto = null;
  function abrirCanal(nombre = 'campo') {
    if (abierto) cerrarCanal();
    const b = busDe(nombre);
    const n = ctx.createBufferSource(); n.buffer = bufferRuido(); n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = b.C.peakF; bp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = A.estatica;
    n.connect(bp); bp.connect(g); g.connect(b.salida); n.start();
    abierto = { n, g, b };
    tonoApertura(b);
  }
  function cerrarCanal() {
    if (!abierto) return;
    const b = abierto.b;
    try { abierto.g.gain.value = 0; abierto.n.stop(); } catch { }
    abierto = null;
    squelch(0.02, b);
  }
  /** Firma sonora del canal: click de PTT para la unidad, tono doble para Control. */
  function tonoApertura(b) {
    const t0 = ctx.currentTime;
    squelch(0, b);
    b.C.apertura.forEach(([freq, retardo], i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
      const g = ctx.createGain();
      const t = t0 + retardo, dur = b.C.apertura.length > 1 ? 0.075 : 0.03;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(A.squelch * (i === 0 ? 1.1 : 0.9), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(b.salida);
      o.start(t); o.stop(t + dur + 0.01);
    });
  }
  /**
   * Respiración audible al abrir el micrófono. Es lo que convierte una voz en
   * alguien: el que tiene miedo entra jadeando antes de decir la primera sílaba.
   */
  function aliento(p, emocion = 'neutral') {
    const E = (typeof emocion === 'object' ? emocion : EMOCIONES[emocion]) || EMO_NEUTRAL;
    const cant = E.aliento * A.aliento;
    if (cant <= 0.01) return;
    const b = busDe(p && p.canal);
    const t = ctx.currentTime;
    const dur = 0.16 + cant * 0.14;
    const n = ctx.createBufferSource(); n.buffer = bufferRuido();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = 480 + Math.random() * 180; bp.Q.value = 0.5;
    const g = ctx.createGain();
    // Envolvente de inhalación: entra y se va, no un golpe.
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 * cant, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(g); g.connect(b.bus);
    n.start(t, Math.random() * 0.1, dur + 0.02);
  }

  /** Cuánto callar antes de la próxima línea. El silencio también actúa. */
  function pausaDe(emocion = 'neutral') {
    const E = (typeof emocion === 'object' ? emocion : EMOCIONES[emocion]) || EMO_NEUTRAL;
    return A.pausaBase * E.pausa * (0.85 + Math.random() * 0.3);
  }

  function squelch(delay, b) {
    const t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
    const n = ctx.createBufferSource(); n.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = b.C.peakF;
    const g = ctx.createGain(); g.gain.value = A.squelch;
    n.connect(bp); bp.connect(g); g.connect(b.salida); n.start(t);
  }

  return { blip, aliento, pausaDe, abrirCanal, cerrarCanal, setAjustes, ajustes: A, busDe };
}

/**
 * Retardo de tecleo por carácter: la puntuación respira, las vocales se sostienen
 * y la emoción cambia el pulso entero (el miedo corre, la tristeza arrastra).
 */
export function ritmoChar(ch, baseMs, A = AJUSTES, emocion = 'neutral') {
  const E = (typeof emocion === 'object' ? emocion : EMOCIONES[emocion]) || EMO_NEUTRAL;
  const ms = baseMs * E.vel;
  if (FIN_FRASE.includes(ch)) return ms * A.msFinFrase;
  if (PAUSA.includes(ch)) return ms * A.msPausa;
  if (ch === ' ') return ms * A.msEspacio;
  return ms * (0.8 + Math.random() * 0.5);
}

function curvaCrunch(k) {
  const n = 256, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
  return c;
}
