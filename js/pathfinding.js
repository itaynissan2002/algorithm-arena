// Grid pathfinding. Cells: 0 empty, 1 wall, 2 weight (cost 5 to enter).
// Algorithms are generators yielding:
//   {t:'frontier', id}  node discovered / queued (free)
//   {t:'visit', id}     node expanded (one operation)
// and returning {path: [ids from start to target] | null, cost}.

const WEIGHT_COST = 5;

class Grid {
  constructor(rows, cols) {
    this.rows = rows; this.cols = cols;
    this.cells = new Uint8Array(rows * cols);
    const mid = rows >> 1;
    this.start = this.id(mid, Math.floor(cols / 4));
    this.end = this.id(mid, Math.floor(cols * 3 / 4));
  }
  id(r, c) { return r * this.cols + c; }
  rc(id) { return [Math.floor(id / this.cols), id % this.cols]; }
  cost(id) { return this.cells[id] === 2 ? WEIGHT_COST : 1; }
  h(id) {
    const [r1, c1] = this.rc(id), [r2, c2] = this.rc(this.end);
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }
  *neighbors(id) {
    const [r, c] = this.rc(id);
    if (r > 0) yield id - this.cols;
    if (c < this.cols - 1) yield id + 1;
    if (r < this.rows - 1) yield id + this.cols;
    if (c > 0) yield id - 1;
  }
  clear(keepWalls = false) {
    if (!keepWalls) this.cells.fill(0);
  }
  randomWalls(density = 0.28) {
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = Math.random() < density ? 1 : 0;
    this.cells[this.start] = this.cells[this.end] = 0;
  }
  randomWeights(density = 0.22) {
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] === 2) this.cells[i] = 0;
      if (this.cells[i] === 0 && Math.random() < density) this.cells[i] = 2;
    }
    this.cells[this.start] = this.cells[this.end] = 0;
  }
  maze() {
    // Recursive backtracker on odd coordinates, then knock out a few walls
    // to create loops (so not every algorithm finds the same path).
    const { rows, cols } = this;
    this.cells.fill(1);
    const odd = (v, max) => Math.min(max - 2, v | 1);
    const [sr, sc] = this.rc(this.start), [er, ec] = this.rc(this.end);
    this.start = this.id(odd(sr, rows), odd(sc, cols));
    this.end = this.id(odd(er, rows), odd(ec, cols));
    const stack = [[1, 1]];
    this.cells[this.id(1, 1)] = 0;
    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const opts = [[-2, 0], [0, 2], [2, 0], [0, -2]].filter(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        return nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && this.cells[this.id(nr, nc)] === 1;
      });
      if (!opts.length) { stack.pop(); continue; }
      const [dr, dc] = opts[Math.floor(Math.random() * opts.length)];
      this.cells[this.id(r + dr / 2, c + dc / 2)] = 0;
      this.cells[this.id(r + dr, c + dc)] = 0;
      stack.push([r + dr, c + dc]);
    }
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = this.id(r, c);
        if (this.cells[i] !== 1 || Math.random() > 0.08) continue;
        const horiz = this.cells[i - 1] === 0 && this.cells[i + 1] === 0;
        const vert = this.cells[i - cols] === 0 && this.cells[i + cols] === 0;
        if (horiz !== vert) this.cells[i] = 0;
      }
    }
    this.cells[this.start] = this.cells[this.end] = 0;
  }
}

// Binary min-heap ordered by an array of keys (lexicographic).
class MinHeap {
  constructor() { this.h = []; }
  get size() { return this.h.length; }
  less(a, b) {
    for (let i = 0; i < a.k.length; i++) if (a.k[i] !== b.k[i]) return a.k[i] < b.k[i];
    return false;
  }
  push(v, k) {
    const h = this.h; h.push({ v, k });
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(h[i], h[p])) break;
      [h[i], h[p]] = [h[p], h[i]]; i = p;
    }
  }
  pop() {
    const h = this.h, top = h[0], last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < h.length && this.less(h[l], h[m])) m = l;
        if (r < h.length && this.less(h[r], h[m])) m = r;
        if (m === i) break;
        [h[i], h[m]] = [h[m], h[i]]; i = m;
      }
    }
    return top.v;
  }
}

function tracePath(g, prev) {
  if (prev[g.end] === -1 && g.end !== g.start) return { path: null, cost: Infinity };
  const path = [];
  let cost = 0;
  for (let at = g.end; at !== -1; at = prev[at]) {
    path.push(at);
    if (at !== g.start) cost += g.cost(at);
  }
  return { path: path.reverse(), cost };
}

function* bfs(g) {
  const N = g.cells.length, prev = new Int32Array(N).fill(-1), seen = new Uint8Array(N);
  const q = [g.start]; seen[g.start] = 1;
  for (let head = 0; head < q.length; head++) {
    const id = q[head];
    yield { t: 'visit', id };
    if (id === g.end) break;
    for (const nb of g.neighbors(id)) {
      if (seen[nb] || g.cells[nb] === 1) continue;
      seen[nb] = 1; prev[nb] = id; q.push(nb);
      yield { t: 'frontier', id: nb };
    }
  }
  return tracePath(g, prev);
}

function* dfs(g) {
  const N = g.cells.length, prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const stack = [g.start];
  while (stack.length) {
    const id = stack.pop();
    if (done[id]) continue;
    done[id] = 1;
    yield { t: 'visit', id };
    if (id === g.end) break;
    const nbs = [...g.neighbors(id)].reverse();
    for (const nb of nbs) {
      if (done[nb] || g.cells[nb] === 1) continue;
      prev[nb] = id; stack.push(nb);
      yield { t: 'frontier', id: nb };
    }
  }
  return tracePath(g, prev);
}

function* bestFirst(g, priority) {
  const N = g.cells.length, prev = new Int32Array(N).fill(-1);
  const dist = new Float64Array(N).fill(Infinity), done = new Uint8Array(N);
  const pq = new MinHeap();
  let seq = 0;
  dist[g.start] = 0;
  pq.push(g.start, [...priority(g.start, 0), seq++]);
  while (pq.size) {
    const id = pq.pop();
    if (done[id]) continue;
    done[id] = 1;
    yield { t: 'visit', id };
    if (id === g.end) break;
    for (const nb of g.neighbors(id)) {
      if (done[nb] || g.cells[nb] === 1) continue;
      const nd = dist[id] + g.cost(nb);
      if (nd < dist[nb]) {
        dist[nb] = nd; prev[nb] = id;
        pq.push(nb, [...priority(nb, nd), seq++]);
        yield { t: 'frontier', id: nb };
      }
    }
  }
  return tracePath(g, prev);
}

const dijkstra = (g) => bestFirst(g, (id, d) => [d]);
const astar = (g) => bestFirst(g, (id, d) => { const h = g.h(id); return [d + h, h]; });
const greedy = (g) => bestFirst(g, (id) => [g.h(id)]);

const PATHS = {
  bfs: {
    name: 'Breadth-First Search', short: 'BFS', fn: bfs, color: '--s1',
    weighted: false, optimal: 'Only without weights', time: 'O(V + E)', space: 'O(V)',
    desc: 'Explores in rings: every node 1 step away, then 2 steps, and so on. Guarantees the fewest steps, but ignores weights — it happily walks through expensive cells.',
  },
  dfs: {
    name: 'Depth-First Search', short: 'DFS', fn: dfs, color: '--s2',
    weighted: false, optimal: 'No', time: 'O(V + E)', space: 'O(V)',
    desc: 'Dives as deep as possible down one branch before backtracking. Cheap in memory, but the path it finds is often absurdly long.',
  },
  dijkstra: {
    name: "Dijkstra's Algorithm", short: 'Dijkstra', fn: dijkstra, color: '--s3',
    weighted: true, optimal: 'Yes', time: 'O((V + E) log V)', space: 'O(V)',
    desc: 'Always expands the closest unexplored node by total cost. Guarantees the cheapest path with weights, but searches in every direction equally.',
  },
  astar: {
    name: 'A* Search', short: 'A*', fn: astar, color: '--s4',
    weighted: true, optimal: 'Yes (admissible heuristic)', time: 'O((V + E) log V)', space: 'O(V)',
    desc: 'Dijkstra plus a heuristic: it prefers nodes whose cost-so-far + estimated distance to the target (Manhattan) is smallest. Still optimal, usually far fewer visits.',
  },
  greedy: {
    name: 'Greedy Best-First', short: 'Greedy', fn: greedy, color: '--s5',
    weighted: true, optimal: 'No', time: 'O((V + E) log V)', space: 'O(V)',
    desc: 'Only looks at the estimated distance to the target, ignoring the cost so far. Blazing fast in open space, easily fooled by walls and weights.',
  },
};

function solveInstant(g, key) {
  const gen = PATHS[key].fn(g);
  let visited = 0, r;
  while (!(r = gen.next()).done) if (r.value.t === 'visit') visited++;
  return { ...r.value, visited };
}

class PathRunner {
  constructor(canvas, grid, key) {
    this.canvas = canvas; this.grid = grid;
    this.reset(key);
  }
  reset(key = this.key) {
    const N = this.grid.cells.length;
    this.key = key;
    this.gen = PATHS[key].fn(this.grid);
    this.order = new Int32Array(N).fill(-1);
    this.frontier = new Uint8Array(N);
    this.visited = 0;
    this.result = null;
    this.searchDone = false;
    this.pathShown = 0;
    this.done = false;
    this.started = false;
  }
  step() {
    if (this.done) return false;
    this.started = true;
    if (!this.searchDone) {
      while (true) {
        const r = this.gen.next();
        if (r.done) { this.result = r.value; this.searchDone = true; return true; }
        const e = r.value;
        if (e.t === 'frontier') { this.frontier[e.id] = 1; continue; }
        this.order[e.id] = this.visited++;
        this.frontier[e.id] = 0;
        return true;
      }
    }
    const len = this.result.path ? this.result.path.length : 0;
    if (this.pathShown < len) { this.pathShown++; return true; }
    this.done = true;
    return false;
  }
  finish() { while (this.step()); }
  draw(colors) {
    const g = this.grid;
    if (!this.size) {
      const w = this.canvas.clientWidth;
      this.cell = w / g.cols;
      this.size = fitCanvas(this.canvas, Math.round(this.cell * g.rows));
    }
    const { ctx, w, h } = this.size, cs = this.cell;
    ctx.fillStyle = colors.cell;
    ctx.fillRect(0, 0, w, h);
    const N = g.cells.length;
    const onPath = new Uint8Array(N);
    if (this.result && this.result.path) {
      for (let i = 0; i < this.pathShown; i++) onPath[this.result.path[i]] = 1;
    }
    const scale = Math.max(40, N * 0.5);
    for (let id = 0; id < N; id++) {
      const r = Math.floor(id / g.cols), c = id % g.cols;
      const x = c * cs, y = r * cs;
      let fill = null;
      if (g.cells[id] === 1) fill = colors.wall;
      else if (onPath[id]) fill = colors.path;
      else if (this.order[id] >= 0) {
        const t = Math.min(1, this.order[id] / scale);
        fill = `hsl(${190 + t * 75} ${colors.dark ? 55 : 70}% ${colors.dark ? 40 : 66}%)`;
      } else if (this.frontier[id]) fill = colors.frontier;
      if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, cs + 0.5, cs + 0.5); }
      if (g.cells[id] === 2) {
        ctx.fillStyle = colors.weight;
        const p = cs * 0.25;
        ctx.fillRect(x + p, y + p, cs - 2 * p, cs - 2 * p);
      }
    }
    // grid lines
    if (cs >= 8) {
      ctx.strokeStyle = colors.line; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 0; c <= g.cols; c++) { const x = Math.round(c * cs) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let r = 0; r <= g.rows; r++) { const y = Math.round(r * cs) + 0.5; ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
    }
    for (const [id, col] of [[g.start, colors.start], [g.end, colors.end]]) {
      const [r, c] = g.rc(id);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(c * cs + cs / 2, r * cs + cs / 2, cs * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  resize() { this.size = null; }
}

function pathColors() {
  return {
    cell: cssVar('--cell'), line: cssVar('--cell-line'), wall: cssVar('--wall'),
    weight: cssVar('--weight'), frontier: cssVar('--frontier'), path: cssVar('--path'),
    start: cssVar('--start'), end: cssVar('--end'),
    dark: document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches),
  };
}

const PathTab = (() => {
  let grid, runner, colors, anim, raceRunners = [], mode = 'single', places = 0;
  const canvas = $('#pathCanvas'), algoSel = $('#pathAlgo'), speed = $('#pathSpeed');
  const playBtn = $('#pathPlay'), raceBtn = $('#pathRace');

  function makeGrid() {
    const w = canvas.clientWidth || Math.min(window.innerWidth, 1280) - 80;
    const small = window.innerWidth < 640;
    let cols = Math.floor(w / (small ? 15 : 22));
    if (cols % 2 === 0) cols--;
    grid = new Grid(small ? 25 : 23, Math.max(15, cols));
  }

  function optimalCost() { return solveInstant(grid, 'dijkstra').cost; }

  function updateStats() {
    $('#pVisited').textContent = fmt(runner.visited);
    const res = runner.searchDone ? runner.result : null;
    $('#pLen').textContent = res ? (res.path ? fmt(res.path.length - 1) : 'none') : '–';
    $('#pCost').textContent = res ? (res.path ? fmt(res.cost) : '∞') : '–';
    if (res) {
      const best = optimalCost();
      const opt = res.path && res.cost === best;
      $('#pOpt').innerHTML = !res.path ? 'No path' : opt ? '<span class="good">Yes</span>' : `<span class="bad">No (+${res.cost - best})</span>`;
    } else $('#pOpt').textContent = '–';
  }

  function render() {
    if (mode === 'single') runner.draw(colors);
    else raceRunners.forEach((r) => drawRaceCard(r));
    updateStats();
  }

  function renderInfo() {
    const m = PATHS[algoSel.value];
    $('#pathInfo').innerHTML = `
      <h3><span class="dot" style="background:var(${m.color})"></span>${m.name}</h3>
      <p>${m.desc}</p>
      <div class="chips">
        <span class="chip">Time <b>${m.time}</b></span>
        <span class="chip">Memory <b>${m.space}</b></span>
        <span class="chip">Uses weights: <b>${m.weighted ? 'yes' : 'no'}</b></span>
        <span class="chip">Shortest path: <b>${m.optimal}</b></span>
      </div>`;
  }

  // Leave race mode and clear any visualization (grid edits, new algorithm…)
  function toSingle() {
    anim.stop();
    mode = 'single';
    $('#pathStage').hidden = false;
    $('#pathSingleInfo').hidden = false;
    $('#pathRaceGrid').hidden = true;
    $('#pathResults').hidden = true;
    raceBtn.textContent = 'Race all';
  }
  function resetVis() {
    toSingle();
    runner.reset(algoSel.value);
    playBtn.textContent = 'Visualize';
    render();
  }

  // ---------- race ----------
  function buildRace() {
    const host = $('#pathRaceGrid');
    host.innerHTML = '';
    places = 0;
    raceRunners = Object.entries(PATHS).map(([key, m]) => {
      const card = document.createElement('div');
      card.className = 'race-card';
      card.innerHTML = `
        <div class="rc-head"><span class="dot" style="background:var(${m.color})"></span>${m.name}<span class="place">–</span></div>
        <canvas></canvas>
        <div class="rc-stats"><span class="ops">0 visited</span><span class="detail"></span></div>`;
      host.appendChild(card);
      const r = new PathRunner(card.querySelector('canvas'), grid, key);
      r.card = card; r.place = 0;
      return r;
    });
  }
  function drawRaceCard(r) {
    r.draw(colors);
    r.card.querySelector('.ops').textContent = fmt(r.visited) + ' visited';
    const res = r.searchDone ? r.result : null;
    r.card.querySelector('.detail').textContent = res ? (res.path ? `cost ${res.cost}` : 'no path') : '';
    r.card.querySelector('.place').textContent = r.place ? '#' + r.place : '–';
  }
  function showRaceResults() {
    const best = optimalCost();
    const rows = raceRunners.slice().sort((a, b) => a.visited - b.visited);
    const max = Math.max(...rows.map((r) => r.visited), 1);
    $('#pathTable').innerHTML = `
      <thead><tr><th>Algorithm</th><th class="num">Nodes visited</th><th class="num">Path length</th><th class="num">Path cost</th><th>Optimal</th><th class="barcell">Search effort</th></tr></thead>
      <tbody>${rows.map((r) => {
        const res = r.result, m = PATHS[r.key];
        const opt = res.path && res.cost === best;
        return `<tr>
          <td><span class="name"><span class="dot" style="background:var(${m.color})"></span>${m.name}</span></td>
          <td class="num">${fmt(r.visited)}</td>
          <td class="num">${res.path ? fmt(res.path.length - 1) : '–'}</td>
          <td class="num">${res.path ? fmt(res.cost) : '–'}</td>
          <td>${!res.path ? 'No path' : opt ? '<span class="good">✓ Yes</span>' : `<span class="bad">✗ +${res.cost - best}</span>`}</td>
          <td class="barcell"><div class="minibar" style="width:${(r.visited / max) * 100}%;background:var(${m.color})"></div></td>
        </tr>`;
      }).join('')}</tbody>`;
    $('#pathResults').hidden = false;
  }

  // ---------- pointer editing ----------
  function cellAt(ev) {
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((ev.clientX - rect.left) / (rect.width / grid.cols));
    const r = Math.floor((ev.clientY - rect.top) / (rect.height / grid.rows));
    if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) return -1;
    return grid.id(r, c);
  }
  function bindPointer() {
    let drag = null; // 'start' | 'end' | {paint: value}
    const apply = (id) => {
      if (id < 0) return;
      if (drag === 'start' || drag === 'end') {
        if (grid.cells[id] === 1 || id === grid.start || id === grid.end) return;
        grid[drag] = id;
      } else {
        if (id === grid.start || id === grid.end) return;
        if (grid.cells[id] === drag.paint) return;
        grid.cells[id] = drag.paint;
      }
      afterEdit();
    };
    canvas.addEventListener('pointerdown', (ev) => {
      const id = cellAt(ev);
      if (id < 0) return;
      canvas.setPointerCapture(ev.pointerId);
      if (id === grid.start) drag = 'start';
      else if (id === grid.end) drag = 'end';
      else {
        const brush = +$('#pathBrush').value;
        drag = { paint: grid.cells[id] === brush ? 0 : brush };
        apply(id);
      }
    });
    canvas.addEventListener('pointermove', (ev) => { if (drag) apply(cellAt(ev)); });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
  // After an edit: if a run had finished, recompute instantly; otherwise clear.
  function afterEdit() {
    if (mode === 'race') toSingle();
    const wasDone = runner.done;
    anim.stop();
    runner.reset(algoSel.value);
    if (wasDone) runner.finish();
    playBtn.textContent = wasDone ? 'Replay' : 'Visualize';
    render();
  }

  function init() {
    makeGrid();
    colors = pathColors();
    algoSel.innerHTML = Object.entries(PATHS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    algoSel.value = 'astar';
    runner = new PathRunner(canvas, grid, algoSel.value);
    anim = new Animator(
      () => speedToOps(+speed.value),
      (ops) => {
        if (mode === 'single') {
          for (let i = 0; i < Math.max(ops, runner.searchDone ? 1 : 0); i++) if (!runner.step()) break;
          render();
          return !runner.done;
        }
        const finished = [];
        for (const r of raceRunners) {
          const was = r.searchDone;
          for (let i = 0; i < Math.max(ops, r.searchDone ? 1 : 0); i++) if (!r.step()) break;
          if (!was && r.searchDone) finished.push(r);
        }
        finished.sort((a, b) => a.visited - b.visited);
        for (const r of finished) { r.place = ++places; r.card.classList.add('finished'); }
        render();
        if (raceRunners.every((r) => r.done)) { showRaceResults(); return false; }
        return true;
      },
      () => {
        if (mode === 'single') playBtn.textContent = runner.done ? 'Replay' : 'Resume';
        else raceBtn.textContent = raceRunners.every((r) => r.done) ? 'Race again' : 'Resume race';
      }
    );

    bindSpeed(speed, $('#pathSpeedVal'));
    bindPointer();
    algoSel.addEventListener('change', () => { renderInfo(); resetVis(); });
    $('#pathMaze').addEventListener('click', () => { grid.maze(); resetVis(); });
    $('#pathRandom').addEventListener('click', () => { grid.randomWalls(); resetVis(); });
    $('#pathWeights').addEventListener('click', () => { grid.randomWeights(); resetVis(); });
    $('#pathClear').addEventListener('click', () => { grid.clear(); resetVis(); });
    playBtn.addEventListener('click', () => {
      if (mode === 'race') toSingle();
      if (anim.running) { anim.stop(); return; }
      if (runner.done || runner.started && playBtn.textContent === 'Visualize') runner.reset(algoSel.value);
      playBtn.textContent = 'Pause';
      render();
      anim.start();
    });
    raceBtn.addEventListener('click', () => {
      if (mode === 'race' && anim.running) { anim.stop(); return; }
      if (mode !== 'race' || raceRunners.every((r) => r.done)) {
        anim.stop();
        mode = 'race';
        runner.reset(algoSel.value);
        playBtn.textContent = 'Visualize';
        $('#pathStage').hidden = true;
        $('#pathSingleInfo').hidden = true;
        $('#pathResults').hidden = true;
        const host = $('#pathRaceGrid');
        host.hidden = false;
        buildRace();
        host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      raceBtn.textContent = 'Pause race';
      anim.start();
    });

    renderInfo();
    render();
  }

  return {
    init,
    resize() { runner.resize(); raceRunners.forEach((r) => r.resize()); render(); },
    retheme() { colors = pathColors(); render(); },
    pause() { anim.stop(); },
  };
})();
