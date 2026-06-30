/**
 * mission-generator.js — Generador procedural de misiones CENVAC.
 *
 * generarMision(evento, seed, opciones) → misión JSON con la forma EXACTA que
 * consume mission-engine.js (no se reescribe el motor). Puro y determinístico.
 *
 * El generador es dueño del esqueleto (garantiza validez: toda rama llega a un
 * final, todo nodo alcanzable). La gramática (beats / creature-tags /
 * objective-templates / site-templates) aporta texto, stats y tuning, elegidos
 * con el seed. Soporta criaturas × sitios × objetivos, diferencia por seed, y la
 * siembra por escaneo (§4.2, §4.4).
 */

class SeededRNG {
  constructor(seed) { this.seed = (seed >>> 0) || 1; }
  next() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 0x100000000; }
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  chance(p) { return this.next() < p; }
  pickN(arr, n) {
    const copy = [...arr], out = [];
    for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(this.int(0, copy.length - 1), 1)[0]);
    return out;
  }
}

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
  const objId = opciones.objetivo || evento.objetivo || "extraccion_4a";
  const obj = objectiveTemplates[objId];
  if (!obj) throw new Error(`mission-generator: sin objective-template "${objId}"`);

  const accion = obj.accion;                       // extraccion | neutralizacion | documentacion | observacion
  const fases = obj.fases || [];
  const conBusqueda = fases.includes("busqueda");
  const conEncuentro = accion === "extraccion" || accion === "neutralizacion";
  const logica = objectiveTemplates._finales_logica;

  const site = siteTemplates[evento.sitio_tipo] || { nombre: evento.ubicacion_descrita, modificadores_ambiente: {} };
  const d = ct.descriptores || {};
  const scanNivel = (opciones.scan_estado && opciones.scan_estado.nivel) || 0;

  const ctx = {
    ...d, binomial: ct.binomial || d.criatura, criatura: d.criatura || ct.nombre,
    nivel_amenaza: ct.nivel_amenaza, sitio: site.nombre || evento.ubicacion_descrita, evento: evento.id,
  };
  const muestraSlug = (ctx.muestra || "objetivo").replace(/\s+/g, "_");
  const resultadoTipo = (obj.resultado_tipo || "{muestra}").replace(/\{muestra\}/g, muestraSlug);
  ctx.objetivo_brief = String(obj.objetivo_primario || "").replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined ? ctx[k] : m));
  const fill = (s) => String(s).replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined ? ctx[k] : m));

  const modAmb = (stat) => (site.modificadores_ambiente && site.modificadores_ambiente[stat]) || 0;
  // Siembra por escaneo: bono/penalización a checks de percepción.
  const reconMod = scanNivel >= 3 ? 2 : scanNivel >= 2 ? 1 : scanNivel === 0 ? -1 : 0;
  const percMod = (stat) => modAmb(stat) + reconMod;
  const audio = ct.audio || {};
  const b = beats;
  const v = (arr) => fill(rng.pick(arr || [""]));

  // ── Variación estructural por seed (§4.2) ───────────────────────────────────
  const tempoLargo = rng.chance(0.5);                 // inserta nodo de señal degradada
  const conRutaAprox = rng.chance(0.5);
  const conSegundaAprox = rng.chance(0.4) || tempoLargo === false && rng.chance(0.2);
  const conVentajaRecon = scanNivel >= 2;             // nodo de ventaja por escaneo (§4.4)
  const vozNarrativa = rng.pick(["auto", "veterano", "auto", "reconocimiento"]);
  const metodoBank = (b.metodos && b.metodos[accion]) || [];
  const numMetodos = conEncuentro ? rng.int(2, Math.max(2, metodoBank.length)) : 0;
  const metodos = conEncuentro ? rng.pickN(metodoBank, numMetodos) : [];
  const statRetirada = rng.chance(0.5) ? (ct.stat_retirada || "sigilo") : "físico";
  const difAprox = rng.int(b.aproximacion.dificultad[0], b.aproximacion.dificultad[1]) - (scanNivel >= 2 ? 1 : 0);
  const difMedio = rng.int(b.busqueda.dificultad[0], b.busqueda.dificultad[1]);
  const difRet = rng.int(b.retirada.dificultad[0], b.retirada.dificultad[1]);

  // ── ids ─────────────────────────────────────────────────────────────────────
  const ID = {
    INS: "nodo_insercion", VENTAJA: "nodo_ventaja_recon", APROX_RUTA: "nodo_aprox_ruta",
    APROX: "nodo_aproximacion", APROX2: "nodo_aproximacion_2", APROX_FALLO: "nodo_aprox_fallo",
    BUSQ: "nodo_busqueda", BUSQ_INFO: "nodo_busqueda_info", BUSQ_SININFO: "nodo_busqueda_sininfo", BUSQ_ALERTA: "nodo_busqueda_alerta",
    ENC: "nodo_encuentro", OBS: "nodo_observacion", DOC: "nodo_documentacion",
    OBJ_OK: "nodo_objetivo_cumplido", OBJ_COMP: "nodo_objetivo_parcial", OBJ_PERD: "nodo_objetivo_fallido",
    SENAL: "nodo_senal_degradada", RET: "nodo_retirada", EMERG: "nodo_emergencia", OUT: "nodo_exterior", RES: "nodo_resolucion",
  };

  const nodos = [];
  const N = (n) => { nodos.push(n); return n; };
  const opt = (texto, siguiente, efectos = [], requiere = null) => ({ texto: fill(texto), siguiente, requiere, efectos_inmediatos: efectos });
  const efEstamina = (delta, alcance = "todos") => ({ tipo: "estamina", delta, alcance });
  const efCordura = (delta, alcance = "todos") => ({ tipo: "cordura", delta, alcance });
  const efFlag = (nombre, valor = true) => ({ tipo: "flag", nombre, valor });

  // Entradas dinámicas según fases
  const middleEntry = conBusqueda ? ID.BUSQ : ID.OBS;
  const aproxExito = conSegundaAprox ? ID.APROX2 : middleEntry;
  const insSiguiente = conVentajaRecon ? ID.VENTAJA : (conRutaAprox ? ID.APROX_RUTA : ID.APROX);
  const ventajaSiguiente = conRutaAprox ? ID.APROX_RUTA : ID.APROX;
  const objSiguiente = tempoLargo ? ID.SENAL : ID.RET;

  // ── INSERCIÓN ───────────────────────────────────────────────────────────────
  N({ id: ID.INS, tipo: "narrativo", ambiente: v(b.insercion.ambiente), texto_control: v(b.insercion.control), texto_agente: v(b.insercion.agente), agente_voz: "auto", opciones: [opt(v(b.insercion.opcion), insSiguiente)], efectos: [], audio_hint: "estatica_baja" });

  if (conVentajaRecon) {
    N({ id: ID.VENTAJA, tipo: "narrativo", ambiente: v(b.ventaja_recon.ambiente), texto_control: v(b.ventaja_recon.control), texto_agente: v(b.ventaja_recon.agente), agente_voz: vozNarrativa, opciones: [opt("Aprovechen la ventaja. Avancen.", ventajaSiguiente, [efFlag("ventaja_recon")])], efectos: [], audio_hint: "estatica_baja" });
  }

  // ── APROXIMACIÓN ─────────────────────────────────────────────────────────────
  if (conRutaAprox) {
    N({ id: ID.APROX_RUTA, tipo: "decision", ambiente: v(b.aproximacion.ambiente), texto_control: "El acceso admite dos líneas: una directa que ahorra tiempo y una más larga que reduce exposición. Control decide.", texto_agente: "Dos rutas hasta el foco. Directa o la larga sin exposición. Diga.", agente_voz: "reconocimiento", opciones: [opt("Ruta directa. Más rápido, asuman el desgaste.", ID.APROX, [efEstamina(-5)]), opt("Ruta larga. Sin anunciar presencia.", ID.APROX)], efectos: [], audio_hint: "silencio" });
  }
  N({ id: ID.APROX, tipo: "check", ambiente: v(b.aproximacion.ambiente), texto_control: v(b.aproximacion.control), texto_agente: v(b.aproximacion.agente), agente_voz: "reconocimiento",
    check: { stat: ct.stat_aproximacion || "sigilo", agente: "mejor_stat", dificultad: difAprox, modificadores_ambiente: modAmb(ct.stat_aproximacion || "sigilo"),
      resultados: { "crítico_éxito": aproxExito, "éxito": aproxExito, "fallo": ID.APROX_FALLO, "crítico_fallo": ID.APROX_FALLO } },
    efectos: [], audio_hint: audio.aproximacion || "silencio" });
  if (conSegundaAprox) {
    N({ id: ID.APROX2, tipo: "check", ambiente: v(b.aproximacion.ambiente), texto_control: "Segundo tramo de aproximación; el margen de error baja. " + v(b.aproximacion.control), texto_agente: v(b.aproximacion.agente), agente_voz: "reconocimiento",
      check: { stat: "sigilo", agente: "mejor_stat", dificultad: difAprox + 1, modificadores_ambiente: modAmb("sigilo"),
        resultados: { "crítico_éxito": middleEntry, "éxito": middleEntry, "fallo": middleEntry, "crítico_fallo": ID.APROX_FALLO },
        efectos_por_resultado: { "fallo": [efEstamina(-5)] } },
      efectos: [], audio_hint: audio.aproximacion || "silencio" });
  }
  N({ id: ID.APROX_FALLO, tipo: "narrativo", ambiente: v(b.aproximacion.fallo_ambiente), texto_control: v(b.aproximacion.fallo_control), texto_agente: v(b.aproximacion.fallo_agente), agente_voz: "auto", opciones: [opt("Entendido. Sigan con precaución. El espécimen posiblemente está alerta.", middleEntry, [efCordura(-5)])], efectos: [efFlag("especimen_alerta")], audio_hint: "estatica_baja" });

  // ── MEDIO: búsqueda (+encuentro) o acción directa ───────────────────────────
  const accionEntry = conEncuentro ? ID.ENC : (accion === "documentacion" ? ID.DOC : ID.OBS);

  if (conBusqueda) {
    N({ id: ID.BUSQ, tipo: "check", ambiente: v(b.busqueda.ambiente), texto_control: v(b.busqueda.control), texto_agente: v(b.busqueda.agente), agente_voz: "sanitario",
      check: { stat: ct.stat_busqueda || "biológico", agente: "mejor_stat", dificultad: difMedio, modificadores_ambiente: percMod(ct.stat_busqueda || "biológico"),
        resultados: { "crítico_éxito": ID.BUSQ_INFO, "éxito": ID.BUSQ_INFO, "fallo": ID.BUSQ_SININFO, "crítico_fallo": ID.BUSQ_ALERTA } },
      efectos: [], audio_hint: audio.busqueda || "estatica_baja" });
    N({ id: ID.BUSQ_INFO, tipo: "narrativo", ambiente: v(b.busqueda.ambiente), texto_control: v(b.busqueda.info_control), texto_agente: v(b.busqueda.info_agente), agente_voz: "auto", opciones: [opt("Confirmo. Protocolo 15 — avancen al punto de acción y esperen instrucción.", accionEntry, [efFlag("posicion_confirmada")])], efectos: [], audio_hint: "silencio" });
    N({ id: ID.BUSQ_SININFO, tipo: "narrativo", ambiente: v(b.busqueda.ambiente), texto_control: v(b.busqueda.sininfo_control), texto_agente: v(b.busqueda.sininfo_agente), agente_voz: "auto", opciones: [opt("Entendido. Avancen despacio. Protocolo 6 hasta nuevo aviso.", accionEntry, [efCordura(-5)])], efectos: [], audio_hint: "estatica_media" });
    N({ id: ID.BUSQ_ALERTA, tipo: "narrativo", ambiente: v(b.busqueda.ambiente), texto_control: v(b.busqueda.alerta_control), texto_agente: v(b.busqueda.alerta_agente), agente_voz: "auto", opciones: [opt("No se muevan. Cero ruido. Si reacciona, protocolo defensivo inmediato. Esperen.", accionEntry, [efCordura(-15), efEstamina(-5), efFlag("especimen_alerta")])], efectos: [], audio_hint: "silencio" });
  }

  // ── ACCIÓN ───────────────────────────────────────────────────────────────────
  const ab = b.accion[accion] || {};
  const herida = b.herida;
  const okEf = [{ tipo: "muestra_obtenida", valor: resultadoTipo }];
  const compEf = [{ tipo: "muestra_obtenida", valor: resultadoTipo + "_parcial" }];

  if (conEncuentro) {
    const idExt = (m) => `nodo_accion_${m.id}`;
    N({ id: ID.ENC, tipo: "decision", ambiente: v(b.encuentro.ambiente), texto_control: v(b.encuentro.control), texto_agente: v(b.encuentro.agente), agente_voz: "auto", opciones: metodos.map((m) => opt(m.texto, idExt(m))), efectos: [], audio_hint: audio.encuentro || "estatica_media" });
    metodos.forEach((m) => {
      const dosEtapas = m.stat === "sigilo";
      const exitoTarget = dosEtapas ? idExt(m) + "_2" : ID.OBJ_OK;
      N({ id: idExt(m), tipo: "check", ambiente: v(ab.ambiente), texto_control: v(ab.control), texto_agente: v(ab.agente), agente_voz: dosEtapas ? "reconocimiento" : (accion === "neutralizacion" ? "asalto" : "sanitario"),
        check: { stat: m.stat, agente: "mejor_stat", dificultad: m.dificultad, modificadores_ambiente: modAmb(m.stat),
          resultados: { "crítico_éxito": exitoTarget, "éxito": exitoTarget, "fallo": ID.OBJ_COMP, "crítico_fallo": ID.OBJ_PERD },
          efectos_por_resultado: { "crítico_fallo": [{ tipo: "herida", valor: { ...herida }, alcance: "aleatorio" }, efCordura(-10)] } },
        efectos: [], audio_hint: audio.accion || "estatica_baja" });
      if (dosEtapas) {
        N({ id: idExt(m) + "_2", tipo: "check", ambiente: v(ab.ambiente), texto_control: "Posición de ventaja lograda sin alertar al espécimen. Ahora la ejecución, sin margen de ruido. " + v(ab.control), texto_agente: v(ab.agente), agente_voz: accion === "neutralizacion" ? "asalto" : "sanitario",
          check: { stat: ct.stat_accion || "biológico", agente: "mejor_stat", dificultad: difMedio, modificadores_ambiente: modAmb(ct.stat_accion || "biológico"),
            resultados: { "crítico_éxito": ID.OBJ_OK, "éxito": ID.OBJ_OK, "fallo": ID.OBJ_COMP, "crítico_fallo": ID.OBJ_PERD } },
          efectos: [], audio_hint: audio.accion || "estatica_baja" });
      }
    });
  } else if (accion === "documentacion") {
    N({ id: ID.DOC, tipo: "check", ambiente: v(ab.ambiente), texto_control: v(ab.control), texto_agente: v(ab.agente), agente_voz: "sanitario",
      check: { stat: ct.stat_accion || "biológico", agente: "mejor_stat", dificultad: rng.int(ab.dificultad[0], ab.dificultad[1]), modificadores_ambiente: percMod(ct.stat_accion || "biológico"),
        resultados: { "crítico_éxito": ID.OBJ_OK, "éxito": ID.OBJ_OK, "fallo": ID.OBJ_COMP, "crítico_fallo": ID.OBJ_PERD } },
      efectos: [], audio_hint: audio.accion || "estatica_baja" });
  } else if (accion === "observacion") {
    N({ id: ID.OBS, tipo: "check", ambiente: v(ab.ambiente), texto_control: v(ab.control), texto_agente: v(ab.agente), agente_voz: "tecnico",
      check: { stat: ct.stat_accion || "técnico", agente: "mejor_stat", dificultad: rng.int(ab.dificultad[0], ab.dificultad[1]), modificadores_ambiente: percMod(ct.stat_accion || "técnico"),
        resultados: { "crítico_éxito": ID.OBJ_OK, "éxito": ID.OBJ_OK, "fallo": ID.OBJ_COMP, "crítico_fallo": ID.OBJ_PERD },
        efectos_por_resultado: { "crítico_fallo": [efCordura(-15)] } },
      efectos: [], audio_hint: audio.accion || "estatica_alta" });
  }

  // ── NODOS DE OBJETIVO ────────────────────────────────────────────────────────
  N({ id: ID.OBJ_OK, tipo: "narrativo", ambiente: v(ab.ambiente), texto_control: v(ab.ok_control), texto_agente: v(ab.ok_agente), agente_voz: "auto", opciones: [opt("Objetivo cumplido. Inicien retirada.", objSiguiente, okEf)], efectos: [], audio_hint: "estatica_baja" });
  N({ id: ID.OBJ_COMP, tipo: "narrativo", ambiente: v(ab.ambiente), texto_control: v(ab.comp_control), texto_agente: v(ab.comp_agente), agente_voz: "auto", opciones: [opt("Recibido. Continúan con lo obtenido. Inicien retirada.", objSiguiente, compEf)], efectos: [efCordura(-5, "lider")], audio_hint: "estatica_media" });
  N({ id: ID.OBJ_PERD, tipo: "narrativo", ambiente: v(ab.ambiente), texto_control: v(ab.perd_control), texto_agente: v(ab.perd_agente), agente_voz: "auto", opciones: [opt("Entendido. Salgan en orden. Elijan ruta.", objSiguiente)], efectos: [efCordura(-10, "lider")], audio_hint: "estatica_media" });

  // ── SEÑAL DEGRADADA (tempo largo) ───────────────────────────────────────────
  if (tempoLargo) {
    N({ id: ID.SENAL, tipo: "narrativo", ambiente: v(b.senal_degradada.ambiente), texto_control: v(b.senal_degradada.control), texto_agente: v(b.senal_degradada.agente), agente_voz: "auto", opciones: [opt("Código 2. Mantengan rumbo. Reporten solo novedad.", ID.RET)], efectos: [{ tipo: "recurso", recurso: "batería", delta: -1 }], audio_hint: "estatica_alta" });
  }

  // ── RETIRADA → exterior; crítico_fallo → emergencia ─────────────────────────
  N({ id: ID.RET, tipo: "check", ambiente: v(b.retirada.ambiente), texto_control: v(b.retirada.control), texto_agente: v(b.retirada.agente), agente_voz: "auto",
    check: { stat: statRetirada, agente: "mejor_stat", dificultad: difRet, modificadores_ambiente: modAmb(statRetirada),
      resultados: { "crítico_éxito": ID.OUT, "éxito": ID.OUT, "fallo": ID.OUT, "crítico_fallo": ID.EMERG },
      efectos_por_resultado: { "fallo": [efEstamina(-10)] } },
    efectos: [], audio_hint: "estatica_baja" });
  N({ id: ID.EMERG, tipo: "check", ambiente: v(b.retirada.emergencia_ambiente), texto_control: v(b.retirada.emergencia_control), texto_agente: v(b.retirada.emergencia_agente), agente_voz: "asalto",
    check: { stat: "físico", agente: "mejor_stat", dificultad: 14, modificadores_ambiente: modAmb("físico"),
      resultados: { "crítico_éxito": ID.OUT, "éxito": ID.OUT, "fallo": ID.OUT, "crítico_fallo": ID.OUT },
      efectos_por_resultado: {
        "fallo": [{ tipo: "herida", valor: { tipo: "trauma_de_especimen", severidad: 3, parte_cuerpo: "torso", efecto_stat: { "físico": -1 } }, alcance: "aleatorio" }],
        "crítico_fallo": [{ tipo: "baja_garantizada", valor: { tipo: "trauma_de_especimen", parte_cuerpo: "torso", severidad: 4 }, alcance: "aleatorio" }],
      } },
    efectos: [efEstamina(-25), efCordura(-25)], audio_hint: audio.critico || "alerta_critica" });

  // ── EXTERIOR → RESOLUCIÓN → FINALES ─────────────────────────────────────────
  N({ id: ID.OUT, tipo: "narrativo", ambiente: v(b.retirada.exterior_ambiente), texto_control: v(b.retirada.exterior_control), texto_agente: v(b.retirada.exterior_agente), agente_voz: "auto", opciones: [opt(v(b.retirada.exterior_opcion), ID.RES)], efectos: [], audio_hint: "estatica_baja" });
  N({ id: ID.RES, tipo: "resolucion", texto_control: "La operación está cerrada. CENVAC-Central procesa el resultado. El archivo del evento será actualizado.", logica_resolucion: logica, efectos: [] });

  for (const f of obj.finales) {
    N({ id: f.id, tipo: "final", resultado: f.resultado, titulo: fill(f.titulo), texto_control: fill(f.texto_control), clasificacion_doc: f.clasificacion_doc,
      narrativa_fragmentos: { cronologia: fill(f.narrativa_fragmentos.cronologia), hallazgos: fill(f.narrativa_fragmentos.hallazgos), notas_analista: fill(f.narrativa_fragmentos.notas_analista) },
      efectos: [], efectos_garantizados_al_entrar: f.efectos_garantizados_al_entrar || [] });
  }

  return {
    id: `gen-${criaturaId}-${objId}-${seed}`,
    nombre: fill(obj.nombre_plantilla),
    descripcion: fill(`${obj.objetivo_primario} Foco: ${ctx.sitio}.`),
    tipo_mision: obj.tipo_mision, criatura: criaturaId, objetivo: objId, nivel_amenaza: ct.nivel_amenaza,
    objetivo_primario: fill(obj.objetivo_primario), objetivo_secundario: fill(obj.objetivo_secundario),
    muestra_objetivo: resultadoTipo, muestra_descripcion: fill(ctx.muestra_desc || ""),
    seed, generada: true, scan_nivel: scanNivel, nodo_inicial: ID.INS, nodos,
  };
}

/** Valida estructura: refs existentes, alcanzabilidad y que toda rama llegue a un final. */
export function validarMision(mision) {
  const errores = [];
  const byId = {};
  for (const n of mision.nodos) { if (byId[n.id]) errores.push(`id duplicado: ${n.id}`); byId[n.id] = n; }
  const salidas = (n) => {
    if (n.tipo === "check") return Object.values(n.check.resultados || {});
    if (n.tipo === "resolucion") return (n.logica_resolucion || []).map((r) => r.siguiente);
    if (n.tipo === "final") return [];
    return (n.opciones || []).map((o) => o.siguiente).filter(Boolean);
  };
  for (const n of mision.nodos) {
    for (const s of salidas(n)) if (!byId[s]) errores.push(`nodo ${n.id} → referencia inexistente "${s}"`);
    if (n.tipo !== "final" && salidas(n).length === 0) errores.push(`nodo ${n.id} (${n.tipo}) sin salidas`);
  }
  if (!byId[mision.nodo_inicial]) errores.push(`nodo_inicial inexistente: ${mision.nodo_inicial}`);

  const alcanzados = new Set();
  const stack = [mision.nodo_inicial];
  while (stack.length) {
    const id = stack.pop();
    if (alcanzados.has(id) || !byId[id]) continue;
    alcanzados.add(id);
    for (const s of salidas(byId[id])) if (!alcanzados.has(s)) stack.push(s);
  }
  for (const n of mision.nodos) if (!alcanzados.has(n.id)) errores.push(`nodo inalcanzable: ${n.id}`);

  const memo = {};
  const llegaAFinal = (id, visit = new Set()) => {
    if (memo[id] !== undefined) return memo[id];
    const n = byId[id]; if (!n) return false;
    if (n.tipo === "final") return (memo[id] = true);
    if (visit.has(id)) return false;
    visit.add(id);
    const okk = salidas(n).some((s) => llegaAFinal(s, visit));
    visit.delete(id);
    if (okk) memo[id] = true;
    return okk;
  };
  for (const id of alcanzados) if (!llegaAFinal(id)) errores.push(`nodo ${id} no puede alcanzar ningún final`);

  if (!mision.nodos.some((n) => n.tipo === "final")) errores.push("sin nodos final");
  if (!mision.nodos.some((n) => n.tipo === "resolucion")) errores.push("sin nodo resolucion");
  return { ok: errores.length === 0, errores };
}
