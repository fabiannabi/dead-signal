import { getSession, cargarMisionData } from './main.js';
import { cargarMision } from './mission-engine.js';
import { perfilCompleto } from './roster-store.js';
import { generarReporte, descargarReporte } from './report-generator.js';

// Etiqueta de yield por tipo de objetivo (qué dimensión informativa produce la op).
const YIELD = {
  extraccion_4a:  { primaria: 'Muestra',        contexto: ['Telemetría', 'Documentación'] },
  reconocimiento: { primaria: 'Documentación',  contexto: ['Telemetría', 'Muestra'] },
  observacion_15: { primaria: 'Telemetría',     contexto: ['Muestra', 'Documentación'] },
  contencion_8a:  { primaria: 'Neutralización', contexto: ['Cobertura', 'Documentación'] },
};

async function init() {
  const estado = getSession('op_estado_final');
  const evento = getSession('op_evento');
  const misionId = getSession('op_mision_id');

  if (!estado || !evento || !misionId) {
    document.getElementById('cierre-doc').innerHTML =
      `<div style="color:var(--red-hi)">Sin datos de operación. <a href="./index.html" style="color:var(--accent)">← Volver al mapa</a></div>`;
    return;
  }

  const stored = getSession('op_mision_obj');
  const misionRaw = (stored && stored.id === misionId) ? stored : await cargarMisionData(misionId);
  const mision = cargarMision(misionRaw);
  const idOp = `OP-${evento.id.replace('EVT-', '')}`;

  document.getElementById('op-id-header').textContent = `${idOp} · ${nombreCorto(evento)}`;
  document.getElementById('cierre-doc').innerHTML = renderCierre(estado, mision, evento);
  document.getElementById('cierre-foot').textContent =
    'La operación no se incorpora al expediente público. Existe solo aquí, hasta el próximo despliegue.';
  document.getElementById('reporte-actions').style.display = 'flex';

  const md = generarReporte(estado, mision, evento);
  document.getElementById('btn-export').addEventListener('click', () => descargarReporte(md, evento.id));
  document.getElementById('btn-mapa').addEventListener('click', () => { window.location.href = './index.html'; });
}

function renderCierre(estado, mision, evento) {
  const muestra = !!estado.muestra_obtenida;
  const parcial = muestra && String(estado.muestra_tipo || '').includes('parcial');
  const bajas = estado.equipo.filter(a => !a.estado.vivo);
  const heridos = estado.equipo.filter(a => a.estado.vivo && a.estado.heridas.length);
  const graves = heridos.filter(a => a.estado.heridas.some(h => h.severidad >= 3));

  // Veredicto por rendimiento informativo (no por vidas).
  const verd = !muestra ? { t: 'BAJO', cls: 'bajo', sub: 'Yield por debajo del umbral de cuota. Sin registro retenido.' }
    : parcial || graves.length || bajas.length ? { t: 'MEDIO', cls: 'medio', sub: 'Yield aceptable con incidencias. Registro retenido en consola.' }
    : { t: 'ALTO', cls: 'alto', sub: 'Yield superior al umbral de cuota. Registro retenido en consola.' };

  const y = YIELD[mision.objetivo] || YIELD.extraccion_4a;
  const valPrim = !muestra ? 'no obtenido' : parcial ? 'parcial' : 'confirmado';
  const valCls = !muestra ? 'bajo' : parcial ? 'medio' : 'alto';
  const detalle = mision.objetivo === 'extraccion_4a' && muestra ? ' · clase B' : '';

  const tiles = [
    tile(y.primaria, `${valPrim}${detalle}`, valCls),
    tile(y.contexto[0], 'no aplica', 'na'),
    tile(y.contexto[1], 'no aplica', 'na'),
  ].join('');

  return `
    <div class="cierre-eyebrow">Rendimiento informativo</div>
    <div class="cierre-veredicto ${verd.cls}">${verd.t}</div>
    <div class="cierre-sub">${verd.sub}</div>

    <div class="cierre-tiles">${tiles}</div>

    <div class="cierre-computo-label">Expediente de la unidad · liberado al cierre</div>
    <div class="cierre-expedientes">${renderExpedientes(estado, evento)}</div>

    <div class="cierre-nota">Las bajas no afectan la valoración de rendimiento de esta operación. El personal es reemplazable; el dato no.</div>
  `;
}

// Expediente liberado al cierre: quién era la unidad que despachaste, sus rasgos
// y qué le pasó. Registro frío de personal — la humanidad vive en los mementos,
// no en la consola. Aquí el jugador conoce al equipo por lo que le ocurrió.
function renderExpedientes(estado, evento) {
  return estado.equipo.map(a => {
    const vivo = a.estado.vivo;
    const heridas = a.estado.heridas || [];
    const fate = !vivo ? { t: 'BAJA', cls: 'baja' }
      : heridas.length ? { t: 'HERIDA', cls: 'herida' }
      : { t: 'ACTIVA', cls: 'activa' };
    const lider = a.es_lider ? '<span class="exp-lead">★ LÍDER</span>' : '';
    const rasgos = (a.rasgos || []).map(r => {
      const pol = (r.polaridad || '+') === '+' ? 'pos' : 'neg';
      return `<span class="exp-trait ${pol}">${r.nombre}</span>`;
    }).join('');
    const cord = a.estado.cordura != null ? ` · cordura ${Math.round(a.estado.cordura)}` : '';
    const detalle = !vivo ? `<div class="exp-detalle baja">Causa — ${causaBaja(a)}</div>`
      : heridas.length ? `<div class="exp-detalle herida">${causaHerida(a)}</div>`
      : '';
    const perdura = renderPerdura(a, evento);
    return `
      <div class="exp-row ${fate.cls}">
        <div class="exp-head">
          <span class="exp-rank">${a.rango_abreviatura}</span>
          <span class="exp-name">${a.nombre_completo}</span>
          ${lider}
          <span class="exp-fate ${fate.cls}">${fate.t}</span>
        </div>
        <div class="exp-rol">${a.nombre_rol || 'agente de campo'}${cord}</div>
        ${rasgos ? `<div class="exp-traits">${rasgos}</div>` : ''}
        ${detalle}
        ${perdura}
      </div>`;
  }).join('');
}

// Lo que perdura: la consecuencia que esta operación deja en el agente y lo
// seguirá al próximo despliegue. Se lee del overlay YA persistido por
// consolidarOperacion (fuente de verdad), no se recomputa aquí.
function renderPerdura(a, evento) {
  const p = perfilCompleto(a);
  const idOp = `OP-${evento.id.replace('EVT-', '')}`;
  const items = [];

  if (!a.estado.vivo) {
    items.push({ cls: 'baja', txt: 'Baja definitiva. Expediente cerrado y trasladado al memorial. Sin reemplazo asignado.' });
  } else {
    // Cicatrices registradas en ESTA operación → penalización de por vida.
    for (const ci of (p.cicatrices || []).filter(c => c.op === idOp)) {
      const mods = Object.entries(ci.efecto || {})
        .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');
      items.push({ cls: 'baja', txt: `Lesión consolidada — ${ci.tipo}${ci.parte ? ` (${ci.parte})` : ''}${mods ? ` · déficit ${mods} permanente en expediente` : ''}.` });
    }
    if (p.recuperacion_ops > 0) {
      items.push({ cls: 'herida', txt: `Baja médica — ${p.recuperacion_ops} operación${p.recuperacion_ops > 1 ? 'es' : ''} fuera de rotación.` });
    }
    if (p.cordura < p.cordura_max) {
      const cls = p.estado === 'herida' ? 'herida' : 'nota';
      items.push({ cls, txt: `Cordura ${Math.round(p.cordura)}/${p.cordura_max} — merma no remitida al cierre; persiste en expediente.` });
    }
    if (!items.length) {
      items.push({ cls: 'nota', txt: 'Sin secuelas registradas. Apto para rotación inmediata.' });
    }
  }

  const filas = items.map(i => `<div class="perdura-item ${i.cls}">${i.txt}</div>`).join('');
  return `<div class="exp-perdura"><span class="perdura-lbl">Lo que perdura</span>${filas}</div>`;
}

function tile(label, value, cls) {
  return `<div class="cierre-tile"><div class="ct-label">${label}</div><div class="ct-value ${cls}">${value}</div></div>`;
}

function causaBaja(a) {
  const h = a.estado.heridas[a.estado.heridas.length - 1];
  return h ? `${h.tipo.replace(/_/g, ' ')} · ${h.parte_cuerpo}` : 'pérdida en operación';
}
function causaHerida(a) {
  const h = a.estado.heridas[a.estado.heridas.length - 1];
  if (!h) return 'herida en operación';
  const mods = Object.entries(h.efecto_stat || {}).map(([k, v]) => `${k} ${v}`).join(', ');
  return `${h.tipo.replace(/_/g, ' ')}${mods ? ` (${mods})` : ''}`;
}
function nombreCorto(evento) {
  return (evento.icono_mapa && evento.icono_mapa.etiqueta) || evento.criatura_sospechada.replace(/_/g, ' ').toUpperCase();
}

init().catch(err => {
  console.error('[CENVAC cierre]', err);
  document.getElementById('cierre-doc').innerHTML = `<div style="color:var(--red-hi)">Error: ${err.message}</div>`;
});
