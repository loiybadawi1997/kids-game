import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { ReflectionProbe } from "@babylonjs/core/Probes/reflectionProbe";
import { Material } from "@babylonjs/core/Materials/material";
import { MaterialDefines } from "@babylonjs/core/Materials/materialDefines";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Curve3 } from "@babylonjs/core/Maths/math.path";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Skeleton } from "@babylonjs/core/Bones/skeleton";
import { Bone } from "@babylonjs/core/Bones/bone";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder";
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder";
import { CreateLathe } from "@babylonjs/core/Meshes/Builders/latheBuilder";
import { CreatePolyhedron } from "@babylonjs/core/Meshes/Builders/polyhedronBuilder";
import { chamferBox, roundedBox } from "./meshKit";

/*
 * The heroes of Kids Town, based on the "Forge3D Character Studio" design:
 * armoured mechas, knights, cyberpunks, sorcerers and bots, built from
 * swappable parts (head, body, shoulders, back gear, weapon) in four colours
 * plus a glow colour.
 *
 * Every part is a simple shape. All the parts of one hero are merged into ONE
 * mesh moved by a small skeleton (hips, chest, head, arms, forearms, thighs,
 * calves), so each hero costs a single draw call — important on older phones.
 * Glowing bits (visors, cores, blades, jet flames) shine on their own thanks to
 * a tiny shader add-on (GlowPlugin) instead of needing extra materials.
 *
 * Measurements below are in "studio units" from the original design
 * (a hero is about 3.7 units tall); the whole hero is then scaled down to
 * about 1.75 m so they fit the town's doors and paths.
 */

// ---------------------------------------------------------------------
// The look: what a child chooses in the avatar creator
// ---------------------------------------------------------------------

export type Archetype = "mecha" | "knight" | "cyberpunk" | "sorcerer" | "bot";
export type HeadStyle = "visor" | "horned_helm" | "cyber_goggles" | "hooded_cowl" | "bot_dome";
export type TorsoStyle = "chiseled_cuirass" | "tactical_vest" | "cyber_reactor" | "robed_chest" | "orb_core";
export type ShoulderStyle = "spiked_pauldrons" | "curved_guards" | "blade_wings" | "compact_joints" | "none";
export type BackStyle = "twin_thrusters" | "energy_cape" | "power_battery" | "floating_orbs" | "none";
export type WeaponStyle = "plasma_sword" | "pulse_blaster" | "crystal_staff" | "aegis_shield" | "none";
export type Finish = "brushed_metal" | "matte_armor" | "gloss_car" | "carbon_weave" | "hex_tech";
export type Pose = "idle" | "heroic" | "salute" | "combat";

export interface CharacterLook {
  archetype: Archetype;
  headStyle: HeadStyle;
  torsoStyle: TorsoStyle;
  shoulderStyle: ShoulderStyle;
  backStyle: BackStyle;
  weaponStyle: WeaponStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  finish: Finish;
  /** How the hero stands when not walking. */
  pose: Pose;
}

export const ARCHETYPES: Archetype[] = ["mecha", "knight", "cyberpunk", "sorcerer", "bot"];
export const HEAD_STYLES: HeadStyle[] = ["visor", "horned_helm", "cyber_goggles", "hooded_cowl", "bot_dome"];
export const TORSO_STYLES: TorsoStyle[] = ["cyber_reactor", "chiseled_cuirass", "tactical_vest", "robed_chest", "orb_core"];
export const SHOULDER_STYLES: ShoulderStyle[] = ["blade_wings", "spiked_pauldrons", "curved_guards", "compact_joints", "none"];
export const BACK_STYLES: BackStyle[] = ["twin_thrusters", "energy_cape", "power_battery", "floating_orbs", "none"];
export const WEAPON_STYLES: WeaponStyle[] = ["plasma_sword", "pulse_blaster", "crystal_staff", "aegis_shield", "none"];
export const FINISHES: Finish[] = ["brushed_metal", "matte_armor", "gloss_car", "carbon_weave", "hex_tech"];
export const POSES: Pose[] = ["idle", "heroic", "salute", "combat"];

export const PRIMARY_COLORS = ["#1e293b", "#e2e8f0", "#0f172a", "#2e1065", "#f8fafc", "#b91c1c", "#1d4ed8", "#15803d", "#f59e0b", "#db2777"];
export const SECONDARY_COLORS = ["#f97316", "#eab308", "#ec4899", "#c084fc", "#3b82f6", "#22c55e", "#ef4444", "#14b8a6", "#f8fafc", "#a16207"];
export const ACCENT_COLORS = ["#38bdf8", "#991b1b", "#06b6d4", "#10b981", "#facc15", "#a855f7", "#f472b6", "#94a3b8"];
export const GLOW_COLORS = ["#00f0ff", "#fbbf24", "#f43f5e", "#a855f7", "#10b981", "#ffffff", "#ff6b00", "#60a5fa"];

/** The five ready-made heroes from the Forge3D studio. */
export const ARCHETYPE_PRESETS: Record<Archetype, Omit<CharacterLook, "pose">> = {
  mecha: {
    archetype: "mecha", headStyle: "visor", torsoStyle: "cyber_reactor", shoulderStyle: "blade_wings",
    backStyle: "twin_thrusters", weaponStyle: "plasma_sword",
    primaryColor: "#1e293b", secondaryColor: "#f97316", accentColor: "#38bdf8", glowColor: "#00f0ff", finish: "carbon_weave",
  },
  knight: {
    archetype: "knight", headStyle: "horned_helm", torsoStyle: "chiseled_cuirass", shoulderStyle: "spiked_pauldrons",
    backStyle: "energy_cape", weaponStyle: "aegis_shield",
    primaryColor: "#e2e8f0", secondaryColor: "#eab308", accentColor: "#991b1b", glowColor: "#fbbf24", finish: "brushed_metal",
  },
  cyberpunk: {
    archetype: "cyberpunk", headStyle: "cyber_goggles", torsoStyle: "tactical_vest", shoulderStyle: "curved_guards",
    backStyle: "power_battery", weaponStyle: "pulse_blaster",
    primaryColor: "#0f172a", secondaryColor: "#ec4899", accentColor: "#06b6d4", glowColor: "#f43f5e", finish: "hex_tech",
  },
  sorcerer: {
    archetype: "sorcerer", headStyle: "hooded_cowl", torsoStyle: "robed_chest", shoulderStyle: "none",
    backStyle: "floating_orbs", weaponStyle: "crystal_staff",
    primaryColor: "#2e1065", secondaryColor: "#c084fc", accentColor: "#38bdf8", glowColor: "#a855f7", finish: "matte_armor",
  },
  bot: {
    archetype: "bot", headStyle: "bot_dome", torsoStyle: "orb_core", shoulderStyle: "compact_joints",
    backStyle: "power_battery", weaponStyle: "none",
    primaryColor: "#f8fafc", secondaryColor: "#3b82f6", accentColor: "#10b981", glowColor: "#10b981", finish: "gloss_car",
  },
};

export function presetLook(archetype: Archetype, pose: Pose = "idle"): CharacterLook {
  return { ...ARCHETYPE_PRESETS[archetype], pose };
}

/** A random hero: a preset with a few parts and colours swapped for variety. */
export function randomLook(random: () => number): CharacterLook {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const look = presetLook(pick(ARCHETYPES), random() < 0.7 ? "idle" : pick(POSES));
  if (random() < 0.5) look.headStyle = pick(HEAD_STYLES);
  if (random() < 0.4) look.backStyle = pick(BACK_STYLES);
  if (random() < 0.4) look.weaponStyle = pick(WEAPON_STYLES);
  if (random() < 0.6) look.primaryColor = pick(PRIMARY_COLORS);
  if (random() < 0.6) look.secondaryColor = pick(SECONDARY_COLORS);
  if (random() < 0.5) look.glowColor = pick(GLOW_COLORS);
  return look;
}

/**
 * Makes sure a saved look is a valid hero look. Profiles saved before the
 * heroes arrived (with hair and outfits) become a hero in their old colours.
 */
export function normalizeLook(raw: unknown): CharacterLook {
  const r = (raw ?? {}) as Record<string, unknown>;
  const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
  const color = (v: unknown, fallback: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);
  const archetype = oneOf(r.archetype, ARCHETYPES, "mecha");
  const base = ARCHETYPE_PRESETS[archetype];
  if (r.archetype === undefined) {
    // An old kid-style look: keep its favourite colours.
    return { ...base, primaryColor: color(r.top, base.primaryColor), secondaryColor: color(r.bottom, base.secondaryColor), pose: "idle" };
  }
  return {
    archetype,
    headStyle: oneOf(r.headStyle, HEAD_STYLES, base.headStyle),
    torsoStyle: oneOf(r.torsoStyle, TORSO_STYLES, base.torsoStyle),
    shoulderStyle: oneOf(r.shoulderStyle, SHOULDER_STYLES, base.shoulderStyle),
    backStyle: oneOf(r.backStyle, BACK_STYLES, base.backStyle),
    weaponStyle: oneOf(r.weaponStyle, WEAPON_STYLES, base.weaponStyle),
    primaryColor: color(r.primaryColor, base.primaryColor),
    secondaryColor: color(r.secondaryColor, base.secondaryColor),
    accentColor: color(r.accentColor, base.accentColor),
    glowColor: color(r.glowColor, base.glowColor),
    finish: oneOf(r.finish, FINISHES, base.finish),
    pose: oneOf(r.pose, POSES, "idle"),
  };
}

// ---------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------

/** Studio units → town metres (the original hero is ~3.7 units tall). */
const HERO_SCALE = 0.475;
const HIPS_Y = 1.85;
const CHASSIS = "#18181b"; // dark inner frame
const JOINT = "#71717a"; // grey hydraulic joints

// ---------------------------------------------------------------------
// Glow: a tiny shader add-on. Vertices whose colour alpha is low are drawn
// bright and unlit, so they look like they give off light.
// ---------------------------------------------------------------------

class GlowPlugin extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, "HeroGlow", 210, { HEROGLOW: false });
    this._enable(true);
  }

  prepareDefines(defines: MaterialDefines): void {
    defines["HEROGLOW"] = true;
  }

  getClassName(): string {
    return "GlowPlugin";
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType === "vertex") {
      return {
        CUSTOM_VERTEX_DEFINITIONS: "#if defined(HEROGLOW) && defined(VERTEXCOLOR)\nvarying float vHeroGlow;\n#endif",
        CUSTOM_VERTEX_MAIN_END: "#if defined(HEROGLOW) && defined(VERTEXCOLOR)\nvHeroGlow = color.a;\n#endif",
      };
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: "#if defined(HEROGLOW) && defined(VERTEXCOLOR)\nvarying float vHeroGlow;\n#endif",
      CUSTOM_FRAGMENT_BEFORE_FOG: `
#if defined(HEROGLOW) && defined(VERTEXCOLOR)
if (vHeroGlow < 0.5) color.rgb = baseColor.rgb * 1.35 + vec3(0.08);
#endif`,
    };
  }
}

/** How shiny each finish is. */
const FINISH_SHINE: Record<Finish, { spec: number; power: number }> = {
  gloss_car: { spec: 0.85, power: 96 },
  brushed_metal: { spec: 0.6, power: 48 },
  carbon_weave: { spec: 0.45, power: 64 },
  hex_tech: { spec: 0.5, power: 56 },
  matte_armor: { spec: 0.12, power: 16 },
};

function heroMaterial(scene: Scene, name: string, finish: Finish): StandardMaterial {
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.diffuseColor = Color3.White();
  const shine = FINISH_SHINE[finish];
  mat.specularColor = new Color3(shine.spec, shine.spec, shine.spec);
  mat.specularPower = shine.power;
  // A soft rim of light around the edges makes heroes stand out from the town.
  const rim = new FresnelParameters();
  rim.leftColor = new Color3(0.28, 0.28, 0.32);
  rim.rightColor = Color3.Black();
  rim.bias = 0.4;
  rim.power = 2.4;
  mat.emissiveFresnelParameters = rim;
  new GlowPlugin(mat);
  return mat;
}

// ---------------------------------------------------------------------
// "Rich" heroes (Medium/High quality and the creator): real metal materials
// that reflect a bright studio, like the original Forge3D studio.
// ---------------------------------------------------------------------

/** The kinds of surface on a hero. Each gets its own metal material. */
type Slot = "primary" | "secondary" | "accent" | "chassis" | "joint" | "glow" | "blade";
const SLOTS: Slot[] = ["primary", "secondary", "accent", "chassis", "joint", "glow", "blade"];

/** Metal and roughness per finish (from the Forge3D presets). */
const FINISH_PBR: Record<Finish, { metal: number; rough: number }> = {
  gloss_car: { metal: 0.6, rough: 0.12 },
  brushed_metal: { metal: 0.92, rough: 0.22 },
  carbon_weave: { metal: 0.85, rough: 0.28 },
  hex_tech: { metal: 0.7, rough: 0.35 },
  matte_armor: { metal: 0.35, rough: 0.55 },
};

const environments = new WeakMap<Scene, BaseTexture>();

/**
 * A soft "photo studio" for metal to reflect: a gradient room with three big
 * light panels (like three.js's RoomEnvironment). It is drawn once into a
 * small cube texture, then the studio pieces are removed.
 */
export function heroEnvironment(scene: Scene): BaseTexture {
  const existing = environments.get(scene);
  if (existing) return existing;
  const probe = new ReflectionProbe("heroStudio", 128, scene, true, true);
  probe.refreshRate = 0; // 0 = draw it only once
  probe.position = new Vector3(0, -500, 0);
  const pieces: Mesh[] = [];
  const glowMat = (c: string, k: number) => {
    const m = new StandardMaterial("studioPanel", scene);
    m.disableLighting = true;
    m.emissiveColor = Color3.FromHexString(c).scale(k);
    m.backFaceCulling = false;
    m.fogEnabled = false;
    return m;
  };
  const room = CreateSphere("studioRoom", { diameter: 40, segments: 12, sideOrientation: Mesh.BACKSIDE }, scene);
  const positions = room.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const t = positions[i + 1] / 20; // -1 bottom .. 1 top
    // A dim room (so the bright panels make crisp highlights), lighter above, dark below.
    const c = t > 0 ? Color3.Lerp(Color3.FromHexString("#3a4352"), Color3.FromHexString("#6b7687"), t) : Color3.Lerp(Color3.FromHexString("#3a4352"), Color3.FromHexString("#101216"), -t);
    colors.push(c.r, c.g, c.b, 1);
  }
  room.setVerticesData(VertexBuffer.ColorKind, colors);
  room.material = glowMat("#ffffff", 1);
  pieces.push(room);
  // Key light (warm, front-left), rim light (cool, back-right), and a big soft top light.
  const panel = (w: number, h: number, at: V3, color: string, k: number) => {
    const p = CreateBox("studioLight", { width: w, height: h, depth: 0.2 }, scene);
    p.position.set(...at);
    p.lookAt(Vector3.Zero());
    p.material = glowMat(color, k);
    pieces.push(p);
  };
  panel(7, 10, [-12, 5, 12], "#fff1dc", 7);
  panel(4, 12, [13, 3, -9], "#bfe1ff", 6);
  panel(12, 4, [0, 17, 4], "#ffffff", 5);
  panel(3, 8, [12, 2, 11], "#ffffff", 4);
  for (const p of pieces) {
    p.position.addInPlace(new Vector3(0, -500, 0));
    p.isPickable = false;
    probe.renderList!.push(p);
  }
  // Once the cube is drawn, the studio is no longer needed.
  probe.cubeTexture.onAfterRenderObservable.addOnce(() => {
    for (const p of pieces) p.setEnabled(false);
  });
  environments.set(scene, probe.cubeTexture);
  return probe.cubeTexture;
}

const finishTextures = new WeakMap<Scene, Partial<Record<Finish, Texture>>>();

/** The carbon weave and hex tech patterns from Forge3D, drawn on a canvas. */
function finishTexture(scene: Scene, finish: Finish): Texture | null {
  if (finish !== "carbon_weave" && finish !== "hex_tech") return null;
  let cache = finishTextures.get(scene);
  if (!cache) finishTextures.set(scene, (cache = {}));
  if (cache[finish]) return cache[finish]!;
  const size = finish === "carbon_weave" ? 128 : 256;
  const tex = new DynamicTexture(`finish-${finish}`, { width: size, height: size }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  if (finish === "carbon_weave") {
    // Light and dark squares with a soft sheen: the weave (it is multiplied by the hero's colour).
    const step = 16;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const alt = (x / step + y / step) % 2 === 0;
        ctx.fillStyle = alt ? "#e4e4e7" : "#9ca3af";
        ctx.fillRect(x, y, step, step);
        ctx.fillStyle = alt ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.18)";
        ctx.fillRect(x, y, step, step / 2);
      }
    }
  } else {
    ctx.fillStyle = "#d4d4d8";
    ctx.fillRect(0, 0, size, size);
    const r = 24;
    const h = r * Math.sin(Math.PI / 3);
    ctx.strokeStyle = "rgba(40,40,48,0.55)";
    ctx.lineWidth = 2;
    const hex = (cx: number, cy: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
      ctx.stroke();
    };
    for (let y = -h; y < size + h * 2; y += h * 2) {
      for (let x = -r * 3; x < size + r * 3; x += r * 3) {
        hex(x, y);
        hex(x + r * 1.5, y + h);
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc((i * 37) % size, (i * 61) % size, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  tex.update(true);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 8;
  cache[finish] = tex;
  return tex;
}

/** One realistic metal material per surface kind, coloured for this hero. */
function richMaterials(scene: Scene, name: string, L: CharacterLook): Record<Slot, PBRMaterial> {
  const env = heroEnvironment(scene);
  const f = FINISH_PBR[L.finish];
  const lin = (hex: string) => Color3.FromHexString(hex).toLinearSpace();
  const make = (slot: Slot, color: string, metal: number, rough: number): PBRMaterial => {
    const m = new PBRMaterial(`${name}-${slot}`, scene);
    m.albedoColor = lin(color);
    m.metallic = metal;
    m.roughness = rough;
    m.reflectionTexture = env;
    m.environmentIntensity = 1.0;
    m.directIntensity = 1.4;
    m.useRadianceOverAlpha = false;
    return m;
  };
  const glow = lin(L.glowColor);
  const mats: Record<Slot, PBRMaterial> = {
    primary: make("primary", L.primaryColor, f.metal, f.rough),
    secondary: make("secondary", L.secondaryColor, Math.max(0.1, f.metal - 0.2), Math.min(0.9, f.rough + 0.2)),
    accent: make("accent", L.accentColor, Math.min(0.95, f.metal + 0.1), Math.max(0.1, f.rough - 0.1)),
    chassis: make("chassis", CHASSIS, 0.9, 0.4),
    joint: make("joint", JOINT, 0.95, 0.15),
    glow: make("glow", L.glowColor, 0.1, 0.2),
    blade: make("blade", L.accentColor, 0.9, 0.1),
  };
  mats.glow.emissiveColor = glow.scale(2.2);
  mats.glow.emissiveIntensity = 1;
  mats.blade.emissiveColor = glow.scale(1.6);
  const tex = finishTexture(scene, L.finish);
  if (tex) mats.primary.albedoTexture = tex;
  return mats;
}

// ---------------------------------------------------------------------
// Shape helpers (ports of the Forge3D geometry bank)
// ---------------------------------------------------------------------

type V3 = [number, number, number];

/** Build a flat prism from a 2D outline (in x/y), `depth` thick along z, centred. */
function extrude(scene: Scene, outline: [number, number][], depth: number): Mesh {
  const n = outline.length;
  const tris = earClip(outline);
  const positions: number[] = [];
  const indices: number[] = [];
  const d = depth / 2;
  const add = (p: V3) => positions.push(...p) / 3 - 1;
  // Front (+z) and back (-z) caps (earClip always returns counter-clockwise triangles)
  for (const [a, b, c] of tris) {
    const i = add([outline[a][0], outline[a][1], d]);
    add([outline[b][0], outline[b][1], d]);
    add([outline[c][0], outline[c][1], d]);
    indices.push(i, i + 2, i + 1);
    const j = add([outline[a][0], outline[a][1], -d]);
    add([outline[b][0], outline[b][1], -d]);
    add([outline[c][0], outline[c][1], -d]);
    indices.push(j, j + 1, j + 2);
  }
  // Sides
  const ccw = signedArea(outline) > 0;
  for (let k = 0; k < n; k++) {
    const p = outline[k];
    const q = outline[(k + 1) % n];
    const i = add([p[0], p[1], d]);
    add([q[0], q[1], d]);
    add([q[0], q[1], -d]);
    add([p[0], p[1], -d]);
    if (ccw) indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    else indices.push(i, i + 2, i + 1, i, i + 3, i + 2);
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  // Flat UVs across the outline, so finish textures (carbon, hex) show on these parts too.
  data.uvs = positions.flatMap((v, i) => (i % 3 === 2 ? [] : [v / 0.3]));
  const mesh = new Mesh("extrude", scene);
  data.applyToMesh(mesh);
  return mesh;
}

function signedArea(pts: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Split a simple polygon into triangles (works for the hollow-ish shapes like the blaster grip). */
function earClip(pts: [number, number][]): [number, number, number][] {
  const idx = pts.map((_, i) => i);
  if (signedArea(pts) < 0) idx.reverse();
  const out: [number, number, number][] = [];
  const cross = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inside = (p: number[], a: number[], b: number[], c: number[]) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  let guard = 0;
  while (idx.length > 3 && guard++ < 200) {
    for (let i = 0; i < idx.length; i++) {
      const a = idx[(i + idx.length - 1) % idx.length];
      const b = idx[i];
      const c = idx[(i + 1) % idx.length];
      if (cross(pts[a], pts[b], pts[c]) <= 0) continue;
      if (idx.some((k) => k !== a && k !== b && k !== c && inside(pts[k], pts[a], pts[b], pts[c]))) continue;
      out.push([a, b, c]);
      idx.splice(i, 1);
      break;
    }
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}

const OUTLINES = {
  cuirass: [[0, -0.6], [0.45, -0.4], [0.55, 0.45], [0.3, 0.65], [0, 0.58], [-0.3, 0.65], [-0.55, 0.45], [-0.45, -0.4]] as [number, number][],
  pauldron: [[-0.25, 0], [-0.32, 0.35], [0, 0.55], [0.32, 0.35], [0.25, 0], [0, -0.15]] as [number, number][],
  blade: [[0, 1.8], [0.12, 1.55], [0.12, 0], [-0.12, 0], [-0.12, 1.55]] as [number, number][],
  shield: [[0, 0.85], [0.48, 0.6], [0.42, -0.2], [0, -0.9], [-0.42, -0.2], [-0.48, 0.6]] as [number, number][],
  blaster: [[-0.15, -0.15], [-0.15, 0.15], [0.65, 0.15], [0.65, 0.05], [0.35, -0.15], [0.1, -0.35], [-0.02, -0.35], [0.02, -0.15]] as [number, number][],
  cape: [[-0.4, 0], [0.4, 0], [0.55, -1.5], [-0.55, -1.5]] as [number, number][],
};

/** Centre a mesh's vertices around its middle (like three.js geometry.center()). */
function centre(mesh: Mesh): Mesh {
  const b = mesh.getBoundingInfo().boundingBox;
  const c = b.center.clone();
  mesh.bakeTransformIntoVertices(Matrix.Translation(-c.x, -c.y, -c.z));
  mesh.refreshBoundingInfo();
  return mesh;
}

// ---------------------------------------------------------------------
// The hero
// ---------------------------------------------------------------------

/** The moving joints. Each becomes one bone of the skeleton. */
type BoneName = "hips" | "chest" | "head" | "armL" | "forearmL" | "armR" | "forearmR" | "thighL" | "calfL" | "thighR" | "calfR";
const BONE_PARENTS: Record<BoneName, BoneName | null> = {
  hips: null,
  chest: "hips",
  head: "chest",
  armL: "chest",
  forearmL: "armL",
  armR: "chest",
  forearmR: "armR",
  thighL: "hips",
  calfL: "thighL",
  thighR: "hips",
  calfR: "thighR",
};
const BONE_ORDER = Object.keys(BONE_PARENTS) as BoneName[];

export class Character {
  /** Move and turn this node to move the whole hero. */
  readonly root: TransformNode;
  private scaleNode: TransformNode;
  private joints = {} as Record<BoneName, TransformNode>;
  private rest = {} as Record<BoneName, Vector3>;
  private mesh!: Mesh;
  private skeleton!: Skeleton;

  // Animation state
  private time = Math.random() * 10;
  private walkPhase = 0;
  private walkAmount = 0;
  private waveTimer = 0;
  private hopTimer = 0;
  /** Set by whoever moves the hero: 0 = standing still, 1 = normal walking speed. */
  moving = 0;
  /** 0 = on the ground, 1 = in the air (jumping): legs tuck up, arms go out. */
  airborne = 0;

  constructor(
    scene: Scene,
    look: CharacterLook,
    name = "hero",
  ) {
    this.look = normalizeLook(look);
    this.root = new TransformNode(name, scene);
    this.scaleNode = new TransformNode(`${name}-scale`, scene);
    this.scaleNode.parent = this.root;

    // 1. The joints, in the original studio positions.
    const j = (bone: BoneName, x: number, y: number, z: number) => {
      const node = new TransformNode(`${name}-${bone}`, scene);
      const parent = BONE_PARENTS[bone];
      node.parent = parent ? this.joints[parent] : this.scaleNode;
      node.position.set(x, y, z);
      this.joints[bone] = node;
      this.rest[bone] = node.position.clone();
    };
    j("hips", 0, HIPS_Y, 0);
    j("chest", 0, 0.67, 0); // spine (0.25) + chest (0.42)
    j("head", 0, 0.9, 0);
    j("armL", 0.55, 0.6, 0);
    j("forearmL", 0, -0.65, 0);
    j("armR", -0.55, 0.6, 0);
    j("forearmR", 0, -0.65, 0);
    j("thighL", 0.28, -0.15, 0);
    j("calfL", 0, -0.75, 0);
    j("thighR", -0.28, -0.15, 0);
    j("calfR", 0, -0.75, 0);

    this.scaleNode.scaling.setAll(HERO_SCALE);
    this.buildMesh(scene, Character.detail);
  }

  /** "rich" = smooth metal heroes (Medium/High), "simple" = one light material (Low). New heroes use this. */
  static detail: "rich" | "simple" = "rich";

  /** Switch between rich and simple (when the quality setting changes). */
  setDetail(detail: "rich" | "simple"): void {
    if (detail === this.currentDetail) return;
    const scene = this.root.getScene();
    this.disposeMesh();
    this.buildMesh(scene, detail);
  }

  private currentDetail: "rich" | "simple" = "simple";

  private disposeMesh(): void {
    this.mesh.dispose();
    this.skeleton.dispose();
    for (const m of this.materials) m.dispose();
    this.materials = [];
  }

  /** Build all parts in the resting pose, merge them, and attach the skeleton. */
  private buildMesh(scene: Scene, detail: "rich" | "simple"): void {
    const name = this.root.name;
    this.currentDetail = detail;

    // Build in the resting pose, with the hero standing at the origin unscaled.
    const saved = BONE_ORDER.map((b) => [this.joints[b].position.clone(), this.joints[b].rotation.clone()] as const);
    for (const b of BONE_ORDER) {
      this.joints[b].position.copyFrom(this.rest[b]);
      this.joints[b].rotation.setAll(0);
    }
    this.scaleNode.parent = null;
    this.scaleNode.scaling.setAll(1);

    // All the parts, each hung on its joint and tagged with its bone.
    const parts: { mesh: Mesh; slot: Slot }[] = [];
    this.buildParts(scene, detail === "rich", (mesh, bone, slot) => {
      const n = mesh.getTotalVertices();
      const idx = new Float32Array(n * 4);
      const w = new Float32Array(n * 4);
      const bi = BONE_ORDER.indexOf(bone);
      for (let k = 0; k < n; k++) {
        idx[k * 4] = bi;
        w[k * 4] = 1;
      }
      mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, idx);
      mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, w);
      parts.push({ mesh, slot });
    });
    for (const n of Object.values(this.joints)) n.computeWorldMatrix(true);
    for (const p of parts) p.mesh.computeWorldMatrix(true);

    let merged: Mesh;
    if (detail === "rich") {
      // One piece per surface kind, then one mesh with a sub-mesh per material.
      const mats = richMaterials(scene, name, this.look);
      const groups: Mesh[] = [];
      for (const slot of SLOTS) {
        const list = parts.filter((p) => p.slot === slot).map((p) => p.mesh);
        if (list.length === 0) continue;
        const g = Mesh.MergeMeshes(list, true, true)!;
        g.material = mats[slot];
        groups.push(g);
      }
      merged = Mesh.MergeMeshes(groups, true, true, undefined, true, true)!;
      merged.useVertexColors = false;
      this.materials = [...Object.values(mats), merged.material!];
    } else {
      merged = Mesh.MergeMeshes(parts.map((p) => p.mesh), true, true)!;
      merged.hasVertexAlpha = false; // alpha marks glowing parts, not see-through ones
      merged.material = heroMaterial(scene, name, this.look.finish);
      this.materials = [merged.material];
    }
    merged.name = `${name}-mesh`;
    merged.numBoneInfluencers = 1;
    merged.parent = this.scaleNode;
    merged.isPickable = false;

    // A skeleton whose bones follow the joint nodes.
    const skeleton = new Skeleton(`${name}-skeleton`, `${name}-skeleton`, scene);
    const bones = {} as Record<BoneName, Bone>;
    for (const b of BONE_ORDER) {
      const parent = BONE_PARENTS[b];
      const local = Matrix.Translation(this.rest[b].x, this.rest[b].y, this.rest[b].z);
      bones[b] = new Bone(`${name}-${b}-bone`, skeleton, parent ? bones[parent] : null, local, local.clone(), local.clone());
      bones[b].linkTransformNode(this.joints[b]);
    }
    merged.skeleton = skeleton;
    // The pose changes the shape a lot (raised arms, staff): give the camera a generous box.
    merged.refreshBoundingInfo();
    merged.getBoundingInfo().scale(1.6);
    this.mesh = merged;
    this.skeleton = skeleton;

    // Put everything back.
    this.scaleNode.parent = this.root;
    this.scaleNode.scaling.setAll(HERO_SCALE);
    BONE_ORDER.forEach((b, i) => {
      this.joints[b].position.copyFrom(saved[i][0]);
      this.joints[b].rotation.copyFrom(saved[i][1]);
    });
    this.onMeshChanged?.(merged);
  }

  private materials: Material[] = [];
  /** Called when the mesh is rebuilt (so shadows can be updated). */
  onMeshChanged: ((mesh: Mesh) => void) | null = null;

  readonly look: CharacterLook;

  /** All the hero's parts, attached to their joints. `add` collects them. */
  private buildParts(scene: Scene, rich: boolean, add: (mesh: Mesh, bone: BoneName, slot: Slot) => void): void {
    const L = this.look;
    const J = this.joints;
    const glowCol = L.glowColor;

    /** Paint a part, place it on a joint (local position/rotation), and collect it. */
    const part = (mesh: Mesh, color: string, bone: BoneName, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], glow = false, scale?: V3): Mesh => {
      mesh.parent = J[bone];
      mesh.position.set(...at);
      mesh.rotation.set(...rot);
      if (scale) mesh.scaling.set(...scale);
      const c = Color3.FromHexString(color);
      const n = mesh.getTotalVertices();
      const colors = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b, glow ? 0.25 : 1], i * 4);
      mesh.setVerticesData(VertexBuffer.ColorKind, colors);
      mesh.isPickable = false;
      const slot: Slot = glow
        ? color === L.accentColor && L.weaponStyle === "plasma_sword" && bone === "forearmR" ? "blade" : "glow"
        : color === L.primaryColor ? "primary" : color === L.secondaryColor ? "secondary" : color === L.accentColor ? "accent" : color === CHASSIS ? "chassis" : "joint";
      add(mesh, bone, slot);
      return mesh;
    };
    // Rich heroes get smooth rounded armour; simple ones a cheaper bevel.
    const cbox = (w: number, h: number, d: number, r = 0.04) =>
      rich ? roundedBox(scene, w, h, d, Math.max(r, 0.035), 2, 0.35) : chamferBox(scene, w, h, d, Math.min(r, w / 2, h / 2, d / 2) * 0.9);
    const seg = (n: number) => (rich ? Math.round(n * 1.6) : n);
    const box = (w: number, h: number, d: number) => CreateBox("b", { width: w, height: h, depth: d }, scene);
    const cyl = (rTop: number, rBot: number, h: number, n = 12) => CreateCylinder("c", { diameterTop: rTop * 2, diameterBottom: rBot * 2, height: h, tessellation: seg(n) }, scene);
    const sphere = (r: number, n = 10) => CreateSphere("s", { diameter: r * 2, segments: seg(n) }, scene);
    const torus = (r: number, tube: number, n = 24) => CreateTorus("t", { diameter: r * 2, thickness: tube * 2, tessellation: seg(n) }, scene);
    const cone = (r: number, h: number, n = 12) => CreateCylinder("cone", { diameterTop: 0, diameterBottom: r * 2, height: h, tessellation: seg(n) }, scene);
    const ring = () => torus(0.35, 0.025, 28);

    // --- Hips ---
    part(cbox(0.65, 0.35, 0.45, 0.05), CHASSIS, "hips");
    part(cbox(0.2, 0.3, 0.46, 0.03), L.secondaryColor, "hips", [0.38, 0, 0], [0, 0, -0.15]);
    part(cbox(0.2, 0.3, 0.46, 0.03), L.secondaryColor, "hips", [-0.38, 0, 0], [0, 0, 0.15]);
    for (let i = 0; i < 3; i++) part(cyl(0.18 - i * 0.02, 0.19 - i * 0.02, 0.1, 10), JOINT, "hips", [0, 0.25 + i * 0.12, 0]);

    // --- Chest (positions are relative to the chest joint) ---
    if (L.torsoStyle === "chiseled_cuirass") {
      part(centre(extrude(scene, OUTLINES.cuirass, 0.5)), L.primaryColor, "chest", [0, 0.2, 0.08]);
      part(box(0.4, 0.15, 0.1), L.secondaryColor, "chest", [0, 0.42, 0.3]);
    } else if (L.torsoStyle === "cyber_reactor") {
      part(cbox(0.85, 0.9, 0.55, 0.08), L.primaryColor, "chest", [0, 0.25, 0]);
      part(torus(0.18, 0.04, 20), L.accentColor, "chest", [0, 0.3, 0.29], [Math.PI / 2, 0, 0]);
      part(cyl(0.13, 0.13, 0.05, 20), glowCol, "chest", [0, 0.3, 0.29], [Math.PI / 2, 0, 0], true);
      for (const r of [-1, 1]) part(box(0.3, 0.06, 0.1), L.secondaryColor, "chest", [r * 0.28, 0.1, 0.26], [0, 0, -r * 0.2]);
    } else if (L.torsoStyle === "tactical_vest") {
      part(cbox(0.8, 0.85, 0.5, 0.05), L.primaryColor, "chest", [0, 0.25, 0]);
      for (let p = -1; p <= 1; p++) part(box(0.18, 0.2, 0.12), L.secondaryColor, "chest", [p * 0.24, 0.05, 0.3]);
    } else if (L.torsoStyle === "orb_core") {
      part(sphere(0.5, 14), L.primaryColor, "chest", [0, 0.25, 0]);
      part(torus(0.52, 0.03, 28), L.accentColor, "chest", [0, 0.25, 0]);
    } else {
      part(cbox(0.75, 0.95, 0.48, 0.08), L.primaryColor, "chest", [0, 0.22, 0]);
      part(box(0.3, 0.8, 0.08), L.secondaryColor, "chest", [0, 0.15, 0.28]);
    }

    // --- Head ---
    part(cyl(0.12, 0.14, 0.2, 12), JOINT, "head", [0, -0.1, 0]);
    part(cbox(0.48, 0.52, 0.5, 0.08), L.primaryColor, "head");
    if (L.headStyle === "visor") {
      part(cbox(0.46, 0.14, 0.2, 0.02), glowCol, "head", [0, 0.02, 0.22], undefined, true);
      part(cyl(0.015, 0.02, 0.35, 6), L.accentColor, "head", [0.26, 0.25, -0.05], [0, 0, -0.2]);
    } else if (L.headStyle === "horned_helm") {
      for (const s of [1, -1]) {
        const path = Curve3.CreateCatmullRomSpline(
          [new Vector3(0, 0, 0), new Vector3(0.12 * s, 0.22, -0.05), new Vector3(0.28 * s, 0.45, -0.12), new Vector3(0.4 * s, 0.65, -0.05)],
          4,
        ).getPoints();
        const horn = CreateTube("horn", { path, radiusFunction: (_i, d) => 0.06 * (1 - (d / 0.85) * 0.75), tessellation: 8, cap: Mesh.CAP_ALL }, scene);
        part(horn, L.secondaryColor, "head", [0.24 * s, 0.2, 0]);
      }
      part(box(0.3, 0.04, 0.06), glowCol, "head", [0, 0.04, 0.26], undefined, true);
      part(box(0.04, 0.16, 0.06), glowCol, "head", [0, -0.04, 0.26], undefined, true);
    } else if (L.headStyle === "cyber_goggles") {
      for (const g of [-1, 1]) {
        part(cyl(0.1, 0.1, 0.12, 14), L.accentColor, "head", [g * 0.14, 0.04, 0.26], [Math.PI / 2, 0, 0]);
        part(cyl(0.08, 0.08, 0.04, 14), glowCol, "head", [g * 0.14, 0.04, 0.31], [Math.PI / 2, 0, 0], true);
      }
    } else if (L.headStyle === "bot_dome") {
      part(sphere(0.32, 14), L.primaryColor, "head", [0, 0.05, 0]);
      for (const e of [-1, 1]) part(box(0.08, 0.06, 0.04), glowCol, "head", [e * 0.12, 0.08, 0.31], undefined, true);
    } else {
      part(cone(0.38, 0.65, 14), L.secondaryColor, "head", [0, 0.2, -0.06], [-0.25, 0, 0]);
      part(sphere(0.2, 10), CHASSIS, "head", [0, 0.02, 0.12]);
      for (const m of [-1, 1]) part(sphere(0.03, 6), glowCol, "head", [m * 0.08, 0.04, 0.3], undefined, true);
    }

    // --- Shoulders (fixed to the chest, at each shoulder) ---
    const sh = (side: number, x: number, y: number, z: number): V3 => [side * 0.55 + x, 0.6 + y, z];
    if (L.shoulderStyle === "spiked_pauldrons" || L.shoulderStyle === "curved_guards") {
      for (const s of [1, -1]) {
        const p = centre(extrude(scene, OUTLINES.pauldron, L.shoulderStyle === "curved_guards" ? 0.42 : 0.36));
        part(p, L.primaryColor, "chest", sh(s, s * 0.12, 0.15, 0), [0, 0, -s * 0.25]);
      }
    } else if (L.shoulderStyle === "blade_wings") {
      for (const s of [1, -1]) {
        for (let k = 0; k < 3; k++) {
          part(box(0.06, 0.35 + k * 0.08, 0.18), L.accentColor, "chest", sh(s, s * (0.16 + k * 0.06), 0.1 + k * 0.08, -0.05), [0, 0, -s * (0.4 + k * 0.15)]);
        }
      }
    }
    for (const s of [1, -1]) part(sphere(0.16, 10), JOINT, "chest", sh(s, 0, 0, 0));

    // --- Arms ---
    for (const [arm, fore] of [["armL", "forearmL"], ["armR", "forearmR"]] as [BoneName, BoneName][]) {
      part(cbox(0.24, 0.6, 0.24, 0.04), L.primaryColor, arm, [0, -0.32, 0]);
      part(cyl(0.12, 0.12, 0.24, 12), JOINT, arm, [0, -0.65, 0], [0, 0, Math.PI / 2]);
      part(cbox(0.28, 0.6, 0.3, 0.05), L.secondaryColor, fore, [0, -0.32, 0]);
      part(box(0.18, 0.22, 0.2), CHASSIS, fore, [0, -0.68, 0]);
    }

    // --- Back gear (fixed to the chest) ---
    const bk = (x: number, y: number, z: number): V3 => [x, 0.28 + y, -0.28 + z];
    if (L.backStyle === "twin_thrusters") {
      for (const t of [-1, 1]) {
        part(cbox(0.26, 0.8, 0.28, 0.04), L.primaryColor, "chest", bk(t * 0.35, 0.1, 0));
        const nozzle = CreateLathe("nozzle", {
          shape: [[0.08, 0], [0.16, 0.15], [0.18, 0.4], [0.24, 0.7], [0.26, 0.75], [0.22, 0.75], [0.14, 0.42], [0.12, 0.16], [0.06, 0]].map(([x, y]) => new Vector3(x, y, 0)),
          tessellation: 16,
          sideOrientation: Mesh.DOUBLESIDE,
        }, scene);
        part(nozzle, CHASSIS, "chest", bk(t * 0.35, 0.1 - 0.4, 0), [Math.PI, 0, 0]);
        part(cone(0.14, 0.45, 12), glowCol, "chest", bk(t * 0.35, 0.1 - 0.62, 0), [Math.PI, 0, 0], true);
      }
    } else if (L.backStyle === "floating_orbs") {
      for (let o = 0; o < 3; o++) {
        const a = (o * Math.PI * 2) / 3;
        const at = bk(Math.cos(a) * 0.65, 0.2 + Math.sin(a) * 0.45, -0.15);
        part(sphere(0.14, 10), glowCol, "chest", at, undefined, true);
        part(ring(), glowCol, "chest", at, [Math.PI / 2, a, 0], true);
      }
    } else if (L.backStyle === "power_battery") {
      part(cyl(0.18, 0.18, 0.85, 14), L.primaryColor, "chest", bk(0, 0.1, 0));
      part(cyl(0.19, 0.19, 0.35, 14), glowCol, "chest", bk(0, 0.1, 0), undefined, true);
    } else if (L.backStyle === "energy_cape") {
      part(extrude(scene, OUTLINES.cape, 0.03), L.secondaryColor, "chest", bk(0, 0.3, -0.02), [-0.12, 0, 0]);
    }

    // --- Legs ---
    for (const [thigh, calf] of [["thighL", "calfL"], ["thighR", "calfR"]] as [BoneName, BoneName][]) {
      part(cbox(0.3, 0.75, 0.32, 0.05), L.primaryColor, thigh, [0, -0.38, 0]);
      part(cyl(0.14, 0.14, 0.28, 12), JOINT, thigh, [0, -0.75, 0], [0, 0, Math.PI / 2]);
      part(box(0.24, 0.2, 0.12), L.accentColor, thigh, [0, -0.75, 0.15]);
      part(cbox(0.28, 0.75, 0.3, 0.05), L.secondaryColor, calf, [0, -0.4, 0]);
      part(cbox(0.32, 0.2, 0.55, 0.04), CHASSIS, calf, [0, -0.85, 0.12]);
    }

    // --- Weapons (in the hands; hands sit at y -0.68 on the forearms) ---
    const hand = (x: number, y: number, z: number): V3 => [x, -0.68 + y, z];
    if (L.weaponStyle === "plasma_sword") {
      // The sword points forward from the right hand.
      part(cyl(0.04, 0.04, 0.45, 8), CHASSIS, "forearmR", hand(0, 0, 0.15 - 0.2), [Math.PI / 2, 0, 0]);
      part(box(0.35, 0.08, 0.12), L.secondaryColor, "forearmR", hand(0, 0, 0.15 + 0.04), [Math.PI / 2, 0, 0]);
      const blade = centre(extrude(scene, OUTLINES.blade, 0.05));
      part(blade, L.accentColor, "forearmR", hand(0, 0, 0.15 + 0.95), [Math.PI / 2, 0, 0], true);
    } else if (L.weaponStyle === "pulse_blaster") {
      part(centre(extrude(scene, OUTLINES.blaster, 0.16)), L.primaryColor, "forearmR", hand(0, 0, 0.25), [0, -Math.PI / 2, 0]);
      part(box(0.08, 0.06, 0.28), glowCol, "forearmR", hand(0, 0.02, 0.43), undefined, true);
    } else if (L.weaponStyle === "crystal_staff") {
      part(cyl(0.035, 0.035, 2.6, 8), CHASSIS, "forearmR", hand(0, 0, 0));
      const crystal = CreatePolyhedron("crystal", { type: 1, size: 0.22 }, scene);
      part(crystal, glowCol, "forearmR", hand(0, 1.4, 0), undefined, true);
      part(ring(), glowCol, "forearmR", hand(0, 1.4, 0), [Math.PI / 2, 0, 0], true, [0.7, 0.7, 0.7]);
    } else if (L.weaponStyle === "aegis_shield") {
      const shield = centre(extrude(scene, OUTLINES.shield, 0.12));
      part(shield, L.primaryColor, "forearmL", hand(0.18, 0, 0.15), [0, -Math.PI / 2, 0]);
      part(box(0.04, 0.35, 0.2), L.secondaryColor, "forearmL", hand(0.25, 0, 0.15));
    }
  }

  // ------------------------------------------------------------------
  // Animation (a port of the Forge3D pose system, plus walking and waving)
  // ------------------------------------------------------------------

  /** Wave hello (with a little hop). */
  wave(): void {
    this.waveTimer = 1.6;
    this.hopTimer = 0.45;
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    this.walkAmount += ((this.moving > 0 ? 1 : 0) - this.walkAmount) * Math.min(1, dt * 10);
    const w = this.walkAmount;
    this.walkPhase += dt * (3 + 5 * Math.max(this.moving, 0.4));

    // Target rotations for each joint: [x, y, z]
    const T: Record<BoneName, V3> = {
      hips: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0],
      armL: [0, 0, 0.15], forearmL: [0, 0, 0], armR: [0, 0, -0.15], forearmR: [0, 0, 0],
      thighL: [0, 0, 0], calfL: [0, 0, 0], thighR: [0, 0, 0], calfR: [0, 0, 0],
    };
    let hipsY = HIPS_Y;

    // The standing pose this hero likes.
    const pose = this.look.pose;
    if (pose === "combat") {
      const tension = Math.sin(t * 3.5) * 0.02;
      hipsY = 1.72 + tension;
      T.hips[1] = 0.35;
      T.chest[0] = 0.2;
      T.thighL[0] = -0.4; T.calfL[0] = 0.45;
      T.thighR[0] = 0.25; T.calfR[0] = 0.2;
      T.armL = [-0.8, 0.4, 0.15]; T.forearmL[0] = -1.2;
      T.armR = [-0.6, -0.3, -0.15]; T.forearmR[0] = -1.4;
      T.head[1] = -0.35;
    } else if (pose === "heroic") {
      const breath = Math.sin(t * 1.8) * 0.03;
      hipsY = 1.88;
      T.chest[0] = -0.25 + breath;
      T.head[0] = -0.2;
      T.armR = [-2.4, 0, -0.4]; T.forearmR[0] = -0.3;
      T.armL = [0.1, 0, 0.7]; T.forearmL = [-1.5, 0.6, 0];
      T.thighL[2] = 0.15; T.thighR[2] = -0.15;
    } else if (pose === "salute") {
      hipsY = 1.88;
      T.chest[0] = -0.1;
      T.armL = [0, 0, 0.1];
      T.armR = [-1.5, -0.4, -0.6]; T.forearmR[0] = -2.2;
      T.head[1] = 0.05;
    } else {
      const breath = Math.sin(t * 2.2);
      const sway = Math.sin(t * 1.1) * 0.04;
      hipsY = HIPS_Y + breath * 0.025;
      T.chest = [breath * 0.055, sway, 0];
      T.head = [-breath * 0.02, Math.sin(t * 0.8) * 0.12, 0];
      T.armL = [Math.sin(t * 2) * 0.05, 0, 0.2 + breath * 0.03];
      T.forearmL[0] = -0.2 - breath * 0.05;
      T.armR = [-Math.sin(t * 2) * 0.05, 0, -0.2 - breath * 0.03];
      T.forearmR[0] = -0.2 - breath * 0.05;
    }

    // Walking blends over the standing pose.
    if (w > 0.01) {
      const stride = Math.sin(this.walkPhase) * 0.6;
      const bob = Math.abs(Math.cos(this.walkPhase)) * 0.08;
      const mix = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
      hipsY += (1.8 - bob - hipsY) * w;
      T.hips = mix(T.hips, [0, -stride * 0.2, 0]);
      T.chest = mix(T.chest, [0.06, stride * 0.2, 0]);
      T.thighL = mix(T.thighL, [stride, 0, 0]);
      T.calfL = mix(T.calfL, [stride > 0 ? 0.4 : 0.05, 0, 0]);
      T.thighR = mix(T.thighR, [-stride, 0, 0]);
      T.calfR = mix(T.calfR, [-stride > 0 ? 0.4 : 0.05, 0, 0]);
      T.armL = mix(T.armL, [-stride * 0.8, 0, 0.15]);
      T.forearmL = mix(T.forearmL, [-0.3, 0, 0]);
      T.armR = mix(T.armR, [stride * 0.8, 0, -0.15]);
      T.forearmR = mix(T.forearmR, [-0.3, 0, 0]);
      T.head = mix(T.head, [bob * 0.5, 0, 0]);
    }

    // Jumping: knees up, arms out.
    if (this.airborne > 0.01) {
      const a = this.airborne;
      const mix = (from: V3, to: V3): V3 => [from[0] + (to[0] - from[0]) * a, from[1] + (to[1] - from[1]) * a, from[2] + (to[2] - from[2]) * a];
      T.thighL = mix(T.thighL, [-0.9, 0, 0.1]);
      T.calfL = mix(T.calfL, [1.2, 0, 0]);
      T.thighR = mix(T.thighR, [-0.35, 0, -0.1]);
      T.calfR = mix(T.calfR, [0.7, 0, 0]);
      T.armL = mix(T.armL, [-0.3, 0, 1.1]);
      T.armR = mix(T.armR, [-0.3, 0, -1.1]);
      T.chest = mix(T.chest, [-0.1, 0, 0]);
    }

    // Wave: the left arm goes up and swings side to side.
    if (this.waveTimer > 0) {
      this.waveTimer -= dt;
      const up = Math.min(1, this.waveTimer * 4, (1.6 - this.waveTimer) * 6);
      const swing = Math.sin(t * 14) * 0.35;
      T.armL = [T.armL[0] * (1 - up), 0, T.armL[2] + up * (2.5 - T.armL[2]) + swing * up];
      T.forearmL = [T.forearmL[0] * (1 - up), 0, swing * 0.5 * up];
      T.head[2] += 0.1 * up;
    }
    if (this.hopTimer > 0) {
      this.hopTimer -= dt;
      hipsY += Math.sin((this.hopTimer / 0.45) * Math.PI) * 0.45;
    }

    // Glide every joint smoothly towards its target.
    const k = 1 - Math.exp(-12 * dt);
    for (const b of BONE_ORDER) {
      const r = this.joints[b].rotation;
      r.x += (T[b][0] - r.x) * k;
      r.y += (T[b][1] - r.y) * k;
      r.z += (T[b][2] - r.z) * k;
    }
    const hips = this.joints.hips.position;
    hips.y += (hipsY - hips.y) * k;
  }

  get position(): Vector3 {
    return this.root.position;
  }

  /** World position just above the head (for speech bubbles). */
  headTop(): Vector3 {
    return this.root.position.add(new Vector3(0, (HIPS_Y + 0.67 + 0.9 + 0.55) * HERO_SCALE, 0));
  }

  /** The hero's meshes (for shadows). */
  meshes(): Mesh[] {
    return [this.mesh];
  }

  dispose(): void {
    this.disposeMesh();
    this.root.dispose();
  }
}
