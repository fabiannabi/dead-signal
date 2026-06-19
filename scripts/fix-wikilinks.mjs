/**
 * fix-wikilinks.mjs — corrige todos los wikilinks con prefijo incorrecto en content/
 * Uso: node scripts/fix-wikilinks.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = resolve(__dirname, "../content")

// Pares [buscar, reemplazar] — orden importa (más específicos primero)
const REPLACEMENTS = [
  // ── libreta links (personajes → documentos) ───────────────────────────
  ["[[fabian/libreta-",   "[[documentos/fabian/libreta-"],
  ["[[felipe/libreta-",   "[[documentos/felipe/libreta-"],
  ["[[carlos/libreta-",   "[[documentos/carlos/libreta-"],

  // ── cap links (documentos → personajes) ──────────────────────────────
  ["[[fabian/cap-",       "[[personajes/fabian/cap-"],
  // (felipe y carlos no tienen caps en documentos, pero por seguridad:)
  ["[[felipe/cap-",       "[[personajes/felipe/cap-"],
  ["[[carlos/cap-",       "[[personajes/carlos/cap-"],

  // ── bestiario — criaturas ─────────────────────────────────────────────
  // Roca: dos variantes exactas para no pisar [[roca-negra]]
  ["[[roca|",             "[[bestiario/roca|"],
  ["[[roca]]",            "[[bestiario/roca]]"],

  ["[[roca-negra",        "[[bestiario/roca-negra"],
  ["[[cervato-de-concreto","[[bestiario/cervato-de-concreto"],
  ["[[gusano-de-asfalto", "[[bestiario/gusano-de-asfalto"],
  ["[[chacal-de-feria",   "[[bestiario/chacal-de-feria"],
  ["[[arana-hidraulica",  "[[bestiario/arana-hidraulica"],
  ["[[arana-de-casa",     "[[bestiario/arana-de-casa"],
  ["[[toro-de-calicanto", "[[bestiario/toro-de-calicanto"],
  ["[[mosca-forunculo",   "[[bestiario/mosca-forunculo"],
  ["[[hormiga-coordinadora","[[bestiario/hormiga-coordinadora"],
  ["[[coyote-mutado",     "[[bestiario/coyote-mutado"],
  ["[[enredadera-acelerada","[[bestiario/enredadera-acelerada"],
  ["[[hongo-de-cemento",  "[[bestiario/hongo-de-cemento"],
  ["[[la-catedral",       "[[bestiario/la-catedral"],
  ["[[cucaracha-matriarca","[[bestiario/cucaracha-matriarca"],
  ["[[rata-coendu",       "[[bestiario/rata-coendu"],
]

function walkMd(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walkMd(full))
    else if (entry.endsWith(".md")) files.push(full)
  }
  return files
}

const files = walkMd(CONTENT_DIR)
let totalChanges = 0
const changed = []

for (const file of files) {
  let content = readFileSync(file, "utf8")
  let original = content

  for (const [from, to] of REPLACEMENTS) {
    // Evitar doble-reemplazo: si ya tiene el prefijo correcto, no tocar
    if (content.includes(to)) {
      // Reemplazar solo las ocurrencias que NO ya tienen el prefijo
      // (e.g. [[bestiario/roca| no debe ser reemplazado otra vez)
    }
    content = content.split(from).join(to)
  }

  if (content !== original) {
    writeFileSync(file, content, "utf8")
    const count = (content.match(/\[\[/g) || []).length
    changed.push(file.replace(CONTENT_DIR + "\\", "").replace(CONTENT_DIR + "/", ""))
    totalChanges++
  }
}

console.log(`\nfix-wikilinks — ${totalChanges} archivo(s) modificado(s):\n`)
for (const f of changed) console.log(`  ${f}`)
console.log()
