import { cargarDatos, setSession } from './main.js';

// Clock
const clk = document.getElementById('op-clock');
function tick() {
  const n = new Date();
  clk.textContent = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}
tick();
setInterval(tick, 30000);

// Map
const map = L.map('map', { zoomControl: true, attributionControl: false })
  .setView([21.88, -102.28], 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19, subdomains: 'abcd'
}).addTo(map);

const pulseIcon = L.divIcon({
  className: '',
  html: '<div class="event-marker-pin"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -10]
});

let eventoActivo = null;

cargarDatos().then(({ eventos }) => {
  eventos.forEach(ev => {
    const marker = L.marker([ev.lat, ev.lng], { icon: pulseIcon }).addTo(map);

    marker.bindPopup(`
      <div style="font-size:9px;letter-spacing:.18em;color:#464438;margin-bottom:5px;text-transform:uppercase">${ev.id}</div>
      <div style="font-size:12px;color:#c8a84a;margin-bottom:3px;letter-spacing:.1em">${ev.criatura_sospechada.replace(/_/g,' ').toUpperCase()}</div>
      <div style="font-size:10px;color:#72705e;line-height:1.5">${ev.ubicacion_descrita.slice(0,80)}…</div>
    `);

    marker.on('click', () => {
      eventoActivo = ev;
      const ov = document.getElementById('map-overlay');
      document.getElementById('ov-id').textContent = ev.id;
      document.getElementById('ov-zona').textContent = ev.ubicacion_descrita;
      document.getElementById('ov-desc').textContent = ev.descripcion_alerta.slice(0, 160) + '…';
      document.getElementById('ov-nivel').textContent = `AMENAZA ${ev.nivel_amenaza_estimado}`;
      ov.style.display = 'block';
    });
  });
}).catch(err => {
  console.error('[CENVAC] Error cargando eventos:', err);
});

document.getElementById('btn-briefing').addEventListener('click', () => {
  if (!eventoActivo) return;
  setSession('op_evento', eventoActivo);
  window.location.href = './briefing.html';
});
