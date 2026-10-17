// Compare tab: empirical growth chart + complexity tables.
const CompareTab = (() => {
  const SIZES = Array.from({ length: 30 }, (_, i) => (i + 1) * 10);
  const TRIALS = 2;
  const cache = {};           // input kind -> {key: [ops per size]}
  const hidden = new Set();   // series toggled off in the legend
  let hoverIdx = -1, built = false, size = null;
  const canvas = $('#chartCanvas'), tip = $('#chartTip');
  const inputSel = $('#chartInput'), scaleSel = $('#chartScale');

  function measure(kind) {
    if (cache[kind]) return cache[kind];
    const out = {};
    for (const key of Object.keys(SORTS)) out[key] = [];
    SIZES.forEach((n, si) => {
      for (let t = 0; t < TRIALS; t++) {
        const arr = makeArray(n, kind, mulberry32(n * 7919 + t));
        for (const key of Object.keys(SORTS)) {
          out[key][si] = (out[key][si] || 0) + measureSort(key, arr).ops / TRIALS;
        }
      }
    });
    return (cache[kind] = out);
  }

  function niceTicks(max) {
    const step0 = max / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
    const ticks = [];
    for (let v = 0; v <= max + step * 0.01; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }
  const short = (v) => v >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? +(v / 1e3).toFixed(1) + 'k' : String(Math.round(v));

  function draw() {
    if (!size) size = fitCanvas(canvas);
    const { ctx, w, h } = size;
    const data = measure(inputSel.value);
    const log = scaleSel.value === 'log';
    const keys = Object.keys(SORTS).filter((k) => !hidden.has(k));
    const textMuted = cssVar('--muted'), grid = cssVar('--border'), text2 = cssVar('--text-2');
    const pad = { l: 62, r: 14, t: 10, b: 34 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px Inter, system-ui, sans-serif';

    let maxV = 1, minV = Infinity;
    keys.forEach((k) => data[k].forEach((v) => { if (v > maxV) maxV = v; if (v > 0 && v < minV) minV = v; }));
    let ticks, y;
    if (log) {
      const top = Math.ceil(Math.log10(maxV));
      const bot = Math.min(top - 1, Math.floor(Math.log10(minV)));
      ticks = Array.from({ length: top - bot + 1 }, (_, i) => Math.pow(10, bot + i));
      y = (v) => pad.t + ph - ((Math.log10(Math.max(1, v)) - bot) / (top - bot)) * ph;
    } else {
      ticks = niceTicks(maxV);
      const top = ticks[ticks.length - 1];
      y = (v) => pad.t + ph - (v / top) * ph;
    }
    const x = (i) => pad.l + ((SIZES[i] - SIZES[0]) / (SIZES[SIZES.length - 1] - SIZES[0])) * pw;

    // grid + y labels
    ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.fillStyle = textMuted;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const t of ticks) {
      const yy = Math.round(y(t)) + 0.5;
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
      ctx.fillText(short(t), pad.l - 8, yy);
    }
    // x labels
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    SIZES.forEach((n, i) => { if (n % 50 === 0) ctx.fillText(n, x(i), h - pad.b + 8); });
    ctx.fillStyle = text2;
    ctx.fillText('Array size (n)', pad.l + pw / 2, h - 14);
    ctx.save();
    ctx.translate(12, pad.t + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText('Operations', 0, 0);
    ctx.restore();

    // crosshair
    if (hoverIdx >= 0) {
      ctx.strokeStyle = textMuted; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(Math.round(x(hoverIdx)) + 0.5, pad.t); ctx.lineTo(Math.round(x(hoverIdx)) + 0.5, pad.t + ph); ctx.stroke();
      ctx.setLineDash([]);
    }
    // lines
    const surface = cssVar('--surface');
    for (const k of keys) {
      const col = cssVar(SORTS[k].color);
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      data[k].forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
      ctx.stroke();
      if (hoverIdx >= 0) {
        ctx.beginPath(); ctx.arc(x(hoverIdx), y(data[k][hoverIdx]), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = surface; ctx.stroke();
      }
    }
    return { x, pad, pw };
  }

  function legend() {
    $('#chartLegend').innerHTML = Object.entries(SORTS).map(([k, m]) =>
      `<button class="legend-item${hidden.has(k) ? ' off' : ''}" data-k="${k}" aria-pressed="${!hidden.has(k)}">
        <span class="dot" style="background:var(${m.color})"></span>${m.name}</button>`).join('');
  }

  function table() {
    const data = measure(inputSel.value);
    const cols = [10, 50, 100, 200, 300].map((n) => SIZES.indexOf(n));
    $('#chartTable').innerHTML = `
      <thead><tr><th>Algorithm</th>${cols.map((i) => `<th class="num">n = ${SIZES[i]}</th>`).join('')}</tr></thead>
      <tbody>${Object.entries(SORTS).map(([k, m]) => `<tr>
        <td><span class="name"><span class="dot" style="background:var(${m.color})"></span>${m.name}</span></td>
        ${cols.map((i) => `<td class="num">${fmt(Math.round(data[k][i]))}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }

  function staticTables() {
    $('#sortComplexity').innerHTML = `
      <thead><tr><th>Algorithm</th><th>Best</th><th>Average</th><th>Worst</th><th>Memory</th><th>Stable</th><th>In-place</th></tr></thead>
      <tbody>${Object.values(SORTS).map((m) => `<tr>
        <td><span class="name"><span class="dot" style="background:var(${m.color})"></span>${m.name}</span></td>
        <td class="mono">${m.best}</td><td class="mono">${m.avg}</td><td class="mono">${m.worst}</td><td class="mono">${m.space}</td>
        <td>${m.stable ? '<span class="good">✓ Yes</span>' : '<span class="bad">✗ No</span>'}</td>
        <td>${m.inPlace ? '<span class="good">✓ Yes</span>' : '<span class="bad">✗ No</span>'}</td></tr>`).join('')}</tbody>`;
    $('#pathComplexity').innerHTML = `
      <thead><tr><th>Algorithm</th><th>Time</th><th>Memory</th><th>Handles weights</th><th>Shortest path guaranteed</th></tr></thead>
      <tbody>${Object.values(PATHS).map((m) => `<tr>
        <td><span class="name"><span class="dot" style="background:var(${m.color})"></span>${m.name}</span></td>
        <td class="mono">${m.time}</td><td class="mono">${m.space}</td>
        <td>${m.weighted ? '<span class="good">✓ Yes</span>' : '<span class="bad">✗ No</span>'}</td>
        <td>${m.optimal}</td></tr>`).join('')}</tbody>`;
  }

  function onMove(ev) {
    const rect = canvas.getBoundingClientRect();
    const geo = draw();
    const mx = ev.clientX - rect.left;
    if (mx < geo.pad.l - 10 || mx > geo.pad.l + geo.pw + 10) { onLeave(); return; }
    const t = (mx - geo.pad.l) / geo.pw;
    const idx = Math.max(0, Math.min(SIZES.length - 1, Math.round(t * (SIZES.length - 1))));
    if (idx !== hoverIdx) { hoverIdx = idx; draw(); }
    const data = measure(inputSel.value);
    const rows = Object.keys(SORTS).filter((k) => !hidden.has(k))
      .map((k) => [k, data[k][idx]]).sort((a, b) => b[1] - a[1]);
    tip.innerHTML = `<div class="tt-title">n = ${SIZES[idx]}</div>` + rows.map(([k, v]) =>
      `<div class="tt-row"><span class="dot" style="background:var(${SORTS[k].color})"></span>${SORTS[k].name}<b>${fmt(Math.round(v))}</b></div>`).join('');
    tip.hidden = false;
    const px = geo.x(idx);
    const tw = tip.offsetWidth;
    tip.style.left = (px + 16 + tw > rect.width ? px - 16 - tw : px + 16) + 'px';
    tip.style.top = '10px';
  }
  function onLeave() {
    tip.hidden = true;
    if (hoverIdx !== -1) { hoverIdx = -1; draw(); }
  }

  function init() {
    staticTables();
    legend();
    $('#chartLegend').addEventListener('click', (ev) => {
      const b = ev.target.closest('.legend-item');
      if (!b) return;
      const k = b.dataset.k;
      hidden.has(k) ? hidden.delete(k) : hidden.add(k);
      if (hidden.size === Object.keys(SORTS).length) hidden.delete(k); // keep at least one
      legend(); draw();
    });
    inputSel.addEventListener('change', () => { draw(); table(); });
    scaleSel.addEventListener('change', draw);
    $('#chartTableToggle').addEventListener('click', (ev) => {
      const wrap = $('#chartTableWrap');
      wrap.hidden = !wrap.hidden;
      ev.target.textContent = wrap.hidden ? 'Show table' : 'Hide table';
      if (!wrap.hidden) table();
    });
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
  }

  return {
    init,
    show() { built = true; size = null; draw(); },
    resize() { if (built) { size = null; draw(); } },
    retheme() { if (built) draw(); },
  };
})();
