# Sala de Vigilancia (Módulo Operaciones) — Notas de progreso

Reencuadre del Módulo de Operaciones como **Sala de Vigilancia** de CENVAC: el jugador es
despachador, ve a la unidad asignada reconocer un sector en vivo (blip sobre mapa real),
con peligro derivado del bestiario, contactos/asaltos, decisiones a Control y coms con voz.
Rama: `feature/sala-de-vigilancia`. Brief original: `_incoming/operaciones-sala-de-vigilancia.md`.

---

## Dónde estamos (hecho ✓)

- **Fase 0 — Auditoría.** Inventario del módulo previo (scan/coms/briefing).
- **Fase 1 — Auto-armado de equipo.** El jugador ya no elige agentes; el sistema los asigna por
  protocolo/disponibilidad. La identidad se revela mínima en el briefing y el **expediente completo
  + "lo que perdura"** (heridas/cordura/cicatrices que se arrastran) sale en el reporte.
- **Fase 2 — Grafo + A\* + ecología de peligro.**
  - `grafo-centro.json`: grafo curado de calles reales del centro (163 nodos / 204 aristas), con
    `clase` de calle y flag `mercado` por arista. Horneado desde OSM/Overpass.
  - `js/pathfinding.js`: A\* vanilla (peso = distancia × peligro).
  - `ecologia-peligro.json` + `js/peligro.js`: el peligro de cada calle sale del bestiario
    (criatura × hora × feature). Gusano en el asfalto 11–15h; Chacal en el corredor del mercado
    10–22h `[PROPUESTA]`. El mapa "respira" con la hora.
- **Fase 3 — Sala de vigilancia (flujo real).**
  - Mapa principal `index.html` = **malla de cuadrantes 3×3**; solo el CENTRO es operable
    (tiene grafo). Click → briefing → sala. **Se eliminó el scan y el flujo de coms.**
  - `sala.html` + `js/ui-sala.js`: despacho en vivo. Recon de puntos (**intel / rastro / nada**),
    contactos ocultos que se revelan por proximidad y **asaltos multi-fase** (QTE encadenados,
    algunos de dos teclas), **decisiones a Control** con temporizador y **efectos que pesan**
    (ruido→revela contacto, fatiga→merma cordura, intel→+1), indicador de Unidad en el HUD.
    Al **EXTRAER** se cierra a `reporte.html` con intel + bajas/heridas.
- **Audio.**
  - **SFX + ambiente** sintetizados con WebAudio (drone de dread, ping, alarma, impacto, intel…).
  - **Voz del códec**: reproduce **clips pre-renderizados de ElevenLabs** (horneados, ver abajo)
    pasados por una **cadena de radio** (banda angosta + estática + squelch). Fallback a TTS del
    navegador (robótico) para líneas dinámicas o sin clip.
  - **Slider de volumen** maestro + botón mute en el HUD.

---

## Qué falta / backlog

**Audio (afinar):**
- La voz de ElevenLabs suena mejor pero **aún hay que afinar el sentimiento**. Palancas:
  bajar `stability` (0.3 → 0.2), probar otras voces más expresivas, o usar **modelo v3**
  (los tags `[urgent]`/`[nervous]`/etc. ya están en el bake, solo aplican en v3).
- Balancear capas por separado (voz vs drone vs SFX) si alguna resalta.

**Contenido / datos:**
- **Mementos** en los POIs (fragmento humano VERSION_B, §1.8) — el paso 2 del recon; aún no está.
- **Grafos de otros cuadrantes** para activarlos (hoy solo el centro tiene cartografía).
- **Ecología de más criaturas** (mosca no tiene regla; "Fulgor" no existe aún).
- **Criatura/contexto por cuadrante** (cada zona con su amenaza real).
- Más líneas de coms / variedad; más tipos de decisión y QTE.

**Técnico / limpieza:**
- `coms.html` / `movil.html` quedaron **huérfanos** (descartados del flujo) — se pueden borrar.
- El flujo completo `index → briefing → sala → reporte` está sin verificación exhaustiva en
  navegador; puede haber bugs de runtime por cazar.
- `git push` cuando se quiera publicar (aún sin push).

---

## Cómo regenerar las voces (bake de ElevenLabs)

Las voces del códec son **MP3 pre-renderizados** que viven en el repo
(`content/operaciones/assets/audio/coms/`). Se hornean **offline** con tu API key (la key
**nunca** se commitea; vive solo en tu terminal). Script: `scripts/bake-coms-voz.mjs`.

### Voces usadas (ElevenLabs voice IDs)

| Rol | Voz | voice_id |
|---|---|---|
| Control | Alberto Rodríguez — Serious, Narrative | `l1zE9xgNpUTaQCZzpNJa` |
| Líder | Flavio Francisco — Deep and Captivating | `x6uRgOliu4lpcrqMH3s1` |
| Miembro | Mauricio — Calm and Conversational | `94zOad0g7T7K4oa7zhDq` |

### Comando (PowerShell, desde la raíz del repo)

```powershell
$env:ELEVEN_API_KEY       = "sk_TU_KEY"          # tu key; no se guarda en ningún archivo
$env:ELEVEN_VOICE_CONTROL = "l1zE9xgNpUTaQCZzpNJa"
$env:ELEVEN_VOICE_LIDER   = "x6uRgOliu4lpcrqMH3s1"
$env:ELEVEN_VOICE_MIEMBRO = "94zOad0g7T7K4oa7zhDq"
$env:ELEVEN_FORCE         = "1"                  # regenera aunque el clip ya exista (opcional)
# $env:ELEVEN_MODEL       = "eleven_v3"          # opcional: emoción por tags (si tenés acceso a v3)
node scripts/bake-coms-voz.mjs
```

### Notas del bake

- **Listar tus voces** (valida la key y da los voice_id):
  ```powershell
  (Invoke-RestMethod -Headers @{ "xi-api-key" = $env:ELEVEN_API_KEY } "https://api.elevenlabs.io/v1/voices").voices | Select-Object name, voice_id
  ```
- Sin `ELEVEN_FORCE`, el bake es **incremental** (salta los clips que ya existen). Con `=1`, regenera todo.
- Cada línea del array `LINEAS` es `[rol, texto, tag_emocion]`. El **texto debe coincidir** con el
  de `js/ui-sala.js` (la clave del MP3 se calcula de `rol+texto` vía `js/coms-hash.js`). El `tag`
  entre `[...]` solo se usa con modelo **v3**.
- Expresividad: `voice_settings` en el script (`stability` bajo = más emoción, `style`, `speaker_boost`).
- Genera ~45 MP3 + `manifest.json`. La sala reproduce el clip si su clave está en el manifiesto;
  si no (líneas dinámicas con nombre de calle), cae al TTS del navegador.
- **Los MP3 sí se commitean** (son el asset de prod). La única que jamás se commitea es la API key.
