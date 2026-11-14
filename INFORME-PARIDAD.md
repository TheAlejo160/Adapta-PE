# AdaptaPE · Informe de paridad (21/10/2026)

**Alcance:** las 6 ediciones con paridad (extensión, Windows y macOS, en Base y Lite) más AdaptaPE Browser. Pro/Deluxe, la web y Trailer quedaron fuera por decisión.
**Estado:** todo el código está en los árboles de trabajo, **sin commits**. Plan: `.orchestra/PLAN-PARIDAD.md`. Registro de traspaso: `.orchestra/ESTADO-PARIDAD.md`. Informes de cada agente: `.orchestra/reports/` y `<repo>/.orchestra/`.

---

## 1. Resultado en una línea por nivel

| Nivel | Paridad funcional | Única brecha de código | Lo que falta |
|---|---|---|---|
| **Lite** (Ext, Win, Mac) | ~99 % | ninguna | Probar los filtros multimonitor en hardware |
| **Base** (Ext, Win, Mac) | ~98 % | **Clic con la boca en Windows**: YuNet sólo da 5 puntos | Validar la cinética con cámaras y personas reales |

Criterio: ✅ = 1, ◐ = 0,5 (lógica lista pero sin probar en hardware), ✗ = 0. No penalizan los límites de plataforma ni la IA opcional, que es una excepción permitida. Fuente: la auditoría final de Gemini 3.8 Flash high (`.orchestra/reports/20261021-2312-agy-22.md`), contrastada con el barrido de tests de §4. Sus números de línea son aproximados; los porcentajes, orientativos.

---

## 2. Qué se implementó (por ola)

| Ola | Qué | Ediciones |
|---|---|---|
| **1** | Catálogo común `nativo-v1.json` consumido por escritorio; **6 idiomas de órdenes** (es/en/pt/de/fr/it); familias de órdenes que faltaban (pestaña N, duplicar, cerrar otras, silenciar, ayuda hablada, disparadores, callar/cancelar unificados, scroll con cantidad, «busca en YouTube» sin consulta); **confirmación de acciones destructivas**; **latencia** (macOS: silencio de 0,5 s y sin reiniciar la tarea en cada orden; Windows: el motor de voz sale del hilo de la interfaz); validación del nombre | 6 |
| **2** | **Contrato de voz común:** activación por pronunciación (literal, perfil español acotado y tabla cerrada; «yarbis» = Jarvis); **alias** (hasta 3) con **«Probar nombre»** y «Añadir como alias»; interruptor **«También responder a Computadora»** (apagado); **modo conversación** (apagado); **tolerancia de órdenes** de un token que nunca corrige hacia destructivas; vocativos («oye Jarvis…»); «cancelar» sin apagar el micrófono | 6 |
| **3A** | Extensión: **tutorial práctico** con ejercicios reales (orden de voz «tutorial» y botón); **filtros con muestras** y «sólo un filtro a la vez»; **HUD de permiso de cámara** («se quedó cargando»); dwell (500-1500 ms) y atracción configurables | Ext Base/Lite |
| **3B** | Escritorio: la **misma secuencia de tutorial** (desde el catálogo), filtros con muestras, **escala de controles** 100/125/150 % y ≥44 px | Win/Mac Base/Lite |
| **3C** | Escritorio: **interfaz en 6 idiomas** con la misma preferencia que la voz y cambio en vivo; mascotas `happy`/`confused`/`read` | Win/Mac Base/Lite |
| **4** | Escritorio Base: **pinza, puño-reposo, mano falsa** (0,8/0,6 y esqueleto), **carga adaptativa**, **zona 13.0**, histéresis del joystick, continuidad de 500 ms; **TalkBack** que sigue el foco del teclado, debounce real de 300 ms, contorno y privacidad; **valores por defecto comunes** (400 px/s de máximo, 240 con temblor); **boca en macOS** (innerLips) | Win/Mac Base |
| **5** | Browser: `vendor/` sincronizado con la extensión, conservando sus adaptaciones (motor con ImageBitmap, scroll del panel, estilos de TalkBack) | Browser |

**Respuesta directa a tu prueba con «Jarvis»:** la extensión y las 4 apps de escritorio aceptan ahora «yarbis», «yarvis» y «jarbis» como Jarvis (tabla cerrada del catálogo). Si un nombre se oye de otra forma, «Probar nombre» muestra cómo lo entendió el reconocedor y permite guardarlo como alias.

---

## 3. Correcciones encontradas por las revisiones cruzadas

Cada ola tuvo un revisor de otro modelo distinto del autor.

| Revisión | Hallazgos | Ejemplos |
|---|---|---|
| 1A, extensión (GPT-6.1 Sol) | 7 + 8 corregidos | «bonito» activaba a «Benito»; «cierra esta pestaña» cerraba sin confirmar; «cancelar» no anulaba la confirmación; los alias no funcionaban con el nombre predeterminado |
| Windows Base, cierre 1B (Codex) | 1 de seguridad | «sierra» cerraba la aplicación |
| Ola 2 macOS (Opus 5.5) | 1 | durante una confirmación se aceptaba cualquier frase |
| Ola 3B macOS (orquestador) | 2 errores de compilación | `.executed` inexistente; expresión demasiado compleja |
| Ola 4 macOS (Opus 4.6) | 3 corregidos, 1 descartado con test | el dwell se reiniciaba al volver rápido al botón; clic tardío tras perder la mano; doble lectura de TalkBack |
| Ola 4 Windows (Sonnet 5.5) | 1 alta, 3 medias y 6 bajas corregidas; 2 diferidas | **el modo zona se bloqueaba si no te movías 1,2 s**; la confianza de la mano usaba el escalar equivocado |

---

## 4. Testeos: barrido final (21/10, ~23:20 UTC)

| Edición | Resultado |
|---|---|
| Extensión Base/Lite | voz 24 · motores 75 · cinético 31 · detección 7 · catálogo OK · `--check` vigente en ambas · **`browser.test.cjs` en Chrome real: OK** |
| Windows Base | **9.869** comprobaciones · compila `net10.0-windows`, `net48`, `net461` |
| Windows Lite | **9.055** comprobaciones · los 3 targets compilan |
| macOS Base | `xcodebuild test`: **TEST SUCCEEDED** (84 tests en la ola 4) |
| macOS Lite | `xcodebuild test`: **TEST SUCCEEDED** (36 tests) |
| Browser | `npm test` 21/21 |

**Contratos de copias:** los archivos compartidos Base↔Lite son idénticos en las 3 plataformas (comprobado con `cmp`), y el catálogo y los dos fixtures tienen el mismo SHA-256 en todas las copias.

**Qué NO prueban estos tests:** voz real (micrófono y acento), latencia real, cámaras ni personas, UIA/WPF en Windows (todo se compiló en cruzado desde macOS), filtros multimonitor e instaladores. Son tests de lógica.

---

## 5. Pendiente, por prioridad

**Decisión tuya**
1. **Clic con la boca en Windows Base:** hace falta un modelo local de puntos faciales con boca (p. ej. una malla facial ONNX). Implica descargar y empaquetar un modelo nuevo y su licencia. La lógica y el contrato ya están listos (`MouthOpening`).
2. **Commits:** cuando lo apruebes, uno por repo, sin coautoría. Hay muchos cambios sin confirmar:

| Repo | Archivos |
|---|---|
| extensión | 27 |
| extensiónLite | 21 |
| Windows Base | 38 |
| Windows Lite | 28 |
| macOS Base | 35 |
| macOS Lite | 29 |

**Por probar en hardware (lo hace una persona)**
3. Nombre por pronunciación con el micrófono: Jarvis/«yarbis», un nombre con tilde, alias y «Probar nombre».
4. Modo conversación: que la voz sintética no se oiga a sí misma (eco).
5. Cursor: velocidad nueva más lenta, dwell, pinza, puño y boca (Mac), con al menos 3 personas, como pedía el feedback.
6. Windows real: WPF/UIA, DPI y escala, instalador NSIS, SAPI y Vosk.
7. macOS: permisos TCC del tutorial, firma, notarización y DMG.
8. Filtros en varios monitores.

**Técnico menor**
9. Windows ola 4, diferidos con justificación: identidad HWND en ventanas emergentes de TalkBack y plazo de pinza con inferencias >150 ms.
10. `Textos.cs` y `Textos.swift` compartidos incluyen textos de cámara y cursor que Lite no usa (sólo datos). `DesktopAccess.cs` compartido trae `AtCursor()`, que Lite no usa.
11. Formato de atlas de mascotas distinto por plataforma (WebP 2356 / PNG 1178; JSON lista frente a diccionario).
12. Browser: falta `npm run test:smoke` y una prueba manual.
13. Pro/Deluxe (fuera de alcance), sigue pendiente de `Posibles_cambios.md`: «cancelar» apaga el micrófono, faltan ejecutores y Laya ocupa 2,57 GiB.
14. Web: actualizar los textos que dicen que «Computadora» es fijo y revisar los nombres rotos de las reseñas (T-18).

---

## 6. Cómo se orquestó

| Rol | Modelo |
|---|---|
| Lógica difícil (contrato de voz, cinética) | Claude Opus 5.5 high · GPT-6.1 Sol high/xhigh |
| Ports y UX moderados | Gemini 3.8 Flash high · Claude Sonnet 5.5 |
| Revisiones | modelo distinto del autor (Sol ↔ Opus ↔ Sonnet ↔ Opus 4.6) |
| Auditorías amplias | Gemini 3.8 Flash high |
| Verificación final | orquestador: cada ola probada con node, dotnet o xcodebuild antes de cerrarla |

Las cuotas se agotaron dos veces (Claude, Codex y créditos Claude de Antigravity). El trabajo continuó desde el registro de traspaso sin perder el hilo.
