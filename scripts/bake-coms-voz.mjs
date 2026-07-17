/**
 * bake-coms-voz.mjs — Pre-renderiza las líneas del códec de la Sala con ElevenLabs
 * y las hornea como MP3 en el repo (camino B del brief §2.2). La API key vive SOLO
 * en tu entorno; nunca se sube ni llega al navegador.
 *
 * Uso (PowerShell):
 *   $env:ELEVEN_API_KEY="sk-..."
 *   $env:ELEVEN_VOICE_LIDER="<voiceId>"
 *   $env:ELEVEN_VOICE_MIEMBRO="<voiceId>"
 *   $env:ELEVEN_VOICE_CONTROL="<voiceId>"
 *   node scripts/bake-coms-voz.mjs
 *
 * Salida: content/operaciones/assets/audio/coms/<clave>.mp3 + manifest.json
 * Incremental: no re-genera un clip que ya existe (borrá el mp3 para rehacerlo).
 * La sala reproduce el clip si está en el manifiesto; si no, cae al TTS del navegador.
 */
import { mkdir, writeFile, readdir, access } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { claveVoz } from '../content/operaciones/js/coms-hash.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../content/operaciones/assets/audio/coms');

const API_KEY = process.env.ELEVEN_API_KEY;
const VOZ = {
  lider: process.env.ELEVEN_VOICE_LIDER,
  miembro: process.env.ELEVEN_VOICE_MIEMBRO,
  control: process.env.ELEVEN_VOICE_CONTROL,
};
const MODELO = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';
const FORCE = !!process.env.ELEVEN_FORCE;   // ELEVEN_FORCE=1 → re-genera aunque exista
const ES_V3 = /v3/.test(MODELO);            // los tags de emoción [..] solo aplican en v3

if (!API_KEY) { console.error('Falta ELEVEN_API_KEY en el entorno.'); process.exit(1); }
for (const r of ['lider', 'miembro', 'control']) if (!VOZ[r]) { console.error(`Falta ELEVEN_VOICE_${r.toUpperCase()} (voiceId de ElevenLabs).`); process.exit(1); }

// Líneas del códec: [rol, texto, tag_emocion?]. El texto DEBE coincidir con
// ui-sala.js (la clave del clip se calcula solo de rol+texto). El tag entre []
// da emoción y SOLO se usa si el modelo es v3; en v2 se ignora. Las líneas
// dinámicas (con nombre de calle) NO se hornean: quedan en TTS.
const LINEAS = [
  // Tránsito
  ['miembro', 'Sector muerto. Ni un perro.', '[tense]'],
  ['lider', 'Mantengan formación. No me gusta este silencio.', '[wary]'],
  ['miembro', 'Huele a drenaje abierto por aquí.', '[disgusted]'],
  ['control', 'Sigan el corredor. No se desvíen.', '[flat]'],
  ['lider', 'Ojos abiertos. Nada es lo que parece.', '[wary]'],
  // Contacto
  ['miembro', '¡Movimiento! A las diez.', '[urgent, whispered]'],
  ['lider', 'Alto. Nadie dispara. Control, ¿ven esto?', '[tense]'],
  ['control', 'Negativo desde aquí. Ustedes son mis ojos.', '[flat]'],
  // Llegada calma
  ['lider', 'En posición. Perímetro despejado.', '[calm]'],
  ['control', 'Recibido. Mantengan y reporten.', '[flat]'],
  // Falsos positivos
  ['miembro', '...creí ver algo. Nada. Falsa alarma.', '[nervous, sighs]'],
  ['miembro', 'Fue una rata. Solo una rata.', '[nervous]'],
  ['lider', 'Sombras y nervios. Manténganse.', '[reassuring]'],
  // Asalto
  ['lider', '¡Contacto encima! ¡Formen, cúbranse!', '[shouting]'],
  ['control', 'Unidad, los tengo en cámara. Aguanten.', '[urgent]'],
  ['miembro', '¡Me rozó! Aguanto.', '[pained, strained]'],
  ['miembro', '¡Esquivado! ¡Firmes!', '[relieved, adrenaline]'],
  ['control', 'Aguanten. Rómpanlo hacia el norte.', '[urgent]'],
  ['lider', 'Nos dio duro... pero se replegó. Tenemos un herido.', '[exhausted]'],
  ['control', 'Recibido. Sáquenlo de ahí.', '[urgent]'],
  ['lider', '¡Rompimos contacto! Un golpe, nada grave.', '[relieved]'],
  ['lider', '¡Lo repelimos limpio! Se replegó.', '[relieved]'],
  // QTE ok/fail
  ['miembro', '¡Salté! Por poco.', '[breathless, relieved]'],
  ['miembro', 'Me alcanzó. Puedo seguir.', '[pained]'],
  ['miembro', 'Firme. Salté al borde.', '[breathless]'],
  ['miembro', 'Caí. La rodilla.', '[pained, grunt]'],
  ['lider', 'Alto — lo vi. Nadie se mueve.', '[urgent, whispered]'],
  ['lider', 'Sonó algo arriba. Nos oyeron.', '[alarmed, whispered]'],
  // Decisiones
  ['lider', 'Control, paso bloqueado. ¿Forzamos o rodeamos?', '[tense]'],
  ['control', 'Autorizado. Rápido.', '[flat]'],
  ['miembro', 'Cede... pero sonó por todo el sector.', '[worried]'],
  ['lider', 'El rodeo nos costó tiempo y aliento. Seguimos, más gastados.', '[exhausted]'],
  ['lider', 'Sin respuesta. Forzamos por instinto — y sonó.', '[frustrated]'],
  ['miembro', 'Hay un cuerpo en el paso, con algo encima. ¿Revisamos o seguimos?', '[uneasy]'],
  ['miembro', 'Lleva documentos... intel. Y esto no murió hace mucho.', '[uneasy]'],
  ['control', 'Buen hallazgo. Muévanse.', '[flat]'],
  ['lider', 'Lo dejamos. Con él se va lo que supiera.', '[regretful]'],
  ['miembro', 'Me congelé. Lo dejo — y con él, lo que sabía.', '[ashamed]'],
  // Reconocimiento
  ['control', 'Recibido. Buen material. Sigan.', '[flat]'],
  ['miembro', 'Marcas frescas... algo pasó por aquí. No hace mucho.', '[uneasy, whispered]'],
  ['control', 'Marcado. Ojo con lo que despertaron.', '[flat]'],
  ['miembro', 'Nada. Polvo y silencio.', '[flat, tired]'],
  ['lider', 'Anótalo igual. El vacío también es dato.', '[calm]'],
  ['lider', 'Algo se movió al llegar. ¡Ojo!', '[alarmed]'],
  // Intro
  ['control', 'Unidad en el sector. Objetivo: reconocer y recuperar intel. Reporten cada punto.', '[flat]'],
];

const existe = async (p) => access(p).then(() => true).catch(() => false);

async function tts(voiceId, texto) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texto, model_id: MODELO, voice_settings: { stability: 0.3, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true } }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

await mkdir(OUT, { recursive: true });
const manifest = [];
let nuevos = 0, saltados = 0;

for (const [rol, texto, tag] of LINEAS) {
  const clave = claveVoz(rol, texto);            // clave = solo rol+texto (el tag no cuenta)
  manifest.push(clave);
  const dest = join(OUT, `${clave}.mp3`);
  if (!FORCE && await existe(dest)) { saltados++; continue; }
  const emo = (ES_V3 && tag) ? `${tag} ${texto}` : texto;   // el tag da emoción solo en v3
  process.stdout.write(`· ${rol.padEnd(7)} ${texto.slice(0, 38)}… `);
  try {
    const mp3 = await tts(VOZ[rol], emo);
    await writeFile(dest, mp3);
    nuevos++;
    console.log(`✔ ${clave}.mp3`);
  } catch (e) { console.log(`✗ ${e.message}`); }
}

await writeFile(join(OUT, 'manifest.json'), JSON.stringify([...new Set(manifest)], null, 0));
console.log(`\nHorneado: ${nuevos} nuevos · ${saltados} ya existían · manifest.json con ${new Set(manifest).size} claves.`);
console.log(`→ ${OUT}`);
