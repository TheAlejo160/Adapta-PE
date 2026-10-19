// Gestos de clic y carga adaptativa del cursor cinético, sin dependencias. Ejecutar: node tests/cinetico.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(__dirname, '..');
let comprobaciones = 0;
async function comprobar(nombre, prueba) { await prueba(); comprobaciones++; console.log('✓ ' + nombre); }

function entorno() {
    const mensajes = [];
    const reloj = { ahora: 0 };
    const contexto = vm.createContext({ console, Float32Array, Uint8ClampedArray, performance: { now: () => reloj.ahora },
        document: { hidden: false, createElement: () => ({ style: {}, setAttribute() {}, remove() {} }), body: { appendChild() {} } },
        window: { innerWidth: 1600, innerHeight: 900, addEventListener() {} }, navigator: {}, cancelAnimationFrame() {},
        chrome: { runtime: { onMessage: { addListener() {} }, sendMessage: (dato, respuesta) => { mensajes.push(dato); respuesta?.({ ok: true }); return Promise.resolve({ ok: true }); } },
            storage: { local: { set: async () => {} } } },
        setTimeout: () => 0, clearTimeout() {}
    });
    const cargar = archivo => vm.runInContext(fs.readFileSync(path.join(raiz, archivo), 'utf8'), contexto, { filename: archivo });
    return { contexto, mensajes, reloj, cargar };
}

// 21 puntos de MediaPipe: muñeca abajo, dedos hacia arriba, pulgar separado.
function mano(forma = 'abierta') {
    const puntos = [[0.5, 0.7], [0.45, 0.66], [0.41, 0.62], [0.38, 0.58], [0.36, 0.55],
        [0.47, 0.55], [0.47, 0.49], [0.47, 0.45], [0.47, 0.41], [0.5, 0.54], [0.5, 0.47], [0.5, 0.43], [0.5, 0.39],
        [0.53, 0.55], [0.53, 0.49], [0.53, 0.45], [0.53, 0.42], [0.56, 0.57], [0.56, 0.52], [0.56, 0.49], [0.56, 0.46]];
    if (forma === 'pinza' || forma === 'sin_pulgar') {
        puntos[6] = [0.46, 0.5]; puntos[7] = [0.44, 0.5]; puntos[8] = [0.42, 0.52]; puntos[3] = [0.41, 0.56]; puntos[4] = [0.42, 0.53];
    }
    if (forma === 'puno') {
        puntos[6] = [0.47, 0.52]; puntos[7] = [0.48, 0.58]; puntos[8] = [0.48, 0.62]; puntos[4] = [0.48, 0.6];
    }
    if (forma === 'puno_completo' || forma === 'medio') for (const base of [5, 9, 13, 17]) {
        const [x, y] = puntos[base];
        puntos[base + 1] = [x, y - 0.04]; puntos[base + 2] = [x, y + 0.03]; puntos[base + 3] = [x, y + 0.065];
    }
    if (forma === 'puno_frontal') for (const base of [5, 9, 13, 17]) {
        const [x, y] = puntos[base];
        puntos[base + 1] = [x, y - 0.04]; puntos[base + 2] = [x, y - 0.03]; puntos[base + 3] = [x, y - 0.02];
    }
    if (forma === 'medio') for (const base of [13, 17]) { // Cerrando: dos dedos a medias, ni puño ni mano abierta.
        const [x, y] = puntos[base];
        puntos[base + 1] = [x, y - 0.04]; puntos[base + 2] = [x + 0.015, y - 0.065]; puntos[base + 3] = [x + 0.035, y - 0.065];
    }
    const salida = puntos.map(([x, y]) => ({ x, y, z: 0 }));
    if (forma === 'puno_frontal') for (const base of [5, 9, 13, 17]) {
        salida[base + 2].z = -0.07; salida[base + 3].z = -0.005;
    }
    if (forma === 'sin_pulgar') { delete salida[3]; delete salida[4]; } // Pulgar oculto: el modelo no lo entrega.
    return salida;
}

function motorManos(idioma, formaInicial = 'abierta') {
    const prueba = entorno();
    if (idioma) { prueba.cargar('textos.js'); vm.runInContext(`TextosAdapta.fijarIdioma('${idioma}')`, prueba.contexto); }
    prueba.cargar('classes/KineticEngine.js');
    const motor = new prueba.contexto.KineticEngine(), clics = [];
    motor.activa = true; motor.aplicarAjustes({ modo: 'manos' });
    motor.solicitarModelo = motor.programarFotograma = motor.actualizarHover = () => {};
    motor.dibujarHUD = texto => { motor.estadoPrueba = texto; };
    motor.elementoBajoCursor = () => ({});
    motor.hacerClick = tipo => clics.push(tipo);
    const fotograma = (tiempo, forma) => {
        motor.recibirFotograma({ modo: 'manos', edad: 0, manos: forma ? mano(forma) : [], mano: 'Left' });
        motor.deteccion.tiempo = tiempo; motor.bucleRender(tiempo);
    };
    const serie = (desde, hasta, forma) => { for (let tiempo = desde; tiempo <= hasta; tiempo += 50) fotograma(tiempo, forma); };
    serie(0, 400, formaInicial); // Estabilizar 250 ms y observar la mano suelta.
    return { motor, clics, fotograma, serie };
}

// Zona libre: imágenes de 160×120 en grises, deterministas.
function motorZona() {
    const prueba = entorno();
    prueba.cargar('classes/KineticEngine.js');
    const motor = new prueba.contexto.KineticEngine();
    motor.activa = true; motor.modoControl = 'zona'; motor.grisesRecibidos = true;
    motor.dibujarHUD = motor.actualizarHover = () => {};
    const fotograma = (tiempo, grises) => { motor.grises.set(grises); motor.deteccion = { tiempo }; motor.controlarZona(tiempo); };
    return { motor, fotograma };
}
const ruidoZona = (x, y, semilla = 0) => 80 + ((Math.imul(x + 19 + semilla, 73856093) ^ Math.imul(y + 31, 19349663)) >>> 0) % 90;
function texturaZona(dx = 0, dy = 0, semilla = 0) {
    const grises = new Float32Array(19200);
    for (let y = 0; y < 120; y++) for (let x = 0; x < 160; x++) grises[y * 160 + x] = ruidoZona(x - dx, y - dy, semilla);
    return grises;
}
// Ruido de valor interpolado (textura suave, como piel con poco detalle) más ruido de sensor.
function suaveZona(semilla, escala, dx, dy, ruido) {
    let estado = semilla;
    const azar = () => (estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0) / 4294967296;
    const rejilla = Array.from({ length: 900 }, azar), curva = t => t * t * (3 - 2 * t);
    const valor = (x, y) => {
        const fx = x / escala + 1, fy = y / escala + 1, ix = Math.floor(fx), iy = Math.floor(fy), tx = curva(fx - ix), ty = curva(fy - iy);
        const a = rejilla[iy * 30 + ix], b = rejilla[iy * 30 + ix + 1], c = rejilla[(iy + 1) * 30 + ix], d = rejilla[(iy + 1) * 30 + ix + 1];
        return 80 + 90 * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
    };
    const grises = new Float32Array(19200);
    for (let y = 0; y < 120; y++) for (let x = 0; x < 160; x++) grises[y * 160 + x] = valor(x - dx, y - dy) + (azar() - 0.5) * 2 * ruido;
    return grises;
}
// Objeto con textura propia sobre fondo liso.
function objetoZona(x0, y0 = 45) {
    const grises = new Float32Array(19200).fill(150);
    for (let y = y0; y < y0 + 30; y++) for (let x = Math.max(0, x0); x < Math.min(160, x0 + 30); x++) grises[y * 160 + x] = ruidoZona(x - x0, y - y0, 3);
    return grises;
}

(async () => {
    await comprobar('Puño completo: cuatro dedos doblados; pinza, mano parcial y puntos ausentes no lo inventan', () => {
        const { motor } = motorManos();
        assert.equal(motor.inclinacionMano(mano('puno_completo')).puno, true);
        for (const forma of ['abierta', 'pinza', 'puno']) assert.equal(motor.inclinacionMano(mano(forma)).puno, false, forma);
        const meñique = mano('puno_completo'); meñique[18] = { x: 0.56, y: 0.53, z: 0 }; meñique[19] = { x: 0.575, y: 0.505, z: 0 }; meñique[20] = { x: 0.595, y: 0.505, z: 0 };
        assert.equal(motor.inclinacionMano(meñique).puno, true, 'Tres dedos doblados y uno a medias siguen siendo puño');
        meñique[19] = { x: 0.56, y: 0.49, z: 0 }; meñique[20] = { x: 0.56, y: 0.45, z: 0 };
        assert.equal(motor.inclinacionMano(meñique).puno, false, 'Un dedo extendido no es puño');
        const parcial = mano('puno_completo'); delete parcial[20];
        assert.notEqual(motor.inclinacionMano(parcial)?.puno, true);
    });

    await comprobar('Puño frontal y de perfil: flexión independiente de muñeca, palma y pulgar junto al índice', () => {
        const { motor } = motorManos();
        const frontal = mano('puno_frontal');
        assert.ok(Math.hypot(frontal[8].x - frontal[0].x, frontal[8].y - frontal[0].y) >
            Math.hypot(frontal[5].x - frontal[0].x, frontal[5].y - frontal[0].y), 'Punta más lejos de muñeca que nudillo');
        assert.equal(motor.inclinacionMano(frontal).puno, true);
        const perfil = frontal.map(p => ({ ...p, x: 0.5 }));
        assert.equal(motor.inclinacionMano(perfil).puno, true, 'Palma de perfil no elimina la detección de cierre');
        frontal[4] = { ...frontal[8] };
        assert.equal(motor.medirPinza(frontal), 'activo', 'La distancia sola confunde un puño frontal con pinza');
        const elegido = motor.elegirPunto({ manos: frontal, mano: 'Left' });
        assert.equal(elegido.gesto.puno, true); assert.equal(elegido.clic, null, 'El puño confirmado no se convierte en pinza');
        const prueba = motorManos(); const objetivo = {};
        prueba.motor.elementoBajoCursor = () => objetivo;
        prueba.serie(450, 600, 'puno_frontal');
        assert.equal(prueba.motor.muestraGesto.puno.activo, true);
        prueba.serie(650, 1600, 'puno_frontal'); assert.deepEqual(prueba.clics, ['izquierdo']);
    });

    await comprobar('Cerrar puño centra el control, permite dwell de 1 s y no repite clic mientras sigue cerrado', () => {
        const { motor, clics, serie, fotograma } = motorManos();
        const objetivo = {}; motor.elementoBajoCursor = () => objetivo; motor.atraerCursor = () => {};
        serie(450, 600, 'puno_completo');
        assert.equal(motor.muestraGesto.puno.activo, true);
        assert.deepEqual({ ...motor.puntoGesto }, { x: 80, y: 60 });
        assert.equal(motor.enZonaSegura, true);
        assert.match(motor.estadoPrueba, /puño · reposo/);
        const posicion = { x: motor.posX, y: motor.posY };
        serie(650, 1550, 'puno_completo'); assert.equal(clics.length, 0, 'No adelanta los 1.000 ms');
        fotograma(1600, 'puno_completo'); assert.deepEqual(clics, ['izquierdo']);
        serie(1650, 2900, 'puno_completo'); assert.equal(clics.length, 1);
        assert.deepEqual({ x: motor.posX, y: motor.posY }, posicion, 'El cursor permanece en el objetivo');
        fotograma(2950, 'abierta');
        fotograma(3000, 'abierta'); fotograma(3050, 'abierta');
        assert.equal(motor.muestraGesto.puno.activo, false); assert.equal(motor.armado, false);
        assert.equal(motor.muestraGesto.x, motor.puntoActual.x, 'Abrir retoma el joystick aquí, sin salto al reposo viejo');
    });

    await comprobar('Puño inicial sigue como joystick; imagen repetida y puño fugaz no activan reposo', () => {
        const inicio = motorManos(undefined, 'puno_completo');
        inicio.serie(450, 1700, 'puno_completo');
        assert.equal(Boolean(inicio.motor.muestraGesto.puno.activo), false); assert.equal(inicio.clics.length, 0);
        assert.match(inicio.motor.estadoPrueba, /puño · abre la mano/, 'Reconoce el puño e indica la apertura pendiente');
        const antes = inicio.motor.posX;
        for (let tiempo = 1750; tiempo <= 2050; tiempo += 50) {
            inicio.motor.recibirFotograma({ modo: 'manos', edad: 0, mano: 'Left', manos: mano('puno_completo').map(p => ({ ...p, x: p.x - 0.04 })) });
            inicio.motor.deteccion.tiempo = tiempo; inicio.motor.bucleRender(tiempo);
        }
        assert.ok(inicio.motor.posX > antes, 'Se conserva el control mediante movimiento del puño');
        const prueba = motorManos(); prueba.fotograma(450, 'puno_completo');
        for (const tiempo of [500, 550, 600]) {
            prueba.motor.numeroFotograma++; prueba.motor.deteccion.tiempo = 450; prueba.motor.bucleRender(tiempo);
        }
        assert.equal(Boolean(prueba.motor.muestraGesto.puno.activo), false);
        prueba.fotograma(650, 'abierta'); assert.equal(prueba.clics.length, 0);
    });

    await comprobar('Dwell con puño respeta pérdida, pausa, saltos de tiempo y cambio de objetivo', () => {
        for (const fallo of ['perdida', 'pausa', 'tiempo']) {
            const prueba = motorManos(); const objetivo = {};
            prueba.motor.elementoBajoCursor = () => objetivo;
            prueba.serie(450, 900, 'puno_completo');
            if (fallo === 'perdida') prueba.fotograma(950, null);
            if (fallo === 'pausa') { prueba.motor.ejecutarAccion('pausar'); prueba.fotograma(950, 'puno_completo'); prueba.motor.ejecutarAccion('reanudar'); }
            prueba.serie(fallo === 'tiempo' ? 1250 : 1000, 2700, 'puno_completo');
            assert.equal(prueba.clics.length, 0, fallo);
        }
        const prueba = motorManos(); const objetivos = [{}, {}]; let objetivo = objetivos[0];
        prueba.motor.elementoBajoCursor = () => objetivo;
        prueba.serie(450, 1000, 'puno_completo'); objetivo = objetivos[1];
        prueba.serie(1050, 2000, 'puno_completo'); assert.equal(prueba.clics.length, 0);
        prueba.fotograma(2050, 'puno_completo'); assert.equal(prueba.clics.length, 1);
        const ambigua = (prueba, desde, hasta) => prueba.serie(desde, hasta, 'medio');
        const medio = motorManos().motor.inclinacionMano(mano('medio'));
        assert.equal(medio.puno, false); assert.equal(medio.abierta, false);
        const breve = motorManos(); breve.motor.elementoBajoCursor = () => objetivos[0];
        breve.serie(450, 900, 'puno_completo'); ambigua(breve, 950, 1000); breve.serie(1050, 1600, 'puno_completo');
        assert.equal(breve.clics.length, 1, 'Una imagen ambigua breve no rompe el puño ni su permanencia');
        const larga = motorManos(); larga.motor.elementoBajoCursor = () => objetivos[0];
        larga.serie(450, 900, 'puno_completo'); ambigua(larga, 950, 1400); larga.serie(1450, 3000, 'puno_completo');
        assert.equal(larga.clics.length, 0, 'Ambigüedad larga suelta el puño y volver sin abrir no rearma');
        const cierre = motorManos(); cierre.motor.elementoBajoCursor = () => objetivos[0];
        ambigua(cierre, 450, 550); cierre.serie(600, 1800, 'puno_completo');
        assert.equal(cierre.clics.length, 1, 'Imágenes intermedias al cerrar no olvidan la apertura previa');
    });

    await comprobar('Mano falsa: confianza baja, esqueleto imposible o aparición fugaz no controlan el cursor', () => {
        const { motor } = motorManos();
        motor.fuenteControl = null; motor.perdidaDesde = 0;
        assert.equal(motor.elegirPunto({ manos: mano(), mano: 'Left', manoConfianza: 0.7 }), null, 'Adquirir exige >=0,8');
        assert.ok(motor.elegirPunto({ manos: mano(), mano: 'Left', manoConfianza: 0.95 }));
        motor.fuenteControl = 'mano:Left'; motor.perdidaDesde = null;
        assert.ok(motor.elegirPunto({ manos: mano(), mano: 'Left', manoConfianza: 0.7 }), 'Seguir una mano ya elegida admite >=0,6');
        const estirada = mano(); estirada[8] = { x: 0.47, y: 0.05, z: 0 };
        assert.equal(motor.esqueletoMano(estirada), false, 'Dedo de varias palmas es imposible');
        assert.equal(motor.esqueletoMano(mano('puno_frontal')), true); assert.equal(motor.esqueletoMano(mano('pinza')), true);
        const prueba = motorManos(); const inicio = { x: prueba.motor.posX, y: prueba.motor.posY };
        prueba.serie(450, 1500, null);
        prueba.fotograma(1550, 'abierta'); prueba.fotograma(1600, 'abierta'); prueba.fotograma(1650, null);
        assert.equal(prueba.motor.fuenteControl, 'mano:Left'); assert.equal(prueba.motor.fiableDesde, null, 'Dos imágenes no adquieren control');
        assert.deepEqual({ x: prueba.motor.posX, y: prueba.motor.posY }, inicio);
    });

    await comprobar('Manos y textura: pequeños movimientos responden y regresar cerca del reposo detiene sin deriva', () => {
        for (const modo of ['manos', 'zona']) {
            const { motor } = motorManos(); motor.modoControl = modo; motor.muestraGesto = null;
            motor.atraerCursor = () => {}; motor.elementoBajoCursor = () => null;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                motor.muestraGesto = null; motor.controlarGesto({ x: 30, y: 80 }, 0);
                const mover = motor.controlarGesto({ x: 30 + dx * 2, y: 80 + dy * 1.5 }, 50);
                assert.equal(Math.sign(mover.x - 80), dx); assert.equal(Math.sign(mover.y - 60), dy);
                const reposo = motor.controlarGesto({ x: 30 + dx * 0.8, y: 80 + dy * 0.6 }, 100);
                assert.deepEqual({ ...reposo }, { x: 80, y: 60 });
                motor.puntoSuave = { x: 105, y: 80 };
                const posicion = { x: motor.posX, y: motor.posY };
                motor.actualizarControl(reposo, 100, 50);
                assert.deepEqual({ x: motor.posX, y: motor.posY }, posicion, 'Sin avance residual de EMA al regresar');
                assert.equal(motor.enZonaSegura, true);
                motor.ultimoMovimiento = null;
                for (const [tiempo, punto] of [[150, reposo], [200, { x: 112, y: 36 }], [250, reposo]]) {
                    const filtrado = motor.filtrarMovimiento(punto, tiempo); motor.actualizarControl(filtrado, tiempo, 50);
                }
                assert.deepEqual({ x: motor.posX, y: motor.posY }, posicion, 'Una detección aislada no provoca salto');
            }
        }
    });

    await comprobar('Medida de pinza: abierta suelta, pinza activa; puño y pulgar oculto no son pinza', () => {
        const { motor } = motorManos();
        assert.equal(motor.medirPinza(mano('abierta')), 'suelto');
        assert.equal(motor.medirPinza(mano('pinza')), 'activo');
        assert.equal(motor.medirPinza(mano('puno')), null);
        assert.equal(motor.medirPinza(mano('sin_pulgar')), null);
        const lejana = mano('pinza').map(punto => ({ x: 0.5 + (punto.x - 0.5) * 0.1, y: 0.5 + (punto.y - 0.5) * 0.1, z: 0 }));
        assert.equal(motor.medirPinza(lejana), null, 'Una mano diminuta no permite medir la pinza');
    });

    await comprobar('Pinza: un clic izquierdo por pinza al soltar, cursor quieto mientras se cierra', () => {
        const { motor, clics, fotograma, serie } = motorManos();
        fotograma(450, 'pinza');
        const posicion = { x: motor.posX, y: motor.posY };
        serie(500, 650, 'pinza');
        assert.match(motor.estadoPrueba, /^Mano · pinza/);
        assert.deepEqual({ x: motor.posX, y: motor.posY }, posicion, 'La pinza congela el cursor');
        assert.equal(clics.length, 0, 'Cerrar la pinza no hace clic todavía');
        fotograma(700, 'abierta');
        assert.deepEqual(clics, ['izquierdo']);
        serie(750, 900, 'abierta'); assert.equal(clics.length, 1, 'Mantener abierta no repite clic');
        serie(950, 1100, 'pinza'); fotograma(1150, 'abierta');
        assert.deepEqual(clics, ['izquierdo', 'izquierdo'], 'Cada pinza nueva produce un clic');
        fotograma(1200, 'pinza'); fotograma(1250, 'abierta');
        assert.equal(clics.length, 2, 'Una pinza de una sola inferencia no se confirma');
    });

    await comprobar('Imagen repetida no confirma la pinza', () => {
        const { motor, clics, fotograma } = motorManos();
        fotograma(450, 'pinza');
        // Misma inferencia (mismo tiempo de detección) vista en varios pasos de render.
        for (let paso = 1; paso <= 4; paso++) {
            motor.recibirFotograma({ modo: 'manos', edad: 0, manos: mano('pinza'), mano: 'Left' });
            motor.deteccion.tiempo = 450; motor.bucleRender(450 + paso * 50);
        }
        fotograma(700, 'abierta');
        assert.equal(clics.length, 0);
    });

    await comprobar('Sin pulgar visible, con puño o sin haber soltado antes no hay clic', () => {
        const { clics, serie, fotograma } = motorManos();
        serie(450, 700, 'sin_pulgar'); fotograma(750, 'abierta');
        serie(800, 1000, 'puno'); fotograma(1050, 'abierta');
        serie(1100, 1250, 'pinza'); serie(1300, 1350, 'sin_pulgar'); fotograma(1400, 'abierta');
        assert.equal(clics.length, 0, 'Perder el pulgar a mitad cancela sin clic');
        const nueva = motorManos();
        nueva.motor.calibrar(); // Mano que aparece ya cerrada: exige verla suelta primero.
        nueva.serie(450, 700, 'pinza'); nueva.fotograma(750, 'abierta');
        assert.equal(nueva.clics.length, 0);
    });

    await comprobar('Mantener la pinza 700 ms hace clic derecho una vez y soltar no añade clic izquierdo', () => {
        const { motor, clics, serie, fotograma } = motorManos();
        serie(450, 1100, 'pinza');
        assert.equal(clics.length, 0, 'Antes de 700 ms no hay clic derecho');
        fotograma(1150, 'pinza');
        assert.deepEqual(clics, ['derecho']);
        assert.match(motor.estadoPrueba, /clic derecho hecho/);
        serie(1200, 1500, 'pinza'); fotograma(1550, 'abierta');
        assert.deepEqual(clics, ['derecho']);
    });

    await comprobar('Clic derecho preparado por voz se aplica a la siguiente pinza corta', () => {
        const { motor, clics, serie, fotograma } = motorManos();
        motor.tipoClick = 'derecho';
        serie(450, 600, 'pinza'); assert.match(motor.estadoPrueba, /suelta: clic derecho/);
        fotograma(650, 'abierta');
        assert.deepEqual(clics, ['derecho']); assert.equal(motor.tipoClick, 'izquierdo');
    });

    await comprobar('Pérdida, pausa, salto de tiempo y salto lejano desarman la pinza sin clic', () => {
        let prueba = motorManos();
        prueba.serie(450, 600, 'pinza'); prueba.fotograma(650, null); prueba.serie(700, 800, 'abierta');
        assert.equal(prueba.clics.length, 0, 'Pérdida');
        prueba = motorManos();
        prueba.serie(450, 600, 'pinza'); prueba.motor.ejecutarAccion('pausar'); prueba.fotograma(650, 'pinza');
        prueba.motor.ejecutarAccion('reanudar'); prueba.serie(700, 800, 'abierta');
        assert.equal(prueba.clics.length, 0, 'Pausa');
        prueba = motorManos();
        prueba.serie(450, 600, 'pinza'); prueba.fotograma(900, 'abierta');
        assert.equal(prueba.clics.length, 0, 'Salto de tiempo >200 ms');
        prueba = motorManos();
        prueba.serie(450, 600, 'pinza');
        prueba.motor.recibirFotograma({ modo: 'manos', edad: 0, manos: mano('abierta').map(punto => ({ ...punto, x: punto.x - 0.35 })), mano: 'Left' });
        prueba.motor.deteccion.tiempo = 650; prueba.motor.bucleRender(650);
        assert.equal(prueba.clics.length, 0, 'Otra mano lejana con la misma etiqueta');
        assert.equal(prueba.motor.muestraGesto?.tiempo ?? 650, 650, 'El salto reinicia el reposo del joystick');
    });

    await comprobar('Permanencia sigue funcionando y no duplica el clic de una pinza', () => {
        const { motor, clics } = motorManos();
        motor.armado = true; motor.enZonaSegura = true;
        motor.clicGesto('izquierdo', 1000);
        assert.equal(motor.armado, false, 'El clic por gesto desarma la permanencia sobre el mismo objetivo');
        assert.deepEqual(clics, ['izquierdo']);
        const transicion = motorManos(); const objetivo = {};
        transicion.motor.elementoBajoCursor = () => objetivo;
        transicion.serie(450, 600, 'pinza'); transicion.fotograma(650, 'puno_completo');
        transicion.serie(700, 2300, 'puno_completo');
        assert.deepEqual(transicion.clics, ['izquierdo'], 'Soltar pinza cerrando puño no añade dwell al mismo clic');
    });

    await comprobar('Boca abierta en cabeza: un clic al cerrarla; habla breve y bostezo no hacen clic', () => {
        const prueba = entorno();
        prueba.cargar('classes/KineticEngine.js');
        const motor = new prueba.contexto.KineticEngine(), clics = [];
        motor.activa = true; motor.aplicarAjustes({ modo: 'cabeza' });
        motor.solicitarModelo = motor.programarFotograma = motor.actualizarHover = () => {};
        motor.dibujarHUD = texto => { motor.estadoPrueba = texto; };
        motor.elementoBajoCursor = () => ({}); motor.hacerClick = tipo => clics.push(tipo);
        const rostro = []; rostro[1] = { x: 0.5, y: 0.5 }; rostro[33] = { x: 0.45, y: 0.45 }; rostro[263] = { x: 0.55, y: 0.45 };
        const fotograma = (tiempo, boca) => {
            motor.recibirFotograma({ modo: 'cabeza', edad: 0, rostro, boca }); motor.deteccion.tiempo = tiempo; motor.bucleRender(tiempo);
        };
        const serie = (desde, hasta, boca) => { for (let tiempo = desde; tiempo <= hasta; tiempo += 50) fotograma(tiempo, boca); };
        serie(0, 1500, 0.02);
        assert.equal(motor.neutroListo, true);
        serie(1550, 1650, 0.6); fotograma(1700, 0.1);
        assert.equal(clics.length, 0, 'Abrir la boca 150 ms al hablar no hace clic');
        serie(1750, 2150, 0.7);
        assert.match(motor.estadoPrueba, /boca abierta · cierra: clic/);
        serie(2200, 2250, 0.35); assert.equal(clics.length, 0, 'Banda intermedia mantiene el gesto');
        fotograma(2300, 0.05);
        assert.deepEqual(clics, ['izquierdo']);
        serie(2350, 4100, 0.8); fotograma(4150, 0.05);
        assert.deepEqual(clics, ['izquierdo'], 'Un bostezo de más de 1,5 s se cancela');
        serie(4200, 4600, 0.7); fotograma(4650, null); fotograma(4700, 0.05);
        assert.deepEqual(clics, ['izquierdo'], 'Sin puntuación de boca se cancela sin clic');
        assert.equal(prueba.mensajes.filter(dato => /boca|pinza/.test(JSON.stringify(dato))).length, 0, 'El gesto no sale del motor');
    });

    await comprobar('Worker silencia avisos internos de MediaPipe y conserva errores reales', async () => {
        const vistos = [];
        const consola = { log: d => vistos.push(d), info: d => vistos.push(d), warn: d => vistos.push(d), error: d => vistos.push(d) };
        const trabajador = vm.createContext({ self: {}, console: consola, importScripts() {
            trabajador.self.exports = { FilesetResolver: {}, FaceLandmarker: {}, PoseLandmarker: {}, HandLandmarker: {} };
        } });
        vm.runInContext(fs.readFileSync(path.join(raiz, 'vision/trabajador.js'), 'utf8'), trabajador);
        trabajador.console.warn('W1014 07:51:56.242000 1922656 face_landmarker_graph.cc:180] Sets FaceBlendshapesGraph');
        trabajador.console.error('I1014 08:01:28.022000 1 gl_context.cc:1072] OpenGL error checking is disabled');
        trabajador.console.info('INFO: Created TensorFlow Lite XNNPACK delegate for CPU.');
        trabajador.console.error('E1014 08:01:28.022000 1 graph.cc:1] Fallo real');
        trabajador.console.error('TypeError: x');
        assert.deepEqual(vistos, ['E1014 08:01:28.022000 1 graph.cc:1] Fallo real', 'TypeError: x']);
    });
    await comprobar('Worker activa blendshapes locales y envía sólo jawOpen', async () => {
        const opciones = [];
        const salidas = [];
        const trabajador = vm.createContext({ self: {}, console, postMessage: dato => salidas.push(dato), importScripts() {
            trabajador.self.exports = { FilesetResolver: { forVisionTasks: async () => ({}) },
                FaceLandmarker: { createFromOptions: async (_, opcion) => { opciones.push(opcion); return { detectForVideo: () => ({
                    faceLandmarks: [[{ x: 0.5, y: 0.5 }]], faceBlendshapes: [{ categories: [{ categoryName: 'browInnerUp', score: 0.9 }, { categoryName: 'jawOpen', score: 0.66 }] }] }) }; } },
                PoseLandmarker: {}, HandLandmarker: {} };
        } });
        vm.runInContext(fs.readFileSync(path.join(raiz, 'vision/trabajador.js'), 'utf8'), trabajador);
        await trabajador.self.onmessage({ data: { tipo: 'iniciar' } });
        assert.equal(opciones[0].outputFaceBlendshapes, true);
        await trabajador.self.onmessage({ data: { tipo: 'imagen', modo: 'cabeza', tiempo: 100, imagen: { close() {} } } });
        assert.equal(salidas.at(-1).boca, 0.66);
    });

    await comprobar('Worker reintenta un modelo cuya carga falló', async () => {
        let intentos = 0;
        const salidas = [];
        const trabajador = vm.createContext({ self: {}, console, postMessage: dato => salidas.push(dato), importScripts() {
            trabajador.self.exports = { FilesetResolver: { forVisionTasks: async () => ({}) },
                FaceLandmarker: { createFromOptions: async () => { if (++intentos === 1) throw new Error('red'); return { detectForVideo: () => ({ faceLandmarks: [] }) }; } },
                PoseLandmarker: {}, HandLandmarker: {} };
        } });
        vm.runInContext(fs.readFileSync(path.join(raiz, 'vision/trabajador.js'), 'utf8'), trabajador);
        await trabajador.self.onmessage({ data: { tipo: 'iniciar' } });
        assert.equal(salidas.at(-1).tipo, 'error');
        await trabajador.self.onmessage({ data: { tipo: 'iniciar' } });
        assert.equal(salidas.at(-1).tipo, 'listo');
    });

    await comprobar('Carga adaptativa: baja detalle en equipos lentos, recupera en rápidos y respeta límites', async () => {
        const prueba = entorno();
        prueba.cargar('voz/camara.js');
        const captura = vm.runInContext('camaraCentral', prueba.contexto);
        let tamano, envios = 0;
        prueba.contexto.createImageBitmap = async (_, opciones) => { tamano = opciones; return { close() {} }; };
        captura.procesar = true; captura.flujo = { getTracks: () => [] }; captura.visionLista = true;
        captura.video = { readyState: 2, currentTime: 0, videoWidth: 1920, videoHeight: 1080, pause() {} };
        captura.trabajador = { postMessage: () => envios++, terminate() {} };
        const ciclo = async duracion => {
            captura.ocupada = false; captura.video.currentTime++;
            await captura.capturar(captura.generacion);
            prueba.reloj.ahora += duracion; captura.medirCarga(duracion);
            prueba.reloj.ahora += 200; // Siguiente tic tras cualquier reposo.
            return tamano.resizeWidth + '×' + tamano.resizeHeight;
        };
        captura.cambiarModelo({ modo: 'manos' });
        const tamanos = [];
        for (let paso = 0; paso < 30; paso++) tamanos.push(await ciclo(150));
        assert.equal(tamanos[0], '640×360', 'Empieza con el detalle máximo de extremidades');
        assert.ok(tamanos.includes('480×270'));
        assert.equal(tamanos.at(-1), '320×180', 'Equipo lento baja a la mitad y no más');
        tamanos.length = 0;
        for (let paso = 0; paso < 30; paso++) tamanos.push(await ciclo(20));
        assert.equal(tamanos.at(-1), '640×360', 'Equipo rápido recupera el máximo sin superarlo');
        assert.ok(tamanos.every(texto => Number(texto.split('×')[0]) <= 640));
        captura.cambiarModelo({ modo: 'cabeza' });
        for (let paso = 0; paso < 30; paso++) tamanos.push(await ciclo(150));
        assert.equal(tamanos.at(-1), '240×135', 'Cabeza no baja de 3/4 del límite 320×240');
        // Reposo: con inferencias de 100 ms se cede CPU antes de la siguiente imagen.
        captura.cambiarModelo({ modo: 'manos' });
        captura.carga = { nivel: 2, media: 100, muestras: 0, descartar: false, reposoHasta: 0 };
        captura.medirCarga(100);
        const antes = envios;
        captura.ocupada = false; captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        assert.equal(envios, antes, 'Reposo activo: no envía otra imagen todavía');
        assert.equal(captura.ocupada, false);
        prueba.reloj.ahora += 60; captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        assert.equal(envios, antes + 1);
        assert.ok(captura.carga.reposoHasta - prueba.reloj.ahora <= 130, 'Ciclo acotado para no desarmar el clic');
    });

    await comprobar('Idioma: HUD, menú y aviso de cámara siguen TextosAdapta; sin textos.js queda el español', () => {
        const ingles = motorManos('en');
        ingles.fotograma(450, 'pinza'); ingles.serie(500, 650, 'pinza');
        assert.equal(ingles.motor.estadoPrueba, 'Hand · pinch · release: click · hold: right');
        ingles.fotograma(700, 'abierta'); ingles.serie(750, 900, 'abierta');
        assert.match(ingles.motor.estadoPrueba, /^Hand · (signal|joystick) · (Safe|Moving|Attraction)/);
        const prueba = entorno();
        prueba.cargar('textos.js'); prueba.cargar('classes/KineticEngine.js');
        const elementos = [];
        prueba.contexto.document.createElement = () => { const nodo = { style: {}, atributos: {}, setAttribute(nombre, valor) { this.atributos[nombre] = valor; },
            remove() {}, attachShadow: () => ({ append() {}, appendChild() {} }), getContext: () => ({}) }; elementos.push(nodo); return nodo; };
        prueba.contexto.document.body.append = () => {};
        const motor = new prueba.contexto.KineticEngine();
        motor.crearInterfaz();
        assert.equal(motor.ayuda.textContent, 'Computadora: recalibrar · clic derecho · activar temblor', 'Español por defecto, byte a byte');
        motor.mostrarError('texto', 'cinetico.error.inicio'); motor.aviso.isConnected = true;
        vm.runInContext("TextosAdapta.fijarIdioma('de')", prueba.contexto);
        motor.actualizarTextos();
        assert.equal(motor.ayuda.textContent, 'Computer: neu kalibrieren · Rechtsklick · Zittern aktivieren', 'Cambio en vivo sin recrear la interfaz');
        assert.equal(motor.canvasEl.atributos['aria-label'].split(':')[0], 'Kamera');
        assert.equal(motor.hud.textContent, 'Lokale Erkennung wird geladen…');
        assert.match(motor.aviso.textContent, /^AdaptaPE konnte/);
        const espanol = motorManos();
        espanol.fotograma(450, 'pinza'); espanol.serie(500, 650, 'pinza');
        assert.equal(espanol.motor.estadoPrueba, 'Mano · pinza · suelta: clic · mantén: derecho');
    });

    await comprobar('Mascota reacciona por tipo de estado de voz, no por el texto, y retraduce su botón', () => {
        const prueba = entorno();
        prueba.contexto.document.addEventListener = prueba.contexto.document.removeEventListener = () => {};
        prueba.cargar('textos.js'); prueba.cargar('mascotas/Mascota.js');
        const mascota = new prueba.contexto.Mascota(), reacciones = [];
        mascota.visible = true; mascota.reaccionar = estado => { reacciones.push(estado); mascota.estado = estado; };
        mascota.estadoVoz('No entendí el comando');
        mascota.estadoVoz('I did not understand', 'error'); mascota.estadoVoz('Say your command', 'espera');
        mascota.estadoVoz('Heard: up', 'escucha'); mascota.estadoVoz('Voice on', 'activa');
        assert.deepEqual(reacciones, ['confused', 'look', 'talk', 'idle'], 'Sin tipo no reacciona; con tipo sí, en cualquier idioma');
        mascota.estado = 'sleep'; mascota.estadoVoz('Voz activa', 'activa');
        assert.equal(reacciones.length, 4, 'Dormida no despierta por el estado activo');
        mascota.nombre = 'yati'; mascota.botonMover = {};
        mascota.actualizarTextos();
        assert.equal(mascota.botonMover.title, 'Mover Yati: arrastra o usa las flechas del teclado');
        vm.runInContext("TextosAdapta.fijarIdioma('en')", prueba.contexto);
        mascota.actualizarTextos();
        assert.equal(mascota.botonMover.ariaLabel, 'Move Yati: drag or use the arrow keys');
    });

    await comprobar('Zona: la cuenca ancha de una textura suave no es ambigua; otro mínimo separado sí', () => {
        const { motor } = motorZona();
        motor.puntoActual = { x: 80, y: 60 };
        motor.plantilla = motor.extraerParche(suaveZona(27, 16, 0, 0, 0), 80, 60);
        const punto = motor.seguirPunto(suaveZona(27, 16, 4, 2, 6));
        assert.ok(punto, 'Antes una vecina a >3 px con error parecido cortaba el seguimiento');
        assert.ok(Math.abs(punto.x - 84) <= 1 && Math.abs(punto.y - 62) <= 1);
        // Mismo patrón repetido 8 px a la derecha: dos mínimos separados siguen siendo ambiguos.
        const doble = texturaZona(), patron = texturaZona(0, 0, 9);
        for (let y = 40; y < 81; y++) for (let x = 60; x < 108; x++) doble[y * 160 + x] = patron[y * 160 + 60 + (x - 60) % 8];
        motor.plantilla = motor.extraerParche(doble, 80, 60);
        assert.equal(motor.seguirPunto(doble), null);
    });

    await comprobar('Zona: coincidencia de 0,75-0,85 sigue sin tocar la plantilla; >=0,85 la actualiza; <0,75 se pierde', () => {
        const { motor, fotograma } = motorZona();
        const mezcla = k => texturaZona().map((valor, indice) => valor + k * (texturaZona(0, 0, 5)[indice] - 125));
        motor.puntoActual = { x: 80, y: 60 };
        motor.plantilla = motor.extraerParche(texturaZona(), 80, 60);
        const dudosa = motor.seguirPunto(mezcla(0.75));
        assert.ok(dudosa && dudosa.error > 0.15 && dudosa.error <= 0.25, 'Desenfoque/ruido moderado no corta el seguimiento');
        assert.equal(dudosa.x, 80); assert.equal(dudosa.y, 60);
        assert.equal(motor.seguirPunto(mezcla(0.9)), null, 'Una textura irreconocible se pierde');
        const valores = [...motor.plantilla.valores];
        fotograma(0, mezcla(0.75));
        assert.equal(motor.perdidaDesde, null);
        assert.deepEqual([...motor.plantilla.valores], valores, 'Una coincidencia dudosa no contamina la plantilla');
        fotograma(50, mezcla(0.6));
        assert.notDeepEqual([...motor.plantilla.valores], valores, 'Una coincidencia buena actualiza lentamente');
    });

    await comprobar('Zona: luz local o textura cambiada en su sitio no adquieren; textura desplazada sí', () => {
        const luz = motorZona();
        const pared = texturaZona(), iluminada = pared.map((valor, indice) => {
            const x = indice % 160, y = Math.floor(indice / 160);
            return x >= 60 && x < 100 && y >= 40 && y < 80 ? valor * 1.5 : valor;
        });
        for (let indice = 0; indice < 8; indice++) luz.fotograma(indice * 50, indice % 2 ? iluminada : pared);
        assert.equal(luz.motor.plantilla, null, 'Una sombra o luz sobre el fondo inmóvil no ancla el control');
        const cambio = motorZona(), otra = pared.map((valor, indice) => {
            const x = indice % 160, y = Math.floor(indice / 160);
            return x >= 60 && x < 100 && y >= 40 && y < 80 ? ruidoZona(x, y, 11) : valor;
        });
        for (let indice = 0; indice < 8; indice++) cambio.fotograma(indice * 50, indice % 2 ? otra : pared);
        assert.equal(cambio.motor.plantilla, null, 'Un cambio sin desplazamiento (pantalla, reflejo) no adquiere');
        const movil = motorZona();
        movil.fotograma(0, objetoZona(60)); movil.fotograma(50, objetoZona(63));
        assert.ok(movil.motor.plantilla, 'Una textura que se desplaza se adquiere');
        const { x, y } = movil.motor.puntoActual;
        assert.ok(x >= 63 - 12 && x < 93 + 12 && y >= 45 - 12 && y < 75 + 12, 'El parche cubre el objeto que se movió');
    });

    await comprobar('Zona: predicción por velocidad sigue >12 px por inferencia y no extrapola tras una pérdida', () => {
        const { motor, fotograma } = motorZona();
        fotograma(0, objetoZona(10)); fotograma(50, objetoZona(12));
        assert.ok(motor.plantilla);
        const inicio = motor.puntoActual.x;
        fotograma(100, objetoZona(20)); // 8 px: dentro de ±12, fija la velocidad.
        assert.equal(motor.puntoActual.x, inicio + 8);
        for (const [tiempo, x0] of [[150, 36], [200, 52], [250, 68]]) {
            fotograma(tiempo, objetoZona(x0)); // 16 px por inferencia: fuera de ±12 sin predicción.
            assert.equal(motor.perdidaDesde, null, 'No se pierde con movimiento rápido');
            assert.equal(motor.puntoActual.x, inicio + x0 - 12);
        }
        fotograma(300, new Float32Array(19200).fill(150));
        assert.equal(motor.plantilla.velocidad, null, 'Una pérdida descarta la velocidad');
        const quieto = motor.puntoActual.x;
        fotograma(350, objetoZona(68));
        assert.equal(motor.perdidaDesde, null); assert.equal(motor.puntoActual.x, quieto, 'Recupera sin desplazar la búsqueda');
    });

    await comprobar('Zona: búsqueda con desplazamientos precalculados equivale a la correlación normalizada directa', () => {
        const { motor } = motorZona();
        // Referencia: muestreo por píxel como la versión anterior (redondeo y límites por muestra).
        const referencia = (grises, plantilla, cx, cy) => {
            const medir = (x, y, angulo) => {
                if (x < 13 || y < 13 || x >= 147 || y >= 107) return null;
                const muestras = [], c = Math.cos(angulo), s = Math.sin(angulo);
                for (let fila = -12; fila <= 12; fila += 2) for (let columna = -12; columna <= 12; columna += 2) {
                    const px = angulo ? Math.round(x + columna * c - fila * s) : x + columna, py = angulo ? Math.round(y + columna * s + fila * c) : y + fila;
                    if (px < 0 || px >= 160 || py < 0 || py >= 120) return null;
                    muestras.push(grises[py * 160 + px]);
                }
                const media = muestras.reduce((a, b) => a + b) / muestras.length;
                const varianza = muestras.reduce((a, b) => a + (b - media) ** 2, 0);
                if (varianza / muestras.length < 36) return null;
                const energia = plantilla.reduce((a, b) => a + b * b, 0);
                return 1 - muestras.reduce((a, b, i) => a + (b - media) * plantilla[i], 0) / Math.sqrt(energia * varianza);
            };
            let mejor = { error: Infinity };
            for (let y = cy - 12; y <= cy + 12; y++) for (let x = cx - 12; x <= cx + 12; x++) {
                const error = medir(x, y, 0); if (error != null && error < mejor.error) mejor = { error, x, y, angulo: 0 };
            }
            const traslacion = mejor;
            if (traslacion.error <= 0.4) {
                for (const angulo of [-0.24, -0.12, 0.12, 0.24]) for (let y = traslacion.y - 2; y <= traslacion.y + 2; y++) for (let x = traslacion.x - 2; x <= traslacion.x + 2; x++) {
                    const error = medir(x, y, angulo); if (error != null && error < mejor.error) mejor = { error, x, y, angulo };
                }
                if (traslacion.error - mejor.error < 0.02) mejor = traslacion;
            }
            return mejor;
        };
        const girada = angulo => {
            const grises = new Float32Array(19200), c = Math.cos(angulo), s = Math.sin(angulo);
            for (let y = 0; y < 120; y++) for (let x = 0; x < 160; x++) {
                const u = (x - 30) * c + (y - 20) * s, v = -(x - 30) * s + (y - 20) * c;
                grises[y * 160 + x] = 120 + 35 * Math.sin(u * 0.37) + 30 * Math.sin(v * 0.51) + 15 * Math.cos(u * 0.13 + v * 0.27);
            }
            return grises;
        };
        // Incluye un centro junto al borde: las muestras giradas pueden salir de la imagen.
        for (const [base, imagen, cx, cy] of [[texturaZona(), texturaZona(5, -3, 0).map(v => v * 0.7 + 30), 80, 60],
            [girada(0), girada(0.24), 30, 20], [girada(0), girada(-0.12), 30, 20], [suaveZona(27, 16, 0, 0, 0), suaveZona(27, 16, 4, 2, 6), 80, 60]]) {
            const plantilla = motor.extraerParche(base, cx, cy);
            const esperado = referencia(imagen, plantilla.valores, cx, cy);
            const obtenido = motor.seguirPunto(imagen, plantilla, { x: cx, y: cy });
            assert.ok(obtenido);
            assert.deepEqual([obtenido.x, obtenido.y, obtenido.angulo], [esperado.x, esperado.y, esperado.angulo]);
            assert.ok(Math.abs(obtenido.error - esperado.error) < 1e-9);
        }
    });

    await comprobar('Pinza y boca: una imagen activa seguida de banda intermedia no confirma, no hace clic ni congela', () => {
        const media = () => { const puntos = mano('pinza'); puntos[4] = { x: 0.38, y: 0.52, z: 0 }; return puntos; }; // Pulgar a 1/3 de palma.
        const prueba = motorManos();
        const fotograma = (tiempo, manos) => {
            prueba.motor.recibirFotograma({ modo: 'manos', edad: 0, manos, mano: 'Left' }); prueba.motor.deteccion.tiempo = tiempo; prueba.motor.bucleRender(tiempo);
        };
        assert.equal(prueba.motor.medirPinza(media()), 'intermedio');
        fotograma(450, mano('pinza'));
        for (let tiempo = 500; tiempo <= 1300; tiempo += 50) fotograma(tiempo, media());
        assert.deepEqual(prueba.clics, [], 'Antes: un clic derecho a 700 ms con una sola imagen de pinza');
        assert.doesNotMatch(prueba.motor.estadoPrueba, /pinza/, 'La mano relajada no deja el cursor congelado');
        fotograma(1350, mano('abierta')); assert.deepEqual(prueba.clics, []);
        prueba.serie(1400, 1550, 'pinza'); fotograma(1600, media()); fotograma(1650, mano('abierta'));
        assert.deepEqual(prueba.clics, ['izquierdo'], 'Confirmada, la banda intermedia sigue manteniendo la pinza');
        const cabeza = entorno(); cabeza.cargar('classes/KineticEngine.js');
        const motor = new cabeza.contexto.KineticEngine(), clics = [];
        motor.activa = true; motor.aplicarAjustes({ modo: 'cabeza' });
        motor.solicitarModelo = motor.programarFotograma = motor.actualizarHover = () => {};
        motor.dibujarHUD = () => {}; motor.elementoBajoCursor = () => ({}); motor.hacerClick = tipo => clics.push(tipo);
        const rostro = []; rostro[1] = { x: 0.5, y: 0.5 }; rostro[33] = { x: 0.45, y: 0.45 }; rostro[263] = { x: 0.55, y: 0.45 };
        const boca = (tiempo, valor) => { motor.recibirFotograma({ modo: 'cabeza', edad: 0, rostro, boca: valor }); motor.deteccion.tiempo = tiempo; motor.bucleRender(tiempo); };
        for (let tiempo = 0; tiempo <= 1500; tiempo += 50) boca(tiempo, 0.02);
        boca(1550, 0.55); [0.3, 0.35, 0.25, 0.4, 0.3, 0.28].forEach((valor, indice) => boca(1600 + indice * 50, valor)); boca(1900, 0.1);
        assert.deepEqual(clics, [], 'Habla con un pico de apertura no hace clic');
    });

    await comprobar('Manos: sustituir la mano perdida por la muñeca de Pose no mueve el cursor; el movimiento real sí', () => {
        for (const desfase of [0.02, 0.05]) {
            const prueba = motorManos(undefined, 'puno_completo'); prueba.motor.atraerCursor = () => {};
            prueba.serie(450, 1000, 'puno_completo');
            const inicio = prueba.motor.posX;
            const pose = (tiempo, x) => {
                const cuerpo = []; cuerpo[15] = { x, y: 0.7, visibility: 0.9 };
                prueba.motor.recibirFotograma({ modo: 'manos', edad: 0, manos: [], cuerpo, mano: null });
                prueba.motor.deteccion.tiempo = tiempo; prueba.motor.bucleRender(tiempo);
            };
            for (let tiempo = 1050; tiempo <= 1600; tiempo += 50) pose(tiempo, 0.5 + desfase);
            assert.equal(prueba.motor.fuenteControl, 'mano:Left');
            assert.equal(prueba.motor.posX, inicio, 'Antes: el desfase entre modelos movía el cursor >100 px');
            prueba.serie(1650, 2100, 'puno_completo');
            assert.equal(prueba.motor.posX, inicio, 'Volver a la mano tampoco es un gesto');
            for (let tiempo = 2150; tiempo <= 2400; tiempo += 50) pose(tiempo, 0.5 + desfase);
            for (let tiempo = 2450; tiempo <= 2700; tiempo += 50) pose(tiempo, 0.5 + desfase + 0.03);
            assert.ok(prueba.motor.posX < inicio, 'Mover la muñeca seguida por Pose sí mueve el cursor');
        }
    });

    console.log(comprobaciones + ' grupos de regresiones cinéticas correctos.');
})().catch(error => { console.error(error); process.exit(1); });
