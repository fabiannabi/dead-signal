---
title: "[NOMBRE CRIATURA]"
cssclasses: [bestiario-terminal]
---

<!--
═══════════════════════════════════════════════════════════════════════════════
  TEMPLATE — FICHA BESTIARIO TERMINAL CENVAC  ·  4 pestañas
  Congelado desde el piloto `arana-hidraulica`. Copiar a
  content/bestiario/<slug>/index.md y rellenar los [MARCADORES].
  Esta carpeta (content/templates/) está en ignorePatterns → NO se publica.

  REGLAS DE ORO
  · frontmatter SIEMPRE con `cssclasses: [bestiario-terminal]` (aterriza como
    class="bestiario-terminal" en el <article>; sin esto no aplica el tema).
  · NO poner <script> en el .md (no corren). El JS de pestañas/gating vive en
    quartz/components/BestiarioScript.tsx (initFicheTabs, gating, hash routing).
  · Paleta: verde tenue/olivo global + acentos ámbar (--amb/--amb-dim) y rojo
    para protocolo. Clases SVG usan var(--secondary)/var(--amb)/var(--gray) →
    heredan la paleta. NO hardcodear colores.
  · Fuentes ≥11px (regla del usuario). NO usar letra chica.
  · Links a otras fichas: /bestiario/<slug> . A subdocs: /bestiario/<slug>/<slug>-inc-001
  · Assets: /static/img/bestiario/<slug>/*.png  ·  /static/audio/bestiario/<slug>/*.mp3
  · Amenaza III–IV: dejar deliberadamente escasas (menos tablas, más redacciones).

  ESTRUCTURA DE PESTAÑAS (qué va en cada una)
    RESUMEN    → ficha operativa (archive-grid), PROTOCOLO DE CONTACTO,
                 comportamiento, detección, notas del archivo, registros
                 vinculados, historial de clasificación, confidenciales + gating.
    MORFOLOGÍA → lámina SVG con referencias, tabla de medidas, identificación
                 biológica + tabla de taxonomía, exoesqueleto/fisiología, tablas
                 de lab, hipótesis H-01…, tesis, reproducción/ciclo.
    ECOLOGÍA   → hábitat/rango, red trófica SVG, relaciones (vinc-row).
    EVIDENCIA  → leyenda de clases (A/B/C), galería visual, lista de audio.
                 Omitir bloques sin asset. Si no hay assets: nota "sin registro
                 recuperado".
═══════════════════════════════════════════════════════════════════════════════
-->

<div class="fiche-boot">CENVAC-OS 4.5 <span class="dim">// módulo</span> BST-QUERY <span class="dim">— acceso operador</span> <span class="redact">████</span>-7</div>

<div class="fiche-frame">

<div class="fiche-frame-bar"><span>REGISTRO · BST-[N ROMANO] / [INICIALES]</span><span class="r">AMENAZA [N] · ACTIVO · DOC. [BÁSICA/PARCIAL]</span></div>

<div class="fiche-crumb">CENVAC:// <b id="fiche-crumb">registro / resumen</b></div>

<div class="chapter-header">
  <div class="chapter-code">// [Tipo · nicho corto]</div>
  <div class="chapter-title-a">[Nombre Criatura]</div>
  <div class="fiche-subtitle">[Nombre científico prov.] — designación provisional</div>
</div>

<div class="fiche-tabs">
  <button class="fiche-tab active" data-tab="resumen"   data-crumb="registro / resumen">Resumen<span class="tab-mini">// ficha operativa</span></button>
  <button class="fiche-tab"        data-tab="morfologia" data-crumb="registro / morfología">Morfología<span class="tab-mini">// biología</span></button>
  <button class="fiche-tab"        data-tab="ecologia"   data-crumb="registro / ecología">Ecología<span class="tab-mini">// hábitat · red trófica</span></button>
  <button class="fiche-tab"        data-tab="evidencia"  data-crumb="registro / evidencia">Evidencia<span class="tab-mini">// visual · sonoro</span></button>
</div>

<!-- ════════════════ RESUMEN ════════════════ -->
<div class="fiche-view active" id="v-resumen">

<div class="archive-header">
  <div class="archive-grid">
    <div class="archive-field"><span class="field-label">Designación</span><span class="field-value">[Nombre]</span></div>
    <div class="archive-field"><span class="field-label">Nombre científico provisional</span><span class="field-value">[Género especie]</span></div>
    <div class="archive-field"><span class="field-label">Clasificación</span><span class="field-value hot">Amenaza [N]</span></div>
    <div class="archive-field"><span class="field-label">Tipo</span><span class="field-value">[Tipo / nicho]</span></div>
    <div class="archive-field"><span class="field-label">Talla / masa</span><span class="field-value">[~X m / ~X kg]</span></div>
    <div class="archive-field"><span class="field-label">Actividad</span><span class="field-value">[ciclo]</span></div>
    <div class="archive-field"><span class="field-label">Señal de presencia</span><span class="field-value hot">[señal detectable]</span></div>
    <div class="archive-field"><span class="field-label">Contramedida</span><span class="field-value hot">[qué funciona]</span></div>
    <div class="archive-field"><span class="field-label">Biomas documentados</span><span class="field-value">[hábitats]</span></div>
    <div class="archive-field"><span class="field-label">Primer avistamiento</span><span class="field-value">[F-0X período]</span></div>
    <div class="archive-field"><span class="field-label">Documentado por</span><span class="field-value">[F-0X Nombre]</span></div>
    <div class="archive-field"><span class="field-label">Estado de documentación</span><span class="field-value">[Completo — nivel básico / En proceso]</span></div>
  </div>
</div>

<!-- PROTOCOLO: siempre 4 filas. Clases de valor: (normal) · .no (rojo, no funciona) · .crit (crítico). -->
<div class="protocolo">
  <div class="proto-h">⚠ PROTOCOLO DE CONTACTO</div>
  <div class="proto-row"><span class="proto-k">señal</span><span class="proto-v">[cómo se anuncia]</span></div>
  <div class="proto-row"><span class="proto-k">evitar</span><span class="proto-v">[qué NO hacer]</span></div>
  <div class="proto-row"><span class="proto-k">no_funciona</span><span class="proto-v no">[táctica que falla]</span></div>
  <div class="proto-row"><span class="proto-k">supervivencia_directa</span><span class="proto-v crit">[% / condición]</span></div>
</div>

<div class="entry-section-title">[Comportamiento de caza / pastoreo]</div>
<p>[Párrafo de comportamiento.]</p>

<div class="entry-section-title">Detección y sensores</div>
<p>[Cómo se detecta / se le detecta. Contramedidas.]</p>

<div class="entry-section-title">Notas del archivo</div>
<p>[Origen del primer contacto, quién lo documentó, cómo se fijó el protocolo.]</p>

<!-- Registros vinculados: arw = depreda→ / ←depredada / ≈compite / ref→ -->
<div class="entry-section-title">Registros vinculados · posición ecológica</div>
<div class="vinc-row"><span class="arw">depreda→</span> <a href="/bestiario/[slug]">[Criatura]</a> <span class="cls">[Am. X]</span></div>
<div class="vinc-row"><span class="arw">←depredada</span> <a href="/bestiario/[slug]">[Criatura]</a> <span class="cls">[Am. X]</span></div>

<!-- Historial: .obsoleto (tachado) para clasificaciones viejas; .up (verde) para reclasificación al alza. -->
<div class="entry-section-title">Historial de clasificación</div>
<div class="hist-row obsoleto">[S? p.E. — registro previo]</div>
<div class="hist-row">[S? p.E. — <span class="up">reclasificada Amenaza X</span> tras …]</div>

<!-- Confidenciales: conf-item con o sin link. conf-access: "Clase B — Acceso restringido". -->
<div class="entry-section-title">Archivos confidenciales — Acceso restringido</div>
<div class="confidential-section">
  <div class="conf-header">
    <span class="conf-stamp">Clasificado</span>
    <span class="conf-code">Expediente APE/BST-[N]/[INI] — Nivel variable</span>
  </div>
  <div class="conf-item">
    <div class="conf-id"><a href="/bestiario/[slug]/[slug]-exp-001" class="conf-doc-link">[INI]-EXP-001 / Experimento — [título]</a></div>
    <div class="conf-desc">[Descripción. Marcar fases accesibles vs Clase A.]</div>
    <div class="conf-access">Clase B — Acceso restringido</div>
  </div>
  <div class="conf-item">
    <div class="conf-id"><a href="/bestiario/[slug]/[slug]-inc-001" class="conf-doc-link">[INI]-INC-001 / Reporte de incidente — [título]</a></div>
    <div class="conf-desc">[Descripción.]</div>
    <div class="conf-access">Clase B — Acceso restringido</div>
  </div>
</div>

<!-- GATING Clase A: id único gate-<ini>-exp-00X. El botón [data-gate] lo activa BestiarioScript. -->
<div class="gated" id="gate-[ini]-exp-002">
  <div class="gated-locked">
    <span class="lock">▓ [INI]-EXP-002 — CLASE A · ACCESO DENEGADO</span><br>
    [Teaser redactado] <span class="redact">expediente ████-A</span>
    <br><button data-gate>solicitar desbloqueo →</button>
  </div>
  <div class="gated-reveal">
    <span class="lock" style="color:var(--secondary)">▓ ACCESO CONCEDIDO — CLASE A</span><br>
    [Revelación. Marcador ████-A conecta con el hilo meta.] <span class="badge-hilo">HILO META</span>
  </div>
</div>

<div class="fiche-jump">Para anatomía, estructura interna y bioquímica → <a data-jump="morfologia">abrir pestaña MORFOLOGÍA ▸</a></div>

</div>

<!-- ════════════════ MORFOLOGÍA ════════════════ -->
<div class="fiche-view" id="v-morfologia">

<!-- Lámina SVG: viewBox propio, formas con var(--lightgray)/stroke var(--amb-dim);
     ojos/detalles var(--amb); líneas guía + números de referencia. Adaptar la silueta a la criatura. -->
<div class="fig-cap">FIG.1 — MORFOLOGÍA GENERAL · REF. 1–[N]</div>
<div class="fiche-svg-wrap">
<svg class="fiche-figure" viewBox="0 0 320 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lámina morfológica de [criatura]">
  <!-- [dibujar silueta simple de la criatura con las formas/colores de la paleta] -->
  <g fill="var(--amb)" font-family="var(--codeFont)" font-size="12"><text x="52" y="55">1</text></g>
</svg>
</div>
<div class="fig-key">
  <b>1.</b> [estructura] &nbsp; <b>2.</b> [estructura]<br>
  <b>3.</b> [estructura] &nbsp; <b>4.</b> [estructura]
</div>

<!-- Tabla de medidas rápida (etiqueta + valor). -->
<div class="medidas">
  <div><span>[Medida]</span> [valor ± error]</div>
  <div><span>[Medida]</span> [valor]</div>
</div>

<div class="entry-section-title">Identificación biológica</div>
<p>[Plan corporal, orden/clase, divergencia respecto al linaje pre-Emergencia. Usar <span class="a">término</span> para resaltar.]</p>

<!-- Tablas de lab: .labtable dentro de .wrap-scroll (scroll horizontal en móvil).
     Celdas: .k (clave), .num (número), .conf (confianza/método), fila .anom (anómala). -->
<div class="wrap-scroll">
<table class="labtable">
  <tr><th>Rango taxonómico</th><th>Asignación</th><th>Confianza</th></tr>
  <tr><td class="k">Reino</td><td>Animalia</td><td class="conf">confirmada</td></tr>
  <tr><td class="k">Especie</td><td><em>[Género especie]</em> (prov.)</td><td class="conf">provisional</td></tr>
</table>
</div>

<div class="entry-section-title">[Exoesqueleto / fisiología / rasgo distintivo]</div>
<p>[Datos físicos. Insertar tablas .labtable adicionales según haga falta.]</p>

<!-- badge-hilo para marcar el hilo meta ████-A; variante verde para etiqueta temática (FÍSICA/QUÍMICA). -->
<div class="entry-section-title">[Sistema clave] <span class="badge-hilo" style="background:var(--secondary);color:var(--light)">[FÍSICA/QUÍMICA/…]</span></div>
<p>[Análisis con datos.]</p>

<!-- Hipótesis: st-ok (confirmada) / st-open (abierta) / st-no (refutada). -->
<div class="entry-section-title">Hipótesis y tesis de laboratorio</div>
<div class="hyp">
  <div class="hyp-h"><span class="hyp-code">H-01</span><span class="st st-ok">Confirmada</span></div>
  <div class="hyp-body">[Hipótesis.]</div>
  <div class="hyp-ev">Evidencia: [fuente].</div>
</div>
<div class="hyp">
  <div class="hyp-h"><span class="hyp-code">H-02</span><span class="st st-open">Abierta</span></div>
  <div class="hyp-body">[Hipótesis.]</div>
  <div class="hyp-ev">Evidencia: [pendiente].</div>
</div>

<div class="tesis">
  <span class="tesis-k">Tesis central — Lab. Análisis APE / BST-[N]</span>
  [Síntesis: qué representa la criatura como reconfiguración post-Emergencia y cuáles son sus anomalías centrales.]
</div>

<div class="entry-section-title">Reproducción y ciclo</div>
<p style="color:var(--gray)">[Si no hay datos: <span class="redact">sin documentar</span>. Datos insuficientes.]</p>

<div class="fiche-jump">Volver a la ficha operativa → <a data-jump="resumen">◂ abrir pestaña RESUMEN</a></div>

</div>

<!-- ════════════════ ECOLOGÍA ════════════════ -->
<div class="fiche-view" id="v-ecologia">

<div class="entry-section-title">Hábitat y rango</div>
<div class="habitat">
  <div><span>Bioma primario</span> [bioma]</div>
  <div><span>Sub-hábitats</span> [lista]</div>
  <div><span>Actividad</span> [ciclo]</div>
  <div><span>Densidad de colonia</span> <span class="redact">sin documentar</span></div>
</div>
<p>[Nicho ecológico, relación con el entorno post-Emergencia.]</p>

<!-- Red trófica SVG: el nodo de ESTA criatura va resaltado con stroke var(--amb); presas/predadores en var(--gray). -->
<div class="entry-section-title">Red trófica — reconstruida</div>
<div class="fiche-svg-wrap">
<svg viewBox="0 0 720 130" width="720" height="130" xmlns="http://www.w3.org/2000/svg" font-family="var(--codeFont)" role="img" aria-label="Red trófica de [criatura]">
  <defs><marker id="arT" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--secondary)"/></marker></defs>
  <rect x="20" y="50" width="150" height="30" fill="var(--lightgray)" stroke="var(--gray)"/><text x="95" y="70" fill="var(--darkgray)" font-size="12" text-anchor="middle">[presa]</text>
  <rect x="285" y="46" width="150" height="38" fill="var(--lightgray)" stroke="var(--amb)" stroke-width="1.4"/><text x="360" y="70" fill="var(--amb)" font-size="13" text-anchor="middle">[esta criatura]</text>
  <rect x="550" y="50" width="150" height="30" fill="var(--lightgray)" stroke="var(--gray)"/><text x="625" y="70" fill="var(--darkgray)" font-size="12" text-anchor="middle">[predador]</text>
  <line x1="170" y1="65" x2="282" y2="65" stroke="var(--secondary)" marker-end="url(#arT)"/>
  <line x1="435" y1="65" x2="547" y2="65" stroke="var(--secondary)" marker-end="url(#arT)"/>
</svg>
</div>

<div class="entry-section-title">Relaciones</div>
<div class="vinc-row"><span class="arw">depreda→</span> <a href="/bestiario/[slug]">[Criatura]</a> <span class="cls">[nota]</span></div>
<div class="vinc-row"><span class="arw">←depredada</span> <a href="/bestiario/[slug]">[Criatura]</a> <span class="cls">[nota]</span></div>

<div class="fiche-jump">Ficha operativa y protocolos → <a data-jump="resumen">◂ abrir pestaña RESUMEN</a></div>

</div>

<!-- ════════════════ EVIDENCIA ════════════════ -->
<div class="fiche-view" id="v-evidencia">

<!-- Leyenda de clases: copiar tal cual (A/B/C). Es idéntica en todas las fichas. -->
<div class="clasificacion-legend">
  <div class="clase-item clase-a">
    <div class="clase-header"><span class="clase-badge">Clase A</span><span class="clase-level">Nivel superior</span></div>
    <span class="clase-desc">Procesado en laboratorio APE — fuente verificada y autenticada</span>
    <span class="clase-sub">Acceso restringido — requiere autorización de investigador principal</span>
    <div class="clase-examples"><span>Análisis forense</span><span>Lab. análisis</span><span>Narraciones verificadas</span></div>
  </div>
  <div class="clase-item clase-b">
    <div class="clase-header"><span class="clase-badge">Clase B</span><span class="clase-level">Distribución controlada</span></div>
    <span class="clase-desc">Documentación de campo analizada — fuente procesada por el archivo</span>
    <span class="clase-sub">Acceso restringido — personal autorizado de campo</span>
    <div class="clase-examples"><span>Bocetos procesados</span><span>Experimentos</span><span>Reportes de incidente</span></div>
  </div>
  <div class="clase-item clase-c">
    <div class="clase-header"><span class="clase-badge">Clase C</span><span class="clase-level">Archivo general</span></div>
    <span class="clase-desc">Evidencia primaria sin procesar — fuente directa de campo</span>
    <span class="clase-sub">Distribución general — sin restricciones de acceso</span>
    <div class="clase-examples"><span>Bocetos originales</span><span>Grabaciones crudas</span><span>Documentos de sujeto</span></div>
  </div>
</div>

<div class="media-stamp">Registro visual — procesado por Lab. Análisis APE</div>
<!-- media-evidence-block .wide = ancho completo (usar para morfologia-diagrama). clase: A/B/C. Omitir si no hay imagen. -->
<div class="media-gallery">
  <div class="media-evidence-block wide">
    <div class="media-evidence-header"><span class="media-ev-id">APE/VISUAL — BST-[N]/[INI]-VIS-001</span><span class="media-ev-clase">Clase B</span></div>
    <img src="/static/img/bestiario/[slug]/morfologia-diagrama.png" alt="Registro forense">
    <div class="media-evidence-footer"><span class="media-ev-caption">[descripción]</span><span class="media-ev-meta">Lab. Análisis</span></div>
  </div>
</div>

<div class="media-stamp">Registro sonoro — procesado por Lab. Análisis APE</div>
<!-- Primer item .featured = narrador (si existe). audio-ev-damaged para grabaciones parciales. Omitir si no hay audio. -->
<div class="audio-list">
  <div class="audio-evidence-item featured">
    <div class="audio-evidence-header"><span class="audio-ev-type">Narrador / Laboratorio</span><span class="audio-ev-id">APE/AUDIO — BST-[N]/[INI]-AUD-001</span><span class="audio-ev-clase">Clase A</span></div>
    <div class="audio-evidence-body"><div class="audio-ev-title">[título]</div><audio controls src="/static/audio/bestiario/[slug]/narrador-muestra-17.mp3"></audio></div>
  </div>
  <div class="audio-evidence-item">
    <div class="audio-evidence-header"><span class="audio-ev-type">Vocalización normal</span><span class="audio-ev-id">APE/AUDIO — BST-[N]/[INI]-AUD-002</span><span class="audio-ev-clase">Clase C</span></div>
    <div class="audio-evidence-body"><div class="audio-ev-title">[título]</div><audio controls src="/static/audio/bestiario/[slug]/vocal-normal-01.mp3"></audio><div class="audio-ev-damaged">// grabación con interferencia — recuperación parcial</div></div>
  </div>
</div>

<!-- Si NO hay ningún asset: reemplazar galería y lista por:
<p style="color:var(--gray)">Sin registro visual ni sonoro recuperado. <span class="redact">Material de campo no recuperado / dañado.</span></p>
-->

<div class="fiche-jump">Ficha operativa y protocolos → <a data-jump="resumen">◂ abrir pestaña RESUMEN</a></div>

</div>

</div>

<div class="archivist-note">
  <span class="archivist-label">Estado del archivo</span>
  [Resumen del estado de documentación + qué falta. Enlazar criaturas relacionadas con class="bestiario-ref".]
</div>

<div class="page-footer">
  <span><span class="status-dot"></span>Entrada activa</span>
  <span>[Nombre] — Amenaza [N]</span>
  <span><a href="/bestiario">← Volver al bestiario</a></span>
</div>
