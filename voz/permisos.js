const botonPermiso = document.getElementById('adapta-pe-permitir-microfono');
const estadoPermiso = document.getElementById('adapta-pe-permiso-estado');
const permisoCamara = new URLSearchParams(location.search).get('dispositivo') === 'camara';
const dispositivo = permisoCamara ? 'Camara' : 'Micro'; // Sufijo de las claves permisos.*Micro / *Camara.
if (permisoCamara) {
    ponerTexto(document.querySelector('title'), 'permisos.tituloCamara');
    ponerTexto(document.querySelector('h1'), 'permisos.encabezadoCamara');
    document.getElementById('adapta-pe-icono-permiso').setAttribute('href', '../iconos.svg#camara');
    ponerTexto(document.getElementById('adapta-pe-instruccion-permiso'), 'permisos.instruccionCamara');
    ponerTexto(document.getElementById('adapta-pe-privacidad-permiso'), 'permisos.privacidadCamara');
    ponerTexto(botonPermiso, 'permisos.botonCamara');
    ponerTexto(estadoPermiso, 'permisos.estadoCamara');
    if (!chrome.runtime.getManifest().content_scripts.some(regla => regla.js.some(archivo => archivo.endsWith('/KineticEngine.js')))) {
        botonPermiso.disabled = true;
        ponerTexto(estadoPermiso, 'permisos.soloBase');
    }
}
botonPermiso.focus();
botonPermiso.addEventListener('click', async () => {
    botonPermiso.disabled = true;
    const claveBoton = botonPermiso.dataset.i18n;
    ponerTexto(botonPermiso, 'permisos.esperando');
    botonPermiso.setAttribute('aria-busy', 'true');
    ponerTexto(estadoPermiso, 'permisos.elige' + dispositivo);
    try {
        const flujo = await navigator.mediaDevices.getUserMedia({ audio: !permisoCamara, video: permisoCamara });
        flujo.getTracks().forEach(pista => pista.stop());
        const respuesta = await chrome.runtime.sendMessage({ accion: 'voz_reiniciar' });
        if (!respuesta?.ok) throw new Error('No se pudo activar la voz.');
        if (permisoCamara) {
            ponerTexto(estadoPermiso, 'permisos.camaraLista');
            await chrome.runtime.sendMessage({ accion: 'camara_permiso_listo' }); return;
        }
        ponerTexto(estadoPermiso, respuesta.activa ? 'permisos.microActivo' : 'permisos.microInactivo');
    } catch (error) {
        ponerTexto(estadoPermiso, (error.name === 'NotAllowedError' ? 'permisos.denegado' : 'permisos.fallo') + dispositivo);
    } finally {
        botonPermiso.disabled = false;
        ponerTexto(botonPermiso, claveBoton);
        botonPermiso.removeAttribute('aria-busy');
    }
});
