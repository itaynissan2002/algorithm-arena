// Shared helpers used by every page section.
const $ = (sel) => document.querySelector(sel);

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Size a canvas's backing store to its CSS size × devicePixelRatio.
// Returns a context already scaled so drawing uses CSS pixels.
function fitCanvas(canvas, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = cssHeight != null ? cssHeight : canvas.clientHeight;
  if (cssHeight != null) canvas.style.height = cssHeight + 'px';
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// Speed slider 1..100 → operations per animation frame (≈0.1 … 256).
function speedToOps(s) {
  return Math.pow(2, (s - 34) / 8);
}
function speedLabel(s) {
  const ops = speedToOps(s) * 60;
  return ops < 10 ? ops.toFixed(1) + ' ops/s' : Math.round(ops).toLocaleString() + ' ops/s';
}

function bindSpeed(input, label) {
  const update = () => { label.textContent = speedLabel(+input.value); };
  input.addEventListener('input', update);
  update();
}

const fmt = (n) => n.toLocaleString();

// ---------- input distributions ----------
const INPUTS = {
  random:   { name: 'Random' },
  nearly:   { name: 'Nearly sorted' },
  reversed: { name: 'Reversed' },
  few:      { name: 'Few unique values' },
};

function makeArray(n, kind, rng = Math.random) {
  const lo = 4, hi = 100;
  let a;
  switch (kind) {
    case 'nearly': {
      a = Array.from({ length: n }, (_, i) => Math.round(lo + (hi - lo) * (i + 1) / n));
      const swaps = Math.max(1, Math.round(n * 0.05));
      for (let k = 0; k < swaps; k++) {
        const i = Math.floor(rng() * n);
        const j = Math.min(n - 1, i + 1 + Math.floor(rng() * 3));
        [a[i], a[j]] = [a[j], a[i]];
      }
      break;
    }
    case 'reversed':
      a = Array.from({ length: n }, (_, i) => Math.round(lo + (hi - lo) * (n - i) / n));
      break;
    case 'few': {
      const vals = [20, 45, 70, 95];
      a = Array.from({ length: n }, () => vals[Math.floor(rng() * vals.length)]);
      break;
    }
    default:
      a = Array.from({ length: n }, () => lo + Math.floor(rng() * (hi - lo + 1)));
  }
  return a;
}

function fillInputSelects() {
  document.querySelectorAll('.input-select').forEach((sel) => {
    sel.innerHTML = Object.entries(INPUTS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  });
}

// Deterministic PRNG so chart measurements are reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A requestAnimationFrame loop that runs `tick(ops)` with fractional op budgets.
class Animator {
  constructor(getOps, tick, onStop) {
    this.getOps = getOps; this.tick = tick; this.onStop = onStop;
    this.running = false; this.acc = 0;
  }
  start() {
    if (this.running) return;
    this.running = true; this.acc = 0;
    const frame = () => {
      if (!this.running) return;
      this.acc += this.getOps();
      const n = Math.floor(this.acc);
      this.acc -= n;
      const keepGoing = this.tick(n);
      if (keepGoing === false) { this.stop(); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.onStop) this.onStop();
  }
}
