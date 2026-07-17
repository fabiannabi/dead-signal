/**
 * pathfinding.js — A* sobre el grafo curado de UN sector (§1.6).
 *
 * Vanilla ES6, client-side, sin dependencias ni build tools. Corre igual en el
 * navegador y en Node (para test). El grafo se hornea aparte desde OSM
 * (recon/grafo-centro.json): intersecciones = nodos, tramos = aristas con
 * distancia real en metros.
 *
 * El peso de una arista combina distancia (m) con PELIGRO (lugar×hora, §1.5)
 * vía opts.peso. Con peligro 0 el resultado es la ruta más corta; al inyectar
 * peligro conocido, A* la evita. El jugador solo ve peligro CONOCIDO (§1.7): la
 * grieta entre lo que CENVAC cree y el terreno real es donde muere el agente.
 */

// Haversine en metros. Como heurística de A* es admisible: la línea recta nunca
// sobreestima el coste real mientras el peligro sea ≥ 0 (peso ≥ distancia).
export function haversine(a, b) {
  const R = 6371000, tr = x => x * Math.PI / 180;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Prepara el grafo (adyacencia no dirigida) a partir del JSON horneado. */
export function construirGrafo(data) {
  const nodos = new Map(data.nodos.map(n => [n.id, { lat: n.lat, lng: n.lng }]));
  const adj = new Map([...nodos.keys()].map(id => [id, []]));
  for (const e of data.aristas) {
    if (!nodos.has(e.a) || !nodos.has(e.b)) continue;
    adj.get(e.a).push({ to: e.b, arista: e });
    adj.get(e.b).push({ to: e.a, arista: e });
  }
  return { nodos, adj };
}

// Peso por defecto: distancia inflada por el peligro base de la arista.
const pesoDefecto = (e) => e.m * (1 + (e.peligro_base || 0));

/** Nodo del grafo más cercano a una coordenada (para anclar evento/sitio). */
export function nodoMasCercano(grafo, lat, lng) {
  let mejor = null, min = Infinity;
  for (const [id, p] of grafo.nodos) {
    const d = haversine({ lat, lng }, p);
    if (d < min) { min = d; mejor = id; }
  }
  return mejor;
}

/**
 * A* entre dos nodos. opts.peso(arista)→número redefine el coste (para inyectar
 * peligro conocido). opts.heuristica=false lo degrada a Dijkstra (h=0).
 * Devuelve { path, distancia_m, coste, calles } o null si no hay ruta.
 */
export function aStar(grafo, origen, destino, opts = {}) {
  const { nodos, adj } = grafo;
  if (!nodos.has(origen) || !nodos.has(destino)) return null;
  const peso = opts.peso || pesoDefecto;
  const h = (id) => opts.heuristica === false ? 0 : haversine(nodos.get(id), nodos.get(destino));

  const g = new Map([[origen, 0]]);
  const came = new Map();
  const cerrados = new Set();
  const open = new MinHeap();
  open.push(origen, h(origen));

  while (open.size) {
    const id = open.pop();
    if (id === destino) return reconstruir(came, destino, g);
    if (cerrados.has(id)) continue;
    cerrados.add(id);
    for (const { to, arista } of adj.get(id)) {
      if (cerrados.has(to)) continue;
      const tentativo = g.get(id) + peso(arista);
      if (tentativo < (g.has(to) ? g.get(to) : Infinity)) {
        came.set(to, { from: id, arista });
        g.set(to, tentativo);
        open.push(to, tentativo + h(to));
      }
    }
  }
  return null;
}

function reconstruir(came, destino, g) {
  const path = [destino];
  const calles = [];
  let dist = 0, cur = destino;
  while (came.has(cur)) {
    const { from, arista } = came.get(cur);
    dist += arista.m;
    calles.unshift(arista.calle);
    cur = from;
    path.unshift(cur);
  }
  return { path, distancia_m: dist, coste: g.get(destino), calles };
}

// Min-heap binario mínimo (id + prioridad f). Suficiente y sin dependencias.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(id, f) {
    const a = this.a; a.push({ id, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top.id;
  }
}
