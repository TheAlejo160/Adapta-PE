// Estado visible también en Nueva pestaña y páginas protegidas de Chrome.
const ayudaVoz = document.getElementById('hintVoz');
const indicadorVoz = document.createElement('p');
indicadorVoz.id = 'adapta-pe-voz-global-estado';
indicadorVoz.setAttribute('role', 'status');
ayudaVoz?.appendChild(indicadorVoz);
const configurarMicrofono = document.createElement('button');
configurarMicrofono.type = 'button';
configurarMicrofono.textContent = 'Configurar micrófono';
configurarMicrofono.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('voz/permisos.html') }));
ayudaVoz?.appendChild(configurarMicrofono);
function actualizarEstadoVoz() {
    chrome.runtime.sendMessage({ accion: 'voz_estado' }, respuesta => {
        if (!chrome.runtime.lastError) indicadorVoz.textContent = respuesta?.texto || 'Activa Voz para escuchar en todo Chrome.';
    });
}
actualizarEstadoVoz();
const refrescoVoz = setInterval(actualizarEstadoVoz, 1000);
window.addEventListener('pagehide', () => clearInterval(refrescoVoz));
