# Mascotas de AdaptaPE

Tinku (gallito de las rocas), Cuchu (cuy) y Yati (llama), suministrados por el autor desde Mascota-Modular-Adapta-PE 0.3.0.

`motor.js` conserva su SDK sin dependencias. `Mascota.js` conecta prioridad, cursor físico/cinético, voz y lectura; `popup.js` guarda la elección. Las dos variantes comparten estos archivos.

Los atlas se convirtieron con `cwebp -lossless -m 6`, conservando dimensiones, colores y transparencia. Los JSON conservan los frames, duraciones, fases y direcciones que consume el SDK; se retiró metadato de edición no utilizado. Cada página visible carga sólo el personaje elegido; conserva la imagen sin animar al perder prioridad y libera los sprites al ocultarse. Los recursos no requieren servicios externos.
