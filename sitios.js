(() => {
// Catálogo compartido por el asistente y el service worker. Coincidencias completas,
// nunca subcadenas: «x» no debe coincidir con Netflix ni con un texto dictado.
const SitiosVoz = {
    google: { alias: ['google'], inicio: 'https://www.google.com/', busqueda: 'https://www.google.com/search?q=' },
    youtube: { alias: ['youtube', 'you tube'], inicio: 'https://www.youtube.com/', busqueda: 'https://www.youtube.com/results?search_query=' },
    mercadolibre: { alias: ['mercado libre', 'mercadolibre'], inicio: 'https://www.mercadolibre.com.pe/', busqueda: 'https://listado.mercadolibre.com.pe/' },
    amazon: { alias: ['amazon'], inicio: 'https://www.amazon.com/', busqueda: 'https://www.amazon.com/s?k=' },
    wikipedia: { alias: ['wikipedia'], inicio: 'https://es.wikipedia.org/', busqueda: 'https://es.wikipedia.org/wiki/Especial:Buscar?search=' },
    facebook: { alias: ['facebook', 'face book'], inicio: 'https://www.facebook.com/', busqueda: 'https://www.facebook.com/search/top/?q=' },
    instagram: { alias: ['instagram'], inicio: 'https://www.instagram.com/' },
    x: { alias: ['x', 'twitter', 'equis'], inicio: 'https://x.com/', busqueda: 'https://x.com/search?q=' },
    reddit: { alias: ['reddit'], inicio: 'https://www.reddit.com/', busqueda: 'https://www.reddit.com/search/?q=' },
    netflix: { alias: ['netflix'], inicio: 'https://www.netflix.com/', busqueda: 'https://www.netflix.com/search?q=' },
    twitch: { alias: ['twitch'], inicio: 'https://www.twitch.tv/', busqueda: 'https://www.twitch.tv/search?term=' },
    github: { alias: ['github', 'git hub'], inicio: 'https://github.com/', busqueda: 'https://github.com/search?q=' },
    chatgpt: { alias: ['chatgpt', 'chat gpt'], inicio: 'https://chatgpt.com/' },
    claude: { alias: ['claude'], inicio: 'https://claude.ai/' },
    gemini: { alias: ['gemini'], inicio: 'https://gemini.google.com/' },
    canvas: { alias: ['canvas'], inicio: 'https://canvas.instructure.com/' },
    gmail: { alias: ['gmail', 'g mail', 'correo de google'], inicio: 'https://mail.google.com/' },
    outlook: { alias: ['outlook', 'hotmail'], inicio: 'https://outlook.live.com/' },
    whatsapp: { alias: ['whatsapp', 'whats app', 'wasap'], inicio: 'https://web.whatsapp.com/' },
    telegram: { alias: ['telegram'], inicio: 'https://web.telegram.org/' },
    drive: { alias: ['drive', 'google drive'], inicio: 'https://drive.google.com/' },
    documentos: { alias: ['google docs', 'documentos de google'], inicio: 'https://docs.google.com/' },
    mapas: { alias: ['mapas', 'maps', 'google maps'], inicio: 'https://www.google.com/maps/', busqueda: 'https://www.google.com/maps/search/?api=1&query=' },
    linkedin: { alias: ['linkedin', 'linked in'], inicio: 'https://www.linkedin.com/' },
    tiktok: { alias: ['tiktok', 'tik tok'], inicio: 'https://www.tiktok.com/' },
    spotify: { alias: ['spotify'], inicio: 'https://open.spotify.com/' },
    bing: { alias: ['bing'], inicio: 'https://www.bing.com/', busqueda: 'https://www.bing.com/search?q=' },
    duckduckgo: { alias: ['duckduckgo', 'duck duck go'], inicio: 'https://duckduckgo.com/', busqueda: 'https://duckduckgo.com/?q=' }
};

function normalizarVoz(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();
}

function reconocerSitio(texto) {
    const nombre = normalizarVoz(texto);
    return Object.keys(SitiosVoz).find(clave => clave === nombre || SitiosVoz[clave].alias.includes(nombre));
}
globalThis.SitiosVoz = SitiosVoz; globalThis.normalizarVoz = normalizarVoz; globalThis.reconocerSitio = reconocerSitio;
})();
