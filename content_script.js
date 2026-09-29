document.documentElement.setAttribute('data-adapta-extension', 'true');

// Instanciar Módulos
const voiceAssistant = new VoiceAssistant();
const talkBack = new TalkBack();
const filtrosDaltonismo = new FiltrosDaltonismo();
const kineticEngine = new KineticEngine();

// Controlador de Estado Global
function revisarPreferencias() {
    chrome.storage.local.get(["talkback", "voz", "daltonismo", "ojos"], (res) => {
        talkBack.setEstado(res.talkback || false);
        voiceAssistant.setEstado(res.voz || false);
        filtrosDaltonismo.aplicar(res.daltonismo || "ninguno");
        kineticEngine.setEstado(res.ojos || false);
    });
}

// Inicialización e inyección al cargar la página por primera vez
window.addEventListener("load", revisarPreferencias);

// 1. Escucha Activa: Captura el pulso directo de popup.js (Respuesta instantánea)
chrome.runtime.onMessage.addListener((request) => {
    if (request.accion === "actualizar_estado") {
        revisarPreferencias();
    }
});

// 2. Escucha Pasiva: Captura cambios por detrás (Fallback para pestañas dormidas)
chrome.storage.onChanged.addListener((cambios, areaName) => {
    if (areaName === "local") {
        if (cambios.talkback) talkBack.setEstado(cambios.talkback.newValue);
        if (cambios.voz) voiceAssistant.setEstado(cambios.voz.newValue);
        if (cambios.daltonismo) filtrosDaltonismo.aplicar(cambios.daltonismo.newValue);
        if (cambios.ojos) kineticEngine.setEstado(cambios.ojos.newValue);
    }
});

// --- CONTROL DE PESTAÑAS (OPTIMIZACIÓN DE RECURSOS) ---
document.addEventListener("visibilitychange", () => {
    if (typeof voiceAssistant.actualizarVisibilidad === "function") {
        voiceAssistant.actualizarVisibilidad(!document.hidden);
    }
});

window.addEventListener("focus", () => {
    if (typeof voiceAssistant.actualizarVisibilidad === "function") {
        voiceAssistant.actualizarVisibilidad(true);
    }
});

window.addEventListener("blur", () => {
    if (typeof voiceAssistant.actualizarVisibilidad === "function") {
        voiceAssistant.actualizarVisibilidad(false);
    }
});