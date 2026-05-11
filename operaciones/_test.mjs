/**
 * _test.mjs — Test sin framework para el motor de misión CENVAC
 * Uso: node _test.mjs
 *
 * Ejecuta dos ramas completas de la misión arana-hidraulica-extraccion:
 *   1. Rama de ÉXITO LIMPIO  (checks forzados a favorable)
 *   2. Rama de FRACASO CATASTRÓFICO (checks forzados a desfavorable)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

import { generarAgente }  from './js/agent-generator.js';
import { cargarMision, obtenerNodo, procesarNodo } from './js/mission-engine.js';
import { aplicarEfectos, contarBajas, contarHeridasGraves } from './js/state.js';
import { generarReporte } from './js/report-generator.js';

const __dir  = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dir, '../data/operaciones');

function leerJSON(ruta) {
  return JSON.parse(readFileSync(join(dataDir, ruta), 'utf8'));
}

const archetypes = leerJSON('agents/archetypes.json');
const traits     = leerJSON('agents/traits.json');
const names      = leerJSON('agents/names.json');
const ranks      = leerJSON('org/ranks.json');
const misionRaw  = leerJSON('missions/arana-hidraulica-extraccion.json');
const evento     = leerJSON('events/active-events.json')[0];

const datos = { archetypes, traits, names, ranks };

// ─── Generar 3 agentes con seeds fijos ────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════');
console.log('CENVAC — TEST DE MOTOR — arana-hidraulica-extraccion');
console.log('══════════════════════════════════════════════════════\n');

const SEEDS = [42, 137, 2026];
const agentes_base = SEEDS.map(s => generarAgente(s, datos));

console.log('ROSTER GENERADO (seeds: 42, 137, 2026)');
console.log('─────────────────────────────────────');
agentes_base.forEach(a => {
  const rasgos = a.rasgos.map(r => r.nombre).join(', ');
  console.log(`  [${a.rango_abreviatura}] ${a.nombre_completo}`);
  console.log(`    Rol:    ${a.nombre_rol}`);
  console.log(`    Stats:  F${a.stats['físico']} T${a.stats['técnico']} B${a.stats['biológico']} S${a.stats['sigilo']} M${a.stats['mental']} L${a.stats['liderazgo']}`);
  console.log(`    Rasgos: ${rasgos}`);
  console.log(`    Ops:    ${a.operaciones_completadas}`);
  console.log('');
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function crearEstado(agentes, lider_index = 0) {
  const equipo = agentes.map(a => JSON.parse(JSON.stringify(a)));
  equipo.forEach((a, i) => { a.es_lider = (i === lider_index); });
  return {
    evento_id: evento.id,
    mision_id: misionRaw.id,
    equipo,
    nodo_actual: misionRaw.nodo_inicial,
    historial: [],
    flags: {},
    muestra_obtenida: false,
    muestra_tipo: null,
    tiempo_simulado: '07:00',
    log: []
  };
}

function ejecutarRama(nombre_rama, estado, mision, instrucciones) {
  console.log(`\n${'═'.repeat(54)}`);
  console.log(`RAMA: ${nombre_rama}`);
  console.log(`${'═'.repeat(54)}`);

  let nodo_id = mision.nodo_inicial;
  let pasos = 0;

  while (nodo_id && pasos < 60) {
    const nodo = obtenerNodo(mision, nodo_id);
    if (!nodo) { console.log(`  ✗ Nodo no encontrado: ${nodo_id}`); break; }

    const instr = instrucciones[nodo_id];
    const opcionIndex      = typeof instr === 'number' ? instr : null;
    const resultadoForzado = typeof instr === 'string' ? instr : null;

    const resultado = procesarNodo(nodo, estado, mision, { opcionIndex, resultadoForzado });

    // Output del nodo
    const tipo_tag = `[${nodo.tipo.toUpperCase().padEnd(10)}]`;
    console.log(`\n${tipo_tag} ${nodo_id}`);
    if (nodo.ambiente) console.log(`  Ambiente: ${nodo.ambiente.slice(0, 80)}`);

    resultado.mensajes.forEach(m => {
      const texto_corto = m.texto.length > 120 ? m.texto.slice(0, 120) + '…' : m.texto;
      console.log(`  [${m.canal}] ${texto_corto}`);
    });

    if (resultado.check_resultado) {
      const cr = resultado.check_resultado;
      console.log(`  CHECK ${cr.stat.toUpperCase()} (${cr.agente}): d10=${cr.tirada} total=${cr.total} vs ${cr.dificultad} → ${cr.resultado.toUpperCase()}`);
    }

    if (resultado.opciones_disponibles) {
      console.log(`  [OPCIONES DISPONIBLES: ${resultado.opciones_disponibles.map(o => `"${o.texto.slice(0, 40)}"`).join(' | ')}]`);
    }

    // Estado del equipo (compacto)
    const eq_summary = estado.equipo.map(a =>
      `${a.nombre_completo.split(' ')[0]}(E:${a.estado.estamina}/${a.estado.estamina_max} C:${a.estado.cordura})`
    ).join(' | ');
    console.log(`  Estado: ${eq_summary}`);
    if (estado.muestra_obtenida) console.log(`  *** MUESTRA: ${estado.muestra_tipo} ***`);

    if (resultado.es_final || nodo.tipo === 'final') {
      console.log(`\n  ✔ FINAL ALCANZADO: ${nodo_id}`);
      break;
    }

    if (!resultado.siguiente) {
      console.log(`  ✗ Sin siguiente nodo — rama incompleta`);
      break;
    }

    nodo_id = resultado.siguiente;
    pasos++;
  }

  return estado;
}

// ─── Instrucciones de traversal ───────────────────────────────────────────────

const instrucciones_exito_limpio = {
  nodo_insercion:            0,          // "Autorizado. Avancen."
  nodo_aprox_01:             0,          // Ruta norte (evitar charcos)
  nodo_aprox_02:             'éxito',    // Check sigilo → éxito
  nodo_aprox_02_fallo:       0,          // (no visitado en éxito)
  nodo_aprox_03:             0,          // Única opción
  nodo_aprox_04:             'éxito',    // Check técnico → éxito + flag mapa_tecnico
  nodo_aprox_05:             0,          // Única opción
  nodo_aprox_06_senal:       0,          // Código 2
  nodo_busqueda_01:          0,          // Barrido Protocolo 8-A
  nodo_busqueda_02:          'crítico_éxito', // Check biológico → crítico éxito
  nodo_busqueda_03_info:     0,          // Protocolo 15
  nodo_busqueda_04_senal:    0,          // Protocolo 8-B (luz blanca)
  nodo_encuentro:            0,          // Luz blanca → nodo_ext_luz_01
  nodo_ext_luz_01:           0,          // Confirmar ventana
  nodo_ext_luz_02:           'crítico_éxito', // Check biológico → muestra óptima
  nodo_muestra_asegurada:    0,          // Iniciar extracción de equipo
  nodo_extrac_equipo_01:     0,          // Ruta original
  nodo_extrac_equipo_02a:    'éxito',    // Check físico → éxito
  nodo_extrac_equipo_03:     'éxito',    // Check sigilo → éxito
  nodo_extrac_equipo_04:     0           // "Confirmado."
};

const instrucciones_fracaso_catastrofico = {
  nodo_insercion:            0,
  nodo_aprox_01:             0,          // Ruta norte
  nodo_aprox_02:             'fallo',    // Check sigilo → fallo (hacen ruido)
  nodo_aprox_02_fallo:       0,          // Continuar con penalización
  nodo_aprox_03:             0,
  nodo_aprox_04:             'fallo',    // Check técnico → fallo (sin mapa)
  nodo_aprox_05:             0,
  nodo_aprox_06_senal:       0,
  nodo_busqueda_01:          1,          // Sin barrido (más rápido, más peligroso)
  nodo_busqueda_02:          'crítico_fallo', // Check biológico → activan hilo
  nodo_busqueda_03_alerta:   0,          // Esperar con equipo alerta
  nodo_busqueda_04_senal:    1,          // Evasión sigilo (comando dificultad máxima)
  nodo_encuentro:            1,          // Evasión → nodo_ext_sigilo_01
  nodo_ext_sigilo_01:        'crítico_fallo' // Check sigilo → activan al espécimen → final_fracaso
};

// ─── Ejecutar ramas ───────────────────────────────────────────────────────────

const mision = cargarMision(misionRaw);

const estado_exito = crearEstado(agentes_base, 0);
const estado_final_exito = ejecutarRama('ÉXITO LIMPIO', estado_exito, mision, instrucciones_exito_limpio);

const estado_fracaso = crearEstado(agentes_base, 0);
const estado_final_fracaso = ejecutarRama('FRACASO CATASTRÓFICO', estado_fracaso, mision, instrucciones_fracaso_catastrofico);

// ─── Reportes finales ─────────────────────────────────────────────────────────

console.log('\n\n══════════════════════════════════════════════════════');
console.log('REPORTE POST-OPERACIÓN — RAMA ÉXITO LIMPIO');
console.log('══════════════════════════════════════════════════════\n');
console.log(generarReporte(estado_final_exito, mision, evento));

console.log('\n\n══════════════════════════════════════════════════════');
console.log('REPORTE POST-OPERACIÓN — RAMA FRACASO CATASTRÓFICO');
console.log('══════════════════════════════════════════════════════\n');
console.log(generarReporte(estado_final_fracaso, mision, evento));

// ─── Resumen de test ──────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════');
console.log('RESUMEN DEL TEST');
console.log('══════════════════════════════════════════════════════');
console.log(`  Rama éxito:    muestra=${estado_final_exito.muestra_obtenida} bajas=${contarBajas(estado_final_exito)} nodos=${estado_final_exito.historial.length}`);
console.log(`  Rama fracaso:  muestra=${estado_final_fracaso.muestra_obtenida} bajas=${contarBajas(estado_final_fracaso)} nodos=${estado_final_fracaso.historial.length}`);
console.log('\n  Test completado sin errores.');
