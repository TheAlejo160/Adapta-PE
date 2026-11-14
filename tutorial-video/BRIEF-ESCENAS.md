# Brief común para constructores de escenas

Proyecto HyperFrames: `/Users/thealejo/PycharmProjects/WelcomeScreen/extensión/tutorial-video/composition/` (1920×1080, 30 fps). Video tutorial en español, voz femenina amable, para personas con discapacidad motora o visual y sus familias, sin conocimientos técnicos.

## Lee primero (en este orden)
1. `composition/CONTRATO-ESCENAS.md`: reglas, ids, zonas seguras, helpers `window.AP` con ejemplos. Es obligatorio.
2. `composition/scenes/_plantilla.html` y la escena terminada `composition/scenes/cap00-intro.html` como referencia de estilo.
3. `composition/shared/componentes.js` y `composition/shared/tema.css`.
4. `composition/datos/tiempos.json`: tus capítulos, cada frase con `inicio`/`fin` (segundos relativos al capítulo) y `visual` = qué mostrar mientras se dice.
5. `composition/assets/capturas/INDICE.md`: capturas reales de la extensión con coordenadas de controles.
6. Hechos verificados: `tutorial-video/investigacion/extension.md` y `tutorial-video/investigacion/escritorio.md`. No inventes funciones, etiquetas ni pasos.
7. Skills a aplicar: `hyperframes-core`, `hyperframes-animation` (técnicas, transiciones), `impeccable` y `ux-heuristics`. Si tu herramienta no carga skills, los archivos están en `/Users/thealejo/.claude/skills/<nombre>/SKILL.md`.

## Reglas
- Edita SÓLO tus archivos `composition/scenes/capNN-*.html`. No toques `index.html`, `shared/`, `datos/`, `capas/`, `tools/`, `assets/` ni escenas ajenas. Si falta un helper, impleméntalo dentro de tu escena con ids prefijados `capNN-` y avisa en el board.
- Mantén el `data-composition-id`, el id del host y la clave `window.__timelines` que ya tiene tu placeholder.
- Cada frase narrada debe tener un cambio visual que la ilustre, sincronizado con su `inicio` (usa `AP.t('capNN','fK')`). Mostrar, no sólo decir. Una idea en pantalla a la vez; rótulos de ≤7 palabras; nada de párrafos.
- Usa las capturas reales (PNG) cuando la frase habla de la extensión: panel, bienvenida, permisos, Nueva pestaña, Wikipedia con filtro. Resáltalas con `AP.foco`/`AP.flecha` usando las coordenadas de INDICE.md (escala la imagen y convierte coordenadas).
- Para escritorio y para la cámara usa mockups con los helpers (`ventanaApp`, `cursor`, `comandoVoz`, etc.) y SVG/CSS propios; etiquetas exactas de la investigación.
- Movimiento: GSAP (timeline pausada única) y, si aporta, three.js local de `shared/vendor/`. Suave, con propósito, sin parpadeos ni destellos (público con sensibilidad visual). Fácil de seguir: el foco visual va donde habla la voz.
- Accesibilidad: contraste ≥4.5:1, texto grande (≥40 px cuerpo), nunca tapar la franja de subtítulos (y ≥ 78 % de la altura) ni la barra de progreso.
- Determinismo y lint de HyperFrames según el contrato (sin Math.random sin semilla, sin relojes, sin red, sin `repeat:-1`, sin transform CSS inicial en nodos animados por GSAP).

## Validación obligatoria antes de terminar (desde `composition/`)
1. `npx hyperframes lint` sin errores en tus archivos.
2. `npx hyperframes check --caption-zone "x0=0;y0=0.78;x1=1;y1=1;severity=error" --range <inicio>,<fin>` con el rango global de tus capítulos (`inicio` y `duracion` de cada capítulo en tiempos.json), 0 errores.
3. `npx hyperframes snapshot --composition capNN --frames 8` por capítulo: abre y mira los PNG (contact-sheet). Corrige superposiciones, textos cortados, huecos vacíos y desincronías.
4. Publica un resumen en el board (`mcp__orchestra__board` post, to "orchestrator") si tienes esa herramienta, y en tu respuesta final lista archivos, qué muestra cada frase y cualquier limitación.
