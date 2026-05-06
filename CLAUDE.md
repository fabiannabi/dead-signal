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
    │   ├── audio/              ← Vacío, reservado
    │   └── img/                ← Vacío, reservado
    ├── personajes/
    │   ├── fabian/
    │   │   ├── index.html      ← F-01 ficha + nav
    │   │   ├── cap-01.html
    │   │   ├── cap-02.html
    │   │   ├── cap-03.html
    │   │   └── cap-04.html
    │   ├── felipe/
    │   │   ├── index.html      ← F-02 ficha + nav
    │   │   ├── cap-01.html … cap-04.html
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
../../../index.html      ← portada raíz (logo del header y "Volver al archivo")
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
- Ambas se importan desde Google Fonts

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
    <a class="chapter-tab active" href="cap-0N.html">Cap. 0N</a>
  </div>

  <div class="version-panel active" id="panel-a">
    <div class="archive-stamp">Archivo de Recuperación Post-Emergencia / F-0X</div>
    <div class="chapter-header">
      <div class="chapter-code">F-0X / Documento 0N de <span class="redacted">██</span></div>
      <div class="chapter-title-a">Capítulo N — Título</div>
    </div>
    <div class="doc-body">
      <!-- contenido versión archivo -->
    </div>
  </div>

  <div class="version-panel" id="panel-b">
    <div class="original-header">
      <div class="original-eyebrow">Señal Muerta — Crónicas de la Emergencia</div>
      <div class="original-title">Nombre</div>
      <div class="original-chapter">Capítulo N — Título</div>
    </div>
    <hr class="original-divider">
    <div class="original-body">
      <!-- contenido versión original -->
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
fabian initial set up
Add estructura base del sitio senal-muerta
move index to root
upate path for files
update home path
modify styles text
```

Patrón: verbo + objeto, descripción breve y directa de lo que cambió.

---

## Flujo de trabajo para contenido nuevo

El contenido nuevo llega como archivos de texto en `_incoming/`. El usuario los genera en otra conversación de Claude y los deja ahí antes de pedir la integración.

### Convención de nombres en `_incoming/`

```
personaje_nombre_capX.txt       ← capítulo de personaje
bestiario_nombre-criatura.txt   ← entrada del bestiario
cronologia_diaX.txt             ← entrada de cronología
nota_descripcion.txt            ← cualquier otro contenido
```

### Pasos de integración

1. **Leer el archivo en `_incoming/`** para entender el contenido
2. **Identificar el destino:**
   - ¿Capítulo nuevo de un personaje? → crear `cap-XX.html` en su carpeta usando la plantilla de arriba
   - ¿Contenido para un capítulo placeholder existente? → editar ese `cap-XX.html`
   - ¿Bestiario u otra sección? → editar el `index.html` correspondiente
3. **Si es capítulo nuevo**, también actualizar:
   - `index.html` del personaje: añadir el tab `<a class="chapter-tab" href="cap-XX.html">Cap. XX — Título</a>` y actualizar el footer con el nuevo conteo
   - Todos los `cap-XX.html` hermanos: añadir el nuevo tab a su barra `chapter-tabs`
   - `index.html` raíz: actualizar el conteo en `.nav-item-desc` del personaje
4. **Si el personaje pasa de `disabled` a activo** en la portada, quitar la clase `disabled` del enlace en `index.html` raíz
5. **Integrar el contenido** respetando:
   - Los nombres de clase ya definidos (no inventar nuevas salvo que sean necesarias)
   - La paleta, tipografía y tono: archivo documental post-emergencia, redacciones parcialmente censuradas
6. **Verificar paths** — desde `personajes/nombre/` usar `../../css/`, `../../js/`, `../../../index.html`
7. **Eliminar el archivo de `_incoming/`** una vez integrado
8. **Commit** con el estilo documentado arriba — solo los archivos del sitio modificados
9. **Push** a `origin main`

```bash
git add <archivos modificados del sitio>
git commit -m "descripción breve del cambio"
git push
```

No usar `git add -A` ni `git add .` — agregar solo los archivos que corresponden al cambio.
Los archivos de `_incoming/` se eliminan tras integrar; no se commitean.
