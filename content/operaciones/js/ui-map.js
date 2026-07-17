import { setSession } from './main.js';
import { getCuartel } from './roster-store.js';

// ── Mapa: cuadrantes de reconocimiento sobre Aguascalientes ──────────────────
// El jugador ya no "escanea" un evento: elige un CUADRANTE del sector y despacha
// una unidad a reconocerlo (directo a la sala). Solo los cuadrantes con
// cartografía horneada son operables; el resto queda pendiente.

const map = L.map('map', { zoomControl: true, attributionControl: false })
  .setView([21.8810, -102.2972], 14);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19, subdomains: 'abcd'
}).addTo(map);

// Cuadrante base = el sector cartografiado (mismo bbox que grafo-centro).
const CENTRO = { S: 21.8780, W: -102.3002, N: 21.8840, E: -102.2942 };
const dLat = CENTRO.N - CENTRO.S;
const dLng = CENTRO.E - CENTRO.W;

// Malla 3×3 alrededor del centro. Solo el central está operable (tiene grafo).
const cuadrantes = [];
const filas = ['NORTE', 'CENTRO', 'SUR'];
const cols = ['PONIENTE', '', 'ORIENTE'];
for (let r = 1; r >= -1; r--) {
  for (let c = -1; c <= 1; c++) {
    const S = CENTRO.S + r * dLat, N = S + dLat;
    const W = CENTRO.W + c * dLng, E = W + dLng;
    const operable = (r === 0 && c === 0);
    const nombre = operable ? 'CENTRO' : [filas[1 - r], cols[c + 1]].filter(Boolean).join(' ');
    cuadrantes.push({ id: `Q_${r}_${c}`, S, W, N, E, operable, nombre });
  }
}

// Reconocimiento del cuadrante centro (contexto real: Chacal en el corredor del mercado).
const RECON_CENTRO = {
  id: 'RECON-CENTRO',
  criatura_sospechada: 'chacal_de_feria',
  nivel_amenaza_estimado: 'II',
  ubicacion_descrita: 'Cuadrante Centro — Plaza de la Patria / Mercado Juárez',
  lat: 21.8810, lng: -102.2972,
  coordenadas_foco: { lat: 21.8818, lng: -102.2975 },
  hora_reporte: '14:00',
  mision_asociada: 'Reconocimiento de cuadrante',
  sitio_tipo: 'mercado',
  icono_mapa: { etiqueta: 'CENTRO', color: 'ambar', forma: 'triangulo' },
};

cuadrantes.forEach(q => {
  const rect = L.rectangle([[q.S, q.W], [q.N, q.E]], q.operable
    ? { color: '#4dff7a', weight: 2, fillColor: '#4dff7a', fillOpacity: 0.06, className: 'cuad operable' }
    : { color: '#3a3a2a', weight: 1, dashArray: '4 5', fillColor: '#000', fillOpacity: 0.15, className: 'cuad' }
  ).addTo(map);

  const etq = q.operable
    ? `<div class="cuad-lbl op"><b>${q.nombre}</b><span>RECON DISPONIBLE →</span></div>`
    : `<div class="cuad-lbl"><b>${q.nombre}</b><span>cartografía pendiente</span></div>`;
  rect.bindTooltip(etq, { permanent: true, direction: 'center', className: 'cuad-tip', opacity: 1 });

  if (q.operable) {
    rect.on('click', () => despacharCuadrante(RECON_CENTRO));
    rect.on('mouseover', () => rect.setStyle({ fillOpacity: 0.14 }));
    rect.on('mouseout', () => rect.setStyle({ fillOpacity: 0.06 }));
  }
});

function despacharCuadrante(recon) {
  setSession('op_evento', recon);   // la sala/briefing leen op_evento
  window.location.href = './briefing.html';
}

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
