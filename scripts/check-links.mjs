/**
 * check-links.mjs — verifica que todos los links internos del sitio existan
 * Uso: node scripts/check-links.mjs
 * Requiere haber corrido `npx quartz build` antes.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join, dirname, resolve, relative, extname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(__dirname, "../public")
// Prefix que Quartz usa en GitHub Pages — se mapea a la raíz de public/
const BASE_PATH = "/dead-signal"

// ── Helpers ────────────────────────────────────────────────────────────────

function walkHtml(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walkHtml(full))
    else if (entry.endsWith(".html")) files.push(full)
  }
  return files
}

function extractHrefs(html) {
  const hrefs = []
  // Captura href="..." ignorando data-*, mailto, tel, javascript
  const re = /\bhref="([^"]+)"/g
  let m
  while ((m = re.exec(html)) !== null) hrefs.push(m[1])
  return hrefs
}

function isSkippable(href) {
  return (
    href.startsWith("http") ||
    href.startsWith("//") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:") ||
    href.startsWith("#") ||
    // Rutas absolutas con el base path de GitHub Pages — válidas en producción
    href.startsWith(BASE_PATH + "/") ||
    href === BASE_PATH
  )
}

/**
 * Devuelve la ruta absoluta en disco que debería existir, o null si no aplica.
 */
function resolveHref(href, fromFile) {
  if (isSkippable(href)) return null

  // Quitar fragment y query
  const clean = href.split("#")[0].split("?")[0]
  if (!clean) return null

  // Extensiones de assets — no verificar
  const ext = extname(clean).toLowerCase()
  if ([".css", ".js", ".ico", ".xml", ".json", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".mp3", ".mp4", ".wav"].includes(ext))
    return null

  // Absoluto sin base path — tratar desde raíz de public
  if (clean.startsWith("/")) {
    return resolve(PUBLIC_DIR, "." + clean)
  }

  // Relativo
  return resolve(dirname(fromFile), clean)
}

/**
 * Comprueba si la ruta existe como archivo, archivo.html o carpeta/index.html
 */
function fileExists(path) {
  if (existsSync(path)) {
    if (statSync(path).isDirectory()) return existsSync(join(path, "index.html"))
    return true
  }
  if (existsSync(path + ".html")) return true
  if (existsSync(join(path, "index.html"))) return true
  return false
}

// ── Main ───────────────────────────────────────────────────────────────────

const htmlFiles = walkHtml(PUBLIC_DIR)
const broken = []   // { file, href, resolved }
const ok = []

for (const file of htmlFiles) {
  if (file.endsWith("404.html")) continue

  const html = readFileSync(file, "utf8")
  const hrefs = [...new Set(extractHrefs(html))]   // dedup
  const relFile = relative(PUBLIC_DIR, file)

  for (const href of hrefs) {
    const resolved = resolveHref(href, file)
    if (!resolved) continue

    if (!fileExists(resolved)) {
      broken.push({ file: relFile, href, resolved: relative(PUBLIC_DIR, resolved) })
    } else {
      ok.push({ file: relFile, href })
    }
  }
}

// ── Reporte ────────────────────────────────────────────────────────────────

const totalLinks = broken.length + ok.length
console.log(`\nSeñal Muerta — Link Checker`)
console.log(`═══════════════════════════════`)
console.log(`Archivos HTML escaneados : ${htmlFiles.length - 1}`)  // -1 por 404.html
console.log(`Links internos revisados : ${totalLinks}`)
console.log(`Links OK                 : ${ok.length}`)
console.log(`Links ROTOS              : ${broken.length}`)

if (broken.length === 0) {
  console.log(`\n✓ Todos los links están bien.\n`)
  process.exit(0)
}

// Agrupar por archivo fuente para reporte limpio
const byFile = {}
for (const { file, href, resolved } of broken) {
  if (!byFile[file]) byFile[file] = []
  byFile[file].push({ href, resolved })
}

console.log(`\n✗ Links rotos:\n`)
for (const [file, links] of Object.entries(byFile)) {
  console.log(`  ${file}`)
  for (const { href, resolved } of links) {
    console.log(`    href : ${href}`)
    console.log(`    dest : ${resolved}`)
  }
  console.log()
}

process.exit(1)
