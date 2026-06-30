/**
 * mission-generator.js — Generador procedural de misiones CENVAC.
 *
 * generarMision(evento, seed, opciones) → misión JSON con la forma EXACTA que
 * consume mission-engine.js (no se reescribe el motor). El generador es puro y
 * determinístico: mismo (evento, seed, opciones) → misma misión.
 *
 * El generador es dueño del esqueleto estructural (garantiza validez: toda rama
 * llega a un final, todo nodo es alcanzable). La gramática (beats/creature-tags/
 * objective-templates/site-templates) aporta el texto, los stats y el tuning,
 * elegidos con el seed. Ver tarea-misiones-procedurales-y-despacho §4.
 */

class SeededRNG {
  constructor(seed) { this.seed = (seed >>> 0) || 1; }
  next() {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  chance(p) { return this.next() < p; }
  pickN(arr, n) {
    const copy = [...arr], out = [];
    for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(this.int(0, copy.length - 1), 1)[0]);
    return out;
  }
}

const STATS = ["físico", "técnico", "biológico", "sigilo", "mental", "liderazgo"];

export function generarMision(evento, seed, opciones = {}) {
  const g = opciones.grammar || {};
  const creatureTags = g.creatureTags || {};
  const objectiveTemplates = g.objectiveTemplates || {};
  const beats = g.beats || {};
  const siteTemplates = g.siteTemplates || {};

  const rng = new SeededRNG(seed);
  const criaturaId = evento.criatura_sospechada;
  const ct = creatureTags[criaturaId];
  if (!ct) throw new Error(`mission-generator: sin creature-tags para "${criaturaId}"`);
  const objId = opciones.objetivo || "extraccion_4a";
  const obj = objectiveTemplates[objId];
  if (!obj) throw new Error(`mission-generator: sin objective-template "${objId}"`);

  const site = siteTemplates[evento.sitio_tipo] || { nombre: evento.ubicacion_descrita, modificadores_ambiente: {} };
  const d = ct.descriptores || {};
  const scanNivel = (opciones.scan_estado && opciones.scan_estado.nivel) || 0;

  // Contexto de interpolación de generación. Las claves del motor
  // ({agente.nombre}, {estado_equipo}, …) NO están aquí: las resuelve el motor.
  const ctx = {
    ...d,
    binomial: ct.binomial || d.criatura,
    criatura: d.criatura || ct.nombre,
    nivel_amenaza: ct.nivel_amenaza,
    sitio: site.nombre || evento.ubicacion_descrita,
    evento: evento.id,
  };
  const fill = (s) => String(s).replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined ? ctx[k] : m));
  const muestraSlug = (ctx.muestra || "muestra").replace(/\s+/g, "_");

  const modAmb = (stat) => (site.modificadores_ambiente && site.modificadores_ambiente[stat]) || 0;
  const audio = ct.audio || {};

  // ── ids de entrada de cada fase (referencias hacia adelante) ───────────────
  const ID = {
    INS: "nodo_insercion",
    APROX_RUTA: "nodo_aprox_ruta",
    APROX: "nodo_aproximacion",
    APROX2: "nodo_aproximacion_2",
    APROX_FALLO: "nodo_aprox_fallo",
    BUSQ: "nodo_busqueda",
    BUSQ_INFO: "nodo_busqueda_info",
    BUSQ_SININFO: "nodo_busqueda_sininfo",
    BUSQ_ALERTA: "nodo_busqueda_alerta",
    ENC: "nodo_encuentro",
    MUESTRA_OK: "nodo_muestra_asegurada",
    MUESTRA_COMP: "nodo_muestra_comprometida",
    MUESTRA_PERD: "nodo_muestra_perdida",
    RET: "nodo_retirada",
    EMERG: "nodo_emergencia",
    OUT: "nodo_exterior",
    RES: "nodo_resolucion",
  };

  const nodos = [];
  const N = (n) => { nodos.push(n); return n; };
  const opt = (texto, siguiente, efectos = [], requiere = null) =>
    ({ texto: fill(texto), siguiente, requiere, efectos_inmediatos: efectos });
  const efEstamina = (delta, alcance = "todos") => ({ tipo: "estamina", delta, alcance });
  const efCordura = (delta, alcance = "todos") => ({ tipo: "cordura", delta, alcance });
  const efFlag = (nombre, valor = true) => ({ tipo: "flag", nombre, valor });

  const b = beats;
  const v = (arr) => fill(rng.pick(arr || [""]));

  // ── Variación estructural por seed ─────────────────────────────────────────
  const conRutaAprox = rng.chance(0.5);                          // nodo decisión extra en aproximación
  const conSegundaAprox = rng.chance(0.45);                      // segundo check de aproximación
  const numMetodos = rng.int(2, (b.encuentro.metodos || []).length);
  const metodos = rng.pickN(b.encuentro.metodos, numMetodos);
  if (!metodos.find((m) => m.id === "luz")) metodos[0] = b.encuentro.metodos.find((m) => m.id === "luz") || metodos[0];
  const statRetirada = rng.chance(0.5) ? (ct.stat_retirada || "sigilo") : "físico";
  const difAprox = rng.int(b.aproximacion.dificultad[0], b.aproximacion.dificultad[1]) + (scanNivel >= 2 ? -1 : 0);
  const difBusq = rng.int(b.busqueda.dificultad[0], b.busqueda.dificultad[1]) + (scanNivel >= 3 ? -1 : 0);
  const difRet = rng.int(b.retirada.dificultad[0], b.retirada.dificultad[1]);

  // ── INSERCIÓN ──────────────────────────────────────────────────────────────
  N({
    id: ID.INS, tipo: "narrativo",
    ambiente: v(b.insercion.ambiente),
    texto_control: v(b.insercion.control),
    texto_agente: v(b.insercion.agente),
    agente_voz: "auto",
    opciones: [opt(v(b.insercion.opcion), conRutaAprox ? ID.APROX_RUTA : ID.APROX)],
    efectos: [], audio_hint: "estatica_baja",
  });

  // ── APROXIMACIÓN (decisión opcional + check) ───────────────────────────────
  if (conRutaAprox) {
    N({
      id: ID.APROX_RUTA, tipo: "decision",
      ambiente: v(b.aproximacion.ambiente),
      texto_control: "El acceso al foco admite dos líneas: una directa que ahorra tiempo y una más larga que reduce exposición. Control decide.",
      texto_agente: "Dos rutas hasta el punto de descenso. Directa o la larga sin exposición. Diga.",
      agente_voz: "reconocimiento",
      opciones: [
        opt("Ruta directa. Más rápido, asuman el desgaste.", ID.APROX, [efEstamina(-5)]),
        opt("Ruta larga. Sin anunciar presencia.", ID.APROX),
      ],
      efectos: [], audio_hint: "silencio",
    });
  }

  const aproxExito = conSegundaAprox ? ID.APROX2 : ID.BUSQ;
  N({
    id: ID.APROX, tipo: "check",
    ambiente: v(b.aproximacion.ambiente),
    texto_control: v(b.aproximacion.control),
    texto_agente: v(b.aproximacion.agente),
    agente_voz: "reconocimiento",
    check: {
      stat: ct.stat_aproximacion || "sigilo", agente: "mejor_stat",
      dificultad: difAprox, modificadores_ambiente: modAmb(ct.stat_aproximacion || "sigilo"),
      resultados: { "crítico_éxito": aproxExito, "éxito": aproxExito, "fallo": ID.APROX_FALLO, "crítico_fallo": ID.APROX_FALLO },
    },
    efectos: [], audio_hint: audio.aproximacion || "silencio",
  });

  if (conSegundaAprox) {
    N({
      id: ID.APROX2, tipo: "check",
      ambiente: v(b.aproximacion.ambiente),
      texto_control: "Segundo tramo de aproximación. El terreno se cierra y el margen de error baja. " + v(b.aproximacion.control),
      texto_agente: v(b.aproximacion.agente),
      agente_voz: "reconocimiento",
      check: {
        stat: "sigilo", agente: "mejor_stat", dificultad: difAprox + 1, modificadores_ambiente: modAmb("sigilo"),
        resultados: { "crítico_éxito": ID.BUSQ, "éxito": ID.BUSQ, "fallo": ID.BUSQ, "crítico_fallo": ID.APROX_FALLO },
        efectos_por_resultado: { "fallo": [efEstamina(-5)] },
      },
      efectos: [], audio_hint: audio.aproximacion || "silencio",
    });
  }

  N({
    id: ID.APROX_FALLO, tipo: "narrativo",
    ambiente: v(b.aproximacion.fallo_ambiente),
    texto_control: v(b.aproximacion.fallo_control),
    texto_agente: v(b.aproximacion.fallo_agente),
    agente_voz: "auto",
    opciones: [opt("Entendido. Sigan con precaución. El espécimen posiblemente está alerta.", ID.BUSQ, [efCordura(-5)])],
    efectos: [efFlag("especimen_alerta")], audio_hint: "estatica_baja",
  });

  // ── BÚSQUEDA (check con tres ramas que convergen en encuentro) ──────────────
  N({
    id: ID.BUSQ, tipo: "check",
    ambiente: v(b.busqueda.ambiente),
    texto_control: v(b.busqueda.control),
    texto_agente: v(b.busqueda.agente),
    agente_voz: "sanitario",
    check: {
      stat: ct.stat_busqueda || "biológico", agente: "mejor_stat",
      dificultad: difBusq, modificadores_ambiente: modAmb(ct.stat_busqueda || "biológico"),
      resultados: { "crítico_éxito": ID.BUSQ_INFO, "éxito": ID.BUSQ_INFO, "fallo": ID.BUSQ_SININFO, "crítico_fallo": ID.BUSQ_ALERTA },
    },
    efectos: [], audio_hint: audio.busqueda || "estatica_baja",
  });
  N({
    id: ID.BUSQ_INFO, tipo: "narrativo",
    ambiente: v(b.busqueda.ambiente), texto_control: v(b.busqueda.info_control), texto_agente: v(b.busqueda.info_agente),
    agente_voz: "auto",
    opciones: [opt("Confirmo. Protocolo 15 — no se acerquen más. Avancen al punto de encuentro y esperen instrucción.", ID.ENC, [efFlag("posicion_confirmada")])],
    efectos: [], audio_hint: "silencio",
  });
  N({
    id: ID.BUSQ_SININFO, tipo: "narrativo",
    ambiente: v(b.busqueda.ambiente), texto_control: v(b.busqueda.sininfo_control), texto_agente: v(b.busqueda.sininfo_agente),
    agente_voz: "auto",
    opciones: [opt("Entendido. Avancen despacio, pasos cortos. Protocolo 6 hasta nuevo aviso.", ID.ENC, [efCordura(-5)])],
    efectos: [], audio_hint: "estatica_media",
  });
  N({
    id: ID.BUSQ_ALERTA, tipo: "narrativo",
    ambiente: v(b.busqueda.ambiente), texto_control: v(b.busqueda.alerta_control), texto_agente: v(b.busqueda.alerta_agente),
    agente_voz: "auto",
    opciones: [opt("No se muevan. Cero vibración. Si carga, Protocolo 8-B inmediato. Esperen.", ID.ENC, [efCordura(-15), efEstamina(-5), efFlag("especimen_alerta")])],
    efectos: [], audio_hint: "silencio",
  });

  // ── ENCUENTRO (decisión: método de extracción) ─────────────────────────────
  const idExt = (m) => `nodo_extraccion_${m.id}`;
  N({
    id: ID.ENC, tipo: "decision",
    ambiente: v(b.encuentro.ambiente), texto_control: v(b.encuentro.control), texto_agente: v(b.encuentro.agente),
    agente_voz: "auto",
    opciones: metodos.map((m) => opt(m.texto, idExt(m))),
    efectos: [], audio_hint: audio.encuentro || "estatica_media",
  });

  // ── EXTRACCIÓN (un check por método; convergen en nodos de muestra) ─────────
  const herida = b.extraccion.herida;
  metodos.forEach((m) => {
    // El método sigilo es de dos etapas (aproximarse al residuo + extraer), como el referente.
    const dosEtapas = m.id === "sigilo";
    const exitoTarget = dosEtapas ? idExt(m) + "_2" : ID.MUESTRA_OK;
    N({
      id: idExt(m), tipo: "check",
      ambiente: v(b.extraccion.ambiente), texto_control: v(b.extraccion.control), texto_agente: v(b.extraccion.agente),
      agente_voz: dosEtapas ? "reconocimiento" : "sanitario",
      check: {
        stat: m.stat, agente: "mejor_stat", dificultad: m.dificultad, modificadores_ambiente: modAmb(m.stat),
        resultados: { "crítico_éxito": exitoTarget, "éxito": exitoTarget, "fallo": ID.MUESTRA_COMP, "crítico_fallo": ID.MUESTRA_PERD },
        efectos_por_resultado: { "crítico_fallo": [{ tipo: "herida", valor: { ...herida }, alcance: "aleatorio" }, efCordura(-10)] },
      },
      efectos: [], audio_hint: audio.extraccion || "estatica_baja",
    });
    if (dosEtapas) {
      N({
        id: idExt(m) + "_2", tipo: "check",
        ambiente: v(b.extraccion.ambiente),
        texto_control: "El agente llega al punto de muestra sin activar los hilos. Ahora el procedimiento: raspar el residuo sin hacer vibrar nada. " + v(b.extraccion.control),
        texto_agente: v(b.extraccion.agente),
        agente_voz: "sanitario",
        check: {
          stat: "biológico", agente: "mejor_stat", dificultad: difBusq, modificadores_ambiente: modAmb("biológico"),
          resultados: { "crítico_éxito": ID.MUESTRA_OK, "éxito": ID.MUESTRA_OK, "fallo": ID.MUESTRA_COMP, "crítico_fallo": ID.MUESTRA_PERD },
        },
        efectos: [], audio_hint: audio.extraccion || "estatica_baja",
      });
    }
  });

  N({
    id: ID.MUESTRA_OK, tipo: "narrativo",
    ambiente: v(b.extraccion.ambiente), texto_control: v(b.extraccion.asegurada_control), texto_agente: v(b.extraccion.asegurada_agente),
    agente_voz: "sanitario",
    opciones: [opt("Excelente. Protocolo 4-A completado. Inicien extracción del equipo.", ID.RET, [{ tipo: "muestra_obtenida", valor: muestraSlug }])],
    efectos: [], audio_hint: "estatica_baja",
  });
  N({
    id: ID.MUESTRA_COMP, tipo: "narrativo",
    ambiente: v(b.extraccion.ambiente), texto_control: v(b.extraccion.comprometida_control), texto_agente: v(b.extraccion.comprometida_agente),
    agente_voz: "auto",
    opciones: [opt("Confirmo Protocolo 19. Transportan con nota de incidencia. Inicien extracción.", ID.RET, [{ tipo: "muestra_obtenida", valor: muestraSlug + "_parcial" }])],
    efectos: [efCordura(-5, "lider")], audio_hint: "estatica_media",
  });
  N({
    id: ID.MUESTRA_PERD, tipo: "narrativo",
    ambiente: v(b.extraccion.ambiente), texto_control: v(b.extraccion.perdida_control), texto_agente: v(b.extraccion.perdida_agente),
    agente_voz: "auto",
    opciones: [opt("Entendido. Salgan en orden. Elijan ruta de extracción.", ID.RET)],
    efectos: [efCordura(-10, "lider")], audio_hint: "estatica_media",
  });

  // ── RETIRADA (check) → exterior; crítico_fallo → emergencia ─────────────────
  N({
    id: ID.RET, tipo: "check",
    ambiente: v(b.retirada.ambiente), texto_control: v(b.retirada.control), texto_agente: v(b.retirada.agente),
    agente_voz: "auto",
    check: {
      stat: statRetirada, agente: "mejor_stat", dificultad: difRet, modificadores_ambiente: modAmb(statRetirada),
      resultados: { "crítico_éxito": ID.OUT, "éxito": ID.OUT, "fallo": ID.OUT, "crítico_fallo": ID.EMERG },
      efectos_por_resultado: { "fallo": [efEstamina(-10)] },
    },
    efectos: [], audio_hint: "estatica_baja",
  });
  N({
    id: ID.EMERG, tipo: "check",
    ambiente: v(b.retirada.emergencia_ambiente), texto_control: v(b.retirada.emergencia_control), texto_agente: v(b.retirada.emergencia_agente),
    agente_voz: "asalto",
    check: {
      stat: "físico", agente: "mejor_stat", dificultad: 14, modificadores_ambiente: modAmb("físico"),
      resultados: { "crítico_éxito": ID.OUT, "éxito": ID.OUT, "fallo": ID.OUT, "crítico_fallo": ID.OUT },
      efectos_por_resultado: {
        "fallo": [{ tipo: "herida", valor: { tipo: "trauma_de_especimen", severidad: 3, parte_cuerpo: "torso", efecto_stat: { "físico": -1 } }, alcance: "aleatorio" }],
        "crítico_fallo": [{ tipo: "baja_garantizada", valor: { tipo: "trauma_de_especimen", parte_cuerpo: "torso", severidad: 4 }, alcance: "aleatorio" }],
      },
    },
    efectos: [efEstamina(-25), efCordura(-25)], audio_hint: audio.critico || "alerta_critica",
  });

  // ── EXTERIOR → RESOLUCIÓN ──────────────────────────────────────────────────
  N({
    id: ID.OUT, tipo: "narrativo",
    ambiente: v(b.retirada.exterior_ambiente), texto_control: v(b.retirada.exterior_control), texto_agente: v(b.retirada.exterior_agente),
    agente_voz: "auto",
    opciones: [opt(v(b.retirada.exterior_opcion), ID.RES)],
    efectos: [], audio_hint: "estatica_baja",
  });
  N({
    id: ID.RES, tipo: "resolucion",
    texto_control: "La operación está cerrada. CENVAC-Central procesa el resultado. El archivo del evento será actualizado.",
    logica_resolucion: obj.logica_resolucion,
    efectos: [],
  });

  // ── FINALES (desde el objective-template, con interpolación) ────────────────
  for (const f of obj.finales) {
    N({
      id: f.id, tipo: "final", resultado: f.resultado, titulo: fill(f.titulo),
      texto_control: fill(f.texto_control), clasificacion_doc: f.clasificacion_doc,
      narrativa_fragmentos: {
        cronologia: fill(f.narrativa_fragmentos.cronologia),
        hallazgos: fill(f.narrativa_fragmentos.hallazgos),
        notas_analista: fill(f.narrativa_fragmentos.notas_analista),
      },
      efectos: [], efectos_garantizados_al_entrar: f.efectos_garantizados_al_entrar || [],
    });
  }

  const mision = {
    id: `gen-${criaturaId}-${objId}-${seed}`,
    nombre: fill(obj.nombre_plantilla),
    descripcion: fill(`${obj.objetivo_primario} Foco: ${ctx.sitio}.`),
    tipo_mision: obj.tipo_mision,
    criatura: criaturaId,
    nivel_amenaza: ct.nivel_amenaza,
    objetivo_primario: fill(obj.objetivo_primario),
    objetivo_secundario: fill(obj.objetivo_secundario),
    muestra_objetivo: muestraSlug,
    muestra_descripcion: fill(ctx.muestra_desc || ""),
    seed,
    generada: true,
    nodo_inicial: ID.INS,
    nodos,
  };

  return mision;
}

/**
 * Valida estructura: refs existentes, alcanzabilidad desde nodo_inicial, y que
 * toda rama alcanzable llegue a un final. Devuelve { ok, errores }.
 */
export function validarMision(mision) {
  const errores = [];
  const byId = {};
  for (const n of mision.nodos) {
    if (byId[n.id]) errores.push(`id duplicado: ${n.id}`);
    byId[n.id] = n;
  }
  const salidas = (n) => {
    if (n.tipo === "check") return Object.values(n.check.resultados || {});
    if (n.tipo === "resolucion") return (n.logica_resolucion || []).map((r) => r.siguiente);
    if (n.tipo === "final") return [];
    return (n.opciones || []).map((o) => o.siguiente).filter(Boolean);
  };

  for (const n of mision.nodos) {
    for (const s of salidas(n)) {
      if (!byId[s]) errores.push(`nodo ${n.id} → referencia inexistente "${s}"`);
    }
    if (n.tipo !== "final" && salidas(n).length === 0) errores.push(`nodo ${n.id} (${n.tipo}) sin salidas`);
  }

  if (!byId[mision.nodo_inicial]) errores.push(`nodo_inicial inexistente: ${mision.nodo_inicial}`);

  // Alcanzabilidad
  const alcanzados = new Set();
  const stack = [mision.nodo_inicial];
  while (stack.length) {
    const id = stack.pop();
    if (alcanzados.has(id) || !byId[id]) continue;
    alcanzados.add(id);
    for (const s of salidas(byId[id])) if (!alcanzados.has(s)) stack.push(s);
  }
  for (const n of mision.nodos) {
    if (!alcanzados.has(n.id)) errores.push(`nodo inalcanzable: ${n.id}`);
  }

  // ¿Toda rama alcanzable llega a un final?
  const memo = {};
  const llegaAFinal = (id, visit = new Set()) => {
    if (memo[id] !== undefined) return memo[id];
    const n = byId[id];
    if (!n) return false;
    if (n.tipo === "final") return (memo[id] = true);
    if (visit.has(id)) return false; // ciclo sin salir a final por esta rama
    visit.add(id);
    const ok = salidas(n).some((s) => llegaAFinal(s, visit));
    visit.delete(id);
    if (ok) memo[id] = true;
    return ok;
  };
  for (const id of alcanzados) {
    if (!llegaAFinal(id)) errores.push(`nodo ${id} no puede alcanzar ningún final`);
  }

  const finales = mision.nodos.filter((n) => n.tipo === "final");
  if (finales.length < 1) errores.push("sin nodos final");
  if (!mision.nodos.some((n) => n.tipo === "resolucion")) errores.push("sin nodo resolucion");

  return { ok: errores.length === 0, errores };
}
