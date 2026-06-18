const ACCESS_KEY = "ape-archive-code"

const CHARACTER_PATHS: Record<string, string> = {
  "F01": "fabian",
  "F02": "felipe",
  "F03": "gaby",
  "F04": "aaron",
  "F05": "carlos",
}

function getStoredCode(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

function applyAccess(code: string) {
  localStorage.setItem(ACCESS_KEY, code)
  document.documentElement.setAttribute("data-access", code)
}

// Directly hide index cards and restricted sidebar items via JS (more reliable than CSS+timing)
function filterPage(code: string) {
  const myChar = `char-${code.toLowerCase()}`
  document.querySelectorAll<HTMLElement>(".index-subject-card").forEach((card) => {
    card.style.display = card.classList.contains(myChar) ? "" : "none"
  })
}

function isRestrictedPage(): string | null {
  const path = window.location.pathname
  for (const slug of Object.values(CHARACTER_PATHS)) {
    if (path.includes(`/personajes/${slug}`)) return slug
  }
  return null
}

function showAccessDenied() {
  const article = document.querySelector<HTMLElement>("article")
  if (!article) return
  article.innerHTML = `
    <div class="access-denied-block">
      <div class="access-denied-stamp">APE — ACCESO RESTRINGIDO</div>
      <div class="access-denied-code">ERROR 403 — Credenciales insuficientes</div>
      <p class="access-denied-msg">El expediente solicitado no corresponde a sus credenciales de archivo.<br>Contacte al administrador del sistema si cree que esto es un error.</p>
      <div class="access-denied-footer">// Intento de acceso registrado</div>
    </div>
  `
}

function checkPageAccess(code: string) {
  const mySlug = CHARACTER_PATHS[code]
  const restricted = isRestrictedPage()
  if (restricted && restricted !== mySlug) {
    showAccessDenied()
  }
}

function showGate() {
  const gate = document.getElementById("access-gate")
  if (gate) gate.style.display = "flex"
}

function hideGate() {
  const gate = document.getElementById("access-gate")
  if (gate) gate.style.display = "none"
}

function handleSubmit() {
  const input = document.getElementById("access-gate-input") as HTMLInputElement
  const error = document.getElementById("access-gate-error")
  const raw = (input?.value ?? "").trim().toUpperCase()

  if (CHARACTER_PATHS[raw]) {
    applyAccess(raw)
    hideGate()
    filterPage(raw)
    checkPageAccess(raw)
  } else {
    if (error) {
      error.textContent = "// Código no reconocido — intente de nuevo"
      error.style.display = "block"
    }
    if (input) input.value = ""
  }
}

function wireGateButtons() {
  const btn = document.getElementById("access-gate-submit")
  const input = document.getElementById("access-gate-input") as HTMLInputElement
  btn?.addEventListener("click", handleSubmit)
  input?.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSubmit() })
  window.addCleanup?.(() => btn?.removeEventListener("click", handleSubmit))
}

// ── Boot ──────────────────────────────────────────

const stored = getStoredCode()
if (stored && CHARACTER_PATHS[stored]) {
  applyAccess(stored)
} else {
  showGate()
}

wireGateButtons()

document.addEventListener("nav", () => {
  const code = getStoredCode()
  if (!code || !CHARACTER_PATHS[code]) {
    showGate()
    return
  }
  applyAccess(code)
  filterPage(code)
  checkPageAccess(code)
  wireGateButtons()
})
