import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

/*
 * Every sign in town (shop names, street signs, the children's name plates)
 * is drawn into ONE shared picture (an "atlas"), and all sign boards are ONE
 * mesh. So twenty signs cost a single draw call.
 */

const ATLAS = 1024;
const COLS = 2;
const ROWS = 10;
const CELL_W = ATLAS / COLS;
const CELL_H = Math.floor(ATLAS / ROWS);

interface SignSlot {
  text: string;
  color: string;
  center: Vector3;
  rotY: number;
  width: number;
  height: number;
  /** Pixel rectangle inside the atlas. */
  px: number;
  py: number;
  pw: number;
  ph: number;
}

export class SignAtlas {
  private slots: SignSlot[] = [];
  private texture: DynamicTexture | null = null;

  constructor(private scene: Scene) {}

  /**
   * Add a sign. `rotY` is the direction the readable side faces.
   * Returns the slot number (use it with setText to change the words later).
   */
  add(text: string, color: string, center: Vector3, rotY: number, width: number, height: number): number {
    const index = this.slots.length;
    if (index >= COLS * ROWS) throw new Error("Too many signs for the atlas");
    // Fit the sign's shape inside its cell without stretching the letters.
    const aspect = width / height;
    let pw = CELL_W - 4;
    let ph = pw / aspect;
    if (ph > CELL_H - 4) {
      ph = CELL_H - 4;
      pw = ph * aspect;
    }
    const cx = (index % COLS) * CELL_W + CELL_W / 2;
    const cy = Math.floor(index / COLS) * CELL_H + CELL_H / 2;
    this.slots.push({ text, color, center, rotY, width, height, px: cx - pw / 2, py: cy - ph / 2, pw, ph });
    return index;
  }

  /** Change a sign's words (used for the children's name plates). */
  setText(slot: number, text: string, color: string): void {
    const s = this.slots[slot];
    if (!s || (s.text === text && s.color === color)) return;
    s.text = text;
    s.color = color;
    if (this.texture) {
      this.draw(s);
      this.texture.update(true);
    }
  }

  /** Make the texture and the single mesh holding every sign board. */
  build(): Mesh {
    const tex = new DynamicTexture("signAtlas", { width: ATLAS, height: ATLAS }, this.scene, true);
    tex.hasAlpha = false;
    tex.anisotropicFilteringLevel = 4;
    this.texture = tex;
    for (const s of this.slots) this.draw(s);
    tex.update(true);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (const s of this.slots) {
      const n = new Vector3(Math.sin(s.rotY), 0, Math.cos(s.rotY));
      // "Right" as seen by someone standing in front of the sign.
      const right = new Vector3(-Math.cos(s.rotY), 0, Math.sin(s.rotY));
      const up = Vector3.Up();
      const c = s.center.add(n.scale(0.01));
      const hw = s.width / 2;
      const hh = s.height / 2;
      const corners = [
        c.subtract(right.scale(hw)).add(up.scale(hh)), // top left
        c.add(right.scale(hw)).add(up.scale(hh)), // top right
        c.add(right.scale(hw)).subtract(up.scale(hh)), // bottom right
        c.subtract(right.scale(hw)).subtract(up.scale(hh)), // bottom left
      ];
      const u0 = s.px / ATLAS;
      const u1 = (s.px + s.pw) / ATLAS;
      const v0 = 1 - s.py / ATLAS;
      const v1 = 1 - (s.py + s.ph) / ATLAS;
      const cornerUVs = [
        [u0, v0], [u1, v0], [u1, v1], [u0, v1],
      ];
      const base = positions.length / 3;
      corners.forEach((p, i) => {
        positions.push(p.x, p.y, p.z);
        normals.push(n.x, n.y, n.z);
        uvs.push(cornerUVs[i][0], cornerUVs[i][1]);
      });
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const data = new VertexData();
    data.positions = positions;
    data.normals = normals;
    data.uvs = uvs;
    data.indices = indices;
    const mesh = new Mesh("signs", this.scene);
    data.applyToMesh(mesh);

    const mat = new StandardMaterial("signsMat", this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveColor = new Color3(0.42, 0.42, 0.42);
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    return mesh;
  }

  private draw(s: SignSlot): void {
    const ctx = this.texture!.getContext() as unknown as CanvasRenderingContext2D;
    const { px, py, pw, ph } = s;
    // Wooden frame and a cream panel.
    ctx.fillStyle = "#7a4a26";
    ctx.fillRect(px, py, pw, ph);
    const inset = Math.max(4, ph * 0.09);
    ctx.fillStyle = "#fff8e7";
    roundRect(ctx, px + inset, py + inset, pw - inset * 2, ph - inset * 2, ph * 0.2);
    ctx.fill();
    // Words, shrunk until they fit.
    let size = Math.round(ph * 0.56);
    const font = (n: number) => `800 ${n}px "Trebuchet MS", system-ui, sans-serif`;
    ctx.font = font(size);
    while (ctx.measureText(s.text).width > pw * 0.88 && size > 8) ctx.font = font((size -= 2));
    ctx.fillStyle = s.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.text, px + pw / 2, py + ph * 0.54);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
