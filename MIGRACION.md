# Migración a Quartz — Próximos pasos

Estado actual: Fabián cap-01 migrado (versión A + versión B), estilos de libreta de campo terminados.

---

## 1. Completar personajes

### Fabián — faltan caps 02, 03, 04
- Crear `content/personajes/fabian-cap-02.md` … `fabian-cap-04.md` (versión A)
- Crear `content/documentos/fabian-libreta-02.md` … `fabian-libreta-04.md` (versión B)
- Actualizar `content/personajes/fabian.md` con wikilinks a las nuevas entradas
- Los caps 02-04 están en `senal-muerta/personajes/fabian/cap-02.html` … `cap-04.html`

### Felipe — 4 caps
- Crear `content/personajes/felipe.md` (ficha)
- 4 caps: `felipe-cap-01.md` … `felipe-cap-04.md` (versión A)
- 4 docs: `documentos/felipe-notas-clinicas-01.md` … (versión B, tipo "clinical")
- Fuente: `senal-muerta/personajes/felipe/`

### Carlos — 4 caps
- Crear `content/personajes/carlos.md` (ficha)
- 4 caps: `carlos-cap-01.md` … `carlos-cap-04.md`
- 4 docs en `documentos/` (tipo "audio" — notas de voz)
- Fuente: `senal-muerta/personajes/carlos/`

### Gaby — 1 cap
- Crear `content/personajes/gaby.md` (ficha)
- 1 cap: `gaby-cap-01.md` y su doc en `documentos/` (tipo "clinical")
- Fuente: `senal-muerta/personajes/gaby/`

### Aarón — solo ficha
- Crear `content/personajes/aaron.md` con frontmatter y nota de archivista
- Sin caps por ahora

---

## 2. Bestiario

11 criaturas + 2 flora documentada en `senal-muerta/bestiario/`.

Para cada criatura:
- Crear `content/bestiario/[slug].md` con frontmatter `tipo: criatura`
- Migrar el contenido descriptivo del HTML al markdown
- Los links desde capítulos a bestiario ya usan `[[slug]]` — solo asegurarse que los slugs coincidan

Slugs pendientes:
```
cervato-de-concreto
gusano-de-asfalto
chacal-de-feria
arana-hidraulica
arana-de-casa
toro-de-calicanto
mosca-forunculo
roca
roca-negra
hormiga-coordinadora
coyote-mutado
la-catedral
enredadera-acelerada
hongo-de-cemento
```

Los assets de imagen y audio del bestiario están en `senal-muerta/assets/` — decidir si se mueven a `quartz/static/` o se sirven desde la ruta actual.

---

## 3. Secciones pendientes

- **Cronología** (`content/cronologia.md`) — el JS interactivo del timeline puede quedar como iframe o simplificarse a una lista de eventos en markdown con estilos
- **Cartografía** (`content/cartografia.md`) — placeholder por ahora, o iframe al mapa Leaflet standalone
- **Operaciones** — no migra a Quartz, permanece standalone en `/operaciones/`; hay contenido pendiente en `_incoming/operaciones-expansion-50.md` y `_incoming/operaciones-mvp-brief.md`

---

## 4. Deploy

Configurar GitHub Actions para:
1. `npx quartz build`
2. Copiar `operaciones/` → `public/operaciones/`
3. Deploy `public/` a GitHub Pages

Ejemplo de workflow en `.github/workflows/deploy.yml`:
```yaml
name: Deploy Quartz
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx quartz build
      - run: cp -r operaciones/ public/operaciones/
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

---

## 5. Cleanup final

Una vez verificado el deploy:
- Eliminar `senal-muerta/` del repo (el HTML viejo ya no se usa)
- Actualizar `CLAUDE.md` con la nueva estructura de carpetas
- Actualizar `README.md`

---

## Notas de estilo — recordatorios

- Tipo `field` (Fabián): `:::notas{tipo="field"}` — papel claro con escritura a mano, Caveat
- Tipo `clinical` (Felipe, Gaby): `:::notas{tipo="clinical"}` — notas clínicas
- Tipo `audio` (Carlos): `:::notas{tipo="audio"}` — notas de voz
- Tachados disponibles: `.tachado` (zigzag), `.tachado-b` (círculos), `.tachado-c` (rayas diagonales)
- Redactado: `:redactado[████]`
- Referencia bestiario: `[[slug-criatura|Nombre de la Criatura]]`
