document.addEventListener('DOMContentLoaded', () => {
    const checkTalkBack = document.getElementById("checkTalkBack");
    const checkVoz = document.getElementById("checkVoz");
    const selectDaltonismo = document.getElementById("selectDaltonismo");
    const checkOjos = document.getElementById("checkOjos");
    const hintGestos = document.getElementById("hintGestos");
    const hintVoz = document.getElementById("hintVoz");

    // 1. Cargar el estado actual desde Storage al abrir el popup
    chrome.storage.local.get(["talkback", "voz", "daltonismo", "ojos"], (res) => {
        checkTalkBack.checked = res.talkback || false;
        checkVoz.checked = res.voz || false;
        selectDaltonismo.value = res.daltonismo || "ninguno";
        checkOjos.checked = res.ojos || false;
        actualizarUI();
    });

    // 2. Controlar la visibilidad de las cajas de ayuda (hints)
    function actualizarUI() {
        hintGestos.style.display = checkOjos.checked ? "block" : "none";
        hintVoz.style.display = checkVoz.checked ? "block" : "none";
    }

    // 3. Guardar cambios y forzar actualización híbrida (Storage + Mensaje Directo)
    async function guardarCambios() {
        actualizarUI();

        // Paso A: Guardar en Storage (Para que pestañas suspendidas o futuras lo lean)
        await chrome.storage.local.set({
            talkback: checkTalkBack.checked,
            voz: checkVoz.checked,
            daltonismo: selectDaltonismo.value,
            ojos: checkOjos.checked
        });

        // Paso B: Forzar renderizado instantáneo en todas las pestañas abiertas
        let tabs = await chrome.tabs.query({});
        for (let tab of tabs) {
            if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
                chrome.tabs.sendMessage(tab.id, { accion: "actualizar_estado" }).catch(() => {
                    // Se ignora el catch silenciosamente si la pestaña está suspendida
                });
            }
        }
    }

    // 4. Asignar los eventos ('change' es nativo y seguro para el estado final del Select)
    checkTalkBack.addEventListener("change", guardarCambios);
    checkVoz.addEventListener("change", guardarCambios);
    selectDaltonismo.addEventListener("change", guardarCambios);
    checkOjos.addEventListener("change", guardarCambios);
});