// Nueva pestaña de AdaptaPE (idéntica en Base y Lite). Se carga en <head>: aplica el tema guardado
// antes de pintar y, al terminar el HTML, añade el controlador de la variante en el orden de su
// manifest. Chrome no inyecta content scripts en páginas de extensión, así que la página lo carga.
(() => {
    const clave = 'temaNuevaPestana';
    const presets = ['sistema', 'claro', 'oscuro', 'contraste', 'pacifico', 'selva', 'cielo'];
    const raiz = document.documentElement;
    // Negro o blanco, el que más contraste: con cualquier acento supera 4,5:1.
    function textoSobre(hex) {
        const [r, g, b] = [1, 3, 5].map(inicio => {
            const canal = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
            return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
        });
        const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return (luminancia + 0.05) / 0.05 >= 1.05 / (luminancia + 0.05) ? '#000000' : '#ffffff';
    }
    // Valida lo leído de storage: sólo tres campos conocidos.
    function normalizar(tema) {
        const datos = tema && typeof tema === 'object' ? tema : {};
        return {
            preset: presets.includes(datos.preset) ? datos.preset : 'sistema',
            acento: /^#[0-9a-f]{6}$/i.test(datos.acento) ? datos.acento.toLowerCase() : null,
            fondo: typeof datos.fondo === 'string' && datos.fondo.startsWith('data:image/jpeg;base64,') ? datos.fondo : null
        };
    }
    function aplicar(tema) {
        const datos = normalizar(tema);
        raiz.dataset.tema = datos.preset;
        if (datos.acento) {
            raiz.style.setProperty('--acento', datos.acento);
            raiz.style.setProperty('--acento-texto', textoSobre(datos.acento));
        } else { raiz.style.removeProperty('--acento'); raiz.style.removeProperty('--acento-texto'); }
        if (datos.fondo) { raiz.style.setProperty('--imagen-fondo', `url("${datos.fondo}")`); raiz.dataset.fondo = ''; }
        else { raiz.style.removeProperty('--imagen-fondo'); delete raiz.dataset.fondo; }
        TemaNuevaPestana.actual = datos;
        // Copia sin imagen para pintar el tema al instante en la próxima pestaña; storage.local manda.
        try { localStorage.setItem(clave, JSON.stringify({ preset: datos.preset, acento: datos.acento })); } catch (_) {}
        document.dispatchEvent(new Event('adapta-pe-tema'));
    }
    const TemaNuevaPestana = globalThis.TemaNuevaPestana = { clave, presets, normalizar, aplicar, actual: normalizar(null) };
    try { aplicar(JSON.parse(localStorage.getItem(clave))); } catch (_) { aplicar(null); }
    let cambiado = false;
    chrome.storage.local.get(clave).then(res => { if (!cambiado) aplicar(res[clave]); }).catch(() => {});
    chrome.storage.onChanged.addListener((cambios, area) => {
        if (area === 'local' && cambios[clave]) { cambiado = true; aplicar(cambios[clave].newValue); }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const manifiesto = chrome.runtime.getManifest();
        const logo = document.getElementById('adapta-pe-ntp-logo');
        logo.src = manifiesto.icons['128'];
        const icono = document.createElement('link');
        icono.rel = 'icon'; icono.href = manifiesto.icons['16'];
        document.head.append(icono);
        document.getElementById('adapta-pe-ntp-nombre').textContent = manifiesto.name; // Nombre legal: no se traduce.
        // async = false conserva el orden: clases, controlador, textos de la página y traducción.
        for (const archivo of [...manifiesto.content_scripts[0].js, 'nueva_pestana.js', 'textos_paginas.js']) {
            const script = document.createElement('script');
            script.src = archivo;
            script.async = false;
            document.body.append(script);
        }
    }, { once: true });
})();
