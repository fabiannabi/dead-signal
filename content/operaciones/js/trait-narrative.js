/**
 * trait-narrative.js — Peso narrativo de los rasgos, atado al momento de la misión.
 *
 * Los rasgos ya modifican los checks (dice.js). Este módulo hace que además se
 * SIENTAN en la transmisión — pero solo cuando encajan con lo que está pasando:
 *
 *   • fallo    → limitaciones que causan el tropiezo (físicas / conductuales).
 *   • esfuerzo → físicas (asma, rodilla) durante aproximación/retirada.
 *   • tension  → miedos (claustrofobia, agua) en encuentro/acción/emergencia.
 *   • calma    → recuerdos reflexivos (familia, trauma) SOLO en la exfiltración.
 *   • exito    → ventajas que pagan, en críticos de éxito.
 *
 * Cada línea se usa una sola vez por operación. Es puro respecto al DOM: devuelve
 * mensajes { canal, texto, rasgo, polaridad } que ui-coms.js pinta como nota del analista.
 */

const esNeg = (r) => (r.polaridad || '+') === '-';
const esPos = (r) => (r.polaridad || '+') === '+';

function _hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Momentos apropiados por rasgo. Override explícito para los que la categoría no basta
// (sobre todo los reflexivos, que SOLO deben salir en calma).
const MOMENTOS_OVERRIDE = {
  la_familia_perdida:        ['calma'],
  perdio_familia_emergencia: ['calma'],
  perdida_bien_procesada:    ['calma', 'tension'],
  sobreviviente_incidente_AH:['calma', 'tension'],
  tept_leve:                 ['calma', 'tension'],
  tartamudez_bajo_estres:    ['fallo', 'tension'],
  impulsividad:              ['fallo', 'tension'],
  hipervigilancia:           ['tension', 'esfuerzo'],
  claustrofobia:             ['tension', 'esfuerzo'],
  fobia_agua:                ['tension', 'esfuerzo'],
  calma_bajo_fuego:          ['tension'],
  frialdad_clinica:          ['tension', 'fallo'],
  optimismo_terco:           ['calma', 'tension'],
  veterana_primera_ola:      ['tension', 'calma'],
  silencio_del_campo:        ['exito', 'esfuerzo'],
  no_reporta_lo_trivial:     ['exito', 'tension'],
  voz_del_campo:             ['exito', 'esfuerzo'],
};
const MOMENTOS_CAT = {
  'físico':       ['esfuerzo', 'fallo'],
  'psicológico':  ['tension', 'fallo'],
  'biográfico':   ['calma', 'esfuerzo'],
  'mental':       ['calma', 'tension'],
  'habilidad':    ['exito', 'esfuerzo'],
  'técnico':      ['exito', 'esfuerzo'],
  'campo':        ['esfuerzo', 'exito'],
  'experiencia':  ['tension', 'calma'],
  'comunicación': ['exito', 'tension'],
  'social':       ['tension', 'fallo'],
  'progresión':   ['exito', 'calma'],
};
const momentosDe = (r) => MOMENTOS_OVERRIDE[r.id] || MOMENTOS_CAT[r.categoria] || ['esfuerzo', 'fallo'];

// Rasgos que además exigen que el entorno los mencione (agua, encierro, humedad…).
const ENV_TRIGGER = {
  claustrofobia:      /drenaje|t[úu]nel|colector|ducto|subterr|angost|estrech|techo baja|encierr|se cierra/i,
  fobia_agua:         /\bagua\b|charco|inund|anegad|estancad|humedad/i,
  asma_leve:          /humedad|polvo|moho|h[úu]medo|cargad|drenaje|encierr/i,
  miopia_severa:      /oscur|penumbra|al fondo|niebla|polvo en suspensi/i,
  hipoacusia_derecha: /eco|resonan|silencio|acústica|roce/i,
};

// Clasifica el momento de la misión: por resultado del check si lo hay, si no por el nodo.
function momentoDe(nodo, cr) {
  if (cr) {
    if (cr.resultado === 'fallo' || cr.resultado === 'crítico_fallo') return 'fallo';
    if (cr.resultado === 'crítico_éxito') return 'exito';
  }
  const id = nodo.id || '';
  if (/exterior/.test(id)) return 'calma';                                        // superficie: equipo a salvo
  if (/emergencia|encuentro|accion|objetivo|senal|dilema|segunda/.test(id)) return 'tension';
  return 'esfuerzo';                                                              // aproximación/búsqueda/retirada/inserción
}

function fill(txt, agente) {
  return String(txt)
    .replace(/\{agente\.nombre\}/g, agente.nombre_completo)
    .replace(/\{nombre\}/g, agente.nombre_completo);
}

export function crearNarradorRasgos() {
  const usados = {};   // `${agenteId}:${rasgoId}` → índice de la próxima línea
  const ambN = {};     // `${agenteId}:${rasgoId}` → veces que afloró por ambiente (tope 2)
  const vivo = (a) => a.estado?.vivo !== false;

  function tomarLinea(agente, rasgo) {
    const inserts = rasgo.narrativa_inserts || [];
    if (!inserts.length) return null;
    const k = `${agente.id}:${rasgo.id}`;
    const i = usados[k] || 0;
    if (i >= inserts.length) return null;   // agotado en esta operación
    usados[k] = i + 1;
    return fill(inserts[i], agente);
  }
  function msg(agente, texto, rasgo) {
    return {
      canal: `${agente.rango_abreviatura} ${agente.nombre_completo}`,
      archetype: agente.archetype_id,
      texto, rasgo: rasgo.nombre, polaridad: rasgo.polaridad || '+',
    };
  }
  const encaja = (r, mom) => momentosDe(r).includes(mom);

  return {
    /**
     * Disparo por resultado de check. Un fallo saca la limitación que lo explica
     * (y encaja con el momento 'fallo'); un crítico de éxito, la ventaja que pagó.
     */
    porCheck(estado, cr) {
      if (!cr) return [];
      const agente = estado.equipo.find(a => a.nombre_completo === cr.agente && vivo(a));
      if (!agente) return [];
      const rasgos = agente.rasgos || [];
      const malo = cr.resultado === 'fallo' || cr.resultado === 'crítico_fallo';
      const bueno = cr.resultado === 'crítico_éxito';

      let cand = [];
      if (malo) {
        cand = rasgos.filter(r => esNeg(r) && encaja(r, 'fallo') && (r.modificadores_stat?.[cr.stat] ?? 0) < 0);
        if (!cand.length && cr.resultado === 'crítico_fallo') cand = rasgos.filter(r => esNeg(r) && encaja(r, 'fallo'));
      } else if (bueno) {
        // Las ventajas pagan solo a veces (no en cada éxito) para no saturar.
        const gate = _hash(`${cr.agente}|${estado.historial?.length ?? 0}`) % 100;
        if (gate < 50) cand = rasgos.filter(r => esPos(r) && encaja(r, 'exito') && (r.modificadores_stat?.[cr.stat] ?? 0) > 0);
      }
      for (const r of cand) {
        const t = tomarLinea(agente, r);
        if (t) return [msg(agente, t, r)];
      }
      return [];
    },

    /**
     * Disparo por momento del nodo. Solo limitaciones y solo si el rasgo encaja con
     * lo que pasa: recuerdos en la calma, físico en el esfuerzo, miedo en la tensión.
     * Los rasgos con ENV_TRIGGER además exigen que el texto lo mencione. Máx. 1 por nodo.
     */
    porAmbiente(estado, nodo) {
      const mom = momentoDe(nodo, null);
      const texto = `${nodo.ambiente || ''} ${nodo.texto_control || ''} ${nodo.texto_agente || ''}`;
      for (const agente of estado.equipo) {
        if (!vivo(agente)) continue;
        for (const r of (agente.rasgos || [])) {
          if (!esNeg(r) || !encaja(r, mom)) continue;
          const k = `${agente.id}:${r.id}`;
          if ((ambN[k] || 0) >= 2) continue;   // tope: máx 2 apariciones ambientales por rasgo
          const rgx = ENV_TRIGGER[r.id];
          if (rgx && !rgx.test(texto)) continue;
          const t = tomarLinea(agente, r);
          if (t) { ambN[k] = (ambN[k] || 0) + 1; return [msg(agente, t, r)]; }
        }
      }
      return [];
    },
  };
}
