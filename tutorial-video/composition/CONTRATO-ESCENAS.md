# Contrato de escenas · Tutorial AdaptaPE

Video de 1920×1080 a 30 fps, en español, para personas con discapacidad motora o visual y sus familias. Tono cálido y claro. Cada escena es una sub-composición HyperFrames que construye una persona distinta, en paralelo. Este documento es la regla común.

## 1. Mapa del proyecto

```
composition/
  index.html              raíz: monta escenas, voz, música y capas (bloques GENERADO)
  datos/tiempos.json      FUENTE DE VERDAD de la narración (la genera tools/narrar.mjs; no editar a mano)
  datos/tiempos.js        window.TIEMPOS (generado; no editar)
  shared/tema.css         tokens de color, tipografía, espaciado y clases .ap-*
  shared/componentes.js   helpers window.AP (sección 5)
  shared/vendor/          gsap.min.js, three.module.min.js + three.core.min.js (locales)
  capas/                  progreso.html y subtitulos.html (generados; no editar)
  scenes/capNN-slug.html  UNA escena por capítulo (la tuya)
  scenes/_plantilla.html  punto de partida comentado
  compositions -> scenes  enlace simbólico: hace que `hyperframes lint` revise las escenas
  assets/marca/           logos y mascotas (ilustraciones y atlas de sprites)
  assets/capturas/        capturas reales de la extensión (ver INDICE.md)
  assets/audio/           capNN.wav (narración real) y musica.mp3
  tools/generar.mjs       regenera todo lo que depende de tiempos.json
```

Tu escena es **sólo** `scenes/capNN-slug.html` (el nombre exacto está en el `data-composition-src` de `index.html`). No edites nada más; si necesitas algo de `shared/`, pídelo en el board al diseño.

## 2. Ids y estructura

- Copia `scenes/_plantilla.html` y sustituye **todas** las apariciones de `capXX` por tu id (`cap05`).
- Todo (`<style>`, marcado, `<script>`) va **dentro de `<template>`**. Lo que quede fuera se descarta.
- Raíz: `<div id="capNN-raiz" class="ap-escena" data-composition-id="capNN" data-width="1920" data-height="1080">`. Se estiliza por id (`#capNN-raiz`), nunca por clase.
- **Todo id** empieza por `capNN-` (`cap05-nav`, `cap05-voz`). Todas las escenas comparten página al ensamblar.
- Clases propias: también con prefijo (`.cap05-tarjeta`). Las clases `.ap-*` son del sistema: úsalas, no las redefinas.
- Un único `gsap.timeline({ paused: true })`, registrado **al final** en `window.__timelines["capNN"]`.
- No pongas `data-duration` en la raíz: la duración la fija el host en `index.html`.
- Rutas: en atributos HTML, relativas al archivo (`../assets/marca/adapta-pe.webp`). En strings de JS (`img.src = …`, estilos inline), relativas a la raíz (`assets/capturas/base-popup.png`).

## 3. Tiempos: siempre desde las frases

Los tiempos son segundos **relativos al inicio de tu escena** (t = 0 cuando empieza tu capítulo y su narración).

```js
const ID = "cap05";
const cap = AP.capitulo(ID);          // {id, slug, titulo, inicio, duracion, audio, frases}
const frases = AP.frases(ID);         // ≡ TIEMPOS.capitulos.find(c => c.id === "cap05").frases
const f2 = AP.t(ID, "f2", 6);         // inicio de f2 (o 6 si f2 no existe)
const f2fin = AP.tFin(ID, "f2", 9);   // fin de f2
const porIndice = AP.t(ID, 1);        // también por índice 0-based
```

- Cada frase trae `visual`: la pista del guion sobre qué mostrar. Úsala.
- Pon siempre un respaldo (tercer argumento): si el guion se regenera con otra longitud, la escena no se rompe.
- Nunca escribas tiempos absolutos del video. Nunca uses `inicio` del capítulo dentro de la escena.
- `cap.duracion` = lo que dura tu capítulo. El host dura `duracion + 0.6 s`: el siguiente capítulo se funde encima. **No hagas salidas al final de la escena**: el fundido es la salida (sólo `cap13` funde a negro).

## 4. Zonas seguras

| Zona | Píxeles (y) | Quién la usa |
| --- | --- | --- |
| Barra de progreso | 0–96 | `capas/progreso.html` (etiqueta «Capítulo N de 12 · título») |
| Contenido | 96–840 | tu escena |
| Subtítulos | 840–1080 | `capas/subtitulos.html` |

- Márgenes laterales: 96 px (`--margen-lateral`). Usa `.ap-area` como caja de contenido si te sirve.
- Ningún **texto** de tu escena en y < 96 ni y > 840. Fondos y decoración pueden pasar por debajo (las capas tienen fondo propio).
- `AP.rotulo` ya se coloca encima de la franja de subtítulos.
- La comprobación `--caption-zone` (sección 8) marca como error cualquier texto tuyo en la franja inferior.

## 5. Helpers (`window.AP`)

Todos reciben `(tl, padre, opciones)`: el timeline de tu escena, el contenedor (Element o selector; normalmente la raíz) y un objeto. Construyen su DOM al instante y añaden tweens en los tiempos que les pases. `entrada: null` o ausente = visible desde el principio sin animación. `salida` = se apaga en ese instante (para cambiar de idea dentro de la escena). Coordenadas en px del lienzo relativas a `padre`.

### Datos y utilidades

| Firma | Devuelve |
| --- | --- |
| `AP.capitulo(id)` | objeto del capítulo |
| `AP.frases(id)` | `[{id, texto, inicio, fin, visual}]` |
| `AP.t(id, frase, respaldo?)` / `AP.tFin(...)` | segundos relativos a la escena |
| `AP.azar(semilla)` | función PRNG determinista `() → [0,1)` |
| `AP.iconos` | SVG de línea: `mic, atras, adelante, recargar, candado, pieza, minimizar, maximizar, cerrar, check, navegador, monitor, estrella, ojo, paleta, cursor, altavoz, cabeza` |
| `AP.entrar(tl, el, t, efecto, dur?)` | entrada estándar: `"subir" "bajar" "izquierda" "derecha" "escala" "rebote" "nada"` |
| `AP.salir(tl, el, t, dur?)` | se apaga y sube 24 px |
| `AP.pulso(tl, el, t, inicio, fin)` | destello: aparece en `t` con `inicio` y se desvanece hacia `fin` |
| `AP.escribir(tl, el, t, texto, dur?)` | texto letra a letra (reemplaza el contenido de `el`) |
| `AP.cambiarTexto(tl, el, t, texto, estilo?)` | cambia el texto con un fundido corto |

### Componentes

```js
// Fondo compartido (halos que respiran, puntos que derivan, viñeta). SIEMPRE el primero.
AP.ambiente(tl, raiz, { duracion: cap.duracion, semilla: 5, halos: true, puntos: true });

// Ventana de Chrome falsa. cuerpo = área de la página (fondo claro) para capturas o maquetas.
const nav = AP.navegador(tl, raiz, { id: "cap05-nav", x: 96, y: 120, ancho: 1400, alto: 700,
  pestana: "YouTube", favicon: null, url: "youtube.com", extension: "base" /* "lite" | null */,
  entrada: f2, efecto: "escala" });
nav.cuerpo.appendChild(miImagen);
nav.escribirUrl(f3, "es.wikipedia.org", 1);   // reescribe la URL letra a letra
nav.iconoExtension;                            // icono de AdaptaPE en la barra (para AP.foco o flecha)

// Ventana de app de escritorio (Windows 11 o macOS).
const app = AP.ventanaApp(tl, raiz, { id: "cap11-app", estilo: "windows" /* "macos" */,
  titulo: "AdaptaPE", edicion: "base", x: 260, y: 130, ancho: 1400, alto: 680, entrada: f1 });
app.cuerpo; // área de contenido

// Panel estilizado tipo popup con interruptores (para el popup REAL usa assets/capturas/).
const pop = AP.popup(tl, raiz, { id: "cap04-popup", edicion: "base", x: 1240, y: 150,
  interruptores: [{ texto: "Voz", activo: false, cambiaEn: f3 + 1 }, { texto: "Lectura", activo: true }],
  entrada: f2 });

// Burbuja de voz: «Computadora» en verde, pitido visual, palabras una a una y onda de audio.
AP.comandoVoz(tl, raiz, { id: "cap05-voz", texto: "Computadora, abre YouTube", x: 240, y: 560,
  entrada: f2, pitido: f2 + 0.2, duracion: 2.4, dictado: true, salida: f3 - 0.4 });

// Cursor con anillo de permanencia de 1 s. Métodos encadenables sobre el mismo tl.
const cur = AP.cursor(tl, raiz, { id: "cap08-cursor", x: 960, y: 540, tipo: "flecha" /* "punto" */, entrada: f1 });
cur.mover(f1 + 0.5, 700, 400, 0.8, "power2.inOut").dwell(f1 + 1.4, 1).clic(f2).ocultar(f3);

// Tarjeta de paso. `etiqueta` sustituye «Paso n de total» (p. ej. "Consejo 1 de 3").
AP.paso(tl, raiz, { id: "cap02-p1", n: 1, total: 3, texto: "Abre la tienda de Chrome", x: 96, y: 180, entrada: f2, salida: f3 - 0.4 });

// Chip de edición o plataforma. Tipos: base («Sólo Base»), lite («Sólo Lite»), ambos («Base y Lite»),
// extension, windows, macos, escritorio. `texto` opcional lo sustituye.
AP.chip(tl, raiz, { id: "cap07-chip", tipo: "base", x: 1540, y: 150, entrada: f1 + 0.5 });

// Título de capítulo (ocupa el área segura). `etiqueta` sustituye «Capítulo N».
AP.tituloCapitulo(tl, raiz, { id: "cap05-titulo", numero: 5, titulo: cap.titulo, sub: null, entrada: f1, salida: f2 - 0.5 });

// Rótulo inferior, encima de los subtítulos.
AP.rotulo(tl, raiz, { id: "cap05-rotulo", texto: "Di «Computadora» primero", lado: "izquierda", entrada: f3, salida: f4 });

// Foco: oscurece el resto y enmarca un rectángulo con borde verde que late. Añádelo DESPUÉS de lo que resalta.
AP.foco(tl, raiz, { id: "cap04-foco", x: 1240, y: 300, ancho: 560, alto: 90, radio: 20, oscurecer: true, latidos: 2, entrada: f3, salida: f4 });

// Flecha curva que se dibuja, con etiqueta opcional en el origen.
AP.flecha(tl, raiz, { id: "cap04-flecha", desde: [700, 500], hasta: [1220, 340], curva: 0.25, texto: "Aquí", entrada: f3, dur: 0.7, grosor: 8, salida: f4 });

// Mascota animada (cuchu = cuy, tinku = gallito, yati = llama).
// anim ∈ idle look sleep wake read phone scratch talk laptop confused happy wave
AP.mascota(tl, raiz, { id: "cap10-cuchu", nombre: "cuchu", x: 1500, y: 520, alto: 300,
  animaciones: [{ anim: "wave", desde: f2, hasta: f3 }, { anim: "idle", desde: f3, hasta: cap.duracion }], entrada: f2 });
```

Necesitas algo que no está (un componente nuevo, otra variante)? Pídelo en el board al grupo Diseño; no lo copies dentro de tu escena si otras lo van a necesitar.

## 6. Reglas de contenido (claridad, carga cognitiva baja)

1. **Mostrar, no sólo decir.** Cada frase narrada tiene un cambio visual que la ilustra, que empieza dentro de su ventana `[inicio, fin]` (mejor en los primeros 0,5 s). Lee la pista `visual` de cada frase.
2. **Una idea en pantalla a la vez.** Cuando cambia la idea, la anterior sale (`salida`) antes de que entre la nueva. Como mucho un foco de atención principal por momento.
3. **Rótulos cortos: ≤ 7 palabras.** El texto largo ya está en los subtítulos; no lo repitas en pantalla.
4. **Reconocer antes que recordar.** Muestra la interfaz real (capturas en `assets/capturas/`, ver `INDICE.md` con coordenadas de cada control) y señala el control exacto con `AP.foco` o `AP.flecha`.
5. **Consistencia.** Mismos helpers, mismos colores: verde = acción/activo; azul = Base; amarillo = Lite. El color nunca es el único indicador: los chips llevan texto.
6. **Hechos verificados.** Lo que dice la escena sale del guion (`tutorial-video/guion.json`) y de `tutorial-video/investigacion/`. No inventes funciones ni marques «Sólo Base» sin confirmarlo.
7. **Tamaños.** Texto de contenido ≥ 40 px; títulos 80–120 px; etiquetas ≥ 36 px en negrita. Nada de texto de interfaz falsa ilegible: si una captura se ve pequeña, acércala (escala) o resalta la zona.
8. **Movimiento con propósito.** Entradas de 0,3–0,8 s con eases variados; nada parpadea más de 3 veces por segundo; movimiento ambiental lento.

## 7. Determinismo y lint (lo que rompe el render)

- Prohibido: `Date.now()`, `performance.now()`, `Math.random()` (usa `AP.azar`), `fetch`, `setTimeout`/`setInterval` para animar, `requestAnimationFrame`, `repeat: -1` (calcula un número finito), eventos de ratón/teclado.
- Nunca animes `display`, `visibility` ni `autoAlpha` de un elemento con `data-start`/`class="clip"`. Usa opacidad en hijos.
- No combines un `transform` CSS inicial con un tween GSAP del mismo eje: usa `fromTo`. No centres con `translate(-50%,-50%)` si luego animas `x`/`y` (usa flex o `xPercent`).
- Entradas con `fromTo`, no `from`. Un `fromTo` aplica su estado inicial desde t = 0: si ese estado es visible (un destello, un anillo), usa `AP.pulso`.
- No midas el DOM con `getBoundingClientRect()` para posicionar tweens: calcula coordenadas fijas.
- Nada de `<br>` en texto corrido; los elementos que escalas deben ser bloque y tener tamaño.
- Familias tipográficas: usa `var(--ap-fuente-titulo)` / `var(--ap-fuente-texto)` o las clases `.ap-*`. Nombrar una familia en tu CSS exige un `@font-face` local en tu archivo.
- Sin `<audio>`/`<video>` con sonido en las escenas: la narración y la música viven en `index.html`. Un `<video>` mudo es válido (`muted playsinline`, con `id`, `data-start` y `data-duration`, sin `crossorigin`).
- three.js: importa `"three"` en un `<script type="module">` (el importmap está en `index.html`), dibuja desde el timeline (patrón de `scenes/cap00-intro.html`: un reloj con `onUpdate`) y registra `window.__hf.buildReady[...]`.

## 8. Validar tu escena sola

Desde `composition/`:

```bash
# 1. Lint rápido de todo el proyecto (incluye tu escena vía el enlace compositions -> scenes).
npx hyperframes lint

# 2. Fotogramas de tu escena (sólo su intervalo). Mira los PNG, uno a uno.
npx hyperframes snapshot --composition cap05 --frames 8
#    o en instantes exactos (segundos GLOBALES = cap.inicio + tiempo local):
npx hyperframes snapshot --at 160.3,166.0 --no-end

# 3. Gate de tu tramo: runtime, layout, contraste y zona de subtítulos.
npx hyperframes check --range 148.6,183.3 --caption-zone "x0=0;y0=0.78;x1=1;y1=1;severity=error"

# 4. ¿Está index.html al día con tiempos.json?
node tools/generar.mjs --check
```

`cap.inicio` de cada capítulo: `node -e 'for (const c of require("./datos/tiempos.json").capitulos) console.log(c.id, c.inicio, c.inicio + c.duracion)'`.

Antes de entregar: `lint` con 0 errores, `check --range` de tu tramo con 0 errores, y has mirado los snapshots (texto legible, nada en las zonas reservadas, cada frase con su cambio visual).

## 9. Regenerar (orquestador)

`datos/tiempos.json` lo produce `node tools/narrar.mjs` (desde `tutorial-video/`) a partir de `guion.json`, junto con `assets/audio/capNN.wav`. Después:

```bash
node tools/generar.mjs          # tiempos.js, bloques GENERADO de index.html, capas/, escenas y WAV que falten
node tools/generar.mjs --check  # sale con 1 si algo quedó desactualizado
node tools/generar.mjs --carve  # opcional: carve de la música contra la voz (requiere `npm i -D @hyperframes/core`)
```

`generar.mjs` nunca sobrescribe `tiempos.json`, los WAV existentes ni una escena existente. Reescribe sólo lo que hay entre los marcadores `<!-- GENERADO:… -->` de `index.html`, el `data-duration` de `#root`, `datos/tiempos.js` y `capas/`. Los subtítulos parten las frases largas en bloques de ≤ 84 caracteres con tiempo proporcional a su longitud.

## 10. Qué NO hacer

- Editar `index.html`, `shared/`, `capas/`, `datos/` o la escena de otra persona.
- Texto en la franja de progreso (y < 96) o de subtítulos (y > 840).
- Párrafos en pantalla, más de una idea a la vez, rótulos de más de 7 palabras.
- Estética genérica de SaaS: degradados de texto, neón, tarjetas idénticas en rejilla sin jerarquía.
- Animar la salida de todo al final de tu escena (el fundido entre capítulos ya lo hace).
- Cargar librerías desde internet: todo es local (`shared/vendor/`).
- Usar el color como única señal (añade texto o icono).
