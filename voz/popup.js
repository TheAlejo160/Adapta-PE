// Estado visible también en Nueva pestaña y páginas protegidas de Chrome.
// «Tutorial»: el worker abre o enfoca bienvenida.html#tutorial (la misma acción que la orden de voz).
document.getElementById('abrirTutorial').addEventListener('click', async () => {
    try {
        const respuesta = await chrome.runtime.sendMessage({ accion: 'tutorial' });
        if (!respuesta?.ok) throw new Error('No se abrió el tutorial');
    } catch (_) { ponerTexto(document.getElementById('estadoPanel'), 'popup.tutorialNoAbrio'); }
});
const ayudaVoz = document.getElementById('hintVoz');
const indicadorVoz = document.getElementById('estadoVoz');
indicadorVoz.setAttribute('role', 'status');
ponerTexto(indicadorVoz, 'popup.consultandoMicro');
const configurarMicrofono = document.createElement('button');
configurarMicrofono.type = 'button';
ponerTexto(configurarMicrofono, 'popup.configurarMicro');
configurarMicrofono.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('voz/permisos.html') }).catch(() => {
    ponerTexto(indicadorVoz, 'popup.configNoAbrio');
}));
ayudaVoz?.querySelector('details').appendChild(configurarMicrofono);
function actualizarEstadoVoz() {
    chrome.runtime.sendMessage({ accion: 'voz_estado' }, respuesta => {
        if (chrome.runtime.lastError) return ponerTexto(indicadorVoz, 'popup.microNoConsulta');
        if (!respuesta?.texto) return ponerTexto(indicadorVoz, 'popup.activaVoz');
        // El worker ya envía el texto en el idioma elegido: no es una clave.
        delete indicadorVoz.dataset.i18n;
        if (indicadorVoz.textContent !== respuesta.texto) indicadorVoz.textContent = respuesta.texto;
    });
}
actualizarEstadoVoz();
const refrescoVoz = setInterval(actualizarEstadoVoz, 1000);
window.addEventListener('pagehide', () => clearInterval(refrescoVoz));
// Nombre de activación (`nombreActivacion`): sustituye a «Computadora»; vacío vuelve al predeterminado.
const formNombre = document.getElementById('formNombreActivacion');
const campoNombre = document.getElementById('nombreActivacion');
const estadoNombre = document.getElementById('estadoNombreActivacion');
const campoAlias = document.getElementById('aliasActivacion');
function avisoNombre(clave, error = false) {
    ponerTexto(estadoNombre, clave);
    estadoNombre.dataset.error = String(error);
    campoNombre.setAttribute('aria-invalid', String(error));
}
function mostrarNombre(valor) {
    const validado = validarNombreActivacion(valor);
    campoNombre.value = validado.ok ? validado.nombre : '';
}
async function guardarNombre(nombre, clave) {
    const lista = campoAlias.value.split(';').map(alias => alias.trim()).filter(Boolean);
    const validado = validarAliasActivacion(lista, nombre);
    if (!validado.ok) { avisoNombre('popup.aliasInvalido', true); return; }
    try { await chrome.storage.local.set({ nombreActivacion: nombre, aliasActivacion: validado.alias }); avisoNombre(clave); }
    catch (_) { avisoNombre('popup.noGuardo', true); }
}
// Una lectura inicial tardía no pisa lo que el usuario ya escribió ni un cambio posterior de storage.
let nombreEditado = false, revisionNombre = 0;
campoNombre.addEventListener('input', () => { nombreEditado = true; });
campoAlias.addEventListener('input', () => { nombreEditado = true; });
chrome.storage.local.get(['nombreActivacion', 'aliasActivacion', 'tambienComputadora', 'modoConversacion']).then(res => {
    if (!nombreEditado && !revisionNombre) mostrarNombre(res.nombreActivacion);
    if (!nombreEditado && !revisionNombre) campoAlias.value = validarAliasActivacion(res.aliasActivacion || [], res.nombreActivacion).alias.join('; ');
    for (const clave of ['tambienComputadora', 'modoConversacion']) if (!interruptoresEditados.has(clave)) document.getElementById(clave).checked = res[clave] === true;
}).catch(() => {});
chrome.storage.onChanged.addListener((cambios, area) => {
    if (area !== 'local') return;
    for (const clave of ['tambienComputadora', 'modoConversacion']) if (cambios[clave]) {
        interruptoresEditados.add(clave); document.getElementById(clave).checked = cambios[clave].newValue === true;
    }
    if (cambios.aliasActivacion && document.activeElement !== campoAlias) campoAlias.value = (cambios.aliasActivacion.newValue || []).join('; ');
    if (!cambios.nombreActivacion && !cambios.aliasActivacion) return;
    revisionNombre++;
    if (cambios.nombreActivacion && document.activeElement !== campoNombre) mostrarNombre(cambios.nombreActivacion.newValue);
});
formNombre.addEventListener('submit', evento => {
    evento.preventDefault();
    // Nombre vacío: volver al predeterminado conservando los alias, que también valen con él.
    if (!campoNombre.value.trim()) { campoNombre.value = ''; guardarNombre('', 'popup.nombreRestaurado'); return; }
    const validado = validarNombreActivacion(campoNombre.value);
    if (!validado.ok) { avisoNombre(validado.motivo, true); campoNombre.focus(); return; }
    campoNombre.value = validado.nombre;
    guardarNombre(validado.nombre, 'popup.nombreGuardado');
});
document.getElementById('restaurarNombreActivacion').addEventListener('click', () => {
    campoNombre.value = '';
    campoAlias.value = '';
    guardarNombre('', 'popup.nombreRestaurado');
});
const interruptoresEditados = new Set();
for (const clave of ['tambienComputadora', 'modoConversacion']) document.getElementById(clave).addEventListener('change', async evento => {
    interruptoresEditados.add(clave);
    try { await chrome.storage.local.set({ [clave]: evento.target.checked }); }
    catch (_) { evento.target.checked = !evento.target.checked; avisoNombre('popup.noGuardo', true); }
});
const muestraNombre = document.getElementById('muestraNombreActivacion');
const anadirAlias = document.getElementById('anadirAliasActivacion');
let muestraOida = '', consultandoPrueba = false;
document.getElementById('probarNombreActivacion').addEventListener('click', async () => {
    muestraOida = ''; anadirAlias.disabled = true;
    try {
        const respuesta = await chrome.runtime.sendMessage({ accion: 'voz_probar_nombre' });
        if (!respuesta?.ok) { ponerTexto(muestraNombre, 'popup.activaVoz'); return; }
        consultandoPrueba = true; ponerTexto(muestraNombre, 'popup.diNombre');
    } catch (_) { ponerTexto(muestraNombre, 'popup.microNoConsulta'); }
});
const refrescoPrueba = setInterval(async () => {
    if (!consultandoPrueba) return;
    try {
        const respuesta = await chrome.runtime.sendMessage({ accion: 'voz_prueba_estado' });
        // La prueba dura 15 s: después las frases vuelven a ser órdenes, así que se avisa y se deja de consultar.
        if (respuesta?.caducada) { consultandoPrueba = false; ponerTexto(muestraNombre, 'popup.pruebaCaducada'); return; }
        if (typeof respuesta?.texto !== 'string') return;
        muestraOida = respuesta.texto; consultandoPrueba = false;
        delete muestraNombre.dataset.i18n;
        muestraNombre.textContent = muestraOida;
        anadirAlias.disabled = !validarNombreActivacion(muestraOida).ok;
    } catch (_) { consultandoPrueba = false; ponerTexto(muestraNombre, 'popup.microNoConsulta'); }
}, 500);
anadirAlias.addEventListener('click', async () => {
    const preferencias = await chrome.storage.local.get(['nombreActivacion', 'aliasActivacion']).catch(() => null);
    if (!preferencias) { avisoNombre('popup.noGuardo', true); return; }
    const validado = validarAliasActivacion([...(preferencias.aliasActivacion || []), muestraOida], preferencias.nombreActivacion);
    if (!validado.ok) { avisoNombre('popup.aliasInvalido', true); return; }
    try {
        await chrome.storage.local.set({ aliasActivacion: validado.alias });
        campoAlias.value = validado.alias.join('; '); anadirAlias.disabled = true; avisoNombre('popup.nombreGuardado');
    } catch (_) { avisoNombre('popup.noGuardo', true); }
});
window.addEventListener('pagehide', () => clearInterval(refrescoPrueba));
