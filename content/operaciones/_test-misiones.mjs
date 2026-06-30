/**
 * _test-misiones.mjs — Test del generador procedural (tarea §7).
 * Uso: node content/operaciones/_test-misiones.mjs
 *
 * Cubre, sobre el generador:
 *   1. Validez estructural (200 seeds): refs ok, todo alcanzable, toda rama → final.
 *   2. Completabilidad: rama de éxito y rama de fracaso corren en el motor real.
 *   3. Integridad mecánica: ningún final narra baja sin efecto que la produzca.
 *   4. Diferenciación: dos seeds no producen misiones idénticas.
 *   5. Compat: las misiones hand-authored siguen cargando y validan.
 */

import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

import { generarMision, validarMision } from "./js/mission-generator.js";
import { generarAgente } from "./js/agent-generator.js";
import { cargarMision, obtenerNodo, procesarNodo } from "./js/mission-engine.js";
import { contarBajas } from "./js/state.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, "../data/operaciones");
const leer = (r) => JSON.parse(readFileSync(join(dataDir, r), "utf8"));

const grammar = {
  creatureTags: leer("missions/grammar/creature-tags.json"),
  objectiveTemplates: leer("missions/grammar/objective-templates.json"),
  beats: leer("missions/grammar/beats.json"),
  siteTemplates: leer("missions/grammar/site-templates.json"),
};
const eventos = leer("events/active-events.json");
const evento = eventos.find((e) => e.criatura_sospechada === "arana_hidraulica");

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log(`  ✗ ${msg}`); } };
const seccion = (t) => console.log(`\n── ${t} ──`);

console.log("══════════════════════════════════════════════════════");
console.log("CENVAC — TEST DEL GENERADOR PROCEDURAL");
console.log("══════════════════════════════════════════════════════");

// ── 1. Validez estructural sobre 200 seeds ─────────────────────────────────────
seccion("1. Validez estructural (200 seeds)");
let invalidos = 0;
for (let s = 1; s <= 200; s++) {
  const m = generarMision(evento, s, { grammar });
  const r = validarMision(m);
  if (!r.ok) { invalidos++; if (invalidos <= 3) console.log(`  ✗ seed ${s}: ${r.errores.join("; ")}`); }
}
ok(invalidos === 0, `${invalidos}/200 misiones inválidas`);
console.log(`  ${invalidos === 0 ? "✔" : "✗"} 200 misiones generadas; inválidas: ${invalidos}`);

// ── Helper de traversal en el motor real ───────────────────────────────────────
const datosAg = { archetypes: leer("agents/archetypes.json"), traits: leer("agents/traits.json"), names: leer("agents/names.json"), ranks: leer("org/ranks.json") };
function crearEstado(mision) {
  const equipo = [42, 137, 2026, 999].map((s) => generarAgente(s, datosAg));
  equipo.forEach((a, i) => { a.es_lider = i === 0; });
  return { evento_id: evento.id, mision_id: mision.id, equipo, nodo_actual: mision.nodo_inicial, historial: [], flags: {}, muestra_obtenida: false, muestra_tipo: null, tiempo_simulado: "07:00", log: [] };
}
function correr(mision, estado, resultadoForzado) {
  let id = mision.nodo_inicial, pasos = 0;
  while (id && pasos < 120) {
    const nodo = obtenerNodo(mision, id);
    if (!nodo) return { error: `nodo inexistente: ${id}` };
    const opcionIndex = nodo.tipo === "narrativo" || nodo.tipo === "decision" ? 0 : null;
    const forz = nodo.tipo === "check" ? resultadoForzado : null;
    const r = procesarNodo(nodo, estado, mision, { opcionIndex, resultadoForzado: forz });
    if (nodo.tipo === "final" || r.es_final) return { final: nodo.id, estado };
    if (!r.siguiente) return { error: `sin siguiente en ${id}` };
    id = r.siguiente; pasos++;
  }
  return { error: "límite de pasos" };
}

// ── 2. Completabilidad: éxito y fracaso corren en el motor ──────────────────────
seccion("2. Completabilidad en el motor real");
{
  const m = cargarMision(generarMision(evento, 42, { grammar }));
  const exito = correr(m, crearEstado(m), "éxito");
  ok(!exito.error, `rama éxito: ${exito.error || "ok"}`);
  ok(exito.final === "final_exito_limpio", `rama éxito termina en final_exito_limpio (terminó en ${exito.final})`);
  ok(exito.estado && exito.estado.muestra_obtenida === true, "rama éxito obtiene muestra");
  console.log(`  rama éxito  → ${exito.final} | muestra=${exito.estado?.muestra_obtenida} bajas=${exito.estado ? contarBajas(exito.estado) : "?"}`);

  const fracaso = correr(m, crearEstado(m), "crítico_fallo");
  ok(!fracaso.error, `rama fracaso: ${fracaso.error || "ok"}`);
  ok(fracaso.final && fracaso.final.startsWith("final_"), `rama fracaso llega a un final (${fracaso.final})`);
  const bajasFracaso = fracaso.estado ? contarBajas(fracaso.estado) : 0;
  console.log(`  rama fracaso → ${fracaso.final} | muestra=${fracaso.estado?.muestra_obtenida} bajas=${bajasFracaso}`);
}

// ── 3. Integridad mecánica: finales que narran baja tienen el efecto ────────────
seccion("3. Integridad mecánica (bajas con efecto)");
{
  const m = generarMision(evento, 7, { grammar });
  let malos = 0;
  for (const n of m.nodos.filter((x) => x.tipo === "final")) {
    const narraBaja = /pirrico|catastrofico/.test(n.resultado);
    const tieneEfecto = (n.efectos_garantizados_al_entrar || []).some((e) => e.tipo === "baja_garantizada");
    if (narraBaja && !tieneEfecto) { malos++; console.log(`  ✗ ${n.id} narra baja sin efecto`); }
  }
  ok(malos === 0, `${malos} finales narran baja sin efecto`);
  // y la rama crítica produce baja real por efecto, no por texto
  const m2 = cargarMision(generarMision(evento, 99, { grammar }));
  const fr = correr(m2, crearEstado(m2), "crítico_fallo");
  ok(contarBajas(fr.estado) >= 1, `rama crítica produce baja real por efecto (bajas=${contarBajas(fr.estado)})`);
  console.log(`  ✔ finales con baja respaldados por efecto; rama crítica bajas=${contarBajas(fr.estado)}`);
}

// ── 4. Diferenciación: dos seeds no producen misiones idénticas ─────────────────
seccion("4. Diferenciación");
{
  const N = 50;
  const full = new Set(), shapes = new Set();
  for (let s = 1; s <= N; s++) {
    const m = generarMision(evento, s, { grammar });
    full.add(JSON.stringify(m.nodos));
    shapes.add(m.nodos.map((n) => `${n.id}:${n.tipo}`).sort().join("|"));
  }
  ok(full.size === N, `${N - full.size} pares de seeds produjeron misiones idénticas`);
  ok(shapes.size >= 4, `solo ${shapes.size} formas estructurales distintas (esperado ≥4)`);
  console.log(`  ✔ ${full.size}/${N} misiones únicas; ${shapes.size} formas estructurales distintas`);
}

// ── 5. Compat: misiones hand-authored cargan y validan ──────────────────────────
seccion("5. Compatibilidad con misiones hand-authored");
{
  const dir = join(dataDir, "missions");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  let malas = 0;
  for (const f of files) {
    const m = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const r = validarMision(m);
    if (!r.ok) { malas++; console.log(`  ✗ ${f}: ${r.errores.slice(0, 2).join("; ")}`); }
  }
  ok(malas === 0, `${malas}/${files.length} misiones hand-authored con problemas estructurales`);
  console.log(`  ${malas === 0 ? "✔" : "✗"} ${files.length} misiones hand-authored revisadas; problemas: ${malas}`);
}

console.log("\n══════════════════════════════════════════════════════");
console.log(fallos === 0 ? "  TODOS LOS CHECKS PASARON ✔" : `  ${fallos} CHECK(S) FALLARON ✗`);
console.log("══════════════════════════════════════════════════════");
process.exit(fallos === 0 ? 0 : 1);
