// Grupo de filtros de daltonismo con muestra de color: lo usan el panel y el tutorial (idéntico en Base y Lite).
// Son radios nativos: las flechas mueven y eligen, y sólo hay un filtro a la vez. El valor es la clave `daltonismo`.
const FiltrosColor = [
    ['ninguno', 'popup.sinFiltro', null, 'todos'],
    ['deuteranomalia', 'popup.deuteranomalia', 'popup.grupoRojoVerde', 'rojo-verde'],
    ['protanomalia', 'popup.protanomalia', 'popup.grupoRojoVerde', 'rojo-verde'],
    ['deuteranopia', 'popup.deuteranopia', 'popup.grupoRojoVerde', 'rojo-verde'],
    ['protanopia', 'popup.protanopia', 'popup.grupoRojoVerde', 'rojo-verde'],
    ['tritanomalia', 'popup.tritanomalia', 'popup.grupoAzulAmarillo', 'azul-amarillo'],
    ['tritanopia', 'popup.tritanopia', 'popup.grupoAzulAmarillo', 'azul-amarillo'],
    ['acromatopsia', 'popup.acromatopsia', 'popup.grupoGrises', 'grises']
];
const FiltrosUI = {
    montar(grupo) {
        // Sólo claves y valores fijos: no entra texto de la web ni del usuario.
        grupo.innerHTML = FiltrosColor.map(([valor, clave, claveGrupo, muestra]) =>
            `<label class="filtro-opcion"><input type="radio" name="daltonismo" value="${valor}">` +
            `<span class="filtro-muestra" data-muestra="${muestra}" aria-hidden="true"></span>` +
            `<span><strong data-i18n="${clave}"></strong>${claveGrupo ? `<small data-i18n="${claveGrupo}"></small>` : ''}</span></label>`).join('');
        TextosAdapta.traducirDocumento(grupo, variablesPagina());
    },
    valor: grupo => grupo.querySelector('input:checked')?.value || 'ninguno',
    // Un valor desconocido guardado equivale a «Sin filtro».
    poner(grupo, valor) { ([...grupo.querySelectorAll('input')].find(radio => radio.value === valor) || grupo.querySelector('input[value="ninguno"]')).checked = true; },
    nombre: grupo => grupo.querySelector('input:checked')?.closest('label').querySelector('strong').textContent || ''
};
