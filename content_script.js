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
    const idIndicador = 'adapta-pe-voz-indicador-' + runtimeOriginal.id;
    voiceAssistantNuevo.alEstado = texto => chrome.runtime.sendMessage({ accion: 'voz_resultado', texto }).catch(() => {});
    async function revisarPreferencias() {
        const res = await chrome.storage.local.get(['voz', 'daltonismo', 'ojos', 'talkback', 'ajustesCineticos']);
        if (destruido) return;
        voiceAssistantNuevo.permitidoPorUsuario = Boolean(res.voz);
        filtros.aplicar(res.daltonismo || 'ninguno');
        motorCinetico.aplicarAjustes(res.ajustesCineticos);
        motorCinetico.setEstado(Boolean(res.ojos));
        lector.setEstado(Boolean(res.talkback) && prioridad && !document.hidden);
        if (!res.voz) document.getElementById(idIndicador)?.remove();
    }
    function actualizarVisibilidad() {
        motorCinetico.actualizarVisibilidad(prioridad && !document.hidden);
        if (!prioridad || document.hidden) lector.setEstado(false);
    }
    function alMensaje(peticion, emisor, responder) {
        if (destruido || emisor.id !== runtimeOriginal.id) return;
        if (peticion.accion === 'pagina_comprobar') { responder({ ok: true }); return; }
        if (peticion.accion === 'control_prioridad') {
            prioridad = Boolean(peticion.activa);
            if (!prioridad) document.getElementById(idIndicador)?.remove();
            actualizarVisibilidad();
            revisarPreferencias().then(() => responder({ ok: true })).catch(() => responder({ ok: false }));
            return true;
        }
        if (peticion.accion === 'camara_fotograma' && prioridad && !document.hidden) { motorCinetico.recibirFotograma(peticion.datos); return; }
        if (peticion.accion === 'camara_vista' && prioridad && !document.hidden) { motorCinetico.recibirVista(peticion.vista); return; }
        if (peticion.accion === 'camara_error' && prioridad) { motorCinetico.mostrarError(String(peticion.texto)); return; }
        if (peticion.accion === 'voz_ejecutar') {
            if (typeof peticion.texto !== 'string' || peticion.texto.length > 4000) return;
            voiceAssistantNuevo.ejecutarComando(peticion.texto); responder({ ok: true }); return;
        }
        if (peticion.accion === 'voz_indicador') {
            let indicador = document.getElementById(idIndicador);
            if (!peticion.activa || !prioridad) { indicador?.remove(); return; }
            if (!indicador) {
                indicador = document.createElement('div'); indicador.id = idIndicador;
                indicador.setAttribute('role', 'status');
                indicador.style.cssText = 'position:fixed;bottom:20px;left:20px;max-width:80vw;padding:10px 20px;background:#8b1420;color:white;border-radius:20px;font:14px sans-serif;z-index:999999;pointer-events:none';
                document.body.appendChild(indicador);
            }
            indicador.textContent = String(peticion.texto || 'Voz activa · di Computadora'); return;
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
        voiceAssistantNuevo.limpiarSeleccion(); filtros.limpiar();
        motorCinetico.setEstado(false); lector.destruir();
        document.getElementById(idIndicador)?.remove();
        document.removeEventListener('visibilitychange', actualizarVisibilidad);
        document.removeEventListener(idRecuperacion, destruir);
        window.removeEventListener('pagehide', alOcultar); window.removeEventListener('pageshow', registrar);
        try { runtimeOriginal.onMessage.removeListener(alMensaje); chrome.storage.onChanged.removeListener(alCambiar); } catch (_) {}
    }
    globalThis.adaptaPEControlador = { voz: voiceAssistantNuevo, filtros, cinetico: motorCinetico, talkback: lector,
        vigente() { try { return !destruido && Boolean(runtimeOriginal.getManifest()); } catch (_) { return false; } }, destruir };
    document.documentElement.setAttribute('data-adapta-extension', 'true');
    runtimeOriginal.onMessage.addListener(alMensaje); chrome.storage.onChanged.addListener(alCambiar);
    document.addEventListener('visibilitychange', actualizarVisibilidad);
    document.addEventListener(idRecuperacion, destruir);
    window.addEventListener('pagehide', alOcultar); window.addEventListener('pageshow', registrar);
    revisarPreferencias().catch(() => {}); registrar();
})();
