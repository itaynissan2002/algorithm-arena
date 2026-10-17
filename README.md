# Algorithm Arena

Animated visualizations of famous algorithms, with side-by-side comparisons. A static site — no build step, no dependencies — ready for GitHub Pages.

## What's inside

| Tab | What it does |
|-----|--------------|
| **Sorting** | Step through or animate one of 8 sorting algorithms (Bubble, Selection, Insertion, Shell, Merge, Quick, Heap, Radix) with live counts of comparisons, swaps and writes. |
| **Sorting Race** | All 8 algorithms sort the *same* array at the *same* operations-per-frame, so the finish order shows who does the least work. Ends with a results table. |
| **Pathfinding** | Draw walls and weights, generate mazes, then run BFS, DFS, Dijkstra, A* or Greedy Best-First. "Race all" runs all five on the same grid and checks which ones found the optimal path. |
| **Compare** | A measured chart of how operation counts grow with input size (random / nearly sorted / reversed / few unique), plus complexity tables. |

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment**, pick **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Project layout

```
index.html          page structure
css/style.css       styles (light + dark theme)
js/common.js        shared helpers, input generators, animation loop
js/sorting.js       sorting algorithms (generators) + Sorting and Race tabs
js/pathfinding.js   grid, pathfinding algorithms + Pathfinding tab
js/compare.js       growth chart and complexity tables
js/main.js          tabs, theme toggle, wiring
```

Every algorithm is written as a JavaScript generator that `yield`s each comparison, swap or node visit, which is what lets the page animate, step, count and race them with the same code.

asssss
