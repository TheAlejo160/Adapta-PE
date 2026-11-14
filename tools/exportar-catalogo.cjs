// Datos de referencia para reimplementaciones nativas. No se carga desde el manifest.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

function catalogo(raiz) {
    const clases = fs.existsSync(path.join(raiz, 'classes/VoiceAssistant.js')) ? 'classes' : 'clases';
    const huellas = {};
    const leer = archivo => {
        const contenido = fs.readFileSync(path.join(raiz, archivo), 'utf8');
        huellas[archivo.replace(clases + '/', 'asistente/')] = createHash('sha256').update(contenido).digest('hex');
        return contenido;
    };
    const contexto = vm.createContext({});
    vm.runInContext(leer('sitios.js'), contexto, { timeout: 1000 });
    const textos = {};
    for (const [modulo, archivo] of Object.entries({ voz: clases + '/VoiceAssistant.js', paginas: 'textos_paginas.js', mascota: 'mascotas/Mascota.js' })) {
        // Interrumpir en el registro evita inicializar DOM, sensores o servicios del navegador.
        const registrado = {};
        const captura = vm.createContext({ TextosAdapta: { definir(dato) { textos[modulo] = dato; throw registrado; } } });
        try { vm.runInContext(leer(archivo), captura, { timeout: 1000 }); }
        catch (error) { if (error !== registrado) throw error; }
        if (!textos[modulo]) throw new Error('No se registraron textos: ' + archivo);
    }
    const casos = JSON.parse(leer('tests/fixtures/voz-paridad.json'));
    const casosActivacion = JSON.parse(leer('tests/fixtures/activacion-paridad.json'));
    const idiomas = Object.fromEntries(Object.entries(contexto.IdiomasVoz).map(([codigo, datos]) => [codigo, {
        ...datos, reglas: datos.frases.map(([patron, reemplazo]) => ({ patron: patron.source, flags: patron.flags, reemplazo }))
    }]));
    return {
        schemaVersion: 1,
        origen: { autor: 'Rodrigo Alejandro Apcho Aliaga (TheAlejo160)', licencia: 'CC-BY-NC-SA-4.0', base: '13.0', lite: '3.0', sha256: huellas },
        codigos: contexto.CodigosVoz,
        idiomas,
        activacion: { ...contexto.ParidadVoz.activacion, reservadas: contexto.reservadasNombreActivacion() },
        tolerancia: contexto.ParidadVoz.tolerancia,
        // Secuencia del tutorial; sus textos son las claves `tutorial.<id>.titulo|texto` de textos.paginas.
        tutorial: contexto.ParidadVoz.tutorial,
        comportamiento: { ...contexto.ParidadVoz.comportamiento, confirmaciones: contexto.ParidadVoz.confirmaciones },
        sitios: contexto.SitiosVoz,
        textos,
        casos, casosActivacion
    };
}

function serializar(datos) {
    return JSON.stringify(datos, (_, valor) => Object.prototype.toString.call(valor) === '[object RegExp]'
        ? { patron: valor.source, flags: valor.flags } : valor, 2) + '\n';
}

if (require.main === module) {
    const argumentos = process.argv.slice(2);
    if (argumentos.length > 1 || (argumentos.length === 1 && argumentos[0] !== '--check')) {
        console.error('Uso: node tools/exportar-catalogo.cjs [--check]'); process.exit(2);
    }
    const raiz = path.resolve(__dirname, '..');
    const destino = path.join(raiz, 'catalogos/nativo-v1.json');
    const contenido = serializar(catalogo(raiz));
    const archivos = ['catalogos/nativo-v1.json', 'tests/fixtures/voz-paridad.json', 'tests/fixtures/activacion-paridad.json'];
    const huellas = archivos.map(archivo => createHash('sha256').update(archivo === archivos[0] ? contenido : fs.readFileSync(path.join(raiz, archivo))).digest('hex') + '  ' + archivo).join('\n') + '\n';
    const destinoHuellas = path.join(raiz, 'catalogos/SHA256SUMS');
    if (argumentos[0] === '--check') {
        if (!fs.existsSync(destino) || fs.readFileSync(destino, 'utf8') !== contenido) {
            console.error('Catálogo desactualizado. Ejecuta node tools/exportar-catalogo.cjs'); process.exit(1);
        }
        if (!fs.existsSync(destinoHuellas) || fs.readFileSync(destinoHuellas, 'utf8') !== huellas) {
            console.error('Huellas desactualizadas. Ejecuta node tools/exportar-catalogo.cjs'); process.exit(1);
        }
        console.log('Catálogo nativo v1 vigente.');
    } else {
        fs.mkdirSync(path.dirname(destino), { recursive: true });
        fs.writeFileSync(destino, contenido);
        fs.writeFileSync(destinoHuellas, huellas);
        console.log('Generado catalogos/nativo-v1.json');
    }
}
module.exports = { catalogo, serializar };
