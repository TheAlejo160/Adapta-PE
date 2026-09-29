class KineticEngine {
    constructor() {
        this.activa = false;
        this.stream = null;
        this.videoEl = null;
        this.canvasEl = null;
        this.ctx = null;
        this.hudCanvasEl = null;
        this.hudCtx = null;
        this.animationId = null;
        this.punteroVirtual = null;
        this.frameAnterior = null;

        this.posX = window.innerWidth / 2;
        this.posY = window.innerHeight / 2;
        this.basePoint = { x: 0.5, y: 0.5 };
        this.rawTarget = { x: 0.5, y: 0.5 };
        this.smoothedPoint = { x: 0.5, y: 0.5 };

        this.tiempoFijado = 0;
        this.zonaMuerta = 0.045;
        this.zonaAtraccion = 0.06;
        this.framesParaClick = 100;
        this.targetSource = "Buscando...";

        this.bucleRender = this.bucleRender.bind(this);
    }

    setEstado(estado) {
        if (estado && !this.activa) this.iniciarCamara();
        else if (!estado && this.activa) this.detenerCamara();
    }

    async iniciarCamara() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
            this.activa = true;
            this.frameAnterior = null;
            this.rawTarget = { x: 0.5, y: 0.5 };
            this.smoothedPoint = { x: 0.5, y: 0.5 };

            let burbuja = document.createElement("div");
            burbuja.id = "adapta-pe-camara-box";
            burbuja.style.cssText = "position:fixed; bottom:20px; right:20px; width:220px; height:165px; border-radius:16px; border: 3px solid #2ecc71; overflow:hidden; z-index:999999; background:#111; box-shadow: 0 8px 20px rgba(0,0,0,0.5); transition: border-color 0.3s;";

            this.videoEl = document.createElement("video");
            this.videoEl.srcObject = this.stream;
            this.videoEl.autoplay = true;
            this.videoEl.style.cssText = "display:none;";

            this.canvasEl = document.createElement("canvas");
            this.canvasEl.width = 320; this.canvasEl.height = 240;
            this.canvasEl.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; transform: scaleX(-1);";
            this.ctx = this.canvasEl.getContext("2d", { willReadFrequently: true });

            this.hudCanvasEl = document.createElement("canvas");
            this.hudCanvasEl.width = 320; this.hudCanvasEl.height = 240;
            this.hudCanvasEl.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;";
            this.hudCtx = this.hudCanvasEl.getContext("2d");

            let infoHUD = document.createElement("div");
            infoHUD.id = "adapta-pe-hud";
            infoHUD.innerHTML = "⏳ Listo";
            infoHUD.style.cssText = "position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,0.85); color:#00ff00; font-family:monospace; font-size:12px; padding:6px 10px; border-radius:6px; font-weight:bold;";

            burbuja.appendChild(this.videoEl);
            burbuja.appendChild(this.canvasEl);
            burbuja.appendChild(this.hudCanvasEl);
            burbuja.appendChild(infoHUD);
            document.body.appendChild(burbuja);

            this.punteroVirtual = document.createElement("div");
            this.punteroVirtual.id = "adapta-pe-cursor";
            this.punteroVirtual.style.cssText = "position:fixed; width:26px; height:26px; background:rgba(227,6,19,0.9); border:2px solid white; border-radius:50%; z-index:9999999; pointer-events:none; box-shadow:0 0 12px rgba(0,0,0,0.5); left:50%; top:50%; transform: translate(-50%, -50%); transition: transform 0.1s;";
            document.body.appendChild(this.punteroVirtual);

            this.videoEl.addEventListener('loadeddata', this.bucleRender);

        } catch (err) {
            alert("Adapta PE: YouTube u otra página denegó la cámara. Haz clic en el candado junto a la URL y da permiso.");
            this.activa = false;
        }
    }

    detenerCamara() {
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        if (document.getElementById("adapta-pe-camara-box")) document.getElementById("adapta-pe-camara-box").remove();
        if (document.getElementById("adapta-pe-cursor")) document.getElementById("adapta-pe-cursor").remove();
        cancelAnimationFrame(this.animationId);
        this.activa = false;
    }

    bucleRender() {
        if (!this.activa) return;

        this.ctx.drawImage(this.videoEl, 0, 0, 320, 240);
        let frameActual = this.ctx.getImageData(0, 0, 320, 240);
        let hud = document.getElementById("adapta-pe-hud");

        this.hudCtx.clearRect(0, 0, 320, 240);

        if (this.frameAnterior) {
            let sumaX = 0, sumaY = 0, pixelesMovidos = 0;
            let minX = 320, maxX = 0, minY = 240, maxY = 0;

            for (let y = 0; y < 240; y += 4) {
                for (let x = 0; x < 320; x += 4) {
                    let i = (y * 320 + x) * 4;
                    let diff = Math.abs(frameActual.data[i] - this.frameAnterior.data[i]) +
                               Math.abs(frameActual.data[i+1] - this.frameAnterior.data[i+1]) +
                               Math.abs(frameActual.data[i+2] - this.frameAnterior.data[i+2]);

                    if (diff > 40) {
                        sumaX += x; sumaY += y; pixelesMovidos++;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (pixelesMovidos > 40) {
                let masaX = sumaX / pixelesMovidos;
                let masaY = sumaY / pixelesMovidos;
                let estableX = masaX;
                let estableY = masaY;

                let isHead = masaY < 150;

                if (isHead) {
                    this.targetSource = "🧠 Cabeza";
                    estableY = (minY * 0.7) + (masaY * 0.3);
                } else {
                    this.targetSource = "✋ Brazo/Mano";
                    estableY = masaY;
                }

                let instX = 1.0 - (estableX / 320);
                let instY = estableY / 240;
                instY = 0.5 + (instY - 0.5) * 1.4;

                this.rawTarget.x = this.rawTarget.x * 0.75 + instX * 0.25;
                this.rawTarget.y = this.rawTarget.y * 0.75 + instY * 0.25;
            } else {
                this.rawTarget.x = this.rawTarget.x * 0.95 + this.basePoint.x * 0.05;
                this.rawTarget.y = this.rawTarget.y * 0.95 + this.basePoint.y * 0.05;
            }

            this.smoothedPoint.x = this.smoothedPoint.x * 0.80 + this.rawTarget.x * 0.20;
            this.smoothedPoint.y = this.smoothedPoint.y * 0.80 + this.rawTarget.y * 0.20;

            let drawBaseX = this.basePoint.x * 320;
            let drawBaseY = this.basePoint.y * 240;
            let drawSmoothX = this.smoothedPoint.x * 320;
            let drawSmoothY = this.smoothedPoint.y * 240;

            this.hudCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            this.hudCtx.setLineDash([4, 4]); this.hudCtx.lineWidth = 1; this.hudCtx.beginPath();
            this.hudCtx.moveTo(drawBaseX, 0); this.hudCtx.lineTo(drawBaseX, 240);
            this.hudCtx.moveTo(0, drawBaseY); this.hudCtx.lineTo(320, drawBaseY); this.hudCtx.stroke();
            this.hudCtx.setLineDash([]);

            let pxAtraccion = this.zonaAtraccion * 320;
            this.hudCtx.strokeStyle = "rgba(255, 165, 0, 0.8)"; this.hudCtx.setLineDash([5, 5]); this.hudCtx.lineWidth = 2;
            this.hudCtx.beginPath(); this.hudCtx.arc(drawBaseX, drawBaseY, pxAtraccion, 0, 2 * Math.PI); this.hudCtx.stroke(); this.hudCtx.setLineDash([]);

            let pxMuerta = this.zonaMuerta * 320;
            this.hudCtx.strokeStyle = "rgba(46, 204, 113, 0.9)"; this.hudCtx.fillStyle = "rgba(46, 204, 113, 0.1)"; this.hudCtx.lineWidth = 2;
            this.hudCtx.beginPath(); this.hudCtx.arc(drawBaseX, drawBaseY, pxMuerta, 0, 2 * Math.PI); this.hudCtx.fill(); this.hudCtx.stroke();

            this.hudCtx.fillStyle = this.targetSource.includes("Cabeza") ? "#e74c3c" : "#3498db";
            this.hudCtx.beginPath(); this.hudCtx.arc(drawSmoothX, drawSmoothY, 6, 0, 2 * Math.PI); this.hudCtx.fill();

            let deltaX = this.smoothedPoint.x - this.basePoint.x;
            let deltaY = this.smoothedPoint.y - this.basePoint.y;
            let distancia = Math.hypot(deltaX, deltaY);

            if (distancia <= this.zonaMuerta) {
                this.tiempoFijado++;
                let progreso = Math.min(100, (this.tiempoFijado / this.framesParaClick) * 100);
                if(hud) hud.innerHTML = `🛑 SEGURO (${Math.round(progreso)}%)`;
                this.punteroVirtual.style.transform = `translate(-50%, -50%) scale(${1 + (this.tiempoFijado * 0.02)})`;

                let box = document.getElementById("adapta-pe-camara-box");
                if(box) box.style.borderColor = "#2ecc71";

                if (this.tiempoFijado >= this.framesParaClick) {
                    this.punteroVirtual.style.display = "none";
                    let el = document.elementFromPoint(this.posX, this.posY);
                    if (el) el.click();
                    this.punteroVirtual.style.display = "block";

                    this.punteroVirtual.style.background = "#2ecc71";
                    setTimeout(() => this.punteroVirtual.style.background = "rgba(227,6,19,0.9)", 300);
                    this.tiempoFijado = 0;
                }
            } else {
                this.tiempoFijado = 0;
                let dirX = deltaX / distancia;
                let dirY = deltaY / distancia;
                let velX = 0, velY = 0;

                let box = document.getElementById("adapta-pe-camara-box");
                if(box) box.style.borderColor = "#E30613";

                let factorSensibilidad = this.targetSource.includes("Cabeza") ? 1.2 : 0.7;

                if (distancia <= this.zonaAtraccion) {
                    if(hud) hud.innerHTML = `🧲 PRECISIÓN <span style='font-size:9px; color:#aaa'>(${this.targetSource})</span>`;
                    let precisionSpeed = window.innerWidth * 0.002 * factorSensibilidad;
                    velX = dirX * precisionSpeed;
                    velY = dirY * precisionSpeed;
                } else {
                    if(hud) hud.innerHTML = `🚀 MOVIENDO <span style='font-size:9px; color:#aaa'>(${this.targetSource})</span>`;
                    let activeDelta = distancia - this.zonaAtraccion;
                    let aceleracion = Math.pow(activeDelta * 10, 1.15);
                    let sensibilidad = window.innerWidth * 0.007 * factorSensibilidad;
                    velX = (dirX * aceleracion * sensibilidad);
                    velY = (dirY * aceleracion * sensibilidad);
                }

                velX = Math.max(-15, Math.min(15, velX));
                velY = Math.max(-15, Math.min(15, velY));

                this.posX = Math.max(0, Math.min(window.innerWidth, this.posX + velX));
                this.posY = Math.max(0, Math.min(window.innerHeight, this.posY + velY));

                this.punteroVirtual.style.left = this.posX + "px";
                this.punteroVirtual.style.top = this.posY + "px";
                this.punteroVirtual.style.transform = "translate(-50%, -50%) scale(1)";
            }
        }

        this.frameAnterior = frameActual;
        this.animationId = requestAnimationFrame(this.bucleRender);
    }
}