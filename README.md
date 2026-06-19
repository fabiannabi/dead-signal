# Señal Muerta

> Archivo de Recuperación Post-Emergencia — Crónicas de la Emergencia

Proyecto de narrativa post-apocalíptica presentado como un **archivo documental ficticio**.
La historia ocurre en Aguascalientes, México, tras un evento llamado *"la Emergencia"*.

El sitio recopila los testimonios de cinco individuos que se encontraban en la ciudad
cuando ocurrió el colapso. Cada testimonio se presenta en dos versiones: el documento
original en primera persona y la reconstrucción posterior hecha por analistas del archivo.

---

## Concepto

El sitio se lee como un archivo recuperado años después del evento. Los documentos están
parcialmente redactados, las fuentes se citan entre sí y el tono es el de una compilación
fría y documental sobre un mundo que ya colapsó.

Cada capítulo ofrece un **toggle A/B**:

- **Versión A — Archivo**: reconstrucción por analistas del futuro, con fuentes citadas,
  inferencias marcadas y redacciones parciales.
- **Versión B — Original**: documento en primera persona, con la voz del personaje y sus
  notas en formato propio (libreta de campo, notas clínicas, notas de voz, etc.).

---

## Tecnología

Sitio **estático**: HTML + CSS + JavaScript puro. **Sin frameworks ni build tools.**

- `senal-muerta/css/style.css` — hoja de estilos compartida por todas las páginas (excepto `index.html`)
- `senal-muerta/js/main.js` — `switchVersion()` y `switchChapter()` compartidos
- `index.html` — portada con CSS inline intencional

No requiere instalación ni dependencias. Basta abrir `index.html` en un navegador, o servir
la carpeta con cualquier servidor estático:

```bash
# Ejemplo con Python
python3 -m http.server 8000
# luego abrir http://localhost:8000
```

---

## Estructura

```
dead-signal/
├── index.html                  ← Portada: grid de navegación a personajes y secciones
├── README.md
├── CLAUDE.md                   ← Guía de convenciones y flujo de trabajo del proyecto
├── _incoming/                  ← Carpeta de entrada para contenido nuevo (.md)
└── senal-muerta/
    ├── css/style.css           ← Estilos compartidos
    ├── js/main.js              ← Lógica compartida (toggles)
    ├── assets/
    │   ├── audio/bestiario/    ← Vocalizaciones y narración por criatura
    │   └── img/bestiario/      ← Diagramas, bocetos y detalles por criatura
    ├── personajes/             ← Fichas y capítulos por sujeto (F-01 … F-05)
    ├── bestiario/              ← Criaturas documentadas
    ├── cartografia/            ← Mapa de señales (en construcción)
    └── cronologia/             ← Línea de tiempo (en construcción)
```

---

## Personajes

| ID | Nombre | Profesión | Capítulos |
|---|---|---|---|
| F-01 | Fabián | Ing. Bioquímica / Programador | 4 |
| F-02 | Felipe | Médico Urgenciólogo | 4 |
| F-03 | Gaby | Médico Anestesiólogo | 1 |
| F-04 | Aarón | Ing. Químico | en proceso |
| F-05 | Carlos | Ing. Biomédico / Maestro UAA | 4 |

Cada personaje tiene una voz y un formato de notas propio. El detalle de arquetipos,
convenciones y plantillas vive en [`CLAUDE.md`](CLAUDE.md).

---

## Secciones

- **Personajes** — testimonios divididos en capítulos, con toggle A/B.
- **Bestiario** — fichas de las criaturas surgidas tras la Emergencia, con galería de
  imágenes y registros sonoros.
- **Cartografía** — mapa de señales activas *(en construcción)*.
- **Cronología** — reconstrucción de la línea de tiempo *(en construcción)*.

---

## Contribuir contenido

El contenido nuevo entra como archivos `.md` en `_incoming/`, con un encabezado estructurado
y el texto en sus dos versiones (original y archivo). El proceso de integración —mapeo de
versiones a HTML, clases de notas por personaje, links al bestiario, manejo de assets y
estilo de commits— está documentado en detalle en [`CLAUDE.md`](CLAUDE.md).

---

*Proyecto en desarrollo — archivo activo, actualización continua.*
