// Regresiones con DOM/cámara simulados, sin dependencias. Ejecutar: node tests/motores.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(__dirname, '..');
const lite = path.resolve(raiz, '../extensiónLite');
let comprobaciones = 0;
function comprobar(nombre, prueba) { prueba(); comprobaciones++; console.log('✓ ' + nombre); }

function entorno() {
    const mensajes = [], desplazamientos = [], temporizadores = new Map();
    let reloj = 0, contador = 0;
    const contexto = vm.createContext({ console, URL, Event, Float32Array, performance: { now: () => reloj },
        document: { hidden: false, activeElement: null, querySelectorAll: () => [], querySelector: () => null,
            getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, remove() {} }),
            body: { appendChild() {} }, head: { appendChild() {} }, documentElement: { scrollHeight: 2000 } },
        window: { innerWidth: 1600, innerHeight: 900, scrollBy: dato => desplazamientos.push(dato), scrollTo: dato => desplazamientos.push(dato),
            getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) },
        location: { hostname: 'example.org' }, navigator: {}, cancelAnimationFrame() {},
        chrome: { runtime: { sendMessage: (dato, respuesta) => { mensajes.push(dato); respuesta?.({ ok: true }); } },
            storage: { local: { set: async () => {} } } },
        setTimeout: (accion, espera) => { const id = ++contador; temporizadores.set(id, { accion, tiempo: reloj + espera }); return id; },
        clearTimeout: id => temporizadores.delete(id)
    });
    function avanzar(ms) {
        const hasta = reloj + ms;
        for (;;) {
            const lista = [...temporizadores].filter(([, dato]) => dato.tiempo <= hasta).sort((a, b) => a[1].tiempo - b[1].tiempo);
            if (!lista.length) break;
            const [id, dato] = lista[0]; reloj = dato.tiempo; temporizadores.delete(id); dato.accion();
        }
        reloj = hasta;
    }
    const cargar = archivo => vm.runInContext(fs.readFileSync(archivo, 'utf8'), contexto, { filename: archivo });
    cargar(path.join(raiz, 'sitios.js'));
    cargar(path.join(raiz, 'classes/VoiceAssistant.js'));
    cargar(path.join(raiz, 'classes/KineticEngine.js'));
    vm.runInContext('globalThis.Voz = VoiceAssistant; globalThis.Cinetico = KineticEngine;', contexto);
    return { contexto, mensajes, desplazamientos, avanzar, cargar };
}

const entornoVoz = entorno();
const voz = new entornoVoz.contexto.Voz();
function orden(texto) { entornoVoz.mensajes.length = 0; voz.ejecutarComando(texto); return entornoVoz.mensajes[0]; }
comprobar('Sinónimos y alias completos abren portadas y conservan el destino', () => {
    for (const inicio of ['abre', 'abrir', 'ejecuta', 'ejecutar', 'entra a', 'ingresa en', 've a', 'visita', 'inicia']) {
        assert.equal(orden(inicio + ' Netflix').sitio, 'netflix');
    }
    assert.equal(orden('abre x').sitio, 'x');
    assert.equal(orden('ejecuta Whats App en una pestaña nueva').destino, 'pestana');
    assert.equal(orden('abre Chat GPT en otra ventana').destino, 'ventana');
    assert.equal(orden('podrías abrir Mercado Libre por favor').sitio, 'mercadolibre');
    assert.equal(orden('abre una nueva pestaña').accion, 'crear_pestana');
    assert.equal(orden('una nueva ventana').accion, 'crear_ventana');
    assert.equal(orden('abrir ventana').accion, 'crear_ventana');
    assert.equal(orden('cierra la ventana').accion, 'cerrar_ventana');
});
comprobar('Búsquedas admiten sitio antes/después y mantienen acentos', () => {
    for (const inicio of ['busca', 'buscar', 'búsqueda de', 'consulta', 'encuentra', 'haz una búsqueda de']) {
        const peticion = orden(inicio + ' Perú en YouTube');
        assert.equal(peticion.query, 'Perú'); assert.equal(peticion.sitio, 'youtube');
    }
    assert.equal(orden('busca en Mercado Libre teléfonos').query, 'teléfonos');
    assert.equal(orden('busca cómo subir archivos en Google').accion, 'buscar_inteligente');
    assert.equal(orden('busca gatos en una nueva pestaña').destino, 'pestana');
    assert.equal(orden('abre example.com').url, 'https://example.com');
    assert.equal(orden('abre javascript:alert(1)'), undefined);
});
comprobar('Dictado conserva texto y no interpreta navegación dentro del mensaje', () => {
    let recibido;
    voz.escribirEnCampo = (_, texto) => { recibido = texto; return true; };
    orden('Escribe Hola Perú, abre YouTube en una nueva ventana.');
    assert.equal(recibido, 'Hola Perú, abre YouTube en una nueva ventana.');
    assert.equal(entornoVoz.mensajes.length, 0);
});
comprobar('Abrir un botón vuelve a la acción local y no navega a Google', () => {
    let clics = 0;
    const boton = { innerText: 'Contacto', style: {}, getAttribute: () => null, getClientRects: () => [{}], focus() {}, click: () => clics++ };
    entornoVoz.contexto.document.querySelectorAll = () => [boton];
    assert.equal(orden('abrir Contacto'), undefined); assert.equal(clics, 1);
    orden('haz clic en Contacto'); assert.equal(clics, 2);
    entornoVoz.contexto.document.querySelectorAll = () => [];
});
comprobar('Navegación anclada no confunde palabras de consultas', () => {
    orden('bajar'); assert.equal(entornoVoz.desplazamientos.length, 1);
    orden('buscar subir archivo'); assert.equal(entornoVoz.desplazamientos.length, 1);
    assert.equal(orden('pestaña anterior').direccion, -1);
    assert.equal(orden('zoom normal').direccion, 0);
    assert.equal(orden('presiona enter'), undefined);
});
comprobar('Voz usa el cursor sólo si existe; Lite no recibe módulos cinéticos', () => {
    let accion;
    const completa = new entornoVoz.contexto.Voz(dato => { accion = dato; return true; });
    completa.ejecutarComando('anticlick'); assert.equal(accion, 'derecho');
    completa.ejecutarComando('siguiente clic derecho'); assert.equal(accion, 'preparar_derecho');
    voz.ejecutarComando('anticlick'); // Constructor Lite sin callback: no lanza excepción.
});

comprobar('Reconocimiento espera frases estables, evita duplicados y respeta el apagado', () => {
    const entornoReconocimiento = entorno();
    const motores = [];
    entornoReconocimiento.contexto.window.webkitSpeechRecognition = class {
        constructor() { motores.push(this); this.arranques = 0; }
        start() { this.arranques++; this.onstart?.(); }
        abort() { this.onend?.(); }
    };
    const asistente = new entornoReconocimiento.contexto.Voz();
    const ordenes = [];
    asistente.ejecutarComando = texto => ordenes.push(texto);
    asistente.setEstado(true);
    const motor = motores[0];
    const resultado = (texto, final) => Object.assign([{ transcript: texto }], { isFinal: final });
    motor.onresult({ resultIndex: 0, results: [resultado('Computadora abre', false)] });
    entornoReconocimiento.avanzar(600); assert.equal(ordenes.length, 0);
    motor.onresult({ resultIndex: 0, results: [resultado('Computadora abre YouTube', true)] });
    entornoReconocimiento.avanzar(600); assert.equal(ordenes[0], 'abre YouTube');
    motor.onresult({ resultIndex: 0, results: [resultado('Computadora abre YouTube', true)] });
    entornoReconocimiento.avanzar(600); assert.equal(ordenes.length, 1);
    asistente.textoReconocido = 'Computadora'; asistente.procesarFraseContinua();
    asistente.textoReconocido = 'escribe Computadora portátil'; asistente.procesarFraseContinua();
    assert.equal(ordenes[1], 'escribe Computadora portátil');
    motor.onend(); entornoReconocimiento.avanzar(301); assert.equal(motor.arranques, 2);
    motor.onresult({ resultIndex: 0, results: [resultado('Computadora abre YouTube', true)] });
    asistente.setEstado(false); entornoReconocimiento.avanzar(6000);
    assert.equal(motor.arranques, 2); assert.equal(ordenes.length, 2);
    asistente.setEstado(true);
    const segundo = motores[1];
    segundo.onerror({ error: 'not-allowed' }); segundo.onend(); entornoReconocimiento.avanzar(6000);
    assert.equal(segundo.arranques, 1);
});

comprobar('Voz recupera intermedios estables, ignora repeticiones y admite wake word separada', () => {
    const prueba = entorno();
    let motor;
    prueba.contexto.window.webkitSpeechRecognition = class {
        constructor() { motor = this; }
        start() { this.onstart?.(); }
        abort() {}
    };
    const asistente = new prueba.contexto.Voz();
    asistente.reproducirBeep = () => {};
    const ordenes = [];
    asistente.ejecutarComando = texto => ordenes.push(texto);
    asistente.setEstado(true);
    const resultado = (texto, final = false) => Object.assign([{ transcript: texto }], { isFinal: final });
    motor.onresult({ resultIndex: 0, results: [resultado('Computadora abre YouTube')] });
    prueba.avanzar(800);
    motor.onresult({ resultIndex: 0, results: [resultado('Computadora abre YouTube')] });
    prueba.avanzar(401); assert.equal(ordenes[0], 'abre YouTube');
    motor.onresult({ resultIndex: 0, results: [resultado('Computadora abre YouTube', true)] });
    prueba.avanzar(2000); assert.equal(ordenes.length, 1);
    motor.onstart();
    motor.onresult({ resultIndex: 0, results: [resultado('Computadora')] });
    prueba.avanzar(1201); assert.equal(asistente.esperandoComando, true);
    motor.onresult({ resultIndex: 0, results: [resultado('computadora, busca gatos')] });
    prueba.avanzar(1201); assert.equal(ordenes[1], 'busca gatos');
    assert.equal(ordenes.length, 2);
});

comprobar('Detección prioriza cabeza/torso y usa brazo visible sin exigir dedos', () => {
    const motor = new entornoVoz.contexto.Cinetico();
    const cuerpo = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0, presence: 0 }));
    for (const indice of [0, 11, 12, 13]) cuerpo[indice] = { x: 0.4, y: 0.4, visibility: 0.99, presence: 0.99 };
    assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'cabeza corporal');
    motor.modoControl = 'torso'; assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'torso');
    motor.modoControl = 'brazo_izquierdo'; assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'brazo_izquierdo:13');
    motor.fuenteControl = 'brazo_izquierdo:13'; cuerpo[15] = { x: 0.5, y: 0.6, visibility: 0.99, presence: 0.99 };
    assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'brazo_izquierdo:13');
    cuerpo[15].visibility = 0;
    cuerpo[13].visibility = 0; assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'brazo_izquierdo:11');
    cuerpo[11].visibility = 0; assert.equal(motor.elegirPunto({ cuerpo }), null);
    motor.modoControl = 'manos'; assert.equal(motor.elegirPunto({ manos: [{ x: 0.3, y: 0.4 }] }).fuente, 'mano:visible');
    assert.equal(motor.elegirPunto({ manos: [{ x: NaN, y: 0.4 }] }), null);
    motor.modoControl = 'cabeza';
    const rostro = [];
    rostro[1] = { x: 0.5, y: 0.5 }; rostro[33] = { x: 0.4, y: 0.4 }; rostro[263] = { x: 0.6, y: 0.4 };
    const centro = motor.elegirPunto({ rostro });
    rostro[1].x = 0.53;
    assert.ok(motor.elegirPunto({ rostro }).x < centro.x); // Espejo y giro relativo a ojos.
});

comprobar('Rostro bajo sigue visible y una mano incidental no cambia la referencia', () => {
    const motor = new entornoVoz.contexto.Cinetico();
    const rostro = [];
    rostro[1] = { x: 0.5, y: 0.95 }; rostro[33] = { x: 0.4, y: 0.85 }; rostro[263] = { x: 0.6, y: 0.85 };
    assert.equal(motor.elegirPunto({ rostro })?.fuente, 'cabeza');
    motor.fuenteControl = 'cabeza';
    assert.equal(motor.elegirPunto({ rostro, manos: [{ x: 0.3, y: 0.4 }] })?.fuente, 'cabeza');
    motor.modoControl = 'manos';
    assert.equal(motor.elegirPunto({ rostro, manos: [{ x: 0.3, y: 0.4 }] })?.fuente, 'mano:visible');
});

comprobar('Calibración usa imágenes distintas y una postura estable, con temblor y sin recorte vertical', () => {
    const motor = new entornoVoz.contexto.Cinetico(); motor.activa = true;
    motor.calibrar({ x: 40.25, y: 121.2 });
    assert.equal(motor.origenControl.y, 121.2);
    assert.equal(motor.origenControl.x, 40.25);
    for (let tiempo = 0; tiempo <= 2500; tiempo += 100) motor.aprenderPostura({ x: 40.25, y: 60 + tiempo * 0.025 }, tiempo);
    assert.equal(motor.neutroListo, false, 'No aprender movimiento aunque pase el temporizador');
    motor.calibrar({ x: 40.25, y: 121.2 });
    for (let paso = 0; paso < 50; paso++) motor.aprenderPostura({ x: 40.25, y: 121.2 }, 5000);
    assert.equal(motor.neutroListo, false, 'Una imagen repetida no es una postura estable');
    for (let paso = 1; paso <= 12; paso++) {
        const ruido = paso % 2 ? 0.8 : -0.8;
        motor.aprenderPostura({ x: 40.25 + ruido, y: paso === 4 ? 100 : 121.2 + ruido }, 5000 + paso * 100);
        if (motor.neutroListo) break;
    }
    assert.equal(motor.neutroListo, true);
    assert.ok(Math.abs(motor.origenControl.y - 121.2) <= 0.8 + 1e-9);
    assert.equal(motor.armado, false);
    assert.equal(motor.puntoBase.y, 60);
});

function camaraSimulada() {
    const motor = new entornoVoz.contexto.Cinetico();
    const clics = [];
    motor.activa = true; motor.visionLista = true;
    motor.ctx = { setTransform() {}, drawImage() {} };
    motor.videoEl = { readyState: 2, currentTime: 0 };
    motor.solicitarModelo = motor.programarFotograma = motor.actualizarHover = () => {};
    motor.dibujarHUD = texto => { motor.estadoPrueba = texto; };
    motor.elegirPunto = datos => datos.punto;
    motor.elementoBajoCursor = () => ({});
    motor.hacerClick = tipo => clics.push(tipo);
    const fotograma = (tiempo, y = 60, fuente = 'cabeza', marca = tiempo) => {
        motor.videoEl.currentTime++;
        motor.numeroFotograma++;
        motor.deteccion = { tiempo: marca, punto: y == null ? null : { x: 80, y, fuente } };
        motor.bucleRender(tiempo);
    };
    for (let tiempo = 0; tiempo <= 1200; tiempo += 100) fotograma(tiempo);
    assert.equal(motor.neutroListo, true);
    return { motor, fotograma, clics };
}

comprobar('Pérdida breve conserva referencia; pérdida larga y descanso aceptan una postura más baja sin clic', () => {
    const { motor, fotograma, clics } = camaraSimulada();
    fotograma(1300, null); fotograma(1500, 68);
    assert.equal(motor.origenControl.y, 60, 'Una oclusión breve no desplaza la referencia');
    const posicion = motor.posY;
    for (let tiempo = 1600; tiempo <= 3000; tiempo += 100) fotograma(tiempo, null);
    for (let tiempo = 3100; tiempo <= 4300; tiempo += 100) fotograma(tiempo, 90);
    assert.equal(motor.origenControl.y, 90);
    assert.equal(motor.posY, posicion, 'Calibrar no mueve el cursor');
    assert.equal(clics.length, 0);
    motor.ejecutarAccion('pausar');
    fotograma(4400, 100);
    motor.ejecutarAccion('reanudar');
    for (let tiempo = 4500; tiempo <= 5700; tiempo += 100) fotograma(tiempo, 100);
    assert.equal(motor.origenControl.y, 100);
    assert.equal(motor.posY, posicion);
    assert.equal(clics.length, 0);
});

comprobar('Recuperación en borde no exige volver a levantar el cuerpo y conserva navegación sostenida', () => {
    const { motor, fotograma, clics } = camaraSimulada();
    const referencia = motor.origenControl.y;
    for (let tiempo = 1300; tiempo <= 1800; tiempo += 100) fotograma(tiempo, 78);
    assert.equal(motor.origenControl.y, referencia, 'Mantener una dirección en la página no debe frenarla');
    for (let tiempo = 1900; tiempo <= 7000; tiempo += 100) fotograma(tiempo, 78);
    assert.equal(motor.posY, 899);
    assert.equal(motor.origenControl.y, 78, 'Descansar en borde recupera la postura actual');
    assert.equal(clics.length, 0);
    for (let tiempo = 7100; tiempo <= 7600; tiempo += 100) fotograma(tiempo, 66);
    assert.ok(motor.posY < 899, 'Un movimiento pequeño desde la nueva postura vuelve hacia arriba');
});

comprobar('Temblor es idempotente y los movimientos pequeños requieren menos desplazamiento', () => {
    const motor = new entornoVoz.contexto.Cinetico(); motor.activa = true;
    motor.ejecutarAccion('temblor'); motor.ejecutarAccion('temblor');
    assert.equal(motor.zonaMuerta, 0.07);
    motor.ejecutarAccion('sin_temblor'); assert.equal(motor.zonaMuerta, 0.045);
    const normal = motor.normalizarControl({ x: 87, y: 60 }).x;
    motor.ejecutarAccion('movimiento_reducido');
    assert.ok(motor.normalizarControl({ x: 87, y: 60 }).x > normal);
    motor.ejecutarAccion('movimiento_normal'); assert.equal(motor.amplitudControl, 1);
    const acciones = [];
    const asistente = new entornoVoz.contexto.Voz(accion => { acciones.push(accion); return true; });
    for (const orden of ['activar cursor', 'postura cómoda', 'descansar', 'continuar cursor', 'activar temblor', 'desactivar temblor', 'movimientos pequeños', 'movimientos normales', 'siguiente clic derecho', 'desactivar cursor']) asistente.ejecutarComando(orden);
    assert.deepEqual(acciones, ['activar', 'calibrar', 'pausar', 'reanudar', 'temblor', 'sin_temblor', 'movimiento_reducido', 'movimiento_normal', 'preparar_derecho', 'desactivar']);
});

comprobar('Un salto aislado no mueve ni arma el cursor; una dirección deliberada sí', () => {
    const { motor, fotograma, clics } = camaraSimulada();
    const inicial = motor.posY;
    fotograma(1300, 110);
    fotograma(1400, 60); fotograma(1500, 60);
    assert.equal(motor.posY, inicial);
    assert.equal(motor.armado, false);
    assert.equal(clics.length, 0);
    for (let tiempo = 1600; tiempo <= 2200; tiempo += 100) fotograma(tiempo, 78);
    assert.ok(motor.posY > inicial);
    assert.equal(motor.armado, true);
    const breve = new entornoVoz.contexto.Cinetico();
    breve.elementoBajoCursor = () => ({}); breve.hacerClick = () => { throw new Error('Clic por excursión breve'); };
    for (let tiempo = 0; tiempo < 120; tiempo += 30) breve.actualizarControl({ x: 110, y: 60 }, tiempo, 30);
    for (let tiempo = 120; tiempo < 2200; tiempo += 30) breve.actualizarControl({ x: 80, y: 60 }, tiempo, 30);
    assert.equal(breve.armado, false);
});

comprobar('Preferencias cinéticas sobreviven al cambio de página y no guardan postura ni cámara', () => {
    const prueba = entorno(); let guardado;
    prueba.contexto.chrome.storage.local.set = async ajustes => { guardado = ajustes; };
    const motor = new prueba.contexto.Cinetico(); motor.activa = true;
    motor.ejecutarAccion('control_torso'); motor.ejecutarAccion('temblor'); motor.ejecutarAccion('movimiento_reducido'); motor.ejecutarAccion('lento');
    const siguiente = new prueba.contexto.Cinetico(); siguiente.aplicarAjustes(guardado.ajustesCineticos);
    assert.equal(siguiente.modoControl, 'torso'); assert.equal(siguiente.zonaMuerta, 0.07);
    assert.equal(siguiente.amplitudControl, 0.55); assert.equal(siguiente.sensibilidad, 0.8);
    assert.deepEqual(Object.keys(guardado.ajustesCineticos).sort(), ['amplitud', 'modo', 'temblor', 'velocidad']);
    siguiente.aplicarAjustes({ modo: 'invalido', velocidad: Infinity, amplitud: -3, temblor: 'si' });
    assert.equal(siguiente.modoControl, 'torso'); assert.equal(siguiente.sensibilidad, 0.8); assert.equal(siguiente.amplitudControl, 0.55);
    siguiente.evaluarEstado = () => {}; siguiente.bloqueada = true;
    siguiente.ejecutarAccion('activar'); assert.equal(siguiente.permitida, true); assert.equal(siguiente.bloqueada, false);
    siguiente.ejecutarAccion('desactivar'); assert.equal(siguiente.permitida, false); assert.equal(guardado.ojos, false);
});

comprobar('Abrir popup no suspende sensores; visibilidad real controla ambas variantes', () => {
    for (const carpeta of [raiz, lite]) {
        const controlador = fs.readFileSync(path.join(carpeta, 'content_script.js'), 'utf8');
        assert.doesNotMatch(controlador, /document.hasFocus|addEventListener\('blur'/);
        assert.doesNotMatch(controlador, /voiceAssistantNuevo\.setEstado\(true\)|voiceAssistantNuevo\.actualizarVisibilidad/);
        if (carpeta === raiz) { assert.match(controlador, /visibilitychange/); assert.match(controlador, /pagehide/); }
    }
    const manifiesto = JSON.parse(fs.readFileSync(path.join(raiz, 'manifest.json'), 'utf8'));
    assert.match(manifiesto.content_security_policy.extension_pages, /wasm-unsafe-eval/);
    assert.equal(manifiesto.web_accessible_resources, undefined);
    assert.ok(manifiesto.permissions.includes('scripting'));
    assert.ok(fs.statSync(path.join(raiz, 'vision/modelos/rostro.task')).size > 1000000);
});

function imagen(dx = 0, dy = 0, luz = 0) {
    const grises = new Float32Array(160 * 120);
    for (let y = 0; y < 120; y++) for (let x = 0; x < 160; x++) {
        const valor = Math.imul(x - dx + 19, 73856093) ^ Math.imul(y - dy + 31, 19349663);
        grises[y * 160 + x] = 80 + (valor >>> 0) % 90 + luz;
    }
    return grises;
}
comprobar('Seguimiento conserva postura y tolera cambios uniformes de iluminación', () => {
    const motor = new entornoVoz.contexto.Cinetico();
    motor.plantilla = motor.extraerParche(imagen(), 80, 60);
    for (const [dx, dy] of [[3, -2], [5, 1], [1, 0], [0, 0]]) {
        const punto = motor.seguirPunto(imagen(dx, dy, 25));
        assert.ok(punto); assert.equal(punto.x, 80 + dx); assert.equal(punto.y, 60 + dy);
        motor.puntoActual = punto;
    }
    assert.equal(motor.seguirPunto(new Float32Array(160 * 120).fill(100)), null);
    const repetitiva = new Float32Array(160 * 120);
    for (let indice = 0; indice < repetitiva.length; indice++) repetitiva[indice] = 80 + (indice % 4) * 20;
    motor.plantilla = motor.extraerParche(repetitiva, 80, 60);
    assert.equal(motor.seguirPunto(repetitiva), null);
});

function simularDwell(fps) {
    const motor = new entornoVoz.contexto.Cinetico();
    const clics = [];
    const objetivo = {};
    motor.elementoBajoCursor = () => objetivo;
    motor.hacerClick = tipo => clics.push({ tiempo, tipo });
    const intervalo = 1000 / fps;
    let tiempo = 0;
    const mover = (duracion, punto) => {
        for (let paso = 0; paso < Math.round(duracion / intervalo); paso++) {
            tiempo += intervalo; motor.actualizarControl(punto, tiempo, intervalo);
        }
    };
    mover(1300, { x: 80, y: 60 }); assert.equal(clics.length, 0);
    mover(400, { x: 106, y: 60 }); mover(2500, { x: 80, y: 60 });
    assert.equal(clics.length, 1);
    motor.cancelarFijacion(true); mover(1500, { x: 80, y: 60 }); assert.equal(clics.length, 1);
    motor.tipoClick = 'derecho'; mover(400, { x: 106, y: 60 }); mover(1600, { x: 80, y: 60 });
    assert.equal(clics.length, 2); assert.equal(clics[1].tipo, 'derecho');
    return clics[0].tiempo;
}
comprobar('Dwell real a 30/60 FPS: un clic por entrada, recuperación y clic derecho', () => {
    assert.ok(Math.abs(simularDwell(30) - simularDwell(60)) < 60);
});
comprobar('El siguiente clic derecho conserva el modo seleccionado', () => {
    const motor = new entornoVoz.contexto.Cinetico();
    motor.armado = true;
    motor.objetivoFijado = {}; motor.inicioFijacion = 0;
    motor.elementoBajoCursor = () => motor.objetivoFijado;
    motor.hacerClick = () => { motor.tipoClick = 'derecho'; };
    motor.actualizarControl({ x: 80, y: 60 }, 1000, 33);
    assert.equal(motor.tipoClick, 'derecho');
});
comprobar('Cambiar de objetivo reinicia el dwell aunque el cursor siga en la zona segura', () => {
    const motor = new entornoVoz.contexto.Cinetico();
    const objetivos = [{}, {}]; let objetivo = objetivos[0]; let clics = 0;
    motor.armado = true;
    motor.elementoBajoCursor = () => objetivo;
    motor.hacerClick = () => clics++;
    const punto = { x: 80, y: 60 };
    motor.actualizarControl(punto, 0, 33); motor.actualizarControl(punto, 600, 33);
    objetivo = objetivos[1]; motor.actualizarControl(punto, 700, 33);
    motor.actualizarControl(punto, 1300, 33); assert.equal(clics, 0);
    motor.actualizarControl(punto, 1700, 33); assert.equal(clics, 1);
});

comprobar('Centro fijo y respuesta simétrica aunque la postura se calibre fuera del centro', () => {
    const desplazamientos = [];
    for (const [dx, dy] of [[0.12, 0], [-0.12, 0], [0, 0.12], [0, -0.12]]) {
        const motor = new entornoVoz.contexto.Cinetico();
        motor.origenControl = { x: 35, y: 90 };
        const centro = JSON.stringify(motor.puntoBase);
        motor.elementoBajoCursor = () => ({});
        const inicio = { x: motor.posX, y: motor.posY };
        const punto = { x: 35 + dx * motor.ancho, y: 90 + dy * motor.alto };
        for (let tiempo = 0; tiempo < 1000; tiempo += 33) motor.actualizarControl(punto, tiempo, 33);
        desplazamientos.push(Math.hypot(motor.posX - inicio.x, motor.posY - inicio.y));
        assert.equal(JSON.stringify(motor.puntoBase), centro);
        assert.equal(motor.puntoBase.x, 80); assert.equal(motor.puntoBase.y, 60);
    }
    for (const distancia of desplazamientos) assert.ok(Math.abs(distancia - desplazamientos[0]) < 0.001);
});

async function principal() {
    const pruebaLectura = entorno();
    pruebaLectura.contexto.document.addEventListener = () => {};
    pruebaLectura.contexto.document.removeEventListener = () => {};
    pruebaLectura.cargar(path.join(raiz, 'classes/TalkBack.js'));
    const lectorAnterior = new pruebaLectura.contexto.TalkBack();
    lectorAnterior.activo = true; lectorAnterior.elementoActual = { style: {} };
    pruebaLectura.contexto.chrome.runtime.sendMessage = () => { throw new Error('Extension context invalidated'); };
    comprobar('Actualizar con TalkBack leyendo permite retirar sus listeners y contorno', () => {
        assert.doesNotThrow(() => lectorAnterior.destruir());
        assert.equal(lectorAnterior.activo, false); assert.equal(lectorAnterior.elementoActual, null);
    });
    const pruebaCaptura = entorno();
    pruebaCaptura.contexto.chrome.runtime.onMessage = { addListener() {} };
    pruebaCaptura.contexto.window.addEventListener = () => {};
    pruebaCaptura.cargar(path.join(raiz, 'voz/camara.js'));
    const captura = vm.runInContext('camaraCentral', pruebaCaptura.contexto);
    let tamano, transferida;
    pruebaCaptura.contexto.createImageBitmap = async (_, opciones) => { tamano = opciones; return { close() {} }; };
    captura.procesar = true; captura.flujo = { getTracks: () => [] }; captura.visionLista = true;
    captura.video = { readyState: 2, currentTime: 1, videoWidth: 1920, videoHeight: 1080, pause() {} };
    captura.trabajador = { postMessage: datos => { transferida = datos; }, terminate() {} };
    await captura.capturar(captura.generacion);
    comprobar('Cámara central reduce HD sin deformar proporción y mantiene una inferencia en vuelo', () => {
        assert.equal(tamano.resizeWidth, 320); assert.equal(tamano.resizeHeight, 180);
        assert.equal(transferida.tipo, 'imagen'); assert.equal(captura.ocupada, true);
    });
    let vistaPendiente, siguienteVista, cancelada = false, vistas = 0;
    const temporizar = pruebaCaptura.contexto.setTimeout;
    const cancelar = pruebaCaptura.contexto.clearTimeout;
    pruebaCaptura.contexto.setTimeout = (accion, ms) => {
        if (ms === 1000 / 30) { siguienteVista = accion; return 7; }
        return temporizar(accion, ms);
    };
    pruebaCaptura.contexto.clearTimeout = id => { if (id === 7) cancelada = true; cancelar(id); };
    captura.contextoVista = { setTransform() {}, drawImage() {}, resetTransform() {} };
    captura.canvasVista = { toDataURL: () => 'data:image/jpeg;base64,vista' };
    pruebaCaptura.contexto.chrome.runtime.sendMessage = datos => {
        assert.equal(datos.accion, 'camara_vista'); vistas++;
        return new Promise(resolver => { vistaPendiente = resolver; });
    };
    captura.previsualizar(captura.generacion);
    const primeraVista = siguienteVista();
    await siguienteVista();
    comprobar('Vista en vivo independiente de inferencia ocupada y sin acumular envíos', () => {
        assert.equal(captura.ocupada, true); assert.equal(vistas, 1);
    });
    vistaPendiente(); await primeraVista;
    captura.video.currentTime = 2;
    const segundaVista = siguienteVista();
    assert.equal(vistas, 2); vistaPendiente(); await segundaVista;
    captura.detener();
    assert.equal(cancelada, true, 'Apagar cancela la vista previa');
    await siguienteVista(); assert.equal(vistas, 2, 'Un callback tardío no publica imágenes');
    let resolver, detenciones = 0, avisarSolicitud;
    const solicitud = new Promise(respuesta => { avisarSolicitud = respuesta; });
    pruebaCaptura.contexto.navigator.permissions = { query: async () => ({ state: 'granted' }) };
    pruebaCaptura.contexto.navigator.mediaDevices = { getUserMedia: () => new Promise(respuesta => { resolver = respuesta; avisarSolicitud(); }) };
    captura.deseada = true;
    const inicio = captura.iniciar(); await solicitud;
    captura.deseada = false; captura.detener();
    resolver({ getTracks: () => [{ stop: () => detenciones++ }] });
    await inicio;
    comprobar('Apagar cámara central durante un permiso pendiente libera el flujo tardío', () => {
        assert.equal(detenciones, 1); assert.equal(captura.flujo, null); assert.equal(captura.iniciando, false);
    });

    comprobar('Archivos compartidos idénticos y Lite sin cámara/TalkBack', () => {
        for (const [completa, ligera] of [['sitios.js', 'sitios.js'], ['classes/VoiceAssistant.js', 'clases/VoiceAssistant.js'], ['background.js', 'background.js'], ['classes/FiltrosDaltonismo.js', 'clases/FiltrosDaltonismo.js'], ['voz/escucha.js','voz/escucha.js'], ['voz/permisos.js','voz/permisos.js'], ['voz/popup.js','voz/popup.js']]) {
            assert.equal(fs.readFileSync(path.join(raiz, completa), 'utf8'), fs.readFileSync(path.join(lite, ligera), 'utf8'));
        }
        for (const carpeta of [raiz, lite]) {
            const manifiesto = JSON.parse(fs.readFileSync(path.join(carpeta, 'manifest.json'), 'utf8'));
            assert.equal(manifiesto.manifest_version, 3);
            for (const archivo of manifiesto.content_scripts[0].js) assert.ok(fs.existsSync(path.join(carpeta, archivo)));
            assert.equal(manifiesto.content_scripts[0].js[0], 'sitios.js');
        }
        assert.doesNotMatch(fs.readFileSync(path.join(lite, 'manifest.json'), 'utf8'), /KineticEngine|TalkBack/);
        assert.doesNotMatch(fs.readFileSync(path.join(lite, 'content_script.js'), 'utf8'), /kineticEngine|talkBack/);
    });
    // Ejecutar el service worker real con Chrome simulado, incluido el contrato asíncrono.
    const entornoFondo = entorno();
    const aperturas = [];
    let manejador;
    const chrome = entornoFondo.contexto.chrome;
    const eventoChrome = { addListener() {} };
    chrome.storage = { onChanged: eventoChrome };
    chrome.runtime.getManifest = () => JSON.parse(fs.readFileSync(path.join(raiz, 'manifest.json'), 'utf8'));
    chrome.runtime.onStartup = eventoChrome; chrome.runtime.onInstalled = eventoChrome;
    chrome.runtime.onMessage = { addListener: accion => { manejador = accion; } };
    chrome.tabs = { update: async (id, datos) => aperturas.push({ id, ...datos }), create: async datos => aperturas.push(datos),
        remove: async id => aperturas.push({ cerrar: id }), reload: async () => {}, goBack: async () => {}, goForward: async () => {},
        query: async () => [{ id: 10, index: 0 }, { id: 20, index: 1 }], getZoom: async () => 1, setZoom: async () => {} };
    chrome.tabs.onActivated = eventoChrome; chrome.tabs.onUpdated = eventoChrome;
    chrome.windows = { onFocusChanged: eventoChrome, onRemoved: eventoChrome, remove: async id => aperturas.push({ cerrarVentana: id }), create: async datos => aperturas.push(datos) };
    entornoFondo.contexto.importScripts = () => {}; // Catálogo ya cargado en este contexto.
    entornoFondo.cargar(path.join(raiz, 'background.js'));
    const enviar = peticion => new Promise(respuesta => assert.equal(manejador(peticion, { tab: { id: 10, windowId: 1 } }, respuesta), true));
    for (const sitio of ['youtube', 'google', 'github', 'twitch']) {
        assert.equal((await enviar({ accion: 'buscar_inteligente', sitio, query: '', destino: 'actual' })).ok, true);
        assert.doesNotMatch(aperturas.at(-1).url, /search|results/);
    }
    await enviar({ accion: 'buscar_inteligente', sitio: 'maps', query: 'Lima Perú', destino: 'pestana' });
    assert.match(aperturas.at(-1).url, /api=1&query=Lima%20Per%C3%BA/);
    await enviar({ accion: 'buscar_inteligente', sitio: 'instagram', query: 'arte', destino: 'actual' });
    assert.match(aperturas.at(-1).url, /arte%20site%3Awww.instagram.com/);
    assert.equal((await enviar({ accion: 'abrir_url', url: 'javascript:alert(1)' })).ok, false);
    await enviar({ accion: 'cerrar_ventana' }); assert.equal(aperturas.at(-1).cerrarVentana, 1);
    await enviar({ accion: 'cambiar_pestana', direccion: -1 }); assert.equal(aperturas.at(-1).id, 20);
    comprobaciones++; console.log('✓ Service worker: portadas, búsqueda, validación, ventanas y pestañas');
    console.log(`${comprobaciones} grupos de regresiones correctos.`);
}
principal().catch(error => { console.error(error); process.exitCode = 1; });
