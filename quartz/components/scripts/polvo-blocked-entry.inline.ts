function getBlockedTokenSet(): Set<string> {
  try {
    const raw = localStorage.getItem("polvo:tokens")
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set() : new Set(Object.keys(parsed as Record<string, number>))
  } catch {
    return new Set()
  }
}

function checkBlockedEntry(): void {
  const blocked = document.getElementById("entrada-bloqueada") as HTMLElement | null
  if (!blocked) return

  const requiere = (blocked.getAttribute("data-requiere") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!requiere.length) return

  const tokens = getBlockedTokenSet()
  const isBlocked = !requiere.every((t) => tokens.has(t))
  const article = document.querySelector<HTMLElement>("article")

  if (isBlocked) {
    blocked.style.display = ""
    if (article) article.style.display = "none"

    // Resolve return link: prefer data-parent, then same-origin referrer, then "/"
    const returnLink = document.getElementById("entry-blocked-return") as HTMLAnchorElement | null
    if (returnLink) {
      const parent = blocked.getAttribute("data-parent")
      if (!parent) {
        try {
          if (document.referrer) {
            const ref = new URL(document.referrer)
            if (ref.origin === window.location.origin) {
              returnLink.setAttribute("href", document.referrer)
            }
          }
        } catch {}
      }
    }

    // Apply corruption variant if available
    const variantsRaw = blocked.getAttribute("data-variants")
    if (variantsRaw) {
      try {
        const variants = JSON.parse(variantsRaw) as Record<string, string>
        const corruption = parseInt((document.body as HTMLElement & { dataset: DOMStringMap }).dataset.corruption ?? "0", 10)
        const key = `corruption-${corruption}`
        if (variants[key]) {
          const content = blocked.querySelector<HTMLElement>(".entry-blocked-content")
          if (content) content.innerHTML = variants[key]
        }
      } catch {}
    }
  }
}

document.addEventListener("nav", checkBlockedEntry)
