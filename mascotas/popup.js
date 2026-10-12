document.addEventListener('DOMContentLoaded', async () => {
    const selector = document.getElementById('selectMascota');
    const estado = document.getElementById('estadoMascota');
    function mostrar(nombre) {
        selector.value = ['tinku', 'cuchu', 'yati'].includes(nombre) ? nombre : 'ninguna';
        ponerTexto(estado, selector.selectedOptions[0].dataset.i18n);
    }
    try { mostrar((await chrome.storage.local.get('mascota')).mascota); selector.disabled = false; }
    catch (_) { ponerTexto(estado, 'popup.mascotaNoCargo'); }
    chrome.storage.onChanged.addListener((cambios, area) => {
        if (area === 'local' && cambios.mascota) mostrar(cambios.mascota.newValue);
    });
    selector.addEventListener('change', async () => {
        ponerTexto(estado, 'popup.guardandoMascota');
        try { await chrome.storage.local.set({ mascota: selector.value }); mostrar(selector.value); }
        catch (_) { ponerTexto(estado, 'popup.mascotaNoGuardo'); }
    });
});
