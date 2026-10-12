(() => {
    if (globalThis.adaptaPEControlador?.vigente()) return;
    globalThis.adaptaPEControlador?.destruir();
    const runtimeOriginal = chrome.runtime;
    const idRecuperacion = 'adapta-pe-reconectar-' + runtimeOriginal.id;
    // El mundo aislado anterior puede sobrevivir a una actualización; retirar sus recursos.
    document.dispatchEvent(new Event(idRecuperacion));
    // Liberar motores anteriores a este arranque sin recargar la página.
    try { if (typeof kineticEngine !== 'undefined') kineticEngine.setEstado(false); } catch (_) {}
    try { if (typeof talkBack !== 'undefined') talkBack.setEstado(false); } catch (_) {}
    try { if (typeof voiceAssistant !== 'undefined') voiceAssistant.setEstado(false); } catch (_) {}
    let prioridad = false, destruido = false;
    const voiceAssistantNuevo = new globalThis.VoiceAssistant(accion => motorCinetico.ejecutarAccion(accion));
    const filtros = new globalThis.FiltrosDaltonismo();
    const motorCinetico = new globalThis.KineticEngine();
    motorCinetico.actualizarVisibilidad(false);
    const lector = new globalThis.TalkBack();
    const mascota = new globalThis.Mascota();
    const idIndicador = 'adapta-pe-voz-indicador-' + runtimeOriginal.id;
    let textoVoz = 'Voz activa · di Computadora';
    let indicador;
    function mostrarIndicador() {
        if (destruido || !voiceAssistantNuevo.permitidoPorUsuario || document.hidden) { indicador?.remove(); return; }
        if (!indicador) {
            indicador = document.createElement('div'); indicador.id = idIndicador;
            indicador.setAttribute('role', 'status');
            indicador.style.cssText = 'position:fixed;bottom:20px;left:20px;max-width:80vw;padding:10px 20px;background:#8b1420;color:white;border-radius:20px;font:14px sans-serif;z-index:999999;pointer-events:none';
        }
        if (!indicador.isConnected) document.body?.append(indicador);
        if (indicador.textContent !== textoVoz) indicador.textContent = textoVoz;
    }
    function recuperarInterfaz() {
        if (destruido || !document.body) return;
        observarInterfaz.disconnect();
        for (const nodo of [document.documentElement, document.head, document.body]) if (nodo) observarInterfaz.observe(nodo, { childList: true });
        if (mascota.visible && mascota.host && !mascota.host.isConnected) { document.body.append(mascota.host); mascota.colocar(); }
        if (motorCinetico.activa) for (const nodo of [motorCinetico.burbuja, motorCinetico.punteroVirtual, motorCinetico.aviso]) if (nodo && !nodo.isConnected) document.body.append(nodo);
        filtros.aplicar(filtros.filtroActual);
        mostrarIndicador();
    }
    const observarInterfaz = new MutationObserver(recuperarInterfaz);
    voiceAssistantNuevo.alEstado = texto => { mascota.estadoVoz(texto); chrome.runtime.sendMessage({ accion: 'voz_resultado', texto }).catch(() => {}); };
    async function revisarPreferencias() {
        const res = await chrome.storage.local.get(['voz', 'daltonismo', 'ojos', 'talkback', 'ajustesCineticos', 'mascota', 'posicionMascota']);
        if (destruido) return;
        voiceAssistantNuevo.permitidoPorUsuario = Boolean(res.voz);
        filtros.aplicar(res.daltonismo || 'ninguno');
        mascota.configurar(res.mascota, res.posicionMascota);
        mascota.actualizarVisibilidad(!document.hidden);
        mascota.actualizarPrioridad(prioridad);
        motorCinetico.aplicarAjustes(res.ajustesCineticos);
        motorCinetico.setEstado(Boolean(res.ojos));
        lector.setEstado(Boolean(res.talkback) && prioridad && !document.hidden);
        mostrarIndicador();
    }
    function actualizarVisibilidad() {
        mascota.actualizarVisibilidad(!document.hidden);
        mascota.actualizarPrioridad(prioridad);
        motorCinetico.actualizarVisibilidad(prioridad && !document.hidden);
        if (!prioridad || document.hidden) lector.setEstado(false);
        mostrarIndicador();
    }
    function alMensaje(peticion, emisor, responder) {
        if (destruido || emisor.id !== runtimeOriginal.id) return;
        if (peticion.accion === 'pagina_comprobar') { responder({ ok: true }); return; }
        if (peticion.accion === 'mascota_estado') { mascota.reaccionar(peticion.estado, peticion.hablando); return; }
        if (peticion.accion === 'control_prioridad') {
            prioridad = Boolean(peticion.activa);
            actualizarVisibilidad();
            revisarPreferencias().then(() => responder({ ok: true })).catch(() => responder({ ok: false }));
            return true;
        }
        if (peticion.accion === 'camara_fotograma' && prioridad && !document.hidden) { motorCinetico.recibirFotograma(peticion.datos); return; }
        if (peticion.accion === 'camara_vista' && prioridad && !document.hidden) { motorCinetico.recibirVista(peticion.vista); return; }
        if (peticion.accion === 'camara_error' && prioridad) { motorCinetico.mostrarError(String(peticion.texto)); return; }
        if (peticion.accion === 'voz_ejecutar') {
            if (typeof peticion.texto !== 'string' || peticion.texto.length > 4000) return;
            const comando = normalizarVoz(peticion.texto).replace(/[.!?]+$/, '');
            const ajustesSinPostura = { 'calibrar cursor': 'calibrar', recalibrar: 'calibrar', 'centrar cursor': 'calibrar',
                'postura comoda': 'calibrar', 'acomodar postura': 'calibrar', 'reanudar cursor': 'reanudar', 'continuar cursor': 'reanudar',
                'movimientos pequenos': 'movimiento_reducido', 'movilidad reducida': 'movimiento_reducido', 'movimientos normales': 'movimiento_normal' };
            if (motorCinetico.activa && motorCinetico.modoControl !== 'cabeza' && ajustesSinPostura[comando]) {
                motorCinetico.ejecutarAccion(ajustesSinPostura[comando]);
                const aviso = comando === 'reanudar cursor' || comando === 'continuar cursor' ? 'Cursor reanudado. Centro fijo, sin calibración.' : 'Centro fijo para gestos. Sólo cabeza y torso calibran postura.';
                voiceAssistantNuevo.mostrarEstado(aviso);
                voiceAssistantNuevo.enviar({ accion: 'hablar', texto: aviso });
                responder({ ok: true }); return;
            }
            let texto = peticion.texto;
            if (/^control (zona (izquierda|derecha)|mano parcial)$/.test(comando)) texto = 'control muñón';
            if (/^control (brazos|extremidades|punos)$/.test(comando)) texto = 'control manos';
            if (/^(da|dale|hazle) (clic|click)$/.test(comando)) texto = voiceAssistantNuevo.elementoSeleccionado ? 'dale clic' : 'clic';
            voiceAssistantNuevo.ejecutarComando(texto); responder({ ok: true }); return;
        }
        if (peticion.accion === 'voz_indicador') {
            if (peticion.activa) mascota.estadoVoz(String(peticion.texto || ''));
            voiceAssistantNuevo.permitidoPorUsuario = Boolean(peticion.activa);
            textoVoz = String(peticion.texto || 'Voz activa · di Computadora');
            mostrarIndicador(); return;
        }
        if (peticion.accion === 'actualizar_estado') revisarPreferencias().catch(() => {});
    }
    function alCambiar(cambios, area) {
        if (area === 'local') revisarPreferencias().catch(() => {});
    }
    function registrar() {
        chrome.runtime.sendMessage({ accion: 'pagina_lista' }).catch(() => {});
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
        document.removeEventListener('visibilitychange', actualizarVisibilidad);
        document.removeEventListener(idRecuperacion, destruir);
        window.removeEventListener('pagehide', alOcultar); window.removeEventListener('pageshow', registrar);
        try { runtimeOriginal.onMessage.removeListener(alMensaje); chrome.storage.onChanged.removeListener(alCambiar); } catch (_) {}
    }
    globalThis.adaptaPEControlador = { voz: voiceAssistantNuevo, filtros, mascota, cinetico: motorCinetico, talkback: lector,
        vigente() { try { return !destruido && Boolean(runtimeOriginal.getManifest()); } catch (_) { return false; } }, destruir };
    document.documentElement.setAttribute('data-adapta-extension', 'true');
    runtimeOriginal.onMessage.addListener(alMensaje); chrome.storage.onChanged.addListener(alCambiar);
    document.addEventListener('visibilitychange', actualizarVisibilidad);
    document.addEventListener(idRecuperacion, destruir);
    window.addEventListener('pagehide', alOcultar); window.addEventListener('pageshow', registrar);
    recuperarInterfaz(); revisarPreferencias().catch(() => {}); registrar();
    chrome.runtime.sendMessage({ accion: 'voz_estado' }).then(estado => {
        if (!destruido && estado?.ok) { textoVoz = estado.texto; mostrarIndicador(); }
    }).catch(() => {});
})();
