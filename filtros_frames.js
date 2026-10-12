(() => {
    if (globalThis.adaptaPEFiltrosMarco?.vigente()) return;
    globalThis.adaptaPEFiltrosMarco?.destruir();
    const runtimeOriginal = chrome.runtime;
    const idRecuperacion = 'adapta-pe-filtros-marco-' + runtimeOriginal.id;
    document.dispatchEvent(new Event(idRecuperacion));
    // Chrome no incluye marcos de otro origen en el filtro de la raíz del padre.
    const filtros = window === window.top ? null : new globalThis.FiltrosDaltonismo(location.ancestorOrigins[0] === window.origin);
    const marcos = new Set();
    let destruido = false, revision = 0;
    function anunciarPantalla() {
        if (!document.fullscreenElement) {
            for (const marco of marcos) marco.removeAttribute('data-adapta-pe-filtro-interno');
            marcos.clear();
        }
        if (window !== window.top) window.parent.postMessage({ tipo: 'adapta-pe-filtro-pantalla', activa: !destruido && Boolean(document.fullscreenElement) }, '*');
    }
    function alMensaje(evento) {
        if (!destruido && evento.source === window.parent && evento.data?.tipo === 'adapta-pe-filtro-consultar') { anunciarPantalla(); return; }
        if (destruido || evento.data?.tipo !== 'adapta-pe-filtro-pantalla' || typeof evento.data.activa !== 'boolean') return;
        for (const marco of document.querySelectorAll('iframe')) if (marco.contentWindow === evento.source) {
            marco.toggleAttribute('data-adapta-pe-filtro-interno', evento.data.activa);
            if (evento.data.activa) marcos.add(marco); else marcos.delete(marco);
            break;
        }
    }
    function vigente() { try { return !destruido && Boolean(runtimeOriginal.id && runtimeOriginal.getManifest()); } catch (_) { return false; } }
    // Extensión desactivada o desinstalada: retirar el filtro sin recargar la página.
    function revisarVigencia() { if (!destruido && !vigente()) destruir(); }
    function recuperar() {
        revisarVigencia();
        if (destruido) return;
        observador.disconnect();
        for (const nodo of [document.documentElement, document.head]) if (nodo) observador.observe(nodo, { childList: true });
        filtros?.aplicar(filtros.filtroActual);
    }
    const observador = new MutationObserver(recuperar);
    function alCambiar(cambios, area) {
        if (destruido || area !== 'local' || !cambios.daltonismo) return;
        revision++;
        filtros?.aplicar(cambios.daltonismo.newValue || 'ninguno');
    }
    function destruir() {
        if (destruido) return;
        destruido = true;
        observador.disconnect(); filtros?.limpiar();
        anunciarPantalla();
        for (const marco of marcos) marco.removeAttribute('data-adapta-pe-filtro-interno');
        document.removeEventListener('fullscreenchange', anunciarPantalla);
        document.removeEventListener('visibilitychange', revisarVigencia);
        window.removeEventListener('message', alMensaje);
        document.removeEventListener(idRecuperacion, destruir);
        try { chrome.storage.onChanged.removeListener(alCambiar); } catch (_) {}
    }
    globalThis.adaptaPEFiltrosMarco = { filtros, destruir, vigente };
    document.addEventListener(idRecuperacion, destruir);
    document.addEventListener('fullscreenchange', anunciarPantalla);
    window.addEventListener('message', alMensaje);
    anunciarPantalla();
    for (const marco of document.querySelectorAll('iframe')) marco.contentWindow?.postMessage({ tipo: 'adapta-pe-filtro-consultar' }, '*');
    if (!filtros) return;
    chrome.storage.onChanged.addListener(alCambiar);
    document.addEventListener('visibilitychange', revisarVigencia);
    recuperar();
    chrome.storage.local.get('daltonismo').then(datos => {
        if (!destruido && revision === 0) filtros.aplicar(datos.daltonismo || 'ninguno');
    }).catch(() => {});
})();
