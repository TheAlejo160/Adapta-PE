const botonPermiso = document.getElementById('adapta-pe-permitir-microfono');
const estadoPermiso = document.getElementById('adapta-pe-permiso-estado');
const permisoCamara = new URLSearchParams(location.search).get('dispositivo') === 'camara';
if (permisoCamara) {
    document.title = 'Permiso de cámara de AdaptaPE';
    document.querySelector('h1').textContent = 'Permitir la cámara';
    document.getElementById('adapta-pe-icono-permiso').setAttribute('href', '../iconos.svg#camara');
    document.getElementById('adapta-pe-instruccion-permiso').textContent = 'AdaptaPE necesita tu permiso para mover el cursor con la cámara. Cuando Chrome lo solicite, elige «Permitir». Después volverás a la página anterior.';
    document.getElementById('adapta-pe-privacidad-permiso').textContent = 'La imagen se procesa en tu equipo. El cursor controla sólo la pestaña de la ventana enfocada.';
    botonPermiso.textContent = 'Permitir cámara';
    estadoPermiso.textContent = 'Puedes apagar la cámara diciendo Computadora, desactivar cursor.';
    if (!chrome.runtime.getManifest().content_scripts.some(regla => regla.js.some(archivo => archivo.endsWith('/KineticEngine.js')))) {
        botonPermiso.disabled = true;
        estadoPermiso.textContent = 'La cámara está disponible en AdaptaPE Base. Lite incluye voz y filtros de color.';
    }
}
botonPermiso.focus();
botonPermiso.addEventListener('click', async () => {
    botonPermiso.disabled = true;
    const textoBoton = botonPermiso.textContent;
    botonPermiso.textContent = 'Esperando permiso…';
    botonPermiso.setAttribute('aria-busy', 'true');
    estadoPermiso.textContent = 'Elige «Permitir» en el aviso de Chrome para autorizar ' + (permisoCamara ? 'la cámara.' : 'el micrófono.');
    try {
        const flujo = await navigator.mediaDevices.getUserMedia({ audio: !permisoCamara, video: permisoCamara });
        flujo.getTracks().forEach(pista => pista.stop());
        const respuesta = await chrome.runtime.sendMessage({ accion: 'voz_reiniciar' });
        if (!respuesta?.ok) throw new Error('No se pudo activar la voz.');
        if (permisoCamara) {
            estadoPermiso.textContent = 'Cámara autorizada. Volviendo a tu página…';
            await chrome.runtime.sendMessage({ accion: 'camara_permiso_listo' }); return;
        }
        estadoPermiso.textContent = respuesta.activa ? 'Micrófono autorizado. Puedes cerrar esta pestaña y decir «Computadora» para dar una orden.' : 'Micrófono autorizado. Activa Control por voz en el panel de AdaptaPE para empezar.';
    } catch (error) {
        estadoPermiso.textContent = error.name === 'NotAllowedError'
            ? 'Permiso denegado. Permite ' + (permisoCamara ? 'la cámara' : 'el micrófono') + ' en los ajustes de Chrome y vuelve a intentar.'
            : 'No se pudo iniciar ' + (permisoCamara ? 'la cámara' : 'el micrófono') + '. Comprueba el dispositivo y vuelve a intentar.';
    } finally {
        botonPermiso.disabled = false;
        botonPermiso.textContent = textoBoton;
        botonPermiso.removeAttribute('aria-busy');
    }
});
