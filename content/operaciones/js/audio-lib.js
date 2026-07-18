/**
 * audio-lib.js — Reproductor de audio con archivos reales.
 *
 * Por qué existe: la síntesis procedural tiene un techo. Sirve para lo que debe
 * reaccionar en vivo y sin costura (la voz del códec, la cama de tensión), pero un
 * disparo, un grito o un rugido son señales de banda ancha y comportamiento caótico
 * que no se imitan con osciladores. Para eso van grabaciones.
 *
 * Cómo funciona:
 *   - `manifest.json` declara qué archivo corresponde a cada sonido lógico.
 *   - Un sonido puede tener VARIANTES: se elige una al azar y se le mueve la
 *     afinación un poco. Sin eso, repetir el mismo disparo suena a videojuego —
 *     que es exactamente el problema a evitar.
 *   - Si el archivo no está, cae al sintetizador. Así el proyecto nunca se rompe
 *     por un asset faltante y se pueden ir reemplazando de a uno.
 *
 * La música usa CAPAS VERTICALES: todos los loops suenan a la vez y sincronizados,
 * y lo que cambia es cuáles están audibles. Así se pasa de patrulla a combate sin
 * cortar ni esperar a que termine el loop — la solución que usan los juegos reales
 * al problema de "la escena no tiene duración fija".
 */

export const BASE_AUDIO = '../data/operaciones/audio';

/**
 * Calibración del bus de grabaciones contra el del sintetizador.
 *
 * Los archivos se normalizan a pico −1 dBFS (para no perder rango dinámico en el
 * MP3), pero el sintetizador de `ambiente.js` trabaja mucho más abajo: sus SFX usan
 * vol ~0.1 y pasan por un master a 0.55, o sea un pico efectivo de ~−24 dBFS. Sin
 * esta calibración una grabación entra ~22 dB por encima y entierra a todo lo que
 * todavía es sintetizado — en `acecho`, por ejemplo, la lámina y la respiración
 * tapaban a pasos/piedra/crujido/corrida.
 *
 * Se deja un par de dB por arriba del sinte a propósito: la grabación debe notarse
 * mejor, no dominar. Subir este número hace que lo grabado pese más en la mezcla.
 */
export const GANANCIA_ARCHIVO = 0.16;   // ≈ −16 dB

export function crearAudioLib(ctx, destino) {
  const buffers = new Map();      // clave → AudioBuffer
  let manifest = null, cargando = null;

  const master = ctx.createGain(); master.gain.value = 1; master.connect(destino);
  const musG = ctx.createGain(); musG.gain.value = 0; musG.connect(master);
  const sfxG = ctx.createGain(); sfxG.gain.value = GANANCIA_ARCHIVO; sfxG.connect(master);

  /** Lee el manifiesto. Si no existe, la librería queda vacía y todo cae al sinte. */
  async function cargarManifest() {
    if (manifest) return manifest;
    if (cargando) return cargando;
    cargando = fetch(`${BASE_AUDIO}/manifest.json`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(m => { manifest = m || { sfx: {}, musica: {} }; return manifest; })
      .catch(() => { manifest = { sfx: {}, musica: {} }; return manifest; });
    return cargando;
  }

  async function cargarBuffer(ruta) {
    if (buffers.has(ruta)) return buffers.get(ruta);
    try {
      const r = await fetch(`${BASE_AUDIO}/${ruta}`);
      if (!r.ok) throw new Error(r.status);
      const buf = await ctx.decodeAudioData(await r.arrayBuffer());
      buffers.set(ruta, buf);
      return buf;
    } catch {
      buffers.set(ruta, null);      // se recuerda el fallo: no reintentar en loop
      return null;
    }
  }

  /** ¿Hay archivo real para este sonido? */
  function tiene(clave) {
    return !!(manifest && manifest.sfx && manifest.sfx[clave] && manifest.sfx[clave].length);
  }

  /**
   * Dispara un SFX grabado.
   * @returns true si sonó un archivo; false si hay que caer al sintetizador.
   */
  function sfx(clave, { vol = 1, pan = (Math.random() * 2 - 1) * 0.6, tono = 1 } = {}) {
    if (!tiene(clave)) return false;
    const variantes = manifest.sfx[clave];
    const ruta = variantes[Math.floor(Math.random() * variantes.length)];
    const buf = buffers.get(ruta);
    if (!buf) { cargarBuffer(ruta); return false; }   // primera vez: precarga y falla suave

    const src = ctx.createBufferSource(); src.buffer = buf;
    // Variación de afinación: dos disparos idénticos delatan el truco.
    src.playbackRate.value = tono * (0.94 + Math.random() * 0.12);
    const g = ctx.createGain(); g.gain.value = vol * (0.85 + Math.random() * 0.3);
    let ultimo = g; src.connect(g);
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      g.connect(p); ultimo = p;
    }
    ultimo.connect(sfxG);
    src.start();
    return true;
  }

  /** Precarga todo lo declarado, para que el primer disparo no llegue tarde. */
  async function precargar() {
    await cargarManifest();
    const rutas = [
      ...Object.values(manifest.sfx || {}).flat(),
      ...Object.values(manifest.musica || {}).flat(),
    ];
    await Promise.all(rutas.map(cargarBuffer));
    return {
      sfx: Object.keys(manifest.sfx || {}).filter(tiene).length,
      capas: Object.keys(manifest.musica || {}).length,
      cargados: [...buffers.values()].filter(Boolean).length,
      fallidos: [...buffers.entries()].filter(([, b]) => !b).map(([r]) => r),
    };
  }

  // ── Música por capas verticales ───────────────────────────────────────────
  // Todas las capas arrancan juntas y en loop; el estado solo decide el volumen
  // de cada una. Cambiar de estado es un crossfade, nunca un corte.
  const capas = new Map();        // nombre → { src, gain }
  let musicaViva = false;

  async function iniciarMusica(vol = 0.6) {
    await cargarManifest();
    const decl = manifest.musica || {};
    if (!Object.keys(decl).length) return false;     // sin archivos: que siga el sinte
    if (musicaViva) { musG.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1); return true; }

    const t0 = ctx.currentTime + 0.1;
    for (const [nombre, rutas] of Object.entries(decl)) {
      const buf = await cargarBuffer(rutas[0]);
      if (!buf) continue;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(musG);
      src.start(t0);                                  // todas en fase: por eso se pueden mezclar
      capas.set(nombre, { src, gain: g });
    }
    if (!capas.size) return false;
    musicaViva = true;
    musG.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
    return true;
  }

  /** @param mezcla {capa: volumen 0..1} — lo que no se nombra se baja a 0. */
  function mezclarMusica(mezcla, rampa = 2.5) {
    if (!musicaViva) return false;
    const t = ctx.currentTime;
    for (const [nombre, capa] of capas) {
      const v = mezcla[nombre] ?? 0;
      capa.gain.gain.linearRampToValueAtTime(v, t + rampa);
    }
    return true;
  }

  function pararMusica() {
    if (!musicaViva) return;
    musG.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    setTimeout(() => {
      capas.forEach(c => { try { c.src.stop(); } catch { } });
      capas.clear(); musicaViva = false;
    }, 1700);
  }

  const setVolumenMusica = (v) => musG.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.2);
  // v es relativo a la calibración: 1 = nivel calibrado, no ganancia unitaria.
  const setVolumenSFX = (v) => sfxG.gain.linearRampToValueAtTime(v * GANANCIA_ARCHIVO, ctx.currentTime + 0.2);

  return {
    cargarManifest, precargar, sfx, tiene,
    iniciarMusica, mezclarMusica, pararMusica, setVolumenMusica, setVolumenSFX,
    get hayMusica() { return musicaViva; },
    get manifest() { return manifest; },
  };
}
