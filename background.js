chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // --- TTS (TalkBack) ---
    if (request.accion === "hablar") {
        chrome.tts.stop();
        chrome.tts.speak(request.texto, { lang: 'es-ES', rate: 1.05 });
    }
    else if (request.accion === "callar") {
        chrome.tts.stop();
    }

    // --- NAVEGACIÓN BÁSICA ---
    else if (request.accion === "abrir_url") {
        gestionarAperturaURL(request.url, request.destino, sender.tab);
    }
    else if (request.accion === "cerrar_pestana") {
        if (sender.tab && sender.tab.id) {
            chrome.tabs.remove(sender.tab.id);
        }
    }

    // --- BÚSQUEDA INTELIGENTE ---
    else if (request.accion === "buscar_inteligente") {
        let query = request.query;
        let url = "";

        // Diccionario Ampliado (Buscadores, IA, Streaming, Redes, Productividad)
        const sitios = {
            // Buscadores y Compras
            "google": `https://www.google.com/search?q=`,
            "youtube": `https://www.youtube.com/results?search_query=`,
            "mercadolibre": `https://listado.mercadolibre.com.pe/`,
            "amazon": `https://www.amazon.com/s?k=`,
            "wikipedia": `https://es.wikipedia.org/wiki/Especial:Buscar?search=`,
            // Inteligencia Artificial
            "chatgpt": `https://chatgpt.com/`,
            "claude": `https://claude.ai/`,
            "gemini": `https://gemini.google.com/`,
            // Redes Sociales
            "facebook": `https://www.facebook.com/search/top/?q=`,
            "instagram": `https://www.instagram.com/`,
            "twitter": `https://twitter.com/search?q=`,
            "x": `https://x.com/search?q=`,
            "reddit": `https://www.reddit.com/search/?q=`,
            // Streaming / Multimedia
            "netflix": `https://www.netflix.com/search?q=`,
            "twitch": `https://www.twitch.com/search?term=`,
            // Desarrollo / Estudio
            "github": `https://github.com/search?q=`,
            "canvas": `https://canvas.instructure.com/` // O ajusta a tu URL de Canvas específica
        };

        let sitioClave = request.sitio.toLowerCase().replace(" ", "");

        // URLs Directas (Sitios donde normalmente no se busca por URL sino que se requiere ir al home o su sistema es complejo)
        const sitiosDirectos = ["canvas", "chatgpt", "claude", "gemini", "instagram"];

        if (sitiosDirectos.includes(sitioClave)) {
            url = sitios[sitioClave] || `https://www.${sitioClave}.com/`;
        } else if (sitioClave in sitios) {
            url = query === "" ? sitios[sitioClave].split("?")[0] : sitios[sitioClave] + encodeURIComponent(sitioClave === "mercadolibre" ? query.replace(/ /g, "-") : query);
        } else {
            url = sitios["google"] + encodeURIComponent(query);
        }

        gestionarAperturaURL(url, request.destino, sender.tab);
    }
});

// --- FUNCIÓN AUXILIAR PARA MANEJAR PESTAÑAS Y VENTANAS ---
function gestionarAperturaURL(url, destino, senderTab) {
    if (destino === "ventana") {
        // Intentar abrir en otro monitor si es posible
        if (chrome.system && chrome.system.display) {
            chrome.system.display.getInfo((displays) => {
                if (displays.length > 1) {
                    // Hay más de un monitor, buscar uno que no sea el principal
                    let secondDisplay = displays.find(d => !d.isPrimary) || displays[1];
                    chrome.windows.create({
                        url: url,
                        left: secondDisplay.workArea.left,
                        top: secondDisplay.workArea.top,
                        state: "maximized"
                    });
                } else {
                    // Un solo monitor, abrir ventana normal
                    chrome.windows.create({ url: url });
                }
            });
        } else {
            // Fallback si el permiso 'system.display' no está presente o falla
            chrome.windows.create({ url: url });
        }
    } else if (destino === "pestana") {
        chrome.tabs.create({ url: url });
    } else {
        // Destino 'actual'
        if (senderTab && senderTab.id) {
            chrome.tabs.update(senderTab.id, { url: url });
        }
    }
}