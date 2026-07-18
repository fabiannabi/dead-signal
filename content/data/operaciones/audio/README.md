# Audio real del recon — cómo llenar esta carpeta

La síntesis procedural cubre la voz del códec y la cama de tensión. **Los sonidos
concretos van acá como grabaciones**: un disparo o un grito no se sintetizan bien,
y es lo que hace que todo suene a videojuego.

El sistema no se rompe si falta un archivo: lo que no esté declarado cae al
sintetizador. Se pueden reemplazar de a uno.

---

## Dónde bajar (todo de uso comercial libre)

| Fuente | Licencia | Sirve para |
|---|---|---|
| **[Sonniss GDC Bundle](https://gdc.sonniss.com/)** | Royalty-free, **sin atribución**. No revender los archivos sueltos; prohibido usarlos para entrenar IA. | Armas, criaturas, foley, ambientes. Es el estándar de la industria. |
| **[Freesound](https://freesound.org)** (filtrar **CC0**) | CC0 = dominio público | Todo. Verificar licencia archivo por archivo: conviven CC0 y CC-BY. |
| **[Pixabay SFX](https://pixabay.com/sound-effects/)** | Sin atribución | Ambientes, foley genérico. |
| **[OpenGameArt CC0](https://opengameart.org/content/cc0-sound-effects)** | CC0 | Criaturas, impactos. |

Para música por capas: buscar **"horror ambient stems"** o **"cinematic loop"** en
Pixabay o en itch.io filtrando CC0.

---

## Qué buscar para cada sonido

Los términos que mejor resultado dan en Freesound y Sonniss:

**Armas** — `rifle shot outdoor`, `gunshot distant echo`, `AK47 single`,
`shell casing concrete`, `rifle reload`, `explosion debris`

**Humanos** — `male scream pain`, `distant scream`, `body fall dirt`,
`footsteps gravel`, `running footsteps gravel`

**Criaturas** — `monster roar`, `creature screech`, `wet growl`, `hiss snake`,
`bone crunch`, `heavy footstep creature`, `wolf howl distant`

**Mundo** — `wind alley`, `dog bark distant`, `bird crow`, `crickets night`,
`metal sheet creak`, `wood creak`, `glass break`, `water drip`, `church bell distant`

---

## Cómo preparar los archivos

1. **Formato**: `.mp3` a 128–192 kbps, mono para SFX (pesa la mitad y todo se
   panea en código igual), estéreo solo para música y ambientes largos.
2. **Recortar el silencio del principio.** Un SFX que arranca 80 ms tarde se
   siente desincronizado aunque nadie sepa por qué.
3. **Normalizar** a un nivel parejo entre sonidos del mismo tipo.
4. **Nombrar** `clave-01.mp3`, `clave-02.mp3`… y ponerlos en `sfx/`.

### Las variantes importan

Poné **3 variantes de los sonidos que se repiten mucho** — disparo, pasos, casquillo.
El reproductor elige una al azar y le mueve la afinación ±6%. Un solo disparo
repetido idéntico es exactamente lo que delata a un juego.

Para los que suenan una vez por escena (explosión, campana) alcanza con uno.

---

## Cómo declararlos

En `manifest.json`, cada clave lista sus archivos:

```json
"sfx": {
  "disparo": ["sfx/disparo-01.mp3", "sfx/disparo-02.mp3", "sfx/disparo-03.mp3"],
  "grito":   ["sfx/grito-01.mp3"],
  "rugido":  ["sfx/rugido-01.mp3", "sfx/rugido-02.mp3"]
}
```

Las claves ya están todas listadas con array vacío: solo hay que llenarlas.

---

## Música por capas verticales

En vez de una pista por estado (que obliga a cortar o esperar), van **capas que
suenan todas a la vez y en fase**; el estado solo decide el volumen de cada una.
Pasar de patrulla a combate es un crossfade, nunca un corte.

Necesitás **loops de la misma duración, mismo tempo y misma tonalidad**:

```json
"musica": {
  "base":       ["musica/base.mp3"],        /* drone, siempre presente        */
  "tension":    ["musica/tension.mp3"],     /* entra en sospecha              */
  "percusion":  ["musica/percusion.mp3"],   /* entra en combate               */
  "duelo":      ["musica/duelo.mp3"]        /* reemplaza todo en la baja      */
}
```

Si conseguís **stems** de una pista (las pistas separadas del mismo tema) funciona
perfecto, porque ya vienen alineadas. Buscar "stems" en los packs de música.
