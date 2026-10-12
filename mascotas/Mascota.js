(() => {
const nombres = { tinku: 'Tinku', cuchu: 'Cuchu', yati: 'Yati' };
const textos = {
    es: { 'mascota.mover': 'Mover {nombre}: arrastra o usa las flechas del teclado', 'mascota.errorCarga': 'No se cargó. Elige otra mascota y vuelve a ésta.',
        'mascota.errorPosicion': 'No se guardó la posición. Vuelve a mover la mascota.' },
    en: { 'mascota.mover': 'Move {nombre}: drag or use the arrow keys', 'mascota.errorCarga': 'It did not load. Choose another pet and come back to this one.',
        'mascota.errorPosicion': 'Position not saved. Move the pet again.' },
    pt: { 'mascota.mover': 'Mover {nombre}: arraste ou use as setas do teclado', 'mascota.errorCarga': 'Não carregou. Escolha outro mascote e volte a este.',
        'mascota.errorPosicion': 'A posição não foi salva. Mova o mascote de novo.' },
    de: { 'mascota.mover': '{nombre} verschieben: ziehen oder die Pfeiltasten verwenden', 'mascota.errorCarga': 'Nicht geladen. Wähle ein anderes Maskottchen und dann wieder dieses.',
        'mascota.errorPosicion': 'Position nicht gespeichert. Verschiebe das Maskottchen erneut.' },
    fr: { 'mascota.mover': 'Déplacer {nombre} : faites glisser ou utilisez les flèches du clavier', 'mascota.errorCarga': 'Chargement échoué. Choisissez une autre mascotte puis revenez à celle-ci.',
        'mascota.errorPosicion': 'Position non enregistrée. Déplacez de nouveau la mascotte.' },
    it: { 'mascota.mover': 'Sposta {nombre}: trascina o usa le frecce della tastiera', 'mascota.errorCarga': 'Non caricata. Scegli un’altra mascotte e poi torna a questa.',
        'mascota.errorPosicion': 'Posizione non salvata. Sposta di nuovo la mascotte.' },
};
globalThis.TextosAdapta?.definir(textos);
const t = (clave, variables = {}) => globalThis.TextosAdapta ? globalThis.TextosAdapta.t(clave, variables) :
    textos.es[clave].replace(/\{(\w+)\}/g, (_, nombre) => variables[nombre] ?? '');
// Estado del reconocedor (VoiceAssistant.alEstado) a reacción de la mascota, sin depender del idioma del texto.
const reaccionesVoz = { error: 'confused', espera: 'look', escucha: 'talk', activa: 'idle' };
class Mascota {
    constructor() {
        this.nombre = 'ninguna'; this.visible = false; this.prioridad = false; this.generacion = 0;
        this.estado = 'idle'; this.hablando = false; this.posicion = { x: 1, y: 1 };
        this.alCursor = evento => {
            if (!this.visible || this.arrastre || !this.motor) return;
            this.motor.lookAt(evento.clientX, evento.clientY);
            // Con followCursor:false el SDK nunca devuelve la mirada y el reposo queda congelado en un frame.
            clearTimeout(this.finMirada);
            this.finMirada = setTimeout(() => this.motor?.setFollowCursor(false), 1500);
        };
        this.alResize = () => this.colocar();
        this.alArrastrar = evento => {
            if (this.arrastre?.id === evento.pointerId) this.moverA(evento.clientX - this.arrastre.x, evento.clientY - this.arrastre.y);
        };
        this.alSoltar = () => { if (this.arrastre) { this.arrastre = null; this.guardarPosicion(); } };
        document.addEventListener('mousemove', this.alCursor, { capture: true, passive: true });
        document.addEventListener('pointermove', this.alArrastrar, true);
        document.addEventListener('pointerup', this.alSoltar, true);
        document.addEventListener('pointercancel', this.alSoltar, true);
        window.addEventListener('resize', this.alResize, { passive: true });
    }

    async configurar(nombre, posicion) {
        if (posicion && Number.isFinite(posicion.x) && Number.isFinite(posicion.y)) {
            this.posicion = { x: Math.max(0, Math.min(1, posicion.x)), y: Math.max(0, Math.min(1, posicion.y)) };
            if (!this.arrastre) this.colocar();
        }
        nombre = Object.hasOwn(nombres, nombre) ? nombre : 'ninguna';
        if (nombre === this.nombre && (this.host || nombre === 'ninguna' || !this.visible)) return;
        this.nombre = nombre;
        const generacion = ++this.generacion;
        this.motor?.destroy(); this.motor = null; this.host?.remove(); this.host = null;
        this.estado = 'idle'; this.hablando = false; this.arrastre = null;
        if (nombre === 'ninguna' || this.destruida || !this.visible) return;
        const host = document.createElement('div');
        host.id = 'adapta-pe-mascota-' + chrome.runtime.id;
        host.style.cssText = 'all:initial;position:fixed;width:96px;z-index:2147483646;pointer-events:none';
        host.hidden = !this.visible;
        const raiz = host.attachShadow({ mode: 'closed' });
        const estilo = document.createElement('style');
        estilo.textContent = `
            :host([hidden]) { display:none !important; }
            button { box-sizing:border-box; display:flex; align-items:center; justify-content:center;
                gap:4px; width:96px; min-height:44px; padding:4px; border:1px solid #69777e;
                border-radius:6px; background:#fff; color:#293239; font:14px/1.4 system-ui,sans-serif;
                pointer-events:auto; cursor:grab; touch-action:none; }
            button:hover { background:#edf0f2; }
            button:focus-visible { outline:3px solid #bd0611; outline-offset:3px; }
            svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.8; }
            p { margin:0; padding:4px; background:#fff; color:#293239; font:13px/1.4 system-ui,sans-serif; }
        `;
        const dibujo = document.createElement('div');
        dibujo.style.minHeight = '112px';
        const mover = this.botonMover = document.createElement('button');
        mover.type = 'button';
        this.avisoCarga = null; this.actualizarTextos();
        mover.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4"/></svg>';
        mover.append(document.createTextNode(nombres[nombre]));
        raiz.append(estilo, dibujo, mover); this.host = host;
        document.body.append(host); this.colocar();
        mover.addEventListener('pointerdown', evento => {
            if (evento.button !== 0) return;
            const rect = host.getBoundingClientRect();
            this.arrastre = { id: evento.pointerId, x: evento.clientX - rect.left, y: evento.clientY - rect.top };
            mover.setPointerCapture(evento.pointerId);
        });
        mover.addEventListener('lostpointercapture', this.alSoltar);
        mover.addEventListener('keydown', evento => {
            const pasos = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] };
            if (!pasos[evento.key]) return;
            evento.preventDefault();
            const rect = host.getBoundingClientRect(), [x, y] = pasos[evento.key];
            this.moverA(rect.left + x, rect.top + y); this.guardarPosicion();
        });
        try {
            const { createMascot } = await import(chrome.runtime.getURL('mascotas/motor.js'));
            if (this.destruida || generacion !== this.generacion) return;
            const motor = await createMascot(dibujo, { mascot: { tinku: 'gallito', cuchu: 'cuy', yati: 'llama' }[nombre],
                assetBaseURL: chrome.runtime.getURL('mascotas/' + nombre + '/'), size: 96,
                label: nombres[nombre], followCursor: false, reducedMotion: 'system' });
            if (this.destruida || generacion !== this.generacion) { motor.destroy(); return; }
            this.motor = motor; motor.setState(this.estado);
            if (!this.visible) motor.pause();
            this.colocar();
        } catch (_) {
            if (this.destruida || generacion !== this.generacion) return;
            const aviso = this.avisoCarga = document.createElement('p'); aviso.setAttribute('role', 'status');
            aviso.textContent = t('mascota.errorCarga');
            dibujo.append(aviso); this.colocar();
        }
    }

    colocar() {
        if (!this.host) return;
        const { width, height } = this.host.getBoundingClientRect();
        this.host.style.left = Math.round(this.posicion.x * Math.max(0, innerWidth - width - 32) + 16) + 'px';
        this.host.style.top = Math.round(this.posicion.y * Math.max(0, innerHeight - height - 32) + 16) + 'px';
    }

    moverA(x, y) {
        const { width, height } = this.host.getBoundingClientRect();
        this.posicion = { x: Math.max(0, Math.min(1, (x - 16) / Math.max(1, innerWidth - width - 32))),
            y: Math.max(0, Math.min(1, (y - 16) / Math.max(1, innerHeight - height - 32))) };
        this.colocar();
    }

    guardarPosicion() {
        chrome.storage.local.set({ posicionMascota: this.posicion }).catch(() => {
            this.motor?.confuse(t('mascota.errorPosicion'));
        });
    }

    actualizarVisibilidad(visible) {
        if (this.visible === visible) return;
        this.visible = visible;
        if (this.host) this.host.hidden = !visible;
        if (visible) { this.configurar(this.nombre, this.posicion); this.colocar(); }
        else {
            ++this.generacion; this.arrastre = null; this.hablando = false; this.estado = 'idle';
            clearTimeout(this.finMirada); clearTimeout(this.finHabla);
            this.motor?.destroy(); this.motor = null; this.host?.remove(); this.host = null;
        }
    }

    reaccionar(estado, hablando) {
        if (!this.visible || !['idle', 'look', 'sleep', 'wake', 'read', 'talk', 'confused', 'happy', 'wave'].includes(estado)) return;
        if (typeof hablando === 'boolean') {
            this.hablando = hablando;
            // Si el fin de TTS nunca llega (worker reiniciado, voz interrumpida), no quedar hablando para siempre.
            clearTimeout(this.finHabla);
            if (hablando) this.finHabla = setTimeout(() => this.reaccionar('idle', false), 60000);
        } else if (this.hablando) return;
        this.estado = estado; this.motor?.setState(estado);
    }

    // La mascota se anima en toda pestaña visible: perder el cursor no la congela. rAF ya se detiene en pestañas ocultas.
    actualizarPrioridad(prioridad) {
        this.prioridad = prioridad;
    }

    // `tipo` llega de VoiceAssistant: 'error' | 'espera' | 'escucha' | 'activa'; el texto ya está traducido.
    estadoVoz(texto, tipo) {
        if (Object.hasOwn(reaccionesVoz, tipo) && !(tipo === 'activa' && this.estado === 'sleep')) this.reaccionar(reaccionesVoz[tipo]);
    }

    // Cambio de idioma en vivo: rótulo del botón y aviso de carga, sin recrear sprites.
    actualizarTextos() {
        if (this.botonMover) this.botonMover.title = this.botonMover.ariaLabel = t('mascota.mover', { nombre: nombres[this.nombre] });
        if (this.avisoCarga) this.avisoCarga.textContent = t('mascota.errorCarga');
    }

    destruir() {
        this.destruida = true; ++this.generacion; clearTimeout(this.finMirada); clearTimeout(this.finHabla);
        this.motor?.destroy(); this.motor = null; this.host?.remove(); this.host = null;
        document.removeEventListener('mousemove', this.alCursor, true); window.removeEventListener('resize', this.alResize);
        document.removeEventListener('pointermove', this.alArrastrar, true);
        document.removeEventListener('pointerup', this.alSoltar, true);
        document.removeEventListener('pointercancel', this.alSoltar, true);
    }
}
globalThis.Mascota = Mascota;
})();
