const PALETTES = ["senal", "fosfor", "ambar", "microfilm"] as const
type Palette = (typeof PALETTES)[number]

const pad = (n: number) => String(n).padStart(2, "0")

function injectCRTHud() {
  if (document.getElementById("crt-hud")) return
  const hud = document.createElement("div")
  hud.id = "crt-hud"
  hud.innerHTML = `
    <div class="crt-hud crt-tl">CENVAC-AGS // CAM_04</div>
    <div class="crt-hud crt-tr"><span class="crt-rec"></span><span id="crt-rectime">REC 00:00:00</span></div>
    <div class="crt-hud crt-bl">LAT 21.8853 · LON -102.2916</div>
    <div class="crt-hud crt-br" id="crt-datestamp">--/--/---- --:--:--</div>
  `
  document.body.appendChild(hud)
  const t0 = Date.now()
  const timer = setInterval(() => {
    const d = new Date()
    const ds = document.getElementById("crt-datestamp")
    if (ds) ds.textContent = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const rt = document.getElementById("crt-rectime")
    if (rt) {
      const e = Math.floor((Date.now() - t0) / 1000)
      rt.textContent = `REC ${pad(Math.floor(e/3600))}:${pad(Math.floor(e/60)%60)}:${pad(e%60)}`
    }
  }, 1000)
  ;(hud as any)._timer = timer
}

function removeCRTHud() {
  const hud = document.getElementById("crt-hud")
  if (!hud) return
  clearInterval((hud as any)._timer)
  hud.remove()
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
