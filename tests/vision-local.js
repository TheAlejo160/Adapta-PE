// Servir la raíz del proyecto por HTTP local. Las imágenes se pasan como query:
// ?rostro=/ruta.jpg&cuerpo=/ruta.jpg&manos=/ruta.jpg. No activa cámara/micrófono.
(async () => {
    const salida = document.getElementById('resultado');
    const informe = [];
    const parametros = new URLSearchParams(location.search);
    const trabajador = new Worker('../vision/trabajador.js');
    let pendiente;
    const pedir = (datos, transferencia = []) => new Promise((resolver, rechazar) => {
        const limite = setTimeout(() => rechazar(new Error('La inferencia no respondió')), 20000);
        pendiente = datos => { clearTimeout(limite); datos.tipo === 'error' ? rechazar(new Error(datos.mensaje)) : resolver(datos); };
        trabajador.postMessage(datos, transferencia);
    });
    trabajador.onmessage = evento => pendiente?.(evento.data);
    trabajador.onerror = evento => pendiente?.({ tipo: 'error', mensaje: evento.message });
    try {
        await pedir({ tipo: 'iniciar' });
        let tiempo = 1000;
        for (const [nombre, modo, esperado] of [['rostro', 'cabeza', 478], ['cuerpo', 'torso', 33], ['manos', 'manos', 21]]) {
            if (!parametros.has(nombre)) throw new Error('Falta imagen de prueba: ' + nombre);
            const respuesta = await fetch(parametros.get(nombre));
            if (!respuesta.ok) throw new Error('No se pudo leer la imagen: ' + nombre);
            const imagen = await createImageBitmap(await respuesta.blob(), { resizeWidth: 320, resizeHeight: 240 });
            const datos = await pedir({ tipo: 'imagen', imagen, modo, tiempo: tiempo += 1000 }, [imagen]);
            const puntos = nombre === 'rostro' ? datos.rostro : nombre === 'cuerpo' ? datos.cuerpo : datos.manos;
            if (puntos.length !== esperado) throw new Error(nombre + ': ' + puntos.length + ' puntos; se esperaban ' + esperado);
            informe.push(nombre + ': ' + puntos.length + ' puntos reales');
        }
        const escena = document.createElement('canvas');
        escena.width = 640; escena.height = 480;
        const contexto = escena.getContext('2d');
        for (const [nombre, izquierda] of [['rostro', 0], ['manos', 320]]) {
            const fuente = await createImageBitmap(await (await fetch(parametros.get(nombre))).blob());
            contexto.drawImage(fuente, izquierda, 0, 320, 480); fuente.close();
        }
        let mixta;
        // VIDEO necesita readquirir regiones tras un salto abrupto de encuadre.
        for (let intento = 0; intento < 5; intento++) {
            const imagenMixta = await createImageBitmap(escena);
            mixta = await pedir({ tipo: 'imagen', imagen: imagenMixta, modo: 'automatico', tiempo: tiempo += 1000 }, [imagenMixta]);
            if (mixta.rostro.length && mixta.manos.length) break;
        }
        if (!mixta.rostro.length || !mixta.manos.length) throw new Error('Escena mixta: rostro=' + mixta.rostro.length + ', manos=' + mixta.manos.length);
        informe.push('rostro + manos simultáneos en automático');
        window.adaptaResultadoVision = 'OK: ' + informe.join('; ');
    } catch (error) { window.adaptaResultadoVision = 'ERROR: ' + error.message; }
    finally { trabajador.terminate?.(); trabajador.close?.(); salida.textContent = window.adaptaResultadoVision; }
})();
