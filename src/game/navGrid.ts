import { Vector3 } from "@babylonjs/core/Maths/math.vector";

/**
 * A grid over the town that knows where characters can walk.
 *
 * Houses, trees, the fountain and so on mark their cells as "blocked".
 * findPath() then uses the A* algorithm to find a route around them,
 * and smooths it so characters walk in natural straight lines.
 */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private blocked: Uint8Array;

  constructor(
    readonly minX: number,
    readonly minZ: number,
    readonly maxX: number,
    readonly maxZ: number,
    readonly cellSize = 0.5,
  ) {
    this.cols = Math.ceil((maxX - minX) / cellSize);
    this.rows = Math.ceil((maxZ - minZ) / cellSize);
    this.blocked = new Uint8Array(this.cols * this.rows);
  }

  // --- Marking obstacles ---

  /** Block a rectangle centred at (x, z), rotated by `rotY` radians. `margin` keeps characters a little away. */
  blockRect(x: number, z: number, width: number, depth: number, rotY = 0, margin = 0.4): void {
    const hw = width / 2 + margin;
    const hd = depth / 2 + margin;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const reach = Math.hypot(hw, hd);
    this.forCellsNear(x, z, reach, (cx, cz, i) => {
      // Turn the cell centre into the rectangle's own (unrotated) frame.
      const dx = cx - x;
      const dz = cz - z;
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) <= hw && Math.abs(lz) <= hd) this.blocked[i] = 1;
    });
  }

  /** Block a circle (trees, lamps, the fountain...). */
  blockCircle(x: number, z: number, radius: number, margin = 0.35): void {
    const r = radius + margin;
    this.forCellsNear(x, z, r, (cx, cz, i) => {
      if ((cx - x) ** 2 + (cz - z) ** 2 <= r * r) this.blocked[i] = 1;
    });
  }

  /** Block an ellipse (the pond). */
  blockEllipse(x: number, z: number, rx: number, rz: number, margin = 0.35): void {
    const ax = rx + margin;
    const az = rz + margin;
    this.forCellsNear(x, z, Math.max(ax, az), (cx, cz, i) => {
      if (((cx - x) / ax) ** 2 + ((cz - z) / az) ** 2 <= 1) this.blocked[i] = 1;
    });
  }

  private forCellsNear(x: number, z: number, reach: number, fn: (cx: number, cz: number, index: number) => void): void {
    const c0 = Math.max(0, Math.floor((x - reach - this.minX) / this.cellSize));
    const c1 = Math.min(this.cols - 1, Math.ceil((x + reach - this.minX) / this.cellSize));
    const r0 = Math.max(0, Math.floor((z - reach - this.minZ) / this.cellSize));
    const r1 = Math.min(this.rows - 1, Math.ceil((z + reach - this.minZ) / this.cellSize));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cx = this.minX + (c + 0.5) * this.cellSize;
        const cz = this.minZ + (r + 0.5) * this.cellSize;
        fn(cx, cz, r * this.cols + c);
      }
    }
  }

  // --- Queries ---

  isWalkable(x: number, z: number): boolean {
    const c = Math.floor((x - this.minX) / this.cellSize);
    const r = Math.floor((z - this.minZ) / this.cellSize);
    return this.cellWalkable(c, r);
  }

  private cellWalkable(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.blocked[r * this.cols + c] === 0;
  }

  /** The walkable spot closest to (x, z), searching outwards. */
  nearestWalkable(x: number, z: number): Vector3 | null {
    const c0 = Math.floor((x - this.minX) / this.cellSize);
    const r0 = Math.floor((z - this.minZ) / this.cellSize);
    for (let ring = 0; ring < 40; ring++) {
      let best: [number, number] | null = null;
      let bestDist = Infinity;
      for (let r = r0 - ring; r <= r0 + ring; r++) {
        for (let c = c0 - ring; c <= c0 + ring; c++) {
          const onRing = Math.abs(r - r0) === ring || Math.abs(c - c0) === ring;
          if (!onRing || !this.cellWalkable(c, r)) continue;
          const d = (c - c0) ** 2 + (r - r0) ** 2;
          if (d < bestDist) {
            bestDist = d;
            best = [c, r];
          }
        }
      }
      if (best) return this.cellCenter(best[0], best[1]);
    }
    return null;
  }

  /** A random walkable spot, for townsfolk to wander to. */
  randomWalkable(random: () => number, nearX?: number, nearZ?: number, radius = 12): Vector3 {
    for (let tries = 0; tries < 200; tries++) {
      const x =
        nearX === undefined ? this.minX + random() * (this.maxX - this.minX) : nearX + (random() * 2 - 1) * radius;
      const z =
        nearZ === undefined ? this.minZ + random() * (this.maxZ - this.minZ) : nearZ + (random() * 2 - 1) * radius;
      if (this.isWalkable(x, z)) return new Vector3(x, 0, z);
    }
    return new Vector3(nearX ?? 0, 0, nearZ ?? 0);
  }

  private cellCenter(c: number, r: number): Vector3 {
    return new Vector3(this.minX + (c + 0.5) * this.cellSize, 0, this.minZ + (r + 0.5) * this.cellSize);
  }

  /** Is the straight line between two points free of obstacles? */
  lineIsClear(a: Vector3, b: Vector3): boolean {
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(dist / (this.cellSize * 0.5));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.isWalkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /**
   * Find a walking route from `from` to `to`. Returns a list of points to
   * walk through (not including the start), or null if there is no way.
   */
  findPath(from: Vector3, to: Vector3): Vector3[] | null {
    const goal = this.isWalkable(to.x, to.z) ? to.clone() : this.nearestWalkable(to.x, to.z);
    if (!goal) return null;
    goal.y = 0;
    if (this.lineIsClear(from, goal)) return [goal];

    let start = from;
    if (!this.isWalkable(from.x, from.z)) {
      const s = this.nearestWalkable(from.x, from.z);
      if (!s) return null;
      start = s;
    }

    const cols = this.cols;
    const toIndex = (p: Vector3) =>
      Math.floor((p.z - this.minZ) / this.cellSize) * cols + Math.floor((p.x - this.minX) / this.cellSize);
    const startI = toIndex(start);
    const goalI = toIndex(goal);
    const goalC = goalI % cols;
    const goalR = Math.floor(goalI / cols);

    const size = cols * this.rows;
    const gScore = new Float32Array(size).fill(Infinity);
    const cameFrom = new Int32Array(size).fill(-1);
    const closed = new Uint8Array(size);
    const heap = new MinHeap();

    const h = (i: number) => {
      // "Octile" distance: the shortest grid distance with diagonal moves.
      const dc = Math.abs((i % cols) - goalC);
      const dr = Math.abs(Math.floor(i / cols) - goalR);
      return Math.max(dc, dr) + 0.414 * Math.min(dc, dr);
    };

    gScore[startI] = 0;
    heap.push(startI, h(startI));

    const neighbours = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
    ];

    let found = false;
    while (heap.size > 0) {
      const current = heap.pop();
      if (current === goalI) {
        found = true;
        break;
      }
      if (closed[current]) continue;
      closed[current] = 1;
      const c = current % cols;
      const r = Math.floor(current / cols);
      for (const [dc, dr, cost] of neighbours) {
        const nc = c + dc;
        const nr = r + dr;
        if (!this.cellWalkable(nc, nr)) continue;
        // Don't cut corners diagonally past an obstacle.
        if (dc !== 0 && dr !== 0 && (!this.cellWalkable(c + dc, r) || !this.cellWalkable(c, r + dr))) continue;
        const ni = nr * cols + nc;
        const g = gScore[current] + cost;
        if (g < gScore[ni]) {
          gScore[ni] = g;
          cameFrom[ni] = current;
          heap.push(ni, g + h(ni));
        }
      }
    }
    if (!found) return null;

    // Walk back from the goal to build the list of cells.
    const cells: Vector3[] = [];
    for (let i = goalI; i !== -1 && i !== startI; i = cameFrom[i]) {
      cells.push(this.cellCenter(i % cols, Math.floor(i / cols)));
    }
    cells.reverse();
    cells[cells.length - 1] = goal;

    return this.smooth(from, cells);
  }

  /** Remove zig-zags: skip every point we can reach in a straight line. */
  private smooth(from: Vector3, points: Vector3[]): Vector3[] {
    const result: Vector3[] = [];
    let anchor = from;
    let i = 0;
    while (i < points.length) {
      let furthest = i;
      for (let j = points.length - 1; j > i; j--) {
        if (this.lineIsClear(anchor, points[j])) {
          furthest = j;
          break;
        }
      }
      result.push(points[furthest]);
      anchor = points[furthest];
      i = furthest + 1;
    }
    return result;
  }
}

/** A tiny priority queue (always hands back the item with the lowest score). */
class MinHeap {
  private items: number[] = [];
  private scores: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, score: number): void {
    this.items.push(item);
    this.scores.push(score);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.scores[parent] <= this.scores[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastScore = this.scores.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.scores[0] = lastScore;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.items.length && this.scores[l] < this.scores[smallest]) smallest = l;
        if (r < this.items.length && this.scores[r] < this.scores[smallest]) smallest = r;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.scores[a], this.scores[b]] = [this.scores[b], this.scores[a]];
  }
}
