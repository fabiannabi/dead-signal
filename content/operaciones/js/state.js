/**
 * state.js — Estado de misión activa en sessionStorage
 */

const KEY = 'cenvac_mision_activa';

export function iniciarMision(evento, mision, equipo, lider_id) {
  equipo.forEach(a => { a.es_lider = (a.id === lider_id); });
  const estado = {
    evento_id: evento.id,
    mision_id: mision.id,
    equipo,
    nodo_actual: mision.nodo_inicial,
    historial: [],
    flags: {},
    muestra_obtenida: false,
    muestra_tipo: null,
    tiempo_simulado: '07:00',
    log: []
  };
  _guardar(estado);
  return estado;
}

export function obtenerEstado() {
  try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
}

export function guardarEstado(estado) { _guardar(estado); }

export function limpiarEstado() { sessionStorage.removeItem(KEY); }

function _guardar(estado) {
  // sessionStorage no disponible en Node.js — solo activo en browser
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(KEY, JSON.stringify(estado));
  }
}

export function aplicarEfectos(estado, efectos = []) {
  for (const ef of efectos) {
    const targets = _resolverTargets(estado.equipo, ef.alcance);
    switch (ef.tipo) {
      case 'estamina':
        targets.forEach(a => {
          a.estado.estamina = Math.max(0, Math.min(a.estado.estamina_max, a.estado.estamina + ef.delta));
        });
        break;

      case 'cordura':
        targets.forEach(a => {
          a.estado.cordura = Math.max(0, Math.min(a.estado.cordura_max, a.estado.cordura + ef.delta));
        });
        break;

      case 'recurso':
        targets.forEach(a => {
          if (a.recursos && a.recursos[ef.recurso] !== undefined) {
            a.recursos[ef.recurso] = Math.max(0, a.recursos[ef.recurso] + ef.delta);
          }
        });
        break;

      case 'herida': {
        const t = targets[Math.floor(Math.random() * targets.length)];
        if (t) {
          t.estado.heridas.push({ ...ef.valor });
          if (ef.valor.severidad >= 3) t.estado.operativo = false;
          if (ef.valor.severidad >= 4) t.estado.vivo = false;
        }
        break;
      }

      case 'muestra_obtenida':
        estado.muestra_obtenida = true;
        estado.muestra_tipo = ef.valor;
        break;

      case 'flag':
        estado.flags[ef.nombre] = ef.valor;
        break;

      case 'baja_garantizada': {
        const yaBajas = estado.equipo.filter(a => !a.estado.vivo).length;
        if (yaBajas === 0) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          if (t) {
            t.estado.heridas.push({ ...ef.valor });
            t.estado.operativo = false;
            t.estado.vivo = false;
          }
        }
        break;
      }
    }
  }
}

function _resolverTargets(equipo, alcance) {
  if (!alcance || alcance === 'todos') return equipo;
  if (alcance === 'lider')    return equipo.filter(a => a.es_lider);
  if (alcance === 'aleatorio') return [equipo[Math.floor(Math.random() * equipo.length)]];
  return equipo;
}

export function contarBajas(estado) {
  return estado.equipo.filter(a => !a.estado.vivo).length;
}

export function contarHeridasGraves(estado) {
  return estado.equipo.filter(a => a.estado.heridas.some(h => h.severidad >= 3)).length;
}

export function avanzarTiempo(estado, minutos) {
  const [h, m] = estado.tiempo_simulado.split(':').map(Number);
  const total = h * 60 + m + minutos;
  estado.tiempo_simulado = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function agregarLog(estado, entrada) {
  estado.log.push({ tiempo: estado.tiempo_simulado, ...entrada });
}
