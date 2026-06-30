import { QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { resolveRelative, FullSlug } from "../../util/path"

// Link en el sidebar hacia el módulo de Operaciones (asset, no aparece en el Explorer).
// Ruta relativa → funciona igual en local y en el subpath de producción.
export default (() => {
  function OperacionesLink({ fileData, displayClass }: QuartzComponentProps) {
    const rel = resolveRelative(fileData.slug, "operaciones/index" as FullSlug)
    const href = rel.endsWith("/") ? rel : rel + "/"
    return (
      <div class={`operaciones-nav ${displayClass ?? ""}`}>
        <a href={href}>⚐ Operaciones CENVAC</a>
      </div>
    )
  }

  OperacionesLink.css = `
.operaciones-nav { margin-top: 0.6rem; }
.operaciones-nav a {
  display: block;
  font-family: var(--codeFont);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--secondary);
  text-decoration: none;
  padding: 0.5rem 0.2rem;
  border-top: 1px solid var(--lightgray);
}
.operaciones-nav a:hover { color: var(--tertiary); }
`

  return OperacionesLink
}) satisfies QuartzComponentConstructor
