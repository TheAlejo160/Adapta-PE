// Genera la narración a partir de guion.json con Gemini TTS ("motor": "gemini") o la voz de macOS ("motor": "say").
// Uso: node tools/narrar.mjs [--muestra] [capNN ...]   (sin capítulos: todos)
//   --muestra: sólo sintetiza la primera frase de cada voz de guion.muestras en muestras-voz/ y termina.
// Escribe composition/assets/audio/capNN.wav y composition/datos/tiempos.json.
// Gemini lee GEMINI_API_KEY o GOOGLE_API_KEY del entorno o de tutorial-video/.env (nunca se imprime).
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const guion = JSON.parse(fs.readFileSync(path.join(raiz, 'guion.json'), 'utf8'));
const dirAudio = path.join(raiz, 'composition/assets/audio');
const rutaTiempos = path.join(raiz, 'composition/datos/tiempos.json');
const cache = path.join(raiz, '.cache-voz');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'narrar-'));
for (const d of [dirAudio, path.dirname(rutaTiempos), cache]) fs.mkdirSync(d, { recursive: true });

const MOTOR = guion.motor || 'say';
const VOZ = MOTOR === 'gemini' ? (guion.vozGemini || 'Laomedeia') : (guion.voz || 'Paulina');
const ESTILO = guion.estilo || '';
const MODELO = guion.modeloGemini || 'gemini-3.8-flash-tts';
const VELOCIDAD = String(guion.palabrasPorMinuto || 165);
const PAUSA = guion.pausa ?? 0.45;          // silencio entre frases (s)
const MARGEN_INICIO = guion.margenInicio ?? 0.6;
const MARGEN_FIN = guion.margenFin ?? 1.0;
// Pronunciación: el subtítulo muestra «texto», la voz lee «habla» o el texto con estas sustituciones.
const mapa = (MOTOR === 'gemini' ? guion.pronunciacionGemini : guion.pronunciacion) || {};
const pronunciar = t => Object.entries(mapa).reduce((s, [a, b]) => s.split(a).join(b), t);

const duracion = f => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const silencio = (s, f) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', s.toFixed(3), '-c:a', 'pcm_s16le', f]);

let synthesizeGemini;
if (MOTOR === 'gemini') {
  const env = path.join(raiz, '.env');
  if (fs.existsSync(env)) for (const l of fs.readFileSync(env, 'utf8').split('\n')) {
    const m = l.match(/^\s*(GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*"?([^"\s]+)"?/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    console.error('Falta GEMINI_API_KEY (entorno o tutorial-video/.env).'); process.exit(1);
  }
  ({ synthesizeGemini } = await import(pathToFileURL(path.join(os.homedir(), '.claude/skills/media-use/audio/scripts/lib/gemini-tts.mjs'))));
}

// Sintetiza una frase a WAV 48 kHz mono sin silencios en los extremos. Gemini se cachea por contenido.
async function sintetizar(texto, salida, voz = VOZ) {
  if (MOTOR !== 'gemini') {
    const aiff = salida.replace(/\.wav$/, '.aiff');
    execFileSync('say', ['-v', voz, '-r', VELOCIDAD, '-o', aiff, texto]);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', aiff, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', salida]);
    return;
  }
  const clave = crypto.createHash('sha1').update([MODELO, voz, ESTILO, texto].join('\n')).digest('hex');
  const guardado = path.join(cache, `${clave}.wav`);
  if (!fs.existsSync(guardado)) {
    let r;
    for (let intento = 1; intento <= 8; intento++) {
      r = await synthesizeGemini({ text: texto, voiceId: voz, model: MODELO, style: ESTILO, wavAbs: guardado + '.tmp' });
      if (r.ok) break;
      // Nivel gratuito: 3 peticiones/min; respeta el «retry in Ns» que devuelve la API.
      const espera = Number(/retry in (\d+(?:\.\d+)?)s/i.exec(r.error || '')?.[1] || 5 * intento);
      console.log(`  reintento en ${Math.ceil(espera + 1)} s (${(r.error || '').slice(0, 60)})`);
      await new Promise(ok => setTimeout(ok, (espera + 1) * 1000));
    }
    if (!r.ok) throw new Error(`Gemini falló en «${texto.slice(0, 40)}…»: ${r.error}`);
    fs.renameSync(guardado + '.tmp', guardado);
  }
  // Recorta silencio inicial/final (umbral −45 dB) para que las pausas las controle el guion.
  const filtro = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse';
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', guardado, '-af', filtro, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', salida]);
}

// Devuelve los n−1 silencios que separan las n frases: cerca de la posición esperada por longitud de texto,
// prefiriendo pausas largas y en orden. Avisa si una frase queda con un ritmo anómalo.
function ubicarFrases(wav, total, largos) {
  if (largos.length < 2) return [];
  // silencedetect escribe en stderr.
  const texto = spawnSync('ffmpeg', ['-hide_banner', '-i', wav, '-af', 'silencedetect=noise=-38dB:d=0.18', '-f', 'null', '-']).stderr.toString();
  const silencios = [];
  for (const m of texto.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) silencios.push({ inicio: +m[1], fin: +m[2] });
  const suma = largos.reduce((a, b) => a + b, 0);
  const elegidos = [];
  let acum = 0, minimo = 0;
  for (let k = 0; k < largos.length - 1; k++) {
    acum += largos[k];
    const esperado = total * acum / suma;
    const quedan = largos.length - 2 - k;
    const candidatos = silencios.filter((s, i) => s.inicio > minimo && silencios.length - 1 - i >= quedan);
    if (!candidatos.length) throw new Error(`No encontré pausa para la frase ${k + 2} en ${path.basename(wav)}`);
    const mejor = candidatos.reduce((a, s) => {
      const puntaje = (s.fin - s.inicio) * 3 - Math.abs((s.inicio + s.fin) / 2 - esperado);
      return puntaje > a.puntaje ? { s, puntaje } : a;
    }, { puntaje: -Infinity }).s;
    elegidos.push(mejor); minimo = mejor.fin;
  }
  const ritmoMedio = suma / total;
  elegidos.concat([{ inicio: total, fin: total }]).forEach((s, i) => {
    const desde = i ? elegidos[i - 1].fin : 0;
    const r = largos[i] / Math.max(0.1, s.inicio - desde) / ritmoMedio;
    if (r < 0.6 || r > 1.6) console.log(`  aviso: frase ${i + 1} con ritmo ${r.toFixed(2)}× (revisar corte)`);
  });
  return elegidos;
}

// Ejecuta tareas con un máximo de n en paralelo, conservando el orden.
async function enParalelo(tareas, n = 4) {
  const res = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < tareas.length) { const k = i++; res[k] = await tareas[k](); } }));
  return res;
}

if (process.argv.includes('--muestra')) {
  const dir = path.join(raiz, 'muestras-voz');
  const texto = pronunciar(guion.capitulos[0].frases.map(f => f.habla || f.texto).join(' '));
  for (const voz of guion.muestras || [VOZ]) {
    await sintetizar(texto, path.join(dir, `gemini_${voz}.wav`), voz);
    console.log(`muestras-voz/gemini_${voz}.wav`);
  }
  process.exit(0);
}

const anterior = fs.existsSync(rutaTiempos) ? JSON.parse(fs.readFileSync(rutaTiempos, 'utf8')) : null;
const pedidos = new Set(process.argv.slice(2).filter(a => !a.startsWith('--')));
const capitulos = [];
let inicio = 0;
for (const cap of guion.capitulos) {
  const previo = anterior?.capitulos?.find(c => c.id === cap.id);
  let frases, dur;
  if (pedidos.size && !pedidos.has(cap.id) && previo) {
    ({ frases, duracion: dur } = previo);
  } else if (MOTOR === 'gemini') {
    // Un audio por capítulo (fluidez natural y menos peticiones); las frases se ubican en sus pausas.
    const bruto = path.join(tmp, `${cap.id}-bruto.wav`);
    // Audio descargado a mano desde AI Studio (voz-ai-studio/capNN.wav|mp3) tiene prioridad sobre la API.
    const manual = ['wav', 'mp3', 'm4a'].map(e => path.join(raiz, 'voz-ai-studio', `${cap.id}.${e}`)).find(f => fs.existsSync(f));
    if (manual) {
      const filtro = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse';
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', manual, '-af', filtro, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', bruto]);
    } else await sintetizar(cap.frases.map(f => pronunciar(f.habla || f.texto)).join('\n\n'), bruto);
    const total = duracion(bruto);
    const limites = ubicarFrases(bruto, total, cap.frases.map(f => pronunciar(f.habla || f.texto).length));
    const s0 = path.join(tmp, `${cap.id}-s0.wav`); silencio(MARGEN_INICIO, s0);
    const sf = path.join(tmp, `${cap.id}-sf.wav`); silencio(MARGEN_FIN, sf);
    frases = cap.frases.map((f, i) => ({
      id: f.id || `f${i + 1}`, texto: f.texto,
      inicio: +(MARGEN_INICIO + (i ? limites[i - 1].fin : 0)).toFixed(3),
      fin: +(MARGEN_INICIO + (i < limites.length ? limites[i].inicio : total)).toFixed(3),
      ...(f.visual ? { visual: f.visual } : {}),
    }));
    const lista = path.join(tmp, `${cap.id}.txt`);
    fs.writeFileSync(lista, [s0, bruto, sf].map(p => `file '${p}'`).join('\n'));
    const salida = path.join(dirAudio, `${cap.id}.wav`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', salida]);
    dur = +duracion(salida).toFixed(3);
    console.log(`${cap.id} ${dur.toFixed(1)} s  ${cap.frases.length} frases`);
  } else {
    const wavs = await enParalelo(cap.frases.map((f, i) => async () => {
      const wav = path.join(tmp, `${cap.id}-${i}.wav`);
      await sintetizar(pronunciar(f.habla || f.texto), wav);
      return wav;
    }));
    const piezas = [];
    frases = [];
    let t = MARGEN_INICIO;
    const s0 = path.join(tmp, `${cap.id}-s0.wav`); silencio(MARGEN_INICIO, s0); piezas.push(s0);
    cap.frases.forEach((f, i) => {
      const d = duracion(wavs[i]);
      frases.push({ id: f.id || `f${i + 1}`, texto: f.texto, inicio: +t.toFixed(3), fin: +(t + d).toFixed(3), ...(f.visual ? { visual: f.visual } : {}) });
      piezas.push(wavs[i]); t += d;
      const pausa = (i < cap.frases.length - 1) ? (f.pausa ?? PAUSA) : MARGEN_FIN;
      const sp = path.join(tmp, `${cap.id}-p${i}.wav`); silencio(pausa, sp); piezas.push(sp); t += pausa;
    });
    const lista = path.join(tmp, `${cap.id}.txt`);
    fs.writeFileSync(lista, piezas.map(p => `file '${p}'`).join('\n'));
    const salida = path.join(dirAudio, `${cap.id}.wav`);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', salida]);
    dur = +duracion(salida).toFixed(3);
    console.log(`${cap.id} ${dur.toFixed(1)} s  ${cap.frases.length} frases`);
  }
  capitulos.push({ id: cap.id, slug: cap.slug, titulo: cap.titulo, inicio: +inicio.toFixed(3), duracion: dur, audio: `assets/audio/${cap.id}.wav`, frases });
  inicio += dur;
}
fs.writeFileSync(rutaTiempos, JSON.stringify({ fps: 30, ancho: 1920, alto: 1080, capitulos }, null, 1) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Total ${(inicio / 60).toFixed(2)} min`);
