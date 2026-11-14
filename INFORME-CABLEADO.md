# Auditoría de Cableado

## 1. Causa y arreglo del botón Tutorial
El botón y la orden «tutorial» no abrían la página porque `chrome.tabs.query` usaba un patrón `chrome-extension://` inválido y tragaba el error. Se corrigió en `background.js` (Base y Lite) con avisos de fallo traducidos. Es imprescindible **recargar la extensión en `chrome://extensions`**.

## 2. Fallos corregidos por edición

|Edición | Fallo corregido (Sev.) | Efecto para el usuario|
|---|---|---|
|Extensión | Permisos inaccesibles (Alta) | No abría la página sin micrófono o cámara.|
|Extensión | Prueba ficticia (Media) | Simulaba éxito sin captura de voz real.|
|Extensión | Tutorial silencioso (Media) | Fallaba mudo si el worker cerraba.|
|Extensión | Retorno ficticio (Media) | Ocultaba fallos tras conceder permisos.|
|Extensión | Comillas en filtros (Media) | Filtros con comillas rompían la UI.|
|Extensión | Foco sin lectura (Media) | TalkBack omitía leer controles tabulados.|
|Windows | Elecciones/idioma (Alta) | Cambiar idioma borraba opciones y consentimiento.|
|Windows | Tutorial sin foco (Alta) | Interceptaba órdenes ajenas o simulaba clics.|
|Windows | Progreso falso (Media) | Avanzaba con voz apagada o filtros fallidos.|
|Windows | Prueba de nombre (Media) | No esperaba audio o colgaba al apagar.|
|Windows | Preferencias parciales (Media) | Alteraba valores omitidos o pisaba ceros.|
|Windows | Mascota en TTS (Media) | Alegría cortaba la animación de habla.|
|Windows | Submenús e idioma (Media) | No traducía submenús o perdía avance.|
|macOS | Prueba de nombre (Alta) | Daba por bueno el paso sin audio.|
|macOS | Órdenes externas (Alta) | Órdenes del tutorial iban a otra app.|
|macOS | Desplazamiento nulo (Media) | Daba «baja» completado sin mover la lista.|
|macOS | Interfaz congelada (Media) | No refrescaba cambios de voz ni filtros.|
|macOS | Filtro desconocido (Media) | «Filtro arcoíris» daba éxito sin aplicar nada.|
|macOS | Ajustes cubrían tutorial (Media) | En Lite, ajustes tapaban la ventana inicial.|
|macOS | Atajo muerto (Baja) | «Pulsa tutorial» enviaba una orden inútil.|
|macOS | Fallos silenciados (Baja) | Operar sin AX o IA simulaba éxito.|
|macOS | Destino mudo (Baja) | `withTarget` callaba si la app no avanzaba.|
|macOS | Textos sin traducir (Baja) | Pasos y títulos no cambiaban de idioma.|

## 3. Resultados verificados por el orquestador
- **Extensión**: voz 27, motores 77, cinético 31, detección 7, catálogo y Chrome OK.
- **Windows**: Base 9.890 y Lite 9.075 comprobaciones; compila net10/net48/net461.
- **macOS**: Base y Lite TEST SUCCEEDED.
- **Catálogo**: mismo hash en las 6 copias.

## 4. Pendiente de probar en hardware
Windows real (WPF/UIA, UiChecks sin ejecutar), micrófono y cámara.
