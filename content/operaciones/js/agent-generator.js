/**
 * agent-generator.js — Generador determinístico de agentes CENVAC
 * Mismo seed = mismo agente siempre.
 */

class SeededRNG {
  constructor(seed) { this.seed = seed >>> 0; }
  next() {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  pickN(arr, n) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < n && copy.length; i++) {
      result.push(copy.splice(this.int(0, copy.length - 1), 1)[0]);
    }
    return result;
  }
}

export function generarAgente(seed, { archetypes, traits, names, ranks }) {
  const rng = new SeededRNG(seed);
  const arch = rng.pick(archetypes);

  const compatibles = traits.filter(t => arch.rasgos_compatibles.includes(t.id));
  const pool_rasgos = compatibles.length >= 2 ? compatibles : traits;
  const rasgos_raw = rng.pickN(pool_rasgos, rng.int(2, 3));

  // Eliminar incompatibilidades
  const rasgos = rasgos_raw.filter((r, i) =>
    !rasgos_raw.slice(0, i).some(a => (r.incompatible_con || []).includes(a.id))
  );

  const nombre_obj = rng.pick(names);

  const stats = { ...arch.stats_base };
  let estamina_max = 100;
  let cordura_max = 100;

  for (const rasgo of rasgos) {
    for (const [s, d] of Object.entries(rasgo.modificadores_stat || {})) {
      stats[s] = Math.max(1, Math.min(10, (stats[s] || 5) + d));
    }
    estamina_max = Math.max(60, estamina_max + (rasgo.modificadores_estado?.estamina_max || 0));
    cordura_max  = Math.max(60, cordura_max  + (rasgo.modificadores_estado?.cordura_max  || 0));
  }

  const rango_pool =
    arch.id === 'recluta'  ? ranks.filter(r => r.nivel === 1) :
    arch.id === 'veterano' ? ranks.filter(r => r.nivel >= 4)  :
                             ranks.filter(r => r.nivel >= 2 && r.nivel <= 4);
  const rango = rng.pick(rango_pool.length ? rango_pool : ranks);
  const ops   = rango.nivel >= 4 ? rng.int(5, 15) : rng.int(0, rango.nivel * 2);

  return {
    id: `agente_${seed}`,
    seed,
    nombre_completo: nombre_obj.nombre_completo,
    genero: nombre_obj.genero,
    archetype_id: arch.id,
    nombre_rol: arch.nombre_rol,
    rango: rango.nombre,
    rango_abreviatura: rango.abreviatura,
    rango_nivel: rango.nivel,
    stats,
    rasgos,
    equipo: arch.equipo_estándar,
    voz: arch.voz,
    patron_radio: arch.patron_radio,
    estado: {
      estamina: estamina_max,
      estamina_max,
      cordura: cordura_max,
      cordura_max,
      heridas: [],
      vivo: true,
      operativo: true
    },
    recursos: { munición: 12, batería: 3, agua: 2, kit_médico: 1, contenedor_muestra: 1 },
    es_lider: false,
    operaciones_completadas: ops
  };
}

export function generarRoster(semillas, datos) {
  return semillas.map(s => generarAgente(s, datos));
}
