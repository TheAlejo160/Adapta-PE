class FiltrosDaltonismo {
    constructor() {
        this.idFiltro = "adapta-pe-filtros-svg";
        this.idStyle = "adapta-pe-daltonismo-style";
        this.filtroActual = "ninguno";
    }

    aplicar(tipo) {
        tipo = tipo || "ninguno";

        if (this.filtroActual === tipo) return;

        this.limpiar();
        this.filtroActual = tipo;

        if (tipo === "ninguno") {
            document.documentElement.style.removeProperty('filter');
            return;
        }

        this.inyectarSVG();
        this.inyectarCSS(tipo);
    }

    limpiar() {
        let oldSvg = document.getElementById(this.idFiltro);
        if (oldSvg) oldSvg.remove();

        let oldStyle = document.getElementById(this.idStyle);
        if (oldStyle) oldStyle.remove();

        document.documentElement.style.removeProperty('filter');
    }

    inyectarCSS(tipo) {
        let styleTag = document.createElement("style");
        styleTag.id = this.idStyle;
        styleTag.textContent = `
            html, :fullscreen, ::backdrop {
                filter: url(#${tipo}) !important;
            }
        `;
        (document.head || document.documentElement).appendChild(styleTag);
    }

    inyectarSVG() {
        const svg = `
        <svg id="${this.idFiltro}" aria-hidden="true" style="position:fixed; top:0; left:0; width:0; height:0; z-index:-1; pointer-events:none;">
            <defs>
                <!-- 1. Daltonismo Rojo-Verde (Tricromatismo anómalo y Dicromatismo) -->
                <!-- Protanomalía: Deficiencia de conos rojos. Rojos se ven más verdes. -->
                <filter id="protanomalia"><feColorMatrix type="matrix" values="0.817, 0.183, 0, 0, 0  0.333, 0.667, 0, 0, 0  0, 0.125, 0.875, 0, 0  0, 0, 0, 1, 0"/></filter>
                <!-- Protanopía: Ausencia de conos rojos. -->
                <filter id="protanopia"><feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0"/></filter>
                
                <!-- Deuteranomalía: Deficiencia de conos verdes (El más frecuente). Verdes se ven más rojos. -->
                <filter id="deuteranomalia"><feColorMatrix type="matrix" values="0.8, 0.2, 0, 0, 0  0.258, 0.742, 0, 0, 0  0, 0.142, 0.858, 0, 0  0, 0, 0, 1, 0"/></filter>
                <!-- Deuteranopía: Ausencia de conos verdes. Perciben principalmente azul y amarillo. -->
                <filter id="deuteranopia"><feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0"/></filter>
                
                <!-- 2. Daltonismo Azul-Amarillo -->
                <!-- Tritanomalía: Deficiencia de conos azules. -->
                <filter id="tritanomalia"><feColorMatrix type="matrix" values="0.967, 0.033, 0, 0, 0  0, 0.733, 0.267, 0, 0  0, 0.183, 0.817, 0, 0  0, 0, 0, 1, 0"/></filter>
                <!-- Tritanopía: Ausencia de conos azules (Dicromatismo). -->
                <filter id="tritanopia"><feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0"/></filter>
                
                <!-- 3. Monocromatismo / Acromatopsia -->
                <!-- Falta total de visión del color. Todo en escala de grises. -->
                <filter id="acromatopsia"><feColorMatrix type="matrix" values="0.299, 0.587, 0.114, 0, 0  0.299, 0.587, 0.114, 0, 0  0.299, 0.587, 0.114, 0, 0  0, 0, 0, 1, 0"/></filter>
            </defs>
        </svg>`;

        document.documentElement.insertAdjacentHTML('afterbegin', svg);
    }
}