/**
 * dispatch-store.js — Estado de despacho CENVAC (señal + tiempo) y escaneo por evento.
 *
 * Modelo de canon (tarea-misiones-procedurales-y-despacho §2, aprobado):
 *   - Estado de despacho: { senal_pct: 100, tiempo_despacho: 'HH:MM' }.
 *   - Cada evento tiene un scan_estado: { nivel: 0..3, zonas_reveladas: [ids], parcial }.
 *   - Escanear sube un nivel, revela más zonas del esquemático y cuesta señal + tiempo.
 *   - Costo acumulativo: →1 −10%/+6min, →2 −15%/+10min, →3 −25%/+15min.
 *   - Con señal < 35% el escaneo cuesta +50% y revela parcial (una zona menos).
 *   - La señal no se regenera dentro del turno; resetDespacho() vuelve a 100.
 */

const DKEY = 'cenvac_despacho';
const SKEY = 'cenvac_scan';

export const NIVEL_MAX = 3;
export const UMBRAL_BAJA = 35;
export const UMBRAL_CRIT = 20;

const COSTOS = {
  1: { senal: 10, min: 6 },
  2: { senal: 15, min: 10 },
  3: { senal: 25, min: 15 },
};

// sessionStorage en browser; fallback en memoria para Node (tests headless).
const _mem = {};
const _store = (typeof sessionStorage !== 'undefined') ? sessionStorage : {
  getItem: (k) => (k in _mem ? _mem[k] : null),
  setItem: (k, v) => { _mem[k] = String(v); },
  removeItem: (k) => { delete _mem[k]; },
};

function _read(key, fallback) {
  try { const v = JSON.parse(_store.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
}
function _write(key, val) { _store.setItem(key, JSON.stringify(val)); }

// ── Estado de despacho ─────────────────────────────────────────────────────────

export function getDespacho() {
  return _read(DKEY, { senal_pct: 100, tiempo_despacho: '06:00' });
}

export function setDespacho(d) { _write(DKEY, d); }

export function resetDespacho() {
  _store.removeItem(DKEY);
  _store.removeItem(SKEY);
}

export function senalClass(pct) {
  if (pct < UMBRAL_CRIT) return 'crit';
  if (pct < UMBRAL_BAJA) return 'low';
  return '';
}

// ── Scan estado por evento ──────────────────────────────────────────────────────

function _allScans() { return _read(SKEY, {}); }
function _saveScans(m) { _write(SKEY, m); }

export function getScanEstado(eventoId) {
  const m = _allScans();
  return m[eventoId] || { nivel: 0, zonas_reveladas: [], parcial: false };
}

/**
 * Costo del próximo escaneo de un evento, o null si ya está al nivel máximo.
 * Incluye el recargo por señal baja.
 */
export function costoProximoEscaneo(eventoId) {
  const est = getScanEstado(eventoId);
  if (est.nivel >= NIVEL_MAX) return null;
  const base = COSTOS[est.nivel + 1];
  const baja = getDespacho().senal_pct < UMBRAL_BAJA;
  return {
    nivel: est.nivel + 1,
    senal: baja ? Math.round(base.senal * 1.5) : base.senal,
    min: base.min,
    recargo: baja,
  };
}

/**
 * Ejecuta un escaneo sobre un evento usando su site-template.
 * Gasta señal + tiempo, sube el nivel y revela zonas (parcial si señal baja).
 *
 * @returns {{ok:boolean, motivo?:string, scan?:object, costo?:object, despacho?:object, zonas_nuevas?:string[]}}
 */
export function escanear(evento, template) {
  const est = getScanEstado(evento.id);
  if (est.nivel >= NIVEL_MAX) return { ok: false, motivo: 'nivel_max' };

  const costo = costoProximoEscaneo(evento.id);
  const despacho = getDespacho();
  if (despacho.senal_pct < costo.senal) return { ok: false, motivo: 'sin_senal', costo };

  const nuevoNivel = est.nivel + 1;
  const zonas = (template && template.zonas) || [];
  const yaReveladas = est.zonas_reveladas;

  // Candidatas: todas las zonas alcanzables al nuevo nivel.
  let reveladas = zonas.filter(z => z.nivel_revela <= nuevoNivel).map(z => z.id);
  const nuevas = reveladas.filter(id => !yaReveladas.includes(id));

  // Señal baja → escaneo parcial: se retiene la última zona nueva.
  let parcial = false;
  if (costo.recargo && nuevas.length > 1) {
    const retenida = nuevas[nuevas.length - 1];
    reveladas = reveladas.filter(id => id !== retenida);
    parcial = true;
  }

  despacho.senal_pct = Math.max(0, despacho.senal_pct - costo.senal);
  despacho.tiempo_despacho = sumarMinutos(despacho.tiempo_despacho, costo.min);
  setDespacho(despacho);

  const scan = { nivel: nuevoNivel, zonas_reveladas: reveladas, parcial };
  const m = _allScans();
  m[evento.id] = scan;
  _saveScans(m);

  return {
    ok: true,
    scan,
    costo,
    despacho,
    zonas_nuevas: reveladas.filter(id => !yaReveladas.includes(id)),
  };
}

// ── Utilidad de tiempo ──────────────────────────────────────────────────────────

export function sumarMinutos(hhmm, min) {
  const [h, m] = String(hhmm).split(':').map(Number);
  const total = (h * 60 + m + min) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
