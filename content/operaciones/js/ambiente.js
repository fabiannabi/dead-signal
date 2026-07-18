/**
 * ambiente.js — Banda sonora reactiva del recon, sintetizada en el navegador.
 *
 * No hay archivos de música: igual que la voz, todo se genera. La razón no es
 * ahorrar peso — es que la escena no tiene duración fija. Una patrulla puede durar
 * 40 segundos o cuatro minutos según cómo juegue el jugador, y un MP3 tendría que
 * loopear o cortarse. Acá el ambiente sigue la TENSIÓN en vivo: sube en el contacto
 * y se derrumba en la baja, sin costura ni fundido.
 *
 * Dos ejes, no uno:
 *   tension 0..1 — cuánta amenaza hay. Mueve pulso, disonancia y brillo.
 *   luto   bool  — el registro cambia: se va el pulso, entra el pad menor.
 *                  Lo que sigue a una muerte no es "menos tensión", es OTRA cosa.
 */

/** Qué puede sonar según el estado de la escena. Se lee sin instanciar audio. */
export const REPERTORIO = {
  calma: ['rafaga', 'pajaro', 'grillos', 'gota', 'perro', 'metal', 'papel'],
  inquieto: ['rafaga', 'gota', 'metal', 'crujido', 'pasos', 'piedra', 'papel', 'disparoLejano', 'aullido'],
  acecho: ['pasos', 'piedra', 'crujido', 'respiracionLejana', 'garras', 'metal', 'siseo', 'gorgoteo', 'pisadaPesada'],
  combate: ['chillido', 'rugido', 'garras', 'vidrio', 'corrida', 'disparo', 'rafagaTiros', 'grito', 'mandibulas', 'pisadaPesada', 'casquillo'],
  duelo: ['rafaga', 'campanaLejana', 'gota', 'metal', 'gritoLejano'],
};

/** Todo lo disponible, agrupado para la interfaz (incluye lo que no se agenda solo). */
export const CATALOGO_SFX = {
  'Mundo': ['rafaga', 'pajaro', 'grillos', 'gota', 'perro', 'metal', 'papel'],
  'Acecho': ['pasos', 'piedra', 'crujido', 'respiracionLejana', 'corrida'],
  'Armas': ['disparo', 'rafagaTiros', 'disparoLejano', 'casquillo', 'recarga', 'explosion'],
  'Humanos': ['grito', 'gritoLejano', 'cuerpoCae'],
  'Criaturas': ['chillido', 'rugido', 'garras', 'gorgoteo', 'siseo', 'mandibulas', 'pisadaPesada', 'aullido'],
  'Otros': ['vidrio', 'campanaLejana'],
};

export const TENSION_POR_EMOCION = {
  neutral: 0.14, frio: 0.10, tenso: 0.45, asustado: 0.72,
  agitado: 0.96, enojado: 0.80, herido: 0.52, triste: 0.20,
};

export function crearAmbiente(ctx, destino, lib = null) {
  const master = ctx.createGain(); master.gain.value = 0;
  master.connect(destino);

  let tension = 0, luto = false, vivo = false, pulsoTimer = null;

  // ── Capa 1: drone. El suelo, siempre presente. ────────────────────────────
  const droneG = ctx.createGain(); droneG.gain.value = 0.5; droneG.connect(master);
  const drones = [41.2, 55, 82.4].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? 'sine' : 'triangle'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = i === 2 ? 0.06 : 0.14;
    o.connect(g); g.connect(droneG); o.start();
    return { o, g, base: f };
  });

  // ── Capa 2: viento. Ruido filtrado que respira. ───────────────────────────
  const vientoBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const vd = vientoBuf.getChannelData(0);
  for (let i = 0; i < vd.length; i++) vd[i] = (Math.random() * 2 - 1) * 0.5;
  const viento = ctx.createBufferSource(); viento.buffer = vientoBuf; viento.loop = true;
  const vientoLP = ctx.createBiquadFilter(); vientoLP.type = 'lowpass'; vientoLP.frequency.value = 420;
  const vientoG = ctx.createGain(); vientoG.gain.value = 0.14;
  viento.connect(vientoLP); vientoLP.connect(vientoG); vientoG.connect(master); viento.start();

  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.02;
  lfo.connect(lfoG); lfoG.connect(vientoG.gain); lfo.start();

  // ── Capa 3: disonancia. Entra sola cuando hay amenaza. ────────────────────
  // Un tritono contra el drone: el intervalo que el oído lee como "algo está mal".
  const disoG = ctx.createGain(); disoG.gain.value = 0; disoG.connect(master);
  [58.3, 116.5].forEach(f => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = ctx.createGain(); g.gain.value = 0.09;
    o.connect(lp); lp.connect(g); g.connect(disoG); o.start();
  });

  // ── Capa 4: duelo. Pad menor, solo en luto. ───────────────────────────────
  const lutoG = ctx.createGain(); lutoG.gain.value = 0; lutoG.connect(master);
  [110, 130.8, 164.8].forEach((f, i) => {          // La menor: la, do, mi
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = 0.13 - i * 0.025;
    o.connect(g); g.connect(lutoG); o.start();
  });

  // ── Capa 5: pulso. El latido que acelera con la tensión. ──────────────────
  function latido() {
    if (!vivo || luto || tension < 0.3) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(78, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16 * tension, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.17);
  }
  function programarPulso() {
    clearTimeout(pulsoTimer);
    if (!vivo) return;
    // 58 lpm en calma → 132 lpm en pánico.
    const bpm = 58 + tension * 74;
    latido();
    pulsoTimer = setTimeout(programarPulso, 60000 / bpm);
  }

  // ── Biblioteca de sonidos del mundo ───────────────────────────────────────
  // Lo que hace que un sector se sienta habitado no es el drone: son las cosas
  // concretas que suenan lejos. Todas se sintetizan y se ubican al azar en el
  // estéreo, para que el sector tenga ancho.

  /** Ruta con paneo aleatorio: cada evento cae en un lugar distinto del sector. */
  function salida(pan = (Math.random() * 2 - 1) * 0.8) {
    const g = ctx.createGain();
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      g.connect(p); p.connect(master);
    } else g.connect(master);
    return g;
  }

  /** Ráfaga de ruido con envolvente y filtro — la base de casi todo. */
  function ruido(dest, { t = ctx.currentTime, dur = 0.3, freq = 800, q = 1, vol = 0.2, tipo = 'bandpass', barrido = 1 }) {
    const n = ctx.createBufferSource(); n.buffer = vientoBuf; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q;
    if (barrido !== 1) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * barrido), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.04, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(dest);
    n.start(t, Math.random() * 2, dur + 0.05);
    return n;
  }

  /** Tono con barrido de altura — chillidos, gotas, ladridos. */
  function tono(dest, { t = ctx.currentTime, f0, f1, dur = 0.2, vol = 0.2, tipo = 'sine' }) {
    const o = ctx.createOscillator(); o.type = tipo;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03);
  }

  const SFX = {
    // — Mundo en calma ————————————————————————————————
    rafaga() {                       // viento que cruza la calle
      const d = salida();
      ruido(d, { dur: 2.6, freq: 320, q: 0.5, vol: 0.13, barrido: 2.6 });
    },
    pajaro() {                       // algo vivo, todavía
      const d = salida();
      const t0 = ctx.currentTime;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++)
        tono(d, { t: t0 + i * 0.13, f0: 2400, f1: 3500, dur: 0.05, vol: 0.06 });
    },
    grillos() {                      // el zumbido de un lote baldío
      const d = salida();
      const t0 = ctx.currentTime;
      for (let i = 0; i < 6; i++)
        ruido(d, { t: t0 + i * 0.07, dur: 0.03, freq: 4600, q: 12, vol: 0.045 });
    },
    gota() {                         // agua cayendo en un charco
      const d = salida();
      tono(d, { f0: 1100, f1: 320, dur: 0.11, vol: 0.11 });
    },
    perro() {                        // ladridos a varias cuadras
      const d = salida();
      const t0 = ctx.currentTime;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        tono(d, { t: t0 + i * 0.33, f0: 240, f1: 150, dur: 0.16, vol: 0.09, tipo: 'sawtooth' });
        ruido(d, { t: t0 + i * 0.33, dur: 0.12, freq: 700, q: 1.5, vol: 0.05 });
      }
    },
    metal() {                        // lámina que se mueve sola
      const d = salida();
      [437, 611, 892].forEach((f, i) => {
        tono(d, { f0: f, f1: f * 0.98, dur: 1.6 - i * 0.3, vol: 0.05 - i * 0.012, tipo: 'triangle' });
      });
    },
    papel() {                        // basura arrastrándose
      const d = salida();
      ruido(d, { dur: 0.8, freq: 2600, q: 0.8, vol: 0.05, barrido: 0.6 });
    },

    // — Algo se acerca ————————————————————————————————
    pasos() {                        // pisadas sobre grava
      const d = salida();
      const t0 = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        ruido(d, { t: t0 + i * 0.42, dur: 0.1, freq: 260, q: 0.9, vol: 0.12, barrido: 0.5 });
      }
    },
    piedra() {                       // algo cae y rebota
      const d = salida();
      const t0 = ctx.currentTime;
      [0, 0.14, 0.23, 0.29].forEach((r, i) =>
        ruido(d, { t: t0 + r, dur: 0.09, freq: 900 - i * 90, q: 2, vol: 0.11 - i * 0.022 }));
    },
    crujido() {                      // madera o estructura cediendo
      const d = salida();
      ruido(d, { dur: 1.1, freq: 420, q: 6, vol: 0.09, barrido: 0.55 });
    },
    respiracionLejana() {            // algo respira y no se ve
      const d = salida();
      const t0 = ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        ruido(d, { t: t0 + i * 1.1, dur: 0.5, freq: 380, q: 0.7, vol: 0.09, barrido: 1.5 });
      }
    },

    // — Amenaza declarada ————————————————————————————
    chillido() {                     // vocalización de criatura
      const d = salida();
      const t0 = ctx.currentTime;
      tono(d, { t: t0, f0: 620, f1: 1750, dur: 0.5, vol: 0.16, tipo: 'sawtooth' });
      tono(d, { t: t0 + 0.05, f0: 940, f1: 2400, dur: 0.42, vol: 0.08, tipo: 'square' });
      ruido(d, { t: t0, dur: 0.55, freq: 2200, q: 1.2, vol: 0.09, barrido: 1.6 });
    },
    rugido() {                       // masa grande, muy cerca
      const d = salida(Math.random() * 0.4 - 0.2);
      const t0 = ctx.currentTime;
      tono(d, { t: t0, f0: 92, f1: 58, dur: 1.3, vol: 0.3, tipo: 'sawtooth' });
      ruido(d, { t: t0, dur: 1.35, freq: 300, q: 0.6, vol: 0.16, barrido: 0.5 });
    },
    garras() {                       // raspado sobre concreto
      const d = salida();
      ruido(d, { dur: 0.65, freq: 3200, q: 2.5, vol: 0.13, barrido: 0.32 });
    },
    vidrio() {                       // ventana que revienta
      const d = salida();
      const t0 = ctx.currentTime;
      ruido(d, { t: t0, dur: 0.3, freq: 5200, q: 0.6, vol: 0.16, barrido: 0.7 });
      for (let i = 0; i < 7; i++)
        tono(d, { t: t0 + 0.04 + Math.random() * 0.45, f0: 2600 + Math.random() * 3200, f1: 1800, dur: 0.09, vol: 0.05 });
    },
    corrida() {                      // pasos rápidos, se aleja o se acerca
      const d = salida();
      const t0 = ctx.currentTime;
      for (let i = 0; i < 8; i++)
        ruido(d, { t: t0 + i * 0.16, dur: 0.08, freq: 300, q: 1, vol: 0.13 - i * 0.008, barrido: 0.5 });
    },

    // — Armas ——————————————————————————————————————
    disparo() {                      // rifle cerca: crack + cuerpo + cola de calle
      const d = salida(Math.random() * 0.5 - 0.25);
      const t = ctx.currentTime;
      ruido(d, { t, dur: 0.035, freq: 6000, q: 0.4, vol: 0.5, barrido: 0.4 });   // el crack
      tono(d, { t, f0: 220, f1: 55, dur: 0.14, vol: 0.35, tipo: 'sawtooth' });   // el cuerpo
      ruido(d, { t: t + 0.03, dur: 0.5, freq: 900, q: 0.5, vol: 0.12, barrido: 0.35 });
      ruido(d, { t: t + 0.11, dur: 0.9, freq: 500, q: 0.4, vol: 0.06, barrido: 0.5 }); // eco entre casas
    },
    rafagaTiros() {                  // automático: tres o cuatro seguidos
      const t0 = ctx.currentTime;
      for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
        const d = salida(Math.random() * 0.4 - 0.2);
        const t = t0 + i * 0.09;
        ruido(d, { t, dur: 0.03, freq: 5600, q: 0.4, vol: 0.4, barrido: 0.4 });
        tono(d, { t, f0: 210, f1: 58, dur: 0.11, vol: 0.28, tipo: 'sawtooth' });
      }
    },
    disparoLejano() {                // a cuadras: sin crack, solo el retumbo
      const d = salida();
      const t = ctx.currentTime;
      tono(d, { t, f0: 130, f1: 48, dur: 0.3, vol: 0.16, tipo: 'sine' });
      ruido(d, { t, dur: 1.1, freq: 420, q: 0.4, vol: 0.09, barrido: 0.45 });
    },
    casquillo() {                    // el bronce cayendo al piso
      const d = salida();
      const t0 = ctx.currentTime;
      [0, 0.09, 0.15, 0.19].forEach((r, i) =>
        tono(d, { t: t0 + r, f0: 3200 - i * 300, f1: 2400, dur: 0.05, vol: 0.07 - i * 0.014, tipo: 'triangle' }));
    },
    recarga() {                      // mecanismo: dos clacs metálicos
      const d = salida();
      const t0 = ctx.currentTime;
      [0, 0.22].forEach((r, i) => {
        ruido(d, { t: t0 + r, dur: 0.05, freq: 1800, q: 3, vol: 0.13 });
        tono(d, { t: t0 + r, f0: 900, f1: 600, dur: 0.06, vol: 0.07, tipo: 'square' });
      });
    },
    explosion() {                    // algo revienta lejos
      const d = salida();
      const t = ctx.currentTime;
      tono(d, { t, f0: 90, f1: 26, dur: 1.6, vol: 0.42, tipo: 'sine' });
      ruido(d, { t, dur: 1.9, freq: 700, q: 0.3, vol: 0.28, barrido: 0.2 });
      ruido(d, { t: t + 0.25, dur: 2.4, freq: 320, q: 0.3, vol: 0.1, barrido: 0.5 });
    },

    // — Humanos ————————————————————————————————————
    grito() {                        // grito de dolor: formante que se quiebra
      const d = salida();
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(310, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.12);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.75);
      // Vibrato ancho: la voz humana al límite no se sostiene quieta.
      const lfo = ctx.createOscillator(); lfo.frequency.value = 11;
      const lfoG = ctx.createGain(); lfoG.gain.value = 26;
      lfo.connect(lfoG); lfoG.connect(o.frequency); lfo.start(t); lfo.stop(t + 0.8);
      // Dos formantes en paralelo: lo que lo hace leer como boca y no como sirena.
      const suma = ctx.createGain();
      [[720, 4], [1600, 6]].forEach(([f, q]) => {
        const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q;
        o.connect(b); b.connect(suma);
      });
      const dry = ctx.createGain(); dry.gain.value = 0.3; o.connect(dry); dry.connect(suma);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      suma.connect(g); g.connect(d);
      o.start(t); o.stop(t + 0.9);
      ruido(d, { t: t + 0.02, dur: 0.6, freq: 1900, q: 0.8, vol: 0.05 });   // aire de la garganta
    },
    gritoLejano() {                  // alguien más, a cuadras. Peor que el de al lado.
      const d = salida();
      const t = ctx.currentTime;
      tono(d, { t, f0: 380, f1: 300, dur: 0.7, vol: 0.07, tipo: 'sawtooth' });
      ruido(d, { t, dur: 0.8, freq: 900, q: 1.2, vol: 0.04 });
    },
    cuerpoCae() {                    // peso muerto contra el piso
      const d = salida();
      const t = ctx.currentTime;
      tono(d, { t, f0: 110, f1: 38, dur: 0.28, vol: 0.26, tipo: 'sine' });
      ruido(d, { t, dur: 0.3, freq: 240, q: 0.6, vol: 0.16, barrido: 0.4 });
      ruido(d, { t: t + 0.12, dur: 0.25, freq: 1400, q: 0.8, vol: 0.05 });  // ropa y polvo
    },

    // — Criaturas ——————————————————————————————————
    gorgoteo() {                     // algo húmedo respirando
      const d = salida();
      const t0 = ctx.currentTime;
      for (let i = 0; i < 5; i++)
        tono(d, { t: t0 + i * 0.11 + Math.random() * 0.04, f0: 150 + Math.random() * 90, f1: 70, dur: 0.13, vol: 0.09, tipo: 'triangle' });
    },
    siseo() {                        // advertencia, aire entre dientes
      const d = salida();
      ruido(d, { dur: 1.1, freq: 4200, q: 1.6, vol: 0.11, barrido: 0.55 });
    },
    mandibulas() {                   // chasquido seco, muchas veces seguidas
      const d = salida();
      const t0 = ctx.currentTime;
      for (let i = 0; i < 6; i++)
        ruido(d, { t: t0 + i * 0.075, dur: 0.03, freq: 1500 + Math.random() * 900, q: 5, vol: 0.11 });
    },
    pisadaPesada() {                 // masa grande apoyando
      const d = salida();
      const t = ctx.currentTime;
      tono(d, { t, f0: 70, f1: 30, dur: 0.4, vol: 0.32, tipo: 'sine' });
      ruido(d, { t, dur: 0.22, freq: 200, q: 0.5, vol: 0.14, barrido: 0.4 });
      ruido(d, { t: t + 0.06, dur: 0.5, freq: 2200, q: 0.9, vol: 0.045 });  // escombro suelto
    },
    aullido() {                      // llamada larga, y algo contesta lejos
      const d = salida();
      const t = ctx.currentTime;
      tono(d, { t, f0: 240, f1: 420, dur: 0.5, vol: 0.16, tipo: 'sawtooth' });
      tono(d, { t: t + 0.45, f0: 420, f1: 190, dur: 0.9, vol: 0.13, tipo: 'sawtooth' });
      const d2 = salida(-0.7);
      tono(d2, { t: t + 1.6, f0: 210, f1: 300, dur: 0.7, vol: 0.05, tipo: 'sawtooth' });
    },

    // — Duelo ——————————————————————————————————————
    campanaLejana() {                // iglesia, a kilómetros
      const d = salida();
      [196, 294].forEach((f, i) =>
        tono(d, { f0: f, f1: f * 0.995, dur: 5 - i, vol: 0.07 - i * 0.02, tipo: 'sine' }));
    },
  };

  function repertorioActual() {
    if (luto) return REPERTORIO.duelo;
    if (tension >= 0.85) return REPERTORIO.combate;
    if (tension >= 0.6) return REPERTORIO.acecho;
    if (tension >= 0.3) return REPERTORIO.inquieto;
    return REPERTORIO.calma;
  }

  // Los eventos se agendan solos: cuanto más tensa la escena, más seguido pasan cosas.
  let eventoTimer = null;
  function programarEventos() {
    clearTimeout(eventoTimer);
    if (!vivo) return;
    const base = luto ? 7000 : 6200 - tension * 4200;    // 6.2 s en calma → 2 s en combate
    eventoTimer = setTimeout(() => {
      if (!vivo) return;
      const pool = repertorioActual();
      const cual = pool[Math.floor(Math.random() * pool.length)];
      try { sfx(cual); } catch { }
      programarEventos();
    }, base * (0.6 + Math.random() * 0.9));
  }

  // ── Golpes puntuales ──────────────────────────────────────────────────────
  const GOLPES = {
    // Contacto: impacto grave + metal que se raspa. El susto.
    contacto() {
      const t = ctx.currentTime;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.7), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
      const n = ctx.createBufferSource(); n.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8;
      const ng = ctx.createGain(); ng.gain.value = 0.3;
      n.connect(bp); bp.connect(ng); ng.connect(master); n.start(t);

      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.55);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.62);
    },
    // Baja: campana grave, sola, con mucha cola. El punto final.
    baja() {
      const t = ctx.currentTime;
      [65.4, 98, 130.8].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.22 - i * 0.05, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5 - i * 0.6);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 5);
      });
    },
  };

  // ── Control ───────────────────────────────────────────────────────────────
  /** Mueve la tensión con rampa: el ambiente nunca salta, se desliza. */
  function setTension(v, rampa = 2.2) {
    tension = Math.max(0, Math.min(1, v));
    const t = ctx.currentTime;
    // Disonancia: aparece recién pasada la mitad, y crece rápido.
    disoG.gain.linearRampToValueAtTime(Math.max(0, tension - 0.45) * 1.6, t + rampa);
    // El viento se abre y sube de brillo con la amenaza.
    vientoLP.frequency.linearRampToValueAtTime(420 + tension * 1500, t + rampa);
    vientoG.gain.linearRampToValueAtTime(0.05 + tension * 0.06, t + rampa);
    // El drone sube un poco de altura: el suelo se tensa.
    drones.forEach(d => d.o.frequency.linearRampToValueAtTime(d.base * (1 + tension * 0.045), t + rampa));
    programarPulso();
    programarEventos();
  }

  /** Entra o sale del registro de duelo. */
  function setLuto(v, rampa = 3) {
    luto = !!v;
    const t = ctx.currentTime;
    lutoG.gain.linearRampToValueAtTime(luto ? 1 : 0, t + rampa);
    droneG.gain.linearRampToValueAtTime(luto ? 0.22 : 0.5, t + rampa);
    if (luto) {
      disoG.gain.linearRampToValueAtTime(0, t + rampa);
      vientoG.gain.linearRampToValueAtTime(0.03, t + rampa);
      clearTimeout(pulsoTimer);
    } else programarPulso();
  }

  function start(vol = 0.55) {
    if (vivo) return;
    vivo = true;
    master.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
    programarPulso();
    programarEventos();
    SFX.rafaga();          // el sector arranca con algo, no en silencio
  }
  function stop() {
    vivo = false;
    clearTimeout(pulsoTimer); clearTimeout(eventoTimer);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  }
  function golpe(tipo) { if (vivo && GOLPES[tipo]) GOLPES[tipo](); }
  /**
   * Dispara un SFX por nombre. Si hay grabación declarada en el manifiesto la usa;
   * si no, cae al sintetizador. Así se pueden ir reemplazando de a uno sin romper.
   */
  function sfx(nombre) {
    ensureVivo();
    if (lib && lib.sfx(nombre)) return 'archivo';
    if (SFX[nombre]) { SFX[nombre](); return 'sintetizado'; }
    return null;
  }
  /** Con qué está sonando cada cosa — para mostrarlo en el banco de pruebas. */
  function origen(nombre) { return lib && lib.tiene(nombre) ? 'archivo' : 'sintetizado'; }
  function ensureVivo() { if (!vivo) { vivo = true; master.gain.value = 0.55; } }

  return {
    start, stop, setTension, setLuto, golpe, sfx, origen, master,
    nombresSFX: Object.keys(SFX), repertorio: REPERTORIO,
    get tension() { return tension; }, get luto() { return luto; },
  };
}
