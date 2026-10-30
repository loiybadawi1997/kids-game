import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Material } from "@babylonjs/core/Materials/material";
import "@babylonjs/core/Meshes/thinInstanceMesh";

/*
 * The model kit: artist-made CC0 models from Kenney and Quaternius
 * (see ASSETS.md), converted by tools/import-models.mjs into one small
 * file. Each model is a single mesh with its colours stored per vertex.
 *
 * Copies are placed as "thin instances": 50 trees of one kind cost one
 * draw call.
 */

interface KitEntry {
  vertices: number;
  triangles: number;
  position: number;
  normal: number;
  color: number;
  index: number;
  indexCount: number;
  index32: boolean;
  min: [number, number, number];
  max: [number, number, number];
}

/** Colour adjustments per model name prefix (r, g, b in 0..1). */
const TINTS: [string, (r: number, g: number, b: number) => [number, number, number]][] = [
  [
    "n-tree",
    (r, g, b) => {
      if (g > r && b > r * 1.1) return [r * 0.75 + 0.05, g * 0.92, b * 0.45]; // mint leaves -> leafy green
      if (r > g && r > b) return [r * 0.72, g * 0.58, b * 0.45]; // pinkish trunks -> brown wood
      return [r, g, b];
    },
  ],
  ["n-bush", (r, g, b) => (g > r && b > r ? [r * 0.75 + 0.04, g * 0.95, b * 0.45] : [r, g, b])],
];

export class Kit {
  private templates = new Map<string, Mesh>();
  private matrices = new Map<string, number[]>();

  private constructor(
    private scene: Scene,
    private entries: Record<string, KitEntry>,
    private buffer: ArrayBuffer,
    private material: Material,
  ) {}

  static async load(scene: Scene, material: Material): Promise<Kit> {
    const base = `${import.meta.env.BASE_URL}models/`;
    const [entries, buffer] = await Promise.all([
      fetch(`${base}kit.json`).then((r) => r.json()),
      fetch(`${base}kit.bin`).then((r) => r.arrayBuffer()),
    ]);
    return new Kit(scene, entries, buffer, material);
  }

  has(name: string): boolean {
    return name in this.entries;
  }

  /** Size of a model as stored (width, height, depth). */
  size(name: string): Vector3 {
    const e = this.entries[name];
    return new Vector3(e.max[0] - e.min[0], e.max[1] - e.min[1], e.max[2] - e.min[2]);
  }

  /** A new stand-alone mesh of a model (for things that move, like animals). */
  create(name: string): Mesh {
    const e = this.entries[name];
    if (!e) throw new Error(`No model called ${name}`);
    const mesh = new Mesh(name, this.scene);
    const data = new VertexData();
    // glTF models are right-handed and Babylon is left-handed: mirror z (and turn the triangles round).
    const pos = Float32Array.from(new Float32Array(this.buffer, e.position, e.vertices * 3));
    const n8 = new Int8Array(this.buffer, e.normal, e.vertices * 3);
    const nrm = Float32Array.from(n8, (v) => v / 127);
    for (let i = 2; i < pos.length; i += 3) {
      pos[i] = -pos[i];
      nrm[i] = -nrm[i];
    }
    data.positions = pos;
    data.normals = nrm;
    const c8 = new Uint8Array(this.buffer, e.color, e.vertices * 3);
    const colors = new Float32Array(e.vertices * 4);
    for (let i = 0; i < e.vertices; i++) {
      colors[i * 4] = c8[i * 3] / 255;
      colors[i * 4 + 1] = c8[i * 3 + 1] / 255;
      colors[i * 4 + 2] = c8[i * 3 + 2] / 255;
      colors[i * 4 + 3] = 1;
    }
    // Some packs use colours that clash with the town (Kenney's minty trees): nudge them.
    const tint = TINTS.find(([prefix]) => name.startsWith(prefix))?.[1];
    if (tint) {
      for (let i = 0; i < colors.length; i += 4) {
        const [r, g, b] = tint(colors[i], colors[i + 1], colors[i + 2]);
        colors[i] = r;
        colors[i + 1] = g;
        colors[i + 2] = b;
      }
    }
    data.colors = colors;
    const src = e.index32 ? new Uint32Array(this.buffer, e.index, e.indexCount) : new Uint16Array(this.buffer, e.index, e.indexCount);
    const idx = e.index32 ? new Uint32Array(src.length) : new Uint16Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
      idx[i] = src[i];
      idx[i + 1] = src[i + 2];
      idx[i + 2] = src[i + 1];
    }
    data.indices = idx;
    // Work the shading normals out from the triangles (the stored ones are not reliable after compression).
    const computed: number[] = [];
    VertexData.ComputeNormals(pos, idx, computed);
    data.normals = computed;
    data.applyToMesh(mesh);
    mesh.material = this.material;
    mesh.isPickable = false;
    mesh.hasVertexAlpha = false;
    return mesh;
  }

  /**
   * Put a copy of a model in the world, standing on the ground at (x, z).
   * `height` scales the model to that many metres tall (or use `scale`).
   */
  place(name: string, x: number, z: number, opts: { rotY?: number; height?: number; scale?: number; y?: number } = {}): number {
    const e = this.entries[name];
    const s = opts.scale ?? (opts.height ? opts.height / (e.max[1] - e.min[1]) : 1);
    // Models stand on their lowest point.
    let m = Matrix.Compose(
      new Vector3(s, s, s),
      Quaternion.RotationAxis(Vector3.Up(), opts.rotY ?? 0),
      new Vector3(x, (opts.y ?? 0) - e.min[1] * s, z),
    );
    // A few models are stored far from their own centre (palms, rock formations): move them back
    // so they stand at (x, z). z is mirrored when loading, so its centre flips too.
    const cx = (e.min[0] + e.max[0]) / 2;
    const cz = -(e.min[2] + e.max[2]) / 2;
    if (Math.abs(cx) > 0.25 * (e.max[0] - e.min[0]) || Math.abs(cz) > 0.25 * (e.max[2] - e.min[2])) {
      m = Matrix.Translation(-cx, 0, -cz).multiply(m);
    }
    let list = this.matrices.get(name);
    if (!list) this.matrices.set(name, (list = []));
    list.push(...m.asArray());
    return s;
  }

  /** Create one mesh per model type holding all its placed copies. Returns them (for shadows). */
  finish(): Mesh[] {
    const out: Mesh[] = [];
    for (const [name, list] of this.matrices) {
      let mesh = this.templates.get(name);
      if (!mesh) this.templates.set(name, (mesh = this.create(name)));
      mesh.thinInstanceSetBuffer("matrix", new Float32Array(list), 16, true);
      mesh.thinInstanceRefreshBoundingInfo(false);
      mesh.freezeWorldMatrix();
      out.push(mesh);
    }
    this.matrices.clear();
    return out;
  }

  /** Total triangles of a model (for keeping an eye on performance). */
  triangles(name: string): number {
    return this.entries[name].triangles;
  }

  get names(): string[] {
    return Object.keys(this.entries);
  }
}

