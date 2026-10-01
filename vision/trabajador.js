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
        // Automático detecta manos aun viendo rostro; mostrar la mano permite controlarla.
        if (modo === 'manos' || modo === 'automatico') {
            manos ||= await cargar('manos', HandLandmarker, { numHands: 2, minHandDetectionConfidence: 0.45, minHandPresenceConfidence: 0.45 });
            const detectadas = manos.detectForVideo(imagen, tiempo);
            let indice = detectadas.handedness.findIndex(etiquetas => etiquetas[0]?.categoryName === manoPreferida);
            if (indice < 0) indice = 0;
            resultado.manos = detectadas.landmarks[indice] || [];
            resultado.mano = detectadas.handedness[indice]?.[0]?.categoryName || null;
            if (resultado.mano) manoPreferida = resultado.mano;
        }
        if (modo !== 'cabeza' && modo !== 'manos' && (!resultado.rostro.length || modo !== 'automatico' ||
            datos.fuente === 'torso' || datos.fuente === 'cabeza corporal')) {
            cuerpo ||= await cargar('cuerpo', PoseLandmarker, { numPoses: 1, minPoseDetectionConfidence: 0.5 });
            resultado.cuerpo = cuerpo.detectForVideo(imagen, tiempo).landmarks[0] || [];
        }
        postMessage(resultado);
    } catch (error) { postMessage({ tipo: 'error', mensaje: String(error.message) }); }
    finally { datos.imagen.close(); ocupado = false; }
};
