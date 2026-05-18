// ─── HOMPIMPACK! game.js — polished build v2 ────────────────────────────────
// Fixes: cloud parallax, animations, sound effects via Web Audio API

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const rootStyle = getComputedStyle(document.documentElement);

const W = canvas.width;   // 1080
const H = canvas.height;  // 1920

function cssPxToCanvas(px) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.height) return 0;
  return px * (H / rect.height);
}

function safeTopCanvasOffset() {
  const value = parseFloat(rootStyle.getPropertyValue("--safe-top")) || 0;
  return Math.min(90, cssPxToCanvas(value));
}

// ─── Web Audio ───────────────────────────────────────────────────────────────
let audioCtx = null;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, type, duration, vol, decay) {
  try {
    const ac = getAudio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(vol || 0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (duration || 0.2));
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + (duration || 0.2));
  } catch(e) {}
}

function soundDrop() {
  // Whoosh down
  try {
    const ac = getAudio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ac.currentTime + 0.18);
    gain.gain.setValueAtTime(0.22, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.18);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.2);
  } catch(e) {}
}

function soundLand() {
  // Thud
  try {
    const ac = getAudio();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.12, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 220;
    src.connect(filter); filter.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.7, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    src.start(ac.currentTime); src.stop(ac.currentTime + 0.12);
  } catch(e) {}
}

function soundSuccess() {
  // Happy chime
  [523, 659, 784].forEach((f, i) => {
    setTimeout(() => playTone(f, "triangle", 0.18, 0.25), i * 55);
  });
}

function soundFail() {
  // Descending sad tones
  try {
    const ac = getAudio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.45);
    gain.gain.setValueAtTime(0.18, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.5);
  } catch(e) {}
}

function soundButton() {
  playTone(440, "sine", 0.09, 0.18);
}

// ─── Background Music (chiptune loop via Web Audio) ─────────────────────────
let bgmStarted = false;
let bgmNodes   = [];

function startBGM() {
  if (bgmStarted) return;
  bgmStarted = true;
  try {
    const ac = getAudio();
    scheduleBGM(ac);
  } catch(e) {}
}

function stopBGM() {
  bgmNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  bgmNodes = [];
}

function scheduleBGM(ac) {
  // Upbeat chiptune loop — 120 BPM, 16-step sequencer
  const BPM      = 138;
  const STEP     = 60 / BPM / 4; // 16th note duration
  const LOOP_LEN = 32;            // steps per loop

  // Note frequencies (C4=261.6, D4=293.7, E4=329.6, G4=392, A4=440, B4=493.9, C5=523.3)
  const C4=261.6, D4=293.7, E4=329.6, F4=349.2, G4=392, A4=440, B4=493.9, C5=523.3, D5=587.3, E5=659.3, G5=784;
  const _=0; // rest

  // Melody (16 steps × 2 bars)
  const melody = [
    C5,_,E5,_,  G5,_,E5,_,  D5,_,F4,_,  E5,_,C5,_,
    G4,_,B4,_,  C5,_,E5,_,  D5,_,G4,_,  C5,_,_,_,
  ];

  // Bass line (root notes)
  const bass = [
    C4,_,_,C4,  C4,_,_,_,   F4,_,_,F4,  F4,_,_,_,
    G4,_,_,G4,  G4,_,_,_,   C4,_,_,C4,  C4,_,_,_,
  ];

  // Kick pattern (steps where kick plays)
  const kick  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0,
                 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0];
  // Snare
  const snare = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,
                 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
  // Hi-hat
  const hihat = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,
                 1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];

  // Master gain
  const master = ac.createGain();
  master.gain.value = 0.28;
  master.connect(ac.destination);

  function playLoop(startTime) {
    for (let i = 0; i < LOOP_LEN; i++) {
      const t = startTime + i * STEP;

      // Melody — square wave
      if (melody[i] > 0) {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "square";
        osc.frequency.value = melody[i];
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + STEP * 0.75);
        osc.connect(gain); gain.connect(master);
        osc.start(t); osc.stop(t + STEP);
        bgmNodes.push(osc);
      }

      // Bass — triangle wave
      if (bass[i] > 0) {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "triangle";
        osc.frequency.value = bass[i] / 2; // one octave down
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + STEP * 1.8);
        osc.connect(gain); gain.connect(master);
        osc.start(t); osc.stop(t + STEP * 2);
        bgmNodes.push(osc);
      }

      // Kick — pitched noise burst
      if (kick[i]) {
        const buf  = ac.createBuffer(1, ac.sampleRate * 0.09, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < data.length; j++)
          data[j] = (Math.random()*2-1) * Math.pow(1 - j/data.length, 4);
        const src   = ac.createBufferSource();
        src.buffer  = buf;
        const gain  = ac.createGain();
        const filt  = ac.createBiquadFilter();
        filt.type   = "lowpass"; filt.frequency.value = 180;
        src.connect(filt); filt.connect(gain); gain.connect(master);
        gain.gain.setValueAtTime(0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        src.start(t); src.stop(t + 0.1);
        bgmNodes.push(src);
      }

      // Snare — mid noise
      if (snare[i]) {
        const buf  = ac.createBuffer(1, ac.sampleRate * 0.14, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < data.length; j++)
          data[j] = (Math.random()*2-1) * Math.pow(1 - j/data.length, 2);
        const src   = ac.createBufferSource();
        src.buffer  = buf;
        const gain  = ac.createGain();
        const filt  = ac.createBiquadFilter();
        filt.type   = "bandpass"; filt.frequency.value = 1200; filt.Q.value = 0.8;
        src.connect(filt); filt.connect(gain); gain.connect(master);
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        src.start(t); src.stop(t + 0.15);
        bgmNodes.push(src);
      }

      // Hi-hat — high noise
      if (hihat[i]) {
        const buf  = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < data.length; j++)
          data[j] = (Math.random()*2-1) * Math.pow(1 - j/data.length, 3);
        const src   = ac.createBufferSource();
        src.buffer  = buf;
        const gain  = ac.createGain();
        const filt  = ac.createBiquadFilter();
        filt.type   = "highpass"; filt.frequency.value = 8000;
        src.connect(filt); filt.connect(gain); gain.connect(master);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        src.start(t); src.stop(t + 0.05);
        bgmNodes.push(src);
      }
    }

    // Schedule next loop just before this one ends
    const loopDur = LOOP_LEN * STEP;
    const nextStart = startTime + loopDur;
    // Prune finished nodes
    bgmNodes = bgmNodes.filter(n => {
      try { return n.playbackState !== 3; } catch(e) { return true; }
    });
    // Re-schedule
    setTimeout(() => {
      if (bgmStarted) scheduleBGM_next(ac, nextStart);
    }, (loopDur - 0.5) * 1000);
  }

  playLoop(ac.currentTime + 0.05);
}

function scheduleBGM_next(ac, startTime) {
  // Same as scheduleBGM but uses provided startTime
  const BPM  = 138;
  const STEP = 60 / BPM / 4;
  const LOOP_LEN = 32;
  const C4=261.6,D4=293.7,E4=329.6,F4=349.2,G4=392,A4=440,B4=493.9,C5=523.3,D5=587.3,E5=659.3,G5=784;
  const _=0;
  const melody=[C5,_,E5,_,G5,_,E5,_,D5,_,F4,_,E5,_,C5,_,G4,_,B4,_,C5,_,E5,_,D5,_,G4,_,C5,_,_,_];
  const bass  =[C4,_,_,C4,C4,_,_,_,F4,_,_,F4,F4,_,_,_,G4,_,_,G4,G4,_,_,_,C4,_,_,C4,C4,_,_,_];
  const kick  =[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0];
  const snare =[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
  const hihat =[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0];

  const master = ac.createGain();
  master.gain.value = 0.28;
  master.connect(ac.destination);

  for (let i = 0; i < LOOP_LEN; i++) {
    const t = startTime + i * STEP;
    if (melody[i]>0){const o=ac.createOscillator(),g=ac.createGain();o.type="square";o.frequency.value=melody[i];g.gain.setValueAtTime(0.18,t);g.gain.exponentialRampToValueAtTime(0.001,t+STEP*0.75);o.connect(g);g.connect(master);o.start(t);o.stop(t+STEP);bgmNodes.push(o);}
    if (bass[i]>0){const o=ac.createOscillator(),g=ac.createGain();o.type="triangle";o.frequency.value=bass[i]/2;g.gain.setValueAtTime(0.22,t);g.gain.exponentialRampToValueAtTime(0.001,t+STEP*1.8);o.connect(g);g.connect(master);o.start(t);o.stop(t+STEP*2);bgmNodes.push(o);}
    if (kick[i]){const b=ac.createBuffer(1,ac.sampleRate*0.09,ac.sampleRate),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/d.length,4);const s=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();s.buffer=b;f.type="lowpass";f.frequency.value=180;s.connect(f);f.connect(g);g.connect(master);g.gain.setValueAtTime(0.9,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.09);s.start(t);s.stop(t+0.1);bgmNodes.push(s);}
    if (snare[i]){const b=ac.createBuffer(1,ac.sampleRate*0.14,ac.sampleRate),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/d.length,2);const s=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();s.buffer=b;f.type="bandpass";f.frequency.value=1200;f.Q.value=0.8;s.connect(f);f.connect(g);g.connect(master);g.gain.setValueAtTime(0.45,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.14);s.start(t);s.stop(t+0.15);bgmNodes.push(s);}
    if (hihat[i]){const b=ac.createBuffer(1,ac.sampleRate*0.04,ac.sampleRate),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/d.length,3);const s=ac.createBufferSource(),g=ac.createGain(),f=ac.createBiquadFilter();s.buffer=b;f.type="highpass";f.frequency.value=8000;s.connect(f);f.connect(g);g.connect(master);g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.04);s.start(t);s.stop(t+0.05);bgmNodes.push(s);}
  }

  const loopDur = LOOP_LEN * STEP;
  setTimeout(() => {
    if (bgmStarted) scheduleBGM_next(ac, startTime + loopDur);
  }, (loopDur - 0.5) * 1000);
}

// ─── Asset list ─────────────────────────────────────────────────────────────
const assetList = {
  cloudsLayer:  "assets/layers/awan-baru.png",
  groundLayer:  "assets/layers/store-gacoan-1.png",
  coverBg:      "assets/cover-parts/background.svg?v=20260506-coverparts",
  coverLogo:    "assets/cover-parts/logo.png?v=20260506-coverparts",
  coverButton:  "assets/cover-parts/button-mulai.png?v=20260506-coverparts",
  coverCredit:  "assets/cover-parts/property.svg?v=20260506-coverparts",
  logo:         "assets/logo-gacoan.png",
  box:          "assets/box.png",
  crane:        "assets/crane-update.png",
  motor:        "assets/motor.png",
  endingPanel:  "assets/ending-parts/bg-panel.svg?v=20260506-endingparts",
  endingLookup: "assets/ending-parts/lookup.svg?v=20260506-endingparts",
  endingFire:   "assets/ending-parts/fire-icon.svg?v=20260506-endingparts",
  endingHigh:   "assets/ending-parts/high-score-label.svg?v=20260506-highlabel",
  retryButton:  "assets/ending-parts/button-main-lagi.png?v=20260506-endingparts",
  scoreCurrent: "assets/score-current.png",
  scoreHigh:    "assets/score-high.png",
  digit0:  "assets/digit-0.png",  digit1: "assets/digit-1.png",
  digit2:  "assets/digit-2.png",  digit3: "assets/digit-3.png",
  digit4:  "assets/digit-4.png",  digit5: "assets/digit-5.png",
  digit6:  "assets/digit-6.png",  digit7: "assets/digit-7.png",
  digit8:  "assets/digit-8.png",  digit9: "assets/digit-9.png",
};

const assets = {};
let loaded = 0;
let lastTime = performance.now();

// ─── Tuning constants ────────────────────────────────────────────────────────
const SINK_SCALE        = 48;
const SINK_EXP          = 1.02;
const SINK_MAX          = 1050;
const CAM_LERP          = 2.8;
const STACK_FOCUS_Y     = 920;
const CRANE_INIT_SPEED  = 145;
const CRANE_SPEED_INC   = 12;
const CRANE_SPEED_MAX   = 380;
const CLOUD_SPEED       = 28;   // px/sec horizontal drift
const GRAVITY_FALL      = 1700;
const GRAVITY_FAIL      = 1450;
const AFTERNOON_SCORE   = 70;
const WOBBLE_START      = 6;
const WOBBLE_MAX        = 56;
const WOBBLE_FREQ       = 2.25;
const BOX_MIN_SCALE     = 0.76;
const BOX_SHRINK_START  = 5;
const BOX_SHRINK_RATE   = 0.006;

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  mode: "loading",
  score: 0,
  highScore: Number(localStorage.getItem("hompimpackHighScore") || 0),
  time: 0,
  cameraY: 0,
  targetCameraY: 0,
  motorX: W + 450,
  motorReady: false,
  motorBounce: 0,       // y offset for motor entrance bounce
  cranePhase: 0,
  craneAngle: 0,
  craneSpeed: CRANE_INIT_SPEED,
  cloudDrift: 0,
  carriedBox: true,
  fallingBox: null,
  stack: [],
  towerCollapsed: false,
  wobbleBoost: 0,
  messageTimer: 0,
  inputReady: false,
  // Animation state
  landAnim: 0,          // squash/stretch on landing (0..1, countdown)
  scorePopAnim: 0,      // score number pop (0..1)
  shakeMag: 0,          // screen shake magnitude
  shakeDecay: 0,
  lastLandX: 0,         // x position of last successful land (for squash)
  lastLandY: 0,
};

// ─── Layout constants ────────────────────────────────────────────────────────
const BTN_START  = { x: 250, y: 1422, w: 580, h: 306 };
const BTN_RETRY  = { x: 258, y: 1410, w: 564, h: 255 };

const BOX_W = 306;
const BOX_H = 135;

const STACK_BASE = { x: 745, y: 1450, w: BOX_W, h: 68 };

const CRANE_ANCHOR = { x: W / 2, y: -35, length: 470, amplitude: 0.6 };
const CARRIED_OFFSET = { x: 0, y: -58 };

// Motor
const MOTOR_W = 772;
const MOTOR_H = 754;
const MOTOR_REST_X = 95;
const MOTOR_REST_Y_WORLD = 1310;

// ─── Asset loading ────────────────────────────────────────────────────────────
function loadAssets() {
  const total = Object.keys(assetList).length;
  Object.entries(assetList).forEach(([key, src]) => {
    const img = new Image();
    img.onload  = () => { assets[key] = img; loaded++; if (loaded === total) state.mode = "start"; };
    img.onerror = () => { state.mode = "error"; };
    img.src = src;
  });
}

function resetGame() {
  state.mode           = "intro";
  state.score          = 0;
  state.time           = 0;
  state.cameraY        = 0;
  state.targetCameraY  = 0;
  state.motorX         = W + 450;
  state.motorReady     = false;
  state.motorBounce    = 0;
  state.cranePhase     = 0;
  state.craneAngle     = 0;
  state.craneSpeed     = CRANE_INIT_SPEED;
  state.carriedBox     = true;
  state.fallingBox     = null;
  state.stack          = [];
  state.towerCollapsed = false;
  state.wobbleBoost    = 0;
  state.messageTimer   = 0;
  state.inputReady     = false;
  state.landAnim       = 0;
  state.scorePopAnim   = 0;
  state.shakeMag       = 0;
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────
function worldToScreenY(y) { return y - state.cameraY; }

function sinkOffset(extra = 0) {
  const n = state.stack.length + extra;
  if (n <= 0) return 0;
  return Math.min(SINK_MAX, Math.pow(n, SINK_EXP) * SINK_SCALE);
}

function cameraForTopStack() {
  if (state.stack.length < 4) return 0;
  const top = state.stack[state.stack.length - 1];
  const topScreenWithoutCamera = top.y - boxHeightAtScale(top.scale) / 2 + sinkOffset();
  return Math.min(0, topScreenWithoutCamera - STACK_FOCUS_Y);
}

function groundSceneOffset() {
  return sinkOffset() + Math.max(0, -state.cameraY);
}

function boxScaleForScore(score) {
  const shrink = Math.max(0, score - BOX_SHRINK_START) * BOX_SHRINK_RATE;
  return Math.max(BOX_MIN_SCALE, 1 - shrink);
}

function currentBoxScale() {
  return boxScaleForScore(state.score);
}

function boxWidthAtScale(scale) {
  return BOX_W * (scale || 1);
}

function boxHeightAtScale(scale) {
  return BOX_H * (scale || 1);
}

function wobbleAmount() {
  if (state.stack.length < WOBBLE_START) return 0;
  const progress = Math.min(1, (state.stack.length - WOBBLE_START) / 36);
  return (progress * WOBBLE_MAX + state.wobbleBoost) * mobileWobbleBoost();
}

function mobileWobbleBoost() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return 1;
  const visualScale = rect.width / W;
  if (visualScale >= 0.55) return 1;
  return Math.min(1.75, 1 + (0.55 - visualScale) * 2.1);
}

function wobbleX(strength = 1) {
  const amount = wobbleAmount();
  if (amount <= 0) return 0;
  return Math.sin(state.time * WOBBLE_FREQ + state.stack.length * 0.38) * amount * strength;
}

function currentTarget() {
  if (state.stack.length === 0) {
    return { x: STACK_BASE.x, y: STACK_BASE.y, scale: 1, w: STACK_BASE.w, h: BOX_H, first: true };
  }
  const top = state.stack[state.stack.length - 1];
  const nextScale = currentBoxScale();
  return {
    x: top.x + wobbleX(),
    y: top.y - boxHeightAtScale((top.scale + nextScale) * 0.5) * 0.96,
    scale: nextScale,
    w: boxWidthAtScale(nextScale),
    h: boxHeightAtScale(nextScale),
    first: false,
  };
}

// ─── Input ───────────────────────────────────────────────────────────────────
function pointerToCanvas(e) {
  const rect  = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: ((touch.clientX - rect.left) / rect.width)  * W,
    y: ((touch.clientY - rect.top)  / rect.height) * H,
  };
}

function hit(pt, box) {
  return pt.x >= box.x && pt.x <= box.x + box.w &&
         pt.y >= box.y && pt.y <= box.y + box.h;
}

function handleInput(e) {
  e.preventDefault();
  const pt = pointerToCanvas(e);

  if (state.mode === "start" && hit(pt, BTN_START)) {
    soundButton();
    startBGM();
    resetGame();
    return;
  }
  if (state.mode === "play" && state.inputReady && !state.fallingBox && state.carriedBox) {
    soundDrop();
    dropBox();
    return;
  }
  if (state.mode === "result" && hit(pt, BTN_RETRY)) {
    soundButton();
    state.mode = "start";
  }
}

// ─── Drop box ─────────────────────────────────────────────────────────────────
function dropBox() {
  const hookX = CRANE_ANCHOR.x - Math.sin(state.craneAngle) * CRANE_ANCHOR.length;
  const hookY = CRANE_ANCHOR.y + Math.cos(state.craneAngle) * CRANE_ANCHOR.length;
  const scale = currentBoxScale();
  const bx    = hookX + CARRIED_OFFSET.x;
  const by    = hookY + CARRIED_OFFSET.y + boxHeightAtScale(scale) / 2;
  const worldY = by + state.cameraY - sinkOffset(1);

  state.fallingBox = {
    x: bx, y: worldY, vx: 0, vy: 0,
    scale,
    rotation: state.craneAngle * 0.08,
    rotationVel: (Math.random() - 0.5) * 0.25,
    squashX: 1, squashY: 1,  // for landing squash
  };
  state.carriedBox = false;
}

// ─── Landing ─────────────────────────────────────────────────────────────────
function landFallingBox() {
  const box    = state.fallingBox;
  const target = currentTarget();
  const offset = box.x - target.x;
  const requiredOverlap = target.first ? 0.24 : Math.min(0.52, 0.30 + state.score * 0.01);
  const activeWidth = Math.min(boxWidthAtScale(box.scale), target.w);
  const maxOff = activeWidth * (1 - requiredOverlap);

  if (Math.abs(offset) > maxOff) { failGame(); return; }

  const landedX = target.x + offset * 0.58;
  const landedY = target.y;
  const stackLean = Math.max(-0.24, Math.min(0.24, offset / (BOX_W * 3.0)));

  state.stack.push({
    x: landedX, y: landedY,
    scale: box.scale,
    rotation: stackLean,
    vx: 0, vy: 0, rotationVel: 0,
    squashTimer: 0.22,   // squash animation countdown
  });

  state.score          += 1;
  state.highScore       = Math.max(state.highScore, state.score);
  localStorage.setItem("hompimpackHighScore", String(state.highScore));

  state.messageTimer   = 0.42;
  state.fallingBox     = null;
  state.carriedBox     = true;
  state.wobbleBoost    = Math.min(36, state.wobbleBoost + Math.abs(offset) / 11);
  state.craneSpeed     = CRANE_INIT_SPEED + Math.min(CRANE_SPEED_MAX, Math.pow(state.score, 1.08) * CRANE_SPEED_INC);
  state.targetCameraY  = cameraForTopStack();
  state.landAnim       = 0.22;
  state.scorePopAnim   = 0.35;
  state.lastLandX      = landedX;
  state.lastLandY      = worldToScreenY(landedY) + sinkOffset();

  soundLand();
  soundSuccess();

  const recentStack = state.stack.slice(-12);
  const lean = recentStack.reduce((s, item) => s + Math.abs(item.rotation), 0);
  const topDrift = Math.abs(landedX - STACK_BASE.x);
  const driftLimit = boxWidthAtScale(box.scale) * (1.15 + Math.min(2.2, state.stack.length * 0.018));
  if (!target.first && (lean > 2.55 || topDrift > driftLimit)) failGame({ collapseTower: true });
}

function failGame(options = {}) {
  state.mode      = "result";
  state.shakeMag  = options.collapseTower ? 34 : 22;
  state.shakeDecay = 8;
  soundFail();
  if (options.collapseTower) collapseTower();
  if (state.fallingBox) {
    const dir = state.fallingBox.x < W / 2 ? -1 : 1;
    state.fallingBox.vx          = dir * 160;
    state.fallingBox.vy          = -80;
    state.fallingBox.rotationVel += dir * 1.2;
  }
}

function collapseTower() {
  state.towerCollapsed = true;
  state.stack.forEach((box, idx) => {
    const dir = box.x < STACK_BASE.x ? -1 : 1;
    const heightBoost = idx / Math.max(1, state.stack.length - 1);
    box.vx = dir * (90 + heightBoost * 210) + (Math.random() - 0.5) * 90;
    box.vy = -150 - heightBoost * 190;
    box.rotationVel = dir * (0.8 + heightBoost * 1.3);
  });
}

// ─── Crane ───────────────────────────────────────────────────────────────────
function updateCrane(dt) {
  const speed   = 0.55 + state.craneSpeed / 360;
  state.cranePhase += dt * speed;
  state.craneAngle  = Math.sin(state.cranePhase) * CRANE_ANCHOR.amplitude;
}

function craneTip() {
  return {
    x: CRANE_ANCHOR.x - Math.sin(state.craneAngle) * CRANE_ANCHOR.length + CARRIED_OFFSET.x,
    y: CRANE_ANCHOR.y + Math.cos(state.craneAngle) * CRANE_ANCHOR.length + CARRIED_OFFSET.y,
  };
}

// ─── Update ──────────────────────────────────────────────────────────────────
function update(dt) {
  state.time += dt;

  // Intro: motor eases from right
  if (state.mode === "intro") {
    const targetX = W / 2;
    state.motorX += (targetX - state.motorX) * Math.min(1, dt * 3.5);
    // Bounce on arrival
    if (Math.abs(targetX - state.motorX) < 40) {
      state.motorBounce = Math.sin(state.time * 18) * Math.max(0, (40 - Math.abs(targetX - state.motorX))) * 0.4;
    }
    if (Math.abs(targetX - state.motorX) < 4) {
      state.motorX = targetX;
      state.motorReady = true;
      state.mode = "play";
      state.inputReady = true;
    }
  }

  if (state.mode === "play") {
    updateCrane(dt);
    updateFallingBox(dt);
    state.cloudDrift    += dt * CLOUD_SPEED;
    state.cameraY       += (state.targetCameraY - state.cameraY) * Math.min(1, dt * CAM_LERP);
    state.messageTimer   = Math.max(0, state.messageTimer - dt);
    state.landAnim       = Math.max(0, state.landAnim - dt);
    state.scorePopAnim   = Math.max(0, state.scorePopAnim - dt);
    state.wobbleBoost    = Math.max(0, state.wobbleBoost - dt * 8);

    // Update stack squash timers
    state.stack.forEach(b => { if (b.squashTimer > 0) b.squashTimer = Math.max(0, b.squashTimer - dt); });
  }

  // Screen shake
  if (state.shakeMag > 0) {
    state.shakeMag = Math.max(0, state.shakeMag - state.shakeDecay * dt * 60);
  }

  if (state.mode === "result" && state.fallingBox) {
    state.fallingBox.vy += GRAVITY_FAIL * dt;
    state.fallingBox.y  += state.fallingBox.vy * dt;
    state.fallingBox.x  += state.fallingBox.vx * dt;
    state.fallingBox.rotation += state.fallingBox.rotationVel * dt;
  }

  if (state.mode === "result" && state.towerCollapsed) {
    state.stack.forEach(box => {
      box.vy += GRAVITY_FAIL * dt;
      box.y += box.vy * dt;
      box.x += box.vx * dt;
      box.rotation += box.rotationVel * dt;
    });
  }
}

function updateFallingBox(dt) {
  if (!state.fallingBox) return;
  const box     = state.fallingBox;
  box.vy       += GRAVITY_FALL * dt;
  box.y        += box.vy * dt;
  box.rotation += box.rotationVel * dt;

  const target  = currentTarget();
  const screenY = worldToScreenY(box.y + boxHeightAtScale(box.scale) / 2) + sinkOffset(1);
  if (box.vy > 0 && screenY >= worldToScreenY(target.y) + sinkOffset()) {
    landFallingBox();
  }
  if (worldToScreenY(box.y) - sinkOffset(1) > H + 260) failGame();
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);

  if (state.mode === "loading") {
    ctx.fillStyle = "#244c9b"; ctx.fillRect(0, 0, W, H);
    drawCenteredText("Loading...", W / 2, H / 2, 54, "#fff");
    return;
  }
  if (state.mode === "error") {
    ctx.fillStyle = "#18286b"; ctx.fillRect(0, 0, W, H);
    drawCenteredText("Asset gagal dimuat.", W / 2, H / 2 - 30, 52, "#fff");
    drawCenteredText("Coba refresh halaman.", W / 2, H / 2 + 42, 36, "#fff");
    return;
  }
  if (state.mode === "start") {
    drawCoverScreen();
    return;
  }

  // Screen shake transform
  ctx.save();
  if (state.shakeMag > 0) {
    const sx = (Math.random() - 0.5) * state.shakeMag * 2;
    const sy = (Math.random() - 0.5) * state.shakeMag * 2;
    ctx.translate(sx, sy);
  }

  drawBackground();
  drawHUD();
  drawMotor();
  drawStack();
  drawCraneAndCarried();
  drawFallingBox();

  // "TUMPUK!" message
  if (state.messageTimer > 0) {
    ctx.save();
    const alpha = Math.min(1, state.messageTimer * 3);
    const pop   = 1 + 0.18 * Math.min(1, state.messageTimer / 0.3);
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, 430);
    ctx.scale(pop, pop);
    drawCenteredText("TUMPUK!", 0, 0, 78, "#ffd51e", "900", "#d92787");
    ctx.restore();
  }

  // Landing impact flash
  if (state.landAnim > 0) {
    const p = state.landAnim / 0.22;
    ctx.save();
    ctx.globalAlpha = p * 0.18;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  ctx.restore(); // end shake
  if (state.mode === "result") drawResult();
}

// ─── Background ───────────────────────────────────────────────────────────────
function drawBackground() {
  const sink  = sinkOffset();
  const groundOffset = groundSceneOffset();
  // Cloud drifts horizontally left; tile two copies
  const cloudDriftX  = state.cloudDrift % W;
  const rawDayProgress = Math.min(1, state.score / AFTERNOON_SCORE);
  const dayProgress = easeOutCubic(rawDayProgress);
  const sunPulse = (Math.sin(state.time * 0.85) + 1) * 0.5;
  const skyTop = lerpColor([157, 219, 250], [255, 176, 98], dayProgress);
  const skyBottom = lerpColor([120, 206, 245], [72, 117, 190], dayProgress);
  const cloudParallaxY = groundOffset * 0.24;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, rgb(skyTop));
  sky.addColorStop(1, rgb(skyBottom));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  if (dayProgress > 0) {
    const sunGlow = ctx.createRadialGradient(170, 255, 40, 170, 255, 470);
    sunGlow.addColorStop(0, `rgba(255,236,156,${dayProgress * (0.26 + sunPulse * 0.04)})`);
    sunGlow.addColorStop(0.45, `rgba(255,178,94,${dayProgress * 0.11})`);
    sunGlow.addColorStop(1, "rgba(255,178,94,0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, W, H);
  }

  // Two tiled cloud strips scrolling left
  // Awan baru: 1539×2134 — scale lebar ke W, pertahankan aspect ratio
  if (assets.cloudsLayer) {
    const cw = assets.cloudsLayer;
    const cloudDrawW = W;
    const cloudDrawH = cloudDrawW * (cw.height / cw.width); // ~1338px tall
    const cloudTopY = positiveModulo(cloudParallaxY, cloudDrawH);
    ctx.globalAlpha = 0.94 - dayProgress * 0.28;
    for (let y = cloudTopY - cloudDrawH; y < H; y += cloudDrawH) {
      ctx.drawImage(cw, -cloudDriftX,     y, cloudDrawW, cloudDrawH);
      ctx.drawImage(cw,  W - cloudDriftX, y, cloudDrawW, cloudDrawH);
    }
    ctx.globalAlpha = 1;
  }

  // Store/ground layer — sinks as stack grows
  if (assets.groundLayer) {
    const gH  = 899;
    const gY  = H - gH + groundOffset;
    ctx.drawImage(assets.groundLayer, 0, gY, W, gH);
  }

  if (dayProgress > 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgba(255,216,150,${dayProgress * 0.18})`);
    grad.addColorStop(0.58, `rgba(255,139,92,${dayProgress * 0.08})`);
    grad.addColorStop(1, `rgba(64,82,142,${dayProgress * 0.16})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawHUD() {
  const hudY = 81 + safeTopCanvasOffset();
  if (assets.scoreCurrent) ctx.drawImage(assets.scoreCurrent, 68, hudY, 275, 101.5);
  if (assets.scoreHigh)    ctx.drawImage(assets.scoreHigh,   720, hudY, 274.5, 97.5);

  // Score pop animation
  const popScale = 1 + (state.scorePopAnim / 0.35) * 0.18;
  ctx.save();
  ctx.translate(249, hudY + 51);
  ctx.scale(popScale, popScale);
  drawSpriteNumber(formatScore(state.score, 3), 0, -18, 105, 38, "center");
  ctx.restore();

  drawSpriteNumber(formatScore(state.highScore, 3), 900, hudY + 30, 105, 38, "center");
}

// ─── Motor ───────────────────────────────────────────────────────────────────
function drawMotor() {
  const groundOffset = groundSceneOffset();
  let drawX;
  if (state.mode === "intro") {
    drawX = state.motorX - MOTOR_W / 2;
  } else {
    drawX = MOTOR_REST_X;
  }
  const drawY = MOTOR_REST_Y_WORLD + groundOffset + state.motorBounce;

  ctx.save();
  ctx.globalAlpha = 1;
  if (assets.motor) ctx.drawImage(assets.motor, drawX, drawY, MOTOR_W, MOTOR_H);
  ctx.restore();
}

// ─── Stack ───────────────────────────────────────────────────────────────────
function drawStack() {
  const sink = sinkOffset();
  const stackWobble = wobbleX();
  state.stack.forEach((box, idx) => {
    const boxH = boxHeightAtScale(box.scale);
    const heightRatio = state.stack.length <= 1 ? 0 : idx / (state.stack.length - 1);
    const screenX = box.x + stackWobble * heightRatio;
    const screenY = worldToScreenY(box.y - boxH / 2) + sink;
    const isTop   = idx === state.stack.length - 1;
    // Squash on fresh land
    let sx = 1, sy = 1;
    if (isTop && box.squashTimer > 0) {
      const p  = box.squashTimer / 0.22;
      const sq = Math.sin(p * Math.PI);  // bell curve
      sx = 1 + sq * 0.14;
      sy = 1 - sq * 0.10;
    }
    drawBox(screenX, screenY, box.rotation + (stackWobble / 850) * heightRatio, sx, sy, box.scale);
  });
}

// ─── Crane ───────────────────────────────────────────────────────────────────
function drawCraneAndCarried() {
  if (!assets.crane) return;
  const craneW = 210;
  const craneH = craneW * (assets.crane.height / assets.crane.width);

  ctx.save();
  ctx.translate(CRANE_ANCHOR.x, CRANE_ANCHOR.y);
  ctx.rotate(state.craneAngle);
  ctx.drawImage(assets.crane, -craneW / 2, 0, craneW, craneH);
  ctx.restore();

  if (state.mode === "play" && state.carriedBox) {
    const tip = craneTip();
    // Gentle sway tilt
    drawBox(tip.x, tip.y, state.craneAngle * 0.08, 1, 1, currentBoxScale());
  }
}

// ─── Falling box ─────────────────────────────────────────────────────────────
function drawFallingBox() {
  if (!state.fallingBox) return;
  const box     = state.fallingBox;
  const screenY = worldToScreenY(box.y - boxHeightAtScale(box.scale) / 2) + sinkOffset(1);
  drawBox(box.x, screenY, box.rotation, 1, 1, box.scale);
}

// ─── Box draw (with squash/stretch) ─────────────────────────────────────────
function drawBox(x, y, rotation, sx, sy, scale = 1) {
  if (!assets.box) return;
  const drawW = boxWidthAtScale(scale);
  const drawH = boxHeightAtScale(scale);
  ctx.save();
  ctx.translate(x, y + drawH / 2);
  ctx.rotate(rotation);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  ctx.drawImage(assets.box, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

// ─── Result screen ────────────────────────────────────────────────────────────
function drawResult() {
  ctx.save();
  ctx.fillStyle = "rgba(20, 35, 85, 0.24)";
  ctx.fillRect(0, 0, W, H);

  if (assets.endingPanel) ctx.drawImage(assets.endingPanel, 154, 294, 772, 1013);
  if (assets.endingLookup) ctx.drawImage(assets.endingLookup, 258, 365, 564, 410);

  drawSpriteNumber(formatScore(state.score, 3), W / 2, 802, 250, 108, "center");
  drawCenteredText("TUMPUK!", W / 2, 960, 62, "#ffdc15", "900", "#d92787");

  if (assets.endingHigh) ctx.drawImage(assets.endingHigh, 383, 1048, 314, 31);
  drawSpriteNumber(formatScore(state.highScore, 3), W / 2, 1102, 250, 94, "center");

  drawRetryButtonPulse();
  ctx.restore();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function drawCoverScreen() {
  if (assets.coverBg) ctx.drawImage(assets.coverBg, 0, 0, W, H);

  if (assets.coverLogo) {
    const logoW = 792;
    const logoH = 717;
    ctx.drawImage(assets.coverLogo, 144, 506, logoW, logoH);
  }

  drawStartButtonPulse();

  if (assets.coverCredit) {
    const creditW = 346;
    const creditH = 22;
    ctx.drawImage(assets.coverCredit, (W - creditW) / 2, 1835, creditW, creditH);
  }
}

function drawStartButtonPulse() {
  if (!assets.coverButton) return;
  const pulse = 1 + Math.sin(state.time * 4.2) * 0.045;
  const glow = 0.22 + (Math.sin(state.time * 4.2) + 1) * 0.11;
  const cx = BTN_START.x + BTN_START.w / 2;
  const cy = BTN_START.y + BTN_START.h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "rgba(255, 219, 36, 0.85)";
  ctx.shadowBlur = 30 + glow * 28;
  ctx.drawImage(assets.coverButton, -BTN_START.w / 2, -BTN_START.h / 2, BTN_START.w, BTN_START.h);
  ctx.restore();
}

function drawRetryButtonPulse() {
  if (!assets.retryButton) return;
  const pulse = 1 + Math.sin(state.time * 4.2) * 0.045;
  const glow = 0.22 + (Math.sin(state.time * 4.2) + 1) * 0.11;
  const cx = BTN_RETRY.x + BTN_RETRY.w / 2;
  const cy = BTN_RETRY.y + BTN_RETRY.h / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "rgba(255, 78, 188, 0.8)";
  ctx.shadowBlur = 28 + glow * 26;
  ctx.drawImage(assets.retryButton, -BTN_RETRY.w / 2, -BTN_RETRY.h / 2, BTN_RETRY.w, BTN_RETRY.h);
  ctx.restore();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function lerpColor(from, to, t) {
  return from.map((value, idx) => Math.round(lerp(value, to[idx], t)));
}

function rgb(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function positiveModulo(value, size) {
  return ((value % size) + size) % size;
}

function formatScore(v, d) {
  return String(Math.max(0, v)).padStart(d, "0").slice(-d);
}

function drawSpriteNumber(value, x, y, maxW, h, align) {
  const chars   = String(value).split("");
  const gap     = -4;
  const sizes   = chars.map(c => {
    const img = assets[`digit${c}`];
    const w   = img ? (img.width / img.height) * h : h * 0.7;
    return { c, img, w };
  });
  const natW    = sizes.reduce((s, i) => s + i.w, 0) + gap * Math.max(0, sizes.length - 1);
  const scale   = natW > maxW ? maxW / natW : 1;
  const totalW  = natW * scale;
  let cursor    = align === "left" ? x : x - totalW / 2;
  sizes.forEach(item => {
    if (!item.img) return;
    const dw = item.w * scale, dh = h * scale;
    ctx.drawImage(item.img, cursor, y + (h - dh) / 2, dw, dh);
    cursor += dw + gap * scale;
  });
}

function drawCenteredText(text, x, y, size, fill, weight, stroke) {
  ctx.save();
  ctx.font = `${weight || "800"} ${size}px Arial, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (stroke) {
    ctx.lineWidth = Math.max(4, size * 0.08);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// ─── Main loop ────────────────────────────────────────────────────────────────
function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
window.__hompimpackDebug = state;
canvas.addEventListener("pointerdown", handleInput, { passive: false });
loadAssets();
requestAnimationFrame(loop);
