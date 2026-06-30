import { cargarDatos, cargarSiteTemplates, setSession } from './main.js';
import {
  getDespacho, getScanEstado, costoProximoEscaneo, escanear,
  senalClass, NIVEL_MAX,
} from './dispatch-store.js';
import { getCuartel } from './roster-store.js';

// ── Indicador de despacho (señal + tiempo) en el header ──────────────────────────

function refrescarDespacho() {
  const d = getDespacho();
  const fill = document.getElementById('op-signal-fill');
  const val = document.getElementById('op-signal');
  const clk = document.getElementById('op-clock');
  const cls = senalClass(d.senal_pct);
  fill.style.width = `${d.senal_pct}%`;
  fill.className = `op-signal-fill ${cls}`;
  val.textContent = `${d.senal_pct}%`;
  val.className = `op-signal ${cls}`;
  clk.textContent = d.tiempo_despacho;
}

// ── Mapa ─────────────────────────────────────────────────────────────────────────

const map = L.map('map', { zoomControl: true, attributionControl: false })
  .setView([21.88, -102.28], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19, subdomains: 'abcd'
}).addTo(map);

// icono_mapa → marcador. Forma por clip-path en CSS, color por clase.
function iconoPara(ev) {
  const ic = ev.icono_mapa || {};
  const forma = ic.forma || 'circulo';
  const color = ic.color || 'rojo';
  return L.divIcon({
    className: '',
    html: `<div class="ev-marker shape-${forma} color-${color}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
}

let eventoActivo = null;
let templates = {};
const markers = [];   // { ev, marker } — para atenuar los no seleccionados

Promise.all([cargarDatos(), cargarSiteTemplates()])
  .then(([{ eventos }, tpls]) => {
    templates = tpls;
    eventos.forEach(ev => {
      const marker = L.marker([ev.lat, ev.lng], { icon: iconoPara(ev) }).addTo(map);
      const etq = (ev.icono_mapa && ev.icono_mapa.etiqueta) || ev.id;

      marker.bindPopup(`
        <div class="popup-etq">${etq}</div>
        <div class="popup-criatura">${ev.criatura_sospechada.replace(/_/g,' ').toUpperCase()}</div>
        <div class="popup-ubic">${ev.ubicacion_descrita.slice(0,80)}…</div>
      `);

      marker.on('click', () => abrirDetalle(ev));
      markers.push({ ev, marker });
    });
    refrescarDespacho();
    renderCuartel();
  })
  .catch(err => console.error('[CENVAC] Error cargando datos:', err));

// Atenúa los marcadores no seleccionados (foco diegético en el evento activo).
function dimMarkers(activoId) {
  markers.forEach(({ ev, marker }) => marker.setOpacity(activoId && ev.id !== activoId ? 0.35 : 1));
}

// ── Registro del cuartel (persistencia local — Fase 5 stub) ──────────────────────
function renderCuartel() {
  const c = getCuartel();
  const panel = document.getElementById('cuartel-panel');
  if (!panel) return;
  if (!c || !c.operaciones) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  document.getElementById('cuartel-stats').innerHTML =
    `<span><b>${c.operaciones}</b> ops</span>` +
    `<span><b>${c.muestras}</b> obj.</span>` +
    `<span class="cu-her"><b>${c.heridos}</b> heridos</span>` +
    `<span class="cu-baja"><b>${c.bajas}</b> bajas</span>`;
  const u = c.historial[0];
  document.getElementById('cuartel-ultimo').textContent = u
    ? `Última: ${u.criatura.replace(/_/g, ' ')} — ${(u.final || '').replace('final_', '').replace(/_/g, ' ')}`
    : '';
}

// ── Panel de detalle + esquemático ───────────────────────────────────────────────

function templateDe(ev) {
  return templates[ev.sitio_tipo] || null;
}

function abrirDetalle(ev) {
  eventoActivo = ev;
  const ov = document.getElementById('map-overlay');
  document.getElementById('ov-eyebrow').textContent = `Evento activo — ${ev.id}`;
  document.getElementById('ov-id').textContent = ev.criatura_sospechada.replace(/_/g, ' ').toUpperCase();
  document.getElementById('ov-zona').textContent = ev.ubicacion_descrita;
  document.getElementById('ov-nivel').textContent = `AMENAZA ${ev.nivel_amenaza_estimado}`;
  document.getElementById('ov-desc').textContent = ev.descripcion_alerta.slice(0, 160) + '…';
  document.getElementById('ov-scan-msg').style.display = 'none';
  ov.style.display = 'block';
  dimMarkers(ev.id);
  renderEsquematico();
}

function renderEsquematico() {
  const ev = eventoActivo;
  const tpl = templateDe(ev);
  const est = getScanEstado(ev.id);

  const pct = Math.round((est.nivel / NIVEL_MAX) * 100);
  document.getElementById('ov-scan-nivel').textContent = `ESCANEO ${pct}%`;
  document.getElementById('ov-sitio-nombre').textContent = tpl ? tpl.nombre : '—';

  // Esquemático en wireframe: cajas de zona (sólidas = escaneadas, punteadas = no).
  const wire = document.getElementById('ov-zonas');
  wire.innerHTML = '';
  if (!tpl) {
    wire.innerHTML = '<div class="zona-box oculta">Sin esquemático</div>';
  } else {
    tpl.zonas.forEach(z => {
      const revelada = est.zonas_reveladas.includes(z.id);
      const box = document.createElement('div');
      box.className = `zona-box ${revelada ? 'revelada' : 'oculta'}${z.es_foco ? ' foco wide' : ''}`;
      box.innerHTML = revelada
        ? `<span class="zb-tag">${z.es_foco ? '◉ FOCO' : 'ZONA'}</span><span class="zb-label">${z.etiqueta}</span>`
        : `<span class="zb-tag">— —</span><span class="zb-name">no escaneado</span>`;
      wire.appendChild(box);
    });
  }

  // Recomendación / yield (cálculo diegético del analista).
  const recom = document.getElementById('ov-recom');
  if (recom) {
    const sigiloSitio = tpl && tpl.modificadores_ambiente && (tpl.modificadores_ambiente.sigilo || 0) < 0;
    recom.innerHTML =
      `<span class="recom-k">Recomendación:</span> aproximación ${sigiloSitio ? 'extremadamente sigilosa' : 'sigilosa'}. ` +
      `<span class="recom-k">Yield estimado:</span> ${est.nivel >= 2 ? 'alto' : 'medio'}. ` +
      `<span class="recom-k">Bajas previstas:</span> irrelevantes al cómputo.`;
  }

  // Pista de comportamiento: solo a nivel máximo.
  const pista = document.getElementById('ov-pista');
  if (tpl && est.nivel >= NIVEL_MAX && tpl.pista_comportamiento) {
    pista.textContent = `// ${tpl.pista_comportamiento}`;
    pista.style.display = 'block';
  } else {
    pista.style.display = 'none';
  }

  // Botón de escaneo: etiqueta con costo, o agotado.
  const btn = document.getElementById('btn-escanear');
  const costo = costoProximoEscaneo(ev.id);
  if (!costo) {
    btn.textContent = 'RECON COMPLETO';
    btn.disabled = true;
  } else {
    const recargo = costo.recargo ? ' ⚠' : '';
    btn.textContent = `ESCANEAR (−${costo.senal}% señal · +${costo.min} min)${recargo}`;
    btn.disabled = getDespacho().senal_pct < costo.senal;
  }
}

// ── Acciones ─────────────────────────────────────────────────────────────────────

document.getElementById('btn-escanear').addEventListener('click', () => {
  if (!eventoActivo) return;
  const res = escanear(eventoActivo, templateDe(eventoActivo));
  const msg = document.getElementById('ov-scan-msg');
  if (!res.ok) {
    msg.textContent = res.motivo === 'sin_senal'
      ? `Señal insuficiente para escaneo nivel ${res.costo.nivel}.`
      : 'Reconocimiento ya completo.';
    msg.className = 'scan-msg err';
    msg.style.display = 'block';
    return;
  }
  const nuevas = res.zonas_nuevas.length;
  msg.textContent = res.scan.parcial
    ? `Escaneo nivel ${res.scan.nivel} — señal degradada, recuperación parcial (${nuevas} zonas).`
    : `Escaneo nivel ${res.scan.nivel} completado — ${nuevas} zonas reveladas.`;
  msg.className = `scan-msg ${res.scan.parcial ? 'warn' : 'ok'}`;
  msg.style.display = 'block';
  refrescarDespacho();
  renderEsquematico();
});

document.getElementById('btn-briefing').addEventListener('click', () => {
  if (!eventoActivo) return;
  setSession('op_evento', eventoActivo);
  setSession('op_scan_estado', getScanEstado(eventoActivo.id));
  setSession('op_despacho', getDespacho());
  window.location.href = './briefing.html';
});
