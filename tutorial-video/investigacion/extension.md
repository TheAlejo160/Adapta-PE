# Investigación para Guion de Video Tutorial: AdaptaPE (Extensión de Navegador)

> **Documento de hechos verificados en código** para el guion del video tutorial en español de AdaptaPE (ediciones Base y Lite).
> **Audiencia del video:** Personas sin conocimientos técnicos, usuarios con necesidades de accesibilidad, familiares y acompañantes.
> **Versiones de referencia:** AdaptaPE Base v13.0 y AdaptaPE Lite v3.0 (Manifest V3, Chromium 119+).

---

## 1. Qué es AdaptaPE y para quién es

### ¿Qué es en una frase?
**AdaptaPE** es una extensión de navegador de código abierto para navegadores basados en Chromium que permite navegar por la web completamente sin usar las manos, combinando órdenes de voz, control del cursor mediante la cámara web (con la cabeza, brazos, manos, puños o un muñón), lectura en voz alta de lo que señalas y filtros de color adaptativos. *(Cita: `README.md`, líneas 7-8; `CLAUDE.md`, líneas 11-14)*.

### ¿Para quién es?
- **Personas con movilidad reducida o nula en miembros superiores:** Personas con cuadriplejia, temblores, amputaciones, ausencia de extremidades, debilidad muscular o dificultades de motricidad fina que no pueden o prefieren no utilizar ratón ni teclado físicos. *(Cita: `README.md`, líneas 34-36)*.
- **Personas con discapacidad visual o daltonismo:** Quienes se benefician de escuchar el texto y los botones al pasar el cursor (TalkBack) o de modificar la paleta de colores de cualquier página web para distinguir elementos según su tipo de percepción cromática. *(Cita: `README.md`, línea 37)*.
- **Familiares, terapeutas y acompañantes:** Quienes asisten a otra persona en la instalación inicial, fijación del icono en la barra y concesión de permisos. *(Cita: `README.md`, línea 38)*.
- **Cualquier usuario en general:** Que busque descansar los brazos, dictar textos largos en formularios o navegar mientras realiza otras tareas. *(Cita: `extensiónLite/README.md`, líneas 68-72)*.

### Diferencias exactas: Base vs. Lite

| Característica / Módulo | AdaptaPE Base (v13.0) | AdaptaPE Lite (v3.0) | Archivo de referencia |
| :--- | :---: | :---: | :--- |
| **Control por voz global** (órdenes en 6 idiomas, wake word, dictado) | **Sí** | **Sí** | `sitios.js`, `classes/VoiceAssistant.js` (idénticos byte a byte) |
| **Siete filtros de color para daltonismo** (SVG en webs y marcos) | **Sí** | **Sí** | `classes/FiltrosDaltonismo.js`, `filtros_frames.js` |
| **Mascotas interactivas** (Tinku, Cuchu y Yati) | **Sí** | **Sí** | `mascotas/Mascota.js`, `mascotas/motor.js` |
| **Nueva pestaña propia** (temas, accesos directos, marcadores, modo IA) | **Sí** | **Sí** | `nueva_pestana.html`, `nueva_pestana.js` |
| **Lectura en voz alta (TalkBack)** al señalar elementos con el cursor | **Sí** | **No** | Base: `classes/TalkBack.js`; Lite: omitido en manifest |
| **Cursor con cámara web (KineticEngine)** | **Sí** | **No** | Base: `classes/KineticEngine.js`; Lite: omitido |
| **Modos de cámara** (Cabeza/torso, Brazos/manos/puños, Muñón/mano parcial) | **Sí** | **No** | Base: `classes/KineticEngine.js`, `voz/camara.js` |
| **Métodos de clic sin manos** (Dwell 1s, pinza, boca abierta, puño) | **Sí** | **No** | Base: `classes/KineticEngine.js` |
| **Modelos de visión local (MediaPipe)** empaquetados sin servidor externo | **Sí** (en CPU local) | **No** (sin modelos ni WASM) | Base: `vision/trabajador.js`, `vision/*.task` |
| **Política de seguridad (CSP)** | `wasm-unsafe-eval` | Estándar de Manifest V3 | `manifest.json` en ambas carpetas |
| **Documento offscreen en segundo plano** | Voz y captura de cámara | Exclusivamente voz | `voz/escucha.html` en ambas carpetas |
| **Perfil de equipo recomendado** | Computadoras con cámara web estándar | Laptops modestas o antiguas sin cámara | `README.md` línea 55; `extensiónLite/README.md` línea 70 |

> **Regla de convivencia crítica:** Si un usuario tiene instaladas ambas extensiones a la vez, **debe activar el Control por voz sólo en una**. Cada una tiene su propio proceso de escucha y competirían por el micrófono, repitiendo órdenes o interfiriendo entre sí. *(Cita: `README.md`, línea 55; `extensiónLite/README.md`, línea 48)*.

---

## 2. Instalación paso a paso de la extensión

### Requisitos previos verificados
- Navegador Google Chrome u otro navegador Chromium de escritorio (Microsoft Edge, Brave) en **versión 119 o posterior** (`minimum_chrome_version: "119"`). *(Cita: `manifest.json`, línea 73)*.
- Micrófono conectado (para voz).
- Cámara web (para cursor en Base).
- No requiere instalar Node.js, Python ni compilar código alguno para el usuario final. *(Cita: `README.md`, línea 65)*.

### Opción A: Desde Chrome Web Store
1. Ingresar al enlace oficial de la tienda:
   - Base: [AdaptaPE en Chrome Web Store](https://chromewebstore.google.com/detail/haglphebolbegbchdkgejkoblocehogp?utm_source=item-share-cb). *(Cita: `README.md`, línea 11)*.
   - Lite: [AdaptaPE Lite en Chrome Web Store](https://chromewebstore.google.com/detail/amjlgkcmgpdcngjagmplgmhiicfpnkhh). *(Cita: `extensiónLite/README.md`, línea 9)*.
2. Hacer clic en el botón azul **«Añadir a Chrome»**.
3. Confirmar el diálogo del navegador pulsando **«Añadir extensión»**.
4. Se abre inmediatamente la página de bienvenida. *(Cita: `README.md`, líneas 71-73)*.

### Opción B: Cargar descomprimida desde el código fuente
1. **Descargar la carpeta:**
   - Mediante Git: `git clone https://github.com/TheAlejo160/Adapta-PE.git` (o `Adapta-PE-Lite.git`).
   - O descargando el archivo ZIP desde GitHub (**Code → Download ZIP**) y extrayéndolo en una carpeta permanente de la computadora. *(Cita: `README.md`, líneas 79-85)*.
   - *Importante:* No mover ni borrar la carpeta después, ya que Chrome la lee en cada arranque. *(Cita: `README.md`, línea 92)*.
2. **Abrir la administración de extensiones:**
   - En Chrome escribir en la barra de direcciones: `chrome://extensions`.
   - En Microsoft Edge: `edge://extensions`.
   - En Brave: `brave://extensions`. *(Cita: `README.md`, líneas 86, 98-102)*.
3. **Activar el Modo de desarrollador:**
   - Activar el interruptor **«Modo de desarrollador»** ubicado en la esquina superior derecha de la página. *(Cita: `README.md`, línea 87)*.
4. **Cargar la extensión:**
   - Pulsar el botón **«Cargar descomprimida»** (en Edge: «Cargar desempaquetada»).
   - Seleccionar **la carpeta exacta que contiene directamente el archivo `manifest.json`** (por ejemplo, la carpeta `extensión` o `Adapta-PE-main`; nunca seleccionar el archivo ZIP ni una carpeta contenedora superior). *(Cita: `README.md`, línea 88)*.
5. **Fijar el icono en la barra de herramientas:**
   - Pulsar el icono de extensiones de Chrome (con forma de pieza de rompecabezas) junto a la barra de direcciones.
   - Pulsar el icono del alfiler (fijar) al lado de **AdaptaPE** para tener el panel siempre a mano. *(Cita: `README.md`, línea 90)*.

### Qué ocurre inmediatamente al instalar: La Página de Bienvenida
- El Service Worker (`background.js`) detecta la instalación inicial (`detalles.reason === 'install'`) y abre automáticamente la pestaña **«Ya puedes usar AdaptaPE»** (`bienvenida.html`). *(Cita: `background.js`, líneas 260-263)*.
- **Funcionamiento sin recargar:** La página destaca que AdaptaPE ya está conectada y funciona en las pestañas que ya estaban abiertas en el navegador, sin necesidad de recargarlas. *(Cita: `bienvenida.html`, línea 13)*.
- **Interruptores de primera activación:**
  - En **AdaptaPE Base** presenta 3 interruptores limpios:
    1. **Control por voz** (`data-clave="voz"`): Di «Computadora», espera el sonido y da tu orden, por ejemplo «Abre YouTube».
    2. **Cursor con cámara** (`data-clave="ojos"`): Mueve el cursor con la cabeza o una extremidad. Para hacer clic, quédate quieto un segundo.
    3. **Lectura en voz alta** (`data-clave="talkback"`): Escucha el elemento que señalas. *(Cita: `bienvenida.html`, líneas 21-53)*.
  - En **AdaptaPE Lite** presenta 1 solo interruptor:
    1. **Control por voz** (`data-clave="voz"`). *(Cita: `extensiónLite/bienvenida.html`, líneas 21-30)*.
- **Comportamiento verificado:** Los interruptores vienen apagados por defecto y **sólo escriben en el almacenamiento (`chrome.storage.local`) cuando el usuario los pulsa explícitamente**. No se fuerza ninguna activación involuntaria. *(Cita: `bienvenida.js`, líneas 15-23)*.
- Los filtros de daltonismo, la elección de mascota y el selector de idioma se configuran posteriormente en el panel emergente (popup). *(Cita: `bienvenida.html`, línea 54)*.

---

## 3. Permisos: micrófono y cámara

### Permiso de Micrófono
- **Para qué se usa:** Escucha global continua de las órdenes de voz a través del documento offscreen de la extensión (`voz/escucha.html`). *(Cita: `README.md`, línea 384)*.
- **Cómo se otorga:**
  1. Al activar el interruptor «Control por voz» en la bienvenida o en el panel popup (o al pulsar el botón «Configurar micrófono»), si la extensión aún no tiene permiso, se abre la pestaña dedicada **«Permiso de voz de AdaptaPE»** (`voz/permisos.html`). *(Cita: `voz/popup.js`, líneas 9-11; `background.js`, líneas 158-163)*.
  2. En esa página, el usuario pulsa el botón **«Permitir micrófono»** (`#adapta-pe-permitir-microfono`).
  3. El navegador Chrome muestra su diálogo nativo de permisos: el usuario debe seleccionar **«Permitir»**. *(Cita: `voz/permisos.html`, línea 13; `voz/permisos.js`, línea 26)*.
- **Alcance del permiso:** El permiso pertenece al origen seguro de la propia extensión (`chrome-extension://<id>`). **Se otorga una sola vez** y sirve para siempre en todas las pestañas, ventanas y dominios visitados. No vuelve a solicitarse al cambiar de web. *(Cita: `README.md`, línea 140)*.
- **Privacidad verificada:** El audio se procesa a través de la API estándar del navegador (`webkitSpeechRecognition`). Esta API puede procesar el audio en servidores de Google según la conexión. No se almacenan grabaciones de audio ni transcripciones en disco. Desactivar el interruptor «Control por voz» libera el micrófono de inmediato. *(Cita: `README.md`, líneas 444, 446; `voz/permisos.html`, línea 14)*.
- **Qué hacer si se denegó el micrófono:**
  - Aparece el mensaje: *«Permiso denegado. Permite el micrófono en los ajustes de Chrome y vuelve a intentar»* (`permisos.denegadoMicro`). *(Cita: `textos_paginas.js`, línea 117)*.
  - **Solución:**
    1. Pulsar el icono de ajustes/candado en la barra de direcciones de Chrome sobre la pestaña de permisos (o ir a Configuración de Chrome → Privacidad y seguridad → Configuración de sitios → Micrófono).
    2. Cambiar el permiso a «Permitir».
    3. En macOS / Windows, verificar que el navegador Google Chrome tenga permiso de micrófono en los Ajustes del Sistema Operativo.
    4. En el panel popup de AdaptaPE, pulsar «Configurar micrófono», otorgar el acceso y reiniciar el interruptor «Control por voz» (apagarlo y volver a encenderlo). *(Cita: `README.md`, línea 458)*.

### Permiso de Cámara (Sólo Base)
- **Para qué se usa:** Capturar el fotograma de video en segundo plano para procesar la posición del cuerpo con MediaPipe localmente en la computadora y mover el cursor cinético. *(Cita: `README.md`, líneas 384-385)*.
- **Cómo se otorga:**
  1. Al activar «Cursor con cámara» en el panel (o decir «Computadora, activar cursor»), si falta autorización, se abre la pestaña **«Permiso de cámara de AdaptaPE»** (`voz/permisos.html?dispositivo=camara`). *(Cita: `background.js`, líneas 215-222; `voz/permisos.js`, líneas 3-17)*.
  2. El botón **«Permitir cámara»** recibe el foco de teclado automáticamente al abrir la página (`botonPermiso.focus()`), permitiendo activarlo simplemente pulsando **Enter**. *(Cita: `voz/permisos.js`, línea 18; `README.md`, línea 181)*.
  3. Al aceptar en el aviso de Chrome, se ejecuta `navigator.mediaDevices.getUserMedia({ video: true })`, se valida la cámara, se notifica al sistema y la pestaña de permisos **se cierra sola, devolviendo el foco automáticamente a la página que el usuario estaba viendo**. *(Cita: `voz/permisos.js`, líneas 26-33; `background.js`, líneas 223-230)*.
- **Alcance y privacidad:** La cámara pertenece a la extensión; no se solicita por cada web. **Las imágenes se procesan 100% en local mediante WebAssembly y modelos locales empaquetados en la extensión.** Ninguna imagen ni video sale de la máquina ni viaja a la nube. *(Cita: `README.md`, línea 444; `voz/permisos.html`, línea 105)*.
- **Qué hacer si se denegó la cámara o no arranca:**
  - Aparece el mensaje: *«Permiso denegado. Permite la cámara en los ajustes de Chrome y vuelve a intentar»* (`permisos.denegadoCamara`). *(Cita: `textos_paginas.js`, línea 118)*.
  - **Solución:**
    1. Asegurarse de que ninguna otra aplicación (Zoom, Teams, Meet, OBS) tenga la cámara bloqueada o en uso exclusivo.
    2. Verificar en la configuración de privacidad del sistema operativo que Chrome tenga acceso a la cámara.
    3. En el panel de AdaptaPE, apagar y encender el interruptor «Cursor con cámara». *(Cita: `README.md`, línea 463)*.

---

## 4. Panel emergente (Popup): Lista exhaustiva de controles en orden visual

Al pulsar el icono de AdaptaPE fijado en la barra de Chrome, se despliega el panel **«Ayudas de AdaptaPE»** (`popup.html`):

```
+-------------------------------------------------------+
|  [Logo] AdaptaPE  Base v13.0                          |
|  Elige las ayudas que quieres usar.                   |
|  (Estado: Los cambios se guardan automáticamente.)    |
+-------------------------------------------------------+
| 1. [Icono] Lectura en voz alta           [ Switch ]   |  <-- Solo Base
|    Escucha el elemento que señalas.                   |
+-------------------------------------------------------+
| 2. [Icono] Control por voz               [ Switch ]   |
|    Di «Computadora» y espera el sonido.               |
|    - Idioma: [ Menú desplegable: Automático / ... ]   |
|    > Órdenes y micrófono (Desplegable con botón)      |
|      [ Botón: Configurar micrófono ]                  |
+-------------------------------------------------------+
| 3. [Icono] Filtros de color                           |
|    Elige tu filtro de daltonismo.                     |
|    [ Menú desplegable: Sin filtro / 7 filtros ]       |
|    (Estado: Sin filtro activo / [Quitar filtro])      |
+-------------------------------------------------------+
| 4. [Icono] Cursor con cámara             [ Switch ]   |  <-- Solo Base
|    Usa tu cabeza o una extremidad.                    |
|    (Si está activo:)                                  |
|    - ¿Qué quieres usar para moverlo?                  |
|      [ Cabeza/torso | Brazos/manos/puños | Muñón ]    |
|    > Cómo mover y hacer clic (Guía desplegable)       |
+-------------------------------------------------------+
| 5. [Icono] Tu mascota                                 |
|    Te acompaña con la voz y la lectura.               |
|    [ Sin mascota | Tinku | Cuchu | Yati ]             |
|    > Cómo usar tu mascota (Guía desplegable)          |
+-------------------------------------------------------+
|  Licencia CC BY-NC-SA 4.0 Internacional               |
+-------------------------------------------------------+
```

### Lista detallada de controles (Cita: `popup.html`, `popup.js`, `voz/popup.js`, `mascotas/popup.js`, `textos_paginas.js`):

1. **Cabecera y Estado general:**
   - **Título visible:** `AdaptaPE` y subtítulo `Base v13.0` (en Lite: `AdaptaPE Lite` y `Lite v3.0`).
   - **Indicador general:** `#estadoPanel` ("Cargando tus ajustes…", "Los cambios se guardan automáticamente.", "Ajustes guardados." o aviso de error en rojo). *(Cita: `popup.html`, líneas 11-16)*.
2. **Lectura en voz alta (TalkBack) [Sólo en Base]:**
   - **Etiqueta visible:** `Lectura en voz alta` (`#tituloLectura`).
   - **Estado:** Texto dinámico `Desactivado` o `Activado` (`#estadoLectura`).
   - **Control:** Interruptor deslizable (checkbox `#checkTalkBack`).
   - **Descripción:** *«Escucha el elemento que señalas.»*
   - **Qué hace:** Lee por síntesis de voz (`chrome.tts`) el texto accesible del enlace, botón o elemento sobre el que se posa el ratón o el cursor de cámara tras 300 ms de pausa. *(Cita: `popup.html`, líneas 18-27; `classes/TalkBack.js`)*.
3. **Control por voz:**
   - **Etiqueta visible:** `Control por voz` (`#tituloVoz`).
   - **Estado:** Texto dinámico `Desactivado`, `Activado` o estado de escucha (`#estadoVoz`).
   - **Control:** Interruptor deslizable (checkbox `#checkVoz`).
   - **Descripción:** *«Di «Computadora» y espera el sonido.»*
   - **Selector de Idioma (`#selectIdiomaVoz`):**
     - Etiqueta: `Idioma`.
     - Descripción: *«Idioma de AdaptaPE y de tus órdenes de voz. «Automático» usa el idioma de tu computadora.»*
     - Opciones exactas:
       1. `Automático (idioma de Chrome)` (muestra dinámicamente el detectado, ej. `Automático: Español (Perú)`).
       2. `Español (Perú)` (`es-PE`)
       3. `Español (España)` (`es-ES`)
       4. `Español (México)` (`es-MX`)
       5. `Español (Argentina)` (`es-AR`)
       6. `Español (Colombia)` (`es-CO`)
       7. `Español (Chile)` (`es-CL`)
       8. `Español (Estados Unidos)` (`es-US`)
       9. `English (United States)` (`en-US`)
       10. `English (United Kingdom)` (`en-GB`)
       11. `Português (Brasil)` (`pt-BR`)
       12. `Português (Portugal)` (`pt-PT`)
       13. `Deutsch` (`de-DE`)
       14. `Français` (`fr-FR`)
       15. `Italiano` (`it-IT`)
     - **Qué hace:** Cambia tanto el motor de reconocimiento de voz como **todos los textos hablados y visuales** de la extensión (popup, bienvenida, permisos, nueva pestaña, mascota y HUD).
   - **Desplegable «Órdenes y micrófono»:**
     - Muestra ejemplos de comandos.
     - Contiene el botón interactivo **«Configurar micrófono»** (añadido por `voz/popup.js`), que abre `voz/permisos.html` para conceder o reparar el permiso. *(Cita: `popup.html`, líneas 29-60; `voz/popup.js`)*.
4. **Filtros de color:**
   - **Etiqueta visible:** `Filtros de color` (`#tituloFiltros`).
   - **Descripción:** *«Elige tu filtro de daltonismo.»*
   - **Selector desplegable (`#selectDaltonismo`):**
     - `Sin filtro` (`ninguno`)
     - Grupo *Rojo y verde*: `Deuteranomalía`, `Protanomalía`, `Deuteranopía`, `Protanopía`.
     - Grupo *Azul y amarillo*: `Tritanomalía`, `Tritanopía`.
     - Grupo *Escala de grises*: `Acromatopsia`.
   - **Estado y botón de reseteo:**
     - Texto `#estadoDaltonismo`: Muestra *«Sin filtro activo»* o *«Activo: [Nombre del filtro]»*.
     - Botón `#quitarDaltonismo`: **«Quitar filtro»** (aparece visible sólo cuando hay un filtro seleccionado; al pulsarlo restablece a "Sin filtro"). *(Cita: `popup.html`, líneas 62-88; `popup.js`, líneas 51-64)*.
5. **Cursor con cámara [Sólo en Base]:**
   - **Etiqueta visible:** `Cursor con cámara` (`#tituloCursor`).
   - **Estado:** Texto dinámico `Desactivado` o `Activado` (`#estadoCursor`).
   - **Control:** Interruptor deslizable (checkbox `#checkOjos`).
   - **Descripción:** *«Usa tu cabeza o una extremidad.»*
   - **Controles internos desplegados (`#hintGestos`, visible sólo si está activo):**
     - Etiqueta: `¿Qué quieres usar para moverlo?`
     - Selector de Modo (`#adapta-pe-modo-control`):
       * `Cabeza / torso (predeterminado)` (`cabeza`)
       * `Brazos, manos o puños` (`manos`)
       * `Muñón / mano parcial` (`zona`)
     - Nota informativa: *«Sólo cabeza / torso necesita calibrar tu postura.»*
     - Desplegable `<details>`: **«Cómo mover y hacer clic»**, con las instrucciones de reposo tipo joystick, señal con dedos/palma, clic dwell de 1s, boca abierta y pinza. *(Cita: `popup.html`, líneas 90-116)*.
   - **Verificación importante sobre Temblor, Velocidad y Amplitud:** En el código actual, **estos tres parámetros NO tienen controles deslizantes ni botones en `popup.html`**. Se guardan en el objeto `ajustesCineticos` en `chrome.storage.local` y se configuran enteramente **por órdenes de voz**:
     * *Temblor:* «Computadora, activar temblor» / «desactivar temblor» (amplía la zona segura de 0,045 a 0,07).
     * *Velocidad:* «Computadora, cursor más rápido» / «cursor más lento» (regula entre 0,3x y 2x con límite de 650 px/s).
     * *Amplitud:* «Computadora, movimientos pequeños» / «movilidad reducida» (amplitud 0,55) y «movimientos normales» (amplitud 1,0). *(Cita: `classes/VoiceAssistant.js`, líneas 603-619; `KINETICMOUSE.md`, líneas 317-320)*.
6. **Tu mascota:**
   - **Etiqueta visible:** `Tu mascota` (`#tituloMascota`).
   - **Descripción:** *«Te acompaña con la voz y la lectura.»* (En Lite: *«Te acompaña con el control por voz.»*).
   - **Selector desplegable (`#selectMascota`):**
     - `Sin mascota` (`ninguna`)
     - `Tinku · gallito de las rocas` (`tinku`)
     - `Cuchu · cuy` (`cuchu`)
     - `Yati · llama` (`yati`)
   - **Estado:** `#estadoMascota` (muestra el nombre seleccionado o "Cargando mascota…").
   - **Desplegable «Cómo usar tu mascota»:** Explica cómo arrastrar su nombre o enfocarlo con Tab y moverlo con flechas, y los comandos de voz asociados. *(Cita: `popup.html`, líneas 118-135; `mascotas/popup.js`)*.
7. **Pie de página:** Enlace e imagen de la licencia Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0) y autoría de Rodrigo Alejandro Apcho Aliaga (TheAlejo160). *(Cita: `popup.html`, líneas 137-142)*.

---

## 5. Control por voz: Dinámica, catálogo de comandos e idiomas

### Dinámica de activación
- **Palabra de activación (Wake Word):** «Computadora» (o «Computadoras», «Computador»). Siempre admitida en cualquier idioma. En otros idiomas se acepta además: «Computer» (inglés, alemán, italiano), «Computador» (portugués) u «Ordinateur» (francés). No se aceptan diminutivos como «compu» ni «ordenador» en español para evitar disparos accidentales. *(Cita: `sitios.js`, líneas 39-40; `VoiceAssistant.js`, línea 392; `README.md`, línea 359)*.
- **Dos formas de hablar:**
  1. *De corrido:* «Computadora, abre YouTube».
  2. *En dos pasos:* Decir sólo «Computadora», escuchar el pitido suave (800 Hz, 120 ms) y dar la orden durante los **8 segundos siguientes** de ventana de escucha activa. *(Cita: `VoiceAssistant.js`, líneas 251-265, 402-407; `README.md`, líneas 144-146)*.
- **Indicador flotante en pantalla (`#adapta-pe-mic-status`):**
  - Aparece en la esquina inferior izquierda de la página web visitada.
  - Color **Rojo** (`rgba(227,6,19,0.9)`): Escuchando en reposo (*«Voz activa. Di «Computadora».»*).
  - Color **Azul** (`#0984e3`): Ventana de 8 segundos abierta esperando tu orden (*«Di tu comando.»*).
  - Texto de transcripción: Informa en tiempo real lo que va escuchando (*«Escuché: [texto]»*). *(Cita: `VoiceAssistant.js`, líneas 247, 302, 337)*.
- **Tolerancia a lenguaje natural y modismos:**
  - El parser limpia cortesías iniciales (*por favor, porfa, podrías, me puedes, quiero que, a ver, oye pe, etc.*) y muletillas finales (*pe, pues, por favor*).
  - Acepta imperativos, usted, voseo y subjuntivo (*ábreme, abrí, quiero que abras, hágale clic, dele clic*).
  - Acepta giros latinoamericanos (*aplasta/aprieta por presiona, scrollea pa abajo, googlea, wasap, feis*). *(Cita: `sitios.js`, líneas 43-62; `README.md`, líneas 321-332)*.

### Catálogo de órdenes de voz agrupadas (con 2–3 frases exactas comprobadas)

*(Cita: `classes/VoiceAssistant.js`, líneas 530-700; `sitios.js`, líneas 4-72)*.

#### 1. Navegación a portadas y direcciones web
- `abre YouTube`
- `ejecuta Netflix`
- `visita GitHub`
- `abre example.com` / `abre https://google.com`
- *Sitios soportados en catálogo nativo:* Google, YouTube, Mercado Libre, Amazon, Wikipedia, Facebook, Instagram, X (Twitter), Reddit, Netflix, Twitch, GitHub, ChatGPT, Claude, Gemini, Canvas, Gmail, Outlook (Hotmail), WhatsApp Web, Telegram, Google Drive, Google Docs, Google Maps, LinkedIn, TikTok, Spotify, Bing, DuckDuckGo.

#### 2. Búsquedas inteligentes
- `busca Perú en YouTube`
- `busca en Wikipedia accesibilidad`
- `busca gatos` (busca en el sitio actual si tiene buscador en catálogo, o en el buscador de la página, o en Google)
- `abre YouTube en una nueva pestaña` (el sufijo *en una nueva pestaña* o *en otra ventana* redirige el destino).
- *Detalle:* Si dices «busca en YouTube» sin consulta, el sistema te pregunta: *«Dime qué quieres buscar»*.

#### 3. Pestañas y ventanas
- `nueva pestaña` / `abre una nueva ventana`
- `cierra esta pestaña` / `cierra la ventana`
- `cierra las otras pestañas` (cierra las demás y conserva las fijadas)
- `duplica la pestaña`
- `siguiente pestaña` / `pestaña anterior`
- `pestaña 2` / `ve a la tercera pestaña` / `última pestaña` (reconoce del 1 al 10 en número o palabra).

#### 4. Navegación en historial y recarga
- `atrás` / `vuelve` / `regresa`
- `adelante` / `avanza`
- `recarga` / `actualiza la página` / `vuelve a cargar`

#### 5. Desplazamiento de página (Scroll)
- `baja` / `abajo` / `scrollea pa abajo` (desplaza el 70% de la pantalla)
- `sube un poco` / `baja un poquito` (desplaza el 25% de la pantalla)
- `baja más` / `baja bastante` (desplaza el 95% de la pantalla)
- `ve al inicio` / `hasta arriba`
- `ve al final` / `baja hasta el final`

#### 6. Zoom
- `aumenta zoom` / `acerca` / `más grande` (sube en pasos de 10% hasta 500%)
- `reduce zoom` / `aleja` / `achica` (baja hasta 25%)
- `zoom normal` / `restablece zoom` (vuelve al 100%)

#### 7. Selección y activación visual
- `selecciona zapatos azules` / `resalta contacto` (ubica el elemento visible o accesible, lo centra en pantalla y le coloca un contorno amarillo brillante de selección; **no hace clic**).
- `dale clic` / `hazle clic` / `activa lo seleccionado` (hace clic exclusivamente sobre el elemento resaltado).
- `cancelar selección` / `quita la selección`
- `clic en Contacto` / `haz clic en Guardar` / `pulsa Enviar` (hace clic directo buscando por el nombre accesible).

#### 8. Dictado y formularios
- `enfoca correo` / `enfoca nombre` (pone el cursor en el campo que coincida con esa etiqueta o placeholder).
- `escribe Hola Perú` / `dicta mi comentario` (escribe el texto respetando mayúsculas y tildes).
- `borra el texto` / `limpia el campo` (vacía el campo enfocado).
- `presiona enter` / `enviar formulario` (envía el formulario validándolo).
- *Seguridad:* **No dicta en campos de contraseña** ni editores marcados con `current-password` o `new-password`.

#### 9. Control de medios (Audio / Video)
- `reproduce el video` / `continuar video` / `play`
- `pausa el video` / `pausa el audio` / `pon pausa`

#### 10. Sonido y Pantalla completa
- `pantalla completa` / `pon pantalla completa`
- `sal de pantalla completa` / `pantalla normal`
- `silencia la pestaña` / `mutea la pestaña` / `sin sonido`
- `activa el sonido` / `quita el silencio` / `desmutea`

#### 11. Mascotas
- `mascota Tinku` / `mascota Cuchu` / `mascota Yati`
- `saluda mascota` / `duerme mascota` / `despierta mascota`
- `oculta mascota` / `quita la mascota`

#### 12. Control del Cursor de cámara por voz (Base)
- `activar cursor` / `apaga el mouse`
- `calibrar cursor` / `recalibrar` / `postura cómoda`
- `pausar cursor` / `reanudar cursor`
- `control cabeza` / `control manos` / `control muñón`
- `activar temblor` / `desactivar temblor`
- `movimientos pequeños` / `movimientos normales`
- `cursor más rápido` / `cursor más lento`
- `clic` / `clic derecho` / `siguiente clic derecho` / `cancelar clic`

#### 13. Ayuda y control general
- `ayuda` / `qué puedo decir` (lee en voz alta un resumen y lo muestra en pantalla).
- `cállate` / `silencio` / `basta` (detiene de inmediato la lectura hablada).
- `cancela` / `cancelar` / `olvídalo` (cancela la orden y limpia selecciones).

---

## 6. Cursor por cámara (Exclusivo de AdaptaPE Base)

El cursor cinético (`KineticEngine.js`) genera un puntero virtual dentro de las páginas web (no manipula el cursor del sistema operativo fuera del navegador ni la barra de direcciones de Chrome). *(Cita: `KINETICMOUSE.md`, línea 17)*.

### Los Tres Modos de Movimiento

1. **Modo Cabeza / torso (`cabeza`) (Predeterminado):**
   - **Qué detecta:** Los puntos clave del rostro mediante el modelo local de visión; si el rostro se oculta o gira, utiliza como respaldo la cabeza corporal o el torso mediante Pose Lite. *(Cita: `CLAUDE.md`, línea 61)*.
   - **Para quién es:** Personas con movilidad en cuello o tronco.
   - **Requiere calibración de postura:** Al activarlo o decir «recalibrar», el usuario debe permanecer quieto y relajado en su postura cómoda durante aproximadamente 1 segundo (el sistema analiza al menos 4 lecturas durante 900 ms dentro de una ventana de 1.200 ms). Ese punto se registra como su neutro o centro. Mover la cabeza hacia cualquier lado desplaza el cursor; regresar la cabeza a la posición cómoda detiene el cursor. *(Cita: `README.md`, línea 186; `KINETICMOUSE.md`, líneas 70-74, 329)*.
2. **Modo Brazos, manos o puños (`manos`):**
   - **Qué detecta:** La muñeca de una mano abierta o de un puño cerrado (y el codo visible como respaldo si la mano se oculta). Excluye la cabeza para que mover el cuerpo no afecte al cursor. *(Cita: `KINETICMOUSE.md`, línea 45)*.
   - **Para quién es:** Personas con movilidad en brazos o manos que deseen descansar sin tener que desplazar todo el brazo por la mesa.
   - **Sin calibración previa:** No requiere esperar un segundo de aprendizaje. La primera posición en la que la cámara detecta la mano se toma instantáneamente como el punto de reposo en memoria de un **joystick invisible**. *(Cita: `KINETICMOUSE.md`, líneas 63-68)*.
   - **Dinámica del Joystick:** Mueves ligeramente la mano hacia una dirección y **la sostienes allí**: el cursor avanza de forma continua. Para detenerlo, regresas la mano a su posición inicial de reposo.
   - **Prioridad de Señal con Dedos:** Si mientras desplazas la mano extiendes de 1 a 4 dedos apuntando a una dirección (o la palma entera), el motor reconoce la señal direccional en 50 ms y **le da prioridad absoluta a los dedos**, ignorando hacia dónde se esté moviendo la muñeca. Al doblar los dedos, el control vuelve suavemente al joystick. *(Cita: `KINETICMOUSE.md`, líneas 95-108, 140-150)*.
3. **Modo Muñón / mano parcial (`zona`):**
   - **Qué detecta:** Adquiere y rastrea una textura visible local en movimiento (piel, vendaje, tela de la manga o extremo de la extremidad) mediante correlación normalizada de imágenes. No busca dedos ni clasifica anatomía. *(Cita: `KINETICMOUSE.md`, líneas 169-183)*.
   - **Para quién es:** Personas con amputaciones, malformaciones congénitas o manos parciales.
   - **Sin calibración:** Al mover un poco la extremidad visible frente a la cámara, el sistema captura automáticamente un parche de textura con contraste.
   - **Dinámica:** Funciona como un joystick por desplazamiento físico de la textura. Además, giros locales leves aportan dirección horizontal. Regresar la zona al punto inicial detiene el cursor. Si la textura se pierde más de 1,2 segundos, pide volver a mover la zona para capturar una nueva textura. *(Cita: `KINETICMOUSE.md`, líneas 178, 194)*.

### Zona segura y Atracción a controles
- **Zona segura circular:** Radio de tolerancia (0,045 normalizado; ampliado a 0,07 si se activa el filtro de temblor) que asegura que pequeños temblores o pulsaciones naturales en reposo no desplacen el cursor. *(Cita: `KINETICMOUSE.md`, líneas 320-322)*.
- **Atracción a controles (Magnetismo):** Cuando el cursor se mueve lentamente o está en reposo cerca de un botón, enlace o campo interactivo visible (hasta 28 píxeles de distancia), es atraído suavemente hacia su centro para facilitar apuntar a objetivos pequeños sin frustración. Un movimiento decidido permite despegarse de la atracción. *(Cita: `KINETICMOUSE.md`, líneas 200-205)*.

### Métodos para hacer Clic sin manos

1. **Permanencia (Dwell) — Disponible en los 3 modos:**
   - Cómo se hace: Mover el cursor hacia un botón o enlace. Para armar el clic, el cursor debe haber salido de una atracción previa al menos 180 ms. Al detenerse sobre el control objetivo dentro de la zona segura, se inicia una cuenta regresiva: permanecer **1 segundo (1.000 ms)** quieto sobre el mismo elemento ejecuta automáticamente un clic izquierdo.
   - Para hacer otro clic, es necesario salir del elemento y regresar a él. *(Cita: `KINETICMOUSE.md`, líneas 206-213)*.
2. **Gesto de Pinza (Pinch) — Exclusivo del modo Brazos/manos/puños:**
   - Cómo se hace: Juntar la punta del pulgar con la punta del dedo índice (la muñeca debe verse dentro del cuadro). Mientras se juntan los dedos, el cursor se congela en su sitio para no perder el objetivo.
   - **Clic izquierdo:** Juntar pulgar e índice y soltarlos antes de 0,7 segundos (700 ms). Al abrir los dedos, se dispara el clic.
   - **Clic derecho:** Juntar pulgar e índice y **mantenerlos juntos durante 0,7 segundos o más**. Se dispara inmediatamente un clic derecho; al soltar después los dedos, no se produce ningún clic adicional. *(Cita: `KINETICMOUSE.md`, líneas 118-125, 341-342)*.
3. **Gesto de Boca abierta — Exclusivo del modo Cabeza/torso:**
   - Cómo se hace: Abrir bien la boca (apertura facial `jawOpen` ≥ 0,5) durante al menos 0,3 segundos (300 ms) y luego cerrarla (≤ 0,2). **El clic se ejecuta justo al cerrar la boca**.
   - **Protección contra bostezos:** Si se mantiene la boca abierta más de 1,5 segundos (como al bostezar), el clic se anula por completo.
   - *Nota:* No tiene interruptor propio en el panel. Si el usuario habla abriendo mucho la boca podría activarse; se recomienda modular o usar modo extremidades. *(Cita: `README.md`, línea 202; `KINETICMOUSE.md`, líneas 122-123, 343)*.
4. **Puño para Reposo y Dwell — Modo Brazos/manos/puños:**
   - Cómo se hace: Mostrar primero la mano abierta y luego cerrar el puño. El sistema detecta el cierre en 120 ms y coloca instantáneamente la dirección de control en el centro seguro (reposo), fijando el cursor sobre el objetivo sin necesidad de devolver el brazo a su punto inicial. Tras 1 segundo en puño quieto, ejecuta el clic dwell. Abrir la mano cancela el dwell. *(Cita: `KINETICMOUSE.md`, líneas 216-225)*.
5. **Por orden de voz — Disponible en todos los modos:**
   - Decir «Computadora, clic» (activa lo que esté bajo el cursor), «Computadora, clic derecho» (abre el menú contextual) o «Computadora, siguiente clic derecho» (hace que la próxima pinza corta o cierre de boca sea un clic derecho). *(Cita: `README.md`, líneas 200, 309-310)*.

### Consejos de iluminación y postura verificados
- **Iluminación:** Debe ser frontal, clara y uniforme. Evitar colocarse de espaldas a una ventana luminosa o bajo luces directas que generen sombras marcadas sobre los ojos o las manos. *(Cita: `README.md`, líneas 63, 464)*.
- **Postura en Cabeza/torso:** Sentarse en la postura natural y relajada en la que se va a trabajar antes de encender la cámara. Si la persona cambia de posición en la silla, basta con decir «Computadora, recalibrar». *(Cita: `README.md`, líneas 186, 190)*.
- **Encuadre en Manos:** La cámara debe captar la muñeca dentro del cuadro para calcular la pinza y el ancla con precisión. *(Cita: `KINETICMOUSE.md`, línea 125)*.
- **Fondo en Muñón/textura:** Evitar fondos con personas transitando o cortinas en movimiento, y asegurar que la extremidad presente algún contraste visual (costuras, prenda, vendaje). *(Cita: `README.md`, línea 464; `KINETICMOUSE.md`, línea 182)*.

---

## 7. TalkBack, Filtros de daltonismo, Mascotas, Nueva pestaña e Idiomas

### TalkBack (Lectura en voz alta) [Sólo Base]
- **Qué es:** Lector contextual por puntero para elementos web (`classes/TalkBack.js`). No es un lector de pantalla global para todo el sistema operativo.
- **Cómo funciona:**
  - Al pasar el cursor del ratón o el cursor de cámara sobre párrafos, títulos, enlaces, botones, imágenes o etiquetas, espera un tiempo de prudencia de **300 milisegundos** (debounce para no saturar al deslizar).
  - Si el cursor permanece sobre el elemento, lo resalta con un **borde rojo de 3 píxeles** (`outline: 3px solid #E30613`) y lee por síntesis de voz (`chrome.tts`) su texto accesible, etiqueta `aria-label`, texto alternativo (`alt`) o, si es un icono sin texto, anuncia «Botón».
  - Si el elemento web tiene un atributo de idioma propio (ejemplo: un párrafo en inglés dentro de una página en español), utiliza la voz adecuada para ese fragmento.
  - Al apartar el cursor, el borde se retira y la lectura se detiene inmediatamente. Se puede silenciar en cualquier momento diciendo «Computadora, cállate». *(Cita: `classes/TalkBack.js`, líneas 12, 45-85; `README.md`, líneas 204-211)*.

### Filtros de daltonismo (Lista exacta de los 7 filtros)
Implementados mediante matrices de color SVG nativas (`feColorMatrix`) en `classes/FiltrosDaltonismo.js`. Modifican la presentación visual de la página, marcos incrustados (iframes) y pantallas completas de video/canvas sin afectar el rendimiento:
1. **Deuteranomalía:** Deficiencia de conos verdes (la forma más común de daltonismo; los verdes tienden a verse más rojizos).
2. **Protanomalía:** Deficiencia de conos rojos (los rojos tienden a verse más verdosos o apagados).
3. **Deuteranopía:** Ausencia total de conos verdes (dicromatismo rojo-verde).
4. **Protanopía:** Ausencia total de conos rojos.
5. **Tritanomalía:** Deficiencia de conos azules (afecta la distinción azul-amarillo).
6. **Tritanopía:** Ausencia total de conos azules.
7. **Acromatopsia:** Monocromatismo total (pérdida completa de visión en color; transforma toda la pantalla a una escala de grises calibrada).
*(Cita: `classes/FiltrosDaltonismo.js`, líneas 53-77; `popup.html`, líneas 70-82)*.
- *Nota médica:* Son filtros visuales de confort y contraste digital; no constituyen un tratamiento ni diagnóstico clínico. *(Cita: `README.md`, línea 217)*.

### Mascotas interactivas (Tinku, Cuchu y Yati)
Proceden del SDK Mascota-Modular-Adapta-PE v0.3.0 (`mascotas/`):
- **Personajes disponibles:**
  * **Tinku:** Gallito de las rocas (ave nacional del Perú).
  * **Cuchu:** Cuy (cobayo andino).
  * **Yati:** Llama andina.
- **Cómo elegirla:** En el selector «Tu mascota» del panel popup, o por voz diciendo: «Computadora, mascota Tinku» (o Cuchu, Yati). Para retirarla: «Computadora, oculta mascota» o elegir "Sin mascota" en el panel.
- **Comportamiento en pantalla:**
  - Aparece en una ventana flotante fija en la esquina de la pantalla.
  - **Sigue el cursor:** Su cabeza y ojos miran de forma fluida hacia donde se mueva el cursor (sea el ratón físico o el cursor cinético de cámara).
  - **Reacciona a la extensión:** Modifica sus animaciones según el estado de AdaptaPE: habla cuando la extensión habla (`talk`), mira atenta cuando espera comando (`look`), pone cara de duda si no entiende (`confused`) y duerme o descansa en silencio (`idle`).
  - **Cómo moverla de sitio:** El usuario puede arrastrar directamente el botón con su nombre con el ratón, o seleccionarlo con la tecla Tab y desplazarlo usando las **flechas del teclado** (en pasos de 24 píxeles). AdaptaPE guarda la posición elegida (`posicionMascota`) para que reaparezca en el mismo lugar en otras páginas.
  - **Comandos de animación:** «saluda mascota» (saluda con la mano/ala), «duerme mascota» (se acuesta a dormir), «despierta mascota» (despierta).
  - Respeta la directiva de accesibilidad del sistema operativo para usuarios con sensibilidad vestibular (`prefers-reduced-motion`). *(Cita: `mascotas/Mascota.js`, líneas 1-135; `mascotas/README.md`; `README.md`, líneas 218-226)*.

### Nueva pestaña de AdaptaPE (`nueva_pestana.html`)
AdaptaPE reemplaza la página de Nueva pestaña tradicional de Chrome por una propia. Esto es fundamental para accesibilidad, ya que **Google Chrome bloquea por seguridad el funcionamiento de extensiones en su `chrome://newtab` nativa**, mientras que en la Nueva pestaña de AdaptaPE la voz, el cursor cinético, TalkBack, los filtros y la mascota funcionan al 100%. *(Cita: `README.md`, líneas 229, 398)*.
- **Barra de búsqueda central:** Permite buscar directamente usando el motor de búsqueda predeterminado del usuario (`chrome.search.query`). Incluye botón de micrófono informativo y botón para Google Lens (`images.google.com`).
- **Botón «Modo IA»:** Abre la consulta directamente en la experiencia de Inteligencia Artificial de Google (`google.com/search?udm=50&q=`). *(Cita: `nueva_pestana.html`, línea 57; `CLAUDE.md`, línea 44)*.
- **Barra superior derecha:** Enlaces rápidos a Gmail, Google Imágenes, selector de 41 aplicaciones oficiales de Google (con iconos locales y pestaña de favoritos) y enlace genérico a la Cuenta de Google (sin fotos para resguardar la privacidad). *(Cita: `nueva_pestana.html`, líneas 13-32)*.
- **Accesos directos y Marcadores:** Despliega automáticamente los sitios web más visitados (`topSites`) y la barra de marcadores del usuario (`bookmarks`).
- **Panel de Personalización (`#adapta-pe-ntp-panel`):**
  - **7 Temas integrados:** Sistema (sigue el modo claro/oscuro del SO), Claro, Oscuro, Alto contraste, Pacífico (azul marino), Selva (verde) y Cielo (celeste).
  - **Color de acento:** Selector de color personalizado (`#adapta-pe-ntp-acento`) o botón para volver al color del tema.
  - **Imagen de fondo personalizada:** Permite subir cualquier foto desde la computadora; AdaptaPE la comprime en el navegador a máx 1.920 px (~750 kB JPEG) para no ralentizar el inicio y la guarda en almacenamiento local. *(Cita: `nueva_pestana.html`, líneas 83-118; `README.md`, líneas 234-235)*.

### Idiomas de interfaz
- La extensión está completamente traducida a **6 idiomas**: Español, Inglés, Portugués, Alemán, Francés e Italiano.
- Un solo ajuste en el panel (**Idioma**) cambia de inmediato todo: el reconocedor de voz, los textos del panel popup, la bienvenida, las páginas de permisos, la Nueva pestaña, los indicadores flotantes, los textos del HUD de la cámara y las respuestas habladas por voz sintética (TTS). *(Cita: `textos_paginas.js`; `classes/VoiceAssistant.js`, líneas 7-146; `README.md`, líneas 241-243)*.

---

## 8. Consejos y solución de problemas para usuarios

*(Extraído y sintetizado directamente de `README.md`, sección Solución de problemas, líneas 454-476)*.

1. **El micrófono dice «no disponible» o Chrome denegó el acceso:**
   - Abre el panel de AdaptaPE, pulsa **«Configurar micrófono»** y selecciona «Permitir».
   - Si no aparece el diálogo, haz clic en el candado o icono de configuración a la izquierda de la barra de direcciones de Chrome y asegúrate de que el Micrófono esté en «Permitir».
   - Revisa que tu sistema operativo (Windows o macOS) no tenga bloqueado el acceso al micrófono para Google Chrome.
   - Finalmente, en el panel de AdaptaPE apaga y vuelve a encender **Control por voz**.
2. **La extensión repite las órdenes o parece haber eco en el micrófono:**
   - Suele ocurrir cuando se tienen instaladas **AdaptaPE Base y AdaptaPE Lite al mismo tiempo** con la voz encendida en ambas. Ambas extensiones intentan transcribir a la vez. Desactiva «Control por voz» en una de ellas.
3. **No responde la voz en navegadores Edge o Brave:**
   - Aunque son Chromium, algunas compilaciones no incluyen el servicio en la nube de transcripción de voz de Google. Si no transcribe nada, utiliza Google Chrome.
4. **Aparece el aviso «Reconectando micrófono…» de forma continua:**
   - Verifica tu conexión a internet (el servicio de voz del navegador puede requerirla) y que tu micrófono esté bien enchufado. El sistema reintenta automáticamente la conexión.
5. **No funciona en páginas de configuración (`chrome://`), historial o la Chrome Web Store:**
   - Es una restricción de seguridad de Google Chrome: ninguna extensión puede inyectar código en sus páginas internas ni en su tienda. En esas páginas sólo funcionarán órdenes nativas de voz (como abrir webs, buscar o cambiar de pestaña); el cursor, TalkBack y los filtros volverán a funcionar en cuanto entres a cualquier página web normal o a la Nueva pestaña de AdaptaPE.
6. **La cámara web no inicia o indica que está ocupada:**
   - Cierra otras aplicaciones que puedan estar usando la cámara (Zoom, Google Meet, Teams, Skype, OBS).
   - Revisa en los Ajustes del Sistema Operativo que Chrome tenga permiso para la Cámara.
   - En el panel de AdaptaPE, apaga y vuelve a encender **Cursor con cámara**.
7. **El cursor pierde el seguimiento o no calibra la postura:**
   - Mejora la iluminación: la luz debe dar en tu rostro o extremidad, no venir desde atrás (evita contraluces de ventanas).
   - Si usas Cabeza/torso y te acomodaste en el asiento, di en voz alta: «Computadora, recalibrar».
   - Si usas Muñón/mano parcial, asegúrate de que haya suficiente textura visual visible (ropa, venda, contraste) y evita fondos con personas moviéndose detrás.
8. **No se ejecuta el clic por permanencia (Dwell):**
   - Recuerda la regla de armado: para que el clic se active, debes mover el cursor fuera de la atracción al menos una fracción de segundo, colocarlo sobre el objetivo y dejarlo **completamente quieto durante 1 segundo**.
9. **La pinza con los dedos no hace clic:**
   - Asegúrate de estar en el modo **Brazos, manos o puños**.
   - La muñeca debe estar dentro del encuadre de la cámara.
   - Debes separar el pulgar del índice antes de unirlos. Si ya tenías los dedos pegados al entrar en cámara, no se registrará como pinza. Un puño cerrado tampoco cuenta como pinza.
10. **La boca hace clics involuntarios al hablar:**
    - Ocurre si hablas gesticulando y abriendo mucho la boca en el modo Cabeza/torso. Procura modular con la boca menos abierta o cambia al modo de extremidades. Recuerda que si abres la boca más de 1,5 segundos (bostezo), el clic se anula solo.
11. **Al abrir una pestaña, Chrome desactivó AdaptaPE:**
    - Al sustituir la Nueva pestaña, Chrome suele mostrar una advertencia preguntando si deseas conservar el cambio. Si el usuario hace clic por error en "Volver a la anterior", Chrome desactiva la extensión. Para solucionarlo, entra a `chrome://extensions` y vuelve a activar el interruptor de AdaptaPE.
12. **El Service Worker aparece como «Inactivo» en `chrome://extensions`:**
    - Es totalmente normal en la tecnología moderna Manifest V3: el navegador duerme el proceso de fondo cuando no hay actividad para ahorrar memoria RAM y batería en la laptop, y lo despierta al instante en cuanto hablas, mueves la cámara o cambias de pestaña.

---

## 9. Lista de pantallas (Archivos HTML) recomendadas para capturar en el video

Para que el tutorial audiovisual sea dinámico y fácil de seguir, se recomienda capturar en video o pantalla las siguientes interfaces exactas:

### 1. Panel emergente (`popup.html`)
- **Qué muestra visualmente:** La tarjeta principal de AdaptaPE al hacer clic en el icono de la barra de Chrome.
- **Elementos clave a enfocar en video:**
  - El encabezado con el logo y número de versión (`Base v13.0` o `Lite v3.0`).
  - Los interruptores deslizantes de color rojo/gris (Lectura en voz alta, Control por voz, Cursor con cámara).
  - El selector desplegable de **Idioma** con sus 15 opciones y el texto de ayuda.
  - El desplegable de **Filtros de color** mostrando los grupos Rojo-Verde, Azul-Amarillo y Escala de grises, y el botón «Quitar filtro».
  - El selector de los 3 modos de movimiento de cámara (`Cabeza / torso`, `Brazos, manos o puños`, `Muñón / mano parcial`).
  - El selector de **Tu mascota** con Tinku, Cuchu y Yati.

### 2. Página de Bienvenida (`bienvenida.html`)
- **Qué muestra visualmente:** La primera pantalla que ve el usuario tras instalar la extensión.
- **Elementos clave a enfocar en video:**
  - Título acogedor: *«Ya puedes usar AdaptaPE»*.
  - Los 3 pasos ilustrados explicados con claridad.
  - Los 3 interruptores grandes para activar Voz, Cursor o Lectura sin abrumar con configuraciones complejas.

### 3. Página de Autorización de Micrófono (`voz/permisos.html`)
- **Qué muestra visualmente:** La pantalla limpia de concesión del micrófono.
- **Elementos clave a enfocar en video:**
  - Icono grande de micrófono en color rojo institucional.
  - Título *«Permitir el micrófono»* y el botón centrado *«Permitir micrófono»*.
  - La ventana emergente nativa de Chrome que se superpone pidiendo permiso y cómo hacer clic en «Permitir».

### 4. Página de Autorización de Cámara (`voz/permisos.html?dispositivo=camara`) [Base]
- **Qué muestra visualmente:** La pantalla limpia de concesión de cámara.
- **Elementos clave a enfocar en video:**
  - Icono grande de cámara de video.
  - Título *«Permitir la cámara»* y explicación de privacidad de que la imagen se procesa en el equipo.
  - Demostración de cómo pulsar **Enter** activa directamente el botón con foco, y cómo la pestaña se cierra sola volviendo automáticamente a la navegación.

### 5. Página de Nueva Pestaña de AdaptaPE (`nueva_pestana.html`)
- **Qué muestra visualmente:** La página de inicio personalizada que sustituye a la pestaña en blanco de Chrome.
- **Elementos clave a enfocar en video:**
  - Barra de búsqueda central con los iconos de micrófono, Lens y el botón destacado **«Modo IA»**.
  - Barra superior con los accesos directos de Google y el menú de aplicaciones desplegable.
  - Las secciones de **Accesos directos** y **Marcadores**.
  - El botón inferior **«Personalizar»** y el panel lateral que despliega la paleta de 7 temas visuales (Claro, Oscuro, Selva, Pacífico, Alto contraste, etc.), el selector de color de acento y la opción de subir una foto de fondo.

### 6. Elementos interactivos sobre cualquier página web (In-Page HUD)
- **Qué muestra visualmente:** Los componentes visuales que AdaptaPE dibuja encima de cualquier web visitada (como Wikipedia o YouTube):
  - **El indicador de voz (`#adapta-pe-mic-status`):** Burbuja roja flotante en la esquina inferior izquierda que cambia a azul cuando espera la orden tras decir «Computadora».
  - **La vista previa de la cámara (HUD del cursor cinético en Base):** Ventana espejada en la esquina inferior con el punto de seguimiento, la línea celeste que marca la dirección del joystick y las etiquetas de texto dinámicas (*«Mano · señal»*, *«Mano · joystick»*, *«pinza · suelta: clic»*, *«boca abierta · cierra: clic»*).
  - **El resaltado de selección por voz:** El contorno amarillo de 4 px con sombra negra (`#ffdc00`) que rodea al elemento seleccionado al decir «Computadora, selecciona [nombre]».
  - **El contorno de lectura TalkBack:** El borde rojo de 3 px (`#E30613`) que rodea al botón o texto mientras la voz lo lee en voz alta.
  - **La mascota interactiva en acción:** Tinku, Cuchu o Yati posados en la esquina, siguiendo con la cabeza el puntero del mouse y saludando o durmiendo según las órdenes de voz.
  - **El menú contextual propio:** Menú accesible flotante de AdaptaPE al hacer anticlic / clic derecho sobre un enlace o imagen.
