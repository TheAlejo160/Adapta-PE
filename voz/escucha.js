// Un reconocedor por extensión, independiente de pestañas, ventanas y barra de Chrome.
const vozCentral = new VoiceAssistant(null, texto => {
    chrome.runtime.sendMessage({ accion: 'voz_comando', texto }).catch(() => {});
});
vozCentral.actualizarVisibilidad(true);
vozCentral.alEstado = texto => chrome.runtime.sendMessage({ accion: 'voz_publicar_estado', texto }).catch(() => {});
let solicitud = 0;
async function configurarVoz(activa) {
    const actual = ++solicitud;
    if (!activa) { vozCentral.setEstado(false); return; }
    const permiso = await navigator.permissions.query({ name: 'microphone' });
    if (actual !== solicitud) return;
    if (permiso.state !== 'granted') {
        vozCentral.setEstado(false);
        vozCentral.mostrarEstado('Permite el micrófono de Adapta PE para usar voz en todo Chrome.');
        await chrome.runtime.sendMessage({ accion: 'voz_necesita_permiso' });
        return;
    }
    if (vozCentral.bloqueado) vozCentral.setEstado(false);
    vozCentral.setEstado(true);
}
chrome.runtime.onMessage.addListener((peticion, emisor, responder) => {
    if (emisor.id !== chrome.runtime.id || peticion.destino !== 'voz_central') return;
    if (peticion.accion === 'voz_configurar') {
        configurarVoz(Boolean(peticion.activa)).then(() => responder({ ok: true })).catch(() => responder({ ok: false }));
        return true;
    }
    if (peticion.accion === 'voz_fallback' && typeof peticion.texto === 'string') {
        const comando = normalizarVoz(peticion.texto);
        if (/^(?:escrib\w*|dict\w*|enfoc\w*|borra\w*|limpia\w*|clic|click|haz clic|hazle|dale|pulsa|presiona|seleccion\w*|resalta\w*|enter|intro|baja\w*|sube|subir|scroll|desplaza\w*|desliza|reproduc\w*|pausa\w*|control|cursor|calibrar|recalibrar)\b/.test(comando)) {
            vozCentral.mostrarEstado('En Chrome usa abre, busca o comandos de pestañas/ventanas. Dictado, clic y desplazamiento necesitan una página web.');
            responder({ ok: false }); return;
        }
        vozCentral.ejecutarComando(peticion.texto);
        responder({ ok: true });
    }
    if (peticion.accion === 'voz_consultar') responder({ ok: true, texto: vozCentral.ui?.textContent || 'Voz desactivada' });
});
window.addEventListener('pagehide', () => vozCentral.detener());
