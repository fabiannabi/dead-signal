/**
 * report-generator.js — Genera el expediente .md post-operación
 */

export function generarReporte(estado, mision, evento) {
  const ultimo_id  = estado.historial[estado.historial.length - 1]?.id;
  const nodo_final = mision._map[ultimo_id];
  const frags      = nodo_final?.narrativa_fragmentos || {};
  const clasif     = nodo_final?.clasificacion_doc || 'Nivel 2 — Distribución interna CENVAC';
  const resultado  = nodo_final?.titulo || 'Operación concluida';
  const id_op      = `OP-${evento.id.replace('EVT-', '')}`;

  const bajas   = estado.equipo.filter(a => !a.estado.vivo);
  const heridos = estado.equipo.filter(a => a.estado.vivo && a.estado.heridas.length > 0);

  const eq_lines = estado.equipo.map(a => {
    const est = !a.estado.vivo ? 'BAJA'
      : a.estado.heridas.length > 0 ? 'herido — operativo'
      : 'operativo';
    return `- ${a.rango_abreviatura} ${a.nombre_completo} — ${a.nombre_rol} — ${est}`;
  });

  let bajas_txt;
  if (bajas.length === 0 && heridos.length === 0) {
    bajas_txt = 'Sin bajas ni heridos registrados en esta operación.';
  } else {
    bajas_txt = [
      ...bajas.map(a => `- BAJA: ${a.rango_abreviatura} ${a.nombre_completo}`),
      ...heridos.map(a => {
        const h = a.estado.heridas.map(h => `${h.tipo} en ${h.parte_cuerpo} (severidad ${h.severidad})`).join(', ');
        return `- HERIDO: ${a.rango_abreviatura} ${a.nombre_completo} — ${h}`;
      })
    ].join('\n');
  }

  const muestra_txt = estado.muestra_obtenida
    ? `Muestra biológica: ${estado.muestra_tipo} — contenedor clase B — transportada al punto de mando.`
    : 'Sin material recuperado. Objetivo primario no cumplido.';

  return `DESTINO: senal-muerta/expedientes/operaciones/
SECCION: operaciones CENVAC
CAPITULO: ${id_op}
INSTRUCCION: archivar como expediente de operación
ARCHIVO: _incoming/operacion-${id_op}.md
---
VERSION_B: NO APLICA (sin documento original — operación oficial CENVAC)
---
VERSION_A: ARCHIVO RECUPERADO

# EXPEDIENTE DE OPERACIÓN — CENVAC
**Designación:** ${id_op}
**Clasificación:** ${clasif}
**Foco objetivo:** Araña Hidráulica (véase Bestiario — Araña Hidráulica)
**Tipo:** Extracción de muestra biológica — Protocolo 4-A
**Resultado:** ${resultado}
**Tiempo de operación:** ${estado.tiempo_simulado} (estimado)

## Equipo desplegado
${eq_lines.join('\n')}

## Cronología reconstruida
${frags.cronologia || 'Cronología no disponible.'}

## Hallazgos
${frags.hallazgos || 'Sin hallazgos documentados.'}

## Bajas y heridos
${bajas_txt}

## Material recuperado
${muestra_txt}

## Notas del analista
${frags.notas_analista || 'Sin notas adicionales.'}

---
*Documento clasificado. Distribución restringida — ${clasif}.*`;
}

// Solo funciona en browser — descarga el .md como archivo local
export function descargarReporte(md, id_op) {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `operacion-OP-${id_op}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
