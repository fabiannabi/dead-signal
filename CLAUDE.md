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
    │   ├── fabian.html         ← F-01
    │   ├── felipe.html         ← F-02
    │   ├── gaby.html           ← F-03
    │   ├── aaron.html          ← F-04 (pendiente, marcado disabled en portada)
    │   └── carlos.html         ← F-05
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
- Páginas de personaje: nombre en minúsculas (`fabian.html`, `felipe.html`)
- Secciones temáticas: carpeta con nombre descriptivo + `index.html` dentro
- Assets: dentro de `senal-muerta/assets/` en subcarpeta por tipo (`img/`, `audio/`)
- El CSS externo vive en `senal-muerta/css/style.css`
- Los paths desde las páginas de personajes hacia CSS/JS usan rutas relativas (`../css/style.css`, `../js/main.js`)

---

## CSS y estilo visual

`index.html` tiene CSS inline en el `<head>` — no moverlo, es intencional.

Todas las demás páginas (`personajes/`, `bestiario/`, `cartografia/`, `cronologia/`) usan el CSS externo:

```html
<link rel="stylesheet" href="../css/style.css">
```

El JS interactivo también es externo — va al final del `<body>`:

```html
<script src="../js/main.js"></script>
```

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
- **Dos versiones** por personaje: "Archivo" (estilo ficha documental) y "Original" (prosa narrativa)
- Navegación entre capítulos via tabs (`.chapter-tab` / `.chapter-btn-b`)
- `.redacted` para texto censurado visualmente
- Textura de ruido SVG como `body::before` fixed, `z-index: 1000`
- Header sticky con logo y toggle de versión

### Bloques de notas — clases modificadoras de `field-notes-block`

El label flotante del bloque se controla con una clase semántica. Usar siempre una de estas:

| Clase | Label renderizado | Uso |
|---|---|---|
| `.field-notes-block.field` | `TRANSCRIPCIÓN — LIBRETA ORIGINAL` | Libreta de campo (Fabián) |
| `.field-notes-block.clinical` | `NOTAS CLÍNICAS DE CAMPO — TRANSCRIPCIÓN` | Notas clínicas (Felipe) |
| `.field-notes-block.personal` | `LIBRETA PERSONAL — TRANSCRIPCIÓN` | Diario personal (cualquier personaje) |

Sin modificador: label genérico `TRANSCRIPCIÓN`. Añadir un modificador nuevo a `style.css` si un personaje futuro requiere otro tipo de registro.

### Estructura mínima de una página de personaje nueva

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>F-0X Nombre — Señal Muerta</title>
<link rel="stylesheet" href="../css/style.css">
</head>
<body>

<header class="site-header">
  <div class="site-header-inner">
    <a href="../../index.html" class="site-logo">APE — <span>SEÑAL MUERTA</span></a>
    <div class="version-toggle">
      <button class="version-btn active" onclick="switchVersion('a')">Versión A — Archivo</button>
      <button class="version-btn" onclick="switchVersion('b')">Versión B — Original</button>
    </div>
  </div>
</header>

<div class="container">
  <div class="version-panel active" id="panel-a">
    <!-- contenido versión archivo -->
  </div>
  <div class="version-panel" id="panel-b">
    <!-- contenido versión original -->
  </div>
  <div class="page-footer">
    <span><span class="status-dot"></span>Archivo activo</span>
    <span>F-0X / N documentos recuperados</span>
    <span><a href="../index.html" style="color:var(--text3); text-decoration:none;">← Volver al índice</a></span>
  </div>
</div>

<script src="../js/main.js"></script>
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

1. **Leer el archivo en `_incoming/`** para entender el contenido a integrar
2. **Identificar qué página recibe el contenido** — ¿capítulo de personaje existente? ¿bestiario? ¿portada?
3. **Leer el archivo destino completo** antes de editar para entender el estado actual
4. **Integrar el contenido** respetando:
   - La estructura HTML existente de esa página (tabs, bloques, versiones A/B)
   - Los nombres de clase ya usados (no inventar clases nuevas salvo que sean necesarias)
   - La paleta y tipografía definidas arriba
   - El tono: archivo documental post-emergencia, redacciones parcialmente censuradas
5. **Si el personaje pasa de `disabled` a activo** en la portada, actualizar `index.html` quitando la clase `disabled` y actualizando el conteo de capítulos en `.nav-item-desc`
6. **Verificar paths** — rutas relativas desde `personajes/` usan `../`, desde la raíz usan `senal-muerta/`
7. **Eliminar el archivo de `_incoming/`** una vez integrado para mantener la carpeta limpia
8. **Commit** con el estilo documentado arriba — solo los archivos del sitio modificados
9. **Push** a `origin main`

```bash
git add <archivos modificados del sitio>
git commit -m "descripción breve del cambio"
git push
```

No usar `git add -A` ni `git add .` — agregar solo los archivos que corresponden al cambio.
Los archivos de `_incoming/` se eliminan tras integrar; no se commitean.
