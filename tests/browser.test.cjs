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
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'adapta-navegador-'));
const servidor = http.createServer((peticion, respuesta) => {
    const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
    const archivo = path.resolve(raiz, '.' + ruta);
    if (!archivo.startsWith(raiz + path.sep) || !/^\/(tests|vision|classes)\//.test(ruta) && ruta !== '/sitios.js') {
        respuesta.writeHead(403); respuesta.end(); return;
    }
    const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.jpg': 'image/jpeg' };
    fs.readFile(archivo, (error, contenido) => {
        respuesta.writeHead(error ? 404 : 200, { 'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream' });
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
    socket.addEventListener('message', evento => {
        const datos = JSON.parse(evento.data);
        if (datos.id) { pendientes.get(datos.id)?.(datos); pendientes.delete(datos.id); }
        else if (datos.method === 'Runtime.executionContextCreated') contextos.set(datos.params.context.id, datos.params.context);
        else if (datos.method === 'Runtime.executionContextDestroyed') contextos.delete(datos.params.executionContextId);
        else if (datos.method === 'Runtime.executionContextsCleared') contextos.clear();
        else if (datos.method === 'Runtime.exceptionThrown') errores.push(datos.params.exceptionDetails);
    });
    return { socket, contextos, errores, pedir: (metodo, parametros = {}) => new Promise((resolver, rechazar) => {
        const id = ++indice;
        const limite = setTimeout(() => { pendientes.delete(id); rechazar(new Error('CDP no respondió: ' + metodo)); }, 15000);
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
            const resultado=await conexion.pedir('Runtime.evaluate',{expression:`chrome.tts.stop();
                globalThis.avisosPrueba=[];
                const emitirPrueba=texto=>globalThis.avisosPrueba.push(texto);
                chrome.tts.speak=emitirPrueba;chrome.tts.stop=()=>{};
                chrome.tts.speak===emitirPrueba`,returnByValue:true});
            assert.equal(resultado.result?.value,true,'TTS simulado sólo en el perfil de pruebas');
            conexion.socket.close();
        }
        const destinosIniciales = await (await fetch('http://127.0.0.1:' + puertoChrome + '/json')).json();
        pagina = await conectar(destinosIniciales.find(destino => destino.type === 'page').webSocketDebuggerUrl);
        await pagina.pedir('Runtime.enable');
        await pagina.pedir('Page.navigate', { url: `http://127.0.0.1:${puerto}/tests/pagina-global.html` });
        await esperar(async()=> (await pagina.pedir('Runtime.evaluate',{expression:"document.readyState==='complete'",returnByValue:true})).result?.value,'Página previa cargada');
        const origenPrevio=(await pagina.pedir('Runtime.evaluate',{expression:'performance.timeOrigin',returnByValue:true})).result.value;
        const completa = await navegador.pedir('Extensions.loadUnpacked', { path: raiz });
        const ligera = await navegador.pedir('Extensions.loadUnpacked', { path: path.resolve(raiz, '../extensiónLite') });
        assert.ok(completa.id && ligera.id);
        await silenciarPruebas(completa.id);await silenciarPruebas(ligera.id);
        console.log('✓ Ambos manifests cargan en Chrome');
        const contextoDe=(conexion,id)=>[...conexion.contextos.values()].findLast(contexto=>contexto.origin==='chrome-extension://'+id&&contexto.auxData?.isDefault===false);
        const evaluarEn=(conexion,id,expression)=>conexion.pedir('Runtime.evaluate',{expression,contextId:contextoDe(conexion,id)?.id,returnByValue:true,awaitPromise:true});
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
        await pagina.pedir('Page.navigate', { url: `http://127.0.0.1:${puerto}/tests/vision-local.html?rostro=/tests/fixtures/rostro.jpg&cuerpo=/tests/fixtures/cuerpo.jpg&manos=/tests/fixtures/manos.jpg` });
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
        await central.pedir('Runtime.evaluate',{expression:'camaraCentral.capturar=camaraCentral.capturarOriginal;camaraCentral.capturar(camaraCentral.generacion)'});
        const flujoInicial=(await central.pedir('Runtime.evaluate',{expression:'camaraCentral.flujo.id',returnByValue:true})).result.value;
        for (const comando of ['activar temblor', 'movimientos pequeños', 'control manos']) {
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
        const restaurado = (await evaluarCinetico('({activo:adaptaPEControlador.cinetico.activa,modo:adaptaPEControlador.cinetico.modoControl,temblor:adaptaPEControlador.cinetico.zonaMuerta,amplitud:adaptaPEControlador.cinetico.amplitudControl,botones:adaptaPEControlador.cinetico.burbuja.querySelectorAll("button").length})')).result.value;
        assert.deepEqual(restaurado, { activo: true, modo: 'manos', temblor: 0.07, amplitud: 0.55, botones: 0 });
        const otroFondoDestino=(await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).find(destino=>destino.type==='service_worker'&&destino.url.includes(ligera.id));
        const fondoLite=await conectar(otroFondoDestino.webSocketDebuggerUrl);
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
        await esperar(async()=>contextoDe(segundaPagina,completa.id)&&(await evaluarEn(segundaPagina,completa.id,'adaptaPEControlador.cinetico.activa && adaptaPEControlador.cinetico.numeroFotograma>0')).result?.value,'Cursor en nueva ventana sin recargar');
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
        await esperar(async()=>(await evaluarCinetico('adaptaPEControlador.cinetico.activa && adaptaPEControlador.cinetico.numeroFotograma>0')).result?.value,'Regreso al cursor sin recargar');
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
            await silenciarPruebas(id);
            try { await esperar(async()=>{
                const contexto=contextoDe(pagina,id);if(!contexto) return false;
                try {return (await evaluarEn(pagina,id,'Boolean(globalThis.adaptaPEControlador?.vigente()) && !adaptaPEControlador.marcaPrueba')).result?.value;} catch(error) {if(!/context/.test(error.message))throw error;return false;}
            },'Extensión actualizada recupera página sin recargarla'); } catch(error) {
                console.error('Recarga',id,'contextos',JSON.stringify([...pagina.contextos.values()]),'errores',JSON.stringify(pagina.errores));
                console.error('Estado controlador',JSON.stringify(await evaluarEn(pagina,id,'({marca:globalThis.adaptaPEControlador?.marcaPrueba,vigente:globalThis.adaptaPEControlador?.vigente(),runtime:chrome.runtime.id})')));
                console.error('Destinos',JSON.stringify((await (await fetch('http://127.0.0.1:'+puertoChrome+'/json')).json()).map(d=>({id:d.id,url:d.url,type:d.type}))));throw error;
            }
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

    } finally {
        pagina?.socket.close(); navegador?.socket.close();
        if (chrome && chrome.exitCode == null) { const fin = new Promise(resolver => chrome.once('exit', resolver)); chrome.kill('SIGTERM'); await fin; }
        servidor.close(); fs.rmSync(perfil, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
