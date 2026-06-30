/**
 * mission-engine.js — Motor de árbol narrativo CENVAC
 */

import { tirarCheck, calcularModificadoresAgente, seleccionarAgente } from './dice.js';
import { aplicarEfectos, guardarEstado, contarBajas, contarHeridasGraves, avanzarTiempo } from './state.js';

export function cargarMision(data) {
  const map = {};
  data.nodos.forEach(n => { map[n.id] = n; });
  return { ...data, _map: map };
}

export function obtenerNodo(mision, id) {
  return mision._map[id] || null;
}

export function procesarOpcion(nodo, estado, opcionIndex) {
  const opts = filtrarOpciones(nodo.opciones, estado);
  if (!opts || !opts[opcionIndex]) return null;
  const op = opts[opcionIndex];
  aplicarEfectos(estado, op.efectos_inmediatos || []);
  guardarEstado(estado);
  return op.siguiente;
}

export function filtrarOpciones(opciones, estado) {
  return (opciones || []).filter(op => {
    if (!op.requiere) return true;
    const r = op.requiere;
    if (r.flag !== undefined) return estado.flags[r.flag] === r.valor;
    return true;
  });
}

/**
 * Procesa un nodo del árbol narrativo.
 *
 * @param {object} nodo
 * @param {object} estado  — estado de misión (mutado in-place)
 * @param {object} mision  — misión cargada con cargarMision()
 * @param {object} opts
 *   - opcionIndex {number|null}    — índice de opción elegida (para decisión/narrativo)
 *   - resultadoForzado {string|null} — fuerza el resultado de un check (testing)
 * @returns {object} resultado del procesamiento
 */
export function procesarNodo(nodo, estado, mision, { opcionIndex = null, resultadoForzado = null } = {}) {
  const out = {
    nodo_id: nodo.id,
    tipo: nodo.tipo,
    ambiente: nodo.ambiente || '',
    mensajes: [],
    opciones_disponibles: null,
    siguiente: null,
    check_resultado: null,
    es_final: nodo.tipo === 'final',
    requiere_decision: false,
    audio_hint: nodo.audio_hint || 'silencio'
  };

  // Efectos del nodo (siempre se aplican al entrar)
  aplicarEfectos(estado, nodo.efectos);

  // Para nodos finales: efectos que garantizan coherencia estado↔narrativa
  if (nodo.tipo === 'final' && nodo.efectos_garantizados_al_entrar?.length) {
    aplicarEfectos(estado, nodo.efectos_garantizados_al_entrar);
  }

  // Registro en historial
  estado.historial.push({ id: nodo.id, tipo: nodo.tipo, tiempo: estado.tiempo_simulado });
  avanzarTiempo(estado, 3); // Avance de tiempo simulado por nodo

  // Construir mensajes
  _construirMensajes(nodo, estado, out.mensajes);

  switch (nodo.tipo) {
    case 'narrativo':
    case 'final': {
      const opts = filtrarOpciones(nodo.opciones, estado);
      if (opcionIndex !== null && opts[opcionIndex]) {
        const op = opts[opcionIndex];
        aplicarEfectos(estado, op.efectos_inmediatos);
        out.siguiente = op.siguiente;
      } else if (opts && opts.length > 0) {
        out.opciones_disponibles = opts;
        out.requiere_decision = true;
      }
      break;
    }

    case 'decision': {
      const opts = filtrarOpciones(nodo.opciones, estado);
      if (opcionIndex !== null && opts[opcionIndex]) {
        const op = opts[opcionIndex];
        aplicarEfectos(estado, op.efectos_inmediatos);
        out.siguiente = op.siguiente;
      } else {
        out.opciones_disponibles = opts;
        out.requiere_decision = true;
      }
      break;
    }

    case 'check': {
      const chk = nodo.check;
      const agente = seleccionarAgente(estado.equipo, chk.agente, chk.stat);
      const mods = calcularModificadoresAgente(agente, { stat: chk.stat });
      if (chk.modificadores_ambiente) {
        mods.push({ fuente: 'ambiente', valor: chk.modificadores_ambiente });
      }

      const cr = resultadoForzado
        ? _checkForzado(resultadoForzado, agente.stats[chk.stat] || 5, chk.dificultad)
        : tirarCheck({ stat: chk.stat, valor_stat: agente.stats[chk.stat] || 5, dificultad: chk.dificultad, modificadores: mods });

      out.check_resultado = { ...cr, agente: agente.nombre_completo, stat: chk.stat };

      // Efectos condicionales por resultado
      const ef_cond = chk.efectos_por_resultado?.[cr.resultado];
      if (ef_cond) aplicarEfectos(estado, ef_cond);

      out.siguiente = chk.resultados[cr.resultado];
      break;
    }

    case 'resolucion': {
      if (nodo.texto_control) {
        out.mensajes.push({ canal: 'SISTEMA', texto: nodo.texto_control });
      }
      out.siguiente = _resolverFinal(nodo, estado);
      break;
    }
  }

  guardarEstado(estado);
  return out;
}

function _checkForzado(resultado, valor_stat, dificultad) {
  const deltas = { 'crítico_éxito': 5, 'éxito': 0, 'fallo': -1, 'crítico_fallo': -5 };
  const diferencia = deltas[resultado] ?? 0;
  return {
    tirada: 5,
    modificadores: [],
    mod_total: 0,
    total: valor_stat + 5 + diferencia,
    dificultad,
    diferencia,
    resultado
  };
}

function _resolverFinal(nodo, estado) {
  const bajas  = contarBajas(estado);
  const graves = contarHeridasGraves(estado);

  for (const regla of (nodo.logica_resolucion || [])) {
    const c = regla.condicion;
    let match = true;
    if (c.muestra_obtenida !== undefined && estado.muestra_obtenida !== c.muestra_obtenida) match = false;
    if (c.muestra_tipo      !== undefined && estado.muestra_tipo !== c.muestra_tipo)         match = false;
    if (c.bajas_count       !== undefined && bajas !== c.bajas_count)                        match = false;
    if (c.bajas_count_gte   !== undefined && bajas < c.bajas_count_gte)                      match = false;
    if (c.heridas_graves_count     !== undefined && graves !== c.heridas_graves_count)        match = false;
    if (c.heridas_graves_count_gte !== undefined && graves < c.heridas_graves_count_gte)      match = false;
    if (match) return regla.siguiente;
  }

  return 'final_fracaso_catastrofico';
}

function _construirMensajes(nodo, estado, mensajes) {
  const lider  = estado.equipo.find(a => a.es_lider) || estado.equipo[0];
  const agente_voz = _resolverVoz(estado.equipo, nodo.agente_voz);

  if (nodo.texto_control) {
    mensajes.push({
      canal: 'CONTROL',
      texto: _interpolar(nodo.texto_control, estado, agente_voz)
    });
  }
  if (nodo.texto_agente) {
    mensajes.push({
      canal: `${agente_voz.rango_abreviatura} ${agente_voz.nombre_completo}`,
      archetype: agente_voz.archetype_id,
      texto: _interpolar(nodo.texto_agente, estado, agente_voz)
    });
  }
}

function _resolverVoz(equipo, criterio) {
  const activos = equipo.filter(a => a.estado?.vivo !== false);
  if (!criterio || criterio === 'auto') return activos.find(a => a.es_lider) || activos[0];
  return activos.find(a => a.archetype_id === criterio) || activos.find(a => a.es_lider) || activos[0];
}

function _interpolar(txt, estado, agente) {
  const lider = estado.equipo.find(a => a.es_lider) || estado.equipo[0];
  const ag = agente || lider;
  return txt
    .replace(/\{equipo\.lider\.nombre\}/g, lider.nombre_completo)
    .replace(/\{equipo\.lider\.rango\}/g,  lider.rango_abreviatura)
    .replace(/\{agente\.nombre\}/g,        ag.nombre_completo)
    .replace(/\{agente\.rango\}/g,         ag.rango_abreviatura)
    .replace(/\{nombre\}/g,                ag.nombre_completo)
    .replace(/\{estado_equipo\}/g,  _resumenEquipo(estado.equipo))
    .replace(/\{estado_muestra\}/g, estado.muestra_obtenida ? estado.muestra_tipo : 'no obtenida');
}

function _resumenEquipo(equipo) {
  const v = equipo.filter(a => a.estado.vivo).length;
  const h = equipo.filter(a => a.estado.heridas.length > 0).length;
  return h === 0
    ? `${v}/${equipo.length} operativos, sin heridos`
    : `${v}/${equipo.length} vivos, ${h} con heridas`;
}
