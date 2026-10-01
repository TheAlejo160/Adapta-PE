(() => {
const { SitiosVoz, normalizarVoz, reconocerSitio } = globalThis;
class VoiceAssistant {
    constructor(accionCinetica = null, alComando = null) {
        this.accionCinetica = accionCinetica;
        this.alComando = alComando;
        this.permitidoPorUsuario = false;
        this.tabVisible = !document.hidden;
        this.reconocimientoVoz = null;
        this.microfonoIniciado = false;
        this.esperandoComando = false;
        this.temporizadorEspera = null;
        this.temporizadorSilencio = null;
        this.temporizadorReinicio = null;
        this.textoReconocido = '';
        this.indiceResultado = 0;
        this.resultadosConsumidos = new Map();
        this.fallos = 0;
        this.bloqueado = false;
        this.contextoAudio = null;
        this.elementoSeleccionado = null;
        this.idSeleccion = 'adapta-pe-seleccion-' + (chrome.runtime.id || 'local');
    }

    setEstado(estado) {
        if (estado !== this.permitidoPorUsuario) this.bloqueado = false;
        this.permitidoPorUsuario = Boolean(estado);
        this.evaluarEstado();
    }

    actualizarVisibilidad(esVisible) {
        this.tabVisible = Boolean(esVisible);
        this.evaluarEstado();
    }

    evaluarEstado() {
        if (this.permitidoPorUsuario && this.tabVisible) {
            if (!this.microfonoIniciado && !this.bloqueado) this.iniciar();
        } else this.detener();
    }

    mostrarEstado(texto = "🎙️ Activo. Di 'Computadora'") {
        this.alEstado?.(texto);
        if (this.ui) {
            this.ui.textContent = texto;
            this.ui.style.background = this.esperandoComando ? '#0984e3' : 'rgba(227,6,19,0.9)';
        }
    }

    reproducirBeep() {
        try {
            this.contextoAudio ||= new (window.AudioContext || window.webkitAudioContext)();
            const contexto = this.contextoAudio;
            contexto.resume().catch(() => {});
            const oscilador = contexto.createOscillator();
            const ganancia = contexto.createGain();
            ganancia.gain.value = 0.08;
            oscilador.frequency.value = 800;
            oscilador.connect(ganancia);
            ganancia.connect(contexto.destination);
            oscilador.onended = () => { oscilador.disconnect(); ganancia.disconnect(); };
            oscilador.start();
            oscilador.stop(contexto.currentTime + 0.12);
        } catch (_) {}
    }

    cancelarEspera() {
        clearTimeout(this.temporizadorEspera);
        this.esperandoComando = false;
    }

    detener() {
        this.microfonoIniciado = false;
        clearTimeout(this.temporizadorSilencio);
        clearTimeout(this.temporizadorReinicio);
        this.cancelarEspera();
        this.textoReconocido = '';
        const reconocimiento = this.reconocimientoVoz;
        this.reconocimientoVoz = null;
        if (reconocimiento) { reconocimiento.onend = null; reconocimiento.abort(); }
        this.ui?.remove();
        this.ui = null;
        this.contextoAudio?.close().catch(() => {});
        this.contextoAudio = null;
    }

    iniciar() {
        const MotorVoz = window.SpeechRecognition || window.webkitSpeechRecognition;
        const otro = document.getElementById('adapta-pe-mic-status');
        if (otro?.getAttribute?.('data-adapta-voz-activa') === 'true' && otro.getAttribute('data-adapta-propietario') !== chrome.runtime.id) {
            clearTimeout(this.temporizadorReinicio);
            this.temporizadorReinicio = setTimeout(() => this.evaluarEstado(), 1000);
            return; // Completa y Lite comparten el micrófono; nunca iniciar dos reconocedores.
        }
        this.ui = document.createElement('div');
        this.ui.id = 'adapta-pe-mic-status';
        this.ui.setAttribute('data-adapta-propietario', chrome.runtime.id || 'adapta');
        this.ui.setAttribute('data-adapta-voz-activa', 'true');
        this.ui.setAttribute('role', 'status');
        this.ui.setAttribute('aria-live', 'polite');
        this.ui.style.cssText = 'position:fixed;bottom:20px;left:20px;background:rgba(227,6,19,0.9);color:white;padding:10px 20px;border-radius:20px;font-family:sans-serif;font-weight:bold;font-size:14px;z-index:999999;box-shadow:0 4px 10px rgba(0,0,0,.3);pointer-events:none;max-width:80vw;';
        document.body.appendChild(this.ui);
        if (!MotorVoz) { this.ui.setAttribute('data-adapta-voz-activa', 'false'); this.ui.id = 'adapta-pe-mic-aviso-' + chrome.runtime.id; this.bloqueado = true; this.mostrarEstado('Este navegador no admite reconocimiento de voz.'); return; }
        this.microfonoIniciado = true;
        const reconocimiento = new MotorVoz();
        this.reconocimientoVoz = reconocimiento;
        reconocimiento.lang = 'es-PE';
        reconocimiento.continuous = true;
        reconocimiento.interimResults = true;
        reconocimiento.onstart = () => {
            if (this.reconocimientoVoz !== reconocimiento) return;
            this.indiceResultado = 0;
            this.resultadosConsumidos.clear();
            this.textoReconocido = '';
            this.mostrarEstado(this.esperandoComando ? '👂 Dime...' : undefined);
        };
        reconocimiento.onresult = evento => {
            if (this.reconocimientoVoz !== reconocimiento) return;
            // Algunos navegadores tardan en cerrar los resultados finales. Esperar una
            // transcripción estable también permite recuperar el comportamiento anterior.
            const pendientes = [];
            let todosFinales = true;
            for (let indice = 0; indice < evento.results.length; indice++) {
                const resultado = evento.results[indice];
                const frase = resultado[0].transcript.trim();
                const consumido = this.resultadosConsumidos.get(indice) || '';
                const normalizarPrefijo = texto => normalizarVoz(texto).replace(/[.,!?;:]/g, '');
                const continua = consumido && normalizarPrefijo(frase).startsWith(normalizarPrefijo(consumido));
                const restante = continua ? frase.split(/\s+/).slice(consumido.split(/\s+/).length).join(' ') : consumido ? '' : frase;
                if (restante) { pendientes.push(restante); todosFinales &&= resultado.isFinal; }
            }
            const texto = pendientes.join(' ');
            if (!texto || texto === this.textoReconocido) return;
            this.textoReconocido = texto;
            this.fallos = 0;
            this.mostrarEstado('🎙️ Escuché: ' + texto);
            clearTimeout(this.temporizadorSilencio);
            this.temporizadorSilencio = setTimeout(() => {
                // No consumir una intención incompleta si sigue siendo provisional.
                if (!todosFinales && /\b(abre|abrir|busca|buscar|escribe|dicta|ejecuta|en)\s*$/i.test(this.textoReconocido)) return;
                for (let indice = 0; indice < evento.results.length; indice++) {
                    this.resultadosConsumidos.set(indice, evento.results[indice][0].transcript.trim());
                }
                this.procesarFraseContinua();
            }, todosFinales ? 550 : 1200);
        };
        reconocimiento.onerror = evento => {
            if (this.reconocimientoVoz !== reconocimiento || evento.error === 'aborted') return;
            if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(evento.error)) {
                this.bloqueado = true;
                this.ui?.setAttribute('data-adapta-voz-activa', 'false');
                if (this.ui) this.ui.id = 'adapta-pe-mic-aviso-' + chrome.runtime.id;
                this.cancelarEspera();
                clearTimeout(this.temporizadorSilencio);
                this.textoReconocido = '';
                this.mostrarEstado('Micrófono no disponible. Revisa el permiso y vuelve a activar Voz.');
            } else {
                this.fallos = Math.min(this.fallos + 1, 4);
                this.mostrarEstado('💤 Reconectando micrófono...');
            }
        };
        reconocimiento.onend = () => {
            if (this.reconocimientoVoz !== reconocimiento) return;
            clearTimeout(this.temporizadorSilencio);
            if (!this.bloqueado && this.textoReconocido.trim()) this.procesarFraseContinua();
            this.programarReinicio(reconocimiento);
        };
        this.arrancarReconocimiento(reconocimiento);
    }

    arrancarReconocimiento(reconocimiento) {
        if (this.reconocimientoVoz !== reconocimiento || !this.microfonoIniciado || !this.tabVisible || this.bloqueado) return;
        try { reconocimiento.start(); }
        catch (_) { this.fallos = Math.min(this.fallos + 1, 4); this.programarReinicio(reconocimiento); }
    }

    programarReinicio(reconocimiento) {
        clearTimeout(this.temporizadorReinicio);
        if (this.permitidoPorUsuario && this.tabVisible && this.microfonoIniciado && !this.bloqueado) {
            const espera = [300, 1000, 2000, 3000, 5000][this.fallos];
            this.temporizadorReinicio = setTimeout(() => this.arrancarReconocimiento(reconocimiento), espera);
        }
    }

    procesarFraseContinua() {
        if (!this.microfonoIniciado || !this.tabVisible || !this.permitidoPorUsuario) return;
        let texto = this.textoReconocido.trim();
        this.textoReconocido = '';
        if (!texto) return;
        const activacion = (this.esperandoComando ? /^computadora\b/i : /\bcomputadora\b/i).exec(texto);
        if (activacion) texto = texto.slice(activacion.index + activacion[0].length).replace(/^[\s,.:;!?]+/, '');
        else if (!this.esperandoComando) return;
        if (texto) {
            this.cancelarEspera();
            if (this.alComando) this.alComando(texto);
            else this.ejecutarComando(texto);
        } else {
            this.reproducirBeep();
            this.esperandoComando = true;
            this.mostrarEstado('👂 Dime...');
            clearTimeout(this.temporizadorEspera);
            this.temporizadorEspera = setTimeout(() => { this.cancelarEspera(); this.mostrarEstado(); }, 8000);
        }
    }

    enviar(peticion) {
        try {
            chrome.runtime.sendMessage(peticion, respuesta => {
                if (chrome.runtime.lastError || respuesta?.ok === false) this.mostrarEstado('No se pudo realizar la acción en esta página.');
            });
        } catch (_) { this.mostrarEstado('Adapta PE se está reconectando. Vuelve a decir el comando.'); }
    }

    esEditable(campo) {
        return campo && !campo.disabled && !campo.readOnly && (campo.isContentEditable || campo.tagName === 'TEXTAREA' ||
            (campo.tagName === 'INPUT' && ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(campo.type)));
    }

    escribirEnCampo(campo, texto, reemplazar = false) {
        if (!this.esEditable(campo)) { this.mostrarEstado('Primero enfoca un campo de texto.'); return false; }
        if (campo.isContentEditable) {
            if (reemplazar) campo.textContent = texto;
            else {
                const seleccion = window.getSelection();
                const rango = seleccion?.rangeCount ? seleccion.getRangeAt(0) : null;
                if (rango && campo.contains(rango.commonAncestorContainer)) {
                    rango.deleteContents();
                    const nodo = document.createTextNode(texto);
                    rango.insertNode(nodo);
                    rango.setStartAfter(nodo);
                    rango.collapse(true);
                    seleccion.removeAllRanges(); seleccion.addRange(rango);
                } else campo.appendChild(document.createTextNode((campo.textContent ? ' ' : '') + texto));
            }
        } else {
            const inicio = campo.selectionStart ?? campo.value.length;
            const fin = campo.selectionEnd ?? inicio;
            const valor = reemplazar ? texto : campo.value.slice(0, inicio) + texto + campo.value.slice(fin);
            const prototipo = campo.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(prototipo, 'value').set.call(campo, valor);
            if (typeof campo.setSelectionRange === 'function' && campo.type !== 'number' && campo.type !== 'email') {
                const posicion = reemplazar ? texto.length : inicio + texto.length;
                campo.setSelectionRange(posicion, posicion);
            }
        }
        campo.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        return true;
    }

    encontrarElemento(texto, selector) {
        const objetivo = normalizarVoz(texto);
        const elementos = Array.from(document.querySelectorAll(selector)).filter(elemento => {
            const estilo = window.getComputedStyle(elemento);
            return elemento.getClientRects().length && estilo.visibility !== 'hidden' && estilo.display !== 'none' &&
                !elemento.disabled && elemento.getAttribute('aria-disabled') !== 'true';
        });
        const nombre = elemento => normalizarVoz(elemento.getAttribute('aria-label') ||
            elemento.labels?.[0]?.textContent || elemento.innerText || elemento.getAttribute('alt') || elemento.getAttribute('placeholder') || elemento.getAttribute('title') || elemento.querySelector?.('img[alt]')?.getAttribute('alt') || elemento.value);
        return elementos.find(elemento => nombre(elemento) === objetivo) || elementos.find(elemento => nombre(elemento).includes(objetivo));
    }

    pulsarElemento(elemento) {
        if (!elemento) { this.mostrarEstado('No encontré ese botón o enlace visible.'); return false; }
        if (elemento.isConnected === false || elemento.disabled || elemento.getAttribute('aria-disabled') === 'true' ||
            !elemento.getClientRects().length || window.getComputedStyle(elemento).visibility === 'hidden') {
            this.mostrarEstado('Ese elemento ya no está disponible. Selecciónalo de nuevo.'); return false;
        }
        elemento.focus?.({ preventScroll: true });
        elemento.click?.();
        return true;
    }

    limpiarSeleccion() {
        this.elementoSeleccionado?.removeAttribute('data-' + this.idSeleccion);
        this.elementoSeleccionado = null;
        document.getElementById(this.idSeleccion)?.remove();
    }

    seleccionarElemento(elemento) {
        this.limpiarSeleccion();
        if (!elemento || elemento === document.body || elemento === document.documentElement) {
            this.mostrarEstado('No encontré ese elemento. Di selecciona y su nombre.'); return;
        }
        this.elementoSeleccionado = elemento;
        elemento.setAttribute('data-' + this.idSeleccion, 'true');
        const estilo = document.createElement('style'); estilo.id = this.idSeleccion;
        estilo.textContent = `[data-${this.idSeleccion}] { outline:4px solid #ffdc00!important;outline-offset:3px!important;box-shadow:0 0 0 7px #111!important; }`;
        (document.head || document.documentElement).appendChild(estilo);
        elemento.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'auto' });
        elemento.focus?.({ preventScroll: true });
        const texto = (elemento.getAttribute('aria-label') || elemento.getAttribute('alt') || elemento.innerText || 'Elemento').trim().slice(0, 120);
        const respuesta = 'Seleccionado: ' + texto + '. Di «dale clic» para activarlo.';
        this.mostrarEstado(respuesta); this.enviar({ accion: 'hablar', texto: respuesta });
    }

    pulsarSeleccion() {
        const elemento = this.elementoSeleccionado;
        if (!elemento) { this.mostrarEstado('Primero di selecciona y el nombre del elemento.'); return; }
        const contenedor = elemento.closest?.('article, li, [role="listitem"]');
        const objetivo = elemento.closest?.('a, button, input, select, summary, [role="button"], [role="link"]') ||
            elemento.querySelector?.('a[href], button, [role="button"], input[type="submit"]') ||
            contenedor?.querySelector('a[href], button, [role="button"]') || elemento;
        // No cambiar a otro control si una tienda elimina/reemplaza el producto seleccionado.
        if (elemento.isConnected !== false) this.pulsarElemento(objetivo);
        else this.mostrarEstado('El elemento seleccionado cambió. Selecciónalo de nuevo.');
        this.limpiarSeleccion();
    }

    enviarFormulario(campo) {
        const formulario = campo?.form || campo?.closest('form');
        if (!formulario) { this.mostrarEstado('Este campo no tiene un formulario. Usa «clic en» y el nombre del botón.'); return false; }
        if (typeof formulario.requestSubmit === 'function') formulario.requestSubmit();
        else {
            const boton = formulario.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
            if (!boton) { this.mostrarEstado('No encontré el botón para enviar.'); return false; }
            boton.click();
        }
        return true;
    }

    ejecutarComando(texto) {
        // Conservar mayúsculas, acentos y contenido dictado; normalizar sólo las intenciones.
        let original = texto.trim().replace(/\s+/g, ' ').replace(/^(?:por favor[, ]+|puedes\s+|podr[ií]as\s+)/i, '');
        let comando = normalizarVoz(original).replace(/[.!?]+$/, '');
        this.mostrarEstado();
        const dictado = /^(escribe|escribir|dicta|dictar|introduce|ingresa texto)\s+/.exec(comando);
        if (dictado) { this.escribirEnCampo(document.activeElement, original.slice(dictado[0].length)); return; }
        original = original.replace(/[, ]+por favor[.!?]*$/i, '').replace(/[.!?]+$/, '');
        comando = normalizarVoz(original);
        if (/^(cancelar|cancela|olvidalo|no hagas nada|cancelar seleccion|quita la seleccion)$/.test(comando)) { this.cancelarEspera(); this.limpiarSeleccion(); this.mostrarEstado('Comando cancelado.'); return; }
        const seleccionar = /^(?:selecciona(?:r)?|resalta(?:r)?)(?:\s+|$)/.exec(comando);
        if (seleccionar) {
            const nombre = original.slice(seleccionar[0].length).replace(/^(?:(?:el|la) )?(?:producto|articulo|item|elemento)(?: llamado)?\s+/i, '').trim();
            this.seleccionarElemento(nombre ? this.encontrarElemento(nombre, 'a, button, [role="button"], [role="link"], summary, input, select, article, li, [role="listitem"], h1, h2, h3, h4, img[alt]') : document.activeElement);
            return;
        }
        if (/^(dale (?:clic|click)|hazle (?:clic|click)|pulsa lo seleccionado|activa lo seleccionado)$/.test(comando)) { this.pulsarSeleccion(); return; }

        const nuevas = /^(?:(?:abre|abrir|crea|crear)\s+)?(?:una\s+)?(?:nueva (pestana|ventana)|(pestana|ventana)(?: nueva)?)$/.exec(comando);
        if (nuevas) { this.enviar({ accion: (nuevas[1] || nuevas[2]) === 'ventana' ? 'crear_ventana' : 'crear_pestana' }); return; }
        if (/^(cierra|cerrar)\s+(?:(?:esta|la|actual)\s+)?(pestana|ventana)(?: actual)?$/.test(comando)) {
            this.enviar({ accion: comando.includes('ventana') ? 'cerrar_ventana' : 'cerrar_pestana' }); return;
        }
        const navegacion = [
            [/^(atras|volver|vuelve|regresa|regresar|retrocede|retroceder|pagina anterior|vuelve atras|volver atras)$/, 'atras'],
            [/^(adelante|avanza|pagina siguiente|ve adelante)$/, 'adelante'],
            [/^(recarga|recargar|actualiza|actualizar|refresca|refrescar)(?: la)?(?: pagina)?$/, 'recargar']
        ];
        for (const [patron, accion] of navegacion) if (patron.test(comando)) { this.enviar({ accion }); return; }
        if (/^(?:cambia (?:a )?(?:la )?)?(siguiente pestana|pestana siguiente|anterior pestana|pestana anterior)$/.test(comando)) {
            this.enviar({ accion: 'cambiar_pestana', direccion: comando.includes('anterior') ? -1 : 1 }); return;
        }
        if (/^(aumenta(?:r)? zoom|acerca(?:r)?|amplia|zoom mas|reduce zoom|aleja(?:r)?|zoom menos|restablece zoom|zoom normal)$/.test(comando)) {
            this.enviar({ accion: 'zoom', direccion: /normal|restablece/.test(comando) ? 0 : /reduce|aleja|menos/.test(comando) ? -1 : 1 }); return;
        }
        if (/^(?:baja(?:r)?|desciende|sube|subir|asciende|(?:(?:desplaza(?:te)?|desliza|haz scroll|scroll) )?(?:hacia )?(?:abajo|arriba))(?: (?:un poco|mas|la pagina|una pantalla))?$/.test(comando)) {
            const cantidad = comando.endsWith('un poco') ? 0.25 : comando.endsWith('mas') ? 0.95 : 0.7;
            window.scrollBy({ top: window.innerHeight * cantidad * (/sube|subir|asciende|arriba/.test(comando) ? -1 : 1), behavior: 'smooth' }); return;
        }
        if (/^(?:ve |ir )?(?:al )?(inicio|principio|final|fin)(?: de (?:la )?pagina)?$/.test(comando)) {
            window.scrollTo({ top: /final|fin\b/.test(comando) ? document.documentElement.scrollHeight : 0, behavior: 'smooth' }); return;
        }
        const cineticos = {
            'activar mouse cinetico': 'activar', 'activar cursor': 'activar',
            'desactivar mouse cinetico': 'desactivar', 'desactivar cursor': 'desactivar',
            'clic derecho': 'derecho', 'click derecho': 'derecho', 'anticlick': 'derecho', 'anticlic': 'derecho', 'menu contextual': 'derecho',
            'haz clic derecho': 'derecho', 'haz click derecho': 'derecho', 'clic secundario': 'derecho',
            'siguiente clic derecho': 'preparar_derecho', 'activar clic derecho': 'preparar_derecho',
            'calibrar cursor': 'calibrar', 'recalibrar': 'calibrar', 'centrar cursor': 'calibrar',
            'postura comoda': 'calibrar', 'acomodar postura': 'calibrar',
            'pausar cursor': 'pausar', 'descansar': 'pausar', 'reanudar cursor': 'reanudar', 'continuar cursor': 'reanudar', 'cancelar clic': 'cancelar',
            'control automatico': 'control_automatico', 'control cabeza': 'control_cabeza',
            'control rostro': 'control_cabeza', 'control torso': 'control_torso',
            'control brazo izquierdo': 'control_brazo_izquierdo', 'control brazo derecho': 'control_brazo_derecho',
            'control manos': 'control_manos', 'control zona libre': 'control_zona', 'control munon': 'control_zona',
            'ajustar temblor': 'temblor', 'activar temblor': 'temblor', 'desactivar temblor': 'sin_temblor',
            'movimientos pequenos': 'movimiento_reducido', 'movilidad reducida': 'movimiento_reducido', 'movimientos normales': 'movimiento_normal',
            'cursor mas lento': 'lento', 'cursor mas rapido': 'rapido'
        };
        if (cineticos[comando]) {
            const disponible = this.accionCinetica?.(cineticos[comando]);
            const estados = { temblor: 'Filtro de temblor activado.', sin_temblor: 'Filtro de temblor desactivado.',
                preparar_derecho: 'El siguiente clic será derecho.', desactivar: 'Mouse cinético desactivado.', cancelar: 'Clic cancelado.' };
            const mensaje = ['calibrar', 'reanudar', 'movimiento_reducido', 'movimiento_normal'].includes(cineticos[comando]) ?
                'Descansa en tu postura cómoda: calibrando sin clic.' : cineticos[comando] === 'pausar' ? 'Cursor pausado. Di reanudar cursor para continuar.' :
                cineticos[comando] === 'activar' ? 'Mouse cinético solicitado. Permite la cámara si el navegador lo pide.' : estados[cineticos[comando]] || 'Acción del cursor aplicada.';
            const respuesta = disponible ? mensaje : this.accionCinetica ?
                'El cursor aún no está listo. Reanuda el cursor o espera a terminar la calibración.' : 'El mouse cinético requiere la versión completa y una página web.';
            this.mostrarEstado(respuesta);
            this.enviar({ accion: 'hablar', texto: respuesta });
            return;
        }
        if (/^(clic|click|haz clic|hacer clic)$/.test(comando)) {
            if (this.elementoSeleccionado) this.pulsarSeleccion();
            else if (!this.accionCinetica?.('izquierdo')) this.pulsarElemento(document.activeElement);
            return;
        }
        if (/^(borra|borrar|limpia|limpiar)(?: el)? (texto|campo)$/.test(comando)) { this.escribirEnCampo(document.activeElement, '', true); return; }
        if (/^(enter|intro|presiona enter|pulsa enter|enviar formulario)$/.test(comando)) { this.enviarFormulario(document.activeElement); return; }
        const enfocar = /^(enfoca|enfocar|activa el campo)\s+/.exec(comando);
        if (enfocar) {
            const campo = this.encontrarElemento(original.slice(enfocar[0].length), 'input, textarea, [contenteditable="true"], select');
            if (campo) campo.focus(); else this.mostrarEstado('No encontré ese campo visible.'); return;
        }
        if (/^(reproduce|reproducir|continuar video|pausa|pausar)(?: (?:el )?(?:video|audio|musica))?$/.test(comando)) {
            const medio = document.querySelector('video:not([id^="adapta-pe-"]), audio');
            if (!medio) { this.mostrarEstado('No encontré video o audio.'); return; }
            if (/^paus/.test(comando)) medio.pause(); else medio.play().catch(() => this.mostrarEstado('La página requiere una interacción para reproducir.'));
            return;
        }

        // Sólo quitar modificadores al final de navegación/búsqueda, nunca dentro del dictado.
        const modificador = /\s+(?:(?:en|en una|en la|en otra)\s+)?(?:nueva (pestana|ventana)|(pestana|ventana) nueva|otra (pestana|ventana))$/.exec(comando);
        const destino = modificador ? (modificador[1] || modificador[2] || modificador[3]) === 'ventana' ? 'ventana' : 'pestana' : 'actual';
        if (modificador) { original = original.slice(0, modificador.index).trim(); comando = normalizarVoz(original); }
        const abrir = /^(abre|abrir|ejecuta|ejecutar|inicia|iniciar|entra a|entra en|ingresa a|ingresa en|ve a|ir a|visita|visitar)\s+(?!(?:una )?busqueda\b)/.exec(comando);
        if (abrir) {
            const objetivo = original.slice(abrir[0].length).replace(/^(?:la pagina(?: de)?|el sitio(?: de)?)\s+/i, '').trim();
            const sitio = reconocerSitio(objetivo);
            if (sitio) { this.enviar({ accion: 'buscar_inteligente', query: '', sitio, destino }); return; }
            if (/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#][^\s]*)?$/i.test(objetivo)) {
                this.enviar({ accion: 'abrir_url', url: /^https?:\/\//i.test(objetivo) ? objetivo : 'https://' + objetivo, destino }); return;
            }
            this.pulsarElemento(this.encontrarElemento(objetivo, 'a, button, [role="button"], summary')); return;
        }
        const buscar = /^(?:busca(?:r)?|busqueda(?: de)?|(?:haz|realiza|ejecuta)(?: una)? busqueda(?: de)?|encuentra|consulta|investiga)\s+/.exec(comando);
        if (buscar) {
            let consulta = original.slice(buscar[0].length).trim();
            const normalizada = normalizarVoz(consulta);
            let sitio;
            for (const [clave, datos] of Object.entries(SitiosVoz)) {
                for (const alias of datos.alias) {
                    if (normalizada.endsWith(' en ' + alias)) { sitio = clave; consulta = consulta.slice(0, -(alias.length + 4)).trim(); }
                    else if (normalizada.startsWith('en ' + alias + ' ')) { sitio = clave; consulta = consulta.slice(alias.length + 4).trim(); }
                    if (sitio) break;
                }
                if (sitio) break;
            }
            if (!consulta || normalizada === 'en ' + (sitio || '')) { this.mostrarEstado('Dime qué quieres buscar.'); return; }
            if (!sitio && destino === 'actual') {
                sitio = Object.keys(SitiosVoz).find(clave => {
                    const dominio = new URL(SitiosVoz[clave].inicio).hostname.replace(/^www\./, '');
                    return SitiosVoz[clave].busqueda && (location.hostname === dominio || location.hostname.endsWith('.' + dominio));
                });
                if (!sitio) {
                    const campo = this.encontrarElemento('buscar', 'input[type="search"], input[name="q"], input[name="search_query"]') ||
                        Array.from(document.querySelectorAll('input[type="search"], input[name="q"], input[name="search_query"]')).find(elemento => elemento.getClientRects().length && this.esEditable(elemento));
                    if (campo?.form || campo?.closest('form')) {
                        campo.focus();
                        if (this.escribirEnCampo(campo, consulta, true)) this.enviarFormulario(campo);
                        return;
                    }
                }
            }
            this.enviar({ accion: 'buscar_inteligente', query: consulta, sitio: sitio || 'google', destino }); return;
        }
        const pulsar = /^(?:haz (?:clic|click) en|hacer (?:clic|click) en|clic en|click en|pulsa|presiona)\s+/.exec(comando);
        if (pulsar) { this.pulsarElemento(this.encontrarElemento(original.slice(pulsar[0].length), 'a, button, [role="button"], summary, input[type="submit"], input[type="button"]')); return; }
        this.mostrarEstado('No entendí. Prueba «abre YouTube», «busca gatos en Google» o «clic en Contacto».');
    }
}
globalThis.VoiceAssistant = VoiceAssistant;
})();
