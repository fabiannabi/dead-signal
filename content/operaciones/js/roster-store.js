/**
 * roster-store.js — Persistencia del cuartel CENVAC (STUB de Fase 5).
 *
 * El enganche real con el roster persistente vive en la tarea hermana
 * `sistema-agentes-persistente.md` (perfilAgente / consolidarOperacion). Mientras
 * esa tarea no esté mergeada, este módulo persiste localmente en localStorage para
 * que las bajas/heridas de las operaciones perduren entre despliegues y sesiones.
 *
 * Cuando el módulo real exista: poner ROSTER_PERSISTENTE = true y delegar las dos
 * funciones públicas (perfilAgente, consolidarOperacion) en él. El resto del módulo
 * (mapa, coms, reporte) ya consume esta interfaz, así que no habrá que tocarlo.
 */

export const ROSTER_PERSISTENTE = false; // ← true cuando exista el roster real

const KEY = 'cenvac_cuartel';

// localStorage en browser; fallback en memoria para Node / entornos sin storage.
const _mem = {};
const _store = (typeof localStorage !== 'undefined') ? localStorage : {
  getItem: (k) => (k in _mem ? _mem[k] : null),
  setItem: (k, v) => { _mem[k] = String(v); },
  removeItem: (k) => { delete _mem[k]; },
};

const _vacio = () => ({ operaciones: 0, opsGlobal: 0, bajas: 0, heridos: 0, muestras: 0, agentes: {}, memorial: [], historial: [] });

// Roster fijo: agentes procedurales reproducibles (mismos seeds que el briefing).
export const SEEDS_PROCEDURALES = [42, 137, 2026, 999, 3141, 7777];
export const CUPO_ROSTER = 9;
export const RECUPERACION_OPS = 2;   // ops que un herido grave queda en recuperación

// Vínculos canónicos (derivados de relaciones_internas de los nombrados).
export const VINCULOS = [
  { a: 'agente_lucia_herrera', b: 'agente_joaquin_ramirez', tipo: 'entendimiento silencioso', intensidad: 3 },
  { a: 'agente_esther_valverde', b: 'agente_daniela_gomez', tipo: 'mentoría tácita', intensidad: 2 },
  { a: 'agente_marco_tellez', b: 'agente_daniela_gomez', tipo: 'confianza técnica', intensidad: 2 },
];
export function vinculoDe(id) {
  const v = VINCULOS.find((x) => x.a === id || x.b === id);
  return v ? { otro: v.a === id ? v.b : v.a, tipo: v.tipo, intensidad: v.intensidad } : null;
}
function _read() { try { return JSON.parse(_store.getItem(KEY)) || _vacio(); } catch { return _vacio(); } }
function _write(c) { try { _store.setItem(KEY, JSON.stringify(c)); } catch { /* storage lleno / no disponible */ } }

export function getCuartel() { return _read(); }
export function resetCuartel() { _write(_vacio()); }

/** Estado persistente de un agente (null si no hay registro). */
export function perfilAgente(id) {
  // if (ROSTER_PERSISTENTE) return rosterReal.perfilAgente(id)
  return _read().agentes[id] || null;
}

/**
 * Consolida el resultado de una operación en el cuartel: marca bajas/heridas por
 * agente, acumula tallies y guarda el historial. Idempotente por operación vía
 * la bandera de sesión que pone el llamador.
 */
export function consolidarOperacion(estado, mision, evento) {
  // if (ROSTER_PERSISTENTE) return rosterReal.consolidarOperacion(estado, mision, evento)
  const c = _read();
  c.operaciones += 1;
  c.opsGlobal = (c.opsGlobal || 0) + 1;
  let bajasOp = 0, heridosOp = 0;
  const sitio = evento.icono_mapa?.etiqueta || evento.ubicacion_descrita?.slice(0, 24) || evento.id;

  for (const a of estado.equipo) {
    const ov = c.agentes[a.id] || { id: a.id, nombre: a.nombre_completo, rango: a.rango_abreviatura, rol: a.nombre_rol, ops: 0, estado: 'activa', cicatrices: [] };
    if (!ov.cicatrices) ov.cicatrices = [];
    ov.ops += 1;
    ov.cordura = a.estado?.cordura ?? ov.cordura;   // persistir cordura tras la operación

    if (a.estado && a.estado.vivo === false) {
      if (ov.estado !== 'baja') {
        c.bajas += 1;
        const h = (a.estado.heridas || []).slice(-1)[0];
        c.memorial.unshift({
          id: a.id, nombre: a.nombre_completo, rango: a.rango_abreviatura,
          causa: h ? h.tipo.replace(/_/g, ' ') : 'pérdida en operación',
          op: `OP-${evento.id.replace('EVT-', '')}`, sitio, criatura: evento.criatura_sospechada,
        });
      }
      ov.estado = 'baja';
      bajasOp += 1;
    } else {
      const graves = (a.estado?.heridas || []).filter((h) => h.severidad >= 3);
      if (graves.length) {
        const h = graves[graves.length - 1];
        ov.cicatrices.push({ tipo: h.tipo.replace(/_/g, ' '), parte: h.parte_cuerpo, op: `OP-${evento.id.replace('EVT-', '')}`, efecto: h.efecto_stat || {} });
        ov.estado = 'recuperacion';
        ov.recuperacion_hasta = c.opsGlobal + RECUPERACION_OPS;
        heridosOp += 1;
      } else if ((ov.cordura ?? 100) < 35) {
        ov.estado = 'herida';
      } else {
        ov.estado = 'activa';
      }
    }
    c.agentes[a.id] = ov;
  }

  if (estado.muestra_obtenida) c.muestras += 1;
  c.heridos += heridosOp;

  const finalId = estado.historial[estado.historial.length - 1]?.id || null;
  c.historial.unshift({
    evento: evento.id, mision: mision.id, criatura: evento.criatura_sospechada,
    objetivo: mision.objetivo || null, final: finalId,
    muestra: !!estado.muestra_obtenida, bajas: bajasOp, heridos: heridosOp, tiempo: estado.tiempo_simulado,
  });
  c.historial = c.historial.slice(0, 20);

  _write(c);
  return c;
}

export function getMemorial() { return _read().memorial || []; }
export function getOpsGlobal() { return _read().opsGlobal || 0; }

/** Fusiona un agente base (named/procedural) con su overlay persistente → perfil completo. */
export function perfilCompleto(base) {
  const c = _read();
  const ov = c.agentes[base.id] || {};
  const cordura_max = base.estado?.cordura_max || 100;
  return {
    id: base.id, nombre: base.nombre_completo, rango: base.rango_abreviatura, rol: base.nombre_rol,
    arquetipo: base.archetype_id, genero: base.genero, stats: base.stats || {}, rasgos: base.rasgos || [],
    historia: base.historia || '', voz: base.voz || '', tics: base.tics_radio || base.patron_radio || '',
    relaciones: base.relaciones_internas || null, es_nombrado: !!base.es_nombrado,
    ops: (base.operaciones_completadas || 0) + (ov.ops || 0),
    cordura: ov.cordura ?? cordura_max, cordura_max,
    estado: ov.estado || 'activa',
    recuperacion_ops: ov.recuperacion_hasta ? Math.max(0, ov.recuperacion_hasta - (c.opsGlobal || 0)) : 0,
    cicatrices: ov.cicatrices || [],
    vinculo: vinculoDe(base.id),
  };
}

/** Perfiles para cuartel/briefing a partir de los agentes base, excluyendo bajas. */
export function construirRoster(baseAgentes) {
  return baseAgentes.map(perfilCompleto).filter((p) => p.estado !== 'baja');
}
