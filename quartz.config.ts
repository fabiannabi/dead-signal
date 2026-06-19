import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "A.P.E.",
    pageTitleSuffix: " — Archivo Post-Emergencia",
    enableSPA: false,
    enablePopovers: true,
    analytics: null,
    locale: "es-ES",
    baseUrl: "fabiannabi.github.io/dead-signal",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Share Tech Mono",
        body: "Crimson Pro",
        code: "Share Tech Mono",
      },
      colors: {
        lightMode: {
          light: "#0a0a08",
          lightgray: "#2a2a22",
          gray: "#5a5648",
          darkgray: "#8a8670",
          dark: "#e0dcca",
          secondary: "#c8a84a",
          tertiary: "#8a6a2a",
          highlight: "rgba(200, 168, 74, 0.08)",
          textHighlight: "rgba(200, 168, 74, 0.15)",
        },
        darkMode: {
          light: "#0a0a08",
          lightgray: "#2a2a22",
          gray: "#5a5648",
          darkgray: "#8a8670",
          dark: "#e0dcca",
          secondary: "#c8a84a",
          tertiary: "#8a6a2a",
          highlight: "rgba(200, 168, 74, 0.08)",
          textHighlight: "rgba(200, 168, 74, 0.15)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CustomDirectives(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-dark",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: false,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
