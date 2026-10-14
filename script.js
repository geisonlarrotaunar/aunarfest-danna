/* =========================================================
   Danna Espitia · Señorita AUNAR · AUNARFEST
   Script: arranque, sonidos (WebAudio), mini-juego, apoyo
   ========================================================= */

/* ---------- CONFIGURACIÓN (edita aquí) ---------- */
const CONFIG = {
  // Deja en "" lo que no uses; solo se muestran los botones con valor.
  instagram: "https://www.instagram.com/danna_espitia96",
  tiktok: "https://www.tiktok.com/@dannaespitia66",
  facebook: "https://www.facebook.com/share/19oaqm5qC9/",
  // Música de fondo: por defecto se genera sola (sin archivos). Si prefieres una canción
  // propia y con licencia, pon aquí su ruta, ej: "audio/fondo.mp3"
  musicaFondo: "",
  whatsapp: "573136634850", // código país + número, sin + ni espacios
  mensajeCompartir: "💛 Apoya a Danna Espitia, candidata de Ingeniería Informática a Señorita AUNAR en el AUNARFEST. ¡Conócela y regálale tu apoyo!",
  fechaCoronacion: "2026-11-14", // AAAA-MM-DD, para la cuenta regresiva
  vidas: 3
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   SONIDO · sintetizado con WebAudio (sin archivos)
   Timbre de "pluck" tipo arpa/cuatro llanero + efectos propios
   ========================================================= */
const Sound = {
  ctx: null,
  on: true,
  noteIdx: 0,
  scale: [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5], // pentatónica

  init() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  tone(freq, { dur = 0.35, type = "triangle", vol = 0.18, delay = 0, slideTo = null } = {}) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  },

  // Notas atrapadas: suben por la escala
  collect() {
    const f = this.scale[this.noteIdx % this.scale.length];
    this.noteIdx++;
    this.tone(f, { dur: 0.4, type: "triangle", vol: 0.2 });
    this.tone(f * 2, { dur: 0.2, type: "sine", vol: 0.06, delay: 0.02 });
  },
  crown() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      this.tone(f, { dur: 0.35, type: "triangle", vol: 0.16, delay: i * 0.06 }));
  },
  bug() {
    this.tone(160, { dur: 0.35, type: "sawtooth", vol: 0.14, slideTo: 55 });
    this.tone(90, { dur: 0.3, type: "square", vol: 0.07, slideTo: 40 });
  },
  click() { this.tone(880, { dur: 0.08, type: "sine", vol: 0.1 }); },
  boot(i) { this.tone(330 + i * 70, { dur: 0.1, type: "square", vol: 0.05 }); },
  start() { [392, 523.25, 659.25].forEach((f, i) => this.tone(f, { dur: 0.25, vol: 0.15, delay: i * 0.08 })); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, { dur: 0.3, type: "triangle", vol: 0.14, delay: i * 0.14 })); },
  win() {
    const arp = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1568];
    arp.forEach((f, i) => this.tone(f, { dur: 0.45, type: "triangle", vol: 0.17, delay: i * 0.09 }));
    this.tone(261.63, { dur: 1.1, type: "sine", vol: 0.1, delay: 0 });
    this.tone(392, { dur: 1.1, type: "sine", vol: 0.08, delay: 0.02 });
  },
  heart() {
    [783.99, 987.77, 1174.66].forEach((f, i) => this.tone(f, { dur: 0.3, type: "sine", vol: 0.13, delay: i * 0.07 }));
  }
};


/* =========================================================
   MÚSICA DE FONDO · generada con WebAudio (sin archivos ni derechos)
   Progresión Am – F – C – G, pad suave + arpegio tipo guitarra/arpa.
   Si CONFIG.musicaFondo tiene una ruta, reproduce ese archivo en bucle.
   ========================================================= */
const Music = {
  active: false, master: null, timer: null, nextTime: 0, step: 0, audioEl: null,
  bpm: 88,
  chords: [
    { bass: 45, pad: [57, 60, 64], arp: [69, 72, 76, 81] }, // Am
    { bass: 41, pad: [53, 57, 60], arp: [65, 69, 72, 77] }, // F
    { bass: 48, pad: [55, 60, 64], arp: [67, 72, 76, 79] }, // C
    { bass: 43, pad: [55, 59, 62], arp: [67, 71, 74, 79] }  // G
  ],
  arpPattern: [0, 1, 2, 3, 2, 1, 2, 1],
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },

  voice(freq, t, dur, { type = "sine", vol = 0.05, attack = 0.02, lp = 0 } = {}) {
    const ctx = Sound.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = lp;
      o.connect(f); f.connect(g);
    } else {
      o.connect(g);
    }
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  schedule() {
    const ctx = Sound.ctx;
    if (!this.active || !ctx || this.audioEl) return;
    const eighth = 60 / this.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.6) {
      const pos = this.step % 32;               // 4 acordes × 8 corcheas
      const ch = this.chords[(pos / 8) | 0];
      const i = pos % 8;
      const t = this.nextTime;

      if (i === 0) {
        ch.pad.forEach((m) => {
          this.voice(this.hz(m), t, eighth * 8 + 0.5, { type: "triangle", vol: 0.03, attack: 0.7, lp: 1100 });
          this.voice(this.hz(m) * 1.005, t, eighth * 8 + 0.5, { type: "sine", vol: 0.025, attack: 0.9, lp: 900 });
        });
        this.voice(this.hz(ch.bass), t, eighth * 3.6, { type: "sine", vol: 0.12, attack: 0.03 });
      }
      if (i === 4) this.voice(this.hz(ch.bass), t, eighth * 3.4, { type: "sine", vol: 0.085, attack: 0.03 });

      const note = ch.arp[this.arpPattern[i]];
      this.voice(this.hz(note), t, eighth * 2.4, { type: "triangle", vol: i % 2 ? 0.03 : 0.045, attack: 0.01 });

      this.nextTime += eighth;
      this.step++;
    }
    this.timer = setTimeout(() => this.schedule(), 200);
  },

  start() {
    if (this.active || !Sound.on) return;
    if (CONFIG.musicaFondo) {
      this.audioEl = this.audioEl || Object.assign(new Audio(CONFIG.musicaFondo), { loop: true, volume: 0.35 });
      this.audioEl.play().catch(() => {});
      this.active = true;
      return;
    }
    Sound.init();
    const ctx = Sound.ctx;
    if (!ctx) return;
    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.master.gain.exponentialRampToValueAtTime(1.5, ctx.currentTime + 2.5); // entrada suave
    this.master.connect(ctx.destination);
    this.active = true;
    this.nextTime = ctx.currentTime + 0.15;
    this.step = 0;
    this.schedule();
  },

  stop() {
    if (!this.active) return;
    this.active = false;
    clearTimeout(this.timer);
    if (this.audioEl) { this.audioEl.pause(); return; }
    const ctx = Sound.ctx, m = this.master;
    if (ctx && m) {
      m.gain.cancelScheduledValues(ctx.currentTime);
      m.gain.setValueAtTime(Math.max(0.0001, m.gain.value), ctx.currentTime);
      m.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      setTimeout(() => { try { m.disconnect(); } catch (e) {} }, 700);
    }
  }
};

// Pausa la música si la pestaña se oculta y la retoma al volver
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { if (Music.active) { Music.stop(); Music._resume = true; } }
  else if (Music._resume && Sound.on) { Music._resume = false; Music.start(); }
});

/* ---------- Utilidades UI ---------- */
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._id);
  toast._id = setTimeout(() => t.classList.remove("show"), 2400);
}

function confetti(amount = 90) {
  if (reduceMotion) return;
  const box = $("#confetti");
  const colors = ["#ffd21f", "#ffffff", "#3b86e8", "#0b4aa8", "#ffe680"];
  for (let i = 0; i < amount; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = colors[(Math.random() * colors.length) | 0];
    p.style.animationDuration = 2 + Math.random() * 2.2 + "s";
    p.style.animationDelay = Math.random() * 0.6 + "s";
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    p.style.width = 6 + Math.random() * 8 + "px";
    box.appendChild(p);
    setTimeout(() => p.remove(), 5000);
  }
}

/* =========================================================
   ARRANQUE
   ========================================================= */
const bootLines = [
  "> iniciando FeriaDeCali.exe 🎺",
  "> cargando talento ........ ok",
  "> afinando la salsa ........ ok",
  "> compilando carisma ...... ok",
  "> candidata: Danna Espitia  ✓"
];

function runBoot() {
  const log = $("#bootLog");
  const bar = $("#bootBar");
  let i = 0;
  const step = () => {
    if (i < bootLines.length) {
      log.textContent += (i ? "\n" : "") + bootLines[i];
      bar.style.width = Math.round(((i + 1) / bootLines.length) * 100) + "%";
      i++;
      setTimeout(step, reduceMotion ? 80 : 520);
    } else {
      $("#bootEnter").hidden = false;
      $("#bootMute").hidden = false;
      $("#bootEnter").focus({ preventScroll: true });
    }
  };
  setTimeout(step, 400);
}

function enterSite(withSound) {
  Sound.on = withSound;
  if (withSound) { Sound.init(); Sound.start(); Music.start(); }
  updateSoundUI();
  $("#boot").classList.add("is-done");
  document.body.classList.remove("is-booting");
  setTimeout(revealInView, 200);
}

$("#bootEnter").addEventListener("click", () => enterSite(true));
$("#bootMute").addEventListener("click", () => enterSite(false));

/* ---------- Toggle de sonido ---------- */
function updateSoundUI() {
  $("#soundToggle").setAttribute("aria-pressed", String(Sound.on));
  $("#soundLabel").textContent = Sound.on ? "música on" : "música off";
}
$("#soundToggle").addEventListener("click", () => {
  Sound.on = !Sound.on;
  if (Sound.on) { Sound.init(); Sound.click(); Music.start(); }
  else Music.stop();
  updateSoundUI();
});

/* Sonido de clic en elementos marcados */
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-sfx='click']")) Sound.click();
});

/* ---------- Aparición al hacer scroll ---------- */
let io;
function revealInView() {
  if (!("IntersectionObserver" in window)) { $$(".reveal").forEach(el => el.classList.add("in")); return; }
  io = io || new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.15 });
  $$(".reveal:not(.in)").forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 90 + "ms";
    io.observe(el);
  });
}

/* Foto con ligero efecto parallax con el mouse */
const photo = $("#photo");
if (photo && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
  window.addEventListener("pointermove", (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    photo.style.transform = `translate(${x * -8}px, ${y * -6}px) rotate(${x * 1.2}deg)`;
  });
}

/* =========================================================
   MINI-JUEGO · Compila la corona
   Instala los 6 módulos del reinado (los gastos que cubre el apoyo)
   y esquiva los bugs. Terminal en vivo con el "código" de la reina.
   ========================================================= */
const MODULES = [
  { id: "inscripcion",  icon: "📝",  label: "Inscripción",    log: "import { inscripcion } from 'aunarfest'" },
  { id: "ecologico",    icon: "♻️", label: "Traje ecológico", log: "npm i traje-ecologico" },
  { id: "gala",         icon: "👗",  label: "Traje de gala",  log: "rent('traje-de-gala')" },
  { id: "comparsa",     icon: "🎭",  label: "Comparsa",       log: "comparsa.add(trajes)" },
  { id: "carroza",      icon: "🎈",  label: "Carroza",        log: "decorar(carroza)" },
  { id: "alistamiento", icon: "💄",  label: "Alistamiento",   log: "reina.alistar({ maquillaje, peinado })" }
];
const BUG_ERRORS = [
  "SyntaxError: se esperaba ';'",
  "TypeError: corona is undefined",
  "NullPointerException: sonrisa == null",
  "ReferenceError: nervios is not defined",
  "Error 404: apoyo no encontrado",
  "Error 500: falta de café"
];

const arena = $("#arena");
const startPanel = $("#arenaStart");
const endPanel = $("#arenaEnd");
const scoreEl = $("#score");
const barEl = $("#progressBar");
const heartsEl = $("#hearts");
const termLog = $("#termLog");

function logLine(text, cls = "") {
  const d = document.createElement("div");
  d.className = "term__line " + cls;
  d.textContent = text;
  termLog.appendChild(d);
  while (termLog.children.length > 14) termLog.firstChild.remove();
  termLog.scrollTop = termLog.scrollHeight;
}

const Game = {
  running: false,
  installed: new Set(),
  lives: CONFIG.vidas,
  items: [],
  last: 0,
  spawnTimer: 0,
  raf: 0,

  reset() {
    this.items.forEach(it => it.el.remove());
    this.items = [];
    this.installed.clear();
    this.lives = CONFIG.vidas;
    this.spawnTimer = 0;
    termLog.textContent = "";
    $$("#modules li").forEach(li => li.classList.remove("on"));
    logLine("$ npm run compilar-reina", "cmd");
    logLine("> esperando módulos 0/" + MODULES.length + " …", "dim");
    this.updateHUD();
  },

  start() {
    Sound.init();
    Sound.start();
    this.reset();
    startPanel.hidden = true;
    endPanel.hidden = true;
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(t => this.loop(t));
  },

  updateHUD() {
    const n = this.installed.size;
    scoreEl.textContent = n;
    barEl.style.width = (n / MODULES.length) * 100 + "%";
    heartsEl.textContent = Array.from({ length: CONFIG.vidas }, (_, i) => (i < this.lives ? "♥" : "♡")).join(" ");
  },

  spawn() {
    const w = arena.clientWidth;
    const onScreen = new Set(this.items.map(i => i.mod && i.mod.id));
    const missing = MODULES.filter(m => !this.installed.has(m.id) && !onScreen.has(m.id));

    let kind = "bug", mod = null;
    const roll = Math.random();
    if (roll < 0.62 && missing.length) { kind = "mod"; mod = missing[(Math.random() * missing.length) | 0]; }
    else if (roll > 0.92 && this.lives < CONFIG.vidas) kind = "heart";

    const el = document.createElement("button");
    el.type = "button";
    el.className = "item item--" + kind;
    if (kind === "mod") {
      el.innerHTML = `<span class="item__ico">${mod.icon}</span><span class="item__txt">${mod.label}</span>`;
      el.setAttribute("aria-label", "Instalar módulo: " + mod.label);
    } else if (kind === "bug") {
      el.textContent = "🐛";
      el.setAttribute("aria-label", "Bug, evítalo");
    } else {
      el.textContent = "💛";
      el.setAttribute("aria-label", "Apoyo: recupera una vida");
    }
    arena.appendChild(el);

    const x = Math.random() * Math.max(10, w - el.offsetWidth);
    const speed = (115 + Math.random() * 60) * (1 + this.installed.size * 0.12); // px/s
    const item = { el, x, y: -70, speed, kind, mod, sway: Math.random() * 6.28, hit: false };
    el.style.transform = `translate(${x}px, ${item.y}px)`;
    el.addEventListener("pointerdown", (ev) => { ev.preventDefault(); this.catch(item, ev); });
    this.items.push(item);
  },

  catch(item, ev) {
    if (!this.running || item.hit) return;
    item.hit = true;
    item.el.classList.add("is-hit");
    const rect = arena.getBoundingClientRect();
    const px = ev.clientX - rect.left, py = ev.clientY - rect.top;

    if (item.kind === "bug") {
      this.lives--;
      Sound.bug();
      this.popText(px, py, "-1 ♥", "#ff8a9b");
      logLine("✖ " + BUG_ERRORS[(Math.random() * BUG_ERRORS.length) | 0], "err");
      arena.classList.remove("shake"); void arena.offsetWidth; arena.classList.add("shake");
      if (navigator.vibrate) navigator.vibrate(60);
    } else if (item.kind === "heart") {
      this.lives = Math.min(CONFIG.vidas, this.lives + 1);
      Sound.heart();
      this.popText(px, py, "+1 ♥", "#ffd21f");
      logLine("✔ apoyo recibido · vida +1", "ok");
    } else {
      this.installed.add(item.mod.id);
      Sound.collect();
      this.popText(px, py, "✔ " + item.mod.label, "#ffd21f");
      logLine("✔ " + item.mod.log, "ok");
      logLine("> módulos " + this.installed.size + "/" + MODULES.length, "dim");
      const chip = $(`#modules li[data-mod="${item.mod.id}"]`);
      if (chip) chip.classList.add("on");
    }
    setTimeout(() => item.el.remove(), 350);
    this.items = this.items.filter(i => i !== item);
    this.updateHUD();
    this.checkEnd();
  },

  popText(x, y, text, color) {
    const p = document.createElement("span");
    p.className = "plus";
    p.textContent = text;
    p.style.left = Math.max(4, x - 40) + "px";
    p.style.top = y - 20 + "px";
    p.style.color = color;
    arena.appendChild(p);
    setTimeout(() => p.remove(), 800);
  },

  checkEnd() {
    if (this.installed.size >= MODULES.length) return this.finish(true);
    if (this.lives <= 0) return this.finish(false);
  },

  finish(won) {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.items.forEach(it => it.el.remove());
    this.items = [];
    if (won) {
      logLine("", "dim");
      logLine("BUILD SUCCESS ✔", "ok big");
      logLine("Danna Espitia → Señorita AUNAR 👑", "ok");
      setTimeout(() => unlockProfile(), 1100);
    } else {
      Sound.lose();
      logLine("BUILD FAILED ✖", "err big");
      $("#endMsg").textContent = "¡Los bugs ganaron esta vez! Inténtalo de nuevo 🐛";
      $("#retryBtn").textContent = "↻ Intentar de nuevo";
      endPanel.hidden = false;
    }
  },

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const h = arena.clientHeight;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = 0.75 + Math.random() * 0.5 - Math.min(0.3, this.installed.size * 0.05);
    }

    for (const it of this.items) {
      it.y += it.speed * dt;
      it.sway += dt * 2;
      const dx = Math.sin(it.sway) * 10;
      it.el.style.transform = `translate(${it.x + dx}px, ${it.y}px) rotate(${Math.sin(it.sway) * 8}deg)`;
    }
    this.items = this.items.filter(it => {
      if (it.y > h + 10) { it.el.remove(); return false; }
      return true;
    });
    this.raf = requestAnimationFrame(t => this.loop(t));
  }
};

$("#playBtn").addEventListener("click", () => Game.start());
$("#retryBtn").addEventListener("click", () => Game.start());

/* ---------- Desbloqueo del perfil ---------- */
let unlocked = false;
function unlockProfile(skip = false) {
  if (unlocked) return;
  unlocked = true;
  const profile = $("#perfil");
  profile.classList.remove("is-locked");
  $("#lock").setAttribute("aria-hidden", "true");

  if (!skip) {
    Sound.win();
    confetti(130);
    $("#endMsg").textContent = "👑 ¡Corona compilada! Mira mi perfil ↓";
    $("#retryBtn").textContent = "↻ Jugar otra vez";
    endPanel.hidden = false;
  }
  revealCards();
  setTimeout(() => profile.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), skip ? 50 : 1200);
}

/* Las tarjetas del perfil aparecen escalonadas al desbloquear */
function revealCards() {
  const cards = $$(".ficha__item, .like, .text-card");
  cards.forEach((c, i) => {
    c.style.opacity = 0;
    c.style.transform = "translateY(30px) scale(.96)";
    c.style.transition = "opacity .6s ease, transform .7s cubic-bezier(.2,.9,.3,1)";
    setTimeout(() => { c.style.opacity = 1; c.style.transform = ""; }, 300 + i * 90);
  });
}

$("#skipBtn").addEventListener("click", () => { Sound.init(); Sound.click(); unlockProfile(true); });

/* =========================================================
   APOYO
   ========================================================= */
const COUNT_KEY = "danna_hearts";
let hearts = 0;
try { hearts = parseInt(localStorage.getItem(COUNT_KEY) || "0", 10) || 0; } catch (e) {}
$("#heartCount").textContent = hearts;

$("#heartBtn").addEventListener("click", (e) => {
  Sound.init();
  Sound.heart();
  hearts++;
  $("#heartCount").textContent = hearts;
  try { localStorage.setItem(COUNT_KEY, String(hearts)); } catch (err) {}
  confetti(40);
  if (!reduceMotion) {
    for (let i = 0; i < 6; i++) {
      const h = document.createElement("span");
      h.className = "heart-fly";
      h.textContent = ["💛", "💙", "♪"][i % 3];
      h.style.left = e.clientX + (Math.random() * 120 - 60) + "px";
      h.style.top = e.clientY + "px";
      h.style.animationDelay = i * 0.06 + "s";
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 1500);
    }
  }
  toast("¡Gracias por tu apoyo! 💛");
});

const shareUrl = () => location.href.split("#")[0];

$("#shareBtn").addEventListener("click", async () => {
  Sound.init(); Sound.click();
  const text = `${CONFIG.mensajeCompartir} ${shareUrl()}`;
  if (navigator.share) {
    try { await navigator.share({ title: "Danna Espitia · Señorita AUNAR", text: CONFIG.mensajeCompartir, url: shareUrl() }); return; } catch (e) { /* cae a WhatsApp */ }
  }
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
});

$("#copyBtn").addEventListener("click", async () => {
  Sound.init(); Sound.click();
  try { await navigator.clipboard.writeText(shareUrl()); toast("Enlace copiado ✓"); }
  catch (e) { prompt("Copia el enlace:", shareUrl()); }
});

/* Redes sociales (solo aparecen las que tengan enlace en CONFIG) */
const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-3.1a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.9.4-1.7 1.8-1.7h1.6V3.8S15.5 3.5 14.2 3.5c-2.6 0-4.3 1.6-4.3 4.4v2.6H7v3.3h2.9V22h3.6z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 2c.3 2.4 1.7 3.9 4 4.1v3.1c-1.4.1-2.7-.3-4-1.1v6.2c0 3.9-3.1 6.2-6.3 5.7-2.9-.5-5-3.2-4.5-6.3.5-3 3.2-5 6.2-4.6v3.2c-1.6-.4-3.2.7-3.2 2.3 0 1.4 1.2 2.5 2.6 2.4 1.3-.1 2.2-1.1 2.2-2.5V2h3z"/></svg>'
};
const SOCIALS = [
  { key: "instagram", label: "Instagram", handle: "@danna_espitia96", url: CONFIG.instagram },
  { key: "facebook",  label: "Facebook",  handle: "Danna Espitia",   url: CONFIG.facebook },
  { key: "tiktok",    label: "TikTok",    handle: "@dannaespitia66", url: CONFIG.tiktok }
].filter(s => s.url);

(function buildSocials() {
  const hero = $("#heroSocials");
  const box = $("#socials");
  if (!SOCIALS.length) { hero && hero.remove(); box && box.remove(); return; }
  SOCIALS.forEach(s => {
    if (hero) {
      const a = document.createElement("a");
      a.className = "soc-ico";
      a.href = s.url; a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("aria-label", s.label + " de Danna");
      a.innerHTML = ICONS[s.key];
      a.addEventListener("click", () => { Sound.init(); Sound.click(); });
      hero.appendChild(a);
    }
    if (box) {
      const a = document.createElement("a");
      a.className = "soc-pill";
      a.href = s.url; a.target = "_blank"; a.rel = "noopener";
      a.innerHTML = ICONS[s.key] + `<span>${s.label} <small>${s.handle}</small></span>`;
      a.addEventListener("click", () => { Sound.init(); Sound.click(); });
      box.appendChild(a);
    }
  });
  if (box) {
    const t = document.createElement("p");
    t.className = "socials__title";
    t.textContent = "Sígueme en mis redes";
    box.prepend(t);
  }
})();

/* Botón de WhatsApp de contacto */
(function setupWhatsApp() {
  const btn = $("#waBtn");
  if (!btn || !CONFIG.whatsapp) return;
  const msg = "Hola, quiero apoyar a Danna Espitia, candidata a Señorita AUNAR de Ingeniería Informática 💛";
  btn.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
})();

/* Cuenta regresiva a la coronación (14 de noviembre) */
(function countdown() {
  const box = $("#countdown");
  if (!box) return;
  const target = new Date(CONFIG.fechaCoronacion + "T00:00:00");
  const days = Math.ceil((target - new Date()) / 86400000);
  if (isNaN(days) || days < 0) return;
  box.hidden = false;
  $("#countNum").textContent = days;
  $("#countTxt").textContent = days === 0 ? "¡hoy es la coronación!" : days === 1 ? "día para la coronación" : "días para la coronación";
})();

/* ---------- Inicio ---------- */
Game.reset();
runBoot();
