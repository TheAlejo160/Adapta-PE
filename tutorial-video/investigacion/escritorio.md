# Investigación de escritorio: Adapta PE Base y Lite

Consulta local del 18 de octubre de 2026. Alcance: Windows y macOS, únicamente Base y Lite. Investigación de fuentes, documentación y recursos; no se ejecutaron aplicaciones, sensores, instaladores ni pruebas. «Verificado» significa constatado en esos archivos, no demostrado físicamente. Las recomendaciones de tomas de la sección 9 son propuestas, no grabaciones realizadas.

## Fuentes y forma de citar

Cada referencia entre corchetes remite al archivo absoluto indicado aquí. Las referencias al README corresponden a documentación vigente leída, no a una comprobación de ejecución. Los documentos de paridad y validación conservan resultados históricos y pendientes.

- [WB-R]: `/Users/thealejo/Desktop/Adapta-PE-Win/README.md`.
- [WB-L]: `/Users/thealejo/Desktop/Adapta-PE-Win/LEEME.txt`.
- [WB-U]: `/Users/thealejo/Desktop/Adapta-PE-Win/src/AdaptaPE/MainWindow.cs`.
- [WB-C]: `/Users/thealejo/Desktop/Adapta-PE-Win/src/AdaptaPE/Core/Commands.cs`.
- [WB-A]: `/Users/thealejo/Desktop/Adapta-PE-Win/src/AdaptaPE/Windows/Actions.cs`.
- [WB-V]: `/Users/thealejo/Desktop/Adapta-PE-Win/src/AdaptaPE/Windows/Voice.cs`.
- [WB-I]: `/Users/thealejo/Desktop/Adapta-PE-Win/scripts/installer.nsi`.
- [WB-T]: `/Users/thealejo/Desktop/Adapta-PE-Win/docs/VALIDACION-WINDOWS.md`.
- [WL-R]: `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/README.md`.
- [WL-L]: `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/LEEME.txt`.
- [WL-U]: `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/src/AdaptaPELite/MainWindow.cs`.
- [WL-C]: `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/src/AdaptaPELite/Core/Commands.cs`.
- [WL-A]: `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/src/AdaptaPELite/Windows/Actions.cs`.
- [WL-I]: `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/scripts/installer.nsi`.
- [WL-T]: `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/docs/VALIDACION-WINDOWS.md`.
- [MB-R]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/README.md`.
- [MB-U]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE/ContentView.swift`.
- [MB-S]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE/Adapta_PEApp.swift`.
- [MB-C]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE/CommandParser.swift`.
- [MB-V]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE/VoiceManager.swift`.
- [MB-K]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE/TrackingManager.swift`.
- [MB-M]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE/Mascot.swift`.
- [MB-P]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE.xcodeproj/project.pbxproj`.
- [ML-R]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/README.md`.
- [ML-U]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/Adapta-PE-Lite/ContentView.swift`.
- [ML-F]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/Adapta-PE-Lite/FloatingView.swift`.
- [ML-S]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/Adapta-PE-Lite/Adapta_PE_LiteApp.swift`.
- [ML-C]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/Adapta-PE-Lite/CommandParser.swift`.
- [ML-A]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/Adapta-PE-Lite/ActionManager.swift`.
- [ML-P]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/Adapta-PE-Lite.xcodeproj/project.pbxproj`.
- [ML-D]: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/docs/LITE.md`.
- [ENT-L]: `/Users/thealejo/Desktop/Instaladores-AdaptaPE-2026-10-17/LEEME.txt`.
- [ENT-V]: `/Users/thealejo/Desktop/Instaladores-AdaptaPE-2026-10-17/VERIFICACION.json`.

## 1. Qué es cada app y diferencias exactas entre Base y Lite

- **Windows Base:** aplicación nativa C#/WPF independiente; voz para operar el escritorio, lectura accesible manual y automática, cursor con cámara, siete filtros, mascotas, bandeja y panel flotante. Tiene integración externa de IA opcional y apagada; no requiere la extensión, Python ni servidor. [WB-R, WB-U]
- **Windows Lite:** aplicación independiente C#/WPF; conserva asistente de voz, dictado, controles y menús accesibles, clic por voz, lectura manual, siete filtros, mascotas, bandeja y panel. Excluye cámara, OpenCV/modelos de visión, cursor cinético, permanencia, TalkBack automático, IA y claves de proveedor. No es sólo un lanzador web. [WL-R, WL-U, WL-C]
- **macOS Base:** aplicación SwiftUI independiente; voz, lectura manual/automática, cursor por cámara con tres modos, filtros, mascotas, ventana de ajustes, barra de menú y panel. IA externa voluntaria con API propia; los comandos habituales funcionan sin ella. [MB-R, MB-U]
- **macOS Lite:** proyecto SwiftUI propio, sin dependencia de Base. Conserva voz, dictado/controles, clic por voz, lectura solicitada, filtros, mascotas, barra de menú y panel; no incorpora cámara, cinética, dwell, TalkBack automático ni IA externa. [ML-R, ML-D, ML-U]
- **Las cuatro apps se usan fuera del navegador:** las acciones sobre otras aplicaciones dependen de UI Automation en Windows y Accesibilidad/AX en macOS. No tienen el acceso al DOM de una extensión y no garantizan operar cualquier control, juego o app. [WB-R, WL-R, MB-R, ML-R]
- **No trasladar prestaciones de la extensión al escritorio:** reconocimiento actual en español; los gestos de pinza/boca de la extensión no están acreditados como métodos de clic en estos escritorios. Ver secciones 5 y 6. [WB-V, WB-C, MB-V, MB-K, ML-R]
- **Versiones:** Windows muestra versión pública 1.0 y revisión técnica 1.0.3.0; los proyectos macOS declaran versión 1.0. Paquetes locales y código implementado no equivalen a release pública validada. [WB-R, WL-L, MB-P, ML-P, ENT-V]

## 2. Descarga e instalación

### Qué archivos existen y qué descarga está pendiente de verificar

- Las guías enlazan el sitio `https://www.adaptape.cc`; **NO VERIFICADO** qué enlaces/paquetes ofrece actualmente la web ni que coincidan con estos checkouts. No se navegó ni descargó un paquete público en esta investigación. Clonar un repo no garantiza recibir sus EXE/DMG. [WB-R, WL-R, MB-R, ML-R]
- En `/Users/thealejo/Desktop/Instaladores-AdaptaPE-2026-10-17/` existen estos cuatro archivos locales de prueba: `AdaptaPE-Base-macOS-1.0-2026-10-17.dmg`, `AdaptaPE-Lite-macOS-1.0-2026-10-17.dmg`, `AdaptaPE-Windows-1.0-2026-10-17-Setup-x64.exe`, `AdaptaPELite-Windows-1.0-2026-10-17-Setup-x64.exe`. Son la entrega local identificada por [ENT-L, ENT-V]; su existencia se comprobó en disco. No se volvieron a calcular hashes ni a montar imágenes.

### Windows: instalador para personas usuarias

- **Requisitos del instalador moderno:** Windows 10/11 x64; no es el paquete para Windows 7/8/8.1, x86 o ARM64. El proyecto tiene targets históricos separados `net48` y `net461`, sin validación universal. Windows 10 Home/Pro 22H2 figura como objetivo de pruebas, sin afirmar soporte oficial de .NET 10. [WB-R, WL-L, WB-I, WL-I]
- **1. Elegir edición:** Base para cámara/lectura automática; Lite si no se necesitan. El nombre genérico del instalador generado es `AdaptaPE-1.0-Setup-x64.exe` o `AdaptaPELite-1.0-Setup-x64.exe`; la entrega local añade fecha. [WB-R, WL-L, ENT-L]
- **2. Cerrar una instalación anterior desde la bandeja junto al reloj.** Cerrar Ajustes no termina el proceso; el instalador comprueba que la app esté cerrada. [WB-I, WL-I, WB-L, WL-L]
- **3. Abrir el EXE.** Si SmartScreen muestra «Windows protegió su PC» para un archivo de procedencia comprobada, la guía permite **«Más información» → «Ejecutar de todas formas»**, si esa opción aparece. Los paquetes locales documentados no tienen firma Authenticode. No confundirlo con malware o bloqueo administrativo ni desactivar protecciones. [WB-R, WL-R, ENT-V]
- **4. Seguir bienvenida/licencia y elegir accesos:** casillas exactas **«Crear acceso directo en el escritorio»** y **«Crear acceso directo en el menú Inicio»**. Instala por usuario, en `%LOCALAPPDATA%\Programs\AdaptaPE` o `%LOCALAPPDATA%\Programs\AdaptaPELite`. No activa automáticamente inicio con Windows. [WB-I, WL-I, WB-R, WL-L]
- **5. Dependencias:** instaladores modernos autocontenidos incluyen .NET y voz española local. Base incluye modelos de cámara y puede abrir el redistribuible oficial Visual C++ x64 si falta, con posible autorización administrativa; Lite no incluye OpenCV ni ese instalador de cámara. La app se usa normalmente sin elevarla. [WB-R, WL-T, ENT-L]
- **6. Terminar y abrir:** **«Abrir Adapta PE»** / **«Abrir Adapta PE Lite»**, o su acceso directo. Primer inicio con asistencia apagada. Activar después sólo lo necesario. [WB-I, WL-I, WB-L, WL-L]
- **Actualizar/reparar:** cerrar desde bandeja y ejecutar el instalador; conserva preferencias/accesos y rechaza sustituir una revisión superior. No hay actualizador automático de red documentado. **Desinstalar:** Configuración → Aplicaciones o `Uninstall.exe`; conserva preferencias y runtimes compartidos. [WB-R, WL-R, WB-I, WL-I]

### Windows: carpeta portable o ZIP

- Extraer **todo** el ZIP si se recibió así; conservar DLL, modelos, recursos de mascotas y licencias. Abrir `AdaptaPE.exe` o `AdaptaPELite.exe` dentro de esa carpeta. Un EXE aislado no representa la app completa. **NO VERIFICADO** un ZIP público actual concreto. [WB-R, WB-L, WL-R]
- Sólo publicaciones modernas **no autocontenidas** requieren .NET Desktop Runtime 10 de la arquitectura correspondiente; no hace falta SDK para usarlas. Base puede requerir Visual C++ compatible y Media Feature Pack en Windows N/KN. [WB-R, WL-R]

### macOS: DMG

- **Requisitos declarados:** macOS Sonoma **14.0 o posterior**; targets de app con mínimo 14.0 en ambos proyectos. Las arquitecturas previstas son Intel `x86_64` y Apple Silicon `arm64`. El proyecto por sí solo no garantiza que cualquier Debug sea universal; la entrega local del 17/10 registra ambos binarios universales. **NO VERIFICADO** funcionamiento en Intel o en cada versión de macOS durante esta tarea. [MB-P, ML-P, MB-R, ML-R, ENT-V]
- **1. Elegir el DMG Base o Lite**, de una procedencia comprobada; son aplicaciones independientes. Los dos DMG locales citados tienen firma de desarrollo y carecen de Developer ID/notarización de distribución según su informe. [ENT-L, ENT-V]
- **2. Abrir el DMG y arrastrar la app a «Aplicaciones».** Abrir después la copia de Aplicaciones, no la alojada dentro de la imagen. [MB-R, ENT-L]
- **3. Si macOS la bloquea por desarrollador no identificado/falta de notarización:** intentar abrir esa copia una vez; ir a **Ajustes del Sistema → Privacidad y seguridad → «Abrir de todos modos»** o **«Abrir igualmente»**, según versión, y confirmar sólo si se confía en el archivo. Esto no concede Accesibilidad. [MB-R, ML-R]
- **4. Conceder los permisos según función**, descritos en la sección 3. Si el sistema pide reiniciar tras cambiar un permiso, salir desde la barra de menú y reabrir la misma copia instalada. Mantener ubicación/firma estables. [MB-R, ML-R]
- **5. Para actualizar, salir antes de sustituir la app.** En Lite, la desinstalación documentada desmarca **«Iniciar al encender el Mac»**, sale de la app y retira su bundle; borrar la app no borra automáticamente preferencias/permisos. [ML-R, MB-R]
- **Avisos distintos:** malware, archivo dañado y políticas de organización requieren revisar ese caso; la guía no propone desactivar Gatekeeper ni ejecutar comandos de cuarentena generales. **NO VERIFICADO** cuál será el aviso exacto de un Mac destinatario. [MB-R, ML-R]
- **Fuentes frente a instalador:** los README también explican compilación con Xcode, pero no es un paso necesario para quien recibe una app empaquetada. El DMG histórico `Instalador_Adapta_PE.dmg` mencionado en Base no acredita contener el código actual; no usarlo como evidencia de esta versión. [MB-R, ML-R]

## 3. Permisos: pasos y mensajes

### Windows Base y Lite

- **Micrófono:** Windows 11 → Configuración → Privacidad y seguridad → Micrófono; Windows 10 → Configuración → Privacidad → Micrófono. Habilitar acceso al dispositivo y **acceso para aplicaciones de escritorio**, cuando se ofrezca. En ambas apps, **«Permiso del micrófono»** abre `ms-settings:privacy-microphone`; **«Dispositivos de sonido»** abre Sonido. [WB-R, WL-R, WB-U, WL-U]
- Elegir **«Micrófono»** y **«Reconocimiento de voz»**, activar **«Activar voz»**, mirar **«Señal del micrófono»** y esperar estado de escucha. El estado inicial es **«Micrófono apagado»** y el cuadro muestra **«Aquí verás lo que escuché»**. [WB-U, WL-U]
- **Cámara sólo Base:** misma ruta de privacidad, categoría Cámara. **«Permiso de cámara»** abre `ms-settings:privacy-webcam`. **«Cámara (índice)»** ofrece «Cámara 1» a «Cámara 10»; activar **«Activar cursor con cámara»**. Estado inicial **«Cámara apagada»**; área **«Tu cámara aparece aquí / Activa el cursor para empezar»**. [WB-R, WB-U]
- **Lite no pide cámara ni tiene selector/interruptor de cámara.** Tampoco incorpora TalkBack automático o IA. [WL-U, WL-L]
- **Accesibilidad:** no se documenta un permiso de Accesibilidad equivalente al de macOS; Windows puede bloquear entrada hacia apps elevadas por UIPI, UAC y escritorio seguro. No recomendar desactivar UAC ni presentar el control de esos espacios como disponible. [WB-R, WL-R]
- **Grabación de pantalla:** no hay un paso de autorización de pantalla estilo macOS para los filtros modernos de Windows. Windows 8+ usa Magnification API; Base separa un consentimiento interno para enviar una captura al proveedor de IA. No confundir ese consentimiento con un permiso del sistema. [WB-R, WB-U, WL-R]

### macOS Base y Lite

- **Ruta común:** Ajustes del Sistema → Privacidad y seguridad; habilitar la edición/copia realmente ejecutada. Base y Lite tienen permisos independientes. [MB-R, ML-R]
- **Micrófono + Reconocimiento de voz:** se solicitan al encender **«Voz»** en Base o **«Asistente de voz»** en Lite. Estados de Base incluyen **«Solicitando micrófono…»**, **«Micrófono sin permiso»**, **«Reconocimiento de voz sin permiso»**, **«Dime el comando…»**. Botones de denegación: Base **«Revisar permiso del micrófono»**, **«Revisar permiso de reconocimiento de voz»**; Lite **«Revisar permiso del micrófono»**, **«Revisar reconocimiento de voz»**. [MB-U, MB-V, ML-U]
- **Accesibilidad:** pulsar **«Permitir control del escritorio»**; la app pide confianza AX y abre su ajuste si falta. En Privacidad y seguridad → Accesibilidad, autorizar esa app para teclado, clic, lectura y controles externos; Base también para cursor corporal. Volver y pulsar **«Actualizar dispositivos y permisos»**. [MB-S, ML-S, MB-U, ML-U]
- **Cámara sólo Base:** activar **«Cursor con cámara»**, aceptar acceso y seleccionar Cámara. Si se denegó, aparece **«Revisar permiso de la cámara»**. Lite declara explícitamente cámara deshabilitada y no solicita ese acceso. [MB-U, MB-R, ML-P, ML-R]
- **Grabación de pantalla en ambas ediciones:** necesaria para filtros mediante ScreenCaptureKit. Puede llamarse **«Grabación de pantalla y audio del sistema»**; los filtros no capturan audio. Habilitar app y volver a activar filtro. Lite incluye **«Permiso de Grabación de pantalla»**; Base ofrece **«Grabación de pantalla»** en Ayuda. La selección del filtro no acredita que ya exista una imagen procesada. [MB-R, MB-U, ML-U, ML-R]
- **Automatización en ambas:** puede aparecer tras una orden de navegador mediante Apple Events. Revisar Privacidad y seguridad → Automatización → entrada de Adapta PE/Base o Lite → navegador solicitado. Manejo específico para Safari, Chrome, Brave y Edge. [MB-R, ML-R]
- **Para voz sola no hace falta cámara; para mascota sola no hace falta encender voz/captura; para filtros solos no hace falta micrófono.** Grabación de pantalla también se usa en Base para captura explícita de IA, con consentimiento adicional interno. [MB-R, ML-R, MB-U]

## 4. Interfaz principal: controles visibles y atajos

### Windows: Ajustes Base y Lite

- **Ubicación/cierre:** ventana de ajustes y bandeja junto al reloj; doble clic en el icono abre ajustes. Cerrar la ventana conserva asistencia y panel. Encabezado **«Usar panel · PiP»** y pie **«Detener todo»**. [WB-U, WL-U]
- **Pestañas Base:** **«Control»**, **«Lectura y filtros»**, **«Mascota»**, **«IA opcional»**, **«Ayuda»**. **Lite:** **«Asistente de voz»**, **«Filtros de color»**, **«Mascota»**, **«Ayuda»**. No rotular la pestaña Lite actual como «Daltonismo», aunque documentos anteriores empleen ese nombre. [WB-U, WL-U]
- **Voz, ambas:** **«Activar voz»** enciende/apaga reconocimiento; **«Dispositivos y reconocimiento»** despliega **«Micrófono»**, **«Reconocimiento de voz»**, **«Nombre para llamar al asistente»**, **«Permiso del micrófono»**, **«Dispositivos de sonido»**. Motores exactos: **«Automático · SAPI o local incluido»**, **«Local incluido · español»**, **«SAPI instalado en Windows»**. [WB-U, WL-U]
- **Orden escrita, ambas:** **«Escribir una orden»** despliega caja accesible llamada **«Orden para la aplicación externa»** y **«Ejecutar orden»**. Enter ejecuta; escribir sin «Computadora» y enfocar primero el destino externo. [WB-U, WL-U]
- **Cámara Base:** **«Activar cursor con cámara»**, **«Clic por permanencia · dwell»**, **«Calibrar»**, **«Pausar / reanudar»**. La vista y barras informan movimiento/progreso, no son botones. [WB-U]
- **«Adaptar a mi movimiento» Base:** **«Control con»** selecciona Cabeza, Manos o Zona libre; **«Perfil equilibrado»**, **«Perfil ágil»**, deslizadores **«Velocidad»**, **«Amplitud (menos: movimientos pequeños)»**, **«Espera de clic (segundos)»**, casilla **«Reducir temblores»**, botón **«Siguiente clic derecho»**. [WB-U, WB-R]
- **«Cámara y consumo» Base:** **«Cámara (índice)»**, **«Detecciones por segundo»** con **«5 · mínimo consumo»**, «8», **«12 · recomendado»**, «15», «20», «30»; **«Permiso de cámara»**. Cambiar selector de cámara activa la detiene; volver a activar tras escogerla. [WB-U]
- **Filtros, ambas:** **«Filtro de pantalla»** elige **«Sin filtro»**, **«Protanomalía»**, **«Protanopía»**, **«Deuteranomalía»**, **«Deuteranopía»**, **«Tritanomalía»**, **«Tritanopía»**, **«Acromatopsia»**; **«Quitar filtro»** retira el propio. Sólo Base añade **«TalkBack: leer controles al señalar»**. [WB-U, WL-U, WB-R, WL-R]
- **Mascota, ambas:** **«Tu mascota»** elige **«Sin mascota»**, **«Tinku · gallito»**, **«Cuchu · cuy»**, **«Yati · llama»**. **«Mover mascota y panel juntos»**, **«Saludar»**, **«Dormir»**, **«Despertar»**, **«Mover con teclas»**, **«Otro monitor»**. Función de cada uno en sección 7. [WB-U, WL-U, WB-R, WL-R]
- **Ayuda, ambas:** inicio voluntario **«Iniciar Adapta PE al entrar en Windows»** / **«Iniciar Adapta PE Lite al entrar en Windows»**; **«Esquina del panel»** y **«Monitor del panel»**; **«Salir de Adapta PE»** / **«Salir de Adapta PE Lite»**. Esquinas: Superior izquierda/derecha, Inferior izquierda/derecha. [WB-U, WL-U]
- **IA opcional, sólo Base:** **«Activar integración de IA externa»**, **«Endpoint HTTPS compatible con chat/completions»**, **«Modelo del proveedor»**, **«API key personal (se protege con DPAPI para tu usuario)»**, **«Guardar clave»**, **«Eliminar clave»**, **«Permitir enviar pantalla al proveedor durante esta sesión»**. Consulta sólo explícita; no se incluye crédito, modelo generativo local ni suscripción. [WB-U, WB-R]

### Windows: bandeja y PiP

- **Bandeja Base:** **«Abrir ajustes»**, **«Voz: activar / apagar»**, **«Cursor: activar / apagar»**, **«Panel flotante»**, **«Detener todo»**, **«Salir»**. [WB-U]
- **Bandeja Lite:** **«Abrir ajustes»**, **«Voz: activar / apagar»**, submenú **«Daltonismo»**, **«Panel flotante»**, **«Detener todo»**, **«Salir»**. [WL-U]
- **Panel:** **«Voz»** en ambas y **«Cursor con cámara»** sólo Base; **«Opciones del panel»** ofrece cuatro esquinas, **«Otro monitor»**, **«Mascota»**, **«Mover mascota y panel juntos»**, **«Filtro de pantalla»** y, sólo Base, **«Mostrar cámara»**. Ocultar preview no apaga el cursor. Pie **«Ajustes»** y **«Detener todo»**; muestra transcripción, respuesta/error y botones de elección. [WB-U, WL-U, WB-R]
- **Atajo global Windows:** **Ctrl+Shift+S** intenta registrar parada de emergencia. Si otro programa lo ocupa, la app avisa y quedan ventana, bandeja y panel. No prometer disponibilidad incondicional; además coincide con Guardar como de otras apps. [WB-U, WL-U]

### macOS: Ajustes Base y Lite

- **Ubicación/cierre:** ventana de ajustes, icono de barra de menú y panel flotante. Cerrar ajustes mantiene el proceso; reabrir muestra la ventana. **«Usar panel»** abre panel y **«Detener todo»** queda al pie. [MB-U, MB-S, ML-U, ML-S]
- **Base:** selector **«Control»**, **«Lectura y filtros»**, **«Mascota»**, **«IA opcional»**, **«Ayuda»**. **Lite:** **«Asistente de voz»**, **«Filtros de color»**, **«Mascota»**. [MB-U, ML-U]
- **Control Base:** interruptores **«Voz»** y **«Cursor con cámara»**; con seguimiento activo, **«Calibrar»** y **«Pausar cursor»** / **«Reanudar cursor»**. Transcripción **«Escuché:»**, respuesta, controles condicionales de permisos de sección 3. [MB-U]
- **«Adaptar a mi movimiento» Base:** **«Control con»** ofrece **«Cabeza / torso»**, **«Brazos, manos o puños»**, **«Zona con textura»**; **«Velocidad»**, **«Reducir temblores»**, **«Adaptar a movimientos pequeños»**, **«Clic al mantener la postura»**, **«Espera de clic»**. [MB-U]
- **«Dispositivos y preferencias» Base:** **«Cámara»**, **«Micrófono»**, **«Nombre para llamar al asistente»**, **«Permitir reconocimiento de Apple por red»**, **«Iniciar al encender el Mac»**, lista **«Pantallas disponibles»**, **«Actualizar dispositivos y permisos»**. [MB-U]
- **Voz Lite:** interruptor **«Asistente de voz»**; **«Micrófono y preferencias»** despliega **«Micrófono»**, **«Nombre para llamar al asistente»**, **«Permitir reconocimiento de Apple por red»**, **«Iniciar al encender el Mac»**, **«Actualizar dispositivos y permisos»**. [ML-U]
- **Comandos y ayuda:** Base en **«Ayuda»** y Lite en desplegable **«Comandos y ayuda»** ofrecen **«Acciones de la app activa»** y **«Buscar campos de texto»**. Base añade **«Accesibilidad»**, **«Cámara y micrófono»**, **«Grabación de pantalla»**, **«Actualizar dispositivos y permisos»**; el botón Base «Cámara y micrófono» abre concretamente el panel Cámara, no dos paneles simultáneos. [MB-U, ML-U]
- **Lectura Base:** **«Leer en voz alta el elemento bajo el cursor»** activa lectura automática; **«Leer ventana activa»** pide lectura manual; **«Detener lectura»** silencia. Lite ofrece lectura explícita por voz, sin estos controles de TalkBack. [MB-U, ML-U, ML-R]
- **Filtros ambas:** **«Filtro de pantalla»** con Sin filtro y siete nombres citados para Windows; **«Quitar filtro»**. Lite añade **«Permiso de Grabación de pantalla»** y una referencia de colores originales. Se muestran **«Preparando filtro…»**, estado y selección; la app queda excluida del efecto. [MB-U, ML-U, MB-R, ML-R]
- **Mascotas ambas:** **«Tu mascota»** con Sin mascota/Tinku · gallito/Cuchu · cuy/Yati · llama. Al elegir una aparecen **«Mover mascota y panel juntos»**, **«Saludar»**, **«Dormir»**, **«Despertar»**, **«Mover con teclas»**, **«Otro monitor»**. [MB-M, ML-R]
- **IA opcional Base:** **«Activar IA con mi API key»**, **«Endpoint HTTPS de chat/completions»**, **«Modelo disponible en tu proveedor»**, **«API key personal»**, **«Guardar en Llavero»**, **«Eliminar clave»**, **«Permitir envío de pantalla al proveedor»**, y **«Cancelar consulta»** cuando hay operación. Lite carece de esos ajustes. [MB-U, ML-R]

### macOS: barra de menú, panel y atajos

- **Menú Base:** **«Abrir ajustes»**, **«Mostrar panel flotante»** / **«Ocultar panel flotante»**, **«Activar cursor»** / **«Apagar cursor»**, **«Activar voz»** / **«Apagar voz»**, **«Pausar cursor»** / **«Reanudar cursor»**, **«Detener todo»**, **«Salir de Adapta PE»**. No añadir selector de filtro a este menú Base: existe en el panel/ajustes. [MB-S]
- **Menú Lite:** **«Abrir ajustes»**, mostrar/ocultar panel, selector **«Filtro de pantalla»**, activar/apagar voz, **«Detener todo»**, **«Salir de Adapta PE Lite»**. [ML-S]
- **Panel ambas:** **«Opciones»**, botón de engranaje con nombre accesible **«Abrir ajustes»**, interruptor **«Voz»**, estado, **«Escuché:»**, respuesta y **«Detener todo»**. Base añade **«Cursor»** y preview. Al elegir aparecen **«Elige en …»**, opciones numeradas, **«Siguiente»**, **«Cancelar»**. [MB-U, ML-F]
- **«Opciones» ambas:** **«Mover mascota y panel juntos»**, **«Elegir mascota»**, **«Filtro de pantalla»**, cuatro esquinas y **«Monitor N · nombre»** si hay varios. Base añade **«Mostrar cámara»**. El título permite arrastrar; enfocado admite flechas. Posición/monitor se recuerdan. [MB-U, ML-F, MB-S, ML-S]
- **Atajo macOS:** **Comando+Mayúsculas+punto** se declara en el comando de menú **«Detener todos los módulos»**. **Comando+Q** se asocia a salir. **NO VERIFICADO como atajo global cuando otra app tiene el foco**: en estas fuentes se implementa `keyboardShortcut`, no se encontró registro global de teclado. Para la toma, usar botón o barra de menú, o probar antes su alcance real. [MB-S, ML-S]

## 5. Voz: activación, idiomas y catálogo para el tutorial

### Cómo empezar y cómo interpretar lo que se muestra

- **Llamada predeterminada:** «Computadora»; también «Computadoras» y «Computador». Se puede unir llamada+orden: **«Computadora, abre Bloc de notas»** en Windows, **«Computadora, abre Safari»** en Mac. O decir sólo la llamada, esperar señal y ordenar dentro de **ocho segundos**. Nombre personal en el campo correspondiente; sus coincidencias no heredan automáticamente esos tres alias. Windows valida de 1 a 40 caracteres. [WB-C, WB-U, MB-R, ML-R]
- **Idioma de escritorio actual: español.** Windows enumera SAPI español o usa Vosk español incluido; Automático prefiere SAPI y permite respaldo local. macOS intenta Speech local `es-PE`, `es-ES`, `es-MX`; Apple por red requiere opción voluntaria. **NO VERIFICADO** soporte acústico de inglés/portugués/alemán/francés/italiano en estas apps. No usar la lista de seis idiomas de la extensión. [WB-V, WB-R, WL-R, MB-V, ML-R]
- **Cortesía:** «Computadora, por favor abre Safari», «Computadora, quiero que abras Safari» y equivalentes con Bloc de notas. Se normalizan formas de verbo y cortesía; después de «escribe», las palabras pertenecen al dictado. No es una conversación libre ni dictado continuo sin órdenes. [WB-C, WL-C, MB-C, ML-C, MB-R]
- **Enfocar primero el destino externo.** «Orden detectada» en Windows muestra intención; sólo la respuesta siguiente indica ejecución/error. macOS muestra «Escuché:» y respuesta. Los controles deben existir/publicar accesibilidad; contraseñas se excluyen de lectura y dictado. [WB-U, WB-A, WL-A, MB-U, ML-U, MB-R, ML-R]
- **Durante lectura:** para interrumpir, **«Computadora, silencio»**, **«Computadora, detener todo»**. La protección frente al propio TTS limita otras órdenes durante salida. Si se apaga reconocimiento, volver a encenderlo desde interfaz. [WB-C, WB-R, MB-R, ML-R]

### Órdenes compartidas: decir después de «Computadora»

- **Abrir aplicaciones:** Windows **«abre Bloc de notas»**, **«abre Chrome»**; macOS **«abre Safari»**, **«abre Zoom»**. La app debe estar instalada. [WB-C, WB-R, WL-R, MB-C, MB-R, ML-R]
- **Abrir en otro monitor:** **«abre Visual Studio Code en el monitor dos»** (Windows); **«abre Safari en el segundo monitor»** (macOS). Requiere pantalla conectada y ventana controlable. [WB-A, WB-R, WL-R, MB-R, ML-R]
- **Abrir web:** **«abre YouTube»**, **«abre la página de Google»**, **«abre Google en nueva pestaña»**. **Buscar:** **«busca movilidad en Wikipedia»**, **«busca recetas en nueva pestaña»**. Una URL HTTP/HTTPS puede ser destino; no se ejecuta texto arbitrario como shell. [WB-C, WB-A, WL-C, MB-C, MB-R, ML-R]
- **Catálogo web:** Google, YouTube, Mercado Libre, Amazon, Wikipedia, Facebook, Instagram, X/Twitter, Reddit, Netflix, Twitch, GitHub, ChatGPT, Claude, Gemini, Canvas, Gmail, Outlook, WhatsApp, Telegram, Drive, Documentos de Google, Mapas, LinkedIn, TikTok, Spotify, Bing, DuckDuckGo. Abrir una web de IA no integra su modelo en la app. [WB-C, WL-C, ML-R]
- **Ventanas/pestañas:** **«nueva pestaña»**, **«nueva ventana»**, **«abre Chrome en nueva ventana»**, **«cierra pestaña»**, **«cierra ventana»**, **«siguiente pestaña»**, **«anterior pestaña»**. Cerrar una ventana/app puede producir el diálogo de guardar de su destino. [WB-C, WL-C, MB-C, ML-C, WB-R, MB-R]
- **Navegación:** **«atrás»**, **«adelante»**, **«recarga»**, **«barra de direcciones»**, **«buscar en la página»**, **«aumenta zoom»**, **«reduce zoom»**, **«zoom normal»**, **«sube»**, **«baja»**, **«inicio»**, **«final»**. Destino y comportamiento dependen de app/navegador. [WB-C, WL-C, MB-C, ML-C]
- **Escribir:** **«escribe Hola, José»**, **«escribe Hola, José en el campo Nombre»**; **«enfoca Nombre»**, **«muestra campos»**, **«borra el campo»**, **«selecciona el texto Buenos días»**. El parser conserva el contenido recibido, no garantiza que el reconocedor genere signos/mayúsculas; Vosk normalmente no los genera automáticamente. [WB-C, WL-C, MB-C, ML-C, WB-R, ML-R]
- **Seleccionar/activar:** **«selecciona Contacto»**, **«pulsa lo seleccionado»**, **«dale clic»**, **«pulsa Aceptar»**, **«clic en Contacto»**. «Selecciona» resalta/retiene un control; no confundir con su activación posterior. [WB-C, WB-R, WL-R, MB-C, MB-R, ML-R]
- **Menús:** **«muestra comandos»**, **«ejecuta la acción Guardar»**. El nombre debe estar publicado por la app; no permite inventar acciones internas. [WB-C, WB-R, WL-R, MB-C, ML-R]
- **Ambigüedades:** **«elige dos»**, **«la segunda»**, número o nombre único; **«siguiente»**, **«cancelar»**. Hasta seis opciones por página, caducidad de 45 segundos y cancelación al cambiar destino. Windows también **«anterior»**; no prometer ese literal como navegación común macOS. [WB-A, WL-A, WB-R, MB-R, ML-R]
- **Ratón por voz:** **«clic»**, **«clic derecho»**, **«dar anticlick»**. Lite también hace clic por voz, aunque no mueva el puntero con cámara. Windows añade **«doble clic»** y **«abre el menú contextual»**. **NO VERIFICADO** «doble clic» en macOS. [WB-C, WL-C, MB-C, ML-C, WB-A, WL-A, ML-R]
- **Lectura manual:** **«lee la pantalla»**, **«lee Guardar»** / **«lee el botón Contacto»**, **«silencio»**. Lee accesibilidad de ventana/elemento, sin OCR de imágenes y sin garantizar leer íntegro un documento largo. [WB-R, WL-R, MB-R, ML-R]
- **Edición:** **«copiar»**, **«cortar»**, **«pegar»**, **«selecciona todo»**, **«deshacer»**, **«rehacer»**, **«guardar»**, **«guardar como»**, **«imprimir»**, **«enter»**, **«escape»**, **«campo siguiente»**, **«campo anterior»**. Se adaptan a teclas/menús de cada sistema y permisos del destino. [WB-C, WL-C, MB-C, ML-C]
- **Atajos dictados:** Windows **«presiona control shift N»**; macOS **«presiona comando shift N»**, **«atajo control option arriba»**. No cambiar «control» por «comando» indiscriminadamente entre plataformas. [WB-C, WL-C, MB-C, ML-C]
- **Sistema/ventanas:** ambas **«mostrar escritorio»**, **«pantalla completa»**, **«minimizar ventana»**, **«cambiar aplicación»**. Windows **«vista de tareas»**, **«buscar en Windows»**, **«ventana a la izquierda»**, **«ventana a la derecha»**, **«maximiza la ventana»**, **«abre el explorador»**. macOS **«Spotlight»**, **«Mission Control»**, **«ocultar aplicación»**. No se acredita aquí apagado/reinicio del sistema por voz. [WB-C, WL-C, MB-C, ML-C]
- **Multimedia:** **«reproduce»**, **«pausa»** dependen de la app/control accesible. No prometer control universal de cualquier reproductor. [WB-C, WB-R, MB-C, MB-R, ML-C, ML-R]
- **Filtros/mascota/panel:** **«filtro deuteranopía»**, **«quitar filtro»**, **«mascota Cuchu»**, **«saluda mascota»**, **«duerme mascota»**, **«despierta mascota»**, **«oculta mascota»**, **«une mascota al panel»**, **«separa mascota del panel»**, **«panel esquina superior izquierda»**, **«mostrar ajustes»**, **«modo flotante»**, **«detener todo»**. [WB-C, WL-C, WB-R, MB-R, ML-R, ML-A]

### Órdenes específicas de Windows

- **«Muestra apps abiertas»**, **«cambia a Discord»**, **«trae Chrome al frente»**, **«cierra Chrome»**, **«cerrar la aplicación Word»**, **«cierra Bloc de notas»**. Abrir/enfocar/cerrar comprueba ventanas/procesos; parecidos o varias ventanas pueden exigir elegir. Cierre normal por `WM_CLOSE`, sin matar procesos ni saltar guardado. No atribuir este catálogo de cambio/listado literalmente a macOS. [WB-C, WB-A, WL-C, WL-A, WB-R]

### Órdenes específicas de macOS

- **«Cierra Safari»** solicita terminar esa aplicación; cada app decide tratamiento de documentos. Navegación dirigida usa AppleScript en Safari/Chrome/Brave/Edge; otros navegadores pueden abrir URLs con el predeterminado, sin igual garantía de destino de pestaña/ventana. [MB-R, ML-R]
- **«Desactiva voz»** o **«apaga el micrófono»** apaga escucha; reactivar desde ajustes/panel. Para el guion común usar botón o «detener todo»; **NO VERIFICADO** que «apaga la voz» sea equivalente en todos los parsers de Mac. [ML-A, MB-R, ML-R]

### Sólo Base: cursor, lectura automática e IA externa

- **Ambas Base:** **«activar cursor»**, **«desactivar cursor»**, **«control cabeza»**, **«control manos»**, **«control brazo izquierdo»**, **«control zona libre»**, **«calibrar cursor»**, **«activar temblor»**, **«desactivar temblor»**, **«movimientos pequeños»**, **«movimientos normales»**, **«cursor más lento»**, **«cursor más rápido»**, **«pausar cursor»**, **«reanudar cursor»**, **«siguiente clic derecho»**, **«cancelar clic»**, **«activar TalkBack»**, **«desactivar TalkBack»**. [WB-C, WB-U, MB-C, MB-K, MB-R]
- **Sólo Windows Base acreditado:** **«modo preciso»**, **«modo rápido»**, **«activar clic automático»**, **«desactivar dwell»**. No añadirlos a la lista macOS sin verificar ejecutor. [WB-C, WB-U, MB-C]
- **IA externa Base en ambos:** **«pregunta a la IA …»**, **«analiza pantalla con IA»**, únicamente después de configurar proveedor y consentimientos. Es una opción separada que puede costar dinero y enviar datos; no forma parte de la primera orden ni es necesaria para voz/cursor. Lite informa que no incluye IA. [WB-R, WB-U, MB-R, MB-U, WL-C, ML-A]

## 6. Cámara y control corporal: sólo Base

- **Windows, empezar:** Control → Cámara y consumo → Cámara (índice); Adaptar a mi movimiento → Control con; elegir **Cabeza**, **Manos** o **Zona libre**, y activar cursor. **macOS:** Control → Dispositivos y preferencias → Cámara; Adaptar a mi movimiento → Control con; elegir **Cabeza / torso**, **Brazos, manos o puños** o **Zona con textura**, y activar cursor. [WB-U, WB-R, MB-U, MB-R]
- **Cabeza/torso:** postura cómoda y estable mientras aprende reposo; documentación exige al menos cuatro muestras distintas durante 900 ms. Pulsar **Calibrar** al cambiar postura. No decir que manos/zona requieren ese mismo aprendizaje. [WB-R, MB-R]
- **Manos/brazos/puños:** primera posición fiable como reposo de joystick; desplazar ligeramente y sostener dirección mantiene movimiento; volver al inicio detiene. No requiere señalar con todos los dedos ni una mano anatómicamente completa para todos los modos, pero no está acreditado para todas las personas/condiciones motoras. [WB-R, MB-R]
- **Zona/textura:** sigue un detalle visual en movimiento sin clasificar anatomía. Requiere contraste; superficie uniforme, textura repetida u oclusión pueden impedirlo. Tras pérdida prolongada necesita adquirir otro detalle. No presentar como reconocimiento universal de muñones. [WB-R, MB-R]
- **Preview/HUD:** zona segura verde, anillo de atracción naranja, punto blanco y progreso de permanencia; en ajustes y PiP. Preview independiente de inferencia; ocultarla en panel no apaga seguimiento. Tasas solicitadas no son FPS medidos. [WB-R, WB-U, MB-U, MB-R]
- **Dwell:** habilitar **«Clic por permanencia · dwell»** (Windows) o **«Clic al mantener la postura»** (Mac); salir del anillo de atracción, volver a reposo sobre el mismo destino y esperar progreso completo. Un clic por entrada; repetir salida/regreso para otro. Predeterminado 1 s; rango Windows **0,4–5 s**, Mac **0,4–3 s**. **«Siguiente clic derecho»** prepara el siguiente; clic por voz sigue siendo alternativa. [WB-R, WB-U, MB-R, MB-U, MB-K]
- **Ajustar movimiento:** Windows velocidad 0,1–3, amplitud 0,1–2; Perfil equilibrado 1/0,65, Perfil ágil 1,5/0,65. Mac velocidad 0,3–2 y opción de movimientos pequeños. Ambos ofrecen reducir temblores y pausa. [WB-U, MB-U]
- **Descanso/pérdida:** mover ratón físico pausa cámara dos segundos; pérdida, pausa, calibración y cambios de fuente cancelan clic pendiente. No hacer una demostración de seguridad basada sólo en simulaciones. [WB-R, MB-R]
- **Pinza, boca, pestañeo, sonrisa y scroll por gesto:** **NO VERIFICADO** como métodos de clic/scroll de estas apps de escritorio. Los flujos revisados documentan permanencia y voz; `GestureState` sirve al movimiento corporal, su nombre no prueba clic por pinza/boca. No copiar la demostración de gestos de la extensión. [WB-R, MB-R, MB-K; `/Users/thealejo/Desktop/Adapta-PE-Win/src/AdaptaPE/Vision/Camera.cs`]
- **Lite de ambos sistemas:** carece de captura y cursor con cámara, calibración corporal y dwell. Conserva clic por voz sobre control accesible o posición existente del puntero. [WL-C, WL-U, ML-C, ML-R]

## 7. Otras funciones y privacidad

- **Lectura manual en las cuatro:** accesibilidad local de ventana/elementos, sin OCR; no reemplaza íntegramente NVDA/Narrador/VoiceOver ni garantiza leer juegos, imágenes o todo un documento. **TalkBack automático sólo Base:** señala un control y espera unos 300 ms; funciona también con ratón físico. [WB-R, WL-R, MB-R, ML-R]
- **Siete filtros en las cuatro:** simulaciones de color, no promesa de corrección médica. Windows moderno aplica matriz global con Magnification API; macOS captura/procesa localmente por pantalla y excluye su propia interfaz. Por eso una toma de la ventana de Mac no demuestra por sí sola el filtro: mostrar otra ventana. [WB-R, WL-R, MB-R, ML-R]
- **Mascotas en las cuatro:** Tinku/gallito, Cuchu/cuy, Yati/llama; **Sin mascota** inicial. Sólo se carga el atlas elegido. Dibujo deja pasar clics; arrastrar nombre, **Mover con teclas** y flechas; Escape termina ese movimiento. **Otro monitor** cambia pantalla; se guarda posición relativa. [WB-R, WL-R, MB-R, ML-R]
- **Actividad mascota:** Saludar, Dormir, Despertar. Descansa automáticamente tras 90 s sin interacción y se despierta con una acción; Dormir manual requiere Despertar. Movimiento reducido/reposo detienen animaciones. **Mover mascota y panel juntos** la coloca arriba del panel; separarla recupera posición propia. [WB-U, WL-U, MB-M, ML-R]
- **Inicio voluntario y sesión:** casillas de inicio con sistema; primer arranque apagado. Sesiones posteriores recuerdan módulos/ajustes; macOS restaura sólo con permisos previamente concedidos. **Detener todo** cancela asistencia y recuerda módulos apagados; **Salir** termina app conservando preferencias. Detener no equivale necesariamente a ocultar mascota. [WB-R, WL-L, MB-R, ML-R, MB-S, ML-S]
- **Datos:** las apps no implementan historial persistente de audio/transcripciones; feedback visible temporal. Filtros/cámara locales no guardan ni envían imágenes por su funcionamiento normal. Búsquedas sí entregan consulta al servicio web; Apple por red o IA externa requieren su opción correspondiente. No resumir como «todo funciona siempre sin internet». [WB-R, WL-R, MB-R, ML-R]
- **IA opcional Base:** proveedor/modelo/API del usuario; Windows protege clave con DPAPI y macOS con Llavero. Envío de pantalla exige consentimiento de sesión y una orden explícita, puede incluir datos visibles privados. «Lee la pantalla» es lectura accesible local, no análisis de imagen en IA. [WB-R, WB-U, MB-R, MB-U]

## 8. Solución de problemas para personas usuarias

- **No me oye, Windows:** comprobar acceso al micrófono para apps de escritorio, dispositivo y señal; probar **Local incluido · español** si falta SAPI. Tener una voz de lectura española no significa tener reconocedor español. No modificar ajustes globales de seguridad. [WB-R, WL-R, WB-U, WL-U]
- **No me oye, Mac:** conceder Micrófono y Reconocimiento de voz; actualizar dispositivos y elegir entrada. Si dice **«Español local no disponible»**, comprobar recursos de dictado españoles o autorizar voluntariamente Apple por red. Revisar palabra personal y ventana de ocho segundos. [MB-V, MB-R, ML-R]
- **Entiende pero no escribe/pulsa:** enfocar la app correcta; comprobar que controle elementos accesibles, evitar contraseñas. Mac: Accesibilidad para esa copia. Windows: las apps elevadas/UAC pueden rechazar control de una app normal. No atribuir el fallo automáticamente al micrófono. [WB-A, WL-A, WB-R, MB-R, ML-R]
- **No hace clic en Windows:** colocar cursor sobre la ventana de destino; el ejecutor rechaza clic en una ventana diferente. En Lite el puntero se coloca con ratón/trackpad u otra ayuda: no hay cámara. [WB-A, WL-A, WL-R]
- **Elegir se cancela:** repetir listado en destino correcto; 45 s de caducidad y cambio de app invalidan la elección. No seleccionar una opción antigua tras cambiar de ventana. [WB-A, WL-A, MB-R, ML-R]
- **No controla pestañas en Mac:** autorizar Automatización para el navegador pedido; comprobar Safari, Chrome, Brave o Edge como destino. Otras apps no garantizan el mismo manejo. [MB-R, ML-R]
- **Cámara/cursor quieto en Base:** revisar permiso, selector, estado pausado y detección; actualizar dispositivos tras reconectar; recalibrar cabeza. En manos/textura comenzar con un movimiento leve y detalle visible; ajustar amplitud/velocidad. No ofrecer este diagnóstico a Lite como si tuviera cámara. [WB-R, MB-R]
- **Dwell no repite clic:** un clic por entrada es intencional; salir del anillo y volver a zona segura. Revisar casilla, tiempo de espera y estabilidad de detección. Pérdida/pausa cancelan progreso. [WB-R, MB-R]
- **Filtro no aparece en Mac:** revisar Grabación de pantalla, reactivar y esperar estado de imagen procesada. Ajustes de Adapta PE quedan fuera del filtro; mirar otra ventana. Si falla contenido protegido/exclusivo, probar modo ventana o pantalla completa de escritorio. [MB-R, ML-R]
- **Filtro o voz duplicados:** activar en una sola edición a la vez. Windows comparte exclusión de filtros Base/Lite; no asumir que combinar ambos amplía el efecto. [WL-L, WL-R, ML-R]
- **Mascota quieta:** revisar movimiento reducido, reposo o sueño manual; **Despertar** resuelve el sueño manual. [WB-R, ML-R]
- **Cierro y sigue escuchando:** cerrar Ajustes conserva proceso. **Detener todo** para asistencia; **Salir** en bandeja/barra de menú para finalizar. Windows dispone de Ctrl+Shift+S si se registró; Mac, botón/menú de parada siempre visible según superficie. [WB-U, WL-U, MB-S, ML-S]
- **App bloqueada al instalar:** verificar archivo y procedencia; usar únicamente excepción específica ofrecida por sistema para app confiable. Malware/dañado/política no se resuelven con la misma receta. No recomendar desactivar Gatekeeper, SmartScreen, antivirus o UAC. [WB-R, WL-R, MB-R, ML-R]
- **Rendimiento/juegos/varios monitores:** no hay mediciones universales verificadas. Reducir módulos innecesarios y, en Windows Base, detecciones por segundo. Contenido protegido, antitrampas, DPI mixto y permisos pueden limitar acciones; no prometer compatibilidad con todos los juegos ni eficacia universal del seguimiento. [WB-R, WB-T, WL-T, MB-R, ML-R]

## 9. Pantallas recomendadas y material visual existente

### Propuestas de tomas basadas en pantallas existentes

- **Instalación Windows:** EXE de cada edición, bienvenida, licencia, dos accesos opcionales y primera ventana apagada. Luego bandeja y regreso a Ajustes. Fuentes de los controles: [WB-I, WL-I, WB-U, WL-U]. **NO VERIFICADO** metraje existente ni ejecución del asistente en Windows durante esta tarea.
- **Instalación Mac:** DMG elegido, copia a Aplicaciones y primera apertura. Privacidad y seguridad con categorías relevantes; distinguir Abrir igualmente de Accesibilidad. Fuentes del flujo: [MB-R, ML-R, ENT-L]. **NO VERIFICADO** aviso concreto en equipo limpio.
- **Primera orden en cada sistema:** voz apagada → micrófono/entrada → voz activa → «Computadora, abre Bloc de notas/Safari» → app externa abierta y respuesta real. Mantener PiP para ver lo escuchado. Controles/comandos: [WB-U, WL-U, MB-U, ML-U, WB-R, MB-R]. La toma debe grabar resultado real; no basta mostrar «Orden detectada».
- **Dictado y elección:** documento/campo no protegido, «escribe Hola, José», «muestra campos», lista numerada y «elige dos». Enseñar cancelación y un error legible. Fuentes: [WB-R, WL-R, MB-R, ML-R].
- **Diferencia Base/Lite:** mostrar tabs de ambas; sólo Base enseña cámara, preview, modos y permanencia. Una toma por modo, reposo y parada; nunca simular la cámara sobre una ventana Lite. Fuentes: [WB-U, WL-U, MB-U, ML-U].
- **Lectura/filtros:** lectura manual común; TalkBack sólo Base; filtro y retirada sobre una ventana externa de colores. En Mac, mostrar permiso de pantalla y estado antes del efecto. Fuentes: [WB-U, MB-U, ML-U, WB-R, ML-R].
- **Mascota y panel:** selector Cuchu, Saludar, arrastrar nombre, unir/separar y Detener todo; terminar mostrando Salir. Fuentes: [WB-U, WL-U, MB-M, ML-F, MB-S, ML-S].
- **IA externa:** si el tutorial busca uso básico, basta identificar la sección opcional Base; no mostrar claves ni activar envíos para aparentar una función local. La configuración existe, su uso real no se comprobó aquí. [WB-U, MB-U]

### Capturas verificadas visualmente

- `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/docs/lite/voz.png`: ventana real histórica de macOS Lite, 620×700; muestra Asistente de voz apagado, Permitir control del escritorio y Detener todo. **Difiere del código actual:** botón superior «Panel flotante» en vez de «Usar panel», pestaña «Daltonismo» en vez de «Filtros de color», sin sección Mascota. No usar para enseñar etiquetas actuales sin advertir fecha. [ML-D; imagen abierta y examinada]
- `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/docs/lite/daltonismo.png`: captura histórica 620×700, filtro Sin filtro, estado Sin captura de pantalla, referencia de colores y permiso de Grabación de pantalla. Comparte las diferencias anteriores; no demuestra filtro activo ni permiso concedido. [ML-D; imagen abierta y examinada]
- **NO VERIFICADO** un juego de capturas actuales de Windows Base/Lite o macOS Base en los directorios fuente/docs inspeccionados. Se encontraron recursos de marca, no se deben presentar como screenshots de funciones. La búsqueda de imágenes excluyó bin/obj/build/artifacts y atlas de mascotas; no es un inventario de todo el disco.

### Imágenes y recursos de marca existentes en disco

- Windows Base: `/Users/thealejo/Desktop/Adapta-PE-Win/assets/brand/logo.png`, `.../assets/brand/background.png`, `.../assets/installer/header.bmp`, `.../assets/installer/welcome.bmp`. Son logo/fondo y arte del instalador, no pruebas de funcionamiento. [rutas enumeradas en disco; WB-I]
- Windows Lite: `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/assets/brand/logo.png`, `.../assets/brand/background.png`, `.../assets/installer/header.bmp`, `.../assets/installer/welcome.bmp`. [rutas enumeradas en disco; WL-I]
- macOS Base: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/AdaptaPE.png`; fondo `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE/Assets.xcassets/FondoApp.imageset/FondoApp.png`; iconos en `Adapta-PE/Assets.xcassets/AppIcon.appiconset/`. [rutas enumeradas en disco; MB-U]
- macOS Lite: `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/Adapta-PE-Lite/Assets.xcassets/LiteLogo.imageset/AdaptaPELite.png`; fondo `.../Assets.xcassets/FondoApp.imageset/FondoApp.png`; iconos `.../Assets.xcassets/AppIcon.appiconset/`. [rutas enumeradas en disco; ML-U]
- Atlas/animaciones locales: `/Users/thealejo/Desktop/Adapta-PE-Win/assets/mascotas/`, `/Users/thealejo/Desktop/Adapta-PE-Lite-Win/assets/mascotas/`, `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE/Adapta-PE/Mascotas/`, `/Users/thealejo/Desktop/TheAlejoCloud/Adapta-PE-Lite/Adapta-PE-Lite/Mascotas/`. Sus README y recursos son material de personajes, no capturas de sensores. [WB-R, WL-R, MB-R, ML-R]

### Límites que debe conservar el guion

- Windows: documentación registra compilación cruzada y verificaciones portables, pero no WPF, instalación/desinstalación o sensores reales de esta entrega. Mac: hay verificaciones históricas parciales y paquetes universales documentados, sin validación universal de hardware/Intel/monitores/acústica. Esta investigación no amplía esas pruebas. [WB-T, WL-T, MB-R, ML-R, ENT-V]
- El índice de código ayudó a localizar símbolos; su cobertura marcó varios archivos modificados y un hueco de parseo en `Adapta-PE/Adapta_PEApp.swift:112`. Se leyó esa línea y se verificaron directamente las fuentes usadas; el índice no demuestra ejecución ni exhaustividad.
- Antes de grabar, contrastar etiquetas con el binario realmente elegido: el código fuente puede haber cambiado respecto al paquete del 17/10. **NO VERIFICADO** igualdad completa entre las cuatro apps empaquetadas y los cuatro árboles actuales; [ENT-V] sólo registra comprobaciones del momento de empaquetado.
