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
  const agente_voz = _resolverVoz(estado.equipo, nodo.agente_voz, nodo.id);

  const control = nodo.texto_control ? {
    canal: 'CONTROL',
    texto: _interpolar(nodo.texto_control, estado, agente_voz)
  } : null;
  const agente = nodo.texto_agente ? {
    canal: `${agente_voz.rango_abreviatura} ${agente_voz.nombre_completo}`,
    archetype: agente_voz.archetype_id,
    texto: _aplicarEstiloRadio(_interpolar(nodo.texto_agente, estado, agente_voz), agente_voz, nodo.id)
  } : null;

  // En nodos de reacción/resultado el agente en campo reporta primero y Control
  // responde a ese reporte; en nodos de brief/orden Control encuadra y el agente confirma.
  const secuencia = nodo.orden_voz === 'agente_primero' ? [agente, control] : [control, agente];
  for (const m of secuencia) if (m) mensajes.push(m);
}

// Hash determinístico string→uint (para elegir muletilla estable por nodo+agente).
function _hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Aplica la voz del agente (estilo_radio) a su línea: prefijo (inicio) y/o cierre.
// Determinístico por nodo+agente para que no cambie al re-jugar el mismo nodo.
function _aplicarEstiloRadio(txt, agente, nodoId) {
  const est = agente && agente.estilo_radio;
  if (!est || !txt) return txt;
  const h = _hashStr(`${nodoId}|${agente.id || agente.nombre_completo || ''}`);
  let out = txt.trim();
  const dashStart = /^[—-]/.test(out);
  const primerNombre = (agente.nombre_completo || '').split(' ')[0];

  // inicio: prefijo con minúscula en la 1ª letra; evita diálogo, nombre propio y "Control".
  if (est.inicio && est.inicio.length && (h % 100) < (est.inicio_prob || 0)
      && !dashStart && !out.startsWith(primerNombre) && !/^Control/.test(out)) {
    const ini = est.inicio[h % est.inicio.length];
    out = ini + out.charAt(0).toLowerCase() + out.slice(1);
  }
  // cierre: frase final; no se añade tras un grito/diálogo. (>>> sin signo: evita índice negativo)
  if (est.cierre && est.cierre.length && ((h >>> 3) % 100) < (est.cierre_prob || 0) && !dashStart) {
    const cie = est.cierre[(h >>> 3) % est.cierre.length];
    if (cie) {
      if (!/[.…?!]$/.test(out)) out += '.';
      out += ' ' + cie;
    }
  }
  return out;
}

function _resolverVoz(equipo, criterio, nodoId = '') {
  const activos = equipo.filter(a => a.estado?.vivo !== false);
  const pool = activos.length ? activos : equipo;
  if (!criterio || criterio === 'auto') return pool.find(a => a.es_lider) || pool[0];
  const match = pool.find(a => a.archetype_id === criterio);
  if (match) return match;
  // Arquetipo no presente: da la voz a un no-líder (estable por nodo) para que el
  // líder no acapare la transmisión — el líder ya habla en los nodos "auto".
  const noLider = pool.filter(a => !a.es_lider);
  const base = noLider.length ? noLider : pool;
  return base[_hashStr(String(nodoId)) % base.length];
}

// Capitaliza inicio de oración: los descriptores de criatura son minúscula (uso
// intra-frase), así que al caer tras punto/al inicio se ven mal si no se corrigen.
function _capitalizarOraciones(txt) {
  return txt
    .replace(/^(\s*)([a-záéíóúñ])/, (m, sp, c) => sp + c.toUpperCase())
    .replace(/([.?!…]\s+)([a-záéíóúñ])/g, (m, sep, c) => sep + c.toUpperCase());
}

function _interpolar(txt, estado, agente) {
  const lider = estado.equipo.find(a => a.es_lider) || estado.equipo[0];
  const ag = agente || lider;
  const out = txt
    .replace(/\{equipo\.lider\.nombre\}/g, lider.nombre_completo)
    .replace(/\{equipo\.lider\.rango\}/g,  lider.rango_abreviatura)
    .replace(/\{agente\.nombre\}/g,        ag.nombre_completo.split(' ')[0])
    .replace(/\{agente\.rango\}/g,         ag.rango_abreviatura)
    .replace(/\{nombre\}/g,                ag.nombre_completo)
    .replace(/\{estado_equipo\}/g,  _resumenEquipo(estado.equipo))
    .replace(/\{estado_muestra\}/g, estado.muestra_obtenida ? estado.muestra_tipo : 'no obtenida');
  return _capitalizarOraciones(out);
}

function _resumenEquipo(equipo) {
  const v = equipo.filter(a => a.estado.vivo).length;
  const h = equipo.filter(a => a.estado.heridas.length > 0).length;
  return h === 0
    ? `${v}/${equipo.length} operativos, sin heridos`
    : `${v}/${equipo.length} vivos, ${h} con heridas`;
}
