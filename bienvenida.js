// Primera ejecución: activar ayudas con un gesto del usuario; los permisos los pide el flujo existente.
const estadoBienvenida = document.getElementById('adapta-pe-bienvenida-estado');
const interruptores = [...document.querySelectorAll('input[data-clave]')];
function mostrarInterruptor(control) {
    ponerTexto(document.getElementById('estado' + control.dataset.clave[0].toUpperCase() + control.dataset.clave.slice(1)),
        control.checked ? 'popup.activado' : 'popup.desactivado');
}
chrome.storage.local.get(interruptores.map(control => control.dataset.clave)).then(res => {
    for (const control of interruptores) { control.checked = Boolean(res[control.dataset.clave]); mostrarInterruptor(control); }
    ponerTexto(estadoBienvenida, 'popup.guardadoAuto');
}).catch(() => {
    for (const control of interruptores) control.disabled = true;
    ponerTexto(estadoBienvenida, 'bienvenida.noCargo');
});
for (const control of interruptores) control.addEventListener('change', async () => {
    mostrarInterruptor(control);
    try {
        await chrome.storage.local.set({ [control.dataset.clave]: control.checked });
        ponerTexto(estadoBienvenida, control.checked ? 'bienvenida.activadoPermiso' : 'bienvenida.desactivado');
    } catch (_) {
        ponerTexto(estadoBienvenida, 'bienvenida.noGuardo');
    }
});
chrome.storage.onChanged.addListener((cambios, area) => {
    if (area !== 'local') return;
    for (const control of interruptores) if (cambios[control.dataset.clave]) {
        control.checked = Boolean(cambios[control.dataset.clave].newValue); mostrarInterruptor(control);
    }
});
