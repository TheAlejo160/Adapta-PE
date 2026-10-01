# Visión local

MediaPipe Tasks Vision **0.10.22-rc.20250304**, paquete oficial `@mediapipe/tasks-vision` (Apache 2.0, licencia en `vendor/LICENSE`). Se conserva el bundle CommonJS original; el worker proporciona `exports`.

Modelos oficiales Google AI Edge, float16, revisión 1:
- `rostro.task`: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- `cuerpo.task`: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
- `manos.task`: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
- Paquete: https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-0.10.22-rc.20250304.tgz

Todo se sirve desde el origen de la extensión. El documento offscreen privado crea el worker; no se expone iframe ni recursos de visión a las webs. `voz/camara.js` captura una sola vez y el service worker entrega los puntos sólo a la pestaña enfocada. La vista efímera se dibuja dentro de un shadow DOM cerrado. Un fotograma en vuelo evita colas y se libera su ImageBitmap tras la inferencia. La detección funciona fuera del hilo de la página; el modelo corporal/manos se carga cuando se necesita. No necesita el backend Flask ni conexión de red. Lite no incluye este directorio.

Estos modelos no están validados para todas las amputaciones, oclusiones o ayudas técnicas. El modo Zona libre permite seguir textura visible de una extremidad residual sin exigir dedos o muñecas; debe validarse con personas usuarias y sus cámaras antes de afirmar compatibilidad universal.
