import { FilePath, joinSegments, slugifyFilePath } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import path from "path"
import fs from "fs"
import { glob } from "../../util/glob"
import { Argv } from "../../util/ctx"
import { QuartzConfig } from "../../cfg"

const filesToCopy = async (argv: Argv, cfg: QuartzConfig) => {
  // glob all non MD files in content folder and copy it over
  return await glob("**", argv.directory, ["**/*.md", ...cfg.configuration.ignorePatterns])
}

// slugifyFilePath strips .md/.html extensions (it produces page slugs). For
// copied assets that are actual .html pages (e.g. the /operaciones/ app) we must
// keep the extension so the file serves as index.html / briefing.html, etc.
const assetDest = (argv: Argv, fp: FilePath) => {
  let name = slugifyFilePath(fp) as string
  const ext = path.extname(fp)
  if (ext === ".html" && !name.endsWith(ext)) {
    name = name + ext
  }
  return joinSegments(argv.output, name) as FilePath
}

const copyFile = async (argv: Argv, fp: FilePath) => {
  const src = joinSegments(argv.directory, fp) as FilePath
  const dest = assetDest(argv, fp)

  // ensure dir exists
  const dir = path.dirname(dest) as FilePath
  await fs.promises.mkdir(dir, { recursive: true })

  await fs.promises.copyFile(src, dest)
  return dest
}

export const Assets: QuartzEmitterPlugin = () => {
  return {
    name: "Assets",
    async *emit({ argv, cfg }) {
      const fps = await filesToCopy(argv, cfg)
      for (const fp of fps) {
        yield copyFile(argv, fp)
      }
    },
    async *partialEmit(ctx, _content, _resources, changeEvents) {
      for (const changeEvent of changeEvents) {
        const ext = path.extname(changeEvent.path)
        if (ext === ".md") continue

        if (changeEvent.type === "add" || changeEvent.type === "change") {
          yield copyFile(ctx.argv, changeEvent.path)
        } else if (changeEvent.type === "delete") {
          const dest = assetDest(ctx.argv, changeEvent.path)
          await fs.promises.unlink(dest)
        }
      }
    },
  }
}
