class VoiceAssistant {
    constructor() {
        this.permitidoPorUsuario = false;
        this.tabVisible = !document.hidden;

        this.reconocimientoVoz = null;
        this.microfonoIniciado = false;
        this.textoReconocido = "";
        this.textoProcesado = "";
        this.esperandoComando = false;
        this.temporizadorEspera = null;
        this.temporizadorSilencio = null;
        this.palabraActivacion = "computadora";
    }

    setEstado(estado) {
        this.permitidoPorUsuario = estado;
        this.evaluarEstado();
    }

    actualizarVisibilidad(esVisible) {
        this.tabVisible = esVisible;
        this.evaluarEstado();
    }

    evaluarEstado() {
        // Solo inicia si el usuario lo activó en el popup Y la pestaña actual está en pantalla
        if (this.permitidoPorUsuario && this.tabVisible) {
            if (!this.microfonoIniciado) {
                this.iniciar();
            }
        } else {
            this.detener();
        }
    }

    reproducirBeep() {
        try {
            let ctx = new (window.AudioContext || window.webkitAudioContext)();
            let osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch(e) {}
    }

    detener() {
        this.microfonoIniciado = false;
        if (this.reconocimientoVoz) {
            this.reconocimientoVoz.onend = null; // Evita que intente reiniciarse en bucle
            this.reconocimientoVoz.abort(); // Corta el uso del micrófono de forma inmediata
            this.reconocimientoVoz = null;
        }
        let ui = document.getElementById("adapta-pe-mic-status");
        if (ui) ui.remove();
    }

    iniciar() {
        if (!('webkitSpeechRecognition' in window)) return;
        this.microfonoIniciado = true;
        this.reconocimientoVoz = new webkitSpeechRecognition();
        this.reconocimientoVoz.lang = "es-PE";
        this.reconocimientoVoz.continuous = true;
        this.reconocimientoVoz.interimResults = true;

        let ui = document.getElementById("adapta-pe-mic-status");
        if (!ui) {
            ui = document.createElement("div");
            ui.id = "adapta-pe-mic-status";
            ui.style.cssText = "position:fixed; bottom:20px; left:20px; background:rgba(227,6,19,0.9); color:white; padding:10px 20px; border-radius:20px; font-family:sans-serif; font-weight:bold; font-size:14px; z-index:999999; box-shadow:0 4px 10px rgba(0,0,0,0.3); pointer-events:none; transition: 0.3s;";
            document.body.appendChild(ui);
        }
        ui.innerHTML = "🎙️ Activo. Di 'Computadora'";

        this.reconocimientoVoz.onresult = (event) => {
            let transcript = Array.from(event.results)
                                  .map(result => result[0].transcript)
                                  .join('').toLowerCase().trim();
            this.textoReconocido = transcript;

            clearTimeout(this.temporizadorSilencio);
            this.temporizadorSilencio = setTimeout(() => {
                this.procesarFraseContinua(ui);
            }, 1000);
        };

        this.reconocimientoVoz.onerror = (e) => {
            if (e.error !== 'aborted') {
                ui.innerHTML = "💤 Reiniciando mic...";
                ui.style.background = "#555";
            }
        };

        this.reconocimientoVoz.onend = () => {
            // Solo intenta reiniciar si el usuario quiere usarlo Y estamos en la pestaña activa Y no se mandó a detener
            if (this.permitidoPorUsuario && this.tabVisible && this.microfonoIniciado) {
                setTimeout(() => { try { this.reconocimientoVoz.start(); } catch(e){} }, 300);
            }
        };
        try { this.reconocimientoVoz.start(); } catch(e){}
    }

    procesarFraseContinua(ui) {
        let textoNuevo = this.textoReconocido;
        if (this.textoProcesado !== "") {
            if (textoNuevo.startsWith(this.textoProcesado)) {
                textoNuevo = textoNuevo.slice(this.textoProcesado.length).trim();
            } else {
                textoNuevo = textoNuevo.replace(this.textoProcesado, "").trim();
            }
        }
        if (textoNuevo === "") return;

        if (this.esperandoComando) {
            this.ejecutarComando(textoNuevo);
            this.textoProcesado = this.textoReconocido;
            this.esperandoComando = false;
            clearTimeout(this.temporizadorEspera);
            ui.innerHTML = "🎙 Activo. Di 'Computadora'";
            ui.style.background = "rgba(227,6,19,0.9)";
        } else {
            if (textoNuevo.includes(this.palabraActivacion)) {
                let partes = textoNuevo.split(this.palabraActivacion);
                let comando = partes[partes.length - 1].trim();

                if (comando.length > 2) {
                    this.ejecutarComando(comando);
                    this.textoProcesado = this.textoReconocido;
                } else {
                    this.reproducirBeep();
                    this.esperandoComando = true;
                    this.textoProcesado = this.textoReconocido;
                    ui.innerHTML = "👂 Dime...";
                    ui.style.background = "#0984e3";

                    clearTimeout(this.temporizadorEspera);
                    this.temporizadorEspera = setTimeout(() => {
                        this.esperandoComando = false;
                        ui.innerHTML = "🎙️ Activo. Di 'Computadora'";
                        ui.style.background = "rgba(227,6,19,0.9)";
                    }, 8000);
                }
            } else {
                this.textoProcesado = this.textoReconocido;
            }
        }
    }

    ejecutarComando(cmd) {
        let cmdLimpio = cmd.replace(/en una nueva pestaña/g, "").replace(/nueva pestaña/g, "").replace(/en otra pestaña/g, "")
                           .replace(/en una nueva ventana/g, "").replace(/nueva ventana/g, "").replace(/en otra ventana/g, "").trim();

        // Determinar destino (Pestaña actual, Nueva Pestaña, Nueva Ventana)
        let destino = "actual";
        if (cmd.includes("nueva ventana") || cmd.includes("en otra ventana")) destino = "ventana";
        else if (cmd.includes("nueva pestaña") || cmd.includes("en otra pestaña")) destino = "pestana";

        // Comandos de Navegación Básica
        if (cmd === "nueva pestaña" || cmd === "abre una pestaña" || cmd === "abre pestaña") {
            chrome.runtime.sendMessage({ accion: "abrir_url", url: "https://www.google.com", destino: "pestana" });
            return;
        }
        if (cmd === "nueva ventana" || cmd === "abre una ventana" || cmd === "abre ventana") {
             chrome.runtime.sendMessage({ accion: "abrir_url", url: "https://www.google.com", destino: "ventana" });
             return;
        }
        if (cmd.includes("cerrar pestaña") || cmd.includes("cierra esta pestaña") || cmd.includes("cerrar ventana")) {
            chrome.runtime.sendMessage({ accion: "cerrar_pestana" });
            return;
        }

        // Scroll
        if (cmd.includes("bajar") || cmd.includes("abajo")) { window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' }); return; }
        if (cmd.includes("subir") || cmd.includes("arriba")) { window.scrollBy({ top: -(window.innerHeight * 0.7), behavior: 'smooth' }); return; }

        // Dictado en inputs
        if (cmdLimpio.startsWith("escribir ") || cmdLimpio.startsWith("escribe ")) {
            let dictado = cmdLimpio.replace(/^(escribir|escribe)\s+/, "").trim();
            let campo = document.activeElement;
            if (campo && (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA' || campo.isContentEditable)) {
                if(campo.isContentEditable) campo.innerText += " " + dictado;
                else campo.value += (campo.value ? " " : "") + dictado;
                campo.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }

        // Sitios conocidos actualizados (coincide con el background.js)
        const sitiosReconocidos = ["youtube", "mercado libre", "canvas", "facebook", "wikipedia", "amazon", "instagram", "chatgpt", "google", "netflix", "twitch", "claude", "gemini", "github", "reddit", "twitter", "x"];

        // Lógica de Abrir/Ir a
        let esAbrir = /^(abre|abrir|ingresa a|entra a|ve a)\s+(.+)/.exec(cmdLimpio);
        if (esAbrir) {
            let objetivo = esAbrir[2].trim();
            let sitioEncontrado = sitiosReconocidos.find(s => objetivo.includes(s)) || "google";
            chrome.runtime.sendMessage({ accion: "buscar_inteligente", query: "", sitio: sitioEncontrado, destino: destino });
            return;
        }

        // Lógica de Buscar
        let esBuscar = /^(busca|buscar)\s+(.+)/.exec(cmdLimpio);
        if (esBuscar) {
            let objetivo = esBuscar[2].trim();
            let sitioDestino = "";

            for (let s of sitiosReconocidos) {
                if (objetivo.endsWith("en " + s)) {
                    sitioDestino = s;
                    objetivo = objetivo.replace("en " + s, "").trim();
                    break;
                }
            }

            if (sitioDestino !== "") {
                chrome.runtime.sendMessage({ accion: "buscar_inteligente", query: objetivo, sitio: sitioDestino, destino: destino });
            } else if (destino !== "actual") {
                chrome.runtime.sendMessage({ accion: "buscar_inteligente", query: objetivo, sitio: "google", destino: destino });
            } else {
                let searchInput = document.querySelector('input[type="search"], input[name="q"], input[name="search_query"], input[placeholder*="uscar"], input[placeholder*="earch"]');

                if (searchInput) {
                    searchInput.value = objetivo;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    let form = searchInput.closest('form');
                    if (form) form.submit();
                    else searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                } else {
                    chrome.runtime.sendMessage({ accion: "buscar_inteligente", query: objetivo, sitio: "google", destino: "actual" });
                }
            }
            return;
        }

        // Click en enlaces
        if (cmdLimpio.startsWith("abrir ") || cmdLimpio.startsWith("click en ") || cmdLimpio.startsWith("clic en ")) {
            let textoEnlace = cmdLimpio.replace(/^(abrir |click en |clic en )/, "").trim();
            let enlaces = Array.from(document.querySelectorAll("a, button, [role='button']"));
            let linkEncontrado = enlaces.find(el => {
                let t = el.innerText.toLowerCase();
                let aria = el.getAttribute('aria-label')?.toLowerCase() || "";
                return t.includes(textoEnlace) || aria.includes(textoEnlace);
            });

            if (linkEncontrado) {
                let prevOutline = linkEncontrado.style.outline;
                linkEncontrado.style.outline = "3px solid #2ecc71";
                setTimeout(() => {
                    linkEncontrado.style.outline = prevOutline;
                    linkEncontrado.click();
                }, 400);
            }
        }
    }
}