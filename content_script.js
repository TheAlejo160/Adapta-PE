// --- VARIABLES GLOBALES ---
let talkbackActivo = false;
let vozActiva = false;
let elementoActual = null;
let temporizadorTalkBack = null;

// --- 1. ASISTENTE DE VOZ (CONTEXTUAL AVANZADO) ---
let reconocimientoVoz = null;
let microfonoIniciado = false;
let textoReconocido = "";
let textoProcesado = "";
let esperandoComando = false;
let temporizadorEspera = null;
let temporizadorSilencio = null;
const palabraActivacion = "computadora";

function reproducirBeep() {
    try {
        let ctx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch(e){}
}

function gestionarMicrofono() {
    if (vozActiva) {
        if (!microfonoIniciado) iniciarAsistenteVoz();
    } else {
        if (reconocimientoVoz) {
            reconocimientoVoz.onend = null;
            reconocimientoVoz.stop();
        }
        microfonoIniciado = false;
        let ui = document.getElementById("adapta-pe-mic-status");
        if(ui) ui.remove();
    }
}

function iniciarAsistenteVoz() {
    if (!('webkitSpeechRecognition' in window)) return;
    microfonoIniciado = true;
    reconocimientoVoz = new webkitSpeechRecognition();
    reconocimientoVoz.lang = "es-PE";
    reconocimientoVoz.continuous = true;
    reconocimientoVoz.interimResults = true;

    let ui = document.getElementById("adapta-pe-mic-status");
    if(!ui){
        ui = document.createElement("div");
        ui.id = "adapta-pe-mic-status";
        ui.style.cssText = "position:fixed; bottom:20px; left:20px; background:rgba(227,6,19,0.9); color:white; padding:10px 20px; border-radius:20px; font-family:sans-serif; font-weight:bold; font-size:14px; z-index:999999; box-shadow:0 4px 10px rgba(0,0,0,0.3); pointer-events:none; transition: 0.3s;";
        document.body.appendChild(ui);
    }
    ui.innerHTML = "🎙️ Activo. Di 'Computadora'";

    reconocimientoVoz.onresult = (event) => {
        let transcript = Array.from(event.results)
                              .map(result => result[0].transcript)
                              .join('').toLowerCase().trim();
        textoReconocido = transcript;

        clearTimeout(temporizadorSilencio);
        temporizadorSilencio = setTimeout(() => {
            procesarFraseContinua(ui);
        }, 1000);
    };

    reconocimientoVoz.onerror = (e) => {
        if (e.error !== 'aborted') {
            ui.innerHTML = "💤 Reiniciando mic...";
            ui.style.background = "#555";
        }
    };

    reconocimientoVoz.onend = () => {
        if (vozActiva) {
            setTimeout(() => { try { reconocimientoVoz.start(); } catch(e){} }, 300);
        }
    };
    try { reconocimientoVoz.start(); } catch(e){}
}

function procesarFraseContinua(ui) {
    let textoNuevo = textoReconocido;
    if (textoProcesado !== "") {
        if (textoNuevo.startsWith(textoProcesado)) {
            textoNuevo = textoNuevo.slice(textoProcesado.length).trim();
        } else {
            textoNuevo = textoNuevo.replace(textoProcesado, "").trim();
        }
    }
    if (textoNuevo === "") return;

    if (esperandoComando) {
        ejecutarComandoInteligente(textoNuevo);
        textoProcesado = textoReconocido;
        esperandoComando = false;
        clearTimeout(temporizadorEspera);
        ui.innerHTML = "🎙️ Activo. Di 'Computadora'";
        ui.style.background = "rgba(227,6,19,0.9)";
    } else {
        if (textoNuevo.includes(palabraActivacion)) {
            let partes = textoNuevo.split(palabraActivacion);
            let comando = partes[partes.length - 1].trim();

            if (comando.length > 2) {
                ejecutarComandoInteligente(comando);
                textoProcesado = textoReconocido;
            } else {
                reproducirBeep();
                esperandoComando = true;
                textoProcesado = textoReconocido;
                ui.innerHTML = "👂 Dime...";
                ui.style.background = "#0984e3";

                clearTimeout(temporizadorEspera);
                temporizadorEspera = setTimeout(() => {
                    esperandoComando = false;
                    ui.innerHTML = "🎙️ Activo. Di 'Computadora'";
                    ui.style.background = "rgba(227,6,19,0.9)";
                }, 8000);
            }
        } else {
            textoProcesado = textoReconocido;
        }
    }
}

function ejecutarComandoInteligente(cmd) {
    console.log("🧠 [Intención Final]:", cmd);

    let enNuevaPestana = cmd.includes("nueva pestaña") || cmd.includes("en otra pestaña") || cmd.includes("en una pestaña nueva");
    let cmdLimpio = cmd.replace(/en una nueva pestaña/g, "").replace(/nueva pestaña/g, "").replace(/en otra pestaña/g, "").trim();

    if (cmd === "nueva pestaña" || cmd === "abre una pestaña" || cmd === "abre pestaña") {
        chrome.runtime.sendMessage({ accion: "abrir_pestana", url: "https://www.google.com" });
        return;
    }
    if (cmd.includes("cerrar pestaña") || cmd.includes("cierra esta pestaña")) {
        chrome.runtime.sendMessage({ accion: "cerrar_pestana" });
        return;
    }
    if (cmd.includes("bajar") || cmd.includes("abajo")) { window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' }); return; }
    if (cmd.includes("subir") || cmd.includes("arriba")) { window.scrollBy({ top: -(window.innerHeight * 0.7), behavior: 'smooth' }); return; }

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

    const sitiosReconocidos = ["youtube", "mercado libre", "canvas", "facebook", "wikipedia", "amazon", "instagram", "chatgpt", "google"];

    let esAbrir = /^(abre|abrir|ingresa a|entra a|ve a)\s+(.+)/.exec(cmdLimpio);
    if (esAbrir) {
        let objetivo = esAbrir[2].trim();
        let sitioEncontrado = sitiosReconocidos.find(s => objetivo.includes(s)) || "google";
        chrome.runtime.sendMessage({ accion: "buscar_inteligente", query: "", sitio: sitioEncontrado, nuevaPestana: enNuevaPestana });
        return;
    }

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
            chrome.runtime.sendMessage({ accion: "buscar_inteligente", query: objetivo, sitio: sitioDestino, nuevaPestana: enNuevaPestana });
        } else if (enNuevaPestana) {
            chrome.runtime.sendMessage({ accion: "buscar_inteligente", query: objetivo, sitio: "google", nuevaPestana: true });
        } else {
            let searchInput = document.querySelector('input[type="search"], input[name="q"], input[name="search_query"], input[placeholder*="uscar"], input[placeholder*="earch"]');

            if (searchInput) {
                searchInput.value = objetivo;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));

                let form = searchInput.closest('form');
                if (form) {
                    form.submit();
                } else {
                    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                }
            } else {
                chrome.runtime.sendMessage({ accion: "buscar_inteligente", query: objetivo, sitio: "google", nuevaPestana: false });
            }
        }
        return;
    }

    if (cmdLimpio.startsWith("abrir ")) {
        let textoEnlace = cmdLimpio.replace("abrir ", "").trim();
        let enlaces = Array.from(document.querySelectorAll("a, button"));
        let linkEncontrado = enlaces.find(el => el.innerText.toLowerCase().includes(textoEnlace));
        if (linkEncontrado) {
            linkEncontrado.style.outline = "4px solid #E30613";
            linkEncontrado.click();
        }
    }
}

// --- 2. TALKBACK ---
const etiquetasValidas = ['P', 'H1', 'H2', 'H3', 'A', 'BUTTON', 'IMG', 'LI', 'SPAN'];
document.addEventListener("mouseover", (e) => {
    if (!talkbackActivo) return;
    let elemento = e.target;
    if (!etiquetasValidas.includes(elemento.tagName)) return;
    if (elemento === elementoActual) return;

    clearTimeout(temporizadorTalkBack);
    if (elementoActual) elementoActual.style.outline = "none";
    elementoActual = elemento;
    elemento.style.outline = "4px solid #E30613";

    let texto = (elemento.tagName === 'IMG') ? (elemento.alt || "Imagen") : (elemento.innerText || elemento.textContent);
    if (texto && texto.trim() !== "") {
        temporizadorTalkBack = setTimeout(() => { chrome.runtime.sendMessage({ accion: "hablar", texto: texto.trim() }); }, 400);
    }
});
document.addEventListener("mouseout", (e) => {
    if (!talkbackActivo) return;
    clearTimeout(temporizadorTalkBack);
    if (elementoActual) { elementoActual.style.outline = "none"; elementoActual = null; chrome.runtime.sendMessage({ accion: "callar" }); }
});

// --- 3. FILTROS DE DALTONISMO ---
function aplicarDaltonismo(tipo) {
    let oldSvg = document.getElementById("filtros-daltonismo-svg");
    if (oldSvg) oldSvg.remove();

    if (tipo === "ninguno") {
        document.documentElement.style.setProperty('filter', 'none', 'important');
        return;
    }

    const svg = `<svg id="filtros-daltonismo-svg" style="position:fixed; top:0; left:0; width:0; height:0; z-index:-1; pointer-events:none;">
    <defs>
      <filter id="protanopia"><feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0"/></filter>
      <filter id="deuteranopia"><feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0"/></filter>
      <filter id="tritanopia"><feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0 0, 0.433, 0.567, 0, 0 0, 0.475, 0.525, 0, 0 0, 0, 0, 1, 0"/></filter>
    </defs></svg>`;

    document.documentElement.insertAdjacentHTML('afterbegin', svg);
    document.documentElement.style.setProperty('filter', `url(#${tipo})`, 'important');
}

// --- 4. MOTOR FÍSICO CINÉTICO (ESTABILIZADO Y CENTRO BLOQUEADO) ---
let camaraActiva = false;
let stream = null, videoEl = null, canvasEl = null, ctx = null, hudCanvasEl = null, hudCtx = null;
let animationId = null, punteroVirtual = null, frameAnterior = null;
let posX = window.innerWidth / 2, posY = window.innerHeight / 2;

// Físicas Joystick Absoluto
const basePoint = { x: 0.5, y: 0.5 }; // ¡ESTRICTAMENTE INAMOVIBLE!
let rawTarget = { x: 0.5, y: 0.5 };
let smoothedPoint = { x: 0.5, y: 0.5 };
let tiempoFijado = 0;

// Zonas de Acción Reducidas
const zonaMuerta = 0.05;      // Zona verde para hacer clic (fija al centro)
const zonaAtraccion = 0.08;   // Zona naranja más ajustada y con poca fuerza
const framesParaClick = 125;   // Tiempo equilibrado para hacer clic
let targetSource = "Buscando...";

async function activarCamara(activar) {
    if (activar && !camaraActiva) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
            camaraActiva = true;
            frameAnterior = null;
            rawTarget = { x: 0.5, y: 0.5 };
            smoothedPoint = { x: 0.5, y: 0.5 };

            let burbuja = document.createElement("div");
            burbuja.id = "adapta-pe-camara-box";
            burbuja.style.cssText = "position:fixed; bottom:20px; right:20px; width:220px; height:165px; border-radius:16px; border: 3px solid #E30613; overflow:hidden; z-index:999999; background:#111; box-shadow: 0 8px 20px rgba(0,0,0,0.5);";

            videoEl = document.createElement("video");
            videoEl.srcObject = stream;
            videoEl.autoplay = true;
            videoEl.style.cssText = "display:none;";

            canvasEl = document.createElement("canvas");
            canvasEl.width = 320; canvasEl.height = 240;
            canvasEl.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; transform: scaleX(-1);";
            ctx = canvasEl.getContext("2d", { willReadFrequently: true });

            hudCanvasEl = document.createElement("canvas");
            hudCanvasEl.width = 320; hudCanvasEl.height = 240;
            hudCanvasEl.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;";
            hudCtx = hudCanvasEl.getContext("2d");

            let infoHUD = document.createElement("div");
            infoHUD.id = "adapta-pe-hud";
            infoHUD.innerHTML = "⏳ Listo";
            infoHUD.style.cssText = "position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,0.85); color:#00ff00; font-family:monospace; font-size:12px; padding:6px 10px; border-radius:6px; font-weight:bold;";

            burbuja.appendChild(videoEl);
            burbuja.appendChild(canvasEl);
            burbuja.appendChild(hudCanvasEl);
            burbuja.appendChild(infoHUD);
            document.body.appendChild(burbuja);

            punteroVirtual = document.createElement("div");
            punteroVirtual.id = "adapta-pe-cursor";
            punteroVirtual.style.cssText = "position:fixed; width:26px; height:26px; background:rgba(227,6,19,0.9); border:2px solid white; border-radius:50%; z-index:9999999; pointer-events:none; box-shadow:0 0 12px rgba(0,0,0,0.5); left:50%; top:50%; transform: translate(-50%, -50%); transition: transform 0.1s;";
            document.body.appendChild(punteroVirtual);

            videoEl.addEventListener('loadeddata', bucleCineticoNativoHUD);

        } catch (err) {
            alert("Adapta PE: YouTube u otra página denegó la cámara. Haz clic en el candado junto a la URL y da permiso.");
            camaraActiva = false;
        }
    } else if (!activar && camaraActiva) {
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (document.getElementById("adapta-pe-camara-box")) document.getElementById("adapta-pe-camara-box").remove();
        if (document.getElementById("adapta-pe-cursor")) document.getElementById("adapta-pe-cursor").remove();
        cancelAnimationFrame(animationId);
        camaraActiva = false;
    }
}

function bucleCineticoNativoHUD() {
    if (!camaraActiva) return;

    ctx.drawImage(videoEl, 0, 0, 320, 240);
    let frameActual = ctx.getImageData(0, 0, 320, 240);
    let hud = document.getElementById("adapta-pe-hud");

    hudCtx.clearRect(0, 0, 320, 240);

    if (frameAnterior) {
        let sumaX = 0, sumaY = 0, pixelesMovidos = 0;

        for (let y = 0; y < 240; y += 4) {
            for (let x = 0; x < 320; x += 4) {
                let i = (y * 320 + x) * 4;
                let diff = Math.abs(frameActual.data[i] - frameAnterior.data[i]) +
                           Math.abs(frameActual.data[i+1] - frameAnterior.data[i+1]) +
                           Math.abs(frameActual.data[i+2] - frameAnterior.data[i+2]);

                if (diff > 50) {
                    sumaX += x; sumaY += y; pixelesMovidos++;
                }
            }
        }

        // Filtro Anti-Salto Fuerte
        if (pixelesMovidos > 60) {
            let instX = 1.0 - ((sumaX / pixelesMovidos) / 320);
            let instY = (sumaY / pixelesMovidos) / 240;

            targetSource = (instY > 0.65) ? "💪 Brazo/Mano" : "🧠 Cabeza";

            // EMA Agresivo: El punto sigue tu movimiento de forma fluida y lenta
            rawTarget.x = rawTarget.x * 0.85 + instX * 0.15;
            rawTarget.y = rawTarget.y * 0.85 + instY * 0.15;
        } else {
            // Regreso suave al centro absoluto si no hay movimiento (Mejora Postura)
            rawTarget.x = rawTarget.x * 0.95 + basePoint.x * 0.05;
            rawTarget.y = rawTarget.y * 0.95 + basePoint.y * 0.05;
        }

        // Segundo Suavizado para hyper-fluidez
        smoothedPoint.x = smoothedPoint.x * 0.80 + rawTarget.x * 0.20;
        smoothedPoint.y = smoothedPoint.y * 0.80 + rawTarget.y * 0.20;

        // --- RENDERIZADO DEL HUD DE JOYSTICK FIJO ---
        let drawBaseX = basePoint.x * 320; // 160 Fijo
        let drawBaseY = basePoint.y * 240; // 120 Fijo
        let drawSmoothX = smoothedPoint.x * 320;
        let drawSmoothY = smoothedPoint.y * 240;

        // Cruz Central Fija
        hudCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        hudCtx.setLineDash([4, 4]);
        hudCtx.lineWidth = 1;
        hudCtx.beginPath();
        hudCtx.moveTo(drawBaseX, 0); hudCtx.lineTo(drawBaseX, 240);
        hudCtx.moveTo(0, drawBaseY); hudCtx.lineTo(320, drawBaseY);
        hudCtx.stroke();
        hudCtx.setLineDash([]);

        // Zona Atracción (Naranja) Reducida
        let pxAtraccion = zonaAtraccion * 320;
        hudCtx.strokeStyle = "rgba(255, 165, 0, 0.8)";
        hudCtx.setLineDash([5, 5]);
        hudCtx.lineWidth = 2;
        hudCtx.beginPath();
        hudCtx.arc(drawBaseX, drawBaseY, pxAtraccion, 0, 2 * Math.PI);
        hudCtx.stroke();
        hudCtx.setLineDash([]);

        // Zona Muerta Verde (Segura / Fija)
        let pxMuerta = zonaMuerta * 320;
        hudCtx.strokeStyle = "rgba(46, 204, 113, 0.9)";
        hudCtx.fillStyle = "rgba(46, 204, 113, 0.1)";
        hudCtx.lineWidth = 2;
        hudCtx.beginPath();
        hudCtx.arc(drawBaseX, drawBaseY, pxMuerta, 0, 2 * Math.PI);
        hudCtx.fill();
        hudCtx.stroke();

        // Punto Rastreador Fluido
        hudCtx.fillStyle = targetSource.includes("Cabeza") ? "#3498db" : "#e74c3c";
        hudCtx.beginPath();
        hudCtx.arc(drawSmoothX, drawSmoothY, 6, 0, 2 * Math.PI);
        hudCtx.fill();
        hudCtx.shadowColor = 'white';
        hudCtx.shadowBlur = 4;
        hudCtx.fill();
        hudCtx.shadowBlur = 0;

        // --- LÓGICA DE MOVIMIENTO DESACELERADO ---
        let deltaX = smoothedPoint.x - basePoint.x;
        let deltaY = smoothedPoint.y - basePoint.y;
        let distancia = Math.hypot(deltaX, deltaY);

        if (distancia <= zonaMuerta) {
            // ZONA SEGURA: Clic (Posición firme y saludable)
            tiempoFijado++;
            let progreso = Math.min(100, (tiempoFijado / framesParaClick) * 100);
            if(hud) hud.innerHTML = `🛑 SEGURO (${Math.round(progreso)}%)`;
            punteroVirtual.style.transform = `translate(-50%, -50%) scale(${1 + (tiempoFijado * 0.02)})`;

            if (tiempoFijado >= framesParaClick) {
                punteroVirtual.style.display = "none";
                let el = document.elementFromPoint(posX, posY);
                if (el) el.click();
                punteroVirtual.style.display = "block";

                punteroVirtual.style.background = "#2ecc71";
                setTimeout(() => punteroVirtual.style.background = "rgba(227,6,19,0.9)", 300);

                tiempoFijado = 0;
            }
        } else {
            tiempoFijado = 0;

            let dirX = deltaX / distancia;
            let dirY = deltaY / distancia;
            let velX = 0, velY = 0;

            if (distancia <= zonaAtraccion) {
                // ZONA ATRACCIÓN: Movimiento extremadamente débil y lento (Máximo control)
                if(hud) hud.innerHTML = `🧲 ATRACCIÓN <span style='font-size:9px; color:#aaa'>(${targetSource})</span>`;
                punteroVirtual.style.transform = "translate(-50%, -50%) scale(1)";

                let suavidadAtraccion = window.innerWidth * 0.001; // Casi imperceptible
                velX = dirX * suavidadAtraccion;
                velY = dirY * suavidadAtraccion;
            } else {
                // ZONA LIBRE: Movimiento fluido, pero tope de velocidad bajo
                if(hud) hud.innerHTML = `🚀 MOVIENDO <span style='font-size:9px; color:#aaa'>(${targetSource})</span>`;
                punteroVirtual.style.transform = "translate(-50%, -50%) scale(1)";

                let activeDelta = distancia - zonaAtraccion;
                let aceleracionControlada = activeDelta * 10;
                let sensibilidadPaso = window.innerWidth * 0.006;

                velX = (dirX * aceleracionControlada * sensibilidadPaso);
                velY = (dirY * aceleracionControlada * sensibilidadPaso);
            }

            // FRENO ABSOLUTO: El mouse no pasará de 8 píxeles de velocidad por frame
            velX = Math.max(-8, Math.min(8, velX));
            velY = Math.max(-8, Math.min(8, velY));

            posX += velX;
            posY += velY;

            posX = Math.max(0, Math.min(window.innerWidth, posX));
            posY = Math.max(0, Math.min(window.innerHeight, posY));

            punteroVirtual.style.left = posX + "px";
            punteroVirtual.style.top = posY + "px";
        }
    }

    frameAnterior = frameActual;
    animationId = requestAnimationFrame(bucleCineticoNativoHUD);
}

// --- ARRANQUE ---
function revisarPreferencias() {
    chrome.storage.local.get(["talkback", "voz", "daltonismo", "ojos"], (res) => {
        talkbackActivo = res.talkback || false;
        vozActiva = res.voz || false;
        aplicarDaltonismo(res.daltonismo || "ninguno");
        activarCamara(res.ojos || false);
        gestionarMicrofono();
    });
}
window.addEventListener("load", revisarPreferencias);
chrome.runtime.onMessage.addListener((request) => {
    if (request.accion === "actualizar_estado") revisarPreferencias();
});