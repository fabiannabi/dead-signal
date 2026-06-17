import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [Component.LightboxScript(), Component.BestiarioScript()],
  footer: Component.Footer({
    links: {
      "Archivo Principal": "/",
      Operaciones: "/operaciones/",
    },
  }),
}

export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.EntradaHeader(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      folderDefaultState: "collapsed",
      useSavedState: true,
      mapFn: (node) => {
        const names: Record<string, string> = {
          personajes: "Expedientes de Sujeto",
          documentos: "Documentos Originales",
          bestiario: "Registro de Amenazas",
          fabian: "Fabián — F-01",
          felipe: "Felipe — F-02",
          gaby: "Gaby — F-03",
          aaron: "Aarón — F-04",
          carlos: "Carlos — F-05",
        }
        if (node.isFolder && node.slugSegment && names[node.slugSegment]) {
          node.displayName = names[node.slugSegment]
        }
        if (!node.isFolder && node.displayName) {
          // "F-01 / Entrada 01 — Título"  →  "Entrada 01 — Título"
          node.displayName = node.displayName.replace(/^F-\d+\s*[/\/]\s*/, "")
          // "F-01 — Fabián" (fichas de personaje)  →  "↳ Ficha"
          node.displayName = node.displayName.replace(/^F-\d+\s*[—–]\s*(.+)$/, "↳ Ficha — $1")
          // legacy: Cap. XX → Entrada XX
          node.displayName = node.displayName.replace(/Cap\.\s*0*(\d+)/g, "Entrada $1")
        }
      },
    }),
    Component.PaletteSwitcher(),
  ],
  right: [],
}

export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer({
      folderDefaultState: "collapsed",
      useSavedState: true,
      mapFn: (node) => {
        const names: Record<string, string> = {
          personajes: "Expedientes de Sujeto",
          documentos: "Documentos Originales",
          bestiario: "Registro de Amenazas",
          fabian: "Fabián — F-01",
          felipe: "Felipe — F-02",
          gaby: "Gaby — F-03",
          aaron: "Aarón — F-04",
          carlos: "Carlos — F-05",
        }
        if (node.isFolder && node.slugSegment && names[node.slugSegment]) {
          node.displayName = names[node.slugSegment]
        }
        if (!node.isFolder && node.displayName) {
          // "F-01 / Entrada 01 — Título"  →  "Entrada 01 — Título"
          node.displayName = node.displayName.replace(/^F-\d+\s*[/\/]\s*/, "")
          // "F-01 — Fabián" (fichas de personaje)  →  "↳ Ficha"
          node.displayName = node.displayName.replace(/^F-\d+\s*[—–]\s*(.+)$/, "↳ Ficha — $1")
          // legacy: Cap. XX → Entrada XX
          node.displayName = node.displayName.replace(/Cap\.\s*0*(\d+)/g, "Entrada $1")
        }
      },
    }),
    Component.PaletteSwitcher(),
  ],
  right: [],
}
