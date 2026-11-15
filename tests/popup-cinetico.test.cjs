const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const codigo = fs.readFileSync(require('node:path').join(__dirname, '../popup.js'), 'utf8');
const fragmento = codigo.slice(codigo.indexOf('    let colaAjustesCineticos'), codigo.indexOf('    modoControl.addEventListener'));
let ajustes = { dwell: 1000, atraccion: true };
let fallar = false;
const chrome = { storage: { local: {
    async get() { const copia = { ...ajustes }; await new Promise(r => setTimeout(r, 5)); if (fallar) { fallar = false; throw Error('fallo'); } return { ajustesCineticos: copia }; },
    async set(valor) { ajustes = valor.ajustesCineticos; }
} } };
const contexto = vm.createContext({ chrome, mostrarEstadoPanel() {} });
vm.runInContext(fragmento + '\nglobalThis.guardar = guardarAjusteCinetico;', contexto);
(async () => {
    await Promise.all([contexto.guardar({ dwell: 1500 }, 'error'), contexto.guardar({ atraccion: false }, 'error')]);
    assert.deepEqual({ ...ajustes }, { dwell: 1500, atraccion: false });
    fallar = true;
    await Promise.all([contexto.guardar({ dwell: 2000 }, 'error'), contexto.guardar({ atraccion: true }, 'error')]);
    assert.deepEqual({ ...ajustes }, { dwell: 1500, atraccion: true });
    console.log('Ajustes cinéticos serializados y recuperación tras error: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
