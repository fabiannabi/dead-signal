import { cargarRosterBase } from './main.js';
import { perfilCompleto, getCuartel } from './roster-store.js';

const STATS = [['físico', 'F'], ['técnico', 'T'], ['biológico', 'B'], ['sigilo', 'S'], ['mental', 'M'], ['liderazgo', 'L']];
const glyph = (n) => n.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function pill(p) {
  if (p.estado === 'recuperacion') return `<span class="estado-pill recuperacion">RECUPERACIÓN · ${p.recuperacion_ops} ops</span>`;
  if (p.estado === 'herida') return `<span class="estado-pill herida">AFECTADA</span>`;
  return `<span class="estado-pill activa">${p.genero === 'f' ? 'ACTIVA' : 'ACTIVO'}</span>`;
}

function statRow(p) {
  const max = Object.entries(p.stats).reduce((m, e) => (e[1] > m[1] ? e : m), ['', 0]);
  const cordPct = Math.round((p.cordura / p.cordura_max) * 100);
  const cells = STATS.map(([k, lbl]) => {
    const v = p.stats[k] ?? '—';
    const hi = k === max[0] ? ' hi' : '';
    return `<div class="exp-stat${hi}"><span class="exp-stat-lbl">${lbl}</span><span class="exp-stat-val">${v}</span></div>`;
  }).join('');
  const notaMax = max[1] >= 10 ? `${max[0]} ${max[1]} — único máximo del distrito` : `máximo: ${max[0]} ${max[1]}`;
  return `<div class="exp-stats">${cells}<div class="exp-stat-meta">${p.ops} ops · cordura ${cordPct}%<br><span class="exp-stat-nota">${notaMax}</span></div></div>`;
}

function seccion(titulo, html) {
  return `<div class="exp-sec-title">${titulo}</div><div class="exp-sec">${html}</div>`;
}

function render(p, nombres, historial) {
  const rasgos = p.rasgos.length
    ? p.rasgos.map((r) => {
        const mod = Object.entries(r.modificadores_stat || {})[0];
        const suf = mod && typeof mod[1] === 'number' ? ` ${mod[1] > 0 ? '+' : ''}${mod[1]} ${mod[0]}` : '';
        return `<span class="tag">${r.nombre}${suf}</span>`;
      }).join('')
    : '<span class="exp-vacio">Sin rasgos registrados.</span>';

  const cicatrices = p.cicatrices.length
    ? p.cicatrices.map((c) => {
        const ef = Object.entries(c.efecto || {})[0];
        const suf = ef ? ` (${ef[0]} ${ef[1]})` : '';
        return `<div class="exp-cicatriz">${c.tipo} · ${c.parte}${suf} — ${c.op}</div>`;
      }).join('')
    : '<span class="exp-vacio">Sin cicatrices registradas.</span>';

  const vinc = p.vinculo
    ? `<div class="exp-vinculo">↔ ${nombres[p.vinculo.otro] || p.vinculo.otro} — ${p.vinculo.tipo} · intensidad ${p.vinculo.intensidad}</div>`
    : '<span class="exp-vacio">Sin vínculos registrados.</span>';

  const registro = historial.length
    ? historial.slice(0, 4).map((h) => {
        const op = `OP-${(h.evento || '').replace('EVT-', '')}`;
        const res = (h.final || '').replace('final_', '').replace(/_/g, ' ');
        const baja = h.bajas ? ' · <span class="exp-reg-baja">baja en equipo</span>' : '';
        return `<div class="exp-reg-row">${op} · ${h.criatura.replace(/_/g, ' ')} — ${res}${baja}</div>`;
      }).join('')
    : '<span class="exp-vacio">Sin despliegues recientes registrados.</span>';

  const reconstruccion = p.historia
    ? p.historia
    : `Perfil ensamblado a partir de registros de campo CENVAC. Arquetipo: ${p.arquetipo}. Sin biografía recuperada — el expediente se completa con cada operación.`;

  const tics = p.tics ? `<div class="exp-tics">Patrón de radio: ${p.tics}</div>` : '';

  return `
    <div class="exp-head">
      <div class="exp-glyph">${glyph(p.nombre)}</div>
      <div class="exp-head-main">
        <div class="exp-nombre">${p.nombre}</div>
        <div class="exp-rol">${p.rol} · ${p.arquetipo}${p.es_nombrado ? ' · identificado' : ' · procedural'}</div>
      </div>
      <div class="exp-head-estado">${pill(p)}</div>
    </div>
    ${statRow(p)}
    ${seccion('Reconstrucción', `<p class="exp-historia">${reconstruccion}</p>`)}
    ${seccion('Rasgos', `<div class="exp-tags">${rasgos}</div>`)}
    ${seccion('Cicatrices', cicatrices)}
    ${seccion('Vínculos', vinc)}
    ${seccion('Registro', registro)}
    ${tics}
  `;
}

async function init() {
  const id = new URLSearchParams(location.search).get('id');
  const { base } = await cargarRosterBase();
  const nombres = Object.fromEntries(base.map((a) => [a.id, a.nombre_completo.split(' ')[0]]));
  const bAg = base.find((a) => a.id === id);
  const wrap = document.getElementById('exp-wrap');
  if (!bAg) {
    wrap.innerHTML = `<div style="color:var(--red-hi);padding:20px">Agente no encontrado. <a href="./cuartel.html" style="color:var(--accent)">← Cuartel</a></div>`;
    return;
  }
  const p = perfilCompleto(bAg);
  document.getElementById('exp-clase').textContent = `${p.rango} · ${p.es_nombrado ? 'identificado' : 'clase 2'}`;
  wrap.innerHTML = render(p, nombres, getCuartel().historial || []);
}

init().catch((err) => {
  console.error('[CENVAC expediente]', err);
  document.getElementById('exp-wrap').innerHTML = `<div style="color:var(--red-hi);padding:20px">Error: ${err.message}</div>`;
});
