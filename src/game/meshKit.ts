import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Node } from "@babylonjs/core/node";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateIcoSphere } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder";

/*
 * Small helpers for building our own low-poly models out of simple shapes.
 *
 * Every shape gets its colour painted into its vertices ("vertex colours")
 * instead of having its own material. That way hundreds of shapes can be
 * merged into one big mesh that the GPU draws in a single call — the key to
 * running smoothly on older phones.
 */

/** Paint every vertex of a mesh one colour. */
export function paint(mesh: Mesh, hex: string): Mesh {
  const c = Color3.FromHexString(hex);
  const count = mesh.getTotalVertices();
  const colors = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    colors[i * 4] = c.r;
    colors[i * 4 + 1] = c.g;
    colors[i * 4 + 2] = c.b;
    colors[i * 4 + 3] = 1;
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors);
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

interface Placement {
  at?: Vec;
  rot?: Vec;
  scale?: Vec;
}

function place<T extends Mesh>(mesh: T, color: string, p: Placement, flat: boolean): T {
  if (p.at) mesh.position.set(...p.at);
  if (p.rot) mesh.rotation.set(...p.rot);
  if (p.scale) mesh.scaling.set(...p.scale);
  paint(mesh, color);
  if (flat) mesh.convertToFlatShadedMesh();
  mesh.isPickable = false;
  return mesh;
}

/*
 * Shape makers. Each returns a painted mesh placed relative to the parent
 * group it will be merged into. `flat` gives the faceted low-poly look.
 */

export function box(scene: Scene, color: string, size: Vec, p: Placement = {}, flat = true): Mesh {
  const m = CreateBox("box", { width: size[0], height: size[1], depth: size[2] }, scene);
  return place(m, color, p, flat);
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
