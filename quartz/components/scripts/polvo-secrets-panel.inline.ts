function getTokenStore(): Record<string, number> {
  try {
    const raw = localStorage.getItem("polvo:tokens")
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? {} : (parsed as Record<string, number>)
  } catch {
    return {}
  }
}

function updatePanel(): void {
  const countEl = document.getElementById("secrets-count") as HTMLElement | null
  if (!countEl) return

  const store = getTokenStore()
  const tokens = new Set(Object.keys(store))

  // Count pages with all requirements satisfied
  let unlocked = 0
  document.querySelectorAll<HTMLElement>(".secrets-item[data-requiere]").forEach((item) => {
    const reqs = (item.dataset.requiere ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    if (reqs.length && reqs.every((t) => tokens.has(t))) unlocked++
  })

  countEl.textContent = String(unlocked)
  countEl.classList.toggle("has-tokens", unlocked > 0)
}

document.addEventListener("nav", updatePanel)
