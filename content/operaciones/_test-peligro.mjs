/**
 * _test-peligro.mjs — El peligro sale de la ecología y cambia con la hora (§1.5).
 * Uso: node content/operaciones/_test-peligro.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { construirGrafo, aStar, haversine } from "./js/pathfinding.js";
import { horaActiva, peligroDeArista, pesoPeligro, criaturasActivas } from "./js/peligro.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const leer = (r) => JSON.parse(readFileSync(join(__dir, r), "utf8"));
const dataG = leer("../data/operaciones/recon/grafo-centro.json");
const ecologia = leer("../data/operaciones/recon/ecologia-peligro.json");
const grafo = construirGrafo(dataG);
const CRIATURAS = ["gusano_de_asfalto", "chacal_de_feria"]; // presentes en el centro

let fallos = 0;
const ok = (c, m) => { console.log(`  ${c ? "✔" : "✗"} ${m}`); if (!c) fallos++; };
const sec = (t) => console.log(`\n── ${t} ──`);
const conPeligro = (hora) => dataG.aristas.filter(a => peligroDeArista(a, ecologia, hora, CRIATURAS) > 0).length;

console.log("══════════════════════════════════════════════════════");
console.log("CENVAC — TEST DE ECOLOGÍA DE PELIGRO (hora × criatura)");
console.log("══════════════════════════════════════════════════════");

sec("1. Bandas horarias");
ok(horaActiva(13, [[11, 15]]) && !horaActiva(3, [[11, 15]]), "Gusano activo 13:00, inactivo 03:00");
ok(horaActiva(20, [[10, 22]]) && !horaActiva(3, [[10, 22]]), "Chacal activo 20:00, inactivo 03:00");
ok(horaActiva(1, [[22, 4]]), "banda con cruce de medianoche (22→04) cubre 01:00");

sec("2. El terreno tiene features para las reglas");
ok(dataG.aristas.every(a => a.clase), "toda arista tiene clase de calle");
ok(dataG.aristas.some(a => a.mercado), `${dataG.aristas.filter(a => a.mercado).length} aristas en corredor mercado`);

sec("3. El peligro respira con la hora");
const p13 = conPeligro(13), p3 = conPeligro(3), p20 = conPeligro(20);
console.log(`     aristas peligrosas → 03:00=${p3} · 13:00=${p13} · 20:00=${p20}`);
ok(p3 === 0, "03:00 (madrugada): sin peligro, todo el sector duerme");
ok(p13 > p3, `13:00 (mediodía): Gusano vuelve peligroso el asfalto (${p13} aristas)`);
ok(p20 > 0 && p20 < p13, `20:00 (noche): solo el corredor del Chacal (${p20} aristas), no todo el asfalto`);

sec("4. Criaturas activas por hora");
ok(criaturasActivas(ecologia, 13, CRIATURAS).includes("gusano_de_asfalto"), "13:00 → Gusano activo (asfalto)");
ok(criaturasActivas(ecologia, 20, CRIATURAS).join() === "chacal_de_feria", "20:00 → solo Chacal (Gusano dormido)");
ok(criaturasActivas(ecologia, 3, CRIATURAS).length === 0, "03:00 → ninguna");

sec("5. A* paga la hora: misma ruta cuesta más al mediodía");
// Dos nodos separados; comparar coste nocturno vs mediodía sobre asfalto.
const ids = dataG.nodos.map(n => n.id);
let A = ids[0], B = ids[0], max = 0;
for (const x of dataG.nodos) for (const y of dataG.nodos) { const d = haversine(x, y); if (d > max) { max = d; A = x.id; B = y.id; } }
const noche = aStar(grafo, A, B, { peso: pesoPeligro(ecologia, { hora: 3, criaturas: CRIATURAS }) });
const dia = aStar(grafo, A, B, { peso: pesoPeligro(ecologia, { hora: 13, criaturas: CRIATURAS }) });
ok(noche && dia, "hay ruta a ambas horas");
ok(dia.coste > noche.coste, `coste mediodía ${Math.round(dia.coste)} > noche ${Math.round(noche.coste)} (el peligro pesa)`);
ok(Math.abs(noche.coste - noche.distancia_m) < 1, "de noche el coste == distancia pura (sin peligro)");

sec("6. Peligro CONOCIDO vs real (§1.7)");
// Si CENVAC solo conoce un puñado de aristas, el resto pesa como si fuera seguro.
const conocido = new Set(dataG.aristas.slice(0, 5));
const pesoParcial = pesoPeligro(ecologia, { hora: 13, criaturas: CRIATURAS, soloConocido: conocido });
const rParcial = aStar(grafo, A, B, { peso: pesoParcial });
ok(rParcial.coste <= dia.coste, "con peligro solo parcialmente conocido, CENVAC subestima el coste (ahí muere el agente)");

console.log("\n══════════════════════════════════════════════════════");
console.log(fallos === 0 ? "  TODOS LOS CHECKS PASARON ✔" : `  ${fallos} CHECK(S) FALLARON ✗`);
console.log("══════════════════════════════════════════════════════");
process.exit(fallos ? 1 : 0);
