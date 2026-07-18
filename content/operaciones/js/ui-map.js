import { setSession, DATA_BASE, fetchJSON } from './main.js';
import { getCuartel } from './roster-store.js';

// ── Mapa: malla de reconocimiento sobre Aguascalientes ───────────────────────
// Dos niveles (§1.3): la vista general muestra los DISTRITOS; al entrar en uno se
// abre en sus SECTORES, que son la unidad jugable — cada uno con su grafo de
// calles. La malla se lee de `recon/sectores.json`, horneado junto con los grafos,
// para que agregar cartografía no obligue a tocar este archivo.

// El zoom se manda a la derecha: arriba a la izquierda van las migas, y la
// navegación entre distrito y sector pesa más que el ±. Con los dos en la misma
// esquina, el control de Leaflet queda encima y tapa la salida.
const map = L.map('map', { zoomControl: false, attributionControl: false })
  .setView([21.8810, -102.2972], 13);
L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19, subdomains: 'abcd'
}).addTo(map);

const malla = await fetchJSON(`${DATA_BASE}/recon/sectores.json`);
const capa = L.layerGroup().addTo(map);
let nivel = 'distritos', distritoAbierto = null;

const bboxDistrito = (d) => [
  [Math.min(...d.sectores.map(s => s.S)), Math.min(...d.sectores.map(s => s.W))],
  [Math.max(...d.sectores.map(s => s.N)), Math.max(...d.sectores.map(s => s.E))],
];

const ESTILO = {
  distrito: { color: '#4dff7a', weight: 2, fillColor: '#4dff7a', fillOpacity: 0.05, className: 'cuad operable' },
  sector:   { color: '#8affc0', weight: 1, fillColor: '#8affc0', fillOpacity: 0.07, className: 'cuad operable' },
};

function verDistritos() {
  nivel = 'distritos'; distritoAbierto = null;
  capa.clearLayers();
  actualizarMigas();
  for (const d of malla.distritos) {
    const b = bboxDistrito(d);
    const rect = L.rectangle(b, ESTILO.distrito).addTo(capa);
    rect.bindTooltip(
      `<div class="cuad-lbl op"><b>${d.nombre}</b><span>${d.sectores.length} sectores →</span></div>`,
      { permanent: true, direction: 'center', className: 'cuad-tip', opacity: 1 });
    rect.on('click', () => verSectores(d));
    rect.on('mouseover', () => rect.setStyle({ fillOpacity: 0.13 }));
    rect.on('mouseout', () => rect.setStyle({ fillOpacity: 0.05 }));
  }
  map.fitBounds([
    [Math.min(...malla.distritos.flatMap(d => d.sectores.map(s => s.S))), Math.min(...malla.distritos.flatMap(d => d.sectores.map(s => s.W)))],
    [Math.max(...malla.distritos.flatMap(d => d.sectores.map(s => s.N))), Math.max(...malla.distritos.flatMap(d => d.sectores.map(s => s.E)))],
  ], { padding: [20, 20] });
}

function verSectores(d) {
  nivel = 'sectores'; distritoAbierto = d;
  capa.clearLayers();
  actualizarMigas();
  for (const s of d.sectores) {
    const rect = L.rectangle([[s.S, s.W], [s.N, s.E]], ESTILO.sector).addTo(capa);
    // La hora va en la etiqueta porque es lo que decide el despacho: el mismo
    // sector a mediodía y de madrugada no es el mismo sector.
    rect.bindTooltip(
      `<div class="cuad-lbl op"><b>${s.nombre}</b><span>${s.hora} · RECON →</span></div>`,
      { permanent: true, direction: 'center', className: 'cuad-tip', opacity: 1 });
    rect.on('click', () => despacharSector(s, d));
    rect.on('mouseover', () => rect.setStyle({ fillOpacity: 0.16 }));
    rect.on('mouseout', () => rect.setStyle({ fillOpacity: 0.07 }));
  }
  map.fitBounds(bboxDistrito(d), { padding: [20, 20] });
}

function actualizarMigas() {
  const el = document.getElementById('map-migas');
  if (!el) return;
  el.innerHTML = nivel === 'distritos'
    ? `<span class="miga on">Aguascalientes — ${malla.distritos.length} distritos</span>`
    : `<a href="#" class="miga" id="miga-volver">← Aguascalientes</a><span class="miga on">${distritoAbierto.nombre} — ${distritoAbierto.sectores.length} sectores</span>`;
  const v = document.getElementById('miga-volver');
  if (v) v.addEventListener('click', (e) => { e.preventDefault(); verDistritos(); });
}

function despacharSector(s, d) {
  // El reporte que abre la operación. `grafo` es lo que la sala usa para cargar
  // la cartografía del sector; el foco se ancla al centro de la celda.
  setSession('op_evento', {
    id: `RECON-${s.slug.toUpperCase()}`,
    grafo: s.slug,
    criatura_sospechada: s.criatura,
    nivel_amenaza_estimado: s.amenaza,
    ubicacion_descrita: `Distrito ${d.nombre} — sector ${s.nombre}`,
    lat: (s.S + s.N) / 2, lng: (s.W + s.E) / 2,
    coordenadas_foco: s.slug === 'centro'
      ? { lat: 21.8818, lng: -102.2975 }
      : { lat: (s.S + s.N) / 2, lng: (s.W + s.E) / 2 },
    hora_reporte: s.hora,
    mision_asociada: 'Reconocimiento de sector',
    sitio_tipo: s.slug === 'centro' ? 'mercado' : 'urbano',
    icono_mapa: { etiqueta: s.nombre, color: 'ambar', forma: 'triangulo' },
  });
  window.location.href = './briefing.html';
}

verDistritos();

// ── Registro del cuartel ─────────────────────────────────────────────────────
function renderCuartel() {
  const c = getCuartel();
  const panel = document.getElementById('cuartel-panel');
  if (!panel) return;
  if (!c || !c.operaciones) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  document.getElementById('cuartel-stats').innerHTML =
    `<span><b>${c.operaciones}</b> ops</span>` +
    `<span><b>${c.muestras}</b> intel</span>` +
    `<span class="cu-her"><b>${c.heridos}</b> heridos</span>` +
    `<span class="cu-baja"><b>${c.bajas}</b> bajas</span>`;
  const u = c.historial[0];
  document.getElementById('cuartel-ultimo').textContent = u
    ? `Última: ${(u.criatura || '').replace(/_/g, ' ')} — ${(u.final || '').replace(/_/g, ' ')}`
    : '';
}
renderCuartel();
