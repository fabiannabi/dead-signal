import { QuartzComponentConstructor, QuartzComponentProps } from "../types"

const TIPO_META: Record<string, { label: string; glyph: string; code?: string }> = {
  personaje:  { label: "Sujeto del archivo",      glyph: "◈" },
  capitulo:   { label: "Archivo recuperado",       glyph: "⊞" },
  documento:  { label: "Documento original",       glyph: "▣" },
  criatura:   { label: "Amenaza documentada",      glyph: "⟁" },
  lugar:      { label: "Locación",                 glyph: "⌖" },
  evento:     { label: "Evento registrado",        glyph: "◆" },
}

export default (() => {
  function EntradaHeader({ fileData }: QuartzComponentProps) {
    const tipo = (fileData.frontmatter?.tipo as string | undefined)?.toLowerCase()
    if (!tipo) return null
    const meta = TIPO_META[tipo]
    if (!meta) return null

    return (
      <div class="entrada-header" data-tipo={tipo}>
        <span class="entrada-glyph">{meta.glyph}</span>
        <span class="entrada-label">{meta.label}</span>
      </div>
    )
  }

  return EntradaHeader
}) satisfies QuartzComponentConstructor
