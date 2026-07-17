/**
 * _test-pathfinding.mjs — Test del A* del sector (Fase 2 · §1.6/§1.7).
 * Uso: node content/operaciones/_test-pathfinding.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { construirGrafo, aStar, nodoMasCercano, haversine } from "./js/pathfinding.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dir, "../data/operaciones/recon/grafo-centro.json"), "utf8"));
const grafo = construirGrafo(data);

let fallos = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? "✔" : "✗"} ${msg}`); if (!cond) fallos++; };
const sec = (t) => console.log(`\n── ${t} ──`);

console.log("══════════════════════════════════════════════════════");
console.log("CENVAC — TEST A* DEL SECTOR (grafo-centro)");
console.log("══════════════════════════════════════════════════════");

sec("1. Grafo cargado y conexo");
ok(grafo.nodos.size === data.nodos.length, `${grafo.nodos.size} nodos cargados`);
ok(data.aristas.length > 0, `${data.aristas.length} aristas`);
// Todas las aristas referencian nodos existentes.
const nodosOk = data.aristas.every(e => grafo.nodos.has(e.a) && grafo.nodos.has(e.b));
ok(nodosOk, "toda arista referencia nodos válidos");

// Dos nodos bien separados (extremos del sector por lat/lng).
const arr = data.nodos;
let A = arr[0], B = arr[0], maxd = 0;
for (const x of arr) for (const y of arr) {
  const d = haversine(x, y);
  if (d > maxd) { maxd = d; A = x; B = y; }
}

sec("2. Ruta encontrada y bien formada");
const r = aStar(grafo, A.id, B.id);
ok(r !== null, `ruta ${A.id}→${B.id} existe (${Math.round(maxd)} m en línea recta)`);
ok(r.path[0] === A.id && r.path[r.path.length - 1] === B.id, "empieza y termina en los nodos pedidos");
ok(r.distancia_m >= maxd, `distancia por calle ${r.distancia_m} m ≥ línea recta ${Math.round(maxd)} m`);
ok(r.path.length === new Set(r.path).size, "sin nodos repetidos en la ruta");
// Cada par consecutivo es adyacente.
const adyacentes = r.path.slice(1).every((n, i) => grafo.adj.get(r.path[i]).some(e => e.to === n));
ok(adyacentes, `${r.path.length} nodos, todos los tramos son aristas reales`);

sec("3. Optimalidad: A* == Dijkstra");
const rDij = aStar(grafo, A.id, B.id, { heuristica: false });
ok(Math.abs(r.coste - rDij.coste) < 1e-6, `coste A* ${r.coste.toFixed(1)} == Dijkstra ${rDij.coste.toFixed(1)}`);

sec("4. El peligro conocido reruta (§1.7)");
// Bloquear (peligro altísimo) las aristas usadas por la ruta base → debe cambiar.
const usadas = new Set();
for (let i = 1; i < r.path.length; i++) {
  const from = r.path[i - 1], to = r.path[i];
  const e = grafo.adj.get(from).find(x => x.to === to).arista;
  usadas.add(e);
}
const pesoConPeligro = (e) => usadas.has(e) ? e.m * 50 : e.m;
const r2 = aStar(grafo, A.id, B.id, { peso: pesoConPeligro });
ok(r2 !== null, "sigue habiendo ruta con el corredor peligroso penalizado");
const distinto = r2.path.join(",") !== r.path.join(",");
ok(distinto, "la ruta evita el corredor peligroso (reruteo)");
ok(r2.distancia_m >= r.distancia_m, `el desvío es ≥ largo (${r2.distancia_m} m vs ${r.distancia_m} m)`);

sec("5. Anclaje de coordenada a nodo (evento/sitio)");
// Evento chacal_de_feria (centro) → debe caer dentro del sector.
const nc = nodoMasCercano(grafo, 21.8818, -102.2975);
const pc = grafo.nodos.get(nc);
const dc = haversine({ lat: 21.8818, lng: -102.2975 }, pc);
ok(nc !== null && dc < 300, `evento centro ancla a ${nc} a ${Math.round(dc)} m`);

console.log("\n══════════════════════════════════════════════════════");
console.log(fallos === 0 ? "  TODOS LOS CHECKS PASARON ✔" : `  ${fallos} CHECK(S) FALLARON ✗`);
console.log("══════════════════════════════════════════════════════");
process.exit(fallos ? 1 : 0);
