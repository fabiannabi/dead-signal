/**
 * _test-misiones.mjs — Test del generador procedural (tarea §7).
 * Uso: node content/operaciones/_test-misiones.mjs
 *
 *   1. Validez estructural: 200 seeds × cada evento (criatura/objetivo).
 *   2. Completabilidad: rama éxito y rama fracaso corren en el motor real, por evento.
 *   3. Integridad mecánica: ningún final narra baja sin efecto que la produzca.
 *   4. Diferenciación: por evento, 50 seeds → misiones únicas y varias formas.
 *   5. Siembra por escaneo (§4.4): nivel alto injerta ventaja y mejora checks.
 *   6. Compat: las misiones hand-authored siguen validando.
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
const datosAg = { archetypes: leer("agents/archetypes.json"), traits: leer("agents/traits.json"), names: leer("agents/names.json"), ranks: leer("org/ranks.json") };

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log(`  ✗ ${msg}`); } };
const seccion = (t) => console.log(`\n── ${t} ──`);

console.log("══════════════════════════════════════════════════════");
console.log("CENVAC — TEST DEL GENERADOR PROCEDURAL (Fase 3)");
console.log("══════════════════════════════════════════════════════");

function crearEstado(evento, mision) {
  const equipo = [42, 137, 2026, 999].map((s) => generarAgente(s, datosAg));
  equipo.forEach((a, i) => { a.es_lider = i === 0; });
  return { evento_id: evento.id, mision_id: mision.id, equipo, nodo_actual: mision.nodo_inicial, historial: [], flags: {}, muestra_obtenida: false, muestra_tipo: null, tiempo_simulado: "07:00", log: [] };
}
function correr(evento, mision, resultadoForzado) {
  const estado = crearEstado(evento, mision);
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

// ── 1. Validez estructural (200 seeds × evento) ─────────────────────────────────
seccion("1. Validez estructural (200 seeds × evento)");
for (const ev of eventos) {
  let inval = 0;
  for (let s = 1; s <= 200; s++) {
    const r = validarMision(generarMision(ev, s, { grammar }));
    if (!r.ok) { inval++; if (inval <= 2) console.log(`  ✗ ${ev.criatura_sospechada}/${ev.objetivo} seed ${s}: ${r.errores[0]}`); }
  }
  ok(inval === 0, `${ev.criatura_sospechada}/${ev.objetivo}: ${inval}/200 inválidas`);
  console.log(`  ${inval === 0 ? "✔" : "✗"} ${ev.criatura_sospechada.padEnd(20)} ${ev.objetivo.padEnd(15)} inválidas: ${inval}`);
}

// ── 2. Completabilidad por evento ───────────────────────────────────────────────
seccion("2. Completabilidad en el motor real (por evento)");
for (const ev of eventos) {
  const m = cargarMision(generarMision(ev, 42, { grammar }));
  const e = correr(ev, m, "éxito");
  const f = correr(ev, m, "crítico_fallo");
  ok(!e.error && e.final?.startsWith("final_"), `${ev.criatura_sospechada}: rama éxito (${e.error || e.final})`);
  ok(e.estado?.muestra_obtenida === true, `${ev.criatura_sospechada}: rama éxito cumple objetivo`);
  ok(!f.error && f.final?.startsWith("final_"), `${ev.criatura_sospechada}: rama fracaso (${f.error || f.final})`);
  console.log(`  ✔ ${ev.criatura_sospechada.padEnd(20)} éxito→${(e.final||"?").padEnd(22)} fracaso→${f.final||"?"} (bajas ${f.estado?contarBajas(f.estado):"?"})`);
}

// ── 3. Integridad mecánica ──────────────────────────────────────────────────────
seccion("3. Integridad mecánica (bajas con efecto)");
{
  let malos = 0;
  for (const ev of eventos) {
    const m = generarMision(ev, 7, { grammar });
    for (const n of m.nodos.filter((x) => x.tipo === "final")) {
      const narraBaja = /pirrico|catastrofico/.test(n.resultado);
      const tiene = (n.efectos_garantizados_al_entrar || []).some((e) => e.tipo === "baja_garantizada");
      if (narraBaja && !tiene) { malos++; console.log(`  ✗ ${ev.objetivo}/${n.id} narra baja sin efecto`); }
    }
  }
  ok(malos === 0, `${malos} finales narran baja sin efecto`);
  const ev = eventos[0];
  const m = cargarMision(generarMision(ev, 99, { grammar }));
  const fr = correr(ev, m, "crítico_fallo");
  ok(contarBajas(fr.estado) >= 1, `rama crítica produce baja real (bajas=${contarBajas(fr.estado)})`);
  console.log(`  ✔ finales con baja respaldados; rama crítica bajas=${contarBajas(fr.estado)}`);
}

// ── 4. Diferenciación por evento ────────────────────────────────────────────────
seccion("4. Diferenciación (por evento)");
for (const ev of eventos) {
  const N = 50; const full = new Set(), shapes = new Set();
  for (let s = 1; s <= N; s++) {
    const m = generarMision(ev, s, { grammar });
    full.add(JSON.stringify(m.nodos));
    shapes.add(m.nodos.map((n) => `${n.id}:${n.tipo}`).sort().join("|"));
  }
  ok(full.size === N, `${ev.criatura_sospechada}: ${N - full.size} pares idénticos`);
  ok(shapes.size >= 4, `${ev.criatura_sospechada}: solo ${shapes.size} formas (≥4)`);
  console.log(`  ${full.size === N && shapes.size >= 4 ? "✔" : "✗"} ${ev.criatura_sospechada.padEnd(20)} únicas ${full.size}/${N}, formas ${shapes.size}`);
}

// ── 5. Siembra por escaneo (§4.4) ───────────────────────────────────────────────
seccion("5. Siembra por escaneo");
{
  const ev = eventos.find((e) => e.criatura_sospechada === "arana_hidraulica");
  const m0 = generarMision(ev, 5, { grammar, scan_estado: { nivel: 0 } });
  const m3 = generarMision(ev, 5, { grammar, scan_estado: { nivel: 3 } });
  const tieneVentaja = (m) => m.nodos.some((n) => n.id === "nodo_ventaja_recon");
  const busqMod = (m) => m.nodos.find((n) => n.id === "nodo_busqueda")?.check.modificadores_ambiente;
  ok(!tieneVentaja(m0), "nivel 0 NO injerta ventaja de reconocimiento");
  ok(tieneVentaja(m3), "nivel 3 injerta nodo de ventaja de reconocimiento");
  ok(busqMod(m3) > busqMod(m0), `nivel 3 mejora el check de búsqueda (${busqMod(m0)} → ${busqMod(m3)})`);
  console.log(`  ✔ escaneo modula el árbol: ventaja(n0=${tieneVentaja(m0)}, n3=${tieneVentaja(m3)}), busqueda mod ${busqMod(m0)}→${busqMod(m3)}`);
}

// ── 6. Compat hand-authored ─────────────────────────────────────────────────────
seccion("6. Compatibilidad con misiones hand-authored");
{
  const dir = join(dataDir, "missions");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  let malas = 0;
  for (const f of files) {
    const r = validarMision(JSON.parse(readFileSync(join(dir, f), "utf8")));
    if (!r.ok) { malas++; console.log(`  ✗ ${f}: ${r.errores.slice(0, 2).join("; ")}`); }
  }
  ok(malas === 0, `${malas}/${files.length} hand-authored con problemas`);
  console.log(`  ${malas === 0 ? "✔" : "✗"} ${files.length} hand-authored revisadas; problemas: ${malas}`);
}

console.log("\n══════════════════════════════════════════════════════");
console.log(fallos === 0 ? "  TODOS LOS CHECKS PASARON ✔" : `  ${fallos} CHECK(S) FALLARON ✗`);
console.log("══════════════════════════════════════════════════════");
process.exit(fallos === 0 ? 0 : 1);
