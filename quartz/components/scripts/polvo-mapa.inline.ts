function getMapTokens(): Set<string> {
  try {
    const raw = localStorage.getItem("polvo:tokens")
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set() : new Set(Object.keys(parsed as Record<string, number>))
  } catch {
    return new Set()
  }
}

function revealMapMarkers(): void {
  const tokens = getMapTokens()

  document.querySelectorAll<SVGGElement>(".mapa-marker.is-hidden").forEach((marker) => {
    const requiere = (marker.getAttribute("data-requiere") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (requiere.length === 0 || requiere.every((t) => tokens.has(t))) {
      marker.classList.remove("is-hidden")
      marker.classList.add("is-visible")
    }
  })

  // Click handlers for all navigable markers
  document
    .querySelectorAll<SVGGElement>(".mapa-marker.is-public, .mapa-marker.is-visible")
    .forEach((marker) => {
      const href = marker.getAttribute("data-href")
      if (!href) return
      ;(marker as any)._mapaClickBound = () => {
        window.location.href = href
      }
      marker.style.cursor = "pointer"
      marker.addEventListener("click", (marker as any)._mapaClickBound)
    })
}

document.addEventListener("nav", revealMapMarkers)
revealMapMarkers()
