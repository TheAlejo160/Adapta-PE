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
        chrome: { runtime: { sendMessage: (dato, respuesta) => { mensajes.push(dato); respuesta?.({ ok: true }); return Promise.resolve({ ok: true }); } },
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
comprobar('Filtros conservan Docs fuera de la raíz y se retiran en ambas variantes', () => {
    for (const archivo of [path.join(raiz, 'classes/FiltrosDaltonismo.js'), path.join(lite, 'clases/FiltrosDaltonismo.js')]) {
        const prueba = entorno(), nodos = new Map();
        prueba.contexto.window.top = prueba.contexto.window;
        const documento = prueba.contexto.document;
        documento.getElementById = id => nodos.get(id);
        documento.createElement = () => ({ remove() { nodos.delete(this.id); } });
        documento.head.appendChild = nodo => nodos.set(nodo.id, nodo);
        let limpiezasRaiz = 0;
        documento.documentElement.style = { removeProperty() { limpiezasRaiz++; } };
        documento.documentElement.insertAdjacentHTML = () => nodos.set('adapta-pe-filtros-svg', {
            remove() { nodos.delete('adapta-pe-filtros-svg'); }
        });
        prueba.cargar(archivo);
        const filtros = new prueba.contexto.FiltrosDaltonismo();
        for (const [url, superficie] of [
            ['https://docs.google.com/document/d/prueba/edit', 'body'],
            ['https://docs.google.com/spreadsheets/d/prueba/edit', 'html'],
            ['https://example.org/document/d/prueba/edit', 'html'],
            ['https://docs.google.com.example.org/document/d/prueba/edit', 'html']
        ]) {
            prueba.contexto.location = new URL(url);
            filtros.aplicar('deuteranomalia');
            assert.ok(nodos.get(filtros.idStyle).textContent.trim().startsWith(superficie + ', :fullscreen:not(iframe[data-adapta-pe-filtro-interno]), ::backdrop'));
            filtros.aplicar('ninguno');
            assert.equal(nodos.size, 0, 'Quitar filtro elimina SVG y regla CSS');
        }
        const marco = new prueba.contexto.FiltrosDaltonismo(true), limpiezasAntes = limpiezasRaiz;
        marco.aplicar('protanopia');
        assert.ok(nodos.get(marco.idStyle).textContent.trim().startsWith(':fullscreen:not(iframe[data-adapta-pe-filtro-interno]), ::backdrop'));
        marco.aplicar('ninguno');
        assert.equal(limpiezasRaiz, limpiezasAntes, 'El marco conserva el filtro propio de su raíz');
        assert.equal(nodos.size, 0);
        prueba.contexto.window.top = {};
        const externo = new prueba.contexto.FiltrosDaltonismo();
        externo.aplicar('protanopia'); externo.aplicar('ninguno');
        assert.equal(limpiezasRaiz, limpiezasAntes, 'El marco externo también conserva estilos de la web');
    }
});
const voz = new entornoVoz.contexto.Voz();
function orden(texto) { entornoVoz.mensajes.length = 0; voz.ejecutarComando(texto); return entornoVoz.mensajes[0]; }
comprobar('Voz elige y anima mascotas sin interceptar búsquedas ni dictado', () => {
    assert.equal(orden('mascota Tinku').nombre, 'tinku');
    assert.equal(orden('elige la mascota Cuchu').nombre, 'cuchu');
    assert.equal(orden('cambia a mascota Yati').nombre, 'yati');
    for (const variante of ['Y Atti', 'Ya ti', 'Y-Ati', 'Yaty', 'Yate']) assert.equal(orden('mascota ' + variante).nombre, 'yati');
    for (const variante of ['Tin cu', 'Tinko']) assert.equal(orden('elige mascota ' + variante).nombre, 'tinku');
    for (const variante of ['Cu chu', 'Kuchu', 'Cucho']) assert.equal(orden('mascota ' + variante).nombre, 'cuchu');
    assert.equal(orden('busca mascota Y Atti').accion, 'buscar_inteligente');
    for (const [comando, estado] of [['saluda mascota', 'wave'], ['duerme mascota', 'sleep'], ['despierta mascota', 'wake']]) assert.equal(orden(comando).estado, estado);
    assert.equal(orden('oculta la mascota').nombre, 'ninguna');
    assert.equal(orden('busca mascota Tinku').accion, 'buscar_inteligente');
    assert.equal(orden('mascota inexistente'), undefined);
});
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
    assert.equal(motor.modoControl, 'cabeza');
    motor.modoControl = 'automatico';
    const cuerpo = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0, presence: 0 }));
    for (const indice of [0, 11, 12]) cuerpo[indice] = { x: 0.4, y: 0.4, visibility: 0.99, presence: 0.99 };
    assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'cabeza corporal');
    motor.modoControl = 'torso'; assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'torso');
    cuerpo[13] = { x: 0.4, y: 0.4, visibility: 0.99, presence: 0.99 };
    motor.modoControl = 'brazo_izquierdo'; assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'brazo_izquierdo:13');
    motor.fuenteControl = 'brazo_izquierdo:13'; cuerpo[15] = { x: 0.5, y: 0.6, visibility: 0.99, presence: 0.99 };
    assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'brazo_izquierdo:13');
    cuerpo[15].visibility = 0;
    cuerpo[13].visibility = 0; assert.equal(motor.elegirPunto({ cuerpo }), null, 'Hombro aislado no controla un brazo');
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

comprobar('Extremidades usan codo sin dedos, priorizan mano y excluyen cabeza/torso', () => {
    const motor = new entornoVoz.contexto.Cinetico();
    const rostro = [];
    rostro[1] = { x: 0.5, y: 0.5 }; rostro[33] = { x: 0.4, y: 0.4 }; rostro[263] = { x: 0.6, y: 0.4 };
    const cuerpo = [];
    cuerpo[13] = { x: 0.3, y: 0.6, visibility: 0.9, presence: 0.9 };
    const manos = [{ x: 0.4, y: 0.5 }];
    assert.equal(motor.elegirPunto({ rostro, cuerpo, manos }).fuente, 'cabeza');
    motor.modoControl = 'automatico';
    assert.equal(motor.elegirPunto({ rostro, cuerpo, manos }).fuente, 'mano:visible');
    assert.equal(motor.elegirPunto({ rostro, cuerpo }).fuente, 'brazo_izquierdo:13');
    motor.modoControl = 'manos'; motor.fuenteControl = 'brazo_izquierdo:13';
    assert.equal(motor.elegirPunto({ rostro, cuerpo, manos }).fuente, 'mano:visible');
    cuerpo[13].x = 2;
    assert.equal(motor.elegirPunto({ rostro, cuerpo }), null);
    cuerpo[0] = cuerpo[11] = cuerpo[12] = { x: 0.5, y: 0.5, visibility: 0.99 };
    assert.equal(motor.elegirPunto({ rostro, cuerpo }), null);
});

comprobar('Rostro bajo sigue visible y automático propone mano sin tocar la calibración', () => {
    const motor = new entornoVoz.contexto.Cinetico();
    const rostro = [];
    rostro[1] = { x: 0.5, y: 0.95 }; rostro[33] = { x: 0.4, y: 0.85 }; rostro[263] = { x: 0.6, y: 0.85 };
    assert.equal(motor.elegirPunto({ rostro })?.fuente, 'cabeza');
    motor.fuenteControl = 'cabeza';
    motor.modoControl = 'automatico';
    const origen = JSON.stringify(motor.origenControl);
    assert.equal(motor.elegirPunto({ rostro, manos: [{ x: 0.3, y: 0.4 }] })?.fuente, 'mano:visible');
    assert.equal(JSON.stringify(motor.origenControl), origen);
    motor.modoControl = 'manos';
    assert.equal(motor.elegirPunto({ rostro, manos: [{ x: 0.3, y: 0.4 }] })?.fuente, 'mano:visible');
});

comprobar('Palma abierta y puño usan la misma muñeca; Pose mantiene esa fuente al perder dedos', () => {
    const motor = new entornoVoz.contexto.Cinetico(); motor.modoControl = 'manos';
    const manos = Array.from({ length: 21 }, () => ({ x: 0.4, y: 0.4 }));
    const abierta = motor.elegirPunto({ manos, mano: 'Left' });
    for (let indice = 1; indice < manos.length; indice++) manos[indice] = { x: 0.6, y: 0.6 };
    assert.equal(JSON.stringify(motor.elegirPunto({ manos, mano: 'Left' })), JSON.stringify(abierta));
    motor.fuenteControl = abierta.fuente; motor.puntoActual = abierta;
    const cuerpo = [];
    cuerpo[15] = { x: 0.41, y: 0.4, visibility: 0.99, presence: 0.99 };
    assert.equal(motor.elegirPunto({ cuerpo }).fuente, abierta.fuente);
    cuerpo[15].visibility = 0;
    assert.equal(motor.elegirPunto({ cuerpo }), null, 'No inventar una muñeca que ambos modelos pierden');
});

comprobar('Automático nunca elige torso ni hombros al inclinarse', () => {
    const motor = new entornoVoz.contexto.Cinetico(); motor.modoControl = 'automatico';
    const cuerpo = [];
    cuerpo[11] = { x: 0.4, y: 0.6, visibility: 0.99 };
    cuerpo[12] = { x: 0.6, y: 0.7, visibility: 0.99 };
    assert.equal(motor.elegirPunto({ cuerpo }), null);
    motor.modoControl = 'torso'; assert.equal(motor.elegirPunto({ cuerpo }).fuente, 'torso');
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

comprobar('Sólo cabeza aprende postura; extremidades conservan centro fijo al ajustar, reanudar y llegar al borde', () => {
    for (const modo of ['manos', 'zona']) {
        const prueba = entorno(); const motor = new prueba.contexto.Cinetico(); motor.activa = true;
        motor.aplicarAjustes({ modo });
        assert.equal(motor.neutroListo, true);
        for (let tiempo = 0; tiempo <= 2000; tiempo += 100) motor.aprenderPostura({ x: 25, y: 100 }, tiempo);
        const plantilla = {}; motor.plantilla = plantilla;
        for (const accion of ['calibrar', 'movimiento_reducido', 'pausar', 'reanudar']) assert.equal(motor.ejecutarAccion(accion), true);
        motor.aplicarAjustes({ amplitud: 1 });
        assert.equal(motor.plantilla, plantilla, 'Los ajustes no pierden textura ni exigen adquirirla otra vez');
        assert.equal(motor.neutroListo, true); assert.equal(motor.origenControl.x, 80); assert.equal(motor.origenControl.y, 60);
        motor.elementoBajoCursor = () => null; motor.posX = 1599; motor.puntoActual = { x: 110, y: 60 };
        for (let tiempo = 2100; tiempo <= 5000; tiempo += 100) motor.actualizarControl(motor.puntoActual, tiempo, 50);
        assert.equal(motor.origenControl.x, 80); assert.equal(motor.neutroListo, true);
        assert.equal(prueba.mensajes.filter(dato => dato.accion === 'hablar').length, 0);
    }
});

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
    assert.equal(siguiente.modoControl, 'cabeza'); assert.equal(siguiente.zonaMuerta, 0.07);
    assert.equal(siguiente.amplitudControl, 0.55); assert.equal(siguiente.sensibilidad, 0.8);
    assert.deepEqual(Object.keys(guardado.ajustesCineticos).sort(), ['amplitud', 'modo', 'temblor', 'velocidad']);
    siguiente.aplicarAjustes({ modo: 'invalido', velocidad: Infinity, amplitud: -3, temblor: 'si' });
    assert.equal(siguiente.modoControl, 'cabeza'); assert.equal(siguiente.sensibilidad, 0.8); assert.equal(siguiente.amplitudControl, 0.55);
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
    assert.ok(manifiesto.web_accessible_resources.every(regla => regla.resources.every(recurso => recurso.startsWith('mascotas/'))), 'Sólo sprites y motor de mascota son públicos; visión permanece privada');
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
    motor.plantilla = motor.extraerParche(imagen(), 80, 60); motor.puntoActual = { x: 80, y: 60 };
    const punto = motor.seguirPunto(imagen(5, -3).map(valor => valor * 0.6 + 40));
    assert.ok(punto); assert.equal(punto.x, 85); assert.equal(punto.y, 57);
});

function imagenExtremidad(dx = 0, dy = 0, luz = 0) {
    const grises = new Float32Array(19200).fill(180 + luz), textura = imagen(dx, dy, luz);
    for (let y = 30; y < 110; y++) for (let x = 64; x < 96; x++) grises[y * 160 + x] = 100 + (x * y) % 90 + luz;
    for (let y = 78 + dy; y < 102 + dy; y++) for (let x = 16 + dx; x < 46 + dx; x++) grises[y * 160 + x] = textura[y * 160 + x];
    return grises;
}
comprobar('Textura móvil fuera del centro se adquiere sin torso, tolera pérdida breve y desarma clic', () => {
    const prueba = entorno(); const motor = new prueba.contexto.Cinetico();
    motor.activa = true; motor.modoControl = 'zona'; motor.grisesRecibidos = true;
    motor.dibujarHUD = motor.actualizarHover = () => {};
    const fotograma = (tiempo, grises, marca = tiempo) => { motor.grises.set(grises); motor.deteccion = { tiempo: marca }; motor.controlarZona(tiempo); };
    fotograma(0, imagenExtremidad()); assert.equal(motor.plantilla, null);
    fotograma(50, imagenExtremidad(2)); assert.ok(motor.plantilla);
    assert.ok(motor.puntoActual.x < 52 && motor.puntoActual.y > 74, 'Sigue extremidad baja, no torso fijo');
    const origen = { ...motor.origenControl };
    for (let indice = 0; indice < 10; indice++) fotograma(50 + indice * 10, imagenExtremidad(2), 50);
    assert.equal(motor.neutroListo, true, 'La textura no requiere aprender postura ni quietud');
    fotograma(150, imagenExtremidad(3)); fotograma(250, imagenExtremidad(4));
    assert.equal(motor.neutroListo, true); assert.equal(motor.origenControl.x, origen.x);
    motor.armado = true; const plantilla = motor.plantilla;
    fotograma(300, new Float32Array(19200).fill(100));
    assert.equal(motor.plantilla, plantilla); assert.equal(motor.armado, false); assert.equal(motor.fiableDesde, null);
    fotograma(400, imagenExtremidad(4));
    assert.equal(motor.neutroListo, true); assert.equal(motor.origenControl.x, origen.x);
    assert.equal(prueba.mensajes.filter(dato => dato.accion === 'hablar').length, 0, 'No hay calibración de textura');
    fotograma(500, new Float32Array(19200).fill(100)); fotograma(1800, new Float32Array(19200).fill(100));
    assert.equal(motor.plantilla, null); assert.equal(motor.neutroListo, true);
    assert.equal(motor.origenControl.x, 80); assert.equal(motor.origenControl.y, 60);
    motor.calibrar(); fotograma(1900, imagenExtremidad()); fotograma(2000, imagenExtremidad(0, 0, 25));
    assert.equal(motor.plantilla, null, 'Cambiar la luz no adquiere textura');
});
comprobar('Preferencias anteriores se reducen a tres modos sin perder los otros ajustes', () => {
    for (const [anterior, nuevo] of [['torso', 'cabeza'], ['automatico', 'manos'], ['brazo_izquierdo', 'manos'], ['brazo_derecho', 'manos'], ['zona_izquierda', 'zona'], ['zona_derecha', 'zona']]) {
        const prueba = entorno(); const motor = new prueba.contexto.Cinetico();
        motor.activa = true; motor.dibujarHUD = motor.programarFotograma = () => {};
        motor.aplicarAjustes({ modo: anterior, velocidad: 0.8, amplitud: 0.55, temblor: true });
        assert.equal(motor.modoControl, nuevo); assert.equal(motor.sensibilidad, 0.8); assert.equal(motor.amplitudControl, 0.55); assert.equal(motor.zonaMuerta, 0.07);
        motor.bucleRender(0); assert.equal(prueba.mensajes.at(-1).modo, nuevo);
    }
});
comprobar('Joystick de mano baja mantiene dirección, vuelve al reposo y se detiene al perder seguimiento', () => {
    const prueba = entorno(); const motor = new prueba.contexto.Cinetico(); let clics = 0;
    motor.activa = true; motor.aplicarAjustes({ modo: 'manos' });
    motor.solicitarModelo = motor.programarFotograma = motor.actualizarHover = motor.dibujarHUD = () => {};
    motor.elementoBajoCursor = () => null; motor.hacerClick = () => clics++;
    const fotograma = (tiempo, x) => {
        motor.recibirFotograma({ modo: 'manos', edad: 0, manos: x == null ? [] : [{ x: 1 - x / 160, y: 0.85 }], mano: 'Left' });
        motor.deteccion.tiempo = tiempo; motor.bucleRender(tiempo);
    };
    const inicio = motor.posX;
    fotograma(0, 30); assert.equal(motor.neutroListo, true);
    for (let tiempo = 50; tiempo <= 500; tiempo += 50) fotograma(tiempo, 30 + tiempo / 50);
    assert.ok(motor.posX > inicio + 10, 'Un gesto de sólo diez píxeles mueve a la derecha: ' + (motor.posX - inicio));
    assert.equal(motor.origenControl.x, 80); assert.equal(motor.origenControl.y, 60);
    const desplazado = motor.posX;
    for (let tiempo = 550; tiempo <= 800; tiempo += 50) fotograma(tiempo, 40);
    assert.ok(motor.posX > desplazado + 50, 'Mantener el joystick desplazado sigue moviendo');
    for (let tiempo = 850; tiempo <= 1500; tiempo += 50) fotograma(tiempo, 30);
    assert.equal(motor.enZonaSegura, true, 'Volver al reposo inicial detiene el cursor');
    const reposo = motor.posX;
    fotograma(1550, null); fotograma(1600, 90);
    assert.equal(motor.posX, reposo, 'Recuperar una mano en otra posición no inventa un gesto');
    for (let tiempo = 1650; tiempo <= 3000; tiempo += 50) fotograma(tiempo, null);
    fotograma(3050, 25); assert.equal(motor.posX, reposo); assert.equal(motor.origenControl.x, 80);
    for (let tiempo = 3100; tiempo <= 3400; tiempo += 50) fotograma(tiempo, 25 - (tiempo - 3050) / 50);
    assert.ok(motor.posX < reposo, 'Gesto nuevo tras pérdida larga funciona sin recalibrar');
    assert.equal(clics, 0); assert.equal(prueba.mensajes.filter(dato => dato.accion === 'hablar').length, 0);
});
comprobar('Joystick responde igual en cuatro direcciones y acumula movimientos lentos sin depender de FPS', () => {
    for (const modo of ['manos', 'zona']) {
        for (const intervalo of [30, 50, 100]) {
            const avances = [];
            for (const [dx, dy] of [[4, 0], [-4, 0], [0, 3], [0, -3]]) {
                const prueba = entorno(); const motor = new prueba.contexto.Cinetico();
                motor.modoControl = modo; motor.elementoBajoCursor = () => null; motor.atraerCursor = () => {};
                const inicio = { x: motor.posX, y: motor.posY };
                for (let tiempo = 0; tiempo <= 1200; tiempo += intervalo) {
                    const avance = Math.min(1, tiempo / 400);
                    const punto = motor.controlarGesto({ x: 25 + dx * avance, y: 90 + dy * avance }, tiempo);
                    motor.actualizarControl(motor.filtrarMovimiento(punto, tiempo), tiempo, intervalo);
                }
                const avance = dx ? (motor.posX - inicio.x) * Math.sign(dx) : (motor.posY - inicio.y) * Math.sign(dy);
                assert.ok(avance > 200, modo + ': desplazamiento lento y mantenido funciona a ' + intervalo + ' ms');
                avances.push(avance);
                const anterior = { ...motor.muestraGesto.control };
                const punto = motor.controlarGesto({ x: 100, y: 20 }, 1200);
                assert.deepEqual({ ...punto }, anterior, 'Una imagen repetida conserva el control anterior');
                const recuperado = motor.controlarGesto({ x: 100, y: 20 }, 1600);
                assert.equal(recuperado.x, 80); assert.equal(recuperado.y, 60, 'Una interrupción no mueve ni extrapola');
            }
            assert.ok(Math.max(...avances) - Math.min(...avances) < 1, 'Respuesta simétrica con diferencia menor a un píxel');
        }
    }
});
comprobar('Mano abierta y puño bajan por desplazamiento aunque el reposo esté inclinado', () => {
    for (const abierta of [true, false]) {
        const prueba = entorno(); const motor = new prueba.contexto.Cinetico(); motor.activa = true;
        motor.aplicarAjustes({ modo: 'manos' });
        motor.solicitarModelo = motor.programarFotograma = motor.actualizarHover = motor.dibujarHUD = () => {};
        motor.elementoBajoCursor = () => null; motor.atraerCursor = () => {};
        const fotograma = (tiempo, desplazamiento) => {
            const manos = Array.from({ length: 21 }, () => ({ x: 0.4, y: 0.7 + desplazamiento, z: 0 }));
            manos[5] = { x: 0.35, y: 0.45 + desplazamiento, z: 0.04 };
            manos[17] = { x: 0.45, y: 0.45 + desplazamiento, z: -0.04 };
            if (abierta) for (const indice of [8, 12, 16, 20]) manos[indice].y = 0.25 + desplazamiento;
            motor.numeroFotograma++; motor.deteccion = { tiempo, manos, mano: 'Left' }; motor.bucleRender(tiempo);
        };
        const inicio = { x: motor.posX, y: motor.posY };
        for (let tiempo = 0; tiempo <= 200; tiempo += 50) fotograma(tiempo, 0);
        assert.equal(motor.posX, inicio.x); assert.equal(motor.posY, inicio.y, 'Reposo cómodo no exige palma frontal');
        for (let tiempo = 250; tiempo <= 600; tiempo += 50) fotograma(tiempo, Math.min(0.04, (tiempo - 200) / 10000));
        const bajando = motor.posY;
        for (let tiempo = 650; tiempo <= 900; tiempo += 50) fotograma(tiempo, 0.04);
        assert.ok(motor.posY > bajando + 50, 'Mantener la mano abajo mantiene la dirección');
        assert.equal(motor.posX, inicio.x, 'La inclinación lateral no secuestra el movimiento hacia abajo');
        for (let tiempo = 950; tiempo <= 1800; tiempo += 50) fotograma(tiempo, 0);
        assert.equal(motor.enZonaSegura, true);
        assert.ok(Math.abs(motor.muestraGesto.y - 84) < 0.001, 'El reposo permanece en la primera posición, sin recentrar durante el gesto');
        assert.equal(prueba.mensajes.filter(dato => dato.accion === 'hablar').length, 0);
    }
});
comprobar('Pasar de codo a mano conserva centro fijo y no reinicia calibración', () => {
    const { motor, fotograma, clics } = camaraSimulada(); motor.modoControl = 'manos'; motor.fuenteControl = 'brazo_izquierdo:13';
    fotograma(1400, 78, 'brazo_izquierdo:13');
    for (const [tiempo, y] of [[1500, 110], [1600, 114], [1700, 118]]) fotograma(tiempo, y, 'mano:Left');
    assert.equal(motor.fuenteControl, 'mano:Left'); assert.equal(motor.neutroListo, true);
    assert.equal(motor.origenControl.x, 80); assert.equal(motor.origenControl.y, 60);
    assert.equal(motor.puntoActual.y, 118);
    assert.equal(clics.length, 0);
});
comprobar('Codo relajado sigue moviendo mientras confirma mano, sin perder el gesto ni repetir anuncios', () => {
    const prueba = entorno(); const motor = new prueba.contexto.Cinetico();
    motor.activa = true; motor.modoControl = 'manos';
    motor.solicitarModelo = motor.programarFotograma = motor.actualizarHover = motor.dibujarHUD = () => {};
    motor.elementoBajoCursor = () => null;
    const fotograma = (tiempo, x, mano = null) => {
        const cuerpo = []; cuerpo[13] = { x: 1 - x / 160, y: 0.85, visibility: 0.55, presence: 0.55 };
        motor.numeroFotograma++; motor.deteccion = { tiempo, cuerpo, manos: mano == null ? [] : [{ x: 1 - mano / 160, y: 0.85 }], mano: 'Left' };
        motor.bucleRender(tiempo);
    };
    for (const tiempo of [0, 100, 200]) fotograma(tiempo, 25);
    assert.equal(motor.neutroListo, true); assert.equal(motor.fuenteControl, 'brazo_izquierdo:13');
    fotograma(300, 30); fotograma(400, 40);
    for (const [tiempo, mano] of [[500, 100], [550, 110]]) {
        const antes = motor.posX; fotograma(tiempo, tiempo === 500 ? 42 : 44, mano);
        assert.ok(motor.posX > antes, 'Codo visible no se congela mientras confirma');
        assert.equal(motor.fuenteControl, 'brazo_izquierdo:13');
    }
    fotograma(650, 50, 120);
    assert.equal(motor.fuenteControl, 'mano:Left'); assert.equal(motor.origenControl.x, 80);
    assert.equal(motor.puntoActual.x - motor.origenControl.x, 40); assert.equal(motor.neutroListo, true);
    assert.equal(prueba.mensajes.filter(dato => dato.accion === 'hablar').length, 0);
});
comprobar('Inclinación de palma y puño dirige cuatro sentidos sin trasladar muñeca ni calibrar', () => {
    const motor = new entornoVoz.contexto.Cinetico(); motor.modoControl = 'manos';
    const mano = (a, b) => {
        const puntos = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.75, z: 0 }));
        puntos[5] = { x: 0.45, y: 0.5, z: a }; puntos[17] = { x: 0.55, y: 0.5, z: b };
        return puntos;
    };
    const frontal = motor.elegirPunto({ manos: mano(0, 0) });
    assert.equal(frontal.gesto.x, 80); assert.equal(frontal.gesto.y, 60);
    for (const [a, b, eje, signo] of [[0.04, -0.04, 'x', -1], [-0.04, 0.04, 'x', 1], [-0.08, -0.08, 'y', -1], [0.08, 0.08, 'y', 1]]) {
        const puntos = mano(a, b), abierta = motor.elegirPunto({ manos: puntos });
        assert.ok((abierta.gesto[eje] - motor.puntoBase[eje]) * signo > 8);
        assert.equal(abierta.x, frontal.x); assert.equal(abierta.y, frontal.y);
        for (const indice of [8, 12, 16, 20]) puntos[indice] = { x: 0.49, y: 0.7, z: 0 };
        const cerrada = motor.elegirPunto({ manos: puntos });
        assert.equal(JSON.stringify(cerrada.gesto), JSON.stringify(abierta.gesto));
        assert.equal(motor.muestrasPostura.length, 0);
    }
    const indice = mano(0, 0); indice[8] = { x: 0.9, y: 0.5, z: -0.05 };
    assert.ok(motor.elegirPunto({ manos: indice }).gesto.x < 55, 'Índice único extendido apunta sin mover muñeca');
    indice[5].z = NaN; assert.equal(motor.elegirPunto({ manos: indice }).gesto, null, 'Orientación inválida conserva respaldo por movimiento');
});
comprobar('Dedos disponibles señalan cuatro direcciones desde el inicio sin exigir una mano completa', () => {
    for (const [base, punta] of [[5, 8], [9, 12], [13, 16], [17, 20]]) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const prueba = entorno(); const motor = new prueba.contexto.Cinetico(); motor.activa = true;
            motor.aplicarAjustes({ modo: 'manos' });
            motor.programarFotograma = motor.actualizarHover = motor.dibujarHUD = () => {};
            motor.elementoBajoCursor = () => null; motor.atraerCursor = () => {};
            const puntos = [];
            puntos[0] = { x: 0.5 - dx * 0.1, y: 0.5 - dy * 0.1, z: 0 };
            puntos[base] = { x: 0.5, y: 0.5, z: 0 };
            puntos[punta] = { x: 0.5 + dx * 0.25, y: 0.5 + dy * 0.25, z: 0 };
            const inicio = { x: motor.posX, y: motor.posY };
            for (let tiempo = 0; tiempo <= 600; tiempo += 50) {
                motor.numeroFotograma++; motor.deteccion = { tiempo, manos: puntos }; motor.bucleRender(tiempo);
            }
            assert.ok(dx ? (motor.posX - inicio.x) * -dx > 100 : (motor.posY - inicio.y) * dy > 100);
            assert.equal(motor.muestraGesto.x, (1 - puntos[0].x) * 160, 'Señalar no traslada la muñeca');
            const gesto = motor.inclinacionMano(puntos);
            const movimiento = motor.controlarGesto({ x: motor.muestraGesto.x + 3, y: motor.muestraGesto.y }, 650, 0, gesto);
            assert.equal(movimiento.x, 98, 'Desplazamiento del joystick tiene prioridad sobre el dedo');
            puntos[punta] = { ...puntos[base] };
            for (let tiempo = 700; tiempo <= 1300; tiempo += 50) {
                motor.numeroFotograma++; motor.deteccion = { tiempo, manos: puntos }; motor.bucleRender(tiempo);
            }
            assert.equal(motor.enZonaSegura, true, 'Doblar el dedo deja de señalar sin calibrar');
            puntos[punta].z = NaN; assert.equal(motor.inclinacionMano(puntos), null, 'Puntos inválidos no crean dirección');
        }
    }
    const motor = new entornoVoz.contexto.Cinetico();
    const puntos = [];
    puntos[0] = { x: 0.4, y: 0.5, z: 0 };
    puntos[5] = { x: 0.5, y: 0.5, z: 0 }; puntos[8] = { x: 0.8, y: 0.5, z: 0 };
    puntos[9] = { x: 0.5, y: 0.53, z: 0 }; puntos[12] = { x: 0.8, y: 0.53, z: 0 };
    assert.ok(motor.inclinacionMano(puntos).x < 55, 'Dos dedos alineados también señalan');
    puntos[12] = { x: 0.5, y: 0.9, z: 0 };
    assert.equal(motor.inclinacionMano(puntos), null, 'Dedos divergentes no compiten por el cursor');
});
comprobar('Joystick local de textura mantiene cuatro direcciones y descansa al volver a su origen', () => {
    const motor = new entornoVoz.contexto.Cinetico(); motor.modoControl = 'zona';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        motor.muestraGesto = null;
        motor.controlarGesto({ x: 25, y: 100 }, 0);
        const gesto = motor.controlarGesto({ x: 25 + dx, y: 100 + dy }, 50);
        assert.equal(Math.sign(gesto.x - 80), dx); assert.equal(Math.sign(gesto.y - 60), dy);
        const sostenido = motor.controlarGesto({ x: 25 + dx, y: 100 + dy }, 100);
        assert.equal(sostenido.x, gesto.x); assert.equal(sostenido.y, gesto.y);
        const reposo = motor.controlarGesto({ x: 25, y: 100 }, 150);
        assert.equal(reposo.x, 80); assert.equal(reposo.y, 60);
        assert.equal(motor.controlarGesto({ x: 80, y: 60 }, 150).x, 80, 'Imagen repetida no inventa movimiento');
    }
    for (const angulo of [-0.12, 0.12]) {
        motor.muestraGesto = null; motor.controlarGesto({ x: 25, y: 100 }, 0);
        assert.equal(Math.sign(motor.controlarGesto({ x: 25, y: 100 }, 50, angulo).x - 80), Math.sign(angulo));
    }
    const imagenGiratoria = angulo => {
        const grises = new Float32Array(19200), c = Math.cos(angulo), s = Math.sin(angulo);
        for (let y = 0; y < 120; y++) for (let x = 0; x < 160; x++) {
            const u = (x - 80) * c + (y - 60) * s, v = -(x - 80) * s + (y - 60) * c;
            grises[y * 160 + x] = 120 + 35 * Math.sin(u * 0.37) + 30 * Math.sin(v * 0.51) + 15 * Math.cos(u * 0.13 + v * 0.27);
        }
        return grises;
    };
    motor.puntoActual = { x: 80, y: 60 };
    motor.plantilla = motor.extraerParche(imagenGiratoria(0), 80, 60);
    for (const angulo of [-0.24, 0.24]) {
        const seguido = motor.seguirPunto(imagenGiratoria(angulo));
        assert.ok(seguido, 'El giro pequeño no corta la textura');
        assert.equal(seguido.angulo, angulo);
        assert.ok(Math.hypot(seguido.x - 80, seguido.y - 60) <= 2);
    }
    motor.activa = true; motor.grisesRecibidos = true; motor.muestraGesto = null;
    motor.dibujarHUD = motor.actualizarHover = () => {};
    const fotograma = (tiempo, angulo) => {
        motor.grises.set(imagenGiratoria(angulo)); motor.deteccion = { tiempo }; motor.controlarZona(tiempo);
    };
    fotograma(0, 0); fotograma(50, 0.24);
    assert.ok(motor.puntoGesto.x > 80, 'Giro de textura dirige aunque su centro no se traslade');
    fotograma(100, 0.24);
    assert.ok(motor.puntoGesto.x > 80, 'Mantener el giro conserva la dirección del joystick');
    fotograma(150, 0);
    assert.ok(Math.abs(motor.puntoGesto.x - 80) < 0.001, 'Volver al ángulo de reposo detiene el gesto');
    motor.muestraGesto = null; motor.controlarGesto({ x: 80, y: 60 }, 200);
    for (let tiempo = 250; tiempo <= 350; tiempo += 50) motor.controlarGesto({ x: 80, y: 60 }, tiempo, 0.24);
    for (let tiempo = 400; tiempo <= 500; tiempo += 50) motor.controlarGesto({ x: 80, y: 60 }, tiempo, -0.24);
    assert.ok(Math.abs(motor.muestraGesto.control.x - 80) < 0.001, 'Saturar la velocidad no pierde el ángulo para regresar');
    assert.equal(motor.origenControl.x, 80); assert.equal(motor.origenControl.y, 60);
});
comprobar('Orientación sostenida mueve con muñeca quieta; palma frontal descansa sin mover el brazo', () => {
    const prueba = entorno(); const motor = new prueba.contexto.Cinetico(); motor.activa = true;
    motor.aplicarAjustes({ modo: 'manos' });
    motor.solicitarModelo = motor.programarFotograma = motor.actualizarHover = motor.dibujarHUD = () => {};
    motor.elementoBajoCursor = () => null;
    const fotograma = (tiempo, inclinado) => {
        const manos = Array.from({ length: 21 }, () => ({ x: 0.4, y: 0.85, z: 0 }));
        manos[5] = { x: 0.35, y: 0.6, z: inclinado ? -0.04 : 0 };
        manos[17] = { x: 0.45, y: 0.6, z: inclinado ? 0.04 : 0 };
        motor.numeroFotograma++; motor.deteccion = { tiempo, manos, mano: 'Left' }; motor.bucleRender(tiempo);
    };
    const inicio = motor.posX;
    fotograma(0, false);
    for (let tiempo = 50; tiempo <= 600; tiempo += 50) fotograma(tiempo, true);
    assert.ok(motor.posX > inicio + 100, 'Inclinar dirige sin desplazamiento de muñeca');
    const fuente = motor.fuenteControl;
    for (let tiempo = 650; tiempo <= 1500; tiempo += 50) fotograma(tiempo, false);
    assert.equal(motor.enZonaSegura, true); assert.equal(motor.fuenteControl, fuente);
    const reposo = motor.posX;
    for (let tiempo = 1550; tiempo <= 2000; tiempo += 50) fotograma(tiempo, false);
    assert.equal(motor.posX, reposo); assert.equal(motor.origenControl.x, 80);
    assert.equal(prueba.mensajes.filter(dato => dato.accion === 'hablar').length, 0);
});
comprobar('Vista conserva zona segura central y muestra mano baja por separado', () => {
    const motor = new entornoVoz.contexto.Cinetico(); const elipses = [], puntos = [], lineas = [];
    motor.modoControl = 'manos'; motor.origenControl = { x: 30, y: 102 }; motor.puntoActual = { x: 45, y: 102 };
    motor.puntoGesto = { x: 83, y: 60 }; motor.amplitudControl = 0.55;
    motor.hud = {}; motor.burbuja = { style: {} };
    motor.hudCtx = { clearRect() {}, beginPath() {}, moveTo() {}, lineTo: (...valores) => lineas.push(valores), stroke() {}, fill() {}, ellipse: (...valores) => elipses.push(valores), arc: (...valores) => puntos.push(valores) };
    motor.dibujarHUD('Seguimiento', 0);
    assert.equal(elipses[0][0], 80); assert.equal(elipses[0][1], 60);
    assert.equal(puntos[0][0], 45); assert.equal(puntos[0][1], 102);
    assert.deepEqual(lineas.at(-1), [83, 60], 'Línea y zona segura usan la misma escala de entrada');
    assert.equal(motor.puntoBase.x, 80); assert.equal(motor.puntoBase.y, 60);
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

comprobar('Atracción local evita controles deshabilitados/ocultos y no arma clic por acercarse', () => {
    const prueba = entorno();
    const motor = new prueba.contexto.Cinetico();
    const fondo = { closest: () => null };
    const boton = { disabled: false, matches: selector => selector === ':disabled' ? boton.disabled : true, getAttribute: () => null, closest: selector => selector === '[inert], [aria-disabled="true"]' ? null : boton,
        getClientRects: () => [{ left: 110, right: 150, top: 80, bottom: 120, width: 40, height: 40 }] };
    let oculto = false;
    prueba.contexto.document.elementFromPoint = (x, y) => !oculto && x >= 110 && x <= 150 && y >= 80 && y <= 120 ? boton : fondo;
    motor.posX = 100; motor.posY = 100;
    motor.actualizarControl({ x: 80, y: 60 }, 0, 33);
    assert.ok(motor.posX > 100 && motor.posX < 114);
    assert.equal(motor.armado, false);
    for (let paso = 0; paso < 8; paso++) motor.atraerCursor(33);
    assert.equal(motor.elementoBajoCursor(), boton);
    assert.equal(motor.posX, 114);
    motor.posX = 100; boton.disabled = true; motor.atraerCursor(33); assert.equal(motor.posX, 100);
    boton.disabled = false; oculto = true; motor.atraerCursor(33); assert.equal(motor.posX, 100);
    oculto = false; motor.posX = 20; motor.atraerCursor(33); assert.equal(motor.posX, 20);
});

async function principal() {
    const pruebaMarco = entorno(), contextoMarco = pruebaMarco.contexto, eventosMarco = new Map();
    let cambiosMarco, resolverPreferencia, marcasMarco = 0;
    const hijoMarco = { contentWindow: { postMessage() {} }, toggleAttribute() { marcasMarco++; }, removeAttribute() {} };
    contextoMarco.document.querySelectorAll = () => [hijoMarco];
    contextoMarco.document.addEventListener = (tipo, accion) => eventosMarco.set(tipo, accion);
    contextoMarco.document.removeEventListener = tipo => eventosMarco.delete(tipo);
    contextoMarco.document.dispatchEvent = evento => eventosMarco.get(evento.type)?.(evento);
    contextoMarco.window.top = {}; contextoMarco.window.parent = { postMessage() {} };
    contextoMarco.window.origin = 'https://example.org'; contextoMarco.location.ancestorOrigins = ['https://example.org'];
    contextoMarco.window.addEventListener = (tipo, accion) => eventosMarco.set(tipo, accion);
    contextoMarco.window.removeEventListener = tipo => eventosMarco.delete(tipo);
    contextoMarco.MutationObserver = class { observe() {} disconnect() {} };
    contextoMarco.FiltrosDaltonismo = class {
        constructor(soloPantallaCompleta) { this.soloPantallaCompleta = soloPantallaCompleta; this.filtroActual = 'ninguno'; }
        aplicar(tipo) { this.filtroActual = tipo; }
        limpiar() { this.filtroActual = 'ninguno'; }
    };
    contextoMarco.chrome.runtime.id = 'prueba'; contextoMarco.chrome.runtime.getManifest = () => ({});
    contextoMarco.chrome.storage.onChanged = { addListener: accion => { cambiosMarco = accion; }, removeListener() { cambiosMarco = null; } };
    contextoMarco.chrome.storage.local.get = () => new Promise(resolver => { resolverPreferencia = resolver; });
    pruebaMarco.cargar(path.join(raiz, 'filtros_frames.js'));
    const controladorMarco = contextoMarco.adaptaPEFiltrosMarco;
    assert.equal(controladorMarco.filtros.soloPantallaCompleta, true);
    cambiosMarco({daltonismo:{newValue:'protanopia'}}, 'local');
    resolverPreferencia({daltonismo:'deuteranopia'}); await Promise.resolve();
    assert.equal(controladorMarco.filtros.filtroActual, 'protanopia', 'Una lectura inicial tardía no revierte la preferencia');
    pruebaMarco.cargar(path.join(raiz, 'filtros_frames.js'));
    assert.equal(contextoMarco.adaptaPEFiltrosMarco, controladorMarco, 'Reinyección idempotente');
    eventosMarco.get('message')({source:{}, data:{tipo:'adapta-pe-filtro-pantalla',activa:true}});
    eventosMarco.get('message')({source:hijoMarco.contentWindow, data:{tipo:'adapta-pe-filtro-pantalla',activa:'sí'}});
    assert.equal(marcasMarco, 0, 'No se aceptan fuentes ajenas ni valores sin validar');
    eventosMarco.get('message')({source:hijoMarco.contentWindow, data:{tipo:'adapta-pe-filtro-pantalla',activa:true}});
    assert.equal(marcasMarco, 1);
    controladorMarco.destruir();
    assert.equal(eventosMarco.size, 0); assert.equal(cambiosMarco, null); assert.equal(controladorMarco.vigente(), false);
    comprobaciones++; console.log('✓ Marcos: prioridad validada, lectura inicial sin carrera, reinyección y limpieza');
    const pruebaModo = entorno(); const motorModo = new pruebaModo.contexto.Cinetico(); motorModo.activa = true;
    const pendientesModo = [];
    pruebaModo.contexto.chrome.runtime.sendMessage = datos => new Promise((resolver, rechazar) => pendientesModo.push({ datos, resolver, rechazar }));
    motorModo.aplicarAjustes({ modo: 'manos' });
    assert.equal(pendientesModo[0].datos.modo, 'manos', 'El cambio se envía sin esperar otra imagen');
    pendientesModo[0].resolver({ ok: false }); await Promise.resolve();
    assert.equal(motorModo.modeloEnviado, null, 'Cambio durante transición de prioridad vuelve a intentarse');
    motorModo.solicitarModelo();
    motorModo.aplicarAjustes({ modo: 'zona' });
    pendientesModo[1].rechazar(new Error('Puerto cerrado')); await Promise.resolve(); await Promise.resolve();
    assert.equal(motorModo.modeloEnviado, 'zona:null', 'Un rechazo viejo no borra el modo nuevo');
    pendientesModo[2].resolver({ ok: true }); await Promise.resolve();
    motorModo.solicitarModelo(); assert.equal(pendientesModo.length, 3, 'Confirmación evita mensajes duplicados');
    motorModo.aplicarAjustes({ modo: 'cabeza' });
    pendientesModo[3].rechazar(new Error('Puerto cerrado')); await Promise.resolve(); await Promise.resolve();
    assert.equal(motorModo.modeloEnviado, null);
    motorModo.solicitarModelo(); pendientesModo[4].resolver({ ok: true }); await Promise.resolve();
    comprobaciones++; console.log('✓ Cambio de modo inmediato con reintento y sin perder el modo más reciente');
    const llamadas = [], salidas = [];
    let cerrar = 0, tiempoDeteccion = 0;
    const modelos = { rostro: [], manos: [], cuerpo: [], etiqueta: 'Left', segundaMano: null };
    const clase = nombre => ({ createFromOptions: async () => ({ detectForVideo: () => {
        llamadas.push(nombre);
        return nombre === 'rostro' ? { faceLandmarks: [modelos.rostro] } : nombre === 'cuerpo' ? { landmarks: [modelos.cuerpo] } : { landmarks: modelos.segundaMano ? [modelos.segundaMano, modelos.manos] : [modelos.manos], handedness: [[{ categoryName: modelos.etiqueta }], [{ categoryName: modelos.etiqueta }]] };
    } }) });
    const trabajador = vm.createContext({ self: {}, postMessage: dato => salidas.push(dato), importScripts() {
        trabajador.self.exports = { FilesetResolver: { forVisionTasks: async () => ({}) }, FaceLandmarker: clase('rostro'), PoseLandmarker: clase('cuerpo'), HandLandmarker: clase('manos') };
    } });
    vm.runInContext(fs.readFileSync(path.join(raiz, 'vision/trabajador.js'), 'utf8'), trabajador);
    await trabajador.self.onmessage({ data: { tipo: 'iniciar' } });
    const detectar = async (modo, fuente = null) => {
        llamadas.length = 0;
        await trabajador.self.onmessage({ data: { tipo: 'imagen', modo, fuente, tiempo: tiempoDeteccion += 100, imagen: { close: () => cerrar++ } } });
    };
    modelos.rostro = []; modelos.cuerpo = [{}];
    await detectar('cabeza');
    comprobar('Cabeza/torso busca respaldo corporal sólo si falta rostro o ya controla cuerpo', () => {
        assert.deepEqual(llamadas, ['rostro', 'cuerpo']); assert.equal(salidas.at(-1).cuerpo.length, 1);
    });
    modelos.rostro = [{}]; await detectar('cabeza', 'torso');
    assert.deepEqual(llamadas, ['rostro', 'cuerpo']);
    modelos.rostro = [{}]; modelos.cuerpo = [{}];
    await detectar('automatico');
    comprobar('Worker automático busca brazos aunque haya rostro al iniciar', () => {
        assert.deepEqual(llamadas, ['rostro', 'manos', 'cuerpo']); assert.equal(salidas.at(-1).cuerpo.length, 1);
    });
    await detectar('automatico', 'cabeza');
    comprobar('Cabeza en automático sigue buscando manos sin exigir cambio manual', () => assert.deepEqual(llamadas, ['rostro', 'manos']));
    await detectar('manos');
    comprobar('Worker de extremidades busca cuerpo si no detecta mano y excluye rostro', () => assert.deepEqual(llamadas, ['manos', 'cuerpo']));
    modelos.manos = [{}];
    await detectar('manos', 'brazo_izquierdo:13');
    comprobar('Worker conserva brazo aun apareciendo mano y libera imágenes', () => {
        assert.deepEqual(llamadas, ['manos', 'cuerpo']); assert.equal(cerrar, tiempoDeteccion / 100);
    });
    await detectar('cabeza');
    assert.deepEqual(llamadas, ['rostro']);
    modelos.manos = [{ x: 0.4, y: 0.4 }];
    await detectar('manos');
    const identidad = salidas.at(-1).mano;
    modelos.etiqueta = 'Right'; modelos.manos = [{ x: 0.41, y: 0.4 }];
    await detectar('manos');
    comprobar('Etiqueta izquierda/derecha cambiante no reinicia una misma mano cercana', () => assert.equal(salidas.at(-1).mano, identidad));
    modelos.segundaMano = [{ x: 0.9, y: 0.4 }];
    await detectar('manos');
    comprobar('Dos manos y orden cambiante conservan la muñeca próxima, no el índice del modelo', () => assert.equal(salidas.at(-1).manos[0].x, 0.41));
    modelos.segundaMano = null;
    modelos.manos = [];
    await detectar('automatico', 'mano:Left');
    comprobar('Automático conserva respaldo de muñeca corporal aunque vea rostro', () => assert.deepEqual(llamadas, ['rostro', 'manos', 'cuerpo']));
    modelos.cuerpo = [];
    for (let paso = 0; paso < 14; paso++) {
        modelos.cuerpo[15] = { x: 0.42 + paso * 0.01, y: 0.4, visibility: 0.99, presence: 0.99 };
        await detectar('manos', 'mano:' + identidad);
    }
    modelos.manos = [{ x: 0.55, y: 0.4 }];
    await detectar('manos', 'mano:' + identidad);
    comprobar('Respaldo corporal conserva identidad al volver a abrir mano tras más de 1.200 ms', () => assert.equal(salidas.at(-1).mano, identidad));
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
    captura.modo = 'manos'; captura.ocupada = false; captura.video.currentTime = 2;
    await captura.capturar(captura.generacion);
    comprobar('Extremidades reciben mayor detalle real sin deformar ni ampliar una cámara pequeña', () => {
        assert.equal(tamano.resizeWidth, 640); assert.equal(tamano.resizeHeight, 360);
    });
    captura.ocupada = false; captura.video.currentTime = 3; captura.video.videoWidth = 160; captura.video.videoHeight = 120;
    await captura.capturar(captura.generacion);
    assert.equal(tamano.resizeWidth, 160); assert.equal(tamano.resizeHeight, 120);
    captura.contexto = { setTransform() {}, drawImage() {}, resetTransform() {}, getImageData: () => ({ data: new Uint8ClampedArray(19200 * 4).fill(120) }) };
    captura.ocupada = false;
    for (const modo of ['zona']) {
        captura.cambiarModelo({ modo }); captura.video.currentTime++;
        await captura.capturar(captura.generacion);
        const salida = pruebaCaptura.mensajes.at(-1);
        assert.equal(salida.accion, 'camara_fotograma'); assert.equal(salida.datos.modo, modo);
        assert.equal(salida.datos.grises.length, 19200); assert.equal(salida.datos.grises[0], 120);
        assert.equal(captura.ocupada, false, 'Textura no inicia otra inferencia');
    }
    captura.ocupada = true;
    captura.video.currentTime = 1;
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
        for (const [completa, ligera] of [['sitios.js', 'sitios.js'], ['classes/VoiceAssistant.js', 'clases/VoiceAssistant.js'], ['background.js', 'background.js'], ['classes/FiltrosDaltonismo.js', 'clases/FiltrosDaltonismo.js'], ['filtros_frames.js','filtros_frames.js'], ['voz/escucha.js','voz/escucha.js'], ['voz/permisos.js','voz/permisos.js'], ['voz/popup.js','voz/popup.js'], ['mascotas/Mascota.js','mascotas/Mascota.js'], ['mascotas/motor.js','mascotas/motor.js'], ['mascotas/popup.js','mascotas/popup.js']]) {
            const contenidoBase = fs.readFileSync(path.join(raiz, completa), 'utf8');
            const contenidoLite = fs.readFileSync(path.join(lite, ligera), 'utf8');
            assert.equal(contenidoBase, contenidoLite);
        }
        for (const carpeta of [raiz, lite]) {
            const manifiesto = JSON.parse(fs.readFileSync(path.join(carpeta, 'manifest.json'), 'utf8'));
            assert.equal(manifiesto.manifest_version, 3);
            assert.equal(manifiesto.name, carpeta === raiz ? 'AdaptaPE' : 'AdaptaPE Lite');
            for (const regla of manifiesto.content_scripts) for (const archivo of regla.js) assert.ok(fs.existsSync(path.join(carpeta, archivo)));
            assert.equal(manifiesto.content_scripts[0].js[0], 'sitios.js');
            assert.equal(manifiesto.content_scripts[1].all_frames, true);
            assert.equal(manifiesto.content_scripts[1].match_origin_as_fallback, true);
            assert.equal(manifiesto.content_scripts[1].js.length, 2);
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
    const enviarModo = documento => new Promise(responder => manejador({ accion: 'camara_modo', modo: 'manos', fuente: null },
        { tab: { id: 10 }, documentId: documento }, responder));
    vm.runInContext('pestanaConControl = null', entornoFondo.contexto);
    assert.equal((await enviarModo('actual')).ok, false);
    assert.equal((await new Promise(responder => manejador({ accion: 'camara_modo', modo: 'manos' }, {}, responder))).ok, false);
    vm.runInContext("pestanaConControl = { id: 10, documentId: 'actual' }", entornoFondo.contexto);
    assert.equal((await enviarModo('anterior')).ok, false);
    assert.equal((await enviarModo('actual')).ok, true);
    comprobaciones++; console.log('✓ Cámara confirma el modo sólo al documento prioritario actual');
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
    const notificaciones = [], guardadosMascota = [], locuciones = [];
    chrome.storage.local = { set: async datos => guardadosMascota.push(datos) };
    chrome.tabs.sendMessage = async (id, datos, opciones) => notificaciones.push({ id, datos, opciones });
    chrome.tts = { stop() {}, speak: (texto, opciones) => locuciones.push(opciones) };
    for (const nombre of ['tinku', 'cuchu', 'yati', 'ninguna']) assert.equal((await enviar({ accion: 'mascota', nombre })).ok, true);
    assert.equal(guardadosMascota.length, 4);
    assert.equal((await enviar({ accion: 'mascota', nombre: '../vision' })).ok, false);
    await enviar({ accion: 'hablar', texto: 'Lectura', origen: 'lectura' });
    assert.equal(notificaciones.at(-1).datos.estado, 'read');
    await enviar({ accion: 'hablar', texto: 'Respuesta' });
    assert.equal(notificaciones.at(-1).datos.estado, 'talk');
    const cantidad = notificaciones.length;
    locuciones[0].onEvent({ type: 'end' });
    assert.equal(notificaciones.length, cantidad, 'Una lectura anterior no interrumpe la reacción nueva');
    locuciones[1].onEvent({ type: 'end' });
    assert.equal(notificaciones.at(-1).datos.hablando, false);
    await enviar({ accion: 'hablar', texto: 'Lectura', origen: 'lectura' });
    await enviar({ accion: 'callar' });
    assert.equal(notificaciones.at(-1).datos.estado, 'idle');
    chrome.tts.speak = () => { throw new Error('Voz no disponible'); };
    assert.equal((await enviar({ accion: 'hablar', texto: 'Respuesta' })).ok, false);
    assert.equal(notificaciones.at(-1).datos.hablando, false, 'Un fallo TTS no deja a la mascota hablando');
    comprobaciones++; console.log('✓ Mascotas: selección validada y reacciones TTS sin finales antiguos');
    console.log(`${comprobaciones} grupos de regresiones correctos.`);
}
principal().catch(error => { console.error(error); process.exitCode = 1; });
