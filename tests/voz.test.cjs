// Regresiones de voz multilingüe sin dependencias. Ejecutar: node tests/voz.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(__dirname, '..');
const lite = path.resolve(raiz, '../lite');
const soloBase = process.argv.includes('--solo-base');
const paridad = JSON.parse(fs.readFileSync(path.join(raiz, 'tests/fixtures/activacion-paridad.json'), 'utf8'));
if (soloBase) console.log('Sólo Base: identidad con Lite pendiente del orquestador.');
let comprobaciones = 0;
function comprobar(nombre, prueba) { prueba(); comprobaciones++; console.log('✓ ' + nombre); }

function entorno(carpeta = raiz, clases = 'classes') {
    const mensajes = [], desplazamientos = [], temporizadores = new Map();
    let reloj = 0, contador = 0;
    const contexto = vm.createContext({ console, URL, Event,
        document: { hidden: false, activeElement: null, querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
            createElement: () => ({ style: {}, setAttribute() {}, getAttribute() {}, remove() {} }),
            body: { appendChild() {} }, head: { appendChild() {} }, documentElement: { scrollHeight: 2000 } },
        window: { innerHeight: 1000, scrollBy: dato => desplazamientos.push(dato), scrollTo: dato => desplazamientos.push(dato),
            getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) },
        location: { hostname: 'example.org' }, navigator: {},
        chrome: { runtime: { id: 'prueba', sendMessage: (dato, respuesta) => { mensajes.push(dato); respuesta?.({ ok: true }); return Promise.resolve({ ok: true }); } } },
        setTimeout: (accion, espera) => { const id = ++contador; temporizadores.set(id, { accion, tiempo: reloj + espera }); return id; },
        clearTimeout: id => temporizadores.delete(id)
    });
    const avanzar = ms => {
        const hasta = reloj + ms;
        for (;;) {
            const lista = [...temporizadores].filter(([, dato]) => dato.tiempo <= hasta).sort((a, b) => a[1].tiempo - b[1].tiempo);
            if (!lista.length) break;
            const [id, dato] = lista[0]; reloj = dato.tiempo; temporizadores.delete(id); dato.accion();
        }
        reloj = hasta;
    };
    const cargar = archivo => vm.runInContext(fs.readFileSync(archivo, 'utf8'), contexto, { filename: archivo });
    cargar(path.join(carpeta, 'sitios.js'));
    cargar(path.join(carpeta, 'textos.js'));
    cargar(path.join(carpeta, clases, 'VoiceAssistant.js'));
    return { contexto, mensajes, desplazamientos, avanzar, cargar };
}

const prueba = entorno();
const { VoiceAssistant } = prueba.contexto;
const preparar = VoiceAssistant.prepararComando;
const voz = new VoiceAssistant();
let dictado = null;
voz.escribirEnCampo = (_, texto) => { dictado = texto; return true; };
function orden(texto) { prueba.mensajes.length = 0; prueba.desplazamientos.length = 0; dictado = null; voz.ejecutarComando(texto); return prueba.mensajes[0]; }
// Simula el camino real: frase con palabra de activación en offscreen → texto canónico → controlador.
function frase(texto, idioma) {
    const central = new VoiceAssistant(null, comando => recibido.push(comando));
    const recibido = [];
    central.idioma = idioma; central.microfonoIniciado = true; central.permitidoPorUsuario = true; central.reproducirBeep = () => {};
    central.textoReconocido = texto; central.procesarFraseContinua();
    return recibido[0];
}
const traducida = (texto, idioma) => { const canonica = frase(texto, idioma); assert.ok(canonica != null, 'Sin activación: ' + texto); return orden(canonica); };

comprobar('Fixture de activación: 15 casos críticos, D1, posición, fonética acotada y alias', () => {
    for (const caso of paridad.activacion) {
        const fin = prueba.contexto.buscarActivacion(caso.texto, caso.nombre, caso.idioma || 'es-PE', {
            aliasActivacion: caso.alias || [], tambienComputadora: caso.tambienComputadora
        });
        assert.equal(fin >= 0, caso.activa, caso.nombre + ': ' + caso.texto);
        if (caso.esperando) {
            // Tras el pitido o en conversación: el vocativo y el nombre también se retiran.
            const recibidos = [], central = new VoiceAssistant(null, comando => recibidos.push(comando));
            central.microfonoIniciado = central.permitidoPorUsuario = true; central.setNombreActivacion(caso.nombre); central.abrirEspera();
            central.textoReconocido = caso.texto; central.procesarFraseContinua();
            assert.deepEqual(recibidos, [caso.canonica], caso.texto);
        } else if (caso.canonica) {
            const canonica = preparar(caso.texto.slice(fin).trim(), caso.idioma);
            assert.equal(canonica, caso.canonica);
            const accion = orden(canonica);
            assert.equal(accion.accion, caso.intencion); assert.equal(accion.sitio, caso.sitio);
        }
    }
    const validar = prueba.contexto.validarAliasActivacion;
    assert.equal(validar(['maik', 'yorch', 'kori'], 'Jarvis').ok, true);
    for (const alias of [['a', 'maik'], ['maik', 'maik'], ['Jarvis'], ['maik', 'yorch', 'kori', 'guaira'], ['cierra']]) assert.equal(validar(alias, 'Jarvis').ok, false);
    assert.equal(prueba.contexto.validarNombreActivacion('Hey Google').ok, true);
    assert.equal(prueba.contexto.validarNombreActivacion('hey').ok, false);
    const central = new VoiceAssistant(null, () => assert.fail('La prueba no ejecuta'));
    central.microfonoIniciado = central.permitidoPorUsuario = true;
    let muestra;
    central.alProbarNombre = texto => { muestra = texto; };
    central.textoReconocido = 'yarbis cierra ventana'; central.procesarFraseContinua();
    assert.equal(muestra, 'yarbis cierra ventana'); assert.equal(central.alProbarNombre, null);
});

comprobar('Conversación D2: fixtures de resultado/TTS, caducidad y cierre independiente', () => {
    for (const caso of paridad.conversacion) {
        const local = entorno(), asistente = new local.contexto.VoiceAssistant();
        asistente.microfonoIniciado = asistente.permitidoPorUsuario = true;
        asistente.modoConversacion = caso.modo;
        asistente.eventoTTS('a', 'inicio'); asistente.recibirResultado({ resultado: caso.resultado });
        assert.equal(asistente.esperandoComando, false, 'No renovar durante TTS');
        asistente.eventoTTS('a', caso.tts === 'end' ? 'fin' : 'error');
        assert.equal(asistente.esperandoComando, caso.renueva, JSON.stringify(caso));
        local.avanzar(8001); assert.equal(asistente.esperandoComando, false, 'Caduca');
    }
    for (const texto of [...paridad.cierres, ...paridad.contenido]) {
        const local = entorno(), recibidos = [], asistente = new local.contexto.VoiceAssistant(null, comando => recibidos.push(comando));
        asistente.microfonoIniciado = asistente.permitidoPorUsuario = asistente.modoConversacion = true;
        asistente.abrirEspera(); asistente.textoReconocido = texto; asistente.procesarFraseContinua();
        assert.equal(recibidos.length, paridad.cierres.includes(texto) ? 0 : 1, texto);
        assert.equal(asistente.microfonoIniciado, true, 'Cerrar conversación conserva el micro');
    }
    // Confirmación pendiente: sin nombre sólo pasa «confirmo …» o una cancelación exacta; cualquier otra frase se ignora.
    const local = entorno(), recibidos = [], asistente = new local.contexto.VoiceAssistant(null, comando => recibidos.push(comando));
    asistente.microfonoIniciado = asistente.permitidoPorUsuario = true;
    asistente.recibirResultado({ resultado: 'confirmando' });
    asistente.textoReconocido = 'abre YouTube'; asistente.procesarFraseContinua();
    asistente.textoReconocido = 'Confirmo cerrar otras pestañas'; asistente.procesarFraseContinua();
    assert.deepEqual(recibidos, ['Confirmo cerrar otras pestañas']);
    for (const caso of paridad.cancelacion) {
        asistente.idioma = caso.idioma; asistente.recibirResultado({ resultado: 'confirmando' });
        asistente.textoReconocido = caso.texto; asistente.procesarFraseContinua();
        assert.equal(recibidos.at(-1), 'cancelar', caso.texto); assert.equal(asistente.confirmacionPendiente, false, caso.texto);
        asistente.textoReconocido = 'confirmo cerrar ventana'; asistente.procesarFraseContinua();
        assert.equal(recibidos.at(-1), 'cancelar', 'Tras cancelar, confirmar sin nombre ya no pasa');
    }
    // El plazo de 8 s empieza al terminar la pregunta hablada.
    asistente.idioma = 'es-PE'; asistente.eventoTTS('p', 'inicio'); asistente.recibirResultado({ resultado: 'confirmando' });
    local.avanzar(9000); assert.equal(asistente.confirmacionPendiente, true, 'La pregunta aún suena');
    asistente.eventoTTS('p', 'fin'); local.avanzar(7999); assert.equal(asistente.confirmacionPendiente, true);
    local.avanzar(2); assert.equal(asistente.confirmacionPendiente, false, 'Caduca 8 s después de la pregunta');
    // «Probar nombre» caduca a los 15 s y descarta la frase empezada durante la prueba.
    const sesion = entorno(), oidas = []; let motor, capturada = null;
    sesion.contexto.window.webkitSpeechRecognition = class { constructor() { motor = this; } start() { this.onstart?.(); } abort() {} };
    const probador = new sesion.contexto.VoiceAssistant(null, comando => oidas.push(comando));
    probador.setEstado(true); probador.probarNombre(texto => { capturada = texto; });
    const resultado = (texto, final) => Object.assign([{ transcript: texto }], { isFinal: final });
    sesion.avanzar(14900); motor.onresult({ results: [resultado('Computadora cierra', false)] });
    sesion.avanzar(200); assert.equal(probador.alProbarNombre, null);
    motor.onresult({ results: [resultado('Computadora cierra esta pestaña', true)] }); sesion.avanzar(600);
    assert.equal(capturada, null); assert.deepEqual(oidas, [], 'Frase de la prueba no se ejecuta al caducar');
    motor.onresult({ results: [resultado('Computadora cierra esta pestaña', true), resultado('Computadora abre YouTube', true)] }); sesion.avanzar(600);
    assert.deepEqual(oidas, ['abre YouTube'], 'Después de la prueba vuelven las órdenes');
});

comprobar('Tolerancia 1A.5: un token con una edición, excluidas sólo sugieren repetir, ambigua no ejecuta, sitios acotados', () => {
    for (const caso of paridad.tolerancia) {
        const correccion = prueba.contexto.corregirOrden(caso.texto, caso.idioma);
        assert.equal(correccion?.texto ?? null, caso.corregida, caso.texto);
        assert.equal(Boolean(correccion?.repetir), caso.repetir, caso.texto);
        const local = entorno(), avisos = [], asistente = new local.contexto.VoiceAssistant();
        local.contexto.TextosAdapta.fijarIdioma(caso.idioma); asistente.alEstado = texto => avisos.push(texto);
        asistente.ejecutarComando(caso.texto);
        const ejecutada = local.mensajes.find(mensaje => mensaje.accion !== 'hablar');
        if (caso.intencion) {
            // Anuncia la orden corregida antes de ejecutarla.
            assert.equal(local.mensajes[0].accion, 'hablar'); assert.match(local.mensajes[0].texto, new RegExp(caso.corregida));
            assert.equal(ejecutada.accion, caso.intencion); assert.equal(ejecutada.sitio, caso.sitio); assert.equal(ejecutada.query, caso.query);
        }
        if (caso.repetir) { assert.equal(ejecutada, undefined, 'Excluida: nunca ejecuta'); assert.equal(avisos.at(-1), local.contexto.TextosAdapta.t('voz.repite')); }
        if (caso.corregida === null) assert.ok(!local.mensajes.some(mensaje => mensaje.accion === 'hablar'), 'Sin corrección no anuncia');
    }
    for (const caso of paridad.sitios) {
        const local = entorno(), asistente = new local.contexto.VoiceAssistant();
        local.contexto.TextosAdapta.fijarIdioma(caso.idioma);
        asistente.ejecutarComando(caso.texto);
        assert.equal(local.mensajes.find(mensaje => mensaje.accion === 'buscar_inteligente')?.sitio ?? null, caso.sitio, caso.texto);
        if (caso.anuncio) assert.deepEqual({ ...local.mensajes[0] }, { accion: 'hablar', texto: caso.anuncio });
    }
});

comprobar('Eco TTS: descarta frases tardías iniciadas al hablar y permite sólo interrupción exacta', () => {
    const local = entorno(), recibidos = []; let motor;
    local.contexto.window.webkitSpeechRecognition = class { constructor() { motor = this; } start() { this.onstart?.(); } abort() {} };
    const asistente = new local.contexto.VoiceAssistant(null, comando => recibidos.push(comando));
    asistente.setEstado(true);
    const resultado = texto => Object.assign([{ transcript: texto }], { isFinal: true });
    asistente.eventoTTS('a', 'inicio'); motor.onspeechstart();
    asistente.eventoTTS('a', 'fin');
    motor.onresult({ results: [resultado('Computadora cierra ventana')] }); local.avanzar(1300);
    assert.equal(recibidos.length, 0, 'Resultado tardío de eco');
    motor.onspeechstart(); motor.onresult({ results: [resultado('Computadora cierra ventana'), resultado('Computadora abre YouTube')] }); local.avanzar(551);
    assert.deepEqual(recibidos, ['abre YouTube']);
    asistente.eventoTTS('b', 'inicio'); motor.onspeechstart();
    motor.onresult({ results: [resultado('Computadora cierra ventana'), resultado('Computadora abre YouTube'), resultado('silencio')] });
    assert.equal(local.mensajes.at(-1).accion, 'callar');
});

comprobar('Cursor y mascotas admiten órdenes locales sin traducir búsquedas ni dictado', () => {
    const ejemplos = {
        en: ['resume cursor', 'control hands', 'pet Y Atti', 'greet pet', 'sleep pet', 'wake pet', 'hide pet'],
        pt: ['retoma cursor', 'controle mãos', 'mascote Y Atti', 'cumprimenta mascote', 'dorme mascote', 'acorda mascote', 'oculta mascote'],
        de: ['Cursor fortsetzen', 'Handsteuerung', 'Haustier Y Atti', 'Haustier grüßen', 'Haustier schlafen legen', 'Haustier wecken', 'Haustier ausblenden'],
        fr: ['reprends curseur', 'contrôle mains', 'mascotte Y Atti', 'salue mascotte', 'endors mascotte', 'réveille mascotte', 'cache mascotte'],
        it: ['riprendi cursore', 'controllo mani', 'mascotte Y Atti', 'saluta mascotte', 'addormenta mascotte', 'sveglia mascotte', 'nascondi mascotte']
    };
    for (const [idioma, frases] of Object.entries(ejemplos)) {
        const canonicas = frases.map(texto => preparar(texto, idioma));
        assert.deepEqual(canonicas.slice(0, 2), ['reanudar cursor', 'control manos']);
        assert.equal(orden(canonicas[2]).nombre, 'yati');
        assert.deepEqual(canonicas.slice(3).map(texto => orden(texto).estado || 'ninguna'), ['wave', 'sleep', 'wake', 'ninguna']);
    }
    assert.equal(preparar('search hide pet on YouTube', 'en'), 'busca hide pet en YouTube');
    assert.equal(preparar('write Wake pet, ¡Hola Yati!', 'en'), 'escribe Wake pet, ¡Hola Yati!');
});

comprobar('Todos los textos de las pantallas y metadatos tienen traducción completa', () => {
    const diccionarios = {};
    const contexto = vm.createContext({ TextosAdapta: { definir: textos => Object.assign(diccionarios, textos) } });
    const paginas = fs.readFileSync(path.join(raiz, 'textos_paginas.js'), 'utf8');
    vm.runInContext(paginas.slice(0, paginas.indexOf('function idiomaPagina')), contexto);
    const claves = Object.keys(diccionarios.es).sort();
    for (const idioma of ['en', 'pt', 'de', 'fr', 'it']) {
        assert.deepEqual(Object.keys(diccionarios[idioma]).sort(), claves, idioma);
        for (const clave of claves) assert.ok(diccionarios[idioma][clave].trim(), clave);
    }
    for (const carpeta of soloBase ? [raiz] : [raiz, lite]) {
        for (const archivo of ['popup.html', 'bienvenida.html', 'voz/permisos.html']) {
            const html = fs.readFileSync(path.join(carpeta, archivo), 'utf8');
            for (const [, clave] of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) assert.ok(diccionarios.es[clave], archivo + ': ' + clave);
            for (const [, script] of html.matchAll(/<script src="([^"]+)"/g)) assert.ok(fs.existsSync(path.resolve(carpeta, path.dirname(archivo), script)), script);
            assert.ok(html.indexOf('textos.js') < html.indexOf('textos_paginas.js'), 'Motor antes del diccionario');
        }
        const manifest = JSON.parse(fs.readFileSync(path.join(carpeta, 'manifest.json'), 'utf8'));
        assert.equal(manifest.default_locale, 'es');
        assert.ok(manifest.content_scripts[0].js.indexOf('textos.js') < manifest.content_scripts[0].js.indexOf('content_script.js'));
        assert.ok(fs.readFileSync(path.join(carpeta, 'voz/escucha.html'), 'utf8').includes('../textos.js'));
        for (const idioma of ['es', 'en', 'de', 'fr', 'it', 'pt_BR', 'pt_PT']) {
            const mensajes = JSON.parse(fs.readFileSync(path.join(carpeta, '_locales', idioma, 'messages.json'), 'utf8'));
            for (const clave of ['descripcion', 'panel']) assert.ok(mensajes[clave].message);
        }
    }
    if (!soloBase) assert.equal(fs.readFileSync(path.join(raiz, 'textos_paginas.js'), 'utf8'), fs.readFileSync(path.join(lite, 'textos_paginas.js'), 'utf8'));
});

comprobar('Nueva pestaña Base/Lite traduce todos sus textos a los seis idiomas', () => {
    const diccionarios = {};
    const contexto = vm.createContext({ TextosAdapta: { definir: textos => Object.assign(diccionarios, textos) } });
    const codigo = fs.readFileSync(path.join(raiz, 'nueva_pestana.js'), 'utf8');
    vm.runInContext(codigo.slice(0, codigo.indexOf('const formularioNtp')), contexto);
    const claves = Object.keys(diccionarios.es).sort();
    for (const idioma of ['en', 'pt', 'de', 'fr', 'it']) {
        assert.deepEqual(Object.keys(diccionarios[idioma]).sort(), claves, idioma);
        for (const clave of claves) assert.ok(diccionarios[idioma][clave].trim(), clave);
    }
    const html = fs.readFileSync(path.join(raiz, 'nueva_pestana.html'), 'utf8');
    for (const [, clave] of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) assert.ok(diccionarios.es[clave], clave);
    for (const [, clave] of codigo.matchAll(/'(ntp\.\w+)'\)/g)) assert.ok(diccionarios.es[clave], clave);
    for (const carpeta of [raiz, lite]) assert.equal(fs.readFileSync(path.join(carpeta, 'nueva_pestana.js'), 'utf8'), codigo);
});
comprobar('Reinyectar textos conserva el idioma, las claves y la instancia del controlador', () => {
    const entornoIdioma = entorno();
    const motor = entornoIdioma.contexto.TextosAdapta;
    motor.definir({ es: { 'pagina.prueba': 'Preparado' }, en: { 'pagina.prueba': 'Ready' } });
    motor.fijarIdioma('en-US');
    entornoIdioma.cargar(path.join(raiz, 'textos.js'));
    assert.equal(entornoIdioma.contexto.TextosAdapta, motor);
    assert.equal(motor.idioma, 'en');
    assert.equal(motor.t('pagina.prueba'), 'Ready');
});

comprobar('Variantes españolas (usted, tú, voseo, cortesía, Perú) llegan a la misma acción', () => {
    const grupos = {
        buscar_inteligente: ['abre YouTube', 'ábrame YouTube', 'abrí YouTube', 'abrir YouTube', 'oye, abre YouTube pe', 'porfa abre YouTube',
            'me abres YouTube', '¿puedes abrir YouTube?', 'podrías abrirme YouTube por favor', 'quiero que abras YouTube', 'me haces el favor de abrir YouTube',
            'ayúdame a abrir YouTube', 'ya pe abre YouTube', 'oe abre el YouTube', 'anda a YouTube', 'vamos a YouTube', 'llévame a YouTube',
            'vamos a abrir YouTube', 'ponme YouTube', 'entra al YouTube', 'abre la página de YouTube'],
        crear_pestana: ['nueva pestaña', 'abre una nueva pestaña', 'otra pestaña', 'ábreme otra pestaña', 'pestaña nueva', 'dame una pestaña nueva', 'crea una pestaña'],
        cerrar_pestana: ['cierra la pestaña', 'cierre la pestaña', 'cerrá esta pestaña', 'quiero que cierres la pestaña', 'cerrar pestaña actual', 'ciérrame esta pestaña'],
        atras: ['atrás', 'vuelve', 'vuelva', 'volvé', 'regresa', 'regrese a la página anterior', 've atrás', 'retrocede', 'página anterior', 'por favor vuelve atrás'],
        adelante: ['adelante', 'avanza', 'avance', 'página siguiente', 've adelante'],
        recargar: ['recarga', 'recargue la página', 'actualiza la página', 'refresca', 'vuelve a cargar la página', 'recarga esta página pues'],
        cambiar_pestana: ['siguiente pestaña', 'próxima pestaña', 'pestaña de la derecha', 'cambia a la pestaña anterior', 'pasa a la siguiente pestaña'],
        zoom: ['aumenta zoom', 'acerca', 'agranda', 'más grande', 'letra más grande', 'aleja', 'achica', 'más pequeño', 'zoom normal', 'tamaño normal'],
        ayuda: ['ayuda', 'ayúdame', 'qué puedo decir', 'qué comandos hay', 'comandos', 'qué puedes hacer'],
        tutorial: ['tutorial', 'abre el tutorial', 'muestra tutorial', 'inicia el tutorial', 'empieza el tutorial'],
        callar: ['cállate', 'silencio', 'deja de leer', 'para de hablar', 'basta', 'ya basta'],
        duplicar_pestana: ['duplica la pestaña', 'duplique esta pestaña'],
        cerrar_otras: ['cierra las otras pestañas', 'cierra todas las demás pestañas', 'deja solo esta pestaña'],
        silenciar: ['silencia la pestaña', 'mutea la pestaña', 'quita el sonido', 'sin sonido', 'activa el sonido', 'quita el silencio'],
        ir_pestana: ['pestaña 3', 've a la pestaña 2', 'la tercera pestaña', 'pestaña número dos', 'última pestaña', 'cambia a la pestaña cinco'],
        pantalla_completa: ['pantalla completa', 'pon pantalla completa', 'modo pantalla completa', 'sal de pantalla completa', 'pantalla normal']
    };
    for (const [accion, frases] of Object.entries(grupos)) for (const texto of frases) assert.equal(orden(texto)?.accion, accion, texto);
    assert.equal(orden('quiero que abras YouTube').sitio, 'youtube');
    assert.equal(orden('oe abre el Face').sitio, 'facebook');
    assert.equal(orden('pestaña 3').indice, 3);
    assert.equal(orden('última pestaña').indice, -1);
    assert.equal(orden('la tercera pestaña').indice, 3);
    assert.equal(orden('quita el sonido').activo, true);
    assert.equal(orden('activa el sonido').activo, false);
    assert.equal(orden('sal de pantalla completa').activa, false);
    assert.equal(orden('aleja').direccion, -1);
    assert.equal(orden('pestaña de la izquierda').direccion, -1);
});

comprobar('Desplazamiento en español admite variantes y nunca se activa dentro de búsquedas', () => {
    for (const [texto, signo, cantidad] of [['baja', 1, 0.7], ['bájale', 1, 0.7], ['bajar', 1, 0.7], ['baje un poquito', 1, 0.25], ['hacia abajo', 1, 0.7],
        ['para abajo', 1, 0.7], ['scrollea hacia abajo', 1, 0.7], ['sube', -1, 0.7], ['súbele un poco', -1, 0.25], ['desplázate hacia arriba', -1, 0.7], ['baja más', 1, 0.95]]) {
        orden(texto);
        assert.equal(prueba.desplazamientos.length, 1, texto);
        assert.equal(prueba.desplazamientos[0].top, 1000 * cantidad * signo, texto);
    }
    for (const texto of ['ve al final', 'baja hasta el final', 'hasta abajo', 'ir al inicio de la página', 'sube hasta arriba']) {
        orden(texto); assert.equal(prueba.desplazamientos.length, 1, texto); assert.ok('top' in prueba.desplazamientos[0]);
    }
    for (const texto of ['busca bajar de peso', 'busca arriba las manos en YouTube', 'buscar subir archivo', 'búscame cómo bajar música']) {
        assert.equal(orden(texto).accion, 'buscar_inteligente', texto); assert.equal(prueba.desplazamientos.length, 0, texto);
    }
    assert.equal(orden('busca arriba las manos en YouTube').query, 'arriba las manos');
});

comprobar('Cortesía y muletillas no alteran el dictado ni la consulta', () => {
    orden('por favor escribe Hola, ¿cómo estás? Gracias pe');
    assert.equal(dictado, 'Hola, ¿cómo estás? Gracias pe');
    orden('escriba Ya pe, abre YouTube.');
    assert.equal(dictado, 'Ya pe, abre YouTube.');
    const consulta = orden('oye, búscame Ají de Gallina en YouTube porfa');
    assert.equal(consulta.query, 'Ají de Gallina'); assert.equal(consulta.sitio, 'youtube');
    assert.equal(orden('busca en YouTube'), undefined, '«busca en YouTube» pide la consulta en vez de buscar «en YouTube»');
    assert.equal(orden('busca en YouTube gatos').query, 'gatos');
});

comprobar('Alias de cursor y selección llegan exactos al worker y al controlador', () => {
    for (const [texto, canonico] of [['activa el cursor', 'activar cursor'], ['enciende la cámara', 'activar cursor'], ['apaga el mouse', 'desactivar cursor'],
        ['desactive el cursor por favor', 'desactivar cursor'], ['centra el cursor', 'calibrar cursor'], ['pausa el cursor', 'pausar cursor'],
        ['dale clic derecho', 'clic derecho'], ['dele clic', 'dale clic'], ['hágale clic', 'hazle clic'], ['por favor dale clic', 'dale clic']]) {
        assert.equal(frase('Computadora ' + texto, 'es-PE'), canonico, texto);
    }
    const acciones = [];
    const completa = new VoiceAssistant(accion => { acciones.push(accion); return true; });
    for (const texto of ['activa el cursor', 'da clic', 'clic', 'pulsa', 'clickea', 'aplasta']) completa.ejecutarComando(texto);
    assert.deepEqual([...acciones], ['activar', 'izquierdo', 'izquierdo', 'izquierdo', 'izquierdo', 'izquierdo']);
    let clics = 0;
    const boton = { innerText: 'Contacto', style: {}, getAttribute: () => null, getClientRects: () => [{}], focus() {}, click: () => clics++ };
    prueba.contexto.document.querySelectorAll = () => [boton];
    for (const texto of ['dale clic en Contacto', 'haz clic sobre Contacto', 'aplasta Contacto', 'toca Contacto', 'presione Contacto']) orden(texto);
    prueba.contexto.document.querySelectorAll = () => [];
    assert.equal(clics, 5);
});

comprobar('Palabra de activación por idioma, «Computadora» siempre y sin disparos sin ella', () => {
    for (const [texto, idioma] of [['Computer, open YouTube', 'en-US'], ['computador abre YouTube', 'pt-BR'], ['Computer öffne YouTube', 'de-DE'],
        ['Ordinateur, ouvre YouTube', 'fr-FR'], ['Computer apri YouTube', 'it-IT'], ['Computadora open YouTube', 'en-GB'], ['Computadora abre YouTube', 'es-ES'],
        ['Computador abre YouTube', 'es-CO']]) {
        assert.equal(frase(texto, idioma), 'abre YouTube', texto);
    }
    for (const [texto, idioma] of [['open YouTube', 'en-US'], ['ouvre YouTube', 'fr-FR'], ['Computer open YouTube', 'es-PE'], ['Ordinateur ouvre YouTube', 'en-US'],
        ['computación abre YouTube', 'es-PE'], ['compu abre YouTube', 'es-PE']]) {
        assert.equal(frase(texto, idioma), undefined, texto);
    }
    const espera = new VoiceAssistant(null, () => {});
    espera.idioma = 'fr-FR'; espera.microfonoIniciado = espera.permitidoPorUsuario = true; espera.reproducirBeep = () => {};
    espera.textoReconocido = 'Ordinateur, s\'il vous plaît'; espera.procesarFraseContinua();
    assert.equal(espera.esperandoComando, true, 'Una muletilla sola equivale a la palabra de activación');
});

comprobar('Nombre de activación configurable: validación, detección tolerante y recorte del original (Base y Lite)', () => {
    for (const variante of [prueba, entorno(lite, 'clases')]) {
        const { VoiceAssistant: Voz, validarNombreActivacion: validar, palabraActivacion } = variante.contexto;
        const decir = (texto, nombre, idioma = 'es-PE') => {
            const recibido = [];
            const central = new Voz(null, comando => recibido.push(comando));
            central.idioma = idioma; central.microfonoIniciado = central.permitidoPorUsuario = true; central.reproducirBeep = () => {};
            central.setNombreActivacion(nombre);
            central.textoReconocido = texto; central.procesarFraseContinua();
            return central.esperandoComando ? 'espera' : recibido[0];
        };
        // Predeterminado intacto: ausente, vacío o inválido.
        for (const nombre of [undefined, '', '   ', 'ab', 'abre', 42]) {
            assert.equal(decir('Computadora abre YouTube', nombre), 'abre YouTube', String(nombre));
            assert.equal(decir('compu abre YouTube', nombre), undefined);
        }
        assert.equal(decir('Computer, open YouTube', '', 'en-US'), 'abre YouTube');
        assert.equal(palabraActivacion('', 'fr-FR'), 'Ordinateur');
        // Simple, multipalabra, sílabas, acentos, plural y una edición en nombres largos.
        assert.equal(decir('Jarvis, abre YouTube', 'Jarvis'), 'abre YouTube');
        assert.equal(decir('jar vis abre YouTube', 'Jarvis'), 'abre YouTube');
        assert.equal(decir('Señor Robot busca Perú', '  Señor   Robot '), 'busca Perú');
        assert.equal(decir('Lucia abre YouTube', 'Lucía'), 'abre YouTube');
        assert.equal(decir('Lu cía, abre YouTube', 'Lucía'), 'abre YouTube');
        assert.equal(decir('Lucías abre YouTube', 'Lucía'), 'abre YouTube');
        assert.equal(decir('Lucas abre YouTube', 'Lucía'), undefined, 'Otro nombre no activa');
        // 1. Sin tolerancia de ediciones: un parecido no dispara la escucha permanente.
        assert.equal(decir('bonito, cierra la pestaña', 'Benito'), undefined, 'bonito ≠ Benito');
        assert.equal(decir('Valentín abre YouTube', 'Valentina'), undefined);
        assert.equal(decir('Be ni to, cierra la pestaña', 'Benito'), 'cierra la pestaña', 'Sílabas sí');
        // 2. Un nombre partido se consume entero: el recorte no deja letras sueltas.
        for (const [texto, nombre] of [['An n, abre YouTube', 'Ann'], ['Rob b abre YouTube', 'Rob'], ['Jef f, abre YouTube', 'Jef']]) {
            assert.equal(decir(texto, nombre), 'abre YouTube', texto);
        }
        // 3. Sólo cadenas: otros tipos vuelven a «Computadora».
        for (const valor of [false, true, ['Jarvis'], 7, { nombre: 'Jarvis' }]) {
            assert.equal(validar(valor).ok, false, JSON.stringify(valor));
            assert.equal(decir('Computadora abre YouTube', valor), 'abre YouTube');
            assert.equal(decir('Jarvis abre YouTube', valor), undefined);
        }
        // 4. Infinitivos y formas del parser y del mapa `verbos` también están reservados.
        const fuente = fs.readFileSync(path.join(raiz, 'classes/VoiceAssistant.js'), 'utf8');
        const parser = fuente.slice(fuente.indexOf('    ejecutarComando(texto)'));
        const infinitivos = [...parser.matchAll(/([a-z]{3,})\(\?:(r|ir|er)\)\?/g)].flatMap(([, raiz, final]) => [raiz, raiz + final]);
        const verbos = Object.entries(variante.contexto.IdiomasVoz.es.verbos).flat();
        for (const forma of ['refrescar', 'actualizar', 'retroceder', 'acercar', 'alejar', ...infinitivos, ...verbos]) {
            assert.equal(validar(forma).ok, false, forma);
        }
        // 6. Predeterminado sin fragmentos, como antes del nombre configurable.
        assert.equal(decir('compu tadora abre YouTube', ''), undefined);
        assert.equal(decir('Compu tadora abre YouTube', undefined), undefined);
        // 7. Repeticiones largas: fragmentos acotados por inicio y claves precalculadas.
        const inicio = Date.now();
        for (const nombre of ['Ana', 'Señor Robot', '']) variante.contexto.buscarActivacion('a '.repeat(600) + 'x', nombre, 'es-PE');
        assert.ok(Date.now() - inicio < 100, 'Búsqueda acotada en textos repetitivos');
        assert.equal(decir('Computadora abre YouTube', 'Jarvis'), undefined, 'Computadora ignorada con nombre propio');
        assert.equal(decir('Computer, open YouTube', 'Jarvis', 'en-US'), undefined);
        assert.equal(decir('Jarvis, open YouTube', 'Jarvis', 'en-US'), 'abre YouTube', 'Mismo nombre en otro idioma');
        assert.equal(decir('Jarvis, escribe Hola Mundo, ¿Qué Tal?', 'Jarvis'), 'escribe Hola Mundo, ¿Qué Tal?', 'Recorte conserva mayúsculas y signos');
        assert.equal(decir('Jarvis, por favor', 'Jarvis'), 'espera', 'Muletilla sola equivale al nombre solo');
        // Ventana de 8 s: sólo al inicio y conserva el texto si el nombre aparece después.
        const espera = new Voz(null, comando => espera.recibido = comando);
        espera.microfonoIniciado = espera.permitidoPorUsuario = true; espera.reproducirBeep = () => {};
        espera.setNombreActivacion('Jarvis');
        espera.textoReconocido = 'Jarvis'; espera.procesarFraseContinua(); assert.equal(espera.esperandoComando, true);
        espera.textoReconocido = 'escribe Jarvis portátil'; espera.procesarFraseContinua(); assert.equal(espera.recibido, 'escribe Jarvis portátil');
        let aviso; espera.alEstado = texto => aviso = texto; espera.mostrarEstado();
        assert.equal(aviso, 'Voz activa. Di «Jarvis».', 'El indicador muestra el nombre elegido');
        // Validación compartida con el popup.
        assert.deepEqual({ ...validar('  Jar   vis ') }, { ok: true, nombre: 'Jar vis', motivo: null });
        for (const [nombre, motivo] of [['Al', 'longitud'], ['Un nombre larguísimo de más', 'longitud'], ['R2D2', 'caracteres'], ['Uno dos tres cuatro', 'palabras'],
            ['A-B', 'letras'], ['Abre', 'orden'], ['busca', 'orden'], ['Detente', 'orden'], ['clic', 'orden'], ['Para', 'orden'], ['open', 'orden'],
            ['Tinku', 'mascota'], ['Tin ku', 'mascota'], ['Yatti', 'mascota'], ['oye', 'muletilla'], ['por favor', 'muletilla']]) {
            assert.equal(validar(nombre).motivo, 'activacion.' + motivo, nombre);
        }
        for (const nombre of ['Lucía', 'Jean-Luc', 'O’Neil', 'Max', 'Señor Robot']) assert.equal(validar(nombre).ok, true, nombre);
    }
});

comprobar('Popup: una lectura inicial tardía del nombre no pisa lo escrito ni un cambio posterior (5)', () => {
    const cargarPopup = carpeta => {
        const crear = () => ({ value: '', dataset: {}, atributos: {}, oyentes: {}, setAttribute(clave, valor) { this.atributos[clave] = valor; },
            addEventListener(tipo, accion) { this.oyentes[tipo] = accion; }, appendChild() {}, querySelector() { return this; } });
        const elementos = {}, cambios = [], lecturas = [];
        const contexto = vm.createContext({ console, setInterval: () => 0, clearInterval() {}, window: { addEventListener() {} },
            document: { activeElement: null, getElementById: id => elementos[id] ||= crear(), createElement: crear },
            ponerTexto: (elemento, clave) => { elemento.textContent = clave; },
            chrome: { runtime: { sendMessage() {}, getURL: x => x }, tabs: { create: async () => {} }, storage: {
                // Respuesta controlada y síncrona: llega cuando la prueba decide.
                local: { get: () => ({ then(alLeer) { lecturas.push(alLeer); return { catch() {} }; } }), set: async () => {} },
                onChanged: { addListener: accion => cambios.push(accion) } } } });
        for (const archivo of ['sitios.js', 'voz/popup.js']) vm.runInContext(fs.readFileSync(path.join(carpeta, archivo), 'utf8'), contexto);
        return { campo: elementos.nombreActivacion, cambios, lecturas };
    };
    for (const carpeta of [raiz, lite]) {
        const escrito = cargarPopup(carpeta);
        escrito.campo.value = 'Lucía'; escrito.campo.oyentes.input();
        escrito.lecturas[0]({ nombreActivacion: 'Jarvis' });
        assert.equal(escrito.campo.value, 'Lucía', 'Lo escrito se conserva');
        const posterior = cargarPopup(carpeta);
        posterior.cambios.at(-1)({ nombreActivacion: { newValue: 'Max' } }, 'local');
        posterior.lecturas[0]({ nombreActivacion: 'Jarvis' });
        assert.equal(posterior.campo.value, 'Max', 'Un cambio posterior prevalece');
        const normal = cargarPopup(carpeta);
        normal.lecturas[0]({ nombreActivacion: 'Jarvis' });
        assert.equal(normal.campo.value, 'Jarvis', 'Sin ediciones, la lectura inicial se muestra');
    }
});

comprobar('Inglés, portugués, alemán, francés e italiano cubren las órdenes principales', () => {
    const casos = {
        'en-US': ['Computer open YouTube', 'Computer search Funny Cats on YouTube', 'Computer scroll down', 'Computer new tab', 'Computer close tab', 'Computer go back', 'Computer click', 'Computer write Hello World', 'Computer click on Contact'],
        'pt-BR': ['Computador abre o YouTube', 'Computador pesquisa Gatos Engraçados no YouTube', 'Computador rola para baixo', 'Computador nova aba', 'Computador fecha a aba', 'Computador volta', 'Computador clica', 'Computador escreve Olá Mundo', 'Computador clica em Contato'],
        'de-DE': ['Computer öffne YouTube', 'Computer suche Lustige Katzen auf YouTube', 'Computer nach unten', 'Computer neuer Tab', 'Computer schließe den Tab', 'Computer zurück', 'Computer klick', 'Computer schreibe Hallo Welt', 'Computer klicke auf Kontakt'],
        'fr-FR': ['Ordinateur ouvre YouTube', 'Ordinateur cherche Chats Drôles sur YouTube', 'Ordinateur descends', 'Ordinateur nouvel onglet', "Ordinateur ferme l'onglet", 'Ordinateur retour', 'Ordinateur clique', 'Ordinateur écris Bonjour le Monde', 'Ordinateur clique sur Contact'],
        'it-IT': ['Computer apri YouTube', 'Computer cerca Gatti Divertenti su YouTube', 'Computer scorri giù', 'Computer nuova scheda', 'Computer chiudi la scheda', 'Computer indietro', 'Computer clicca', 'Computer scrivi Ciao Mondo', 'Computer clicca su Contatto']
    };
    const consultas = { 'en-US': 'Funny Cats', 'pt-BR': 'Gatos Engraçados', 'de-DE': 'Lustige Katzen', 'fr-FR': 'Chats Drôles', 'it-IT': 'Gatti Divertenti' };
    const textos = { 'en-US': 'Hello World', 'pt-BR': 'Olá Mundo', 'de-DE': 'Hallo Welt', 'fr-FR': 'Bonjour le Monde', 'it-IT': 'Ciao Mondo' };
    const contacto = { 'en-US': 'Contact', 'pt-BR': 'Contato', 'de-DE': 'Kontakt', 'fr-FR': 'Contact', 'it-IT': 'Contatto' };
    for (const [idioma, [abrir, buscar, bajar, nueva, cerrar, atras, clic, escribir, pulsar]] of Object.entries(casos)) {
        assert.equal(traducida(abrir, idioma)?.sitio, 'youtube', abrir);
        const busqueda = traducida(buscar, idioma);
        assert.equal(busqueda.query, consultas[idioma], buscar); assert.equal(busqueda.sitio, 'youtube', buscar);
        traducida(bajar, idioma); assert.equal(prueba.desplazamientos[0]?.top, 700, bajar);
        assert.equal(traducida(nueva, idioma).accion, 'crear_pestana', nueva);
        assert.equal(traducida(cerrar, idioma).accion, 'cerrar_pestana', cerrar);
        assert.equal(traducida(atras, idioma).accion, 'atras', atras);
        const acciones = [];
        const completa = new VoiceAssistant(accion => { acciones.push(accion); return true; });
        completa.ejecutarComando(frase(clic, idioma)); assert.deepEqual([...acciones], ['izquierdo'], clic);
        traducida(escribir, idioma); assert.equal(dictado, textos[idioma], escribir);
        assert.equal(frase(pulsar, idioma), 'clic en ' + contacto[idioma], pulsar);
    }
    assert.equal(traducida('Computer search for Harry Potter in a new tab', 'en-US').destino, 'pestana');
    assert.equal(traducida('Computer search for Harry Potter in a new tab', 'en-US').query, 'Harry Potter');
    assert.equal(traducida('Computer YouTube öffnen', 'de-DE').sitio, 'youtube');
    assert.equal(traducida('Computer go to tab 3', 'en-US').indice, 3);
    assert.equal(traducida('Computer help', 'en-US').accion, 'ayuda');
    for (const [texto, idioma] of [['Computer tutorial', 'en-US'], ['Computer open the tutorial', 'en-US'], ['Computador abre o tutorial', 'pt-BR'],
        ['Computer öffne das Tutorial', 'de-DE'], ['Computer Anleitung', 'de-DE'], ['Ordinateur ouvre le tutoriel', 'fr-FR'], ['Computer apri il tutorial', 'it-IT']]) {
        assert.equal(traducida(texto, idioma).accion, 'tutorial', texto);
    }
    assert.equal(traducida('Computer search tutorial', 'en-US').query, 'tutorial', '«tutorial» dentro de una búsqueda no abre el tutorial');
    assert.equal(traducida('Computer please open YouTube, thanks', 'en-US').sitio, 'youtube');
    assert.equal(frase('Computer write I live in a new window, please', 'en-US'), 'escribe I live in a new window, please', 'El dictado no se traduce');
    assert.equal(traducida('Computer search scroll down tutorial', 'en-US').query, 'scroll down tutorial');
    assert.equal(prueba.desplazamientos.length, 0, 'Sin desplazamiento dentro de búsquedas en inglés');
    assert.equal(traducida('Computer search cats in the garden', 'en-US').query, 'cats in the garden', 'Un conector sin sitio conocido queda en la consulta');
    assert.equal(frase('Computadora abre YouTube', 'en-US'), 'abre YouTube', 'El español sigue funcionando con otro idioma');
    assert.equal(preparar('busca cats en YouTube', 'es'), preparar(preparar('busca cats en YouTube', 'es'), 'es'), 'Preparación idempotente');
});

comprobar('Cambiar idioma reinicia el reconocedor sin cortar el ciclo siempre activo', () => {
    const local = entorno();
    const motores = [];
    local.contexto.window.webkitSpeechRecognition = class { constructor() { motores.push(this); } start() { this.onstart?.(); } abort() {} };
    const asistente = new local.contexto.VoiceAssistant(null, () => {});
    asistente.setIdioma('en-US');
    asistente.setEstado(true);
    assert.equal(motores.length, 1); assert.equal(motores[0].lang, 'en-US');
    asistente.setIdioma('en-US'); assert.equal(motores.length, 1, 'Mismo idioma no reinicia');
    asistente.setIdioma('fr-FR');
    assert.equal(motores.length, 2); assert.equal(motores[1].lang, 'fr-FR'); assert.equal(motores[0].onend, null);
    motores[1].onend(); local.avanzar(301); assert.equal(asistente.reconocimientoVoz, motores[1], 'Sigue reiniciándose el reconocedor nuevo');
    asistente.setEstado(false); asistente.setIdioma('de-DE'); assert.equal(motores.length, 2, 'Apagado sólo guarda el idioma');
});

comprobar('Avisos en el idioma de la interfaz con tipo para la mascota; español intacto por defecto', () => {
    const estados = [];
    const asistente = new VoiceAssistant(null, () => {});
    asistente.alEstado = (texto, tipo) => estados.push([texto, tipo]);
    asistente.microfonoIniciado = asistente.permitidoPorUsuario = true; asistente.reproducirBeep = () => {};
    const ultimo = () => estados.at(-1);
    asistente.mostrarEstado(); assert.deepEqual(ultimo(), ['Voz activa. Di «Computadora».', 'activa']);
    asistente.ejecutarComando('xyzzy'); assert.deepEqual(ultimo(), ['No entendí. Prueba «abre YouTube», «busca gatos en Google» o di «ayuda».', 'error']);
    asistente.textoReconocido = 'Computadora'; asistente.procesarFraseContinua(); assert.deepEqual(ultimo(), ['Di tu comando.', 'espera']);
    asistente.cancelarEspera();
    // Resultado del reconocedor real: lo escuchado se publica con tipo «escucha».
    const local = entorno();
    let motor;
    local.contexto.window.webkitSpeechRecognition = class { constructor() { motor = this; } start() {} abort() {} };
    const escucha = new local.contexto.VoiceAssistant(null, () => {});
    const recibidos = [];
    escucha.alEstado = (texto, tipo) => recibidos.push([texto, tipo]);
    escucha.setEstado(true);
    const resultado = [{ transcript: 'hola mundo' }]; resultado.isFinal = true;
    motor.onresult({ results: [resultado] }); assert.deepEqual(recibidos.at(-1), ['Escuché: hola mundo', 'escucha']);
    local.contexto.TextosAdapta.fijarIdioma('en-US');
    motor.onresult({ results: [Object.assign([{ transcript: 'hello' }], { isFinal: true })] }); assert.deepEqual(recibidos.at(-1), ['Heard: hello', 'escucha']);
    try {
        assert.equal(prueba.contexto.TextosAdapta.fijarIdioma('en-GB'), 'en');
        asistente.mostrarEstado(); assert.deepEqual(ultimo(), ['Voice on. Say “Computer”.', 'activa']);
        asistente.ejecutarComando('xyzzy'); assert.deepEqual(ultimo(), ['I did not understand. Try “open YouTube”, “search cats on Google” or say “help”.', 'error']);
        asistente.textoReconocido = 'Computer'; asistente.idioma = 'en-US'; asistente.procesarFraseContinua(); assert.deepEqual(ultimo(), ['Say your command.', 'espera']);
        asistente.cancelarEspera();
        prueba.contexto.TextosAdapta.fijarIdioma('fr-FR');
        asistente.mostrarEstado(); assert.deepEqual(ultimo(), ['Voix active. Dites « Ordinateur ».', 'activa']);
        // La selección se anuncia en el idioma activo y por TTS sin fijar `lang` (el worker usa el de la interfaz).
        prueba.contexto.TextosAdapta.fijarIdioma('en');
        prueba.mensajes.length = 0;
        asistente.seleccionarElemento({ getAttribute: nombre => nombre === 'aria-label' ? 'Home' : null, setAttribute() {}, removeAttribute() {} });
        assert.equal(prueba.mensajes[0].texto, 'Selected: Home. Say “click selection” to activate it.'); assert.equal(prueba.mensajes[0].lang, undefined);
        asistente.limpiarSeleccion();
    } finally { prueba.contexto.TextosAdapta.fijarIdioma('es'); }
});

comprobar('Dictado y borrado nunca escriben en campos de contraseña y avisan traducido', () => {
    for (const idioma of ['es-PE', 'en-US', 'pt-BR', 'de-DE', 'fr-FR', 'it-IT']) {
        const entornoPass = entorno(); entornoPass.contexto.TextosAdapta.fijarIdioma(idioma);
        entornoPass.contexto.HTMLInputElement = class {};
        Object.defineProperty(entornoPass.contexto.HTMLInputElement.prototype, 'value', { set(valor) { this.value = valor; } });
        const asistente = new entornoPass.contexto.VoiceAssistant(); const avisos = [];
        asistente.mostrarEstado = (texto, tipo) => avisos.push([texto, tipo]);
        for (const campo of [
            { tagName: 'INPUT', type: 'password', value: 'secreta' },
            { tagName: 'INPUT', type: 'text', value: 'secreta', getAttribute: () => 'section-login current-password', dispatchEvent() {} },
            { tagName: 'DIV', isContentEditable: true, textContent: 'secreta', getAttribute: () => 'new-password' }
        ]) {
            assert.equal(asistente.escribirEnCampo(campo, 'hola'), false); assert.equal(asistente.escribirEnCampo(campo, '', true), false);
            assert.equal(campo.value ?? campo.textContent, 'secreta');
        }
        assert.equal(avisos.length, 6); assert.equal(avisos[0][1], 'error');
        assert.ok(avisos[0][0] && avisos[0][0] !== 'voz.sinContrasena', 'Aviso traducido en ' + idioma);
    }
});

comprobar('Base y Lite comparten exactamente los archivos de voz', () => {
    if (soloBase) return;
    for (const [base, ligera] of [['sitios.js', 'sitios.js'], ['classes/VoiceAssistant.js', 'clases/VoiceAssistant.js'], ['background.js', 'background.js'],
        ['voz/escucha.js', 'voz/escucha.js'], ['voz/permisos.js', 'voz/permisos.js'], ['voz/popup.js', 'voz/popup.js'], ['textos.js', 'textos.js'],
        ['filtros_ui.js', 'filtros_ui.js'], ['bienvenida.js', 'bienvenida.js'], ['interfaz.css', 'interfaz.css']]) {
        assert.equal(fs.readFileSync(path.join(raiz, base), 'utf8'), fs.readFileSync(path.join(lite, ligera), 'utf8'), base);
    }
    const ligera = entorno(lite, 'clases');
    assert.equal(ligera.contexto.VoiceAssistant.prepararComando('Computer search cats on YouTube'.slice(9), 'en-US'), 'busca cats en YouTube');
});

async function principal() {
    for (const fallo of ['respuesta', 'puerto']) {
        const elementos = {};
        const crear = () => ({ dataset: {}, oyentes: {}, value: '', setAttribute() {}, appendChild() {},
            addEventListener(tipo, accion) { this.oyentes[tipo] = accion; }, querySelector() { return this; } });
        const contexto = vm.createContext({ console, setInterval: () => 0, clearInterval() {}, window: { addEventListener() {} },
            document: { getElementById: id => elementos[id] ||= crear(), createElement: crear },
            ponerTexto: (elemento, clave) => { elemento.textContent = clave; },
            chrome: { runtime: { getURL: x => x, sendMessage: async (dato, responder) => {
                if (dato.accion === 'voz_estado') { responder?.({ ok: true }); return; }
                if (fallo === 'puerto') throw new Error('Puerto cerrado');
                return { ok: false };
            } }, storage: { local: { get: async () => ({}), set: async () => {} }, onChanged: { addListener() {} } } } });
        for (const archivo of ['sitios.js', 'voz/popup.js']) vm.runInContext(fs.readFileSync(path.join(raiz, archivo), 'utf8'), contexto);
        await elementos.abrirTutorial.oyentes.click();
        assert.equal(elementos.estadoPanel.textContent, 'popup.tutorialNoAbrio', 'El panel anuncia el fallo del Tutorial: ' + fallo);
    }
    comprobaciones++; console.log('✓ Botón Tutorial anuncia respuesta fallida y puerto cerrado');
    for (const ok of [false, true]) {
        const elementos = {}, mensajesPermiso = []; let liberada = false;
        const crear = () => ({ dataset: {}, oyentes: {}, focus() {}, setAttribute() {}, removeAttribute() {},
            addEventListener(tipo, accion) { this.oyentes[tipo] = accion; } });
        const contexto = vm.createContext({ URLSearchParams, location: { search: '?dispositivo=camara' },
            document: { getElementById: id => elementos[id] ||= crear(), querySelector: crear },
            ponerTexto: (elemento, clave) => { elemento.dataset.i18n = clave; elemento.textContent = clave; },
            navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() { liberada = true; } }] }) } },
            chrome: { runtime: { getManifest: () => ({ content_scripts: [{ js: ['classes/KineticEngine.js'] }] }),
                sendMessage: async dato => { mensajesPermiso.push(dato.accion); return { ok: dato.accion !== 'camara_permiso_listo' || ok }; } } } });
        vm.runInContext(fs.readFileSync(path.join(raiz, 'voz/permisos.js'), 'utf8'), contexto);
        await elementos['adapta-pe-permitir-microfono'].oyentes.click();
        assert.equal(liberada, true);
        assert.deepEqual(mensajesPermiso, ['voz_reiniciar', 'camara_permiso_listo']);
        assert.equal(elementos['adapta-pe-permiso-estado'].textContent, ok ? 'permisos.camaraLista' : 'permisos.falloCamara');
    }
    comprobaciones++; console.log('✓ Permiso de cámara: libera captura y no anuncia retorno si el worker falla');
    const resultados = new VoiceAssistant();
    assert.equal((await resultados.ejecutarConResultado('xyzzy')).resultado, 'desconocida');
    assert.equal((await resultados.ejecutarConResultado('busca en YouTube')).resultado, 'fallo');
    assert.equal((await resultados.ejecutarConResultado('clic')).resultado, 'fallo');
    assert.equal((await resultados.ejecutarConResultado('abre YouTube')).resultado, 'ok');
    comprobaciones++; console.log('✓ Resultado real: éxito, desconocida, campo ausente y consulta incompleta');
    // Service worker real con Chrome simulado: idioma configurado y acciones nuevas de pestañas.
    const fondo = entorno();
    const enviados = [], llamadas = [], locuciones = [];
    let manejador, almacen = { voz: true, idiomaVoz: 'auto' }, alCambiar;
    const evento = { addListener() {} };
    const chrome = fondo.contexto.chrome;
    fondo.contexto.navigator = { language: 'pt-BR' };
    chrome.runtime.sendMessage = async dato => { enviados.push(dato); return { ok: true }; };
    chrome.runtime.getManifest = () => JSON.parse(fs.readFileSync(path.join(raiz, 'manifest.json'), 'utf8'));
    chrome.runtime.getURL = archivo => 'chrome-extension://prueba/' + archivo;
    chrome.runtime.getContexts = async () => [{}];
    chrome.runtime.onMessage = { addListener: accion => { manejador = accion; } };
    chrome.runtime.onStartup = chrome.runtime.onInstalled = chrome.runtime.onConnect = evento;
    const sesion = {};
    chrome.storage = {
        local: { get: async () => ({ ...almacen }), set: async () => {} },
        session: { get: async clave => (clave in sesion ? { [clave]: sesion[clave] } : {}), set: async datos => { Object.assign(sesion, datos); }, remove: async clave => { delete sesion[clave]; } },
        onChanged: { addListener: accion => { alCambiar = accion; } }
    };
    chrome.tabs = { query: async () => [{ id: 10, windowId: 1, index: 0 }, { id: 20, windowId: 1, index: 1, pinned: true }, { id: 30, windowId: 1, index: 2 }], sendMessage: async () => ({ ok: true }),
        update: async (id, datos) => llamadas.push({ update: id, ...datos }), remove: async ids => llamadas.push({ remove: ids }),
        duplicate: async id => llamadas.push({ duplicate: id }), onActivated: evento, onUpdated: evento };
    chrome.windows = { getLastFocused: async () => ({ focused: false }), get: async id => ({ id, state: 'maximized' }),
        update: async (id, datos) => llamadas.push({ ventana: id, ...datos }), onFocusChanged: evento, onRemoved: evento };
    chrome.offscreen = { createDocument: async () => {}, closeDocument: async () => {} };
    chrome.tts = { stop() {}, speak: (texto, opciones) => locuciones.push({ texto, ...opciones }) };
    fondo.contexto.importScripts = () => {};
    fondo.cargar(path.join(raiz, 'background.js'));
    await vm.runInContext('transicionPaginas', fondo.contexto);
    await vm.runInContext('transicionVoz', fondo.contexto);
    assert.equal(enviados.find(dato => dato.accion === 'voz_configurar').idioma, 'pt-BR', 'auto sigue al navegador');
    almacen.idiomaVoz = 'de-DE'; enviados.length = 0;
    alCambiar({ idiomaVoz: { newValue: 'de-DE' } }, 'local');
    await vm.runInContext('transicionVoz', fondo.contexto);
    assert.equal(enviados.find(dato => dato.accion === 'voz_configurar').idioma, 'de-DE', 'El cambio se aplica en vivo');
    assert.equal(vm.runInContext("idiomaVoz('xx-YY')", fondo.contexto), 'pt-BR');
    fondo.contexto.navigator = { language: 'ja-JP' };
    assert.equal(vm.runInContext("idiomaVoz('auto')", fondo.contexto), 'es-PE');
    // Idioma del sistema: primer idioma preferido admitido, región conservada, sin permisos.
    fondo.contexto.navigator = { languages: ['ja-JP', 'fr-CA', 'en-US'], language: 'ja-JP' };
    assert.equal(vm.runInContext("idiomaVoz('auto')", fondo.contexto), 'fr-CA');
    fondo.contexto.navigator = { languages: ['en'] };
    assert.equal(vm.runInContext("idiomaVoz('auto')", fondo.contexto), 'en-US');
    fondo.contexto.navigator = { languages: ['ES-pe'] };
    assert.equal(vm.runInContext("idiomaVoz('auto')", fondo.contexto), 'es-PE');
    assert.equal(vm.runInContext("idiomaVoz('it-IT')", fondo.contexto), 'it-IT', 'Elegir en el popup prevalece sobre el sistema');
    const enviar = peticion => new Promise(responder => manejador(peticion, { id: 'prueba', tab: { id: 10, windowId: 1 } }, responder));
    await enviar({ accion: 'ir_pestana', indice: -1 }); assert.equal(llamadas.at(-1).update, 30);
    await enviar({ accion: 'ir_pestana', indice: 2 }); assert.equal(llamadas.at(-1).update, 20);
    assert.equal((await enviar({ accion: 'ir_pestana', indice: 9 })).ok, false);
    const antesDeCerrar = llamadas.length;
    assert.equal((await enviar({ accion: 'cerrar_otras' })).resultado, 'confirmando');
    assert.equal(llamadas.length, antesDeCerrar, 'Pedir cierre no ejecuta');
    const confirmar = () => enviar({ accion: 'confirmar_voz', texto: vm.runInContext('confirmacionVoz.frase', fondo.contexto) });
    assert.equal((await confirmar()).resultado, 'ok');
    assert.deepEqual([...llamadas.at(-1).remove], [30], 'Conserva la actual y las fijadas');
    assert.equal((await enviar({ accion: 'confirmar_voz', texto: 'confirmo cerrar' })).resultado, 'fallo', 'No repetir');
    await enviar({ accion: 'cerrar_otras' }); vm.runInContext('confirmacionVoz.vence = Date.now() - 1', fondo.contexto);
    assert.equal((await confirmar()).resultado, 'fallo', 'Caducidad');
    await enviar({ accion: 'cerrar_otras' });
    assert.equal((await enviar({ accion: 'confirmar_voz', texto: 'confirmo cerrar ventana' })).resultado, 'fallo', 'Acción exacta');
    await enviar({ accion: 'cerrar_otras' });
    chrome.tabs.query = async () => [{ id: 10, windowId: 1, index: 0 }, { id: 30, windowId: 1, index: 2 }, { id: 40, windowId: 1, index: 3 }];
    assert.equal((await confirmar()).resultado, 'fallo', 'Destino cambiado: otra lista de pestañas');
    await enviar({ accion: 'cerrar_otras' });
    await enviar({ accion: 'cancelar_voz' }); assert.equal(vm.runInContext('confirmacionVoz', fondo.contexto), null);
    // Cerrar la pestaña actual también confirma: con una sola pestaña cerraría la ventana.
    const antesPestana = llamadas.length;
    assert.equal((await enviar({ accion: 'cerrar_pestana' })).resultado, 'confirmando');
    assert.equal(llamadas.length, antesPestana, 'Pedir cerrar pestaña no ejecuta');
    assert.equal((await confirmar()).resultado, 'ok'); assert.deepEqual([...llamadas.at(-1).remove], [10]);
    // Los 8 s empiezan al terminar la pregunta; una pregunta interrumpida cancela.
    const restante = () => vm.runInContext('confirmacionVoz && confirmacionVoz.vence - Date.now()', fondo.contexto);
    await enviar({ accion: 'cerrar_otras' }); assert.ok(restante() > 8000, 'No corre mientras suena la pregunta');
    locuciones.at(-1).onEvent({ type: 'end' }); assert.ok(restante() <= 8000 && restante() > 7000, 'Corre desde el fin de la pregunta');
    await enviar({ accion: 'cerrar_otras' }); locuciones.at(-1).onEvent({ type: 'interrupted' });
    assert.equal(vm.runInContext('confirmacionVoz', fondo.contexto), null, 'Pregunta interrumpida cancela');
    // El inicio del TTS llega a offscreen antes que la respuesta de la acción que habla.
    const secuencia = []; let soltarInicio;
    const enviarOriginal = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = dato => dato.accion === 'voz_tts' && dato.evento === 'inicio'
        ? new Promise(resolver => { soltarInicio = () => { secuencia.push('inicio'); resolver({ ok: true }); }; }) : enviarOriginal(dato);
    const hablado = enviar({ accion: 'hablar', texto: 'Hola' }).then(() => secuencia.push('respuesta'));
    await new Promise(resolver => setTimeout(resolver, 30));
    assert.deepEqual(secuencia, [], 'No responde antes de entregar el inicio'); soltarInicio(); await hablado;
    assert.deepEqual(secuencia, ['inicio', 'respuesta']); chrome.runtime.sendMessage = enviarOriginal;
    // «Probar nombre»: el worker informa la caducidad para que el panel deje de esperar.
    assert.equal((await enviar({ accion: 'voz_probar_nombre' })).ok, true);
    assert.equal((await enviar({ accion: 'voz_prueba_estado' })).caducada, false);
    vm.runInContext('pruebaNombre.vence = Date.now() - 1', fondo.contexto);
    assert.equal((await enviar({ accion: 'voz_prueba_estado' })).caducada, true);
    comprobaciones++; console.log('✓ Confirmación: acción, destino, caducidad desde el fin de la pregunta, cancelación, un solo uso y cierre de pestaña');
    await enviar({ accion: 'duplicar_pestana' }); assert.equal(llamadas.at(-1).duplicate, 10);
    await enviar({ accion: 'silenciar', activo: true }); assert.equal(llamadas.at(-1).muted, true);
    await enviar({ accion: 'pantalla_completa', activa: true }); assert.equal(llamadas.at(-1).state, 'fullscreen');
    await enviar({ accion: 'pantalla_completa', activa: false }); assert.equal(llamadas.at(-1).state, 'maximized', 'Vuelve al estado anterior');
    const ayuda = await enviar({ accion: 'ayuda' });
    assert.match(ayuda.texto, /Computer/); assert.equal(locuciones.at(-1).lang, 'de-DE');
    almacen.idiomaVoz = 'es-PE';
    await enviar({ accion: 'ayuda' }); assert.equal(locuciones.at(-1).lang, 'es-ES'); assert.match(locuciones.at(-1).texto, /Computadora/);
    // Nombre de activación: viaja en voz_configurar, su cambio resincroniza y la ayuda lo dice.
    almacen.nombreActivacion = 'Jarvis'; enviados.length = 0;
    alCambiar({ nombreActivacion: { newValue: 'Jarvis' } }, 'local');
    await vm.runInContext('transicionVoz', fondo.contexto);
    assert.equal(enviados.find(dato => dato.accion === 'voz_configurar').nombreActivacion, 'Jarvis');
    assert.match((await enviar({ accion: 'ayuda' })).texto, /^Empieza con Jarvis y di/);
    delete almacen.nombreActivacion;
    assert.equal((await enviar({ accion: 'voz_estado' })).texto, 'Voz desactivada');
    await enviar({ accion: 'hablar', texto: 'Hola' }); assert.equal(locuciones.at(-1).lang, 'es-ES', 'Español conserva la voz anterior');
    // Inglés: ayuda, avisos hablados sin `lang` y estado publicado siguen el idioma de la interfaz.
    almacen.idiomaVoz = 'en-GB';
    const ayudaIngles = await enviar({ accion: 'ayuda' });
    assert.match(ayudaIngles.texto, /^Start with Computer/); assert.equal(locuciones.at(-1).lang, 'en-GB');
    await enviar({ accion: 'hablar', texto: 'Selected: Home.' }); assert.equal(locuciones.at(-1).lang, 'en-GB');
    await enviar({ accion: 'hablar', texto: 'Hola', lang: 'es-ES' }); assert.equal(locuciones.at(-1).lang, 'es-ES', 'Un lang explícito prevalece');
    assert.deepEqual({ ...(await enviar({ accion: 'voz_estado' })) }, { ok: true, texto: 'Voice off', tipo: undefined, activa: true });
    await enviar({ accion: 'voz_resultado', texto: 'Heard: hi', tipo: 'escucha' });
    const estado = await enviar({ accion: 'voz_estado' }); assert.equal(estado.texto, 'Heard: hi'); assert.equal(estado.tipo, 'escucha');
    await enviar({ accion: 'voz_resultado', texto: 'x', tipo: 'otro' }); assert.equal((await enviar({ accion: 'voz_estado' })).tipo, undefined, 'Tipo desconocido se descarta');
    comprobaciones++; console.log('✓ Service worker: idioma en vivo, ayuda localizada y nuevas acciones de pestañas/ventana');
    // Tutorial: una sola pestaña de bienvenida (se enfoca si existe) y es una página propia con controlador.
    const consulta = chrome.tabs.query, urlTutorial = 'chrome-extension://prueba/bienvenida.html#tutorial';
    chrome.tabs.create = async datos => llamadas.push({ crear: datos.url });
    // Como Chrome: un patrón chrome-extension:// en `url` es inválido y lanza (antes el botón fallaba en silencio).
    const sinPatron = pestanas => async filtro => { if (filtro?.url) throw new Error('Invalid url pattern'); return pestanas; };
    chrome.tabs.query = sinPatron([{ id: 7, windowId: 1, url: 'https://ejemplo.pe/' }]); await enviar({ accion: 'tutorial' });
    assert.deepEqual(llamadas.at(-1), { crear: urlTutorial });
    chrome.tabs.query = sinPatron([{ id: 55, windowId: 3, url: 'chrome-extension://prueba/bienvenida.html' }]); await enviar({ accion: 'tutorial' });
    assert.deepEqual(llamadas.slice(-2), [{ update: 55, active: true, url: urlTutorial }, { ventana: 3, focused: true }]);
    chrome.tabs.query = consulta;
    const permitida = url => vm.runInContext(`paginaPermitida(${JSON.stringify({ url })})`, fondo.contexto);
    assert.equal(permitida('chrome-extension://prueba/bienvenida.html'), true);
    assert.equal(permitida(urlTutorial), true);
    assert.equal(permitida('chrome-extension://prueba/popup.html'), false);
    assert.equal(permitida('chrome-extension://otra/bienvenida.html#tutorial'), false);
    assert.equal(permitida('chrome://settings/'), false);
    // «Activar cursor» con el cursor ya activo reintenta la cámara (storage no cambiaría); apagado lo activa.
    const central = peticion => new Promise(responder => manejador(peticion, { id: 'prueba', url: 'chrome-extension://prueba/voz/escucha.html' }, responder));
    // Permisos: la consulta real rechaza patrones de extensión. Verificar apertura y foco, no sólo el HUD.
    for (const dispositivo of ['microfono', 'camara']) {
        const accion = dispositivo === 'camara' ? 'camara_necesita_permiso' : 'voz_necesita_permiso';
        const url = 'chrome-extension://prueba/voz/permisos.html' + (dispositivo === 'camara' ? '?dispositivo=camara' : '');
        chrome.tabs.query = sinPatron([{ id: 10, windowId: 1, url: 'https://ejemplo.pe/' }]);
        assert.equal((await central({ accion })).ok, true);
        assert.deepEqual(llamadas.at(-1), { crear: url }, 'Abre el permiso de ' + dispositivo);
        chrome.tabs.query = sinPatron([{ id: 60, windowId: 4, url }]);
        assert.equal((await central({ accion })).ok, true);
        assert.deepEqual(llamadas.slice(-2), [{ update: 60, active: true }, { ventana: 4, focused: true }], 'Enfoca el permiso de ' + dispositivo);
    }
    chrome.tabs.query = consulta;
    // No anunciar captura si el reconocedor central rechazó la prueba.
    chrome.runtime.sendMessage = async dato => dato.accion === 'voz_probar_nombre' ? { ok: false } : enviarOriginal(dato);
    assert.equal((await enviar({ accion: 'voz_probar_nombre' })).ok, false);
    assert.equal(vm.runInContext('pruebaNombre', fondo.contexto), null);
    chrome.runtime.sendMessage = enviarOriginal;
    almacen.voz = true; almacen.ojos = true; enviados.length = 0;
    await central({ accion: 'voz_comando', texto: 'activar cursor' }); await vm.runInContext('transicionVoz', fondo.contexto);
    assert.equal(enviados.find(dato => dato.accion === 'camara_configurar')?.reintentar, true, 'Con el cursor activo reintenta');
    const guardados = []; chrome.storage.local.set = async datos => guardados.push(datos);
    almacen.ojos = false; await central({ accion: 'voz_comando', texto: 'activar cursor' });
    assert.equal(JSON.stringify(guardados), '[{"ojos":true}]', 'Con el cursor apagado lo activa');
    // Cámara sin permiso: el HUD de la página prioritaria lo explica y el aviso dura hasta la primera imagen.
    const mensajesPagina = []; chrome.tabs.sendMessage = async (id, dato, opciones) => { mensajesPagina.push({ id, dato, opciones }); return { ok: true }; };
    chrome.tabs.create = async () => {}; chrome.windows.update = async (id, datos) => llamadas.push({ ventana: id, ...datos });
    chrome.tabs.query = sinPatron([{ id: 10, windowId: 1, url: 'chrome-extension://prueba/voz/permisos.html?dispositivo=camara' }]);
    vm.runInContext("pestanaConControl = { id: 10, documentId: 'doc-1' }", fondo.contexto);
    await central({ accion: 'camara_necesita_permiso' });
    assert.equal(JSON.stringify(mensajesPagina.at(-1)), '{"id":10,"dato":{"accion":"camara_permiso"},"opciones":{"documentId":"doc-1"}}');
    assert.equal(vm.runInContext('camaraSinPermiso', fondo.contexto), true);
    assert.equal(JSON.stringify(llamadas.slice(-2)), '[{"update":10,"active":true},{"ventana":1,"focused":true}]', 'Enfoca la pestaña de permisos existente');
    manejador({ accion: 'camara_fotograma', datos: {} }, { id: 'prueba', url: 'chrome-extension://prueba/voz/escucha.html' }, () => {}); // Sin respuesta, como en producción.
    assert.equal(vm.runInContext('camaraSinPermiso', fondo.contexto), false, 'La primera imagen retira el aviso');
    comprobaciones++; console.log('✓ Service worker: tutorial, páginas propias, reintento de cursor y aviso de permiso de cámara');
    const escucha = entorno(); let alMensajeEscucha;
    escucha.contexto.chrome.runtime.onMessage = { addListener: accion => { alMensajeEscucha = accion; } };
    escucha.contexto.chrome.runtime.id = 'prueba';
    escucha.contexto.window.addEventListener = () => {};
    escucha.cargar(path.join(raiz, 'voz/escucha.js'));
    const probar = () => new Promise(responder => alMensajeEscucha({ destino: 'voz_central', accion: 'voz_probar_nombre' }, { id: 'prueba' }, responder));
    assert.equal((await probar()).ok, false, 'Sin micrófono no puede capturar');
    assert.equal(vm.runInContext('vozCentral.alProbarNombre', escucha.contexto), null);
    vm.runInContext('vozCentral.microfonoIniciado = vozCentral.permitidoPorUsuario = true', escucha.contexto);
    assert.equal((await probar()).ok, true);
    vm.runInContext("vozCentral.textoReconocido = 'Yarbis'; vozCentral.procesarFraseContinua()", escucha.contexto);
    assert.equal(escucha.mensajes.at(-1).accion, 'voz_prueba_muestra');
    assert.equal(escucha.mensajes.at(-1).texto, 'Yarbis');
    comprobaciones++; console.log('✓ Probar nombre sólo empieza con micrófono activo y entrega la muestra');
    console.log(`${comprobaciones} grupos de regresiones de voz correctos.`);
}
principal().catch(error => { console.error(error); process.exitCode = 1; });
