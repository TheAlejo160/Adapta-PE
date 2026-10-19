// Prueba real MV3 con perfil temporal: node tests/browser.test.cjs
// Chrome instalado; ruta opcional ADAPTA_CHROME. Audio sintético; no accede a cámara/micrófono reales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const raiz = path.resolve(__dirname, '..');
const visible = process.env.ADAPTA_CHROME_VISIBLE === '1';
const carpetaCapturas = process.env.ADAPTA_CAPTURAS;
if (carpetaCapturas) fs.mkdirSync(carpetaCapturas, { recursive: true });
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'adapta-navegador-'));
fs.mkdirSync(path.join(perfil, 'Default'));
fs.writeFileSync(path.join(perfil, 'Default', 'Preferences'), JSON.stringify({ intl: { accept_languages: 'en-US,en' } }));
const servidor = http.createServer((peticion, respuesta) => {
    const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
    const archivo = path.resolve(raiz, '.' + ruta);
    if (!archivo.startsWith(raiz + path.sep) || !/^\/(tests|vision|classes)\//.test(ruta) && ruta !== '/sitios.js' && ruta !== '/textos.js') {
        respuesta.writeHead(403); respuesta.end(); return;
    }
    const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.jpg': 'image/jpeg' };
    fs.readFile(archivo, (error, contenido) => {
        respuesta.writeHead(error ? 404 : 200, { 'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream',
            ...(peticion.url.includes('estricta') ? { 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'" } : {}) });
        respuesta.end(error ? 'No encontrado' : contenido);
    });
});
const pausa = ms => new Promise(resolver => setTimeout(resolver, ms));
async function esperar(comprobar, mensaje) {
    for (let intento=0;intento<60;intento++) { if(await comprobar()) return; await pausa(100); }
    throw new Error(mensaje);
}
async function conectar(url) {
    const socket = new WebSocket(url);
    await new Promise((resolver, rechazar) => { socket.addEventListener('open', resolver, { once: true }); socket.addEventListener('error', rechazar, { once: true }); });
    let indice = 0;
    const pendientes = new Map();
    const contextos = new Map();
    const errores = [];
    const mensajes = [];
    socket.addEventListener('message', evento => {
        const datos = JSON.parse(evento.data);
        if (datos.id) { pendientes.get(datos.id)?.(datos); pendientes.delete(datos.id); }
        else if (datos.method === 'Runtime.executionContextCreated') contextos.set(datos.params.context.id, datos.params.context);
        else if (datos.method === 'Runtime.executionContextDestroyed') contextos.delete(datos.params.executionContextId);
        else if (datos.method === 'Runtime.executionContextsCleared') contextos.clear();
        else if (datos.method === 'Runtime.exceptionThrown') errores.push(datos.params.exceptionDetails);
        else if (datos.method === 'Log.entryAdded') mensajes.push(datos.params.entry);
    });
    return { socket, contextos, errores, mensajes, pedir: (metodo, parametros = {}) => new Promise((resolver, rechazar) => {
        const id = ++indice;
        const limite = setTimeout(() => { pendientes.delete(id); rechazar(new Error('CDP no respondió: ' + metodo + ' ' + (parametros.expression || '').slice(0, 120))); }, 15000);
        pendientes.set(id, datos => { clearTimeout(limite); datos.error ? rechazar(new Error(datos.error.message)) : resolver(datos.result); });
        socket.send(JSON.stringify({ id, method: metodo, params: parametros }));
    }) };
}
(async () => {
    let chrome, pagina, navegador;
    try {
        await new Promise(resolver => servidor.listen(0, '127.0.0.1', resolver));
        const puerto = servidor.address().port;
        const ejecutable = process.env.ADAPTA_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        chrome = spawn(ejecutable, [...(visible ? [] : ['--headless']), '--mute-audio', '--enable-unsafe-extension-debugging', '--enable-unsafe-swiftshader',
            '--use-fake-device-for-media-stream', '--no-first-run', '--no-default-browser-check', '--user-data-dir=' + perfil, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
        chrome.on('error', error => console.error(error.message));
        const archivoPuerto = path.join(perfil, 'DevToolsActivePort');
        for (let intento = 0; intento < 50 && !fs.existsSync(archivoPuerto); intento++) await pausa(200);
        const puertoChrome = fs.readFileSync(archivoPuerto, 'utf8').split('\n')[0];
        const version = await (await fetch('http://127.0.0.1:' + puertoChrome + '/json/version')).json();
        navegador = await conectar(version.webSocketDebuggerUrl);
        async function silenciarPruebas(id) {
            let destino;
            await esperar(async()=>{
                const destinos=await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json();
                destino=destinos.find(datos=>datos.type==='service_worker'&&datos.url===`chrome-extension://${id}/background.js`);
                return Boolean(destino);
            },'Worker preparado para pruebas silenciosas');
            const conexion=await conectar(destino.webSocketDebuggerUrl);
            await esperar(async () => {
                const estado = await conexion.pedir('Runtime.evaluate', { expression: 'typeof chrome!=="undefined" && typeof chrome.tts?.speak==="function"', returnByValue: true });
                return estado.result?.value === true;
            }, 'API TTS preparada antes de sustituirla en el perfil de prueba');
            const resultado=await conexion.pedir('Runtime.evaluate',{expression:`chrome.tts.stop();
                globalThis.avisosPrueba=[];
                globalThis.locucionPrueba=null;
                const emitirPrueba=(texto,opciones)=>{globalThis.avisosPrueba.push(texto);globalThis.locucionPrueba=opciones};
                chrome.tts.speak=emitirPrueba;chrome.tts.stop=()=>{};
                chrome.tts.speak===emitirPrueba`,returnByValue:true});
            assert.equal(resultado.result?.value,true,'TTS simulado sólo en el perfil de pruebas');
            conexion.socket.close();
        }
        const destinosIniciales = await (await fetch('http://127.0.0.1:' + puertoChrome + '/json')).json();
        pagina = await conectar(destinosIniciales.find(destino => destino.type === 'page').webSocketDebuggerUrl);
        await pagina.pedir('Runtime.enable');
        await pagina.pedir('Log.enable');
        await pagina.pedir('Page.navigate', { url: `http://127.0.0.1:${puerto}/tests/pagina-global.html` });
        await esperar(async()=> (await pagina.pedir('Runtime.evaluate',{expression:"document.readyState==='complete'",returnByValue:true})).result?.value,'Página previa cargada');
        const origenPrevio=(await pagina.pedir('Runtime.evaluate',{expression:'performance.timeOrigin',returnByValue:true})).result.value;
        const completa = await navegador.pedir('Extensions.loadUnpacked', { path: raiz });
        const ligera = await navegador.pedir('Extensions.loadUnpacked', { path: path.resolve(raiz, '../extensiónLite') });
        assert.ok(completa.id && ligera.id);
        await silenciarPruebas(completa.id);await silenciarPruebas(ligera.id);
        console.log('✓ Ambos manifests cargan en Chrome');
        for (const id of [completa.id, ligera.id]) {
            const destino = await navegador.pedir('Target.createTarget', { url: 'chrome-extension://' + id + '/popup.html' });
            const destinos = await (await fetch('http://127.0.0.1:' + puertoChrome + '/json')).json();
            const panel = await conectar(destinos.find(datos => datos.id === destino.targetId).webSocketDebuggerUrl);
            await panel.pedir('Runtime.enable');
            const evaluar = async expression => {
                const resultado = await panel.pedir('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
                assert.equal(resultado.exceptionDetails, undefined, resultado.exceptionDetails?.exception?.description);
                return resultado;
            };
            try {
                await esperar(async () => (await evaluar('document.readyState==="complete" && document.querySelector(".select-box")?.dataset.filtro==="ninguno"')).result?.value, 'Panel preparado');
                await esperar(async () => (await evaluar('document.documentElement.lang==="en"')).result?.value, 'Automático traduce toda la extensión con Chrome en inglés');
                assert.equal((await evaluar('document.getElementById("tituloVoz").textContent')).result.value, 'Voice control');
                const origenPanel = (await evaluar('performance.timeOrigin')).result.value;
                for (const [codigo, texto] of [['pt-BR', 'Controle por voz'], ['de-DE', 'Sprachsteuerung'], ['fr-FR', 'Commande vocale'], ['it-IT', 'Controllo vocale'], ['es-PE', 'Control por voz'], ['en-US', 'Voice control']]) {
                    await evaluar(`document.getElementById('selectIdiomaVoz').value='${codigo}';document.getElementById('selectIdiomaVoz').dispatchEvent(new Event('change'))`);
                    await esperar(async () => (await evaluar(`document.documentElement.lang==='${codigo.slice(0, 2)}' && document.getElementById('tituloVoz').textContent==='${texto}'`)).result?.value, 'Idioma completo en vivo: ' + codigo);
                    assert.equal((await evaluar('performance.timeOrigin')).result.value, origenPanel, 'Cambiar idioma no recarga');
                    await panel.pedir('Emulation.setDeviceMetricsOverride', { width: 390, height: 850, deviceScaleFactor: 1, mobile: false });
                    assert.equal((await evaluar('document.documentElement.scrollWidth<=innerWidth')).result.value, true, 'Traducciones sin desbordamiento');
                    if (carpetaCapturas && codigo === 'en-US') {
                        const medidas = await panel.pedir('Page.getLayoutMetrics');
                        const imagen = await panel.pedir('Page.captureScreenshot', { captureBeyondViewport: true, clip: { ...medidas.cssContentSize, scale: 1 } });
                        fs.writeFileSync(path.join(carpetaCapturas, (id === completa.id ? 'base' : 'lite') + '-idioma-en.png'), Buffer.from(imagen.data, 'base64'));
                    }
                }
                assert.equal((await evaluar('document.querySelector("option[value=deuteranomalia]").textContent')).result.value, 'Deuteranomaly');
                assert.equal((await evaluar('document.querySelector("[data-i18n=\\"popup.configurarMicro\\"]").textContent')).result.value, 'Set up microphone');
                await panel.pedir('Page.reload');
                await esperar(async () => (await evaluar('document.documentElement.lang==="en" && document.getElementById("selectIdiomaVoz")?.value==="en-US"')).result?.value, 'Idioma manual persiste al abrir el panel');
                for (const [archivo, esperado] of [['bienvenida.html', 'You can now use AdaptaPE' + (id === ligera.id ? ' Lite' : '')], ['voz/permisos.html', 'Allow the microphone']]) {
                    const nueva = await navegador.pedir('Target.createTarget', { url: `chrome-extension://${id}/${archivo}` });
                    const lista = await (await fetch('http://127.0.0.1:' + puertoChrome + '/json')).json();
                    const ventana = await conectar(lista.find(datos => datos.id === nueva.targetId).webSocketDebuggerUrl);
                    await ventana.pedir('Runtime.enable');
                    try {
                        const texto = expression => ventana.pedir('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
                        await esperar(async () => (await texto(`document.documentElement.lang==='en' && document.querySelector('h1')?.textContent===${JSON.stringify(esperado)}`)).result?.value, archivo + ' usa el idioma de la extensión');
                        await evaluar('chrome.storage.local.set({idiomaVoz:"es-PE"})');
                        await esperar(async () => (await texto('document.documentElement.lang==="es"')).result?.value, archivo + ' cambia sin recargar');
                        assert.equal(ventana.errores.length, 0, 'Página traducida sin excepciones');
                        await evaluar('chrome.storage.local.set({idiomaVoz:"en-US"})');
                    } finally { ventana.socket.close(); await navegador.pedir('Target.closeTarget', { targetId: nueva.targetId }); }
                }
                await evaluar('chrome.storage.local.set({idiomaVoz:"auto"})');
                await esperar(async () => (await evaluar('document.documentElement.lang==="en" && document.getElementById("selectIdiomaVoz").value==="auto"')).result?.value, 'Automático restaura el idioma de Chrome');
                await evaluar('chrome.storage.local.set({idiomaVoz:"es-PE"})');
                await esperar(async () => (await evaluar('document.documentElement.lang==="es"')).result?.value, 'Español preparado para regresiones existentes');
                assert.equal(panel.errores.length, 0, 'Popup traducido sin excepciones');
                console.log('✓ ' + (id === completa.id ? 'Base' : 'Lite') + ': idioma automático, seis traducciones, elección persistente, bienvenida y permisos en vivo');
                assert.equal((await evaluar('document.querySelectorAll(".opcion-info svg use").length')).result.value, id === completa.id ? 5 : 3);
                assert.equal((await evaluar('document.querySelector("h1").textContent')).result.value, id === completa.id ? 'AdaptaPE' : 'AdaptaPE Lite');
                assert.equal((await evaluar('chrome.runtime.getManifest().name')).result.value, id === completa.id ? 'AdaptaPE' : 'AdaptaPE Lite');
                assert.equal((await evaluar('getComputedStyle(document.getElementById("hintVoz")).display!=="none"')).result.value, true, 'Micrófono configurable con voz apagada');
                assert.equal((await evaluar('chrome.runtime.getManifest().version')).result.value, id === completa.id ? '13.0' : '3.0');
                await esperar(async () => (await evaluar('!document.getElementById("selectMascota").disabled')).result?.value, 'Selector de mascotas preparado');
                for (const nombre of ['tinku', 'cuchu', 'yati', 'ninguna']) {
                    await evaluar(`document.getElementById('selectMascota').value='${nombre}';document.getElementById('selectMascota').dispatchEvent(new Event('change'))`);
                    await esperar(async () => (await evaluar(`chrome.storage.local.get('mascota').then(estado=>estado.mascota==='${nombre}')`)).result?.value, 'Mascota guardada: ' + nombre);
                }
                await evaluar('globalThis.guardarOriginalMascota=chrome.storage.local.set;chrome.storage.local.set=async()=>{throw new Error("Fallo simulado")};document.getElementById("selectMascota").value="tinku";document.getElementById("selectMascota").dispatchEvent(new Event("change"))');
                await esperar(async () => (await evaluar('document.getElementById("estadoMascota").textContent.startsWith("No se guardó")')).result?.value, 'Error de mascota ofrece reintento');
                await evaluar('chrome.storage.local.set=guardarOriginalMascota;document.getElementById("selectMascota").value="ninguna";document.getElementById("selectMascota").dispatchEvent(new Event("change"))');
                assert.equal((await evaluar('Array.from(document.querySelectorAll("input[type=checkbox]"), control=>control.getBoundingClientRect().height>=44).every(Boolean)')).result.value, true, 'Interruptores de al menos 44 px');
                await evaluar('document.querySelector("#hintVoz summary").click()');
                assert.equal((await evaluar('document.querySelector("#hintVoz details").open')).result.value, true);
                await evaluar('document.querySelector("#hintVoz summary").click()');
                await evaluar('globalThis.guardarOriginal=chrome.storage.local.set;chrome.storage.local.set=async()=>{throw new Error("Fallo simulado")};document.getElementById("selectDaltonismo").value="protanopia";document.getElementById("selectDaltonismo").dispatchEvent(new Event("change"))');
                await esperar(async () => (await evaluar('document.getElementById("estadoPanel").dataset.error==="true"')).result?.value, 'Error de guardado explica cómo reintentar');
                await evaluar('chrome.storage.local.set=guardarOriginal;document.getElementById("selectDaltonismo").value="ninguno";document.getElementById("selectDaltonismo").dispatchEvent(new Event("change"))');
                await esperar(async () => (await evaluar('document.getElementById("estadoPanel").textContent==="Ajustes guardados."')).result?.value, 'Reintento guarda el ajuste');
                for (const ancho of [390, 320, 195]) {
                    await panel.pedir('Emulation.setDeviceMetricsOverride', { width: ancho, height: 850, deviceScaleFactor: 1, mobile: false });
                    assert.equal((await evaluar('document.documentElement.scrollWidth<=innerWidth')).result.value, true, 'Sin desbordamiento a ' + ancho + ' px');
                }
                await panel.pedir('Emulation.clearDeviceMetricsOverride');
                if (id === completa.id) {
                    assert.equal((await evaluar('chrome.runtime.getManifest().version')).result.value, '13.0');
                    assert.match((await evaluar('document.querySelector(".header p").textContent')).result.value, /Base v13\.0/);
                    assert.equal((await evaluar('document.getElementById("adapta-pe-modo-control").value')).result.value, 'cabeza');
                    await evaluar("chrome.storage.local.set({ajustesCineticos:{modo:'cabeza',temblor:true,velocidad:0.8,amplitud:0.55}})");
                    for (const modo of ['manos', 'zona', 'cabeza']) {
                        await evaluar(`document.getElementById('adapta-pe-modo-control').value='${modo}';document.getElementById('adapta-pe-modo-control').dispatchEvent(new Event('change'))`);
                        await esperar(async () => (await evaluar(`chrome.storage.local.get('ajustesCineticos').then(estado => estado.ajustesCineticos.modo==='${modo}')`)).result?.value, 'Modo del cursor guardado');
                    }
                    assert.deepEqual((await evaluar("chrome.storage.local.get('ajustesCineticos').then(estado=>estado.ajustesCineticos)")).result.value, { modo: 'cabeza', temblor: true, velocidad: 0.8, amplitud: 0.55 });
                    assert.deepEqual((await evaluar("Array.from(document.getElementById('adapta-pe-modo-control').options,opcion=>opcion.value)")).result.value, ['cabeza', 'manos', 'zona']);
                    for (const [anterior, nuevo] of [['zona_izquierda', 'zona'], ['brazo_derecho', 'manos'], ['torso', 'cabeza']]) {
                        await evaluar(`chrome.storage.local.set({ajustesCineticos:{modo:'${anterior}',temblor:true,velocidad:0.8,amplitud:0.55}})`);
                        await esperar(async () => (await evaluar(`chrome.storage.local.get('ajustesCineticos').then(estado=>estado.ajustesCineticos.modo==='${nuevo}' && document.getElementById('adapta-pe-modo-control').value==='${nuevo}')`)).result?.value, 'Preferencia anterior migrada');
                    }
                    await evaluar("chrome.storage.local.remove('ajustesCineticos')");
                    await evaluar('document.getElementById("hintGestos").hidden=false;document.querySelector("#hintGestos summary").click()');
                    assert.equal((await evaluar('document.querySelector("#hintGestos details").open')).result.value, true);
                    assert.match((await evaluar('document.querySelector("#hintGestos details").textContent')).result.value, /uno o varios dedos alineados, incluida la palma entera/);
                    for (const ancho of [390, 195]) {
                        await panel.pedir('Emulation.setDeviceMetricsOverride', { width: ancho, height: 850, deviceScaleFactor: 1, mobile: false });
                        assert.equal((await evaluar('document.documentElement.scrollWidth<=innerWidth')).result.value, true, 'Ayuda ampliada sin desbordamiento');
                    }
                    await panel.pedir('Emulation.clearDeviceMetricsOverride');
                    await evaluar('document.getElementById("hintGestos").hidden=true;document.querySelector("#hintGestos details").open=false');
                }
                await evaluar("chrome.storage.local.set({daltonismo:'ninguno'})");
                await esperar(async () => (await evaluar('document.getElementById("quitarDaltonismo").hidden')).result?.value, 'Filtro desactivado');
                const opciones = (await evaluar('Array.from(document.getElementById("selectDaltonismo").options, opcion => opcion.value).slice(1)')).result.value;
                const coloresFiltro = new Set();
                for (const filtro of opciones) {
                    await evaluar(`document.getElementById("selectDaltonismo").value=${JSON.stringify(filtro)};document.getElementById("selectDaltonismo").dispatchEvent(new Event("change"))`);
                    await esperar(async () => (await evaluar(`chrome.storage.local.get('daltonismo').then(estado => estado.daltonismo===${JSON.stringify(filtro)})`)).result?.value, 'Selección guardada: ' + filtro);
                    assert.equal((await evaluar('document.getElementById("quitarDaltonismo").hidden')).result.value, false);
                    assert.match((await evaluar('document.getElementById("estadoDaltonismo").textContent')).result.value, /^Activo: /);
                    assert.equal((await evaluar('document.querySelector(".select-box").dataset.filtro')).result.value, filtro);
                    assert.equal((await evaluar('getComputedStyle(document.querySelector(".select-box")).outlineWidth')).result.value, '2px');
                    const color = (await evaluar('getComputedStyle(document.querySelector(".select-box")).outlineColor')).result.value;
                    assert.equal((await evaluar('getComputedStyle(document.getElementById("estadoDaltonismo")).color')).result.value, color);
                    coloresFiltro.add(color);
                }
                assert.equal(coloresFiltro.size, opciones.length, 'Cada filtro tiene un contorno de color distinto');
                await panel.pedir('Page.reload');
                await esperar(async () => (await evaluar('document.getElementById("estadoDaltonismo")?.textContent==="Activo: Acromatopsia"')).result?.value, 'Estado recuperado al reabrir');
                assert.equal((await evaluar('getComputedStyle(document.querySelector(".select-box")).outlineWidth')).result.value, '2px');
                await evaluar("chrome.storage.local.set({daltonismo:'protanopia'})");
                await esperar(async () => (await evaluar('document.getElementById("estadoDaltonismo").textContent==="Activo: Protanopía"')).result?.value, 'Cambios externos visibles');
                assert.equal((await evaluar('getComputedStyle(document.querySelector(".select-box")).outlineColor')).result.value, 'rgb(154, 62, 26)');
                await panel.pedir('Page.bringToFront');
                await evaluar('document.getElementById("quitarDaltonismo").focus()');
                await panel.pedir('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
                await panel.pedir('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
                await esperar(async () => (await evaluar('chrome.storage.local.get("daltonismo").then(estado => estado.daltonismo==="ninguno" && document.getElementById("quitarDaltonismo").hidden && document.activeElement.id==="selectDaltonismo")')).result?.value, 'Quitar filtro con teclado devuelve foco al selector');
                assert.equal((await evaluar('document.getElementById("estadoDaltonismo").textContent')).result.value, 'Sin filtro activo');
                assert.equal((await evaluar('getComputedStyle(document.querySelector(".select-box")).outlineStyle')).result.value, 'none', 'Quitar filtro retira el contorno');
                await evaluar('document.querySelector("#ayudaMascota").closest("details").open=true');
                for(const ancho of [390,195]) {
                    await panel.pedir('Emulation.setDeviceMetricsOverride',{width:ancho,height:850,deviceScaleFactor:1,mobile:false});
                    assert.equal((await evaluar('document.documentElement.scrollWidth<=innerWidth')).result.value,true,'Ayuda de mascotas sin desbordamiento');
                    if(carpetaCapturas) {
                        const medidas=await panel.pedir('Page.getLayoutMetrics');
                        const imagen=await panel.pedir('Page.captureScreenshot',{captureBeyondViewport:true,clip:{...medidas.cssContentSize,scale:1}});
                        fs.writeFileSync(path.join(carpetaCapturas,(id===completa.id?'base':'lite')+'-mascotas-'+ancho+'.png'),Buffer.from(imagen.data,'base64'));
                    }
                }
            } finally {
                panel.socket.close();
                await navegador.pedir('Target.closeTarget', { targetId: destino.targetId });
            }
        }
        console.log('✓ Paneles Base y Lite: siete filtros, persistencia, cambios externos y retirada con teclado');
        const contextoDe=(conexion,id)=> {
            const principal=[...conexion.contextos.values()].find(contexto=>contexto.auxData?.isDefault)?.auxData.frameId;
            return [...conexion.contextos.values()].findLast(contexto=>contexto.origin==='chrome-extension://'+id&&contexto.auxData?.isDefault===false&&contexto.auxData.frameId===principal);
        };
        const evaluarEn=(conexion,id,expression)=>conexion.pedir('Runtime.evaluate',{expression,contextId:contextoDe(conexion,id)?.id,returnByValue:true,awaitPromise:true});
        for (const id of [completa.id, ligera.id]) {
            await esperar(async()=>contextoDe(pagina,id)&&(await evaluarEn(pagina,id,'Boolean(globalThis.adaptaPEControlador?.vigente())')).result?.value,'Controlador listo para cambios de opciones');
            await pagina.pedir('Page.bringToFront');
            const destinos=await(await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json();
            const ajustes=await conectar(destinos.find(d=>d.type==='service_worker'&&d.url===`chrome-extension://${id}/background.js`).webSocketDebuggerUrl);
            const actualizar=()=>ajustes.pedir('Runtime.evaluate',{expression:`chrome.tabs.query({active:true,lastFocusedWindow:true}).then(p=>chrome.tabs.sendMessage(p[0].id,{accion:'actualizar_estado'}).catch(()=>{}))`,awaitPromise:true});
            const origen=(await evaluarEn(pagina,id,'performance.timeOrigin')).result.value;
            await ajustes.pedir('Runtime.evaluate',{expression:'transicionPaginas',awaitPromise:true});
            await evaluarEn(pagina,id,`globalThis.getPreferenciasOriginalPrueba=chrome.storage.local.get;
                globalThis.lecturasPendientesPrueba=[];
                chrome.storage.local.get=claves=>Array.isArray(claves)&&claves.includes('mascota')&&claves.includes('voz')?
                    new Promise(resolver=>lecturasPendientesPrueba.push(resolver)):getPreferenciasOriginalPrueba.call(chrome.storage.local,claves)`);
            try {
                await actualizar(); await actualizar();
                await esperar(async()=>(await evaluarEn(pagina,id,'lecturasPendientesPrueba.length>=2')).result?.value,'Dos cambios de opción pendientes');
                await evaluarEn(pagina,id,`(async()=>{
                    const ultimo=lecturasPendientesPrueba.pop();
                    const preferencias={voz:false,ojos:false,talkback:true,mascota:'ninguna',daltonismo:'protanopia'};
                    ultimo(preferencias);
                    for(const resolver of lecturasPendientesPrueba)resolver({...preferencias,talkback:false,daltonismo:'ninguno'});
                    await Promise.resolve(); await Promise.resolve();
                })()`);
                assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.filtros.filtroActual')).result.value,'protanopia','Una lectura antigua no deshace la última opción');
                if(id===completa.id) {
                    await esperar(async()=>(await evaluarEn(pagina,id,'adaptaPEControlador.talkback.activo')).result?.value,'Lectura activa antes de ocultar');
                    await evaluarEn(pagina,id,"Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");
                    assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.talkback.activo')).result.value,false);
                    await evaluarEn(pagina,id,"Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))");
                    assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.talkback.activo')).result.value,true,'Volver a página visible recupera TalkBack sin recarga');
                }
                assert.equal((await evaluarEn(pagina,id,'performance.timeOrigin')).result.value,origen,'Opciones y visibilidad no recargan el documento');
            } finally {
                await evaluarEn(pagina,id,"chrome.storage.local.get=getPreferenciasOriginalPrueba;delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");
                await actualizar(); ajustes.socket.close();
            }
        }
        const nueva=await navegador.pedir('Target.createTarget',{url:`http://127.0.0.1:${puerto}/tests/pagina-global.html?nueva=1`});
        const destinosNuevos=await(await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json();
        const pestañaNueva=await conectar(destinosNuevos.find(d=>d.id===nueva.targetId).webSocketDebuggerUrl);
        try {
            await pestañaNueva.pedir('Runtime.enable'); await pestañaNueva.pedir('Page.bringToFront');
            for(const id of [completa.id,ligera.id]) {
                await esperar(async()=>contextoDe(pestañaNueva,id)&&(await evaluarEn(pestañaNueva,id,'Boolean(globalThis.adaptaPEControlador?.vigente())')).result?.value,'Funciones conectadas al entrar en pestaña nueva');
                await esperar(async()=>(await evaluarEn(pestañaNueva,id,'adaptaPEControlador.mascota.prioridad')).result?.value,'Prioridad llega a la pestaña nueva');
            }
            assert.equal((await evaluarEn(pestañaNueva,completa.id,'adaptaPEControlador.cinetico.visible')).result.value,true,'Cursor preparado en página nueva');
        } finally { pestañaNueva.socket.close(); await navegador.pedir('Target.closeTarget',{targetId:nueva.targetId}); await pagina.pedir('Page.bringToFront'); }
        console.log('✓ Base/Lite: última opción prevalece, TalkBack se recupera al volver y pestañas nuevas conectan sin recarga');
        for (const id of [completa.id, ligera.id]) {
            await esperar(async()=>contextoDe(pagina,id)&&(await evaluarEn(pagina,id,'Boolean(globalThis.adaptaPEControlador?.vigente())')).result?.value,'Mascotas conectadas a página previa');
            await pagina.pedir('Page.bringToFront');
            await esperar(async()=>(await evaluarEn(pagina,id,'adaptaPEControlador.mascota.visible')).result?.value,'Página prioritaria para mascota');
            // use_dynamic_url: la web (mundo principal) no puede comprobar el ID fijo; la mascota carga por URL dinámica.
            const porIdFijo=(await pagina.pedir('Runtime.evaluate',{expression:`fetch('chrome-extension://${id}/mascotas/motor.js').then(()=>'visible',()=>'oculta')`,awaitPromise:true,returnByValue:true})).result.value;
            assert.equal(porIdFijo,'oculta','Una web no detecta AdaptaPE pidiendo recursos con su ID fijo');
            assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'document.documentElement.hasAttribute("data-adapta-extension")',returnByValue:true})).result.value,false,'Sin marca fuera de la web oficial');
            await evaluarEn(pagina,id,"chrome.storage.local.set({daltonismo:'protanopia'})");
            for (const nombre of ['tinku', 'cuchu', 'yati']) {
                await evaluarEn(pagina,id,`adaptaPEControlador.voz.ejecutarComando('mascota ${nombre}')`);
                await esperar(async()=>(await evaluarEn(pagina,id,`adaptaPEControlador.mascota.nombre==='${nombre}' && Boolean(adaptaPEControlador.mascota.motor)`)).result?.value,'WebP real cargado: ' + nombre);
                assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.mascota.motor.element.shadowRoot.querySelector("canvas").width')).result.value,192);
                assert.equal((await evaluarEn(pagina,id,'document.querySelectorAll("#adapta-pe-mascota-"+chrome.runtime.id).length')).result.value,1,'Una sola mascota al cambiar');
                if(carpetaCapturas && id===completa.id) {
                    const imagen=await pagina.pedir('Page.captureScreenshot');
                    fs.writeFileSync(path.join(carpetaCapturas,'mascota-'+nombre+'.png'),Buffer.from(imagen.data,'base64'));
                }
            }
            const rect = (await evaluarEn(pagina,id,'(()=>{const r=adaptaPEControlador.mascota.host.getBoundingClientRect();return {left:r.left,top:r.top,bottom:r.bottom,right:r.right}})()')).result.value;
            assert.deepEqual(pagina.mensajes.filter(m=>m.text.includes('Unsafe attempt to load URL')),[],'Mascotas no provocan cargas inseguras con filtro activo');
            const limites = (await pagina.pedir('Runtime.evaluate',{expression:'({width:innerWidth,height:innerHeight})',returnByValue:true})).result.value;
            assert.ok(Math.abs(rect.right - limites.width + 16)<2 && Math.abs(rect.bottom - limites.height + 16)<2,'Esquina inferior derecha por defecto');
            await evaluarEn(pagina,id,'globalThis.mascotaPermanente=adaptaPEControlador.mascota.host;globalThis.motorMascotaPermanente=adaptaPEControlador.mascota.motor');
            await pagina.pedir('Runtime.evaluate',{expression:'document.body.style.minHeight="2400px";window.scrollTo(0,600)'});
            for(const filtro of ['protanopia','ninguno']) {
                await evaluarEn(pagina,id,`chrome.storage.local.set({daltonismo:'${filtro}'})`);
                await esperar(async()=>(await evaluarEn(pagina,id,`adaptaPEControlador.filtros.filtroActual==='${filtro}'`)).result?.value,'Aplicar otra ayuda conserva mascota');
                assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.mascota.host===mascotaPermanente && adaptaPEControlador.mascota.motor===motorMascotaPermanente && !mascotaPermanente.hidden')).result.value,true,'Cambiar opciones no retira ni recarga mascota');
                assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.mascota.host.getBoundingClientRect().bottom')).result.value,rect.bottom,'Filtro y scroll conservan mascota dentro de la ventana');
            }
            await pagina.pedir('Runtime.evaluate',{expression:'document.body.style.removeProperty("min-height");window.scrollTo(0,0)'});
            const destinoFondo=(await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).find(d=>d.type==='service_worker'&&d.url.includes(id));
            const fondoMascota=await conectar(destinoFondo.webSocketDebuggerUrl);
            for(const activa of [false,true]) {
                await fondoMascota.pedir('Runtime.evaluate',{expression:`chrome.tabs.query({url:'http://127.0.0.1:${puerto}/tests/pagina-global.html'}).then(p=>chrome.tabs.sendMessage(p[0].id,{accion:'control_prioridad',activa:${activa}}))`,awaitPromise:true});
                assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.mascota.host===mascotaPermanente && !mascotaPermanente.hidden')).result.value,true,'Cambiar prioridad mantiene mascota visible');
                assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.mascota.prioridad')).result.value,activa);
            }
            await evaluarEn(pagina,id,'globalThis.controlSinRecarga=adaptaPEControlador;mascotaPermanente.remove()');
            await esperar(async()=>(await evaluarEn(pagina,id,'mascotaPermanente.isConnected && adaptaPEControlador.mascota.motor===motorMascotaPermanente')).result?.value,'Mascota eliminada por el sitio vuelve sin cargar sprites');
            fondoMascota.socket.close();
            await pagina.pedir('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.left+48,y:rect.bottom-22});
            await pagina.pedir('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:rect.left+48,y:rect.bottom-22});
            await pagina.pedir('Input.dispatchMouseEvent',{type:'mouseMoved',buttons:1,x:rect.left-52,y:rect.bottom-112});
            await pagina.pedir('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:rect.left-52,y:rect.bottom-112});
            try { await esperar(async()=>(await evaluarEn(pagina,id,'chrome.storage.local.get("posicionMascota").then(p=>p.posicionMascota?.x<1 && p.posicionMascota?.y<1)')).result?.value,'Arrastre guarda posición'); }
            catch(error) {
                console.error('Estado arrastre',JSON.stringify(await evaluarEn(pagina,id,'({pos:adaptaPEControlador.mascota.posicion,arrastre:adaptaPEControlador.mascota.arrastre,visible:adaptaPEControlador.mascota.visible,rect:adaptaPEControlador.mascota.host?.getBoundingClientRect().toJSON(),foco:document.activeElement?.id})')));
                const captura=await pagina.pedir('Page.captureScreenshot');fs.writeFileSync('/private/tmp/adapta-mascota-debug.png',Buffer.from(captura.data,'base64'));throw error;
            }
            for(let intento=0;intento<8 && !(await evaluarEn(pagina,id,'document.activeElement===adaptaPEControlador.mascota.host')).result?.value;intento++) {
                await pagina.pedir('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
                await pagina.pedir('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
            }
            assert.equal((await evaluarEn(pagina,id,'document.activeElement===adaptaPEControlador.mascota.host')).result.value,true,'Nombre de mascota accesible con Tab');
            const antesTeclado=(await evaluarEn(pagina,id,'adaptaPEControlador.mascota.host.getBoundingClientRect().left')).result.value;
            await pagina.pedir('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
            await pagina.pedir('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
            assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.mascota.host.getBoundingClientRect().left')).result.value,antesTeclado-24,'Mover mascota con teclado');
            await pagina.pedir('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:50});
            await esperar(async()=>(await evaluarEn(pagina,id,'adaptaPEControlador.mascota.motor.element.shadowRoot.querySelector("canvas").dataset.frame.startsWith("look-")')).result?.value,'Mascota sigue cursor físico');
            if (id===completa.id) {
                await evaluarEn(pagina,id,'adaptaPEControlador.cinetico.posX=innerWidth-10;adaptaPEControlador.cinetico.posY=innerHeight-10;adaptaPEControlador.cinetico.actualizarHover(document.body)');
                const marcoFisico=(await evaluarEn(pagina,id,'adaptaPEControlador.mascota.motor.element.shadowRoot.querySelector("canvas").dataset.frame')).result.value;
                await esperar(async()=>(await evaluarEn(pagina,id,`adaptaPEControlador.mascota.motor.element.shadowRoot.querySelector('canvas').dataset.frame!==${JSON.stringify(marcoFisico)}`)).result?.value,'Mascota cambia mirada por cursor cinético');
            }
            for(const [comando,estado] of [['duerme mascota','sleep'],['despierta mascota','wake'],['saluda mascota','wave']]) {
                await evaluarEn(pagina,id,`adaptaPEControlador.voz.ejecutarComando('${comando}')`);
                await esperar(async()=>(await evaluarEn(pagina,id,`adaptaPEControlador.mascota.estado==='${estado}'`)).result?.value,'Reacción de voz: '+estado);
            }
            await evaluarEn(pagina,id,'adaptaPEControlador.mascota.reaccionar("idle");adaptaPEControlador.mascota.estadoVoz("No entendí el comando", "error")');
            assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.mascota.estado')).result.value,'confused');
            await evaluarEn(pagina,id,"adaptaPEControlador.voz.enviar({accion:'hablar',texto:'Respuesta de voz'})");
            await esperar(async()=>(await evaluarEn(pagina,id,'adaptaPEControlador.mascota.hablando && adaptaPEControlador.mascota.estado==="talk"')).result?.value,'Reacciona a voz sintética');
            if(id===completa.id) {
                await evaluarEn(pagina,id,'adaptaPEControlador.talkback.setEstado(true);adaptaPEControlador.talkback.onMouseOver({target:document.querySelector("button")})');
                await esperar(async()=>(await evaluarEn(pagina,id,'adaptaPEControlador.mascota.hablando && adaptaPEControlador.mascota.estado==="read"')).result?.value,'TalkBack cambia a lectura después de debounce');
                await evaluarEn(pagina,id,'adaptaPEControlador.talkback.setEstado(false)');
            } else await evaluarEn(pagina,id,"adaptaPEControlador.voz.enviar({accion:'callar'})");
            await esperar(async()=>(await evaluarEn(pagina,id,'!adaptaPEControlador.mascota.hablando')).result?.value,'Callar termina reacción');
            await pagina.pedir('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
            await esperar(async()=>(await evaluarEn(pagina,id,'adaptaPEControlador.mascota.motor.element.shadowRoot.querySelector("canvas").dataset.frame==="idle-06"')).result?.value,'Preferencia de movimiento reducido aplicada');
            const marcoReducido=(await evaluarEn(pagina,id,'adaptaPEControlador.mascota.motor.element.shadowRoot.querySelector("canvas").dataset.frame')).result.value;
            await pausa(200);
            assert.equal((await evaluarEn(pagina,id,'adaptaPEControlador.mascota.motor.element.shadowRoot.querySelector("canvas").dataset.frame')).result.value,marcoReducido,'Movimiento reducido conserva un frame');
            await pagina.pedir('Emulation.setEmulatedMedia',{features:[]});
            const origenIdioma = (await evaluarEn(pagina, id, 'performance.timeOrigin')).result.value;
            await evaluarEn(pagina, id, 'chrome.storage.local.set({idiomaVoz:"en-US"})');
            await esperar(async () => (await evaluarEn(pagina, id, 'TextosAdapta.idioma==="en" && adaptaPEControlador.mascota.botonMover?.ariaLabel.startsWith("Move ")')).result?.value, 'Mascota traduce su ayuda en una página abierta');
            assert.equal((await evaluarEn(pagina, id, 'performance.timeOrigin')).result.value, origenIdioma, 'Traducción sin recargar la web');
            await evaluarEn(pagina, id, 'chrome.storage.local.set({idiomaVoz:"es-PE"})');
            await esperar(async () => (await evaluarEn(pagina, id, 'TextosAdapta.idioma==="es" && adaptaPEControlador.mascota.botonMover?.ariaLabel.startsWith("Mover ")')).result?.value, 'Mascota vuelve al español en vivo');
            await evaluarEn(pagina,id,'adaptaPEControlador.mascota.actualizarVisibilidad(false)');
            assert.equal((await evaluarEn(pagina,id,'!adaptaPEControlador.mascota.motor && !adaptaPEControlador.mascota.host')).result.value,true,'Página inactiva libera sprites y animación');
            await evaluarEn(pagina,id,'adaptaPEControlador.mascota.actualizarVisibilidad(true)');
            await esperar(async()=>(await evaluarEn(pagina,id,'Boolean(adaptaPEControlador.mascota.motor)')).result?.value,'Regresa sin recargar');
            await evaluarEn(pagina,id,"adaptaPEControlador.voz.ejecutarComando('oculta mascota')");
            await esperar(async()=>(await evaluarEn(pagina,id,'!adaptaPEControlador.mascota.host')).result?.value,'Ocultar libera mascota');
        }
        console.log('✓ Mascotas Base/Lite: tres WebP, arrastre, teclado, ambos cursores, voz/TalkBack y liberación');
        for(const id of [completa.id,ligera.id]) {
            await esperar(async()=>contextoDe(pagina,id)&&(await evaluarEn(pagina,id,'Boolean(globalThis.adaptaPEControlador?.vigente())')).result?.value,'Conectar extensión a página abierta');
            await evaluarEn(pagina,id,"adaptaPEControlador.voz.ejecutarComando('selecciona zapatos azules')");
            assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'window.clicsProducto',returnByValue:true})).result.value,0);
            assert.equal((await evaluarEn(pagina,id,'Boolean(adaptaPEControlador.voz.elementoSeleccionado?.hasAttribute("data-"+adaptaPEControlador.voz.idSeleccion))')).result.value,true);
            await evaluarEn(pagina,id,"adaptaPEControlador.voz.ejecutarComando('dale clic');adaptaPEControlador.voz.ejecutarComando('dale clic')");
            assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'window.clicsProducto',returnByValue:true})).result.value,1,'Confirmación hace un solo clic');
            await evaluarEn(pagina,id,"adaptaPEControlador.voz.ejecutarComando('resalta zapatos azules')");
            await pagina.pedir('Runtime.evaluate',{expression:"document.querySelector('article').hidden=true;document.getElementById('otro').focus()"});
            await evaluarEn(pagina,id,"adaptaPEControlador.voz.ejecutarComando('dale clic')");
            assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'window.clicsProducto+window.clicsOtro',returnByValue:true})).result.value,1,'Selección oculta no activa otro control');
            await pagina.pedir('Runtime.evaluate',{expression:"document.querySelector('article').hidden=false;window.clicsProducto=0"});
        }
        assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'performance.timeOrigin',returnByValue:true})).result.value,origenPrevio,'No recarga la página existente');
        console.log('✓ Completa y Lite: reconexión sin recarga, selección resaltada y clic único seguro');
        await pagina.pedir('Page.navigate', { url: `http://127.0.0.1:${puerto}/tests/vision-local.html?rostro=/tests/fixtures/rostro.jpg&cuerpo=/tests/fixtures/cuerpo.jpg&manos=/tests/fixtures/manos.jpg&puno=/tests/fixtures/puno.jpg` });
        let informe;
        for (let intento = 0; intento < 100; intento++) {
            informe = (await pagina.pedir('Runtime.evaluate', { expression: 'window.adaptaResultadoVision', returnByValue: true })).result?.value;
            if (informe) break;
            await pausa(300);
        }
        assert.match(informe || '', /^OK:/);
        console.log('✓ Modelos locales reales: ' + informe);
        await pagina.pedir('Page.navigate', { url: `http://127.0.0.1:${puerto}/tests/prueba-dom.html` });
        for (let intento = 0; intento < 30; intento++) {
            informe = (await pagina.pedir('Runtime.evaluate', { expression: "document.getElementById('resultado')?.textContent", returnByValue: true })).result?.value;
            if (/^(OK|FALLO):/.test(informe || '')) break;
            await pausa(100);
        }
        assert.match(informe || '', /^OK:/);
        console.log('✓ DOM real: ' + informe);
        let destinosVoz = await (await fetch('http://127.0.0.1:' + puertoChrome + '/json')).json();
        const fondo = await conectar(destinosVoz.find(destino => destino.type === 'service_worker' && destino.url.includes(completa.id)).webSocketDebuggerUrl);
        await fondo.pedir('Runtime.evaluate', { expression: "chrome.storage.local.set({voz:true})", awaitPromise: true });
        let permiso;
        for (let intento = 0; intento < 40; intento++) {
            destinosVoz = await (await fetch('http://127.0.0.1:' + puertoChrome + '/json')).json();
            permiso = destinosVoz.find(destino => destino.url.endsWith('/voz/permisos.html') && destino.url.includes(completa.id));
            if (permiso) break;
            await pausa(100);
        }
        assert.ok(permiso, 'Se solicita permiso en una página visible de la extensión');
        await navegador.pedir('Browser.grantPermissions', { permissions: ['audioCapture'], origin: 'chrome-extension://' + completa.id });
        let paginaPermiso;
        if (permiso) {
            paginaPermiso = await conectar(permiso.webSocketDebuggerUrl);
            for (let intento = 0; intento < 30; intento++) {
                const preparada = (await paginaPermiso.pedir('Runtime.evaluate', { expression: "document.readyState==='complete'", returnByValue: true })).result?.value;
                if (preparada) break; await pausa(100);
            }
            await paginaPermiso.pedir('Runtime.evaluate', { expression: "document.getElementById('adapta-pe-permitir-microfono').click()", userGesture: true });
        }

        let escucha;
        for (let intento = 0; intento < 50; intento++) {
            destinosVoz = await (await fetch('http://127.0.0.1:' + puertoChrome + '/json')).json();
            escucha = destinosVoz.find(destino => destino.url.endsWith('/voz/escucha.html') && destino.url.includes(completa.id));
            if (escucha) break;
            await pausa(100);
        }
        assert.ok(escucha, 'Documento central creado');
        const central = await conectar(escucha.webSocketDebuggerUrl);
        // El dispositivo es sintético; los comandos se inyectan sin depender del servidor de voz.
        await central.pedir('Runtime.evaluate', { expression: `vozCentral.setEstado(false);
            window.SpeechRecognition = class { start(){this.onstart?.();} abort(){} };
            vozCentral.setEstado(true);`, awaitPromise: true });
        const inicial = (await central.pedir('Runtime.evaluate', { expression: 'vozCentral.microfonoIniciado', returnByValue: true })).result?.value;
        assert.equal(inicial, true, 'Escucha independiente de la visibilidad del documento');
        const activarPagina = `chrome.tabs.query({url:'http://127.0.0.1:${puerto}/tests/prueba-dom.html'}).then(async pestañas=>{
            await chrome.tabs.update(pestañas[0].id,{active:true}); await chrome.windows.update(pestañas[0].windowId,{focused:true});
        })`;
        await fondo.pedir('Runtime.evaluate', { expression: activarPagina, awaitPromise: true });
        await fondo.pedir('Runtime.evaluate', { expression: 'chrome.storage.local.set({idiomaVoz:"en-US"})', awaitPromise: true });
        await esperar(async () => (await central.pedir('Runtime.evaluate', { expression: 'vozCentral.reconocimientoVoz?.lang==="en-US" && TextosAdapta.idioma==="en"', returnByValue: true })).result?.value, 'Voz central cambia con el idioma de la extensión');
        await esperar(async () => (await evaluarEn(pagina, completa.id, 'TextosAdapta.idioma==="en" && document.getElementById("adapta-pe-voz-indicador-"+chrome.runtime.id)?.textContent.includes("Voice")')).result?.value, 'Indicador de voz traducido sin recargar');
        await fondo.pedir('Runtime.evaluate', { expression: 'chrome.storage.local.set({idiomaVoz:"es-PE"})', awaitPromise: true });
        await esperar(async () => (await central.pedir('Runtime.evaluate', { expression: 'vozCentral.reconocimientoVoz?.lang==="es-PE" && TextosAdapta.idioma==="es"', returnByValue: true })).result?.value, 'Voz central vuelve al español');
        await central.pedir('Runtime.evaluate', { expression: "vozCentral.textoReconocido='Computadora busca validación local';vozCentral.procesarFraseContinua();" });
        await pausa(300);
        const campoLocal = (await pagina.pedir('Runtime.evaluate', { expression: "document.getElementById('buscador').value", returnByValue: true })).result.value;
        assert.equal(campoLocal, 'validación local', 'Los comandos DOM llegan al content script de la pestaña activa');
        await pagina.pedir('Runtime.enable');
        await navegador.pedir('Browser.setPermission', { permission: { name: 'camera' }, setting: 'denied', origin: `http://127.0.0.1:${puerto}` });
        await central.pedir('Runtime.evaluate', { expression: `window.solicitudesCamara=0; const obtenerFlujo=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); navigator.mediaDevices.getUserMedia=(datos)=>{window.solicitudesCamara++;return obtenerFlujo(datos);};` });
        await central.pedir('Runtime.evaluate', { expression: "vozCentral.textoReconocido='Computadora activar cursor';vozCentral.procesarFraseContinua();" });
        let permisoCamara;
        for (let intento=0;intento<50;intento++) {
            destinosVoz=await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json();
            permisoCamara=destinosVoz.find(destino=>destino.url.endsWith('/voz/permisos.html?dispositivo=camara')&&destino.url.includes(completa.id));
            if(permisoCamara) break; await pausa(100);
        }
        assert.ok(permisoCamara,'Permiso único de cámara en origen de extensión');
        await navegador.pedir('Browser.grantPermissions',{permissions:['audioCapture','videoCapture'],origin:'chrome-extension://'+completa.id});
        const paginaCamara=await conectar(permisoCamara.webSocketDebuggerUrl);
        for(let intento=0;intento<30;intento++) {
            if((await paginaCamara.pedir('Runtime.evaluate',{expression:"document.readyState==='complete'",returnByValue:true})).result?.value) break;
            await pausa(100);
        }
        await paginaCamara.pedir('Runtime.evaluate',{expression:"document.getElementById('adapta-pe-permitir-microfono').click()",userGesture:true});
        await pausa(500); paginaCamara.socket.close();
        let contextoCinetico;
        for (let intento = 0; intento < 40; intento++) {
            contextoCinetico = [...pagina.contextos.values()].find(contexto => contexto.origin === 'chrome-extension://' + completa.id && contexto.auxData?.isDefault === false);
            if (contextoCinetico) {
                const activa = (await pagina.pedir('Runtime.evaluate', { expression: 'adaptaPEControlador.cinetico.activa', contextId: contextoCinetico.id, returnByValue: true })).result?.value;
                if (activa) break;
            }
            await pausa(100);
        }
        assert.ok(contextoCinetico, 'Contexto aislado del motor completo');
        const evaluarCinetico = expresion => pagina.pedir('Runtime.evaluate', { expression: expresion, contextId: contextoCinetico.id, returnByValue: true });
        assert.equal((await evaluarCinetico('adaptaPEControlador.cinetico.activa')).result.value, true, 'Cámara sintética activada por voz');
        await esperar(async()=>(await evaluarCinetico('adaptaPEControlador.cinetico.numeroFotograma>0')).result?.value,'Inferencias de cámara central llegan a la página');
        assert.equal((await evaluarCinetico('adaptaPEControlador.cinetico.burbuja.shadowRoot===null')).result.value,true,'Vista de cámara aislada del DOM de la web');
        // La vista sigue fluida aunque no lleguen inferencias nuevas; no toca calibración/física.
        await central.pedir('Runtime.evaluate',{expression:'clearTimeout(camaraCentral.temporizador);camaraCentral.capturarOriginal=camaraCentral.capturar;camaraCentral.capturar=()=>{}'});
        await pausa(150);
        await evaluarCinetico('globalThis.vistasPrueba=0;globalThis.dibujarVistaOriginal=adaptaPEControlador.cinetico.ctx.drawImage;adaptaPEControlador.cinetico.ctx.drawImage=function(...args){vistasPrueba++;return dibujarVistaOriginal.apply(this,args)}');
        const deteccionesAntes=(await evaluarCinetico('adaptaPEControlador.cinetico.numeroFotograma')).result.value;
        await pausa(1000);
        const vistasSegundo=(await evaluarCinetico('vistasPrueba')).result.value;
        assert.ok(vistasSegundo>=10,'Vista recibe al menos 10 imágenes/s sin esperar detecciones: '+vistasSegundo);
        console.log('✓ Vista previa independiente de inferencias: '+vistasSegundo+' imágenes/s con cámara simulada');
        assert.equal((await evaluarCinetico('adaptaPEControlador.cinetico.numeroFotograma')).result.value,deteccionesAntes,'La vista no cuenta como inferencia');
        await evaluarCinetico('adaptaPEControlador.cinetico.ctx.drawImage=dibujarVistaOriginal');
        await evaluarCinetico('globalThis.parserOriginal=adaptaPEControlador.voz.ejecutarComando;adaptaPEControlador.voz.ejecutarComando=texto=>{globalThis.ordenCursorPrueba=texto}');
        try {
            for (const [texto, seleccion, esperado] of [['da clic', false, 'clic'], ['dale clic', false, 'clic'], ['da clic', true, 'dale clic']]) {
                await evaluarCinetico(`adaptaPEControlador.voz.elementoSeleccionado=${seleccion ? 'document.body' : 'null'}`);
                await fondo.pedir('Runtime.evaluate', { expression: `chrome.tabs.query({active:true,lastFocusedWindow:true}).then(p=>chrome.tabs.sendMessage(p[0].id,{accion:'voz_ejecutar',texto:'${texto}'}))`, awaitPromise: true });
                assert.equal((await evaluarCinetico('ordenCursorPrueba')).result.value, esperado, 'Alias de clic respeta selección en Base');
            }
        } finally {
            await evaluarCinetico('adaptaPEControlador.voz.ejecutarComando=parserOriginal;adaptaPEControlador.voz.elementoSeleccionado=null');
        }
        await central.pedir('Runtime.evaluate',{expression:'camaraCentral.capturar=camaraCentral.capturarOriginal;camaraCentral.capturar(camaraCentral.generacion)'});
        const origenCambio = (await pagina.pedir('Runtime.evaluate', { expression: 'performance.timeOrigin', returnByValue: true })).result.value;
        const flujoCambio = (await central.pedir('Runtime.evaluate', { expression: 'camaraCentral.flujo.id', returnByValue: true })).result.value;
        for (const modo of ['manos', 'zona', 'cabeza', 'zona', 'manos']) {
            const antes = (await evaluarCinetico('adaptaPEControlador.cinetico.numeroFotograma')).result.value;
            await fondo.pedir('Runtime.evaluate', { expression: `chrome.storage.local.get('ajustesCineticos').then(estado=>chrome.storage.local.set({ajustesCineticos:{...estado.ajustesCineticos,modo:'${modo}'}}))`, awaitPromise: true });
            await esperar(async () => (await evaluarCinetico(`adaptaPEControlador.cinetico.deteccion?.modo==='${modo}' && adaptaPEControlador.cinetico.numeroFotograma>${antes}`)).result?.value, 'Cambiar a ' + modo + ' entrega inferencias sin recargar');
            assert.equal((await central.pedir('Runtime.evaluate', { expression: 'camaraCentral.modo', returnByValue: true })).result.value, modo);
            assert.equal((await central.pedir('Runtime.evaluate', { expression: 'camaraCentral.flujo.id', returnByValue: true })).result.value, flujoCambio);
            assert.equal((await pagina.pedir('Runtime.evaluate', { expression: 'performance.timeOrigin', returnByValue: true })).result.value, origenCambio);
        }
        console.log('✓ Cinco cambios de detección con cámara activa, misma página y mismo flujo');
        await fondo.pedir('Runtime.evaluate', { expression: "chrome.tabs.query({active:true,lastFocusedWindow:true}).then(p=>chrome.tabs.sendMessage(p[0].id,{accion:'voz_ejecutar',texto:'control mano parcial'}))", awaitPromise: true });
        await esperar(async () => (await central.pedir('Runtime.evaluate', { expression: "camaraCentral.modo==='zona'", returnByValue: true })).result?.value, 'Textura llega a la cámara');
        await esperar(async () => (await evaluarCinetico("adaptaPEControlador.cinetico.deteccion?.modo==='zona' && adaptaPEControlador.cinetico.grisesRecibidos")).result?.value, 'Textura llega al cursor');
        console.log('✓ Mano parcial por voz: captura y cursor cambian al modo único de textura');
        await evaluarCinetico('globalThis.avisosCentro=[];globalThis.estadoVozOriginal=adaptaPEControlador.voz.mostrarEstado;adaptaPEControlador.voz.mostrarEstado=function(texto){avisosCentro.push(texto);estadoVozOriginal.call(this,texto)}');
        try {
            for (const texto of ['recalibrar', 'pausar cursor', 'reanudar cursor', 'movimientos pequeños']) {
                await fondo.pedir('Runtime.evaluate', { expression: `chrome.tabs.query({active:true,lastFocusedWindow:true}).then(p=>chrome.tabs.sendMessage(p[0].id,{accion:'voz_ejecutar',texto:${JSON.stringify(texto)}}))`, awaitPromise: true });
            }
            const avisos = (await evaluarCinetico('avisosCentro')).result.value;
            assert.equal(avisos.filter(texto => /calibrando/.test(texto)).length, 0);
            assert.ok(avisos.includes('Cursor reanudado. Centro fijo, sin calibración.'), JSON.stringify({ avisos,
                estado: (await evaluarCinetico('({idioma:TextosAdapta.idioma,texto:TextosAdapta.t("pagina.reanudado"),activa:adaptaPEControlador.cinetico.activa,modo:adaptaPEControlador.cinetico.modoControl})')).result.value }));
            assert.deepEqual((await evaluarCinetico('({centro:adaptaPEControlador.cinetico.origenControl,listo:adaptaPEControlador.cinetico.neutroListo})')).result.value,
                { centro: { x: 80, y: 60 }, listo: true });
        } finally { await evaluarCinetico('adaptaPEControlador.voz.mostrarEstado=estadoVozOriginal'); }
        console.log('✓ Extremidades: centro fijo y avisos de voz sin calibración al ajustar o reanudar');
        const flujoInicial=(await central.pedir('Runtime.evaluate',{expression:'camaraCentral.flujo.id',returnByValue:true})).result.value;
        for (const comando of ['activar temblor', 'movimientos pequeños', 'control brazos']) {
            await central.pedir('Runtime.evaluate', { expression: `vozCentral.textoReconocido=${JSON.stringify('Computadora ' + comando)};vozCentral.procesarFraseContinua();` });
            await pausa(100);
        }
        const ajustes = (await fondo.pedir('Runtime.evaluate', { expression: "chrome.storage.local.get('ajustesCineticos').then(d=>d.ajustesCineticos)", awaitPromise: true, returnByValue: true })).result.value;
        assert.deepEqual(ajustes, { modo: 'manos', temblor: true, velocidad: 1, amplitud: 0.55 });
        await pagina.pedir('Page.reload');
        for (let intento = 0; intento < 50; intento++) {
            contextoCinetico = [...pagina.contextos.values()].find(contexto => contexto.origin === 'chrome-extension://' + completa.id && contexto.auxData?.isDefault === false);
            if (contextoCinetico) {
                try {
                    const lista = (await evaluarCinetico('adaptaPEControlador.cinetico.activa && adaptaPEControlador.cinetico.amplitudControl === 0.55')).result?.value;
                    if (lista) break;
                } catch (error) {
                    // Page.reload responde antes de destruir el contexto anterior.
                    if (!/Cannot find context/.test(error.message)) throw error;
                }
            }
            await pausa(100);
        }
        const restaurado = (await evaluarCinetico('({activo:adaptaPEControlador.cinetico.activa,modo:adaptaPEControlador.cinetico.modoControl,temblor:adaptaPEControlador.cinetico.zonaMuerta,amplitud:adaptaPEControlador.cinetico.amplitudControl,botones:adaptaPEControlador.cinetico.burbuja.querySelectorAll("button").length,centro:adaptaPEControlador.cinetico.origenControl,listo:adaptaPEControlador.cinetico.neutroListo})')).result.value;
        assert.deepEqual(restaurado, { activo: true, modo: 'manos', temblor: 0.07, amplitud: 0.55, botones: 0, centro: { x: 80, y: 60 }, listo: true });
        const otroFondoDestino=(await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).find(destino=>destino.type==='service_worker'&&destino.url.includes(ligera.id));
        const fondoLite=await conectar(otroFondoDestino.webSocketDebuggerUrl);
        await central.pedir('Runtime.evaluate',{expression:"vozCentral.textoReconocido='Computadora mascota Y Atti';vozCentral.procesarFraseContinua();"});
        await esperar(async()=>(await evaluarEn(pagina,completa.id,'adaptaPEControlador.mascota.nombre==="yati" && Boolean(adaptaPEControlador.mascota.motor)')).result?.value,'Transcripción separada Y Atti elige Yati');
        await central.pedir('Runtime.evaluate',{expression:"vozCentral.textoReconocido='Computadora mascota Tinku';vozCentral.procesarFraseContinua();"});
        await esperar(async()=>(await evaluarEn(pagina,completa.id,'adaptaPEControlador.mascota.nombre==="tinku" && Boolean(adaptaPEControlador.mascota.motor)')).result?.value,'Voz central elige mascota en página actual');
        const posicionPersistente=(await evaluarEn(pagina,completa.id,'adaptaPEControlador.mascota.posicion')).result.value;
        await fondo.pedir('Runtime.evaluate',{expression:"chrome.storage.local.set({talkback:true,daltonismo:'acromatopsia'})",awaitPromise:true});
        await fondoLite.pedir('Runtime.evaluate',{expression:"chrome.storage.local.set({daltonismo:'acromatopsia'})",awaitPromise:true});
        const ventanaOriginal=(await fondo.pedir('Runtime.evaluate',{expression:'chrome.tabs.query({active:true,lastFocusedWindow:true}).then(p=>p[0].windowId)',awaitPromise:true,returnByValue:true})).result.value;
        const segundaVentana=(await fondo.pedir('Runtime.evaluate',{expression:`chrome.windows.create({url:'http://localhost:${puerto}/tests/pagina-global.html',focused:true}).then(v=>v.id)`,awaitPromise:true,returnByValue:true})).result.value;
        let segundaPagina;
        await esperar(async()=>{
            const destinos=await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json();
            const destino=destinos.find(d=>d.url===`http://localhost:${puerto}/tests/pagina-global.html`);
            if(!destino) return false;
            segundaPagina=await conectar(destino.webSocketDebuggerUrl);await segundaPagina.pedir('Runtime.enable');return true;
        },'Segunda ventana disponible');
        await esperar(async()=>contextoDe(segundaPagina,completa.id)&&(await evaluarEn(segundaPagina,completa.id,'adaptaPEControlador.cinetico.activa && adaptaPEControlador.cinetico.numeroFotograma>0 && adaptaPEControlador.talkback.activo')).result?.value,'Cursor y TalkBack en nueva ventana sin recargar');
        await esperar(async()=>(await evaluarEn(segundaPagina,completa.id,'adaptaPEControlador.mascota.nombre==="tinku" && Boolean(adaptaPEControlador.mascota.motor)')).result?.value,'Mascota disponible en otro origen y ventana');
        assert.deepEqual((await evaluarEn(segundaPagina,completa.id,'adaptaPEControlador.mascota.posicion')).result.value,posicionPersistente,'Posición conservada entre páginas');
        assert.equal((await evaluarCinetico('adaptaPEControlador.cinetico.activa || adaptaPEControlador.talkback.activo')).result.value,false,'La otra ventana visible no controla ni lee');
        assert.equal((await central.pedir('Runtime.evaluate',{expression:'camaraCentral.flujo.id',returnByValue:true})).result.value,flujoInicial,'Misma cámara entre webs y ventanas');
        assert.equal((await central.pedir('Runtime.evaluate',{expression:'window.solicitudesCamara',returnByValue:true})).result.value,1,'Un solo acceso a cámara');
        for(const conexion of [pagina,segundaPagina]) for(const id of [completa.id,ligera.id]) {
            await esperar(async()=>contextoDe(conexion,id)&&(await evaluarEn(conexion,id,"adaptaPEControlador.filtros.filtroActual==='acromatopsia'")).result?.value,'Filtro conservado en ambas ventanas y variantes');
        }
        await central.pedir('Runtime.evaluate',{expression:"vozCentral.textoReconocido='Computadora seleccionar zapatos azules';vozCentral.procesarFraseContinua();"});
        await esperar(async()=>(await evaluarEn(segundaPagina,completa.id,'Boolean(adaptaPEControlador.voz.elementoSeleccionado)')).result?.value,'Selección por voz en ventana enfocada');
        await central.pedir('Runtime.evaluate',{expression:"vozCentral.textoReconocido='Computadora dale clic';vozCentral.procesarFraseContinua();"});
        await esperar(async()=>(await segundaPagina.pedir('Runtime.evaluate',{expression:'window.clicsProducto===1',returnByValue:true})).result?.value,'Clic sobre selección en ventana enfocada');
        if(visible) {
            await fondo.pedir('Runtime.evaluate',{expression:`chrome.windows.update(${ventanaOriginal},{focused:true})`,awaitPromise:true});
        } else {
            // Headless marca ambas ventanas enfocadas y no emite cambios de foco entre las existentes.
            // Cerrar la segunda sí actualiza su última ventana; el modo visible prueba el foco del sistema.
            await fondo.pedir('Runtime.evaluate',{expression:`chrome.windows.remove(${segundaVentana})`,awaitPromise:true});
            await fondo.pedir('Runtime.evaluate',{expression:`chrome.windows.update(${ventanaOriginal},{focused:true})`,awaitPromise:true});
        }
        await esperar(async()=>(await evaluarCinetico('adaptaPEControlador.cinetico.activa && adaptaPEControlador.cinetico.numeroFotograma>0 && adaptaPEControlador.talkback.activo')).result?.value,'Regreso al cursor y TalkBack sin recargar');
        await esperar(async()=>(await evaluarEn(pagina,completa.id,'Boolean(adaptaPEControlador.mascota.motor) && !adaptaPEControlador.mascota.host.hidden')).result?.value,'Mascota recuperada al volver sin recarga');
        if(visible) {
            assert.equal((await evaluarEn(segundaPagina,completa.id,'adaptaPEControlador.cinetico.activa')).result.value,false);
            await fondo.pedir('Runtime.evaluate',{expression:`chrome.windows.remove(${segundaVentana})`,awaitPromise:true});
        }
        segundaPagina.socket.close();fondoLite.socket.close();
        console.log('✓ Cámara única entre ventanas/orígenes, prioridad, voz contextual y filtros en ambas variantes');
        await fondo.pedir('Runtime.evaluate',{expression:'chrome.storage.local.set({voz:false})',awaitPromise:true});
        await esperar(async()=>(await central.pedir('Runtime.evaluate',{expression:'!vozCentral.microfonoIniciado',returnByValue:true})).result?.value,'Micrófono detenido sin apagar cámara');
        assert.equal((await central.pedir('Runtime.evaluate',{expression:'camaraCentral.flujo.id',returnByValue:true})).result.value,flujoInicial);
        await fondo.pedir('Runtime.evaluate',{expression:'chrome.storage.local.set({voz:true})',awaitPromise:true});
        await esperar(async()=>(await central.pedir('Runtime.evaluate',{expression:'vozCentral.microfonoIniciado',returnByValue:true})).result?.value,'Micrófono recuperado con la misma cámara');
        assert.equal((await evaluarEn(pagina,completa.id,'Boolean(adaptaPEControlador.mascota.motor) && !adaptaPEControlador.mascota.host.hidden')).result.value,true,'Encender/apagar voz no oculta mascota');
        for(const id of [completa.id,ligera.id]) {
            await evaluarEn(pagina,id,'globalThis.controlAnterior=adaptaPEControlador');
            const origenFondo=id===completa.id?fondo:await conectar(otroFondoDestino.webSocketDebuggerUrl);
            await origenFondo.pedir('Runtime.evaluate',{expression:`chrome.tabs.query({url:'http://127.0.0.1:${puerto}/tests/prueba-dom.html'}).then(p=>chrome.scripting.executeScript({target:{tabId:p[0].id},files:chrome.runtime.getManifest().content_scripts[0].js}))`,awaitPromise:true});
            assert.equal((await evaluarEn(pagina,id,'controlAnterior===adaptaPEControlador')).result.value,true,'Reinyección conserva un único controlador vigente');
            if(id!==completa.id) origenFondo.socket.close();
        }
        assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'document.querySelectorAll("#adapta-pe-cursor").length',returnByValue:true})).result.value,1);
        await central.pedir('Runtime.evaluate', { expression: "vozCentral.textoReconocido='Computadora desactivar cursor';vozCentral.procesarFraseContinua();" });
        await pausa(350);
        assert.equal((await evaluarCinetico('adaptaPEControlador.cinetico.activa')).result.value, false);
        console.log('✓ Cinético real: activar/desactivar por voz, sin botones y preferencias tras recarga');
        // Un comando, una ventana. Después la misma instancia permanece disponible.
        const antes = (await fondo.pedir('Runtime.evaluate', { expression: 'chrome.windows.getAll().then(ventanas=>ventanas.length)', awaitPromise: true, returnByValue: true })).result.value;
        await central.pedir('Runtime.evaluate', { expression: "vozCentral.textoReconocido='Computadora abre una nueva ventana';vozCentral.procesarFraseContinua();" });
        await pausa(700);
        const despues = (await fondo.pedir('Runtime.evaluate', { expression: 'chrome.windows.getAll().then(ventanas=>ventanas.length)', awaitPromise: true, returnByValue: true })).result.value;
        assert.equal(despues, antes + 1);
        const permanece = (await central.pedir('Runtime.evaluate', { expression: 'vozCentral.microfonoIniciado', returnByValue: true })).result.value;
        assert.equal(permanece, true);
        // Navegación desde chrome://newtab sin reemplazarlo ni inyectar scripts en su DOM.
        await fondo.pedir('Runtime.evaluate', { expression: "chrome.tabs.create({url:'chrome://newtab/'}).then(p=>chrome.windows.update(p.windowId,{focused:true}))", awaitPromise: true });
        await central.pedir('Runtime.evaluate', { expression: "vozCentral.textoReconocido='Computadora busca prueba adapta';vozCentral.procesarFraseContinua();" });
        await pausa(400);
        const busqueda = (await fondo.pedir('Runtime.evaluate', { expression: "chrome.tabs.query({active:true,lastFocusedWindow:true}).then(p=>p[0].pendingUrl||p[0].url)", awaitPromise: true, returnByValue: true })).result.value;
        assert.match(busqueda, /google\.com\/search\?q=prueba%20adapta/);
        await fondo.pedir('Runtime.evaluate', { expression: 'chrome.storage.local.set({voz:false})', awaitPromise: true });
        await esperar(async()=>(await fondo.pedir('Runtime.evaluate', { expression: "chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']}).then(c=>c.length===0)", awaitPromise: true, returnByValue: true })).result?.value,'Apagar libera documento y dispositivos incluso con una web cargando');
        central.socket.close(); paginaPermiso?.socket.close(); fondo.socket.close();
        console.log('✓ Voz central: permiso, ventana única, continuidad, Nueva pestaña y apagado');

        const fondoRecargaDestino=(await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).find(d=>d.type==='service_worker'&&d.url.includes(completa.id));
        const fondoRecarga=await conectar(fondoRecargaDestino.webSocketDebuggerUrl);
        await fondoRecarga.pedir('Runtime.evaluate',{expression:`chrome.windows.getAll().then(v=>Promise.all(v.filter(ventana=>ventana.id!==${ventanaOriginal}).map(ventana=>chrome.windows.remove(ventana.id))))`,awaitPromise:true});
        const tiempoSinRecarga=(await pagina.pedir('Runtime.evaluate',{expression:'performance.timeOrigin',returnByValue:true})).result.value;
        await fondoRecarga.pedir('Runtime.evaluate',{expression:'chrome.storage.local.set({ojos:true})',awaitPromise:true});
        await esperar(async()=>(await evaluarEn(pagina,completa.id,'adaptaPEControlador.cinetico.activa && adaptaPEControlador.cinetico.numeroFotograma>0')).result?.value,'Cursor activo antes de actualizar extensión');
        for(const id of [completa.id,ligera.id]) {
            await evaluarEn(pagina,id,'adaptaPEControlador.marcaPrueba=true');
            if(id===completa.id) await evaluarEn(pagina,id,'adaptaPEControlador.talkback.onMouseOver({target:document.querySelector("button")})');
            const reinstalada=await navegador.pedir('Extensions.loadUnpacked',{path:id===completa.id?raiz:path.resolve(raiz,'../extensiónLite')});
            assert.equal(reinstalada.id,id);
            try { await esperar(async()=>{
                const contexto=contextoDe(pagina,id);if(!contexto) return false;
                try {return (await evaluarEn(pagina,id,'Boolean(globalThis.adaptaPEControlador?.vigente()) && !adaptaPEControlador.marcaPrueba')).result?.value;} catch(error) {if(!/context/.test(error.message))throw error;return false;}
            },'Extensión actualizada recupera página sin recargarla'); } catch(error) {
                console.error('Recarga',id,'contextos',JSON.stringify([...pagina.contextos.values()]),'errores',JSON.stringify(pagina.errores));
                console.error('Estado controlador',JSON.stringify(await evaluarEn(pagina,id,'({marca:globalThis.adaptaPEControlador?.marcaPrueba,vigente:globalThis.adaptaPEControlador?.vigente(),runtime:chrome.runtime.id})')));
                console.error('Destinos',JSON.stringify((await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).map(d=>({id:d.id,url:d.url,type:d.type}))));throw error;
            }
            await silenciarPruebas(id);
        }
        assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'performance.timeOrigin',returnByValue:true})).result.value,tiempoSinRecarga);
        await esperar(async()=>(await evaluarEn(pagina,completa.id,'adaptaPEControlador.cinetico.activa && adaptaPEControlador.cinetico.numeroFotograma>0')).result?.value,'Cámara y cursor recuperados después de actualizar');
        assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'document.querySelectorAll("#adapta-pe-cursor").length',returnByValue:true})).result.value,1,'No duplica cursor al actualizar con cámara activa');
        const destinoFinal=(await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).find(d=>d.type==='service_worker'&&d.url.includes(completa.id));
        const fondoFinal=await conectar(destinoFinal.webSocketDebuggerUrl);
        await fondoFinal.pedir('Runtime.evaluate',{expression:'chrome.storage.local.set({ojos:false})',awaitPromise:true});
        await esperar(async()=>(await pagina.pedir('Runtime.evaluate',{expression:'!document.getElementById("adapta-pe-cursor")',returnByValue:true})).result?.value,'Cursor actualizado también libera recursos al apagar');
        fondoFinal.socket.close();
        fondoRecarga.socket.close();
        assert.equal(pagina.errores.filter(error=>/already been declared|Extension context invalidated/i.test(error.exception?.description||error.text)).length,0,'Sin redeclaraciones ni callbacks antiguos con contexto invalidado');
        console.log('✓ Reinyección y recarga de ambas extensiones sin recarga de páginas ni controles duplicados');

        const urlPrueba=process.env.ADAPTA_URL_PRUEBA || `http://127.0.0.1:${puerto}/tests/pagina-global.html?estricta`;
        await pagina.pedir('Page.navigate',{url:urlPrueba});
        await esperar(async()=>(await pagina.pedir('Runtime.evaluate',{expression:`location.origin===${JSON.stringify(new URL(urlPrueba).origin)} && document.readyState==='complete'`,returnByValue:true})).result?.value,'Página restrictiva cargada');
        for(const id of [completa.id,ligera.id]) {
            await esperar(async()=>contextoDe(pagina,id)&&(await evaluarEn(pagina,id,'Boolean(globalThis.adaptaPEControlador?.vigente())')).result?.value,'Controlador con política restrictiva');
            await navegador.pedir('Browser.grantPermissions',{permissions:['audioCapture'],origin:'chrome-extension://'+id});
            await evaluarEn(pagina,id,"chrome.storage.local.set({voz:true,mascota:'cuchu',daltonismo:'protanopia'})");
            await esperar(async()=>(await evaluarEn(pagina,id,'Boolean(adaptaPEControlador.mascota.motor)')).result?.value,'Sprites con política restrictiva');
            let documentoVoz;
            await esperar(async()=>{
                documentoVoz=(await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).find(d=>d.url===`chrome-extension://${id}/voz/escucha.html`);
                return Boolean(documentoVoz);
            },'Documento de voz preparado para recuperación');
            const vozPrueba=await conectar(documentoVoz.webSocketDebuggerUrl);
            await vozPrueba.pedir('Runtime.evaluate',{expression:'vozCentral.setEstado(false);window.SpeechRecognition=class {start(){this.onstart?.();} abort(){}};vozCentral.setEstado(true)',awaitPromise:true});
            vozPrueba.socket.close();
            await esperar(async()=>(await evaluarEn(pagina,id,'Boolean(document.getElementById("adapta-pe-voz-indicador-"+chrome.runtime.id))')).result?.value,'Indicador aparece sin esperar otro mensaje');
            await evaluarEn(pagina,id,'globalThis.indicadorPermanente=document.getElementById("adapta-pe-voz-indicador-"+chrome.runtime.id);globalThis.controlPermanente=adaptaPEControlador');
        }
        const tiempoSPA=(await pagina.pedir('Runtime.evaluate',{expression:'performance.timeOrigin',returnByValue:true})).result.value;
        await pagina.pedir('Runtime.evaluate',{expression:'document.body.replaceWith(document.createElement("body"));document.getElementById("adapta-pe-filtros-svg")?.remove();document.getElementById("adapta-pe-daltonismo-style")?.remove();history.pushState({},"","?estricta&otraPagina")'});
        for(const id of [completa.id,ligera.id]) {
            await esperar(async()=>(await evaluarEn(pagina,id,'adaptaPEControlador===controlPermanente && adaptaPEControlador.mascota.host.isConnected && document.getElementById("adapta-pe-filtros-svg") && document.getElementById("adapta-pe-daltonismo-style")')).result?.value,'Cambio SPA recupera interfaz sin reiniciar controlador');
            await evaluarEn(pagina,id,'indicadorPermanente.remove()');
            await esperar(async()=>(await evaluarEn(pagina,id,'indicadorPermanente.isConnected')).result?.value,'Indicador eliminado se recupera sin recargar');
        }
        assert.equal((await pagina.pedir('Runtime.evaluate',{expression:'performance.timeOrigin',returnByValue:true})).result.value,tiempoSPA);
        assert.deepEqual(pagina.mensajes.filter(m=>m.text.includes('Unsafe attempt to load URL')),[],'Recursos de mascota sin fallos de origen en carga, navegación y actualización');
        console.log('✓ Base/Lite: nombres alternativos, interfaz tras cambio SPA y recursos con política restrictiva');

        await pagina.pedir('Emulation.setDeviceMetricsOverride',{width:2400,height:900,deviceScaleFactor:1,mobile:false});
        await pagina.pedir('Page.navigate', {url:`http://127.0.0.1:${puerto}/tests/filtros-juegos.html`});
        await esperar(async()=>(await pagina.pedir('Runtime.evaluate',{expression:'document.querySelectorAll("iframe").length===4 && ["mismo","contenido","blob"].every(id=>document.getElementById(id).contentDocument?.readyState==="complete")',returnByValue:true})).result?.value,'Juego de prueba preparado');
        const trabajadorFiltros = await conectar((await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).find(d=>d.type==='service_worker'&&d.url.includes(completa.id)).webSocketDebuggerUrl);
        async function colorVisible(x,y) {
            const captura=await pagina.pedir('Page.captureScreenshot',{clip:{x,y,width:1,height:1,scale:1}});
            return (await pagina.pedir('Runtime.evaluate',{expression:`new Promise(resolver=>{const imagen=new Image();imagen.onload=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const contexto=canvas.getContext('2d');contexto.drawImage(imagen,0,0);resolver(Array.from(contexto.getImageData(0,0,1,1).data).slice(0,3))};imagen.src='data:image/png;base64,${captura.data}'})`,awaitPromise:true,returnByValue:true})).result.value;
        }
        const iguales=(actual,esperado)=>actual.every((valor,i)=>Math.abs(valor-esperado[i])<=3);
        for(const id of [completa.id,ligera.id]) {
            for(const otra of [completa.id,ligera.id]) await esperar(async()=>contextoDe(pagina,otra)&&(await evaluarEn(pagina,otra,"chrome.storage.local.set({voz:false,daltonismo:'ninguno',mascota:'ninguna'})")).result,'Filtros aislados para prueba');
            await evaluarEn(pagina,id,"chrome.storage.local.set({daltonismo:'protanopia'})");
            await esperar(async()=>(await evaluarEn(pagina,id,'adaptaPEControlador.filtros.filtroActual==="protanopia"')).result?.value,'Filtro preparado en juego');
            const puntos=(await pagina.pedir('Runtime.evaluate',{expression:'["lienzo","grafico","transmision"].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [r.x+40,r.y+40]})',returnByValue:true})).result.value;
            const esperado=await colorVisible(...puntos[0]);
            assert.equal(iguales(esperado,[255,0,0]),false,'Canvas modifica sus colores visibles');
            for(const punto of puntos.slice(1)) assert.ok(iguales(await colorVisible(...punto),esperado),'WebGL/vídeo reciben la misma matriz');
            for(const marco of ['mismo','otro','contenido','blob']) {
                const punto=(await pagina.pedir('Runtime.evaluate',{expression:`(()=>{const r=document.getElementById('${marco}').getBoundingClientRect();const c=document.getElementById('mismo').contentDocument.getElementById('lienzo').getBoundingClientRect();return [r.x+c.x+40,r.y+c.y+40]})()`,returnByValue:true})).result.value;
                await esperar(async()=>iguales(await colorVisible(...punto),esperado),'Marco '+marco+' recibe una matriz en modo normal');
            }
            await pagina.pedir('Runtime.evaluate',{expression:'document.getElementById("lienzo").requestFullscreen()',userGesture:true,awaitPromise:true});
            assert.ok(iguales(await colorVisible(40,40),esperado),'Canvas conserva filtro en pantalla completa');
            await pagina.pedir('Runtime.evaluate',{expression:'document.exitFullscreen()',awaitPromise:true});
            for(const marco of ['mismo','otro','contenido','blob']) {
                const boton=(await pagina.pedir('Runtime.evaluate',{expression:`(()=>{const r=document.getElementById('${marco}').getBoundingClientRect();const b=document.getElementById('mismo').contentDocument.getElementById('pantalla').getBoundingClientRect();return [r.x+b.x+10,r.y+b.y+10]})()`,returnByValue:true})).result.value;
                if(marco==='otro') {
                    const destinos=await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json();
                    const destino=destinos.find(d=>d.type==='iframe'&&d.url===`http://localhost:${puerto}/tests/filtros-juegos.html`);
                    assert.ok(destino,'Marco de otro origen disponible para gesto de prueba');
                    const juego=await conectar(destino.webSocketDebuggerUrl);
                    await juego.pedir('Runtime.evaluate',{expression:'document.getElementById("lienzo").requestFullscreen()',awaitPromise:true,userGesture:true});
                    juego.socket.close();
                } else {
                await pagina.pedir('Input.dispatchMouseEvent',{type:'mousePressed',x:boton[0],y:boton[1],button:'left',clickCount:1});
                await pagina.pedir('Input.dispatchMouseEvent',{type:'mouseReleased',x:boton[0],y:boton[1],button:'left',clickCount:1});
                }
                try { await esperar(async()=>(await pagina.pedir('Runtime.evaluate',{expression:`document.fullscreenElement?.id==='${marco}'`,returnByValue:true})).result?.value,'Juego incrustado '+marco+' entra en pantalla completa'); }
                catch(error) {
                    console.error('Pantalla',marco,boton,JSON.stringify((await trabajadorFiltros.pedir('Runtime.evaluate',{expression:`chrome.tabs.query({url:'http://127.0.0.1:${puerto}/tests/filtros-juegos.html'}).then(p=>chrome.scripting.executeScript({target:{tabId:p[0].id,allFrames:true},func:()=>({url:location.href,pantalla:document.fullscreenEnabled,boton:document.getElementById('pantalla')?.getBoundingClientRect().toJSON(),texto:document.body.innerText.slice(0,100)})}))`,awaitPromise:true,returnByValue:true})).result.value));
                    const captura=await pagina.pedir('Page.captureScreenshot');fs.writeFileSync('/tmp/adapta-filtros-fallo.png',Buffer.from(captura.data,'base64'));throw error;
                }
                assert.ok(iguales(await colorVisible(40,40),esperado),'Marco '+marco+': filtro aplicado una sola vez');
                await evaluarEn(pagina,id,"chrome.storage.local.set({daltonismo:'ninguno'})");
                await esperar(async()=>iguales(await colorVisible(40,40),[255,0,0]),'Retirar filtro funciona dentro del juego');
                await evaluarEn(pagina,id,"chrome.storage.local.set({daltonismo:'protanopia'})");
                await esperar(async()=>iguales(await colorVisible(40,40),esperado),'Cambiar filtro sin salir de pantalla completa');
                await pagina.pedir('Runtime.evaluate',{expression:'document.exitFullscreen()',awaitPromise:true});
            }
            const marcos=(await trabajadorFiltros.pedir('Runtime.evaluate',{expression:`chrome.tabs.query({url:'http://127.0.0.1:${puerto}/tests/filtros-juegos.html'}).then(p=>chrome.scripting.executeScript({target:{tabId:p[0].id,allFrames:true},func:()=>({marco:window!==top,controlador:Boolean(globalThis.adaptaPEControlador),filtros:Boolean(globalThis.adaptaPEFiltrosMarco),raiz:getComputedStyle(document.documentElement).filter})}))`,awaitPromise:true,returnByValue:true})).result.value;
            if(id===completa.id) for(const dato of marcos.filter(d=>d.result.marco)) { assert.equal(dato.result.controlador,false);assert.equal(dato.result.filtros,true); }
            await evaluarEn(pagina,id,"chrome.storage.local.set({daltonismo:'ninguno'})");
        }
        trabajadorFiltros.socket.close();
        if(carpetaCapturas) {
            await evaluarEn(pagina,completa.id,"chrome.storage.local.set({daltonismo:'acromatopsia'})");
            await esperar(async()=>{const color=await colorVisible(40,120);return Math.max(...color)-Math.min(...color)<3;},'Captura con filtro en gris');
            const captura=await pagina.pedir('Page.captureScreenshot');fs.writeFileSync(path.join(carpetaCapturas,'juegos-filtro.png'),Buffer.from(captura.data,'base64'));
            await evaluarEn(pagina,completa.id,"chrome.storage.local.set({daltonismo:'ninguno'})");
        }
        console.log('✓ Base/Lite: colores reales en Canvas, WebGL, vídeo y pantalla completa de marcos de ambos orígenes, sin doble filtro');

    } finally {
        pagina?.socket.close(); navegador?.socket.close();
        if (chrome && chrome.exitCode == null) { const fin = new Promise(resolver => chrome.once('exit', resolver)); chrome.kill('SIGTERM'); await fin; }
        servidor.close(); fs.rmSync(perfil, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
