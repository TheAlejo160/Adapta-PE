<p align="center">
  <img src="AdaptaPE.png" alt="Logo de Adapta PE" width="250">
</p>

# 🇵🇪 Adapta PE — Sistema Operativo de Accesibilidad Universal Hands-Free

> **Versión:** 10.0.1 (Manifest V3)  
> **Compatibilidad:** Google Chrome, Brave, Microsoft Edge y navegadores basados en Chromium.  
> **Backend Opcional:** Python 3.x (Flask + Flask-CORS).

---

## 📋 Tabla de Contenidos
1. [¿Qué es Adapta PE?](#-qué-es-adapta-pe)
2. [Características Principales](#-características-principales)
3. [Guía de Instalación y Uso en Google Chrome](#-guía-de-instalación-y-uso-en-google-chrome)
   - [Paso 1: Descargar o clonar el proyecto](#paso-1-descargar-o-clonar-el-proyecto)
   - [Paso 2: Cargar la extensión en Google Chrome](#paso-2-cargar-la-extensión-en-google-chrome)
   - [Paso 3: (Opcional) Iniciar el servidor local de IA en Python](#paso-3-opcional-iniciar-el-servidor-local-de-ia-en-python)
   - [Paso 4: Permisos de Navegador (Micrófono y Cámara)](#paso-4-permisos-de-navegador-micrófono-y-cámara)
4. [Arquitectura del Sistema](#-arquitectura-del-sistema)
5. [Explicación Detallada del Código (Archivo por Archivo)](#-explicación-detallada-del-código-archivo-por-archivo)
   - [1. `manifest.json`](#1-manifestjson)
   - [2. `popup.html`](#2-popuphtml)
   - [3. `popup.js`](#3-popupjs)
   - [4. `background.js`](#4-backgroundjs)
   - [5. `content_script.js`](#5-content_scriptjs)
   - [6. `app.py`](#6-apppy)
6. [Catálogo de Comandos de Voz](#-catálogo-de-comandos-de-voz)
7. [Mecánica del Mouse Cinético y Dwell Click](#-mecánica-del-mouse-cinético-y-dwell-click)
8. [Filtros de Daltonismo (Matrices SVG)](#-filtros-de-daltonismo-matrices-svg)
9. [Seguridad y Privacidad](#-seguridad-y-privacidad)
10. [Roadmap y Futuras Mejoras](#-roadmap-y-futuras-mejoras)
11. [Licencia y Créditos](#-licencia-y-créditos)

---

## 🌟 ¿Qué es Adapta PE?

**Adapta PE** es una extensión de navegador web diseñada para democratizar el acceso a la web a personas con discapacidades motoras, visuales o de movilidad reducida. Transforma cualquier página web convencional en un entorno accesible, adaptable y navegable **completamente con manos libres (Hands-Free)**, utilizando visión artificial local, reconocimiento de voz continuo, síntesis de habla y matrices de corrección de color.

---

## 🚀 Características Principales

* 🗣️ **TalkBack Integrado:** Lector de pantalla contextual que verbaliza elementos al pasar el puntero sobre ellos (títulos, párrafos, enlaces, botones, imágenes con texto alternativo).
* 🤖 **Asistente de Voz con Palabra de Activación:** Reconocimiento de voz continuo en español (`es-PE`). Se activa diciendo **"Computadora"** seguido de un pitido para escuchar comandos de navegación (abrir/cerrar pestañas, scroll, búsqueda, dictado y clics).
* 👁️ **Filtros de Daltonismo en Tiempo Real:** Algoritmo basado en filtros SVG (`feColorMatrix`) que ajusta la paleta de colores para *Protanopia*, *Deuteranopia* y *Tritanopia*.
* 🎯 **Mouse Cinético Local (Head Tracking / Extremidades):** Algoritmo de visión artificial que corre al 100% en el navegador utilizando la cámara web. Permite controlar el puntero del ratón mediante giros o inclinaciones de la cabeza, brazos o muñones, incorporando **Dwell Click** (clic automático rápido tras mantener la fijación por 1 segundo).
* 🧠 **Backend Inteligente en Python (`app.py`):** Servicio complementario en Flask para análisis de imágenes mediante modelos de Visión Artificial ("Ojo Biónico").

---

## 🛠️ Guía de Instalación y Uso en Google Chrome

### Paso 1: Descargar o clonar el proyecto
Asegúrate de tener la carpeta del proyecto en tu equipo local:
```bash
git clone https://github.com/TheAlejo160/Adapta-PE.git
```
La carpeta contiene los archivos: `manifest.json`, `popup.html`, `popup.js`, `background.js`, `content_script.js`, `app.py` y `AdaptaPE.png`.

### Paso 2: Cargar la extensión en Google Chrome
1. Abre Google Chrome y escribe en la barra de direcciones:
   ```text
   chrome://extensions/
   ```
2. En la esquina superior derecha, activa la casilla o interruptor **"Modo de desarrollador"** (*Developer mode*).
3. Aparecerán nuevos botones en la parte superior izquierda. Haz clic en **"Cargar descomprimida"** (*Load unpacked*).
4. En el explorador de archivos, selecciona la carpeta `extensión` que contiene el archivo `manifest.json`.
5. ¡Listo! Verás la tarjeta de **Adapta PE (OS V10.0)** instalada y habilitada.
6. Haz clic en el ícono de la pieza de rompecabezas en la barra de herramientas de Chrome y fija (*Pin*) el ícono de **Adapta PE** para tenerlo siempre a mano.

### Paso 3: (Opcional) Iniciar el servidor local de IA en Python
Para habilitar el servicio complementario de análisis biónico de imágenes:
1. Asegúrate de tener Python 3.8+ instalado.
2. Instala las dependencias necesarias:
   ```bash
   pip install flask flask-cors
   ```
3. Ejecuta el servidor:
   ```bash
   python app.py
   ```
4. El servidor se iniciará en `http://127.0.0.1:5000/`. Puedes probar su estado abriendo en tu navegador `http://127.0.0.1:5000/estado`.

### Paso 4: Permisos de Navegador (Micrófono y Cámara)
Cuando actives por primera vez el **Asistente Always-On** o el **Mouse Cinético**, el navegador te solicitará permisos de micrófono y cámara respectivamente:
- Haz clic en **"Permitir"**.
- En caso de haber denegado el permiso por error, haz clic en el ícono de candado/ajustes a la izquierda de la barra de direcciones URL del sitio web actual y restablece los permisos a "Permitir".

---

## 🏗️ Arquitectura del Sistema

El siguiente diagrama ilustra cómo interactúan los diferentes componentes de la extensión:

```
+-------------------------------------------------------------------------+
|                              USUARIO                                    |
+-------------------+--------------------+--------------------+-----------+
                    |                    |                    |
        Ajustes en Popup UI         Voz / Micrófono       Webcam / Rostro
                    |                    |                    |
                    v                    |                    |
          +-------------------+          |                    |
          |    popup.html     |          |                    |
          |    popup.js       |          |                    |
          +---------+---------+          |                    |
                    |                    |                    |
       chrome.storage.local.set()        |                    |
                    |                    |                    |
                    v                    v                    v
          +---------------------------------------------------------------+
          |                      content_script.js                        |
          |  (Inyectado en la pestaña activa / Manipula el DOM directamente)|
          |                                                               |
          |  1. Motor de Voz (SpeechRecognition es-PE)                     |
          |  2. Motor TalkBack (Hover semántico + Outline visual)          |
          |  3. Filtros Daltonismo (SVG feColorMatrix dinámico)           |
          |  4. Mouse Cinético (Diferenciación de frames Canvas + Dwell)   |
          +-------------------------------+-------------------------------+
                                          |
                      chrome.runtime.sendMessage()
                                          |
                                          v
          +---------------------------------------------------------------+
          |                        background.js                          |
          |                   (Service Worker Central)                    |
          |                                                               |
          |  - chrome.tts.speak() / chrome.tts.stop()                     |
          |  - chrome.tabs.create() / chrome.tabs.remove()                |
          |  - chrome.tabs.update() (Búsquedas en Google)                 |
          +-------------------------------+-------------------------------+
                                          |
                      HTTP REST Fetch (JSON / CORS)
                                          v
          +---------------------------------------------------------------+
          |                            app.py                             |
          |                  (Servidor Flask en Python)                   |
          |                                                               |
          |  - Endpoint /estado (Health Check)                            |
          |  - Endpoint /analizar_imagen (Visión Biónica / IA)            |
          +---------------------------------------------------------------+
```

---

## 🔍 Explicación Detallada del Código (Archivo por Archivo)

### 1. `manifest.json`
Es el archivo de configuración y registro principal exigido por las extensiones de Google Chrome bajo el estándar **Manifest V3**.

```json
{
  "manifest_version": 3,
  "name": "Adapta PE",
  "version": "10.0.1",
  "description": "Sistema Operativo de Accesibilidad Universal Hands-Free. Controla tu navegador con la voz y el movimiento.",
  "author": "Rodrigo Alejandro Apcho Aliaga (TheAlejo160)",
  "homepage_url": "https://adaptape.thealejo-dev.cc",
  "action": {
    "default_popup": "popup.html",
    "default_title": "Panel de Control Adapta PE",
    "default_icon": {
      "16": "AdaptaPE.png",
      "48": "AdaptaPE.png",
      "128": "AdaptaPE.png"
    }
  },
  "icons": {
    "16": "AdaptaPE.png",
    "48": "AdaptaPE.png",
    "128": "AdaptaPE.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": [
    "storage",
    "tts",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content_script.js"],
      "run_at": "document_end"
    }
  ],
  "minimum_chrome_version": "88"
}
```

* **`manifest_version: 3`**: Especifica la versión más moderna y segura del motor de extensiones de Chrome.
* **`action`**: Declara el botón visible en la barra de herramientas del navegador. Al hacer clic sobre él, despliega el archivo `popup.html`.
* **`permissions` y `host_permissions`**: Lista de permisos (`storage`, `tts`, `tabs`) y acceso a todos los sitios web (`<all_urls>`) necesarios para inyectar la accesibilidad.
* **`background`**: Declara a `background.js` como un **Service Worker**, el cual corre en segundo plano sin bloquear la interfaz.
* **`content_scripts`**: Inyecta automáticamente `content_script.js` al final de la carga (`document_end`) en todas las páginas web visitadas.

---

### 2. `popup.html`
Es la ventana emergente que se muestra al presionar el ícono de la extensión.

* **Diseño e Identidad:**
  * Utiliza la tipografía Google Font **Nunito** para máxima legibilidad, integrando un diseño moderno tipo tarjeta (`border-radius: 24px`).
  * Incorpora la paleta de colores institucional de Adapta PE: Rojo Bandera (`#E30613`) y un footer con información de licencia CC BY-NC-SA 4.0.
* **Controles Interactivos:**
  * `checkTalkBack`: Switch toggle para encender/apagar el lector de pantalla por cursor.
  * `checkVoz`: Switch toggle para encender el asistente de voz. Al activarse, muestra dinámicamente un bloque de ayuda explicando el uso de la palabra clave **"Computadora"**.
  * `selectDaltonismo`: Menú desplegable `<select>` para escoger filtros visuales universales: *Normal*, *Protanopia*, *Deuteranopia* o *Tritanopia*.
  * `checkOjos`: Switch toggle para activar el Mouse Cinético. Muestra una guía indicando que se debe permanecer quieto por 1 segundo para ejecutar un clic.

---

### 3. `popup.js`
Es el script controlador que gestiona los eventos de la interfaz gráfica del popup.

```javascript
// 1. Carga el estado inicial desde el almacenamiento local
chrome.storage.local.get(["talkback", "voz", "daltonismo", "ojos"], (res) => { ... });

// 2. Guarda los cambios y emite un mensaje a la pestaña actual
async function guardarYAvisar() {
  await chrome.storage.local.set({
    talkback: checkTalkBack.checked,
    voz: checkVoz.checked,
    daltonismo: selectDaltonismo.value,
    ojos: checkOjos.checked
  });

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && !tab.url.startsWith("chrome://")) {
    chrome.tabs.sendMessage(tab.id, { accion: "actualizar_estado" }).catch(()=>{});
  }
}
```

* **Flujo reactivo:**
  1. Al abrirse el popup, consulta `chrome.storage.local.get` y sincroniza las posiciones de los switches y menús con la última configuración guardada.
  2. Cada vez que el usuario conmuta un switch o cambia el valor del select, se dispara la función `guardarYAvisar()`.
  3. `guardarYAvisar()` persiste el nuevo estado en `chrome.storage.local` e inmediatamente busca la pestaña activa con `chrome.tabs.query`.
  4. Envía un mensaje con `{ accion: "actualizar_estado" }` hacia el `content_script.js` de la página que el usuario está viendo. Esto garantiza que la accesibilidad cambie **al instante**, sin necesidad de recargar la página web.

---

### 4. `background.js`
Es el **Service Worker** central del navegador. Corre en un contexto privilegiado con acceso a las APIs de administración de pestañas y voz sintética.

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.accion === "hablar") {
    chrome.tts.stop();
    chrome.tts.speak(request.texto, { lang: 'es-ES', rate: 1.05 });
  }
  else if (request.accion === "callar") {
    chrome.tts.stop();
  }
  else if (request.accion === "abrir_pestana") {
    chrome.tabs.create({ url: request.url });
  }
  else if (request.accion === "cerrar_pestana") {
    chrome.tabs.remove(sender.tab.id);
  }
  else if (request.accion === "buscar_inteligente") {
    // Lógica para redirigir la búsqueda a YouTube, MercadoLibre, Amazon, Wikipedia, Google, etc.
    // ...
  }
});
```

* **¿Por qué existe este archivo?**
  * Los *content scripts* inyectados en las páginas no tienen permiso directo para invocar `chrome.tts` ni para manipular pestañas ajenas por razones de seguridad de Chromium.
  * Por ello, `content_script.js` le envía solicitudes a `background.js`, quien ejecuta las acciones autorizadas.
* **Acciones soportadas:**
  * `"hablar"`: Detiene cualquier audio previo (`chrome.tts.stop()`) e inicia la locución del texto recibido con voz en español (`es-ES`) a velocidad óptima (`rate: 1.05`).
  * `"callar"`: Interrumpe inmediatamente la voz sintética cuando el usuario retira el cursor del elemento.
  * `"abrir_pestana"`: Crea una nueva pestaña (`chrome.tabs.create`) navegando a la URL indicada.
  * `"cerrar_pestana"`: Cierra la pestaña desde donde se originó el mensaje (`chrome.tabs.remove(sender.tab.id)`).
  * `"buscar_inteligente"`: Procesa las intenciones de búsqueda y navegación rápida. Incluye un diccionario de plataformas (YouTube, MercadoLibre, Facebook, Wikipedia, Amazon, Instagram, ChatGPT, Google) para abrir o buscar directamente en la URL correspondiente (abriendo en la pestaña actual o en una nueva).

---

### 5. `content_script.js`
Es el núcleo técnico de Adapta PE. Este script se inyecta directamente dentro de cada página web que el usuario visita y ejecuta cuatro módulos independientes:

#### Módulo 1: Asistente de Voz Always-On
* Emplea la API nativa del navegador `webkitSpeechRecognition`.
* Se configura con idioma `es-PE` (Español de Perú), modo continuo (`continuous = true`) y resultados intermedios para mayor agilidad (`interimResults = true`).
* **Auto-recuperación:** Cuenta con un controlador `reconocimientoVoz.onend` que reinicia automáticamente el motor si se desconecta, asegurando una experiencia *Always-On*.
* **HUD Visual y Wake Word:** Añade una insignia flotante en la esquina inferior izquierda (`#adapta-pe-mic-status`) indicando "🎙️ Activo. Di 'Computadora'". Al pronunciar la palabra clave, el asistente emite un *beep* y abre una ventana de 8 segundos ("👂 Dime...") para que des el comando de voz.
* **Parser de Intenciones Verbales Inteligente (`ejecutarComandoInteligente`):**
  * Expresiones como `"bajar"` o `"subir"` invocan `window.scrollBy({ top: ..., behavior: 'smooth' })`.
  * `"escribir [texto]"` detecta el elemento enfocado (`document.activeElement`) y concatena el texto tanto en campos estándar (`input`, `textarea`) como en editores enriquecidos (`isContentEditable`), despachando el evento `Event('input')` para activar la reactividad de frameworks.
  * `"abre [sitio]"` (ej. "abre youtube") detecta plataformas conocidas y solicita a `background.js` abrirlas. Soporta el modificador "en nueva pestaña".
  * `"busca [texto] en [sitio]"` o `"buscar [texto]"` detecta el sitio de destino e invoca búsquedas directas. Si no se especifica sitio, intenta escribir la búsqueda en un input local (e.g., barra de búsqueda de la página actual) o recurre a Google.
  * `"abrir [nombre]"` recorre todos los elementos `<a>` y `<button>` del documento, encuentra la coincidencia de texto, resalta el enlace con un borde rojo `#E30613` y simula un `.click()`.

#### Módulo 2: TalkBack Inteligente
* Monitorea eventos `mouseover` y `mouseout` en todo el árbol DOM.
* Filtra únicamente elementos que aportan valor semántico: `P`, `H1`, `H2`, `H3`, `A`, `BUTTON`, `IMG`, `LI`, `SPAN`.
* Al posarse sobre un elemento:
  1. Le aplica un contorno de accesibilidad de alto contraste: `outline: 4px solid #E30613`.
  2. Extrae el texto legible o el atributo `alt` si es una imagen.
  3. Aplica un mecanismo de **Debounce** con temporizador de 400ms (`temporizadorTalkBack`) para evitar hablar en ráfagas cuando el usuario pasa el mouse rápidamente por la pantalla.
  4. Al confirmarse la permanencia, envía el mensaje `{ accion: "hablar", texto }` a `background.js`.
* Al salir (`mouseout`): remueve el contorno y cancela la lectura activa.

#### Módulo 3: Filtros de Daltonismo por SVG
* Inyecta dinámicamente un nodo `<svg>` oculto en el `<body>` con definiciones `<feColorMatrix>` especializadas.
* Aplica el filtro en la raíz de la página mediante CSS: `document.documentElement.style.filter = url(#tipo)`.
* Al seleccionar "ninguno", retira el filtro limpiando el estilo global.

#### Módulo 4: Mouse Cinético y Visión Artificial Local
* Utiliza `navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })` para capturar la cámara web local.
* Procesa los fotogramas en memoria a través de un `<canvas>` HTML5 invisible configurado con `{ willReadFrequently: true }`. Además, dibuja un HUD en tiempo real sobre el video.
* **Cálculo de Movimiento Óptico:** Compara el fotograma actual con el anterior píxel por píxel:
  $$\Delta = |R_{actual} - R_{prev}| + |G_{actual} - G_{prev}| + |B_{actual} - B_{prev}|$$
* Aquellos píxeles cuya diferencia supere el umbral de sensibilidad (`diff > 50`) se consideran píxeles activos. Puede detectar si el movimiento proviene de la "Cabeza" o el "Brazo/Mano" basado en la posición.
* **Sistema de Joystick Absoluto (Físicas):** Cuenta con un centro inamovible (cruz fija) y aplica EMA (Exponential Moving Average) agresivo para lograr suavidad y estabilidad.
* **Zonas de Acción:**
  * **Zona Muerta (Verde):** Radio central fijo donde el cursor es seguro y estable. Aquí se carga el clic.
  * **Zona de Atracción (Naranja):** Borde ajustado con movimiento extremadamente lento para control preciso.
  * **Zona Libre:** Movimiento fluido hacia la dirección deseada (máx 8px/frame).
* **Dwell Click (Autoclic por permanencia):**
  * Al retornar el movimiento al centro absoluto (Zona Muerta), el cursor incrementa `tiempoFijado`.
  * El HUD muestra el progreso "🛑 SEGURO (X%)" y el cursor aumenta de tamaño.
  * Tras lograr la permanencia segura (aproximadamente 1 segundo / 125 cuadros), se identifica el elemento exacto bajo las coordenadas `(posX, posY)` con `document.elementFromPoint`, se ejecuta `.click()`, y se emite un destello visual verde.

---

### 6. `app.py`
Es el microservicio en Python construido con **Flask** y **Flask-CORS**.

```python
from flask import Flask, jsonify, request
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

@app.route('/estado', methods=['GET'])
def estado_servidor():
    return jsonify({"mensaje": "¡Cerebro Python de Adapta PE en línea! 🇵🇪"})

@app.route('/analizar_imagen', methods=['POST'])
def analizar():
    datos = request.get_json()
    img_src = datos.get('src')
    print(f"[PYTHON] 👁️ Ojo Biónico activado. Analizando imagen: {img_src}")

    # Simulación de inferencia de modelo de IA
    time.sleep(1)
    descripcion_ia = "Análisis de IA: Parece ser un paisaje con montañas y un lago al atardecer."

    return jsonify({"descripcion": descripcion_ia})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
```

* **Función dentro de Adapta PE:**
  * Actúa como backend desacoplado para tareas pesadas de Inteligencia Artificial que exceden el rendimiento del navegador.
  * Permite conectar modelos de Visión por Computadora (como BLIP, LLaVA, CLIP o Google Gemini Vision) para que un usuario invidente no sólo escuche el atributo `alt`, sino una descripción semántica enriquecida de lo que contiene cualquier imagen de la web ("Ojo Biónico").
* **Seguridad CORS:** Incorpora `CORS(app)` para aceptar peticiones provenientes del origen de la extensión de Chrome (`chrome-extension://...`).

---

## 🎙️ Catálogo de Comandos de Voz

Cuando el **Asistente Always-On** está activo, primero debes decir la palabra clave **"Computadora"**, esperar el pitido, y luego pronunciar con naturalidad cualquiera de las siguientes instrucciones:

| Comando Verbal | Acción Ejecutada |
| :--- | :--- |
| `"nueva pestaña"` o `"abrir pestaña"` | Verbaliza confirmación y abre una nueva pestaña en Google. |
| `"cerrar pestaña"` | Cierra la pestaña activa en ese momento. |
| `"bajar"` o `"hacia abajo"` | Hace scroll suave del 70% de la pantalla hacia abajo. |
| `"subir"` o `"hacia arriba"` | Hace scroll suave del 70% de la pantalla hacia arriba. |
| `"buscar [término]"` o `"busca [término] en [sitio]"` | Intenta buscar en una barra local de la página; si no hay, busca en Google o directamente en el sitio pedido (ej. *“busca laptops en mercado libre”*, *“buscar gatos en youtube”*). |
| `"escribir [texto]"` | Escribe el texto dictado en el campo de texto o editor enfocado activando eventos reactivos. |
| `"abre [sitio]"` o `"entra a [sitio]"` | Navega rápidamente a sitios conocidos (YouTube, Wikipedia, Amazon, ChatGPT, etc.) (ej. *“abre youtube en una pestaña nueva”*). |
| `"abrir [nombre del botón o link]"` | Busca enlaces o botones en la página que contengan dicho texto y hace clic sobre ellos (ej. *“abrir Contacto”*). |

---

## 🎯 Mecánica del Mouse Cinético y Dwell Click

El sistema cinético no requiere sensores costosos de seguimiento ocular (*eye-trackers*) ni hardware dedicado:

1. **Captura en Espejo:** El canvas invierte el video horizontalmente (`scaleX(-1)`) para que el movimiento sea intuitivo (al moverte a tu derecha, el puntero va a la derecha).
2. **Diagnóstico HUD:** En la esquina inferior derecha se despliega una ventana interactiva (burbuja flotante) con el video, una cruz central fija, indicadores de progreso de clic, fuentes de movimiento (Cabeza vs Brazo) y zonas dibujadas (Muerta/Verde, Atracción/Naranja).
3. **Puntero Virtual Autónomo:** Se dibuja un círculo rojo flotante con borde blanco en el nivel más alto de la capa de renderizado (`z-index: 9999999`), el cual está restringido a una velocidad segura (8 píxeles por frame máximo).
4. **Joystick Absoluto y Dwell Click:** Emula un joystick donde retornar la cabeza/cuerpo a la postura inicial central (Zona Muerta) inicia el contador de permanencia. Tras 125 frames (unos instantes de inmovilidad en el centro), se ejecuta un clic en la coordenada del puntero virtual, garantizando una postura ergonómica para las personas sin motricidad en las manos.

---

---

### Opción 2: Ecuaciones de código (Más fácil de entender para devs)
Como estás trabajando con los valores de `feColorMatrix`, a otros programadores les resulta mucho más útil leer esto como ecuaciones directas en lugar de matrices.

## 🎨 Filtros de Daltonismo (Matrices SVG)

Adapta PE no aplica simples capas de opacidad, sino **matrices de transformación de color matemáticas** estandarizadas para recalcular los canales Rojo (R), Verde (G) y Azul (B):

* **Protanopia (Deficiencia de Rojo):**
  * `R' = (0.567 * R) + (0.433 * G) + (0.000 * B)`
  * `G' = (0.558 * R) + (0.442 * G) + (0.000 * B)`
  * `B' = (0.000 * R) + (0.242 * G) + (0.758 * B)`

* **Deuteranopia (Deficiencia de Verde):**
  * `R' = (0.625 * R) + (0.375 * G) + (0.000 * B)`
  * `G' = (0.700 * R) + (0.300 * G) + (0.000 * B)`
  * `B' = (0.000 * R) + (0.300 * G) + (0.700 * B)`

* **Tritanopia (Deficiencia de Azul):**
  * `R' = (0.950 * R) + (0.050 * G) + (0.000 * B)`
  * `G' = (0.000 * R) + (0.433 * G) + (0.567 * B)`
  * `B' = (0.000 * R) + (0.475 * G) + (0.525 * B)`

---

## 🔒 Seguridad y Privacidad

* **Procesamiento de Cámara 100% Local:** El flujo de video de la cámara web se procesa enteramente en la memoria RAM del navegador a través de un canvas HTML5. Ningún fotograma ni video es guardado, almacenado ni transmitido hacia servidores externos.
* **Sin Recolección de Datos:** Adapta PE no recolecta historial de navegación, contraseñas ni cookies.
* **Almacenamiento Local Aislado:** Todas las opciones y configuraciones se almacenan exclusivamente dentro del almacenamiento local del navegador del usuario (`chrome.storage.local`).

---

## 🔮 Roadmap y Futuras Mejoras

- [ ] **Integración en tiempo real del Ojo Biónico:** Conexión directa entre el cursor de TalkBack y el endpoint `/analizar_imagen` de `app.py`.
- [ ] **Soporte Offline para Reconocimiento de Voz:** Integración con modelos locales como Whisper WebGPU.
- [ ] **Calibración Guiada de Puntero:** Asistente interactivo de 9 puntos para calibrar el rango de movimiento de la cabeza según la distancia a la pantalla.
- [ ] **Soporte Multi-idioma:** Configuración para quechua, aymara, inglés y portugués.

---

### 📄 Licencia y Créditos

<a href="https://example.com">Adapta PE</a> © 2026 by <a href="https://thealejo-dev.cc">Rodrigo Alejandro Apcho Aliaga</a> is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International</a><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;">

Desarrollado con dedicación para promover la inclusión digital y la accesibilidad universal en el Perú y el mundo.

> 🤖 **Declaración de uso de Inteligencia Artificial:** En este proyecto se utilizaron herramientas de Inteligencia Artificial generativa para la creación y optimización de recursos gráficos/imágenes, así como para la asistencia y co-creación en partes específicas del código fuente (sin abarcar la totalidad del desarrollo, el cual fue diseñado, integrado y supervisado por el autor).


