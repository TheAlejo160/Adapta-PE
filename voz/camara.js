// Única cámara de Completa. Vive con la voz en el origen de la extensión, no en cada sitio.
const camaraCentral = {
    deseada: false, procesar: false, iniciando: false, generacion: 0, flujo: null,
    trabajador: null, visionLista: false, ocupada: false, modo: 'cabeza', fuente: null, permisoPendiente: false, fallos: 0, reintentos: 0,
    configurar(datos) {
        this.procesar = Boolean(datos.procesar);
        this.cambiarModelo(datos);
        if (!datos.activa || datos.reintentar) this.permisoPendiente = false;
        this.deseada = Boolean(datos.activa);
        if (!this.deseada) this.detener();
        else if (!this.flujo && !this.iniciando && !this.permisoPendiente) this.iniciar();
    },
    cambiarModelo(datos) {
        if (['automatico', 'cabeza', 'torso', 'brazo_izquierdo', 'brazo_derecho', 'manos', 'zona', 'zona_izquierda', 'zona_derecha'].includes(datos.modo)) {
            if (datos.modo !== this.modo) this.carga = null; // Otro modelo tiene otro coste: volver a medir desde el detalle máximo.
            this.modo = datos.modo;
        }
        if (typeof datos.fuente === 'string' || datos.fuente === null) this.fuente = datos.fuente;
    },
    medirCarga(duracion) {
        // Carga adaptativa: equipos lentos reducen detalle y ceden CPU; equipos rápidos recuperan el máximo.
        const carga = this.carga ||= { nivel: 0, media: null, muestras: 0, descartar: true, reposoHasta: 0 };
        // La primera inferencia tras cambiar modelo o detalle incluye carga y calentamiento.
        if (carga.descartar || !(duracion >= 0 && duracion < 1000)) { carga.descartar = false; return; }
        carga.media = carga.media == null ? duracion : carga.media * 0.8 + duracion * 0.2;
        const maximo = this.detalle() === 2 ? 2 : 1; // Cabeza no baja de 240×180: el rostro pequeño dejaría de detectarse.
        if (++carga.muestras >= 5) {
            const nivel = carga.media > 90 ? Math.min(maximo, carga.nivel + 1) : carga.media < 40 ? Math.max(0, carga.nivel - 1) : carga.nivel;
            if (nivel !== carga.nivel) { this.carga = { nivel, media: null, muestras: 0, descartar: true, reposoHasta: 0 }; return; }
        }
        // Ciclo total <=180 ms con el tic de 50 ms: el cursor desarma el clic con saltos >200 ms.
        carga.reposoHasta = carga.media > 90 ? performance.now() + Math.max(0, Math.min(carga.media * 0.5, 130 - carga.media)) : 0;
    },
    detalle() { return ['manos', 'automatico', 'brazo_izquierdo', 'brazo_derecho'].includes(this.modo) ? 2 : 1; },
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
                width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 }
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
            this.crearTrabajador(generacion);
            flujo.getVideoTracks().forEach(pista => pista.addEventListener('ended', () => {
                if (generacion === this.generacion) { this.detener(); this.informarError('La cámara se desconectó. Comprueba la conexión y di activar cursor.', 'cinetico.error.desconectada'); }
            }));
            this.capturar(generacion);
        } catch (_) {
            if (generacion !== this.generacion) return;
            this.detener(); this.informarError('No se pudo iniciar la cámara de AdaptaPE. Revisa su permiso o disponibilidad.', 'cinetico.error.inicio');
        }
        finally { if (generacion === this.generacion) this.iniciando = false; }
    },
    crearTrabajador(generacion) {
        const trabajador = this.trabajador = new Worker(chrome.runtime.getURL('vision/trabajador.js'));
        trabajador.onmessage = evento => {
            if (generacion !== this.generacion || trabajador !== this.trabajador) return;
            const datos = evento.data;
            if (datos.tipo === 'listo') this.visionLista = true;
            else if (datos.tipo === 'puntos') {
                clearTimeout(this.limiteRespuesta);
                this.ocupada = false; this.fallos = 0; this.reintentos = 0;
                if (!datos.calentamiento) this.medirCarga(performance.now() - this.envio);
                this.publicar(datos);
            } else if (datos.tipo === 'error') this.fallarDeteccion(generacion);
        };
        trabajador.onerror = () => {
            if (generacion !== this.generacion || trabajador !== this.trabajador) return;
            this.informarError('No se pudo cargar la detección local. Di control zona libre para usar textura.', 'cinetico.error.carga');
            this.reiniciarTrabajador(generacion);
        };
        trabajador.postMessage({ tipo: 'iniciar' });
    },
    fallarDeteccion(generacion, sinRespuesta = false) {
        clearTimeout(this.limiteRespuesta);
        if (!sinRespuesta) this.ocupada = false;
        this.informarError('Detección no disponible. Di control zona libre para usar textura.', 'cinetico.error.deteccion');
        // Carga inicial fallida o WASM abortado (cada imagen vuelve a fallar): sin reintento la detección quedaría parada.
        if (!this.visionLista || ++this.fallos >= 3) this.reiniciarTrabajador(generacion);
    },
    reiniciarTrabajador(generacion) {
        clearTimeout(this.limiteRespuesta);
        this.trabajador?.terminate(); this.trabajador = null;
        this.visionLista = false; this.ocupada = false; this.fallos = 0;
        // Espera creciente (1 s … 30 s) para no recargar el runtime sin pausa si el fallo es permanente.
        const espera = Math.min(30000, 1000 * 2 ** this.reintentos++);
        clearTimeout(this.temporizadorTrabajador);
        this.temporizadorTrabajador = setTimeout(() => { if (generacion === this.generacion && this.flujo) this.crearTrabajador(generacion); }, espera);
    },
    // `clave` permite a la página mostrar el aviso en su idioma; `texto` queda como respaldo en español.
    informarError(texto, clave) {
        if (texto === this.ultimoError) return;
        this.ultimoError = texto;
        chrome.runtime.sendMessage({ accion: 'camara_error', texto, clave }).catch(() => {});
    },
    async capturar(generacion) {
        if (generacion !== this.generacion || !this.flujo) return;
        let imagen = null;
        try {
            if (!this.procesar || this.ocupada || this.video.readyState < 2 || this.video.currentTime === this.ultimoVideo) return;
            this.ultimoVideo = this.video.currentTime;
            const tiempo = performance.now();
            if (this.modo.startsWith('zona')) {
                const contexto = this.contexto;
                contexto.setTransform(-1, 0, 0, 1, 160, 0); contexto.drawImage(this.video, 0, 0, 160, 120); contexto.resetTransform();
                const pixeles = contexto.getImageData(0, 0, 160, 120).data;
                const grises = new Uint8Array(19200);
                for (let indice = 0; indice < 19200; indice++) grises[indice] = Math.round(pixeles[indice * 4] * 0.299 + pixeles[indice * 4 + 1] * 0.587 + pixeles[indice * 4 + 2] * 0.114);
                // Mensajes de runtime se serializan como JSON: base64 (25,6 kB) evita ~70 kB de números por imagen.
                this.publicar({ tipo: 'puntos', tiempo, modo: this.modo, grises: btoa(String.fromCharCode(...grises)) });
            } else if (this.visionLista && !(performance.now() < this.carga?.reposoHasta)) {
                this.ocupada = true;
                // Nunca supera 640×480 en extremidades ni 320×240 en cabeza; nunca amplía la cámara.
                const detalle = this.detalle() * [1, 0.75, 0.5][this.carga?.nivel || 0];
                const escala = Math.min(1, 320 * detalle / this.video.videoWidth, 240 * detalle / this.video.videoHeight);
                imagen = await createImageBitmap(this.video, { resizeWidth: Math.max(1, Math.round(this.video.videoWidth * escala)),
                    resizeHeight: Math.max(1, Math.round(this.video.videoHeight * escala)) });
                // El worker pudo reiniciarse durante la espera: liberar la imagen en vez de enviarla a ninguno.
                if (generacion !== this.generacion || !this.visionLista) { imagen.close(); return; }
                const trabajador = this.trabajador;
                trabajador.postMessage({ tipo: 'imagen', imagen, tiempo, modo: this.modo, fuente: this.fuente }, [imagen]);
                this.envio = performance.now();
                // Sin respuesta conservamos una sola imagen en vuelo, también si aún carga un modelo.
                // Tres esperas de 5 s recrean el worker y liberan la imagen transferida.
                clearTimeout(this.limiteRespuesta);
                const alAgotar = () => {
                    if (generacion !== this.generacion || trabajador !== this.trabajador || !this.ocupada) return;
                    this.fallarDeteccion(generacion, true);
                    if (trabajador === this.trabajador && this.ocupada) this.limiteRespuesta = setTimeout(alAgotar, 5000);
                };
                this.limiteRespuesta = setTimeout(alAgotar, 5000);
            }
        } catch (_) { imagen?.close(); this.ocupada = false; } // Transferida, close() no hace nada; si no, se libera.
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
        ++this.generacion; clearTimeout(this.temporizador); clearTimeout(this.temporizadorVista); clearTimeout(this.temporizadorTrabajador);
        clearTimeout(this.limiteRespuesta);
        this.vistaOcupada = false;
        this.flujo?.getTracks().forEach(pista => pista.stop()); this.flujo = null;
        if (this.video) { this.video.pause(); this.video.srcObject = null; }
        this.trabajador?.terminate(); this.trabajador = null;
        this.iniciando = false; this.visionLista = false; this.ocupada = false; this.fallos = 0; this.reintentos = 0;
    }
};
chrome.runtime.onMessage.addListener((datos, emisor, responder) => {
    if (emisor.id !== chrome.runtime.id || datos.destino !== 'voz_central') return;
    if (datos.accion === 'camara_configurar') { camaraCentral.configurar(datos); responder({ ok: true }); }
    if (datos.accion === 'camara_modelo') { camaraCentral.cambiarModelo(datos); responder({ ok: true }); }
});
window.addEventListener('pagehide', () => camaraCentral.detener());
