(() => {
// Reinyectar las clases no debe borrar los textos ni el idioma del controlador vigente.
if (globalThis.TextosAdapta) return;
// Textos visibles y hablados de AdaptaPE. Cada módulo registra los suyos con definir().
// El idioma es la base del idioma de voz resuelto (storage `idiomaVoz` o, en «auto», el del sistema).
// Una clave que falte en un idioma usa el español; una clave desconocida se devuelve tal cual.
const diccionarios = { es: {}, en: {}, pt: {}, de: {}, fr: {}, it: {} };
let idioma = 'es';

const TextosAdapta = {
    definir(textos) {
        for (const [codigo, claves] of Object.entries(textos)) Object.assign(diccionarios[codigo] ||= {}, claves);
    },
    fijarIdioma(codigo) {
        const base = String(codigo || '').slice(0, 2).toLowerCase();
        idioma = Object.hasOwn(diccionarios, base) ? base : 'es';
        return idioma;
    },
    get idioma() { return idioma; },
    t(clave, variables = {}) {
        const texto = diccionarios[idioma]?.[clave] ?? diccionarios.es[clave] ?? clave;
        return texto.replace(/\{(\w+)\}/g, (_, nombre) => variables[nombre] ?? '');
    },
    // Páginas de la extensión: data-i18n (texto), data-i18n-<atributo> (aria-label, title, placeholder, alt).
    traducirDocumento(raiz = document) {
        for (const elemento of raiz.querySelectorAll('[data-i18n]')) elemento.textContent = TextosAdapta.t(elemento.dataset.i18n);
        for (const atributo of ['aria-label', 'title', 'placeholder', 'alt']) {
            for (const elemento of raiz.querySelectorAll(`[data-i18n-${atributo}]`)) {
                elemento.setAttribute(atributo, TextosAdapta.t(elemento.getAttribute(`data-i18n-${atributo}`)));
            }
        }
        if (raiz.documentElement) raiz.documentElement.lang = idioma;
    },
};
globalThis.TextosAdapta = TextosAdapta;
})();
