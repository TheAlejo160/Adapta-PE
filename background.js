importScripts('sitios.js');

// Serializar creación/cierre evita dos documentos o una escucha que reaparece al apagar.
let transicionVoz = Promise.resolve();
let ultimaVentanaVoz = null;
let estadoVoz = 'Voz desactivada';
const admiteCinetico = chrome.runtime.getManifest().content_scripts.some(regla => regla.js.some(archivo => archivo.endsWith('/KineticEngine.js')));
const conexiones = new Map();
let transicionPaginas = Promise.resolve(), revisionPaginas = 0, conectarTodas = false;
let pestanaConControl = null;
let retornoCamara = null;
function paginaPermitida(pestana) { return /^(https?|file):/.test(pestana?.url || ''); }

function asegurarControlador(pestana) {
    if (!paginaPermitida(pestana)) return Promise.resolve(null);
    if (conexiones.has(pestana.id)) return conexiones.get(pestana.id);
    const conexion = (async () => {
        try {
            const [estado] = await chrome.scripting.executeScript({ target: { tabId: pestana.id, frameIds: [0] }, injectImmediately: true,
                func: () => document.body ? Boolean(globalThis.adaptaPEControlador?.vigente()) : null });
            if (!estado || estado.result === null) return null;
            if (!estado.result) await chrome.scripting.executeScript({ target: { tabId: pestana.id, documentIds: [estado.documentId] }, injectImmediately: true,
                files: chrome.runtime.getManifest().content_scripts[0].js });
            return { id: pestana.id, documentId: estado.documentId };
        } catch (_) { return null; } // Chrome protege sus páginas y la tienda de extensiones.
    })().finally(() => conexiones.delete(pestana.id));
    conexiones.set(pestana.id, conexion); return conexion;
}

function sincronizarPaginas(todas = false) {
    conectarTodas ||= todas;
    const revision = ++revisionPaginas;
    pestanaConControl = null; // Cortar el envío de movimientos al cambiar de destino.
    transicionPaginas = transicionPaginas.catch(() => {}).then(async () => {
        if (revision !== revisionPaginas) return;
        const pestanas = await chrome.tabs.query({});
        if (conectarTodas) {
            conectarTodas = false;
            await Promise.all(pestanas.filter(paginaPermitida).map(asegurarControlador));
        }
        const ventana = await chrome.windows.getLastFocused();
        const actual = ventana.focused ? await pestanaActual() : null;
        const destino = actual ? await asegurarControlador(actual) : null;
        if (revision !== revisionPaginas) return;
        // Desactivar antes de activar; conservar la referencia si el destino no cambió.
        await Promise.all(pestanas.filter(pestana => paginaPermitida(pestana) && pestana.id !== destino?.id).map(pestana => chrome.tabs.sendMessage(pestana.id,
            { accion: 'control_prioridad', activa: false }, { frameId: 0 }).catch(() => {})));
        if (revision !== revisionPaginas) return;
        if (destino) {
            const respuesta = await chrome.tabs.sendMessage(destino.id, { accion: 'control_prioridad', activa: true },
                { documentId: destino.documentId }).catch(() => null);
            if (respuesta?.ok && revision === revisionPaginas) pestanaConControl = destino;
        }
        await sincronizarVoz();
        await publicarEstadoVoz();
    });
    return transicionPaginas;
}
async function pestanaActual() {
    const pestanas = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return pestanas[0];
}
function sincronizarVoz(reintentar = false) {
    transicionVoz = transicionVoz.catch(() => {}).then(async () => {
        const preferencias = await chrome.storage.local.get(['voz', 'ojos', 'ajustesCineticos']);
        const camara = admiteCinetico && Boolean(preferencias.ojos);
        const existentes = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('voz/escucha.html')] });
        if (!preferencias.voz && !camara) {
            if (existentes.length) await chrome.offscreen.closeDocument();
            estadoVoz = 'Voz desactivada';
            await publicarEstadoVoz(false);
            return;
        }
        if (!existentes.length) await chrome.offscreen.createDocument({ url: 'voz/escucha.html',
            reasons: ['USER_MEDIA'], justification: 'Mantener una sola cámara y un solo micrófono de accesibilidad al navegar y cambiar de ventana.' });
        await chrome.runtime.sendMessage({ destino: 'voz_central', accion: 'voz_configurar', activa: Boolean(preferencias.voz) });
        if (!preferencias.voz) estadoVoz = 'Voz desactivada';
        if (admiteCinetico) await chrome.runtime.sendMessage({ destino: 'voz_central', accion: 'camara_configurar', activa: camara,
            procesar: Boolean(pestanaConControl), modo: preferencias.ajustesCineticos?.modo || 'automatico', reintentar });
    });
    return transicionVoz;
}
async function publicarEstadoVoz(activa) {
    if (activa == null) activa = Boolean((await chrome.storage.local.get('voz')).voz);
    const pestana = await pestanaActual();
    if (pestana?.id != null) await chrome.tabs.sendMessage(pestana.id, {
        accion: 'voz_indicador', texto: estadoVoz, activa
    }).catch(() => {});
}
async function gestionarVoz(peticion, emisor) {
    const central = emisor.url === chrome.runtime.getURL('voz/escucha.html');
    if (peticion.accion === 'voz_estado') {
        return { ok: true, texto: estadoVoz, activa: Boolean((await chrome.storage.local.get('voz')).voz) };
    }
    if (peticion.accion === 'voz_reiniciar') {
        await sincronizarVoz(true);
        const preferencias = await chrome.storage.local.get(['voz', 'ojos']);
        return { ok: true, activa: Boolean(preferencias.voz), camaraActiva: admiteCinetico && Boolean(preferencias.ojos) };
    }
    if (peticion.accion === 'voz_resultado' && emisor.tab) {
        estadoVoz = String(peticion.texto || '').slice(0, 500);
        await publicarEstadoVoz(); return { ok: true };
    }
    if (!central) throw new Error('Emisor de voz no permitido');
    if (peticion.accion === 'voz_publicar_estado') {
        estadoVoz = String(peticion.texto || '').slice(0, 500);
        await publicarEstadoVoz(); return { ok: true };
    }
    if (peticion.accion === 'voz_necesita_permiso') {
        const url = chrome.runtime.getURL('voz/permisos.html');
        const existentes = await chrome.tabs.query({ url });
        if (!existentes.length) await chrome.tabs.create({ url });
        return { ok: true };
    }
    if (peticion.accion === 'voz_comando') {
        if (!(await chrome.storage.local.get('voz')).voz) return { ok: false };
        if (typeof peticion.texto !== 'string' || peticion.texto.length > 4000) throw new Error('Comando inválido');
        const pestana = await pestanaActual();
        if (!pestana?.id) throw new Error('Sin pestaña activa');
        // Fijar el destino al recibir la frase; no reenviar el mismo comando a una ventana nueva.
        ultimaVentanaVoz = pestana;
        const comando = normalizarVoz(peticion.texto);
        if (admiteCinetico && /^(activar|desactivar) (?:mouse cinetico|cursor)$/.test(comando)) {
            await chrome.storage.local.set({ ojos: comando.startsWith('activar') }); return { ok: true };
        }
        if (/^(https?|file):/.test(pestana.url || '')) {
            try {
                const destino = await asegurarControlador(pestana);
                if (!destino) throw new Error('Página protegida');
                const respuesta = await chrome.tabs.sendMessage(pestana.id, { accion: 'voz_ejecutar', texto: peticion.texto }, { documentId: destino.documentId });
                if (respuesta?.ok) return { ok: true };
            } catch (_) {}
        }
        await chrome.runtime.sendMessage({ destino: 'voz_central', accion: 'voz_fallback', texto: peticion.texto });
        return { ok: true };
    }
    throw new Error('Acción de voz inválida');
}
chrome.runtime.onMessage.addListener((peticion, emisor, responder) => {
    if (!peticion || peticion.destino === 'voz_central') return;
    if (emisor.id !== chrome.runtime.id) return;
    if (peticion.accion === 'pagina_lista') {
        if (emisor.tab && (emisor.frameId ?? 0) === 0) sincronizarPaginas().catch(() => {});
        responder({ ok: true }); return;
    }
    if (peticion.accion === 'camara_modo' && admiteCinetico && emisor.tab?.id === pestanaConControl?.id) {
        chrome.runtime.sendMessage({ destino: 'voz_central', accion: 'camara_modelo', modo: peticion.modo, fuente: peticion.fuente }).catch(() => {});
        return;
    }
    if (peticion.accion === 'camara_fotograma' || peticion.accion === 'camara_error' || peticion.accion === 'camara_vista') {
        if (!admiteCinetico || emisor.url !== chrome.runtime.getURL('voz/escucha.html')) return;
        const destino = pestanaConControl;
        if (peticion.accion === 'camara_vista') {
            if (!destino) { responder({ ok: false }); return; }
            chrome.tabs.sendMessage(destino.id, peticion, { documentId: destino.documentId })
                .then(() => responder({ ok: true }), () => responder({ ok: false }));
            return true;
        }
        if (destino) chrome.tabs.sendMessage(destino.id, peticion, { documentId: destino.documentId }).catch(() => {});
        return;
    }
    if (peticion.accion === 'camara_necesita_permiso' && admiteCinetico && emisor.url === chrome.runtime.getURL('voz/escucha.html')) {
        const url = chrome.runtime.getURL('voz/permisos.html') + '?dispositivo=camara';
        (async () => {
            const existentes = await chrome.tabs.query({ url });
            if (!existentes.length) { retornoCamara = await pestanaActual(); await chrome.tabs.create({ url }); }
            responder({ ok: true });
        })().catch(() => responder({ ok: false })); return true;
    }
    if (peticion.accion === 'camara_permiso_listo' && admiteCinetico && emisor.tab && emisor.url === chrome.runtime.getURL('voz/permisos.html') + '?dispositivo=camara') {
        (async () => {
            const actual = await pestanaActual();
            const retorno = retornoCamara; retornoCamara = null;
            if (actual?.id === emisor.tab.id && retorno?.id != null) await chrome.tabs.update(retorno.id, { active: true }).catch(() => {});
            await chrome.tabs.remove(emisor.tab.id);
            responder({ ok: true });
        })().catch(() => responder({ ok: false })); return true;
    }
    if (peticion.accion?.startsWith('voz_')) {
        gestionarVoz(peticion, emisor).then(responder).catch(() => responder({ ok: false }));
        return true;
    }
    const acciones = ['hablar', 'callar', 'abrir_url', 'buscar_inteligente', 'cerrar_pestana',
        'cerrar_ventana', 'crear_pestana', 'crear_ventana', 'recargar', 'atras', 'adelante', 'cambiar_pestana', 'zoom'];
    if (!acciones.includes(peticion.accion)) return;
    (async () => {
        const pestana = emisor.tab || (emisor.url === chrome.runtime.getURL('voz/escucha.html') ? ultimaVentanaVoz || await pestanaActual() : null);
        await ejecutarAccion(peticion, pestana);
        responder({ ok: true });
    })().catch(() => responder({ ok: false, error: 'No se pudo realizar la acción en esta página.' }));
    return true;
});
chrome.storage.onChanged.addListener((cambios, area) => {
    if (area === 'local' && (cambios.voz || cambios.ojos)) sincronizarVoz().catch(() => {});
    if (area === 'local' && ['voz', 'ojos', 'talkback', 'daltonismo', 'ajustesCineticos'].some(clave => cambios[clave])) sincronizarPaginas(true).catch(() => {});
});
chrome.runtime.onStartup.addListener(() => sincronizarPaginas(true).catch(() => {}));
chrome.runtime.onInstalled.addListener(() => sincronizarPaginas(true).catch(() => {}));
chrome.tabs.onActivated.addListener(() => sincronizarPaginas().catch(() => {}));
chrome.tabs.onUpdated.addListener((_, cambios) => { if (cambios.status === 'complete') sincronizarPaginas().catch(() => {}); });
chrome.windows.onFocusChanged.addListener(() => sincronizarPaginas().catch(() => {}));
chrome.windows.onRemoved.addListener(() => sincronizarPaginas().catch(() => {}));
// Recuperar también al reiniciarse el worker o recargar la extensión sin cambiar versión.
sincronizarPaginas(true).catch(() => {});

async function ejecutarAccion(peticion, pestana) {
    const accion = peticion.accion;
    if (accion === 'hablar') {
        if (!chrome.tts || typeof peticion.texto !== 'string') return;
        chrome.tts.stop();
        chrome.tts.speak(peticion.texto, { lang: 'es-ES', rate: 1.05 });
        return;
    }
    if (accion === 'callar') { chrome.tts?.stop(); return; }
    if (accion === 'crear_pestana') return chrome.tabs.create({});
    if (accion === 'crear_ventana') return chrome.windows.create({});
    if (accion === 'abrir_url') return gestionarAperturaURL(peticion.url, peticion.destino, pestana);
    if (accion === 'buscar_inteligente') {
        if (typeof peticion.query !== 'string' || typeof peticion.sitio !== 'string') throw new Error('Petición inválida');
        const clave = reconocerSitio(peticion.sitio) || 'google';
        const sitio = SitiosVoz[clave];
        const consulta = peticion.query.trim();
        let url = sitio.inicio;
        if (consulta) {
            if (sitio.busqueda) {
                url = sitio.busqueda + encodeURIComponent(clave === 'mercadolibre' ? consulta.replace(/\s+/g, '-') : consulta);
            } else {
                // No inventar rutas privadas ni descartar la consulta: búsqueda pública por dominio.
                url = SitiosVoz.google.busqueda + encodeURIComponent(`${consulta} site:${new URL(sitio.inicio).hostname}`);
            }
        }
        return gestionarAperturaURL(url, peticion.destino, pestana);
    }
    if (pestana?.id == null) throw new Error('Pestaña no disponible');
    if (accion === 'cerrar_pestana') return chrome.tabs.remove(pestana.id);
    if (accion === 'cerrar_ventana') return chrome.windows.remove(pestana.windowId);
    if (accion === 'recargar') return chrome.tabs.reload(pestana.id);
    if (accion === 'atras') return chrome.tabs.goBack(pestana.id);
    if (accion === 'adelante') return chrome.tabs.goForward(pestana.id);
    if (accion === 'cambiar_pestana') {
        const pestanas = (await chrome.tabs.query({ windowId: pestana.windowId })).sort((a, b) => a.index - b.index);
        if (!pestanas.length) return;
        const indice = pestanas.findIndex(actual => actual.id === pestana.id);
        const paso = peticion.direccion === -1 ? -1 : 1;
        return chrome.tabs.update(pestanas[(indice + paso + pestanas.length) % pestanas.length].id, { active: true });
    }
    if (accion === 'zoom') {
        const actual = await chrome.tabs.getZoom(pestana.id);
        const nuevo = peticion.direccion === 0 ? 1 : actual + (peticion.direccion === -1 ? -0.1 : 0.1);
        return chrome.tabs.setZoom(pestana.id, Math.max(0.25, Math.min(5, Math.round(nuevo * 100) / 100)));
    }
}

async function gestionarAperturaURL(url, destino, pestana) {
    const direccion = new URL(url);
    if (!['https:', 'http:'].includes(direccion.protocol)) throw new Error('Dirección no permitida');
    if (destino === 'ventana') {
        let opciones = { url: direccion.href };
        if (chrome.system?.display) {
            // El callback funciona también en las versiones antiguas de Chromium admitidas.
            const pantallas = await new Promise(resolver => chrome.system.display.getInfo(datos => {
                resolver(chrome.runtime.lastError ? [] : datos || []);
            }));
            const secundaria = pantallas.find(pantalla => !pantalla.isPrimary);
            if (secundaria) opciones = { ...opciones, left: secundaria.workArea.left, top: secundaria.workArea.top, state: 'maximized' };
        }
        return chrome.windows.create(opciones);
    }
    if (destino === 'pestana') return chrome.tabs.create({ url: direccion.href });
    if (pestana?.id != null) return chrome.tabs.update(pestana.id, { url: direccion.href });
    throw new Error('Pestaña no disponible');
}
