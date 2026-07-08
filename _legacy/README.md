# _legacy — sitio estático pre-Quartz (deprecado)

Esta carpeta contiene el **sitio anterior** de Señal Muerta, hecho a mano en
HTML/CSS/JS estático, **antes** de la migración a Quartz.

**No forma parte del sitio en producción.** El deploy (`.github/workflows/deploy.yml`)
compila únicamente `content/` con `npx quartz build` y publica `public/`. Nada de
aquí se sirve.

Se conserva **solo como referencia** (contenido narrativo, estructura, estilos
originales). No editar, no enlazar desde `content/`, no tomarlo en cuenta para
features nuevas.

## Contenido

- `index.html` — portada original (paleta e interfaz previas a Quartz).
- `senal-muerta/` — sitio completo viejo: `personajes/`, `bestiario/`, `cartografia/`,
  `cronologia/`, `css/`, `js/`, `assets/`.

## El sitio vivo está en Quartz

- Portada: `content/index.md`
- Bestiario: `content/bestiario/<slug>/index.md` (+ assets colocados en la carpeta)
- Operaciones: `content/operaciones/*.html` (módulo HTML crudo)
