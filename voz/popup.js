// Estado visible también en Nueva pestaña y páginas protegidas de Chrome.
const ayudaVoz = document.getElementById('hintVoz');
const indicadorVoz = document.getElementById('estadoVoz');
indicadorVoz.setAttribute('role', 'status');
ponerTexto(indicadorVoz, 'popup.consultandoMicro');
const configurarMicrofono = document.createElement('button');
configurarMicrofono.type = 'button';
ponerTexto(configurarMicrofono, 'popup.configurarMicro');
configurarMicrofono.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('voz/permisos.html') }).catch(() => {
    ponerTexto(indicadorVoz, 'popup.configNoAbrio');
}));
ayudaVoz?.querySelector('details').appendChild(configurarMicrofono);
function actualizarEstadoVoz() {
    chrome.runtime.sendMessage({ accion: 'voz_estado' }, respuesta => {
        if (chrome.runtime.lastError) return ponerTexto(indicadorVoz, 'popup.microNoConsulta');
        if (!respuesta?.texto) return ponerTexto(indicadorVoz, 'popup.activaVoz');
        // El worker ya envía el texto en el idioma elegido: no es una clave.
        delete indicadorVoz.dataset.i18n;
        if (indicadorVoz.textContent !== respuesta.texto) indicadorVoz.textContent = respuesta.texto;
    });
}
actualizarEstadoVoz();
const refrescoVoz = setInterval(actualizarEstadoVoz, 1000);
window.addEventListener('pagehide', () => clearInterval(refrescoVoz));
