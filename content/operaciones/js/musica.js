/**
 * musica.js — BGM procedural por estado de la operación.
 *
 * `ambiente.js` hace el MUNDO (viento, pasos, criaturas). Esto hace la MÚSICA.
 *
 * Todo sigue siendo sintetizado, pero NO suena a chiptune. Lo que separa un
 * oscilador de 8 bits de algo cinematográfico son cinco cosas, y están todas acá:
 *
 *   1. REVERB REAL — un ConvolverNode con impulso generado (sala de 3 s). Es el
 *      factor de realismo más grande: sin espacio, cualquier síntesis suena a chip.
 *   2. UNÍSONO DESAFINADO — cada nota son 3 osciladores con detune de pocos cents.
 *      Un oscilador solo suena a videojuego; tres desafinados suenan a sección.
 *   3. ENVOLVENTES LARGAS — el chiptune ataca instantáneo. Las cuerdas entran en
 *      800 ms y sueltan en 2 s. El ataque es lo que delata al sinte barato.
 *   4. FILTRO CON MOVIMIENTO — pasabajos que respira, en vez de la onda cruda con
 *      todos sus armónicos al aire.
 *   5. HUMANIZACIÓN — ni el tiempo ni el volumen caen exactos en la grilla.
 *
 * Cuatro estados, todos en La menor: el mismo tema en distinto ánimo, no cuatro
 * músicas pegadas.
 */

const NOTA = { A1: 55, C2: 65.4, D2: 73.4, E2: 82.4, F2: 87.3, G2: 98, A2: 110, C3: 130.8, D3: 146.8, E3: 164.8, F3: 174.6, G3: 196, A3: 220, C4: 261.6, E4: 329.6 };

/**
 * Estilos: la MISMA estructura de estados y patrones, tocada por otra banda.
 * Cambiar de estilo no cambia la dramaturgia, cambia de qué está hecho el sonido.
 */
export const ESTILOS = {
  cuerdas: {
    nombre: 'Cuerdas cinematográficas',
    desc: 'Sección de cuerdas con reverb de sala. Sobrio, prestigioso, tipo drama bélico.',
    padOnda: 'sawtooth', padDetune: 7, padNivel: 0.055, brilloMul: 1,
    perc: 'membrana', satBajo: 1.8, subBajo: 0.9, fmRatio: 2.74, fmDecay: 2.2,
    rev: 0.9, densidad: 1, bpmMul: 1, arpegioContinuo: false,
  },
  industrial: {
    nombre: 'Industrial / metal',
    desc: 'Percusión metálica y bajo distorsionado. Seco, brutal, sin romanticismo.',
    padOnda: 'square', padDetune: 14, padNivel: 0.032, brilloMul: 1.4,
    perc: 'metal', satBajo: 4.5, subBajo: 1.1, fmRatio: 4.2, fmDecay: 0.9,
    rev: 0.5, densidad: 1.15, bpmMul: 1.06, arpegioContinuo: false,
  },
  sinte: {
    nombre: 'Sintetizador de los 80',
    desc: 'Arpegio pulsante tipo Carpenter. Analógico, hipnótico, con delay.',
    padOnda: 'sawtooth', padDetune: 11, padNivel: 0.04, brilloMul: 1.25,
    perc: 'electronica', satBajo: 2.4, subBajo: 0.7, fmRatio: 1.5, fmDecay: 1.1,
    rev: 0.45, densidad: 1, bpmMul: 1.04, arpegioContinuo: true,
  },
  coral: {
    nombre: 'Coral / sacro',
    desc: 'Voces sostenidas y campanas. Solemne, de funeral. Casi sin ritmo.',
    padOnda: 'sine', padDetune: 5, padNivel: 0.085, brilloMul: 0.8,
    perc: 'ninguna', satBajo: 1.2, subBajo: 1, fmRatio: 3.4, fmDecay: 3.4,
    rev: 1.3, densidad: 0.5, bpmMul: 0.88, arpegioContinuo: false,
  },
  minimal: {
    nombre: 'Mínimo / drone',
    desc: 'Casi nada. Una nota cada tanto y mucho silencio. Deja mandar al ambiente.',
    padOnda: 'triangle', padDetune: 4, padNivel: 0.05, brilloMul: 0.85,
    perc: 'ninguna', satBajo: 1.4, subBajo: 1, fmRatio: 2.1, fmDecay: 3,
    rev: 1.15, densidad: 0.3, bpmMul: 0.92, arpegioContinuo: false,
  },
};

export const ESTADOS = {
  recon: {
    bpm: 64, vol: 0.9, acordePad: ['A2', 'E3', 'A3'], brillo: 700,
    bajo:  ['A1', null, null, null, null, null, null, null, 'G2', null, null, null, null, null, null, null],
    pulso: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    arpa:  [null, null, null, null, 'A3', null, null, null, null, null, null, 'E4', null, null, null, null],
  },
  sospecha: {
    bpm: 80, vol: 1, acordePad: ['A2', 'D3', 'F3'], brillo: 950,
    bajo:  ['A1', null, null, null, null, null, 'A1', null, null, null, null, null, 'F2', null, null, null],
    pulso: [null, null, null, null, null, null, null, 'x', null, null, null, null, null, null, 'x', null],
    arpa:  [null, null, null, null, null, null, null, null, null, null, 'D3', null, null, null, null, null],
  },
  combate: {
    bpm: 138, vol: 1.15, acordePad: ['A2', 'E3', 'F3'], brillo: 1500,
    bajo:  ['A1', null, 'A1', null, 'A1', null, 'A1', 'A1', 'F2', null, 'F2', null, 'G2', null, 'G2', 'G2'],
    pulso: ['X', null, 'x', null, 'X', null, 'x', 'x', 'X', null, 'x', null, 'X', 'x', 'x', null],
    arpa:  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  },
  duelo: {
    bpm: 48, vol: 0.85, acordePad: ['A2', 'C3', 'E3'], brillo: 520,
    bajo:  ['A1', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    pulso: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    arpa:  [null, null, null, null, null, null, null, null, 'C3', null, null, null, null, null, null, null],
  },
};

export function crearMusica(ctx, destino) {
  // El estilo activo se lee dentro de los instrumentos, así que tiene que existir
  // antes de armar cualquier cadena de audio.
  let S = ESTILOS.cuerdas, estiloNom = 'cuerdas';

  const master = ctx.createGain(); master.gain.value = 0;

  /**
   * Nodo de ducking, DESPUÉS del master: la música se agacha cuando suena un evento
   * del ambiente, sin tocar `master` — así `setVolumen()` y los fundidos de
   * `start`/`stop` siguen mandando sobre el volumen real y no se pisan entre sí.
   *
   * Hace falta porque la reverb va al 0.9: la cola emborrona el medio y un evento
   * corto (una piedra, un crujido) se pierde dentro de ella aunque tenga nivel.
   */
  const duckG = ctx.createGain(); duckG.gain.value = 1;
  master.connect(duckG); duckG.connect(destino);

  const DUCK_CAIDA = 0.06, DUCK_VUELTA = 0.7;

  function duck(prof = 0.5) {
    const t = ctx.currentTime;
    duckG.gain.cancelScheduledValues(t);
    duckG.gain.setValueAtTime(duckG.gain.value, t);
    duckG.gain.linearRampToValueAtTime(prof, t + DUCK_CAIDA);
    duckG.gain.linearRampToValueAtTime(1, t + DUCK_CAIDA + DUCK_VUELTA);
  }

  // ── Espacio: reverb por convolución con impulso generado ──────────────────
  // Ruido con caída exponencial = cola de sala. Esto es lo que saca el sonido de
  // "adentro de la computadora" y lo pone en un lugar físico.
  function impulso(dur = 3, caida = 2.4) {
    const largo = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, largo, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < largo; i++) {
        const t = i / largo;
        // Ruido con caída + un hueco inicial: la sala tarda en devolver el sonido.
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, caida) * (i < largo * 0.012 ? t * 80 : 1);
      }
    }
    return buf;
  }
  const rev = ctx.createConvolver(); rev.buffer = impulso();
  const revMix = ctx.createGain(); revMix.gain.value = 0.9;
  const revPre = ctx.createBiquadFilter();     // no mandar graves al reverb: embarra
  revPre.type = 'highpass'; revPre.frequency.value = 260;
  revPre.connect(rev); rev.connect(revMix); revMix.connect(master);
  const aReverb = (nodo, cantidad = 0.5) => {
    const s = ctx.createGain(); s.gain.value = cantidad * S.rev;
    nodo.connect(s); s.connect(revPre);
  };

  // Saturación suave: pega los transitorios y da calor analógico.
  function curvaSat(k = 2.2) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); }
    return c;
  }

  const ruidoBuf = (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();

  // ── Pad de cuerdas: persistente, no se retrigerea ──────────────────────────
  // Tres notas × tres osciladores desafinados. Vive todo el tiempo y solo cambia
  // de acorde y de brillo: eso es lo que hace una sección de cuerdas real, sostener.
  const padG = ctx.createGain(); padG.gain.value = 0;
  const padLP = ctx.createBiquadFilter(); padLP.type = 'lowpass';
  padLP.frequency.value = 700; padLP.Q.value = 0.8;
  padG.connect(padLP); padLP.connect(master); aReverb(padLP, 0.75);

  const padVoces = [0, 1, 2].map(() => {
    const voces = [-1, 0, 0.86].map(k => {          // unísono: el ancho viene de acá
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.detune.value = k * 7;
      const g = ctx.createGain(); g.gain.value = 0.055;
      o.connect(g); g.connect(padG); o.start();
      return o;
    });
    return voces;
  });
  // Deriva lenta de afinación: nada queda perfectamente quieto en la vida real.
  const deriva = ctx.createOscillator(); deriva.frequency.value = 0.13;
  const derivaG = ctx.createGain(); derivaG.gain.value = 4;   // ±4 cents
  deriva.connect(derivaG); deriva.start();
  padVoces.flat().forEach(o => derivaG.connect(o.detune));

  function setPad(notas, brillo, t, rampa = 2.5) {
    notas.forEach((n, i) => {
      const f = NOTA[n]; if (!f || !padVoces[i]) return;
      padVoces[i].forEach(o => o.frequency.linearRampToValueAtTime(f, t + rampa));
    });
    padLP.frequency.linearRampToValueAtTime(brillo * S.brilloMul, t + rampa);
  }

  // ── Bajo: sub + saws saturados, con barrido de filtro ─────────────────────
  function bajo(freq, t, vol) {
    const sat = ctx.createWaveShaper(); sat.curve = curvaSat(S.satBajo);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(160, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);          // ataque no instantáneo
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);

    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = freq / 2;
    const subG = ctx.createGain(); subG.gain.value = S.subBajo;
    sub.connect(subG); subG.connect(g);

    [-9, 0, 9].forEach(c => {                                // unísono también en el bajo
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = freq; o.detune.value = c;
      o.connect(sat); o.start(t); o.stop(t + 0.8);
    });
    sat.connect(lp); lp.connect(g); g.connect(master);
    aReverb(g, 0.18);
    sub.start(t); sub.stop(t + 0.8);
  }

  // ── Percusión: transitorio + cuerpo + cola, como un tambor real ───────────
  function perc(fuerte, t, vol) {
    // Percusión metálica: chapa golpeada, con parciales inarmónicos y cola larga.
    if (S.perc === 'metal') {
      [1.0, 1.41, 1.93, 2.71].forEach((r, i) => {
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.value = (fuerte ? 180 : 620) * r;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol * (fuerte ? 0.5 : 0.28) / (i + 1), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (fuerte ? 1.4 : 0.5));
        o.connect(g); g.connect(master); aReverb(g, 0.4);
        o.start(t); o.stop(t + 1.5);
      });
      if (!fuerte) return;
    }
    // 1. transitorio: el golpe del palo
    const tr = ctx.createBufferSource(); tr.buffer = ruidoBuf;
    const trF = ctx.createBiquadFilter(); trF.type = 'highpass'; trF.frequency.value = fuerte ? 1800 : 4200;
    const trG = ctx.createGain();
    trG.gain.setValueAtTime(vol * (fuerte ? 0.5 : 0.35), t);
    trG.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    tr.connect(trF); trF.connect(trG); trG.connect(master);
    tr.start(t, Math.random() * 1.5, 0.06);

    // 2. cuerpo: membrana con caída de altura
    if (fuerte) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(165, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.22);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(vol * 1.3, t + 0.006);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      const sat = ctx.createWaveShaper(); sat.curve = curvaSat(1.5);
      o.connect(sat); sat.connect(og); og.connect(master);
      aReverb(og, 0.3);
      o.start(t); o.stop(t + 0.5);
    }
    // 3. cola de ruido filtrado: el aire del parche
    const co = ctx.createBufferSource(); co.buffer = ruidoBuf;
    const coF = ctx.createBiquadFilter(); coF.type = 'bandpass';
    coF.frequency.value = fuerte ? 320 : 2600; coF.Q.value = 0.7;
    const coG = ctx.createGain();
    coG.gain.setValueAtTime(vol * 0.3, t);
    coG.gain.exponentialRampToValueAtTime(0.0001, t + (fuerte ? 0.3 : 0.1));
    co.connect(coF); coF.connect(coG); coG.connect(master);
    aReverb(coG, fuerte ? 0.35 : 0.5);
    co.start(t, Math.random() * 1.5, 0.4);
  }

  // ── Pluck: FM inarmónica. Ni campana ni piano — algo de metal templado. ────
  function arpa(freq, t, vol) {
    const port = ctx.createOscillator(); port.type = 'sine'; port.frequency.value = freq;
    const mod = ctx.createOscillator(); mod.type = 'sine';
    mod.frequency.value = freq * S.fmRatio;                  // razón inarmónica = metal
    const modG = ctx.createGain();
    modG.gain.setValueAtTime(freq * 2.2, t);
    modG.gain.exponentialRampToValueAtTime(freq * 0.05, t + 0.5);
    mod.connect(modG); modG.connect(port.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + S.fmDecay);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    port.connect(lp); lp.connect(g); g.connect(master);
    aReverb(g, 0.85);                                        // el pluck es lo que más ecoa
    port.start(t); port.stop(t + 2.3); mod.start(t); mod.stop(t + 2.3);
  }

  // ── Secuenciador con lookahead ────────────────────────────────────────────
  let estado = 'recon', vivo = false, paso = 0, proximoPaso = 0, timer = null, volObjetivo = 0.5;

  function tocarPaso(i, t) {
    const E = ESTADOS[estado]; if (!E) return;
    const v = E.vol;
    // Humanización: nada cae exacto en la grilla ni con el mismo volumen.
    const hum = () => t + (Math.random() - 0.5) * 0.014;
    const vel = () => 0.85 + Math.random() * 0.3;

    // La densidad del estilo decide cuánto de la partitura llega a sonar.
    const pasa = () => S.densidad >= 1 || Math.random() < S.densidad;

    const nb = E.bajo[i];  if (nb && pasa()) bajo(NOTA[nb], hum(), 0.3 * v * vel());
    const np = E.pulso[i]; if (np && S.perc !== 'ninguna' && pasa()) perc(np === 'X', hum(), 0.26 * v * vel());
    const na = E.arpa[i];  if (na) arpa(NOTA[na], hum(), 0.2 * v * vel());
    // Arpegio continuo del estilo sintetizador: corcheas que nunca paran.
    if (S.arpegioContinuo && i % 2 === 0) {
      const esc = ['A2', 'C3', 'E3', 'A3', 'E3', 'C3'];
      arpa(NOTA[esc[(i / 2) % esc.length]], hum(), 0.09 * v);
    }
  }

  function agendar() {
    if (!vivo) return;
    const E = ESTADOS[estado];
    const dur = 60 / (E.bpm * S.bpmMul) / 4;
    while (proximoPaso < ctx.currentTime + 0.12) {
      tocarPaso(paso % 16, Math.max(proximoPaso, ctx.currentTime));
      proximoPaso += dur;
      paso++;
    }
    timer = setTimeout(agendar, 25);
  }

  // ── Golpes narrativos ─────────────────────────────────────────────────────
  const GOLPES = {
    // Hallazgo: tres notas que suben, con mucha cola. Algo apareció.
    hallazgo() {
      const t = ctx.currentTime;
      arpa(NOTA.E3, t, 0.34); arpa(NOTA.A3, t + 0.17, 0.36); arpa(NOTA.E4, t + 0.36, 0.3);
    },
    // Susto: cluster corto y sucio, sin cola. El respingo.
    susto() {
      const t = ctx.currentTime;
      [NOTA.A2, NOTA.D3 * 1.06].forEach(f => {   // segunda menor: el intervalo del miedo
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(lp); lp.connect(g); g.connect(master); aReverb(g, 0.3);
        o.start(t); o.stop(t + 0.45);
      });
      perc(true, t, 0.6);
    },
    // Impacto: braam cinematográfico. Sub que cae + metales saturados + cola larga.
    impacto() {
      const t = ctx.currentTime;
      perc(true, t, 0.9);
      const sat = ctx.createWaveShaper(); sat.curve = curvaSat(3);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, t);
      lp.frequency.exponentialRampToValueAtTime(320, t + 2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.34, t + 0.06);        // el braam SWELLEA, no pega
      g.gain.setValueAtTime(0.34, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      [55, 55.4, 82.4, 110, 110.6].forEach(f => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        o.frequency.linearRampToValueAtTime(f * 0.94, t + 2.2);   // cae de afinación
        o.connect(sat); o.start(t); o.stop(t + 2.5);
      });
      sat.connect(lp); lp.connect(g); g.connect(master); aReverb(g, 0.7);
    },
  };

  // ── Control ───────────────────────────────────────────────────────────────
  function setEstado(nombre, rampa = 2.5) {
    if (!ESTADOS[nombre] || nombre === estado) return;
    estado = nombre;
    paso = 0;
    proximoPaso = Math.max(proximoPaso, ctx.currentTime);
    const E = ESTADOS[nombre];
    setPad(E.acordePad, E.brillo, ctx.currentTime, rampa);   // el pad cruza, no corta
  }

  function start(vol = 0.5) {
    volObjetivo = vol;
    if (vivo) { master.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1); return; }
    vivo = true; paso = 0; proximoPaso = ctx.currentTime + 0.05;
    const E = ESTADOS[estado];
    setPad(E.acordePad, E.brillo, ctx.currentTime, 0.1);
    padG.gain.linearRampToValueAtTime(1, ctx.currentTime + 4);   // las cuerdas entran de a poco
    master.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2.5);
    agendar();
  }
  function stop() {
    vivo = false; clearTimeout(timer);
    padG.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  }
  function setVolumen(v) {
    volObjetivo = v;
    master.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.2);
  }
  function golpe(tipo) { if (GOLPES[tipo]) GOLPES[tipo](); }

  /** Cambia la instrumentación en vivo: el pad muta sin cortarse. */
  function setEstilo(nombre) {
    if (!ESTILOS[nombre]) return;
    S = ESTILOS[nombre]; estiloNom = nombre;
    const t = ctx.currentTime;
    padVoces.flat().forEach((o, i) => {
      o.type = S.padOnda;
      o.detune.linearRampToValueAtTime((i % 3 - 1) * S.padDetune, t + 0.4);
    });
    const E = ESTADOS[estado];
    setPad(E.acordePad, E.brillo, t, 1.2);
  }

  function porTension(tension, luto) {
    if (luto) return 'duelo';
    if (tension >= 0.85) return 'combate';
    if (tension >= 0.38) return 'sospecha';
    return 'recon';
  }

  return {
    start, stop, setEstado, setEstilo, setVolumen, golpe, porTension, duck, master,
    get estado() { return estado; }, get estilo() { return estiloNom; },
  };
}
