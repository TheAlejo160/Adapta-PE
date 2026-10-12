const STATES = ['idle', 'look', 'sleep', 'wake', 'read', 'phone', 'scratch', 'talk', 'laptop', 'confused', 'happy', 'wave'];
const ONE_SHOTS = ['scratch', 'happy', 'wave'];
const MASCOT_LABELS = {
  cuy: 'Cuy de AdaptaPE', gallito: 'Gallito de las rocas de AdaptaPE', llama: 'Llama de AdaptaPE',
};
const LABELS = {
  idle: 'en descanso', look: 'siguiendo el cursor', sleep: 'durmiendo', wake: 'despertando',
  read: 'leyendo', phone: 'usando un teléfono', scratch: 'rascándose', talk: 'hablando',
  laptop: 'usando una computadora', confused: 'no entendió el comando', happy: 'celebrando', wave: 'saludando',
};

function numberInRange(value, name, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} debe ser un número entre ${minimum} y ${maximum}.`);
  }
  return value;
}

function motionPreference(value) {
  if (value !== 'system' && typeof value !== 'boolean') {
    throw new TypeError('reducedMotion debe ser "system", true o false.');
  }
  return value;
}

function validateState(state) {
  if (!STATES.includes(state)) throw new TypeError(`Estado desconocido: ${String(state)}.`);
}

function validateAtlas(atlas) {
  const width = atlas?.frameSize?.w;
  const height = atlas?.frameSize?.h;
  const sheetWidth = atlas?.meta?.size?.w;
  const sheetHeight = atlas?.meta?.size?.h;
  for (const [name, value] of Object.entries({width, height, sheetWidth, sheetHeight})) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 32768) {
      throw new Error(`Atlas inválido: ${name}.`);
    }
  }
  if (typeof atlas.meta.image !== 'string' || !atlas.meta.image) {
    throw new Error('Atlas inválido: falta meta.image.');
  }
  for (const state of STATES) {
    const animation = atlas.animations?.[state];
    if (!animation || !['entry', 'loop', 'exit'].every(phase => Array.isArray(animation[phase]))) {
      throw new Error(`Atlas inválido: falta animación ${state}.`);
    }
    const keys = [...animation.entry, ...animation.loop, ...animation.exit];
    if (!keys.length || (state !== 'wake' && !animation.loop.length) ||
        (state === 'wake' && (!animation.entry.length || animation.loop.length))) {
      throw new Error(`Atlas inválido: ${state} no tiene frames reproducibles.`);
    }
    for (const key of keys) {
      const item = atlas.frames?.[key];
      const frame = item?.frame;
      if (typeof key !== 'string' || !frame || frame.w !== width || frame.h !== height ||
          !Number.isSafeInteger(frame.x) || !Number.isSafeInteger(frame.y) ||
          frame.x < 0 || frame.y < 0 || frame.x + width > sheetWidth || frame.y + height > sheetHeight ||
          !Number.isFinite(item.duration) || item.duration < 16 || item.duration > 10000) {
        throw new Error(`Atlas inválido: frame ${String(key)}.`);
      }
    }
  }
  const look = atlas.animations.look;
  if (look.loop.length !== 9 || !Array.isArray(look.directions) || look.directions.length !== 9 ||
      !look.directions.every(direction => Array.isArray(direction) && direction.length === 2 &&
        direction.every(value => [-1, 0, 1].includes(value))) ||
      new Set(look.directions.map(direction => direction.join(','))).size !== 9) {
    throw new Error('Atlas inválido: look requiere nueve direcciones distintas.');
  }
  return atlas;
}

/** Crea una mascota aislada, sin dependencias ni efectos al importar el módulo. */
export async function createCuy(target, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options debe ser un objeto.');
  }
  const document = typeof target === 'object' && target ? target.ownerDocument : globalThis.document;
  if (!document?.createElement) throw new Error('createCuy requiere un navegador con DOM.');
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  const window = document.defaultView;
  if (!container || container.nodeType !== 1 || typeof container.append !== 'function' || !window) {
    throw new TypeError('target debe ser un elemento HTML o un selector existente.');
  }
  let size = numberInRange(options.size ?? 192, 'size', 16, 2048);
  let playbackRate = numberInRange(options.playbackRate ?? 1, 'playbackRate', 0.5, 1.5);
  let followCursor = options.followCursor ?? true;
  if (typeof followCursor !== 'boolean') throw new TypeError('followCursor debe ser booleano.');
  let preference = motionPreference(options.reducedMotion ?? 'system');
  const label = options.label ?? 'Cuy de AdaptaPE';
  if (typeof label !== 'string' || !label.trim() || label.length > 256) {
    throw new TypeError('label debe ser texto de 1 a 256 caracteres.');
  }
  const assetBase = options.assetBaseURL ?? new URL('../assets/', import.meta.url);
  if (typeof assetBase !== 'string' && !(assetBase instanceof URL)) {
    throw new TypeError('assetBaseURL debe ser una URL o texto.');
  }
  const base = new URL(String(assetBase), document.baseURI);
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const atlasURL = new URL('cuy.json', base);
  let atlas;
  let image;
  try {
    const response = await (window.fetch?.bind(window) ?? globalThis.fetch)(atlasURL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    atlas = validateAtlas(await response.json());
    image = await new Promise((resolve, reject) => {
      const sprite = new window.Image();
      sprite.onload = () => { sprite.onload = sprite.onerror = null; resolve(sprite); };
      sprite.onerror = () => { sprite.onload = sprite.onerror = null; reject(new Error(`No se pudo cargar ${atlas.meta.image}.`)); };
      sprite.src = new URL(atlas.meta.image, base).href;
    });
    // Decodificar fuera del hilo principal: el primer drawImage no bloquea la página.
    await image.decode?.().catch(() => {});
    if (image.naturalWidth !== atlas.meta.size.w || image.naturalHeight !== atlas.meta.size.h) {
      throw new Error('Las dimensiones de cuy-atlas.png no coinciden con cuy.json.');
    }
  } catch (error) {
    throw new Error(`No se pudieron cargar los sprites desde ${atlasURL.href}: ${error.message}`, {cause: error});
  }

  const element = document.createElement('div');
  element.className = 'adaptape-cuy';
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', label);
  const shadow = element.attachShadow({mode: 'open'});
  const style = document.createElement('style');
  style.textContent = `
    :host { display: inline-block; position: relative; vertical-align: bottom; isolation: isolate; }
    canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
    .bubble { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      box-sizing: border-box; width: max-content; max-width: min(280px, 80vw); padding: 10px 14px;
      border: 2px solid #10182e; border-radius: 12px; background: #fff9ed; color: #10182e;
      font: 500 14px/1.4 system-ui, sans-serif; overflow-wrap: anywhere; pointer-events: none; }
    .bubble[hidden] { display: none; }
    .sleep { position: absolute; top: 10%; right: 14%; color: #24506f; font: 900 18px/1 monospace;
      letter-spacing: -2px; text-shadow: 1px 1px 0 #fff9ed; pointer-events: none; user-select: none; }
    .sleep[hidden] { display: none; }
  `;
  const canvas = document.createElement('canvas');
  canvas.width = atlas.frameSize.w;
  canvas.height = atlas.frameSize.h;
  canvas.setAttribute('part', 'sprite');
  canvas.setAttribute('role', 'img');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Este navegador no permite dibujar la mascota en Canvas 2D.');
  context.imageSmoothingEnabled = false;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.setAttribute('part', 'bubble');
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  bubble.setAttribute('aria-atomic', 'true');
  bubble.hidden = true;
  const sleepIndicator = document.createElement('div');
  sleepIndicator.className = 'sleep';
  sleepIndicator.textContent = 'Zzz';
  sleepIndicator.setAttribute('part', 'sleep-indicator');
  sleepIndicator.setAttribute('aria-hidden', 'true');
  sleepIndicator.hidden = true;
  shadow.append(style, canvas, bubble, sleepIndicator);

  const listeners = new Map(['statechange', 'error', 'frame'].map(event => [event, new Set()]));
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = preference === 'system' ? media.matches : preference;
  let state = 'idle';
  let phase = 'loop';
  let position = 0;
  let elapsed = 0;
  let exitSequence = null;
  let motionTime = 0;
  let pending = null;
  let feedback = null;
  let destroyed = false;
  let paused = false;
  let animationFrame = null;
  let espera = null;
  let miradaPendiente = false;
  let lastTime = null;
  let clockRevision = 0;
  let drawnFrame = null;
  let drawnBreath = 0;
  let frameIndex = 0;
  const gaze = {x: 0, y: 0, targetX: 0, targetY: 0, directionX: 0, directionY: 0,
    clientX: null, clientY: null, active: false, returning: false};

  function assertAlive() {
    if (destroyed) throw new Error('La mascota fue destruida. Crea otra instancia con createCuy.');
  }

  function emit(event, payload) {
    for (const callback of [...listeners.get(event)]) {
      try { callback(payload); }
      catch (error) {
        if (event !== 'error') emit('error', error);
        else window.console?.error(error);
      }
    }
  }

  function clearFeedback() {
    if (feedback) { const old = feedback; feedback = null; old.resolve(); }
    bubble.hidden = true;
    bubble.textContent = '';
  }

  function sequence() { return exitSequence ?? atlas.animations[state][phase]; }

  function setPhase(next, keys = null) { phase = next; position = 0; elapsed = 0; exitSequence = keys; }

  function startState(next, resolve) {
    const previousState = state;
    state = next;
    motionTime = 0;
    if (!['idle', 'look'].includes(state)) {
      gaze.x = gaze.y = gaze.directionX = gaze.directionY = 0;
    } else refreshGaze();
    setPhase(atlas.animations[state].entry.length ? 'entry' : 'loop');
    canvas.setAttribute('aria-label', `${label}: ${LABELS[state]}`);
    if (previousState !== state) emit('statechange', {state, previousState});
    resolve?.();
  }

  function finishState() {
    if (pending) {
      const request = pending;
      pending = null;
      startState(request.state, request.resolve);
    } else startState('idle');
  }

  function leaveState() {
    if (state === 'sleep') {
      if (pending?.state === 'wake') {
        const request = pending;
        pending = null;
        startState('wake', request.resolve);
      } else startState('wake');
    }
    else if (atlas.animations[state].exit.length) {
      const animation = atlas.animations[state];
      const current = sequence()[position].match(/^(.*?)(\d+)$/);
      const end = animation.exit[0].match(/^(.*?)(\d+)$/);
      const bridge = [];
      if (phase === 'loop' && current && end && current[1] === end[1]) {
        for (let index = Number(current[2]) + 1; index < Number(end[2]); index += 1) {
          const key = `${current[1]}${String(index).padStart(current[2].length, '0')}`;
          if (!animation.loop.includes(key)) break;
          bridge.push(key);
        }
      }
      setPhase('exit', [...bridge, ...animation.exit]);
    }
    else finishState();
  }

  function advanceFrame() {
    if (pending && phase === 'entry' && state !== 'wake') {
      const reverse = sequence().slice(0, position).reverse();
      if (state === 'sleep' && pending.state === 'wake') pending.state = 'idle';
      if (reverse.length) setPhase('exit', reverse);
      else finishState();
      return;
    }
    if (pending && phase === 'loop') { leaveState(); return; }
    if (ONE_SHOTS.includes(state) && phase === 'loop' &&
        Number(sequence()[position].match(/\d+$/)?.[0]) + 1 === Number(atlas.animations[state].exit[0]?.match(/\d+$/)?.[0])) {
      leaveState();
      return;
    }
    position += 1;
    if (position < sequence().length) return;
    if (phase === 'exit' || (state === 'wake' && phase === 'entry')) finishState();
    else if (ONE_SHOTS.includes(state) && phase === 'loop') { position -= 1; leaveState(); }
    else if (phase === 'entry') setPhase('loop');
    else position = 0;
  }

  function visibleKey() {
    const animation = atlas.animations[state];
    const direction = reduced ? [0, 0] : [gaze.directionX, gaze.directionY];
    if (state === 'look' || (state === 'idle' && gaze.active && !reduced)) {
      const index = atlas.animations.look.directions.findIndex(([x, y]) => x === direction[0] && y === direction[1]);
      return atlas.animations.look.loop[index];
    }
    if (reduced) return animation.loop[Math.floor(animation.loop.length / 2)] ?? animation.entry.at(-1);
    return sequence()[position];
  }

  function draw() {
    if (destroyed) return;
    sleepIndicator.hidden = state !== 'sleep' || phase !== 'loop' || !bubble.hidden;
    sleepIndicator.style.transform = reduced ? 'none' : `translateY(-${Math.floor(motionTime / 550) % 3}px)`;
    const key = visibleKey();
    const directed = state === 'look' || (state === 'idle' && gaze.active);
    const breath = directed && !reduced && motionTime % 2400 >= 800 && motionTime % 2400 < 1600 ? 1 : 0;
    if (key === drawnFrame && breath === drawnBreath) return;
    const {x, y, w, h} = atlas.frames[key].frame;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, x, y, w, h, 0, breath, w, h - breath);
    canvas.setAttribute('data-frame', key);
    drawnFrame = key;
    drawnBreath = breath;
    frameIndex = Number(key.match(/\d+$/)?.[0] ?? position);
    emit('frame', {state, frame: key, frameIndex});
  }

  function shouldRun() {
    return !destroyed && !paused && !document.hidden &&
      (!reduced || phase !== 'loop' || ONE_SHOTS.includes(state) || pending !== null || feedback !== null);
  }

  function schedule() {
    if (!shouldRun()) { lastTime = null; return; }
    if (animationFrame !== null || espera !== null) return;
    // Los frames duran 135-400 ms: despertar sólo cerca del siguiente cambio, salvo al mover la mirada.
    const moviendo = miradaPendiente || (!reduced && gaze.returning) || (!reduced && (state === 'idle' || state === 'look') &&
      (Math.abs(gaze.targetX - gaze.x) > 0.01 || Math.abs(gaze.targetY - gaze.y) > 0.01));
    const duracion = atlas.frames[sequence()[position]]?.duration ?? 0;
    const restante = lastTime === null || moviendo ? 0 :
      Math.min(200, (duracion - elapsed) / playbackRate, feedback ? feedback.remaining : Infinity);
    if (restante > 24) {
      espera = setTimeout(() => { espera = null; animationFrame = window.requestAnimationFrame(tick); }, restante - 16);
    } else animationFrame = window.requestAnimationFrame(tick);
  }

  function resetClock() {
    clockRevision += 1;
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    clearTimeout(espera);
    animationFrame = espera = null;
    lastTime = null;
    schedule();
  }

  function tick(time) {
    animationFrame = null;
    if (!shouldRun()) { lastTime = null; return; }
    const delta = lastTime === null ? 0 : Math.min(Math.max(time - lastTime, 0), 250);
    const revision = clockRevision;
    lastTime = time;
    let returnedToIdle = false;
    if (miradaPendiente) { miradaPendiente = false; medirMirada(); }
    if (!reduced) {
      motionTime += delta;
      const blend = 1 - Math.exp(-delta / 90);
      if (state === 'idle' || state === 'look') {
        gaze.x += (gaze.targetX - gaze.x) * blend;
        gaze.y += (gaze.targetY - gaze.y) * blend;
        gaze.directionX = directionAxis(gaze.x, gaze.directionX);
        gaze.directionY = directionAxis(gaze.y, gaze.directionY);
      }
      if (gaze.returning && Math.abs(gaze.x) < 0.01 && Math.abs(gaze.y) < 0.01) {
        gaze.x = gaze.y = 0;
        gaze.directionX = gaze.directionY = 0;
        gaze.active = gaze.returning = false;
        if (state === 'idle' && !pending) { setPhase('loop'); returnedToIdle = true; }
      }
    }
    elapsed += returnedToIdle ? 0 : delta * playbackRate;
    while (!destroyed && !paused && revision === clockRevision && elapsed >= atlas.frames[sequence()[position]].duration) {
      const remainder = elapsed - atlas.frames[sequence()[position]].duration;
      advanceFrame();
      elapsed = revision === clockRevision && !paused && !destroyed ? remainder : 0;
    }
    if (revision === clockRevision && !paused && feedback && state === feedback.state && !pending) {
      feedback.remaining -= delta;
      if (feedback.remaining <= 0) {
        const completed = feedback;
        feedback = null;
        bubble.hidden = true;
        bubble.textContent = '';
        requestState('idle').then(completed.resolve);
      }
    }
    draw();
    schedule();
  }

  function requestState(next) {
    validateState(next);
    pending?.resolve();
    pending = null;
    if (state === next && phase !== 'exit') return Promise.resolve();
    return new Promise(resolve => {
      if (reduced && !paused && !document.hidden) {
        if (state === 'sleep' && next !== 'sleep' && next !== 'wake') startState('wake');
        startState(next, resolve);
      } else {
        pending = {state: next, resolve};
        if (!paused && !document.hidden && (state === 'idle' || state === 'look') && phase === 'loop') finishState();
      }
      draw();
      schedule();
    });
  }

  function lookAt(clientX, clientY) {
    assertAlive();
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      throw new TypeError('lookAt requiere coordenadas clientX y clientY finitas.');
    }
    gaze.clientX = clientX;
    gaze.clientY = clientY;
    refreshGaze();
  }

  // Cada mousemove sólo anota la posición; el rect se lee una vez por frame dibujado.
  function refreshGaze() {
    if (gaze.clientX === null) return;
    gaze.active = true;
    gaze.returning = false;
    miradaPendiente = true;
    schedule();
  }

  function medirMirada() {
    if (gaze.clientX === null) return;
    const rect = canvas.getBoundingClientRect();
    const distance = Math.max(rect.width, 1);
    gaze.targetX = Math.max(-1, Math.min(1, (gaze.clientX - rect.left - rect.width / 2) / distance));
    gaze.targetY = Math.max(-1, Math.min(1, (gaze.clientY - rect.top - rect.height * 0.38) / distance));
  }

  function directionAxis(value, previous) {
    if (previous === 1 && value > 0.20) return 1;
    if (previous === -1 && value < -0.20) return -1;
    return value > 0.38 ? 1 : value < -0.38 ? -1 : 0;
  }

  function onPointerMove(event) {
    if (followCursor && (!event.pointerType || event.pointerType === 'mouse' || event.pointerType === 'pen')) {
      lookAt(event.clientX, event.clientY);
    }
  }
  function returnGaze() {
    gaze.clientX = gaze.clientY = null;
    gaze.targetX = gaze.targetY = 0;
    gaze.returning = gaze.active;
    schedule();
  }
  function onPointerLeave(event) {
    if (event?.pointerType === 'touch') return;
    if (followCursor) returnGaze();
  }
  function onPointerOut(event) { if (event.relatedTarget === null && event.pointerType !== 'touch') onPointerLeave(); }
  function onWindowBlur() { returnGaze(); }
  function onVisibilityChange() { if (!document.hidden) refreshGaze(); resetClock(); }
  function onMotionChange() {
    reduced = preference === 'system' ? media.matches : preference;
    if (reduced && pending && !paused && !document.hidden) {
      const request = pending;
      pending = null;
      if (state === 'sleep' && request.state !== 'wake') startState('wake');
      startState(request.state, request.resolve);
    }
    draw();
    resetClock();
  }

  function setSize(next) {
    assertAlive();
    size = numberInRange(next, 'size', 16, 2048);
    element.style.width = `${size}px`;
    element.style.height = `${size * canvas.height / canvas.width}px`;
    refreshGaze();
  }

  function showFeedback(next, text, settings, defaultDuration) {
    assertAlive();
    if (typeof text !== 'string' || text.length > 2000 || (next === 'talk' && !text.trim())) {
      throw new TypeError(`${next === 'talk' ? 'speak' : 'confuse'} requiere texto de hasta 2000 caracteres.`);
    }
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new TypeError('Las opciones de feedback deben ser un objeto.');
    }
    const duration = numberInRange(settings.duration ?? defaultDuration, 'duration', 100, 60000);
    clearFeedback();
    bubble.textContent = text;
    bubble.hidden = !text.trim();
    return new Promise(resolve => {
      const current = {state: next, remaining: duration, resolve};
      feedback = current;
      requestState(next).then(() => {
        if (feedback === current && state !== next) clearFeedback();
        schedule();
      });
      schedule();
    });
  }

  const api = {
    element,
    get state() { return state; },
    get frameIndex() { return frameIndex; },
    setState(next) { assertAlive(); validateState(next); clearFeedback(); return requestState(next); },
    lookAt,
    speak(text, speechOptions = {}) {
      return showFeedback('talk', text, speechOptions, Math.min(10000, Math.max(1500, (text?.length ?? 0) * 55)));
    },
    confuse(text = '', settings = {}) { return showFeedback('confused', text, settings, 3000); },
    on(event, callback) {
      assertAlive();
      if (!listeners.has(event) || typeof callback !== 'function') {
        throw new TypeError('on requiere statechange, error o frame y una función.');
      }
      listeners.get(event).add(callback);
      return () => { listeners.get(event).delete(callback); };
    },
    pause() { assertAlive(); paused = true; resetClock(); },
    resume() { assertAlive(); paused = false; refreshGaze(); resetClock(); },
    setFollowCursor(value) {
      assertAlive();
      if (typeof value !== 'boolean') throw new TypeError('setFollowCursor requiere un booleano.');
      followCursor = value;
      if (!value) returnGaze();
      draw();
    },
    setReducedMotion(value) { assertAlive(); preference = motionPreference(value); onMotionChange(); },
    setPlaybackRate(value) { assertAlive(); playbackRate = numberInRange(value, 'playbackRate', 0.5, 1.5); },
    setSize,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      resetClock();
      pending?.resolve();
      pending = null;
      clearFeedback();
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('scroll', refreshGaze, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', refreshGaze);
      window.removeEventListener('blur', onWindowBlur);
      media.removeEventListener('change', onMotionChange);
      for (const callbacks of listeners.values()) callbacks.clear();
      element.remove();
    },
  };

  setSize(size);
  canvas.setAttribute('aria-label', `${label}: ${LABELS[state]}`);
  container.append(element);
  document.addEventListener('pointermove', onPointerMove, {passive: true, capture: true});
  document.addEventListener('pointerleave', onPointerLeave, {passive: true});
  document.addEventListener('pointerout', onPointerOut, {passive: true, capture: true});
  document.addEventListener('scroll', refreshGaze, {passive: true, capture: true});
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('resize', refreshGaze, {passive: true});
  window.addEventListener('blur', onWindowBlur);
  media.addEventListener('change', onMotionChange);
  draw();
  schedule();
  return api;
}

/** Selecciona una mascota y reutiliza el mismo motor de sprites. */
export async function createMascot(target, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options debe ser un objeto.');
  }
  const mascot = options.mascot === undefined ? 'cuy' : options.mascot;
  if (typeof mascot !== 'string' || !Object.hasOwn(MASCOT_LABELS, mascot)) {
    throw new TypeError('mascot debe ser "cuy", "gallito" o "llama".');
  }
  return createCuy(target, {
    ...options,
    label: options.label ?? MASCOT_LABELS[mascot],
    assetBaseURL: options.assetBaseURL ?? new URL(`../assets/${mascot === 'cuy' ? '' : `${mascot}/`}`, import.meta.url),
  });
}
