// Runtime y modelos empaquetados: no CDN, eval remoto ni imágenes fuera del equipo.
self.exports = {};
importScripts('vendor/vision_bundle.js');
const { FilesetResolver, FaceLandmarker, PoseLandmarker, HandLandmarker } = self.exports;
let archivos, rostro, cuerpo, manos;
let manoPreferida = null;
const modelos = {};
async function cargar(nombre, clase, opciones) {
    archivos ||= await FilesetResolver.forVisionTasks('vendor/wasm');
    modelos[nombre] ||= clase.createFromOptions(archivos, {
        baseOptions: { modelAssetPath: 'modelos/' + nombre + '.task', delegate: 'CPU' },
        runningMode: 'VIDEO', ...opciones
    });
    return modelos[nombre];
}
let ocupado = false;
self.onmessage = async evento => {
    const datos = evento.data;
    if (datos?.tipo === 'iniciar') {
        try {
            rostro = await cargar('rostro', FaceLandmarker, { numFaces: 1, minFaceDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            postMessage({ tipo: 'listo' });
        } catch (error) { postMessage({ tipo: 'error', mensaje: String(error.message) }); }
        return;
    }
    if (datos?.tipo !== 'imagen' || !datos.imagen) return;
    if (ocupado) { datos.imagen.close(); return; }
    ocupado = true;
    try {
        const { imagen, tiempo, modo } = datos;
        const resultado = { tipo: 'puntos', tiempo, modo, rostro: [], cuerpo: [], manos: [] };
        if (modo === 'automatico' || modo === 'cabeza') {
            rostro ||= await cargar('rostro', FaceLandmarker, { numFaces: 1 });
            resultado.rostro = rostro.detectForVideo(imagen, tiempo).faceLandmarks[0] || [];
        }
        // Automático sigue buscando manos para permitir cambiar desde cabeza sin cambiar de modo.
        if (modo === 'manos' || modo === 'automatico') {
            manos ||= await cargar('manos', HandLandmarker, { numHands: 2, minHandDetectionConfidence: 0.45, minHandPresenceConfidence: 0.45 });
            const detectadas = manos.detectForVideo(imagen, tiempo);
            let indice = detectadas.handedness.findIndex(etiquetas => etiquetas[0]?.categoryName === manoPreferida?.nombre);
            let continua = false;
            if (manoPreferida && tiempo - manoPreferida.tiempo <= 1200) {
                let distancia = 0.2;
                detectadas.landmarks.forEach((puntos, candidata) => {
                    const separacion = Math.hypot(puntos[0]?.x - manoPreferida.x, puntos[0]?.y - manoPreferida.y);
                    if (separacion < distancia) { indice = candidata; distancia = separacion; continua = true; }
                });
            }
            if (indice < 0) indice = 0;
            resultado.manos = detectadas.landmarks[indice] || [];
            resultado.mano = continua ? manoPreferida.nombre : detectadas.handedness[indice]?.[0]?.categoryName || null;
            if (resultado.manos[0]) manoPreferida = { ...resultado.manos[0], nombre: resultado.mano, tiempo };
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
        postMessage(resultado);
    } catch (error) { postMessage({ tipo: 'error', mensaje: String(error.message) }); }
    finally { datos.imagen.close(); ocupado = false; }
};
