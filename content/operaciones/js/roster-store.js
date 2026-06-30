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

const _vacio = () => ({ operaciones: 0, bajas: 0, heridos: 0, muestras: 0, agentes: {}, historial: [] });
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
  let bajasOp = 0, heridosOp = 0;

  for (const a of estado.equipo) {
    const perfil = c.agentes[a.id] || {
      id: a.id, nombre: a.nombre_completo, rango: a.rango_abreviatura, rol: a.nombre_rol,
      ops: 0, heridas: 0, estado: 'activo',
    };
    perfil.ops += 1;
    if (a.estado && a.estado.vivo === false) {
      if (perfil.estado !== 'baja') { c.bajas += 1; }
      perfil.estado = 'baja';
      bajasOp += 1;
    } else if (a.estado && a.estado.heridas && a.estado.heridas.length) {
      perfil.heridas += a.estado.heridas.length;
      if (perfil.estado !== 'baja') perfil.estado = 'herido';
      heridosOp += 1;
    }
    c.agentes[a.id] = perfil;
  }

  if (estado.muestra_obtenida) c.muestras += 1;
  c.heridos += heridosOp;

  const finalId = estado.historial[estado.historial.length - 1]?.id || null;
  c.historial.unshift({
    evento: evento.id, mision: mision.id, criatura: evento.criatura_sospechada,
    objetivo: mision.objetivo || null, final: finalId,
    muestra: !!estado.muestra_obtenida, bajas: bajasOp, heridos: heridosOp,
    tiempo: estado.tiempo_simulado,
  });
  c.historial = c.historial.slice(0, 20);

  _write(c);
  return c;
}
