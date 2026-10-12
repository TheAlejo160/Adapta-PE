document.addEventListener('DOMContentLoaded', () => {
    const checkTalkBack = document.getElementById("checkTalkBack");
    const checkVoz = document.getElementById("checkVoz");
    const selectDaltonismo = document.getElementById("selectDaltonismo");
    const checkOjos = document.getElementById("checkOjos");
    const hintGestos = document.getElementById("hintGestos");
    const modoControl = document.getElementById("adapta-pe-modo-control");
    const estadoPanel = document.getElementById("estadoPanel");
    function mostrarEstadoPanel(texto, error = false) {
        estadoPanel.textContent = texto;
        estadoPanel.dataset.error = String(error);
    }
    function actualizarModo(ajustes = {}) {
        if (!ajustes || typeof ajustes !== "object") ajustes = {};
        const anterior = typeof ajustes.modo === "string" ? ajustes.modo : "cabeza";
        const modo = anterior.startsWith("zona") ? "zona" : ["automatico", "brazo_izquierdo", "brazo_derecho"].includes(anterior) ? "manos" : anterior === "manos" ? "manos" : "cabeza";
        modoControl.value = modo;
        if (anterior !== modo) chrome.storage.local.set({ ajustesCineticos: { ...ajustes, modo } }).catch(() => {});
    }

    // 1. Cargar el estado actual desde Storage al abrir el popup
    chrome.storage.local.get(["talkback", "voz", "daltonismo", "ojos", "ajustesCineticos"], (res) => {
        if (chrome.runtime.lastError) {
            mostrarEstadoPanel("No se cargaron tus ajustes. Cierra y vuelve a abrir el panel.", true);
            for (const control of [checkTalkBack, checkVoz, selectDaltonismo, checkOjos, modoControl]) control.disabled = true;
            return;
        }
        checkTalkBack.checked = res.talkback || false;
        checkVoz.checked = res.voz || false;
        selectDaltonismo.value = res.daltonismo || "ninguno";
        checkOjos.checked = res.ojos || false;
        actualizarModo(res.ajustesCineticos);
        actualizarUI();
        mostrarEstadoPanel("Los cambios se guardan automáticamente.");
    });

    // 2. Controlar la visibilidad de las cajas de ayuda (hints)
    function actualizarFiltro() {
        const opcion = selectDaltonismo.selectedOptions[0];
        const activo = Boolean(opcion && opcion.value !== "ninguno");
        selectDaltonismo.closest(".select-box").dataset.filtro = activo ? opcion.value : "ninguno";
        document.getElementById("estadoDaltonismo").textContent = activo
            ? "Activo: " + opcion.textContent.split(" (")[0] : "Sin filtro activo";
        document.getElementById("quitarDaltonismo").hidden = !activo;
    }
    document.getElementById("quitarDaltonismo").addEventListener("click", async () => {
        selectDaltonismo.value = "ninguno";
        await guardarCambios();
        selectDaltonismo.focus();
    });
    chrome.storage.onChanged.addListener((cambios, area) => {
        if (area !== "local") return;
        if (cambios.ajustesCineticos) actualizarModo(cambios.ajustesCineticos.newValue);
        if (cambios.daltonismo) selectDaltonismo.value = cambios.daltonismo.newValue || "ninguno";
        if (cambios.voz) checkVoz.checked = Boolean(cambios.voz.newValue);
        if (cambios.talkback) checkTalkBack.checked = Boolean(cambios.talkback.newValue);
        if (cambios.ojos) checkOjos.checked = Boolean(cambios.ojos.newValue);
        actualizarUI();
    });
    function actualizarUI() {
        actualizarFiltro();
        hintGestos.hidden = !checkOjos.checked;
        for (const [control, estado] of [[checkTalkBack, "estadoLectura"], [checkVoz, "estadoVoz"], [checkOjos, "estadoCursor"]]) {
            document.getElementById(estado).textContent = control.checked ? "Activado" : "Desactivado";
        }
    }

    // 3. Guardar cambios y forzar actualización híbrida (Storage + Mensaje Directo)
    async function guardarCambios() {
        actualizarUI();
        mostrarEstadoPanel("Guardando tus ajustes…");
        try {
            await chrome.storage.local.set({
                talkback: checkTalkBack.checked,
                voz: checkVoz.checked,
                daltonismo: selectDaltonismo.value,
                ojos: checkOjos.checked
            });
            mostrarEstadoPanel("Ajustes guardados.");
            const tabs = await chrome.tabs.query({}).catch(() => []);
            for (const tab of tabs) {
                if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
                    chrome.tabs.sendMessage(tab.id, { accion: "actualizar_estado" }).catch(() => {});
                }
            }
        } catch (_) {
            mostrarEstadoPanel("No se guardaron los cambios. Vuelve a cambiar el ajuste para intentarlo.", true);
        }
    }

    // 4. Asignar los eventos ('change' es nativo y seguro para el estado final del Select)
    checkTalkBack.addEventListener("change", guardarCambios);
    checkVoz.addEventListener("change", guardarCambios);
    selectDaltonismo.addEventListener("change", guardarCambios);
    checkOjos.addEventListener("change", guardarCambios);
    modoControl.addEventListener("change", async () => {
        const modo = modoControl.value;
        mostrarEstadoPanel("Guardando tus ajustes…");
        try {
            const res = await chrome.storage.local.get("ajustesCineticos");
            await chrome.storage.local.set({ ajustesCineticos: { ...res.ajustesCineticos, modo } });
            mostrarEstadoPanel("Ajustes guardados.");
        } catch (_) {
            mostrarEstadoPanel("No se guardó el modo. Selecciónalo de nuevo para intentarlo.", true);
        }
    });
});
