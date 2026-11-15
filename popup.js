// Mientras el panel está abierto, la pestaña activa conserva el cursor y la voz.
chrome.runtime.connect({ name: 'adapta-popup' });
document.addEventListener('DOMContentLoaded', () => {
    const checkTalkBack = document.getElementById("checkTalkBack");
    const checkVoz = document.getElementById("checkVoz");
    const selectIdiomaVoz = document.getElementById("selectIdiomaVoz");
    const grupoFiltros = document.getElementById("grupoDaltonismo");
    FiltrosUI.montar(grupoFiltros);
    const radiosFiltro = [...grupoFiltros.querySelectorAll("input")];
    const checkOjos = document.getElementById("checkOjos");
    const hintGestos = document.getElementById("hintGestos");
    const modoControl = document.getElementById("adapta-pe-modo-control");
    const rangoDwell = document.getElementById("adapta-pe-dwell");
    const checkAtraccion = document.getElementById("adapta-pe-atraccion");
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
        rangoDwell.value = Number.isFinite(ajustes.dwell) ? Math.max(500, Math.min(1500, ajustes.dwell)) : 1000;
        mostrarDwell();
        checkAtraccion.checked = ajustes.atraccion !== false;
        if (anterior !== modo) chrome.storage.local.set({ ajustesCineticos: { ...ajustes, modo } }).catch(() => {});
    }

    function mostrarDwell() {
        const segundos = (rangoDwell.value / 1000).toLocaleString(TextosAdapta.idioma, { minimumFractionDigits: 1 });
        document.getElementById("ayudaDwell").textContent = TextosAdapta.t("popup.ayudaDwell", { segundos });
        rangoDwell.setAttribute("aria-valuetext", TextosAdapta.t("popup.dwellValor", { segundos }));
    }
    // 1. Cargar el estado actual desde Storage al abrir el popup
    chrome.storage.local.get(["talkback", "voz", "daltonismo", "ojos", "ajustesCineticos", "idiomaVoz"], (res) => {
        if (chrome.runtime.lastError) {
            mostrarEstadoPanel("popup.noCargo", true);
            for (const control of [checkTalkBack, checkVoz, selectIdiomaVoz, ...radiosFiltro, checkOjos, modoControl, rangoDwell, checkAtraccion]) control.disabled = true;
            return;
        }
        checkTalkBack.checked = res.talkback || false;
        checkVoz.checked = res.voz || false;
        mostrarIdioma(res.idiomaVoz);
        FiltrosUI.poner(grupoFiltros, res.daltonismo);
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
        const valor = FiltrosUI.valor(grupoFiltros);
        const activo = valor !== "ninguno";
        grupoFiltros.closest(".select-box").dataset.filtro = valor;
        const estado = document.getElementById("estadoDaltonismo");
        if (activo) { delete estado.dataset.i18n; estado.textContent = TextosAdapta.t("popup.filtroActivo", { filtro: FiltrosUI.nombre(grupoFiltros) }); }
        else ponerTexto(estado, "popup.sinFiltroActivo");
        document.getElementById("quitarDaltonismo").hidden = !activo;
    }
    document.getElementById("quitarDaltonismo").addEventListener("click", async () => {
        FiltrosUI.poner(grupoFiltros, "ninguno");
        await guardarCambios({ daltonismo: "ninguno" });
        grupoFiltros.querySelector('input[value="ninguno"]').focus();
    });
    chrome.storage.onChanged.addListener((cambios, area) => {
        if (area !== "local") return;
        if (cambios.ajustesCineticos) actualizarModo(cambios.ajustesCineticos.newValue);
        if (cambios.daltonismo) FiltrosUI.poner(grupoFiltros, cambios.daltonismo.newValue);
        if (cambios.idiomaVoz) mostrarIdioma(cambios.idiomaVoz.newValue);
        if (cambios.voz) checkVoz.checked = Boolean(cambios.voz.newValue);
        if (cambios.talkback) checkTalkBack.checked = Boolean(cambios.talkback.newValue);
        if (cambios.ojos) checkOjos.checked = Boolean(cambios.ojos.newValue);
        actualizarUI();
    });
    // Otro idioma: rehacer los textos con variables (traducirDocumento ya cambió los demás).
    document.addEventListener("adapta-pe-idioma", () => { mostrarIdioma(selectIdiomaVoz.value); actualizarFiltro(); mostrarDwell(); });
    function actualizarUI() {
        actualizarFiltro();
        hintGestos.hidden = !checkOjos.checked;
        for (const [control, estado] of [[checkTalkBack, "estadoLectura"], [checkOjos, "estadoCursor"]]) {
            ponerTexto(document.getElementById(estado), control.checked ? "popup.activado" : "popup.desactivado");
        }
    }

    // 3. Guardar cambios y forzar actualización híbrida (Storage + Mensaje Directo)
    async function guardarCambios(cambio) {
        actualizarUI();
        mostrarEstadoPanel("popup.guardando");
        try {
            // Sólo la clave que cambió: no pisa cambios hechos por voz con el panel abierto.
            await chrome.storage.local.set(cambio);
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
    checkTalkBack.addEventListener("change", () => guardarCambios({ talkback: checkTalkBack.checked }));
    checkVoz.addEventListener("change", () => guardarCambios({ voz: checkVoz.checked }));
    selectIdiomaVoz.addEventListener("change", () => guardarCambios({ idiomaVoz: selectIdiomaVoz.value }));
    grupoFiltros.addEventListener("change", () => guardarCambios({ daltonismo: FiltrosUI.valor(grupoFiltros) }));
    checkOjos.addEventListener("change", () => guardarCambios({ ojos: checkOjos.checked }));
    // Los ajustes del cursor comparten una clave: se guarda sólo el campo que cambió.
    let colaAjustesCineticos = Promise.resolve();
    function guardarAjusteCinetico(cambio, errorClave) {
        mostrarEstadoPanel("popup.guardando");
        colaAjustesCineticos = colaAjustesCineticos.then(async () => {
            try {
                const res = await chrome.storage.local.get("ajustesCineticos");
                await chrome.storage.local.set({ ajustesCineticos: { ...res.ajustesCineticos, ...cambio } });
                mostrarEstadoPanel("popup.guardados");
            } catch (_) {
                mostrarEstadoPanel(errorClave, true);
            }
        });
        return colaAjustesCineticos;
    }
    modoControl.addEventListener("change", () => guardarAjusteCinetico({ modo: modoControl.value }, "popup.noGuardoModo"));
    rangoDwell.addEventListener("input", mostrarDwell);
    rangoDwell.addEventListener("change", () => guardarAjusteCinetico({ dwell: Number(rangoDwell.value) }, "popup.noGuardo"));
    checkAtraccion.addEventListener("change", () => guardarAjusteCinetico({ atraccion: checkAtraccion.checked }, "popup.noGuardo"));
});
