/*
 * AdaptaPE · Tutorial en video — componentes compartidos (window.AP).
 *
 * Vanilla JS + GSAP (shared/vendor/gsap.min.js, cargado por index.html).
 * Cada helper:
 *   - recibe el timeline PAUSADO de la escena (`tl`), un contenedor (`padre`,
 *     Element o selector) y un objeto de opciones;
 *   - construye su DOM de forma síncrona dentro de `padre`;
 *   - añade sus tweens a `tl` en tiempos EXPLÍCITOS, en segundos relativos al
 *     inicio de la escena (los mismos que `AP.t('cap05', 'f2')`).
 *
 * Determinismo: nada de Date.now, performance.now, Math.random, fetch ni
 * `repeat: -1`. Lo «aleatorio» sale de AP.azar(semilla). Los textos que se
 * «escriben» son <span> que cambian de opacidad, no callbacks.
 *
 * Coordenadas: píxeles del lienzo 1920×1080 relativos a `padre` (que debe ser
 * un contenedor posicionado, p. ej. la raíz de la escena con clase .ap-escena).
 * Zonas seguras: no dibujar texto en y < 96 (barra de progreso) ni en
 * y > 840 (subtítulos). Ver CONTRATO-ESCENAS.md.
 */
(function () {
  "use strict";

  // ───────────────────────── utilidades ─────────────────────────

  const RAIZ_ASSETS = "assets/marca/"; // relativo a index.html (raíz del proyecto)

  function $(padre) {
    if (typeof padre === "string") {
      const el = document.querySelector(padre);
      if (!el) throw new Error("AP: no existe el contenedor " + padre);
      return el;
    }
    return padre;
  }

  function crear(etiqueta, clase, html) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (html != null) el.innerHTML = html;
    return el;
  }

  function escapar(texto) {
    return String(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function px(el, op) {
    if (op.x != null) el.style.left = op.x + "px";
    if (op.y != null) el.style.top = op.y + "px";
    if (op.ancho != null) el.style.width = op.ancho + "px";
    if (op.alto != null) el.style.height = op.alto + "px";
  }

  /** PRNG determinista (mulberry32). `AP.azar(7)()` → número en [0, 1). */
  function azar(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Entrada estándar. `efecto`: "subir" | "bajar" | "izquierda" | "derecha" |
   * "escala" | "rebote" | "nada". Si `t` es null el elemento queda visible
   * desde el principio.
   */
  function entrar(tl, el, t, efecto, dur) {
    if (t == null || efecto === "nada") return;
    const d = dur || 0.6;
    const desde = { opacity: 0 };
    const hasta = { opacity: 1, duration: d, ease: "power3.out" };
    switch (efecto) {
      case "bajar":
        desde.y = -40;
        hasta.y = 0;
        break;
      case "izquierda":
        desde.x = -60;
        hasta.x = 0;
        break;
      case "derecha":
        desde.x = 60;
        hasta.x = 0;
        break;
      case "escala":
        desde.scale = 0.92;
        hasta.scale = 1;
        hasta.ease = "expo.out";
        hasta.duration = d + 0.2;
        break;
      case "rebote":
        desde.scale = 0.6;
        hasta.scale = 1;
        hasta.ease = "back.out(1.7)";
        break;
      default:
        desde.y = 40;
        hasta.y = 0;
    }
    tl.fromTo(el, desde, hasta, t);
  }

  /**
   * Destello que aparece de golpe en `t` con el estado `inicio` y se desvanece
   * hacia `fin` (opacidad 0). Antes de `t` el elemento queda invisible incluso
   * al hacer seek hacia atrás (un fromTo normal mostraría su estado inicial).
   */
  function pulso(tl, el, t, inicio, fin) {
    tl.set(el, inicio, t);
    tl.to(el, Object.assign({ opacity: 0, ease: "power2.out" }, fin), t);
  }

  /** Salida suave dentro de la escena (para cambiar de idea; ver contrato). */
  function salir(tl, el, t, dur) {
    if (t == null) return;
    tl.to(el, { opacity: 0, y: -24, duration: dur || 0.4, ease: "power2.in" }, t);
  }

  // ───────────────────────── iconos (línea, currentColor) ─────────────────────────

  const svg = (cuerpo, extra) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
    (extra || "") +
    ">" +
    cuerpo +
    "</svg>";

  const ICONOS = {
    mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/><path d="M8 21h8"/>'),
    atras: svg('<path d="M15 18l-6-6 6-6"/>'),
    adelante: svg('<path d="M9 18l6-6-6-6"/>'),
    recargar: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    candado: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    pieza: svg('<path d="M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4z"/>'),
    minimizar: svg('<path d="M5 12h14"/>'),
    maximizar: svg('<rect x="5" y="5" width="14" height="14" rx="1"/>'),
    cerrar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    check: svg('<path d="M5 12l5 5 9-11"/>'),
    navegador: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="6.5" cy="6.5" r=".6" fill="currentColor"/>'),
    monitor: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
    estrella: svg('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
    ojo: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    paleta: svg('<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1.2-1-1.4-1-2.6 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/>'),
    cursor: svg('<path d="M5 3l14 7-6 2-2 6z"/>'),
    altavoz: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'),
    cabeza: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>'),
  };

  // ───────────────────────── tiempos de la narración ─────────────────────────

  function capitulo(id) {
    const T = window.TIEMPOS;
    if (!T) throw new Error("AP: falta datos/tiempos.js (window.TIEMPOS)");
    const c = T.capitulos.find((x) => x.id === id);
    if (!c) throw new Error("AP: capítulo desconocido " + id);
    return c;
  }

  /** Frases del capítulo: [{id, texto, inicio, fin}] con tiempos relativos a la escena. */
  function frases(id) {
    return capitulo(id).frases;
  }

  /**
   * Inicio (s, relativo a la escena) de una frase. `frase` puede ser el id
   * ("f3") o el índice 0-based. Si no existe devuelve `respaldo` (o lanza si
   * no se pasa), para que una escena no se rompa cuando cambie el guion.
   */
  function t(idCapitulo, frase, respaldo) {
    const lista = frases(idCapitulo);
    const f = typeof frase === "number" ? lista[frase] : lista.find((x) => x.id === frase);
    if (f) return f.inicio;
    if (respaldo != null) return respaldo;
    throw new Error("AP: frase " + frase + " no existe en " + idCapitulo);
  }

  /** Fin (s, relativo a la escena) de una frase. Misma semántica que `t`. */
  function tFin(idCapitulo, frase, respaldo) {
    const lista = frases(idCapitulo);
    const f = typeof frase === "number" ? lista[frase] : lista.find((x) => x.id === frase);
    if (f) return f.fin;
    if (respaldo != null) return respaldo;
    throw new Error("AP: frase " + frase + " no existe en " + idCapitulo);
  }

  // ───────────────────────── ambiente ─────────────────────────

  /**
   * Fondo decorativo compartido: dos halos que respiran, rejilla de puntos que
   * deriva y viñeta. Llamarlo PRIMERO para que quede detrás del contenido.
   * @param {object} op {duracion (s, obligatorio), semilla=1, halos=true, puntos=true}
   */
  function ambiente(tl, padre, op) {
    op = op || {};
    const dur = op.duracion;
    if (!(dur > 0)) throw new Error("AP.ambiente: falta `duracion`");
    const r = azar(op.semilla || 1);
    const caja = crear("div", "ap-ambiente");
    caja.setAttribute("data-layout-ignore", "");
    const halo1 = crear("div", "ap-ambiente-halo");
    const halo2 = crear("div", "ap-ambiente-halo azul");
    halo1.style.left = Math.round(-300 + r() * 400) + "px";
    halo1.style.top = Math.round(-420 + r() * 200) + "px";
    halo2.style.left = Math.round(1000 + r() * 300) + "px";
    halo2.style.top = Math.round(300 + r() * 200) + "px";
    const puntos = crear("div", "ap-ambiente-puntos");
    const vineta = crear("div", "ap-ambiente-viñeta");
    if (op.puntos !== false) caja.appendChild(puntos);
    if (op.halos !== false) {
      caja.appendChild(halo1);
      caja.appendChild(halo2);
    }
    caja.appendChild(vineta);
    $(padre).prepend(caja);

    const ciclo = 6;
    const rep = Math.max(0, Math.floor(dur / ciclo) - 1);
    tl.fromTo(halo1, { scale: 0.9, x: 0 }, { scale: 1.1, x: 80, duration: ciclo / 2, ease: "sine.inOut", yoyo: true, repeat: rep * 2 + 1 }, 0);
    tl.fromTo(halo2, { scale: 1.08, y: 0 }, { scale: 0.92, y: -60, duration: ciclo / 2, ease: "sine.inOut", yoyo: true, repeat: rep * 2 + 1 }, 0);
    tl.fromTo(puntos, { x: 0, y: 0 }, { x: 64, y: -64, duration: dur, ease: "none" }, 0);
    return caja;
  }

  // ───────────────────────── ventana de navegador ─────────────────────────

  /**
   * Ventana de Chrome falsa: pestaña, barra con URL e icono de AdaptaPE.
   * @param {object} op
   *   id, x=160, y=120, ancho=1600, alto=700,
   *   pestana="AdaptaPE", favicon (ruta img opcional),
   *   url="adaptape.cc", extension="base"|"lite"|null (icono en la barra),
   *   entrada (s|null), efecto="escala"
   * @returns {{el, cuerpo, url, iconoExtension, escribirUrl(t, texto, dur)}}
   *   `cuerpo`: contenedor de la página (fondo claro) para capturas o maquetas.
   *   `escribirUrl(t, texto, dur=1)`: sustituye la URL letra a letra.
   */
  function navegador(tl, padre, op) {
    op = Object.assign({ x: 160, y: 120, ancho: 1600, alto: 700, pestana: "AdaptaPE", url: "adaptape.cc", extension: "base", efecto: "escala" }, op);
    const el = crear("div", "ap-nav");
    if (op.id) el.id = op.id;
    px(el, op);
    const favicon = op.favicon
      ? '<img src="' + escapar(op.favicon) + '" alt="">'
      : '<span class="ap-nav-favicon"></span>';
    const icono =
      op.extension === "lite" ? "adapta-lite.webp" : op.extension === "base" ? "adapta-base-transparent.webp" : null;
    el.innerHTML =
      '<div class="ap-nav-pestanas"><div class="ap-nav-semaforo"><i></i><i></i><i></i></div>' +
      '<div class="ap-nav-pestana">' + favicon + "<span>" + escapar(op.pestana) + "</span></div></div>" +
      '<div class="ap-nav-barra"><div class="ap-nav-flechas">' + ICONOS.atras + ICONOS.adelante + ICONOS.recargar + "</div>" +
      '<div class="ap-nav-url">' + ICONOS.candado + '<span class="ap-nav-url-texto">' + escapar(op.url) + "</span></div>" +
      '<div class="ap-nav-extensiones">' +
      (icono ? '<span class="ap-nav-extension ap-nav-adapta"><img src="' + RAIZ_ASSETS + icono + '" alt="AdaptaPE"></span>' : "") +
      '<span class="ap-nav-extension">' + ICONOS.pieza + "</span></div></div>" +
      '<div class="ap-nav-cuerpo"></div>';
    $(padre).appendChild(el);
    entrar(tl, el, op.entrada, op.efecto, 0.7);

    const urlTexto = el.querySelector(".ap-nav-url-texto");
    return {
      el,
      cuerpo: el.querySelector(".ap-nav-cuerpo"),
      url: el.querySelector(".ap-nav-url"),
      iconoExtension: el.querySelector(".ap-nav-adapta"),
      escribirUrl(tiempo, texto, dur) {
        return escribir(tl, urlTexto, tiempo, texto, dur || 1);
      },
    };
  }

  /**
   * Escribe `texto` letra a letra dentro de `el` a partir de `tiempo`
   * (el texto anterior desaparece en ese instante). Cada letra es un <span>
   * con opacidad: determinista bajo seek y sin tocar `display`.
   * @returns {Element} el <span> con el texto nuevo
   */
  function escribir(tl, el, tiempo, texto, dur) {
    const { nuevo } = prepararCambio(tl, el, tiempo);
    const letras = Array.from(String(texto));
    letras.forEach((c) => {
      const s = crear("span");
      s.textContent = c;
      s.style.opacity = "0";
      nuevo.appendChild(s);
    });
    const paso = (dur || 1) / Math.max(1, letras.length);
    Array.from(nuevo.children).forEach((s, i) => tl.set(s, { opacity: 1 }, tiempo + i * paso));
    return nuevo;
  }

  /**
   * Sustituye el texto de `el` por `texto` en `tiempo` con un fundido corto.
   * @param {object} [estilo] propiedades GSAP extra para el texto nuevo (p. ej. {color:"#86efac"})
   * @returns {Element} el <span> con el texto nuevo
   */
  function cambiarTexto(tl, el, tiempo, texto, estilo) {
    const { nuevo } = prepararCambio(tl, el, tiempo);
    nuevo.textContent = texto;
    tl.fromTo(nuevo, { opacity: 0 }, Object.assign({ opacity: 1, duration: 0.2, ease: "power1.out" }, estilo || {}), tiempo);
    return nuevo;
  }

  // El texto viejo queda superpuesto (absoluto) y se apaga en `tiempo`; el nuevo
  // ocupa el flujo desde el principio pero invisible, así el layout no salta.
  function prepararCambio(tl, el, tiempo) {
    const viejo = crear("span", null, el.innerHTML);
    viejo.style.cssText = "position:absolute;left:0;top:0;white-space:nowrap";
    const nuevo = crear("span");
    nuevo.style.opacity = "0";
    el.innerHTML = "";
    el.style.position = "relative";
    el.appendChild(nuevo);
    el.appendChild(viejo);
    tl.set(viejo, { opacity: 0 }, tiempo);
    tl.set(nuevo, { opacity: 1 }, tiempo);
    return { viejo, nuevo };
  }

  // ───────────────────────── ventana de app de escritorio ─────────────────────────

  /**
   * Ventana de app de escritorio, estilo Windows 11 o macOS.
   * @param {object} op
   *   id, estilo="windows"|"macos", titulo="AdaptaPE", edicion="base"|"lite",
   *   x=260, y=130, ancho=1400, alto=680, entrada, efecto="escala"
   * @returns {{el, cuerpo}}  `cuerpo`: área de contenido (fondo claro).
   */
  function ventanaApp(tl, padre, op) {
    op = Object.assign({ estilo: "windows", titulo: "AdaptaPE", edicion: "base", x: 260, y: 130, ancho: 1400, alto: 680, efecto: "escala" }, op);
    const el = crear("div", "ap-app " + (op.estilo === "macos" ? "macos" : "windows"));
    if (op.id) el.id = op.id;
    px(el, op);
    const icono = RAIZ_ASSETS + (op.edicion === "lite" ? "adapta-lite.webp" : "adapta-base-transparent.webp");
    if (op.estilo === "macos") {
      el.innerHTML =
        '<div class="ap-app-barra"><div class="ap-app-semaforo"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>' +
        '<span class="ap-app-titulo">' + escapar(op.titulo) + "</span></div>" +
        '<div class="ap-app-cuerpo"></div>';
    } else {
      el.innerHTML =
        '<div class="ap-app-barra"><img src="' + icono + '" alt=""><span class="ap-app-titulo">' + escapar(op.titulo) + "</span>" +
        '<div class="ap-app-controles"><span>' + ICONOS.minimizar + "</span><span>" + ICONOS.maximizar + "</span><span>" + ICONOS.cerrar + "</span></div></div>" +
        '<div class="ap-app-cuerpo"></div>';
    }
    $(padre).appendChild(el);
    entrar(tl, el, op.entrada, op.efecto, 0.7);
    return { el, cuerpo: el.querySelector(".ap-app-cuerpo") };
  }

  // ───────────────────────── panel popup de la extensión ─────────────────────────

  /**
   * Panel estilizado tipo popup de AdaptaPE con interruptores.
   * (Para mostrar el popup REAL usa la captura de assets/capturas/.)
   * @param {object} op
   *   id, x=1240, y=150, edicion="base"|"lite",
   *   interruptores=[{texto:"Voz", activo:false, cambiaEn:null}],
   *   entrada, efecto="bajar"
   *   `cambiaEn` (s): momento en que el interruptor pasa a activado.
   * @returns {{el, interruptores: Element[]}}
   */
  function popup(tl, padre, op) {
    op = Object.assign({ x: 1240, y: 150, edicion: "base", interruptores: [], efecto: "bajar" }, op);
    const el = crear("div", "ap-popup");
    if (op.id) el.id = op.id;
    px(el, op);
    const lite = op.edicion === "lite";
    el.innerHTML =
      '<div class="ap-popup-cabecera"><img src="' + RAIZ_ASSETS + (lite ? "adapta-lite.webp" : "adapta-base-transparent.webp") + '" alt="">' +
      '<div><div class="ap-popup-nombre">AdaptaPE</div><div class="ap-popup-edicion">' + (lite ? "Lite" : "Base") + "</div></div></div>";
    const filas = op.interruptores.map((it) => {
      const fila = crear(
        "div",
        "ap-interruptor",
        "<span>" + escapar(it.texto) + '</span><span style="display:flex;align-items:center;gap:20px"><span class="ap-interruptor-estado">' +
          (it.activo ? "Activado" : "Desactivado") +
          '</span><span class="ap-interruptor-pista"><span class="ap-interruptor-relleno"></span><span class="ap-interruptor-perilla"></span></span></span>'
      );
      el.appendChild(fila);
      const relleno = fila.querySelector(".ap-interruptor-relleno");
      const perilla = fila.querySelector(".ap-interruptor-perilla");
      const estado = fila.querySelector(".ap-interruptor-estado");
      if (it.activo) {
        relleno.style.opacity = "1";
        perilla.style.background = "var(--ap-tinta)";
        tl.set(perilla, { x: 44 }, 0);
      }
      if (it.cambiaEn != null && !it.activo) {
        tl.fromTo(relleno, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" }, it.cambiaEn);
        tl.fromTo(perilla, { x: 0, backgroundColor: "#f1f5f9" }, { x: 44, backgroundColor: "#0f172a", duration: 0.3, ease: "back.out(2)" }, it.cambiaEn);
        estado.style.minWidth = "200px";
        cambiarTexto(tl, estado, it.cambiaEn, "Activado", { color: "#86efac" });
      }
      return fila;
    });
    $(padre).appendChild(el);
    entrar(tl, el, op.entrada, op.efecto, 0.5);
    return { el, interruptores: filas };
  }

  // ───────────────────────── burbuja de comando de voz ─────────────────────────

  /**
   * Burbuja «Computadora, …» con micrófono, pitido visual y onda de audio.
   * La palabra de activación se pinta en verde; el resto aparece palabra a palabra.
   * @param {object} op
   *   id, texto="Computadora, abre YouTube", x=240, y=560,
   *   entrada (s, obligatorio), pitido=entrada+0.2 (s: anillo que se expande),
   *   duracion=2.4 (s que «habla» la onda), dictado=true (palabras una a una),
   *   salida (s|null), efecto="subir"
   * @returns {{el, mic, onda}}
   */
  function comandoVoz(tl, padre, op) {
    op = Object.assign({ texto: "Computadora, abre YouTube", x: 240, y: 560, duracion: 2.4, dictado: true, efecto: "subir" }, op);
    if (op.entrada == null) throw new Error("AP.comandoVoz: falta `entrada`");
    const pitido = op.pitido != null ? op.pitido : op.entrada + 0.2;
    const el = crear("div", "ap-voz");
    if (op.id) el.id = op.id;
    px(el, op);
    const N = 14;
    let barras = "";
    for (let i = 0; i < N; i++) barras += "<i></i>";
    const palabras = String(op.texto).split(/\s+/).filter(Boolean);
    const html = palabras
      .map((p, i) => {
        const act = i === 0 && /^computador/i.test(p) ? " ap-voz-activacion" : "";
        return '<span class="ap-voz-palabra' + act + '">' + escapar(p) + "</span>";
      })
      .join(" ");
    el.innerHTML =
      '<div class="ap-voz-mic">' + ICONOS.mic + '<span class="ap-voz-pitido"></span><span class="ap-voz-pitido"></span></div>' +
      '<div class="ap-voz-cuerpo"><div class="ap-voz-texto">' + html + '</div><div class="ap-voz-onda">' + barras + "</div></div>";
    $(padre).appendChild(el);
    entrar(tl, el, op.entrada, op.efecto, 0.5);

    // Pitido: dos anillos que se expanden y el micrófono late.
    const anillos = el.querySelectorAll(".ap-voz-pitido");
    anillos.forEach((a, i) => pulso(tl, a, pitido + i * 0.18, { scale: 1, opacity: 0.9 }, { scale: 1.9, duration: 0.7 }));
    const mic = el.querySelector(".ap-voz-mic");
    tl.fromTo(mic, { scale: 1 }, { scale: 1.12, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1 }, pitido);

    // Palabras: activación con el pitido; el resto repartido en `duracion`.
    const spans = el.querySelectorAll(".ap-voz-palabra");
    if (op.dictado) {
      const paso = op.duracion / Math.max(1, spans.length);
      spans.forEach((s, i) => {
        tl.fromTo(s, { opacity: 0.18 }, { opacity: 1, duration: 0.18, ease: "power1.out" }, pitido + i * paso);
      });
    }

    // Onda: alturas deterministas (suma de senos), una clave cada 0.12 s.
    const bars = el.querySelectorAll(".ap-voz-onda i");
    const pasoOnda = 0.12;
    const pasos = Math.max(1, Math.floor(op.duracion / pasoOnda));
    bars.forEach((b, i) => {
      const claves = [];
      for (let k = 0; k <= pasos; k++) {
        const u = k / pasos;
        const env = Math.sin(Math.PI * Math.min(1, u * 1.05)); // sube y baja
        const v = 0.25 + 0.75 * env * (0.55 + 0.45 * Math.sin(i * 1.7 + k * 1.3) * Math.cos(i * 0.6 - k * 0.9));
        claves.push({ scaleY: Math.max(0.12, Math.min(1, v)) });
      }
      claves.push({ scaleY: 0.12 });
      tl.fromTo(b, { scaleY: 0.12 }, { keyframes: claves, duration: op.duracion + pasoOnda, ease: "none" }, pitido);
    });
    salir(tl, el, op.salida);
    return { el, mic, onda: el.querySelector(".ap-voz-onda") };
  }

  // ───────────────────────── cursor con dwell ─────────────────────────

  /**
   * Cursor animable con anillo de permanencia (dwell) de AdaptaPE.
   * @param {object} op  id, x=960, y=540, tipo="flecha"|"punto", entrada (s|null)
   * @returns {object} cursor con métodos encadenables (todos usan el mismo tl):
   *   .mover(t, x, y, dur=0.8, ease="power2.inOut")  desplaza la punta a (x, y)
   *   .dwell(t, dur=1)   anillo que se llena en `dur` s y termina en clic
   *   .clic(t)           onda de clic (sin anillo)
   *   .ocultar(t)        desvanece el cursor
   *   .el                elemento raíz
   */
  function cursor(tl, padre, op) {
    op = Object.assign({ x: 960, y: 540, tipo: "flecha" }, op);
    const el = crear("div", "ap-cursor");
    if (op.id) el.id = op.id;
    const C = 2 * Math.PI * 50;
    el.innerHTML =
      '<svg class="ap-cursor-anillo" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="50" fill="rgba(15,23,42,.55)" stroke="rgba(241,245,249,.35)" stroke-width="8"/>' +
      '<circle class="ap-cursor-progreso" cx="60" cy="60" r="50" fill="none" stroke="#86efac" stroke-width="10" stroke-linecap="round" transform="rotate(-90 60 60)" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + C.toFixed(2) + '"/></svg>' +
      '<span class="ap-cursor-onda"></span>' +
      (op.tipo === "punto"
        ? '<span class="ap-cursor-punto"></span>'
        : '<svg class="ap-cursor-flecha" viewBox="0 0 32 40" aria-hidden="true"><path d="M3 2 L3 31 L10.5 24.5 L15.5 36 L20.5 33.8 L15.6 22.6 L25.5 22.6 Z" fill="#ffffff" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/></svg>');
    $(padre).appendChild(el);
    tl.set(el, { x: op.x, y: op.y }, 0);
    if (op.entrada != null) tl.fromTo(el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, op.entrada);

    const anillo = el.querySelector(".ap-cursor-anillo");
    const progreso = el.querySelector(".ap-cursor-progreso");
    const onda = el.querySelector(".ap-cursor-onda");
    const api = {
      el,
      mover(t, x, y, dur, ease) {
        tl.to(el, { x, y, duration: dur || 0.8, ease: ease || "power2.inOut" }, t);
        return api;
      },
      dwell(t, dur) {
        const d = dur || 1;
        tl.fromTo(anillo, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.15, ease: "power2.out" }, t);
        tl.fromTo(progreso, { attr: { "stroke-dashoffset": C } }, { attr: { "stroke-dashoffset": 0 }, duration: d, ease: "none" }, t);
        api.clic(t + d);
        tl.to(anillo, { opacity: 0, scale: 1.15, duration: 0.25, ease: "power2.in" }, t + d + 0.05);
        return api;
      },
      clic(t) {
        pulso(tl, onda, t, { opacity: 1, scale: 0.4 }, { scale: 1.8, duration: 0.5 });
        return api;
      },
      ocultar(t) {
        tl.to(el, { opacity: 0, duration: 0.3, ease: "power1.in" }, t);
        return api;
      },
    };
    return api;
  }

  // ───────────────────────── tarjeta de paso ─────────────────────────

  /**
   * Tarjeta «Paso 1 de 3» + texto corto (≤ 7 palabras).
   * @param {object} op id, n, total, texto, etiqueta (sustituye «Paso n de total»,
   *   p. ej. "Consejo 1 de 3"), x=96, y=180, entrada, salida, efecto="izquierda"
   */
  function paso(tl, padre, op) {
    op = Object.assign({ x: 96, y: 180, efecto: "izquierda" }, op);
    const el = crear("div", "ap-paso");
    if (op.id) el.id = op.id;
    px(el, op);
    el.innerHTML =
      '<div class="ap-paso-numero">' + escapar(op.n) + "</div>" +
      '<div><div class="ap-paso-meta">' + escapar(op.etiqueta || "Paso " + op.n + " de " + op.total) + '</div><div class="ap-paso-texto">' + escapar(op.texto) + "</div></div>";
    $(padre).appendChild(el);
    entrar(tl, el, op.entrada, op.efecto, 0.6);
    if (op.entrada != null) {
      tl.fromTo(el.querySelector(".ap-paso-numero"), { scale: 0.5 }, { scale: 1, duration: 0.5, ease: "back.out(2.2)" }, op.entrada + 0.1);
    }
    salir(tl, el, op.salida);
    return el;
  }

  // ───────────────────────── chip de edición / plataforma ─────────────────────────

  const CHIPS = {
    base: { clase: "base", texto: "Sólo Base", icono: "estrella" },
    lite: { clase: "lite", texto: "Sólo Lite", icono: "estrella" },
    ambos: { clase: "", texto: "Base y Lite", icono: "check" },
    extension: { clase: "plataforma", texto: "Extensión", icono: "navegador" },
    windows: { clase: "plataforma", texto: "Windows", icono: "monitor" },
    macos: { clase: "plataforma", texto: "macOS", icono: "monitor" },
    escritorio: { clase: "plataforma", texto: "Escritorio", icono: "monitor" },
  };

  /**
   * Chip de etiqueta. El color nunca es el único indicador: siempre hay texto.
   * @param {object} op id, tipo="base"|"lite"|"ambos"|"extension"|"windows"|"macos"|"escritorio",
   *   texto (opcional, sustituye el predeterminado), x, y, entrada, salida, efecto="rebote"
   */
  function chip(tl, padre, op) {
    op = Object.assign({ tipo: "ambos", x: 96, y: 120, efecto: "rebote" }, op);
    const def = CHIPS[op.tipo] || CHIPS.ambos;
    const el = crear("span", "ap-chip " + def.clase);
    if (op.id) el.id = op.id;
    px(el, { x: op.x, y: op.y });
    el.innerHTML = ICONOS[def.icono] + "<span>" + escapar(op.texto || def.texto) + "</span>";
    $(padre).appendChild(el);
    entrar(tl, el, op.entrada, op.efecto, 0.5);
    salir(tl, el, op.salida);
    return el;
  }

  // ───────────────────────── título de capítulo ─────────────────────────

  /**
   * Título de capítulo: «Capítulo N» + regla + título + subtítulo opcional.
   * Ocupa el área segura completa; úsalo al inicio de la escena.
   * @param {object} op id, numero, titulo, sub, etiqueta (sustituye «Capítulo N»),
   *   entrada=0.2, salida (s|null)
   */
  function tituloCapitulo(tl, padre, op) {
    op = Object.assign({ entrada: 0.2 }, op);
    const el = crear("div", "ap-capitulo");
    if (op.id) el.id = op.id;
    el.innerHTML =
      '<div class="ap-capitulo-numero"><span class="ap-capitulo-regla"></span><span>' + escapar(op.etiqueta || (op.numero != null && op.numero !== "" ? "Capítulo " + op.numero : "AdaptaPE")) + "</span></div>" +
      '<h1 class="ap-capitulo-titulo">' + escapar(op.titulo) + "</h1>" +
      (op.sub ? '<p class="ap-capitulo-sub">' + escapar(op.sub) + "</p>" : "");
    $(padre).appendChild(el);
    const t0 = op.entrada;
    if (t0 != null) {
      tl.fromTo(el.querySelector(".ap-capitulo-regla"), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power3.out" }, t0);
      tl.fromTo(el.querySelector(".ap-capitulo-numero span:last-child"), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, t0 + 0.1);
      tl.fromTo(el.querySelector(".ap-capitulo-titulo"), { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, t0 + 0.2);
      const sub = el.querySelector(".ap-capitulo-sub");
      if (sub) tl.fromTo(sub, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, t0 + 0.5);
    }
    salir(tl, el, op.salida, 0.5);
    return el;
  }

  // ───────────────────────── rótulo inferior ─────────────────────────

  /**
   * Rótulo inferior (lower third) sobre la franja de subtítulos, nunca dentro.
   * @param {object} op id, texto (≤ 7 palabras), lado="izquierda"|"derecha", entrada, salida
   */
  function rotulo(tl, padre, op) {
    op = Object.assign({ lado: "izquierda" }, op);
    const el = crear("div", "ap-rotulo" + (op.lado === "derecha" ? " derecha" : ""));
    if (op.id) el.id = op.id;
    el.innerHTML = '<span class="ap-rotulo-marca"></span><span>' + escapar(op.texto) + "</span>";
    $(padre).appendChild(el);
    entrar(tl, el, op.entrada, op.lado === "derecha" ? "derecha" : "izquierda", 0.5);
    if (op.entrada != null) {
      tl.fromTo(el.querySelector(".ap-rotulo-marca"), { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: "power3.out" }, op.entrada + 0.15);
    }
    salir(tl, el, op.salida);
    return el;
  }

  // ───────────────────────── foco / resaltado de zona ─────────────────────────

  /**
   * Resalta un rectángulo: oscurece el resto (opcional) y dibuja un borde verde
   * que late. Añádelo DESPUÉS del contenido que quieres resaltar.
   * @param {object} op id, x, y, ancho, alto, radio=20, oscurecer=true, entrada, salida, latidos=2
   */
  function foco(tl, padre, op) {
    op = Object.assign({ radio: 20, oscurecer: true, latidos: 2 }, op);
    const el = crear("div", "ap-foco");
    if (op.id) el.id = op.id;
    el.setAttribute("data-layout-allow-occlusion", "");
    px(el, op);
    el.style.borderRadius = op.radio + "px";
    el.innerHTML = (op.oscurecer ? '<span class="ap-foco-velo"></span>' : "") + '<span class="ap-foco-borde"></span>';
    $(padre).appendChild(el);
    const borde = el.querySelector(".ap-foco-borde");
    if (op.entrada != null) {
      tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, op.entrada);
      tl.fromTo(borde, { scale: 1.08 }, { scale: 1, duration: 0.5, ease: "power3.out" }, op.entrada);
      if (op.latidos > 0) {
        tl.to(borde, { scale: 1.03, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: op.latidos * 2 - 1 }, op.entrada + 0.5);
      }
    }
    if (op.salida != null) tl.to(el, { opacity: 0, duration: 0.35, ease: "power1.in" }, op.salida);
    return el;
  }

  // ───────────────────────── flecha de anotación ─────────────────────────

  /**
   * Flecha curva que se dibuja de `desde` a `hasta`, con etiqueta opcional en el origen.
   * @param {object} op id, desde=[x,y], hasta=[x,y], curva=0.25 (curvatura, ±),
   *   texto (opcional, ≤ 7 palabras), entrada, dur=0.7, salida, grosor=8
   */
  function flecha(tl, padre, op) {
    op = Object.assign({ curva: 0.25, dur: 0.7, grosor: 8 }, op);
    const [x1, y1] = op.desde;
    const [x2, y2] = op.hasta;
    const mx = (x1 + x2) / 2 - (y2 - y1) * op.curva;
    const my = (y1 + y2) / 2 + (x2 - x1) * op.curva;
    const ang = Math.atan2(y2 - my, x2 - mx);
    const L = 30;
    const p1 = [x2 - L * Math.cos(ang - 0.5), y2 - L * Math.sin(ang - 0.5)];
    const p2 = [x2 - L * Math.cos(ang + 0.5), y2 - L * Math.sin(ang + 0.5)];
    const largo = curvaLargo(x1, y1, mx, my, x2, y2);
    const caja = crear("div", "ap-flecha-caja");
    caja.style.cssText = "position:absolute;left:0;top:0;width:0;height:0";
    if (op.id) caja.id = op.id;
    caja.innerHTML =
      '<svg class="ap-flecha" width="1920" height="1080" viewBox="0 0 1920 1080" aria-hidden="true">' +
      '<path class="ap-flecha-trazo" d="M' + x1 + " " + y1 + " Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + x2 + " " + y2 + '" fill="none" stroke="#86efac" stroke-width="' + op.grosor + '" stroke-linecap="round" stroke-dasharray="' + largo.toFixed(1) + '" stroke-dashoffset="' + largo.toFixed(1) + '"/>' +
      '<path class="ap-flecha-punta" d="M' + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + " L" + x2 + " " + y2 + " L" + p2[0].toFixed(1) + " " + p2[1].toFixed(1) + '" fill="none" stroke="#86efac" stroke-width="' + op.grosor + '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    let etiqueta = null;
    if (op.texto) {
      etiqueta = crear("div", "ap-flecha-etiqueta");
      etiqueta.textContent = op.texto;
      etiqueta.style.left = x1 + "px";
      etiqueta.style.top = y1 + "px";
      caja.appendChild(etiqueta);
    }
    $(padre).appendChild(caja);
    const trazo = caja.querySelector(".ap-flecha-trazo");
    const punta = caja.querySelector(".ap-flecha-punta");
    if (op.entrada != null) {
      if (etiqueta) tl.fromTo(etiqueta, { opacity: 0, xPercent: -50, yPercent: -130, scale: 0.8 }, { opacity: 1, xPercent: -50, yPercent: -130, scale: 1, duration: 0.4, ease: "back.out(2)" }, op.entrada);
      tl.fromTo(trazo, { attr: { "stroke-dashoffset": largo } }, { attr: { "stroke-dashoffset": 0 }, duration: op.dur, ease: "power2.inOut" }, op.entrada + (etiqueta ? 0.2 : 0));
      tl.fromTo(punta, { opacity: 0 }, { opacity: 1, duration: 0.15 }, op.entrada + (etiqueta ? 0.2 : 0) + op.dur - 0.1);
    } else if (etiqueta) {
      tl.set(etiqueta, { xPercent: -50, yPercent: -130 }, 0);
    }
    if (op.salida != null) tl.to(caja, { opacity: 0, duration: 0.3 }, op.salida);
    return caja;
  }

  function curvaLargo(x1, y1, cx, cy, x2, y2) {
    let largo = 0;
    let px0 = x1;
    let py0 = y1;
    for (let i = 1; i <= 40; i++) {
      const u = i / 40;
      const xx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2;
      const yy = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2;
      largo += Math.hypot(xx - px0, yy - py0);
      px0 = xx;
      py0 = yy;
    }
    return largo;
  }

  // ───────────────────────── mascota (sprite) ─────────────────────────

  // Atlas de assets/marca/sprites/<nombre>/atlas.webp: 12×12 cuadros de 192×224,
  // margen 4, separación 4. Filas y cuadros copiados de cuy.json (iguales en las tres).
  const ATLAS = { ancho: 2356, alto: 2740, cw: 192, ch: 224, margen: 4, sep: 4 };
  const ANIMS = {
    idle: { fila: 0, ms: 230, entrada: [], bucle: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], salida: [] },
    look: { fila: 1, ms: 180, entrada: [], bucle: [4, 1, 2, 5, 8, 7, 6, 3, 0], salida: [] },
    sleep: { fila: 2, ms: 320, entrada: [0, 1, 2, 3, 4], bucle: [5, 6, 7, 8, 7, 6], salida: [] },
    wake: { fila: 3, ms: 170, entrada: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], bucle: [11], salida: [] },
    read: { fila: 4, ms: 200, entrada: [0, 1, 2], bucle: [3, 4, 5, 6, 7, 8, 7, 6, 5, 4], salida: [9, 10, 11] },
    phone: { fila: 5, ms: 200, entrada: [0, 1, 2], bucle: [3, 4, 5, 6, 7, 8, 7, 6, 5, 4], salida: [9, 10, 11] },
    scratch: { fila: 6, ms: 145, entrada: [0, 1, 2], bucle: [3, 4, 5, 6, 7, 8], salida: [9, 10, 11] },
    talk: { fila: 7, ms: 135, entrada: [0, 1, 2], bucle: [3, 4, 5, 6, 7, 8, 7, 6, 5, 4], salida: [9, 10, 11] },
    laptop: { fila: 8, ms: 185, entrada: [0, 1, 2, 3], bucle: [4, 5, 6, 7, 8, 7, 6, 5], salida: [9, 10, 11] },
    confused: { fila: 9, ms: 210, entrada: [0, 1, 2], bucle: [3, 4, 5, 6, 7, 8, 7, 6, 5, 4], salida: [9, 10, 11] },
    happy: { fila: 10, ms: 180, entrada: [0, 1, 2], bucle: [3, 4, 5, 6, 7, 8], salida: [9, 10, 11] },
    wave: { fila: 11, ms: 185, entrada: [0, 1, 2], bucle: [3, 4, 5, 6, 7, 8], salida: [9, 10, 11] },
  };

  /**
   * Mascota animada desde su atlas (Cuchu = cuy, Tinku = gallito, Yati = llama).
   * Cada cuadro es un tl.set de background-position: determinista bajo seek.
   * @param {object} op
   *   id, nombre="cuchu"|"tinku"|"yati", x, y, alto=280 (px),
   *   animaciones=[{anim:"idle", desde:0, hasta:5}] (s; tramos sin solaparse),
   *   entrada (s|null), efecto="rebote", salida
   *   anim ∈ idle, look, sleep, wake, read, phone, scratch, talk, laptop, confused, happy, wave
   * @returns {Element}
   */
  function mascota(tl, padre, op) {
    op = Object.assign({ nombre: "cuchu", alto: 280, animaciones: [{ anim: "idle", desde: 0, hasta: 4 }], efecto: "rebote" }, op);
    const s = op.alto / ATLAS.ch;
    const el = crear("div", "ap-mascota");
    if (op.id) el.id = op.id;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", op.nombre);
    el.style.left = op.x + "px";
    el.style.top = op.y + "px";
    el.style.width = Math.round(ATLAS.cw * s) + "px";
    el.style.height = Math.round(ATLAS.ch * s) + "px";
    el.style.backgroundImage = 'url("' + RAIZ_ASSETS + "sprites/" + op.nombre + '/atlas.webp")';
    el.style.backgroundSize = (ATLAS.ancho * s).toFixed(1) + "px " + (ATLAS.alto * s).toFixed(1) + "px";
    const pos = (fila, col) =>
      "-" + ((ATLAS.margen + col * (ATLAS.cw + ATLAS.sep)) * s).toFixed(1) + "px -" + ((ATLAS.margen + fila * (ATLAS.ch + ATLAS.sep)) * s).toFixed(1) + "px";
    const primera = ANIMS[(op.animaciones[0] || {}).anim] || ANIMS.idle;
    el.style.backgroundPosition = pos(primera.fila, (primera.entrada[0] != null ? primera.entrada : primera.bucle)[0]);
    $(padre).appendChild(el);

    op.animaciones.forEach((tramo) => {
      const a = ANIMS[tramo.anim];
      if (!a) throw new Error("AP.mascota: animación desconocida " + tramo.anim);
      const paso = a.ms / 1000;
      const total = tramo.hasta - tramo.desde;
      const nSalida = a.salida.length;
      const secuencia = a.entrada.slice();
      const huecoBucle = Math.max(0, Math.floor(total / paso) - secuencia.length - nSalida);
      for (let i = 0; i < huecoBucle; i++) secuencia.push(a.bucle[i % a.bucle.length]);
      secuencia.push.apply(secuencia, a.salida);
      secuencia.forEach((col, i) => {
        const tt = tramo.desde + i * paso;
        if (tt < tramo.hasta) tl.set(el, { backgroundPosition: pos(a.fila, col) }, tt);
      });
    });
    entrar(tl, el, op.entrada, op.efecto, 0.6);
    salir(tl, el, op.salida);
    return el;
  }

  // ───────────────────────── exportación ─────────────────────────

  window.AP = {
    // datos
    capitulo,
    frases,
    t,
    tFin,
    azar,
    iconos: ICONOS,
    // movimiento base
    entrar,
    salir,
    pulso,
    escribir,
    cambiarTexto,
    // componentes
    ambiente,
    navegador,
    ventanaApp,
    popup,
    comandoVoz,
    cursor,
    paso,
    chip,
    tituloCapitulo,
    rotulo,
    foco,
    flecha,
    mascota,
  };
})();
