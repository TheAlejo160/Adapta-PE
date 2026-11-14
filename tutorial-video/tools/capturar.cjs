// Captura pantallas reales de AdaptaPE Base/Lite: node tutorial-video/tools/capturar.cjs
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawn } = require('node:child_process');
const BASE = path.resolve(__dirname, '../..'), LITE = path.resolve(BASE, '../lite');
const SALIDA = path.resolve(__dirname, '../composition/assets/capturas');
fs.mkdirSync(SALIDA, { recursive: true });
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'adapta-capturas-'));
fs.mkdirSync(path.join(perfil, 'Default'));
fs.writeFileSync(path.join(perfil, 'Default', 'Preferences'), JSON.stringify({ intl: { accept_languages: 'es-PE,es' } }));
const pausa = ms => new Promise(r => setTimeout(r, ms));
async function conectar(url) {
    const s = new WebSocket(url);
    await new Promise((a, b) => { s.addEventListener('open', a, { once: true }); s.addEventListener('error', b, { once: true }); });
    let i = 0; const pend = new Map();
    s.addEventListener('message', e => { const d = JSON.parse(e.data); if (d.id) { pend.get(d.id)?.(d); pend.delete(d.id); } });
    return { socket: s, pedir: (m, p = {}) => new Promise((ok, no) => {
        const id = ++i; const t = setTimeout(() => { pend.delete(id); no(new Error('CDP timeout ' + m)); }, 30000);
        pend.set(id, d => { clearTimeout(t); d.error ? no(new Error(d.error.message)) : ok(d.result); });
        s.send(JSON.stringify({ id, method: m, params: p }));
    }) };
}
const indice = [];
let chrome, nav, puerto;
async function abrir(url) {
    const t = await nav.pedir('Target.createTarget', { url: 'about:blank' });
    const lista = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
    const p = await conectar(lista.find(d => d.id === t.targetId).webSocketDebuggerUrl);
    p.id = t.targetId;
    await p.pedir('Runtime.enable'); await p.pedir('Page.enable');
    p.ev = async (expression) => { const r = await p.pedir('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'js'); return r.result.value; };
    p.ir = async (u) => { await p.pedir('Page.navigate', { url: u }); await pausa(300); for (let k = 0; k < 80; k++) { try { if (await p.ev('document.readyState') === 'complete') break; } catch {} await pausa(150); } await pausa(900); };
    if (url) await p.ir(url);
    return p;
}
async function cerrar(p) { try { p.socket.close(); await nav.pedir('Target.closeTarget', { targetId: p.id }); } catch {} }
async function fijar(p, w, h, esquema) {
    await p.pedir('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: false });
    await p.pedir('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: esquema }] });
}
async function foto(p, nombre, clip) {
    const r = await p.pedir('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? { clip: { ...clip, scale: 2 } } : {}) });
    fs.writeFileSync(path.join(SALIDA, nombre + '.png'), Buffer.from(r.data, 'base64'));
}
// Captura una página completa y registra rects (px de imagen = css*2) de los selectores dados.
async function pagina({ nombre, url, w, h, completa, prep, sel = [], recortes = [], esquemas = ['dark', 'light'], descripcion }) {
    for (const esq of esquemas) {
        const sufijo = esq === 'light' ? '-claro' : '';
        const p = await abrir();
        await fijar(p, w, h, esq);
        await p.ir(url);
        if (prep) { await p.ev(prep); await pausa(500); }
        let alto = h;
        if (completa) { alto = Math.ceil(await p.ev('Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)')); await fijar(p, w, alto, esq); await pausa(300); }
        await foto(p, nombre + sufijo);
        const rects = await p.ev(`(${JSON.stringify(sel)}).map(([s,e])=>{const n=document.querySelector(s);if(!n)return null;const r=n.getBoundingClientRect();
            const t=(n.matches('input,select')?(n.labels&&n.labels[0]?.innerText)||n.getAttribute('aria-label')||n.value:n.innerText||n.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,90);
            return {s,e:e||'',t,x:Math.round(r.x*2),y:Math.round((r.y+scrollY)*2),w:Math.round(r.width*2),h:Math.round(r.height*2),vis:r.width>0}})`);
        indice.push({ archivo: nombre + sufijo + '.png', ancho: w * 2, alto: alto * 2, descripcion, rects: rects.filter(Boolean) });
        if (esq === 'dark' || recortes.some(r => r[2])) for (const [rs, rn, tambienClaro] of recortes) {
            if (esq === 'light' && !tambienClaro) continue;
            const c = await p.ev(`(()=>{const n=document.querySelector(${JSON.stringify(rs)});if(!n)return null;const r=n.getBoundingClientRect();return{x:Math.max(0,r.x-8),y:Math.max(0,r.y+scrollY-8),width:r.width+16,height:r.height+16}})()`);
            if (c) { await foto(p, rn + sufijo, c); indice.push({ archivo: rn + sufijo + '.png', ancho: Math.round(c.width * 2), alto: Math.round(c.height * 2), descripcion: 'Recorte de ' + rs + ' (' + nombre + ')', rects: [] }); }
        }
        await cerrar(p);
    }
}
const abrirTodo = `document.querySelectorAll('details').forEach(d=>d.open=true);document.querySelectorAll('[hidden]').forEach(n=>{if(n.id==='hintGestos')n.hidden=false});`;
const selPopupBase = [['#checkTalkBack', 'interruptor Lectura en voz alta'], ['#checkVoz', 'interruptor Control por voz'], ['#selectIdiomaVoz', 'selector de idioma'], ['#selectDaltonismo', 'selector de filtro de color'], ['#checkOjos', 'interruptor Cursor con cámara'], ['#adapta-pe-modo-control', 'selector de modo de cámara (visible al expandir)'], ['#selectMascota', 'selector de mascota'], ['#hintVoz summary', 'Órdenes y micrófono'], ['#hintGestos summary', 'Cómo mover y hacer clic'], ['section[aria-labelledby=tituloMascota] summary', 'Cómo usar tu mascota']];
const recortesBase = [['section[aria-labelledby=tituloLectura]', 'popup-lectura', true], ['section[aria-labelledby=tituloVoz]', 'popup-voz', true], ['#hintVoz', 'popup-idioma', true], ['section[aria-labelledby=tituloFiltros]', 'popup-filtros', true], ['section[aria-labelledby=tituloCursor]', 'popup-cursor', true], ['#hintGestos', 'popup-modos-camara', true], ['section[aria-labelledby=tituloMascota]', 'popup-mascotas', true]];
(async () => {
    try {
        chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless', '--mute-audio', '--enable-unsafe-extension-debugging', '--use-fake-device-for-media-stream', '--no-first-run', '--no-default-browser-check', '--user-data-dir=' + perfil, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
        const ap = path.join(perfil, 'DevToolsActivePort');
        for (let i = 0; i < 60 && !fs.existsSync(ap); i++) await pausa(200);
        puerto = fs.readFileSync(ap, 'utf8').split('\n')[0];
        nav = await conectar((await (await fetch(`http://127.0.0.1:${puerto}/json/version`)).json()).webSocketDebuggerUrl);
        const b = (await nav.pedir('Extensions.loadUnpacked', { path: BASE })).id, l = (await nav.pedir('Extensions.loadUnpacked', { path: LITE })).id;
        console.log('ids', b, l);
        await pausa(2500);
        // Idioma español y estado limpio
        for (const id of [b, l]) { const p = await abrir(`chrome-extension://${id}/popup.html`); await p.ev(`chrome.storage.local.set({idiomaVoz:'es-PE'})`); await pausa(300); await cerrar(p); }
        const X = (id, f) => `chrome-extension://${id}/${f}`;
        await pagina({ nombre: 'base-popup', url: X(b, 'popup.html'), w: 400, h: 900, completa: true, sel: selPopupBase, recortes: [], descripcion: 'Popup Base, secciones colapsadas' });
        await pagina({ nombre: 'base-popup-completo', url: X(b, 'popup.html'), w: 400, h: 900, completa: true, prep: abrirTodo, sel: selPopupBase, recortes: recortesBase, esquemas: ['dark'], descripcion: 'Popup Base con detalles y modos de cámara expandidos' });
        await pagina({ nombre: 'lite-popup', url: X(l, 'popup.html'), w: 400, h: 900, completa: true, sel: selPopupBase.filter(s => !/Ojos|modo-control|hintGestos/.test(s[0])), descripcion: 'Popup Lite' });
        await pagina({ nombre: 'lite-popup-completo', url: X(l, 'popup.html'), w: 400, h: 900, completa: true, prep: abrirTodo, esquemas: ['dark'], descripcion: 'Popup Lite expandido', sel: [['#checkVoz', 'Control por voz'], ['#selectIdiomaVoz', 'idioma'], ['#selectDaltonismo', 'filtro'], ['#selectMascota', 'mascota']] });
        const selB = [['#checkVoz', 'Control por voz'], ['#checkOjos', 'Cursor con cámara'], ['#checkTalkBack', 'Lectura en voz alta'], ['h1', 'título']];
        await pagina({ nombre: 'base-bienvenida', url: X(b, 'bienvenida.html'), w: 1440, h: 900, sel: selB, descripcion: 'Bienvenida Base' });
        await pagina({ nombre: 'lite-bienvenida', url: X(l, 'bienvenida.html'), w: 1440, h: 900, sel: selB, descripcion: 'Bienvenida Lite' });
        const selP = [['#adapta-pe-permitir-microfono', 'botón principal'], ['h1', 'título']];
        await pagina({ nombre: 'base-permisos-voz', url: X(b, 'voz/permisos.html'), w: 1440, h: 900, sel: selP, descripcion: 'Permiso de micrófono (Base)' });
        await pagina({ nombre: 'base-permisos-camara', url: X(b, 'voz/permisos.html?dispositivo=camara'), w: 1440, h: 900, sel: selP, descripcion: 'Permiso de cámara (Base)' });
        await pagina({ nombre: 'lite-permisos-voz', url: X(l, 'voz/permisos.html'), w: 1440, h: 900, sel: selP, descripcion: 'Permiso de micrófono (Lite)' });
        const selN = [['#adapta-pe-ntp-personalizar', 'botón Personalizar'], ['input[type=search],input[type=text]', 'barra de búsqueda'], ['h1', 'título']];
        await pagina({ nombre: 'base-nueva-pestana', url: X(b, 'nueva_pestana.html'), w: 1920, h: 1080, sel: selN, descripcion: 'Nueva pestaña Base' });
        await pagina({ nombre: 'lite-nueva-pestana', url: X(l, 'nueva_pestana.html'), w: 1920, h: 1080, sel: selN, descripcion: 'Nueva pestaña Lite' });
        const selT = [['#adapta-pe-ntp-panel', 'panel Personalizar'], ['.ntp-temas', 'temas'], ['#adapta-pe-ntp-acento-tema', 'Usar el color del tema']];
        await pagina({ nombre: 'base-nueva-pestana-temas', url: X(b, 'nueva_pestana.html'), w: 1920, h: 1080, completa: true, prep: `document.getElementById('adapta-pe-ntp-personalizar').click()`, sel: selT, descripcion: 'Nueva pestaña Base con panel de temas abierto' });
        // Web real con filtro
        try {
            for (const tipo of ['deuteranopia', 'acromatopsia']) {
                const adm = await abrir(X(b, 'popup.html')); await adm.ev(`chrome.storage.local.set({daltonismo:'${tipo}'})`); await pausa(300);
                const w = await abrir(); await fijar(w, 1440, 900, 'light'); await w.ir('https://es.wikipedia.org/wiki/Machu_Picchu'); await pausa(2500);
                const ok = await w.ev(`document.documentElement.innerText.length>500`);
                if (ok) { await foto(w, 'base-wikipedia-filtro-' + tipo); indice.push({ archivo: `base-wikipedia-filtro-${tipo}.png`, ancho: 2880, alto: 1800, descripcion: 'es.wikipedia.org con filtro ' + tipo, rects: [] }); }
                await cerrar(w); await cerrar(adm);
            }
            const adm = await abrir(X(b, 'popup.html')); await adm.ev(`chrome.storage.local.set({daltonismo:'ninguno'})`); await cerrar(adm);
        } catch (e) { console.log('wikipedia omitida', e.message); }
        // INDICE.md
        let md = '# Índice de capturas\n\nGeneradas con tutorial-video/tools/capturar.cjs. Coordenadas en px de la imagen (CSS x2, devicePixelRatio 2); x,y = esquina superior izquierda, w×h = tamaño. Sufijo -claro = esquema claro del sistema.\n\n';
        for (const c of indice) {
            md += `## ${c.archivo}\n- Tamaño: ${c.ancho}×${c.alto} px\n- Muestra: ${c.descripcion}\n`;
            if (c.rects.length) { md += '- Controles (etiqueta exacta · rol · x,y,w,h):\n'; for (const r of c.rects) md += `  - «${r.t}» · ${r.e || r.s} · ${r.vis ? `${r.x},${r.y},${r.w},${r.h}` : 'oculto en esta captura'}\n`; }
            md += '\n';
        }
        fs.writeFileSync(path.join(SALIDA, 'INDICE.md'), md);
        console.log('listo', indice.length);
    } catch (e) { console.error(e); process.exitCode = 1; }
    finally { try { nav?.socket.close(); } catch {} chrome?.kill(); await pausa(800); fs.rmSync(perfil, { recursive: true, force: true }); }
})();
