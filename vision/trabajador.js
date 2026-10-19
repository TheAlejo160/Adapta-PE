// Runtime y modelos empaquetados: no CDN, eval remoto ni imágenes fuera del equipo.
self.exports = {};
// MediaPipe escribe sus avisos internos (glog «I/W1014 …», «INFO: Created TensorFlow Lite…») por la salida de error,
// y Chrome los lista como errores de la extensión. Se descartan sólo esos; E/F y cualquier otro error se conservan.
const registroInterno = /^(?:[IW]\d{4} \d\d:\d\d:\d\d|INFO: )/;
for (const metodo of ['log', 'info', 'warn', 'error']) {
    const original = console[metodo].bind(console);
    console[metodo] = (...datos) => { if (!(typeof datos[0] === 'string' && registroInterno.test(datos[0]))) original(...datos); };
}
importScripts('vendor/vision_bundle.js');
const { FilesetResolver, FaceLandmarker, PoseLandmarker, HandLandmarker } = self.exports;
let archivos, rostro, cuerpo, manos;
let manoPreferida = null;
const modelos = {};
// Un modelo creado durante una imagen (p. ej. Pose al perder la mano) alarga esa inferencia: no mide la carga real.
let estrenado = false;
async function cargar(nombre, clase, opciones) {
    archivos ||= await FilesetResolver.forVisionTasks('vendor/wasm');
    if (!modelos[nombre]) estrenado = true;
    modelos[nombre] ||= clase.createFromOptions(archivos, {
        baseOptions: { modelAssetPath: 'modelos/' + nombre + '.task', delegate: 'CPU' },
        runningMode: 'VIDEO', ...opciones
    }).catch(error => { delete modelos[nombre]; throw error; }); // Un fallo transitorio no bloquea el modelo para siempre.
    return modelos[nombre];
}
// rostro.task incluye face_blendshapes.tflite: sólo se envía la apertura de boca (jawOpen) para el clic facial.
const opcionesRostro = { numFaces: 1, minFaceDetectionConfidence: 0.5, minTrackingConfidence: 0.5, outputFaceBlendshapes: true };
let ocupado = false;
self.onmessage = async evento => {
    const datos = evento.data;
    if (datos?.tipo === 'iniciar') {
        try {
            rostro = await cargar('rostro', FaceLandmarker, opcionesRostro);
            postMessage({ tipo: 'listo' });
        } catch (error) { postMessage({ tipo: 'error', mensaje: String(error.message) }); }
        return;
    }
    if (datos?.tipo !== 'imagen' || !datos.imagen) return;
    if (ocupado) { datos.imagen.close(); return; }
    ocupado = true;
    estrenado = false;
    try {
        const { imagen, tiempo, modo } = datos;
        const resultado = { tipo: 'puntos', tiempo, modo, rostro: [], cuerpo: [], manos: [] };
        if (modo === 'automatico' || modo === 'cabeza') {
            rostro ||= await cargar('rostro', FaceLandmarker, opcionesRostro);
            const caras = rostro.detectForVideo(imagen, tiempo);
            resultado.rostro = caras.faceLandmarks[0] || [];
            const boca = caras.faceBlendshapes?.[0]?.categories?.find(categoria => categoria.categoryName === 'jawOpen')?.score;
            resultado.boca = resultado.rostro.length && Number.isFinite(boca) ? boca : null;
        }
        // Automático sigue buscando manos para permitir cambiar desde cabeza sin cambiar de modo.
        if (modo === 'manos' || modo === 'automatico') {
            manos ||= await cargar('manos', HandLandmarker, { numHands: 2, minHandDetectionConfidence: 0.45, minHandPresenceConfidence: 0.45 });
            const detectadas = manos.detectForVideo(imagen, tiempo);
            // Mismos umbrales que KineticEngine.elegirPunto() (adquirir >=0,8, conservar >=0,6): una mano falsa
            // en rostro/ropa no debe fijarse ni tapar a la real cuando el modelo entrega ambas.
            const puntuacion = candidata => detectadas.handedness[candidata]?.[0]?.score ?? 1;
            let indice = -1, continua = false;
            if (manoPreferida && tiempo - manoPreferida.tiempo <= 1200) {
                // Entre las próximas, una mano fiable (>=0,8) gana a una dudosa aunque ésta quede más cerca.
                let distancia = 0.2, fiable = false;
                detectadas.landmarks.forEach((puntos, candidata) => {
                    const separacion = Math.hypot(puntos[0]?.x - manoPreferida.x, puntos[0]?.y - manoPreferida.y);
                    const segura = puntuacion(candidata) >= 0.8;
                    if (separacion < 0.2 && puntuacion(candidata) >= 0.6 && (segura > fiable || (segura === fiable && separacion < distancia))) {
                        indice = candidata; distancia = separacion; fiable = segura; continua = true;
                    }
                });
            }
            if (indice < 0) indice = detectadas.handedness.findIndex((etiquetas, candidata) =>
                etiquetas[0]?.categoryName === manoPreferida?.nombre && puntuacion(candidata) >= 0.8);
            if (indice < 0) indice = detectadas.landmarks.reduce((mejor, _, candidata) => puntuacion(candidata) > puntuacion(mejor) ? candidata : mejor, 0);
            resultado.manos = detectadas.landmarks[indice] || [];
            resultado.mano = continua ? manoPreferida.nombre : detectadas.handedness[indice]?.[0]?.categoryName || null;
            // Puntuación de lateralidad: manos reales ~0,93+; falsas en rostro/ropa ~0,55-0,72 (fixtures MediaPipe).
            resultado.manoConfianza = detectadas.handedness[indice]?.[0]?.score ?? null;
            if (resultado.manos[0] && puntuacion(indice) >= (continua ? 0.6 : 0.8)) manoPreferida = { ...resultado.manos[0], nombre: resultado.mano, tiempo };
        }
        if ((modo === 'cabeza' && (!resultado.rostro.length || datos.fuente === 'torso' || datos.fuente === 'cabeza corporal')) ||
            (modo === 'manos' && (!resultado.manos.length || datos.fuente?.startsWith('brazo_'))) ||
            (modo === 'automatico' && (!datos.fuente || (!resultado.manos.length && (!resultado.rostro.length || datos.fuente?.startsWith('mano:'))) ||
                datos.fuente?.startsWith('brazo_') || datos.fuente === 'torso' || datos.fuente === 'cabeza corporal')) ||
            ['torso', 'brazo_izquierdo', 'brazo_derecho'].includes(modo)) {
            cuerpo ||= await cargar('cuerpo', PoseLandmarker, { numPoses: 1, minPoseDetectionConfidence: 0.5 });
            resultado.cuerpo = cuerpo.detectForVideo(imagen, tiempo).landmarks[0] || [];
            if (!resultado.manos.length && manoPreferida && tiempo - manoPreferida.tiempo <= 1200 && datos.fuente?.startsWith('mano:')) {
                const referencia = manoPreferida;
                let distancia = 0.2;
                for (const indice of [15, 16]) {
                    const punto = resultado.cuerpo[indice];
                    if (!punto || !(punto.visibility >= 0.5) || !((punto.presence ?? 1) >= 0.5) ||
                        !(punto.x >= 0 && punto.x <= 1 && punto.y >= 0 && punto.y <= 1)) continue;
                    const separacion = Math.hypot(punto.x - referencia.x, punto.y - referencia.y);
                    if (separacion < distancia) { distancia = separacion; manoPreferida = { ...punto, nombre: manoPreferida.nombre, tiempo }; }
                }
            }
        }
        if (estrenado) resultado.calentamiento = true;
        postMessage(resultado);
    } catch (error) { postMessage({ tipo: 'error', mensaje: String(error.message) }); }
    finally { datos.imagen.close(); ocupado = false; }
};
