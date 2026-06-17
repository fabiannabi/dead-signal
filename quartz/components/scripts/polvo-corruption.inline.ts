interface CorruptionState {
  level: 0 | 1 | 2 | 3
  unlockedAt: Record<number, number>
  seenSlugs: string[]
}

// ─── Partículas ───────────────────────────────

interface Particle {
  x: number; y: number
  vx: number; vy: number
  size: number
  alpha: number; alphaDir: number
  color: string
}

const PARTICLE_CANVAS_ID = "corruption-particles"

const LEVEL_CFG = [
  { count: 0,   colors: [] as string[],                                                                                               speed: 0    },
  { count: 35,  colors: ["#9A50E0", "#C090FF", "#6A28A8", "#E0C8FF", "#1A6830", "#0E5020"],                                          speed: 0.28 },
  { count: 60,  colors: ["#B060FF", "#7A30C8", "#D8A8FF", "#5818A0", "#E8C0FF", "#1A6830", "#0E5020", "#267038"],                    speed: 0.44 },
  { count: 100, colors: ["#B060FF", "#9030E8", "#C870FF", "#7020C8", "#D090FF", "#A040FF", "#1A6830", "#0E5020", "#267038", "#1E7A2E"], speed: 0.65 },
]

let particles: Particle[] = []
let rafId: number | null = null
let activeLevel = 0

function spawnParticle(cfg: (typeof LEVEL_CFG)[number], w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: h + Math.random() * 40,
    vx: (Math.random() - 0.5) * cfg.speed * 0.7,
    vy: -(Math.random() * cfg.speed + 0.12),
    size: Math.random() * 2.2 + 0.8,
    alpha: 0,
    alphaDir: Math.random() * 0.009 + 0.003,
    color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
  }
}

function getOrCreateCanvas(id: string): HTMLCanvasElement {
  let canvas = document.getElementById(id) as HTMLCanvasElement | null
  if (!canvas) {
    canvas = document.createElement("canvas")
    canvas.id = id
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;"
    document.body.appendChild(canvas)
    const onResize = () => {
      if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    }
    window.addEventListener("resize", onResize, { passive: true })
  }
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  return canvas
}

function startParticles(level: number): void {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  activeLevel = level

  const cfg = LEVEL_CFG[level]
  if (!cfg || cfg.count === 0) {
    const c = document.getElementById(PARTICLE_CANVAS_ID) as HTMLCanvasElement | null
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height)
    particles = []
    return
  }

  const canvas = getOrCreateCanvas(PARTICLE_CANVAS_ID)
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  // Seed particles spread across the screen immediately
  particles = Array.from({ length: cfg.count }, () => {
    const p = spawnParticle(cfg, canvas.width, canvas.height)
    p.y = Math.random() * canvas.height
    p.alpha = Math.random() * 0.65
    return p
  })

  function tick() {
    if (activeLevel !== level) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vx += (Math.random() - 0.5) * 0.012

      p.alpha += p.alphaDir
      if (p.alpha > 0.75) { p.alpha = 0.75; p.alphaDir = -Math.abs(p.alphaDir) }
      if (p.alpha < 0)    { p.alpha = 0;    p.alphaDir =  Math.abs(p.alphaDir) }

      if (p.y < -10 || p.x < -15 || p.x > canvas.width + 15) {
        Object.assign(p, spawnParticle(cfg, canvas.width, canvas.height))
      }

      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    rafId = requestAnimationFrame(tick)
  }

  rafId = requestAnimationFrame(tick)
}

// ─── Estática / Glitch ────────────────────────

let glitchTimeout: ReturnType<typeof setTimeout> | null = null
const GLITCH_CANVAS_ID = "corruption-glitch"

const GLITCH_DELAYS: Record<number, [number, number]> = {
  1: [40000, 80000],
  2: [20000, 45000],
  3: [8000,  22000],
}

function triggerGlitch(level: number): void {
  const canvas = getOrCreateCanvas(GLITCH_CANVAS_ID)
  canvas.style.zIndex = "10000"
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  // Fondo de ruido de pixels
  const imageData = ctx.createImageData(canvas.width, canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() > 0.82) {
      const v = Math.random() * 255
      data[i]     = Math.round(v * 0.5)   // R — reducido (morado)
      data[i + 1] = 0                      // G
      data[i + 2] = Math.round(v)          // B — fuerte
      data[i + 3] = Math.round(Math.random() * 180 + 40)
    } else {
      data[i + 3] = 0
    }
  }
  ctx.putImageData(imageData, 0, 0)

  // Líneas horizontales de barrido
  const lineCount = Math.floor(3 + Math.random() * (level * 4))
  for (let i = 0; i < lineCount; i++) {
    const y    = Math.random() * canvas.height
    const h    = 1 + Math.random() * (level + 1) * 3
    const w    = canvas.width * (0.3 + Math.random() * 0.7)
    const x    = Math.random() * (canvas.width - w)
    const r    = Math.floor(Math.random() * 80 + level * 30)
    const b    = Math.floor(Math.random() * 200 + 55)
    const a    = 0.3 + Math.random() * 0.5
    ctx.fillStyle = `rgba(${r},0,${b},${a})`
    ctx.fillRect(x, y, w, h)
  }

  // Aplica distorsión al body y desplaza letras al azar
  const glitchSpans = addGlitchShifts(level)
  document.body.classList.add("is-glitching")

  const duration = 60 + Math.random() * 120
  canvas.style.opacity = String(0.25 + level * 0.08)

  setTimeout(() => {
    canvas.style.opacity = "0"
    document.body.classList.remove("is-glitching")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    removeGlitchShifts(glitchSpans)

    // A veces un segundo flash rápido
    if (Math.random() > 0.55) {
      setTimeout(() => triggerGlitch(level), 180 + Math.random() * 250)
    }
  }, duration)
}

function addGlitchShifts(level: number): HTMLSpanElement[] {
  const article = document.querySelector("article")
  if (!article) return []
  const paras = Array.from(article.querySelectorAll("p"))
  if (!paras.length) return []
  const count = 2 + level
  const spans: HTMLSpanElement[] = []
  for (let i = 0; i < count; i++) {
    const para = paras[Math.floor(Math.random() * paras.length)]
    const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []
    let n: Node | null
    while ((n = walker.nextNode())) {
      if ((n as Text).length > 4) textNodes.push(n as Text)
    }
    if (!textNodes.length) continue
    const tn = textNodes[Math.floor(Math.random() * textNodes.length)]
    const txt = tn.textContent ?? ""
    if (txt.length < 3) continue
    const pos = 1 + Math.floor(Math.random() * (txt.length - 2))
    const base = 1.5 + level * 0.9
    const dy   = (Math.random() > 0.5 ? -1 : 1) * (base + Math.random() * base)
    const dx   = (Math.random() - 0.5) * (1 + level * 0.4)
    const lh  = (0.7 + Math.random() * 0.55).toFixed(2)
    const span = document.createElement("span")
    span.style.cssText = `display:inline-block;transform:translateY(${dy.toFixed(1)}px) translateX(${dx.toFixed(1)}px);line-height:${lh};transition:none;`
    span.textContent = txt.slice(pos, pos + 1)
    const before = document.createTextNode(txt.slice(0, pos))
    const after  = document.createTextNode(txt.slice(pos + 1))
    const parent = tn.parentNode
    if (!parent) continue
    parent.insertBefore(before, tn)
    parent.insertBefore(span, tn)
    parent.insertBefore(after, tn)
    parent.removeChild(tn)
    spans.push(span)
  }
  return spans
}

function removeGlitchShifts(spans: HTMLSpanElement[]): void {
  for (const span of spans) {
    const parent = span.parentNode
    if (!parent) continue
    parent.replaceChild(document.createTextNode(span.textContent ?? ""), span)
  }
}

function scheduleGlitch(level: number): void {
  if (glitchTimeout !== null) { clearTimeout(glitchTimeout); glitchTimeout = null }
  if (level === 0) return
  const [min, max] = GLITCH_DELAYS[level] ?? [60000, 120000]
  const delay = min + Math.random() * (max - min)
  glitchTimeout = setTimeout(() => {
    if (document.body.classList.contains(`corruption-${level}`)) {
      triggerGlitch(level)
      scheduleGlitch(level)
    }
  }, delay)
}

// ─── localStorage helpers ─────────────────────

function loadCorruption(): CorruptionState {
  try {
    const raw = localStorage.getItem("polvo:corruption")
    if (!raw) return { level: 0, unlockedAt: {}, seenSlugs: [] }
    return JSON.parse(raw) as CorruptionState
  } catch {
    return { level: 0, unlockedAt: {}, seenSlugs: [] }
  }
}

function saveCorruption(state: CorruptionState): void {
  localStorage.setItem("polvo:corruption", JSON.stringify(state))
}

function loadTokenStore(): Record<string, number> {
  try {
    const raw = localStorage.getItem("polvo:tokens")
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? {} : (parsed as Record<string, number>)
  } catch { return {} }
}

// ─── DOM ─────────────────────────────────────

function applyCorruptionToDOM(level: number): void {
  const classes = ["corruption-0", "corruption-1", "corruption-2", "corruption-3"]
  document.body.classList.remove(...classes)
  document.body.classList.add(`corruption-${level}`)
  document.documentElement.classList.remove(...classes)
  document.documentElement.classList.add(`corruption-${level}`)
  ;(document.body as HTMLElement & { dataset: DOMStringMap }).dataset.corruption = String(level)
}

function showCorruptionToast(level: number): void {
  const messages: Record<number, string> = {
    1: "Algo se acaba de despertar en el archivo.",
    2: "El archivo no se siente solo.",
    3: "Alguien escribe contigo.",
  }
  const msg = messages[level]
  if (!msg) return
  document.querySelector(".corruption-toast")?.remove()
  const toast = document.createElement("div")
  toast.className = "corruption-toast"
  toast.setAttribute("role", "status")
  toast.setAttribute("aria-live", "polite")
  toast.innerHTML = `<span class="corruption-toast-glyph">&#x2756;</span><span class="corruption-toast-msg">${msg}</span>`
  document.body.appendChild(toast)
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("is-visible")))
  setTimeout(() => {
    toast.classList.remove("is-visible")
    setTimeout(() => toast.remove(), 700)
  }, 8000)
}

function corruptRandomLetters(): void {
  const state = loadCorruption()
  if (state.level === 0) return
  const probability = state.level === 3 ? 0.018 : state.level * 0.004
  document.querySelectorAll<HTMLParagraphElement>("article p").forEach((p) => {
    if (p.querySelector(".corrupted-letter")) return
    const text = p.textContent ?? ""
    if (!text.trim()) return
    let hasCorruption = false
    const frag = document.createDocumentFragment()
    for (const char of text) {
      if (char !== " " && Math.random() < probability) {
        const span = document.createElement("span")
        span.className = "corrupted-letter"
        span.textContent = char
        if (state.level >= 3) {
          const dy = (Math.random() > 0.5 ? -1 : 1) * (2 + Math.random() * 2)
          span.style.transform = `translateY(${dy.toFixed(1)}px) translateX(-0.5px)`
          span.style.lineHeight = (0.72 + Math.random() * 0.52).toFixed(2)
        }
        frag.appendChild(span)
        hasCorruption = true
      } else {
        frag.appendChild(document.createTextNode(char))
      }
    }
    if (hasCorruption) { p.textContent = ""; p.appendChild(frag) }
  })
}

// ─── Main ─────────────────────────────────────

function evaluateCorruption(): void {
  const el = document.getElementById("polvo-corruption-tracker")
  if (!el) return

  const currentSlug = el.getAttribute("data-slug") ?? ""
  const state = loadCorruption()
  const tokens = loadTokenStore()
  const prevLevel = state.level

  if (state.level === 0 && "corrupcion:nivel-1" in tokens) {
    state.level = 1; state.unlockedAt[1] = Date.now(); state.seenSlugs = []
  }
  if (state.level >= 1 && currentSlug && !state.seenSlugs.includes(currentSlug)) {
    state.seenSlugs.push(currentSlug)
  }
  const pagesPostUnlock = state.seenSlugs.length
  if (state.level === 1 && pagesPostUnlock >= 10) { state.level = 2; state.unlockedAt[2] = Date.now() }
  if (state.level === 2 && pagesPostUnlock >= 20) { state.level = 3; state.unlockedAt[3] = Date.now() }

  saveCorruption(state)
  applyCorruptionToDOM(state.level)
  startParticles(state.level)
  scheduleGlitch(state.level)

  if (state.level > prevLevel) showCorruptionToast(state.level)
  requestAnimationFrame(corruptRandomLetters)
}

document.addEventListener("nav", evaluateCorruption)
