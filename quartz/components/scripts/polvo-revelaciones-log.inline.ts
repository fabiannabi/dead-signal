type PageEntry = {
  slug: string
  title: string
  href: string
  requiere: string[]
}
type SourceEntry = { slug: string; title: string; href: string }
type Manifest = { entries: PageEntry[]; sources: Record<string, SourceEntry> }

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

function renderLog(): void {
  const manifestEl = document.getElementById("revelaciones-manifest")
  const container = document.getElementById("revelaciones-content")
  if (!manifestEl || !container) return

  const manifest: Manifest = JSON.parse(manifestEl.getAttribute("data-manifest") ?? '{"entries":[],"sources":{}}')
  const store = getTokenStore()
  const tokens = new Set(Object.keys(store))

  // Pages with all requirements satisfied
  const revealed = manifest.entries
    .filter((e) => e.requiere.length > 0 && e.requiere.every((t) => tokens.has(t)))
    .map((e) => {
      // Token acquired most recently → that's what "triggered" the unlock
      const triggerToken = e.requiere.reduce((latest, t) =>
        (store[t] ?? 0) > (store[latest] ?? 0) ? t : latest,
      )
      const source = manifest.sources[triggerToken] ?? null
      const ts = store[triggerToken] ?? 0
      return { ...e, source, ts }
    })
    .sort((a, b) => b.ts - a.ts) // most recently unlocked first

  const emptyEl = container.querySelector(".revelaciones-empty") as HTMLElement | null
  container.querySelectorAll(".revelacion-entry").forEach((el) => el.remove())

  if (revealed.length === 0) {
    if (emptyEl) emptyEl.style.display = ""
    return
  }

  if (emptyEl) emptyEl.style.display = "none"

  const fragment = document.createDocumentFragment()

  for (const item of revealed) {
    const card = document.createElement("div")
    card.className = "revelacion-entry"

    const dateStr = item.ts
      ? new Date(item.ts).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : ""

    const sourceHtml = item.source
      ? `al visitar <a href="${item.source.href}" class="revelacion-trigger-link">${item.source.title}</a>`
      : ""

    card.innerHTML = `
      <div class="revelacion-header">
        <span class="revelacion-glyph">✦</span>
        <span class="revelacion-label">Pista revelada en</span>
        <a href="${item.href}" class="revelacion-dest-link">${item.title}</a>
      </div>
      <div class="revelacion-meta">
        ${sourceHtml}${dateStr ? `<span class="revelacion-date">${dateStr}</span>` : ""}
      </div>
    `

    fragment.appendChild(card)
  }

  container.appendChild(fragment)
}

document.addEventListener("nav", renderLog)
renderLog()
