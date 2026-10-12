// Mientras el panel está abierto, la pestaña activa conserva el cursor y la voz.
chrome.runtime.connect({ name: 'adapta-popup' });
document.addEventListener('DOMContentLoaded', () => {
    const checkTalkBack = document.getElementById("checkTalkBack");
    const checkVoz = document.getElementById("checkVoz");
    const selectIdiomaVoz = document.getElementById("selectIdiomaVoz");
    const selectDaltonismo = document.getElementById("selectDaltonismo");
    const checkOjos = document.getElementById("checkOjos");
    const hintGestos = document.getElementById("hintGestos");
    const modoControl = document.getElementById("adapta-pe-modo-control");
    const estadoPanel = document.getElementById("estadoPanel");
    function mostrarEstadoPanel(clave, error = false) {
        ponerTexto(estadoPanel, clave);
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
    chrome.storage.local.get(["talkback", "voz", "daltonismo", "ojos", "ajustesCineticos", "idiomaVoz"], (res) => {
        if (chrome.runtime.lastError) {
            mostrarEstadoPanel("popup.noCargo", true);
            for (const control of [checkTalkBack, checkVoz, selectIdiomaVoz, selectDaltonismo, checkOjos, modoControl]) control.disabled = true;
            return;
        }
        checkTalkBack.checked = res.talkback || false;
        checkVoz.checked = res.voz || false;
        mostrarIdioma(res.idiomaVoz);
        selectDaltonismo.value = res.daltonismo || "ninguno";
        checkOjos.checked = res.ojos || false;
        actualizarModo(res.ajustesCineticos);
        actualizarUI();
        mostrarEstadoPanel("popup.guardadoAuto");
    });

    function mostrarIdioma(idioma) {
        selectIdiomaVoz.value = idioma || "auto";
        if (!selectIdiomaVoz.value) selectIdiomaVoz.value = "auto"; // Valor desconocido guardado.
        // Mostrar qué idioma del sistema se usará en «Automático».
        const detectado = detectarIdiomaVoz([...navigator.languages, navigator.language, chrome.i18n.getUILanguage()]);
        const opcion = [...selectIdiomaVoz.options].find(elemento => elemento.value === detectado);
        selectIdiomaVoz.options[0].textContent = TextosAdapta.t("popup.automatico", { idioma: opcion?.textContent || detectado });
    }

    // 2. Controlar la visibilidad de las cajas de ayuda (hints)
    function actualizarFiltro() {
        const opcion = selectDaltonismo.selectedOptions[0];
        const activo = Boolean(opcion && opcion.value !== "ninguno");
        selectDaltonismo.closest(".select-box").dataset.filtro = activo ? opcion.value : "ninguno";
        const estado = document.getElementById("estadoDaltonismo");
        if (activo) { delete estado.dataset.i18n; estado.textContent = TextosAdapta.t("popup.filtroActivo", { filtro: opcion.textContent }); }
        else ponerTexto(estado, "popup.sinFiltroActivo");
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
        if (cambios.idiomaVoz) mostrarIdioma(cambios.idiomaVoz.newValue);
        if (cambios.voz) checkVoz.checked = Boolean(cambios.voz.newValue);
        if (cambios.talkback) checkTalkBack.checked = Boolean(cambios.talkback.newValue);
        if (cambios.ojos) checkOjos.checked = Boolean(cambios.ojos.newValue);
        actualizarUI();
    });
    // Otro idioma: rehacer los textos con variables (traducirDocumento ya cambió los demás).
    document.addEventListener("adapta-pe-idioma", () => { mostrarIdioma(selectIdiomaVoz.value); actualizarFiltro(); });
    function actualizarUI() {
        actualizarFiltro();
        hintGestos.hidden = !checkOjos.checked;
        for (const [control, estado] of [[checkTalkBack, "estadoLectura"], [checkVoz, "estadoVoz"], [checkOjos, "estadoCursor"]]) {
            ponerTexto(document.getElementById(estado), control.checked ? "popup.activado" : "popup.desactivado");
        }
    }

    // 3. Guardar cambios y forzar actualización híbrida (Storage + Mensaje Directo)
    async function guardarCambios() {
        actualizarUI();
        mostrarEstadoPanel("popup.guardando");
        try {
            await chrome.storage.local.set({
                talkback: checkTalkBack.checked,
                voz: checkVoz.checked,
                idiomaVoz: selectIdiomaVoz.value,
                daltonismo: selectDaltonismo.value,
                ojos: checkOjos.checked
            });
            mostrarEstadoPanel("popup.guardados");
            const tabs = await chrome.tabs.query({}).catch(() => []);
            for (const tab of tabs) {
                if (tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("edge://")) {
                    chrome.tabs.sendMessage(tab.id, { accion: "actualizar_estado" }).catch(() => {});
                }
            }
        } catch (_) {
            mostrarEstadoPanel("popup.noGuardo", true);
        }
    }

    // 4. Asignar los eventos ('change' es nativo y seguro para el estado final del Select)
    checkTalkBack.addEventListener("change", guardarCambios);
    checkVoz.addEventListener("change", guardarCambios);
    selectIdiomaVoz.addEventListener("change", guardarCambios);
    selectDaltonismo.addEventListener("change", guardarCambios);
    checkOjos.addEventListener("change", guardarCambios);
    modoControl.addEventListener("change", async () => {
        const modo = modoControl.value;
        mostrarEstadoPanel("popup.guardando");
        try {
            const res = await chrome.storage.local.get("ajustesCineticos");
            await chrome.storage.local.set({ ajustesCineticos: { ...res.ajustesCineticos, modo } });
            mostrarEstadoPanel("popup.guardados");
        } catch (_) {
            mostrarEstadoPanel("popup.noGuardoModo", true);
        }
    });
});
