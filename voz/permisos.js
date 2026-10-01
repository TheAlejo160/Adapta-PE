const botonPermiso = document.getElementById('adapta-pe-permitir-microfono');
const estadoPermiso = document.getElementById('adapta-pe-permiso-estado');
const permisoCamara = new URLSearchParams(location.search).get('dispositivo') === 'camara';
if (permisoCamara) {
    document.title = 'Permiso de cámara — Adapta PE';
    document.querySelector('h1').textContent = 'Mouse cinético en tus páginas y ventanas';
    document.querySelector('h1 + p').textContent = 'Permite una vez la cámara de Adapta PE. La imagen se procesa en tu equipo y el cursor controla únicamente la pestaña de la ventana enfocada. Al conceder el permiso volverás a la página anterior.';
    botonPermiso.textContent = 'Permitir cámara';
    estadoPermiso.textContent = 'Puedes apagar la cámara diciendo Computadora, desactivar cursor.';
    if (!chrome.runtime.getManifest().content_scripts.some(regla => regla.js.some(archivo => archivo.endsWith('/KineticEngine.js')))) botonPermiso.disabled = true;
}
botonPermiso.focus();
botonPermiso.addEventListener('click', async () => {
    botonPermiso.disabled = true;
    try {
        const flujo = await navigator.mediaDevices.getUserMedia({ audio: !permisoCamara, video: permisoCamara });
        flujo.getTracks().forEach(pista => pista.stop());
        const respuesta = await chrome.runtime.sendMessage({ accion: 'voz_reiniciar' });
        if (!respuesta?.ok) throw new Error('No se pudo activar la voz.');
        if (permisoCamara) {
            estadoPermiso.textContent = 'Cámara autorizada. Volviendo a tu página…';
            await chrome.runtime.sendMessage({ accion: 'camara_permiso_listo' }); return;
        }
        estadoPermiso.textContent = respuesta.activa ? 'Permiso concedido. Puedes cerrar esta pestaña y usar Computadora desde Nueva pestaña o cualquier ventana.' : 'Permiso concedido. Activa Voz en el popup para empezar a escuchar.';
    } catch (_) {
        estadoPermiso.textContent = 'No se concedió ' + (permisoCamara ? 'la cámara' : 'el micrófono') + '. Revisa su permiso en los ajustes de Chrome y vuelve a intentar.';
    } finally { botonPermiso.disabled = false; }
});
