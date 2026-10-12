document.addEventListener('DOMContentLoaded', async () => {
    const selector = document.getElementById('selectMascota');
    const estado = document.getElementById('estadoMascota');
    function mostrar(nombre) {
        selector.value = ['tinku', 'cuchu', 'yati'].includes(nombre) ? nombre : 'ninguna';
        estado.textContent = selector.value === 'ninguna' ? 'Sin mascota' : selector.selectedOptions[0].textContent;
    }
    try { mostrar((await chrome.storage.local.get('mascota')).mascota); selector.disabled = false; }
    catch (_) { estado.textContent = 'No se cargó el ajuste. Cierra y vuelve a abrir el panel.'; }
    chrome.storage.onChanged.addListener((cambios, area) => {
        if (area === 'local' && cambios.mascota) mostrar(cambios.mascota.newValue);
    });
    selector.addEventListener('change', async () => {
        estado.textContent = 'Guardando mascota…';
        try { await chrome.storage.local.set({ mascota: selector.value }); mostrar(selector.value); }
        catch (_) { estado.textContent = 'No se guardó. Selecciona la mascota de nuevo.'; }
    });
});
