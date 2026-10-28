import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { Character } from "./character";
import "@babylonjs/core/Meshes/instancedMesh";

/**
 * Soft round shadows under characters. Real shadows are expensive on phones;
 * a blurry dark circle looks nearly as good and costs almost nothing
 * (all of them together are one draw call).
 */
export class BlobShadows {
  private source: Mesh;
  private items: { shadow: InstancedMesh; character: Character }[] = [];

  constructor(scene: Scene) {
    const tex = new DynamicTexture("blobShadow", { width: 64, height: 64 }, scene, false);
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    grad.addColorStop(0, "rgba(30,40,20,0.42)");
    grad.addColorStop(0.6, "rgba(30,40,20,0.22)");
    grad.addColorStop(1, "rgba(30,40,20,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    tex.update();
    tex.hasAlpha = true;

    const mat = new StandardMaterial("blobShadowMat", scene);
    mat.diffuseTexture = tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.disableLighting = true;
    mat.emissiveColor = Color3.White();
    mat.disableDepthWrite = true;
    mat.zOffset = -2;

    this.source = CreateGround("blobShadowSrc", { width: 1.1, height: 1.1 }, scene);
    this.source.material = mat;
    this.source.isPickable = false;
    this.source.position.y = -100; // the original stays hidden below ground
  }

  add(character: Character): void {
    const shadow = this.source.createInstance("blobShadow");
    shadow.isPickable = false;
    this.items.push({ shadow, character });
  }

  update(): void {
    for (const { shadow, character } of this.items) {
      const p = character.position;
      shadow.position.set(p.x, 0.09, p.z);
    }
  }
}

/** A ring that pops up where you tap, so you can see where you're going. */
export class TapMarker {
  private ring: Mesh;
  private mat: StandardMaterial;
  private time = 1;

  constructor(scene: Scene) {
    this.ring = CreateTorus("tapMarker", { diameter: 1.1, thickness: 0.14, tessellation: 24 }, scene);
    this.ring.isPickable = false;
    this.mat = new StandardMaterial("tapMarkerMat", scene);
    this.mat.disableLighting = true;
    this.mat.emissiveColor = Color3.FromHexString("#ffe066");
    this.ring.material = this.mat;
    this.ring.setEnabled(false);
  }

  show(point: Vector3): void {
    this.ring.position.set(point.x, 0.12, point.z);
    this.time = 0;
    this.ring.setEnabled(true);
  }

  update(dt: number): void {
    if (this.time >= 1) return;
    this.time += dt / 0.7;
    const t = Math.min(1, this.time);
    const s = 0.5 + Math.sin(t * Math.PI) * 0.7;
    this.ring.scaling.set(s, 1, s);
    this.mat.alpha = 1 - t * t;
    if (t >= 1) this.ring.setEnabled(false);
  }
}
