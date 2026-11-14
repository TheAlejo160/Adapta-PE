#!/usr/bin/env node
/*
 * Genera todo lo que depende de datos/tiempos.json. Sin dependencias.
 *
 *   node tools/generar.mjs            escribe datos/tiempos.js, reescribe los
 *                                     bloques GENERADO de index.html y el
 *                                     data-duration de #root; crea escenas y
 *                                     WAV que falten (nunca sobrescribe).
 *   node tools/generar.mjs --check    no escribe nada; sale con 1 si algo está
 *                                     desactualizado (útil antes de render).
 *   node tools/generar.mjs --carve    además ejecuta el carve de voz sobre
 *                                     cada pista de música (hyperframes-audio).
 *
 * Ejecutar desde cualquier carpeta: las rutas se resuelven respecto al proyecto.
 *
 * Qué produce:
 *   datos/tiempos.js     window.TIEMPOS = <tiempos.json> + { fundido }.
 *   index.html           escenas (host por capítulo, solape de FUNDIDO s),
 *                        voz por capítulo, música encadenada con fundidos y
 *                        los hosts de las dos capas globales.
 *   capas/progreso.html  barra de progreso + etiqueta «Capítulo N de M».
 *   capas/subtitulos.html subtítulos (frases largas partidas en bloques
 *                        de ≤ SUB_MAX caracteres, tiempo proporcional).
 *   scenes/capNN-slug.html  placeholder si falta (sólo el título).
 *   assets/audio/capNN.wav  silencio de `duracion` s si falta (ffmpeg).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";

const PROYECTO = join(dirname(fileURLToPath(import.meta.url)), "..");
const ruta = (...p) => join(PROYECTO, ...p);
const args = new Set(process.argv.slice(2));
const COMPROBAR = args.has("--check");

// ── Parámetros del armazón ──
const FUNDIDO = 0.6; // s de solape (crossfade) entre capítulos
const MUSICA = { archivo: "assets/audio/musica.mp3", duracion: 163.96, cruce: 3, nivel: 0.12, entrada: 1.5, salida: 3 };
const SUB_MAX = 84; // caracteres por bloque de subtítulo (≈ 2 líneas a 48 px)

const r3 = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── 1. Leer y validar ──
const T = JSON.parse(readFileSync(ruta("datos/tiempos.json"), "utf8"));
const errores = [];
const avisos = [];
for (const k of ["fps", "ancho", "alto", "capitulos"]) if (!(k in T)) errores.push(`falta la clave «${k}»`);
let esperado = 0;
(T.capitulos || []).forEach((c, i) => {
  for (const k of ["id", "slug", "titulo", "inicio", "duracion", "audio", "frases"]) if (!(k in c)) errores.push(`${c.id || "capítulo " + i}: falta «${k}»`);
  if (!/^cap\d{2}$/.test(c.id)) errores.push(`${c.id}: el id debe ser capNN`);
  if (Math.abs(c.inicio - esperado) > 0.002) avisos.push(`${c.id}: inicio ${c.inicio} ≠ fin del anterior ${r3(esperado)}`);
  esperado = c.inicio + c.duracion;
  let prev = 0;
  for (const f of c.frases || []) {
    if (!(f.fin > f.inicio)) errores.push(`${c.id}/${f.id}: fin ≤ inicio`);
    if (f.inicio < prev - 0.001) avisos.push(`${c.id}/${f.id}: se solapa con la frase anterior (se recorta)`);
    if (f.fin > c.duracion + 0.001) avisos.push(`${c.id}/${f.id}: termina después del capítulo`);
    prev = f.fin;
  }
});
if (errores.length) {
  console.error("tiempos.json no válido:\n  " + errores.join("\n  "));
  process.exit(1);
}
const caps = T.capitulos;
const TOTAL = r3(caps[caps.length - 1].inicio + caps[caps.length - 1].duracion);
const archivoEscena = (c) => `scenes/${c.id}-${c.slug}.html`;

// ── 2. Subtítulos: partir frases largas en bloques legibles ──
function partir(texto) {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= SUB_MAX) return [limpio];
  // Primero por oraciones; luego cada oración larga por comas/dos puntos/palabras.
  // Un punto sólo cierra oración si le sigue un espacio o el final («adaptape.cc» no se parte).
  const oraciones = limpio.match(/.+?(?:[.!?…]+[»"]*(?=\s|$)|$)\s*/g) || [limpio];
  const bloques = [];
  let actual = "";
  for (const o of oraciones.map((x) => x.trim()).filter(Boolean)) {
    if ((actual + " " + o).trim().length <= SUB_MAX) actual = (actual + " " + o).trim();
    else {
      if (actual) bloques.push(actual);
      actual = o;
    }
  }
  if (actual) bloques.push(actual);
  return bloques.flatMap(partirLargo);
}
function partirLargo(b) {
  if (b.length <= SUB_MAX) return [b];
  const medio = b.length / 2;
  let mejor = -1;
  const re = /[,;:]\s|\s(?:y|o|pero|que)\s/g;
  let m;
  while ((m = re.exec(b))) {
    const corte = m.index + (m[0].startsWith(",") || m[0].startsWith(";") || m[0].startsWith(":") ? 1 : 0);
    if (mejor < 0 || Math.abs(corte - medio) < Math.abs(mejor - medio)) mejor = corte;
  }
  if (mejor < b.length * 0.25 || mejor > b.length * 0.75) {
    mejor = b.lastIndexOf(" ", Math.floor(medio));
  }
  return [...partirLargo(b.slice(0, mejor).trim()), ...partirLargo(b.slice(mejor).trim())];
}
function bloquesFrase(f, finMax) {
  const partes = partir(f.texto);
  const fin = Math.min(f.fin, finMax);
  const total = partes.reduce((s, p) => s + p.length + 8, 0);
  let t = f.inicio;
  return partes.map((p, i) => {
    const d = ((fin - f.inicio) * (p.length + 8)) / total;
    const b = { id: partes.length > 1 ? `${f.id}-${i + 1}` : f.id, texto: p, inicio: t, fin: i === partes.length - 1 ? fin : t + d };
    t += d;
    return b;
  });
}

// ── 3. Bloques de index.html ──
const escenas = caps
  .map((c, i) => {
    const ultimo = i === caps.length - 1;
    const dur = r3(c.duracion + (ultimo ? 0 : FUNDIDO));
    return `      <div id="el-${c.id}" data-composition-id="${c.id}" data-composition-src="${archivoEscena(c)}" data-start="${r3(c.inicio)}" data-duration="${dur}" data-track-index="${1 + (i % 2)}" data-width="${T.ancho}" data-height="${T.alto}"></div>`;
  })
  .join("\n");

const voces = caps
  .map(
    (c) =>
      `      <audio id="voz-${c.id}" src="${esc(c.audio)}" data-start="${r3(c.inicio)}" data-duration="${r3(c.duracion)}" data-track-index="10" data-volume="1" data-audio-group="voiceover"></audio>`
  )
  .join("\n");

const lechos = [];
for (let k = 0, s = 0; s < TOTAL; k++, s = k * (MUSICA.duracion - MUSICA.cruce)) {
  const dur = r3(Math.min(MUSICA.duracion, TOTAL - s));
  const ultimo = s + MUSICA.duracion >= TOTAL;
  const sube = k === 0 ? MUSICA.entrada : MUSICA.cruce;
  const puntos = [
    { t: 0, v: 0 },
    { t: sube, v: MUSICA.nivel },
  ];
  if (ultimo) puntos.push({ t: r3(dur - MUSICA.salida), v: MUSICA.nivel }, { t: dur, v: 0 });
  else puntos.push({ t: r3(dur - MUSICA.cruce), v: MUSICA.nivel }, { t: dur, v: 0 });
  const auto = JSON.stringify({ version: 1, lanes: [{ target: "volume", points: puntos }] });
  lechos.push(
    `      <audio id="musica-${k + 1}" src="${MUSICA.archivo}" data-start="${r3(s)}" data-duration="${dur}" data-media-start="0" data-track-index="${11 + (k % 2)}" data-volume="1" data-audio-group="music" data-automation="${esc(auto)}"></audio>`
  );
  if (ultimo) break;
}
const audio = voces + "\n" + lechos.join("\n");

const contenido = caps.slice(1, -1);
const progresoHtml = capa(
  "progreso",
  `      <div id="ap-progreso" class="ap-progreso" data-layout-ignore>
        <div class="ap-progreso-pista">
${caps.map((c) => `          <div class="ap-progreso-seg" style="flex:${r3(c.duracion)}"><div id="ap-prog-${c.id}" class="ap-progreso-relleno"></div></div>`).join("\n")}
        </div>
${contenido
  .map(
    (c, i) =>
      `        <div id="ap-etq-${c.id}" class="ap-progreso-etiqueta clip" data-start="${r3(c.inicio)}" data-duration="${r3(c.duracion)}" data-track-index="1">Capítulo ${i + 1} de ${contenido.length} · <b>${esc(c.titulo)}</b></div>`
  )
  .join("\n")}
      </div>`,
  `          // Cada segmento se llena durante su capítulo.
          T.capitulos.forEach((c) => {
            tl.fromTo("#ap-prog-" + c.id, { scaleX: 0 }, { scaleX: 1, duration: c.duracion, ease: "none" }, c.inicio);
          });
          // Oculta durante la intro y el cierre.
          const caps = T.capitulos;
          if (caps.length > 2) {
            tl.fromTo("#ap-progreso", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.out" }, caps[1].inicio);
            tl.to("#ap-progreso", { opacity: 0, duration: 0.6, ease: "power1.in" }, caps[caps.length - 1].inicio);
          }`
);

const subs = [];
for (const c of caps) {
  c.frases.forEach((f, i) => {
    const sig = c.frases[i + 1];
    const finMax = Math.min(c.duracion, sig ? sig.inicio : c.duracion);
    for (const b of bloquesFrase(f, finMax)) {
      const ini = r3(c.inicio + b.inicio);
      const dur = r3(b.fin - b.inicio);
      if (b.texto.length > SUB_MAX) avisos.push(`${c.id}/${b.id}: bloque de subtítulo largo (${b.texto.length} car.)`);
      subs.push(`        <div id="sub-${c.id}-${b.id}" class="ap-sub clip" data-start="${ini}" data-duration="${dur}" data-track-index="1"><span>${esc(b.texto)}</span></div>`);
    }
  });
}
const subtitulosHtml = capa(
  "subtitulos",
  `      <div id="ap-subs" class="ap-subs" data-layout-allow-caption-zone data-layout-allow-overlap>
${subs.join("\n")}
      </div>`,
  `          // Cada bloque ya es un clip temporizado; sólo un fundido breve al entrar.
          document.querySelectorAll("#ap-subs .ap-sub").forEach((el) => {
            const t0 = parseFloat(el.getAttribute("data-start"));
            tl.fromTo(el.firstElementChild, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.15, ease: "power1.out" }, t0);
          });`
);

const capas = ["progreso", "subtitulos"]
  .map(
    (n, i) =>
      `      <div id="el-${n}" data-composition-id="${n}" data-composition-src="capas/${n}.html" data-start="0" data-duration="${TOTAL}" data-track-index="${20 + i}" data-width="${T.ancho}" data-height="${T.alto}"></div>`
  )
  .join("\n");

function capa(id, cuerpo, animacion) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Capa ${id}</title>
  </head>
  <body>
    <!-- Generado por tools/generar.mjs desde datos/tiempos.json. No editar a mano. -->
    <template>
      <style>
        #${id}-raiz {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
      </style>
      <div id="${id}-raiz" data-composition-id="${id}" data-width="${T.ancho}" data-height="${T.alto}">
${cuerpo}
      </div>
      <script>
        (function () {
          const T = window.TIEMPOS;
          const tl = gsap.timeline({ paused: true });
${animacion}
          window.__timelines["${id}"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
}

// ── 4. Reescribir archivos ──
function reemplazarBloque(html, nombre, cuerpo) {
  const re = new RegExp(`(<!-- GENERADO:${nombre} -->)[\\s\\S]*?(\\n\\s*<!-- /GENERADO:${nombre} -->)`);
  if (!re.test(html)) throw new Error(`index.html: faltan los marcadores GENERADO:${nombre}`);
  return html.replace(re, `$1\n${cuerpo}$2`);
}
let index = readFileSync(ruta("index.html"), "utf8");
const indexOriginal = index;
index = reemplazarBloque(index, "escenas", escenas);
index = reemplazarBloque(index, "audio", audio);
index = reemplazarBloque(index, "capas", capas);
// Studio puede añadir atributos (data-hf-id) antes de id="root"; no depender de su orden.
index = index.replace(/(<div\b[^>]*\bid="root"[^>]*\bdata-duration=")[^"]*(")/, `$1${TOTAL}$2`);

const tiemposJs =
  "/* Generado por tools/generar.mjs desde datos/tiempos.json. No editar a mano. */\n" +
  "window.TIEMPOS = " +
  JSON.stringify(Object.assign({}, T, { fundido: FUNDIDO }), null, 1) +
  ";\n";

const pendientes = [];
const escribir = (rel, texto) => {
  const p = ruta(rel);
  const viejo = existsSync(p) ? readFileSync(p, "utf8") : null;
  if (viejo === texto) return;
  pendientes.push(rel);
  if (!COMPROBAR) writeFileSync(p, texto);
};
escribir("datos/tiempos.js", tiemposJs);
mkdirSync(ruta("capas"), { recursive: true });
escribir("capas/progreso.html", progresoHtml);
escribir("capas/subtitulos.html", subtitulosHtml);
if (index !== indexOriginal) {
  pendientes.push("index.html");
  if (!COMPROBAR) writeFileSync(ruta("index.html"), index);
}

// Escenas y audio que falten: se crean, nunca se sobrescriben.
caps.forEach((c, i) => {
  const rel = archivoEscena(c);
  if (!existsSync(ruta(rel))) {
    pendientes.push(rel + " (nueva)");
    if (!COMPROBAR) {
      mkdirSync(ruta("scenes"), { recursive: true });
      writeFileSync(ruta(rel), placeholder(c, i, caps.length));
    }
  }
  if (!existsSync(ruta(c.audio))) {
    pendientes.push(c.audio + " (silencio)");
    if (!COMPROBAR) {
      mkdirSync(dirname(ruta(c.audio)), { recursive: true });
      execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", String(c.duracion), ruta(c.audio)]);
    }
  }
});

// Carve opcional: la música deja sitio a la voz en las bandas que ésta ocupa.
if (args.has("--carve") && !COMPROBAR) {
  const carve = process.env.HF_CARVE || join(homedir(), ".claude/skills/hyperframes-audio/scripts/carve.mjs");
  for (const l of lechos) {
    const id = l.match(/id="(musica-\d+)"/)[1];
    execFileSync("node", [carve, "--comp", ruta("index.html"), "--bed", id, "--voice", "voiceover"], { stdio: "inherit" });
  }
}

for (const a of avisos) console.warn("aviso: " + a);
if (COMPROBAR) {
  if (pendientes.length) {
    console.error("Desactualizado: " + pendientes.join(", ") + "\nEjecuta: node tools/generar.mjs");
    process.exit(1);
  }
  console.log("Al día.");
} else {
  console.log(`${caps.length} capítulos · ${TOTAL} s · ${subs.length} subtítulos · ${lechos.length} pistas de música`);
  console.log(pendientes.length ? "Escrito: " + pendientes.join(", ") : "Sin cambios.");
}

// ── Placeholder de escena (los constructores lo reemplazan) ──
function placeholder(c, i, n) {
  const numero = i === 0 || i === n - 1 ? "" : String(i);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${esc(c.titulo)} (placeholder)</title>
  </head>
  <body>
    <!-- PLACEHOLDER generado por tools/generar.mjs. Sustitúyelo copiando scenes/_plantilla.html. -->
    <template>
      <style>
        #${c.id}-raiz {
          position: absolute;
          inset: 0;
        }
      </style>
      <div id="${c.id}-raiz" class="ap-escena" data-composition-id="${c.id}" data-width="1920" data-height="1080"></div>
      <script>
        (function () {
          const ID = "${c.id}";
          const cap = AP.capitulo(ID);
          const raiz = document.getElementById(ID + "-raiz");
          const tl = gsap.timeline({ paused: true });
          AP.ambiente(tl, raiz, { duracion: cap.duracion, semilla: ${i + 1} });
          AP.tituloCapitulo(tl, raiz, { id: ID + "-titulo", numero: "${numero}", titulo: cap.titulo, entrada: 0.3 });
          window.__timelines[ID] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
}
