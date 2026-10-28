import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StaticBatch, ball, blob, box, cylinder, paint } from "./meshKit";
import { NavGrid } from "./navGrid";
import { Pattern } from "./patterns";
import { SignAtlas } from "./signs";

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

/** The town's soft colour palette. */
export const COLORS = {
  grass: "#8fd968",
  grassDark: "#72c454",
  path: "#f3dcb4",
  pathEdge: "#d9c2a0",
  plaza: "#f0dcc2",
  plazaRing: "#e6c9a8",
  stone: "#ddd5c6",
  stoneDark: "#bcb2a2",
  wood: "#b27a4b",
  woodDark: "#7f5434",
  trunk: "#8a5a32",
  white: "#fffaf0",
  glass: "#a6dcff",
  water: "#5ec8f2",
  metal: "#3f5a55",
  brick: "#d9785f",
};

export interface HouseStyle {
  wall: string;
  wallPattern?: Pattern;
  roof: string;
  roofPattern?: Pattern;
  /** "side": ridge runs left-right. "front": the pointed gable faces the street. */
  roofStyle?: "side" | "front";
  door: string;
  trim?: string;
  shutters?: string;
  width?: number;
  depth?: number;
  floors?: 1 | 2;
  balcony?: boolean;
  porch?: boolean;
  dormer?: boolean;
  /** -1, 0 or 1: where along the roof the chimney goes; null for none. */
  chimney?: -1 | 0 | 1 | null;
  flowerBoxes?: boolean;
}

export type ShopKind = "fruit" | "bakery" | "toys" | "flowers" | "icecream" | "books";

export interface ShopStyle {
  kind: ShopKind;
  name: string;
  wall: string;
  wallPattern?: Pattern;
  trim: string;
  stripeA: string;
  stripeB: string;
  door: string;
}

/** A simple seeded random generator, so the town looks the same every time. */
export function makeRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function shade(hex: string, amount: number): string {
  const c = Color3.FromHexString(hex);
  return (amount < 0 ? c.scale(1 + amount) : Color3.Lerp(c, Color3.White(), amount)).toHexString();
}

export class PropBuilder {
  /** Lamp bulbs and other glowing bits, merged separately with a bright material. */
  readonly glowPieces: Mesh[] = [];

  constructor(
    private scene: Scene,
    private batch: StaticBatch,
    readonly nav: NavGrid,
    readonly random: () => number,
    readonly signs: SignAtlas,
  ) {}

  // ------------------------------------------------------------------
  // Basics: a "group" is a position + rotation that pieces are placed in.
  // ------------------------------------------------------------------

  private group(x: number, z: number, rotY = 0, y = 0, parent?: TransformNode): TransformNode {
    const g = new TransformNode("group", this.scene);
    if (parent) g.parent = parent;
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    return g;
  }

  private add(g: TransformNode, mesh: Mesh): Mesh {
    mesh.parent = g;
    this.batch.add(mesh);
    return mesh;
  }

  private box(g: TransformNode, color: string, size: Vec, at: Vec, rot?: Vec, pattern?: Pattern): Mesh {
    return this.add(g, box(this.scene, color, size, { at, rot, pattern }));
  }

  private cyl(g: TransformNode, color: string, height: number, top: number, bottom: number, at: Vec, sides = 8, rot?: Vec, pattern?: Pattern): Mesh {
    return this.add(g, cylinder(this.scene, color, { height, top, bottom, sides }, { at, rot, pattern }));
  }

  private blob(g: TransformNode, color: string, radius: number, at: Vec, scale?: Vec): Mesh {
    return this.add(g, blob(this.scene, color, radius, { at, scale }));
  }

  private ball(g: TransformNode, color: string, diameter: number, at: Vec, scale?: Vec, segments = 3): Mesh {
    return this.add(g, ball(this.scene, color, diameter, { at, scale }, segments, true));
  }

  private glow(g: TransformNode, diameter: number, at: Vec): void {
    const m = ball(this.scene, "#ffffff", diameter, { at }, 5);
    // Keep its place in the world but don't hang it on the group (groups are deleted after merging).
    g.computeWorldMatrix(true);
    m.parent = g;
    m.setParent(null);
    this.glowPieces.push(m);
  }

  /** Converts a point in a group's own frame to a world position. */
  private toWorld(g: TransformNode, local: Vec): Vector3 {
    g.computeWorldMatrix(true);
    return Vector3.TransformCoordinates(new Vector3(...local), g.getWorldMatrix());
  }

  /** A triangular prism: used for the gable ends under a pitched roof. Ridge along local X. */
  private gable(g: TransformNode, color: string, length: number, depth: number, height: number, at: Vec, pattern?: Pattern): Mesh {
    const l = length / 2;
    const d = depth / 2;
    const p = [
      [-l, 0, -d], [-l, 0, d], [-l, height, 0],
      [l, 0, -d], [l, 0, d], [l, height, 0],
    ];
    const tris = [
      [0, 2, 1], [3, 4, 5], // ends
      [0, 3, 5], [0, 5, 2], // back slope
      [1, 2, 5], [1, 5, 4], // front slope
      [0, 1, 4], [0, 4, 3], // base
    ];
    const positions: number[] = [];
    const indices: number[] = [];
    for (const tri of tris) {
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
    paint(mesh, color, pattern);
    return this.add(g, mesh);
  }

  /**
   * A pitched roof with its ridge along the group's X axis: wall-coloured
   * gable ends, two tiled slabs with an overhang, a ridge cap and eave trims.
   */
  private roof(g: TransformNode, o: { length: number; span: number; top: number; height: number; wall: string; wallPattern?: Pattern; roof: string; roofPattern: Pattern; trim: string }): void {
    this.gable(g, o.wall, o.length, o.span, o.height, [0, o.top, 0], o.wallPattern);
    const run = o.span / 2 + 0.5;
    const rise = o.height * (run / (o.span / 2));
    const slab = Math.hypot(run, rise);
    const angle = Math.atan2(rise, run);
    for (const s of [-1, 1]) {
      this.box(g, o.roof, [o.length + 0.8, 0.24, slab], [0, o.top + o.height - rise / 2 + 0.14, s * (run / 2)], [s * angle, 0, 0], o.roofPattern);
      // Eave board under the edge of the roof.
      this.box(g, o.trim, [o.length + 0.82, 0.14, 0.1], [0, o.top + o.height - rise + 0.06, s * (run - 0.02)]);
    }
    this.box(g, shade(o.roof, -0.18), [o.length + 0.95, 0.26, 0.36], [0, o.top + o.height + 0.16, 0]);
  }

  // ------------------------------------------------------------------
  // Ground: paths and the plaza
  // ------------------------------------------------------------------

  /** A straight paved path from (x1, z1) to (x2, z2), with kerb stones along both edges. */
  path(x1: number, z1: number, x2: number, z2: number, width = 3.2): void {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = this.group((x1 + x2) / 2, (z1 + z2) / 2, Math.atan2(x2 - x1, z2 - z1));
    this.box(g, COLORS.path, [width, 0.06, len], [0, 0.03, 0], undefined, Pattern.Paving);
    for (const s of [-1, 1]) {
      this.box(g, COLORS.pathEdge, [0.24, 0.1, len + 0.2], [s * (width / 2 + 0.1), 0.05, 0], undefined, Pattern.Brick);
    }
  }

  plaza(x: number, z: number, radius: number): void {
    const g = this.group(x, z);
    this.cyl(g, COLORS.pathEdge, 0.1, radius * 2 + 0.5, radius * 2 + 0.5, [0, 0.05, 0], 40, undefined, Pattern.Brick);
    this.cyl(g, COLORS.plaza, 0.11, radius * 2, radius * 2, [0, 0.055, 0], 40, undefined, Pattern.Cobbles);
    for (const r of [radius * 0.62, radius * 0.86]) {
      this.cyl(g, COLORS.plazaRing, 0.115, r * 2, r * 2, [0, 0.0575, 0], 40, undefined, Pattern.Paving);
      this.cyl(g, COLORS.plaza, 0.12, r * 2 - 0.7, r * 2 - 0.7, [0, 0.06, 0], 40, undefined, Pattern.Cobbles);
    }
  }

  // ------------------------------------------------------------------
  // Houses
  // ------------------------------------------------------------------

  /** A house built from a style. Returns the world position just outside its front door. */
  house(x: number, z: number, rotY: number, s: HouseStyle): Vector3 {
    const w = s.width ?? 5.4;
    const d = s.depth ?? 4.8;
    const floors = s.floors ?? 1;
    const floorH = 2.9;
    const h = floorH * floors;
    const trim = s.trim ?? COLORS.white;
    const g = this.group(x, z, rotY);
    const base = 0.35;
    const top = base + h;
    const fz = d / 2;

    // Foundation, walls, corner trims and a band between floors.
    this.box(g, COLORS.stoneDark, [w + 0.3, base, d + 0.3], [0, base / 2, 0], undefined, Pattern.Paving);
    this.box(g, s.wall, [w, h, d], [0, base + h / 2, 0], undefined, s.wallPattern ?? Pattern.Plaster);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this.box(g, trim, [0.26, h, 0.26], [sx * (w / 2), base + h / 2, sz * (d / 2)]);
    }
    for (let f = 1; f <= floors; f++) {
      this.box(g, trim, [w + 0.14, 0.16, d + 0.14], [0, base + floorH * f - 0.05, 0]);
    }

    // Roof
    const roofH = s.roofStyle === "front" ? 2.2 : 1.9;
    const roofOpts = { top, height: roofH, wall: s.wall, wallPattern: s.wallPattern ?? Pattern.Plaster, roof: s.roof, roofPattern: s.roofPattern ?? Pattern.RoofTiles, trim };
    if (s.roofStyle === "front") {
      const rg = this.group(0, 0, Math.PI / 2, 0, g);
      this.roof(rg, { ...roofOpts, length: d, span: w });
      // Round attic window in the pointed gable.
      this.cyl(g, trim, 0.12, 0.95, 0.95, [0, top + roofH * 0.38, fz + 0.03], 14, [Math.PI / 2, 0, 0]);
      this.cyl(g, COLORS.glass, 0.14, 0.7, 0.7, [0, top + roofH * 0.38, fz + 0.04], 14, [Math.PI / 2, 0, 0]);
    } else {
      this.roof(g, { ...roofOpts, length: w, span: d });
      if (s.dormer) {
        // A little dormer window poking out of the front of the roof.
        const dz = fz * 0.35;
        const dy = top + roofH * 0.42;
        this.box(g, s.wall, [1.3, 1.1, 1.2], [0, dy + 0.2, dz], undefined, s.wallPattern ?? Pattern.Plaster);
        this.gable(g, s.roof, 1.6, 1.0, 0.55, [0, dy + 0.75, dz + 0.1], s.roofPattern ?? Pattern.RoofTiles).rotation.y = Math.PI / 2;
        this.window(g, 0, dy + 0.2, dz + 0.6, 0.7, 0.7, trim);
      }
    }
    if (s.chimney !== null) {
      const cx = (s.chimney ?? 1) * w * 0.28;
      this.box(g, COLORS.brick, [0.7, 2.2, 0.7], [cx, top + roofH * 0.55, -d * 0.15], undefined, Pattern.Brick);
      this.box(g, shade(COLORS.brick, -0.2), [0.85, 0.2, 0.85], [cx, top + roofH * 0.55 + 1.1, -d * 0.15]);
    }

    // Front door with frame, a small window, a knob and two steps.
    this.box(g, trim, [1.45, 2.35, 0.14], [0, base + 1.15, fz + 0.02]);
    this.box(g, s.door, [1.1, 2.1, 0.16], [0, base + 1.05, fz + 0.06], undefined, Pattern.Wood);
    this.box(g, COLORS.glass, [0.5, 0.42, 0.18], [0, base + 1.6, fz + 0.07]);
    this.ball(g, "#ffd43b", 0.15, [0.36, base + 1.0, fz + 0.18]);
    this.box(g, COLORS.stone, [1.8, 0.2, 0.55], [0, 0.1, fz + 0.32], undefined, Pattern.Paving);
    this.box(g, COLORS.stone, [1.6, 0.18, 0.5], [0, 0.29, fz + 0.15], undefined, Pattern.Paving);
    if (s.porch) {
      // Little roof over the door, held up by two posts.
      this.box(g, s.roof, [2.3, 0.18, 1.3], [0, base + 2.55, fz + 0.62], [0.2, 0, 0], s.roofPattern ?? Pattern.RoofTiles);
      for (const sx of [-1, 1]) this.cyl(g, trim, 2.5, 0.16, 0.18, [sx * 0.95, base + 1.25 - 0.1, fz + 1.12], 8);
    }

    // Windows: two per floor at the front, one per floor on each side.
    const wx = w / 2 - 1.25;
    for (let f = 0; f < floors; f++) {
      const y = base + floorH * f + 1.55;
      for (const sx of [-1, 1]) {
        this.window(g, sx * wx, y, fz, 1.0, 1.05, trim, s.shutters, (s.flowerBoxes ?? true) && f === 0);
      }
      for (const sx of [-1, 1]) {
        const wg = this.group(sx * (w / 2), 0, (sx * Math.PI) / 2, 0, g);
        this.window(wg, 0, y, 0, 0.9, 1.0, trim, s.shutters);
      }
    }
    if (floors === 2) {
      const y2 = base + floorH;
      if (s.balcony) {
        // Balcony with a door, railing and flower box.
        this.box(g, trim, [1.25, 2.0, 0.12], [0, y2 + 1.0, fz + 0.02]);
        this.box(g, COLORS.glass, [0.95, 1.8, 0.14], [0, y2 + 0.95, fz + 0.03]);
        this.box(g, COLORS.stone, [2.6, 0.18, 1.1], [0, y2 + 0.05, fz + 0.55], undefined, Pattern.Paving);
        this.box(g, trim, [2.6, 0.1, 0.1], [0, y2 + 0.95, fz + 1.05]);
        for (let i = 0; i <= 6; i++) this.box(g, trim, [0.07, 0.8, 0.07], [-1.25 + i * (2.5 / 6), y2 + 0.55, fz + 1.05]);
        for (const sx of [-1, 1]) this.box(g, trim, [0.1, 0.1, 1.05], [sx * 1.25, y2 + 0.95, fz + 0.55]);
        this.flowerBox(g, 0, y2 + 1.08, fz + 1.12, 1.6);
      } else {
        this.window(g, 0, y2 + 1.55, fz, 0.8, 0.9, trim, s.shutters);
      }
    }

    this.nav.blockRect(x, z, w + 0.4, d + 0.4, rotY);
    if (s.porch) {
      for (const sx of [-1, 1]) {
        const p = this.toWorld(g, [sx * 0.95, 0, fz + 1.12]);
        this.nav.blockCircle(p.x, p.z, 0.12, 0.25);
      }
    }
    return this.toWorld(g, [0, 0, fz + 1.4]);
  }

  /** A window with a frame, cross bars, a sill and (optionally) shutters and a flower box. */
  private window(g: TransformNode, x: number, y: number, z: number, w: number, h: number, trim: string, shutters?: string, flowers = false): void {
    this.box(g, trim, [w + 0.24, h + 0.24, 0.14], [x, y, z + 0.02]);
    this.box(g, COLORS.glass, [w, h, 0.16], [x, y, z + 0.03]);
    this.box(g, trim, [0.07, h, 0.18], [x, y, z + 0.04]);
    this.box(g, trim, [w, 0.07, 0.18], [x, y + h * 0.1, z + 0.04]);
    this.box(g, trim, [w + 0.4, 0.1, 0.3], [x, y - h / 2 - 0.12, z + 0.12]);
    if (shutters) {
      for (const sx of [-1, 1]) this.box(g, shutters, [w * 0.45, h + 0.1, 0.08], [x + sx * (w / 2 + w * 0.26), y, z + 0.06], undefined, Pattern.Wood);
    }
    if (flowers) this.flowerBox(g, x, y - h / 2 - 0.32, z + 0.2, w + 0.1);
  }

  private flowerBox(g: TransformNode, x: number, y: number, z: number, w: number): void {
    this.box(g, COLORS.wood, [w, 0.26, 0.32], [x, y, z], undefined, Pattern.Wood);
    const colors = ["#ff6b8b", "#ffd43b", "#ff922b", "#cc5de8", "#ffffff"];
    const n = Math.max(3, Math.round(w / 0.24));
    for (let i = 0; i < n; i++) {
      const fx = x - w / 2 + 0.12 + (i * (w - 0.24)) / (n - 1);
      this.ball(g, "#5cb85c", 0.22, [fx, y + 0.17, z]);
      this.ball(g, colors[(i * 3 + Math.floor(Math.abs(x) * 7)) % colors.length], 0.17, [fx, y + 0.27, z + 0.05]);
    }
  }

  /** A mailbox on a post. */
  mailbox(x: number, z: number, rotY: number, color: string): void {
    const g = this.group(x, z, rotY);
    this.box(g, COLORS.woodDark, [0.14, 1.0, 0.14], [0, 0.5, 0], undefined, Pattern.Wood);
    this.box(g, color, [0.4, 0.34, 0.55], [0, 1.12, 0]);
    this.cyl(g, color, 0.55, 0.4, 0.4, [0, 1.29, 0], 10, [Math.PI / 2, 0, 0]);
    this.box(g, "#ff4d4d", [0.04, 0.3, 0.08], [0.23, 1.32, -0.1]);
    this.nav.blockCircle(x, z, 0.12, 0.25);
  }

  /** A little wooden name board on a post. Returns its sign slot so the name can be written later. */
  namePlate(x: number, z: number, rotY: number): number {
    const g = this.group(x, z, rotY);
    this.box(g, COLORS.woodDark, [0.14, 1.3, 0.14], [0, 0.65, 0], undefined, Pattern.Wood);
    this.box(g, "#7a4a26", [1.95, 0.58, 0.12], [0, 1.42, 0], undefined, Pattern.Wood);
    this.nav.blockCircle(x, z, 0.12, 0.25);
    return this.signs.add("🏠", "#adb5bd", this.toWorld(g, [0, 1.42, 0.07]), rotY, 1.85, 0.5);
  }

  // ------------------------------------------------------------------
  // Shops
  // ------------------------------------------------------------------

  /**
   * A market shop with a big window, an awning, a name sign, goods outside
   * and a giant rooftop icon. Returns the spot where the shopkeeper stands.
   */
  shop(x: number, z: number, rotY: number, s: ShopStyle): Vector3 {
    const w = 6.4;
    const d = 5.2;
    const h = 4.0;
    const g = this.group(x, z, rotY);
    const base = 0.3;
    const top = base + h;
    const fz = d / 2;

    this.box(g, COLORS.stoneDark, [w + 0.3, base, d + 0.3], [0, base / 2, 0], undefined, Pattern.Paving);
    this.box(g, s.wall, [w, h, d], [0, base + h / 2, 0], undefined, s.wallPattern ?? Pattern.Plaster);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this.box(g, s.trim, [0.28, h, 0.28], [sx * (w / 2), base + h / 2, sz * (d / 2)]);
    }
    // Flat roof with a parapet all round.
    this.box(g, s.trim, [w + 0.35, 0.3, d + 0.35], [0, top + 0.1, 0]);
    this.box(g, shade(s.wall, -0.1), [w + 0.2, 0.55, 0.3], [0, top + 0.5, fz]);
    this.box(g, shade(s.wall, -0.1), [w + 0.2, 0.55, 0.3], [0, top + 0.5, -fz]);
    for (const sx of [-1, 1]) this.box(g, shade(s.wall, -0.1), [0.3, 0.55, d], [sx * (w / 2), top + 0.5, 0]);

    // Big shop window (left) and a glass door (right).
    this.box(g, s.trim, [3.5, 2.1, 0.14], [-1.0, base + 1.45, fz + 0.02]);
    this.box(g, COLORS.glass, [3.2, 1.85, 0.16], [-1.0, base + 1.45, fz + 0.03]);
    this.box(g, s.trim, [0.08, 1.85, 0.18], [-1.0, base + 1.45, fz + 0.04]);
    this.box(g, s.trim, [3.7, 0.12, 0.34], [-1.0, base + 0.35, fz + 0.15]);
    this.box(g, s.trim, [1.35, 2.5, 0.14], [2.0, base + 1.25, fz + 0.02]);
    this.box(g, s.door, [1.1, 2.3, 0.16], [2.0, base + 1.15, fz + 0.06], undefined, Pattern.Wood);
    this.box(g, COLORS.glass, [0.7, 1.0, 0.18], [2.0, base + 1.55, fz + 0.07]);
    this.ball(g, "#ffd43b", 0.15, [2.38, base + 1.1, fz + 0.18]);

    // Awning sloping out over the window: stripes plus a scalloped edge.
    const stripes = 9;
    const sw = (w + 0.2) / stripes;
    const awnY = base + 2.95;
    for (let i = 0; i < stripes; i++) {
      const color = i % 2 ? s.stripeB : s.stripeA;
      const sx = -w / 2 - 0.1 + sw * (i + 0.5);
      this.box(g, color, [sw, 0.1, 1.55], [sx, awnY, fz + 0.68], [0.42, 0, 0]);
      this.cyl(g, color, sw - 0.02, 0.36, 0.36, [sx, awnY - 0.38, fz + 1.4], 10, [0, 0, Math.PI / 2]);
    }
    // Name sign above the awning.
    this.box(g, s.trim, [3.9, 1.05, 0.14], [0, top - 0.42, fz + 0.04]);
    this.signs.add(s.name, s.stripeA, this.toWorld(g, [0, top - 0.42, fz + 0.12]), rotY, 3.7, 0.9);

    // Flower pots by the door.
    for (const sx of [1.1, 2.9]) {
      this.cyl(g, "#c9714f", 0.5, 0.5, 0.36, [sx, 0.25, fz + 0.5], 8, undefined, Pattern.Brick);
      this.blob(g, "#4caf50", 0.32, [sx, 0.65, fz + 0.5]);
      this.ball(g, "#ff6b8b", 0.18, [sx + 0.1, 0.85, fz + 0.6]);
    }

    this.shopGoods(g, s.kind, fz);
    this.rooftopIcon(g, s.kind, top + 0.35);

    this.nav.blockRect(x, z, w + 0.4, d + 0.4, rotY);
    // The goods stand out front.
    const goods = this.toWorld(g, [-1.0, 0, fz + 0.8]);
    this.nav.blockRect(goods.x, goods.z, 3.6, 0.9, rotY, 0.3);
    for (const sx of [1.1, 2.9]) {
      const p = this.toWorld(g, [sx, 0, fz + 0.5]);
      this.nav.blockCircle(p.x, p.z, 0.25, 0.2);
    }
    return this.toWorld(g, [-1.0, 0, fz + 1.9]);
  }

  /** What each shop shows outside its window. */
  private shopGoods(g: TransformNode, kind: ShopKind, fz: number): void {
    const z = fz + 0.8;
    // A wooden stand that everything sits on.
    this.box(g, COLORS.wood, [3.4, 0.6, 0.85], [-1.0, 0.3, z], undefined, Pattern.Wood);
    this.box(g, COLORS.woodDark, [3.5, 0.08, 0.9], [-1.0, 0.62, z]);
    const items = (colors: string[], size: number) => {
      for (let i = 0; i < 10; i++) {
        const cx = -2.45 + (i % 5) * 0.72;
        const back = i >= 5 ? 1 : 0;
        this.ball(g, colors[i % colors.length], size, [cx, 0.78 + back * 0.08, z - 0.18 + back * 0.36]);
      }
    };
    switch (kind) {
      case "fruit":
        items(["#ff4d4d", "#ffa94d", "#ffe066", "#82c91e", "#ff4d4d"], 0.32);
        break;
      case "bakery":
        for (let i = 0; i < 5; i++) {
          this.add(g, cylinder(this.scene, "#e0a458", { height: 0.5, top: 0.22, bottom: 0.22, sides: 8 }, { at: [-2.4 + i * 0.7, 0.78, z], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.8] }));
          this.ball(g, "#f2c27b", 0.3, [-2.1 + i * 0.7, 0.8, z + 0.25], [1, 0.6, 1]);
        }
        break;
      case "toys":
        items(["#ff6b6b", "#4dabf7", "#ffd43b", "#51cf66", "#cc5de8"], 0.34);
        this.box(g, "#ff922b", [0.4, 0.4, 0.4], [-0.3, 0.88, z - 0.1]);
        break;
      case "flowers":
        for (let i = 0; i < 5; i++) {
          const cx = -2.4 + i * 0.7;
          this.cyl(g, "#c9714f", 0.3, 0.36, 0.26, [cx, 0.8, z], 8);
          this.blob(g, "#4caf50", 0.2, [cx, 1.0, z]);
          this.ball(g, ["#ff6b8b", "#ffd43b", "#cc5de8", "#ffffff", "#ff922b"][i], 0.24, [cx, 1.15, z]);
        }
        break;
      case "icecream":
        for (let i = 0; i < 5; i++) {
          const cx = -2.4 + i * 0.7;
          this.cyl(g, "#e8b06a", 0.42, 0.24, 0.02, [cx, 0.86, z], 8, [Math.PI, 0, 0]);
          this.ball(g, ["#ffc9de", "#fff3bf", "#b2f2bb", "#d0bfff", "#ffd8a8"][i], 0.28, [cx, 1.12, z], undefined, 5);
        }
        break;
      case "books":
        for (let i = 0; i < 8; i++) {
          const cx = -2.5 + i * 0.42;
          this.box(g, ["#e03131", "#1971c2", "#2f9e44", "#f08c00", "#7048e8"][i % 5], [0.32, 0.5, 0.42], [cx, 0.9, z], [0, 0, (i % 3) * 0.08 - 0.08]);
        }
        break;
    }
  }

  /** A giant fun object on the roof so each shop is easy to recognise from far away. */
  private rooftopIcon(g: TransformNode, kind: ShopKind, y: number): void {
    switch (kind) {
      case "fruit":
        this.add(g, ball(this.scene, "#ff4d4d", 1.6, { at: [0, y + 0.8, 0], scale: [1, 0.92, 1] }, 10));
        this.cyl(g, "#7a4a26", 0.5, 0.08, 0.1, [0, y + 1.65, 0], 6);
        this.add(g, ball(this.scene, "#51cf66", 0.5, { at: [0.3, y + 1.65, 0], scale: [1.4, 0.4, 0.8] }, 6));
        break;
      case "bakery":
        this.add(g, cylinder(this.scene, "#e0a458", { height: 2.2, top: 1.0, bottom: 1.0, sides: 12 }, { at: [0, y + 0.55, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.75] }, false));
        for (let i = -1; i <= 1; i++) this.box(g, "#f6d29b", [0.12, 0.08, 0.7], [i * 0.6, y + 1.0, 0], [0, 0.4, 0]);
        break;
      case "toys":
        this.add(g, ball(this.scene, "#4dabf7", 1.3, { at: [-0.6, y + 0.65, 0] }, 10));
        this.add(g, ball(this.scene, "#ffffff", 1.32, { at: [-0.6, y + 0.65, 0], scale: [1, 0.25, 1] }, 10));
        this.box(g, "#ffd43b", [0.9, 0.9, 0.9], [0.8, y + 0.45, 0], [0, 0.4, 0]);
        break;
      case "flowers":
        this.cyl(g, "#4caf50", 1.4, 0.18, 0.18, [0, y + 0.7, 0], 6);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.add(g, ball(this.scene, "#ff8cc6", 0.75, { at: [Math.cos(a) * 0.5, y + 1.6 + Math.sin(a) * 0.5, 0], scale: [1, 1, 0.4] }, 6));
        }
        this.add(g, ball(this.scene, "#ffd43b", 0.5, { at: [0, y + 1.6, 0.12], scale: [1, 1, 0.5] }, 6));
        break;
      case "icecream":
        this.cyl(g, "#e8b06a", 1.6, 1.0, 0.05, [0, y + 0.8, 0], 10, undefined, Pattern.Brick);
        this.add(g, ball(this.scene, "#ffc9de", 1.1, { at: [0, y + 1.75, 0] }, 10));
        this.add(g, ball(this.scene, "#e64980", 0.3, { at: [0, y + 2.35, 0] }, 6));
        break;
      case "books":
        ["#e03131", "#1971c2", "#2f9e44"].forEach((c, i) => {
          this.box(g, c, [1.8 - i * 0.2, 0.42, 1.3 - i * 0.1], [0, y + 0.21 + i * 0.42, 0], [0, i * 0.25, 0]);
          this.box(g, COLORS.white, [1.6 - i * 0.2, 0.32, 1.32 - i * 0.1], [0.08, y + 0.21 + i * 0.42, 0], [0, i * 0.25, 0]);
        });
        break;
    }
  }

  // ------------------------------------------------------------------
  // The Town Hall: the town's big landmark
  // ------------------------------------------------------------------

  /**
   * A grand building with steps, white columns, a clock tower and a flag.
   * Returns nodes for the clock hands and flag so the game can animate them.
   */
  townHall(x: number, z: number, rotY: number): { clock: TransformNode; flag: TransformNode } {
    const g = this.group(x, z, rotY);
    const w = 11;
    const d = 7;
    const h = 5.4;
    const base = 0.6;
    const top = base + h;
    const fz = d / 2;
    const wall = "#fff1dc";
    const trim = "#ffffff";
    const roof = "#4c6ef5";

    // Raised stone base and the main block.
    this.box(g, COLORS.stone, [w + 0.6, base, d + 0.6], [0, base / 2, 0], undefined, Pattern.Paving);
    this.box(g, wall, [w, h, d], [0, base + h / 2, 0], undefined, Pattern.Brick);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(g, trim, [0.4, h, 0.4], [sx * (w / 2), base + h / 2, sz * (d / 2)]);
    this.box(g, trim, [w + 0.3, 0.3, d + 0.3], [0, top, 0]);
    this.roof(g, { length: w, span: d, top: top + 0.1, height: 1.6, wall, wallPattern: Pattern.Brick, roof, roofPattern: Pattern.RoofTiles, trim });

    // Tall windows, two rows, on the front and sides.
    for (const row of [0, 1]) {
      const y = base + 1.5 + row * 2.6;
      for (const wx of [-4.1, -2.6, 2.6, 4.1]) this.window(g, wx, y, fz, 0.8, 1.5, trim, undefined, row === 0);
      for (const sx of [-1, 1]) {
        const wg = this.group(sx * (w / 2), 0, (sx * Math.PI) / 2, 0, g);
        for (const wz of [-1.6, 1.6]) this.window(wg, wz, y, 0, 0.8, 1.5, trim);
      }
    }

    // Front portico: wide steps, four columns and a pointed pediment.
    const pz = fz + 1.7;
    for (let i = 0; i < 3; i++) {
      this.box(g, COLORS.stone, [5.8 - i * 0.3, 0.2, 2.6 - i * 0.35], [0, 0.1 + i * 0.2, fz + 1.4 - i * 0.17], undefined, Pattern.Paving);
    }
    for (const cx of [-2.1, -0.7, 0.7, 2.1]) {
      this.cyl(g, trim, 0.3, 0.6, 0.6, [cx, 0.75, pz], 10);
      this.cyl(g, trim, 4.4, 0.42, 0.5, [cx, 3.0, pz], 12);
      this.box(g, trim, [0.65, 0.25, 0.65], [cx, 5.3, pz]);
    }
    this.box(g, trim, [5.4, 0.5, 2.2], [0, 5.65, fz + 1.0]);
    // Pointed pediment facing the front (a gable turned sideways).
    this.gable(g, trim, 2.2, 5.4, 1.1, [0, 5.9, fz + 1.0]).rotation.y = Math.PI / 2;
    this.cyl(g, "#ffd43b", 0.12, 0.7, 0.7, [0, 6.3, fz + 2.12], 14, [Math.PI / 2, 0, 0]);
    // Big front door
    this.box(g, trim, [1.9, 3.0, 0.14], [0, base + 1.5, fz + 0.02]);
    this.box(g, "#1c3d8f", [1.6, 2.8, 0.16], [0, base + 1.4, fz + 0.06], undefined, Pattern.Wood);
    this.box(g, trim, [0.06, 2.8, 0.18], [0, base + 1.4, fz + 0.08]);
    this.signs.add("🏛️ Town Hall", "#3b5bdb", this.toWorld(g, [0, 5.65, fz + 2.13]), rotY, 3.6, 0.45);

    // Clock tower rising from the middle of the roof.
    const ty = top + 0.1;
    const tz = -0.6;
    this.box(g, wall, [2.8, 5.2, 2.8], [0, ty + 2.6, tz], undefined, Pattern.Brick);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(g, trim, [0.3, 5.2, 0.3], [sx * 1.4, ty + 2.6, tz + sz * 1.4]);
    this.box(g, trim, [3.1, 0.3, 3.1], [0, ty + 5.2, tz]);
    // Open bell storey with a golden bell.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(g, trim, [0.35, 1.6, 0.35], [sx * 1.2, ty + 6.15, tz + sz * 1.2]);
    this.add(g, ball(this.scene, "#ffcf3f", 0.9, { at: [0, ty + 6.1, tz], scale: [1, 1.1, 1] }, 8));
    this.box(g, trim, [3.1, 0.3, 3.1], [0, ty + 7.05, tz]);
    // Pointed roof (a four-sided cone) and a flag pole.
    this.cyl(g, roof, 2.6, 0, 4.0, [0, ty + 8.5, tz], 4, [0, Math.PI / 4, 0], Pattern.RoofTiles);
    this.cyl(g, "#adb5bd", 2.0, 0.08, 0.1, [0, ty + 10.7, tz], 6);
    this.add(g, ball(this.scene, "#ffcf3f", 0.25, { at: [0, ty + 11.75, tz] }, 5));
    const flag = this.group(0, ty + 11.3, 0, 0, g);
    flag.position.z = tz;
    // Clock face on the front of the tower.
    const clockY = ty + 3.3;
    this.cyl(g, "#ffcf3f", 0.12, 2.2, 2.2, [0, clockY, tz + 1.42], 24, [Math.PI / 2, 0, 0]);
    this.cyl(g, trim, 0.14, 1.9, 1.9, [0, clockY, tz + 1.44], 24, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.box(g, "#495057", [0.08, i % 3 === 0 ? 0.24 : 0.14, 0.04], [Math.sin(a) * 0.78, clockY + Math.cos(a) * 0.78, tz + 1.53], [0, 0, -a]);
    }
    const clock = this.group(0, clockY, 0, 0, g);
    clock.position.z = tz + 1.56;

    // Flower beds either side of the steps.
    for (const sx of [-1, 1]) {
      this.box(g, COLORS.brick, [2.6, 0.4, 1.3], [sx * 4.4, 0.2, fz + 1.4], undefined, Pattern.Brick);
      this.box(g, "#7a5230", [2.4, 0.06, 1.1], [sx * 4.4, 0.41, fz + 1.4]);
      for (let i = 0; i < 6; i++) {
        this.ball(g, "#5cb85c", 0.36, [sx * 4.4 - 1.0 + i * 0.4, 0.55, fz + 1.2 + (i % 2) * 0.35]);
        this.ball(g, ["#ff6b8b", "#ffd43b", "#cc5de8"][i % 3], 0.22, [sx * 4.4 - 1.0 + i * 0.4, 0.72, fz + 1.2 + (i % 2) * 0.35]);
      }
    }

    this.nav.blockRect(x, z, w + 0.8, d + 0.8, rotY);
    const front = this.toWorld(g, [0, 0, fz + 1.5]);
    this.nav.blockRect(front.x, front.z, w + 0.4, 2.6, rotY, 0.2);

    // Detach the animated parts from the group, which is deleted after merging.
    g.computeWorldMatrix(true);
    for (const n of [clock, flag]) {
      n.computeWorldMatrix(true);
      n.setParent(null);
    }
    return { clock, flag };
  }

  // ------------------------------------------------------------------
  // Nature
  // ------------------------------------------------------------------

  tree(x: number, z: number, size = 1, kind: "round" | "pine" | "blossom" = "round"): void {
    const g = this.group(x, z, this.random() * Math.PI * 2);
    const s = size * (0.85 + this.random() * 0.3);
    this.cyl(g, COLORS.trunk, 1.6 * s, 0.32 * s, 0.5 * s, [0, 0.8 * s, 0], 6, undefined, Pattern.Wood);
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
      if (kind === "round" && this.random() < 0.4) {
        for (let i = 0; i < 4; i++) {
          const a = this.random() * Math.PI * 2;
          this.ball(g, "#ff4d4d", 0.2, [Math.cos(a) * 1.05 * s, (2.4 + this.random() * 0.6) * s, Math.sin(a) * 1.05 * s]);
        }
      }
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

  /** A neat green hedge along a line. */
  hedge(x1: number, z1: number, x2: number, z2: number): void {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = this.group((x1 + x2) / 2, (z1 + z2) / 2, Math.atan2(x2 - x1, z2 - z1));
    this.box(g, "#4fae47", [0.75, 0.85, len], [0, 0.43, 0]);
    for (let t = -len / 2 + 0.4; t < len / 2; t += 0.8) this.blob(g, "#5cbf4a", 0.32, [0, 0.85, t], [1.1, 0.6, 1.3]);
    const steps = Math.ceil(len / 0.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.nav.blockCircle(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, 0.38, 0.2);
    }
  }

  /** A patch of little flowers (characters can walk over them). */
  flowers(x: number, z: number, count = 7, spread = 1.2): void {
    const g = this.group(x, z);
    const colors = ["#ff6b8b", "#ffd43b", "#ffffff", "#cc5de8", "#ff922b", "#74c0fc"];
    for (let i = 0; i < count; i++) {
      const fx = (this.random() - 0.5) * spread * 2;
      const fz = (this.random() - 0.5) * spread * 2;
      this.cyl(g, "#4caf50", 0.3, 0.04, 0.04, [fx, 0.15, fz], 3);
      this.cyl(g, colors[Math.floor(this.random() * colors.length)], 0.06, 0.26, 0.2, [fx, 0.32, fz], 5);
      this.cyl(g, "#ffe066", 0.07, 0.08, 0.08, [fx, 0.34, fz], 4);
    }
  }

  /** Little tufts of taller grass scattered over an area (skipping paths and buildings). */
  grassTufts(x: number, z: number, count: number, spread: number, avoid: (x: number, z: number) => boolean): void {
    const g = this.group(x, z);
    for (let i = 0; i < count; i++) {
      const fx = (this.random() - 0.5) * spread * 2;
      const fz = (this.random() - 0.5) * spread * 2;
      if (avoid(x + fx, z + fz)) continue;
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + this.random();
        this.cyl(g, k === 1 ? "#5cb84a" : "#79cf5c", 0.35 + this.random() * 0.15, 0, 0.1, [fx + Math.cos(a) * 0.06, 0.18, fz + Math.sin(a) * 0.06], 3, [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3]);
      }
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

  /** A picket fence along a line. */
  fence(x1: number, z1: number, x2: number, z2: number, color = COLORS.white): void {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const g = this.group((x1 + x2) / 2, (z1 + z2) / 2, Math.atan2(x2 - x1, z2 - z1));
    const posts = Math.max(2, Math.round(len / 0.55));
    for (let i = 0; i < posts; i++) {
      const t = -len / 2 + (len * i) / (posts - 1);
      this.box(g, color, [0.14, 0.75, 0.1], [0, 0.375, t]);
      this.cyl(g, color, 0.16, 0, 0.18, [0, 0.83, t], 4);
    }
    for (const y of [0.25, 0.55]) this.box(g, color, [0.06, 0.1, len], [0, y, 0]);
    const steps = Math.ceil(len / 0.4);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.nav.blockCircle(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, 0.1, 0.25);
    }
  }

  /** A street lamp with a glowing lantern. */
  lamp(x: number, z: number): void {
    const g = this.group(x, z);
    this.cyl(g, COLORS.metal, 0.35, 0.5, 0.62, [0, 0.17, 0], 8);
    this.cyl(g, COLORS.metal, 3.2, 0.13, 0.18, [0, 1.8, 0], 8);
    this.cyl(g, COLORS.metal, 0.12, 0.5, 0.5, [0, 3.4, 0], 8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      this.box(g, COLORS.metal, [0.05, 0.6, 0.05], [Math.cos(a) * 0.22, 3.75, Math.sin(a) * 0.22]);
    }
    this.glow(g, 0.42, [0, 3.75, 0]);
    this.cyl(g, COLORS.metal, 0.32, 0.12, 0.72, [0, 4.2, 0], 8);
    this.ball(g, COLORS.metal, 0.14, [0, 4.4, 0]);
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

  /** A green litter bin. */
  bin(x: number, z: number): void {
    const g = this.group(x, z);
    this.cyl(g, "#2f9e44", 0.8, 0.5, 0.42, [0, 0.4, 0], 10);
    this.cyl(g, "#2b8a3e", 0.1, 0.56, 0.56, [0, 0.82, 0], 10);
    this.nav.blockCircle(x, z, 0.25, 0.2);
  }

  /** The town fountain (the moving water is added by ambient.ts). */
  fountain(x: number, z: number): void {
    const g = this.group(x, z);
    this.cyl(g, COLORS.stoneDark, 0.7, 6.6, 6.9, [0, 0.35, 0], 16, undefined, Pattern.Brick);
    this.cyl(g, COLORS.stone, 0.14, 7.0, 7.0, [0, 0.76, 0], 16, undefined, Pattern.Paving);
    this.cyl(g, COLORS.water, 0.1, 6.0, 6.0, [0, 0.64, 0], 16);
    this.cyl(g, COLORS.stone, 1.6, 0.7, 0.9, [0, 1.3, 0], 10);
    this.cyl(g, COLORS.stoneDark, 0.4, 2.6, 1.2, [0, 2.2, 0], 12);
    this.cyl(g, COLORS.water, 0.08, 2.3, 2.3, [0, 2.38, 0], 12);
    this.cyl(g, COLORS.stone, 0.8, 0.35, 0.45, [0, 2.75, 0], 8);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      this.cyl(g, "#51cf66", 0.03, 0.5, 0.5, [Math.cos(a) * 2.3, 0.7, Math.sin(a) * 2.3], 8);
      this.cyl(g, "#ffd43b", 0.03, 0.14, 0.14, [Math.cos(a + 0.6) * 1.5, 0.7, Math.sin(a + 0.6) * 1.5], 8);
    }
    this.nav.blockCircle(x, z, 3.5, 0.3);
  }

  /** A pond with lily pads, reeds and stones around it. */
  pond(x: number, z: number, rx: number, rz: number): void {
    const g = this.group(x, z);
    this.cyl(g, "#6dbb52", 0.06, 2, 2, [0, 0.01, 0], 24).scaling.set(rx + 0.6, 1, rz + 0.6);
    this.cyl(g, COLORS.water, 0.08, 2, 2, [0, 0.03, 0], 24).scaling.set(rx, 1, rz);
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
    for (let i = 0; i < 7; i++) {
      const a = 2.4 + i * 0.12;
      this.cyl(g, "#5c940d", 1.0 + (i % 3) * 0.2, 0.04, 0.06, [Math.cos(a) * rx * 0.95, 0.5, Math.sin(a) * rz * 0.95], 4);
      if (i % 2) this.cyl(g, "#7a4a26", 0.25, 0.1, 0.1, [Math.cos(a) * rx * 0.95, 1.0 + (i % 3) * 0.2, Math.sin(a) * rz * 0.95], 6);
    }
    this.nav.blockEllipse(x, z, rx + 0.3, rz + 0.3);
  }

  /** A playground slide. */
  slide(x: number, z: number, rotY: number): void {
    const g = this.group(x, z, rotY);
    for (const sx of [-0.6, 0.6]) for (const sz of [-0.6, 0.6]) this.cyl(g, "#4dabf7", 2.2, 0.16, 0.16, [sx, 1.1, sz - 1.2], 6);
    this.box(g, "#ffd43b", [1.5, 0.15, 1.5], [0, 1.8, -1.2]);
    for (const sx of [-0.7, 0.7]) this.box(g, "#ff6b6b", [0.08, 0.6, 1.4], [sx, 2.15, -1.2]);
    for (const sx of [-0.45, 0.45]) this.box(g, "#4dabf7", [0.1, 2.3, 0.1], [sx, 1.0, -2.25], [0.3, 0, 0]);
    for (let i = 0; i < 5; i++) this.box(g, "#ffd43b", [0.9, 0.07, 0.1], [0, 0.3 + i * 0.35, -2.15 - i * 0.1]);
    const len = 3.1;
    const angle = Math.atan2(1.75, 2.6);
    this.box(g, "#ff6b6b", [1.0, 0.1, len], [0, 0.95, 0.85], [angle, 0, 0]);
    for (const sx of [-0.52, 0.52]) this.box(g, "#ff8787", [0.08, 0.25, len], [sx, 1.05, 0.85], [angle, 0, 0]);
    this.nav.blockRect(x, z, 1.8, 4.6, rotY, 0.25);
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
    this.box(g, COLORS.wood, [2.2, 0.5, 0.8], [0, 0.25, 0], undefined, Pattern.Wood);
    this.box(g, "#7a5230", [2.0, 0.08, 0.6], [0, 0.5, 0]);
    const colors = ["#ff6b8b", "#ffd43b", "#cc5de8", "#ff922b", "#ffffff"];
    for (let i = 0; i < 7; i++) {
      this.ball(g, "#4caf50", 0.3, [-0.85 + i * 0.28, 0.6, (i % 2 ? 0.12 : -0.12)]);
      this.ball(g, colors[i % colors.length], 0.2, [-0.85 + i * 0.28, 0.78, (i % 2 ? 0.12 : -0.12)]);
    }
    this.nav.blockRect(x, z, 2.2, 0.8, rotY, 0.2);
  }

  /** A sign on two posts with a text board (readable from both sides). */
  signPost(text: string, color: string, x: number, z: number, rotY: number, width: number, height: number, boardY: number): void {
    const g = this.group(x, z, rotY);
    for (const sx of [-1, 1]) {
      const postH = boardY + height / 2;
      this.cyl(g, COLORS.woodDark, postH, 0.22, 0.26, [sx * (width / 2 + 0.1), postH / 2, 0], 6, undefined, Pattern.Wood);
      this.ball(g, "#ffd43b", 0.32, [sx * (width / 2 + 0.1), postH + 0.1, 0]);
      const p = this.toWorld(g, [sx * (width / 2 + 0.1), 0, 0]);
      this.nav.blockCircle(p.x, p.z, 0.15, 0.2);
    }
    this.box(g, "#7a4a26", [width + 0.1, height + 0.1, 0.16], [0, boardY, 0], undefined, Pattern.Wood);
    this.signs.add(text, color, this.toWorld(g, [0, boardY, 0.09]), rotY, width, height);
    this.signs.add(text, color, this.toWorld(g, [0, boardY, -0.09]), rotY + Math.PI, width, height);
  }
}
