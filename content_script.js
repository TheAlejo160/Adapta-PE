// --- VARIABLES GLOBALES ---
let talkbackActivo = false;
let vozActiva = false;
let elementoActual = null;
let temporizadorTalkBack = null;

// --- 1. ASISTENTE DE VOZ "ALWAYS-ON" Y GLOBAL ---
let reconocimientoVoz = null;
let microfonoIniciado = false;

function gestionarMicrofono() {
  if (vozActiva) {
    if (!microfonoIniciado) iniciarAsistenteVoz();
  } else {
    if (reconocimientoVoz) {
        reconocimientoVoz.onend = null; // Quitamos el reinicio automático
        reconocimientoVoz.stop();
    }
    microfonoIniciado = false;
    let ui = document.getElementById("adapta-pe-mic-status");
    if(ui) ui.remove();
  }
}

function iniciarAsistenteVoz() {
  if (!('webkitSpeechRecognition' in window)) { console.warn("Navegador no soporta voz."); return; }

  microfonoIniciado = true;
  reconocimientoVoz = new webkitSpeechRecognition();
  reconocimientoVoz.lang = "es-PE";
  reconocimientoVoz.continuous = true; // ESCUCHA CONTINUA MIENTRAS ESTÉ PRENDIDO
  reconocimientoVoz.interimResults = false;

  // UI Visual de Estado
  let ui = document.getElementById("adapta-pe-mic-status");
  if(!ui){
      ui = document.createElement("div");
      ui.id = "adapta-pe-mic-status";
      ui.innerHTML = "🎙️ Escuchando...";
      ui.style.cssText = "position:fixed; bottom:20px; left:20px; background:rgba(227,6,19,0.9); color:white; padding:10px 20px; border-radius:20px; font-family:sans-serif; font-weight:bold; font-size:14px; z-index:999999; box-shadow:0 4px 10px rgba(0,0,0,0.3); pointer-events:none;";
      document.body.appendChild(ui);
  } else {
      ui.innerHTML = "🎙️ Escuchando...";
      ui.style.background = "rgba(227,6,19,0.9)";
  }

  reconocimientoVoz.onresult = (event) => {
    let last = event.results.length - 1;
    let comando = event.results[last][0].transcript.toLowerCase().trim();
    console.log("🗣️ [Adapta PE] Comando detectado:", comando);

    // LÓGICA DE NAVEGACIÓN GLOBAL (CONTROL DEL NAVEGADOR)

    // 1. Pestañas
    if (comando.includes("nueva pestaña") || comando.includes("abrir pestaña")) {
        chrome.runtime.sendMessage({ accion: "hablar", texto: "Abriendo nueva pestaña" });
        chrome.runtime.sendMessage({ accion: "abrir_pestana", url: "https://www.google.com" });
    }
    else if (comando.includes("cerrar pestaña") || comando.includes("cierra la pestaña")) {
        chrome.runtime.sendMessage({ accion: "hablar", texto: "Cerrando pestaña" });
        chrome.runtime.sendMessage({ accion: "cerrar_pestana" });
    }
    // 2. Scroll
    else if (comando === "bajar" || comando === "baja" || comando.includes("hacia abajo")) {
        window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
    }
    else if (comando === "subir" || comando === "sube" || comando.includes("hacia arriba")) {
        window.scrollBy({ top: -(window.innerHeight * 0.7), behavior: 'smooth' });
    }
    // 3. Buscar en Google directamente
    else if (comando.startsWith("buscar ") || comando.startsWith("busca ")) {
        let busqueda = comando.replace("buscar ", "").replace("busca ", "").trim();
        chrome.runtime.sendMessage({ accion: "hablar", texto: "Buscando " + busqueda });
        chrome.runtime.sendMessage({ accion: "buscar_google", query: busqueda });
    }
    // 4. Dictado en cajas de texto activas
    else if (comando.startsWith("escribir ") || comando.startsWith("escribe ")) {
        let dictado = comando.replace("escribir ", "").replace("escribe ", "").trim();
        let campo = document.activeElement;
        if (campo && (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA' || campo.isContentEditable)) {
            if(campo.isContentEditable) campo.innerText += " " + dictado;
            else campo.value += (campo.value ? " " : "") + dictado;
            campo.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
             chrome.runtime.sendMessage({ accion: "hablar", texto: "No hay ninguna caja de texto seleccionada." });
        }
    }
    // 5. Clic a enlaces
    else if (comando.startsWith("abrir ") || comando.startsWith("abre ")) {
        let textoEnlace = comando.replace("abrir ", "").replace("abre ", "").trim();
        let enlaces = Array.from(document.querySelectorAll("a, button"));
        let linkEncontrado = enlaces.find(el => el.innerText.toLowerCase().includes(textoEnlace));
        if (linkEncontrado) {
            linkEncontrado.style.outline = "4px solid #E30613";
            linkEncontrado.click();
        }
    }
  };

  reconocimientoVoz.onerror = (e) => {
      console.log("Voz error/silencio:", e.error);
      ui.innerHTML = "💤 En pausa... Habla de nuevo.";
      ui.style.background = "#555";
  };

  // EL TRUCO ALWAYS-ON: Si se detiene por silencio, lo forzamos a reiniciar automáticamente
  reconocimientoVoz.onend = () => {
    if (vozActiva) {
        try { reconocimientoVoz.start(); } catch(e){}
    }
  };

  try { reconocimientoVoz.start(); } catch(e){}
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
    temporizadorTalkBack = setTimeout(() => {
        chrome.runtime.sendMessage({ accion: "hablar", texto: texto.trim() });
    }, 400);
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
  if (tipo === "ninguno") { document.documentElement.style.filter = "none"; return; }
  const svg = `<svg id="filtros-daltonismo-svg" style="display:none;"><defs>
    <filter id="protanopia"><feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0"/></filter>
    <filter id="deuteranopia"><feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0"/></filter>
    <filter id="tritanopia"><feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0 0, 0.433, 0.567, 0, 0 0, 0.475, 0.525, 0, 0 0, 0, 0, 1, 0"/></filter>
  </defs></svg>`;
  document.body.insertAdjacentHTML('beforeend', svg);
  document.documentElement.style.filter = `url(#${tipo})`;
}

// --- 4. PUNTERO CINÉTICO ULTRA FLUIDO (CÁMARA) ---
let camaraActiva = false;
let stream = null, video = null, canvas = null, ctx = null, frameAnterior = null;
let animationId = null;

let punteroVirtual = null;
let posX = window.innerWidth / 2;
let posY = window.innerHeight / 2;

let tiempoFijado = 0;
let ultimaPosX = posX;
let ultimaPosY = posY;

async function activarCamara(activar) {
  if (activar && !camaraActiva) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      camaraActiva = true;

      // Ocultamos la burbuja de la cámara para no distraer, solo mostramos el puntero
      video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;

      punteroVirtual = document.createElement("div");
      punteroVirtual.id = "adapta-pe-cursor";
      // Puntero rediseñado más suave
      punteroVirtual.style.cssText = "position:fixed; width:22px; height:22px; background:rgba(227,6,19,0.85); border:2px solid white; border-radius:50%; z-index:9999999; pointer-events:none; box-shadow:0 0 12px rgba(0,0,0,0.4); transition: transform 0.1s ease-out; left:50%; top:50%; transform: translate(-50%, -50%);";
      document.body.appendChild(punteroVirtual);

      canvas = document.createElement("canvas");
      canvas.width = 320; canvas.height = 240;
      ctx = canvas.getContext("2d", { willReadFrequently: true });

      bucleCamaraFluida();
    } catch (err) { alert("Adapta PE necesita permiso de cámara."); camaraActiva = false; }
  } else if (!activar && camaraActiva) {
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (document.getElementById("adapta-pe-cursor")) document.getElementById("adapta-pe-cursor").remove();
    cancelAnimationFrame(animationId);
    frameAnterior = null; camaraActiva = false;
  }
}

// Usamos requestAnimationFrame para 60 FPS fluidos
function bucleCamaraFluida() {
  if (!camaraActiva) return;

  ctx.drawImage(video, 0, 0, 320, 240);
  let frameActual = ctx.getImageData(0, 0, 320, 240);

  if (frameAnterior) {
      let sumaX = 0, sumaY = 0, movidos = 0;

      for (let i = 0; i < frameActual.data.length; i += 4) {
          let diff = Math.abs(frameActual.data[i] - frameAnterior.data[i]) +
                     Math.abs(frameActual.data[i+1] - frameAnterior.data[i+1]) +
                     Math.abs(frameActual.data[i+2] - frameAnterior.data[i+2]);

          if (diff > 120) { // Sensibilidad ajustada
              let pixelIndex = i / 4;
              sumaX += (pixelIndex % 320);
              sumaY += Math.floor(pixelIndex / 320);
              movidos++;
          }
      }

      if (movidos > 800) { // Umbral de ruido reducido
          let centroX = sumaX / movidos;
          let centroY = sumaY / movidos;

          // Mapeo absoluto invertido (Espejo)
          let targetX = window.innerWidth - ((centroX / 320) * window.innerWidth);
          let targetY = (centroY / 240) * window.innerHeight;

          // ALGORITMO DE SUAVIZADO Y DEADZONE (Evita que tiemble)
          let dx = targetX - posX;
          let dy = targetY - posY;

          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
              posX += dx * 0.15; // Interpolación suave (Bajo = más suave, Alto = más rápido)
              posY += dy * 0.15;
          }

          punteroVirtual.style.left = posX + "px";
          punteroVirtual.style.top = posY + "px";
      }

      // SISTEMA DE DWELL CLICK MEJORADO
      let distancia = Math.hypot(posX - ultimaPosX, posY - ultimaPosY);
      if (distancia < 5) { // Si está muy quieto
          tiempoFijado++;
          punteroVirtual.style.transform = `translate(-50%, -50%) scale(${1 + (tiempoFijado * 0.03)})`;

          if (tiempoFijado > 40) { // Aprox 1.5 a 2 segundos a 60fps
              console.log("🖱️ Clic disparado");
              punteroVirtual.style.display = "none";
              let el = document.elementFromPoint(posX, posY);
              if (el) el.click();
              punteroVirtual.style.display = "block";

              // Efecto visual de clic exitoso
              punteroVirtual.style.background = "#2ecc71";
              setTimeout(() => punteroVirtual.style.background = "rgba(227,6,19,0.85)", 300);

              tiempoFijado = 0;
              punteroVirtual.style.transform = "translate(-50%, -50%) scale(1)";
          }
      } else {
          tiempoFijado = 0;
          punteroVirtual.style.transform = "translate(-50%, -50%) scale(1)";
      }

      ultimaPosX = posX; ultimaPosY = posY;
  }

  frameAnterior = frameActual;
  animationId = requestAnimationFrame(bucleCamaraFluida);
}

// --- CEREBRO PRINCIPAL ---
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