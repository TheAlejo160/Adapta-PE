(() => {
// Textos del cursor cinético (HUD, menú, avisos). El español es la referencia y el respaldo sin textos.js.
const textos = {
    es: {
        'cinetico.camara': 'Cámara: cabeza y torso calibran postura; extremidades usan centro fijo y gestos suaves. Pinza pulgar-índice o boca abierta: clic al soltar. Controles por voz: Computadora, pausar cursor; clic derecho.',
        'cinetico.cargando': 'Cargando detección local…',
        'cinetico.ayuda': 'Computadora: recalibrar · clic derecho · activar temblor',
        'cinetico.buscandoTextura': 'Mueve ligeramente la extremidad visible · buscando textura',
        'cinetico.texturaNoVisible': 'Textura no visible · cursor detenido',
        'cinetico.listo': 'Cursor listo. Postura cómoda calibrada.',
        'cinetico.seguroMueve': 'Seguro · mueve para habilitar clic',
        'cinetico.seguroProgreso': 'Seguro · {tipo} {porcentaje}%',
        'cinetico.clic': 'clic', 'cinetico.derecho': 'derecho',
        'cinetico.recuperando': 'Recuperando postura cómoda · sin clic',
        'cinetico.atraccion': 'Atracción · precisión', 'cinetico.moviendo': 'Moviendo',
        'cinetico.menu': 'Menú contextual AdaptaPE',
        'cinetico.menu.enlacePestana': 'Abrir enlace en pestaña', 'cinetico.menu.enlaceVentana': 'Abrir enlace en ventana',
        'cinetico.menu.imagen': 'Abrir imagen', 'cinetico.menu.atras': 'Atrás', 'cinetico.menu.recargar': 'Recargar página', 'cinetico.menu.cerrar': 'Cerrar menú',
        'cinetico.esperandoCamara': 'Esperando cámara central · sin clic',
        'cinetico.enEspera': 'Seguimiento en espera · muestra la parte elegida',
        'cinetico.esperandoInicio': 'Esperando cámara central…',
        'cinetico.confirmando': 'Confirmando seguimiento · sin clic',
        'cinetico.calibrando': 'Descansa en una postura cómoda · calibrando sin clic',
        'cinetico.pausado': 'Cursor pausado · di «reanudar cursor»',
        'cinetico.esperandoImagen': 'Esperando una imagen válida de la cámara',
        'cinetico.senal': 'señal', 'cinetico.joystick': 'joystick', 'cinetico.puno': 'puño · reposo', 'cinetico.punoPreparar': 'puño · abre la mano para preparar reposo',
        'cinetico.pinzaDerechoHecho': 'pinza · clic derecho hecho, suelta',
        'cinetico.pinzaSuelta': 'pinza · suelta: clic · mantén: derecho', 'cinetico.pinzaSueltaDerecho': 'pinza · suelta: clic derecho',
        'cinetico.boca': 'boca abierta · cierra: clic', 'cinetico.bocaDerecho': 'boca abierta · cierra: clic derecho',
        'cinetico.fuente.zona': 'Zona libre', 'cinetico.fuente.mano': 'Mano', 'cinetico.fuente.brazo': 'Brazo',
        'cinetico.fuente.cabeza': 'cabeza', 'cinetico.fuente.torso': 'torso', 'cinetico.fuente.cabeza_corporal': 'cabeza corporal',
        'cinetico.error.deteccion': 'Detección no disponible. Di control zona libre para usar textura.',
        'cinetico.error.carga': 'No se pudo cargar la detección local. Di control zona libre para usar textura.',
        'cinetico.error.desconectada': 'La cámara se desconectó. Comprueba la conexión y di activar cursor.',
        'cinetico.error.inicio': 'No se pudo iniciar la cámara de AdaptaPE. Revisa su permiso o disponibilidad.',
    },
    en: {
        'cinetico.camara': 'Camera: head and torso calibrate posture; limbs use a fixed center and gentle gestures. Thumb-index pinch or open mouth: click on release. Voice controls: Computer, pause cursor; right click.',
        'cinetico.cargando': 'Loading local detection…',
        'cinetico.ayuda': 'Computer: recalibrate · right click · enable tremor',
        'cinetico.buscandoTextura': 'Move the visible limb slightly · looking for texture',
        'cinetico.texturaNoVisible': 'Texture not visible · cursor stopped',
        'cinetico.listo': 'Cursor ready. Comfortable posture calibrated.',
        'cinetico.seguroMueve': 'Safe · move to enable click',
        'cinetico.seguroProgreso': 'Safe · {tipo} {porcentaje}%',
        'cinetico.clic': 'click', 'cinetico.derecho': 'right',
        'cinetico.recuperando': 'Restoring comfortable posture · no click',
        'cinetico.atraccion': 'Attraction · precision', 'cinetico.moviendo': 'Moving',
        'cinetico.menu': 'AdaptaPE context menu',
        'cinetico.menu.enlacePestana': 'Open link in tab', 'cinetico.menu.enlaceVentana': 'Open link in window',
        'cinetico.menu.imagen': 'Open image', 'cinetico.menu.atras': 'Back', 'cinetico.menu.recargar': 'Reload page', 'cinetico.menu.cerrar': 'Close menu',
        'cinetico.esperandoCamara': 'Waiting for central camera · no click',
        'cinetico.enEspera': 'Tracking on hold · show the chosen part',
        'cinetico.esperandoInicio': 'Waiting for central camera…',
        'cinetico.confirmando': 'Confirming tracking · no click',
        'cinetico.calibrando': 'Rest in a comfortable posture · calibrating, no click',
        'cinetico.pausado': 'Cursor paused · say “resume cursor”',
        'cinetico.esperandoImagen': 'Waiting for a valid camera image',
        'cinetico.senal': 'signal', 'cinetico.puno': 'fist · rest', 'cinetico.punoPreparar': 'fist · open your hand to prepare rest',
        'cinetico.pinzaDerechoHecho': 'pinch · right click done, release',
        'cinetico.pinzaSuelta': 'pinch · release: click · hold: right', 'cinetico.pinzaSueltaDerecho': 'pinch · release: right click',
        'cinetico.boca': 'mouth open · close: click', 'cinetico.bocaDerecho': 'mouth open · close: right click',
        'cinetico.fuente.zona': 'Free zone', 'cinetico.fuente.mano': 'Hand', 'cinetico.fuente.brazo': 'Arm',
        'cinetico.fuente.cabeza': 'head', 'cinetico.fuente.torso': 'torso', 'cinetico.fuente.cabeza_corporal': 'body head',
        'cinetico.error.deteccion': 'Detection unavailable. Say free zone control to use texture.',
        'cinetico.error.carga': 'Local detection could not load. Say free zone control to use texture.',
        'cinetico.error.desconectada': 'The camera disconnected. Check the connection and say activate cursor.',
        'cinetico.error.inicio': 'AdaptaPE could not start the camera. Check its permission or availability.',
    },
    pt: {
        'cinetico.camara': 'Câmera: cabeça e tronco calibram a postura; membros usam centro fixo e gestos suaves. Pinça polegar-indicador ou boca aberta: clique ao soltar. Controles por voz: Computador, pausar cursor; clique direito.',
        'cinetico.cargando': 'Carregando detecção local…',
        'cinetico.ayuda': 'Computador: recalibrar · clique direito · ativar tremor',
        'cinetico.buscandoTextura': 'Mova levemente o membro visível · buscando textura',
        'cinetico.texturaNoVisible': 'Textura não visível · cursor parado',
        'cinetico.listo': 'Cursor pronto. Postura confortável calibrada.',
        'cinetico.seguroMueve': 'Seguro · mova para habilitar o clique',
        'cinetico.seguroProgreso': 'Seguro · {tipo} {porcentaje}%',
        'cinetico.clic': 'clique', 'cinetico.derecho': 'direito',
        'cinetico.recuperando': 'Recuperando postura confortável · sem clique',
        'cinetico.atraccion': 'Atração · precisão', 'cinetico.moviendo': 'Movendo',
        'cinetico.menu': 'Menu de contexto AdaptaPE',
        'cinetico.menu.enlacePestana': 'Abrir link em aba', 'cinetico.menu.enlaceVentana': 'Abrir link em janela',
        'cinetico.menu.imagen': 'Abrir imagem', 'cinetico.menu.atras': 'Voltar', 'cinetico.menu.recargar': 'Recarregar página', 'cinetico.menu.cerrar': 'Fechar menu',
        'cinetico.esperandoCamara': 'Aguardando câmera central · sem clique',
        'cinetico.enEspera': 'Rastreamento em espera · mostre a parte escolhida',
        'cinetico.esperandoInicio': 'Aguardando câmera central…',
        'cinetico.confirmando': 'Confirmando rastreamento · sem clique',
        'cinetico.calibrando': 'Descanse em uma postura confortável · calibrando sem clique',
        'cinetico.pausado': 'Cursor pausado · diga «retomar cursor»',
        'cinetico.esperandoImagen': 'Aguardando uma imagem válida da câmera',
        'cinetico.senal': 'sinal', 'cinetico.puno': 'punho · repouso', 'cinetico.punoPreparar': 'punho · abra a mão para preparar repouso',
        'cinetico.pinzaDerechoHecho': 'pinça · clique direito feito, solte',
        'cinetico.pinzaSuelta': 'pinça · solte: clique · mantenha: direito', 'cinetico.pinzaSueltaDerecho': 'pinça · solte: clique direito',
        'cinetico.boca': 'boca aberta · feche: clique', 'cinetico.bocaDerecho': 'boca aberta · feche: clique direito',
        'cinetico.fuente.zona': 'Zona livre', 'cinetico.fuente.mano': 'Mão', 'cinetico.fuente.brazo': 'Braço',
        'cinetico.fuente.cabeza': 'cabeça', 'cinetico.fuente.torso': 'tronco', 'cinetico.fuente.cabeza_corporal': 'cabeça corporal',
        'cinetico.error.deteccion': 'Detecção indisponível. Diga controle zona livre para usar textura.',
        'cinetico.error.carga': 'Não foi possível carregar a detecção local. Diga controle zona livre para usar textura.',
        'cinetico.error.desconectada': 'A câmera foi desconectada. Verifique a conexão e diga ativar cursor.',
        'cinetico.error.inicio': 'Não foi possível iniciar a câmera do AdaptaPE. Verifique a permissão ou a disponibilidade.',
    },
    de: {
        'cinetico.camara': 'Kamera: Kopf und Oberkörper kalibrieren die Haltung; Gliedmaßen nutzen eine feste Mitte und sanfte Gesten. Daumen-Zeigefinger-Griff oder offener Mund: Klick beim Loslassen. Sprachsteuerung: Computer, Cursor pausieren; Rechtsklick.',
        'cinetico.cargando': 'Lokale Erkennung wird geladen…',
        'cinetico.ayuda': 'Computer: neu kalibrieren · Rechtsklick · Zittern aktivieren',
        'cinetico.buscandoTextura': 'Bewege die sichtbare Gliedmaße leicht · Textur wird gesucht',
        'cinetico.texturaNoVisible': 'Textur nicht sichtbar · Cursor angehalten',
        'cinetico.listo': 'Cursor bereit. Bequeme Haltung kalibriert.',
        'cinetico.seguroMueve': 'Sicher · bewegen, um Klick zu aktivieren',
        'cinetico.seguroProgreso': 'Sicher · {tipo} {porcentaje} %',
        'cinetico.clic': 'Klick', 'cinetico.derecho': 'rechts',
        'cinetico.recuperando': 'Bequeme Haltung wird wiederhergestellt · kein Klick',
        'cinetico.atraccion': 'Anziehung · Präzision', 'cinetico.moviendo': 'Bewegung',
        'cinetico.menu': 'AdaptaPE-Kontextmenü',
        'cinetico.menu.enlacePestana': 'Link in Tab öffnen', 'cinetico.menu.enlaceVentana': 'Link in Fenster öffnen',
        'cinetico.menu.imagen': 'Bild öffnen', 'cinetico.menu.atras': 'Zurück', 'cinetico.menu.recargar': 'Seite neu laden', 'cinetico.menu.cerrar': 'Menü schließen',
        'cinetico.esperandoCamara': 'Warte auf zentrale Kamera · kein Klick',
        'cinetico.enEspera': 'Verfolgung wartet · zeige den gewählten Körperteil',
        'cinetico.esperandoInicio': 'Warte auf zentrale Kamera…',
        'cinetico.confirmando': 'Verfolgung wird bestätigt · kein Klick',
        'cinetico.calibrando': 'Ruhe in einer bequemen Haltung · Kalibrierung ohne Klick',
        'cinetico.pausado': 'Cursor pausiert · sage „Cursor fortsetzen“',
        'cinetico.esperandoImagen': 'Warte auf ein gültiges Kamerabild',
        'cinetico.senal': 'Zeigen', 'cinetico.puno': 'Faust · Ruhe', 'cinetico.punoPreparar': 'Faust · Hand öffnen, um Ruhe vorzubereiten',
        'cinetico.pinzaDerechoHecho': 'Griff · Rechtsklick erledigt, loslassen',
        'cinetico.pinzaSuelta': 'Griff · loslassen: Klick · halten: rechts', 'cinetico.pinzaSueltaDerecho': 'Griff · loslassen: Rechtsklick',
        'cinetico.boca': 'Mund offen · schließen: Klick', 'cinetico.bocaDerecho': 'Mund offen · schließen: Rechtsklick',
        'cinetico.fuente.zona': 'Freie Zone', 'cinetico.fuente.mano': 'Hand', 'cinetico.fuente.brazo': 'Arm',
        'cinetico.fuente.cabeza': 'Kopf', 'cinetico.fuente.torso': 'Oberkörper', 'cinetico.fuente.cabeza_corporal': 'Kopf (Körper)',
        'cinetico.error.deteccion': 'Erkennung nicht verfügbar. Sage Steuerung freie Zone, um Textur zu nutzen.',
        'cinetico.error.carga': 'Lokale Erkennung konnte nicht geladen werden. Sage Steuerung freie Zone, um Textur zu nutzen.',
        'cinetico.error.desconectada': 'Die Kamera wurde getrennt. Prüfe die Verbindung und sage Cursor aktivieren.',
        'cinetico.error.inicio': 'AdaptaPE konnte die Kamera nicht starten. Prüfe Berechtigung oder Verfügbarkeit.',
    },
    fr: {
        'cinetico.camara': 'Caméra : la tête et le torse calibrent la posture ; les membres utilisent un centre fixe et des gestes doux. Pince pouce-index ou bouche ouverte : clic au relâchement. Commandes vocales : Ordinateur, pause curseur ; clic droit.',
        'cinetico.cargando': 'Chargement de la détection locale…',
        'cinetico.ayuda': 'Ordinateur : recalibrer · clic droit · activer tremblement',
        'cinetico.buscandoTextura': 'Bougez légèrement le membre visible · recherche de texture',
        'cinetico.texturaNoVisible': 'Texture non visible · curseur arrêté',
        'cinetico.listo': 'Curseur prêt. Posture confortable calibrée.',
        'cinetico.seguroMueve': 'Sûr · bougez pour activer le clic',
        'cinetico.seguroProgreso': 'Sûr · {tipo} {porcentaje} %',
        'cinetico.clic': 'clic', 'cinetico.derecho': 'droit',
        'cinetico.recuperando': 'Retour à la posture confortable · sans clic',
        'cinetico.atraccion': 'Attraction · précision', 'cinetico.moviendo': 'Déplacement',
        'cinetico.menu': 'Menu contextuel AdaptaPE',
        'cinetico.menu.enlacePestana': 'Ouvrir le lien dans un onglet', 'cinetico.menu.enlaceVentana': 'Ouvrir le lien dans une fenêtre',
        'cinetico.menu.imagen': 'Ouvrir l’image', 'cinetico.menu.atras': 'Retour', 'cinetico.menu.recargar': 'Recharger la page', 'cinetico.menu.cerrar': 'Fermer le menu',
        'cinetico.esperandoCamara': 'En attente de la caméra centrale · sans clic',
        'cinetico.enEspera': 'Suivi en attente · montrez la partie choisie',
        'cinetico.esperandoInicio': 'En attente de la caméra centrale…',
        'cinetico.confirmando': 'Confirmation du suivi · sans clic',
        'cinetico.calibrando': 'Reposez-vous dans une posture confortable · calibrage sans clic',
        'cinetico.pausado': 'Curseur en pause · dites « reprendre le curseur »',
        'cinetico.esperandoImagen': 'En attente d’une image valide de la caméra',
        'cinetico.senal': 'signal', 'cinetico.puno': 'poing · repos', 'cinetico.punoPreparar': 'poing · ouvrez la main pour préparer le repos',
        'cinetico.pinzaDerechoHecho': 'pince · clic droit fait, relâchez',
        'cinetico.pinzaSuelta': 'pince · relâchez : clic · maintenez : droit', 'cinetico.pinzaSueltaDerecho': 'pince · relâchez : clic droit',
        'cinetico.boca': 'bouche ouverte · fermez : clic', 'cinetico.bocaDerecho': 'bouche ouverte · fermez : clic droit',
        'cinetico.fuente.zona': 'Zone libre', 'cinetico.fuente.mano': 'Main', 'cinetico.fuente.brazo': 'Bras',
        'cinetico.fuente.cabeza': 'tête', 'cinetico.fuente.torso': 'torse', 'cinetico.fuente.cabeza_corporal': 'tête (corps)',
        'cinetico.error.deteccion': 'Détection indisponible. Dites contrôle zone libre pour utiliser la texture.',
        'cinetico.error.carga': 'Impossible de charger la détection locale. Dites contrôle zone libre pour utiliser la texture.',
        'cinetico.error.desconectada': 'La caméra s’est déconnectée. Vérifiez la connexion et dites activer le curseur.',
        'cinetico.error.inicio': 'AdaptaPE n’a pas pu démarrer la caméra. Vérifiez son autorisation ou sa disponibilité.',
    },
    it: {
        'cinetico.camara': 'Fotocamera: testa e busto calibrano la postura; gli arti usano un centro fisso e gesti delicati. Pinza pollice-indice o bocca aperta: clic al rilascio. Comandi vocali: Computer, pausa cursore; clic destro.',
        'cinetico.cargando': 'Caricamento del rilevamento locale…',
        'cinetico.ayuda': 'Computer: ricalibra · clic destro · attiva tremore',
        'cinetico.buscandoTextura': 'Muovi leggermente l’arto visibile · ricerca della texture',
        'cinetico.texturaNoVisible': 'Texture non visibile · cursore fermo',
        'cinetico.listo': 'Cursore pronto. Postura comoda calibrata.',
        'cinetico.seguroMueve': 'Sicuro · muovi per abilitare il clic',
        'cinetico.seguroProgreso': 'Sicuro · {tipo} {porcentaje}%',
        'cinetico.clic': 'clic', 'cinetico.derecho': 'destro',
        'cinetico.recuperando': 'Recupero della postura comoda · nessun clic',
        'cinetico.atraccion': 'Attrazione · precisione', 'cinetico.moviendo': 'In movimento',
        'cinetico.menu': 'Menu contestuale AdaptaPE',
        'cinetico.menu.enlacePestana': 'Apri link in una scheda', 'cinetico.menu.enlaceVentana': 'Apri link in una finestra',
        'cinetico.menu.imagen': 'Apri immagine', 'cinetico.menu.atras': 'Indietro', 'cinetico.menu.recargar': 'Ricarica pagina', 'cinetico.menu.cerrar': 'Chiudi menu',
        'cinetico.esperandoCamara': 'In attesa della fotocamera centrale · nessun clic',
        'cinetico.enEspera': 'Tracciamento in attesa · mostra la parte scelta',
        'cinetico.esperandoInicio': 'In attesa della fotocamera centrale…',
        'cinetico.confirmando': 'Conferma del tracciamento · nessun clic',
        'cinetico.calibrando': 'Riposa in una postura comoda · calibrazione senza clic',
        'cinetico.pausado': 'Cursore in pausa · di’ «riprendi cursore»',
        'cinetico.esperandoImagen': 'In attesa di un’immagine valida dalla fotocamera',
        'cinetico.senal': 'segnale', 'cinetico.puno': 'pugno · riposo', 'cinetico.punoPreparar': 'pugno · apri la mano per preparare il riposo',
        'cinetico.pinzaDerechoHecho': 'pinza · clic destro fatto, rilascia',
        'cinetico.pinzaSuelta': 'pinza · rilascia: clic · tieni: destro', 'cinetico.pinzaSueltaDerecho': 'pinza · rilascia: clic destro',
        'cinetico.boca': 'bocca aperta · chiudi: clic', 'cinetico.bocaDerecho': 'bocca aperta · chiudi: clic destro',
        'cinetico.fuente.zona': 'Zona libera', 'cinetico.fuente.mano': 'Mano', 'cinetico.fuente.brazo': 'Braccio',
        'cinetico.fuente.cabeza': 'testa', 'cinetico.fuente.torso': 'busto', 'cinetico.fuente.cabeza_corporal': 'testa (corpo)',
        'cinetico.error.deteccion': 'Rilevamento non disponibile. Di’ controllo zona libera per usare la texture.',
        'cinetico.error.carga': 'Impossibile caricare il rilevamento locale. Di’ controllo zona libera per usare la texture.',
        'cinetico.error.desconectada': 'La fotocamera si è disconnessa. Controlla la connessione e di’ attiva cursore.',
        'cinetico.error.inicio': 'AdaptaPE non è riuscito ad avviare la fotocamera. Controlla il permesso o la disponibilità.',
    },
};
globalThis.TextosAdapta?.definir(textos);
const t = (clave, variables = {}) => globalThis.TextosAdapta ? globalThis.TextosAdapta.t(clave, variables) :
    (textos.es[clave] ?? clave).replace(/\{(\w+)\}/g, (_, nombre) => variables[nombre] ?? '');
class KineticEngine {
    constructor() {
        this.permitida = false;
        this.visible = !document.hidden;
        this.activa = false;
        this.iniciando = false;
        this.bloqueada = false;
        this.generacion = 0;
        this.animationId = null;
        this.posX = window.innerWidth / 2;
        this.posY = window.innerHeight / 2;
        this.ancho = 160;
        this.alto = 120;
        this.grises = new Float32Array(this.ancho * this.alto);
        this.grisesAnteriores = null;
        this.muestraGesto = null;
        this.puntoGesto = null;
        this.puntoBase = { x: this.ancho / 2, y: this.alto / 2 };
        this.origenControl = { ...this.puntoBase };
        this.puntoActual = { ...this.origenControl };
        this.puntoSuave = { ...this.puntoBase };
        this.plantilla = null;
        this.radioPlantilla = 12;
        this.zonaMuerta = 0.045;
        this.modoControl = 'cabeza';
        this.fuenteControl = null;
        this.neutroListo = false;
        this.muestrasPostura = [];
        this.ultimaPostura = null;
        this.perdidaDesde = null;
        this.reposoBorde = null;
        this.historialMovimiento = [];
        this.ultimoMovimiento = null;
        this.deteccion = null;
        this.zonaAtraccion = 0.065;
        this.duracionClick = 1000; // Milisegundos reales, independiente del monitor/cámara.
        this.velocidadMaxima = 650; // Píxeles por segundo.
        this.sensibilidad = 1;
        this.amplitudControl = 1;
        this.inicioFijacion = null;
        this.objetivoFijado = null;
        this.armado = false;
        this.inicioArmado = null;
        this.enZonaSegura = false;
        this.tipoClick = 'izquierdo';
        this.pausada = false;
        this.ultimoTiempo = null;
        this.ultimoVideo = -1;
        this.numeroFotograma = 0;
        this.fiableDesde = null;
        this.elementoHover = null;
        this.gestoClic = null; // Pinza o boca: sólo en memoria, nunca en storage.
        this.estadoClic = null;
        this.bucleRender = this.bucleRender.bind(this);
    }

    setEstado(estado) {
        if (Boolean(estado) !== this.permitida) this.bloqueada = false;
        this.permitida = Boolean(estado);
        this.evaluarEstado();
    }

    actualizarVisibilidad(visible) {
        this.visible = Boolean(visible);
        this.evaluarEstado();
    }

    evaluarEstado() {
        if (this.permitida && this.visible) {
            if (!this.activa && !this.iniciando && !this.bloqueada) this.iniciarCamara();
        } else this.detenerCamara();
    }

    aplicarAjustes(ajustes) {
        if (!ajustes || typeof ajustes !== 'object') return;
        const modoAnterior = this.modoControl, amplitudAnterior = this.amplitudControl;
        if (['automatico', 'cabeza', 'torso', 'brazo_izquierdo', 'brazo_derecho', 'manos', 'zona', 'zona_izquierda', 'zona_derecha'].includes(ajustes.modo)) {
            this.modoControl = ajustes.modo.startsWith('zona') ? 'zona' : ['automatico', 'brazo_izquierdo', 'brazo_derecho'].includes(ajustes.modo) ? 'manos' : ajustes.modo === 'torso' ? 'cabeza' : ajustes.modo;
        }
        if (typeof ajustes.temblor === 'boolean') this.zonaMuerta = ajustes.temblor ? 0.07 : 0.045;
        this.zonaAtraccion = this.zonaMuerta + 0.02;
        if (Number.isFinite(ajustes.velocidad)) this.sensibilidad = Math.max(0.3, Math.min(2, ajustes.velocidad));
        if ([0.55, 1].includes(ajustes.amplitud)) this.amplitudControl = ajustes.amplitud;
        if (this.activa && (modoAnterior !== this.modoControl || (this.modoControl === 'cabeza' && amplitudAnterior !== this.amplitudControl))) {
            this.fuenteControl = null;
            this.deteccion = null;
            this.calibrar();
            this.solicitarModelo();
        } else if (amplitudAnterior !== this.amplitudControl) this.cancelarFijacion(true);
    }

    guardarAjustes() {
        // Guardar preferencias, nunca imágenes ni la postura física de una persona.
        chrome.storage.local.set({ ajustesCineticos: { modo: this.modoControl, temblor: this.zonaMuerta > 0.05,
            velocidad: this.sensibilidad, amplitud: this.amplitudControl } }).catch(() => {});
    }

    iniciarCamara() {
        ++this.generacion;
        this.crearInterfaz();
        this.activa = true; this.iniciando = false;
        this.numeroFotograma = 0; this.ultimoVideo = -1; this.ultimoTiempo = null;
        this.deteccion = null; this.grisesRecibidos = false;
        this.puntoActual = { ...this.puntoBase };
        this.calibrar(); this.pausada = false; this.tipoClick = 'izquierdo';
        this.modeloEnviado = null; this.solicitarModelo(); this.programarFotograma();
    }

    recibirFotograma(datos) {
        if (!this.activa || datos?.modo !== this.modoControl || !Number.isFinite(datos.edad) || datos.edad > 500) return;
        this.deteccion = { ...datos, tiempo: performance.now() - Math.max(0, datos.edad) };
        this.numeroFotograma++;
        if (Array.isArray(datos.grises) && datos.grises.length === this.grises.length) {
            this.grises.set(datos.grises); this.grisesRecibidos = true;
        }
    }

    recibirVista(imagen) {
        if (!this.activa || typeof imagen !== 'string' || !imagen.startsWith('data:image/jpeg;base64,') || imagen.length >= 100000 || this.vistaPendiente) return;
        const generacion = this.generacion;
        const vista = new Image();
        this.vistaPendiente = vista;
        vista.onload = () => {
            if (this.activa && generacion === this.generacion) this.ctx.drawImage(vista, 0, 0, this.ancho, this.alto);
            if (this.vistaPendiente === vista) this.vistaPendiente = null;
        };
        vista.onerror = () => { if (this.vistaPendiente === vista) this.vistaPendiente = null; };
        vista.src = imagen;
    }

    solicitarModelo() {
        const modelo = this.modoControl + ':' + this.fuenteControl;
        if (this.modeloEnviado === modelo) return;
        this.modeloEnviado = modelo;
        chrome.runtime.sendMessage({ accion: 'camara_modo', modo: this.modoControl, fuente: this.fuenteControl }).then(respuesta => {
            if (respuesta?.ok === false && this.modeloEnviado === modelo) this.modeloEnviado = null;
        }).catch(() => { if (this.modeloEnviado === modelo) this.modeloEnviado = null; });
    }

    mostrarError(texto, clave) {
        this.claveAviso = clave;
        this.aviso?.remove();
        this.aviso = document.createElement('div');
        this.aviso.id = 'adapta-pe-camara-aviso';
        this.aviso.setAttribute('role', 'alert');
        this.aviso.textContent = texto;
        this.aviso.style.cssText = 'position:fixed;right:20px;bottom:20px;max-width:300px;padding:14px;background:#8b1420;color:white;border-radius:12px;z-index:999999;font:14px sans-serif;';
        document.body.appendChild(this.aviso);
    }

    // Cambio de idioma en vivo: el HUD se redibuja con cada imagen; aquí sólo los textos fijos.
    actualizarTextos() {
        this.canvasEl?.setAttribute('aria-label', t('cinetico.camara'));
        if (this.ayuda) this.ayuda.textContent = t('cinetico.ayuda');
        if (this.hud && !this.numeroFotograma) this.hud.textContent = t('cinetico.cargando');
        if (this.aviso?.isConnected && this.claveAviso) this.aviso.textContent = t(this.claveAviso);
        this.menu?.remove();
    }

    crearInterfaz() {
        this.burbuja = document.createElement('div');
        this.burbuja.id = 'adapta-pe-camara-box';
        this.burbuja.style.cssText = 'position:fixed;bottom:20px;right:20px;width:220px;height:165px;border-radius:16px;border:3px solid #2ecc71;overflow:hidden;z-index:999999;background:#111;box-shadow:0 8px 20px rgba(0,0,0,.5);pointer-events:none;';
        const contenido = this.burbuja.attachShadow({ mode: 'closed' }); // La web no puede leer imágenes de cámara.
        this.canvasEl = document.createElement('canvas');
        this.canvasEl.width = this.ancho;
        this.canvasEl.height = this.alto;
        this.canvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        this.canvasEl.setAttribute('aria-label', t('cinetico.camara'));
        this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });
        this.hudCanvasEl = document.createElement('canvas');
        this.hudCanvasEl.width = this.ancho;
        this.hudCanvasEl.height = this.alto;
        this.hudCanvasEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        this.hudCtx = this.hudCanvasEl.getContext('2d');
        this.hud = document.createElement('div');
        this.hud.id = 'adapta-pe-hud';
        this.hud.style.cssText = 'position:absolute;bottom:6px;left:4px;right:4px;background:rgba(0,0,0,.85);color:white;font:11px sans-serif;padding:5px;border-radius:6px;pointer-events:none;';
        this.hud.setAttribute('role', 'status');
        this.hud.setAttribute('aria-live', 'off'); // El progreso cambia por frame; anunciar sólo la calibración final.
        this.hud.textContent = t('cinetico.cargando');
        contenido.append(this.canvasEl, this.hudCanvasEl, this.hud);
        const ayuda = this.ayuda = document.createElement('div');
        ayuda.textContent = t('cinetico.ayuda');
        ayuda.style.cssText = 'position:absolute;top:4px;left:4px;right:4px;background:#111d;color:white;font:12px sans-serif;padding:5px;border-radius:6px;';
        contenido.appendChild(ayuda);
        this.punteroVirtual = document.createElement('div');
        this.punteroVirtual.id = 'adapta-pe-cursor';
        this.punteroVirtual.setAttribute('aria-hidden', 'true');
        this.punteroVirtual.style.cssText = 'position:fixed;width:26px;height:26px;background:rgba(227,6,19,.9);border:2px solid white;border-radius:50%;z-index:2147483647;pointer-events:none;box-shadow:0 0 12px rgba(0,0,0,.5);transform:translate(-50%,-50%);';
        document.body.append(this.burbuja, this.punteroVirtual);
        this.dibujarCursor(0);
    }

    detenerCamara() {
        ++this.generacion;
        this.vistaPendiente = null;
        this.numeroFotograma = 0; this.grisesRecibidos = false;
        this.grisesAnteriores = null;
        this.deteccion = null;
        this.fuenteControl = null;
        this.neutroListo = false;
        this.muestrasPostura = [];
        this.ultimaPostura = null;
        this.perdidaDesde = null;
        this.reposoBorde = null;
        this.historialMovimiento = [];
        this.ultimoMovimiento = null;
        this.fuenteCandidata = null; this.adquisicion = null;
        this.activa = false;
        this.iniciando = false;
        cancelAnimationFrame(this.animationId);
        this.actualizarHover(null);
        this.burbuja?.remove(); this.punteroVirtual?.remove(); this.menu?.remove(); this.aviso?.remove();
        this.punteroVirtual = null;
        this.plantilla = null;
        this.cancelarFijacion(true);
    }

    elegirPunto(datos) {
        const convertir = (punto, fuente, derivado = false) => punto && Number.isFinite(punto.x) && Number.isFinite(punto.y) &&
            (derivado || (punto.x >= 0 && punto.x <= 1 && punto.y >= 0 && punto.y <= 1)) ?
              { x: (1 - punto.x) * this.ancho, y: punto.y * this.alto, fuente } : null;
        const rostro = datos.rostro || [], cuerpo = datos.cuerpo || [], manos = datos.manos || [];
        const candidatos = [];
        const confianza = this.modoControl === 'manos' ? 0.5 : 0.65;
        const visible = indice => cuerpo[indice] && cuerpo[indice].visibility >= confianza &&
            (cuerpo[indice].presence ?? 1) >= confianza && convertir(cuerpo[indice], '');
        // Histéresis: adquirir exige más confianza que conservar una mano ya seguida sin pérdida.
        const minima = this.fuenteControl?.startsWith('mano:') && this.perdidaDesde == null ? 0.6 : 0.8;
        if ((this.modoControl === 'manos' || this.modoControl === 'automatico') && manos[0] &&
            !(datos.manoConfianza < minima) && this.esqueletoMano(manos)) {
            const fuente = 'mano:' + (datos.mano || 'visible');
            let mano = this.fuenteControl === fuente + ':palma' ? null : convertir(manos[0], fuente);
            if (!mano) {
                const nudillos = [5, 9, 13, 17].map(indice => convertir(manos[indice], fuente + ':palma')).filter(Boolean);
                if (nudillos.length >= 2) mano = { x: nudillos.reduce((suma, punto) => suma + punto.x, 0) / nudillos.length,
                    y: nudillos.reduce((suma, punto) => suma + punto.y, 0) / nudillos.length, fuente: fuente + ':palma' };
            }
            if (mano) {
                mano.gesto = this.inclinacionMano(manos);
                const pinza = this.medirPinza(manos);
                mano.clic = mano.gesto?.puno && pinza !== 'suelto' ? null : pinza;
            }
            candidatos.push(mano);
        }
        if (this.modoControl === 'manos' || this.modoControl === 'automatico') {
            if (!candidatos.some(Boolean) && this.fuenteControl?.startsWith('mano:')) {
                const cercana = [15, 16].filter(visible).map(indice => ({ ...convertir(cuerpo[indice], this.fuenteControl), respaldo: true }))
                    .sort((a, b) => Math.hypot(a.x - this.puntoActual.x, a.y - this.puntoActual.y) - Math.hypot(b.x - this.puntoActual.x, b.y - this.puntoActual.y))[0];
                if (cercana && Math.hypot(cercana.x - this.puntoActual.x, cercana.y - this.puntoActual.y) <= this.ancho * 0.2) candidatos.push(cercana);
                else return null; // Una pérdida de mano no elige otro codo incidental.
            }
            for (const [lado, indices] of [['izquierdo', [15, 13]], ['derecho', [16, 14]]]) {
                const fuente = 'brazo_' + lado;
                const indice = indices.find(indice => this.fuenteControl === fuente + ':' + indice && visible(indice)) ?? indices.find(visible);
                if (indice != null) candidatos.push(convertir(cuerpo[indice], fuente + ':' + indice));
            }
        }
        if ((this.modoControl === 'automatico' || this.modoControl === 'cabeza') && rostro[1] && rostro[33] && rostro[263]) {
            const nariz = rostro[1], izquierdo = rostro[33], derecho = rostro[263];
            const ancho = Math.hypot(derecho.x - izquierdo.x, derecho.y - izquierdo.y);
            if (ancho >= 0.025 && [nariz, izquierdo, derecho].every(punto => convertir(punto))) {
                const centroX = (izquierdo.x + derecho.x) / 2, centroY = (izquierdo.y + derecho.y) / 2;
                // Validar anatomía dentro de imagen; el control derivado puede salir del cuadro.
                // Recortarlo o descartarlo obligaba a levantar un rostro perfectamente visible.
                const cabeza = convertir({ x: nariz.x + (nariz.x - centroX) / ancho * 0.12,
                    y: nariz.y + (nariz.y - centroY) / ancho * 0.12 }, 'cabeza', true);
                // Apertura de boca (jawOpen 0..1): histéresis amplia para no confundir el habla con un clic.
                if (cabeza && Number.isFinite(datos.boca)) cabeza.clic = datos.boca >= 0.5 ? 'activo' : datos.boca <= 0.2 ? 'suelto' : 'intermedio';
                candidatos.push(cabeza);
            }
        }

        if (this.modoControl === 'brazo_izquierdo' || this.modoControl === 'brazo_derecho') {
            const indices = this.modoControl === 'brazo_izquierdo' ? [15, 13] : [16, 14];
            const actual = indices.find(indice => this.fuenteControl === this.modoControl + ':' + indice && visible(indice));
            const indice = actual ?? indices.find(visible);
            if (indice != null) return convertir(cuerpo[indice], this.modoControl + ':' + indice);
            return null; // No inventar la posición de una mano ausente u oculta.
        }
        if ((this.modoControl === 'automatico' || this.modoControl === 'cabeza') && visible(0)) candidatos.push(convertir(cuerpo[0], 'cabeza corporal'));
        if ((this.modoControl === 'torso' || this.modoControl === 'cabeza') && visible(11) && visible(12)) {
            candidatos.push(convertir({ x: (cuerpo[11].x + cuerpo[12].x) / 2, y: (cuerpo[11].y + cuerpo[12].y) / 2 }, 'torso'));
        }
        // Una mano persistente puede sustituir el codo sin obligar a levantar el brazo.
        if (['automatico', 'manos'].includes(this.modoControl) && !this.fuenteControl?.startsWith('mano:') && candidatos[0]?.fuente.startsWith('mano:')) return candidatos[0];
        return candidatos.find(punto => punto?.fuente === this.fuenteControl) || candidatos.find(Boolean) || null;
    }

    esqueletoMano(manos) {
        // Esqueleto invisible: rechaza manos con proporciones imposibles (falsos positivos en rostro, ropa o fondo).
        // MediaPipe entrega siempre 21 puntos; sin esqueleto completo no hay proporciones que juzgar.
        if (manos.length < 21 || !Array.from(manos).every(punto => punto && Number.isFinite(punto.x) && Number.isFinite(punto.y))) return true;
        const distancia = (a, b) => Math.hypot(manos[b].x - manos[a].x, (manos[b].y - manos[a].y) * this.alto / this.ancho,
            (manos[b].z || 0) - (manos[a].z || 0));
        const palma = [5, 9, 13, 17].reduce((suma, indice) => suma + distancia(0, indice), 0) / 4;
        if (!(palma >= 0.025)) return false;
        const anchoPalma = distancia(5, 17) / palma;
        return anchoPalma >= 0.3 && anchoPalma <= 1.6 && [5, 9, 13, 17].every(base => {
            const dedo = (distancia(base, base + 1) + distancia(base + 1, base + 2) + distancia(base + 2, base + 3)) / palma;
            return dedo <= 2.5; // Reales <=1,3 palmas. Sin mínimo: un dedo que apunta a la cámara se acorta en la imagen.
        });
    }

    inclinacionMano(manos) {
        const valido = indice => manos[indice] && Number.isFinite(manos[indice].z) &&
            manos[indice].x >= 0 && manos[indice].x <= 1 && manos[indice].y >= 0 && manos[indice].y <= 1;
        const vector = (a, b) => [b.x - a.x, (b.y - a.y) * this.alto / this.ancho, b.z - a.z];
        const dedos = [[5, 8], [9, 12], [13, 16], [17, 20]];
        const completos = dedos.every(([base, punta]) => [0, base, base + 1, base + 2, punta].every(valido));
        // Recta nudillo-punta / suma de falanges: <0.75 doblado, >=0.9 extendido.
        const rectitud = completos && dedos.map(([base, punta]) => {
            const segmentos = [base, base + 1, base + 2].map(indice => Math.hypot(...vector(manos[indice], manos[indice + 1])));
            return segmentos.every(valor => valor > 0.0001) ?
                Math.hypot(...vector(manos[base], manos[punta])) / segmentos.reduce((suma, valor) => suma + valor, 0) : NaN;
        });
        // El modelo suele estirar un dedo de un puño real: bastan tres doblados si ninguno queda extendido.
        const puno = completos && rectitud.every(Number.isFinite) && rectitud.filter(valor => valor < 0.75).length >= 3 &&
            rectitud.every(valor => valor < 0.9);
        const extendidos = dedos.filter(([base, punta]) => {
            if (!valido(base) || !valido(punta)) return false;
            const longitud = Math.hypot(...vector(manos[base], manos[punta]));
            if (longitud < 0.015) return false;
            if ([base + 1, base + 2].every(valido)) {
                const segmentos = [base, base + 1, base + 2].map(indice => Math.hypot(...vector(manos[indice], manos[indice + 1])));
                // Dedos hacia abajo pueden estar extendidos aunque la punta se acerque a la muñeca.
                return segmentos.every(valor => valor > 0.0001) && longitud >= segmentos.reduce((suma, valor) => suma + valor, 0) * 0.9;
            }
            return valido(0) && Math.hypot(...vector(manos[0], manos[base])) > 0.0001 &&
                Math.hypot(...vector(manos[0], manos[punta])) > Math.hypot(...vector(manos[0], manos[base])) * 1.25;
        })
            .map(([base, punta]) => vector(manos[base], manos[punta]));
        const apuntando = extendidos.length > 0 && extendidos.every(dedo =>
            dedo[0] * extendidos[0][0] + dedo[1] * extendidos[0][1] >=
            0.85 * Math.hypot(dedo[0], dedo[1]) * Math.hypot(extendidos[0][0], extendidos[0][1]));
        let direccion;
        if (apuntando) {
            direccion = extendidos.reduce((suma, dedo) => suma.map((valor, indice) => valor + dedo[indice]), [0, 0, 0]);
            if (Math.hypot(direccion[0], direccion[1]) < Math.hypot(...direccion) * 0.35) return null;
            direccion[2] = 0;
            if (Math.abs(direccion[0]) < Math.abs(direccion[1]) * 0.35) direccion[0] = 0;
            if (Math.abs(direccion[1]) < Math.abs(direccion[0]) * 0.35) direccion[1] = 0;
        }
        else {
            if (![0, 5, 17].every(valido)) return null;
            const a = vector(manos[0], manos[5]), b = vector(manos[0], manos[17]);
            // Nudillos y muñeca conservan el plano de la palma tanto abierta como en puño.
            direccion = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
            if (direccion[2] < 0) direccion = direccion.map(valor => -valor);
        }
        const longitud = Math.hypot(...direccion);
        if (longitud < 0.0001 || !Number.isFinite(longitud)) return puno ? { ...this.puntoBase, puno: true, abierta: false } : null;
        return { x: this.puntoBase.x - direccion[0] / longitud * 32,
            y: this.puntoBase.y + direccion[1] / longitud * 24, abierta: extendidos.length > 0,
            ...(apuntando ? { apuntando: true } : {}), ...(completos ? { puno } : {}) };
    }

    medirPinza(manos) {
        // Pinza pulgar (4) - índice (8) normalizada por muñeca - nudillo medio (0-9). null: puntos no fiables o puño.
        const valido = indice => manos[indice] && Number.isFinite(manos[indice].x) && Number.isFinite(manos[indice].y) &&
            manos[indice].x >= 0 && manos[indice].x <= 1 && manos[indice].y >= 0 && manos[indice].y <= 1;
        if (![0, 4, 5, 6, 8, 9].every(valido)) return null;
        const distancia = (a, b) => Math.hypot(manos[b].x - manos[a].x, (manos[b].y - manos[a].y) * this.alto / this.ancho,
            Number.isFinite(manos[a].z) && Number.isFinite(manos[b].z) ? manos[b].z - manos[a].z : 0);
        const tamano = distancia(0, 9);
        if (tamano < 0.03) return null; // Mano demasiado lejana para distinguir una pinza.
        const pinza = distancia(4, 8) / tamano;
        if (pinza >= 0.4) return 'suelto';
        if (pinza > 0.25) return 'intermedio';
        // En un puño el pulgar cubre la falange media y la punta del índice se recoge hacia la palma.
        return distancia(4, 8) < distancia(4, 6) && distancia(0, 8) > distancia(0, 5) ? 'activo' : null;
    }

    procesarGestoClic(estado, inferencia, tiempo) {
        // Pinza (manos) o boca abierta (cabeza): un clic por gesto, al soltar; exige ver el gesto suelto antes.
        const manos = this.modoControl === 'manos';
        const config = manos ? { inferencias: 2, confirmar: 80, derecho: 700, maximo: Infinity } :
            { inferencias: 3, confirmar: 300, derecho: Infinity, maximo: 1500 };
        const gesto = this.gestoClic ??= { suelto: false };
        if (inferencia === gesto.ultima) return gesto.inicio != null; // Una imagen repetida no confirma ni suelta.
        gesto.ultima = inferencia;
        if (estado === 'suelto') {
            const clic = gesto.confirmado && !gesto.derecho;
            this.gestoClic = { suelto: true, ultima: inferencia };
            if (clic) this.clicGesto(this.tipoClick, tiempo);
            return false;
        }
        // Pulgar oculto, puño o puntos poco fiables: cancelar sin clic y exigir soltar.
        if (estado !== 'activo' && estado !== 'intermedio') { this.gestoClic = { suelto: false, ultima: inferencia }; return false; }
        if (estado === 'activo' && gesto.suelto) gesto.inicio ??= inferencia;
        if (gesto.inicio == null) return false;
        // Antes de confirmar, la banda intermedia (habla, mano relajada) no cuenta ni congela: una sola imagen
        // activa ruidosa seguida de banda intermedia confirmaba el gesto y hacía clic (o derecho a 700 ms).
        if (estado === 'intermedio' && !gesto.confirmado) { gesto.inicio = null; gesto.cuenta = 0; return false; }
        gesto.cuenta = (gesto.cuenta || 0) + 1;
        const duracion = inferencia - gesto.inicio;
        if (duracion >= config.maximo) { this.gestoClic = { suelto: false, ultima: inferencia }; return false; } // Bostezo: sin clic.
        if (!gesto.confirmado && gesto.cuenta >= config.inferencias && duracion >= config.confirmar) gesto.confirmado = true;
        if (gesto.confirmado && !gesto.derecho && duracion >= config.derecho) { gesto.derecho = true; this.clicGesto('derecho', tiempo); }
        return true;
    }

    clicGesto(tipo, tiempo) {
        if (this.pausada || !this.neutroListo || this.fiableDesde == null || tiempo - this.fiableDesde < 250) return;
        const gesto = this.gestoClic, objetivo = this.elementoBajoCursor();
        this.cancelarFijacion(true); this.gestoClic = gesto; // Desarmar permanencia sin olvidar que la pinza sigue cerrada.
        if (this.muestraGesto) this.muestraGesto.puno = null;
        this.tipoClick = 'izquierdo';
        this.hacerClick(tipo, objetivo);
    }

    controlarGesto(punto, tiempo, angulo = 0, inclinacion = null) {
        let referencia = this.muestraGesto;
        if (!referencia || tiempo - referencia.tiempo > 500) {
            referencia = this.muestraGesto = { ...punto, tiempo, inclinacion: inclinacion?.apuntando ? null : inclinacion,
                candidata: inclinacion?.apuntando ? { ...inclinacion, tiempo } : null, control: { ...this.puntoBase },
                puno: { abierta: Boolean(inclinacion?.abierta || inclinacion?.apuntando), detectado: Boolean(inclinacion?.puno),
                    vista: inclinacion?.abierta || inclinacion?.apuntando ? tiempo : null } };
        }
        if (tiempo <= referencia.tiempo) return referencia.control;
        referencia.tiempo = tiempo;
        const puno = referencia.puno ??= { abierta: false };
        puno.detectado = Boolean(inclinacion?.puno);
        const reposoAnterior = Boolean(puno.activo);
        const abierta = Boolean(inclinacion?.abierta || inclinacion?.apuntando);
        if (abierta) puno.vista = tiempo;
        // Las imágenes intermedias al cerrar la mano no borran la apertura previa durante 1,5 s.
        puno.abierta = puno.vista != null && tiempo - puno.vista <= 1500;
        if (inclinacion?.puno && (reposoAnterior || puno.abierta || puno.inicio != null)) {
            puno.inicio ??= tiempo; puno.cuenta = (puno.cuenta || 0) + 1; puno.dudoso = null;
            puno.activo = reposoAnterior || tiempo - puno.inicio >= 120 && puno.cuenta >= 3;
            puno.salida = null;
            if (puno.activo) puno.vista = null; // Cada clic exige volver a abrir la mano.
        } else if (reposoAnterior && (abierta || puno.salida != null)) {
            puno.salida ??= tiempo;
            this.cancelarFijacion(true);
            if (tiempo - puno.salida >= 80) { puno.activo = false; puno.inicio = null; puno.cuenta = 0; }
        } else if (!abierta && (reposoAnterior || puno.inicio != null) && tiempo - (puno.dudoso ??= tiempo) < 400) {
            // Imagen ambigua (punto fuera o dedo mal estimado): conservar el puño y su permanencia hasta 400 ms.
        } else {
            puno.inicio = null; puno.cuenta = 0; puno.activo = false; puno.dudoso = null;
        }
        if (reposoAnterior !== Boolean(puno.activo)) {
            this.ultimoMovimiento = null; this.historialMovimiento = []; this.puntoSuave = { ...this.puntoBase };
            this.cancelarFijacion(reposoAnterior);
            referencia.senalActiva = false; referencia.candidata = null;
            if (puno.activo) {
                // Cerrar deliberadamente la mano permite dwell; llegar con un puño no arma clic.
                this.armado = !this.pausada && this.fiableDesde != null && tiempo - this.fiableDesde >= 250;
            } else {
                referencia.x = punto.x; referencia.y = punto.y; referencia.joystick = false;
                referencia.inclinacion = inclinacion?.apuntando ? null : inclinacion;
            }
        }
        if (puno.activo) return referencia.control = { ...this.puntoBase };
        const giro = (referencia.giro || 0) + angulo;
        referencia.giro = Math.atan2(Math.sin(giro), Math.cos(giro));
        referencia.inclinacion ??= inclinacion?.apuntando ? null : inclinacion;
        const senalAnterior = Boolean(referencia.senalActiva);
        if (inclinacion?.apuntando) {
            const candidata = referencia.candidata;
            const dx = inclinacion.x - this.puntoBase.x, dy = (inclinacion.y - this.puntoBase.y) * this.ancho / this.alto;
            const cx = candidata ? candidata.x - this.puntoBase.x : 0, cy = candidata ? (candidata.y - this.puntoBase.y) * this.ancho / this.alto : 0;
            if (!candidata || (!senalAnterior && dx * cx + dy * cy < 0.7 * Math.hypot(dx, dy) * Math.hypot(cx, cy))) {
                referencia.candidata = { ...inclinacion, tiempo };
            }
            referencia.senalActiva = senalAnterior || tiempo - referencia.candidata.tiempo >= 50;
        } else { referencia.candidata = null; referencia.senalActiva = false; }
        if (senalAnterior !== referencia.senalActiva) {
            this.ultimoMovimiento = null; this.historialMovimiento = []; this.puntoSuave = { ...this.puntoBase };
            this.cancelarFijacion();
        }
        // Joystick relativo: conservar el reposo inicial mientras se mantiene una dirección.
        let dx = (punto.x - referencia.x) * 6, dy = (punto.y - referencia.y) * 6;
        const desplazamiento = Math.hypot(dx / this.ancho, dy / this.alto) / this.amplitudControl;
        referencia.joystick = desplazamiento > (referencia.joystick ? this.zonaMuerta * 0.85 : this.zonaMuerta + 0.004);
        if (referencia.senalActiva) {
            dx = inclinacion.x - this.puntoBase.x; dy = inclinacion.y - this.puntoBase.y;
        } else if (!referencia.joystick && !inclinacion?.apuntando) {
            dx = 0; dy = 0;
            const origen = referencia.inclinacion;
            if (inclinacion && origen) { dx = inclinacion.x - origen.x; dy = inclinacion.y - origen.y; }
            else if (referencia.giro) { dx = referencia.giro * 144; dy = 0; }
        } else {
            if (Math.abs(dx) < Math.abs(dy * this.ancho / this.alto) * 0.3) dx = 0;
            if (Math.abs(dy * this.ancho / this.alto) < Math.abs(dx) * 0.3) dy = 0;
        }
        if (!referencia.senalActiva && !referencia.joystick && Math.hypot(dx / this.ancho, dy / this.alto) / this.amplitudControl <= this.zonaMuerta + 0.004) {
            dx = 0; dy = 0;
        }
        referencia.control = { x: this.puntoBase.x + Math.max(-32, Math.min(32, dx)),
            y: this.puntoBase.y + Math.max(-24, Math.min(24, dy)) };
        return referencia.control;
    }

    controlarZona(tiempo) {
        const grises = this.leerGrises();
        if (!this.plantilla) {
            const anterior = this.grisesAnteriores;
            if (!anterior) {
                this.grisesAnteriores = new Float32Array(grises);
                this.dibujarHUD(t('cinetico.buscandoTextura'), 0); return;
            }
            let luz = 0;
            for (let indice = 0; indice < grises.length; indice++) luz += grises[indice] - anterior[indice];
            luz /= grises.length;
            let sumaX = 0, sumaY = 0, movidos = 0;
            for (let y = 0; y < this.alto; y += 2) for (let x = 0; x < this.ancho; x += 2) {
                const indice = y * this.ancho + x;
                if (Math.abs(grises[indice] - anterior[indice] - luz) > 12) { sumaX += x; sumaY += y; movidos++; }
            }
            const candidatos = [];
            const margen = this.radioPlantilla + 1;
            // Movimiento local propone textura; una variación de luz o imagen completa no adquiere control.
            if (movidos >= 12 && movidos < grises.length * 0.35 / 4) {
                const centroX = Math.round(sumaX / movidos), centroY = Math.round(sumaY / movidos);
                for (let y = Math.max(margen, centroY - 24); y < Math.min(this.alto - margen, centroY + 25); y += 4) {
                    for (let x = Math.max(margen, centroX - 24); x < Math.min(this.ancho - margen, centroX + 25); x += 4) {
                        const indice = y * this.ancho + x;
                        const movimiento = Math.abs(grises[indice] - anterior[indice] - luz);
                        if (movimiento <= 12) continue;
                        const parche = this.extraerParche(grises, x, y);
                        if (parche.contraste >= 6 && parche.detalle >= 1) candidatos.push({ x, y, parche, puntuacion: parche.detalle * movimiento });
                    }
                }
            }
            // La diferencia temporal es máxima en siluetas sobre fondo con textura y en fondo descubierto: adquirir sólo
            // un parche que reaparece desplazado en la imagen anterior, para no quedar anclado al fondo inmóvil.
            const mejor = candidatos.sort((a, b) => b.puntuacion - a.puntuacion).slice(0, 4).find(candidato => {
                const origen = this.seguirPunto(anterior, candidato.parche, candidato);
                return origen && origen.error <= 0.15 && Math.hypot(origen.x - candidato.x, origen.y - candidato.y) >= 1;
            });
            anterior.set(grises);
            if (!mejor) { this.dibujarHUD(t('cinetico.buscandoTextura'), 0); return; }
            this.plantilla = mejor.parche;
            this.puntoActual = { x: mejor.x, y: mejor.y };
            this.muestraGesto = null;
            this.puntoSuave = { ...this.puntoBase };
            this.fuenteControl = 'zona libre';
        }
        const plantilla = this.plantilla, inferencia = this.deteccion?.tiempo ?? tiempo;
        // Predicción por velocidad (en memoria, sólo con seguimiento continuo): un movimiento rápido no sale de la
        // búsqueda de ±12 px; limitarla a 12 px mantiene dentro de la ventana el punto anterior si la textura se detiene.
        const avance = eje => plantilla.velocidad ? Math.max(-12, Math.min(12, plantilla.velocidad[eje] * (inferencia - plantilla.ultima))) : 0;
        const punto = this.seguirPunto(grises, plantilla, { x: this.puntoActual.x + avance('x'), y: this.puntoActual.y + avance('y') });
        if (!punto) {
            plantilla.velocidad = null; plantilla.ultima = null; // Sin extrapolar puntos perdidos.
            this.perdidaDesde ??= tiempo;
            this.fiableDesde = null; this.muestraGesto = null; this.puntoGesto = null;
            this.ultimoMovimiento = null; this.puntoSuave = { ...this.puntoBase };
            if (tiempo - this.perdidaDesde >= 1200) {
                this.plantilla = null; this.grisesAnteriores = null;
            }
            this.cancelarFijacion(true);
            this.actualizarHover(null);
            this.dibujarHUD(t('cinetico.texturaNoVisible'), 0);
            return;
        }
        this.perdidaDesde = null;
        if (plantilla.ultima != null && inferencia > plantilla.ultima) plantilla.velocidad = { x: (punto.x - this.puntoActual.x) / (inferencia - plantilla.ultima),
            y: (punto.y - this.puntoActual.y) / (inferencia - plantilla.ultima) };
        plantilla.ultima = inferencia;
        this.puntoActual = { x: punto.x, y: punto.y };
        // Actualizar textura lentamente permite pequeñas rotaciones e iluminación variable. Un giro reemplaza la plantilla
        // (el giro se acumula una vez); una coincidencia dudosa (desenfoque) no la contamina ni la hace derivar.
        const nueva = this.extraerParche(grises, punto.x, punto.y);
        if (punto.angulo) plantilla.valores = nueva.valores;
        else if (punto.error <= 0.15) plantilla.valores = plantilla.valores.map((valor, indice) => valor * 0.95 + nueva.valores[indice] * 0.05);
        this.neutroListo = true;
        this.puntoGesto = this.controlarGesto(this.puntoActual, inferencia, punto.angulo);
        this.fiableDesde ??= tiempo;
    }

    programarFotograma() {
        if (!this.activa) return;
        this.animationId = requestAnimationFrame(this.bucleRender);
    }

    leerGrises() {
        if (this.grisesRecibidos) return this.grises;
        const datos = this.ctx.getImageData(0, 0, this.ancho, this.alto).data;
        for (let indice = 0; indice < this.grises.length; indice++) {
            const pixel = indice * 4;
            this.grises[indice] = datos[pixel] * 0.299 + datos[pixel + 1] * 0.587 + datos[pixel + 2] * 0.114;
        }
        return this.grises;
    }

    extraerParche(grises, x, y) {
        const valores = [];
        for (let fila = -this.radioPlantilla; fila <= this.radioPlantilla; fila += 2) {
            for (let columna = -this.radioPlantilla; columna <= this.radioPlantilla; columna += 2) {
                valores.push(grises[(y + fila) * this.ancho + x + columna]);
            }
        }
        const media = valores.reduce((suma, valor) => suma + valor, 0) / valores.length;
        const centrados = valores.map(valor => valor - media);
        const contraste = Math.sqrt(centrados.reduce((suma, valor) => suma + valor * valor, 0) / valores.length);
        let horizontal = 0, vertical = 0, cruzado = 0;
        for (let fila = -this.radioPlantilla; fila <= this.radioPlantilla; fila += 2) {
            for (let columna = -this.radioPlantilla; columna <= this.radioPlantilla; columna += 2) {
                const indice = (y + fila) * this.ancho + x + columna;
                const dx = (grises[indice + 1] - grises[indice - 1]) / 2;
                const dy = (grises[indice + this.ancho] - grises[indice - this.ancho]) / 2;
                horizontal += dx * dx; vertical += dy * dy; cruzado += dx * dy;
            }
        }
        const detalle = Math.sqrt(Math.max(0, (horizontal + vertical - Math.hypot(horizontal - vertical, 2 * cruzado)) / (2 * valores.length)));
        return { valores: centrados.map(valor => valor / (contraste || 1)), contraste, detalle };
    }

    calibrar(punto = this.puntoActual) {
        if (!this.activa) return false;
        if (!Number.isFinite(punto.x) || !Number.isFinite(punto.y)) return false;
        this.origenControl = this.modoControl === 'cabeza' ? { x: punto.x, y: punto.y } : { ...this.puntoBase };
        this.puntoSuave = { ...this.puntoBase };
        this.plantilla = null;
        this.neutroListo = this.modoControl !== 'cabeza';
        this.muestraGesto = null; this.puntoGesto = null;
        this.grisesAnteriores = null;
        this.fiableDesde = null;
        this.muestrasPostura = [];
        this.ultimaPostura = null;
        this.reposoBorde = null;
        this.perdidaDesde = null;
        this.historialMovimiento = [];
        this.ultimoMovimiento = null;
        this.menu?.remove();
        this.cancelarFijacion(true);
        return true;
    }

    aprenderPostura(punto, tiempo) {
        if (this.modoControl !== 'cabeza') return false;
        if (tiempo === this.ultimaPostura) return false; // Una inferencia repetida no prueba estabilidad.
        if (this.ultimaPostura != null && tiempo - this.ultimaPostura > 500) this.muestrasPostura = [];
        this.ultimaPostura = tiempo;
        this.muestrasPostura.push({ x: punto.x, y: punto.y, tiempo });
        this.muestrasPostura = this.muestrasPostura.filter(muestra => tiempo - muestra.tiempo <= 1200);
        const muestras = this.muestrasPostura;
        if (muestras.length < 4 || tiempo - muestras[0].tiempo < 900) return false;
        const mediana = (lista, eje) => lista.map(muestra => muestra[eje]).sort((a, b) => a - b)[Math.floor(lista.length / 2)];
        const referencia = { x: mediana(muestras, 'x'), y: mediana(muestras, 'y') };
        const tercio = Math.max(1, Math.floor(muestras.length / 3));
        const deriva = Math.hypot((mediana(muestras.slice(0, tercio), 'x') - mediana(muestras.slice(-tercio), 'x')) / this.ancho,
            (mediana(muestras.slice(0, tercio), 'y') - mediana(muestras.slice(-tercio), 'y')) / this.alto);
        const distancias = muestras.map(muestra => Math.hypot((muestra.x - referencia.x) / this.ancho,
            (muestra.y - referencia.y) / this.alto)).sort((a, b) => a - b);
        // Mediana y percentil toleran temblores/puntos aislados sin aprender un movimiento en curso.
        if (deriva > 0.012 || distancias[Math.floor(distancias.length * 0.8)] > (this.zonaMuerta > 0.05 ? 0.045 : 0.025)) return false;
        this.origenControl = referencia;
        this.puntoSuave = { ...this.puntoBase };
        this.neutroListo = true;
        this.muestrasPostura = [];
        this.cancelarFijacion(true);
        try { chrome.runtime.sendMessage({ accion: 'hablar', texto: t('cinetico.listo'), lang: this.langTTS }, () => { void chrome.runtime.lastError; }); } catch (_) {}
        return true;
    }

    cambiarReferencia(punto) {
        const dx = punto.x - this.puntoActual.x, dy = punto.y - this.puntoActual.y;
        this.origenControl.x += dx; this.origenControl.y += dy;
        this.historialMovimiento = this.historialMovimiento.map(muestra => ({ x: muestra.x + dx, y: muestra.y + dy }));
        this.puntoActual = { x: punto.x, y: punto.y };
        this.cancelarFijacion(true);
    }

    seguirPunto(grises, plantilla = this.plantilla, centro = this.puntoActual) {
        // Zona libre: seguir una textura visible, sin asumir anatomía ni exigir manos.
        // shortcut: textura local sin clasificar anatomía, una oclusión larga exige nueva adquisición.
        const radio = 12, lado = radio * 2 + 1;
        const centroX = Math.round(centro.x), centroY = Math.round(centro.y);
        let mejor = { error: Infinity, x: centroX, y: centroY };
        const rejilla = new Float32Array(lado * lado).fill(Infinity); // Error de cada traslación, sin objetos por posición.
        const margen = this.radioPlantilla + 1;
        const muestras = plantilla.valores, cantidad = muestras.length;
        let energia = 0, sumaPlantilla = 0;
        for (const valor of muestras) { energia += valor * valor; sumaPlantilla += valor; }
        // Desplazamientos precalculados por ángulo y una sola pasada por posición: antes ~3 ms por imagen
        // (redondeos y trigonometría por muestra), ahora una fracción de milisegundo.
        const tablas = new Map();
        const tabla = angulo => {
            if (tablas.has(angulo)) return tablas.get(angulo);
            const coseno = Math.cos(angulo), seno = Math.sin(angulo), lista = new Int32Array(cantidad);
            let indice = 0, minX = 0, maxX = 0, minY = 0, maxY = 0;
            for (let fila = -this.radioPlantilla; fila <= this.radioPlantilla; fila += 2) {
                for (let columna = -this.radioPlantilla; columna <= this.radioPlantilla; columna += 2) {
                    const dx = Math.round(columna * coseno - fila * seno), dy = Math.round(columna * seno + fila * coseno);
                    lista[indice++] = dy * this.ancho + dx;
                    minX = Math.min(minX, dx); maxX = Math.max(maxX, dx); minY = Math.min(minY, dy); maxY = Math.max(maxY, dy);
                }
            }
            const resultado = { lista, minX, maxX, minY, maxY };
            tablas.set(angulo, resultado);
            return resultado;
        };
        const medir = (x, y, angulo = 0) => {
            const { lista, minX, maxX, minY, maxY } = tabla(angulo);
            if (x < margen || y < margen || x >= this.ancho - margen || y >= this.alto - margen ||
                x + minX < 0 || x + maxX >= this.ancho || y + minY < 0 || y + maxY >= this.alto) return;
            let suma = 0, cuadrados = 0, producto = 0;
            const base = y * this.ancho + x;
            for (let indice = 0; indice < cantidad; indice++) {
                const valor = grises[base + lista[indice]];
                suma += valor; cuadrados += valor * valor; producto += valor * muestras[indice];
            }
            const media = suma / cantidad;
            if (cuadrados / cantidad - media * media < 36) return;
            const correlacion = producto - media * sumaPlantilla;
            const error = 1 - correlacion / Math.sqrt(energia * (cuadrados - cantidad * media * media));
            if (!angulo) rejilla[(y - centroY + radio) * lado + x - centroX + radio] = error;
            if (error < mejor.error) mejor = { error, x, y, angulo };
        };
        for (let y = centroY - radio; y <= centroY + radio; y++) {
            for (let x = centroX - radio; x <= centroX + radio; x++) medir(x, y);
        }
        const traslacion = mejor;
        if (traslacion.error <= 0.4) {
            for (const angulo of [-0.24, -0.12, 0.12, 0.24]) {
                for (let y = traslacion.y - 2; y <= traslacion.y + 2; y++) {
                    for (let x = traslacion.x - 2; x <= traslacion.x + 2; x++) medir(x, y, angulo);
                }
            }
            if (traslacion.error - mejor.error < 0.02) mejor = traslacion;
        }
        // Ambiguo sólo si hay otro mínimo local separado (textura repetida o borde sin detalle). La cuenca ancha de una
        // textura suave o desenfocada desciende hacia el mejor punto y no es ambigua: antes cortaba el seguimiento.
        const limite = mejor.error * 1.15 + 0.005;
        let ambiguo = false;
        for (let fila = 0; fila < lado && !ambiguo; fila++) {
            for (let columna = 0; columna < lado && !ambiguo; columna++) {
                const error = rejilla[fila * lado + columna];
                if (!(error <= limite) || Math.hypot(centroX - radio + columna - mejor.x, centroY - radio + fila - mejor.y) <= 3) continue;
                ambiguo = true;
                for (let dy = -1; dy <= 1 && ambiguo; dy++) for (let dx = -1; dx <= 1 && ambiguo; dx++) {
                    const vecina = rejilla[(fila + dy) * lado + columna + dx];
                    if (fila + dy >= 0 && fila + dy < lado && columna + dx >= 0 && columna + dx < lado && vecina < error) ambiguo = false;
                }
            }
        }
        // Correlación >=0,75 sigue una textura desenfocada; la plantilla sólo se actualiza con coincidencias >=0,85.
        return mejor.error <= 0.25 && !ambiguo ? mejor : null;
    }

    filtrarMovimiento(punto, tiempo) {
        if (tiempo !== this.ultimoMovimiento) {
            if (this.ultimoMovimiento == null || tiempo - this.ultimoMovimiento > 500) {
                const centro = this.modoControl === 'cabeza' ? this.origenControl : this.puntoBase;
                this.historialMovimiento = [{ ...centro }, { ...centro }];
            }
            this.ultimoMovimiento = tiempo;
            this.historialMovimiento.push(punto);
            this.historialMovimiento = this.historialMovimiento.slice(-3);
            // Tres inferencias reales eliminan un salto aislado antes de armar/mover el cursor.
            this.puntoFiltrado = {
                x: this.historialMovimiento.map(muestra => muestra.x).sort((a, b) => a - b)[1],
                y: this.historialMovimiento.map(muestra => muestra.y).sort((a, b) => a - b)[1]
            };
        }
        return this.puntoFiltrado;
    }

    cancelarFijacion(desarmar = false) {
        this.inicioFijacion = null;
        this.objetivoFijado = null;
        if (desarmar) { this.armado = false; this.inicioArmado = null; this.enZonaSegura = false; this.gestoClic = null; }
    }

    normalizarControl(punto) {
        // Centro fijo. Igual fracción de imagen produce la misma respuesta en ambos ejes.
        const origen = this.modoControl === 'cabeza' ? this.origenControl : this.puntoBase;
        return { x: this.puntoBase.x + (punto.x - origen.x) / this.amplitudControl,
            y: this.puntoBase.y + (punto.y - origen.y) * this.ancho / this.alto / this.amplitudControl };
    }

    actualizarControl(punto, tiempo, intervalo) {
        punto = this.normalizarControl(punto);
        const distanciaCruda = Math.hypot(punto.x - this.puntoBase.x, punto.y - this.puntoBase.y) / this.ancho;
        const constante = distanciaCruda > this.zonaAtraccion + 0.025 ? 85 : 180;
        const suavizado = 1 - Math.exp(-intervalo / constante);
        if (this.modoControl !== 'cabeza' && distanciaCruda <= this.zonaMuerta) this.puntoSuave = { ...this.puntoBase };
        else {
            this.puntoSuave.x += (punto.x - this.puntoSuave.x) * suavizado;
            this.puntoSuave.y += (punto.y - this.puntoSuave.y) * suavizado;
        }
        const dx = (this.puntoSuave.x - this.puntoBase.x) / this.ancho;
        const dy = (this.puntoSuave.y - this.puntoBase.y) / this.ancho;
        const distancia = Math.hypot(dx, dy);
        // Histéresis corta para no reiniciar la fijación por un temblor de un píxel.
        const radioSeguro = this.zonaMuerta + (this.enZonaSegura ? 0.008 : 0);
        this.enZonaSegura = distancia <= radioSeguro && distanciaCruda <= radioSeguro + 0.025;
        if (this.enZonaSegura) {
            this.reposoBorde = null;
            this.inicioArmado = null;
            this.atraerCursor(intervalo);
            const objetivo = this.elementoBajoCursor();
            if (!this.armado || !objetivo) { this.cancelarFijacion(); return { progreso: 0, estado: t('cinetico.seguroMueve') }; }
            if (objetivo !== this.objetivoFijado) { this.objetivoFijado = objetivo; this.inicioFijacion = tiempo; }
            const progreso = Math.min(1, (tiempo - this.inicioFijacion) / this.duracionClick);
            if (progreso >= 1) {
                const tipo = this.tipoClick;
                this.tipoClick = 'izquierdo';
                this.cancelarFijacion(true);
                this.hacerClick(tipo, objetivo);
            }
            return { progreso, estado: t('cinetico.seguroProgreso', { tipo: t(this.tipoClick === 'derecho' ? 'cinetico.derecho' : 'cinetico.clic'), porcentaje: Math.round(progreso * 100) }) };
        }
        this.cancelarFijacion();
        if (distanciaCruda > this.zonaAtraccion && distancia > this.zonaAtraccion) {
            this.inicioArmado ??= tiempo;
            if (tiempo - this.inicioArmado >= 180) this.armado = true;
        } else this.inicioArmado = null;
        const avance = Math.max(0, distancia - this.zonaMuerta);
        // La atracción reduce gradualmente la velocidad al acercarse, sin fingir una postura neutra.
        const velocidad = distancia <= this.zonaAtraccion ? 80 * Math.pow(avance / (this.zonaAtraccion - this.zonaMuerta), 2) :
            Math.min(this.velocidadMaxima, 80 + Math.pow((distancia - this.zonaAtraccion) * 10, 1.35) * 420);
        const paso = Math.min(this.velocidadMaxima, velocidad * this.sensibilidad) * intervalo / 1000;
        const anterior = { x: this.posX, y: this.posY };
        if (distancia > 0) {
            this.posX = Math.max(1, Math.min(window.innerWidth - 1, this.posX + dx / distancia * paso));
            this.posY = Math.max(1, Math.min(window.innerHeight - 1, this.posY + dy / distancia * paso));
        }
        if (velocidad * this.sensibilidad <= 180) this.atraerCursor(intervalo);
        // Una dirección mantenida mueve normalmente. Sólo recuperar postura si ya no
        // queda pantalla y la persona descansa allí; nunca centrar durante navegación.
        const enBorde = this.posX === 1 || this.posX === window.innerWidth - 1 || this.posY === 1 || this.posY === window.innerHeight - 1;
        const detenido = Math.hypot(this.posX - anterior.x, this.posY - anterior.y) < 0.01;
        if (this.modoControl === 'cabeza' && enBorde && detenido && distancia > this.zonaAtraccion) {
            const reposo = this.reposoBorde;
            const tolerancia = this.zonaMuerta > 0.05 ? 0.045 : 0.025;
            if (!reposo || Math.hypot((punto.x - reposo.x) / this.ancho, (punto.y - reposo.y) / this.ancho) > tolerancia) {
                this.reposoBorde = { ...punto, tiempo };
            } else if (tiempo - reposo.tiempo >= 1200) {
                this.calibrar();
                return { progreso: 0, estado: t('cinetico.recuperando') };
            }
        } else this.reposoBorde = null;
        return { progreso: 0, estado: t(distancia <= this.zonaAtraccion ? 'cinetico.atraccion' : 'cinetico.moviendo') };
    }

    elementoBajoCursor(x = this.posX, y = this.posY) {
        let elemento = document.elementFromPoint(x, y);
        // Acceder a shadow roots abiertos. Los iframes ajenos siguen siendo otro documento.
        while (elemento?.shadowRoot?.elementFromPoint) {
            const interno = elemento.shadowRoot.elementFromPoint(x, y);
            if (!interno || interno === elemento) break;
            elemento = interno;
        }
        return elemento?.closest('button, a, input, textarea, select, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [contenteditable="true"]') || elemento;
    }

    atraerCursor(intervalo) {
        const selector = 'button, a[href], input, textarea, select, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [contenteditable="true"]';
        // Sondeo local acotado: no recorrer todos los controles de una página por imagen.
        let mejor = null;
        for (const [dx, dy] of [[0, 0], [-28, 0], [28, 0], [0, -28], [0, 28], [-20, -20], [20, -20], [-20, 20], [20, 20]]) {
            const objetivo = this.elementoBajoCursor(this.posX + dx, this.posY + dy);
            if (!objetivo?.matches?.(selector) || objetivo.matches(':disabled') || objetivo.closest('[inert], [aria-disabled="true"]')) continue;
            for (const rectangulo of objetivo.getClientRects()) {
                if (rectangulo.width <= 0 || rectangulo.height <= 0) continue;
                const margen = Math.min(4, rectangulo.width / 2, rectangulo.height / 2);
                const x = Math.max(rectangulo.left + margen, Math.min(rectangulo.right - margen, this.posX));
                const y = Math.max(rectangulo.top + margen, Math.min(rectangulo.bottom - margen, this.posY));
                const distancia = Math.hypot(x - this.posX, y - this.posY);
                if (distancia > 28 || this.elementoBajoCursor(x, y) !== objetivo) continue;
                if (!mejor || distancia < mejor.distancia) mejor = { x, y, distancia };
            }
            if (dx === 0 && dy === 0 && mejor) break;
        }
        if (!mejor || mejor.distancia === 0) return;
        const avance = Math.min(1, 180 * intervalo / 1000 / mejor.distancia);
        this.posX += (mejor.x - this.posX) * avance;
        this.posY += (mejor.y - this.posY) * avance;
    }

    actualizarHover(elemento) {
        const anterior = this.elementoHover;
        this.elementoHover = elemento;
        const opciones = { bubbles: true, composed: true, clientX: this.posX, clientY: this.posY };
        if (elemento !== anterior) {
            anterior?.dispatchEvent(new MouseEvent('mouseout', { ...opciones, relatedTarget: elemento }));
            elemento?.dispatchEvent(new MouseEvent('mouseover', { ...opciones, relatedTarget: anterior }));
        }
        elemento?.dispatchEvent(new MouseEvent('mousemove', opciones));
    }

    hacerClick(tipo, objetivo = this.elementoBajoCursor()) {
        if (!objetivo || objetivo.disabled || objetivo.getAttribute('aria-disabled') === 'true') return;
        const opciones = { bubbles: true, cancelable: true, composed: true, view: window,
            clientX: this.posX, clientY: this.posY, button: tipo === 'derecho' ? 2 : 0 };
        const presionar = () => {
            if (window.PointerEvent) objetivo.dispatchEvent(new PointerEvent('pointerdown', {
                ...opciones, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: tipo === 'derecho' ? 2 : 1
            }));
            objetivo.dispatchEvent(new MouseEvent('mousedown', { ...opciones, buttons: tipo === 'derecho' ? 2 : 1 }));
            if (window.PointerEvent) objetivo.dispatchEvent(new PointerEvent('pointerup', {
                ...opciones, pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0
            }));
            objetivo.dispatchEvent(new MouseEvent('mouseup', opciones));
        };
        if (tipo === 'derecho') {
            // Un evento sintético no abre el menú nativo de Chrome. Respetar primero el menú del sitio.
            presionar();
            const sinMenuPropio = objetivo.dispatchEvent(new MouseEvent('contextmenu', opciones));
            if (sinMenuPropio) this.abrirMenuContextual(objetivo);
        } else {
            this.menu?.remove();
            objetivo.focus?.({ preventScroll: true });
            presionar();
            objetivo.dispatchEvent(new MouseEvent('click', opciones));
        }
    }

    abrirMenuContextual(objetivo) {
        this.menu?.remove();
        const menu = document.createElement('div');
        this.menu = menu;
        menu.id = 'adapta-pe-menu-contextual';
        menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', t('cinetico.menu'));
        menu.style.cssText = `position:fixed;left:${Math.max(0, Math.min(this.posX, window.innerWidth - 230))}px;top:${Math.max(0, Math.min(this.posY, window.innerHeight - 240))}px;max-width:220px;max-height:90vh;overflow:auto;background:#222;color:white;border:2px solid white;border-radius:10px;padding:6px;z-index:2147483646;box-shadow:0 6px 20px #0008;`;
        const abrir = (url, destino) => {
            try { chrome.runtime.sendMessage({ accion: 'abrir_url', url, destino }, () => { void chrome.runtime.lastError; }); } catch (_) {}
        };
        const opciones = [];
        const enlace = objetivo.closest('a[href]');
        if (enlace && /^https?:/.test(enlace.href)) {
            opciones.push([t('cinetico.menu.enlacePestana'), () => abrir(enlace.href, 'pestana')], [t('cinetico.menu.enlaceVentana'), () => abrir(enlace.href, 'ventana')]);
        }
        const imagen = objetivo.tagName === 'IMG' ? objetivo : objetivo.querySelector('img');
        if (imagen && /^https?:/.test(imagen.currentSrc || imagen.src)) opciones.push([t('cinetico.menu.imagen'), () => abrir(imagen.currentSrc || imagen.src, 'pestana')]);
        opciones.push([t('cinetico.menu.atras'), () => history.back()], [t('cinetico.menu.recargar'), () => location.reload()], [t('cinetico.menu.cerrar'), () => {}]);
        for (const [texto, accion] of opciones) {
            const boton = document.createElement('button');
            boton.type = 'button'; boton.textContent = texto; boton.setAttribute('role', 'menuitem');
            boton.style.cssText = 'display:block;width:100%;text-align:left;font:14px sans-serif;padding:9px;background:#222;color:white;border:0;cursor:pointer;';
            boton.addEventListener('click', () => { menu.remove(); accion(); });
            menu.appendChild(boton);
        }
        menu.addEventListener('keydown', evento => { if (evento.key === 'Escape') menu.remove(); });
        document.body.appendChild(menu);
        menu.querySelector('button')?.focus({ preventScroll: true });
    }

    ejecutarAccion(accion) {
        if (accion === 'activar' || accion === 'desactivar') {
            if (accion === 'activar') this.bloqueada = false;
            this.setEstado(accion === 'activar');
            chrome.storage.local.set({ ojos: accion === 'activar' }).catch(() => {});
            return true;
        }
        if (!this.activa) return false;
        if (accion === 'calibrar') {
            if (this.modoControl === 'cabeza') return this.calibrar();
            this.cancelarFijacion(true); return true;
        }
        if (accion.startsWith('control_')) {
            this.aplicarAjustes({ modo: accion.slice(8) });
            this.errorVision = null;
            this.guardarAjustes();
            return true;
        }
        if (accion === 'temblor' || accion === 'sin_temblor') {
            this.zonaMuerta = accion === 'temblor' ? 0.07 : 0.045;
            this.zonaAtraccion = this.zonaMuerta + 0.02;
            this.cancelarFijacion(true);
            this.guardarAjustes();
            return true;
        }
        if (accion === 'movimiento_reducido' || accion === 'movimiento_normal') {
            this.amplitudControl = accion === 'movimiento_reducido' ? 0.55 : 1;
            this.guardarAjustes();
            if (this.modoControl === 'cabeza') return this.calibrar();
            this.cancelarFijacion(true); return true;
        }
        if (accion === 'preparar_derecho') { this.tipoClick = 'derecho'; this.cancelarFijacion(true); }
        else if (accion === 'pausar' || accion === 'reanudar') {
            this.pausada = accion === 'pausar';
            if (!this.pausada && this.modoControl === 'cabeza') this.calibrar();
            this.muestraGesto = null; this.puntoGesto = null;
            if (this.modoControl !== 'cabeza') { this.ultimoMovimiento = null; this.puntoSuave = { ...this.puntoBase }; }
            this.cancelarFijacion(true);
        }
        else if (accion === 'lento' || accion === 'rapido') {
            this.sensibilidad = Math.max(0.3, Math.min(2, this.sensibilidad + (accion === 'lento' ? -0.2 : 0.2)));
            this.guardarAjustes();
        }
        else if (accion === 'cancelar') { this.menu?.remove(); this.tipoClick = 'izquierdo'; this.cancelarFijacion(true); }
        else if (accion === 'derecho' || accion === 'izquierdo') {
            if (this.pausada || !this.neutroListo || this.fiableDesde == null ||
                performance.now() - this.fiableDesde < 300 || performance.now() - this.ultimoTiempo > 200) return false;
            this.cancelarFijacion(true); this.hacerClick(accion); this.tipoClick = 'izquierdo';
        } else return false;
        return true;
    }

    dibujarCursor(progreso) {
        if (!this.punteroVirtual) return;
        this.posX = Math.max(1, Math.min(window.innerWidth - 1, this.posX));
        this.posY = Math.max(1, Math.min(window.innerHeight - 1, this.posY));
        this.punteroVirtual.style.left = this.posX + 'px';
        this.punteroVirtual.style.top = this.posY + 'px';
        this.punteroVirtual.style.transform = `translate(-50%,-50%) scale(${1 + progreso * 0.7})`;
        this.punteroVirtual.style.background = this.tipoClick === 'derecho' ? '#8e44ad' : progreso ? '#2ecc71' : 'rgba(227,6,19,.9)';
    }

    dibujarHUD(estado, progreso) {
        if (this.hud.textContent !== estado) this.hud.textContent = estado;
        this.burbuja.style.borderColor = this.enZonaSegura ? '#2ecc71' : '#e30613';
        const contexto = this.hudCtx;
        contexto.clearRect(0, 0, this.ancho, this.alto);
        if (this.modoControl === 'zona' && this.plantilla) {
            contexto.strokeStyle = '#00ffff';
            contexto.strokeRect(this.puntoActual.x - this.radioPlantilla, this.puntoActual.y - this.radioPlantilla, this.radioPlantilla * 2, this.radioPlantilla * 2);
        }
        const centro = this.modoControl === 'cabeza' ? this.origenControl : this.puntoBase;
        contexto.strokeStyle = '#ffffff88'; contexto.lineWidth = 1;
        contexto.beginPath();
        contexto.moveTo(centro.x - 10, centro.y); contexto.lineTo(centro.x + 10, centro.y);
        contexto.moveTo(centro.x, centro.y - 10); contexto.lineTo(centro.x, centro.y + 10);
        contexto.stroke();
        for (const [radio, color] of [[this.zonaAtraccion, '#ffa500'], [this.zonaMuerta, '#2ecc71']]) {
            contexto.strokeStyle = color; contexto.beginPath();
            contexto.ellipse(centro.x, centro.y, radio * this.ancho * this.amplitudControl, radio * this.alto * this.amplitudControl, 0, 0, Math.PI * 2); contexto.stroke();
        }
        contexto.fillStyle = this.fiableDesde == null ? '#999' : '#3498db';
        contexto.beginPath(); contexto.arc(this.puntoActual.x, this.puntoActual.y, 3, 0, Math.PI * 2); contexto.fill();
        if (this.puntoGesto) {
            contexto.strokeStyle = '#00ffff'; contexto.beginPath();
            contexto.moveTo(centro.x, centro.y); contexto.lineTo(this.puntoGesto.x, this.puntoGesto.y); contexto.stroke();
        }
        this.dibujarCursor(progreso);
    }

    bucleRender(tiempo) {
        if (!this.activa) return;
        try {
            this.solicitarModelo();
            // Una imagen central nueva por paso; no repetir inferencias para completar dwell.
            const imagen = this.numeroFotograma;
            if (this.deteccion && tiempo - this.deteccion.tiempo > 500) {
                this.perdidaDesde ??= tiempo; this.fiableDesde = null; this.muestraGesto = null; this.puntoGesto = null;
                if (this.modoControl !== 'cabeza') { this.ultimoMovimiento = null; this.puntoSuave = { ...this.puntoBase }; }
                this.cancelarFijacion(true); this.actualizarHover(null);
                this.dibujarHUD(t('cinetico.esperandoCamara'), 0); return;
            }
            if (!imagen || imagen === this.ultimoVideo ||
                (this.ultimoTiempo != null && tiempo - this.ultimoTiempo < 1000 / 30 - 1)) return;
            const salto = this.ultimoTiempo == null ? 0 : tiempo - this.ultimoTiempo;
            const intervalo = Math.min(this.modoControl === 'cabeza' ? 50 : 100, salto || 1000 / 30);
            if (salto > 200) {
                this.cancelarFijacion(true); this.fiableDesde = null;
                if (this.muestraGesto) this.muestraGesto.puno = null;
                if (salto > 500 || this.modoControl === 'cabeza') this.muestraGesto = null;
                if (this.modoControl !== 'cabeza') { this.ultimoMovimiento = null; this.puntoSuave = { ...this.puntoBase }; }
            }
            this.ultimoTiempo = tiempo;
            this.ultimoVideo = imagen;
            if (this.modoControl.startsWith('zona')) {
                this.controlarZona(tiempo);
            } else {
                let punto = this.deteccion && tiempo - this.deteccion.tiempo < 500 ? this.elegirPunto(this.deteccion) : null;
                if (!punto) {
                    this.perdidaDesde ??= tiempo;
                    this.fuenteCandidata = null; this.adquisicion = null;
                    if (tiempo - this.perdidaDesde >= 500) this.muestrasPostura = [];
                    this.reposoBorde = null;
                    this.fiableDesde = null;
                    if (this.muestraGesto) this.muestraGesto.puno = null;
                    if (tiempo - this.perdidaDesde > 500) this.muestraGesto = null;
                    this.puntoGesto = null;
                    if (this.modoControl !== 'cabeza') { this.ultimoMovimiento = null; this.puntoSuave = { ...this.puntoBase }; }
                    this.cancelarFijacion(true);
                    this.actualizarHover(null);
                    this.dibujarHUD(this.errorVision || t(this.deteccion ? 'cinetico.enEspera' : 'cinetico.esperandoInicio'), 0);
                    return;
                }
                if (this.modoControl === 'manos' && punto.fuente.startsWith('mano:') &&
                    (!this.fuenteControl || this.perdidaDesde != null && tiempo - this.perdidaDesde > 500)) {
                    // Una mano nueva controla tras >=3 inferencias y >=150 ms: un falso positivo fugaz no mueve el cursor.
                    const adquisicion = this.adquisicion ??= { inicio: tiempo, cuenta: 0 };
                    if (adquisicion.ultima !== this.deteccion.tiempo) { adquisicion.ultima = this.deteccion.tiempo; adquisicion.cuenta++; }
                    if (adquisicion.cuenta < 3 || tiempo - adquisicion.inicio < 150) {
                        this.cancelarFijacion(true); this.dibujarHUD(t('cinetico.confirmando'), 0); return;
                    }
                }
                this.adquisicion = null;
                if (this.fuenteControl && punto.fuente !== this.fuenteControl) {
                    if (this.fuenteCandidata !== punto.fuente) {
                        this.fuenteCandidata = punto.fuente;
                        this.inicioCandidata = tiempo;
                        this.ultimaCandidata = null;
                        this.confirmacionesCandidata = 0;
                        this.desfaseCandidata = { x: punto.x - this.puntoActual.x, y: punto.y - this.puntoActual.y };
                    }
                    if (this.ultimaCandidata !== this.deteccion.tiempo) {
                        this.ultimaCandidata = this.deteccion.tiempo;
                        this.confirmacionesCandidata++;
                    }
                    if (tiempo - this.inicioCandidata < (this.modoControl === 'automatico' ? 1200 : 150) || this.confirmacionesCandidata < 3) {
                        this.cancelarFijacion(true);
                        const anterior = this.modoControl === 'manos' ? this.elegirPunto({ ...this.deteccion, manos: [] }) : null;
                        if (!this.neutroListo || anterior?.fuente !== this.fuenteControl) {
                            this.fiableDesde = null;
                            this.dibujarHUD(t('cinetico.confirmando'), 0); return;
                        }
                        punto = anterior;
                    }
                } else this.fuenteCandidata = null;
                if (punto.fuente !== this.fuenteControl) {
                    if (this.modoControl === 'cabeza') {
                        if (this.neutroListo) this.cambiarReferencia({ x: this.puntoActual.x + this.desfaseCandidata.x,
                            y: this.puntoActual.y + this.desfaseCandidata.y });
                        else this.calibrar(punto);
                    } else {
                        this.neutroListo = true; this.muestraGesto = null;
                        this.ultimoMovimiento = null; this.puntoSuave = { ...this.puntoBase };
                        this.cancelarFijacion(true);
                    }
                    this.fuenteControl = punto.fuente;
                    this.fuenteCandidata = null;
                } else if (this.perdidaDesde != null && tiempo - this.perdidaDesde >= 1200) {
                    if (this.modoControl === 'cabeza') this.calibrar(punto);
                }
                if (this.modoControl === 'manos' && this.muestraGesto && Boolean(punto.respaldo) !== Boolean(this.respaldoMano)) {
                    // Muñeca de Pose y punto de la mano (o palma) difieren varios píxeles: cambiar de modelo no es un gesto.
                    this.muestraGesto.x += punto.x - this.puntoActual.x; this.muestraGesto.y += punto.y - this.puntoActual.y;
                }
                this.respaldoMano = Boolean(punto.respaldo);
                const separacion = Math.hypot(punto.x - this.puntoActual.x, punto.y - this.puntoActual.y);
                if (this.modoControl === 'manos' && this.perdidaDesde != null && separacion > this.ancho * 0.1) this.muestraGesto = null;
                else if (this.modoControl === 'manos' && separacion > this.ancho * 0.2) {
                    // Otra mano con la misma etiqueta o un salto del modelo: nuevo reposo, nunca un gesto ni un clic.
                    this.muestraGesto = null; this.ultimoMovimiento = null; this.puntoSuave = { ...this.puntoBase };
                    this.cancelarFijacion(true);
                }
                this.perdidaDesde = null;
                this.puntoActual = { x: punto.x, y: punto.y };
                this.estadoClic = punto.clic ?? null;
                if (!this.neutroListo) {
                    this.puntoSuave = { ...this.puntoBase };
                    if (!this.aprenderPostura(punto, this.deteccion.tiempo)) {
                        this.dibujarHUD(t('cinetico.calibrando'), 0); return;
                    }
                }
                this.fiableDesde ??= tiempo;
                if (this.modoControl === 'manos') {
                    this.puntoGesto = this.controlarGesto(this.puntoActual, this.deteccion.tiempo, 0, punto.gesto);
                } else this.puntoGesto = null;
            }
            if (!this.neutroListo || this.fiableDesde == null) return;
            if (this.pausada) {
                this.cancelarFijacion(true);
                this.dibujarHUD(t('cinetico.pausado'), 0);
                return;
            }
            if (tiempo - this.fiableDesde < 250) this.cancelarFijacion(true); // Estabilizar clic sin bloquear movimiento.
            const fuente = t('cinetico.fuente.' + (this.fuenteControl || 'zona').replace(/^mano:.*/, 'mano').replace(/^brazo_.*/, 'brazo').replace(' ', '_'));
            if (this.modoControl !== 'zona' && this.procesarGestoClic(this.estadoClic, this.deteccion.tiempo, tiempo)) {
                // Cursor quieto durante el gesto para que el clic no se desvíe del objetivo.
                this.cancelarFijacion();
                this.actualizarHover(this.elementoBajoCursor());
                const derecho = this.tipoClick === 'derecho';
                this.dibujarHUD(fuente + ' · ' + t(this.modoControl === 'manos' ? this.gestoClic.derecho ? 'cinetico.pinzaDerechoHecho' :
                    derecho ? 'cinetico.pinzaSueltaDerecho' : 'cinetico.pinzaSuelta' : derecho ? 'cinetico.bocaDerecho' : 'cinetico.boca'), 0);
                return;
            }
            const puntoControl = this.filtrarMovimiento(this.puntoGesto || this.puntoActual, this.deteccion.tiempo);
            const control = this.actualizarControl(puntoControl, tiempo, intervalo);
            this.actualizarHover(this.elementoBajoCursor());
            const entrada = this.muestraGesto?.puno?.activo ? 'cinetico.puno' : this.muestraGesto?.puno?.detectado && !this.muestraGesto.puno.abierta ?
                'cinetico.punoPreparar' : this.muestraGesto?.senalActiva ? 'cinetico.senal' : 'cinetico.joystick';
            this.dibujarHUD(fuente + (this.puntoGesto ? ' · ' + t(entrada) : '') + ' · ' + control.estado, control.progreso);
        } catch (_) {
            this.fiableDesde = null;
            this.muestraGesto = null; this.puntoGesto = null;
            if (this.modoControl !== 'cabeza') { this.ultimoMovimiento = null; this.puntoSuave = { ...this.puntoBase }; }
            this.cancelarFijacion(true);
            this.dibujarHUD(t('cinetico.esperandoImagen'), 0);
        } finally { this.programarFotograma(); }
    }
}
globalThis.KineticEngine = KineticEngine;
})();
