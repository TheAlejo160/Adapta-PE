// --- VARIABLES GLOBALES ---
let talkbackActivo = false;
let vozActiva = false;
let elementoActual = null;
let temporizadorTalkBack = null;

// --- 1. ASISTENTE DE VOZ "ALWAYS-ON" ---
let reconocimientoVoz = null;
let microfonoIniciado = false;

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
  reconocimientoVoz.interimResults = false;

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
    console.log("🗣️ [Adapta PE] Comando:", comando);

    if (comando.includes("nueva pestaña") || comando.includes("abrir pestaña")) {
        chrome.runtime.sendMessage({ accion: "hablar", texto: "Abriendo nueva pestaña" });
        chrome.runtime.sendMessage({ accion: "abrir_pestana", url: "https://www.google.com" });
    }
    else if (comando.includes("cerrar pestaña")) {
        chrome.runtime.sendMessage({ accion: "cerrar_pestana" });
    }
    else if (comando === "bajar" || comando.includes("hacia abajo")) {
        window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
    }
    else if (comando === "subir" || comando.includes("hacia arriba")) {
        window.scrollBy({ top: -(window.innerHeight * 0.7), behavior: 'smooth' });
    }
    else if (comando.startsWith("buscar ")) {
        let busqueda = comando.replace("buscar ", "").trim();
        chrome.runtime.sendMessage({ accion: "buscar_google", query: busqueda });
    }
    else if (comando.startsWith("escribir ")) {
        let dictado = comando.replace("escribir ", "").trim();
        let campo = document.activeElement;
        if (campo && (campo.tagName === 'INPUT' || campo.tagName === 'TEXTAREA' || campo.isContentEditable)) {
            if(campo.isContentEditable) campo.innerText += " " + dictado;
            else campo.value += (campo.value ? " " : "") + dictado;
            campo.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    else if (comando.startsWith("abrir ")) {
        let textoEnlace = comando.replace("abrir ", "").trim();
        let enlaces = Array.from(document.querySelectorAll("a, button"));
        let linkEncontrado = enlaces.find(el => el.innerText.toLowerCase().includes(textoEnlace));
        if (linkEncontrado) {
            linkEncontrado.style.outline = "4px solid #E30613";
            linkEncontrado.click();
        }
    }
  };

  reconocimientoVoz.onerror = (e) => {
      if (e.error !== 'aborted') {
          ui.innerHTML = "💤 En pausa...";
          ui.style.background = "#555";
      }
  };

  reconocimientoVoz.onend = () => { if (vozActiva) { try { reconocimientoVoz.start(); } catch(e){} } };
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
  if (tipo === "ninguno") { document.documentElement.style.filter = "none"; return; }
  const svg = `<svg id="filtros-daltonismo-svg" style="display:none;"><defs>
    <filter id="protanopia"><feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0 0.558, 0.442, 0, 0, 0 0, 0.242, 0.758, 0, 0 0, 0, 0, 1, 0"/></filter>
    <filter id="deuteranopia"><feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0 0.7, 0.3, 0, 0, 0 0, 0.3, 0.7, 0, 0 0, 0, 0, 1, 0"/></filter>
    <filter id="tritanopia"><feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0 0, 0.433, 0.567, 0, 0 0, 0.475, 0.525, 0, 0 0, 0, 0, 1, 0"/></filter>
  </defs></svg>`;
  document.body.insertAdjacentHTML('beforeend', svg);
  document.documentElement.style.filter = `url(#${tipo})`;
}

// --- 4. MOUSE CINÉTICO LOCAL (MATEMÁTICA DE VECTORES Y COORDENADAS) ---
let camaraActiva = false;
let stream = null, videoEl = null, canvasEl = null, ctx = null, frameAnterior = null;
let animationId = null;
let punteroVirtual = null;
let posX = window.innerWidth / 2, posY = window.innerHeight / 2;
let tiempoFijado = 0;

// Estado de calibración y vectores (basado en lógica de coordenadas)
let centroBaseX = 160;
let centroBaseY = 120;
let calibrado = false;

async function activarCamara(activar) {
  if (activar && !camaraActiva) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      camaraActiva = true;
      calibrado = false;

      // Caja inferior flotante de diagnóstico visual (tipo HUD local)
      let burbuja = document.createElement("div");
      burbuja.id = "adapta-pe-camara-box";
      burbuja.style.cssText = "position:fixed; bottom:20px; right:20px; width:200px; height:150px; border-radius:12px; border: 3px solid #E30613; overflow:hidden; z-index:999999; background:#111; box-shadow: 0 8px 20px rgba(0,0,0,0.5);";

      videoEl = document.createElement("video");
      videoEl.srcObject = stream;
      videoEl.autoplay = true;
      videoEl.style.cssText = "display:none;";

      canvasEl = document.createElement("canvas");
      canvasEl.width = 320; canvasEl.height = 240;
      canvasEl.style.cssText = "width:100%; height:100%; object-fit:cover; transform: scaleX(-1);";
      ctx = canvasEl.getContext("2d", { willReadFrequently: true });

      let infoHUD = document.createElement("div");
      infoHUD.id = "adapta-pe-hud";
      infoHUD.innerHTML = "🎯 Calibrando...";
      infoHUD.style.cssText = "position:absolute; bottom:5px; left:5px; background:rgba(0,0,0,0.7); color:#00ff00; font-family:monospace; font-size:10px; padding:3px 6px; border-radius:4px;";

      burbuja.appendChild(videoEl);
      burbuja.appendChild(canvasEl);
      burbuja.appendChild(infoHUD);
      document.body.appendChild(burbuja);

      // Puntero en pantalla
      punteroVirtual = document.createElement("div");
      punteroVirtual.id = "adapta-pe-cursor";
      punteroVirtual.style.cssText = "position:fixed; width:24px; height:24px; background:rgba(227,6,19,0.9); border:2px solid white; border-radius:50%; z-index:9999999; pointer-events:none; box-shadow:0 0 10px rgba(0,0,0,0.5); left:50%; top:50%; transform: translate(-50%, -50%); transition: transform 0.1s;";
      document.body.appendChild(punteroVirtual);

      bucleLocalCinetico();
    } catch (err) {
      alert("No se pudo acceder a la cámara.");
      camaraActiva = false;
    }
  } else if (!activar && camaraActiva) {
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (document.getElementById("adapta-pe-camara-box")) document.getElementById("adapta-pe-camara-box").remove();
    if (document.getElementById("adapta-pe-cursor")) document.getElementById("adapta-pe-cursor").remove();
    cancelAnimationFrame(animationId);
    frameAnterior = null;
    camaraActiva = false;
  }
}

function bucleLocalCinetico() {
  if (!camaraActiva) return;

  ctx.drawImage(videoEl, 0, 0, 320, 240);
  let frameActual = ctx.getImageData(0, 0, 320, 240);

  if (frameAnterior) {
      let sumaX = 0, sumaY = 0, totalMovidos = 0;
      let minX = 320, maxX = 0;

      // Análisis local por coordenadas de píxeles activos (rostro, cabeza, brazos, muñones)
      for (let y = 0; y < 240; y += 2) {
          for (let x = 0; x < 320; x += 2) {
              let i = (y * 320 + x) * 4;
              let diff = Math.abs(frameActual.data[i] - frameAnterior.data[i]) +
                         Math.abs(frameActual.data[i+1] - frameAnterior.data[i+1]) +
                         Math.abs(frameActual.data[i+2] - frameAnterior.data[i+2]);

              if (diff > 45) { // Sensibilidad alta para detectar giros de cabeza o extremidades/muñones
                  sumaX += x;
                  sumaY += y;
                  totalMovidos++;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
              }
          }
      }

      let hud = document.getElementById("adapta-pe-hud");

      if (totalMovidos > 200) {
          let currentX = sumaX / totalMovidos;
          let currentY = sumaY / totalMovidos;

          // Autocalibración inicial en los primeros segundos
          if (!calibrado) {
              centroBaseX = currentX;
              centroBaseY = currentY;
              calibrado = true;
              if(hud) hud.innerHTML = "✅ Activo (Control OK)";
          }

          // Diferencial de movimiento (Detecta giros e inclinaciones relativas al centro base)
          let deltaX = currentX - centroBaseX;
          let deltaY = currentY - centroBaseY;

          console.log(`🧭 [LOCAL VECTORS] dX: ${deltaX.toFixed(1)}, dY: ${deltaY.toFixed(1)} | Píxeles: ${totalMovidos}`);
          if(hud) hud.innerHTML = `dX:${deltaX.toFixed(0)} dY:${deltaY.toFixed(0)}`;

          let velX = 0;
          let velY = 0;
          let umbralGiro = 12; // Zona muerta para evitar temblores o tics leves

          // Lógica de dirección limpia por giros / inclinaciones o señalamiento con muñones/brazos
          if (deltaX > umbralGiro) {
              velX = -7; // Giro o inclinación a la izquierda
          } else if (deltaX < -umbralGiro) {
              velX = 7;  // Giro o inclinación a la derecha
          }

          if (deltaY < -umbralGiro) {
              velY = -7; // Cabeza arriba / brazo arriba
          } else if (deltaY > umbralGiro) {
              velY = 7;  // Cabeza abajo / brazo abajo
          }

          posX += velX;
          posY += velY;

          posX = Math.max(0, Math.min(window.innerWidth, posX));
          posY = Math.max(0, Math.min(window.innerHeight, posY));

          punteroVirtual.style.left = posX + "px";
          punteroVirtual.style.top = posY + "px";

          // Sistema Dwell Click (Autoclick si se mantiene estático tras un movimiento)
          if (Math.abs(velX) === 0 && Math.abs(velY) === 0) {
              tiempoFijado++;
              punteroVirtual.style.transform = `translate(-50%, -50%) scale(${1 + (tiempoFijado * 0.04)})`;

              if (tiempoFijado > 45) {
                  console.log("🖱️ [Adapta PE] Clic automático por fijación");
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
              punteroVirtual.style.transform = "translate(-50%, -50%) scale(1)";
          }
      } else {
          if(hud) hud.innerHTML = "💤 En reposo (Estable)";
          tiempoFijado = 0;
      }
  }

  frameAnterior = frameActual;
  animationId = requestAnimationFrame(bucleLocalCinetico);
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