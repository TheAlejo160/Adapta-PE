(() => {
class KineticEngine {
    constructor() {
        this.permitida = false;
        this.visible = !document.hidden;
        this.activa = false;
        this.iniciando = false;
        this.bloqueada = false;
        this.generacion = 0;
        this.animationId = null;
        this.posX = window.innerWidth / 2;
        this.posY = window.innerHeight / 2;
        this.ancho = 160;
        this.alto = 120;
        this.grises = new Float32Array(this.ancho * this.alto);
        this.puntoBase = { x: this.ancho / 2, y: this.alto / 2 };
        this.origenControl = { ...this.puntoBase };
        this.puntoActual = { ...this.origenControl };
        this.puntoSuave = { ...this.puntoBase };
        this.plantilla = null;
        this.radioPlantilla = 12;
        this.zonaMuerta = 0.045;
        this.modoControl = 'automatico';
        this.fuenteControl = null;
        this.neutroListo = false;
        this.muestrasPostura = [];
        this.ultimaPostura = null;
        this.perdidaDesde = null;
        this.reposoBorde = null;
        this.historialMovimiento = [];
        this.ultimoMovimiento = null;
        this.deteccion = null;
        this.zonaAtraccion = 0.065;
        this.duracionClick = 1000; // Milisegundos reales, independiente del monitor/cámara.
        this.velocidadMaxima = 650; // Píxeles por segundo.
        this.sensibilidad = 1;
        this.amplitudControl = 1;
        this.inicioFijacion = null;
        this.objetivoFijado = null;
        this.armado = false;
        this.inicioArmado = null;
        this.enZonaSegura = false;
        this.tipoClick = 'izquierdo';
        this.pausada = false;
        this.ultimoTiempo = null;
        this.ultimoVideo = -1;
        this.numeroFotograma = 0;
        this.fiableDesde = null;
        this.elementoHover = null;
        this.bucleRender = this.bucleRender.bind(this);
    }

    setEstado(estado) {
        if (Boolean(estado) !== this.permitida) this.bloqueada = false;
        this.permitida = Boolean(estado);
        this.evaluarEstado();
    }

    actualizarVisibilidad(visible) {
        this.visible = Boolean(visible);
        this.evaluarEstado();
    }

    evaluarEstado() {
        if (this.permitida && this.visible) {
            if (!this.activa && !this.iniciando && !this.bloqueada) this.iniciarCamara();
        } else this.detenerCamara();
    }

    aplicarAjustes(ajustes) {
        if (!ajustes || typeof ajustes !== 'object') return;
        const modoAnterior = this.modoControl, amplitudAnterior = this.amplitudControl;
        if (['automatico', 'cabeza', 'torso', 'brazo_izquierdo', 'brazo_derecho', 'manos', 'zona'].includes(ajustes.modo)) this.modoControl = ajustes.modo;
        if (typeof ajustes.temblor === 'boolean') this.zonaMuerta = ajustes.temblor ? 0.07 : 0.045;
        this.zonaAtraccion = this.zonaMuerta + 0.02;
        if (Number.isFinite(ajustes.velocidad)) this.sensibilidad = Math.max(0.3, Math.min(2, ajustes.velocidad));
        if ([0.55, 1].includes(ajustes.amplitud)) this.amplitudControl = ajustes.amplitud;
        if (this.activa && (modoAnterior !== this.modoControl || amplitudAnterior !== this.amplitudControl)) {
            this.fuenteControl = null;
            this.deteccion = null;
            this.calibrar();
        }
    }

    guardarAjustes() {
        // Guardar preferencias, nunca imágenes ni la postura física de una persona.
        chrome.storage.local.set({ ajustesCineticos: { modo: this.modoControl, temblor: this.zonaMuerta > 0.05,
            velocidad: this.sensibilidad, amplitud: this.amplitudControl } }).catch(() => {});
    }

    iniciarCamara() {
        ++this.generacion;
        this.crearInterfaz();
        this.activa = true; this.iniciando = false;
        this.numeroFotograma = 0; this.ultimoVideo = -1; this.ultimoTiempo = null;
        this.deteccion = null; this.grisesRecibidos = false;
        this.puntoActual = { ...this.puntoBase };
        this.calibrar(); this.pausada = false; this.tipoClick = 'izquierdo';
        this.modeloEnviado = null; this.solicitarModelo(); this.programarFotograma();
    }

    recibirFotograma(datos) {
        if (!this.activa || datos?.modo !== this.modoControl || !Number.isFinite(datos.edad) || datos.edad > 500) return;
        this.deteccion = { ...datos, tiempo: performance.now() - Math.max(0, datos.edad) };
        this.numeroFotograma++;
        if (Array.isArray(datos.grises) && datos.grises.length === this.grises.length) {
            this.grises.set(datos.grises); this.grisesRecibidos = true;
        }
    }

    recibirVista(imagen) {
        if (!this.activa || typeof imagen !== 'string' || !imagen.startsWith('data:image/jpeg;base64,') || imagen.length >= 100000 || this.vistaPendiente) return;
        const generacion = this.generacion;
        const vista = new Image();
        this.vistaPendiente = vista;
        vista.onload = () => {
            if (this.activa && generacion === this.generacion) this.ctx.drawImage(vista, 0, 0, this.ancho, this.alto);
            if (this.vistaPendiente === vista) this.vistaPendiente = null;
        };
        vista.onerror = () => { if (this.vistaPendiente === vista) this.vistaPendiente = null; };
        vista.src = imagen;
    }

    solicitarModelo() {
        const modelo = this.modoControl + ':' + this.fuenteControl;
        if (this.modeloEnviado === modelo) return;
        this.modeloEnviado = modelo;
        chrome.runtime.sendMessage({ accion: 'camara_modo', modo: this.modoControl, fuente: this.fuenteControl }).catch(() => {});
    }

    mostrarError(texto) {
        this.aviso?.remove();
        this.aviso = document.createElement('div');
        this.aviso.id = 'adapta-pe-camara-aviso';
        this.aviso.setAttribute('role', 'alert');
        this.aviso.textContent = texto;
        this.aviso.style.cssText = 'position:fixed;right:20px;bottom:20px;max-width:300px;padding:14px;background:#8b1420;color:white;border-radius:12px;z-index:999999;font:14px sans-serif;';
        document.body.appendChild(this.aviso);
    }

    crearInterfaz() {
        this.burbuja = document.createElement('div');
        this.burbuja.id = 'adapta-pe-camara-box';
        this.burbuja.style.cssText = 'position:fixed;bottom:20px;right:20px;width:220px;height:165px;border-radius:16px;border:3px solid #2ecc71;overflow:hidden;z-index:999999;background:#111;box-shadow:0 8px 20px rgba(0,0,0,.5);pointer-events:none;';
        const contenido = this.burbuja.attachShadow({ mode: 'closed' }); // La web no puede leer imágenes de cámara.
        this.canvasEl = document.createElement('canvas');
        this.canvasEl.width = this.ancho;
        this.canvasEl.height = this.alto;
        this.canvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        this.canvasEl.setAttribute('aria-label', 'Cámara con calibración automática desde una postura cómoda. Controles por voz: Computadora, recalibrar; pausar cursor; clic derecho.');
        this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
        this.hudCanvasEl = document.createElement('canvas');
        this.hudCanvasEl.width = this.ancho;
        this.hudCanvasEl.height = this.alto;
        this.hudCanvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        this.hudCtx = this.hudCanvasEl.getContext('2d');
        this.hud = document.createElement('div');
        this.hud.id = 'adapta-pe-hud';
        this.hud.style.cssText = 'position:absolute;bottom:6px;left:4px;right:4px;background:rgba(0,0,0,.85);color:white;font:11px sans-serif;padding:5px;border-radius:6px;pointer-events:none;';
        this.hud.setAttribute('role', 'status');
        this.hud.setAttribute('aria-live', 'off'); // El progreso cambia por frame; anunciar sólo la calibración final.
        this.hud.textContent = 'Cargando detección local…';
        contenido.append(this.canvasEl, this.hudCanvasEl, this.hud);
        const ayuda = document.createElement('div');
        ayuda.textContent = 'Computadora: recalibrar · clic derecho · activar temblor';
        ayuda.style.cssText = 'position:absolute;top:4px;left:4px;right:4px;background:#111d;color:white;font:12px sans-serif;padding:5px;border-radius:6px;';
        contenido.appendChild(ayuda);
        this.punteroVirtual = document.createElement('div');
        this.punteroVirtual.id = 'adapta-pe-cursor';
        this.punteroVirtual.setAttribute('aria-hidden', 'true');
        this.punteroVirtual.style.cssText = 'position:fixed;width:26px;height:26px;background:rgba(227,6,19,.9);border:2px solid white;border-radius:50%;z-index:2147483647;pointer-events:none;box-shadow:0 0 12px rgba(0,0,0,.5);transform:translate(-50%,-50%);';
        document.body.append(this.burbuja, this.punteroVirtual);
        this.dibujarCursor(0);
    }

    detenerCamara() {
        ++this.generacion;
        this.vistaPendiente = null;
        this.numeroFotograma = 0; this.grisesRecibidos = false;
        this.deteccion = null;
        this.fuenteControl = null;
        this.neutroListo = false;
        this.muestrasPostura = [];
        this.ultimaPostura = null;
        this.perdidaDesde = null;
        this.reposoBorde = null;
        this.historialMovimiento = [];
        this.ultimoMovimiento = null;
        this.fuenteCandidata = null;
        this.activa = false;
        this.iniciando = false;
        cancelAnimationFrame(this.animationId);
        this.actualizarHover(null);
        this.burbuja?.remove(); this.punteroVirtual?.remove(); this.menu?.remove(); this.aviso?.remove();
        this.punteroVirtual = null;
        this.plantilla = null;
        this.cancelarFijacion(true);
    }

    elegirPunto(datos) {
        const convertir = (punto, fuente, derivado = false) => punto && Number.isFinite(punto.x) && Number.isFinite(punto.y) &&
            (derivado || (punto.x >= 0 && punto.x <= 1 && punto.y >= 0 && punto.y <= 1)) ?
              { x: (1 - punto.x) * this.ancho, y: punto.y * this.alto, fuente } : null;
        const rostro = datos.rostro || [], cuerpo = datos.cuerpo || [], manos = datos.manos || [];
        const candidatos = [];
        const visible = indice => cuerpo[indice] && cuerpo[indice].visibility >= 0.65 && (cuerpo[indice].presence ?? 1) >= 0.65;
        if ((this.modoControl === 'manos' || this.modoControl === 'automatico') && manos[0]) {
            const palma = [0, 5, 9, 13, 17].map(indice => manos[indice]).filter(Boolean);
            candidatos.push(convertir({ x: palma.reduce((suma, punto) => suma + punto.x, 0) / palma.length,
                y: palma.reduce((suma, punto) => suma + punto.y, 0) / palma.length }, 'mano:' + (datos.mano || 'visible')));
        }
        if ((this.modoControl === 'automatico' || this.modoControl === 'cabeza') && rostro[1] && rostro[33] && rostro[263]) {
            const nariz = rostro[1], izquierdo = rostro[33], derecho = rostro[263];
            const ancho = Math.hypot(derecho.x - izquierdo.x, derecho.y - izquierdo.y);
            if (ancho >= 0.025 && [nariz, izquierdo, derecho].every(punto => convertir(punto))) {
                const centroX = (izquierdo.x + derecho.x) / 2, centroY = (izquierdo.y + derecho.y) / 2;
                // Validar anatomía dentro de imagen; el control derivado puede salir del cuadro.
                // Recortarlo o descartarlo obligaba a levantar un rostro perfectamente visible.
                candidatos.push(convertir({ x: nariz.x + (nariz.x - centroX) / ancho * 0.12,
                    y: nariz.y + (nariz.y - centroY) / ancho * 0.12 }, 'cabeza', true));
            }
        }

        if (this.modoControl === 'brazo_izquierdo' || this.modoControl === 'brazo_derecho') {
            const indices = this.modoControl === 'brazo_izquierdo' ? [15, 13, 11] : [16, 14, 12];
            const actual = indices.find(indice => this.fuenteControl === this.modoControl + ':' + indice && visible(indice));
            const indice = actual ?? indices.find(visible);
            if (indice != null) return convertir(cuerpo[indice], this.modoControl + ':' + indice);
            return null; // No inventar la posición de una mano ausente u oculta.
        }
        if (this.modoControl === 'automatico' && visible(0)) candidatos.push(convertir(cuerpo[0], 'cabeza corporal'));
        if ((this.modoControl === 'automatico' || this.modoControl === 'torso') && visible(11) && visible(12)) {
            candidatos.push(convertir({ x: (cuerpo[11].x + cuerpo[12].x) / 2, y: (cuerpo[11].y + cuerpo[12].y) / 2 }, 'torso'));
        }
        // Mantener la parte elegida evita que una mano incidental cambie la postura neutral.
        return candidatos.find(punto => punto?.fuente === this.fuenteControl) || candidatos.find(Boolean) || null;
    }

    controlarZona(tiempo) {
        const grises = this.leerGrises();
        if (!this.plantilla) {
            // Buscar textura automáticamente cerca del punto: sirve para muñones o ropa,
            // sin colocar exactamente un detalle bajo la cruz central.
            let mejor = null;
            const margen = this.radioPlantilla + 1;
            for (let y = Math.max(margen, this.origenControl.y - 24); y < Math.min(this.alto - margen, this.origenControl.y + 25); y += 4) {
                for (let x = Math.max(margen, this.origenControl.x - 24); x < Math.min(this.ancho - margen, this.origenControl.x + 25); x += 4) {
                    const parche = this.extraerParche(grises, x, y);
                    if (!mejor || parche.contraste > mejor.parche.contraste) mejor = { x, y, parche };
                }
            }
            if (!mejor || mejor.parche.contraste < 6) { this.dibujarHUD('Zona libre · acerca una parte visible o mejora la luz', 0); return; }
            this.plantilla = mejor.parche;
            this.origenControl = { x: mejor.x, y: mejor.y };
            this.puntoActual = { ...this.origenControl };
            this.puntoSuave = { ...this.puntoBase };
            this.neutroListo = true;
            this.fuenteControl = 'zona libre';
            this.fiableDesde = tiempo;
        }
        const punto = this.seguirPunto(grises);
        if (!punto) {
            this.fiableDesde = null;
            this.neutroListo = false;
            this.plantilla = null;
            this.cancelarFijacion(true);
            this.actualizarHover(null);
            this.dibujarHUD('Zona perdida · readquiriendo sin clic', 0);
            return;
        }
        this.puntoActual = { x: punto.x, y: punto.y };
        // Actualizar textura lentamente permite pequeñas rotaciones e iluminación variable.
        const nueva = this.extraerParche(grises, punto.x, punto.y);
        this.plantilla.valores = this.plantilla.valores.map((valor, indice) => valor * 0.95 + nueva.valores[indice] * 0.05);
        this.fiableDesde ??= tiempo;
    }

    programarFotograma() {
        if (!this.activa) return;
        this.animationId = requestAnimationFrame(this.bucleRender);
    }

    leerGrises() {
        if (this.grisesRecibidos) return this.grises;
        const datos = this.ctx.getImageData(0, 0, this.ancho, this.alto).data;
        for (let indice = 0; indice < this.grises.length; indice++) {
            const pixel = indice * 4;
            this.grises[indice] = datos[pixel] * 0.299 + datos[pixel + 1] * 0.587 + datos[pixel + 2] * 0.114;
        }
        return this.grises;
    }

    extraerParche(grises, x, y) {
        const valores = [];
        for (let fila = -this.radioPlantilla; fila <= this.radioPlantilla; fila += 2) {
            for (let columna = -this.radioPlantilla; columna <= this.radioPlantilla; columna += 2) {
                valores.push(grises[(y + fila) * this.ancho + x + columna]);
            }
        }
        const media = valores.reduce((suma, valor) => suma + valor, 0) / valores.length;
        const centrados = valores.map(valor => valor - media);
        const contraste = Math.sqrt(centrados.reduce((suma, valor) => suma + valor * valor, 0) / valores.length);
        return { valores: centrados, contraste };
    }

    calibrar(punto = this.puntoActual) {
        if (!this.activa) return false;
        if (!Number.isFinite(punto.x) || !Number.isFinite(punto.y)) return false;
        // Sólo la textura necesita margen de píxeles enteros, nunca el rostro/cuerpo.
        const margen = this.modoControl === 'zona' ? this.radioPlantilla + 1 : 0;
        this.origenControl = this.modoControl === 'zona' ? {
            x: Math.round(Math.max(margen, Math.min(this.ancho - margen - 1, punto.x))),
            y: Math.round(Math.max(margen, Math.min(this.alto - margen - 1, punto.y))) } : { x: punto.x, y: punto.y };
        this.puntoSuave = { ...this.puntoBase };
        this.plantilla = null;
        this.neutroListo = false;
        this.fiableDesde = null;
        this.muestrasPostura = [];
        this.ultimaPostura = null;
        this.reposoBorde = null;
        this.perdidaDesde = null;
        this.historialMovimiento = [];
        this.ultimoMovimiento = null;
        this.menu?.remove();
        this.cancelarFijacion(true);
        return true;
    }

    aprenderPostura(punto, tiempo) {
        if (tiempo === this.ultimaPostura) return false; // Una inferencia repetida no prueba estabilidad.
        if (this.ultimaPostura != null && tiempo - this.ultimaPostura > 500) this.muestrasPostura = [];
        this.ultimaPostura = tiempo;
        this.muestrasPostura.push({ x: punto.x, y: punto.y, tiempo });
        this.muestrasPostura = this.muestrasPostura.filter(muestra => tiempo - muestra.tiempo <= 1200);
        const muestras = this.muestrasPostura;
        if (muestras.length < 4 || tiempo - muestras[0].tiempo < 900) return false;
        const mediana = (lista, eje) => lista.map(muestra => muestra[eje]).sort((a, b) => a - b)[Math.floor(lista.length / 2)];
        const referencia = { x: mediana(muestras, 'x'), y: mediana(muestras, 'y') };
        const tercio = Math.max(1, Math.floor(muestras.length / 3));
        const deriva = Math.hypot((mediana(muestras.slice(0, tercio), 'x') - mediana(muestras.slice(-tercio), 'x')) / this.ancho,
            (mediana(muestras.slice(0, tercio), 'y') - mediana(muestras.slice(-tercio), 'y')) / this.alto);
        const distancias = muestras.map(muestra => Math.hypot((muestra.x - referencia.x) / this.ancho,
            (muestra.y - referencia.y) / this.alto)).sort((a, b) => a - b);
        // Mediana y percentil toleran temblores/puntos aislados sin aprender un movimiento en curso.
        if (deriva > 0.012 || distancias[Math.floor(distancias.length * 0.8)] > (this.zonaMuerta > 0.05 ? 0.045 : 0.025)) return false;
        this.origenControl = referencia;
        this.puntoSuave = { ...this.puntoBase };
        this.neutroListo = true;
        this.muestrasPostura = [];
        this.cancelarFijacion(true);
        try { chrome.runtime.sendMessage({ accion: 'hablar', texto: 'Cursor listo. Postura cómoda calibrada.' }, () => { void chrome.runtime.lastError; }); } catch (_) {}
        return true;
    }

    seguirPunto(grises) {
        // Zona libre: seguir una textura visible, sin asumir anatomía ni exigir manos.
        // ponytail: correlación local; oclusiones largas exigen elegir otra zona.
        let mejor = { error: Infinity, x: this.puntoActual.x, y: this.puntoActual.y };
        const errores = [];
        const margen = this.radioPlantilla + 1;
        const medir = (x, y) => {
            if (x < margen || y < margen || x >= this.ancho - margen || y >= this.alto - margen) return;
            let suma = 0, cuadrados = 0;
            const cantidad = this.plantilla.valores.length;
            for (let fila = -this.radioPlantilla; fila <= this.radioPlantilla; fila += 2) {
                for (let columna = -this.radioPlantilla; columna <= this.radioPlantilla; columna += 2) {
                    const valor = grises[(y + fila) * this.ancho + x + columna];
                    suma += valor; cuadrados += valor * valor;
                }
            }
            const media = suma / cantidad;
            if (cuadrados / cantidad - media * media < 36) return;
            let error = 0;
            let indice = 0;
            for (let fila = -this.radioPlantilla; fila <= this.radioPlantilla; fila += 2) {
                for (let columna = -this.radioPlantilla; columna <= this.radioPlantilla; columna += 2) {
                    error += Math.abs(grises[(y + fila) * this.ancho + x + columna] - media - this.plantilla.valores[indice++]);
                }
            }
            error /= cantidad;
            errores.push({ error, x, y });
            if (error < mejor.error) mejor = { error, x, y };
        };
        const centroX = Math.round(this.puntoActual.x), centroY = Math.round(this.puntoActual.y);
        for (let y = centroY - 8; y <= centroY + 8; y++) {
            for (let x = centroX - 8; x <= centroX + 8; x++) medir(x, y);
        }
        const ambiguo = errores.some(candidato => Math.hypot(candidato.x - mejor.x, candidato.y - mejor.y) > 3 &&
            candidato.error <= mejor.error * 1.15 + 0.5);
        return mejor.error <= 18 && !ambiguo ? mejor : null;
    }

    filtrarMovimiento(punto, tiempo) {
        if (tiempo !== this.ultimoMovimiento) {
            if (this.ultimoMovimiento == null || tiempo - this.ultimoMovimiento > 500) {
                this.historialMovimiento = [{ ...this.origenControl }, { ...this.origenControl }];
            }
            this.ultimoMovimiento = tiempo;
            this.historialMovimiento.push(punto);
            this.historialMovimiento = this.historialMovimiento.slice(-3);
            // Tres inferencias reales eliminan un salto aislado antes de armar/mover el cursor.
            this.puntoFiltrado = {
                x: this.historialMovimiento.map(muestra => muestra.x).sort((a, b) => a - b)[1],
                y: this.historialMovimiento.map(muestra => muestra.y).sort((a, b) => a - b)[1]
            };
        }
        return this.puntoFiltrado;
    }

    cancelarFijacion(desarmar = false) {
        this.inicioFijacion = null;
        this.objetivoFijado = null;
        if (desarmar) { this.armado = false; this.inicioArmado = null; this.enZonaSegura = false; }
    }

    normalizarControl(punto) {
        // Centro fijo. Igual fracción de imagen produce la misma respuesta en ambos ejes.
        return { x: this.puntoBase.x + (punto.x - this.origenControl.x) / this.amplitudControl,
            y: this.puntoBase.y + (punto.y - this.origenControl.y) * this.ancho / this.alto / this.amplitudControl };
    }

    actualizarControl(punto, tiempo, intervalo) {
        punto = this.normalizarControl(punto);
        const distanciaCruda = Math.hypot(punto.x - this.puntoBase.x, punto.y - this.puntoBase.y) / this.ancho;
        const constante = distanciaCruda > this.zonaAtraccion + 0.025 ? 85 : 180;
        const suavizado = 1 - Math.exp(-intervalo / constante);
        this.puntoSuave.x += (punto.x - this.puntoSuave.x) * suavizado;
        this.puntoSuave.y += (punto.y - this.puntoSuave.y) * suavizado;
        const dx = (this.puntoSuave.x - this.puntoBase.x) / this.ancho;
        const dy = (this.puntoSuave.y - this.puntoBase.y) / this.ancho;
        const distancia = Math.hypot(dx, dy);
        // Histéresis corta para no reiniciar la fijación por un temblor de un píxel.
        const radioSeguro = this.zonaMuerta + (this.enZonaSegura ? 0.008 : 0);
        this.enZonaSegura = distancia <= radioSeguro && distanciaCruda <= radioSeguro + 0.025;
        if (this.enZonaSegura) {
            this.reposoBorde = null;
            this.inicioArmado = null;
            const objetivo = this.elementoBajoCursor();
            if (!this.armado || !objetivo) { this.cancelarFijacion(); return { progreso: 0, estado: 'Seguro · mueve para habilitar clic' }; }
            if (objetivo !== this.objetivoFijado) { this.objetivoFijado = objetivo; this.inicioFijacion = tiempo; }
            const progreso = Math.min(1, (tiempo - this.inicioFijacion) / this.duracionClick);
            if (progreso >= 1) {
                const tipo = this.tipoClick;
                this.tipoClick = 'izquierdo';
                this.cancelarFijacion(true);
                this.hacerClick(tipo, objetivo);
            }
            return { progreso, estado: `Seguro · ${this.tipoClick === 'derecho' ? 'derecho' : 'clic'} ${Math.round(progreso * 100)}%` };
        }
        this.cancelarFijacion();
        if (distanciaCruda > this.zonaAtraccion && distancia > this.zonaAtraccion) {
            this.inicioArmado ??= tiempo;
            if (tiempo - this.inicioArmado >= 180) this.armado = true;
        } else this.inicioArmado = null;
        const avance = Math.max(0, distancia - this.zonaMuerta);
        // La atracción reduce gradualmente la velocidad al acercarse, sin fingir una postura neutra.
        const velocidad = distancia <= this.zonaAtraccion ? 80 * Math.pow(avance / (this.zonaAtraccion - this.zonaMuerta), 2) :
            Math.min(this.velocidadMaxima, 80 + Math.pow((distancia - this.zonaAtraccion) * 10, 1.35) * 420);
        const paso = Math.min(this.velocidadMaxima, velocidad * this.sensibilidad) * intervalo / 1000;
        const anterior = { x: this.posX, y: this.posY };
        if (distancia > 0) {
            this.posX = Math.max(1, Math.min(window.innerWidth - 1, this.posX + dx / distancia * paso));
            this.posY = Math.max(1, Math.min(window.innerHeight - 1, this.posY + dy / distancia * paso));
        }
        // Una dirección mantenida mueve normalmente. Sólo recuperar postura si ya no
        // queda pantalla y la persona descansa allí; nunca centrar durante navegación.
        const enBorde = this.posX === 1 || this.posX === window.innerWidth - 1 || this.posY === 1 || this.posY === window.innerHeight - 1;
        const detenido = Math.hypot(this.posX - anterior.x, this.posY - anterior.y) < 0.01;
        if (enBorde && detenido && distancia > this.zonaAtraccion) {
            const reposo = this.reposoBorde;
            const tolerancia = this.zonaMuerta > 0.05 ? 0.045 : 0.025;
            if (!reposo || Math.hypot((punto.x - reposo.x) / this.ancho, (punto.y - reposo.y) / this.ancho) > tolerancia) {
                this.reposoBorde = { ...punto, tiempo };
            } else if (tiempo - reposo.tiempo >= 1200) {
                this.calibrar();
                return { progreso: 0, estado: 'Recuperando postura cómoda · sin clic' };
            }
        } else this.reposoBorde = null;
        return { progreso: 0, estado: distancia <= this.zonaAtraccion ? 'Atracción · precisión' : 'Moviendo' };
    }

    elementoBajoCursor() {
        let elemento = document.elementFromPoint(this.posX, this.posY);
        // Acceder a shadow roots abiertos. Los iframes ajenos siguen siendo otro documento.
        while (elemento?.shadowRoot?.elementFromPoint) {
            const interno = elemento.shadowRoot.elementFromPoint(this.posX, this.posY);
            if (!interno || interno === elemento) break;
            elemento = interno;
        }
        return elemento?.closest('button, a, input, textarea, select, summary, [role="button"], [contenteditable="true"]') || elemento;
    }

    actualizarHover(elemento) {
        const anterior = this.elementoHover;
        this.elementoHover = elemento;
        const opciones = { bubbles: true, composed: true, clientX: this.posX, clientY: this.posY };
        if (elemento !== anterior) {
            anterior?.dispatchEvent(new MouseEvent('mouseout', { ...opciones, relatedTarget: elemento }));
            elemento?.dispatchEvent(new MouseEvent('mouseover', { ...opciones, relatedTarget: anterior }));
        }
        elemento?.dispatchEvent(new MouseEvent('mousemove', opciones));
    }

    hacerClick(tipo, objetivo = this.elementoBajoCursor()) {
        if (!objetivo || objetivo.disabled || objetivo.getAttribute('aria-disabled') === 'true') return;
        const opciones = { bubbles: true, cancelable: true, composed: true, view: window,
            clientX: this.posX, clientY: this.posY, button: tipo === 'derecho' ? 2 : 0 };
        const presionar = () => {
            if (window.PointerEvent) objetivo.dispatchEvent(new PointerEvent('pointerdown', {
                ...opciones, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: tipo === 'derecho' ? 2 : 1
            }));
            objetivo.dispatchEvent(new MouseEvent('mousedown', { ...opciones, buttons: tipo === 'derecho' ? 2 : 1 }));
            if (window.PointerEvent) objetivo.dispatchEvent(new PointerEvent('pointerup', {
                ...opciones, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0
            }));
            objetivo.dispatchEvent(new MouseEvent('mouseup', opciones));
        };
        if (tipo === 'derecho') {
            // Un evento sintético no abre el menú nativo de Chrome. Respetar primero el menú del sitio.
            presionar();
            const sinMenuPropio = objetivo.dispatchEvent(new MouseEvent('contextmenu', opciones));
            if (sinMenuPropio) this.abrirMenuContextual(objetivo);
        } else {
            this.menu?.remove();
            objetivo.focus?.({ preventScroll: true });
            presionar();
            objetivo.dispatchEvent(new MouseEvent('click', opciones));
        }
    }

    abrirMenuContextual(objetivo) {
        this.menu?.remove();
        const menu = document.createElement('div');
        this.menu = menu;
        menu.id = 'adapta-pe-menu-contextual';
        menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Menú contextual Adapta PE');
        menu.style.cssText = `position:fixed;left:${Math.max(0, Math.min(this.posX, window.innerWidth - 230))}px;top:${Math.max(0, Math.min(this.posY, window.innerHeight - 240))}px;max-width:220px;max-height:90vh;overflow:auto;background:#222;color:white;border:2px solid white;border-radius:10px;padding:6px;z-index:2147483646;box-shadow:0 6px 20px #0008;`;
        const abrir = (url, destino) => {
            try { chrome.runtime.sendMessage({ accion: 'abrir_url', url, destino }, () => { void chrome.runtime.lastError; }); } catch (_) {}
        };
        const opciones = [];
        const enlace = objetivo.closest('a[href]');
        if (enlace && /^https?:/.test(enlace.href)) {
            opciones.push(['Abrir enlace en pestaña', () => abrir(enlace.href, 'pestana')], ['Abrir enlace en ventana', () => abrir(enlace.href, 'ventana')]);
        }
        const imagen = objetivo.tagName === 'IMG' ? objetivo : objetivo.querySelector('img');
        if (imagen && /^https?:/.test(imagen.currentSrc || imagen.src)) opciones.push(['Abrir imagen', () => abrir(imagen.currentSrc || imagen.src, 'pestana')]);
        opciones.push(['Atrás', () => history.back()], ['Recargar página', () => location.reload()], ['Cerrar menú', () => {}]);
        for (const [texto, accion] of opciones) {
            const boton = document.createElement('button');
            boton.type = 'button'; boton.textContent = texto; boton.setAttribute('role', 'menuitem');
            boton.style.cssText = 'display:block;width:100%;text-align:left;font:14px sans-serif;padding:9px;background:#222;color:white;border:0;cursor:pointer;';
            boton.addEventListener('click', () => { menu.remove(); accion(); });
            menu.appendChild(boton);
        }
        menu.addEventListener('keydown', evento => { if (evento.key === 'Escape') menu.remove(); });
        document.body.appendChild(menu);
        menu.querySelector('button')?.focus({ preventScroll: true });
    }

    ejecutarAccion(accion) {
        if (accion === 'activar' || accion === 'desactivar') {
            if (accion === 'activar') this.bloqueada = false;
            this.setEstado(accion === 'activar');
            chrome.storage.local.set({ ojos: accion === 'activar' }).catch(() => {});
            return true;
        }
        if (!this.activa) return false;
        if (accion === 'calibrar') return this.calibrar();
        if (accion.startsWith('control_')) {
            this.modoControl = accion.slice(8);
            this.fuenteControl = null;
            this.deteccion = null;
            this.errorVision = null;
            this.calibrar();
            this.guardarAjustes();
            return true;
        }
        if (accion === 'temblor' || accion === 'sin_temblor') {
            this.zonaMuerta = accion === 'temblor' ? 0.07 : 0.045;
            this.zonaAtraccion = this.zonaMuerta + 0.02;
            this.cancelarFijacion(true);
            this.guardarAjustes();
            return true;
        }
        if (accion === 'movimiento_reducido' || accion === 'movimiento_normal') {
            this.amplitudControl = accion === 'movimiento_reducido' ? 0.55 : 1;
            this.guardarAjustes();
            return this.calibrar();
        }
        if (accion === 'preparar_derecho') { this.tipoClick = 'derecho'; this.cancelarFijacion(true); }
        else if (accion === 'pausar' || accion === 'reanudar') {
            this.pausada = accion === 'pausar';
            if (!this.pausada) this.calibrar();
            this.cancelarFijacion(true);
        }
        else if (accion === 'lento' || accion === 'rapido') {
            this.sensibilidad = Math.max(0.3, Math.min(2, this.sensibilidad + (accion === 'lento' ? -0.2 : 0.2)));
            this.guardarAjustes();
        }
        else if (accion === 'cancelar') { this.menu?.remove(); this.tipoClick = 'izquierdo'; this.cancelarFijacion(true); }
        else if (accion === 'derecho' || accion === 'izquierdo') {
            if (this.pausada || !this.neutroListo || this.fiableDesde == null ||
                performance.now() - this.fiableDesde < 300 || performance.now() - this.ultimoTiempo > 200) return false;
            this.cancelarFijacion(true); this.hacerClick(accion); this.tipoClick = 'izquierdo';
        } else return false;
        return true;
    }

    dibujarCursor(progreso) {
        if (!this.punteroVirtual) return;
        this.posX = Math.max(1, Math.min(window.innerWidth - 1, this.posX));
        this.posY = Math.max(1, Math.min(window.innerHeight - 1, this.posY));
        this.punteroVirtual.style.left = this.posX + 'px';
        this.punteroVirtual.style.top = this.posY + 'px';
        this.punteroVirtual.style.transform = `translate(-50%,-50%) scale(${1 + progreso * 0.7})`;
        this.punteroVirtual.style.background = this.tipoClick === 'derecho' ? '#8e44ad' : progreso ? '#2ecc71' : 'rgba(227,6,19,.9)';
    }

    dibujarHUD(estado, progreso) {
        if (this.hud.textContent !== estado) this.hud.textContent = estado;
        this.burbuja.style.borderColor = this.enZonaSegura ? '#2ecc71' : '#e30613';
        const contexto = this.hudCtx;
        contexto.clearRect(0, 0, this.ancho, this.alto);
        contexto.strokeStyle = '#ffffff88'; contexto.lineWidth = 1;
        contexto.beginPath();
        contexto.moveTo(this.puntoBase.x - 10, this.puntoBase.y); contexto.lineTo(this.puntoBase.x + 10, this.puntoBase.y);
        contexto.moveTo(this.puntoBase.x, this.puntoBase.y - 10); contexto.lineTo(this.puntoBase.x, this.puntoBase.y + 10);
        contexto.stroke();
        for (const [radio, color] of [[this.zonaAtraccion, '#ffa500'], [this.zonaMuerta, '#2ecc71']]) {
            contexto.strokeStyle = color; contexto.beginPath();
            contexto.arc(this.puntoBase.x, this.puntoBase.y, radio * this.ancho, 0, Math.PI * 2); contexto.stroke();
        }
        contexto.fillStyle = this.fiableDesde == null ? '#999' : '#3498db';
        contexto.beginPath(); contexto.arc(this.puntoSuave.x, this.puntoSuave.y, 3, 0, Math.PI * 2); contexto.fill();
        this.dibujarCursor(progreso);
    }

    bucleRender(tiempo) {
        if (!this.activa) return;
        try {
            // Una imagen central nueva por paso; no repetir inferencias para completar dwell.
            const imagen = this.numeroFotograma;
            if (this.deteccion && tiempo - this.deteccion.tiempo > 500) {
                this.perdidaDesde ??= tiempo; this.fiableDesde = null;
                this.cancelarFijacion(true); this.actualizarHover(null);
                this.dibujarHUD('Esperando cámara central · sin clic', 0); return;
            }
            if (!imagen || imagen === this.ultimoVideo ||
                (this.ultimoTiempo != null && tiempo - this.ultimoTiempo < 1000 / 30 - 1)) return;
            const salto = this.ultimoTiempo == null ? 0 : tiempo - this.ultimoTiempo;
            const intervalo = Math.min(50, salto || 1000 / 30);
            if (salto > 200) { this.cancelarFijacion(true); this.fiableDesde = null; }
            this.ultimoTiempo = tiempo;
            this.ultimoVideo = imagen;
            if (this.modoControl === 'zona') {
                this.controlarZona(tiempo);
            } else {
                this.solicitarModelo();
                const punto = this.deteccion && tiempo - this.deteccion.tiempo < 500 ? this.elegirPunto(this.deteccion) : null;
                if (!punto) {
                    this.perdidaDesde ??= tiempo;
                    this.fuenteCandidata = null;
                    this.muestrasPostura = [];
                    this.reposoBorde = null;
                    this.fiableDesde = null;
                    this.cancelarFijacion(true);
                    this.actualizarHover(null);
                    this.dibujarHUD(this.errorVision || (this.deteccion ? 'Seguimiento en espera · vuelve a tu postura cómoda' : 'Esperando cámara central…'), 0);
                    return;
                }
                if (this.fuenteControl && punto.fuente !== this.fuenteControl) {
                    if (this.fuenteCandidata !== punto.fuente) {
                        this.fuenteCandidata = punto.fuente;
                        this.inicioCandidata = tiempo;
                        this.ultimaCandidata = null;
                        this.confirmacionesCandidata = 0;
                    }
                    if (this.ultimaCandidata !== this.deteccion.tiempo) {
                        this.ultimaCandidata = this.deteccion.tiempo;
                        this.confirmacionesCandidata++;
                    }
                    if (tiempo - this.inicioCandidata < 1200 || this.confirmacionesCandidata < 3) {
                        this.fiableDesde = null;
                        this.cancelarFijacion(true);
                        this.dibujarHUD('Confirmando ' + punto.fuente + ' · sin clic', 0);
                        return;
                    }
                } else this.fuenteCandidata = null;
                if (punto.fuente !== this.fuenteControl) {
                    this.fuenteControl = punto.fuente;
                    this.calibrar(punto);
                } else if (this.perdidaDesde != null && tiempo - this.perdidaDesde >= 1200) this.calibrar(punto);
                this.perdidaDesde = null;
                this.puntoActual = { x: punto.x, y: punto.y };
                if (!this.neutroListo) {
                    this.puntoSuave = { ...this.puntoBase };
                    if (!this.aprenderPostura(punto, this.deteccion.tiempo)) {
                        this.dibujarHUD('Descansa en una postura cómoda · calibrando sin clic', 0); return;
                    }
                }
                this.fiableDesde ??= tiempo;
            }
            if (!this.neutroListo || this.fiableDesde == null) return;
            if (this.pausada || tiempo - this.fiableDesde < 250) {
                this.cancelarFijacion(true);
                this.dibujarHUD(this.pausada ? 'Cursor pausado · di «reanudar cursor»' : 'Estabilizando seguimiento', 0);
                return;
            }
            const puntoControl = this.modoControl === 'zona' ? this.puntoActual : this.filtrarMovimiento(this.puntoActual, this.deteccion.tiempo);
            const control = this.actualizarControl(puntoControl, tiempo, intervalo);
            this.actualizarHover(this.elementoBajoCursor());
            this.dibujarHUD((this.fuenteControl || 'Zona libre') + ' · ' + control.estado, control.progreso);
        } catch (_) {
            this.fiableDesde = null;
            this.cancelarFijacion(true);
            this.dibujarHUD('Esperando una imagen válida de la cámara', 0);
        } finally { this.programarFotograma(); }
    }
}
globalThis.KineticEngine = KineticEngine;
})();
