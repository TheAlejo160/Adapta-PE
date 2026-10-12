# Mouse cinético de AdaptaPE: requisitos, mejoras y resultado esperado

**Versión de referencia:** AdaptaPE Base 13.0.

**Actualizado:** 14 de octubre de 2026.

**Ámbito:** cursor con cámara de la versión Base y sus integraciones con voz, TalkBack y mascotas.

Este documento reúne las solicitudes del usuario, las decisiones posteriores que las precisaron y el comportamiento que debe cumplir el mouse cinético. También explica cómo lo implementa el código actual y qué resultados todavía necesitan pruebas con la cámara y las personas usuarias. Los requisitos son criterios de evaluación; no constituyen una garantía de precisión universal.

## 1. Objetivo

Permitir navegar desde una postura cómoda con cabeza, torso, brazos, manos, puños o una zona visible de una extremidad, utilizando movimientos pequeños. El control debe reducir la necesidad de desplazar todo el brazo y evitar recalibraciones, interrupciones y cambios de dirección involuntarios.

La mejora solicitada se refiere principalmente a **detectar e interpretar mejor la intención**, no a aumentar la velocidad del cursor. Un movimiento pequeño debe producir una dirección coherente; una señal con los dedos debe reconocerse aunque la mano también se desplace. El cursor debe conservar su regulación de velocidad, el suavizado y las condiciones de seguridad del clic.

El mouse cinético crea un **puntero virtual dentro de las webs**. No controla el puntero del sistema operativo, la barra de direcciones ni los controles internos del navegador.

## 2. Solicitudes y decisiones finales

Las solicitudes se ajustaron durante las pruebas. La decisión más reciente prevalece cuando cambia una propuesta anterior.

| Solicitud o problema observado | Decisión final y resultado esperado |
| --- | --- |
| La detección inicial permitía usar la cabeza, pero fallaba con extremidades. | Incorporar control de brazos/manos/puños y un modo de textura para muñón/mano parcial, además de cabeza/torso. |
| Elegir detección automática, cabeza o extremidades sin que compitan. | La interfaz final ofrece tres modos separados. El antiguo Automático se convierte a brazos/manos; ya no aparece como una cuarta opción. |
| Demasiadas opciones de derecha, izquierda y zonas. | Eliminar la selección de lado. El usuario elige la parte o el tipo de seguimiento, y el motor conserva una fuente estable. |
| La mano debía estar adelantada o centrada para preparar la postura. | Extremidades listas desde la primera posición fiable, sin calibración manual ni espera de postura. Sólo cabeza/torso calibra. |
| Abrir o cerrar la mano dejaba de funcionar. | La muñeca sigue siendo la referencia con palma abierta o puño. Una muñeca corporal próxima puede respaldar pérdidas del modelo de mano. |
| Mover todo el brazo resulta cansado. | Joystick relativo con desplazamientos pequeños, señal con dedos/palma e inclinación como respaldo. |
| Los movimientos verticales, especialmente hacia abajo, eran lentos o incoherentes. | Interpretar dedos hacia abajo sin exigir que sus puntas se alejen de la muñeca; normalizar los dos ejes y calcular avance por tiempo real. |
| Un gesto se interpretaba como simple movimiento de mano. | Una señal direccional confirmada tiene prioridad, incluso mientras se desplaza la muñeca. Al soltarla vuelve el joystick. |
| Muñones y manos parciales presentan formas y longitudes distintas. | Ofrecer seguimiento de textura sin exigir una mano completa, dedos, un lado ni una anatomía determinada. |
| Se necesitaba recargar la página para ver opciones o módulos. | Aplicar preferencias en vivo, conectar primero la pestaña actual y recuperar la interfaz sin recargar la web. |
| Era difícil seleccionar un control con movimientos pequeños. | Atracción suave a controles próximos, clic por permanencia y clic por voz. |
| Se debía conservar una interfaz fácil de entender. | Tres opciones con nombres claros, ayuda desplegable y estados que distinguen señal y joystick. |
| Esperar un segundo quieto para cada clic resulta lento. | Clic por pinza pulgar-índice en brazos/manos (mantenerla 0,7 s: clic derecho) y clic por boca abierta en cabeza/torso. La permanencia sigue disponible. |
| En equipos lentos la cámara saturaba la CPU. | Carga adaptativa: el documento de cámara mide la inferencia, reduce el detalle y cede descansos; en equipos rápidos recupera el máximo. |

## 3. Modos disponibles

| Opción del panel | Identificador | Qué sigue | Calibración de postura |
| --- | --- | --- | --- |
| **Cabeza / torso** | `cabeza` | Rostro; puntos corporales visibles como respaldo, incluidos cabeza corporal o torso. | Sí. Es el modo predeterminado. |
| **Brazos, manos o puños** | `manos` | Mano, muñeca o codo visible. Permite alternar entre señal direccional y joystick. | No. |
| **Muñón / mano parcial** | `zona` | Una textura local visible que se adquiere mediante movimiento. | No. |

En brazos/manos, inclinar el cuerpo o mostrar el rostro no debe convertir el torso o la cabeza en la fuente del cursor. En cabeza/torso, conservar un respaldo corporal ya seguido evita alternancias innecesarias al reaparecer el rostro.

Las preferencias antiguas se migran sin perder velocidad, amplitud o ajuste de temblor: torso pasa a cabeza/torso; Automático y brazos separados pasan a brazos/manos; las zonas laterales pasan al único modo de textura. Los comandos anteriores mantienen compatibilidad como alias.

**Resultado esperado:** cambiar el selector con la cámara activa cambia el modelo de detección, sin recargar la página, volver a pedir permiso ni abrir otra cámara. La transición limpia el control anterior para que un cambio de fuente no parezca un movimiento deliberado.

## 4. Centro seguro y reposo: dos conceptos distintos

### Centro seguro

Es el centro matemático de la vista de control. En extremidades permanece fijo y sirve para representar la zona segura, la atracción y la dirección del control. La mano puede aparecer en cualquier posición útil de la cámara; no tiene que coincidir con ese centro.

El centro de la vista **no es una orden para trasladar el puntero al centro de la pantalla**. La posición del puntero virtual y el lugar físico donde aparece la extremidad son datos separados.

### Reposo del joystick

Es la primera posición fiable de la extremidad durante el seguimiento actual. Se toma inmediatamente y sólo vive en memoria. Los desplazamientos posteriores se comparan con ella.

Por ejemplo, si una mano aparece abajo y a un lado de la cámara, ese lugar puede ser su reposo. Subirla ligeramente dirige arriba; volver a su lugar de reposo detiene el desplazamiento. No necesita ponerse frente al rostro ni recorrer la cámara de borde a borde.

Pausar, cambiar de fuente, cambiar de página o perder el seguimiento durante demasiado tiempo puede renovar esta referencia instantánea. Eso no debe iniciar el aprendizaje de postura ni los avisos de calibración de cabeza/torso. El centro seguro sigue fijo.

### Calibración de cabeza/torso

Cabeza/torso necesita aprender una postura estable a partir de varias inferencias reales. Durante esa preparación no habilita clic. Las órdenes de recalibración, reanudación o ajuste de amplitud pueden repetir ese aprendizaje en este modo.

**Resultado esperado:** manos, puños y textura no esperan una calibración de aproximadamente un segundo. En estos modos, «recalibrar» cancela una fijación pendiente y confirma el centro fijo; no obliga a adoptar otra postura.

## 5. Joystick invisible para mano, puño, brazo o textura

El joystick interpreta la separación respecto al reposo, no sólo la velocidad instantánea de la extremidad.

| Acción | Respuesta esperada |
| --- | --- |
| Desplazar ligeramente la extremidad a un lado. | El cursor empieza a avanzar en esa dirección. |
| Mantenerla desplazada. | El cursor continúa avanzando, aunque la extremidad deje de trasladarse. |
| Volver al reposo. | El cursor entra en la zona segura y deja de avanzar. |
| Subir o bajar con un pequeño temblor lateral. | Predomina el eje vertical; una variación perpendicular pequeña no debe provocar una diagonal accidental. |
| Realizar una diagonal deliberada. | Se conservan ambos ejes. |
| Mover un puño sin señalar. | Funciona el joystick; no se exige extender dedos. |

La respuesta usa la misma escala proporcional para ambos ejes. Un margen distinto para entrar y salir del movimiento evita alternar constantemente entre reposo y desplazamiento. El filtro de temblor amplía la zona segura; repetir su activación no debe apagarlo.

La opción de movimientos pequeños reduce la amplitud necesaria. El ajuste de velocidad regula el avance del cursor por separado. No debe compensarse una mala detección haciendo que el puntero corra más.

**Resultado esperado:** los cuatro sentidos se controlan desde un recorrido corto y cómodo. La cámara puede entregar menos inferencias sin reducir artificialmente a la mitad el avance de una dirección sostenida. La referencia de reposo no se desplaza continuamente mientras se está dirigiendo el cursor.

## 6. Gestos direccionales con dedos y palma

La señal direccional usa los dedos extendidos que el modelo pueda proporcionar: índice, medio, anular y meñique. Puede combinar uno, dos, tres o cuatro cuando apuntan en una dirección compatible. Esto incluye la palma entera con sus dedos alineados y permite usar palma o dorso visibles.

| Señal visible | Resultado esperado |
| --- | --- |
| Uno o varios dedos apuntan arriba. | Dirigir arriba, sin exigir levantar todo el brazo. |
| Apuntan abajo. | Dirigir abajo, aunque las puntas queden más próximas a la muñeca. |
| Apuntan a un lado. | Dirigir hacia ese lado en la vista espejada del control. |
| Apuntan en diagonal. | Admitir la diagonal cuando sea suficientemente clara. |
| Cambiar el número de dedos, manteniendo una dirección compatible. | Seguir interpretando la intención si los puntos necesarios permanecen fiables. |
| Doblar los dedos o dejar de señalar. | Dejar el control por señal y recuperar el joystick. |
| Dedos extendidos apuntan en direcciones incompatibles. | No combinar señales contradictorias; usar el respaldo disponible. |
| Señalar directamente hacia la cámara, sin dirección suficiente en pantalla. | No inventar izquierda, derecha, arriba o abajo; usar movimiento como respaldo. |

El algoritmo comprueba la extensión de los segmentos del dedo. El criterio anterior, basado únicamente en la distancia de la punta a la muñeca, descartaba gestos hacia abajo. Si faltan articulaciones intermedias válidas, conserva un criterio de respaldo con los puntos disponibles.

Un puño presente desde el inicio conserva el joystick. Cerrar el puño después de mostrar la mano abierta puede activar el reposo para dwell; no ejecuta un clic instantáneo. Cerca del reposo puede usarse la inclinación de palma o puño respecto a su orientación cómoda inicial como respaldo. Esta inclinación no tiene la misma prioridad que una señal confirmada con dedos: si no hay señal y existe desplazamiento deliberado, manda el joystick.

No se implementa un catálogo de lengua de señas, un gesto de desplazamiento de página ni una señal dedicada con el pulgar solo. La pinza pulgar-índice es un gesto de clic, no de dirección (sección 10). Reconocer menos dedos depende de los puntos que realmente entregue el modelo; no permite afirmar que todas las manos parciales sean reconocidas anatómicamente.

### Gestos de clic

| Modo | Gesto | Resultado |
| --- | --- | --- |
| Brazos/manos | Juntar pulgar e índice y soltar antes de 700 ms. | Clic izquierdo al soltar (o el clic derecho preparado antes por voz). |
| Brazos/manos | Mantener la pinza al menos 700 ms. | Un clic derecho mientras se mantiene; soltar después no añade otro clic. |
| Cabeza/torso | Abrir bien la boca unos 0,3 s y cerrarla. | Clic al cerrar. |
| Cabeza/torso | Mantener la boca abierta más de 1,5 s (bostezo). | Gesto cancelado sin clic. |

La pinza se mide como la distancia 3D entre las puntas del pulgar (4) y del índice (8), dividida por la distancia entre muñeca (0) y nudillo medio (9); el eje vertical se escala por 120/160 para igualar los ejes de la vista. Se considera activa con ≤0,25 y suelta con ≥0,40; entre ambos valores conserva su estado. No hay medida si faltan o salen del cuadro los puntos 0, 4, 5, 6, 8 o 9, si la mano mide menos de 0,03 o si la forma corresponde a un puño: una pinza válida exige que el pulgar esté más cerca de la punta del índice que de su falange media (4-8 < 4-6) y que la punta del índice esté más lejos de la muñeca que su nudillo (0-8 > 0-5). Por eso la pinza necesita la muñeca visible dentro del cuadro; con el ancla de palma de borde no hay pinza.

La boca usa la puntuación `jawOpen` (0 a 1) del modelo de rostro local: abierta con ≥0,5 y cerrada con ≤0,2. Siempre está disponible en cabeza/torso; el panel no tiene un interruptor para desactivarla.

Reglas comunes:

- El gesto debe verse suelto antes de contar; una pinza o boca ya cerrada al aparecer no produce clic.
- Confirmación: pinza con al menos 2 inferencias distintas y 80 ms; boca con al menos 3 inferencias distintas y 300 ms. Una imagen repetida no confirma ni suelta.
- Un clic por gesto. Mientras el gesto está activo el cursor permanece quieto para no desviarse del objetivo, y la permanencia en curso se cancela sin desarmarse.
- Los primeros 250 ms fiables no producen clic por gesto.
- Pérdida, pausa, cambio de fuente, salto de tiempo de más de 200 ms y calibración desarman el gesto sin clic. Tras un clic por gesto, la permanencia queda desarmada como en cualquier otro clic.

**Límite actual:** los umbrales de pinza y boca no se han validado todavía con cámaras reales ni con personas usuarias. Hablar con la boca muy abierta puede acercarse al umbral; la histéresis amplia y la confirmación de 300 ms buscan evitarlo, pero no lo garantizan.

## 7. Detección dinámica: señal con prioridad sobre movimiento

Esta es la corrección de la última solicitud. Detectar un gesto en una mano que se mueve debe cambiar el control activo; no basta con que aparezca la palabra «gesto» en la vista.

| Situación | Decisión del motor |
| --- | --- |
| No hay señal direccional confirmada. | Usar joystick; cerca del reposo puede intervenir el respaldo de inclinación o giro. |
| Aparece una señal candidata mientras la mano se desplaza. | Comprobarla con inferencias distintas y una dirección compatible. |
| La candidata se confirma. | Usar exclusivamente la dirección de la señal, aunque la muñeca siga moviéndose. |
| La señal se mantiene y cambia de dirección. | Seguir su dirección actual, sin repetir la confirmación inicial en cada imagen. |
| La persona deja de señalar. | Volver al desplazamiento actual respecto al reposo original del joystick. |
| Se pierde la extremidad. | Detener el cursor y desarmar el clic, incluida una pinza en curso; no seguir dirigiendo con datos perdidos. |

Una candidata necesita inferencias distintas durante **al menos 50 ms** con direcciones compatibles. Una imagen repetida no completa la confirmación. Si la dirección contradice a la candidata antes de confirmarse, se inicia otra comprobación.

Esos 50 ms son el umbral de confirmación, **no una promesa de latencia total**. La captura, la inferencia, los filtros de movimiento y el renderizado también intervienen.

Al cambiar entre señal y joystick se limpia el historial de suavizado y la fijación en curso para no arrastrar la dirección del control anterior. Se conserva el reposo del joystick y el armado procedente de un movimiento previo válido. Alternar controles no realiza una nueva calibración ni produce un clic por sí mismo.

### Ejemplo que debe funcionar

1. La persona desplaza un puño hacia la derecha: el joystick mueve el cursor a la derecha.
2. Manteniendo la mano desplazada, señala arriba.
3. Tras confirmar la señal, el cursor sube. La separación de la muñeca hacia la derecha deja de decidir la dirección.
4. La persona dobla los dedos: el control vuelve al joystick.
5. Si la mano continúa desplazada a la derecha del reposo original, el cursor vuelve a avanzar a la derecha.
6. Al regresar al reposo original, el cursor se detiene.

La vista debe distinguir **Mano · señal** de **Mano · joystick**. «Moviendo» puede aparecer en ambos casos porque describe el estado del cursor, no el método que dirige ese movimiento.

## 8. Muñones y manos parciales

La solicitud incluye extremidades con distintas longitudes, ausencia total de mano, ausencia parcial de dedos y variaciones de forma. El usuario no debe tener que escoger un lado ni cumplir una plantilla anatómica única.

Hay dos posibilidades con alcances diferentes:

- **Brazos/manos:** usar los puntos anatómicos disponibles cuando el modelo los detecte con suficiente fiabilidad. Puede aprovechar dedos para señalar, una muñeca o un codo visible. Si la muñeca sale del cuadro, al menos dos nudillos visibles pueden sostener un ancla de palma; esa ancla permanece al volver la muñeca para evitar alternancias al borde.
- **Muñón/mano parcial:** adquirir y seguir una textura visible mediante un movimiento local breve. No exige dedos, muñeca ni codo. Una superficie con detalle, incluida ropa o vendaje, puede servir para el seguimiento.

En textura, un desplazamiento corto sostenido actúa como joystick. Cerca del reposo, pequeños giros locales aportan dirección horizontal; mantener el giro conserva esa dirección y volver al ángulo inicial la detiene. La búsqueda contempla traslación y pequeñas rotaciones, con compensación de cambios uniformes de luz.

**Límite actual:** el modo de textura no identifica una amputación, no reconoce dedos y no calcula hacia dónde apunta anatómicamente un muñón. El resultado esperado del código actual es controlar por desplazamiento y giro de textura. Detectar una orientación anatómica específica de muñones sería un requisito adicional pendiente de implementación y validación.

Texturas uniformes, patrones repetidos, sombras, oclusiones o un fondo que se mueve pueden impedir o confundir el seguimiento. Las fotografías de referencia explican la diversidad que debe evaluarse; no demuestran que el modelo cubra todas esas condiciones.

## 9. Pérdidas, cambios de fuente y descanso

La pérdida de seguimiento debe detener el cursor y desarmar el clic inmediatamente, también una pinza o boca abierta pendiente. No debe extrapolar la última posición ni continuar una señal indefinidamente.

Con brazos/manos, una recuperación cercana y breve puede conservar el reposo hasta 500 ms. Una recuperación lejana, una pérdida más larga, una pausa o un cambio de fuente limpia la muestra para no convertir el salto en un movimiento. El siguiente reposo se toma sin espera de calibración.

Sin pérdida, un salto de la misma fuente mayor que 0,2 del ancho de la vista (otra mano con la misma etiqueta o un error del modelo) también renueva el reposo del joystick, limpia el suavizado y desarma el clic, en lugar de interpretarse como gesto.

Un cambio entre fuentes necesita al menos tres imágenes y 150 ms. Mientras se confirma una mano nueva, un codo visible que ya tenía el control puede seguir funcionando. Perder una mano sin una muñeca corporal próxima no debe seleccionar un codo incidental.

En textura, una pérdida corta puede conservar la plantilla, aunque se reinicie la muestra del gesto. Tras 1.200 ms sin textura fiable se exige otra adquisición. Conservar la plantilla no autoriza a mover el cursor durante la pérdida.

Pausar impide movimiento y clic. Reanudar mantiene el permiso y el flujo central; sólo cabeza/torso necesita volver a aprender postura. Llegar a un borde de la pantalla no recentra el control de extremidades durante una dirección sostenida.

## 10. Atracción, clic y lectura

### Atracción a controles

Cuando el movimiento es lento o está en reposo, el cursor se aproxima suavemente a controles visibles y habilitados detectados hasta 28 píxeles alrededor. El sondeo es local; no recorre toda la página.

Debe descartar objetivos ocultos, deshabilitados, inertes o tapados por otros elementos. Un movimiento decidido permite abandonar la atracción. Acercarse a un control no habilita ni ejecuta automáticamente un clic.

### Clic por permanencia

1. Salir de la zona de atracción durante al menos 180 ms habilita el armado por movimiento. En manos, un cierre deliberado de puño confirmado también permite armarlo tras la estabilización inicial.
2. Volver a la zona segura sobre un objetivo inicia la permanencia.
3. Permanecer 1.000 ms sobre el mismo objetivo produce un clic.
4. Para otro clic hay que repetir la salida y el regreso, o abrir y cerrar de nuevo el puño para reposo.

Cambiar de objetivo reinicia la permanencia. Pérdida, pausa, calibración y saltos de tiempo desarman el clic. Los primeros 250 ms fiables estabilizan el clic sin bloquear el movimiento.


### Reposo con puño y retorno suave (manos y muñón / mano parcial)

En **Brazos, manos o puños**, muestra primero la mano abierta o dedos extendidos; después cierra el puño y mantenlo. Cuando se confirma el cierre durante al menos 120 ms y tres inferencias distintas, la dirección de control entra automáticamente en el centro seguro. El cursor conserva su posición sobre el objetivo y ejecuta el dwell tras **1.000 ms** sobre ese mismo elemento. El HUD muestra «puño · reposo» y su progreso. No necesitas devolver físicamente el brazo al punto inicial.

Mantener el puño no repite clics. Abrir la mano cancela el dwell pendiente desde la primera apertura y confirma la salida en 80 ms; al salir, el joystick retoma desde esa posición, sin saltar a su referencia anterior. Si la cámara empieza viendo un puño cerrado, el HUD confirma «puño · abre la mano para preparar reposo» y éste conserva el control por movimiento: para usar el reposo por puño hay que mostrar primero la mano abierta. La detección usa la flexión de los cuatro dedos, incluso con puño frontal o de perfil; no exige que las puntas estén más cerca de la muñeca que los nudillos. Se necesitan muñeca y articulaciones válidas para reconocer el cierre; puntos ausentes o una pinza no se interpretan como un puño.

En **ambos modos de extremidades**, el joystick entra con menos desplazamiento y regresa al centro con un margen mayor. Los pequeños movimientos dentro del reposo dejan de generar una dirección residual. Tras confirmar el retorno con el filtro de tres inferencias, el suavizado se centra y el cursor deja de avanzar por inercia. Se conservan velocidad máxima, ganancia, amplitud, movimiento diagonal y calibración exclusiva de cabeza/torso. Muñón / mano parcial sigue usando textura y movimiento; esta mejora no añade reconocimiento anatómico de puños a ese modo.

Pérdida de seguimiento, articulaciones incompletas, pausa y saltos de tiempo cancelan el dwell y exigen una apertura nueva para volver a usar el puño. Cambiar de objetivo reinicia los 1.000 ms. Un clic por pinza no añade otro clic por cerrar después el puño.

### Clic por gesto

En brazos/manos, soltar una pinza pulgar-índice hace clic sobre el objetivo del cursor; mantenerla 700 ms hace clic derecho. En cabeza/torso, abrir la boca y cerrarla hace clic. Las reglas y umbrales están en la sección 6. No requieren el armado por salida de atracción: basta ver el gesto suelto antes de iniciarlo. La textura de muñón/mano parcial no tiene gesto de clic; usa permanencia o voz.

Si antes se dijo «clic derecho» para preparar el siguiente clic, la siguiente pinza corta o boca cerrada aplica ese clic derecho. Después de cualquier clic por gesto el tipo vuelve a izquierdo.

### Clic por voz

Con Voz habilitada, «Computadora, da clic» permite confirmar sin tener que realizar un desplazamiento amplio. Una selección explícita por voz tiene prioridad; si no hay selección, Base puede usar el objetivo del cursor virtual. Una selección eliminada, oculta o deshabilitada no debe sustituirse silenciosamente por otra.

«Clic derecho» envía el evento contextual al sitio. Si el sitio no lo maneja, aparece el menú propio de AdaptaPE. Los eventos sintéticos no abren el menú nativo de Chrome ni aseguran que una web acepte todas las acciones.

### TalkBack y mascotas

El cursor emite eventos de entrada, salida y movimiento al cambiar de objetivo. TalkBack aprovecha esos eventos para leer tras su espera de 300 ms. Recupera su estado al volver a una página visible.

La mascota puede seguir los movimientos del puntero virtual igual que los del ratón físico. Su dibujo y la vista de cámara no deben interceptar los clics destinados a la web.

## 11. Continuidad entre opciones, páginas y ventanas

El resultado esperado es activar una opción y poder usarla en la web actual, entrar en otra pestaña y continuar, sin recargar cada página.

Para ello, la implementación:

- Mantiene una sola cámara en el documento central de la extensión.
- Asigna el cursor y TalkBack a la pestaña activa de la ventana enfocada.
- Conecta primero la pestaña actual; las conexiones o respuestas de pestañas de fondo congeladas no bloquean su activación.
- Descarta lecturas antiguas de preferencias para que no reviertan una opción más reciente.
- Reinserta controladores ausentes o invalidados y recupera nodos retirados por la web.
- Atiende cambios de URL dentro de una web sin exigir una recarga completa.
- Aplica cambios de modo inmediatamente y reintenta solicitudes rechazadas durante una transición.

La cámara no se vuelve a autorizar por cada sitio ni se cierra únicamente por abrir el panel o las herramientas de desarrollo. Apagar el cursor libera su captura; si Voz sigue activa, puede conservarse el documento central para la escucha. Lite comparte las mejoras de conexión y preferencias, pero no incorpora el motor cinético, cámara ni TalkBack.

### Límites del navegador

Chrome restringe la inyección en Nueva pestaña, `chrome://`, la tienda y otras superficies protegidas. La voz central puede resolver búsquedas y operaciones nativas permitidas, pero no colocar el cursor virtual sobre esas interfaces.

En webs permitidas, la interacción con marcos incrustados, juegos, canvas o controles que exigen eventos de confianza depende del sitio. El soporte de filtros en pantalla completa y marcos no demuestra que el mouse cinético pueda operar todos los controles de esos contenidos.

Al actualizar el código de una extensión instalada desde una carpeta, hay que recargar **la extensión una vez** para cargar el cambio. Después, la recuperación debe funcionar sin recargar cada web. Actualizar archivos en disco no sustituye el código que Chrome ya está ejecutando.

## 12. Interfaz y feedback esperado

El panel debe conservar tres opciones comprensibles, sin selección de derecha/izquierda ni una lista de variantes anatómicas. Cabeza/torso debe quedar como opción inicial. La ayuda debe explicar reposo, movimiento, señal y clic sin exigir conocimientos de MediaPipe.

La vista de cámara es informativa y no tiene botones de calibración ni exige seleccionar puntos manualmente. El punto de seguimiento muestra dónde se detecta la parte visible; la línea celeste muestra la dirección de control respecto al centro seguro. Sus posiciones pueden ser distintas y eso es normal.

Los estados deben indicar si se usa **señal**, **joystick**, espera de seguimiento, pausa o calibración de cabeza/torso. El HUD, el aviso de cámara y el menú contextual usan el idioma de AdaptaPE (español, inglés, portugués, alemán, francés o italiano), se actualizan con el ajuste **Idioma** y conservan los textos al reconectar. Los comandos del cursor se traducen a la misma acción interna; no cambian umbrales, velocidad ni calibración. Durante un gesto de clic la vista muestra:

- «Mano · pinza · suelta: clic · mantén: derecho» mientras se mantiene la pinza.
- «Mano · pinza · suelta: clic derecho» cuando la voz preparó un clic derecho.
- «Mano · pinza · clic derecho hecho, suelta» tras el clic derecho por pinza mantenida.
- «cabeza · boca abierta · cierra: clic» o «cabeza · boca abierta · cierra: clic derecho» con la boca abierta.

 El color complementa el texto, pero no debe ser la única explicación de lo que sucede. Las etiquetas de izquierda/derecha del modelo no deben presentarse como opciones que el usuario deba resolver.

**Criterio de uso:** la persona debe poder entender por qué el cursor avanza, cómo detenerlo y cómo recuperar el control sin recargar la página o rehacer una postura innecesariamente.

## 13. Arquitectura, recursos y privacidad

| Archivo | Responsabilidad relacionada con el cursor |
| --- | --- |
| `popup.html` / `popup.js` | Selector y preferencias; ayuda de uso y avisos a páginas. |
| `content_script.js` | Aplicar preferencias, prioridad y visibilidad; integrar cursor, voz, TalkBack y mascota; recuperar interfaz. |
| `classes/KineticEngine.js` | Elegir fuente, interpretar señal/joystick, calibrar cabeza, filtrar, mover, atraer y hacer clic (permanencia, pinza y boca: `medirPinza()`, `procesarGestoClic()`, `clicGesto()`). |
| `voz/camara.js` | Mantener captura única, preparar imágenes, adaptar la carga (`medirCarga()`, `detalle()`) y enviar detecciones/vista al destino permitido. |
| `vision/trabajador.js` | Inferencia local con los modelos de rostro (con `jawOpen` para `boca`), manos y Pose; conservar identidad por proximidad; reintentar un modelo cuya carga falló. |
| `background.js` | Conectar páginas, asignar prioridad y `documentId`, coordinar cámara/voz y rechazar destinos antiguos. |
| `classes/VoiceAssistant.js` | Interpretar comandos; en Base recibe el callback cinético. |
| `classes/TalkBack.js` | Lectura contextual integrada con los eventos del cursor. |
| `tests/motores.test.cjs` / `tests/cinetico.test.cjs` / `tests/browser.test.cjs` | Regresiones de lógica, de gestos de clic y carga adaptativa, e integración en Chrome. |

Los modelos y WASM de visión están empaquetados localmente y son privados de la extensión. El cursor no necesita un CDN ni el prototipo Python. Sólo hay una imagen de inferencia en vuelo y se libera al terminar.

La captura solicita 640 × 480 a un máximo de 30 imágenes/s; la resolución obtenida depende de la cámara. La inferencia conserva hasta 640 × 480 en extremidades y hasta 320 × 240 en cabeza/torso, sin ampliar ni deformar la cámara disponible. La vista previa se actualiza de forma independiente para no esperar a cada inferencia; no acumula imágenes pendientes.

**Carga adaptativa.** `voz/camara.js` mide el tiempo entre enviar una imagen y recibir sus puntos con una media móvil (80% anterior, 20% nueva). Ignora la primera muestra tras cambiar de modelo o de detalle y las muestras de 1.000 ms o más. Cada 5 muestras decide: media mayor que 90 ms reduce el detalle un nivel y menor que 40 ms lo recupera. Extremidades pasan por 640 × 480, 480 × 360 y 320 × 240; cabeza/torso por 320 × 240 y 240 × 180, porque un rostro más pequeño dejaría de detectarse. Con media mayor que 90 ms también descansa min(0,5 × media, 130 − media) ms antes del siguiente envío, nunca un valor negativo, para que el ciclo no supere los saltos de 200 ms que desarman el clic. Cambiar de modo reinicia la medida. El tamaño de entrada del modelo es fijo; el ahorro principal procede del descanso.

El worker del modelo de rostro activa `outputFaceBlendshapes` con el archivo local `rostro.task` y sólo envía el número `boca` (`jawOpen` de 0 a 1, o `null` sin rostro) dentro de los datos de `camara_fotograma`. No se envían otras expresiones ni imágenes. Si un modelo no carga, el fallo no queda guardado y el siguiente intento vuelve a cargarlo.

Sólo se guardan preferencias como modo, temblor, velocidad y amplitud. Las imágenes, plantillas de textura, referencias de postura, candidatas y reposo del joystick permanecen en memoria; no se guardan en `chrome.storage.local`. El alcance de privacidad del reconocimiento de voz se describe por separado en el README.

## 14. Parámetros actuales de referencia

Estos valores describen el código actual. No son valores clínicos ni prueban comodidad para todas las personas.

| Parámetro | Valor o regla |
| --- | --- |
| Vista de control | 160 × 120; centro fijo de extremidades en 80, 60. |
| Ganancia del desplazamiento local | 6 respecto al reposo del joystick. |
| Velocidad máxima del cursor | 650 píxeles/s. |
| Regulación de velocidad | Entre 0,3 y 2; el límite máximo sigue aplicándose. |
| Amplitud | Normal: 1; movimientos pequeños: 0,55. |
| Zona segura | 0,045; con ajuste de temblor: 0,07. |
| Anillo de atracción | Zona segura más 0,02. |
| Entrada/salida del joystick | Entrada: zona segura más 0,008; salida: zona segura × 0,55, con magnitud normalizada por ejes y amplitud. |
| Deriva perpendicular del joystick | Suprimir componente menor que 0,3 de la dominante; conservar diagonales claras. |
| Confirmación de señal | Inferencias distintas durante al menos 50 ms; compatibilidad de dirección con coseno ≥0,7. |
| Extensión de dedos con articulaciones válidas | Distancia nudillo/punta ≥90% de la longitud total de segmentos no degenerados. |
| Alineación de dedos | Coseno de sus direcciones en proyección ≥0,85. |
| Señal hacia la cámara | Proyección inferior al 35% de longitud 3D no produce señal direccional. |
| Confirmación de fuente | Al menos 3 imágenes y 150 ms. |
| Calibración de cabeza/torso | Al menos 4 inferencias distintas durante 900 ms, dentro de una ventana de 1.200 ms. |
| Puntos antiguos | Aproximadamente 500 ms sin datos recientes impiden continuar el control. |
| Pérdida breve en manos | Hasta 500 ms; recuperación a distancia mayor que 0,1 del ancho limpia el reposo. |
| Plantilla de textura perdida | Tras 1.200 ms se exige otra adquisición. |
| Búsqueda de textura | Traslación local hasta 12 píxeles; giros de ±0,12 y ±0,24 radianes. |
| Integración de tiempo por paso | Hasta 100 ms en extremidades; 50 ms en cabeza/torso. Saltos >200 ms desarman clic; >500 ms reinician joystick. |
| Filtrado | Mediana de 3 inferencias distintas, seguida de suavizado por tiempo real. |
| Permanencia | 1.000 ms sobre el mismo objetivo; salida de atracción ≥180 ms o cierre deliberado de puño confirmado para armar. |
| Puño para reposo | Cuatro dedos doblados, articulaciones válidas; cierre ≥120 ms y ≥3 inferencias distintas. Abrir cancela; salida confirmada en 80 ms. |
| Joystick de extremidades | Entrada: magnitud >zonaMuerta + 0,004; salida: ≤zonaMuerta ×0,85. Tras el filtro de tres inferencias, retorno dentro de zonaMuerta centra EMA sin deriva. |
| Aproximación a controles | Sondeo local hasta 28 píxeles. |
| Salto de la misma fuente en manos | Mayor que 0,2 del ancho: nuevo reposo, suavizado limpio y clic desarmado. |
| Pinza | Distancia 4-8 / distancia 0-9 (eje vertical × 120/160). Activa ≤0,25; suelta ≥0,40. Mano mínima: 0,03. |
| Confirmación de pinza | Al menos 2 inferencias distintas y 80 ms. Soltar antes de 700 ms: clic; mantener ≥700 ms: un clic derecho. |
| Boca | `jawOpen` ≥0,5 abierta; ≤0,2 cerrada. Confirmar con 3 inferencias distintas y 300 ms; más de 1.500 ms abierta cancela. |
| Carga adaptativa | Media 80/20 del tiempo de inferencia; decide cada 5 muestras; >90 ms baja detalle, <40 ms lo sube; descanso min(0,5 × media, 130 − media) ms. |
| Detalle de inferencia | Extremidades 640 × 480, 480 × 360, 320 × 240. Cabeza 320 × 240, 240 × 180. Nunca amplía. |

## 15. Criterios de aceptación y pruebas manuales

Cada caso debe evaluarse en una web permitida, con el modo correcto y sin atribuir al cursor las restricciones propias del sitio. Registrar qué gesto se hizo, el estado mostrado, la respuesta del puntero y las condiciones de cámara permite distinguir un fallo de detección de uno de interpretación o interacción.

| Caso | Procedimiento | Resultado aceptable |
| --- | --- | --- |
| Inicio con cabeza | Activar el cursor desde una postura cómoda. | Cabeza/torso seleccionado inicialmente; aprender reposo sin clic durante la preparación. |
| Mano en posición cómoda | Elegir brazos/manos con la mano abajo o a un lado. | Seguimiento sin pedir centrar o adelantar la mano ni calibrar postura. |
| Palma y puño | Abrir/cerrar la mano durante una sesión. | Seguir la misma extremidad; el puño permite joystick y la señal válida puede tomar prioridad. |
| Cuatro sentidos | Desde reposo, realizar desplazamientos cortos arriba, abajo y a ambos lados. | Dirección coherente, sin deriva perpendicular dominante ni recentrado continuo. |
| Sostener y regresar | Mantener el desplazamiento y después volver al reposo. | Continuar mientras se sostiene; detenerse al regresar. |
| Diagonal | Desplazar en diagonal de forma deliberada. | Conservar ambos ejes. |
| Uno a cuatro dedos | Señalar con las variantes disponibles y con palma/dorso visibles. | Dirección consistente cuando el modelo entrega puntos fiables; no exigir cuatro dedos válidos para una señal de uno. |
| Señal hacia abajo | Doblar la muñeca manteniendo dedos extendidos hacia abajo. | No descartar la señal porque la punta se acerque a la muñeca. |
| Señal durante movimiento | Desplazar a la derecha y señalar arriba; después soltar. | Primero joystick a derecha, luego señal arriba, luego joystick actual; reposo original conservado. |
| Muñeca al borde | Sacar/reintroducir muñeca conservando nudillos visibles. | Ancla de palma estable cuando hay puntos suficientes; no oscilar continuamente entre anclas. |
| Muñón/mano parcial | En modo textura, mover y girar ligeramente una zona con detalle. | Adquirir textura, dirigir por desplazamiento/giro y detenerse al regresar. |
| Oclusión | Ocultar brevemente y luego más tiempo la extremidad. | Detener y desarmar durante pérdida; recuperación cercana breve conserva referencia cuando corresponde; una recuperación lejana no produce salto. |
| Pausa y reanudación | Usar las órdenes de pausa y reanudación. | Pausa sin movimiento/clic; volver sin nuevo permiso ni calibración de extremidades. |
| Cambio de modo | Cambiar los tres modos con cámara activa. | Modelos cambian en la misma página y con el mismo flujo central. |
| Cambio de opciones | Activar/desactivar módulos y cambiar ajustes rápidamente. | Última preferencia prevalece; controles visibles sin recargar la web. |
| Pestaña nueva | Abrir otra web permitida y volver a la anterior. | Conexión y prioridad correctas; no pedir otra autorización de cámara ni recargar páginas. |
| Fondo bloqueado | Mantener una pestaña de fondo sin responder y cambiar opciones en la actual. | La actual sigue activándose; no espera la conexión o confirmación de fondo. |
| Selección y clic | Acercarse a un control, probar permanencia y «da clic». | Atracción suave; un clic por entrada válida; selección por voz prioritaria. |
| Lectura y mascota | Recorrer controles con el cursor y cambiar de pestaña. | Eventos de lectura/mirada integrados; TalkBack recupera su estado al volver. |
| Pinza | En brazos/manos, situar el cursor sobre un enlace, juntar pulgar e índice y soltar. | El cursor se queda quieto durante la pinza y se produce un único clic al soltar. |
| Clic derecho por pinza | Mantener la pinza al menos 0,7 s y luego soltar. | Un clic derecho mientras se mantiene; soltar no añade un clic izquierdo. |
| Puño y pulgar oculto | Cerrar el puño o tapar el pulgar sobre un objetivo. | Sin clic por pinza; el puño sigue sirviendo de joystick. |
| Clic con la boca | En cabeza/torso, abrir bien la boca unos 0,3 s y cerrarla. | Un clic al cerrar; hablar normalmente no produce clics. |
| Bostezo | Mantener la boca abierta más de 1,5 s. | Gesto cancelado sin clic. |
| Equipo lento | Usar el cursor en un equipo con poca CPU o con otras tareas pesadas. | Menos detalle y descansos entre inferencias; el cursor sigue respondiendo y el ciclo procura no superar los 200 ms que desarman el clic. Al liberar la CPU recupera el detalle. |

Además de comprobar si el cursor se mueve, hay que observar esfuerzo, necesidad de levantar el brazo, facilidad para detenerse, sobrepasos del objetivo y frecuencia de pérdidas. La reducción de fatiga es un objetivo de uso pendiente de medir con personas; no se deduce de una prueba automática.

## 16. Evidencia disponible y validación pendiente

La última verificación registrada incluyó **69 grupos de regresión** en `tests/motores.test.cjs`, **21 grupos cinéticos** en `tests/cinetico.test.cjs` (medida de pinza, clic izquierdo y derecho, imagen repetida, puño y pulgar oculto, clic derecho preparado por voz, desarmes, convivencia con permanencia, boca y bostezo, `jawOpen` en el worker, reintento de modelos y carga adaptativa) y **19 comprobaciones principales de integración** en Chrome con cámara/voz sintéticas. Se comprobaron, entre otros casos, los cuatro sentidos, manos y puños, señal mientras la muñeca se desplaza, regreso a joystick, pérdidas, cambios de modo, preferencias, pestañas nuevas y convivencia con otros módulos.

En una prueba local previa con **16 fotografías facilitadas por el usuario**, se obtuvo dirección de dedos en 15; en la restante se perdió la detección de dedos y se usó una muñeca corporal como respaldo. Ese resultado no representa una tasa de precisión en vídeo ni valida todas las variantes anatómicas. Las fotografías personales no se incorporaron como fixtures al repositorio.

Para ejecutar las pruebas existentes desde Base, con Lite como carpeta hermana `extensiónLite`:

```sh
node tests/motores.test.cjs
node tests/cinetico.test.cjs
node tests/browser.test.cjs
```

Los gestos de clic y la carga adaptativa se verifican con datos sintéticos; sus umbrales siguen pendientes de validar con cámaras y personas reales. En ejecuciones repetidas de `tests/browser.test.cjs` se observó un fallo intermitente de arranque o aserción que desaparece al repetir.

El runner de Chrome requiere el entorno de Chrome/Node descrito en el README y utiliza un perfil temporal. Las pruebas del modelo con fotografías o fixtures no sustituyen una sesión continua con la cámara de la persona usuaria.

Queda pendiente comprobar en vivo la pinza, el clic con la boca mientras se habla, la carga adaptativa en equipos lentos, posturas, puños, diferentes números de dedos, manos parciales, muñones, vendajes, iluminación, ángulos y velocidades de cámara. El criterio final es poder dirigir y detener el cursor con comodidad y seleccionar controles repetidamente, sin saltos, recalibraciones innecesarias ni recargas de páginas permitidas.

## 17. Documentación relacionada

- [README: instalación, comandos y alcance](README.md).
- [Visión local: modelos y licencias](vision/README.md).
- [Fixtures de pruebas: procedencia](tests/fixtures/README.md).
