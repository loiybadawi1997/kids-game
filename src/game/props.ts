import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StaticBatch, ball, blob, box, cylinder, paint } from "./meshKit";
import { NavGrid } from "./navGrid";

/*
 * Builders for every object in the town: houses, shops, trees, fences...
 * They are all made from simple painted shapes and added to one StaticBatch,
 * which merges them so the whole town costs only a few draw calls.
 *
 * Each builder also tells the NavGrid where its solid parts are, so
 * characters walk around them.
 *
 * Direction convention: an object's "front" (door) faces its local +Z.
 * `rotY` turns it: 0 = front faces north (+Z), Math.PI = faces south (-Z).
 */

type Vec = [number, number, number];

export const COLORS = {
  grass: "#86d45f",
  grassDark: "#6cbf4b",
  path: "#f4ddb1",
  pathEdge: "#e2c08b",
  plaza: "#f6e3c8",
  plazaRing: "#eac7a4",
  stone: "#d8d2c4",
  stoneDark: "#b7ae9c",
  wood: "#9a6236",
  woodDark: "#704423",
  trunk: "#8a5a32",
  white: "#fffaf2",
  glass: "#9ad8ff",
  water: "#5ec8f2",
  lamp: "#fff3b0",
  metal: "#4b5468",
};

/** A simple seeded random generator, so the town looks the same every time. */
export function makeRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shade(hex: string, amount: number): string {
  const c = Color3.FromHexString(hex);
  return (amount < 0 ? c.scale(1 + amount) : Color3.Lerp(c, Color3.White(), amount)).toHexString();
}

export class PropBuilder {
  constructor(
    private scene: Scene,
    private batch: StaticBatch,
    readonly nav: NavGrid,
    readonly random: () => number,
  ) {}

  // ------------------------------------------------------------------
  // Basics: a "group" is a position + rotation that pieces are placed in.
  // ------------------------------------------------------------------

  private group(x: number, z: number, rotY = 0, y = 0): TransformNode {
    const g = new TransformNode("group", this.scene);
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    return g;
  }

  private add(g: TransformNode, mesh: Mesh): Mesh {
    mesh.parent = g;
    this.batch.add(mesh);
    return mesh;
  }

  private box(g: TransformNode, color: string, size: Vec, at: Vec, rot?: Vec): Mesh {
    return this.add(g, box(this.scene, color, size, { at, rot }));
  }

  private cyl(g: TransformNode, color: string, height: number, top: number, bottom: number, at: Vec, sides = 8, rot?: Vec): Mesh {
    return this.add(g, cylinder(this.scene, color, { height, top, bottom, sides }, { at, rot }));
  }

  private blob(g: TransformNode, color: string, radius: number, at: Vec, scale?: Vec): Mesh {
    return this.add(g, blob(this.scene, color, radius, { at, scale }));
  }

  private ball(g: TransformNode, color: string, diameter: number, at: Vec, scale?: Vec, segments = 3): Mesh {
    return this.add(g, ball(this.scene, color, diameter, { at, scale }, segments, true));
  }

  /** A triangular prism: used for the gable ends under a pitched roof. */
  private gable(g: TransformNode, color: string, length: number, depth: number, height: number, at: Vec): Mesh {
    const l = length / 2;
    const d = depth / 2;
    // Two triangle ends (x = -l and x = +l) joined by two sloped sides and a base.
    const p = [
      [-l, 0, -d], [-l, 0, d], [-l, height, 0],
      [l, 0, -d], [l, 0, d], [l, height, 0],
    ];
    const quads = [
      [0, 2, 1], [3, 4, 5], // ends
      [0, 3, 5], [0, 5, 2], // back slope
      [1, 2, 5], [1, 5, 4], // front slope
      [0, 1, 4], [0, 4, 3], // base
    ];
    const positions: number[] = [];
    const indices: number[] = [];
    for (const tri of quads) {
      for (const v of tri) {
        indices.push(positions.length / 3);
        positions.push(...p[v]);
      }
    }
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    data.normals = normals;
    data.uvs = new Array((positions.length / 3) * 2).fill(0);
    const mesh = new Mesh("gable", this.scene);
    data.applyToMesh(mesh);
    mesh.position.set(...at);
    paint(mesh, color);
    return this.add(g, mesh);
  }

  // ------------------------------------------------------------------
  // Ground: paths and the plaza
  // ------------------------------------------------------------------

  /** A straight sandy path from (x1, z1) to (x2, z2). */
  path(x1: number, z1: number, x2: number, z2: number, width = 3.2): void {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = this.group((x1 + x2) / 2, (z1 + z2) / 2, Math.atan2(x2 - x1, z2 - z1));
    this.box(g, COLORS.pathEdge, [width + 0.5, 0.04, len + 0.5], [0, 0.02, 0]);
    this.box(g, COLORS.path, [width, 0.06, len], [0, 0.03, 0]);
    // A few darker stepping stones for texture.
    for (let t = 1; t < len - 1; t += 1.6 + this.random() * 1.5) {
      const off = (this.random() - 0.5) * (width - 1);
      this.box(g, shade(COLORS.path, -0.06), [0.5 + this.random() * 0.4, 0.07, 0.4 + this.random() * 0.3], [off, 0.035, t - len / 2], [0, this.random(), 0]);
    }
  }

  plaza(x: number, z: number, radius: number): void {
    const g = this.group(x, z);
    this.cyl(g, COLORS.pathEdge, 0.04, radius * 2 + 0.6, radius * 2 + 0.6, [0, 0.02, 0], 32);
    this.cyl(g, COLORS.plaza, 0.07, radius * 2, radius * 2, [0, 0.035, 0], 32);
    for (let i = 1; i <= 2; i++) {
      const r = radius * (0.45 + i * 0.22);
      this.cyl(g, COLORS.plazaRing, 0.075, r * 2, r * 2, [0, 0.036, 0], 32);
      this.cyl(g, COLORS.plaza, 0.08, r * 2 - 0.5, r * 2 - 0.5, [0, 0.037, 0], 32);
    }
  }

  // ------------------------------------------------------------------
  // Buildings
  // ------------------------------------------------------------------

  /** A cosy house with a pitched roof, door, windows and a chimney. */
  house(x: number, z: number, rotY: number, opts: { wall: string; roof: string; door: string; width?: number; depth?: number; height?: number }): void {
    const w = opts.width ?? 5.2;
    const d = opts.depth ?? 4.6;
    const h = opts.height ?? 3.2;
    const g = this.group(x, z, rotY);
    const base = 0.3;
    const top = base + h;

    // Stone base, walls, white corner trims.
    this.box(g, COLORS.stoneDark, [w + 0.3, base, d + 0.3], [0, base / 2, 0]);
    this.box(g, opts.wall, [w, h, d], [0, base + h / 2, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this.box(g, COLORS.white, [0.22, h, 0.22], [sx * (w / 2), base + h / 2, sz * (d / 2)]);
    }
    this.box(g, COLORS.white, [w + 0.12, 0.18, d + 0.12], [0, top - 0.05, 0]);

    // Pitched roof: wall-coloured gable plus two roof slabs with an overhang.
    const roofH = 1.9;
    this.gable(g, opts.wall, w, d, roofH, [0, top, 0]);
    const run = d / 2 + 0.45;
    const rise = roofH + 0.3;
    const slab = Math.hypot(run, rise);
    const angle = Math.atan2(rise, run);
    for (const s of [-1, 1]) {
      this.box(g, opts.roof, [w + 0.8, 0.22, slab], [0, top + roofH - rise / 2 + 0.12, s * (run / 2)], [s * angle, 0, 0]);
    }
    this.box(g, shade(opts.roof, -0.15), [w + 0.9, 0.28, 0.32], [0, top + roofH + 0.12, 0]); // ridge
    // Chimney
    this.box(g, "#c4674b", [0.6, 1.6, 0.6], [w * 0.28, top + roofH * 0.6, -d * 0.18]);
    this.box(g, "#9c4a35", [0.75, 0.2, 0.75], [w * 0.28, top + roofH * 0.6 + 0.8, -d * 0.18]);

    // Front: door with frame, knob and a step.
    const fz = d / 2;
    this.box(g, COLORS.white, [1.3, 2.25, 0.12], [0, base + 1.1, fz + 0.02]);
    this.box(g, opts.door, [1.0, 2.0, 0.14], [0, base + 1.0, fz + 0.05]);
    this.box(g, shade(opts.door, -0.15), [0.7, 0.7, 0.16], [0, base + 1.3, fz + 0.05]);
    this.ball(g, "#ffd43b", 0.14, [0.32, base + 1.0, fz + 0.14]);
    this.box(g, COLORS.stone, [1.6, 0.18, 0.7], [0, 0.09, fz + 0.45]);

    // Windows either side of the door, with flower boxes.
    for (const sx of [-1, 1]) this.window(g, sx * (w / 2 - 1.15), base + 1.6, fz, true);
    // Side windows
    for (const sx of [-1, 1]) {
      const wg = new TransformNode("wg", this.scene);
      wg.parent = g;
      wg.position.set(sx * (w / 2), 0, 0);
      wg.rotation.y = (sx * Math.PI) / 2;
      this.window(wg, 0, base + 1.6, 0, false);
    }
    // Round attic window in the gable.
    this.cyl(g, COLORS.white, 0.1, 0.8, 0.8, [0, top + 0.75, fz + 0.03], 12, [Math.PI / 2, 0, 0]);
    this.cyl(g, COLORS.glass, 0.12, 0.58, 0.58, [0, top + 0.75, fz + 0.04], 12, [Math.PI / 2, 0, 0]);

    this.nav.blockRect(x, z, w + 0.3, d + 0.3, rotY);
  }

  private window(g: TransformNode, x: number, y: number, z: number, flowers: boolean): void {
    this.box(g, COLORS.white, [1.1, 1.1, 0.12], [x, y, z + 0.02]);
    this.box(g, COLORS.glass, [0.85, 0.85, 0.14], [x, y, z + 0.03]);
    this.box(g, COLORS.white, [0.08, 0.85, 0.16], [x, y, z + 0.04]);
    this.box(g, COLORS.white, [0.85, 0.08, 0.16], [x, y, z + 0.04]);
    if (flowers) {
      this.box(g, COLORS.wood, [1.15, 0.25, 0.3], [x, y - 0.68, z + 0.15]);
      const colors = ["#ff6b8b", "#ffd43b", "#ff922b", "#cc5de8"];
      for (let i = 0; i < 4; i++) {
        this.ball(g, colors[i % colors.length], 0.2, [x - 0.4 + i * 0.27, y - 0.5, z + 0.16]);
      }
    }
  }

  /** A market shop with a big window, a striped awning and fruit crates. */
  shop(x: number, z: number, rotY: number, opts: { wall: string; stripeA: string; stripeB: string; fruit: string[] }): void {
    const w = 6;
    const d = 5;
    const h = 3.8;
    const g = this.group(x, z, rotY);
    const base = 0.3;
    const top = base + h;
    const fz = d / 2;

    this.box(g, COLORS.stoneDark, [w + 0.3, base, d + 0.3], [0, base / 2, 0]);
    this.box(g, opts.wall, [w, h, d], [0, base + h / 2, 0]);
    // Flat roof with a decorative parapet.
    this.box(g, COLORS.white, [w + 0.3, 0.3, d + 0.3], [0, top + 0.1, 0]);
    this.box(g, shade(opts.wall, -0.12), [w + 0.1, 0.5, 0.3], [0, top + 0.45, fz]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this.box(g, COLORS.white, [0.25, h, 0.25], [sx * (w / 2), base + h / 2, sz * (d / 2)]);
    }

    // Big shop window and a door.
    this.box(g, COLORS.white, [3.4, 2.0, 0.12], [-0.9, base + 1.45, fz + 0.02]);
    this.box(g, COLORS.glass, [3.1, 1.75, 0.14], [-0.9, base + 1.45, fz + 0.03]);
    this.box(g, COLORS.white, [0.08, 1.75, 0.16], [-0.9, base + 1.45, fz + 0.04]);
    this.box(g, COLORS.white, [1.25, 2.4, 0.12], [1.9, base + 1.2, fz + 0.02]);
    this.box(g, "#5c7cfa", [1.0, 2.2, 0.14], [1.9, base + 1.1, fz + 0.05]);
    this.box(g, COLORS.glass, [0.6, 0.9, 0.16], [1.9, base + 1.5, fz + 0.05]);
    this.ball(g, "#ffd43b", 0.14, [2.25, base + 1.0, fz + 0.14]);

    // Striped awning sloping out over the window.
    const stripes = 8;
    const sw = (w + 0.2) / stripes;
    const awnY = base + 2.95;
    for (let i = 0; i < stripes; i++) {
      const color = i % 2 ? opts.stripeB : opts.stripeA;
      const sx = -w / 2 - 0.1 + sw * (i + 0.5);
      this.box(g, color, [sw, 0.1, 1.5], [sx, awnY, fz + 0.65], [0.42, 0, 0]);
      // Scalloped edge
      this.cyl(g, color, sw, 0.36, 0.36, [sx, awnY - 0.38, fz + 1.36], 8, [0, 0, Math.PI / 2]);
    }

    // Fruit crates out front.
    for (let i = 0; i < 3; i++) {
      const cx = -2.1 + i * 1.15;
      this.box(g, COLORS.wood, [1.0, 0.55, 0.75], [cx, 0.3, fz + 0.75]);
      this.box(g, COLORS.woodDark, [1.04, 0.08, 0.79], [cx, 0.42, fz + 0.75]);
      const fruit = opts.fruit[i % opts.fruit.length];
      for (let k = 0; k < 6; k++) {
        this.ball(g, fruit, 0.28, [cx - 0.3 + (k % 3) * 0.3, 0.66 + (k > 2 ? 0.06 : 0), fz + 0.6 + (k > 2 ? 0.28 : 0)]);
      }
    }
    this.nav.blockRect(x, z, w + 0.3, d + 0.3, rotY);
    // The crates stick out in front.
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const ox = -0.95;
    const oz = fz + 0.75;
    this.nav.blockRect(x + ox * cos + oz * sin, z - ox * sin + oz * cos, 3.4, 0.8, rotY, 0.3);
  }

  // ------------------------------------------------------------------
  // Nature
  // ------------------------------------------------------------------

  tree(x: number, z: number, size = 1, kind: "round" | "pine" | "blossom" = "round"): void {
    const g = this.group(x, z, this.random() * Math.PI * 2);
    const s = size * (0.85 + this.random() * 0.3);
    this.cyl(g, COLORS.trunk, 1.6 * s, 0.32 * s, 0.48 * s, [0, 0.8 * s, 0], 6);
    if (kind === "pine") {
      const greens = ["#3f9e5a", "#4fb36a", "#5fc479"];
      for (let i = 0; i < 3; i++) {
        const r = (2.4 - i * 0.6) * s;
        this.cyl(g, greens[i], 1.5 * s, 0, r, [0, (1.6 + i * 0.9) * s, 0], 7);
      }
    } else {
      const greens = kind === "blossom" ? ["#ffb3d1", "#ffc6dd", "#ff9ec4"] : ["#5cbf4a", "#6fd05a", "#4cad45"];
      this.blob(g, greens[0], 1.25 * s, [0, 2.7 * s, 0], [1, 0.9, 1]);
      this.blob(g, greens[1], 0.9 * s, [0.65 * s, 2.35 * s, 0.25 * s]);
      this.blob(g, greens[2], 0.85 * s, [-0.55 * s, 2.45 * s, -0.35 * s]);
      this.blob(g, greens[1], 0.7 * s, [0.1 * s, 3.35 * s, -0.1 * s]);
    }
    this.nav.blockCircle(x, z, 0.35 * s);
  }

  bush(x: number, z: number, color = "#58b947"): void {
    const g = this.group(x, z, this.random() * 6);
    this.blob(g, color, 0.6, [0, 0.4, 0], [1.2, 0.8, 1]);
    this.blob(g, shade(color, 0.12), 0.45, [0.45, 0.35, 0.15]);
    this.blob(g, shade(color, -0.08), 0.42, [-0.4, 0.33, -0.1]);
    if (this.random() < 0.5) {
      for (let i = 0; i < 3; i++) this.ball(g, "#ff6b8b", 0.14, [(this.random() - 0.5) * 0.8, 0.75, (this.random() - 0.5) * 0.6]);
    }
    this.nav.blockCircle(x, z, 0.65, 0.2);
  }

  /** A patch of little flowers (characters can walk over them). */
  flowers(x: number, z: number, count = 7, spread = 1.2): void {
    const g = this.group(x, z);
    const colors = ["#ff6b8b", "#ffd43b", "#ffffff", "#cc5de8", "#ff922b", "#74c0fc"];
    for (let i = 0; i < count; i++) {
      const fx = (this.random() - 0.5) * spread * 2;
      const fz = (this.random() - 0.5) * spread * 2;
      // A stem and a little five-petal disc: cheap, and cute from above.
      this.cyl(g, "#4caf50", 0.3, 0.04, 0.04, [fx, 0.15, fz], 3);
      this.cyl(g, colors[Math.floor(this.random() * colors.length)], 0.06, 0.26, 0.2, [fx, 0.32, fz], 5);
      this.cyl(g, "#ffe066", 0.07, 0.08, 0.08, [fx, 0.34, fz], 4);
    }
  }

  rock(x: number, z: number, size = 1): void {
    const g = this.group(x, z, this.random() * 6);
    this.blob(g, "#b9b3a8", 0.5 * size, [0, 0.2 * size, 0], [1.3, 0.7, 1]);
    this.blob(g, "#cfc9bd", 0.3 * size, [0.4 * size, 0.15 * size, 0.2 * size]);
    this.nav.blockCircle(x, z, 0.55 * size, 0.2);
  }

  /** Big soft hills around the edge of town. */
  hill(x: number, z: number, radius: number, height: number, color: string): void {
    const g = this.group(x, z);
    this.blob(g, color, radius, [0, 0, 0], [1, height / radius, 1]);
  }

  // ------------------------------------------------------------------
  // Street furniture
  // ------------------------------------------------------------------

  /** A white picket fence along a line. */
  fence(x1: number, z1: number, x2: number, z2: number): void {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = this.group((x1 + x2) / 2, (z1 + z2) / 2, Math.atan2(x2 - x1, z2 - z1));
    const posts = Math.max(2, Math.round(len / 0.55));
    for (let i = 0; i < posts; i++) {
      const t = -len / 2 + (len * i) / (posts - 1);
      this.box(g, COLORS.white, [0.14, 0.75, 0.1], [0, 0.375, t]);
      this.cyl(g, COLORS.white, 0.16, 0, 0.18, [0, 0.83, t], 4);
    }
    for (const y of [0.25, 0.55]) this.box(g, COLORS.white, [0.06, 0.1, len], [0, y, 0]);
    // Block a thin strip.
    const steps = Math.ceil(len / 0.4);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.nav.blockCircle(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, 0.1, 0.25);
    }
  }

  lamp(x: number, z: number): void {
    const g = this.group(x, z);
    this.cyl(g, COLORS.metal, 0.3, 0.5, 0.6, [0, 0.15, 0], 8);
    this.cyl(g, COLORS.metal, 3.2, 0.14, 0.18, [0, 1.8, 0], 8);
    this.cyl(g, COLORS.metal, 0.2, 0.7, 0.4, [0, 3.45, 0], 8);
    this.ball(g, COLORS.lamp, 0.62, [0, 3.75, 0], undefined, 5);
    this.cyl(g, COLORS.metal, 0.25, 0.1, 0.5, [0, 4.1, 0], 8);
    this.nav.blockCircle(x, z, 0.3, 0.2);
  }

  bench(x: number, z: number, rotY: number): void {
    const g = this.group(x, z, rotY);
    for (let i = 0; i < 3; i++) this.box(g, COLORS.wood, [1.9, 0.08, 0.2], [0, 0.55, -0.22 + i * 0.22]);
    for (let i = 0; i < 2; i++) this.box(g, COLORS.wood, [1.9, 0.2, 0.08], [0, 0.85 + i * 0.25, -0.38], [-0.15, 0, 0]);
    for (const sx of [-0.8, 0.8]) {
      this.box(g, COLORS.metal, [0.1, 0.55, 0.6], [sx, 0.28, -0.05]);
      this.box(g, COLORS.metal, [0.1, 0.6, 0.08], [sx, 0.9, -0.4], [-0.15, 0, 0]);
    }
    this.nav.blockRect(x, z, 1.9, 0.7, rotY, 0.2);
  }

  /** The town fountain. Returns the height of the water so it can sparkle. */
  fountain(x: number, z: number): void {
    const g = this.group(x, z);
    this.cyl(g, COLORS.stoneDark, 0.7, 6.6, 6.9, [0, 0.35, 0], 12);
    this.cyl(g, COLORS.stone, 0.12, 6.9, 6.9, [0, 0.74, 0], 12);
    this.cyl(g, COLORS.water, 0.1, 5.9, 5.9, [0, 0.62, 0], 12);
    this.cyl(g, COLORS.stone, 1.6, 0.7, 0.9, [0, 1.3, 0], 8);
    this.cyl(g, COLORS.stoneDark, 0.4, 2.6, 1.2, [0, 2.2, 0], 10);
    this.cyl(g, COLORS.water, 0.08, 2.3, 2.3, [0, 2.38, 0], 10);
    this.cyl(g, COLORS.stone, 0.8, 0.35, 0.45, [0, 2.75, 0], 8);
    this.nav.blockCircle(x, z, 3.45, 0.3);
  }

  /** A pond with lily pads and stones around it. */
  pond(x: number, z: number, rx: number, rz: number): void {
    const g = this.group(x, z);
    this.cyl(g, "#6dbb52", 0.06, 2, 2, [0, 0.01, 0], 20).scaling.set(rx + 0.6, 1, rz + 0.6);
    this.cyl(g, COLORS.water, 0.08, 2, 2, [0, 0.03, 0], 20).scaling.set(rx, 1, rz);
    this.cyl(g, "#86dcff", 0.085, 2, 2, [-rx * 0.2, 0.031, rz * 0.15], 16).scaling.set(rx * 0.5, 1, rz * 0.4);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + this.random() * 0.2;
      const s = 0.25 + this.random() * 0.25;
      this.blob(g, i % 3 ? "#c9c2b4" : "#b3ab9b", s, [Math.cos(a) * (rx + 0.2), 0.08, Math.sin(a) * (rz + 0.2)], [1.3, 0.6, 1]);
    }
    for (let i = 0; i < 5; i++) {
      const a = this.random() * Math.PI * 2;
      const d = 0.3 + this.random() * 0.5;
      this.cyl(g, "#4caf50", 0.04, 0.9, 0.9, [Math.cos(a) * rx * d, 0.09, Math.sin(a) * rz * d], 10);
      if (i % 2 === 0) this.ball(g, "#ffb3d1", 0.24, [Math.cos(a) * rx * d, 0.18, Math.sin(a) * rz * d], [1, 0.6, 1]);
    }
    this.nav.blockEllipse(x, z, rx + 0.3, rz + 0.3);
  }

  /** A playground slide. */
  slide(x: number, z: number, rotY: number): void {
    const g = this.group(x, z, rotY);
    // Platform on four posts
    for (const sx of [-0.6, 0.6]) for (const sz of [-0.6, 0.6]) this.cyl(g, "#4dabf7", 2.2, 0.16, 0.16, [sx, 1.1, sz - 1.2], 6);
    this.box(g, "#ffd43b", [1.5, 0.15, 1.5], [0, 1.8, -1.2]);
    for (const sx of [-0.7, 0.7]) this.box(g, "#ff6b6b", [0.08, 0.6, 1.4], [sx, 2.15, -1.2]);
    // Ladder at the back
    for (const sx of [-0.45, 0.45]) this.box(g, "#4dabf7", [0.1, 2.3, 0.1], [sx, 1.0, -2.25], [0.3, 0, 0]);
    for (let i = 0; i < 5; i++) this.box(g, "#ffd43b", [0.9, 0.07, 0.1], [0, 0.3 + i * 0.35, -2.15 - i * 0.1]);
    // The slide itself
    const len = 3.1;
    const angle = Math.atan2(1.75, 2.6);
    this.box(g, "#ff6b6b", [1.0, 0.1, len], [0, 0.95, 0.85], [angle, 0, 0]);
    for (const sx of [-0.52, 0.52]) this.box(g, "#ff8787", [0.08, 0.25, len], [sx, 1.05, 0.85], [angle, 0, 0]);
    this.nav.blockRect(x, z, 1.8, 4.6, rotY, 0.25);
    void len;
  }

  /** A two-seat swing set. */
  swings(x: number, z: number, rotY: number): void {
    const g = this.group(x, z, rotY);
    for (const sx of [-1.8, 1.8]) {
      this.box(g, "#cc5de8", [0.16, 2.9, 0.16], [sx, 1.4, -0.5], [0.3, 0, 0]);
      this.box(g, "#cc5de8", [0.16, 2.9, 0.16], [sx, 1.4, 0.5], [-0.3, 0, 0]);
    }
    this.cyl(g, "#ffd43b", 3.8, 0.18, 0.18, [0, 2.75, 0], 8, [0, 0, Math.PI / 2]);
    for (const sx of [-0.8, 0.8]) {
      for (const dx of [-0.25, 0.25]) this.box(g, COLORS.metal, [0.04, 2.1, 0.04], [sx + dx, 1.65, 0]);
      this.box(g, sx < 0 ? "#ff6b6b" : "#4dabf7", [0.7, 0.08, 0.38], [sx, 0.6, 0]);
    }
    this.nav.blockRect(x, z, 4.0, 1.8, rotY, 0.2);
  }

  /** A wooden flower planter box. */
  planter(x: number, z: number, rotY = 0): void {
    const g = this.group(x, z, rotY);
    this.box(g, COLORS.wood, [2.2, 0.5, 0.8], [0, 0.25, 0]);
    this.box(g, "#7a5230", [2.0, 0.08, 0.6], [0, 0.5, 0]);
    const colors = ["#ff6b8b", "#ffd43b", "#cc5de8", "#ff922b", "#ffffff"];
    for (let i = 0; i < 7; i++) {
      this.ball(g, "#4caf50", 0.3, [-0.85 + i * 0.28, 0.6, (i % 2 ? 0.12 : -0.12)]);
      this.ball(g, colors[i % colors.length], 0.2, [-0.85 + i * 0.28, 0.78, (i % 2 ? 0.12 : -0.12)]);
    }
    this.nav.blockRect(x, z, 2.2, 0.8, rotY, 0.2);
  }

  /** Posts for a sign; the text board itself is made separately (it needs a texture). */
  signPosts(x: number, z: number, rotY: number, width: number, height: number): void {
    const g = this.group(x, z, rotY);
    for (const sx of [-1, 1]) {
      this.cyl(g, COLORS.woodDark, height, 0.22, 0.26, [sx * (width / 2 + 0.05), height / 2, 0], 6);
      this.ball(g, "#ffd43b", 0.32, [sx * (width / 2 + 0.05), height + 0.1, 0]);
      this.nav.blockCircle(x + Math.cos(rotY) * sx * (width / 2), z - Math.sin(rotY) * sx * (width / 2), 0.15, 0.2);
    }
  }
}
