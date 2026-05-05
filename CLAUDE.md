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
└── senal-muerta/
    ├── css/
    │   └── style.css           ← Hoja de estilos compartida (usada por secciones temáticas)
    ├── js/
    │   └── main.js             ← JS mínimo, sin lógica por ahora
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

Hay dos sistemas de CSS en paralelo:

**CSS inline** — usado por `index.html` y todas las páginas de personajes.
No importar `style.css` en estas páginas; mantener el CSS dentro del `<head>`.

**`style.css`** — usado por las secciones temáticas (bestiario, cartografía, cronología).
Contiene el sistema completo de componentes para cuando esas páginas tengan contenido.

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
- Bloques tipo `.field-notes-block` para notas de campo o diario
- `.redacted` para texto censurado visualmente
- Textura de ruido SVG como `body::before` fixed, `z-index: 1000`
- Header sticky con logo y toggle de versión

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

Cuando el usuario entregue texto plano nuevo (un capítulo, entrada de personaje, criatura del bestiario, etc.):

1. **Identificar qué página recibe el contenido** — ¿es un capítulo de personaje existente? ¿una nueva entrada del bestiario? ¿actualiza la portada?
2. **Leer el archivo destino completo** antes de editar para entender el estado actual
3. **Integrar el contenido** respetando:
   - La estructura HTML existente de esa página (tabs, bloques, versiones A/B)
   - Los nombres de clase ya usados (no inventar clases nuevas salvo que sean necesarias)
   - La paleta y tipografía definidas arriba
   - El tono: archivo documental post-emergencia, redacciones parcialmente censuradas
4. **Si el personaje pasa de `disabled` a activo** en la portada, actualizar `index.html` quitando la clase `disabled` y actualizando el conteo de capítulos en `.nav-item-desc`
5. **Verificar paths** — las rutas relativas varían según la profundidad del archivo
6. **Commit** con el estilo documentado arriba
7. **Push** a `origin main`

```bash
git add <archivos modificados>
git commit -m "descripción breve del cambio"
git push
```

No usar `git add -A` ni `git add .` — agregar solo los archivos que corresponden al cambio.
