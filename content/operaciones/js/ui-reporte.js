import { getSession, cargarMisionData } from './main.js';
import { cargarMision } from './mission-engine.js';
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

  const computo = (bajas.length || heridos.length)
    ? [
        ...bajas.map(a => `<div class="cc-row"><span class="cc-tag baja">BAJA</span> ${a.rango_abreviatura} ${a.nombre_completo} — ${causaBaja(a)}</div>`),
        ...heridos.map(a => `<div class="cc-row"><span class="cc-tag herida">HERIDA</span> ${a.rango_abreviatura} ${a.nombre_completo} — ${causaHerida(a)}</div>`),
      ].join('')
    : `<div class="cc-row" style="color:var(--text3)">Sin bajas ni heridas registradas.</div>`;

  return `
    <div class="cierre-eyebrow">Rendimiento informativo</div>
    <div class="cierre-veredicto ${verd.cls}">${verd.t}</div>
    <div class="cierre-sub">${verd.sub}</div>

    <div class="cierre-tiles">${tiles}</div>

    <div class="cierre-computo-label">Cómputo de personal</div>
    <div class="cierre-computo">${computo}</div>

    <div class="cierre-nota">Las bajas no afectan la valoración de rendimiento de esta operación. El personal es reemplazable; el dato no.</div>
  `;
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
