/**
 * dice.js — Sistema de checks para CENVAC Operaciones
 * Fórmula: stat (1-10) + d10 vs dificultad
 */

export function tirarCheck({ stat, valor_stat, dificultad, modificadores = [] }) {
  const d10 = Math.floor(Math.random() * 10) + 1;
  const mod_total = modificadores.reduce((s, m) => s + (m.valor || 0), 0);
  const total = valor_stat + d10 + mod_total;
  const diferencia = total - dificultad;

  let resultado;
  if (diferencia >= 5)       resultado = 'crítico_éxito';
  else if (diferencia >= 0)  resultado = 'éxito';
  else if (diferencia > -5)  resultado = 'fallo';
  else                       resultado = 'crítico_fallo';

  return { tirada: d10, modificadores, mod_total, total, dificultad, diferencia, resultado };
}

export function calcularModificadoresAgente(agente, contexto = {}) {
  const mods = [];
  const { stat } = contexto;

  for (const herida of (agente.estado?.heridas || [])) {
    const delta = herida.efecto_stat?.[stat];
    if (delta) mods.push({ fuente: `herida_${herida.tipo}_${herida.parte_cuerpo}`, valor: delta });
  }

  const estamina = agente.estado?.estamina ?? 100;
  if (estamina < 30) mods.push({ fuente: 'estamina_baja', valor: -2 });

  const cordura = agente.estado?.cordura ?? 100;
  if (cordura < 30 && stat === 'mental') mods.push({ fuente: 'cordura_baja', valor: -2 });

  for (const rasgo of (agente.rasgos || [])) {
    const delta = rasgo.modificadores_stat?.[stat];
    if (delta) mods.push({ fuente: `rasgo_${rasgo.id}`, valor: delta });
  }

  return mods;
}

export function seleccionarAgente(equipo, criterio, stat = null) {
  const activos = equipo.filter(a => a.estado?.vivo !== false && a.estado?.operativo !== false);
  const pool = activos.length ? activos : equipo;

  if (criterio === 'lider')       return pool.find(a => a.es_lider) || pool[0];
  if (criterio === 'mejor_stat')  return pool.reduce((best, a) => (a.stats?.[stat] || 0) > (best.stats?.[stat] || 0) ? a : best);
  if (criterio === 'aleatorio')   return pool[Math.floor(Math.random() * pool.length)];
  return pool.find(a => a.archetype_id === criterio) || pool[0];
}
