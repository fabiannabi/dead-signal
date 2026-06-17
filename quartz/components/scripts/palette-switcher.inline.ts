const PALETTES = ["senal", "fosfor", "ambar", "microfilm"] as const
type Palette = (typeof PALETTES)[number]

function applyPalette(palette: Palette) {
  document.documentElement.setAttribute("data-palette", palette)
  localStorage.setItem("palette", palette)
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".palette-btn")) {
    btn.classList.toggle("active", btn.dataset.palette === palette)
  }
}

// Apply saved palette immediately on load (before nav event)
const saved = (localStorage.getItem("palette") ?? "senal") as Palette
applyPalette(saved)

document.addEventListener("nav", () => {
  // Re-apply on SPA navigation
  const current = (localStorage.getItem("palette") ?? "senal") as Palette
  applyPalette(current)

  for (const btn of document.querySelectorAll<HTMLButtonElement>(".palette-btn")) {
    btn.addEventListener("click", () => applyPalette(btn.dataset.palette as Palette))
    window.addCleanup(() =>
      btn.removeEventListener("click", () => applyPalette(btn.dataset.palette as Palette)),
    )
  }
})
