import { getSession, cargarMisionData } from './main.js';
import { cargarMision } from './mission-engine.js';
import { generarReporte, descargarReporte } from './report-generator.js';

async function init() {
  const estado = getSession('op_estado_final');
  const evento  = getSession('op_evento');
  const misionId = getSession('op_mision_id');

  if (!estado || !evento || !misionId) {
    document.getElementById('reporte-doc').innerHTML =
      `<div style="color:var(--red-hi)">Sin datos de operación. <a href="./index.html" style="color:var(--accent)">← Volver al mapa</a></div>`;
    return;
  }

  // Preferir la misión jugada (puede ser generada y no existir como archivo).
  const stored   = getSession('op_mision_obj');
  const misionRaw = (stored && stored.id === misionId) ? stored : await cargarMisionData(misionId);
  const mision    = cargarMision(misionRaw);
  const md        = generarReporte(estado, mision, evento);
  const idOp      = `OP-${evento.id.replace('EVT-', '')}`;

  document.getElementById('op-id-header').textContent = idOp;
  document.getElementById('reporte-doc').innerHTML = renderMd(md);
  document.getElementById('reporte-actions').style.display = 'flex';

  document.getElementById('btn-export').addEventListener('click', () => {
    descargarReporte(md, evento.id);
  });

  document.getElementById('btn-mapa').addEventListener('click', () => {
    window.location.href = './index.html';
  });
}

function renderMd(md) {
  // Convert the markdown-like text from generarReporte() to styled HTML
  const lines = md.split('\n');
  let html = '';
  let inMeta = true;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      inMeta = false;
      html += `<div class="r-h1">${esc(line.slice(2))}</div>`;
    } else if (line.startsWith('## ')) {
      inMeta = false;
      html += `<div class="r-h2">${esc(line.slice(3))}</div>`;
    } else if (line.startsWith('**') && line.endsWith('**')) {
      html += `<p class="r-bold">${esc(line.replace(/\*\*/g,''))}</p>`;
    } else if (/^\*\*[^*]+\*\*/.test(line)) {
      // **label:** value
      const rendered = line.replace(/\*\*([^*]+)\*\*/g, '<span class="r-bold">$1</span>');
      html += `<p>${rendered}</p>`;
    } else if (line.startsWith('---')) {
      html += '<hr class="r-hr">';
    } else if (line.startsWith('*') && line.endsWith('*')) {
      html += `<p class="r-em">${esc(line.replace(/^\*|\*$/g,''))}</p>`;
    } else if (line.startsWith('- ')) {
      html += `<li>${esc(line.slice(2))}</li>`;
    } else if (inMeta && line.trim()) {
      html += `<div class="r-meta">${esc(line)}</div>`;
    } else if (line.trim()) {
      html += `<p>${esc(line)}</p>`;
    }
  }

  return html;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

init().catch(err => {
  console.error('[CENVAC reporte]', err);
  document.getElementById('reporte-doc').innerHTML =
    `<div style="color:var(--red-hi)">Error: ${err.message}</div>`;
});
