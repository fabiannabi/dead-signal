const PALETTES = ["senal", "fosfor", "ambar", "microfilm"] as const
type Palette = (typeof PALETTES)[number]

function injectCRTHud() {
  if (document.getElementById("crt-hud")) return
  const hud = document.createElement("div")
  hud.id = "crt-hud"
  hud.innerHTML = `<div class="crt-hud crt-tl">CENVAC-AGS // CAM_04</div>`
  document.body.appendChild(hud)

  const glitch = document.createElement("div")
  glitch.id = "crt-glitch"
  document.body.appendChild(glitch)
}

function removeCRTHud() {
  document.getElementById("crt-hud")?.remove()
  document.getElementById("crt-glitch")?.remove()
}

function applyPalette(palette: Palette) {
  document.documentElement.setAttribute("data-palette", palette)
  localStorage.setItem("palette", palette)
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".palette-btn")) {
    btn.classList.toggle("active", btn.dataset.palette === palette)
  }
  if (palette === "fosfor") injectCRTHud()
  else removeCRTHud()
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
