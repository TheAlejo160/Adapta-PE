chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.accion === "hablar") {
    chrome.tts.stop();
    chrome.tts.speak(request.texto, { lang: 'es-ES', rate: 1.05 });
  }
  else if (request.accion === "callar") {
    chrome.tts.stop();
  }
  else if (request.accion === "abrir_pestana") {
    chrome.tabs.create({ url: request.url });
  }
  else if (request.accion === "cerrar_pestana") {
    chrome.tabs.remove(sender.tab.id);
  }
  else if (request.accion === "buscar_inteligente") {
    let query = request.query;
    let url = "";

    // Diccionario de Páginas Rápidas
    const sitios = {
        "youtube": `https://www.youtube.com/results?search_query=`,
        "mercadolibre": `https://listado.mercadolibre.com.pe/`,
        "facebook": `https://www.facebook.com/search/top/?q=`,
        "wikipedia": `https://es.wikipedia.org/wiki/Especial:Buscar?search=`,
        "amazon": `https://www.amazon.com/s?k=`,
        "instagram": `https://www.instagram.com/`,
        "chatgpt": `https://chatgpt.com/`,
        "google": `https://www.google.com/search?q=`
    };

    let sitioClave = request.sitio.toLowerCase().replace(" ", "");

    if (sitioClave === "canvas" || sitioClave === "chatgpt" || sitioClave === "instagram") {
        url = sitios[sitioClave];
    } else if (sitioClave in sitios) {
        url = query === "" ? sitios[sitioClave].split("?")[0] : sitios[sitioClave] + encodeURIComponent(sitioClave === "mercadolibre" ? query.replace(/ /g, "-") : query);
    } else {
        url = sitios["google"] + encodeURIComponent(query);
    }

    // Lógica para abrir en pestaña nueva o actual
    if (request.nuevaPestana) {
        chrome.tabs.create({ url: url });
    } else {
        chrome.tabs.update(sender.tab.id, { url: url });
    }
  }
});