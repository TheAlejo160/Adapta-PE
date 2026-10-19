# Catálogo de referencia para aplicaciones nativas

`nativo-v1.json` se genera desde las fuentes comunes de Base 13.0 y Lite 3.0. Incluye los seis idiomas, activación, reglas ordenadas, voces sugeridas, sitios, textos de voz/páginas/mascotas y 36 casos de texto. No contiene código de navegador, modelos, audio ni datos de personas usuarias. Conserva autoría y licencia del origen; no cambia los derechos de distribución.

Desde cada extensión:

```sh
node tools/exportar-catalogo.cjs
node tools/exportar-catalogo.cjs --check
```

Desde Base, `node tests/catalogo.test.cjs` comprueba las dos exportaciones, las reglas, las variables de traducción y los casos. La generación es determinista, sin fecha variable ni dependencias. Los SHA256 identifican las fuentes y los casos. No son una firma de confianza.

## Contrato v1

- `schemaVersion`: 1. Cambiarlo si cambia la estructura del contrato.
- `origen`: autor, licencia, versiones de referencia y hashes de las fuentes exportadas. La ruta de VoiceAssistant se normaliza a `asistente/` para comparar Base y Lite.
- `codigos`, `idiomas`, `sitios`: datos de `sitios.js`. Una expresión regular se transporta como `{ "patron": "...", "flags": "..." }`; `frases` conserva el orden de evaluación y los reemplazos `$n`.
- `textos`: registros comunes de `voz`, `paginas` y `mascota`, agrupados por idioma. Las variables `{nombre}` conservan sus nombres entre idiomas. No incluye textos exclusivos de los motores Base ni todos los avisos de los controladores.
- `casos`: idioma, texto de entrada y orden canónica esperada. Son ejemplos sintéticos para probar un parser, no grabaciones ni medidas de precisión acústica.

El exportador evalúa sólo fuentes locales del proyecto y corta cada módulo al registrar sus textos, antes de inicializar el navegador. No es un ejecutor de archivos externos ni un sandbox de seguridad.

## Uso en escritorio

El consumidor nativo todavía está pendiente. Este archivo no activa seis idiomas en macOS/Windows. El adaptador deberá validar versión, campos, límites y compatibilidad de las expresiones con su motor; traducir intenciones y conservar literalmente nombres, consultas y dictado. Las regex JavaScript no se consideran automáticamente equivalentes a ICU o .NET.

El JSON compartido no concede capacidades: Lite continúa sin cámara/cursor/TalkBack aunque una regla o una ayuda común los mencione. Las acciones requieren el catálogo permitido por cada edición y las protecciones del ejecutor nativo. Una voz o un reconocedor sugerido en los datos no acredita disponibilidad en un equipo.
