// Regresiones de voz multilingüe sin dependencias. Ejecutar: node tests/voz.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const raiz = path.resolve(__dirname, '..');
const lite = path.resolve(raiz, '../extensiónLite');
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
    for (const carpeta of [raiz, lite]) {
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
    assert.equal(fs.readFileSync(path.join(raiz, 'textos_paginas.js'), 'utf8'), fs.readFileSync(path.join(lite, 'textos_paginas.js'), 'utf8'));
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

comprobar('Base y Lite comparten exactamente los archivos de voz', () => {
    for (const [base, ligera] of [['sitios.js', 'sitios.js'], ['classes/VoiceAssistant.js', 'clases/VoiceAssistant.js'], ['background.js', 'background.js'],
        ['voz/escucha.js', 'voz/escucha.js'], ['voz/permisos.js', 'voz/permisos.js'], ['voz/popup.js', 'voz/popup.js'], ['textos.js', 'textos.js']]) {
        assert.equal(fs.readFileSync(path.join(raiz, base), 'utf8'), fs.readFileSync(path.join(lite, ligera), 'utf8'), base);
    }
    const ligera = entorno(lite, 'clases');
    assert.equal(ligera.contexto.VoiceAssistant.prepararComando('Computer search cats on YouTube'.slice(9), 'en-US'), 'busca cats en YouTube');
});

async function principal() {
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
    chrome.storage = { local: { get: async () => ({ ...almacen }), set: async () => {} }, onChanged: { addListener: accion => { alCambiar = accion; } } };
    chrome.tabs = { query: async () => [{ id: 10, index: 0 }, { id: 20, index: 1, pinned: true }, { id: 30, index: 2 }], sendMessage: async () => ({ ok: true }),
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
    await enviar({ accion: 'cerrar_otras' }); assert.deepEqual([...llamadas.at(-1).remove], [30], 'Conserva la actual y las fijadas');
    await enviar({ accion: 'duplicar_pestana' }); assert.equal(llamadas.at(-1).duplicate, 10);
    await enviar({ accion: 'silenciar', activo: true }); assert.equal(llamadas.at(-1).muted, true);
    await enviar({ accion: 'pantalla_completa', activa: true }); assert.equal(llamadas.at(-1).state, 'fullscreen');
    await enviar({ accion: 'pantalla_completa', activa: false }); assert.equal(llamadas.at(-1).state, 'maximized', 'Vuelve al estado anterior');
    const ayuda = await enviar({ accion: 'ayuda' });
    assert.match(ayuda.texto, /Computer/); assert.equal(locuciones.at(-1).lang, 'de-DE');
    almacen.idiomaVoz = 'es-PE';
    await enviar({ accion: 'ayuda' }); assert.equal(locuciones.at(-1).lang, 'es-ES'); assert.match(locuciones.at(-1).texto, /Computadora/);
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
    console.log(`${comprobaciones} grupos de regresiones de voz correctos.`);
}
principal().catch(error => { console.error(error); process.exitCode = 1; });
