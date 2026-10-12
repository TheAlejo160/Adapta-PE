// Estado visible también en Nueva pestaña y páginas protegidas de Chrome.
const ayudaVoz = document.getElementById('hintVoz');
const indicadorVoz = document.getElementById('estadoVoz');
indicadorVoz.setAttribute('role', 'status');
indicadorVoz.textContent = 'Consultando el estado del micrófono…';
const configurarMicrofono = document.createElement('button');
configurarMicrofono.type = 'button';
configurarMicrofono.textContent = 'Configurar micrófono';
configurarMicrofono.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('voz/permisos.html') }).catch(() => {
    indicadorVoz.textContent = 'No se abrió la configuración. Vuelve a pulsar Configurar micrófono.';
}));
ayudaVoz?.querySelector('details').appendChild(configurarMicrofono);
function actualizarEstadoVoz() {
    chrome.runtime.sendMessage({ accion: 'voz_estado' }, respuesta => {
        const texto = chrome.runtime.lastError
            ? 'No se pudo consultar el micrófono. Cierra y vuelve a abrir el panel.'
            : respuesta?.texto || 'Activa Control por voz para escuchar tus órdenes.';
        if (indicadorVoz.textContent !== texto) indicadorVoz.textContent = texto;
    });
}
actualizarEstadoVoz();
const refrescoVoz = setInterval(actualizarEstadoVoz, 1000);
window.addEventListener('pagehide', () => clearInterval(refrescoVoz));
