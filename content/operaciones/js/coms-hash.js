/**
 * coms-hash.js — Clave estable de un clip de voz por (rol, texto).
 * La comparten la sala (navegador) y el horneador (Node) para que el nombre del
 * MP3 pre-renderizado coincida con la línea que se reproduce en runtime.
 */
export function claveVoz(rol, texto) {
  const s = rol + '|' + String(texto).trim().replace(/\s+/g, ' ');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
