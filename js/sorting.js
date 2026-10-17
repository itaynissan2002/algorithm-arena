// Sorting algorithms as generators. Each mutates the array in place and yields
// events the visualizer uses for highlighting and counting:
//   {t:'cmp', a, b}   compare a[a] with a[b]
//   {t:'swap', a, b}  a[a] and a[b] were swapped
//   {t:'write', a}    a[a] was overwritten
//   {t:'read', a}     a[a] was read (non-comparison sorts)
//   {t:'sorted', a}   index a is in its final position (free, not an op)

function* bubbleSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      yield { t: 'cmp', a: j, b: j + 1 };
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        yield { t: 'swap', a: j, b: j + 1 };
      }
    }
    yield { t: 'sorted', a: n - 1 - i };
    if (!swapped) break;
  }
}

function* selectionSort(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      yield { t: 'cmp', a: min, b: j };
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      yield { t: 'swap', a: i, b: min };
    }
    yield { t: 'sorted', a: i };
  }
}

function* insertionSort(a) {
  for (let i = 1; i < a.length; i++) {
    for (let j = i; j > 0; j--) {
      yield { t: 'cmp', a: j - 1, b: j };
      if (a[j - 1] <= a[j]) break;
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
      yield { t: 'swap', a: j - 1, b: j };
    }
  }
}

function* shellSort(a) {
  const n = a.length;
  // Ciura's gap sequence, extended by ×2.25
  const gaps = [1, 4, 10, 23, 57, 132, 301, 701];
  while (gaps[gaps.length - 1] < n) gaps.push(Math.floor(gaps[gaps.length - 1] * 2.25));
  for (let g = gaps.length - 1; g >= 0; g--) {
    const gap = gaps[g];
    if (gap >= n) continue;
    for (let i = gap; i < n; i++) {
      for (let j = i; j >= gap; j -= gap) {
        yield { t: 'cmp', a: j - gap, b: j };
        if (a[j - gap] <= a[j]) break;
        [a[j - gap], a[j]] = [a[j], a[j - gap]];
        yield { t: 'swap', a: j - gap, b: j };
      }
    }
  }
}

function* mergeSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const mid = (lo + hi) >> 1;
  yield* mergeSort(a, lo, mid);
  yield* mergeSort(a, mid + 1, hi);
  const left = a.slice(lo, mid + 1);
  const right = a.slice(mid + 1, hi + 1);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    yield { t: 'cmp', a: k, b: mid + 1 + j };
    a[k] = left[i] <= right[j] ? left[i++] : right[j++];
    yield { t: 'write', a: k++ };
  }
  while (i < left.length) { a[k] = left[i++]; yield { t: 'write', a: k++ }; }
  while (j < right.length) { a[k] = right[j++]; yield { t: 'write', a: k++ }; }
}

function* quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo > hi) return;
  if (lo === hi) { yield { t: 'sorted', a: lo }; return; }
  // Lomuto partition, last element as pivot (degrades on sorted input — on purpose!)
  const pivot = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    yield { t: 'cmp', a: j, b: hi };
    if (a[j] < pivot) {
      if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; yield { t: 'swap', a: i, b: j }; }
      i++;
    }
  }
  if (i !== hi) { [a[i], a[hi]] = [a[hi], a[i]]; yield { t: 'swap', a: i, b: hi }; }
  yield { t: 'sorted', a: i };
  yield* quickSort(a, lo, i - 1);
  yield* quickSort(a, i + 1, hi);
}

function* heapSort(a) {
  const n = a.length;
  function* siftDown(i, size) {
    while (true) {
      const l = 2 * i + 1, r = l + 1;
      let largest = i;
      if (l < size) { yield { t: 'cmp', a: l, b: largest }; if (a[l] > a[largest]) largest = l; }
      if (r < size) { yield { t: 'cmp', a: r, b: largest }; if (a[r] > a[largest]) largest = r; }
      if (largest === i) return;
      [a[i], a[largest]] = [a[largest], a[i]];
      yield { t: 'swap', a: i, b: largest };
      i = largest;
    }
  }
  for (let i = (n >> 1) - 1; i >= 0; i--) yield* siftDown(i, n);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    yield { t: 'swap', a: 0, b: end };
    yield { t: 'sorted', a: end };
    yield* siftDown(0, end);
  }
}

function* radixSort(a) {
  // LSD radix sort, base 10. Never compares two elements.
  const n = a.length;
  const max = Math.max(...a);
  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    const buckets = Array.from({ length: 10 }, () => []);
    for (let i = 0; i < n; i++) {
      yield { t: 'read', a: i };
      buckets[Math.floor(a[i] / exp) % 10].push(a[i]);
    }
    let k = 0;
    for (const b of buckets) for (const v of b) { a[k] = v; yield { t: 'write', a: k++ }; }
  }
}

const SORTS = {
  bubble: {
    name: 'Bubble Sort', fn: bubbleSort, color: '--s1',
    best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true, inPlace: true,
    desc: 'Repeatedly walks the array swapping adjacent out-of-order pairs, so the largest value "bubbles" to the end each pass. Simple, but does a huge number of swaps.',
  },
  selection: {
    name: 'Selection Sort', fn: selectionSort, color: '--s2',
    best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: false, inPlace: true,
    desc: 'Scans the unsorted part for the minimum and puts it in place. Always does ~n²/2 comparisons, but at most n−1 swaps — handy when writes are expensive.',
  },
  insertion: {
    name: 'Insertion Sort', fn: insertionSort, color: '--s3',
    best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true, inPlace: true,
    desc: 'Grows a sorted prefix by sliding each new element left until it fits. Excellent on small or nearly sorted data — that is why real-world hybrids (Timsort, introsort) use it for small runs.',
  },
  shell: {
    name: 'Shell Sort', fn: shellSort, color: '--s4',
    best: 'O(n log n)', avg: '≈O(n^1.3)', worst: 'O(n^1.5)', space: 'O(1)', stable: false, inPlace: true,
    desc: 'Insertion sort over shrinking gaps (Ciura sequence). Far-apart elements move early, so the final gap-1 pass has little left to do.',
  },
  merge: {
    name: 'Merge Sort', fn: mergeSort, color: '--s5',
    best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: true, inPlace: false,
    desc: 'Divide and conquer: split in half, sort each half recursively, then merge. Guaranteed n log n regardless of input, at the cost of extra memory.',
  },
  quick: {
    name: 'Quick Sort', fn: quickSort, color: '--s6',
    best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: false, inPlace: true,
    desc: 'Picks a pivot (here: the last element), partitions smaller values left and larger right, then recurses. Very fast on random data — try "Reversed" or "Nearly sorted" to see its worst case.',
  },
  heap: {
    name: 'Heap Sort', fn: heapSort, color: '--s7',
    best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: false, inPlace: true,
    desc: 'Builds a max-heap, then repeatedly moves the root (the maximum) to the end and restores the heap. Guaranteed n log n with no extra memory.',
  },
  radix: {
    name: 'Radix Sort', fn: radixSort, color: '--s8',
    best: 'O(nk)', avg: 'O(nk)', worst: 'O(nk)', space: 'O(n + b)', stable: true, inPlace: false,
    desc: 'A non-comparison sort: distributes numbers into buckets digit by digit (least significant first). Zero comparisons — it breaks the n log n lower bound by exploiting the structure of integers.',
  },
};

// Run an algorithm to completion without drawing; returns operation counts.
function measureSort(key, arr) {
  const a = arr.slice();
  const s = { cmp: 0, swap: 0, write: 0, read: 0 };
  for (const e of SORTS[key].fn(a)) if (e.t in s) s[e.t]++;
  s.ops = s.cmp + s.swap + s.write + s.read;
  return s;
}

class SortRunner {
  constructor(canvas, key, data) {
    this.canvas = canvas;
    this.reset(key, data);
  }
  reset(key, data) {
    this.key = key;
    this.arr = data.slice();
    this.gen = SORTS[key].fn(this.arr);
    this.stats = { cmp: 0, swap: 0, write: 0, read: 0, steps: 0 };
    this.hl = null;
    this.sorted = new Uint8Array(data.length);
    this.done = false;
    this.sweep = 0;
  }
  // Advance one counted operation. Returns false once finished.
  step() {
    if (this.done) return false;
    while (true) {
      const r = this.gen.next();
      if (r.done) { this.done = true; this.hl = null; return false; }
      const e = r.value;
      if (e.t === 'sorted') { this.sorted[e.a] = 1; continue; }
      this.stats[e.t]++;
      this.stats.steps++;
      this.hl = e;
      return true;
    }
  }
  draw(colors) {
    const { ctx, w, h } = this.size || (this.size = fitCanvas(this.canvas));
    const a = this.arr, n = a.length;
    ctx.clearRect(0, 0, w, h);
    const bw = w / n;
    const gap = bw > 4 ? Math.min(2, bw * 0.2) : 0;
    const hl = this.hl;
    const sweepTo = this.done ? this.sweep : -1;
    for (let i = 0; i < n; i++) {
      let c = colors.bar;
      if (i < sweepTo || this.sorted[i]) c = colors.sorted;
      if (hl) {
        if (i === hl.a || i === hl.b) {
          c = hl.t === 'cmp' || hl.t === 'read' ? colors.compare : colors.swap;
        }
      }
      const bh = Math.max(2, (a[i] / 100) * (h - 4));
      ctx.fillStyle = c;
      const x = i * bw + gap / 2, y = h - bh, ww = Math.max(1, bw - gap);
      if (ww > 5 && ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x, y, ww, bh, [Math.min(4, ww / 2), Math.min(4, ww / 2), 0, 0]); ctx.fill();
      } else {
        ctx.fillRect(x, y, ww, bh);
      }
    }
  }
  resize() { this.size = null; }
}

function sortColors() {
  return {
    bar: cssVar('--bar'), compare: cssVar('--bar-compare'),
    swap: cssVar('--bar-swap'), sorted: cssVar('--bar-sorted'),
  };
}

// ================= Single-algorithm tab =================
const SortTab = (() => {
  let runner, data, colors, anim;
  const algoSel = $('#sortAlgo'), inputSel = $('#sortInput');
  const size = $('#sortSize'), speed = $('#sortSpeed');
  const playBtn = $('#sortPlay');

  function newData() {
    data = makeArray(+size.value, inputSel.value);
    resetRunner();
  }
  function resetRunner() {
    anim.stop();
    runner.reset(algoSel.value, data);
    render();
  }
  function render() {
    runner.draw(colors);
    const s = runner.stats;
    $('#stCmp').textContent = fmt(s.cmp);
    $('#stSwap').textContent = fmt(s.swap);
    $('#stWrite').textContent = fmt(s.write);
    $('#stSteps').textContent = fmt(s.steps);
  }
  function renderInfo() {
    const m = SORTS[algoSel.value];
    $('#sortInfo').innerHTML = `
      <h3><span class="dot" style="background:var(${m.color})"></span>${m.name}</h3>
      <p>${m.desc}</p>
      <div class="chips">
        <span class="chip">Best <b>${m.best}</b></span>
        <span class="chip">Average <b>${m.avg}</b></span>
        <span class="chip">Worst <b>${m.worst}</b></span>
        <span class="chip">Memory <b>${m.space}</b></span>
        <span class="chip">${m.stable ? 'Stable' : 'Not stable'}</span>
      </div>`;
  }

  function init() {
    algoSel.innerHTML = Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    algoSel.value = 'quick';
    colors = sortColors();
    runner = new SortRunner($('#sortCanvas'), algoSel.value, []);
    anim = new Animator(
      () => speedToOps(+speed.value),
      (ops) => {
        if (runner.done) {
          // green sweep after completion
          runner.sweep += Math.max(1, runner.arr.length / 40);
          render();
          return runner.sweep < runner.arr.length;
        }
        for (let i = 0; i < ops; i++) if (!runner.step()) break;
        render();
        return true;
      },
      () => { playBtn.textContent = runner.done ? 'Replay' : 'Play'; }
    );

    bindSpeed(speed, $('#sortSpeedVal'));
    size.addEventListener('input', () => { $('#sortSizeVal').textContent = size.value; newData(); });
    inputSel.addEventListener('change', newData);
    algoSel.addEventListener('change', () => { renderInfo(); resetRunner(); playBtn.textContent = 'Play'; });
    $('#sortShuffle').addEventListener('click', () => { newData(); playBtn.textContent = 'Play'; });
    $('#sortStep').addEventListener('click', () => {
      anim.stop();
      if (runner.done) return;
      runner.step();
      render();
      playBtn.textContent = runner.done ? 'Replay' : 'Play';
    });
    playBtn.addEventListener('click', () => {
      if (anim.running) { anim.stop(); return; }
      if (runner.done) resetRunner();
      playBtn.textContent = 'Pause';
      anim.start();
    });

    renderInfo();
    newData();
  }
  return {
    init,
    resize() { runner.resize(); render(); },
    retheme() { colors = sortColors(); render(); },
    pause() { anim.stop(); },
  };
})();

// ================= Race tab =================
const RaceTab = (() => {
  let runners = [], data, colors, anim, places = 0;
  const grid = $('#raceGrid'), inputSel = $('#raceInput');
  const size = $('#raceSize'), speed = $('#raceSpeed'), playBtn = $('#racePlay');

  function build() {
    grid.innerHTML = '';
    runners = Object.entries(SORTS).map(([key, m]) => {
      const card = document.createElement('div');
      card.className = 'race-card';
      card.innerHTML = `
        <div class="rc-head"><span class="dot" style="background:var(${m.color})"></span>${m.name}<span class="place">–</span></div>
        <canvas></canvas>
        <div class="rc-stats"><span class="ops">0 ops</span><span class="detail"></span></div>`;
      grid.appendChild(card);
      const r = new SortRunner(card.querySelector('canvas'), key, []);
      r.card = card;
      return r;
    });
  }
  function newData() {
    data = makeArray(+size.value, inputSel.value);
    reset();
  }
  function reset() {
    anim.stop();
    places = 0;
    $('#raceResults').hidden = true;
    for (const r of runners) {
      r.reset(r.key, data);
      r.place = 0;
      r.card.classList.remove('finished');
    }
    render();
    playBtn.textContent = 'Start race';
  }
  function render() {
    for (const r of runners) {
      r.draw(colors);
      r.card.querySelector('.ops').textContent = fmt(r.stats.steps) + ' ops';
      r.card.querySelector('.detail').textContent =
        r.key === 'radix' ? `${fmt(r.stats.write)} writes` : `${fmt(r.stats.cmp)} cmp`;
      r.card.querySelector('.place').textContent = r.place ? ordinal(r.place) : '–';
    }
  }
  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function showResults() {
    const sorted = runners.slice().sort((a, b) => a.place - b.place);
    const max = Math.max(...sorted.map((r) => r.stats.steps), 1);
    $('#raceTable').innerHTML = `
      <thead><tr><th>Place</th><th>Algorithm</th><th class="num">Total ops</th><th class="num">Comparisons</th><th class="num">Swaps</th><th class="num">Writes</th><th class="barcell">Relative work</th></tr></thead>
      <tbody>${sorted.map((r) => `
        <tr>
          <td class="mono">${ordinal(r.place)}</td>
          <td><span class="name"><span class="dot" style="background:var(${SORTS[r.key].color})"></span>${SORTS[r.key].name}</span></td>
          <td class="num">${fmt(r.stats.steps)}</td>
          <td class="num">${fmt(r.stats.cmp)}</td>
          <td class="num">${fmt(r.stats.swap)}</td>
          <td class="num">${fmt(r.stats.write)}</td>
          <td class="barcell"><div class="minibar" style="width:${(r.stats.steps / max) * 100}%;background:var(${SORTS[r.key].color})"></div></td>
        </tr>`).join('')}
      </tbody>`;
    $('#raceResults').hidden = false;
  }

  function init() {
    colors = sortColors();
    build();
    anim = new Animator(
      () => speedToOps(+speed.value),
      (ops) => {
        const finishedNow = [];
        for (const r of runners) {
          if (r.done) continue;
          for (let i = 0; i < ops; i++) if (!r.step()) break;
          if (r.done) finishedNow.push(r);
        }
        finishedNow.sort((a, b) => a.stats.steps - b.stats.steps);
        for (const r of finishedNow) {
          r.place = ++places;
          r.sweep = r.arr.length;
          r.card.classList.add('finished');
        }
        render();
        if (runners.every((r) => r.done)) { showResults(); return false; }
        return true;
      },
      () => { playBtn.textContent = runners.every((r) => r.done) ? 'Race again' : 'Resume'; }
    );
    bindSpeed(speed, $('#raceSpeedVal'));
    size.addEventListener('input', () => { $('#raceSizeVal').textContent = size.value; newData(); });
    inputSel.addEventListener('change', newData);
    $('#raceShuffle').addEventListener('click', newData);
    playBtn.addEventListener('click', () => {
      if (anim.running) { anim.stop(); return; }
      if (runners.every((r) => r.done)) reset();
      playBtn.textContent = 'Pause';
      anim.start();
    });
    newData();
  }
  return {
    init,
    resize() { runners.forEach((r) => r.resize()); render(); },
    retheme() { colors = sortColors(); render(); },
    pause() { anim.stop(); },
  };
})();
