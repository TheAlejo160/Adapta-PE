// Cerebro global del navegador (Tiene permisos para controlar pestañas)
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
  else if (request.accion === "buscar_google") {
    chrome.tabs.update(sender.tab.id, { url: "https://www.google.com/search?q=" + encodeURIComponent(request.query) });
  }
});