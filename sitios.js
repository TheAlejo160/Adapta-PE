(() => {
// Catálogo compartido por el asistente y el service worker. Coincidencias completas,
// nunca subcadenas: «x» no debe coincidir con Netflix ni con un texto dictado.
const SitiosVoz = {
    google: { alias: ['google'], inicio: 'https://www.google.com/', busqueda: 'https://www.google.com/search?q=' },
    youtube: { alias: ['youtube', 'you tube'], inicio: 'https://www.youtube.com/', busqueda: 'https://www.youtube.com/results?search_query=' },
    mercadolibre: { alias: ['mercado libre', 'mercadolibre'], inicio: 'https://www.mercadolibre.com.pe/', busqueda: 'https://listado.mercadolibre.com.pe/' },
    amazon: { alias: ['amazon'], inicio: 'https://www.amazon.com/', busqueda: 'https://www.amazon.com/s?k=' },
    wikipedia: { alias: ['wikipedia', 'wiki'], inicio: 'https://es.wikipedia.org/', busqueda: 'https://es.wikipedia.org/wiki/Especial:Buscar?search=' },
    facebook: { alias: ['facebook', 'face book', 'face', 'feis'], inicio: 'https://www.facebook.com/', busqueda: 'https://www.facebook.com/search/top/?q=' },
    instagram: { alias: ['instagram', 'insta'], inicio: 'https://www.instagram.com/' },
    x: { alias: ['x', 'twitter', 'equis', 'tuiter'], inicio: 'https://x.com/', busqueda: 'https://x.com/search?q=' },
    reddit: { alias: ['reddit'], inicio: 'https://www.reddit.com/', busqueda: 'https://www.reddit.com/search/?q=' },
    netflix: { alias: ['netflix'], inicio: 'https://www.netflix.com/', busqueda: 'https://www.netflix.com/search?q=' },
    twitch: { alias: ['twitch'], inicio: 'https://www.twitch.tv/', busqueda: 'https://www.twitch.tv/search?term=' },
    github: { alias: ['github', 'git hub'], inicio: 'https://github.com/', busqueda: 'https://github.com/search?q=' },
    chatgpt: { alias: ['chatgpt', 'chat gpt'], inicio: 'https://chatgpt.com/' },
    claude: { alias: ['claude'], inicio: 'https://claude.ai/' },
    gemini: { alias: ['gemini'], inicio: 'https://gemini.google.com/' },
    canvas: { alias: ['canvas'], inicio: 'https://canvas.instructure.com/' },
    gmail: { alias: ['gmail', 'g mail', 'correo de google'], inicio: 'https://mail.google.com/' },
    outlook: { alias: ['outlook', 'hotmail'], inicio: 'https://outlook.live.com/' },
    whatsapp: { alias: ['whatsapp', 'whats app', 'wasap', 'guasap', 'whatsapp web'], inicio: 'https://web.whatsapp.com/' },
    telegram: { alias: ['telegram'], inicio: 'https://web.telegram.org/' },
    drive: { alias: ['drive', 'google drive'], inicio: 'https://drive.google.com/' },
    documentos: { alias: ['google docs', 'documentos de google'], inicio: 'https://docs.google.com/' },
    mapas: { alias: ['mapas', 'maps', 'google maps'], inicio: 'https://www.google.com/maps/', busqueda: 'https://www.google.com/maps/search/?api=1&query=' },
    linkedin: { alias: ['linkedin', 'linked in'], inicio: 'https://www.linkedin.com/' },
    tiktok: { alias: ['tiktok', 'tik tok'], inicio: 'https://www.tiktok.com/' },
    spotify: { alias: ['spotify'], inicio: 'https://open.spotify.com/' },
    bing: { alias: ['bing'], inicio: 'https://www.bing.com/', busqueda: 'https://www.bing.com/search?q=' },
    duckduckgo: { alias: ['duckduckgo', 'duck duck go'], inicio: 'https://duckduckgo.com/', busqueda: 'https://duckduckgo.com/?q=' }
};

// Idiomas de voz. Las expresiones operan sobre texto normalizado (minúsculas, sin tildes) y
// reescriben sólo la intención al comando canónico en español: el parser sigue siendo único y
// `$n` copia el fragmento original (mayúsculas y acentos) del grupo n.
const IdiomasVoz = {
    es: {
        activacion: 'computadoras?|computador', palabra: 'Computadora', tts: 'es-ES',
        ayuda: 'Empieza con Computadora y di, por ejemplo: abre YouTube; busca gatos en YouTube; baja o sube; atrás; nueva pestaña; cierra la pestaña; pestaña 2; clic en Contacto; selecciona Inicio y dale clic; escribe y tu texto; silencia la pestaña; pantalla completa; cancelar.',
        // Muletillas y fórmulas de cortesía de Perú, España y Latinoamérica antes de la orden.
        envoltorios: /^(?:oye|oe|oiga|hey|ey|eh|ya pues|ya pe|ya|ok|okey|okay|vale|bueno|a ver|mira|este|ahora|ahorita|entonces|y|porfa|porfis|por favor|favor de|me haces el favor de|hazme el favor de|me harias el favor de|hagame el favor de|me hace el favor de|ayudame a|ayudeme a|me ayudas a|quiero que|necesito que|quisiera que|me puedes|me podrias|me puede|me podria|puedes|podrias|puede|podria|podes|quiero|quisiera|necesito|me gustaria|intenta|trata de|me|(?:vamos|voy) a(?= \S+(?:ar|er|ir)\b))[\s,]+/,
        finales: /[\s,]+(?:por favor|porfa|porfis|ya pe|ya pues|pe|pues)$/,
        // Primera palabra: usted, subjuntivo tras «quiero que», voseo, infinitivo, enclíticos.
        verbos: Object.fromEntries(Object.entries({
            abre: 'abra abras abri abrir abres abreme abrime abrame abrirme', busca: 'busque busques buscar buscas buscame busqueme buscarme',
            escribe: 'escriba escribas escribi escribir escribes escribeme escribime', dicta: 'dicte dictes dictar',
            cierra: 'cierre cierres cerra cerrar cierras cierrame cerrame', baja: 'baje bajes bajar bajas bajale',
            sube: 'suba subas subi subir subes subele', vuelve: 'vuelva vuelvas volve volver vuelves', regresa: 'regrese regreses regresar regresas',
            retrocede: 'retroceda retrocedas', avanza: 'avance avances avanzar avanzas', recarga: 'recargue recargues recargar recargas',
            actualiza: 'actualice actualices', refresca: 'refresque refresques', selecciona: 'seleccione selecciones seleccionar seleccionas seleccioname',
            resalta: 'resalte resaltes resaltar', pulsa: 'pulse pulses pulsar pulsas toca toque toques tocar clickea cliquea clica clickear cliquear clique',
            presiona: 'presione presiones presionar presionas aprieta apriete aprietes apreta apretar aplasta aplaste aplastes aplastar',
            enfoca: 'enfoque enfoques enfocar', reproduce: 'reproduzca reproduzcas reproducir', pausa: 'pause pauses', haz: 'haga hagas hace hacer haces',
            hazle: 'hagale hacele', dale: 'dele', cancela: 'cancele canceles', borra: 'borre borres borrar borras', limpia: 'limpie limpies limpiar',
            acerca: 'acerque', aleja: 'aleje', amplia: 'amplie ampliar', agranda: 'agrande agrandar', achica: 'achique achicar', aumenta: 'aumente',
            reduce: 'reduzca', ve: 'vaya vayas anda', entra: 'entre entres entrar', ingresa: 'ingrese', visita: 'visite', inicia: 'inicie', ejecuta: 'ejecute',
            duplica: 'duplique dupliques duplicar', silencia: 'silencie silencies silenciar mutea mutee mutees mutear', calla: 'callate callese',
            activa: 'active actives', desactiva: 'desactive', apaga: 'apague apagues apagar', enciende: 'encienda', prende: 'prenda',
            quita: 'quite quites quitar', cambia: 'cambie cambies cambiar', pasa: 'pase pases pasar', googlea: 'googlee', envia: 'envie envies', manda: 'mande mandes'
        }).flatMap(([canonico, formas]) => formas.split(' ').map(forma => [forma, canonico]))),
        // El worker y el controlador comparan estas órdenes exactas (cursor y selección).
        frases: [
            [/^(?:activa|enciende|prende|activar)(?: el| la)? (?:cursor|mouse(?: cinetico)?|raton|camara)$/, 'activar cursor'],
            [/^(?:desactiva|apaga|desactivar)(?: el| la)? (?:cursor|mouse(?: cinetico)?|raton|camara)$/, 'desactivar cursor'],
            [/^(?:calibra|centra)(?: el)? cursor$/, 'calibrar cursor'],
            [/^(?:pausa|deten|para)(?: el)? cursor$/, 'pausar cursor'],
            [/^(?:reanuda|sigue)(?: con)?(?: el)? cursor$/, 'reanudar cursor'],
            [/^(?:(?:da|dale|haz|hazle) )?cli(?:c|ck) derecho$/, 'clic derecho'],
            [/^(?:(?:abre|muestra|inicia|empieza)(?: el)? )?tutorial$/, 'tutorial']
        ]
    },
    en: {
        activacion: 'computers?', palabra: 'Computer', tts: 'en-US',
        ayuda: 'Start with Computer and say, for example: open YouTube; search cats on YouTube; scroll down or up; go back; new tab; close tab; tab 2; click Contact; select Home, then click selection; write followed by your text; mute tab; full screen; cancel.',
        envoltorios: /^(?:please|hey|hi|ok|okay|so|now|can you|could you|would you|will you|i want you to|i want to|i'd like to|i would like to|go ahead and|let's)[\s,]+/,
        finales: /[\s,]+(?:please|thanks|thank you)$/,
        conector: '(?:on|in|at)(?: the)?', pestanaNueva: /\s(?:in|on) (?:a )?new tab$/, ventanaNueva: /\s(?:in|on) (?:a )?new window$/,
        frases: [
            [/^(?:(?:activate|enable|turn on) (?:the )?(?:cursor|camera cursor|kinetic mouse))$/, 'activar cursor'],
            [/^(?:(?:disable|deactivate|turn off) (?:the )?(?:cursor|camera cursor|kinetic mouse))$/, 'desactivar cursor'],
            [/^(?:pause (?:the )?cursor)$/, 'pausar cursor'],
            [/^(?:resume (?:the )?cursor)$/, 'reanudar cursor'],
            [/^(?:(?:calibrate|recalibrate|center) (?:the )?cursor)$/, 'calibrar cursor'],
            [/^(?:(?:head|face) control|control (?:head|face))$/, 'control cabeza'],
            [/^(?:(?:hand|hands|arm|arms) control|control (?:hands|arms))$/, 'control manos'],
            [/^(?:(?:residual limb|partial hand|stump) control|control (?:residual limb|partial hand|stump))$/, 'control munon'],
            [/^(?:(?:small|reduced) movements)$/, 'movimientos pequenos'],
            [/^(?:normal movements)$/, 'movimientos normales'],
            [/^(?:(?:enable|activate) (?:the )?tremor filter)$/, 'activar temblor'],
            [/^(?:(?:disable|deactivate) (?:the )?tremor filter)$/, 'desactivar temblor'],
            [/^(?:(?:slower cursor|cursor slower))$/, 'cursor mas lento'],
            [/^(?:(?:faster cursor|cursor faster))$/, 'cursor mas rapido'],
            [/^(?:next right click)$/, 'siguiente clic derecho'],
            [/^(?:cancel (?:the )?click)$/, 'cancelar clic'],
            [/^(?:(?:hide|remove) (?:the )?pet)$/, 'oculta mascota'],
            [/^(?:(?:greet|wave to) (?:the )?pet)$/, 'saluda mascota'],
            [/^(?:(?:sleep pet|put (?:the )?pet to sleep))$/, 'duerme mascota'],
            [/^(?:(?:wake (?:up )?(?:the )?pet|wake (?:the )?pet up))$/, 'despierta mascota'],
            [/^(?:pet|(?:choose|select|change to)(?: the)? pet) /, 'mascota '],
            [/^(?:help|what can i say|what can you do|(?:show )?commands)$/, 'ayuda'],
            [/^(?:(?:open|show|start) (?:the )?)?tutorial$/, 'tutorial'],
            [/^(?:cancel|never ?mind|forget it)$/, 'cancelar'],
            [/^(?:stop talking|stop reading|be quiet|shut up|silence|quiet)$/, 'calla'],
            [/^(?:(?:open|create) )?(?:a )?new tab$/, 'nueva pestaña'], [/^(?:(?:open|create) )?(?:a )?new window$/, 'nueva ventana'],
            [/^close (?:this |the |current )?tab$/, 'cierra la pestaña'], [/^close (?:this |the |current )?window$/, 'cierra la ventana'],
            [/^close (?:all )?(?:the )?other tabs$/, 'cierra las otras pestañas'], [/^duplicate (?:this |the )?tab$/, 'duplica la pestaña'],
            [/^mute(?: (?:this|the))?(?: tab)?$/, 'silencia la pestaña'], [/^unmute(?: (?:this|the))?(?: tab)?$/, 'activa el sonido'],
            [/^(?:(?:go|switch) to )?(?:the )?next tab$/, 'pestaña siguiente'], [/^(?:(?:go|switch) to )?(?:the )?previous tab$/, 'pestaña anterior'],
            [/^(?:(?:go|switch) to )?tab (?:number )?(\d+)$/, 'pestaña $1'], [/^(?:(?:go|switch) to )?(?:the )?last tab$/, 'última pestaña'],
            [/^(?:go )?back$|^previous page$/, 'atrás'], [/^(?:go )?forward$|^next page$/, 'adelante'],
            [/^(?:reload|refresh)(?: (?:the|this) page)?$/, 'recarga'],
            [/^(?:(?:scroll|go|move|page) )?down (?:a bit|a little)$/, 'baja un poco'], [/^(?:(?:scroll|go|move|page) )?down$/, 'baja'],
            [/^(?:(?:scroll|go|move|page) )?up (?:a bit|a little)$/, 'sube un poco'], [/^(?:(?:scroll|go|move|page) )?up$/, 'sube'],
            [/^(?:(?:scroll|go) )?(?:to (?:the )?)?top(?: of (?:the )?page)?$/, 've al inicio'], [/^(?:(?:scroll|go) )?(?:to (?:the )?)?bottom(?: of (?:the )?page)?$/, 've al final'],
            [/^(?:zoom in|bigger|larger)$/, 'aumenta zoom'], [/^(?:zoom out|smaller)$/, 'reduce zoom'], [/^(?:reset zoom|normal zoom|actual size)$/, 'zoom normal'],
            [/^(?:(?:enter|go) )?full ?screen$/, 'pantalla completa'], [/^(?:exit|leave) full ?screen$/, 'sal de pantalla completa'],
            [/^(?:press |hit )?enter$|^submit(?: (?:the )?form)?$/, 'enter'],
            [/^(?:click|left click|click it|click here)$/, 'clic'], [/^right click$/, 'clic derecho'],
            [/^(?:click|activate) (?:the )?selection$/, 'dale clic'],
            [/^(?:click|press|tap)(?: on)? /, 'clic en '], [/^(?:select|highlight) /, 'selecciona '],
            [/^(?:write|type|dictate) /, 'escribe '], [/^(?:clear|delete|erase) (?:the )?(?:text|field)$/, 'borra el texto'],
            [/^focus(?: on)? /, 'enfoca '],
            [/^(?:play|resume)(?: (?:the )?(?:video|audio|music))?$/, 'reproduce'], [/^pause(?: (?:the )?(?:video|audio|music))?$/, 'pausa'],
            [/^(?:search(?: for)?|look up|look for|find|google) /, 'busca '],
            [/^(?:open|launch|start|visit|go to|navigate to|take me to)(?: the)? /, 'abre ']
        ]
    },
    pt: {
        activacion: 'computador', palabra: 'Computador', tts: 'pt-BR',
        ayuda: 'Comece com Computador e diga, por exemplo: abre YouTube; pesquisa gatos no YouTube; desce ou sobe; volta; nova aba; fecha a aba; aba 2; clica em Contato; escreve e o seu texto; silencia a aba; tela cheia; cancela.',
        envoltorios: /^(?:por favor|ei|oi|ok|agora|entao|pode|podes|poderia|voce pode|consegue|quero que voce|quero|eu quero|gostaria de|me ajuda a)[\s,]+/,
        finales: /[\s,]+(?:por favor|obrigado|obrigada)$/,
        conector: '(?:em|no|na|pelo|pela)', pestanaNueva: /\s(?:em|numa) (?:uma )?nova (?:aba|guia)$/, ventanaNueva: /\s(?:em|numa) (?:uma )?nova janela$/,
        frases: [
            [/^(?:(?:ativa|ativar|liga) (?:o )?cursor)$/, 'activar cursor'],
            [/^(?:(?:desativa|desativar|desliga) (?:o )?cursor)$/, 'desactivar cursor'],
            [/^(?:pausa (?:o )?cursor)$/, 'pausar cursor'],
            [/^(?:(?:retoma|continua) (?:o )?cursor)$/, 'reanudar cursor'],
            [/^(?:(?:calibra|recalibra|centraliza) (?:o )?cursor)$/, 'calibrar cursor'],
            [/^(?:controle (?:de |com )?(?:cabeca|rosto|tronco))$/, 'control cabeza'],
            [/^(?:controle (?:de |com )?(?:maos|bracos))$/, 'control manos'],
            [/^(?:controle (?:de |com )?(?:coto|mao parcial))$/, 'control munon'],
            [/^(?:movimentos pequenos)$/, 'movimientos pequenos'],
            [/^(?:movimentos normais)$/, 'movimientos normales'],
            [/^(?:ativa (?:o )?filtro de tremor)$/, 'activar temblor'],
            [/^(?:desativa (?:o )?filtro de tremor)$/, 'desactivar temblor'],
            [/^(?:cursor mais lento)$/, 'cursor mas lento'],
            [/^(?:cursor mais rapido)$/, 'cursor mas rapido'],
            [/^(?:proximo clique direito)$/, 'siguiente clic derecho'],
            [/^(?:cancela (?:o )?clique)$/, 'cancelar clic'],
            [/^(?:(?:oculta|esconde|remove) (?:o )?mascote)$/, 'oculta mascota'],
            [/^(?:(?:cumprimenta|sauda|acena para) (?:o )?mascote)$/, 'saluda mascota'],
            [/^(?:(?:dorme mascote|coloca (?:o )?mascote para dormir))$/, 'duerme mascota'],
            [/^(?:acorda (?:o )?mascote)$/, 'despierta mascota'],
            [/^(?:(?:clica|clique) (?:na |a )?selecao)$/, 'dale clic'],
            [/^(?:mascote|(?:escolhe|escolha|seleciona)(?: o)? mascote) /, 'mascota '],
            [/^(?:ajuda|o que (?:eu )?posso dizer|comandos)$/, 'ayuda'],
            [/^(?:(?:abre|abrir|mostra|inicia) (?:o )?)?tutorial$/, 'tutorial'],
            [/^(?:cancela|cancelar|esquece|deixa pra la)$/, 'cancelar'],
            [/^(?:para de falar|para de ler|cala a boca|silencio|chega)$/, 'calla'],
            [/^(?:(?:abre|abrir|abra) )?(?:uma )?nova (?:aba|guia)$/, 'nueva pestaña'], [/^(?:(?:abre|abrir|abra) )?(?:uma )?nova janela$/, 'nueva ventana'],
            [/^(?:fecha|fechar|feche) (?:a |esta |essa )?(?:aba|guia)$/, 'cierra la pestaña'], [/^(?:fecha|fechar|feche) (?:a |esta |essa )?janela$/, 'cierra la ventana'],
            [/^(?:fecha|fechar|feche) (?:todas )?as outras (?:abas|guias)$/, 'cierra las otras pestañas'],
            [/^(?:duplica|duplicar|duplique) (?:a |esta )?(?:aba|guia)$/, 'duplica la pestaña'],
            [/^(?:silencia|silenciar|muta|mutar)(?: (?:a|esta) (?:aba|guia))?$/, 'silencia la pestaña'], [/^(?:ativa|reativa|liga) o som$|^desmuta(?:r)?$/, 'activa el sonido'],
            [/^(?:(?:vai|ir) para a )?(?:proxima (?:aba|guia)|(?:aba|guia) seguinte)$/, 'pestaña siguiente'], [/^(?:(?:vai|ir) para a )?(?:aba|guia) anterior$/, 'pestaña anterior'],
            [/^(?:(?:vai|ir) para a )?(?:aba|guia) (?:numero )?(\d+)$/, 'pestaña $1'], [/^(?:(?:vai|ir) para a )?ultima (?:aba|guia)$/, 'última pestaña'],
            [/^(?:volta|voltar|volte|pagina anterior)$/, 'atrás'], [/^(?:avanca|avancar|avance|proxima pagina)$/, 'adelante'],
            [/^(?:recarrega|recarregar|recarregue|atualiza|atualizar|atualize)(?: a pagina)?$/, 'recarga'],
            [/^(?:(?:rola|role|rolar|desce|descer|desca|vai) )?(?:para |pra )?baixo um pouco$|^(?:desce|descer|desca) um pouco$/, 'baja un poco'],
            [/^(?:(?:rola|role|rolar|desce|descer|desca|vai) )?(?:para |pra )?baixo$|^(?:desce|descer|desca)$/, 'baja'],
            [/^(?:(?:rola|role|rolar|sobe|subir|suba|vai) )?(?:para |pra )?cima um pouco$|^(?:sobe|subir|suba) um pouco$/, 'sube un poco'],
            [/^(?:(?:rola|role|rolar|sobe|subir|suba|vai) )?(?:para |pra )?cima$|^(?:sobe|subir|suba)$/, 'sube'],
            [/^(?:vai |ir )?(?:para o |pro )?(?:topo|inicio)(?: da pagina)?$/, 've al inicio'], [/^(?:vai |ir )?(?:para o |pro )?(?:final|fim)(?: da pagina)?$/, 've al final'],
            [/^(?:aumenta(?:r)? o zoom|mais zoom|amplia(?:r)?)$/, 'aumenta zoom'], [/^(?:diminui(?:r)? o zoom|menos zoom|reduz(?:ir)? o zoom)$/, 'reduce zoom'], [/^zoom normal$/, 'zoom normal'],
            [/^(?:tela cheia|ecra inteiro)$/, 'pantalla completa'], [/^(?:sai|sair) (?:da tela cheia|do ecra inteiro)$/, 'sal de pantalla completa'],
            [/^(?:(?:aperta|pressiona|carrega em|carrega no) )?enter$|^envia(?:r)? o formulario$/, 'enter'],
            [/^(?:clica|clique|clicar|clic)$/, 'clic'], [/^clique (?:com o botao )?direito$/, 'clic derecho'],
            [/^(?:clica|clique|clicar|carrega|aperta|pressiona|toca)(?: (?:em|no|na))? /, 'clic en '],
            [/^(?:seleciona|selecionar|selecione|destaca) /, 'selecciona '],
            [/^(?:escreve|escrever|escreva|digita|digitar|digite|dita|ditar|dite) /, 'escribe '],
            [/^(?:apaga|apagar|limpa|limpar) o (?:texto|campo)$/, 'borra el texto'], [/^(?:foca|focar)(?: (?:em|no|na))? /, 'enfoca '],
            [/^(?:reproduz|reproduzir|toca|tocar|continua|play)(?: o (?:video|audio))?$/, 'reproduce'], [/^(?:pausa|pausar|pause)(?: o (?:video|audio))?$/, 'pausa'],
            [/^(?:pesquisa|pesquisar|pesquise|procura|procurar|procure|busca|buscar|busque)(?: por)? /, 'busca '],
            [/^(?:abre|abrir|abra|vai para|ir para|va para|entra em|entrar em|visita|visitar|visite|acessa|acessar|acesse|inicia|iniciar)(?: o| a)? /, 'abre ']
        ]
    },
    de: {
        activacion: 'computer', palabra: 'Computer', tts: 'de-DE',
        ayuda: 'Beginne mit Computer und sage zum Beispiel: öffne YouTube; suche Katzen auf YouTube; nach unten oder nach oben; zurück; neuer Tab; Tab schließen; Tab 2; klicke auf Kontakt; schreibe und dein Text; Tab stummschalten; Vollbild; abbrechen.',
        envoltorios: /^(?:bitte|hey|hallo|ok|okay|jetzt|also|kannst du|konntest du|konnen sie|konnten sie|ich mochte|ich will|mach mal)[\s,]+/,
        finales: /[\s,]+(?:bitte|danke)$/,
        conector: '(?:auf|in|bei)', pestanaNueva: /\sin (?:einem |einen )?neuen tab$/, ventanaNueva: /\sin (?:einem )?neuen fenster$/,
        frases: [
            [/^(?:(?:aktiviere (?:den )?cursor|cursor aktivieren))$/, 'activar cursor'],
            [/^(?:(?:deaktiviere (?:den )?cursor|cursor deaktivieren))$/, 'desactivar cursor'],
            [/^(?:cursor pausieren)$/, 'pausar cursor'],
            [/^(?:cursor fortsetzen)$/, 'reanudar cursor'],
            [/^(?:cursor (?:kalibrieren|neu kalibrieren|zentrieren))$/, 'calibrar cursor'],
            [/^(?:kopfsteuerung)$/, 'control cabeza'],
            [/^(?:handsteuerung)$/, 'control manos'],
            [/^(?:(?:stumpfsteuerung|teilhandsteuerung))$/, 'control munon'],
            [/^(?:kleine bewegungen)$/, 'movimientos pequenos'],
            [/^(?:normale bewegungen)$/, 'movimientos normales'],
            [/^(?:zitterfilter aktivieren)$/, 'activar temblor'],
            [/^(?:zitterfilter deaktivieren)$/, 'desactivar temblor'],
            [/^(?:cursor langsamer)$/, 'cursor mas lento'],
            [/^(?:cursor schneller)$/, 'cursor mas rapido'],
            [/^(?:nachster rechtsklick)$/, 'siguiente clic derecho'],
            [/^(?:klick abbrechen)$/, 'cancelar clic'],
            [/^(?:(?:haustier|maskottchen) (?:ausblenden|verstecken))$/, 'oculta mascota'],
            [/^(?:(?:haustier|maskottchen) (?:gru(?:ss|ß)en|begru(?:ss|ß)en))$/, 'saluda mascota'],
            [/^(?:(?:haustier|maskottchen) schlafen legen)$/, 'duerme mascota'],
            [/^(?:(?:haustier|maskottchen) wecken)$/, 'despierta mascota'],
            [/^(?:auswahl anklicken)$/, 'dale clic'],
            [/^(?:(?:haustier|maskottchen) |(?:wahle (?:das )?(?:haustier|maskottchen)) )/, 'mascota '],
            [/^(?:hilfe|was kann ich sagen|befehle)$/, 'ayuda'],
            [/^(?:(?:offne|zeige|starte) (?:das |die )?)?(?:tutorial|anleitung)$/, 'tutorial'],
            [/^(?:abbrechen|abbruch|vergiss es)$/, 'cancelar'],
            [/^(?:sei still|ruhe|stopp|hor auf zu (?:reden|lesen))$/, 'calla'],
            [/^(?:(?:offne|mach) )?(?:einen |ein )?neue[nrs]? (?:tab|registerkarte)$/, 'nueva pestaña'], [/^(?:(?:offne|mach) )?(?:ein )?neues fenster$/, 'nueva ventana'],
            [/^schlie(?:ss|ß)e? (?:den |diesen )?tab$|^(?:den |diesen )?tab schlie(?:ss|ß)en$/, 'cierra la pestaña'],
            [/^schlie(?:ss|ß)e? (?:das |dieses )?fenster$|^(?:das |dieses )?fenster schlie(?:ss|ß)en$/, 'cierra la ventana'],
            [/^(?:schlie(?:ss|ß)e? (?:alle )?anderen tabs|(?:alle )?anderen tabs schlie(?:ss|ß)en)$/, 'cierra las otras pestañas'],
            [/^(?:tab duplizieren|dupliziere (?:den |diesen )?tab)$/, 'duplica la pestaña'],
            [/^(?:(?:tab )?stummschalten|ton aus)$/, 'silencia la pestaña'], [/^(?:ton an|stummschaltung aufheben)$/, 'activa el sonido'],
            [/^(?:(?:gehe? )?zum )?nachsten tab$|^nachster tab$/, 'pestaña siguiente'], [/^(?:(?:gehe? )?zum )?vorherigen tab$|^vorheriger tab$/, 'pestaña anterior'],
            [/^(?:gehe? zu )?tab (?:nummer )?(\d+)$/, 'pestaña $1'], [/^(?:(?:gehe? )?zum )?letzten tab$|^letzter tab$/, 'última pestaña'],
            [/^(?:gehe? )?zuruck$/, 'atrás'], [/^(?:gehe? )?vorwarts$/, 'adelante'],
            [/^(?:(?:seite )?neu laden|lade neu|aktualisieren)$/, 'recarga'],
            [/^(?:(?:scrolle?|gehe?) )?(?:nach unten|runter|herunter) (?:ein bisschen|etwas)$|^(?:ein bisschen|etwas) (?:nach unten|runter)$/, 'baja un poco'],
            [/^(?:(?:scrolle?|gehe?) )?(?:nach unten|runter|herunter)$/, 'baja'],
            [/^(?:(?:scrolle?|gehe?) )?(?:nach oben|hoch|rauf|hinauf) (?:ein bisschen|etwas)$|^(?:ein bisschen|etwas) (?:nach oben|hoch)$/, 'sube un poco'],
            [/^(?:(?:scrolle?|gehe?) )?(?:nach oben|hoch|rauf|hinauf)$/, 'sube'],
            [/^(?:(?:gehe? )?zum (?:anfang|seitenanfang)|ganz nach oben)$/, 've al inicio'], [/^(?:(?:gehe? )?zum (?:ende|seitenende)|ganz nach unten)$/, 've al final'],
            [/^(?:vergro(?:ss|ß)ern|reinzoomen|zoom rein|hineinzoomen)$/, 'aumenta zoom'], [/^(?:verkleinern|rauszoomen|zoom raus|herauszoomen)$/, 'reduce zoom'], [/^zoom zurucksetzen$/, 'zoom normal'],
            [/^vollbild(?:modus)?$/, 'pantalla completa'], [/^vollbild(?:modus)? (?:beenden|verlassen)$/, 'sal de pantalla completa'],
            [/^(?:(?:drucke?) )?(?:enter|eingabe)$|^(?:abschicken|absenden)$/, 'enter'],
            [/^(?:klick|klicke|klicken)$/, 'clic'], [/^rechtsklick$/, 'clic derecho'],
            [/^(?:klicke?|klicken|drucke?|tippe) auf /, 'clic en '], [/^(?:markiere|wahle) /, 'selecciona '],
            [/^(?:schreibe?|tippe?|diktiere) /, 'escribe '], [/^(?:text loschen|feld leeren|losche den text)$/, 'borra el texto'],
            [/^fokussiere /, 'enfoca '],
            [/^(?:abspielen|wiedergabe|play|fortsetzen)$/, 'reproduce'], [/^(?:pause|pausieren|anhalten)$/, 'pausa'],
            [/^(?:suche?|suchen)(?: nach)? /, 'busca '],
            [/^(?:offne|offnen|gehe? zu|gehe? auf|besuche|starte|navigiere zu)(?: die| den| das)? /, 'abre '],
            // Verbo al final: «YouTube öffnen», «Katzen suchen».
            [/^(.+) (?:offnen|aufmachen)$/, 'abre $1'], [/^(?:nach )?(.+) suchen$/, 'busca $1'], [/^(.+) (?:schreiben|tippen)$/, 'escribe $1']
        ]
    },
    fr: {
        activacion: 'ordinateur', palabra: 'Ordinateur', tts: 'fr-FR',
        ayuda: "Commencez par Ordinateur et dites par exemple : ouvre YouTube ; cherche chats sur YouTube ; descends ou monte ; retour ; nouvel onglet ; ferme l'onglet ; onglet 2 ; clique sur Contact ; écris et votre texte ; coupe le son ; plein écran ; annule.",
        envoltorios: /^(?:s'il te plait|s'il vous plait|stp|svp|peux[- ]tu|pouvez[- ]vous|tu peux|est-ce que tu peux|je veux|je voudrais|j'aimerais|eh|hey|ok|d'accord|alors|maintenant|merci de|veuillez)[\s,]+/,
        finales: /[\s,]+(?:s'il te plait|s'il vous plait|stp|svp|merci)$/,
        conector: '(?:sur|dans|en)', pestanaNueva: /\sdans un nouvel onglet$/, ventanaNueva: /\sdans une nouvelle fenetre$/,
        frases: [
            [/^(?:(?:active|activer) (?:le )?curseur)$/, 'activar cursor'],
            [/^(?:(?:desactive|desactiver) (?:le )?curseur)$/, 'desactivar cursor'],
            [/^(?:(?:pause|mets en pause) (?:le )?curseur)$/, 'pausar cursor'],
            [/^(?:(?:reprends|reprendre) (?:le )?curseur)$/, 'reanudar cursor'],
            [/^(?:(?:calibre|recalibre|centre) (?:le )?curseur)$/, 'calibrar cursor'],
            [/^(?:controle (?:avec |par )?(?:la )?tete)$/, 'control cabeza'],
            [/^(?:controle (?:avec |par )?(?:les )?mains)$/, 'control manos'],
            [/^(?:controle (?:avec |par )?(?:le )?moignon)$/, 'control munon'],
            [/^(?:petits mouvements)$/, 'movimientos pequenos'],
            [/^(?:mouvements normaux)$/, 'movimientos normales'],
            [/^(?:active (?:le )?filtre de tremblement)$/, 'activar temblor'],
            [/^(?:desactive (?:le )?filtre de tremblement)$/, 'desactivar temblor'],
            [/^(?:curseur plus lent)$/, 'cursor mas lento'],
            [/^(?:curseur plus rapide)$/, 'cursor mas rapido'],
            [/^(?:prochain clic droit)$/, 'siguiente clic derecho'],
            [/^(?:annule (?:le )?clic)$/, 'cancelar clic'],
            [/^(?:(?:cache|masque|retire) (?:la )?mascotte)$/, 'oculta mascota'],
            [/^(?:(?:salue|saluer) (?:la )?mascotte)$/, 'saluda mascota'],
            [/^(?:(?:endors (?:la )?mascotte|mascotte dors))$/, 'duerme mascota'],
            [/^(?:reveille (?:la )?mascotte)$/, 'despierta mascota'],
            [/^(?:clique (?:sur )?(?:la )?selection)$/, 'dale clic'],
            [/^(?:mascotte|(?:choisis|choisir)(?: la)? mascotte) /, 'mascota '],
            [/^(?:aide|que puis-je dire|qu'est-ce que je peux dire|commandes)$/, 'ayuda'],
            [/^(?:(?:ouvre|montre|lance) (?:le )?)?tutoriel$/, 'tutorial'],
            [/^(?:annule|annuler|laisse tomber|oublie)$/, 'cancelar'],
            [/^(?:tais-toi|silence|stop|arrete de (?:parler|lire))$/, 'calla'],
            [/^(?:(?:ouvre|ouvrir) )?(?:un )?nouvel onglet$/, 'nueva pestaña'], [/^(?:(?:ouvre|ouvrir) )?(?:une )?nouvelle fenetre$/, 'nueva ventana'],
            [/^(?:ferme|fermer|fermez) (?:l'|l |cet |ce )?onglet(?: actuel)?$/, 'cierra la pestaña'], [/^(?:ferme|fermer|fermez) (?:la |cette )?fenetre$/, 'cierra la ventana'],
            [/^(?:ferme|fermer|fermez) (?:tous )?les autres onglets$/, 'cierra las otras pestañas'], [/^(?:duplique|dupliquer) (?:l'|l |cet )?onglet$/, 'duplica la pestaña'],
            [/^(?:coupe(?:r)? le son|mets en sourdine|muet)$/, 'silencia la pestaña'], [/^(?:remets|reactive|active) le son$/, 'activa el sonido'],
            [/^(?:(?:va a l'|aller a l')?onglet suivant)$/, 'pestaña siguiente'], [/^(?:(?:va a l'|aller a l')?onglet precedent)$/, 'pestaña anterior'],
            [/^(?:va a l'|aller a l')?onglet (?:numero )?(\d+)$/, 'pestaña $1'], [/^(?:va au |aller au )?dernier onglet$/, 'última pestaña'],
            [/^(?:retour|reviens|recule|precedent|page precedente|retourne en arriere)$/, 'atrás'], [/^(?:avance|page suivante|suivant|va en avant)$/, 'adelante'],
            [/^(?:recharge|recharger|actualise|actualiser|rafraichis)(?: la page)?$/, 'recarga'],
            [/^(?:(?:defile|descends|descendre|va) )?(?:vers le bas|en bas) un peu$|^descends un peu$/, 'baja un poco'],
            [/^(?:(?:defile|descends|descendre|va) )?(?:vers le bas|en bas)$|^(?:descends|descendre)$/, 'baja'],
            [/^(?:(?:defile|monte|monter|remonte|va) )?(?:vers le haut|en haut) un peu$|^(?:monte|remonte) un peu$/, 'sube un poco'],
            [/^(?:(?:defile|monte|monter|remonte|va) )?(?:vers le haut|en haut)$|^(?:monte|monter|remonte)$/, 'sube'],
            [/^(?:va |aller )?(?:au )?debut(?: de la page)?$|^tout en haut$/, 've al inicio'], [/^(?:va |aller )?(?:a la )?fin(?: de la page)?$|^tout en bas$/, 've al final'],
            [/^(?:zoome|zoomer|agrandis|zoom avant)$/, 'aumenta zoom'], [/^(?:dezoome|dezoomer|reduis|zoom arriere)$/, 'reduce zoom'], [/^(?:zoom normal|reinitialise le zoom)$/, 'zoom normal'],
            [/^(?:plein ecran)$/, 'pantalla completa'], [/^(?:quitte|quitter|sors|sortir) (?:du |le )?plein ecran$/, 'sal de pantalla completa'],
            [/^(?:appuie sur )?entree$|^(?:valide|valider|soumettre|envoie le formulaire)$/, 'enter'],
            [/^(?:clique|cliquer|clic)$/, 'clic'], [/^clic droit$/, 'clic derecho'],
            [/^(?:clique|cliquer|cliquez|clic|appuie|appuyer)(?: sur)? /, 'clic en '], [/^(?:selectionne|selectionner|surligne) /, 'selecciona '],
            [/^(?:ecris|ecrire|ecrivez|tape|taper|tapez|dicte|dicter) /, 'escribe '], [/^(?:efface|effacer|vide|vider) le (?:texte|champ)$/, 'borra el texto'],
            [/^(?:mets le focus sur|focus sur|va au champ) /, 'enfoca '],
            [/^(?:lecture|lance la video|reprends|joue|play)(?: la video)?$/, 'reproduce'], [/^(?:pause|mets en pause)(?: la video)?$/, 'pausa'],
            [/^(?:cherche|chercher|cherchez|recherche|rechercher|trouve) /, 'busca '],
            [/^(?:ouvre|ouvrir|ouvrez|va sur|va a|aller sur|aller a|lance|visite|demarre)(?: le| la)?(?: l'| )/, 'abre ']
        ]
    },
    it: {
        activacion: 'computer', palabra: 'Computer', tts: 'it-IT',
        ayuda: 'Inizia con Computer e di, per esempio: apri YouTube; cerca gatti su YouTube; scendi o sali; indietro; nuova scheda; chiudi la scheda; scheda 2; clicca su Contatto; scrivi e il tuo testo; silenzia la scheda; schermo intero; annulla.',
        envoltorios: /^(?:per favore|per piacere|puoi|potresti|mi puoi|ehi|ok|okay|adesso|ora|allora|voglio|vorrei)[\s,]+/,
        finales: /[\s,]+(?:per favore|per piacere|grazie)$/,
        conector: '(?:su|in)', pestanaNueva: /\sin una nuova scheda$/, ventanaNueva: /\sin una nuova finestra$/,
        frases: [
            [/^(?:(?:attiva|abilita) (?:il )?cursore)$/, 'activar cursor'],
            [/^(?:(?:disattiva|disabilita) (?:il )?cursore)$/, 'desactivar cursor'],
            [/^(?:(?:pausa|metti in pausa) (?:il )?cursore)$/, 'pausar cursor'],
            [/^(?:riprendi (?:il )?cursore)$/, 'reanudar cursor'],
            [/^(?:(?:calibra|ricalibra|centra) (?:il )?cursore)$/, 'calibrar cursor'],
            [/^(?:controllo (?:con |della )?(?:la )?testa)$/, 'control cabeza'],
            [/^(?:controllo (?:con |delle )?(?:le )?mani)$/, 'control manos'],
            [/^(?:controllo (?:con |del )?(?:il )?moncone)$/, 'control munon'],
            [/^(?:piccoli movimenti)$/, 'movimientos pequenos'],
            [/^(?:movimenti normali)$/, 'movimientos normales'],
            [/^(?:attiva (?:il )?filtro tremore)$/, 'activar temblor'],
            [/^(?:disattiva (?:il )?filtro tremore)$/, 'desactivar temblor'],
            [/^(?:cursore piu lento)$/, 'cursor mas lento'],
            [/^(?:cursore piu veloce)$/, 'cursor mas rapido'],
            [/^(?:prossimo clic destro)$/, 'siguiente clic derecho'],
            [/^(?:annulla (?:il )?clic)$/, 'cancelar clic'],
            [/^(?:(?:nascondi|rimuovi) (?:la )?mascotte)$/, 'oculta mascota'],
            [/^(?:saluta (?:la )?mascotte)$/, 'saluda mascota'],
            [/^(?:(?:addormenta (?:la )?mascotte|mascotte dormi))$/, 'duerme mascota'],
            [/^(?:sveglia (?:la )?mascotte)$/, 'despierta mascota'],
            [/^(?:clicca (?:sulla |la )?selezione)$/, 'dale clic'],
            [/^(?:mascotte|(?:scegli|seleziona)(?: la)? mascotte) /, 'mascota '],
            [/^(?:aiuto|cosa posso dire|comandi)$/, 'ayuda'],
            [/^(?:(?:apri|mostra|avvia) (?:il )?)?tutorial$/, 'tutorial'],
            [/^(?:annulla|lascia stare|lascia perdere)$/, 'cancelar'],
            [/^(?:zitto|stai zitto|silenzio|basta|smetti di (?:parlare|leggere))$/, 'calla'],
            [/^(?:apri )?(?:una )?nuova scheda$/, 'nueva pestaña'], [/^(?:apri )?(?:una )?nuova finestra$/, 'nueva ventana'],
            [/^chiudi (?:la |questa )?scheda$/, 'cierra la pestaña'], [/^chiudi (?:la |questa )?finestra$/, 'cierra la ventana'],
            [/^chiudi (?:tutte )?le altre schede$/, 'cierra las otras pestañas'], [/^duplica (?:la |questa )?scheda$/, 'duplica la pestaña'],
            [/^(?:disattiva l'audio|muto|silenzia(?: la scheda)?)$/, 'silencia la pestaña'], [/^(?:riattiva|attiva) l'audio$/, 'activa el sonido'],
            [/^(?:vai alla )?(?:scheda successiva|prossima scheda)$/, 'pestaña siguiente'], [/^(?:vai alla )?scheda precedente$/, 'pestaña anterior'],
            [/^(?:vai alla )?scheda (?:numero )?(\d+)$/, 'pestaña $1'], [/^(?:vai all')?ultima scheda$/, 'última pestaña'],
            [/^(?:indietro|torna indietro|pagina precedente)$/, 'atrás'], [/^(?:avanti|vai avanti|pagina successiva)$/, 'adelante'],
            [/^(?:ricarica|aggiorna)(?: la pagina)?$/, 'recarga'],
            [/^(?:(?:scorri|vai) )?(?:in )?giu un po'?$|^scendi un po'?$/, 'baja un poco'], [/^(?:(?:scorri|vai) )?(?:in )?giu$|^scendi$/, 'baja'],
            [/^(?:(?:scorri|vai) )?(?:in )?su un po'?$|^sali un po'?$/, 'sube un poco'], [/^(?:(?:scorri|vai) )?(?:in )?su$|^sali$/, 'sube'],
            [/^(?:vai )?all'inizio$|^in cima$/, 've al inicio'], [/^(?:vai )?alla fine$|^in fondo$/, 've al final'],
            [/^(?:ingrandisci|zoom avanti|aumenta lo zoom)$/, 'aumenta zoom'], [/^(?:riduci|rimpicciolisci|zoom indietro)$/, 'reduce zoom'], [/^zoom normale$/, 'zoom normal'],
            [/^schermo intero$/, 'pantalla completa'], [/^esci (?:dallo|da) schermo intero$/, 'sal de pantalla completa'],
            [/^(?:premi )?invio$|^invia(?: il modulo)?$/, 'enter'],
            [/^(?:clicca|clic|click)$/, 'clic'], [/^(?:clic|tasto) destro$/, 'clic derecho'],
            [/^(?:clicca|premi|tocca)(?: su)? /, 'clic en '], [/^(?:seleziona|evidenzia) /, 'selecciona '],
            [/^(?:scrivi|scrivere|digita|detta) /, 'escribe '], [/^(?:cancella|svuota) il (?:testo|campo)$/, 'borra el texto'],
            [/^(?:metti il focus su|vai al campo) /, 'enfoca '],
            [/^(?:riproduci|play|riprendi)(?: il video)?$/, 'reproduce'], [/^(?:pausa|metti in pausa)(?: il video)?$/, 'pausa'],
            [/^(?:cerca|cercare|ricerca|trova) /, 'busca '],
            [/^(?:apri|aprire|vai su|vai a|visita|avvia)(?: il| lo| la)?(?: l'| )/, 'abre ']
        ]
    }
};

function normalizarVoz(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, ' ').trim();
}

function reconocerSitio(texto) {
    const nombre = normalizarVoz(texto);
    return Object.keys(SitiosVoz).find(clave => clave === nombre || SitiosVoz[clave].alias.includes(nombre));
}
globalThis.SitiosVoz = SitiosVoz; globalThis.normalizarVoz = normalizarVoz; globalThis.reconocerSitio = reconocerSitio;
globalThis.IdiomasVoz = IdiomasVoz;

const CodigosVoz = ['es-PE', 'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL', 'es-US', 'en-US', 'en-GB', 'pt-BR', 'pt-PT', 'de-DE', 'fr-FR', 'it-IT'];
// Chrome hereda del sistema operativo su lista de idiomas preferidos: no hace falta ningún permiso.
// Se toma el primero que el parser admite; una región no listada (es-419, fr-CA) se conserva para el reconocedor.
function detectarIdiomaVoz(preferidos) {
    const generales = { es: 'es-PE', en: 'en-US', pt: 'pt-BR', de: 'de-DE', fr: 'fr-FR', it: 'it-IT' };
    for (const codigo of preferidos) {
        const texto = String(codigo || '').trim();
        const exacto = CodigosVoz.find(admitido => admitido.toLowerCase() === texto.toLowerCase());
        if (exacto) return exacto;
        const general = generales[texto.slice(0, 2).toLowerCase()];
        if (general) return /^[a-z]{2}-[a-z0-9]{2,3}$/i.test(texto) ? texto : general;
    }
    return 'es-PE';
}
globalThis.CodigosVoz = CodigosVoz; globalThis.detectarIdiomaVoz = detectarIdiomaVoz;

// Nombre de activación configurable (`nombreActivacion` en storage.local). Ausente, vacío o inválido:
// «Computadora» y la palabra del idioma. Uno válido las sustituye a ambas en los seis idiomas.
// Clave de comparación: minúsculas, sin diacríticos ni separadores y sin letras repetidas («Jar vis», «Lucía», «Yatti»).
// Quita cualquier marca de las vocales (á, ã, ü…) y conserva ñ, ç, ll y rr.
const letrasActivacion = texto => String(texto || '').toLowerCase().normalize('NFD').replace(/([aeiou])\p{M}+/gu, '$1').normalize('NFC')
    .replace(/[^\p{L}\p{N}]/gu, '');
const claveActivacion = texto => letrasActivacion(texto).replace(/(\p{L})\1+/gu, (grupo, letra) => /[lr]/.test(letra) ? letra + letra : letra);
// Contrato portable: las plataformas consumen estos datos, no las APIs de Chrome.
const ParidadVoz = {
    // Secuencia del tutorial práctico (misma en todas las ediciones; `soloBase` requiere cursor con cámara).
    // Textos en textos_paginas.js: `tutorial.<id>.titulo` y `tutorial.<id>.texto`. `orden` es la orden canónica a practicar.
    tutorial: {
        version: 1, orden: 'tutorial',
        pasos: [
            { id: 'voz' }, { id: 'nombre' }, { id: 'baja', orden: 'baja' }, { id: 'selecciona', orden: 'selecciona Siguiente' },
            { id: 'clic', orden: 'dale clic' }, { id: 'filtro' }, { id: 'cursor', soloBase: true }, { id: 'reabrir', orden: 'tutorial' }
        ]
    },
    confirmaciones: {
        es: { verbo: 'confirmo', cerrar_pestana: 'cerrar esta pestaña', cerrar_otras: 'cerrar otras pestañas', cerrar_ventana: 'cerrar ventana', pregunta: 'Di exactamente: {frase}. Caduca en 8 segundos.' },
        en: { verbo: 'confirm', cerrar_pestana: 'close this tab', cerrar_otras: 'close other tabs', cerrar_ventana: 'close window', pregunta: 'Say exactly: {frase}. Expires in 8 seconds.' },
        pt: { verbo: 'confirmo', cerrar_pestana: 'fechar esta aba', cerrar_otras: 'fechar outras abas', cerrar_ventana: 'fechar janela', pregunta: 'Diga exatamente: {frase}. Expira em 8 segundos.' },
        de: { verbo: 'bestätige', cerrar_pestana: 'diesen Tab schließen', cerrar_otras: 'andere Tabs schließen', cerrar_ventana: 'Fenster schließen', pregunta: 'Sagen Sie genau: {frase}. Gilt 8 Sekunden.' },
        fr: { verbo: 'confirme', cerrar_pestana: 'fermer cet onglet', cerrar_otras: 'fermer les autres onglets', cerrar_ventana: 'fermer la fenêtre', pregunta: 'Dites exactement : {frase}. Expire dans 8 secondes.' },
        it: { verbo: 'confermo', cerrar_pestana: 'chiudere questa scheda', cerrar_otras: 'chiudere altre schede', cerrar_ventana: 'chiudere finestra', pregunta: 'Di esattamente: {frase}. Scade tra 8 secondi.' }
    },
    activacion: {
        version: 1, validacion: { minimo: 3, maximo: 24, palabras: 3, letras: 3 }, maxAlias: 3,
        fragmentosPorPalabra: 3, pluralLiteral: true, tambienComputadora: false,
        posicion: 'inicio_o_envoltorio', compuestosVocativos: ['Hey Google'],
        vocativos: { es: ['oye', 'oe', 'hola'], en: ['hey', 'hello'], pt: ['oi', 'ola'], de: ['hallo'], fr: ['salut'], it: ['ciao'] },
        cierres: { es: ['gracias', 'listo', 'silencio'], en: ['thanks', 'done', 'silence'], pt: ['obrigado', 'pronto', 'silencio'], de: ['danke', 'fertig', 'ruhe'], fr: ['merci', 'termine', 'silence'], it: ['grazie', 'fatto', 'silenzio'] },
        interrupciones: { es: ['calla', 'silencio', 'deja de hablar'], en: ['silence', 'stop speaking'], pt: ['silencio', 'para de falar'], de: ['ruhe', 'nicht sprechen'], fr: ['silence', 'arrete de parler'], it: ['silenzio', 'smetti di parlare'] },
        pronunciaciones: { jarvis: ['yarbis', 'yarvis', 'jarbis'], alexa: ['aleksa'], mike: ['maik'], george: ['yorch'] },
        perfilEspanol: { minimoLetras: 5, reglas: [
            { patron: 'c(?=[ei])', flags: 'g', reemplazo: 's' },
            { patron: 'qu(?=[ei])', flags: 'g', reemplazo: 'k' },
            { patron: 'c(?!h)', flags: 'g', reemplazo: 'k' },
            { patron: 'ph', flags: 'g', reemplazo: 'f' },
            { patron: 'v', flags: 'g', reemplazo: 'b' },
            { patron: 'z', flags: 'g', reemplazo: 's' },
            { patron: 'x', flags: 'g', reemplazo: 'ks' }
        ] }
    },
    tolerancia: {
        prefijoTokens: 1, minimoLetras: 5, distanciaMaxima: 1, distanciaSegundo: 3, combinarEdicionFonetica: false,
        verbos: { es: ['buscar', 'recarga', 'actualiza', 'refresca', 'aumenta', 'reduce', 'selecciona'], en: ['search', 'reload', 'refresh', 'select'], pt: ['busca', 'pesquisa', 'recarrega', 'seleciona'], de: ['suche', 'aktualisiere'], fr: ['cherche', 'recharge'], it: ['cerca', 'ricarica', 'seleziona'] },
        excluidos: {
            es: ['cerrar', 'cierra', 'salir', 'terminar', 'borrar', 'borra', 'eliminar', 'vaciar', 'limpiar', 'enviar', 'envia', 'publicar', 'comprar', 'ejecutar', 'ejecuta', 'pulsar', 'pulsa', 'clic', 'enter', 'atajos', 'apagar', 'desactivar'],
            en: ['close', 'exit', 'quit', 'finish', 'delete', 'erase', 'empty', 'clear', 'send', 'publish', 'buy', 'run', 'execute', 'press', 'click', 'enter', 'shortcut', 'disable', 'stop'],
            pt: ['fechar', 'fecha', 'sair', 'terminar', 'apagar', 'eliminar', 'esvaziar', 'limpar', 'enviar', 'publicar', 'comprar', 'executar', 'pressionar', 'clicar', 'enter', 'atalho', 'desativar'],
            de: ['schliessen', 'beenden', 'verlassen', 'loschen', 'leeren', 'bereinigen', 'senden', 'veroffentlichen', 'kaufen', 'ausfuhren', 'drucken', 'klicken', 'eingabe', 'tastenkurzel', 'ausschalten', 'deaktivieren'],
            fr: ['fermer', 'quitter', 'terminer', 'supprimer', 'effacer', 'vider', 'nettoyer', 'envoyer', 'publier', 'acheter', 'executer', 'appuyer', 'cliquer', 'entree', 'raccourci', 'eteindre', 'desactiver'],
            it: ['chiudere', 'chiudi', 'uscire', 'terminare', 'cancellare', 'eliminare', 'svuotare', 'pulire', 'inviare', 'pubblicare', 'comprare', 'eseguire', 'premere', 'clic', 'invio', 'scorciatoia', 'spegnere', 'disattivare']
        },
        sitios: { youtube: ['yutub'] }
    },
    comportamiento: { version: 1, capacidades: ['activacion-posicional', 'alias-explicitos', 'prueba-sin-ejecucion', 'resultado-ejecucion', 'confirmacion-destino', 'conversacion-tts', 'tolerancia-benigna'],
        estados: ['inactivo', 'esperando', 'ejecutando', 'hablando', 'confirmando'], resultados: ['ok', 'fallo', 'desconocida', 'confirmando'],
        modoConversacion: false, ventanaMs: 8000, confirmacionMs: 8000, destructivas: ['cerrar_pestana', 'cerrar_otras', 'cerrar_ventana'] }
};
globalThis.ParidadVoz = ParidadVoz;
globalThis.reservadasNombreActivacion = () => Object.fromEntries(palabrasReservadasActivacion());
// Órdenes de una palabra del parser de páginas (VoiceAssistant) que no aparecen en IdiomasVoz.
// Los infinitivos de toda orden («refrescar», «retroceder») se derivan en palabrasReservadasActivacion().
const OrdenesParser = 'elige detente deten detener deja olvidalo olvida nada dejalo deselecciona crea pon poner ponme ponerme agrega anade dame clona ' +
    'enmudece corta devuelve reactiva desmutea desilencia salta sal salir restablece desciende asciende scrollea desplazate desplaza desliza ' +
    'muevete abajo arriba intro envia continua ejecuta llevame dirigete accede muestrame busqueda realiza encuentra consulta investiga ' +
    'averigua vacia recalibra descansa acomoda';
let reservadasActivacion = null;
// Palabras que un nombre no puede contener, derivadas de las reglas de voz de los seis idiomas.
function palabrasReservadasActivacion() {
    if (reservadasActivacion) return reservadasActivacion;
    const mapa = new Map();
    const anotar = (texto, motivo) => {
        for (const palabra of normalizarVoz(String(texto).replace(/\\[a-z]/gi, ' ')).split(/[^a-z]+/)) {
            if (palabra.length < 3) continue;
            mapa.set(claveActivacion(palabra), motivo);
            if (motivo !== 'orden') continue;
            // Infinitivo de cada imperativo: busca → buscar, retrocede → retroceder/retrocedir.
            if (palabra.endsWith('a')) mapa.set(claveActivacion(palabra + 'r'), motivo);
            if (palabra.endsWith('e')) for (const final of ['er', 'ir']) mapa.set(claveActivacion(palabra.slice(0, -1) + final), motivo);
        }
    };
    for (const idioma of Object.values(IdiomasVoz)) for (const [patron, reemplazo] of idioma.frases) { anotar(patron.source, 'orden'); anotar(reemplazo, 'orden'); }
    for (const [forma, canonico] of Object.entries(IdiomasVoz.es.verbos)) { anotar(forma, 'orden'); anotar(canonico, 'orden'); }
    anotar(OrdenesParser, 'orden');
    for (const idioma of Object.values(IdiomasVoz)) { anotar(idioma.envoltorios.source, 'muletilla'); anotar(idioma.finales.source, 'muletilla'); }
    for (const mascota of ['tinku', 'cuchu', 'yati']) mapa.set(claveActivacion(mascota), 'mascota');
    return reservadasActivacion = mapa;
}
// Devuelve { ok, nombre, motivo }; motivo es una clave de texto traducible (`activacion.*`).
function validarNombreActivacion(texto) {
    const nombre = typeof texto === 'string' ? texto.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
    const fallo = motivo => ({ ok: false, nombre, motivo: 'activacion.' + motivo });
    // Sólo cadenas: false, números o listas guardados por error vuelven a «Computadora».
    if (nombre.length < 3 || nombre.length > 24) return fallo('longitud');
    if (!/^[\p{L}\p{M}' ’-]+$/u.test(nombre)) return fallo('caracteres');
    if (nombre.split(' ').length > 3) return fallo('palabras');
    if ((nombre.match(/\p{L}/gu) || []).length < 3) return fallo('letras');
    const reservadas = palabrasReservadasActivacion();
    if (ParidadVoz.activacion.compuestosVocativos.some(compuesto => compuesto.toLowerCase() === nombre.toLowerCase())) return { ok: true, nombre, motivo: null };
    for (const parte of [nombre, ...nombre.split(/[\s'’-]+/)]) {
        const motivo = reservadas.get(claveActivacion(parte));
        if (motivo) return fallo(motivo);
    }
    return { ok: true, nombre, motivo: null };
}
// Nombre que se muestra al usuario: el personalizado válido o la palabra del idioma.
function palabraActivacion(nombre, idioma = 'es') {
    const validado = validarNombreActivacion(nombre);
    return validado.ok ? validado.nombre : (IdiomasVoz[String(idioma).slice(0, 2).toLowerCase()] || IdiomasVoz.es).palabra;
}
const patronesActivacion = new Map();
function perfilEspanol(texto) {
    return ParidadVoz.activacion.perfilEspanol.reglas.reduce((valor, regla) => valor.replace(new RegExp(regla.patron, regla.flags), regla.reemplazo), letrasActivacion(texto));
}
function validarAliasActivacion(alias, nombre) {
    if (!Array.isArray(alias) || alias.length > ParidadVoz.activacion.maxAlias) return { ok: false, alias: [] };
    const vistos = new Set([claveActivacion(nombre)]), resultado = [];
    for (const valor of alias) {
        const validado = validarNombreActivacion(valor), clave = claveActivacion(valor);
        if (!validado.ok || vistos.has(clave)) return { ok: false, alias: [] };
        vistos.add(clave); resultado.push(validado.nombre);
    }
    return { ok: true, alias: resultado };
}
function prefijoActivacionValido(texto, idioma) {
    let restante = normalizarVoz(texto).replace(/^[\s,.:;!?¿¡]+/, '');
    const datos = IdiomasVoz[idioma] || IdiomasVoz.es;
    for (let vuelta = 0; vuelta < 8 && restante; vuelta++) {
        const anterior = restante;
        restante = (restante + ' ').replace(datos.envoltorios, '').trim();
        for (const vocativo of ParidadVoz.activacion.vocativos[idioma] || []) {
            if (restante === vocativo || restante.startsWith(vocativo + ' ')) restante = restante.slice(vocativo.length).trim();
        }
        restante = restante.replace(/^[\s,.:;!?]+/, '');
        if (restante === anterior) break;
    }
    return !restante;
}
// Busca el nombre alineado por palabras, con límites Unicode, al inicio o tras muletillas/vocativos
// (también durante la espera tras el pitido). Devuelve dónde termina en el texto original, para
// recortar conservando mayúsculas y acentos, o -1.
function buscarActivacion(texto, nombre, idioma = 'es', opciones = {}) {
    const fragmentos = [...String(texto || '').matchAll(/[\p{L}\p{M}\p{N}]+/gu)];
    const base = String(idioma).slice(0, 2).toLowerCase();
    const limite = Math.min(fragmentos.length, 32);
    const fin = indice => fragmentos[indice].index + fragmentos[indice][0].length;
    const validado = validarNombreActivacion(nombre);
    const inicios = fragmentos.slice(0, limite).map((_, indice) => indice).filter(indice =>
        prefijoActivacionValido(String(texto).slice(0, fragmentos[indice].index), base));
    if (!validado.ok || opciones.tambienComputadora === true) {
        // Predeterminado: una palabra exacta de `activacion` (español siempre y la del idioma), como antes.
        if (!patronesActivacion.has(base)) {
            const formas = [IdiomasVoz.es.activacion, IdiomasVoz[base]?.activacion].filter(Boolean);
            patronesActivacion.set(base, new RegExp('^(?:' + formas.join('|') + ')$'));
        }
        const patron = patronesActivacion.get(base);
        for (const inicio of inicios) if (patron.test(letrasActivacion(fragmentos[inicio][0]))) return fin(inicio);
    }
    // Personalizado: sin diacríticos, separadores ni letras repetidas; admite el nombre partido en
    // sílabas («Jar vis», «An n») y una «s» final. Sin ediciones: «bonito» nunca activa a «Benito».
    const letras = fragmentos.map(fragmento => letrasActivacion(fragmento[0])); // Una vez por fragmento.
    const alias = validarAliasActivacion(opciones.aliasActivacion || [], validado.nombre).alias;
    // Los alias también valen con el nombre predeterminado.
    for (const elegido of [...(validado.ok ? [validado.nombre] : []), ...alias]) {
      const objetivo = claveActivacion(elegido);
      const tabla = ParidadVoz.activacion.pronunciaciones[objetivo] || [];
      const admitePerfil = base === 'es' && letrasActivacion(elegido).length >= ParidadVoz.activacion.perfilEspanol.minimoLetras;
      const coincide = clave => clave === objetivo || clave === objetivo + 's' || tabla.includes(clave) ||
          (admitePerfil && perfilEspanol(clave) === perfilEspanol(objetivo));
      const maximoFragmentos = elegido.split(' ').length * ParidadVoz.activacion.fragmentosPorPalabra;
      for (const inicio of inicios) {
        let unidas = '', mejor = -1;
        for (let indice = inicio; indice < fragmentos.length && indice < inicio + maximoFragmentos; indice++) {
            unidas += letras[indice];
            const clave = claveActivacion(unidas);
            if (coincide(clave)) mejor = indice;
            else if (mejor >= 0) break;
        }
        if (mejor >= 0) return fin(mejor);
      }
    }
    return -1;
}
// Confirmación hablada de una acción destructiva: «confirmo …» en cualquiera de los seis idiomas.
const esConfirmacionVoz = texto => Object.values(ParidadVoz.confirmaciones).some(datos => normalizarVoz(texto).startsWith(normalizarVoz(datos.verbo) + ' '));
// Distancia de edición (Levenshtein) con dos filas.
function distanciaEdicion(a, b) {
    let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const fila = [i];
        for (let j = 1; j <= b.length; j++) fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        previa = fila;
    }
    return previa[b.length];
}
// Tolerancia, sólo como respaldo cuando el parser exacto no entendió: corrige el primer token con
// una edición (sin fonética) hacia un verbo benigno del idioma. Devuelve { texto } corregido,
// { repetir: true } si se parece a una orden excluida (cerrar, borrar, enviar…) o null (sin candidato o ambiguo).
function corregirOrden(texto, idioma = 'es') {
    const reglas = ParidadVoz.tolerancia, original = String(texto || '').trim();
    const token = /^\S+/.exec(original)?.[0], palabra = normalizarVoz(token);
    if (!token || palabra.length < reglas.minimoLetras) return null;
    const candidatos = [...(reglas.verbos[String(idioma).slice(0, 2).toLowerCase()] || []).map(verbo => [verbo, false]),
        ...Object.values(reglas.excluidos).flat().map(verbo => [verbo, true])]
        .map(([verbo, excluido]) => ({ verbo, excluido, distancia: distanciaEdicion(palabra, verbo) })).sort((a, b) => a.distancia - b.distancia);
    const excluido = candidatos.find(candidato => candidato.excluido);
    if (excluido.distancia === 0) return null; // Orden exacta: la decide el parser.
    if (excluido.distancia <= reglas.distanciaMaxima) return { repetir: true };
    if (palabrasReservadasActivacion().has(claveActivacion(palabra))) return null; // Palabra conocida: nada que corregir.
    const [mejor, segundo] = candidatos;
    if (mejor.excluido || mejor.distancia > reglas.distanciaMaxima || mejor.verbo.length < reglas.minimoLetras ||
        (segundo && segundo.distancia < reglas.distanciaSegundo)) return null;
    return { texto: mejor.verbo + original.slice(token.length) };
}
// Sitio por tabla cerrada o perfil español acotado (≥5 letras, sin ediciones). Sólo uno; si no, null.
function sitioTolerante(texto, idioma = 'es') {
    const clave = claveActivacion(texto);
    if (String(idioma).slice(0, 2).toLowerCase() !== 'es' || clave.length < ParidadVoz.tolerancia.minimoLetras) return null;
    const perfil = perfilEspanol(clave);
    const hallados = Object.keys(SitiosVoz).filter(sitio => (ParidadVoz.tolerancia.sitios[sitio] || []).includes(clave) ||
        SitiosVoz[sitio].alias.some(alias => perfilEspanol(claveActivacion(alias)) === perfil));
    return hallados.length === 1 ? hallados[0] : null;
}
globalThis.esConfirmacionVoz = esConfirmacionVoz; globalThis.corregirOrden = corregirOrden; globalThis.sitioTolerante = sitioTolerante;
globalThis.validarNombreActivacion = validarNombreActivacion; globalThis.palabraActivacion = palabraActivacion;
globalThis.buscarActivacion = buscarActivacion;
globalThis.validarAliasActivacion = validarAliasActivacion;
})();
