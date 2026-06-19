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

  if (!document.getElementById("crt-session-warn")) {
    const center = document.querySelector(".center")
    if (center) {
      const warn = document.createElement("div")
      warn.id = "crt-session-warn"
      warn.innerHTML = `
        <div class="csw-header">CENVAC-AGS // SISTEMA DE GESTIÓN DE PERSONAL</div>
        <hr class="csw-divider">
        <div class="csw-row"><span class="csw-label">SESIÓN</span><span class="csw-val">ACTIVA — USUARIO: <span class="csw-redact">████████████</span></span></div>
        <div class="csw-row"><span class="csw-label">INICIO</span><span class="csw-val"><span class="csw-redact">██/██/████</span> &nbsp;02:41 CST</span></div>
        <div class="csw-row"><span class="csw-label">TERMINAL</span><span class="csw-val">B-7 / SECTOR NORTE</span></div>
        <hr class="csw-divider">
        <div class="csw-alert">⚠ &nbsp;ACCESO NO AUTORIZADO — SESIÓN NO CERRADA<span class="csw-cursor"></span></div>
      `
      center.insertAdjacentElement("afterbegin", warn)
    }
  }
}

function removeCRTHud() {
  document.getElementById("crt-hud")?.remove()
  document.getElementById("crt-glitch")?.remove()
  document.getElementById("crt-session-warn")?.remove()
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
