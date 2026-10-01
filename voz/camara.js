// Única cámara de Completa. Vive con la voz en el origen de la extensión, no en cada sitio.
const camaraCentral = {
    deseada: false, procesar: false, iniciando: false, generacion: 0, flujo: null,
    trabajador: null, visionLista: false, ocupada: false, modo: 'automatico', fuente: null, permisoPendiente: false,
    configurar(datos) {
        this.procesar = Boolean(datos.procesar);
        this.cambiarModelo(datos);
        if (!datos.activa || datos.reintentar) this.permisoPendiente = false;
        this.deseada = Boolean(datos.activa);
        if (!this.deseada) this.detener();
        else if (!this.flujo && !this.iniciando && !this.permisoPendiente) this.iniciar();
    },
    cambiarModelo(datos) {
        if (['automatico', 'cabeza', 'torso', 'brazo_izquierdo', 'brazo_derecho', 'manos', 'zona'].includes(datos.modo)) this.modo = datos.modo;
        if (typeof datos.fuente === 'string' || datos.fuente === null) this.fuente = datos.fuente;
    },
    async iniciar() {
        const generacion = ++this.generacion;
        this.iniciando = true;
        try {
            const permiso = await navigator.permissions.query({ name: 'camera' });
            if (generacion !== this.generacion) return;
            if (permiso.state !== 'granted') {
                this.permisoPendiente = true;
                await chrome.runtime.sendMessage({ accion: 'camara_necesita_permiso' }); return;
            }
            const flujo = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
                width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30, max: 30 }
            } });
            if (!this.deseada || generacion !== this.generacion) { flujo.getTracks().forEach(pista => pista.stop()); return; }
            this.flujo = flujo;
            this.video = document.createElement('video'); this.video.muted = true; this.video.playsInline = true;
            this.video.srcObject = flujo; await this.video.play();
            if (generacion !== this.generacion) return;
            this.canvas = document.createElement('canvas'); this.canvas.width = 160; this.canvas.height = 120;
            this.contexto = this.canvas.getContext('2d', { willReadFrequently: true });
            this.ultimoVideo = -1;
            this.canvasVista = document.createElement('canvas'); this.canvasVista.width = 160; this.canvasVista.height = 120;
            this.contextoVista = this.canvasVista.getContext('2d');
            this.vistaOcupada = false; this.ultimoVideoVista = -1;
            this.previsualizar(generacion);
            this.trabajador = new Worker(chrome.runtime.getURL('vision/trabajador.js'));
            this.trabajador.onmessage = evento => {
                if (generacion !== this.generacion) return;
                const datos = evento.data;
                if (datos.tipo === 'listo') this.visionLista = true;
                else if (datos.tipo === 'puntos') { this.ocupada = false; this.publicar(datos); }
                else if (datos.tipo === 'error') { this.ocupada = false; this.informarError('Detección no disponible. Di control zona libre para usar textura.'); }
            };
            this.trabajador.onerror = () => {
                this.ocupada = false; this.visionLista = false;
                this.informarError('No se pudo cargar la detección local. Di control zona libre para usar textura.');
            };
            this.trabajador.postMessage({ tipo: 'iniciar' });
            flujo.getVideoTracks().forEach(pista => pista.addEventListener('ended', () => {
                if (generacion === this.generacion) { this.detener(); this.informarError('La cámara se desconectó. Comprueba la conexión y di activar cursor.'); }
            }));
            this.capturar(generacion);
        } catch (_) {
            if (generacion !== this.generacion) return;
            this.detener(); this.informarError('No se pudo iniciar la cámara de Adapta PE. Revisa su permiso o disponibilidad.');
        }
        finally { if (generacion === this.generacion) this.iniciando = false; }
    },
    informarError(texto) {
        if (texto === this.ultimoError) return;
        this.ultimoError = texto;
        chrome.runtime.sendMessage({ accion: 'camara_error', texto }).catch(() => {});
    },
    async capturar(generacion) {
        if (generacion !== this.generacion || !this.flujo) return;
        try {
            if (!this.procesar || this.ocupada || this.video.readyState < 2 || this.video.currentTime === this.ultimoVideo) return;
            this.ultimoVideo = this.video.currentTime;
            const tiempo = performance.now();
            if (this.modo === 'zona') {
                const contexto = this.contexto;
                contexto.setTransform(-1, 0, 0, 1, 160, 0); contexto.drawImage(this.video, 0, 0, 160, 120); contexto.resetTransform();
                const pixeles = contexto.getImageData(0, 0, 160, 120).data;
                const grises = Array.from({ length: 19200 }, (_, indice) => Math.round(pixeles[indice * 4] * 0.299 + pixeles[indice * 4 + 1] * 0.587 + pixeles[indice * 4 + 2] * 0.114));
                this.publicar({ tipo: 'puntos', tiempo, modo: 'zona', grises });
            } else if (this.visionLista) {
                this.ocupada = true;
                const escala = Math.min(320 / this.video.videoWidth, 240 / this.video.videoHeight);
                const imagen = await createImageBitmap(this.video, { resizeWidth: Math.max(1, Math.round(this.video.videoWidth * escala)),
                    resizeHeight: Math.max(1, Math.round(this.video.videoHeight * escala)) });
                if (generacion !== this.generacion) { imagen.close(); return; }
                this.trabajador.postMessage({ tipo: 'imagen', imagen, tiempo, modo: this.modo, fuente: this.fuente }, [imagen]);
            }
        } catch (_) { this.ocupada = false; }
        finally { if (generacion === this.generacion && this.flujo) this.temporizador = setTimeout(() => this.capturar(generacion), 50); }
    },
    publicar(datos) {
        if (!this.procesar || datos.modo !== this.modo || performance.now() - datos.tiempo > 500) return;
        this.ultimoError = null;
        const salida = { ...datos, edad: Math.max(0, performance.now() - datos.tiempo) };
        chrome.runtime.sendMessage({ accion: 'camara_fotograma', datos: salida }).catch(() => {});
    },
    previsualizar(generacion) {
        if (generacion !== this.generacion || !this.flujo) return;
        const mostrar = async () => {
            if (generacion !== this.generacion || !this.flujo) return;
            this.previsualizar(generacion);
            if (!this.procesar || this.vistaOcupada || this.video.readyState < 2 || this.video.currentTime === this.ultimoVideoVista) return;
            this.ultimoVideoVista = this.video.currentTime;
            this.vistaOcupada = true;
            try {
                this.contextoVista.setTransform(-1, 0, 0, 1, 160, 0);
                this.contextoVista.drawImage(this.video, 0, 0, 160, 120);
                this.contextoVista.resetTransform();
                const vista = this.canvasVista.toDataURL('image/jpeg', 0.55);
                await chrome.runtime.sendMessage({ accion: 'camara_vista', vista });
            } catch (_) {} // Una página cerrada no afecta al seguimiento.
            finally { if (generacion === this.generacion) this.vistaOcupada = false; }
        };
        // Offscreen no compone video visible: su vista no depende del compositor.
        this.temporizadorVista = setTimeout(mostrar, 1000 / 30);
    },
    detener() {
        ++this.generacion; clearTimeout(this.temporizador); clearTimeout(this.temporizadorVista);
        this.vistaOcupada = false;
        this.flujo?.getTracks().forEach(pista => pista.stop()); this.flujo = null;
        if (this.video) { this.video.pause(); this.video.srcObject = null; }
        this.trabajador?.terminate(); this.trabajador = null;
        this.iniciando = false; this.visionLista = false; this.ocupada = false;
    }
};
chrome.runtime.onMessage.addListener((datos, emisor, responder) => {
    if (emisor.id !== chrome.runtime.id || datos.destino !== 'voz_central') return;
    if (datos.accion === 'camara_configurar') { camaraCentral.configurar(datos); responder({ ok: true }); }
    if (datos.accion === 'camara_modelo') camaraCentral.cambiarModelo(datos);
});
window.addEventListener('pagehide', () => camaraCentral.detener());
