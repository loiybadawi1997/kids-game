import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Node } from "@babylonjs/core/node";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateIcoSphere } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder";
import { Pattern, encodePattern } from "./patterns";

/*
 * Small helpers for building our own low-poly models out of simple shapes.
 *
 * Every shape gets its colour painted into its vertices ("vertex colours")
 * instead of having its own material. That way hundreds of shapes can be
 * merged into one big mesh that the GPU draws in a single call — the key to
 * running smoothly on older phones.
 *
 * The alpha part of each vertex colour secretly holds a "pattern" number
 * (brick, wood, roof tiles...). The pattern shader in patterns.ts reads it.
 */

/** Paint every vertex of a mesh one colour (and optionally a surface pattern). */
export function paint(mesh: Mesh, hex: string, pattern: Pattern = Pattern.None): Mesh {
  const c = Color3.FromHexString(hex);
  const a = encodePattern(pattern);
  const count = mesh.getTotalVertices();
  const colors = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    colors[i * 4] = c.r;
    colors[i * 4 + 1] = c.g;
    colors[i * 4 + 2] = c.b;
    colors[i * 4 + 3] = a;
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors);
  mesh.hasVertexAlpha = false; // alpha is a pattern number, not transparency
  return mesh;
}

/** Shared material for everything painted with vertex colours. */
export function createVertexColorMaterial(scene: Scene, name: string, shine = 0.04): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.White();
  mat.specularColor = new Color3(shine, shine, shine);
  mat.specularPower = 24;
  return mat;
}

type Vec = [number, number, number];

export interface Placement {
  at?: Vec;
  rot?: Vec;
  scale?: Vec;
  pattern?: Pattern;
}

function place<T extends Mesh>(mesh: T, color: string, p: Placement, flat: boolean): T {
  if (p.at) mesh.position.set(...p.at);
  if (p.rot) mesh.rotation.set(...p.rot);
  if (p.scale) mesh.scaling.set(...p.scale);
  paint(mesh, color, p.pattern);
  if (flat) mesh.convertToFlatShadedMesh();
  mesh.isPickable = false;
  return mesh;
}

/*
 * Shape makers. Each returns a painted mesh placed relative to the parent
 * group it will be merged into. `flat` gives the faceted low-poly look.
 */

/**
 * A box with softly bevelled ("rounded") edges. Big boxes get the bevel,
 * tiny ones stay plain boxes to save triangles.
 */
export function box(scene: Scene, color: string, size: Vec, p: Placement = {}, flat = true): Mesh {
  const smallest = Math.min(...size);
  if (smallest >= 0.2) {
    const bevel = Math.min(0.09, smallest * 0.18);
    return place(chamferBox(scene, size[0], size[1], size[2], bevel), color, p, false);
  }
  const m = CreateBox("box", { width: size[0], height: size[1], depth: size[2] }, scene);
  return place(m, color, p, flat);
}

/**
 * Builds a box whose 12 edges are cut at 45° and 8 corners are small
 * triangles. With flat lighting each bevel catches the light, which reads
 * as a soft rounded edge.
 */
export function chamferBox(scene: Scene, w: number, h: number, d: number, r: number): Mesh {
  const hx = w / 2;
  const hy = h / 2;
  const hz = d / 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Add one flat polygon (3 or 4 corners). Winding is fixed automatically so
  // the face points outwards (away from the box centre).
  const face = (pts: Vec[]) => {
    const [a, b, c] = pts;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p[2], 0) / pts.length;
    let order = pts;
    if (nx * cx + ny * cy + nz * cz > 0) {
      order = [...pts].reverse();
      nx = -nx; ny = -ny; nz = -nz;
    }
    const len = Math.hypot(nx, ny, nz) || 1;
    // Babylon's front faces wind the opposite way to the maths above.
    nx = -nx / len; ny = -ny / len; nz = -nz / len;
    const base = positions.length / 3;
    for (const p of order) {
      positions.push(...p);
      normals.push(nx, ny, nz);
    }
    indices.push(base, base + 1, base + 2);
    if (order.length === 4) indices.push(base, base + 2, base + 3);
  };

  const s = [-1, 1];
  // 6 main faces
  for (const sx of s) face([[sx * hx, -hy + r, -hz + r], [sx * hx, hy - r, -hz + r], [sx * hx, hy - r, hz - r], [sx * hx, -hy + r, hz - r]]);
  for (const sy of s) face([[-hx + r, sy * hy, -hz + r], [hx - r, sy * hy, -hz + r], [hx - r, sy * hy, hz - r], [-hx + r, sy * hy, hz - r]]);
  for (const sz of s) face([[-hx + r, -hy + r, sz * hz], [hx - r, -hy + r, sz * hz], [hx - r, hy - r, sz * hz], [-hx + r, hy - r, sz * hz]]);
  // 12 bevelled edges
  for (const sx of s) for (const sy of s) {
    face([[sx * hx, sy * (hy - r), -hz + r], [sx * hx, sy * (hy - r), hz - r], [sx * (hx - r), sy * hy, hz - r], [sx * (hx - r), sy * hy, -hz + r]]);
  }
  for (const sx of s) for (const sz of s) {
    face([[sx * hx, -hy + r, sz * (hz - r)], [sx * hx, hy - r, sz * (hz - r)], [sx * (hx - r), hy - r, sz * hz], [sx * (hx - r), -hy + r, sz * hz]]);
  }
  for (const sy of s) for (const sz of s) {
    face([[-hx + r, sy * hy, sz * (hz - r)], [hx - r, sy * hy, sz * (hz - r)], [hx - r, sy * (hy - r), sz * hz], [-hx + r, sy * (hy - r), sz * hz]]);
  }
  // 8 corner triangles
  for (const sx of s) for (const sy of s) for (const sz of s) {
    face([[sx * hx, sy * (hy - r), sz * (hz - r)], [sx * (hx - r), sy * hy, sz * (hz - r)], [sx * (hx - r), sy * (hy - r), sz * hz]]);
  }

  const data = new VertexData();
  data.positions = positions;
  data.normals = normals;
  data.indices = indices;
  data.uvs = new Array((positions.length / 3) * 2).fill(0);
  const mesh = new Mesh("rbox", scene);
  data.applyToMesh(mesh);
  return mesh;
}

export function cylinder(
  scene: Scene,
  color: string,
  opts: { height: number; top: number; bottom: number; sides?: number },
  p: Placement = {},
  flat = true,
): Mesh {
  const m = CreateCylinder(
    "cyl",
    { height: opts.height, diameterTop: opts.top, diameterBottom: opts.bottom, tessellation: opts.sides ?? 8 },
    scene,
  );
  return place(m, color, p, flat);
}

export function ball(scene: Scene, color: string, diameter: number, p: Placement = {}, segments = 8, flat = false): Mesh {
  // Tiny balls (fruit, flowers) use a 20-triangle ico-sphere: they're too small to see the difference.
  const m =
    segments <= 3
      ? CreateIcoSphere("ball", { radius: diameter / 2, subdivisions: 1, flat: true }, scene)
      : CreateSphere("ball", { diameter, segments }, scene);
  return place(m, color, p, flat && segments > 3);
}

/** A faceted "blob" — great for tree crowns, bushes and rocks. */
export function blob(scene: Scene, color: string, radius: number, p: Placement = {}, subdivisions = 1): Mesh {
  const m = CreateIcoSphere("blob", { radius, subdivisions, flat: true }, scene);
  return place(m, color, p, false);
}

/**
 * Collects many shapes and merges them into a few big meshes.
 * Shapes are grouped into square "chunks" of the world so the camera can
 * still skip drawing chunks that are off screen.
 */
export class StaticBatch {
  private chunks = new Map<string, Mesh[]>();

  constructor(
    private material: StandardMaterial,
    private chunkSize = 24,
    /** Darken the bottom of walls a little, like soft shadow where they meet the ground. */
    private bakeAmbientOcclusion = true,
  ) {}

  /** Add a shape (or a group of shapes under a parent) to the batch. */
  add(...meshes: Mesh[]): void {
    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      const pos = mesh.getAbsolutePosition();
      const key = `${Math.floor(pos.x / this.chunkSize)},${Math.floor(pos.z / this.chunkSize)}`;
      let list = this.chunks.get(key);
      if (!list) this.chunks.set(key, (list = []));
      list.push(mesh);
    }
  }

  /** Merge everything added so far. Returns the merged meshes. */
  build(name: string): Mesh[] {
    const result: Mesh[] = [];
    const parents = new Set<Node>();
    for (const [key, list] of this.chunks) {
      // Merging bakes each piece's position (including its parent's) into the result.
      for (const m of list) if (m.parent) parents.add(m.parent);
      const merged = Mesh.MergeMeshes(list, true, true);
      if (!merged) continue;
      merged.name = `${name}-${key}`;
      merged.material = this.material;
      merged.isPickable = false;
      merged.hasVertexAlpha = false;
      if (this.bakeAmbientOcclusion) bakeAmbientOcclusion(merged);
      merged.freezeWorldMatrix();
      merged.doNotSyncBoundingInfo = true;
      result.push(merged);
    }
    // The empty group nodes the pieces hung from are no longer needed.
    for (const p of parents) p.dispose();
    this.chunks.clear();
    return result;
  }
}

/**
 * Cheap "ambient occlusion": the lower part of every wall gets a little
 * darker, as if the ground were shading it. Done once, when the town is built.
 */
function bakeAmbientOcclusion(mesh: Mesh): void {
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind);
  const nrm = mesh.getVerticesData(VertexBuffer.NormalKind);
  const col = mesh.getVerticesData(VertexBuffer.ColorKind);
  if (!pos || !nrm || !col) return;
  for (let i = 0, v = 0; i < pos.length; i += 3, v += 4) {
    const y = pos[i + 1];
    const upness = nrm[i + 1];
    // Only sideways and downward-facing surfaces near the ground.
    if (upness > 0.6 || y > 1.6) continue;
    const t = Math.max(0, Math.min(1, y / 1.6));
    const shade = 0.72 + 0.28 * (t * t * (3 - 2 * t));
    col[v] *= shade;
    col[v + 1] *= shade;
    col[v + 2] *= shade;
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, col);
}
