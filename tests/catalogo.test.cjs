// Exportación reproducible y casos compartidos con las aplicaciones nativas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const raiz = path.resolve(__dirname, '..');
const { catalogo, serializar } = require('../tools/exportar-catalogo.cjs');
const idiomas = ['es', 'en', 'pt', 'de', 'fr', 'it'];
const soloBase = process.argv.includes('--solo-base');
if (soloBase) console.log('Sólo Base: identidad con Lite pendiente del orquestador.');

function cargar(carpeta) {
    const clases = fs.existsSync(path.join(carpeta, 'classes/VoiceAssistant.js')) ? 'classes' : 'clases';
    const contexto = vm.createContext({ TextosAdapta: { definir() {}, t() {} } });
    for (const archivo of ['sitios.js', clases + '/VoiceAssistant.js']) {
        vm.runInContext(fs.readFileSync(path.join(carpeta, archivo), 'utf8'), contexto, { timeout: 1000 });
    }
    return contexto;
}

const base = catalogo(raiz);
const serializado = serializar(base);
assert.equal(serializar(catalogo(raiz)), serializado, 'La exportación debe ser determinista');
const exportado = JSON.parse(serializado);
assert.equal(exportado.schemaVersion, 1);
assert.deepEqual(Object.keys(exportado.idiomas), idiomas);
assert.equal(exportado.origen.licencia, 'CC-BY-NC-SA-4.0');
assert.equal(exportado.sitios.youtube.inicio, 'https://www.youtube.com/');

for (const carpeta of soloBase ? [raiz] : [raiz, path.resolve(raiz, '../lite')]) {
    execFileSync(process.execPath, [path.join(carpeta, 'tools/exportar-catalogo.cjs'), '--check']);
    assert.equal(serializar(catalogo(carpeta)), serializado, 'Base y Lite deben exportar los mismos datos comunes');
    const contexto = cargar(carpeta);
    for (const { idioma, texto, canonica } of exportado.casos) {
        assert.equal(contexto.VoiceAssistant.prepararComando(texto, idioma), canonica, idioma + ': ' + texto);
        assert.equal(contexto.VoiceAssistant.prepararComando(canonica), canonica, 'Orden canónica idempotente: ' + canonica);
    }
    for (const idioma of idiomas) {
        assert.ok(exportado.casos.some(caso => caso.idioma === idioma));
        const original = contexto.IdiomasVoz[idioma];
        for (const clave of ['envoltorios', 'finales', 'pestanaNueva', 'ventanaNueva']) {
            if (!original[clave]) continue;
            const dato = exportado.idiomas[idioma][clave];
            const reconstruido = new RegExp(dato.patron, dato.flags);
            assert.equal(reconstruido.source, original[clave].source);
            assert.equal(reconstruido.flags, original[clave].flags);
        }
        const reglas = exportado.idiomas[idioma].frases;
        assert.equal(reglas.length, original.frases.length);
        reglas.forEach(([patron, reemplazo], indice) => {
            assert.equal(new RegExp(patron.patron, patron.flags).source, original.frases[indice][0].source);
            assert.equal(reemplazo, original.frases[indice][1]);
        });
        assert.deepEqual(exportado.idiomas[idioma].reglas, reglas.map(([patron, reemplazo]) => ({ ...patron, reemplazo })));
    }
}

const variables = texto => [...texto.matchAll(/\{(\w+)\}/g)].map(coincidencia => coincidencia[1]).sort();
for (const [modulo, textos] of Object.entries(exportado.textos)) {
    for (const idioma of idiomas) {
        assert.ok(Object.keys(textos[idioma]).length > 0);
        for (const [clave, castellano] of Object.entries(textos.es)) {
            assert.equal(typeof textos[idioma][clave], 'string', modulo + '/' + idioma + '/' + clave);
            assert.deepEqual(variables(textos[idioma][clave]), variables(castellano), 'Variables: ' + idioma + '/' + clave);
        }
    }
}
// Tutorial: la misma secuencia en el catálogo, en los textos de seis idiomas y en el HTML de cada variante;
// las órdenes que enseña cada texto llegan a la orden canónica del parser.
assert.deepEqual(exportado.tutorial.pasos.map(paso => paso.id), ['voz', 'nombre', 'baja', 'selecciona', 'clic', 'filtro', 'cursor', 'reabrir']);
assert.deepEqual(exportado.tutorial.pasos.filter(paso => paso.soloBase).map(paso => paso.id), ['cursor']);
const codigos = { es: 'es-PE', en: 'en-US', pt: 'pt-BR', de: 'de-DE', fr: 'fr-FR', it: 'it-IT' };
const parser = cargar(raiz).VoiceAssistant.prepararComando;
for (const paso of exportado.tutorial.pasos) for (const idioma of idiomas) {
    for (const parte of ['titulo', 'texto']) assert.ok(exportado.textos.paginas[idioma][`tutorial.${paso.id}.${parte}`], `${idioma}/tutorial.${paso.id}.${parte}`);
    if (!paso.orden) continue;
    const citada = /[«“„]\s*\{palabra\},\s*(.+?)\s*[»”“]/.exec(exportado.textos.paginas[idioma][`tutorial.${paso.id}.texto`]);
    assert.ok(citada, `${idioma}/${paso.id}: la orden entre comillas`);
    const esperada = paso.id === 'selecciona' ? `selecciona ${exportado.textos.paginas[idioma]['tutorial.objetivo']}` : paso.orden;
    assert.equal(parser(citada[1], codigos[idioma]), esperada, `${idioma}/${paso.id}: «${citada[1]}»`);
}
for (const [carpeta, esBase] of soloBase ? [[raiz, true]] : [[raiz, true], [path.resolve(raiz, '../lite'), false]]) {
    const html = fs.readFileSync(path.join(carpeta, 'bienvenida.html'), 'utf8');
    assert.deepEqual([...html.matchAll(/data-paso="(\w+)"/g)].map(coincidencia => coincidencia[1]),
        exportado.tutorial.pasos.filter(paso => esBase || !paso.soloBase).map(paso => paso.id), 'Pasos del tutorial en ' + path.basename(carpeta));
}
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptape-catalogo-'));
try {
    for (const archivo of ['tools/exportar-catalogo.cjs', 'sitios.js', 'classes/VoiceAssistant.js', 'textos_paginas.js', 'mascotas/Mascota.js', 'tests/fixtures/voz-paridad.json', 'tests/fixtures/activacion-paridad.json']) {
        const destino = path.join(temporal, archivo);
        fs.mkdirSync(path.dirname(destino), { recursive: true });
        fs.copyFileSync(path.join(raiz, archivo), destino);
    }
    const ejecutar = (...argumentos) => execFileSync(process.execPath, [path.join(temporal, 'tools/exportar-catalogo.cjs'), ...argumentos], { stdio: 'pipe' });
    assert.throws(() => ejecutar('--check'), error => error.status === 1, 'Detectar catálogo ausente');
    ejecutar();
    ejecutar('--check');
    fs.appendFileSync(path.join(temporal, 'sitios.js'), '\n// Cambio local de prueba.\n');
    assert.throws(() => ejecutar('--check'), error => error.status === 1, 'Detectar cambios de fuente');
    assert.throws(() => ejecutar('--otro'), error => error.status === 2, 'Rechazar argumentos desconocidos');
} finally { fs.rmSync(temporal, { recursive: true, force: true }); }
console.log('Catálogo v1: seis idiomas, ' + exportado.casos.length + ' casos en Base/Lite, reglas y variables conservadas.');
