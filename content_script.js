(() => {
    if (globalThis.adaptaPEControlador?.vigente()) return;
    globalThis.adaptaPEControlador?.destruir();
    const runtimeOriginal = chrome.runtime;
    const idRecuperacion = 'adapta-pe-reconectar-' + runtimeOriginal.id;
    const marcaInstalacion = 'data-adapta-extension-' + runtimeOriginal.id;
    const urlEscucha = runtimeOriginal.getURL('voz/escucha.html');
    // El mundo aislado anterior puede sobrevivir a una actualización; retirar sus recursos.
    document.dispatchEvent(new Event(idRecuperacion));
    // Liberar motores anteriores a este arranque sin recargar la página.
    try { if (typeof kineticEngine !== 'undefined') kineticEngine.setEstado(false); } catch (_) {}
    try { if (typeof talkBack !== 'undefined') talkBack.setEstado(false); } catch (_) {}
    try { if (typeof voiceAssistant !== 'undefined') voiceAssistant.setEstado(false); } catch (_) {}
    let prioridad = false, destruido = false, revisionPreferencias = 0, lecturaPermitida = false;
    const voiceAssistantNuevo = new globalThis.VoiceAssistant(accion => motorCinetico.ejecutarAccion(accion));
    const filtros = new globalThis.FiltrosDaltonismo();
    const motorCinetico = new globalThis.KineticEngine();
    motorCinetico.actualizarVisibilidad(false);
    const lector = new globalThis.TalkBack();
    const mascota = new globalThis.Mascota();
    const idIndicador = 'adapta-pe-voz-indicador-' + runtimeOriginal.id;
    const textos = {
        es: { 'pagina.vozActiva': 'Voz activa · di Computadora', 'pagina.reanudado': 'Cursor reanudado. Centro fijo, sin calibración.',
            'pagina.centroFijo': 'Centro fijo para gestos. Sólo cabeza y torso calibran postura.' },
        en: { 'pagina.vozActiva': 'Voice on · say Computer', 'pagina.reanudado': 'Cursor resumed. Fixed center, no calibration.',
            'pagina.centroFijo': 'Fixed center for gestures. Only head and torso calibrate posture.' },
        pt: { 'pagina.vozActiva': 'Voz ativa · diga Computador', 'pagina.reanudado': 'Cursor retomado. Centro fixo, sem calibração.',
            'pagina.centroFijo': 'Centro fixo para gestos. Só cabeça e tronco calibram a postura.' },
        de: { 'pagina.vozActiva': 'Sprache aktiv · sage Computer', 'pagina.reanudado': 'Cursor fortgesetzt. Feste Mitte, keine Kalibrierung.',
            'pagina.centroFijo': 'Feste Mitte für Gesten. Nur Kopf und Oberkörper kalibrieren die Haltung.' },
        fr: { 'pagina.vozActiva': 'Voix active · dites Ordinateur', 'pagina.reanudado': 'Curseur repris. Centre fixe, sans calibrage.',
            'pagina.centroFijo': 'Centre fixe pour les gestes. Seuls la tête et le torse calibrent la posture.' },
        it: { 'pagina.vozActiva': 'Voce attiva · di’ Computer', 'pagina.reanudado': 'Cursore ripreso. Centro fisso, senza calibrazione.',
            'pagina.centroFijo': 'Centro fisso per i gesti. Solo testa e busto calibrano la postura.' },
    };
    globalThis.TextosAdapta?.definir(textos);
    const t = clave => globalThis.TextosAdapta?.t(clave) ?? textos.es[clave];
    let textoVoz = null; // null: texto predeterminado en el idioma actual.
    let langTTS; // undefined: el worker usa es-ES.
    let indicador;
    function mostrarIndicador() {
        if (destruido || !voiceAssistantNuevo.permitidoPorUsuario || document.hidden) { indicador?.remove(); return; }
        if (!indicador) {
            indicador = document.createElement('div'); indicador.id = idIndicador;
            indicador.setAttribute('role', 'status');
            indicador.style.cssText = 'position:fixed;bottom:20px;left:20px;max-width:80vw;padding:10px 20px;background:#8b1420;color:white;border-radius:20px;font:14px sans-serif;z-index:999999;pointer-events:none';
        }
        if (!indicador.isConnected) document.body?.append(indicador);
        const texto = textoVoz ?? t('pagina.vozActiva');
        if (indicador.textContent !== texto) indicador.textContent = texto;
    }
    function vigente() { try { return !destruido && Boolean(runtimeOriginal.id && runtimeOriginal.getManifest()); } catch (_) { return false; } }
    // Extensión desactivada o desinstalada: Chrome no retira el script; limpiar sin recargar.
    function revisarVigencia() { if (!destruido && !vigente()) destruir(); return !destruido; }
    function recuperarInterfaz() {
        if (!revisarVigencia() || !document.body) return;
        observarInterfaz.disconnect();
        for (const nodo of [document.documentElement, document.head, document.body]) if (nodo) observarInterfaz.observe(nodo, { childList: true });
        if (mascota.visible && mascota.host && !mascota.host.isConnected) { document.body.append(mascota.host); mascota.colocar(); }
        if (motorCinetico.activa) for (const nodo of [motorCinetico.burbuja, motorCinetico.punteroVirtual, motorCinetico.aviso]) if (nodo && !nodo.isConnected) document.body.append(nodo);
        filtros.aplicar(filtros.filtroActual);
        mostrarIndicador();
    }
    const observarInterfaz = new MutationObserver(recuperarInterfaz);
    voiceAssistantNuevo.alEstado = (texto, tipo) => { mascota.estadoVoz(texto, tipo); chrome.runtime.sendMessage({ accion: 'voz_resultado', texto, tipo }).catch(() => {}); };
    const clavesPreferencias = ['voz', 'daltonismo', 'ojos', 'talkback', 'ajustesCineticos', 'mascota', 'posicionMascota', 'idiomaVoz'];
    // Un solo ajuste (`idiomaVoz`, «auto» por defecto) fija voz e interfaz; los módulos se retraducen sin recargar.
    function aplicarIdioma(valor) {
        const codigo = globalThis.CodigosVoz?.includes(valor) ? valor : globalThis.detectarIdiomaVoz?.([...navigator.languages, navigator.language, chrome.i18n?.getUILanguage?.()]) ?? 'es-PE';
        langTTS = motorCinetico.langTTS = lector.langTTS = codigo.startsWith('es') ? undefined : codigo;
        if (!globalThis.TextosAdapta) return;
        const anterior = globalThis.TextosAdapta.idioma;
        if (globalThis.TextosAdapta.fijarIdioma(codigo) !== anterior) {
            textoVoz = null;
            mascota.actualizarTextos(); motorCinetico.actualizarTextos();
        }
    }
    async function revisarPreferencias() {
        const revision = ++revisionPreferencias;
        const res = await chrome.storage.local.get(clavesPreferencias);
        if (destruido || revision !== revisionPreferencias) return;
        aplicarIdioma(res.idiomaVoz);
        voiceAssistantNuevo.permitidoPorUsuario = Boolean(res.voz);
        filtros.aplicar(res.daltonismo || 'ninguno');
        mascota.configurar(res.mascota, res.posicionMascota);
        mascota.actualizarVisibilidad(!document.hidden);
        mascota.actualizarPrioridad(prioridad);
        motorCinetico.aplicarAjustes(res.ajustesCineticos);
        motorCinetico.setEstado(Boolean(res.ojos));
        lecturaPermitida = Boolean(res.talkback);
        lector.setEstado(lecturaPermitida && prioridad && !document.hidden);
        mostrarIndicador();
    }
    function actualizarVisibilidad() {
        if (!destruido && !revisarVigencia()) return;
        mascota.actualizarVisibilidad(!document.hidden);
        mascota.actualizarPrioridad(prioridad);
        motorCinetico.actualizarVisibilidad(prioridad && !document.hidden);
        lector.setEstado(lecturaPermitida && prioridad && !document.hidden);
        mostrarIndicador();
    }
    function alMensaje(peticion, emisor, responder) {
        if (destruido || emisor.id !== runtimeOriginal.id) return;
        // En la Nueva pestaña propia (página de extensión) también llegan los runtime.sendMessage de
        // pestañas y del documento offscreen; sólo valen los envíos dirigidos del worker o del popup.
        if (emisor.tab || emisor.url === urlEscucha) return;
        if (peticion.accion === 'mascota_estado') { mascota.reaccionar(peticion.estado, peticion.hablando); return; }
        if (peticion.accion === 'control_prioridad') {
            prioridad = Boolean(peticion.activa);
            actualizarVisibilidad();
            if (!prioridad) { responder({ ok: true }); return; }
            revisarPreferencias().then(() => responder({ ok: true })).catch(() => responder({ ok: false }));
            return true;
        }
        if (peticion.accion === 'camara_fotograma' && prioridad && !document.hidden) {
            // Zona llega empaquetada en base64 desde voz/camara.js; KineticEngine sigue recibiendo un Array de grises.
            const datos = peticion.datos;
            if (typeof datos?.grises === 'string') datos.grises = Array.from(atob(datos.grises), letra => letra.charCodeAt(0));
            motorCinetico.recibirFotograma(datos); return;
        }
        if (peticion.accion === 'camara_vista' && prioridad && !document.hidden) { motorCinetico.recibirVista(peticion.vista); return; }
        if (peticion.accion === 'camara_error' && prioridad) {
            const clave = /^cinetico\.error\.\w+$/.test(peticion.clave) ? peticion.clave : undefined;
            motorCinetico.mostrarError(clave ? globalThis.TextosAdapta?.t(clave) ?? String(peticion.texto) : String(peticion.texto), clave); return;
        }
        if (peticion.accion === 'voz_ejecutar') {
            if (typeof peticion.texto !== 'string' || peticion.texto.length > 4000) return;
            const comando = normalizarVoz(peticion.texto).replace(/[.!?]+$/, '');
            const ajustesSinPostura = { 'calibrar cursor': 'calibrar', recalibrar: 'calibrar', 'centrar cursor': 'calibrar',
                'postura comoda': 'calibrar', 'acomodar postura': 'calibrar', 'reanudar cursor': 'reanudar', 'continuar cursor': 'reanudar',
                'movimientos pequenos': 'movimiento_reducido', 'movilidad reducida': 'movimiento_reducido', 'movimientos normales': 'movimiento_normal' };
            if (motorCinetico.activa && motorCinetico.modoControl !== 'cabeza' && ajustesSinPostura[comando]) {
                motorCinetico.ejecutarAccion(ajustesSinPostura[comando]);
                const aviso = t(comando === 'reanudar cursor' || comando === 'continuar cursor' ? 'pagina.reanudado' : 'pagina.centroFijo');
                voiceAssistantNuevo.mostrarEstado(aviso);
                voiceAssistantNuevo.enviar({ accion: 'hablar', texto: aviso, lang: langTTS });
                responder({ ok: true }); return;
            }
            let texto = peticion.texto;
            if (/^control (zona (izquierda|derecha)|mano parcial)$/.test(comando)) texto = 'control muñón';
            if (/^control (brazos|extremidades|punos)$/.test(comando)) texto = 'control manos';
            if (/^(da|dale|hazle) (clic|click)$/.test(comando)) texto = voiceAssistantNuevo.elementoSeleccionado ? 'dale clic' : 'clic';
            voiceAssistantNuevo.ejecutarComando(texto); responder({ ok: true }); return;
        }
        if (peticion.accion === 'voz_indicador') {
            if (peticion.activa) mascota.estadoVoz(String(peticion.texto || ''), peticion.tipo);
            voiceAssistantNuevo.permitidoPorUsuario = Boolean(peticion.activa);
            textoVoz = peticion.texto ? String(peticion.texto) : null;
            mostrarIndicador(); return;
        }
        if (peticion.accion === 'actualizar_estado') revisarPreferencias().catch(() => {});
    }
    function alCambiar(cambios, area) {
        // Otras claves no cambian la página: evitar relecturas en cada pestaña.
        if (area === 'local' && clavesPreferencias.some(clave => clave in cambios)) revisarPreferencias().catch(() => {});
    }
    function registrar() {
        chrome.runtime.sendMessage({ accion: 'pagina_lista' }).catch(() => {});
    }
    function consultarVoz() {
        chrome.runtime.sendMessage({ accion: 'voz_estado' }).then(estado => {
            if (!destruido && estado?.ok) { textoVoz = estado.texto; mostrarIndicador(); }
        }).catch(() => {});
    }
    // bfcache, pestañas congeladas y prerender pueden perder avisos de storage: releer sin recargar.
    function reanudar(evento) {
        if (!revisarVigencia()) return;
        if (evento.type !== 'pageshow' || evento.persisted) { revisarPreferencias().catch(() => {}); consultarVoz(); }
        registrar();
    }
    function alOcultar() { prioridad = false; actualizarVisibilidad(); }
    function destruir() {
        if (destruido) return;
        destruido = true; prioridad = false; actualizarVisibilidad();
        observarInterfaz.disconnect();
        voiceAssistantNuevo.limpiarSeleccion(); filtros.limpiar();
        motorCinetico.setEstado(false); lector.destruir();
        mascota.destruir();
        document.getElementById(idIndicador)?.remove();
        document.documentElement.removeAttribute(marcaInstalacion);
        if (!document.documentElement.getAttributeNames().some(nombre => nombre.startsWith('data-adapta-extension-'))) {
            document.documentElement.removeAttribute('data-adapta-extension');
        }
        document.removeEventListener('visibilitychange', actualizarVisibilidad);
        document.removeEventListener(idRecuperacion, destruir);
        window.removeEventListener('pagehide', alOcultar); window.removeEventListener('pageshow', reanudar);
        document.removeEventListener('resume', reanudar); document.removeEventListener('prerenderingchange', reanudar);
        try { runtimeOriginal.onMessage.removeListener(alMensaje); chrome.storage.onChanged.removeListener(alCambiar); } catch (_) {}
    }
    globalThis.adaptaPEControlador = { voz: voiceAssistantNuevo, filtros, mascota, cinetico: motorCinetico, talkback: lector,
        vigente, destruir };
    // Sólo la web oficial recibe esta marca para mostrar su aviso y evitar duplicar la demo.
    if (location.protocol === 'https:' && ['adaptape.cc', 'www.adaptape.cc', 'adaptape.thealejo-dev.cc'].includes(location.hostname)) {
        document.documentElement.setAttribute(marcaInstalacion, 'true');
        document.documentElement.setAttribute('data-adapta-extension', 'true');
    }
    runtimeOriginal.onMessage.addListener(alMensaje); chrome.storage.onChanged.addListener(alCambiar);
    document.addEventListener('visibilitychange', actualizarVisibilidad);
    document.addEventListener(idRecuperacion, destruir);
    window.addEventListener('pagehide', alOcultar); window.addEventListener('pageshow', reanudar);
    document.addEventListener('resume', reanudar); document.addEventListener('prerenderingchange', reanudar);
    recuperarInterfaz(); revisarPreferencias().catch(() => {}); registrar(); consultarVoz();
})();
