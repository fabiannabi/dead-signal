import { QuartzTransformerPlugin } from "../types"
import remarkDirective from "remark-directive"
import { visit } from "unist-util-visit"
import type { Root } from "mdast"

export const CustomDirectives: QuartzTransformerPlugin = () => {
  return {
    name: "CustomDirectives",
    markdownPlugins() {
      return [
        remarkDirective,
        () => (tree: Root) => {
          visit(tree, (node: any) => {
            const name = node.name as string
            const attrs = (node.attributes ?? {}) as Record<string, string>

            // Inline directive: :redactado[texto] → <span class="redacted">████</span>
            if (node.type === "textDirective" && name === "redactado") {
              node.data = {
                hName: "span",
                hProperties: { class: "redacted" },
              }
              return
            }

            if (node.type !== "containerDirective") return

            // :::notas{tipo="field" titulo="Libreta F-01 / Día 3"}
            // tipos: field | clinical | audio | personal
            if (name === "notas") {
              const tipo = attrs.tipo ?? ""
              node.data = {
                hName: "div",
                hProperties: {
                  class: `field-notes-block${tipo ? ` ${tipo}` : ""}`,
                  "data-titulo": attrs.titulo ?? "",
                },
              }
            } else if (name === "archivist") {
              // :::archivist → nota del archivista
              node.data = {
                hName: "div",
                hProperties: { class: "archivist-note" },
              }
            } else if (name === "stamp") {
              // :::stamp{codigo="F-01" doc="01"} → archive-stamp header
              node.data = {
                hName: "div",
                hProperties: {
                  class: "archive-stamp-block",
                  "data-codigo": attrs.codigo ?? "",
                  "data-doc": attrs.doc ?? "",
                },
              }
            }
          })
        },
      ]
    },
  }
}
