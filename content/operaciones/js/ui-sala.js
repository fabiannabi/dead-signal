/**
 * ui-sala.js — Sala de Vigilancia (Fase 3). Reemplaza el despacho por árbol de
 * botones: ves a la unidad ASIGNADA reconocer el sector en vivo. Misión de
 * reconocimiento — recuperar intel para CENVAC con el riesgo de que haya algo ahí.
 *
 * Reúsa el motor probado en el spike: pathfinding.js (A*) + peligro.js (ecología).
 * Datos reales: op_evento (sector/criatura/hora) + op_equipo/op_lider_id (unidad).
 * Al extraer, escribe op_estado_final y consolida en el cuartel → reporte.html,
 * así las bajas/heridas del recon aparecen en "lo que perdura".
 */
import { DATA_BASE, getSession, setSession, fetchJSON } from './main.js';
import { construirGrafo, aStar, nodoMasCercano, haversine } from './pathfinding.js';
import { peligroDeArista, criaturasActivas } from './peligro.js';
import { consolidarOperacion } from './roster-store.js';

const $ = (id) => document.getElementById(id);

// ── Datos de sesión ──────────────────────────────────────────────────────────
const evento = getSession('op_evento');
const equipo = getSession('op_equipo');
const liderId = getSession('op_lider_id');
if (!evento || !equipo || !equipo.length) { window.location.href = './index.html'; throw new Error('sala: sin sesión'); }

const [rawGrafo, ecologia] = await Promise.all([
  fetchJSON(`${DATA_BASE}/recon/grafo-centro.json`),
  fetchJSON(`${DATA_BASE}/recon/ecologia-peligro.json`),
]);

// ¿El foco del evento cae en el sector cartografiado? Si no, cae al flujo viejo.
const foco = evento.coordenadas_foco || { lat: evento.lat, lng: evento.lng };
const [S, W, N, E] = rawGrafo._meta.bbox_SWNE;
if (foco.lat < S || foco.lat > N || foco.lng < W || foco.lng > E) {
  window.location.href = './index.html';   // cuadrante sin cartografía horneada
  throw new Error('sala: sector sin cartografía');
}

const grafo = construirGrafo(rawGrafo);
const CRIATURAS = [evento.criatura_sospechada];
const horaActual = parseInt((evento.hora_reporte || '13:00').split(':')[0], 10) || 13;
const horaStr = evento.hora_reporte || '13:00';

$('sala-sector').textContent = evento.ubicacion_descrita ? evento.ubicacion_descrita.slice(0, 42) + '…' : evento.id;
$('sala-hora').textContent = horaStr;
$('sala-obj').textContent = 'Reconocer el sector · recuperar intel';

// ── Mapa ─────────────────────────────────────────────────────────────────────
const map = L.map('sala-map', { zoomControl: true, attributionControl: false }).setView([foco.lat, foco.lng], 16);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

const edgeLayer = new Map();
for (const e of rawGrafo.aristas) {
  const a = grafo.nodos.get(e.a), b = grafo.nodos.get(e.b);
  edgeLayer.set(e, L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: '#2aa855', weight: 3, opacity: 0.7, interactive: false }).addTo(map));
}
function estiloArista(e) {
  if (e._peligro) return { color: '#ff2020', weight: 6, opacity: 1 };
  const p = peligroDeArista(e, ecologia, horaActual, CRIATURAS);
  if (p <= 0) return { color: '#2fbf5f', weight: 3, opacity: 0.6 };
  if (p < 0.4) return { color: '#ffe23a', weight: 4, opacity: 0.95 };
  if (p < 0.75) return { color: '#ff9128', weight: 5, opacity: 0.97 };
  return { color: '#ff4436', weight: 5, opacity: 1 };
}
function restyleEdge(e) { const pl = edgeLayer.get(e); pl.setStyle(estiloArista(e)); if (e._peligro) pl.bringToFront(); }

const nodeMarkers = [];
for (const [id, p] of grafo.nodos) {
  const cm = L.circleMarker([p.lat, p.lng], { radius: 5, color: '#4dff7a', weight: 1, fillColor: '#04100a', fillOpacity: 0.9, bubblingMouseEvents: false })
    .addTo(map).on('click', (ev) => { L.DomEvent.stop(ev); despachar(id); });
  nodeMarkers.push(cm);
}
function repintar() {
  for (const e of rawGrafo.aristas) restyleEdge(e);
  nodeMarkers.forEach(m => m.bringToFront());
  poisMarkers.forEach(m => m.bringToFront());
  const act = criaturasActivas(ecologia, horaActual, CRIATURAS).map(c => ecologia.reglas[c]?.nombre || c);
  $('sala-amenaza').textContent = act.length ? act.join(' · ') : 'sin actividad a esta hora';
}
function calleDe(id) {
  const inc = grafo.adj.get(id);
  const con = inc.find(x => x.arista.calle && !/^(service|footway|residential)$/.test(x.arista.calle));
  return (con || inc[0])?.arista.calle || 'la posición';
}
const nodeToLatLng = (id) => { const p = grafo.nodos.get(id); return [p.lat, p.lng]; };

// ── Puntos de reconocimiento (intel) ─────────────────────────────────────────
const nodeIds = [...grafo.nodos.keys()];
const entrada = nodeIds.reduce((m, id) => grafo.nodos.get(id).lng < grafo.nodos.get(m).lng ? id : m, nodeIds[0]);
const focoNode = nodoMasCercano(grafo, foco.lat, foco.lng);
const pois = [];      // { node, reconocido }
const poisMarkers = [];
(function sembrarPois(n) {
  const usados = new Set([entrada]);
  // El foco del evento SIEMPRE es un punto de recon.
  pois.push({ node: focoNode, reconocido: false, foco: true }); usados.add(focoNode);
  while (pois.length < n) {
    const id = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    if (usados.has(id)) continue; usados.add(id);
    pois.push({ node: id, reconocido: false });
  }
  for (const p of pois) {
    const ll = nodeToLatLng(p.node);
    p.marker = L.marker(ll, { icon: L.divIcon({ className: '', html: `<div class="sala-poi${p.foco ? ' foco' : ''}"></div>`, iconSize: [0, 0] }), interactive: false }).addTo(map);
    poisMarkers.push(p.marker);
  }
})(5);

// ── Contactos ocultos (criatura del evento) ──────────────────────────────────
const REVEAL_R = 90, ENCUENTRO_R = 42, UMBRAL_RIESGO = 55, UMBRAL_DECISION = 260;
const contactos = [];
(function sembrar(n) {
  const usados = new Set([entrada]);
  while (contactos.length < n) {
    const id = nodeIds[Math.floor(Math.random() * nodeIds.length)];
    if (usados.has(id)) continue; usados.add(id);
    const p = grafo.nodos.get(id);
    contactos.push({ id, lat: p.lat, lng: p.lng, revelado: false, encontrado: false });
  }
})(4);
function revelar(c) {
  if (c.revelado) return;
  c.revelado = true;
  c.marker = L.marker([c.lat, c.lng], { icon: L.divIcon({ className: '', html: '<div class="sala-contacto"></div>', iconSize: [0, 0] }), interactive: false }).addTo(map);
  c.aristasMarcadas = [];
  for (const e of rawGrafo.aristas) {
    const a = grafo.nodos.get(e.a), b = grafo.nodos.get(e.b);
    if (!e._peligro && (haversine(c, a) < 55 || haversine(c, b) < 55)) { e._peligro = true; c.aristasMarcadas.push(e); restyleEdge(e); }
  }
}
function despejarContacto(c) {
  c.despejado = true; c.encontrado = true;
  if (c.marker) { map.removeLayer(c.marker); c.marker = null; }
  for (const e of (c.aristasMarcadas || [])) { e._peligro = false; restyleEdge(e); }
}
function revelarCercanos(lat, lng) {
  let nuevo = null;
  for (const c of contactos) if (!c.revelado && haversine({ lat, lng }, c) < REVEAL_R) { revelar(c); nuevo = c; }
  return nuevo;
}
function revelarMasCercano() {
  const bp = blip.getLatLng(); let best = null, md = Infinity;
  for (const c of contactos) if (!c.revelado) { const d = haversine({ lat: bp.lat, lng: bp.lng }, c); if (d < md) { md = d; best = c; } }
  if (best) revelar(best);
}

// ── Estado de misión ─────────────────────────────────────────────────────────
let intel = 0, danosUnidad = 0, distAcumulada = 0;
let unidadNode = entrada, rutaLine = null, dstMark = null, marcha = null, moving = false;
equipo.forEach(a => { a.es_lider = (a.id === liderId); a.estado = a.estado || {}; a.estado.vivo = a.estado.vivo !== false; a.estado.heridas = a.estado.heridas || []; });
const blip = L.marker(nodeToLatLng(entrada), { icon: L.divIcon({ className: '', html: '<div class="sala-blip"></div>', iconSize: [0, 0] }), interactive: false }).addTo(map);
$('sala-pos').textContent = calleDe(entrada);
actualizarHUD();

function actualizarHUD() {
  $('sala-intel').textContent = intel;
  $('sala-recon').textContent = `${pois.filter(p => p.reconocido).length}/${pois.length}`;
  const vivos = equipo.filter(a => a.estado.vivo);
  const heridos = vivos.filter(a => a.estado.heridas.length).length;
  const bajas = equipo.length - vivos.length;
  const cord = Math.round(vivos.reduce((s, a) => s + (a.estado.cordura ?? 100), 0) / (vivos.length || 1));
  $('sala-unidad').textContent = `${vivos.length} activo${vivos.length !== 1 ? 's' : ''}${heridos ? ` · ${heridos} her.` : ''}${bajas ? ` · ${bajas} baja` : ''} · cord ${cord}%`;
}

// ── Despacho / marcha ────────────────────────────────────────────────────────
const VEL = 26;   // m/s — tiempo comprimido para prod (el recon cubre varios puntos)
const peso = (e) => e.m * (1 + peligroDeArista(e, ecologia, horaActual, CRIATURAS) + (e._peligro ? 3 : 0));

function despachar(destino) {
  if (moving || destino === unidadNode) return;
  if (rutaLine) map.removeLayer(rutaLine);
  if (dstMark) map.removeLayer(dstMark);
  const r = aStar(grafo, unidadNode, destino, { peso });
  if (!r) return;
  const coords = r.path.map(nodeToLatLng);
  rutaLine = L.polyline(coords, { color: '#8affc0', weight: 4, opacity: 0.95, interactive: false }).addTo(map);
  dstMark = L.circleMarker(nodeToLatLng(destino), { radius: 6, color: '#8affc0', weight: 2, fillColor: '#8affc0', fillOpacity: 0.5, interactive: false }).addTo(map);
  $('sala-estado').textContent = 'en marcha';
  guionar(pick(TRANSITO, 2));
  iniciarMarcha(r, destino);
}
function iniciarMarcha(r, destino) {
  const coords = r.path.map(nodeToLatLng);
  const seg = []; let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversine({ lat: coords[i-1][0], lng: coords[i-1][1] }, { lat: coords[i][0], lng: coords[i][1] });
    const link = grafo.adj.get(r.path[i-1]).find(x => x.to === r.path[i]);
    seg.push({ a: coords[i-1], b: coords[i], d, acc: total, arista: link ? link.arista : null });
    total += d;
  }
  marcha = { seg, total, destino, base: 0, t0: 0, raf: null, riesgo: 0, lastRec: 0 };
  moving = true; reanudar();
}
function reanudar() { marcha.lastRec = marcha.base; marcha.t0 = performance.now(); marcha.raf = requestAnimationFrame(tick); }
function pausar(rec) { marcha.base = rec; if (marcha.raf) cancelAnimationFrame(marcha.raf); marcha.raf = null; }
function detener() {
  if (marcha && marcha.raf) cancelAnimationFrame(marcha.raf);
  moving = false;
  const bp = blip.getLatLng();
  unidadNode = nodoMasCercano(grafo, bp.lat, bp.lng);
  blip.setLatLng(nodeToLatLng(unidadNode));
  if (rutaLine) { map.removeLayer(rutaLine); rutaLine = null; }
  if (dstMark) { map.removeLayer(dstMark); dstMark = null; }
  $('sala-pos').textContent = calleDe(unidadNode);
}
function tick(now) {
  const m = marcha;
  const rec = Math.min(m.total, m.base + (now - m.t0) / 1000 * VEL);
  const s = m.seg.find(x => rec <= x.acc + x.d) || m.seg[m.seg.length - 1];
  const f = s.d ? (rec - s.acc) / s.d : 1;
  const lat = s.a[0] + (s.b[0]-s.a[0])*f, lng = s.a[1] + (s.b[1]-s.a[1])*f;
  blip.setLatLng([lat, lng]);

  const nuevo = revelarCercanos(lat, lng);
  if (nuevo) { detener(); $('sala-estado').textContent = '¡contacto! · en espera'; guionar(CONTACTO); return; }
  const enc = contactos.find(c => !c.encontrado && haversine({ lat, lng }, c) < ENCUENTRO_R);
  if (enc) { enc.encontrado = true; pausar(rec); asalto(enc); return; }
  const dEdge = s.arista ? peligroDeArista(s.arista, ecologia, horaActual, CRIATURAS) : 0;
  const delta = rec - m.lastRec;
  m.riesgo += dEdge * delta;
  distAcumulada += delta;
  m.lastRec = rec;
  if (m.riesgo >= UMBRAL_RIESGO) { m.riesgo = 0; pausar(rec); hazard(); return; }
  // Decisión de Control cada cierto tramo recorrido (acumulado en la misión).
  if (distAcumulada >= UMBRAL_DECISION) { distAcumulada = 0; pausar(rec); $('sala-estado').textContent = 'decisión'; mostrarDecision(pickOne(DECISIONES), reanudar); return; }

  if (rec >= m.total) { moving = false; marcha.raf = null; return llegada(m.destino); }
  m.raf = requestAnimationFrame(tick);
}
function llegada(destino) {
  unidadNode = destino;
  $('sala-pos').textContent = calleDe(destino);
  $('sala-estado').textContent = 'en posición';
  const poi = pois.find(p => p.node === destino && !p.reconocido);
  if (poi) return reconocer(poi);
  const inc = grafo.adj.get(destino).map(x => peligroDeArista(x.arista, ecologia, horaActual, CRIATURAS));
  const peligroso = inc.length && Math.max(...inc) >= 0.5;
  if (peligroso && Math.random() < 0.4) { guionar([pickOne(FALSO)]); }
  else guionar(LLEGADA_CALMA);
}

// ── Reconocimiento de un punto → intel / rastro / nada ───────────────────────
function reconocer(poi) {
  poi.reconocido = true;
  if (poi.marker) poi.marker.getElement()?.querySelector('.sala-poi')?.classList.add('hecho');
  const r = Math.random();
  if (r < 0.55) {                       // intel
    intel++;
    guionar([{ rol: 'lider', t: `Registrado. Hay datos aquí — ${calleDe(poi.node)}. Documentando.` }, { rol: 'control', t: 'Recibido. Buen material. Sigan.' }]);
  } else if (r < 0.75) {                // rastro → revela un contacto
    revelarMasCercano();
    guionar([{ rol: 'miembro', t: 'Marcas frescas... algo pasó por aquí. No hace mucho.' }, { rol: 'control', t: 'Marcado. Ojo con lo que despertaron.' }]);
  } else {                              // nada
    guionar([{ rol: 'miembro', t: 'Nada. Polvo y silencio.' }, { rol: 'lider', t: 'Anótalo igual. El vacío también es dato.' }]);
  }
  actualizarHUD();
  if (poi.foco) $('sala-estado').textContent = 'foco reconocido';
}

// ── Eventos de peligro ───────────────────────────────────────────────────────
function hazard() {
  if (Math.random() < 0.65) { $('sala-estado').textContent = '¡reflejo!'; mostrarQTE(pickOne(QTE), (ok) => { if (!ok) herir(); reanudar(); }); }
  else { $('sala-estado').textContent = 'falso positivo'; guionar([pickOne(FALSO)]); setTimeout(reanudar, 1500); }
}
async function asalto(c) {
  $('sala-estado').textContent = '¡ASALTO!';
  let danos = 0;
  await decir(ASALTO_INTRO);
  if (!await qtePromise({ txt: '¡EMBISTE! ¡ESQUIVA!' })) danos++;
  await decir([danos ? { rol: 'miembro', t: '¡Me rozó! Aguanto.' } : { rol: 'miembro', t: '¡Esquivado! ¡Firmes!' }]);
  if (!await qtePromise({ txt: '¡TE RODEA! ¡DOS FLANCOS A LA VEZ!', keys: dosKeys() })) danos++;
  await decir([{ rol: 'control', t: 'Aguanten. Rómpanlo hacia el norte.' }]);
  if (!await qtePromise({ txt: '¡ÚLTIMO EMPUJE! ¡AHORA!', keys: dosKeys() })) danos++;
  for (let i = 0; i < danos; i++) herir();
  if (danos >= 2) await decir([{ rol: 'lider', t: 'Nos dio duro... pero se replegó. Tenemos un herido.' }, { rol: 'control', t: 'Recibido. Sáquenlo de ahí.' }]);
  else if (danos === 1) await decir([{ rol: 'lider', t: '¡Rompimos contacto! Un golpe, nada grave.' }]);
  else await decir([{ rol: 'lider', t: '¡Lo repelimos limpio! Se replegó.' }]);
  despejarContacto(c);
  $('sala-estado').textContent = 'en marcha';
  reanudar();
}

// Aplica una herida a un agente vivo al azar (alimenta "lo que perdura").
function herir() {
  danosUnidad++;
  const vivos = equipo.filter(a => a.estado.vivo);
  if (!vivos.length) return;
  const a = vivos[Math.floor(Math.random() * vivos.length)];
  const grave = danosUnidad % 3 === 0;   // cada tercer golpe deja secuela grave
  a.estado.heridas.push({ tipo: grave ? 'trauma_de_especimen' : 'laceracion', parte_cuerpo: pickOne(['brazo', 'pierna', 'costado', 'hombro']), severidad: grave ? 3 : 2, efecto_stat: grave ? { físico: -1 } : {} });
  a.estado.cordura = Math.max(0, (a.estado.cordura ?? 100) - (grave ? 25 : 12));
  actualizarHUD();
}
// Fatiga/nervios: merma la cordura de la unidad (se arrastra a "lo que perdura").
function mermarCordura(n) {
  equipo.forEach(a => { if (a.estado.vivo) a.estado.cordura = Math.max(0, (a.estado.cordura ?? 100) - n); });
  actualizarHUD();
}
// Aplica los efectos de una decisión (peso real y, cuando se puede, visible).
function aplicarEfectos(efectos) {
  for (const e of (efectos || [])) {
    if (e === 'ruido' || e === 'contacto') revelarMasCercano();
    else if (e === 'intel') { intel++; actualizarHUD(); }
    else if (e === 'fatiga') mermarCordura(12);
  }
}

// ── Extracción → cierre → reporte ────────────────────────────────────────────
function extraer() {
  if (marcha && marcha.raf) cancelAnimationFrame(marcha.raf);
  const intelOk = intel >= Math.ceil(pois.length / 2);
  const misionId = 'recon-' + evento.id;
  const estado = {
    evento_id: evento.id, mision_id: misionId, equipo,
    nodo_actual: unidadNode, historial: [{ id: 'recon_extraccion' }],
    flags: {}, muestra_obtenida: intelOk, muestra_tipo: intelOk ? 'documentacion' : null,
    tiempo_simulado: horaStr, log: [],
  };
  const mision = { id: misionId, objetivo: 'reconocimiento', nodos: [] };
  setSession('op_estado_final', estado);
  setSession('op_mision_id', misionId);
  setSession('op_mision_obj', mision);
  if (getSession('op_consolidada') !== misionId) {
    try { consolidarOperacion(estado, mision, evento); setSession('op_consolidada', misionId); }
    catch (e) { console.warn('[CENVAC] cuartel no disponible', e); }
  }
  window.location.href = './reporte.html';
}
$('btn-extraer').addEventListener('click', extraer);

// ── Códec (voces = unidad real) ──────────────────────────────────────────────
const TINT = ['#4dff7a', '#6ad0ff', '#c8a84a'];
const voces = {};
equipo.forEach((a, i) => {
  const apellido = a.nombre_completo.split(' ').slice(1).join(' ') || a.nombre_completo;
  voces[a.id] = { nombre: `${a.rango_abreviatura} ${apellido.toUpperCase()}`, freq: (141 + i * 0.18).toFixed(2), tint: a.id === liderId ? '#ffc24d' : TINT[i % TINT.length], ini: apellido[0] || '?', lado: 'left' };
});
voces.control = { nombre: 'CENVAC CONTROL', freq: '140.85', tint: '#8affc0', ini: 'C', lado: 'right' };
const miembros = equipo.map(a => a.id);
const vozId = (rol) => rol === 'control' ? 'control' : rol === 'lider' ? liderId : miembros[Math.floor(Math.random() * miembros.length)];

const SVG_BUST = '<svg viewBox="0 0 100 100"><path fill="currentColor" d="M50 20a15 15 0 1 1-0.1 0zM20 94a30 27 0 0 1 60 0z"/></svg>';
function pintarPortrait(el, voz, talking) {
  el.style.color = voz.tint;
  el.innerHTML = `${SVG_BUST}<span class="sala-ini">${voz.ini}</span><span class="sala-freq">${voz.freq}</span>`;
  el.classList.toggle('talking', talking);
}
pintarPortrait($('sala-port-right'), voces.control, false);
let ultimoCampo = voces[liderId] || voces[miembros[0]];
pintarPortrait($('sala-port-left'), ultimoCampo, false);

const TRANSITO = [
  { rol: 'miembro', t: 'Sector muerto. Ni un perro.' },
  { rol: 'lider', t: 'Mantengan formación. No me gusta este silencio.' },
  { rol: 'miembro', t: 'Huele a drenaje abierto por aquí.' },
  { rol: 'control', t: 'Sigan el corredor. No se desvíen.' },
  { rol: 'lider', t: 'Ojos abiertos. Nada es lo que parece.' },
];
const CONTACTO = [
  { rol: 'miembro', t: '¡Movimiento! A las diez.' },
  { rol: 'lider', t: 'Alto. Nadie dispara. Control, ¿ven esto?' },
  { rol: 'control', t: 'Negativo desde aquí. Ustedes son mis ojos.' },
];
const LLEGADA_CALMA = [
  { rol: 'lider', t: 'En posición. Perímetro despejado.' },
  { rol: 'control', t: 'Recibido. Mantengan y reporten.' },
];
const FALSO = [
  { rol: 'miembro', t: '...creí ver algo. Nada. Falsa alarma.' },
  { rol: 'miembro', t: 'Fue una rata. Solo una rata.' },
  { rol: 'lider', t: 'Sombras y nervios. Manténganse.' },
];
const ASALTO_INTRO = [
  { rol: 'lider', t: '¡Contacto encima! ¡Formen, cúbranse!' },
  { rol: 'control', t: 'Unidad, los tengo en cámara. Aguanten.' },
];
const DECISIONES = [
  { pregunta: { rol: 'lider', t: 'Control, paso bloqueado. ¿Forzamos o rodeamos?' },
    opciones: [
      { txt: 'Forzar el paso (rápido, ruidoso)', verdict: [{ rol: 'control', t: 'Autorizado. Rápido.' }, { rol: 'miembro', t: 'Cede... pero sonó por todo el sector.' }], efectos: ['ruido'] },
      { txt: 'Rodear (lento, agotador)', verdict: [{ rol: 'lider', t: 'El rodeo nos costó tiempo y aliento. Seguimos, más gastados.' }], efectos: ['fatiga'] },
    ],
    timeout: { verdict: [{ rol: 'lider', t: 'Sin respuesta. Forzamos por instinto — y sonó.' }], efectos: ['ruido', 'fatiga'] } },
  { pregunta: { rol: 'miembro', t: 'Hay un cuerpo en el paso, con algo encima. ¿Revisamos o seguimos?' },
    opciones: [
      { txt: 'Revisar (intel, pero riesgo)', verdict: [{ rol: 'miembro', t: 'Lleva documentos... intel. Y esto no murió hace mucho.' }, { rol: 'control', t: 'Buen hallazgo. Muévanse.' }], efectos: ['intel', 'ruido'] },
      { txt: 'Seguir de largo (seguro)', verdict: [{ rol: 'lider', t: 'Lo dejamos. Con él se va lo que supiera.' }], efectos: [] },
    ],
    timeout: { verdict: [{ rol: 'miembro', t: 'Me congelé. Lo dejo — y con él, lo que sabía.' }], efectos: [] } },
];

const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
function pick(a, n) { const c = [...a], o = []; while (o.length < n && c.length) o.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return o; }

let cola = [], playing = false, tw = null, actx = null, colaOnDone = null, charMs = 42, holdMs = 2000;
function guionar(lines, onDone) {
  cola = lines.map(x => ({ rol: x.rol, t: x.t }));
  colaOnDone = onDone || null;
  $('sala-codec').classList.add('on');
  if (!playing) siguiente();
}
function decir(lines) { return new Promise(res => guionar(lines, res)); }
function siguiente() {
  if (!cola.length) { playing = false; const cb = colaOnDone; colaOnDone = null; if (cb) cb(); return; }
  playing = true;
  const { rol, t } = cola.shift();
  const voz = voces[vozId(rol)];
  if (voz.lado === 'left') { ultimoCampo = voz; pintarPortrait($('sala-port-left'), voz, true); pintarPortrait($('sala-port-right'), voces.control, false); }
  else { pintarPortrait($('sala-port-left'), ultimoCampo, false); pintarPortrait($('sala-port-right'), voz, true); }
  const nameEl = $('sala-codec-name');
  nameEl.textContent = voz.nombre; nameEl.style.textAlign = voz.lado === 'right' ? 'right' : 'left'; nameEl.style.color = voz.tint;
  beep(760);
  escribir($('sala-codec-line'), t, () => { apagarTalking(); setTimeout(siguiente, holdMs * (0.8 + Math.random() * 0.5)); });
}
function escribir(el, texto, done) {
  clearInterval(tw); let i = 0;
  tw = setInterval(() => { el.innerHTML = texto.slice(0, ++i) + '<span class="sala-cursor">▍</span>'; if (i >= texto.length) { clearInterval(tw); el.textContent = texto; done(); } }, charMs);
}
function apagarTalking() { $('sala-port-left').classList.remove('talking'); $('sala-port-right').classList.remove('talking'); }
function beep(freq) {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.03; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.05); } catch { }
}

// ── QTE (multi-tecla) ────────────────────────────────────────────────────────
const KEYS = [{ k: ' ', l: 'ESPACIO' }, { k: 'e', l: 'E' }, { k: 'f', l: 'F' }, { k: 'q', l: 'Q' }];
const QTE = [
  { txt: '¡ESCOMBRO CAYENDO!', ok: { rol: 'miembro', t: '¡Salté! Por poco.' }, fail: { rol: 'miembro', t: 'Me alcanzó. Puedo seguir.' } },
  { txt: '¡EL PISO CEDE!', ok: { rol: 'miembro', t: 'Firme. Salté al borde.' }, fail: { rol: 'miembro', t: 'Caí. La rodilla.' } },
  { txt: '¡CABLE TRAMPA!', ok: { rol: 'lider', t: 'Alto — lo vi. Nadie se mueve.' }, fail: { rol: 'lider', t: 'Sonó algo arriba. Nos oyeron.' } },
];
const keyLbl = (k) => k === ' ' ? 'ESPACIO' : k.toUpperCase();
const dataK = (k) => k === ' ' ? 'space' : k;
function dosKeys() { const pool = KEYS.map(x => x.k); const a = pool[Math.floor(Math.random() * pool.length)]; let b = a; while (b === a) b = pool[Math.floor(Math.random() * pool.length)]; return [a, b]; }
let qteResolved = false, qteKeyHandler = null, qteTimer = null;
function mostrarQTE(ev, done) {
  const reqKeys = (ev.keys && ev.keys.length) ? ev.keys.slice() : [KEYS[Math.floor(Math.random() * KEYS.length)].k];
  const LEER = 750, VENTANA = reqKeys.length > 1 ? 2600 : 2100;
  const pressed = new Set(); qteResolved = false;
  $('sala-qte-txt').textContent = ev.txt;
  $('sala-qte-keys').innerHTML = reqKeys.map(k => `<b data-k="${dataK(k)}">${keyLbl(k)}</b>`).join('');
  $('sala-qte-res').textContent = ''; $('sala-qte-res').style.color = 'var(--amber)';
  const fill = $('sala-qte-fill'); fill.style.transition = 'none'; fill.style.width = '100%';
  $('sala-qte').classList.add('on'); beep(920);
  setTimeout(() => { fill.style.transition = `width ${VENTANA}ms linear`; fill.style.width = '0%'; }, LEER);
  const resolver = (exito) => {
    if (qteResolved) return; qteResolved = true;
    clearTimeout(qteTimer); window.removeEventListener('keydown', qteKeyHandler);
    $('sala-qte-res').textContent = exito ? '✓ ESQUIVADO' : '✗ IMPACTO';
    $('sala-qte-res').style.color = exito ? 'var(--ph)' : 'var(--red)';
    setTimeout(() => { $('sala-qte').classList.remove('on'); if (ev.ok || ev.fail) guionar([exito ? ev.ok : ev.fail]); done(exito); }, 620);
  };
  qteKeyHandler = (e) => {
    const key = e.key === ' ' ? ' ' : e.key.toLowerCase();
    if (!reqKeys.includes(key)) return; e.preventDefault();
    pressed.add(key);
    const b = $('sala-qte-keys').querySelector(`[data-k="${dataK(key)}"]`); if (b) b.classList.add('hit');
    if (reqKeys.every(k => pressed.has(k))) resolver(true);
  };
  window.addEventListener('keydown', qteKeyHandler);
  qteTimer = setTimeout(() => resolver(false), LEER + VENTANA);
}
function qtePromise(ev) { return new Promise(res => mostrarQTE(ev, res)); }

// ── Decisión ─────────────────────────────────────────────────────────────────
const VENTANA_DEC = 6000; let decKeyHandler = null, decTimer = null;
function mostrarDecision(dec, done) {
  guionar([dec.pregunta]);
  const cont = $('sala-opts-inner'); cont.innerHTML = '';
  dec.opciones.forEach((o, i) => { const b = document.createElement('button'); b.className = 'sala-opt'; b.innerHTML = `<b>${i + 1}</b>${o.txt}`; b.addEventListener('click', () => resolver(o)); cont.appendChild(b); });
  $('sala-opts').classList.add('on');
  const fill = $('sala-opts-fill'); fill.className = ''; fill.style.transition = 'none'; fill.style.width = '100%';
  requestAnimationFrame(() => { fill.style.transition = `width ${VENTANA_DEC}ms linear`; fill.style.width = '0%'; });
  const urgente = setTimeout(() => fill.classList.add('urgente'), VENTANA_DEC * 0.66);
  let hecho = false;
  const cerrar = () => { hecho = true; clearTimeout(decTimer); clearTimeout(urgente); window.removeEventListener('keydown', decKeyHandler); $('sala-opts').classList.remove('on'); };
  const resolver = (salida) => { if (hecho) return; cerrar(); guionar(salida.verdict); aplicarEfectos(salida.efectos); done(); };
  decKeyHandler = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= dec.opciones.length) resolver(dec.opciones[n - 1]); };
  window.addEventListener('keydown', decKeyHandler);
  decTimer = setTimeout(() => resolver(dec.timeout), VENTANA_DEC);
}

repintar();
guionar([{ rol: 'control', t: `Unidad en el sector. Objetivo: reconocer y recuperar intel. Reporten cada punto.` }]);
