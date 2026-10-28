import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateCapsule } from "@babylonjs/core/Meshes/Builders/capsuleBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { paint } from "./meshKit";

/*
 * Cute "chibi" characters (big head, big eyes, small body), built from
 * smooth shapes. Every look option is just data, so the avatar creator
 * in Step 3 can change hair, clothes and colours easily.
 *
 * Each character is only 7 meshes (head, eyes, body, 2 arms, 2 legs):
 * all the little pieces of each body part are merged together.
 */

export type HairStyle = "short" | "spiky" | "long" | "ponytail" | "buns" | "curly" | "bob";
export type Outfit = "tee" | "hoodie" | "dress" | "overalls";
export type Hat = "none" | "cap" | "beanie" | "bow" | "crown";

export interface CharacterLook {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  eyeColor: string;
  outfit: Outfit;
  top: string; // shirt / dress colour
  bottom: string; // trousers / overalls colour
  shoes: string;
  hat: Hat;
  hatColor: string;
}

export const SKIN_TONES = ["#ffe0c7", "#f6c9a4", "#e2a77e", "#c68863", "#9a6440", "#6e4429"];
export const HAIR_COLORS = ["#2b1d14", "#4a2c1a", "#7b4a26", "#c98a3c", "#e8c170", "#1f1f2e", "#b5482f", "#e599f7"];
export const CLOTHES_COLORS = ["#ff6b6b", "#4dabf7", "#51cf66", "#ffd43b", "#cc5de8", "#ff922b", "#20c997", "#f783ac", "#748ffc", "#ffffff"];
export const BOTTOM_COLORS = ["#3b5bdb", "#495057", "#1c7ed6", "#e8590c", "#5f3dc4", "#2b8a3e", "#c2255c", "#f8f9fa"];
export const EYE_COLORS = ["#5b3a29", "#2f6db5", "#3c8d5a", "#6b4f2c", "#3b3b5c"];
export const SHOE_COLORS = ["#ff6b6b", "#343a40", "#4dabf7", "#ffffff", "#f59f00", "#9c36b5"];
export const HAIR_STYLES: HairStyle[] = ["short", "spiky", "long", "ponytail", "buns", "curly", "bob"];
export const OUTFITS: Outfit[] = ["tee", "hoodie", "dress", "overalls"];
export const HATS: Hat[] = ["none", "cap", "beanie", "bow", "crown"];

// Body measurements, in metres-ish. Total height about 1.6.
const HIP_Y = 0.55;
const SHOULDER_Y = 1.0;
const NECK_Y = 1.08;
const HEAD_SIZE = 0.92;
const HEAD_CENTER = 0.46; // above the neck

const sharedMaterials = new WeakMap<Scene, StandardMaterial>();

/** One material for every character (per scene); colours live in the vertices. */
function characterMaterial(scene: Scene): StandardMaterial {
  const existing = sharedMaterials.get(scene);
  if (existing) return existing;
  const mat = new StandardMaterial("character", scene);
  mat.diffuseColor = Color3.White();
  mat.specularColor = new Color3(0.18, 0.18, 0.18);
  mat.specularPower = 40;
  // A soft bright rim around the edges makes characters "pop" from the world.
  const rim = new FresnelParameters();
  rim.leftColor = new Color3(0.32, 0.3, 0.28);
  rim.rightColor = Color3.Black();
  rim.bias = 0.35;
  rim.power = 2.2;
  mat.emissiveFresnelParameters = rim;
  sharedMaterials.set(scene, mat);
  return mat;
}

/** Collects pieces for one body part, then merges them into a single mesh. */
class Part {
  private pieces: Mesh[] = [];
  constructor(readonly scene: Scene) {}

  add(mesh: Mesh, color: string, at: [number, number, number], rot?: [number, number, number], scale?: [number, number, number]): Mesh {
    mesh.position.set(...at);
    if (rot) mesh.rotation.set(...rot);
    if (scale) mesh.scaling.set(...scale);
    paint(mesh, color);
    this.pieces.push(mesh);
    return mesh;
  }

  sphere(color: string, diameter: number, at: [number, number, number], scale?: [number, number, number], segments = 8, slice?: number, rot?: [number, number, number]): Mesh {
    const m = CreateSphere("s", { diameter, segments, slice }, this.scene);
    return this.add(m, color, at, rot, scale);
  }

  capsule(color: string, height: number, radius: number, at: [number, number, number], rot?: [number, number, number], scale?: [number, number, number], radiusTop?: number): Mesh {
    const m = CreateCapsule("c", { height, radius, radiusTop: radiusTop ?? radius, radiusBottom: radius, tessellation: 8, subdivisions: 1, capSubdivisions: 2 }, this.scene);
    return this.add(m, color, at, rot, scale);
  }

  cylinder(color: string, height: number, top: number, bottom: number, at: [number, number, number], rot?: [number, number, number], sides = 10): Mesh {
    const m = CreateCylinder("cy", { height, diameterTop: top, diameterBottom: bottom, tessellation: sides }, this.scene);
    return this.add(m, color, at, rot);
  }

  box(color: string, size: [number, number, number], at: [number, number, number], rot?: [number, number, number]): Mesh {
    const m = CreateBox("b", { width: size[0], height: size[1], depth: size[2] }, this.scene);
    return this.add(m, color, at, rot);
  }

  tube(color: string, path: Vector3[], radius: number): Mesh {
    const m = CreateTube("t", { path, radius, tessellation: 6, cap: Mesh.CAP_ALL }, this.scene);
    return this.add(m, color, [0, 0, 0]);
  }

  merge(name: string, parent: TransformNode, material: StandardMaterial): Mesh {
    const mesh = Mesh.MergeMeshes(this.pieces, true, true)!;
    mesh.name = name;
    mesh.material = material;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  }
}

function darken(hex: string, amount: number): string {
  return Color3.FromHexString(hex).scale(1 - amount).toHexString();
}

function lighten(hex: string, amount: number): string {
  const c = Color3.FromHexString(hex);
  return Color3.Lerp(c, Color3.White(), amount).toHexString();
}

export class Character {
  /** Move and turn this node to move the whole character. */
  readonly root: TransformNode;

  private body: TransformNode; // bobs up and down while walking
  private head: TransformNode;
  private eyes: Mesh;
  private leftArm: TransformNode;
  private rightArm: TransformNode;
  private leftLeg: TransformNode;
  private rightLeg: TransformNode;
  private torso: Mesh;

  // Animation state.
  private time = Math.random() * 10;
  private walkPhase = 0;
  private walkAmount = 0; // 0 = standing, 1 = walking
  private blinkTimer = 1 + Math.random() * 3;
  private waveTimer = 0;
  private hopTimer = 0;
  /** Set by whoever moves the character: 0 = standing still, 1 = normal walking speed. */
  moving = 0;

  constructor(
    scene: Scene,
    readonly look: CharacterLook,
    name = "character",
  ) {
    const mat = characterMaterial(scene);
    this.root = new TransformNode(name, scene);
    this.body = new TransformNode(`${name}-body`, scene);
    this.body.parent = this.root;

    // --- Legs (pivot at the hip so they can swing) ---
    this.leftLeg = this.makeLeg(scene, mat, -0.13, `${name}-legL`);
    this.rightLeg = this.makeLeg(scene, mat, 0.13, `${name}-legR`);

    // --- Body ---
    this.torso = this.makeTorso(scene, mat, name);

    // --- Arms (pivot at the shoulder) ---
    this.leftArm = this.makeArm(scene, mat, -1, `${name}-armL`);
    this.rightArm = this.makeArm(scene, mat, 1, `${name}-armR`);

    // --- Head (pivot at the neck so it can nod and tilt) ---
    this.head = new TransformNode(`${name}-head`, scene);
    this.head.parent = this.body;
    this.head.position.y = NECK_Y;
    this.makeHead(scene, mat, name);
    this.eyes = this.makeEyes(scene, mat, name);
  }

  // ------------------------------------------------------------------
  // Building the body
  // ------------------------------------------------------------------

  private makeLeg(scene: Scene, mat: StandardMaterial, x: number, name: string): TransformNode {
    const pivot = new TransformNode(name, scene);
    pivot.parent = this.body;
    pivot.position.set(x, HIP_Y, 0);
    const p = new Part(scene);
    const { bottom, shoes, outfit, skin } = this.look;
    const legColor = outfit === "dress" ? skin : bottom;
    p.capsule(legColor, 0.5, 0.105, [0, -0.25, 0]);
    // Shoe: a rounded sneaker with a white sole.
    p.sphere(shoes, 0.3, [0, -0.47, 0.05], [0.85, 0.6, 1.25], 5);
    p.sphere("#ffffff", 0.3, [0, -0.51, 0.05], [0.9, 0.25, 1.3], 5);
    if (outfit === "dress") {
      // Socks
      p.cylinder("#ffffff", 0.12, 0.2, 0.2, [0, -0.38, 0]);
    }
    p.merge(`${name}-mesh`, pivot, mat);
    return pivot;
  }

  private makeTorso(scene: Scene, mat: StandardMaterial, name: string): Mesh {
    const p = new Part(scene);
    const { top, bottom, outfit } = this.look;
    // Hips / shorts
    if (outfit !== "dress") {
      p.capsule(bottom, 0.34, 0.24, [0, HIP_Y + 0.02, 0], undefined, [1, 1, 0.8]);
    }
    // Chest: a slightly tapered capsule.
    p.capsule(top, 0.62, 0.25, [0, 0.8, 0], undefined, [1, 1, 0.78], 0.21);

    if (outfit === "dress") {
      // A flared skirt with a little white hem.
      p.cylinder(top, 0.42, 0.42, 0.82, [0, 0.5, 0]);
      p.cylinder("#ffffff", 0.05, 0.82, 0.84, [0, 0.3, 0]);
      // A little bow at the collar.
      p.sphere(lighten(top, 0.5), 0.12, [-0.06, 1.0, 0.19], [1.2, 0.8, 0.5], 4, undefined, [0, 0, 0.5]);
      p.sphere(lighten(top, 0.5), 0.12, [0.06, 1.0, 0.19], [1.2, 0.8, 0.5], 4, undefined, [0, 0, -0.5]);
    } else if (outfit === "hoodie") {
      // Hood rolled behind the neck, a pocket and drawstrings.
      p.capsule(top, 0.5, 0.13, [0, 1.02, -0.12], [0, 0, Math.PI / 2], [1, 1, 0.9]);
      p.box(darken(top, 0.12), [0.32, 0.14, 0.05], [0, 0.66, 0.18]);
      p.capsule("#ffffff", 0.16, 0.02, [-0.06, 0.9, 0.2]);
      p.capsule("#ffffff", 0.16, 0.02, [0.06, 0.9, 0.2]);
    } else if (outfit === "overalls") {
      // Bib and straps over the shirt, with two buttons.
      p.box(bottom, [0.3, 0.26, 0.06], [0, 0.78, 0.17]);
      p.box(bottom, [0.06, 0.4, 0.42], [-0.14, 0.88, 0], [0.0, 0, 0]);
      p.box(bottom, [0.06, 0.4, 0.42], [0.14, 0.88, 0], [0.0, 0, 0]);
      p.sphere("#ffd166", 0.06, [-0.1, 0.88, 0.2], undefined, 3);
      p.sphere("#ffd166", 0.06, [0.1, 0.88, 0.2], undefined, 3);
    } else {
      // T-shirt: a lighter collar ring and a stripe across the chest.
      p.cylinder(lighten(top, 0.35), 0.05, 0.3, 0.34, [0, 1.06, 0]);
      p.capsule(lighten(top, 0.45), 0.42, 0.04, [0, 0.8, 0.185], [0, 0, Math.PI / 2], [1, 1, 0.5]);
    }
    const mesh = p.merge(`${name}-torso`, this.root, mat);
    mesh.parent = this.body;
    return mesh;
  }

  private makeArm(scene: Scene, mat: StandardMaterial, side: number, name: string): TransformNode {
    const pivot = new TransformNode(name, scene);
    pivot.parent = this.body;
    pivot.position.set(side * 0.27, SHOULDER_Y, 0);
    pivot.rotation.z = side * 0.18; // arms hang slightly away from the body
    const p = new Part(scene);
    const { top, skin, outfit } = this.look;
    const longSleeve = outfit === "hoodie";
    // Sleeve
    p.capsule(top, longSleeve ? 0.42 : 0.24, 0.095, [0, longSleeve ? -0.19 : -0.09, 0]);
    // Arm
    if (!longSleeve) p.capsule(skin, 0.3, 0.075, [0, -0.25, 0]);
    // Round little hand
    p.sphere(skin, 0.17, [0, -0.43, 0.01], undefined, 5);
    p.merge(`${name}-mesh`, pivot, mat);
    return pivot;
  }

  private makeHead(scene: Scene, mat: StandardMaterial, name: string): void {
    const p = new Part(scene);
    const { skin, hairColor } = this.look;
    const c = HEAD_CENTER;
    const r = HEAD_SIZE / 2;

    // Neck and head
    p.cylinder(skin, 0.14, 0.17, 0.2, [0, 0.02, 0]);
    p.sphere(skin, HEAD_SIZE, [0, c, 0], [1.04, 0.96, 0.98], 12);
    // Ears
    p.sphere(skin, 0.17, [-r * 1.02, c - 0.02, 0], [0.6, 1, 1], 4);
    p.sphere(skin, 0.17, [r * 1.02, c - 0.02, 0], [0.6, 1, 1], 4);
    // Nose: a tiny button
    p.sphere(darken(skin, 0.06), 0.075, [0, c - 0.05, r * 0.98], [1.1, 0.9, 0.8], 4);
    // Rosy cheeks
    p.sphere("#ff9fb2", 0.13, [-0.24, c - 0.11, r * 0.83], [1, 0.65, 0.3], 4, undefined, [0, -0.5, 0]);
    p.sphere("#ff9fb2", 0.13, [0.24, c - 0.11, r * 0.83], [1, 0.65, 0.3], 4, undefined, [0, 0.5, 0]);
    // Smile: a little curved tube
    const smile: Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (0.22 + 0.56 * (i / 8));
      const x = Math.cos(a) * 0.12;
      const y = c - 0.15 - Math.sin(a) * 0.06;
      const z = Math.sqrt(Math.max(0, r * r * 0.92 - x * x - (y - c) ** 2)) + 0.012;
      smile.push(new Vector3(x, y, z));
    }
    p.tube("#7a2e3a", smile, 0.021);
    // Eyebrows
    for (const side of [-1, 1]) {
      p.capsule(darken(hairColor, 0.1), 0.13, 0.022, [side * 0.16, c + 0.17, r * 0.9], [0, side * 0.35, Math.PI / 2 + side * 0.15]);
    }

    this.makeHair(p, c, r);
    this.makeHat(p, c, r);
    p.merge(`${name}-headMesh`, this.head, mat);
  }

  private makeHair(p: Part, c: number, r: number): void {
    const { hair, hairColor, hat } = this.look;
    const dark = darken(hairColor, 0.12);
    // Under a cap or beanie, spikes, buns and curls on top are hidden.
    const covered = hat === "cap" || hat === "beanie";
    // Every style starts with a cap of hair over the top and back of the head.
    // It's a sphere cut open at the bottom, tilted back so the face shows.
    p.sphere(hairColor, HEAD_SIZE * 1.08, [0, c + 0.03, -0.03], [1.04, 1, 1], 12, 0.56, [-0.55, 0, 0]);

    // Bangs (fringe): a row of soft lumps across the forehead.
    const bangs = (count: number, size: number) => {
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        const a = t * 1.7;
        p.sphere(hairColor, size, [Math.sin(a) * r * 0.8, c + 0.27 - Math.abs(t) * 0.12, Math.cos(a) * r * 0.74], [1.35, 0.72, 0.62], 6, undefined, [-0.45, a, 0]);
      }
    };

    switch (hair) {
      case "short":
        bangs(3, 0.3);
        p.sphere(hairColor, 0.24, [-r * 0.92, c + 0.05, -0.02], [0.5, 1, 0.9], 5);
        p.sphere(hairColor, 0.24, [r * 0.92, c + 0.05, -0.02], [0.5, 1, 0.9], 5);
        break;
      case "spiky":
        bangs(3, 0.28);
        // Two rows of cone spikes pointing up and back.
        for (let row = 0; row < (covered ? 0 : 2); row++) {
          for (let i = 0; i < 5; i++) {
            const a = -0.9 + (i / 4) * 1.8;
            const z = row === 0 ? 0.08 : -0.2;
            p.cylinder(i % 2 ? dark : hairColor, 0.42, 0, 0.26, [Math.sin(a) * 0.26, c + 0.46 - row * 0.04, z], [-0.35 - row * 0.5, 0, -a * 0.7], 8);
          }
        }
        break;
      case "long":
        bangs(4, 0.27);
        // Long hair falling down the back and sides.
        p.capsule(hairColor, 0.95, 0.3, [0, c - 0.25, -0.2], [0.12, 0, 0], [1.45, 1, 0.55]);
        p.capsule(hairColor, 0.7, 0.12, [-r * 0.95, c - 0.18, 0.02], [0, 0, 0.08]);
        p.capsule(hairColor, 0.7, 0.12, [r * 0.95, c - 0.18, 0.02], [0, 0, -0.08]);
        break;
      case "ponytail":
        bangs(3, 0.3);
        p.sphere(lighten(this.look.hatColor, 0.1), 0.13, [0, c + 0.22, -r * 0.98], undefined, 4); // hair tie
        p.sphere(hairColor, 0.34, [0, c + 0.02, -r * 1.2], [0.85, 1.5, 0.85], 6, undefined, [0.35, 0, 0]);
        p.sphere(dark, 0.22, [0, c - 0.24, -r * 1.3], [0.8, 1.3, 0.8], 5);
        break;
      case "buns":
        bangs(4, 0.27);
        if (covered) break;
        p.sphere(hairColor, 0.32, [-0.3, c + 0.37, -0.05], undefined, 6);
        p.sphere(hairColor, 0.32, [0.3, c + 0.37, -0.05], undefined, 6);
        p.sphere(dark, 0.18, [-0.3, c + 0.47, -0.05], undefined, 4);
        p.sphere(dark, 0.18, [0.3, c + 0.47, -0.05], undefined, 4);
        break;
      case "curly":
        // A fluffy cloud of curls all over.
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const up = 0.12 + (i % 3) * 0.1;
          const x = Math.cos(a) * r * 0.95;
          const z = Math.sin(a) * r * 0.9 - 0.06;
          if (z > r * 0.55 && up < 0.3) continue; // keep the face clear
          if (covered && up > 0.2) continue;
          p.sphere(i % 2 ? dark : hairColor, 0.3, [x, c + up, z], undefined, 4);
        }
        if (!covered) p.sphere(hairColor, 0.5, [0, c + 0.38, -0.05], [1.3, 0.7, 1.2], 6);
        bangs(4, 0.26);
        break;
      case "bob":
        bangs(4, 0.28);
        // A half-shell behind the head, open towards the face, reaching down to the jaw.
        p.sphere(hairColor, HEAD_SIZE * 1.14, [0, c - 0.06, -0.04], [1.06, 1.08, 1], 12, 0.52, [-Math.PI / 2, 0, 0]);
        break;
    }
  }

  private makeHat(p: Part, c: number, r: number): void {
    const { hat, hatColor } = this.look;
    switch (hat) {
      case "cap":
        p.sphere(hatColor, HEAD_SIZE * 1.12, [0, c + 0.06, -0.02], undefined, 12, 0.45, [-0.3, 0, 0]);
        // Brim sticking out over the forehead.
        p.add(CreateCylinder("brim", { height: 0.05, diameter: 0.56, tessellation: 14 }, p.scene), darken(hatColor, 0.15), [0, c + 0.22, r * 0.92], [0.22, 0, 0], [1, 1, 0.85]);
        p.sphere(lighten(hatColor, 0.5), 0.1, [0, c + 0.52, -0.08], undefined, 3);
        break;
      case "beanie":
        p.sphere(hatColor, HEAD_SIZE * 1.12, [0, c + 0.1, -0.03], [1, 1.05, 1], 12, 0.45, [-0.35, 0, 0]);
        p.cylinder(darken(hatColor, 0.12), 0.12, HEAD_SIZE * 1.1, HEAD_SIZE * 1.12, [0, c + 0.2, -0.04], [-0.35, 0, 0], 20);
        p.sphere(lighten(hatColor, 0.6), 0.2, [0, c + 0.6, -0.2], undefined, 5);
        break;
      case "bow":
        // A big bow clipped on one side of the head.
        p.sphere(hatColor, 0.26, [0.18, c + 0.4, 0.12], [1.2, 0.8, 0.55], 6, undefined, [0.3, -0.5, 0.5]);
        p.sphere(hatColor, 0.26, [0.4, c + 0.3, 0.06], [1.2, 0.8, 0.55], 6, undefined, [0.3, -0.5, -0.3]);
        p.sphere(darken(hatColor, 0.15), 0.12, [0.29, c + 0.36, 0.1], undefined, 4);
        break;
      case "crown":
        p.cylinder("#ffcf3f", 0.16, 0.42, 0.4, [0, c + r + 0.02, -0.02], [-0.15, 0, 0], 10);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          p.cylinder("#ffcf3f", 0.14, 0, 0.1, [Math.sin(a) * 0.19, c + r + 0.15, Math.cos(a) * 0.19 - 0.04], [-0.15, 0, 0], 6);
        }
        p.sphere("#ff5d8f", 0.08, [0, c + r + 0.04, 0.2], undefined, 3);
        break;
      case "none":
        break;
    }
  }

  private makeEyes(scene: Scene, mat: StandardMaterial, name: string): Mesh {
    const p = new Part(scene);
    const c = HEAD_CENTER;
    const r = HEAD_SIZE / 2;
    for (const side of [-1, 1]) {
      const x = side * 0.16;
      const yaw = side * 0.36;
      const z = r * 0.89;
      // Big glossy cartoon eyes: dark outline, coloured iris, pupil, two sparkles.
      p.sphere("#2a2238", 0.2, [x, c + 0.0, z], [0.85, 1.15, 0.35], 6, undefined, [0, yaw, 0]);
      p.sphere(this.look.eyeColor, 0.16, [x, c - 0.015, z + 0.02], [0.8, 1.05, 0.3], 5, undefined, [0, yaw, 0]);
      p.sphere("#14101c", 0.09, [x, c - 0.01, z + 0.04], [0.85, 1.05, 0.3], 4, undefined, [0, yaw, 0]);
      p.sphere("#ffffff", 0.07, [x + side * -0.025 + 0.02, c + 0.05, z + 0.055], [1, 1, 0.4], 3);
      p.sphere("#ffffff", 0.035, [x - 0.03, c - 0.06, z + 0.05], [1, 1, 0.4], 3);
    }
    const eyes = p.merge(`${name}-eyes`, this.head, mat);
    // Scale around the eye line so blinking squashes the eyes in place.
    eyes.setPivotPoint(new Vector3(0, c, 0));
    return eyes;
  }

  // ------------------------------------------------------------------
  // Animation
  // ------------------------------------------------------------------

  /** Wave hello (with a little hop). */
  wave(): void {
    this.waveTimer = 1.6;
    this.hopTimer = 0.45;
  }

  /** Call every frame with the time since the last frame, in seconds. */
  update(dt: number): void {
    this.time += dt;
    // Smoothly blend between standing and walking.
    this.walkAmount += ((this.moving > 0 ? 1 : 0) - this.walkAmount) * Math.min(1, dt * 10);
    const w = this.walkAmount;
    this.walkPhase += dt * (3 + 8 * this.moving);

    const swing = Math.sin(this.walkPhase);
    const breathe = Math.sin(this.time * 2.2);

    // Legs and arms swing in opposite directions.
    this.leftLeg.rotation.x = swing * 0.7 * w;
    this.rightLeg.rotation.x = -swing * 0.7 * w;
    this.leftArm.rotation.x = -swing * 0.65 * w;
    this.rightArm.rotation.x = swing * 0.65 * w;
    this.leftArm.rotation.z = -0.18 - breathe * 0.03 * (1 - w);
    this.rightArm.rotation.z = 0.18 + breathe * 0.03 * (1 - w);

    // Bounce while walking, gently breathe while standing.
    let bodyY = Math.abs(Math.cos(this.walkPhase)) * 0.06 * w;
    this.torso.scaling.y = 1 + breathe * 0.012 * (1 - w);
    this.body.rotation.x = 0.08 * w; // lean forward a little

    // Head: slight bob when walking, slow look-around when idle.
    this.head.rotation.x = -0.05 * w + Math.sin(this.time * 0.9) * 0.03 * (1 - w);
    this.head.rotation.y = Math.sin(this.time * 0.45) * 0.22 * (1 - w);
    this.head.rotation.z = Math.sin(this.walkPhase) * 0.05 * w;

    // Wave: right arm up, hand swinging side to side.
    if (this.waveTimer > 0) {
      this.waveTimer -= dt;
      const up = Math.min(1, this.waveTimer * 4, (1.6 - this.waveTimer) * 6);
      this.rightArm.rotation.z = 0.18 + up * 2.5 + Math.sin(this.time * 14) * 0.3 * up;
      this.rightArm.rotation.x = -0.2 * up;
      this.head.rotation.z = 0.12 * up;
    }
    if (this.hopTimer > 0) {
      this.hopTimer -= dt;
      bodyY += Math.sin((this.hopTimer / 0.45) * Math.PI) * 0.22;
    }
    this.body.position.y = bodyY;

    // Blink every few seconds.
    this.blinkTimer -= dt;
    if (this.blinkTimer < 0) {
      this.blinkTimer = 2 + Math.random() * 3.5;
    }
    this.eyes.scaling.y = this.blinkTimer < 0.12 ? 0.12 : 1;
  }

  get position(): Vector3 {
    return this.root.position;
  }

  /** World position of the top of the head (for speech bubbles). */
  headTop(): Vector3 {
    return this.root.position.add(new Vector3(0, NECK_Y + HEAD_CENTER + HEAD_SIZE * 0.75, 0));
  }

  dispose(): void {
    this.root.dispose();
  }
}

/** Some ready-made looks for townsfolk. */
export function randomLook(random: () => number): CharacterLook {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const hairColors = HAIR_COLORS.slice(0, 7);
  const clothes = CLOTHES_COLORS.slice(0, 9);
  const bottoms = BOTTOM_COLORS.slice(0, 7);
  const hair = pick<HairStyle>(["short", "spiky", "long", "ponytail", "buns", "curly", "bob"]);
  const girlish = hair === "long" || hair === "ponytail" || hair === "buns" || hair === "bob";
  return {
    skin: pick(SKIN_TONES),
    hair,
    hairColor: pick(hairColors),
    eyeColor: pick(EYE_COLORS),
    outfit: pick<Outfit>(girlish ? ["dress", "tee", "overalls", "hoodie"] : ["tee", "hoodie", "overalls"]),
    top: pick(clothes),
    bottom: pick(bottoms),
    shoes: pick(SHOE_COLORS),
    hat: pick<Hat>(["none", "none", "none", girlish ? "bow" : "cap", "beanie", "cap"]),
    hatColor: pick(clothes),
  };
}
