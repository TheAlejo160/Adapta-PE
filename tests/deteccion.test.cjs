// Canal de detección del cursor cinético (voz/camara.js y vision/trabajador.js), sin dependencias.
// Ejecutar: node tests/deteccion.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(__dirname, '..');
let comprobaciones = 0;
async function comprobar(nombre, prueba) { await prueba(); comprobaciones++; console.log('✓ ' + nombre); }

// Worker con MediaPipe simulado: `manos` devuelve la lista de manos indicada en cada imagen.
function trabajador({ manos = () => [], poseCreada = () => {} } = {}) {
    const salidas = [];
    const contexto = vm.createContext({ self: {}, console, postMessage: dato => salidas.push(dato), importScripts() {
        contexto.self.exports = { FilesetResolver: { forVisionTasks: async () => ({}) },
            FaceLandmarker: { createFromOptions: async () => ({ detectForVideo: () => ({ faceLandmarks: [] }) }) },
            PoseLandmarker: { createFromOptions: async () => { poseCreada(); return { detectForVideo: () => ({ landmarks: [] }) }; } },
            HandLandmarker: { createFromOptions: async () => ({ detectForVideo: (_, tiempo) => {
                const lista = manos(tiempo);
                return { landmarks: lista.map(m => [{ x: m.x, y: m.y }]), handedness: lista.map(m => [{ categoryName: m.nombre, score: m.score }]) };
            } }) } };
    } });
    vm.runInContext(fs.readFileSync(path.join(raiz, 'vision/trabajador.js'), 'utf8'), contexto);
    const imagen = async (tiempo, modo = 'manos', fuente = null) => {
        let cerrada = false;
        await contexto.self.onmessage({ data: { tipo: 'imagen', modo, tiempo, fuente, imagen: { close() { cerrada = true; } } } });
        assert.ok(cerrada, 'El worker libera cada ImageBitmap');
        return salidas.at(-1);
    };
    return { salidas, imagen, contexto };
}

// Cámara offscreen con Worker, temporizadores y reloj controlados.
function camara() {
    const reloj = { ahora: 0 }, temporizadores = [], trabajadores = [], mensajes = [];
    class Worker {
        constructor() { this.enviados = []; this.terminado = false; trabajadores.push(this); }
        postMessage(dato) { this.enviados.push(dato); }
        terminate() { this.terminado = true; }
    }
    const contexto = vm.createContext({ console, Worker, performance: { now: () => reloj.ahora },
        document: { createElement: () => ({}) }, window: { addEventListener() {} },
        chrome: { runtime: { id: 'x', getURL: ruta => ruta, onMessage: { addListener() {} },
            sendMessage: dato => { mensajes.push(dato); return Promise.resolve(); } } },
        setTimeout: (funcion, espera) => temporizadores.push({ funcion, espera }),
        clearTimeout: id => { if (temporizadores[id - 1]) temporizadores[id - 1].cancelado = true; }
    });
    vm.runInContext(fs.readFileSync(path.join(raiz, 'voz/camara.js'), 'utf8'), contexto);
    const captura = vm.runInContext('camaraCentral', contexto);
    captura.flujo = { getTracks: () => [] }; captura.procesar = true; captura.modo = 'manos';
    captura.video = { readyState: 2, currentTime: 0, videoWidth: 640, videoHeight: 480, pause() {} };
    const responder = datos => captura.trabajador.onmessage({ data: datos });
    return { captura, reloj, temporizadores, trabajadores, mensajes, contexto, responder };
}

(async () => {
    await comprobar('Worker no deja que una mano falsa tape a la real ni la fija como preferida', async () => {
        let lista = [{ x: 0.5, y: 0.3, nombre: 'Left', score: 0.62 }, { x: 0.2, y: 0.7, nombre: 'Right', score: 0.95 }];
        const prueba = trabajador({ manos: () => lista });
        let salida = await prueba.imagen(100);
        assert.equal(salida.manos[0].x, 0.2, 'Sin continuidad elige la mayor puntuación, no el índice 0');
        assert.equal(salida.manoConfianza, 0.95);
        // La real se mueve un poco y la falsa queda pegada a la posición anterior de la real: sigue la real.
        lista = [{ x: 0.22, y: 0.7, nombre: 'Left', score: 0.62 }, { x: 0.3, y: 0.7, nombre: 'Right', score: 0.9 }];
        salida = await prueba.imagen(150);
        assert.equal(salida.manos[0].x, 0.3, 'La falsa más próxima no roba la continuidad a la real (>=0,8)');
        assert.equal(salida.mano, 'Right');
        // Sólo queda una falsa: se envía (KineticEngine la rechaza) pero no se convierte en preferida.
        const solo = trabajador({ manos: () => lista });
        lista = [{ x: 0.5, y: 0.3, nombre: 'Left', score: 0.6 }];
        await solo.imagen(100);
        lista = [{ x: 0.52, y: 0.3, nombre: 'Left', score: 0.62 }, { x: 0.8, y: 0.8, nombre: 'Right', score: 0.94 }];
        salida = await solo.imagen(150);
        assert.equal(salida.manos[0].x, 0.8, 'La falsa no ganó continuidad: la real aparece y se elige');
        assert.equal(salida.mano, 'Right');
    });

    await comprobar('Worker conserva la mano seguida aunque su puntuación baje a >=0,6', async () => {
        let lista = [{ x: 0.4, y: 0.5, nombre: 'Left', score: 0.95 }];
        const prueba = trabajador({ manos: () => lista });
        await prueba.imagen(100);
        lista = [{ x: 0.9, y: 0.1, nombre: 'Right', score: 0.97 }, { x: 0.42, y: 0.5, nombre: 'Left', score: 0.65 }];
        const salida = await prueba.imagen(150);
        assert.equal(salida.manos[0].x, 0.42);
        assert.equal(salida.mano, 'Left');
        assert.equal(salida.manoConfianza, 0.65);
    });

    await comprobar('Worker marca la imagen que creó un modelo (calentamiento) sólo una vez', async () => {
        let creaciones = 0;
        const prueba = trabajador({ poseCreada: () => creaciones++ });
        let salida = await prueba.imagen(100); // Sin mano: carga Pose dentro de la imagen.
        assert.equal(creaciones, 1);
        assert.equal(salida.calentamiento, true);
        salida = await prueba.imagen(150);
        assert.equal(salida.calentamiento, undefined, 'Con modelos ya creados la duración vuelve a contar');
        assert.equal(salida.tipo, 'puntos');
    });

    await comprobar('Cámara no mide carga con una inferencia de calentamiento', async () => {
        const prueba = camara();
        prueba.captura.crearTrabajador(prueba.captura.generacion);
        prueba.responder({ tipo: 'listo' });
        prueba.captura.envio = 0; prueba.reloj.ahora = 700;
        prueba.captura.carga = { nivel: 0, media: 40, muestras: 4, descartar: false, reposoHasta: 0 };
        prueba.responder({ tipo: 'puntos', modo: 'manos', tiempo: 700, calentamiento: true });
        assert.equal(prueba.captura.carga.media, 40, 'Cargar Pose no hace bajar el detalle');
        assert.equal(prueba.captura.carga.muestras, 4);
        prueba.responder({ tipo: 'puntos', modo: 'manos', tiempo: 700 });
        assert.equal(prueba.captura.carga.muestras, 0, 'Una inferencia normal sí cuenta (quinta muestra decide)');
        assert.equal(prueba.mensajes.filter(dato => dato.accion === 'camara_fotograma').length, 2, 'Ambas se publican');
    });

    await comprobar('Cámara recrea el worker tras fallo de carga, WASM roto o error de script, con espera creciente', async () => {
        const prueba = camara(), { captura, temporizadores, trabajadores } = prueba;
        captura.crearTrabajador(captura.generacion);
        prueba.responder({ tipo: 'error', mensaje: 'red' });
        assert.ok(trabajadores[0].terminado, 'Carga inicial fallida: se descarta el worker');
        assert.equal(captura.trabajador, null);
        assert.equal(temporizadores.at(-1).espera, 1000);
        temporizadores.at(-1).funcion();
        assert.equal(trabajadores.length, 2);
        assert.equal(trabajadores[1].enviados[0].tipo, 'iniciar');
        // Mensajes tardíos del worker anterior se ignoran.
        trabajadores[0].onmessage({ data: { tipo: 'listo' } });
        assert.equal(captura.visionLista, false);
        prueba.responder({ tipo: 'listo' });
        assert.equal(captura.visionLista, true);
        // Dos errores de imagen se toleran; el tercero seguido recrea con espera mayor.
        prueba.responder({ tipo: 'error' }); prueba.responder({ tipo: 'error' });
        assert.equal(trabajadores[1].terminado, false);
        prueba.responder({ tipo: 'error' });
        assert.ok(trabajadores[1].terminado);
        assert.equal(temporizadores.at(-1).espera, 2000);
        temporizadores.at(-1).funcion();
        // Un resultado correcto reinicia contadores.
        prueba.responder({ tipo: 'listo' });
        captura.envio = 0;
        prueba.responder({ tipo: 'puntos', modo: 'manos', tiempo: 0 });
        assert.equal(captura.reintentos, 0);
        prueba.responder({ tipo: 'error' }); prueba.responder({ tipo: 'error' });
        prueba.responder({ tipo: 'puntos', modo: 'manos', tiempo: 0 });
        prueba.responder({ tipo: 'error' });
        assert.equal(trabajadores[2].terminado, false, 'Sólo cuentan errores consecutivos');
        // Error de script del worker (onerror).
        trabajadores[2].onerror();
        assert.ok(trabajadores[2].terminado);
        assert.equal(temporizadores.at(-1).espera, 1000);
        // Detener antes del reintento: no se crea otro worker.
        captura.detener();
        temporizadores.at(-1).funcion();
        assert.equal(trabajadores.length, 3);
        // La espera se acota a 30 s.
        const lenta = camara();
        lenta.captura.crearTrabajador(lenta.captura.generacion);
        for (let intento = 0; intento < 8; intento++) {
            lenta.responder({ tipo: 'error' });
            lenta.temporizadores.filter(t => t.espera >= 1000).at(-1).funcion();
        }
        assert.equal(lenta.temporizadores.filter(t => t.espera >= 1000).at(-1).espera, 30000);
    });

    await comprobar('Cámara libera el ImageBitmap si el worker se reinicia durante su creación o falla el envío', async () => {
        const prueba = camara(), { captura } = prueba;
        captura.crearTrabajador(captura.generacion);
        prueba.responder({ tipo: 'listo' });
        let cerrada = 0;
        prueba.contexto.createImageBitmap = async () => { captura.trabajador.onerror(); return { close() { cerrada++; } }; };
        await captura.capturar(captura.generacion);
        assert.equal(cerrada, 1);
        assert.equal(captura.ocupada, false, 'No queda una imagen en vuelo bloqueando la captura');
        captura.crearTrabajador(captura.generacion);
        prueba.responder({ tipo: 'listo' });
        captura.trabajador.postMessage = () => { throw new Error('DataCloneError'); };
        prueba.contexto.createImageBitmap = async () => ({ close() { cerrada++; } });
        captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        assert.equal(cerrada, 2);
        assert.equal(captura.ocupada, false);
        // Camino normal: una sola imagen en vuelo, transferida y sin cerrar en la cámara.
        const enviados = [];
        captura.trabajador.postMessage = (dato, transferir) => enviados.push({ dato, transferir });
        captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        assert.equal(enviados.length, 1);
        assert.equal(enviados[0].transferir[0], enviados[0].dato.imagen);
        assert.equal(captura.ocupada, true);
        captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        assert.equal(enviados.length, 1, 'Con una imagen en vuelo no se envía otra');
        assert.equal(cerrada, 2);
    });

    await comprobar('Cámara espera un modelo lento sin enviar otra imagen y recrea un worker colgado tras tres límites', async () => {
        const prueba = camara(), { captura, temporizadores, trabajadores } = prueba;
        const limite = () => temporizadores.filter(t => t.espera === 5000).at(-1);
        captura.crearTrabajador(captura.generacion);
        prueba.responder({ tipo: 'listo' });
        prueba.contexto.createImageBitmap = async () => ({ close() {} });
        // Respuesta a tiempo: el límite vencido después no cuenta como fallo.
        captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        prueba.responder({ tipo: 'puntos', modo: 'manos', tiempo: 0 });
        limite().funcion();
        assert.equal(captura.fallos, 0);
        captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        limite().funcion();
        assert.equal(captura.ocupada, true, 'Vencer el límite no libera una imagen que el worker aún procesa');
        captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        assert.equal(trabajadores[0].enviados.filter(d => d.tipo === 'imagen').length, 2, 'No se encola otra imagen tras el límite');
        prueba.reloj.ahora = 6000;
        const segundaEspera = limite();
        prueba.responder({ tipo: 'puntos', modo: 'manos', tiempo: 0, calentamiento: true });
        assert.equal(segundaEspera.cancelado, true, 'La respuesta tardía cancela la espera pendiente');
        assert.equal(captura.fallos, 0);
        assert.equal(captura.ocupada, false);
        assert.equal(trabajadores[0].terminado, false, 'Cargar un modelo durante 6 s no lo reinicia');
        captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        for (let intento = 1; intento <= 3; intento++) {
            limite().funcion();
            assert.equal(captura.ocupada, intento < 3, 'Sólo terminar el worker libera el turno sin respuesta');
            assert.equal(trabajadores[0].terminado, intento === 3, 'Sólo la tercera espera seguida recrea el worker');
        }
        assert.equal(temporizadores.at(-1).espera, 1000, 'Recrea con la espera creciente existente');
        assert.ok(prueba.mensajes.some(dato => dato.clave === 'cinetico.error.deteccion'));
    });

    console.log(comprobaciones + ' grupos de regresiones de detección correctos.');
})().catch(error => { console.error(error); process.exit(1); });
