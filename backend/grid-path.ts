import { ApiError } from "./api-error";
export type Coord = [number, number];
export type RoutingGrid = {
  cols: number;
  rows: number;
  elevations: (number | null)[];
  slopes: (number | null)[];
};
export function findGridPath(
  grid: RoutingGrid,
  start: Coord,
  end: Coord,
  maxSlope: number,
): Coord[] {
  const { cols: COLS, rows: ROWS } = grid;
  const inside = (p: Coord) =>
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    p[0] >= 1 &&
    p[0] < COLS - 1 &&
    p[1] >= 1 &&
    p[1] < ROWS - 1;
  const slope = (x: number, y: number) => grid.slopes[y * COLS + x] ?? NaN;
  const blocked = (x: number, y: number) =>
    grid.elevations[y * COLS + x] === null || !Number.isFinite(slope(x, y));
  const key = (p: Coord) => p[1] * COLS + p[0];
  const startId = key(start),
    endId = key(end),
    size = COLS * ROWS;
  const scores = new Float64Array(size).fill(Infinity),
    parent = new Int32Array(size).fill(-1),
    closed = new Uint8Array(size);
  scores[startId] = 0;
  const heap: { id: number; f: number }[] = [];
  const push = (v: { id: number; f: number }) => {
    heap.push(v);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].f <= v.f) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = v;
  };
  const pop = () => {
    const out = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let j = i * 2 + 1;
        if (j + 1 < heap.length && heap[j + 1].f < heap[j].f) j++;
        if (heap[j].f >= last.f) break;
        heap[i] = heap[j];
        i = j;
      }
      heap[i] = last;
    }
    return out;
  };
  const valid = (x: number, y: number) =>
    inside([x, y]) && !blocked(x, y) && slope(x, y) <= maxSlope;
  if (!valid(...start) || !valid(...end))
    throw new ApiError(
      "NO_FEASIBLE_ROUTE",
      "A selected point exceeds the slope limit. Increase the limit or choose another stop.",
    );
  push({ id: startId, f: 0 });
  while (heap.length) {
    const cur = pop().id;
    if (closed[cur]) continue;
    if (cur === endId) {
      const path: Coord[] = [];
      for (let n = cur; n !== -1; n = parent[n])
        path.push([n % COLS, Math.floor(n / COLS)]);
      return path.reverse();
    }
    closed[cur] = 1;
    const x = cur % COLS,
      y = Math.floor(cur / COLS);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx,
          ny = y + dy;
        if (!valid(nx, ny)) continue;
        if (dx && dy && (!valid(x + dx, y) || !valid(x, y + dy))) continue;
        const id = ny * COLS + nx;
        if (closed[id]) continue;
        const g = scores[cur] + Math.hypot(dx, dy) * (1 + slope(nx, ny) / 25);
        if (g < scores[id]) {
          scores[id] = g;
          parent[id] = cur;
          push({ id, f: g + Math.hypot(end[0] - nx, end[1] - ny) });
        }
      }
  }
  throw new ApiError(
    "NO_FEASIBLE_ROUTE",
    "No connected route satisfies this slope limit. Increase the limit or remove a stop.",
  );
}
