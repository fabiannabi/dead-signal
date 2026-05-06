# Señal Muerta — CLAUDE.md

Proyecto de narrativa post-apocalíptica presentado como un archivo documental ficticio.
La historia ocurre en Aguascalientes, México, tras un evento llamado "la Emergencia".
El sitio es HTML/CSS/JS estático, sin frameworks ni build tools.

---

## Estructura del repositorio

```
dead-signal/
├── index.html                  ← Portada principal: grid de navegación a personajes y secciones
├── README.md
├── CLAUDE.md
├── _incoming/                  ← Carpeta de entrada para contenido nuevo (ver flujo abajo)
│   └── README.md
└── senal-muerta/
    ├── css/
    │   └── style.css           ← Hoja de estilos compartida (todas las páginas excepto index.html)
    ├── js/
    │   └── main.js             ← switchVersion() y switchChapter() compartidos
    ├── assets/
    │   ├── audio/
    │   │   └── bestiario/
    │   │       └── [slug-criatura]/    ← vocal-normal-01.mp3, narrador-muestra-17.mp3…
    │   └── img/
    │       └── bestiario/
    │           └── [slug-criatura]/    ← morfologia-diagrama.png, boceto-01.png…
    ├── personajes/
    │   ├── fabian/
    │   │   ├── index.html      ← F-01 ficha + nav
    │   │   ├── cap-01.html
    │   │   ├── cap-02.html
    │   │   ├── cap-03.html
    │   │   └── cap-04.html
    │   ├── felipe/
    │   │   ├── index.html      ← F-02 ficha + nav
    │   │   └── cap-01.html … cap-04.html
    │   ├── gaby/
    │   │   ├── index.html      ← F-03 ficha + nav
    │   │   └── cap-01.html
    │   ├── aaron/
    │   │   └── index.html      ← F-04 pendiente
    │   └── carlos/
    │       ├── index.html      ← F-05 ficha + nav
    │       └── cap-01.html … cap-04.html
    ├── bestiario/
    │   └── index.html          ← Esqueleto, sin contenido aún
    ├── cartografia/
    │   └── index.html          ← Esqueleto, sin contenido aún
    └── cronologia/
        └── index.html          ← Esqueleto, sin contenido aún
```

---

## Convenciones de nombres

- Carpetas y archivos: `kebab-case`, en español, sin tildes ni espacios
- Cada personaje tiene su propia carpeta (`fabian/`, `felipe/`, etc.)
- Dentro de cada carpeta: `index.html` (ficha) + `cap-01.html`, `cap-02.html`… (un archivo por capítulo)
- Capítulos nuevos: nombrar `cap-XX.html` con dos dígitos
- Secciones temáticas: carpeta con nombre descriptivo + `index.html` dentro
- Assets: dentro de `senal-muerta/assets/` en subcarpeta por tipo (`img/`, `audio/`)

### Paths desde las páginas de personaje

Desde `senal-muerta/personajes/fabian/cap-01.html` (o cualquier `cap-XX.html` o `index.html` de personaje):

```
../../css/style.css      ← CSS compartido
../../js/main.js         ← JS compartido
../../../index.html      ← portada raíz
index.html               ← ficha del personaje (desde un cap-XX.html)
cap-01.html              ← capítulo hermano (misma carpeta)
```

---

## CSS y estilo visual

`index.html` tiene CSS inline en el `<head>` — no moverlo, es intencional.

Todas las demás páginas usan archivos externos. El path varía según la profundidad:

| Ubicación | CSS | JS |
|---|---|---|
| `senal-muerta/personajes/nombre/` | `../../css/style.css` | `../../js/main.js` |
| `senal-muerta/bestiario/`, `cartografia/`, `cronologia/` | `../css/style.css` | `../js/main.js` |

No agregar CSS inline ni `<style>` en ninguna página que no sea `index.html`.
No agregar `<script>` inline en ninguna página que no sea `index.html`.

### Paleta (variables CSS)
```css
--bg: #0a0a08       /* fondo principal */
--bg2: #0f0f0c      /* fondo secundario */
--bg3: #141410      /* fondo terciario */
--border: #2a2a22
--border2: #3a3a2a
--text: #c8c4a8     /* texto principal */
--text2: #8a8670    /* texto secundario */
--text3: #5a5648    /* texto terciario / labels */
--accent: #c8a84a   /* dorado, títulos y énfasis */
--accent2: #8a6a2a  /* dorado oscuro, bordes de acento */
--red: #8a3a2a
--green: #4a6a3a
```

### Tipografía
- `Share Tech Mono` — monospace, para códigos, labels, UI
- `Crimson Pro` — serif, para cuerpo narrativo
- Ambas se importan desde Google Fonts en `style.css`

### Componentes clave en páginas de personaje

- **`index.html` del personaje** — solo ficha de archivo + nota del archivista + links a capítulos. Sin toggle A/B.
- **`cap-XX.html`** — cada capítulo tiene su propio archivo con toggle A/B (Archivo / Original) y una barra `chapter-tabs` con links a los demás capítulos del mismo personaje
- `.redacted` para texto censurado visualmente
- Textura de ruido SVG como `body::before` fixed, `z-index: 1000`
- Header sticky con logo; el toggle A/B solo aparece en capítulos, no en el `index.html` del personaje

### Bloques de notas — clases modificadoras de `field-notes-block`

El label flotante del bloque se controla con una clase semántica. Usar siempre una de estas:

| Clase | Label renderizado | Uso |
|---|---|---|
| `.field-notes-block.field` | `TRANSCRIPCIÓN — LIBRETA ORIGINAL` | Libreta de campo (Fabián) |
| `.field-notes-block.clinical` | `NOTAS CLÍNICAS DE CAMPO — TRANSCRIPCIÓN` | Notas clínicas (Felipe) |
| `.field-notes-block.personal` | `LIBRETA PERSONAL — TRANSCRIPCIÓN` | Diario personal (cualquier personaje) |
| `.field-notes-block.audio` | `NOTA DE VOZ — TRANSCRIPCIÓN` | Notas de voz (Carlos) |

Sin modificador: label genérico `TRANSCRIPCIÓN`. Añadir un modificador nuevo a `style.css` si un personaje futuro requiere otro tipo de registro.

### Estructura mínima de un capítulo nuevo (`cap-XX.html`)

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>F-0X / Cap. 0N — Señal Muerta</title>
<link rel="stylesheet" href="../../css/style.css">
</head>
<body>

<header class="site-header">
  <div class="site-header-inner">
    <a href="../../../index.html" class="site-logo">APE — <span>SEÑAL MUERTA</span></a>
    <div class="version-toggle">
      <button class="version-btn active" onclick="switchVersion('a')">Versión A — Archivo</button>
      <button class="version-btn" onclick="switchVersion('b')">Versión B — Original</button>
    </div>
  </div>
</header>

<div class="container">

  <div class="chapter-tabs">
    <a class="chapter-tab" href="index.html">F-0X Nombre</a>
    <a class="chapter-tab" href="cap-01.html">Cap. 01</a>
    <!-- un tab por cada capítulo existente -->
    <a class="chapter-tab active" href="cap-0N.html">Cap. 0N</a>
  </div>

  <!-- VERSIÓN A: Archivo recuperado -->
  <div class="version-panel active" id="panel-a">
    <div class="archive-stamp">Archivo de Recuperación Post-Emergencia / F-0X</div>
    <div class="chapter-header">
      <div class="chapter-code">F-0X / Documento 0N de <span class="redacted">██</span></div>
      <div class="chapter-title-a">Capítulo N — Título</div>
    </div>
    <div class="doc-body">
      <!-- contenido versión A: narrador externo reconstruye eventos con fuentes citadas -->
    </div>
  </div>

  <!-- VERSIÓN B: Documento original -->
  <div class="version-panel" id="panel-b">
    <div class="original-header">
      <div class="original-eyebrow">Señal Muerta — Crónicas de la Emergencia</div>
      <div class="original-title">Nombre del personaje</div>
      <div class="original-chapter">Capítulo N — Título</div>
    </div>
    <hr class="original-divider">
    <div class="original-body">
      <!-- contenido versión B: primera persona, voz del personaje, notas al final -->
    </div>
  </div>

  <div class="page-footer">
    <span><span class="status-dot"></span>Archivo activo</span>
    <span>F-0X / Capítulo N de TOTAL</span>
    <span><a href="../../../index.html" style="color:var(--text3); text-decoration:none;">← Volver al archivo</a></span>
  </div>
</div>

<script src="../../js/main.js"></script>
</body>
</html>
```

---

## Estilo de commits

Commits en inglés, en imperativo, minúsculas, sin punto final.
Sin prefijos (`feat:`, `fix:`, etc.).

```
add fabian cap-05
update felipe cap-03 version b
add bestiario entrada cervato
update chapter tabs all fabian
```

Patrón: verbo + objeto, descripción breve y directa de lo que cambió.
No usar `git add -A` ni `git add .` — agregar solo los archivos que corresponden al cambio.
Los archivos de `_incoming/` se eliminan tras integrar; no se commitean.

---

## Flujo de trabajo para contenido nuevo

El contenido nuevo llega como archivos `.md` en `_incoming/`. Cada archivo tiene un encabezado estructurado seguido del contenido en dos versiones.

### Formato del archivo entrante

Todo archivo en `_incoming/` sigue esta estructura exacta:

```
DESTINO: senal-muerta/personajes/[personaje]/cap-XX.html
SECCION: personajes/[personaje]
CAPITULO: N
INSTRUCCION: [descripción de la acción a realizar]
ARCHIVO: _incoming/[nombre-del-archivo].md
---
VERSION_B: DOCUMENTO ORIGINAL

[Contenido en primera persona, voz del personaje.
Recap fragmentado del día o período.
Notas al final en el formato propio del personaje.
Tono amateur, directo, sin narrativa pulida.]

---

VERSION_A: ARCHIVO RECUPERADO

[Reconstrucción por analistas del futuro.
Citan fuentes: "De acuerdo con documentos recuperados en..."
Cruzan datos de varios sujetos.
Llenan lagunas con inferencias marcadas como tales.
Usan redacciones parciales donde corresponde.]
```

### Mapeo de versiones a HTML

| Sección del .md | Destino HTML |
|---|---|
| `VERSION_B` | `<div class="version-panel" id="panel-b">` → dentro de `.original-body` |
| `VERSION_A` | `<div class="version-panel active" id="panel-a">` → dentro de `.doc-body` |

### Mapeo de bloques de notas por personaje

Cada personaje tiene un formato propio de notas. Al encontrar un bloque de notas en el contenido, usar la clase correspondiente:

| Personaje | Tipo de nota | Clase HTML |
|---|---|---|
| Fabián (F-01) | Libreta de campo con formato ticket/pseudocódigo | `.field-notes-block.field` |
| Felipe (F-02) | Notas clínicas en papel membretado | `.field-notes-block.clinical` |
| Felipe (F-02) | Libreta personal pequeña | `.field-notes-block.personal` |
| Gaby (F-03) | Cuaderno clínico dos columnas | `.field-notes-block.clinical` |
| Aarón (F-04) | Por definir | `.field-notes-block` |
| Carlos (F-05) | Notas de voz transcritas | `.field-notes-block.audio` |

### Separadores de sección dentro del contenido

En el texto narrativo, `---` se convierte en:
```html
<div class="section-break">— — —</div>
```

### Líneas de comentario personal (`//`)

Las líneas que empiezan con `//` son notas íntimas del personaje. Renderizar como:
```html
<div class="fn-comment">// texto aquí</div>
```

### Diálogos

Las líneas que empiezan con `—` son diálogos. Renderizar como:
```html
<span class="dialogue">— texto aquí</span>
```

### Texto redactado

El texto entre `<REDACTADO>` o marcado con `████` se renderiza como:
```html
<span class="redacted">████</span>
```

### Pasos de integración

1. **Leer el archivo en `_incoming/`** — identificar personaje, número de capítulo e instrucción
2. **Determinar el destino:**
   - Capítulo nuevo → crear `cap-XX.html` en la carpeta del personaje usando la plantilla
   - Reemplazo de capítulo existente → editar el `cap-XX.html` correspondiente
   - Bestiario u otra sección → editar el `index.html` correspondiente
3. **Si es capítulo nuevo**, actualizar también:
   - `index.html` del personaje: añadir tab `<a class="chapter-tab" href="cap-XX.html">Cap. XX — Título</a>` y actualizar footer con nuevo conteo
   - Todos los `cap-XX.html` hermanos: añadir el nuevo tab a su barra `chapter-tabs`
   - `index.html` raíz: actualizar el conteo en `.nav-item-desc` del personaje
4. **Si el personaje pasa de `disabled` a activo** en la portada, quitar la clase `disabled` del enlace en `index.html` raíz
5. **Integrar el contenido** respetando:
   - Los nombres de clase ya definidos
   - La paleta, tipografía y tono: archivo documental post-emergencia, redacciones parciales
   - VERSION_B → `.original-body` / VERSION_A → `.doc-body`
6. **Verificar paths** — desde `personajes/nombre/` usar `../../css/`, `../../js/`, `../../../index.html`
7. **Eliminar el archivo de `_incoming/`** una vez integrado — no commitear archivos de `_incoming/`
8. **Commit** con el estilo documentado:
```bash
git add <solo archivos modificados del sitio>
git commit -m "add [personaje] cap-XX"
git push
```

---

## Personajes — referencia rápida

| ID | Nombre | Profesión | Formato de notas | Capítulos actuales |
|---|---|---|---|---|
| F-01 | Fabián | Ing. Bioquímica / Programador | Ticket/pseudocódigo con `//` para comentarios personales | 4 |
| F-02 | Felipe | Médico Urgenciólogo | Notas clínicas membretadas + libreta personal pequeña | 4 |
| F-03 | Gaby | Médico Anestesiólogo | Cuaderno clínico dos columnas (sabido / no sabido) | 1 |
| F-04 | Aarón | Ing. Químico | Por definir | 0 |
| F-05 | Carlos | Ing. Biomédico / Maestro UAA | Notas de voz transcritas con pausas marcadas | 4 |

### Arquetipos clave por personaje

**Fabián (F-01)**
- Programador trabajando desde casa en San Marcos cuando ocurrió la Emergencia
- Metódico, analítico, fanático de insectos — ve la fauna con lógica de sistema
- Sus notas parecen código: etiquetas, listas, issues abiertos, comentarios con `//`
- No es biólogo — usa vocabulario técnico solo en química y programación, no en zoología
- Fuerte en acuicultura, ingeniería de alimentos, horticultura
- Necesita contacto con el grupo — manda mensajes al chat aunque no lleguen

**Felipe (F-02)**
- Estaba en el hospital cuando ocurrió — mantuvo urgencias funcionando 3 días
- Frío y metódico, no líder por elección pero actúa cuando nadie más lo hace
- Scout en juventud: sabe orientación, refugios, fuego, nudos, trampas
- Conoce historia militar y medicina histórica — piensa en defensa y territorio
- Tiene arco de caza desde la semana 2
- Dos libretas: clínica (datos) y personal (lo que no cabe en los datos)
- TDAH sin medicación correcta: impulsivo, hiperfocus en crisis (ventaja), desorganización en calma (costo). Sin atomoxetina el filtro entre impulso y acción se adelgaza.
- La atomoxetina es recurso de supervivencia tan crítico como los antibióticos — sabe que el stock que encuentre es todo lo que habrá. Cuenta regresiva implícita.
- Se culpa por pérdidas — pacientes no salvados, decisiones de triaje rápidas. El cerebro TDAH magnifica esos errores en momentos de quietud.
- El conflicto por suficiencia aparece cuando baja la presión: en crisis funciona mejor que muchos, en calma es cuando se desorganiza.
- Le duele la cabeza bajo estrés extremo, puede llegar a migraña

**Gaby (F-03)**
- Venía de León en carretera cuando ocurrió — atrapada en km 87
- Anestesiólogo: ojo entrenado para cambios sutiles, evalúa fisiología de criaturas
- Fría y calculadora pero considera variables humanas que otros ignoran
- Sus papás no estaban en casa cuando llegó a Aguascalientes
- Cuaderno de notas en dos columnas: lo que sabe / lo que no sabe

**Aarón (F-04)**
- Ing. Químico, cabeza fría, planeador, atlético en juventud
- Sabe mecánica y mucho en general
- Amigable pero en modo focus cuando hay que resolver algo
- Busca siempre la explicación más racional
- Arquetipo completo pendiente de definir

**Carlos (F-05)**
- Maestro en campus sur UAA cuando ocurrió — estaba en reunión de academia
- Innovador, siempre tiene un plan, algo flojo — hace las cosas cuando no queda de otra
- Explica todo con paciencia de maestro, no se deja intimidar
- Humor negro sobre sus propias desgracias (solo el grupo entiende)
- Sistema de sensores de vibración para detectar criaturas sin verlas
- Notas de voz a la carpeta "Para cuando aparezcan" — habla para procesar

---

## Bestiario — criaturas documentadas

### Estructura de archivos del bestiario

Cada criatura tiene su propio archivo HTML en `senal-muerta/bestiario/`:

```
senal-muerta/bestiario/
├── index.html                    ← índice general del bestiario
├── cervato-de-concreto.html
├── gusano-de-asfalto.html
├── chacal-de-feria.html
├── arana-hidraulica.html
├── arana-de-casa.html
├── toro-de-calicanto.html
├── mosca-forunculo.html
├── roca.html
├── roca-negra.html
├── hormiga-coordinadora.html
├── coyote-mutado.html
└── la-catedral.html
```

### Links al bestiario desde capítulos

Cuando el contenido de un capítulo mencione `(véase Bestiario, ...)` o cualquier referencia a una criatura del bestiario, Claude Code debe:

1. Convertir la referencia en un link HTML hacia el archivo correspondiente
2. El path desde `personajes/nombre/cap-XX.html` hacia el bestiario es: `../../bestiario/nombre-criatura.html`
3. Usar la clase `.bestiario-ref` para el link

Ejemplo de conversión:
```
Texto en .md:
  ...el Chacal de Feria (véase Bestiario, Amenaza II)...

HTML resultante:
  ...el <a href="../../bestiario/chacal-de-feria.html" class="bestiario-ref">Chacal de Feria</a> (Amenaza II)...
```

4. Si el archivo de la criatura no existe todavía, crearlo como placeholder usando la plantilla de abajo antes de agregar el link.

### Plantilla de placeholder para criatura nueva

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[Nombre criatura] — Bestiario — Señal Muerta</title>
<link rel="stylesheet" href="../css/style.css">
</head>
<body>

<header class="site-header">
  <div class="site-header-inner">
    <a href="../../index.html" class="site-logo">APE — <span>SEÑAL MUERTA</span></a>
  </div>
</header>

<div class="container">
  <div class="archive-stamp">Bestiario — Archivo de Recuperación Post-Emergencia</div>

  <div class="archive-header">
    <div class="archive-grid">
      <div class="archive-field">
        <span class="field-label">Designación</span>
        <span class="field-value">[Nombre provisional]</span>
      </div>
      <div class="archive-field">
        <span class="field-label">Clasificación</span>
        <span class="field-value">Amenaza [I/II/III/IV]</span>
      </div>
      <div class="archive-field">
        <span class="field-label">Tipo</span>
        <span class="field-value">[Herbívoro / Carnívoro / Parásito / etc.]</span>
      </div>
      <div class="archive-field">
        <span class="field-label">Primer avistamiento documentado</span>
        <span class="field-value">[Sujeto y período]</span>
      </div>
      <div class="archive-field">
        <span class="field-label">Estado de documentación</span>
        <span class="field-value">En proceso — archivo incompleto</span>
      </div>
    </div>
  </div>

  <div class="archivist-note">
    <span class="archivist-label">// Nota del archivista</span>
    Entrada en construcción. Los datos disponibles provienen de avistamientos fragmentados documentados por los sujetos del archivo. La entrada completa será actualizada a medida que se integren nuevos documentos.
  </div>

  <div class="page-footer">
    <span><span class="status-dot"></span>Entrada activa</span>
    <span><a href="index.html" style="color:var(--text3); text-decoration:none;">← Volver al bestiario</a></span>
    <span><a href="../../index.html" style="color:var(--text3); text-decoration:none;">← Volver al archivo</a></span>
  </div>
</div>

<script src="../js/main.js"></script>
</body>
</html>
```

### Tabla de criaturas y sus archivos

| Nombre | Archivo | Amenaza | Tipo | Primer avistamiento |
|---|---|---|---|---|
| Cervato de Concreto | `cervato-de-concreto.html` | I | Herbívoro | F-01 día 1 / F-03 km 91 |
| Gusano de Asfalto | `gusano-de-asfalto.html` | I | Descomponedor | F-01 sonido día 1 |
| Chacal de Feria | `chacal-de-feria.html` | II | Carnívoro manada | F-02 semana 2 |
| Araña Hidráulica | `arana-hidraulica.html` | II | Carnívoro emboscada | F-02 farmacia día 4 |
| Araña de Casa | `arana-de-casa.html` | II | Carnívoro emboscada | F-01 supermercado semana 3 |
| Toro de Calicanto | `toro-de-calicanto.html` | III | Carnívoro territorial | Sin avistamiento directo aún |
| Mosca Forúnculo | `mosca-forunculo.html` | II | Parásito | F-02 ciclo semana 3-5 |
| Roca | `roca.html` | I | Herbívoro / descomponedor | F-01 día 2 |
| Roca Negra | `roca-negra.html` | II | Carnívoro oportunista | F-01 día 3 |
| Hormiga Coordinadora | `hormiga-coordinadora.html` | II | Herbívoro / colonia | F-01 día 5 |
| Coyote mutado | `coyote-mutado.html` | II | Carnívoro manada | F-05 semana 2 |
| La Catedral | `la-catedral.html` | IV — Extinción | Desconocido | F-03 km 87 horizonte |

### Flora documentada

| Nombre provisional | Archivo | Primer registro | Notas |
|---|---|---|---|
| Enredadera acelerada | `enredadera-acelerada.html` | F-01 día 2 | Crecimiento anormal, brillo metálico en hoja |
| Hongo de cemento | `hongo-de-cemento.html` | F-01 día 4 | Crece en block de concreto, sombrero plano oscuro |
| Flora mutada general | — | F-03 carretera | Vegetación entre grietas con crecimiento acelerado |

---

## Assets multimedia — flujo de integración

Los archivos de imagen y audio para fichas del bestiario llegan en `_incoming/` con nombres generados (IA, timestamps, etc.). Deben renombrarse, moverse a la carpeta correcta e integrarse al HTML de la ficha.

### Convención de nombres de archivo

**Imágenes** (siempre `.png`, guardar como `.png`):

| Nombre limpio | Tipo de fuente | Descripción |
|---|---|---|
| `morfologia-diagrama.png` | Diagrama anatómico / disección | Vista completa o análisis de estructura |
| `boceto-01.png`, `boceto-02.png` | Ilustración de campo / perspectiva | Bocetos de avistamiento, perfil lateral |
| `closeup-01.png`, `closeup-02.png` | Detalle / fragmento | Superficie, piel, placa, escama, etc. |

**Audio** (`.mp3`):

| Nombre limpio | Tipo de fuente |
|---|---|
| `vocal-normal-01.mp3`, `…-02.mp3`, `…-03.mp3` | Vocalizaciones en reposo / desplazamiento |
| `vocal-agresivo-01.mp3`, `…-02.mp3` | Vocalizaciones de advertencia / carga |
| `narrador-muestra-XX.mp3` | Voz narrada de laboratorio / análisis |

### Mapeo de nombres generados → nombres limpios

Inferir el tipo por el nombre generado:

| Patrón en nombre generado | Nombre limpio |
|---|---|
| `Anatomical_dissection_diagram…` | `morfologia-diagrama.png` |
| `Field_illustration…` (sufijo `_1`, `_3`…) | `boceto-01.png`, `boceto-02.png` (en orden de sufijo) |
| `Close-up_fragment…` (sufijo `_0`, `_2`…) | `closeup-01.png`, `closeup-02.png` |
| `Deep_resonant_vocali…` / `Vocalization…` | `vocal-normal-0N.mp3` (en orden de sufijo) |
| `Aggressive_warning_v…` / `Aggressive…` | `vocal-agresivo-0N.mp3` |
| `ElevenLabs_…` / narración con nombre de voz | `narrador-muestra-XX.mp3` |

### Pasos de integración

1. **Leer el encabezado del archivo `.md` en `_incoming/`** — identifica criatura, instrucción y assets disponibles.
2. **Crear las carpetas** con PowerShell:
   ```powershell
   New-Item -ItemType Directory -Force -Path "senal-muerta/assets/img/bestiario/[slug]"
   New-Item -ItemType Directory -Force -Path "senal-muerta/assets/audio/bestiario/[slug]"
   ```
3. **Copiar con nombre limpio** usando `Copy-Item` (no mover — permite verificar antes de borrar):
   ```powershell
   Copy-Item "_incoming\[nombre-generado].png" "senal-muerta/assets/img/bestiario/[slug]/[nombre-limpio].png"
   Copy-Item "_incoming\[nombre-generado].mp3" "senal-muerta/assets/audio/bestiario/[slug]/[nombre-limpio].mp3"
   ```
4. **Agregar la sección multimedia al HTML** de la ficha (ver plantilla abajo).
5. **Eliminar los archivos originales de `_incoming/`**.
6. **Commit** incluyendo assets y HTML:
   ```
   git add senal-muerta/assets/... senal-muerta/bestiario/[slug].html
   git commit -m "add [criatura] multimedia section with gallery and audio"
   git push
   ```

### Plantilla HTML — sección multimedia

Insertar dentro de `.doc-body`, antes del `</div>` que lo cierra, inmediatamente antes del bloque `.archivist-note` de estado final:

```html
    <div class="entry-section-title">Evidencia multimedia</div>

    <div class="media-stamp">Registro visual — documentación parcial</div>

    <div class="media-gallery">
      <div class="media-item wide">
        <img src="../assets/img/bestiario/[slug]/morfologia-diagrama.png" alt="Diagrama morfológico">
        <div class="media-caption">Diagrama morfológico — [descripción breve]</div>
      </div>
      <div class="media-item">
        <img src="../assets/img/bestiario/[slug]/boceto-01.png" alt="Boceto de campo">
        <div class="media-caption">Boceto de campo — [descripción]</div>
      </div>
      <div class="media-item">
        <img src="../assets/img/bestiario/[slug]/boceto-02.png" alt="Boceto de campo">
        <div class="media-caption">Boceto de campo — [descripción]</div>
      </div>
      <div class="media-item">
        <img src="../assets/img/bestiario/[slug]/closeup-01.png" alt="Detalle">
        <div class="media-caption">Detalle — [descripción]</div>
      </div>
      <div class="media-item">
        <img src="../assets/img/bestiario/[slug]/closeup-02.png" alt="Detalle">
        <div class="media-caption">Detalle — [descripción]</div>
      </div>
    </div>

    <div class="media-stamp">Registro sonoro — grabador dañado / recuperación parcial</div>

    <div class="audio-list">
      <!-- Narrador primero si existe, sin loop -->
      <div class="audio-item featured">
        <div class="audio-label">
          <span class="audio-tag">Narrador — Registro de laboratorio</span>
          [Descripción del registro — ej. "Muestra 17 — anomalía C"]
        </div>
        <audio controls src="../assets/audio/bestiario/[slug]/narrador-muestra-17.mp3"></audio>
      </div>
      <div class="audio-item">
        <div class="audio-label">
          <span class="audio-tag">Vocalización normal</span>
          [Descripción — ej. "Frecuencia baja — reposo"]
        </div>
        <audio controls src="../assets/audio/bestiario/[slug]/vocal-normal-01.mp3"></audio>
        <div class="audio-damaged">// grabación con interferencia — recuperación parcial</div>
      </div>
      <div class="audio-item">
        <div class="audio-label">
          <span class="audio-tag">Vocalización agresiva</span>
          [Descripción — ej. "Advertencia — pre-carga"]
        </div>
        <audio controls src="../assets/audio/bestiario/[slug]/vocal-agresivo-01.mp3"></audio>
        <div class="audio-damaged">// archivo parcial — inicio corrompido</div>
      </div>
    </div>
```

Omitir bloques que no tengan archivo correspondiente (si no hay narrador, omitir el `.audio-item.featured`; si no hay closeups, omitir esos `.media-item`).

### Clases CSS disponibles — multimedia

| Clase | Uso |
|---|---|
| `.media-gallery` | Grid 2 columnas para imágenes |
| `.media-item` | Contenedor individual de imagen |
| `.media-item.wide` | Imagen ancho completo (2 columnas) — usar para `morfologia-diagrama` |
| `.media-caption` | Leyenda debajo de la imagen |
| `.media-stamp` | Separador de subsección (registro visual / registro sonoro) |
| `.audio-list` | Contenedor de lista de audios |
| `.audio-item` | Track individual |
| `.audio-item.featured` | Track destacado (narrador / laboratorio) — fondo distinto, borde dorado |
| `.audio-tag` | Etiqueta de tipo en mayúsculas sobre el título |
| `.audio-label` | Título descriptivo del track |
| `.audio-damaged` | Nota de daño en rojo bajo el reproductor |

### Paths desde fichas del bestiario

```
../assets/img/bestiario/[slug]/archivo.png    ← imágenes
../assets/audio/bestiario/[slug]/archivo.mp3  ← audio
```