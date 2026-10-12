(() => {
const { SitiosVoz, normalizarVoz, reconocerSitio, IdiomasVoz, TextosAdapta } = globalThis;
const t = TextosAdapta.t;
const DICTADO = /^(?:escribe|dicta|introduce|ingresa texto|teclea|tipea)\s+/;

// Avisos del asistente; sitios.js traduce las intenciones a las órdenes internas en español.
TextosAdapta.definir({
    es: {
        'voz.activa': 'Voz activa. Di «{palabra}».', 'voz.espera': 'Di tu comando.', 'voz.escuche': 'Escuché: {texto}',
        'voz.sinSoporte': 'Este navegador no admite reconocimiento de voz.',
        'voz.microfono': 'Micrófono no disponible. Revisa el permiso y vuelve a activar Voz.', 'voz.reconectando': 'Reconectando micrófono…',
        'voz.accionFallida': 'No se pudo realizar la acción en esta página.', 'voz.reconectandoExtension': 'AdaptaPE se está reconectando. Vuelve a decir el comando.',
        'voz.enfocaCampo': 'Primero enfoca un campo de texto.', 'voz.sinBoton': 'No encontré ese botón o enlace visible.',
        'voz.noDisponible': 'Ese elemento ya no está disponible. Selecciónalo de nuevo.', 'voz.sinElemento': 'No encontré ese elemento. Di selecciona y su nombre.',
        'voz.elemento': 'Elemento', 'voz.seleccionado': 'Seleccionado: {nombre}. Di «dale clic» para activarlo.',
        'voz.sinSeleccion': 'Primero di selecciona y el nombre del elemento.', 'voz.seleccionCambio': 'El elemento seleccionado cambió. Selecciónalo de nuevo.',
        'voz.sinFormulario': 'Este campo no tiene un formulario. Usa «clic en» y el nombre del botón.', 'voz.sinEnviar': 'No encontré el botón para enviar.',
        'voz.cancelado': 'Comando cancelado.', 'voz.sinCampo': 'No encontré ese campo visible.', 'voz.sinMedio': 'No encontré video o audio.',
        'voz.requiereInteraccion': 'La página requiere una interacción para reproducir.', 'voz.dimeBusqueda': 'Dime qué quieres buscar.',
        'voz.noEntendi': 'No entendí. Prueba «abre YouTube», «busca gatos en Google» o di «ayuda».',
        'voz.permitirMicrofono': 'Permite el micrófono de AdaptaPE para usar voz en todo Chrome.',
        'voz.soloPaginas': 'En Chrome usa abre, busca o comandos de pestañas/ventanas. Dictado, clic y desplazamiento necesitan una página web.',
        'voz.cursor.temblor': 'Filtro de temblor activado.', 'voz.cursor.sinTemblor': 'Filtro de temblor desactivado.',
        'voz.cursor.derecho': 'El siguiente clic será derecho.', 'voz.cursor.desactivado': 'Mouse cinético desactivado.', 'voz.cursor.clicCancelado': 'Clic cancelado.',
        'voz.cursor.calibrando': 'Descansa en tu postura cómoda: calibrando sin clic.', 'voz.cursor.pausado': 'Cursor pausado. Di reanudar cursor para continuar.',
        'voz.cursor.solicitado': 'Mouse cinético solicitado. Permite la cámara si el navegador lo pide.', 'voz.cursor.aplicado': 'Acción del cursor aplicada.',
        'voz.cursor.noListo': 'El cursor aún no está listo. Reanuda el cursor o espera a terminar la calibración.',
        'voz.cursor.requiereCompleta': 'El mouse cinético requiere la versión completa y una página web.'
    },
    en: {
        'voz.activa': 'Voice on. Say “{palabra}”.', 'voz.espera': 'Say your command.', 'voz.escuche': 'Heard: {texto}',
        'voz.sinSoporte': 'This browser does not support speech recognition.',
        'voz.microfono': 'Microphone unavailable. Check the permission and turn Voice on again.', 'voz.reconectando': 'Reconnecting microphone…',
        'voz.accionFallida': 'Could not perform the action on this page.', 'voz.reconectandoExtension': 'AdaptaPE is reconnecting. Say the command again.',
        'voz.enfocaCampo': 'First focus a text field.', 'voz.sinBoton': 'I could not find that visible button or link.',
        'voz.noDisponible': 'That element is no longer available. Select it again.', 'voz.sinElemento': 'I could not find that element. Say select and its name.',
        'voz.elemento': 'Element', 'voz.seleccionado': 'Selected: {nombre}. Say “click selection” to activate it.',
        'voz.sinSeleccion': 'First say select and the element name.', 'voz.seleccionCambio': 'The selected element changed. Select it again.',
        'voz.sinFormulario': 'This field has no form. Say “click” and the button name.', 'voz.sinEnviar': 'I could not find the submit button.',
        'voz.cancelado': 'Command canceled.', 'voz.sinCampo': 'I could not find that visible field.', 'voz.sinMedio': 'I could not find video or audio.',
        'voz.requiereInteraccion': 'The page needs an interaction before it can play.', 'voz.dimeBusqueda': 'Tell me what you want to search for.',
        'voz.noEntendi': 'I did not understand. Try “open YouTube”, “search cats on Google” or say “help”.',
        'voz.permitirMicrofono': 'Allow the AdaptaPE microphone to use voice across Chrome.',
        'voz.soloPaginas': 'In Chrome use open, search or tab/window commands. Dictation, click and scrolling need a web page.',
        'voz.cursor.temblor': 'Tremor filter on.', 'voz.cursor.sinTemblor': 'Tremor filter off.',
        'voz.cursor.derecho': 'The next click will be a right click.', 'voz.cursor.desactivado': 'Kinetic mouse off.', 'voz.cursor.clicCancelado': 'Click canceled.',
        'voz.cursor.calibrando': 'Rest in your comfortable posture: calibrating without clicking.', 'voz.cursor.pausado': 'Cursor paused. Say “reanudar cursor” to continue.',
        'voz.cursor.solicitado': 'Kinetic mouse requested. Allow the camera if the browser asks.', 'voz.cursor.aplicado': 'Cursor action applied.',
        'voz.cursor.noListo': 'The cursor is not ready yet. Resume the cursor or wait for calibration to finish.',
        'voz.cursor.requiereCompleta': 'The kinetic mouse needs the full version and a web page.'
    },
    pt: {
        'voz.activa': 'Voz ativa. Diga «{palabra}».', 'voz.espera': 'Diga o seu comando.', 'voz.escuche': 'Ouvi: {texto}',
        'voz.sinSoporte': 'Este navegador não oferece reconhecimento de voz.',
        'voz.microfono': 'Microfone indisponível. Verifique a permissão e ative a Voz de novo.', 'voz.reconectando': 'Reconectando o microfone…',
        'voz.accionFallida': 'Não foi possível realizar a ação nesta página.', 'voz.reconectandoExtension': 'O AdaptaPE está se reconectando. Diga o comando de novo.',
        'voz.enfocaCampo': 'Primeiro foque um campo de texto.', 'voz.sinBoton': 'Não encontrei esse botão ou link visível.',
        'voz.noDisponible': 'Esse elemento não está mais disponível. Selecione-o de novo.', 'voz.sinElemento': 'Não encontrei esse elemento. Diga seleciona e o nome dele.',
        'voz.elemento': 'Elemento', 'voz.seleccionado': 'Selecionado: {nombre}. Diga «clica» para ativá-lo.',
        'voz.sinSeleccion': 'Primeiro diga seleciona e o nome do elemento.', 'voz.seleccionCambio': 'O elemento selecionado mudou. Selecione-o de novo.',
        'voz.sinFormulario': 'Este campo não tem formulário. Diga «clica em» e o nome do botão.', 'voz.sinEnviar': 'Não encontrei o botão de enviar.',
        'voz.cancelado': 'Comando cancelado.', 'voz.sinCampo': 'Não encontrei esse campo visível.', 'voz.sinMedio': 'Não encontrei vídeo ou áudio.',
        'voz.requiereInteraccion': 'A página exige uma interação para reproduzir.', 'voz.dimeBusqueda': 'Diga o que você quer pesquisar.',
        'voz.noEntendi': 'Não entendi. Tente «abre YouTube», «pesquisa gatos no Google» ou diga «ajuda».',
        'voz.permitirMicrofono': 'Permita o microfone do AdaptaPE para usar a voz em todo o Chrome.',
        'voz.soloPaginas': 'No Chrome use abre, pesquisa ou comandos de abas/janelas. Ditado, clique e rolagem precisam de uma página web.',
        'voz.cursor.temblor': 'Filtro de tremor ativado.', 'voz.cursor.sinTemblor': 'Filtro de tremor desativado.',
        'voz.cursor.derecho': 'O próximo clique será com o botão direito.', 'voz.cursor.desactivado': 'Mouse cinético desativado.', 'voz.cursor.clicCancelado': 'Clique cancelado.',
        'voz.cursor.calibrando': 'Descanse na sua postura confortável: calibrando sem clique.', 'voz.cursor.pausado': 'Cursor pausado. Diga «reanudar cursor» para continuar.',
        'voz.cursor.solicitado': 'Mouse cinético solicitado. Permita a câmera se o navegador pedir.', 'voz.cursor.aplicado': 'Ação do cursor aplicada.',
        'voz.cursor.noListo': 'O cursor ainda não está pronto. Retome o cursor ou espere a calibração terminar.',
        'voz.cursor.requiereCompleta': 'O mouse cinético requer a versão completa e uma página web.'
    },
    de: {
        'voz.activa': 'Sprache aktiv. Sag „{palabra}“.', 'voz.espera': 'Sag deinen Befehl.', 'voz.escuche': 'Gehört: {texto}',
        'voz.sinSoporte': 'Dieser Browser unterstützt keine Spracherkennung.',
        'voz.microfono': 'Mikrofon nicht verfügbar. Prüfe die Berechtigung und aktiviere Sprache erneut.', 'voz.reconectando': 'Mikrofon wird neu verbunden…',
        'voz.accionFallida': 'Die Aktion konnte auf dieser Seite nicht ausgeführt werden.', 'voz.reconectandoExtension': 'AdaptaPE verbindet sich neu. Sag den Befehl noch einmal.',
        'voz.enfocaCampo': 'Wähle zuerst ein Textfeld aus.', 'voz.sinBoton': 'Ich habe diese sichtbare Schaltfläche oder diesen Link nicht gefunden.',
        'voz.noDisponible': 'Dieses Element ist nicht mehr verfügbar. Wähle es erneut aus.', 'voz.sinElemento': 'Ich habe dieses Element nicht gefunden. Sag markiere und seinen Namen.',
        'voz.elemento': 'Element', 'voz.seleccionado': 'Ausgewählt: {nombre}. Sag „klick“, um es zu aktivieren.',
        'voz.sinSeleccion': 'Sag zuerst markiere und den Namen des Elements.', 'voz.seleccionCambio': 'Das ausgewählte Element hat sich geändert. Wähle es erneut aus.',
        'voz.sinFormulario': 'Dieses Feld hat kein Formular. Sag „klicke auf“ und den Namen der Schaltfläche.', 'voz.sinEnviar': 'Ich habe die Senden-Schaltfläche nicht gefunden.',
        'voz.cancelado': 'Befehl abgebrochen.', 'voz.sinCampo': 'Ich habe dieses sichtbare Feld nicht gefunden.', 'voz.sinMedio': 'Ich habe kein Video oder Audio gefunden.',
        'voz.requiereInteraccion': 'Die Seite braucht eine Interaktion, um abzuspielen.', 'voz.dimeBusqueda': 'Sag mir, wonach du suchen willst.',
        'voz.noEntendi': 'Nicht verstanden. Versuche „öffne YouTube“, „suche Katzen auf Google“ oder sag „Hilfe“.',
        'voz.permitirMicrofono': 'Erlaube das Mikrofon von AdaptaPE, um Sprache in ganz Chrome zu nutzen.',
        'voz.soloPaginas': 'In Chrome nutze öffne, suche oder Tab- und Fensterbefehle. Diktat, Klick und Scrollen brauchen eine Webseite.',
        'voz.cursor.temblor': 'Zitterfilter aktiviert.', 'voz.cursor.sinTemblor': 'Zitterfilter deaktiviert.',
        'voz.cursor.derecho': 'Der nächste Klick ist ein Rechtsklick.', 'voz.cursor.desactivado': 'Kinetische Maus deaktiviert.', 'voz.cursor.clicCancelado': 'Klick abgebrochen.',
        'voz.cursor.calibrando': 'Ruhe in deiner bequemen Haltung: Kalibrierung ohne Klick.', 'voz.cursor.pausado': 'Cursor pausiert. Sag „reanudar cursor“, um fortzufahren.',
        'voz.cursor.solicitado': 'Kinetische Maus angefordert. Erlaube die Kamera, wenn der Browser fragt.', 'voz.cursor.aplicado': 'Cursor-Aktion ausgeführt.',
        'voz.cursor.noListo': 'Der Cursor ist noch nicht bereit. Setze ihn fort oder warte, bis die Kalibrierung endet.',
        'voz.cursor.requiereCompleta': 'Die kinetische Maus braucht die Vollversion und eine Webseite.'
    },
    fr: {
        'voz.activa': 'Voix active. Dites « {palabra} ».', 'voz.espera': 'Dites votre commande.', 'voz.escuche': 'Entendu : {texto}',
        'voz.sinSoporte': 'Ce navigateur ne prend pas en charge la reconnaissance vocale.',
        'voz.microfono': "Micro indisponible. Vérifiez l'autorisation et réactivez la Voix.", 'voz.reconectando': 'Reconnexion du micro…',
        'voz.accionFallida': "Impossible d'effectuer l'action sur cette page.", 'voz.reconectandoExtension': 'AdaptaPE se reconnecte. Répétez la commande.',
        'voz.enfocaCampo': "Placez d'abord le curseur dans un champ de texte.", 'voz.sinBoton': "Je n'ai pas trouvé ce bouton ou ce lien visible.",
        'voz.noDisponible': "Cet élément n'est plus disponible. Sélectionnez-le à nouveau.", 'voz.sinElemento': "Je n'ai pas trouvé cet élément. Dites sélectionne et son nom.",
        'voz.elemento': 'Élément', 'voz.seleccionado': "Sélectionné : {nombre}. Dites « clique » pour l'activer.",
        'voz.sinSeleccion': "Dites d'abord sélectionne et le nom de l'élément.", 'voz.seleccionCambio': "L'élément sélectionné a changé. Sélectionnez-le à nouveau.",
        'voz.sinFormulario': "Ce champ n'a pas de formulaire. Dites « clique sur » et le nom du bouton.", 'voz.sinEnviar': "Je n'ai pas trouvé le bouton d'envoi.",
        'voz.cancelado': 'Commande annulée.', 'voz.sinCampo': "Je n'ai pas trouvé ce champ visible.", 'voz.sinMedio': "Je n'ai trouvé ni vidéo ni audio.",
        'voz.requiereInteraccion': 'La page exige une interaction pour lancer la lecture.', 'voz.dimeBusqueda': 'Dites-moi ce que vous voulez chercher.',
        'voz.noEntendi': "Je n'ai pas compris. Essayez « ouvre YouTube », « cherche chats sur Google » ou dites « aide ».",
        'voz.permitirMicrofono': "Autorisez le micro d'AdaptaPE pour utiliser la voix dans tout Chrome.",
        'voz.soloPaginas': "Dans Chrome, utilisez ouvre, cherche ou les commandes d'onglets et de fenêtres. Dictée, clic et défilement nécessitent une page web.",
        'voz.cursor.temblor': 'Filtre de tremblement activé.', 'voz.cursor.sinTemblor': 'Filtre de tremblement désactivé.',
        'voz.cursor.derecho': 'Le prochain clic sera un clic droit.', 'voz.cursor.desactivado': 'Souris cinétique désactivée.', 'voz.cursor.clicCancelado': 'Clic annulé.',
        'voz.cursor.calibrando': 'Reposez-vous dans votre posture confortable : calibrage sans clic.', 'voz.cursor.pausado': 'Curseur en pause. Dites « reanudar cursor » pour continuer.',
        'voz.cursor.solicitado': 'Souris cinétique demandée. Autorisez la caméra si le navigateur le demande.', 'voz.cursor.aplicado': 'Action du curseur appliquée.',
        'voz.cursor.noListo': "Le curseur n'est pas encore prêt. Reprenez le curseur ou attendez la fin du calibrage.",
        'voz.cursor.requiereCompleta': 'La souris cinétique nécessite la version complète et une page web.'
    },
    it: {
        'voz.activa': 'Voce attiva. Di «{palabra}».', 'voz.espera': 'Di il tuo comando.', 'voz.escuche': 'Ho sentito: {texto}',
        'voz.sinSoporte': 'Questo browser non supporta il riconoscimento vocale.',
        'voz.microfono': 'Microfono non disponibile. Controlla il permesso e riattiva la Voce.', 'voz.reconectando': 'Riconnessione del microfono…',
        'voz.accionFallida': "Impossibile eseguire l'azione in questa pagina.", 'voz.reconectandoExtension': 'AdaptaPE si sta riconnettendo. Ripeti il comando.',
        'voz.enfocaCampo': 'Prima seleziona un campo di testo.', 'voz.sinBoton': 'Non ho trovato quel pulsante o link visibile.',
        'voz.noDisponible': "Quell'elemento non è più disponibile. Selezionalo di nuovo.", 'voz.sinElemento': "Non ho trovato quell'elemento. Di seleziona e il suo nome.",
        'voz.elemento': 'Elemento', 'voz.seleccionado': 'Selezionato: {nombre}. Di «clicca» per attivarlo.',
        'voz.sinSeleccion': "Prima di' seleziona e il nome dell'elemento.", 'voz.seleccionCambio': "L'elemento selezionato è cambiato. Selezionalo di nuovo.",
        'voz.sinFormulario': 'Questo campo non ha un modulo. Di «clicca su» e il nome del pulsante.', 'voz.sinEnviar': 'Non ho trovato il pulsante di invio.',
        'voz.cancelado': 'Comando annullato.', 'voz.sinCampo': 'Non ho trovato quel campo visibile.', 'voz.sinMedio': 'Non ho trovato video o audio.',
        'voz.requiereInteraccion': "La pagina richiede un'interazione per riprodurre.", 'voz.dimeBusqueda': 'Dimmi cosa vuoi cercare.',
        'voz.noEntendi': 'Non ho capito. Prova «apri YouTube», «cerca gatti su Google» o di «aiuto».',
        'voz.permitirMicrofono': 'Consenti il microfono di AdaptaPE per usare la voce in tutto Chrome.',
        'voz.soloPaginas': 'In Chrome usa apri, cerca o i comandi di schede e finestre. Dettatura, clic e scorrimento richiedono una pagina web.',
        'voz.cursor.temblor': 'Filtro tremore attivato.', 'voz.cursor.sinTemblor': 'Filtro tremore disattivato.',
        'voz.cursor.derecho': 'Il prossimo clic sarà destro.', 'voz.cursor.desactivado': 'Mouse cinetico disattivato.', 'voz.cursor.clicCancelado': 'Clic annullato.',
        'voz.cursor.calibrando': 'Resta nella tua postura comoda: calibrazione senza clic.', 'voz.cursor.pausado': 'Cursore in pausa. Di «reanudar cursor» per continuare.',
        'voz.cursor.solicitado': 'Mouse cinetico richiesto. Consenti la fotocamera se il browser lo chiede.', 'voz.cursor.aplicado': 'Azione del cursore applicata.',
        'voz.cursor.noListo': 'Il cursore non è ancora pronto. Riprendi il cursore o attendi la fine della calibrazione.',
        'voz.cursor.requiereCompleta': 'Il mouse cinetico richiede la versione completa e una pagina web.'
    }
});

// Reescribe cortesías, conjugaciones e idiomas a la orden canónica en español sin tocar el
// texto dictado ni la consulta. Idempotente: el controlador puede volver a aplicarlo.
function prepararComando(texto, idioma = 'es') {
    let original = String(texto || '').normalize('NFC').replace(/\s+/g, ' ').replace(/^[\s¿¡,.;:]+/, '').trim();
    const extranjero = IdiomasVoz[String(idioma).slice(0, 2).toLowerCase()];
    const otro = extranjero !== IdiomasVoz.es && extranjero;
    // Texto normalizado y original tienen igual longitud (NFC, espacios simples): `$n` copia el original.
    const reescribir = ([patron, reemplazo]) => {
        const coincidencia = new RegExp(patron.source, 'd').exec(normalizarVoz(original));
        if (!coincidencia || !coincidencia[0]) return false;
        original = reemplazo.replace(/\$(\d)/g, (_, n) => coincidencia.indices[n] ? original.slice(...coincidencia.indices[n]) : '') +
            original.slice(coincidencia[0].length);
        return true;
    };
    const envoltorios = [otro?.envoltorios, IdiomasVoz.es.envoltorios].filter(Boolean);
    original += ','; // Permite retirar también una muletilla suelta («Computadora, por favor»).
    while (original && envoltorios.some(patron => reescribir([patron, '']))) {}
    original = original.replace(/,$/, '');
    if (otro) otro.frases.some(reescribir);
    const verbo = /^\S+/.exec(normalizarVoz(original))?.[0];
    if (verbo && Object.hasOwn(IdiomasVoz.es.verbos, verbo)) original = IdiomasVoz.es.verbos[verbo] + original.slice(verbo.length);
    if (DICTADO.test(normalizarVoz(original))) return original;
    original = original.replace(/[\s.,;:!?]+$/, '');
    const finales = [otro?.finales, IdiomasVoz.es.finales].filter(Boolean);
    for (let quitado = true; quitado;) {
        quitado = false;
        for (const patron of finales) {
            const coincidencia = patron.exec(normalizarVoz(original));
            if (coincidencia) { original = original.slice(0, coincidencia.index).replace(/[\s.,;:!?]+$/, ''); quitado = true; }
        }
    }
    let sufijo = '';
    if (otro && /^(?:busca|abre) /.test(normalizarVoz(original))) {
        for (const [patron, destino] of [[otro.pestanaNueva, ' en una nueva pestaña'], [otro.ventanaNueva, ' en una nueva ventana']]) {
            const coincidencia = patron.exec(normalizarVoz(original));
            if (coincidencia) { original = original.slice(0, coincidencia.index); sufijo = destino; break; }
        }
        // Último conector antes de un sitio conocido: «search cats on YouTube» → «busca cats en YouTube».
        const normal = normalizarVoz(original);
        const sitio = new RegExp('^(busca .*\\S) ' + otro.conector + ' (.+)$').exec(normal);
        if (sitio && reconocerSitio(sitio[2])) original = original.slice(0, sitio[1].length) + ' en ' + original.slice(normal.length - sitio[2].length);
    }
    IdiomasVoz.es.frases.some(reescribir);
    return original + sufijo;
}

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
        this.idioma = 'es-PE';
    }

    setIdioma(idioma) {
        if (typeof idioma !== 'string' || !idioma || idioma === this.idioma) return;
        this.idioma = idioma;
        // Reiniciar con el idioma nuevo conservando el ciclo siempre activo.
        if (this.reconocimientoVoz) { this.detener(); this.evaluarEstado(); }
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

    // tipo: 'error' | 'espera' (tras la palabra de activación) | 'escucha' | 'activa' | undefined.
    mostrarEstado(texto, tipo) {
        if (texto === undefined) { texto = t('voz.activa', { palabra: IdiomasVoz[TextosAdapta.idioma].palabra }); tipo = 'activa'; }
        this.alEstado?.(texto, tipo);
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
        if (!MotorVoz) { this.ui.setAttribute('data-adapta-voz-activa', 'false'); this.ui.id = 'adapta-pe-mic-aviso-' + chrome.runtime.id; this.bloqueado = true; this.mostrarEstado(t('voz.sinSoporte'), 'error'); return; }
        this.microfonoIniciado = true;
        const reconocimiento = new MotorVoz();
        this.reconocimientoVoz = reconocimiento;
        reconocimiento.lang = this.idioma;
        reconocimiento.continuous = true;
        reconocimiento.interimResults = true;
        reconocimiento.onstart = () => {
            if (this.reconocimientoVoz !== reconocimiento) return;
            this.indiceResultado = 0;
            this.resultadosConsumidos.clear();
            this.textoReconocido = '';
            if (this.esperandoComando) this.mostrarEstado(t('voz.espera'), 'espera'); else this.mostrarEstado();
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
            this.mostrarEstado(t('voz.escuche', { texto }), 'escucha');
            clearTimeout(this.temporizadorSilencio);
            this.temporizadorSilencio = setTimeout(() => {
                // No consumir una intención incompleta si sigue siendo provisional.
                if (!todosFinales && /(?:^|\s)(?:abre|abrir|busca|buscar|escribe|dicta|ejecuta|en|open|search|write|type|pesquisa|escreve|ouvre|cherche|[ée]cris|apri|cerca|scrivi|[öo]ffne|suche|schreibe)\s*$/i.test(this.textoReconocido)) return;
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
                this.mostrarEstado(t('voz.microfono'), 'error');
            } else {
                this.fallos = Math.min(this.fallos + 1, 4);
                this.mostrarEstado(t('voz.reconectando'));
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
        // «Computadora» siempre activa; además la palabra del idioma elegido (Computer, Ordinateur…).
        const palabras = [IdiomasVoz.es.activacion, IdiomasVoz[this.idioma.slice(0, 2).toLowerCase()]?.activacion].filter(Boolean).join('|');
        const activacion = new RegExp((this.esperandoComando ? '^' : '\\b') + '(?:' + palabras + ')\\b', 'i').exec(texto);
        if (activacion) texto = texto.slice(activacion.index + activacion[0].length).replace(/^[\s,.:;!?]+/, '');
        else if (!this.esperandoComando) return;
        texto = prepararComando(texto, this.idioma);
        if (texto) {
            this.cancelarEspera();
            if (this.alComando) this.alComando(texto);
            else this.ejecutarComando(texto);
        } else {
            this.reproducirBeep();
            this.esperandoComando = true;
            this.mostrarEstado(t('voz.espera'), 'espera');
            clearTimeout(this.temporizadorEspera);
            this.temporizadorEspera = setTimeout(() => { this.cancelarEspera(); this.mostrarEstado(); }, 8000);
        }
    }

    enviar(peticion, alResponder) {
        try {
            chrome.runtime.sendMessage(peticion, respuesta => {
                if (chrome.runtime.lastError || respuesta?.ok === false) this.mostrarEstado(t('voz.accionFallida'), 'error');
                else if (typeof respuesta?.texto === 'string') alResponder?.(respuesta.texto);
            });
        } catch (_) { this.mostrarEstado(t('voz.reconectandoExtension'), 'error'); }
    }

    esEditable(campo) {
        return campo && !campo.disabled && !campo.readOnly && (campo.isContentEditable || campo.tagName === 'TEXTAREA' ||
            (campo.tagName === 'INPUT' && ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(campo.type)));
    }

    escribirEnCampo(campo, texto, reemplazar = false) {
        if (!this.esEditable(campo)) { this.mostrarEstado(t('voz.enfocaCampo'), 'error'); return false; }
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
        if (!elemento) { this.mostrarEstado(t('voz.sinBoton'), 'error'); return false; }
        if (elemento.isConnected === false || elemento.disabled || elemento.getAttribute('aria-disabled') === 'true' ||
            !elemento.getClientRects().length || window.getComputedStyle(elemento).visibility === 'hidden') {
            this.mostrarEstado(t('voz.noDisponible'), 'error'); return false;
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
            this.mostrarEstado(t('voz.sinElemento'), 'error'); return;
        }
        this.elementoSeleccionado = elemento;
        elemento.setAttribute('data-' + this.idSeleccion, 'true');
        const estilo = document.createElement('style'); estilo.id = this.idSeleccion;
        estilo.textContent = `[data-${this.idSeleccion}] { outline:4px solid #ffdc00!important;outline-offset:3px!important;box-shadow:0 0 0 7px #111!important; }`;
        (document.head || document.documentElement).appendChild(estilo);
        elemento.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'auto' });
        elemento.focus?.({ preventScroll: true });
        const nombre = (elemento.getAttribute('aria-label') || elemento.getAttribute('alt') || elemento.innerText || t('voz.elemento')).trim().slice(0, 120);
        const respuesta = t('voz.seleccionado', { nombre });
        this.mostrarEstado(respuesta); this.enviar({ accion: 'hablar', texto: respuesta });
    }

    pulsarSeleccion() {
        const elemento = this.elementoSeleccionado;
        if (!elemento) { this.mostrarEstado(t('voz.sinSeleccion'), 'error'); return; }
        const contenedor = elemento.closest?.('article, li, [role="listitem"]');
        const objetivo = elemento.closest?.('a, button, input, select, summary, [role="button"], [role="link"]') ||
            elemento.querySelector?.('a[href], button, [role="button"], input[type="submit"]') ||
            contenedor?.querySelector('a[href], button, [role="button"]') || elemento;
        // No cambiar a otro control si una tienda elimina/reemplaza el producto seleccionado.
        if (elemento.isConnected !== false) this.pulsarElemento(objetivo);
        else this.mostrarEstado(t('voz.seleccionCambio'), 'error');
        this.limpiarSeleccion();
    }

    enviarFormulario(campo) {
        const formulario = campo?.form || campo?.closest('form');
        if (!formulario) { this.mostrarEstado(t('voz.sinFormulario'), 'error'); return false; }
        if (typeof formulario.requestSubmit === 'function') formulario.requestSubmit();
        else {
            const boton = formulario.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
            if (!boton) { this.mostrarEstado(t('voz.sinEnviar'), 'error'); return false; }
            boton.click();
        }
        return true;
    }

    ejecutarComando(texto) {
        // Conservar mayúsculas, acentos y contenido dictado; normalizar sólo las intenciones.
        let original = prepararComando(texto);
        let comando = normalizarVoz(original);
        this.mostrarEstado();
        const dictado = DICTADO.exec(comando);
        if (dictado) { this.escribirEnCampo(document.activeElement, original.slice(dictado[0].length)); return; }
        const mascota = /^(?:(?:elige|cambia a)(?: la)? )?mascota ([a-z\s.-]+)$/.exec(comando);
        if (mascota) {
            const nombre = mascota[1].replace(/[\s.-]/g, '').replace(/([a-z])\1+/g, '$1');
            const variantes = { tinku: 'tinku', tincu: 'tinku', tinko: 'tinku', tinco: 'tinku',
                cuchu: 'cuchu', kuchu: 'cuchu', cucho: 'cuchu', yati: 'yati', yaty: 'yati', yate: 'yati' };
            if (Object.hasOwn(variantes, nombre)) { this.enviar({ accion: 'mascota', nombre: variantes[nombre] }); return; }
        }
        if (/^(oculta|quita)(?: la)? mascota$/.test(comando)) { this.enviar({ accion: 'mascota', nombre: 'ninguna' }); return; }
        const gestoMascota = /^(saluda|duerme|despierta)(?: la)? mascota$/.exec(comando);
        if (gestoMascota) { this.enviar({ accion: 'mascota', estado: { saluda: 'wave', duerme: 'sleep', despierta: 'wake' }[gestoMascota[1]] }); return; }
        if (/^(?:ayuda|ayudame|que puedo decir|que (?:comandos|ordenes) (?:hay|tienes|existen|puedo (?:usar|decir))|(?:lista de )?comandos|que puedes hacer|como (?:te uso|funcionas))$/.test(comando)) {
            this.enviar({ accion: 'ayuda' }, texto => this.mostrarEstado(texto)); return;
        }
        if (/^(?:calla|silencio|basta|detente|deja de (?:hablar|leer)|para de (?:hablar|leer)|no (?:hables|leas) mas)$/.test(comando)) { this.enviar({ accion: 'callar' }); return; }
        if (/^(cancelar|cancela|cancela eso|olvidalo|olvida eso|no hagas nada|no importa|dejalo|nada|no|cancelar seleccion|quita(?: la)? seleccion|deselecciona)$/.test(comando)) { this.cancelarEspera(); this.limpiarSeleccion(); this.mostrarEstado(t('voz.cancelado')); return; }
        const seleccionar = /^(?:selecciona(?:r)?|resalta(?:r)?)(?:\s+|$)/.exec(comando);
        if (seleccionar) {
            const nombre = original.slice(seleccionar[0].length).replace(/^(?:(?:el|la) )?(?:producto|articulo|item|elemento)(?: llamado)?\s+/i, '').trim();
            this.seleccionarElemento(nombre ? this.encontrarElemento(nombre, 'a, button, [role="button"], [role="link"], summary, input, select, article, li, [role="listitem"], h1, h2, h3, h4, img[alt]') : document.activeElement);
            return;
        }
        if (/^(?:(?:dale|hazle|da|haz) cli(?:c|ck) (?:a lo seleccionado|al seleccionado|a eso)|(?:dale|hazle) cli(?:c|ck)|(?:pulsa|activa|abre|presiona) lo seleccionado)$/.test(comando)) { this.pulsarSeleccion(); return; }

        const nuevas = /^(?:(?:abre|crea|crear|pon|agrega|anade|dame)\s+)?(?:una\s+|otra\s+)?(?:nueva\s+)?(pestana|ventana)(?:\s+(?:nueva|en blanco|vacia))?$/.exec(comando);
        if (nuevas) { this.enviar({ accion: nuevas[1] === 'ventana' ? 'crear_ventana' : 'crear_pestana' }); return; }
        if (/^(?:cierra (?:todas )?las (?:otras|demas) pestanas|(?:cierra|deja) (?:solo|solamente) (?:esta|la actual)(?: pestana)?)$/.test(comando)) { this.enviar({ accion: 'cerrar_otras' }); return; }
        if (/^(?:cierra|cerrar|quita)\s+(?:(?:esta|la|esa|actual)\s+)?(pestana|ventana)(?:\s+actual)?$/.test(comando)) {
            this.enviar({ accion: comando.includes('ventana') ? 'cerrar_ventana' : 'cerrar_pestana' }); return;
        }
        if (/^(?:duplica|clona) (?:la |esta )?pestana$/.test(comando)) { this.enviar({ accion: 'duplicar_pestana' }); return; }
        if (/^(?:(?:silencia|enmudece)(?: (?:la|esta) (?:pestana|pagina))?|(?:quita|apaga|corta)(?: el)? (?:sonido|audio)(?: de (?:la|esta) (?:pestana|pagina))?|sin sonido)$/.test(comando)) {
            this.enviar({ accion: 'silenciar', activo: true }); return;
        }
        if (/^(?:(?:activa|activar|pon|enciende|prende|devuelve|reactiva)(?: el)? (?:sonido|audio)|quita(?: el)? silencio|desmutea|desilencia|con sonido)(?: (?:de |a )?(?:la|esta) (?:pestana|pagina))?$/.test(comando)) {
            this.enviar({ accion: 'silenciar', activo: false }); return;
        }
        if (/^(?:(?:pon(?:er|me)?|activa(?:r)?|entra a|modo|ver en|ve a)\s+)?(?:(?:la|el|en)\s+)?(?:modo\s+)?pantalla completa$/.test(comando)) { this.enviar({ accion: 'pantalla_completa', activa: true }); return; }
        if (/^(?:(?:sal(?:ir)?|quita(?:r)?|desactiva(?:r)?) (?:de )?(?:la |el )?(?:modo )?pantalla completa|pantalla normal)$/.test(comando)) { this.enviar({ accion: 'pantalla_completa', activa: false }); return; }
        const numeroPestana = /^(?:(?:ve|ir|cambia|pasa|salta)(?: a)? )?(?:la )?(?:pestana (?:numero )?(\S+)|(\S+) pestana)$/.exec(comando);
        const ordinales = { uno: 1, una: 1, primera: 1, primero: 1, dos: 2, segunda: 2, tres: 3, tercera: 3, cuatro: 4, cuarta: 4, cinco: 5, quinta: 5,
            seis: 6, sexta: 6, siete: 7, septima: 7, setima: 7, ocho: 8, octava: 8, nueve: 9, novena: 9, diez: 10, decima: 10, ultima: -1, ultimo: -1 };
        const indicePestana = numeroPestana && (/^\d+$/.test(numeroPestana[1] || numeroPestana[2]) ? Number(numeroPestana[1] || numeroPestana[2]) : ordinales[numeroPestana[1] || numeroPestana[2]]);
        if (indicePestana) { this.enviar({ accion: 'ir_pestana', indice: indicePestana }); return; }
        const navegacion = [
            [/^(?:atras|ve atras|ir atras|hacia atras|volver|vuelve|regresa|retrocede|retroceder|pagina anterior|(?:vuelve|volver|regresa) (?:atras|a la pagina anterior))$/, 'atras'],
            [/^(?:adelante|avanza|ve adelante|ir adelante|hacia adelante|pagina siguiente|siguiente pagina)$/, 'adelante'],
            [/^(?:recarga|actualiza|refresca|vuelve a cargar|refrescar|actualizar)(?: (?:la|esta))?(?: (?:pagina|web))?$|^f5$/, 'recargar']
        ];
        for (const [patron, accion] of navegacion) if (patron.test(comando)) { this.enviar({ accion }); return; }
        if (/^(?:(?:cambia|pasa|ve|ir|salta)(?: a)? (?:la )?)?(?:(?:siguiente|proxima) pestana|pestana (?:siguiente|proxima|de la derecha)|anterior pestana|pestana (?:anterior|de la izquierda))$|^cambia de pestana$/.test(comando)) {
            this.enviar({ accion: 'cambiar_pestana', direccion: /anterior|izquierda/.test(comando) ? -1 : 1 }); return;
        }
        if (/^(?:aumenta(?:r)?(?: el)? zoom|acerca(?:r)?|amplia(?:r)?|agranda(?:r)?(?: la (?:pagina|letra))?|zoom mas|mas zoom|mas grande|letra mas grande|reduce(?: el)? zoom|reducir zoom|aleja(?:r)?|achica(?:r)?(?: la (?:pagina|letra))?|zoom menos|menos zoom|mas pequeno|mas chico|letra mas (?:pequena|chica)|restablece(?: el)? zoom|zoom normal|tamano normal)$/.test(comando)) {
            this.enviar({ accion: 'zoom', direccion: /normal|restablece/.test(comando) ? 0 : /reduc|aleja|achica|menos|pequen|chic/.test(comando) ? -1 : 1 }); return;
        }
        // Anclado a la orden completa: «busca subir archivo» nunca desplaza.
        const desplazar = /^(?:(baja|desciende|sube|asciende|scrollea|desplazate|desplaza|desliza|haz scroll|scroll|muevete|ve|ir)\s*)?(?:(?:hacia|para|pa)\s+)?(abajo|arriba)?(?:\s+(?:la pagina|la web|la pantalla))?(?:\s+(un poco|un poquito|un poquitin|mas|bastante|una pantalla))?$/.exec(comando);
        if (desplazar && (desplazar[2] || /^(?:baja|desciende|sube|asciende)$/.test(desplazar[1]))) {
            const cantidad = /poc|poqu/.test(desplazar[3]) ? 0.25 : /mas|bastante/.test(desplazar[3]) ? 0.95 : 0.7;
            const subir = desplazar[2] ? desplazar[2] === 'arriba' : /sube|asciende/.test(desplazar[1]);
            window.scrollBy({ top: window.innerHeight * cantidad * (subir ? -1 : 1), behavior: 'smooth' }); return;
        }
        const extremo = /^(?:(?:ve|ir|sube|baja|vuelve|regresa|desplazate|salta)\s+)?(?:(?:hasta|al|a)\s+)?(?:(?:el|la)\s+)?(inicio|principio|comienzo|final|fin|arriba del todo|abajo del todo|tope|fondo)(?:\s+de\s+(?:la\s+)?(?:pagina|web))?$|^(?:(?:sube|baja|ve|ir)\s+)?hasta (arriba|abajo)$/.exec(comando);
        if (extremo) {
            window.scrollTo({ top: /final|fin|abajo|fondo/.test(extremo[1] || extremo[2]) ? document.documentElement.scrollHeight : 0, behavior: 'smooth' }); return;
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
            const estados = { temblor: 'voz.cursor.temblor', sin_temblor: 'voz.cursor.sinTemblor',
                preparar_derecho: 'voz.cursor.derecho', desactivar: 'voz.cursor.desactivado', cancelar: 'voz.cursor.clicCancelado' };
            const mensaje = ['calibrar', 'reanudar', 'movimiento_reducido', 'movimiento_normal'].includes(cineticos[comando]) ?
                'voz.cursor.calibrando' : cineticos[comando] === 'pausar' ? 'voz.cursor.pausado' :
                cineticos[comando] === 'activar' ? 'voz.cursor.solicitado' : estados[cineticos[comando]] || 'voz.cursor.aplicado';
            const respuesta = t(disponible ? mensaje : this.accionCinetica ? 'voz.cursor.noListo' : 'voz.cursor.requiereCompleta');
            this.mostrarEstado(respuesta, disponible ? undefined : 'error');
            this.enviar({ accion: 'hablar', texto: respuesta });
            return;
        }
        if (/^(?:(?:haz|hacer|da|un)\s+)?cli(?:c|ck)$|^(?:pulsa|presiona)$/.test(comando)) {
            if (this.elementoSeleccionado) this.pulsarSeleccion();
            else if (!this.accionCinetica?.('izquierdo')) this.pulsarElemento(document.activeElement);
            return;
        }
        if (/^(?:borra|limpia|vacia)(?:\s+(?:el|lo|todo el|todo lo))?\s+(?:texto|campo|escrito)$|^(?:borra|limpia) todo$/.test(comando)) { this.escribirEnCampo(document.activeElement, '', true); return; }
        if (/^(?:(?:presiona|pulsa|dale|da)\s+)?(?:enter|intro)$|^(?:envia|enviar|manda)(?:\s+(?:el\s+)?(?:formulario|mensaje))?$/.test(comando)) { this.enviarFormulario(document.activeElement); return; }
        const enfocar = /^(?:enfoca|activa el campo|ve al campo|ir al campo)\s+/.exec(comando);
        if (enfocar) {
            const campo = this.encontrarElemento(original.slice(enfocar[0].length), 'input, textarea, [contenteditable="true"], select');
            if (campo) campo.focus(); else this.mostrarEstado(t('voz.sinCampo'), 'error'); return;
        }
        if (/^(?:reproduce|continuar video|continua|reanuda|play|dale play|pon play|pausa|pausar|pon pausa)(?: (?:el |la )?(?:video|audio|musica|cancion))?$|^(?:deten|para) (?:el |la )?(?:video|audio|musica|cancion)$/.test(comando)) {
            const medio = document.querySelector('video:not([id^="adapta-pe-"]), audio');
            if (!medio) { this.mostrarEstado(t('voz.sinMedio'), 'error'); return; }
            if (/^(?:paus|pon pausa|deten|para)/.test(comando)) medio.pause(); else medio.play().catch(() => this.mostrarEstado(t('voz.requiereInteraccion'), 'error'));
            return;
        }

        // Sólo quitar modificadores al final de navegación/búsqueda, nunca dentro del dictado.
        const modificador = /\s+(?:(?:en|en una|en la|en otra)\s+)?(?:nueva (pestana|ventana)|(pestana|ventana) nueva|otra (pestana|ventana))$/.exec(comando);
        const destino = modificador ? (modificador[1] || modificador[2] || modificador[3]) === 'ventana' ? 'ventana' : 'pestana' : 'actual';
        if (modificador) { original = original.slice(0, modificador.index).trim(); comando = normalizarVoz(original); }
        const abrir = /^(?:abre|ejecuta|ejecutar|inicia|iniciar|entra (?:a|en|al)|ingresa (?:a|en)|ve (?:a|al)|ir (?:a|al)|visita|llevame a|vamos a|dirigete a|accede a|muestrame|ponme|pon)\s+(?!(?:una )?busqueda\b)/.exec(comando);
        if (abrir) {
            const objetivo = original.slice(abrir[0].length).replace(/^(?:(?:la p[áa]gina|el sitio|la web|la app|la aplicaci[óo]n)(?: de)?|el|la|mi)\s+/i, '').trim();
            const sitio = reconocerSitio(objetivo);
            if (sitio) { this.enviar({ accion: 'buscar_inteligente', query: '', sitio, destino }); return; }
            if (/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#][^\s]*)?$/i.test(objetivo)) {
                this.enviar({ accion: 'abrir_url', url: /^https?:\/\//i.test(objetivo) ? objetivo : 'https://' + objetivo, destino }); return;
            }
            this.pulsarElemento(this.encontrarElemento(objetivo, 'a, button, [role="button"], summary')); return;
        }
        const buscar = /^(?:busca|busqueda(?: de)?|(?:haz|realiza|ejecuta)(?: una)? busqueda(?: de)?|encuentra|consulta|investiga|averigua|googlea)\s+/.exec(comando);
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
            // «busca en YouTube» sin consulta: antes buscaba literalmente «en YouTube» en Google.
            if (!consulta || (!sitio && /^en /.test(normalizada) && reconocerSitio(normalizada.slice(3)))) { this.mostrarEstado(t('voz.dimeBusqueda')); return; }
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
        const pulsar = /^(?:(?:(?:haz|hacer|da|dale|hazle|un)\s+)?cli(?:c|ck)\s+(?:en|sobre|a)|(?:pulsa|presiona)(?:\s+(?:en|sobre))?)\s+/.exec(comando);
        if (pulsar) { this.pulsarElemento(this.encontrarElemento(original.slice(pulsar[0].length), 'a, button, [role="button"], summary, input[type="submit"], input[type="button"]')); return; }
        this.mostrarEstado(t('voz.noEntendi'), 'error');
    }
}
VoiceAssistant.prepararComando = prepararComando;
globalThis.VoiceAssistant = VoiceAssistant;
})();
