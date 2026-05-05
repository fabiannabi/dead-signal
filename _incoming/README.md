# _incoming/

Esta carpeta es el punto de entrada para contenido nuevo del proyecto Señal Muerta.

Cuando generes un capítulo, entrada del bestiario, o cualquier texto nuevo en tu conversación con Claude, guárdalo aquí como archivo `.txt` o `.md` antes de pedirle que lo integre al sitio.

## Convención de nombres

```
personaje_nombre_capX.txt       ← capítulo de personaje
bestiario_nombre-criatura.txt   ← entrada del bestiario
cronologia_diaX.txt             ← entrada de cronología
nota_descripcion.txt            ← cualquier otro contenido
```

## Flujo

1. Dejas el archivo aquí
2. Le dices a Claude qué integrar y en qué página
3. Claude lee el archivo, lo integra al HTML respetando el estilo existente
4. Commit + push
5. El archivo en `_incoming/` se puede borrar o archivar

Los archivos en esta carpeta no son parte del sitio — son materia prima.
