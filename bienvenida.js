// Primera ejecución: activar ayudas con un gesto del usuario; los permisos los pide el flujo existente.
const estadoBienvenida = document.getElementById('adapta-pe-bienvenida-estado');
const interruptores = [...document.querySelectorAll('input[data-clave]')];
function mostrarInterruptor(control) {
    ponerTexto(document.getElementById('estado' + control.dataset.clave[0].toUpperCase() + control.dataset.clave.slice(1)),
        control.checked ? 'popup.activado' : 'popup.desactivado');
}
chrome.storage.local.get(interruptores.map(control => control.dataset.clave)).then(res => {
    for (const control of interruptores) { control.checked = Boolean(res[control.dataset.clave]); mostrarInterruptor(control); }
    ponerTexto(estadoBienvenida, 'popup.guardadoAuto');
}).catch(() => {
    for (const control of interruptores) control.disabled = true;
    ponerTexto(estadoBienvenida, 'bienvenida.noCargo');
});
for (const control of interruptores) control.addEventListener('change', async () => {
    mostrarInterruptor(control);
    try {
        await chrome.storage.local.set({ [control.dataset.clave]: control.checked });
        ponerTexto(estadoBienvenida, control.checked ? 'bienvenida.activadoPermiso' : 'bienvenida.desactivado');
    } catch (_) {
        ponerTexto(estadoBienvenida, 'bienvenida.noGuardo');
    }
});
chrome.storage.onChanged.addListener((cambios, area) => {
    if (area !== 'local') return;
    for (const control of interruptores) if (cambios[control.dataset.clave]) {
        control.checked = Boolean(cambios[control.dataset.clave].newValue); mostrarInterruptor(control);
    }
});

// --- Tutorial práctico (misma secuencia en Base y Lite; el paso del cursor sólo existe en el HTML de Base) ---
// Chrome no inyecta content scripts en páginas de extensión: esta página carga el controlador de la variante,
// como la Nueva pestaña, para que las órdenes de los ejercicios se ejecuten aquí (background.js: paginaPropia).
for (const archivo of chrome.runtime.getManifest().content_scripts[0].js) {
    const script = document.createElement('script');
    script.src = archivo; script.async = false; // Conserva el orden de las clases y del controlador.
    document.body.append(script);
}
const pasoTutorial = id => document.querySelector(`[data-paso="${id}"]`);
function marcarPaso(id) {
    const paso = pasoTutorial(id);
    if (!paso || paso.dataset.hecho === 'true') return;
    paso.dataset.hecho = 'true';
    ponerTexto(paso.querySelector('.tutorial-estado'), 'tutorial.hecho');
}
const guardarTutorial = cambio => chrome.storage.local.set(cambio).catch(() => ponerTexto(estadoBienvenida, 'bienvenida.noGuardo'));
function textoLibre(elemento, clave, variables) { // Texto con variables: no es una clave fija, se rehace al instante.
    delete elemento.dataset.i18n;
    elemento.textContent = TextosAdapta.t(clave, variables);
}

// 1. Voz y micrófono: el estado lo da el worker en el idioma elegido.
const textoVozTutorial = document.getElementById('tutorial-voz-texto');
document.getElementById('tutorial-activar-voz').addEventListener('click', () => guardarTutorial({ voz: true }));
function consultarVozTutorial() {
    chrome.runtime.sendMessage({ accion: 'voz_estado' }).then(respuesta => {
        if (!respuesta?.texto) return;
        delete textoVozTutorial.dataset.i18n;
        if (textoVozTutorial.textContent !== respuesta.texto) textoVozTutorial.textContent = respuesta.texto;
        if (respuesta.activa && respuesta.tipo && respuesta.tipo !== 'error') marcarPaso('voz');
    }).catch(() => {});
}
consultarVozTutorial();

// 2. Nombre de activación: la frase oída se comprueba con el mismo detector que usa la voz y no ejecuta nada.
const resultadoNombre = document.getElementById('tutorial-nombre-resultado');
let probandoNombre = false;
document.getElementById('tutorial-probar-nombre').addEventListener('click', async () => {
    try {
        const respuesta = await chrome.runtime.sendMessage({ accion: 'voz_probar_nombre' });
        if (!respuesta?.ok) { ponerTexto(resultadoNombre, 'popup.activaVoz'); return; }
        probandoNombre = true; ponerTexto(resultadoNombre, 'popup.diNombre');
    } catch (_) { ponerTexto(resultadoNombre, 'popup.microNoConsulta'); }
});
async function consultarPruebaNombre() {
    if (!probandoNombre) return;
    try {
        const respuesta = await chrome.runtime.sendMessage({ accion: 'voz_prueba_estado' });
        if (respuesta?.caducada) { probandoNombre = false; ponerTexto(resultadoNombre, 'popup.pruebaCaducada'); return; }
        if (typeof respuesta?.texto !== 'string') return;
        probandoNombre = false;
        const preferencias = await chrome.storage.local.get(['nombreActivacion', 'aliasActivacion', 'tambienComputadora']);
        const activa = buscarActivacion(respuesta.texto, preferencias.nombreActivacion, TextosAdapta.idioma, preferencias) >= 0;
        textoLibre(resultadoNombre, activa ? 'tutorial.nombre.oido' : 'tutorial.nombre.noOido', { texto: respuesta.texto });
        if (activa) {
            marcarPaso('nombre');
            chrome.runtime.sendMessage({ accion: 'hablar', texto: TextosAdapta.t('tutorial.nombre.respuesta') }).catch(() => {});
        }
    } catch (_) { probandoNombre = false; ponerTexto(resultadoNombre, 'popup.microNoConsulta'); }
}
const refrescoTutorial = setInterval(() => { consultarVozTutorial(); consultarPruebaNombre(); }, 1000);
window.addEventListener('pagehide', () => clearInterval(refrescoTutorial));

// 3. Ejercicios de órdenes. «baja»: la página se desplaza ≥100 px en un mismo gesto (más de 300 ms sin eventos = otro gesto).
// El salto automático a #tutorial (al abrir o con «tutorial») no cuenta: se ignora el desplazamiento durante 1,5 s.
let origenScroll = scrollY, scrollPrevio = scrollY, ultimoScroll = 0, ignorarScroll = performance.now() + 1500;
addEventListener('hashchange', () => { ignorarScroll = performance.now() + 1500; });
addEventListener('scroll', () => {
    const ahora = performance.now();
    if (ahora < ignorarScroll) { origenScroll = scrollPrevio = scrollY; ultimoScroll = ahora; return; }
    if (ahora - ultimoScroll > 300) origenScroll = scrollPrevio;
    ultimoScroll = ahora; scrollPrevio = scrollY;
    if (scrollY - origenScroll >= 100) marcarPaso('baja');
}, { passive: true });
// «selecciona Siguiente»: VoiceAssistant marca el elemento con este atributo (idSeleccion); «dale clic» lo pulsa.
const objetivoTutorial = document.getElementById('tutorial-objetivo');
const atributoSeleccion = 'data-adapta-pe-seleccion-' + chrome.runtime.id;
new MutationObserver(() => { if (objetivoTutorial.hasAttribute(atributoSeleccion)) marcarPaso('selecciona'); })
    .observe(objetivoTutorial, { attributes: true, attributeFilter: [atributoSeleccion] });
objetivoTutorial.addEventListener('click', () => { if (pasoTutorial('selecciona').dataset.hecho === 'true') marcarPaso('clic'); });

// 4. Filtro de color con muestras: la misma clave `daltonismo` que el panel.
const grupoFiltrosTutorial = document.getElementById('tutorial-filtros');
FiltrosUI.montar(grupoFiltrosTutorial);
chrome.storage.local.get('daltonismo').then(res => FiltrosUI.poner(grupoFiltrosTutorial, res.daltonismo)).catch(() => {});
grupoFiltrosTutorial.addEventListener('change', () => { guardarTutorial({ daltonismo: FiltrosUI.valor(grupoFiltrosTutorial) }); marcarPaso('filtro'); });
chrome.storage.onChanged.addListener((cambios, area) => { if (area === 'local' && cambios.daltonismo) FiltrosUI.poner(grupoFiltrosTutorial, cambios.daltonismo.newValue); });

// 5. Sólo Base: activar el cursor y pulsar tres botones grandes quedándose quieto (dwell).
document.getElementById('tutorial-activar-cursor')?.addEventListener('click', () => guardarTutorial({ ojos: true }));
const botonesDwell = [...document.querySelectorAll('.tutorial-dwell')];
function textosDwell() { botonesDwell.forEach((boton, indice) => { boton.textContent = TextosAdapta.t('tutorial.cursor.boton', { n: indice + 1 }); }); }
for (const boton of botonesDwell) boton.addEventListener('click', () => {
    boton.dataset.hecho = 'true';
    if (botonesDwell.every(otro => otro.dataset.hecho === 'true')) marcarPaso('cursor');
});
textosDwell();
document.addEventListener('adapta-pe-idioma', textosDwell);
