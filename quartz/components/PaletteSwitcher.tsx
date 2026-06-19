import { QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/palette-switcher.inline"

const palettes = [
  { id: "senal",    label: "Señal",    title: "Paleta original" },
  { id: "fosfor",   label: "Fósforo",  title: "Terminal CRT verde" },
  { id: "ambar",    label: "Ámbar",    title: "VHS / cassette" },
  { id: "microfilm",label: "Microfilm",title: "Archivo frío / xerox" },
] as const

export default (() => {
  function PaletteSwitcher() {
    // UI oculta — el script aplica fosfor como tema fijo
    // Descomentar los botones cuando se reactive el selector
    return <></>
    /*
    return (
      <div class="palette-switcher" aria-label="Cambiar paleta de color">
        {palettes.map((p) => (
          <button
            class="palette-btn"
            data-palette={p.id}
            title={p.title}
            aria-label={p.title}
          >
            {p.label}
          </button>
        ))}
      </div>
    )
    */
  }

  PaletteSwitcher.afterDOMLoaded = script

  return PaletteSwitcher
}) satisfies QuartzComponentConstructor
