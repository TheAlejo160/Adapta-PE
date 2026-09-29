class TalkBack {
    constructor() {
        this.activo = false;
        this.elementoActual = null;
        this.temporizador = null;
        this.validTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'A', 'BUTTON', 'SPAN', 'LI', 'LABEL', 'IMG', 'SVG'];

        this.onMouseOver = this.onMouseOver.bind(this);
        this.onMouseOut = this.onMouseOut.bind(this);
        this.inicializarEventos();
    }

    setEstado(estado) {
        this.activo = estado;
        if (!estado && this.elementoActual) {
            this.elementoActual.style.outline = "none";
            this.elementoActual = null;
            chrome.runtime.sendMessage({ accion: "callar" });
        }
    }

    inicializarEventos() {
        document.addEventListener("mouseover", this.onMouseOver);
        document.addEventListener("mouseout", this.onMouseOut);
    }

    onMouseOver(e) {
        if (!this.activo) return;

        let elemento = e.target;
        let contenedor = elemento.closest('button, a, [role="button"]');
        let finalEl = contenedor || elemento;

        if (!this.validTags.includes(finalEl.tagName.toUpperCase()) && !finalEl.hasAttribute('aria-label')) return;
        if (finalEl === this.elementoActual) return;

        clearTimeout(this.temporizador);
        if (this.elementoActual) this.elementoActual.style.outline = "none";

        this.elementoActual = finalEl;
        finalEl.style.outline = "3px solid #E30613";
        finalEl.style.outlineOffset = "2px";
        finalEl.style.borderRadius = "4px";

        let texto = finalEl.getAttribute('aria-label') || finalEl.getAttribute('alt') || finalEl.innerText || finalEl.textContent;
        if (!texto || texto.trim() === "") {
            if (finalEl.querySelector('svg')) texto = "Botón";
        }

        if (texto && texto.trim() !== "") {
            this.temporizador = setTimeout(() => {
                chrome.runtime.sendMessage({ accion: "hablar", texto: texto.trim() });
            }, 300);
        }
    }

    onMouseOut(e) {
        if (!this.activo) return;
        clearTimeout(this.temporizador);
        if (this.elementoActual) {
            this.elementoActual.style.outline = "none";
            this.elementoActual = null;
            chrome.runtime.sendMessage({ accion: "callar" });
        }
    }
}