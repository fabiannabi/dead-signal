// Storage format: { [token]: unix-timestamp-ms }
const STORAGE_KEY = "polvo:tokens"

function getTokenStore(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Migrate legacy array format
    if (Array.isArray(parsed)) {
      const migrated: Record<string, number> = {}
      parsed.forEach((t: string) => (migrated[t] = 0))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      return migrated
    }
    return parsed as Record<string, number>
  } catch {
    return {}
  }
}

function getTokenSet(): Set<string> {
  return new Set(Object.keys(getTokenStore()))
}

function addTokens(incoming: string[]): string[] {
  const store = getTokenStore()
  const fresh = incoming.filter((t) => !(t in store))
  if (fresh.length) {
    const now = Date.now()
    fresh.forEach((t) => (store[t] = now))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }
  return fresh
}

function checkApocryphal(): string[] {
  try {
    const el = document.getElementById("polvo-all-tokens")
    if (!el) return []
    const allBase: string[] = JSON.parse(el.getAttribute("data-tokens") ?? "[]")
    if (allBase.length === 0) return []
    const store = getTokenStore()
    if ("nivel:apocrif0" in store) return []
    if (!allBase.every((t) => t in store)) return []
    return addTokens(["nivel:apocrif0"])
  } catch {
    return []
  }
}

function unlockContent(): void {
  const tokens = getTokenSet()

  document.querySelectorAll<HTMLElement>(".locked-section[data-requiere]").forEach((el) => {
    const reqs = (el.dataset.requiere ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (reqs.length && reqs.every((t) => tokens.has(t))) {
      el.classList.add("is-unlocked")
    }
  })

  document.querySelectorAll<HTMLElement>(".redacted-text[data-token]").forEach((el) => {
    if (tokens.has(el.dataset.token ?? "")) {
      el.classList.add("is-revealed")
    }
  })
}

function showToast(fresh: string[]): void {
  if (!fresh.length) return

  document.querySelector(".polvo-toast")?.remove()

  const toast = document.createElement("div")
  toast.className = "polvo-toast"
  let msg: string
  if (fresh.includes("nivel:apocrif0")) {
    msg = "Nivel apócrifo desbloqueado"
  } else {
    msg = fresh.length === 1 ? "Nuevo fragmento revelado" : `${fresh.length} fragmentos revelados`
  }
  toast.innerHTML = `<span class="toast-glyph">✦</span><span class="toast-msg">${msg}</span>`
  document.body.appendChild(toast)

  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("is-visible")))

  setTimeout(() => {
    toast.classList.remove("is-visible")
    setTimeout(() => toast.remove(), 500)
  }, 3500)
}

function showKonamiOverlay(isNew: boolean): void {
  document.querySelector(".konami-overlay")?.remove()

  const overlay = document.createElement("div")
  overlay.className = "konami-overlay"
  const msg = isNew ? "El Desierto te escucha." : "Ya conoces el nombre."
  overlay.innerHTML = `
    <div class="konami-inner">
      <div class="konami-glyph">&#x27C1;</div>
      <p class="konami-msg">${msg}</p>
      <p class="konami-sub">La frontera entre los vivos y lo que espera se ha vuelto m&#225;s delgada.</p>
      <p class="konami-hint">[ haz clic para cerrar ]</p>
    </div>
  `
  document.body.appendChild(overlay)
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-visible")))
  overlay.addEventListener("click", () => {
    overlay.classList.remove("is-visible")
    setTimeout(() => overlay.remove(), 600)
  })
}

function init(): void {
  const el = document.getElementById("polvo-discovery")
  if (!el) return
  const incoming: string[] = JSON.parse(el.getAttribute("data-tokens") ?? "[]")
  const freshPage = addTokens(incoming)
  const freshApoc = checkApocryphal()
  unlockContent()
  showToast([...freshPage, ...freshApoc])
}

// Konami code listener — set up once at module level, persists across SPA navigations
const KONAMI_SEQ = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
]
let konamiIdx = 0
document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === KONAMI_SEQ[konamiIdx]) {
    konamiIdx++
    if (konamiIdx === KONAMI_SEQ.length) {
      konamiIdx = 0
      const freshKonami = addTokens(["secreto:konami"])
      showKonamiOverlay(freshKonami.length > 0)
    }
  } else {
    konamiIdx = e.key === KONAMI_SEQ[0] ? 1 : 0
  }
})

document.addEventListener("nav", init)
