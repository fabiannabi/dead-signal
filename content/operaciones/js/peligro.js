/**
 * peligro.js — Deriva el peligro de cada arista de la ECOLOGÍA (§1.5), no a mano.
 *
 * El peso del pathfinding = distancia × (1 + peligro), y el peligro de una calle
 * es función de QUÉ criatura vive ahí × A QUÉ HORA. Así el mapa deja de ser un
 * tablero de logística y se vuelve la expresión espacial de las criaturas: la
 * misma calle es mortal a mediodía (Gusano de Asfalto) y segura de noche.
 *
 * Fuente de datos: recon/ecologia-peligro.json (reglas por criatura) + las
 * features de terreno horneadas en cada arista del grafo (clase, mercado, …).
 *
 * IMPORTANTE (§1.7): esto calcula el peligro REAL del terreno. Lo que el jugador
 * puede pesar es solo el peligro CONOCIDO; la grieta entre ambos es el horror.
 * Para eso, pasar `soloConocido` con el conjunto de aristas ya reveladas.
 */

// ¿La hora cae dentro de alguna banda [inicio, fin)? Soporta cruce de medianoche.
export function horaActiva(hora, bandas) {
  return bandas.some(([s, e]) => (s <= e ? hora >= s && hora < e : hora >= s || hora < e));
}

/**
 * ¿La arista cumple UN bloque de condiciones? Dentro del bloque todo debe pasar.
 * `feature` acepta lista: ahí sí basta con una (una alcantarilla y un tiradero son
 * el mismo hábitat para la misma criatura).
 */
function cumple(arista, cond) {
  if (!cond) return false;
  if (cond.clase && !cond.clase.includes(arista.clase)) return false;
  if (cond.feature) {
    const fs = Array.isArray(cond.feature) ? cond.feature : [cond.feature];
    if (!fs.some(f => arista[f])) return false;
  }
  return true;
}

/**
 * Dos formas de escribir una regla, porque los biomas del bestiario vienen de las
 * dos maneras:
 *   `aplica`         — todo junto. El Chacal vive en el corredor avenida–mercado:
 *                      necesita mercado Y vía principal, no una de las dos.
 *   `aplica_alguno`  — alternativas. El Cervato pastorea en parques O en calle
 *                      residencial; cualquiera de los dos lo pone ahí.
 */
function aplica(arista, regla) {
  if (regla.aplica_alguno) return regla.aplica_alguno.some(c => cumple(arista, c));
  return cumple(arista, regla.aplica);
}

/**
 * Peligro REAL de una arista a una hora dada, sumando las criaturas activas del
 * sector cuya regla aplique. `criaturas` = ids presentes en el sector.
 */
export function peligroDeArista(arista, ecologia, hora, criaturas) {
  let p = 0;
  for (const cid of criaturas) {
    const r = ecologia.reglas[cid];
    if (!r || !horaActiva(hora, r.horas)) continue;
    if (aplica(arista, r)) p += r.peligro;
  }
  return p;
}

/**
 * Devuelve una función de peso para aStar(grafo, o, d, { peso }).
 * opts:
 *   hora        — hora del despacho (0–24)
 *   criaturas   — ids de criaturas presentes en el sector
 *   soloConocido — Set de aristas cuyo peligro el jugador ya conoce (§1.7).
 *                  Si se pasa, las aristas fuera del set pesan solo su distancia
 *                  (CENVAC no sabe que son peligrosas → la unidad puede caer ahí).
 */
export function pesoPeligro(ecologia, { hora, criaturas, soloConocido = null }) {
  return (arista) => {
    if (soloConocido && !soloConocido.has(arista)) return arista.m;
    return arista.m * (1 + peligroDeArista(arista, ecologia, hora, criaturas));
  };
}

/** Qué criaturas de la ecología están activas a esta hora (para HUD / diagnóstico). */
export function criaturasActivas(ecologia, hora, criaturas) {
  return criaturas.filter(cid => {
    const r = ecologia.reglas[cid];
    return r && horaActiva(hora, r.horas);
  });
}
