# Sala de Vigilancia (Módulo Operaciones) — Notas de progreso

Reencuadre del Módulo de Operaciones como **Sala de Vigilancia** de CENVAC: eres despachador,
ves a la unidad asignada reconocer un sector en vivo (blip sobre mapa real), con peligro
derivado del bestiario, contactos, asaltos, decisiones a Control y coms con voz sintetizada.

- Rama: `feature/sala-de-vigilancia` (pusheada).
- Brief original: `_incoming/operaciones-sala-de-vigilancia.md`.
- Servidor: `npx quartz build --serve` **desde la raíz del repo** → http://localhost:8080/operaciones/

Última actualización: **18 jul 2026**.

---

## Estado: Fases 0–5 completas

| Fase | Qué es | Estado |
|---|---|---|
| 0 | Auditoría del módulo previo | ✓ |
| 1 | Auto-armado de unidad + expediente al cierre | ✓ |
| 2 | Grafo + A\* + ecología de peligro | ✓ |
| 3 | Sala de vigilancia con blips | ✓ |
| 4 | Mementos en el mapa | ✓ mecánica · contenido a medias |
| 5 | Voz / coms | ✓ procedural |

### Lo que hay hoy

**Mapa.** Malla de **9 distritos × 80 sectores** (~667 × 619 m cada uno), cubriendo unos
6.0 × 5.6 km de Aguascalientes. Navegación de dos niveles: la vista general muestra distritos,
entras a uno y se abre en sus sectores. Cada sector tiene su grafo de calles horneado desde
OSM, con la traza real (`pts`) y podado a su componente conexa mayor.

**Identidad por sector.** Los features de terreno (mercado, rejilla, parque, industria,
panteón) se marcan en las aristas a partir de datos reales de OSM, y cruzados con los biomas
del bestiario deciden qué criatura habita cada sector: cervato 34, gusano 22, rata 9, chacal 6,
cucaracha 5, araña 4. **La hora de cada sector cae dentro de la banda activa de su criatura**,
para que la amenaza reportada sea la que de verdad caza a esa hora.

**Nombres.** 63 sectores se llaman por su hito real (mercado, hospital, panteón, templo,
parque, monumento) y 17 por su calle más larga.

**§1.7 — peligro parcial.** Lo que se **pinta** y lo que el A\* usa para rutear es el peligro
*conocido*; lo que se **cobra** durante la marcha y al llegar es el *real*. Las calles sin
reportar van en punteado gris, no en verde: mentir convertiría la mecánica en trampa barata.
El intel dejó de ser un contador — reconocer un punto revela 180 m de cartografía.

**§3.2 — órdenes de protocolo.** REPLEGARSE / MANTENER / ABORTAR, con **latencia** (4.2 s /
2.4 s / 6 s). La orden no ocurre: se transmite. Y si la unidad está en contacto, **espera** en
vez de descartarse.

**Audio.** Todo procedural: voz de códec, ambiente reactivo a la tensión, música por estados,
más ocho grabaciones reales de SFX. La cama hace *ducking* cuando suena un evento.

**Coms.** Banco en `data/operaciones/coms.json`: 119 líneas + 8 decisiones. Los pozos se
arman por **franja horaria × criatura**, y no se repite nada dentro de una misma operación.

**Mementos (§1.8).** `sites.json` con 608 sitios reales con nombre, repartidos en los 80
sectores. Los puntos de recon se anclan a edificios, así que la unidad va *a un lugar*. Al
llegar puede aflorar un memento: panel serif, cálido, papel — sin cromo de radio, sin beeps.
Se detiene la marcha y calla la radio. Ese cambio de registro es el mecanismo central.

---

## Lo siguiente (en orden de impacto)

### 1. Mementos Clase 1 — autoría de Fabián
Los VERSION_B canónicos periféricos de los cinco sujetos, donde CENVAC marca pero no comenta.
La mecánica ya está lista y esperando; solo falta el texto. Van en
`data/operaciones/mementos.json` con `"clase": 1`.

### 2. Curar los 24 borradores Clase 2
Están marcados `[BORRADOR — PENDIENTE DE CURADURÍA]` en el `_meta` del archivo. Se escribieron
como punto de partida: algunos van a funcionar y otros seguramente no. Son anónimos,
autocontenidos, y ninguno toca lo sobrenatural ni ████-A.

### 3. Cerrar el círculo del memento con el reporte
Los mementos hallados ya se guardan en `mementosHallados` dentro de `ui-sala.js`, pero **aún
no se muestran en el reporte final**. Que una operación deje bajas *y* deje esto es
probablemente el incremento que más se va a sentir, y es trabajo chico.

### 4. Más reglas de ecología
Solo **5 de las 17** criaturas del bestiario tienen biomas documentados. Las otras 12 son
fichas en "archivo incompleto", y deliberadamente **no se les inventó hábitat**. Si les
escribes biomas en la ficha, las reglas de `ecologia-peligro.json` salen casi solas.

### 5. Calibrar la cartografía inicial
Hoy el sector arranca con ~11% conocido. Puede sentirse demasiado oscuro; conviene juzgarlo
a ojo ahora que las calles se dibujan con su traza real. Se ajusta con los radios de siembra
en `ui-sala.js` (110 m entrada / 130 m foco).

### Backlog menor
- Los sonidos grabados son provisionales: hacen falta muchas variantes por sonido para que el
  reproductor las alterne, y firma sonora por criatura (identificarlas de oído antes de verlas).
- Grafos más allá de la malla actual, si se quiere cubrir más ciudad.

---

## Reglas de autoría (no romper)

- **Solo se escriben reglas de ecología para criaturas con biomas documentados** en su ficha.
  Inventarle hábitat a un placeholder es inventar canon.
- Todo lo inventado va marcado `[PROPUESTA DE CANON — REQUIERE APROBACIÓN]`.
- **El texto de misión nunca se hardcodea** (§1.9): sale de los bancos.
- Los mementos Clase 2 jamás tocan lo sobrenatural, ████-A ni el meta-misterio.
- Las voces son **agentes de CENVAC anónimos**, nunca los cinco sujetos (§2.1).
- Español de México. Nada de voseo.

---

## Trampas de este repo (costaron tiempo real)

- **Nunca uses `Set-Content` de PowerShell** sobre archivos con acentos: relee el UTF-8 mal y
  deja todo doble-codificado (`â€"`). Usar node con `utf8` explícito o la herramienta de edición.
- **Here-strings de PowerShell** (`@'…'@`): el `'@` va **solo en su línea**, y el contenido no
  puede llevar comillas dobles — git recibe la cola como si fuera un nombre de archivo.
- **`grep` con clases de caracteres acentuados** (`pon[eé]s`) falla en UTF-8 multibyte. Buscar
  la palabra literal.
- **Quartz**: el watcher muere al borrar archivos que él ya quitó de `public/`. Relanzarlo
  **siempre desde la raíz del repo**. Si el puerto 8080 responde `EADDRINUSE`, el server viejo
  sigue vivo y ya recompiló — no hace falta relanzar.
- **Todo grafo nuevo debe podarse a su componente conexa mayor.** Un nodo visible pero
  inalcanzable produce un click que no hace nada: el peor fallo posible, el silencioso.
- Verificar no solo que los archivos existan, sino **que exista lo que el código va a pedir**.
  El saneador de slug se comía el guion bajo y `sm4_0` terminaba pidiendo `sm40` → 404.
- `fetchJSON` **lanza** en 404, no devuelve `null`. Sin `.catch()`, la página se queda colgada
  en "cargando sector…" en vez de volver a la malla.

---

## Cómo regenerar los datos

Los scripts de horneado viven en el scratchpad de la sesión y **no se commitean**. Lo que sí
queda en el repo es la **procedencia**: cada `grafo-*.json` trae en su `_meta` la consulta
Overpass exacta con la que se generó, así que se puede rehacer sin adivinar.

Fuentes usadas, todas OpenStreetMap vía Overpass API (requiere `User-Agent` y `POST`; con
`GET` a secas responde 406):

- **Calles** — `way["highway"](bbox)` sobre la malla completa, en una sola consulta.
- **Features y sitios** — mercados, cauces, parques, industria, panteones, y todo lo que tenga
  nombre (`amenity`, `leisure`, `landuse`, `historic`, `building` con `name`).

Bbox de la malla 9×9 (S, W, N, E): `21.854, -102.3242, 21.908, -102.2702`.
