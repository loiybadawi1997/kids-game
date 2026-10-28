import { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { StaticBatch, box, createVertexColorMaterial } from "./meshKit";
import { NavGrid } from "./navGrid";
import { COLORS, PropBuilder, makeRandom } from "./props";
import { createAmbient } from "./ambient";

/** Places of interest that other code may want to know about. */
export interface TownInfo {
  nav: NavGrid;
  /** Where the player starts. */
  spawn: { x: number; z: number };
  /** Spots where townsfolk like to hang out. */
  hangouts: { x: number; z: number }[];
  /** Where shopkeepers stand (in front of each shop). */
  shopFronts: { x: number; z: number; rotY: number }[];
  update(dt: number): void;
}

/*
 * The town map, seen from above (north is +Z, east is +X):
 *
 *            trees & hills
 *    [home]  [home]   |   [home]  [home]        z = 23
 *   ====== Home Lane ===+=================      z = 16
 *     park  benches   (plaza)   benches
 *   ======= Main Street =(fountain)= Market Street [shops] ==  z = 0
 *     pond, slide     |           [shops]
 *   ====== South Lane ==+=================      z = -16
 *    [house] [house] [Town Hall] [house]        z = -23
 */
export function buildTown(scene: Scene): TownInfo {
  const random = makeRandom(7);
  const nav = new NavGrid(-41, -33, 41, 35, 0.5);
  const material = createVertexColorMaterial(scene, "town");
  const batch = new StaticBatch(material, 28);
  const b = new PropBuilder(scene, batch, nav, random);

  createGround(scene, random);

  // --- Paths ---
  b.path(-41, 0, 41, 0); // Main Street / Market Street
  b.path(0, -16, 0, 16); // north-south
  b.path(-33, 16, 33, 16, 3.0); // Home Lane
  b.path(-31, -16, 31, -16, 3.0); // South Lane
  b.path(0, -21.5, 0, -16, 2.4); // to the Town Hall
  b.plaza(0, 0, 9.5);

  // --- Plaza: fountain, benches, planters, lamps ---
  b.fountain(0, 0);
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const x = Math.cos(a) * 7.8;
    const z = Math.sin(a) * 7.8;
    b.bench(x, z, Math.atan2(-x, -z));
    b.planter(Math.cos(a) * 10.6, Math.sin(a) * 10.6, Math.atan2(-x, -z));
  }
  for (const [x, z] of [[-4.6, 4.6], [4.6, 4.6], [-4.6, -4.6], [4.6, -4.6]]) b.flowers(x * 0.98, z * 0.98, 4, 0.5);

  // --- Lamps along the streets ---
  for (const x of [-34, -22, -13, 13, 21, 29.5, 38]) {
    b.lamp(x, 2.4);
    b.lamp(x + 4, -2.4);
  }
  for (const x of [-21, -8, 8, 20]) {
    b.lamp(x, 18.1);
    b.lamp(x, -13.9);
  }

  // --- Home Lane: four homes for the children ---
  const homes = [
    { x: -26, wall: "#ffd6e7", roof: "#e64980", door: "#8f5cc2" },
    { x: -13, wall: "#d3f9d8", roof: "#2f9e44", door: "#e8590c" },
    { x: 13, wall: "#d0ebff", roof: "#1c7ed6", door: "#f08c00" },
    { x: 26, wall: "#fff3bf", roof: "#f76707", door: "#1971c2" },
  ];
  for (const h of homes) {
    b.house(h.x, 23.5, Math.PI, h);
    b.path(h.x, 17.4, h.x, 20.6, 1.5); // front path to the door
    b.fence(h.x - 4.2, 18.4, h.x - 4.2, 21.2);
    b.fence(h.x + 4.2, 18.4, h.x + 4.2, 21.2);
    b.flowers(h.x - 2.6, 19.6, 6, 0.9);
    b.flowers(h.x + 2.6, 19.6, 6, 0.9);
    b.tree(h.x - 4.5, 28.5, 1.1, "round");
    b.tree(h.x + 4, 29.5, 1.0, random() < 0.5 ? "pine" : "blossom");
    b.bush(h.x + 3.6, 22.4);
  }
  // Gardens between the plaza and Home Lane.
  for (const sx of [-1, 1]) {
    b.tree(sx * 6.5, 12.5, 1.0, "blossom");
    b.tree(sx * 18, 13.2, 1.1, "round");
    b.bush(sx * 10.5, 13.2);
    b.bench(sx * 13.5, 12.6, 0);
    b.flowers(sx * 21, 12.8, 8, 1.1);
    b.tree(sx * 27, 13.4, 1.0, "pine");
    b.bush(sx * 30, 13.1, "#6cc24a");
  }

  // --- Market Street: three shops on each side ---
  const shopColors = [
    { wall: "#ffe8cc", stripeA: "#ff6b6b", stripeB: "#ffffff", fruit: ["#ff4d4d", "#ffa94d", "#ffe066"] },
    { wall: "#e5dbff", stripeA: "#4dabf7", stripeB: "#ffffff", fruit: ["#82c91e", "#ff4d4d", "#ffd43b"] },
    { wall: "#d3f9d8", stripeA: "#f59f00", stripeB: "#fff3bf", fruit: ["#ff922b", "#cc5de8", "#ff4d4d"] },
    { wall: "#ffdeeb", stripeA: "#ae3ec9", stripeB: "#ffffff", fruit: ["#ffe066", "#82c91e", "#ff6b6b"] },
    { wall: "#fff3bf", stripeA: "#37b24d", stripeB: "#ffffff", fruit: ["#ff4d4d", "#ffa94d", "#82c91e"] },
    { wall: "#d0ebff", stripeA: "#f03e3e", stripeB: "#ffe3e3", fruit: ["#ffd43b", "#ff922b", "#cc5de8"] },
  ];
  const shopFronts: TownInfo["shopFronts"] = [];
  [16.5, 25.5, 34.5].forEach((x, i) => {
    b.shop(x, 8.8, Math.PI, shopColors[i * 2]);
    b.shop(x, -8.8, 0, shopColors[i * 2 + 1]);
    shopFronts.push({ x: x + 1.2, z: 4.5, rotY: Math.PI }, { x: x + 1.2, z: -4.5, rotY: 0 });
  });
  b.signPosts(11, 0, -Math.PI / 2, 5.6, 3.4);
  sign(scene, "🛒 Market Street", 11, 0, -Math.PI / 2, 5.4, 1.15, 3.6, "#ff6b6b");

  // --- The park (west) ---
  b.pond(-24, -7.5, 5.2, 3.3);
  b.slide(-21, 7.5, Math.PI / 2);
  b.swings(-30.5, 7.8, 0);
  b.bench(-24, -2.7, Math.PI);
  b.bench(-17, -6.5, -Math.PI / 2);
  b.signPosts(-12.5, 3.1, Math.PI / 2, 2.4, 2.2);
  sign(scene, "🌳 Park", -12.5, 3.1, Math.PI / 2, 2.3, 0.8, 2.35, "#2f9e44");
  for (const [x, z, kind] of [
    [-34, 4, "round"], [-35, -6, "pine"], [-33, -12.5, "round"], [-27, -12.8, "blossom"], [-19.5, -12, "round"],
    [-15.5, -10, "pine"], [-14.5, 8.5, "blossom"], [-26, 11, "round"], [-36, 11, "pine"], [-18, 11.2, "round"],
  ] as const) {
    b.tree(x, z, 1.1, kind);
  }
  for (const [x, z] of [[-30, -3.5], [-16.5, -3], [-33, 0]]) b.flowers(x, z, 7, 1.0);
  b.bush(-29.5, -11);
  b.bush(-14, -12.5);
  b.rock(-31, -9.5, 1.2);
  b.rock(-17.6, -9.8, 0.8);

  // --- South Lane: houses and the Town Hall ---
  const southHomes = [
    { x: -25, wall: "#fff0f6", roof: "#c2255c", door: "#2b8a3e" },
    { x: -13, wall: "#fff4e6", roof: "#d9480f", door: "#1864ab" },
    { x: 13, wall: "#ebfbee", roof: "#5c940d", door: "#c92a2a" },
    { x: 25, wall: "#f3f0ff", roof: "#7048e8", door: "#f08c00" },
  ];
  for (const h of southHomes) {
    b.house(h.x, -23.5, 0, { ...h, width: 4.8, depth: 4.4 });
    b.path(h.x, -17.4, h.x, -20.8, 1.5);
    b.flowers(h.x - 2.4, -19.6, 5, 0.8);
    b.bush(h.x + 2.8, -19.4);
    b.tree(h.x + (random() < 0.5 ? -4 : 4), -29, 1.1, random() < 0.5 ? "round" : "pine");
  }
  b.house(0, -26, 0, { wall: "#f8f9fa", roof: "#4263eb", door: "#1c3d8f", width: 8, depth: 6.4, height: 4.4 });
  sign(scene, "🏛️ Town Hall", 0, -22.72, 0, 3.4, 0.85, 3.3, "#4263eb");
  for (const sx of [-1, 1]) {
    b.planter(sx * 3.2, -20.3, 0);
    b.tree(sx * 6.3, -21, 1.0, "round");
  }
  // South-east and south-west gardens.
  for (const [x, z, kind] of [
    [12, -11.5, "round"], [21, -12, "pine"], [30, -12, "round"], [-6, -11, "blossom"],
    [6.5, -11.5, "round"], [-9, 11.5, "round"],
  ] as const) {
    b.tree(x, z, 1.0, kind);
  }
  for (const [x, z] of [[-6, -6.2], [6, -12.6], [26, -12.5], [9, 12]]) b.flowers(x, z, 6, 1.0);
  b.bush(17, -12.6);
  b.bush(34, -12.6);

  // --- Trees, bushes and hills all around the edge ---
  const edgeTree = (x: number, z: number) => {
    const r = random();
    b.tree(x, z, 1.1 + random() * 0.5, r < 0.45 ? "pine" : r < 0.85 ? "round" : "blossom");
  };
  for (let x = -40; x <= 40; x += 4 + random() * 1.5) {
    edgeTree(x, 33 + random() * 1.5);
    edgeTree(x + 2, -31.5 - random() * 1.5);
  }
  for (let z = -28; z <= 30; z += 4 + random() * 1.5) {
    if (Math.abs(z) > 3.5) {
      edgeTree(-39.5 - random(), z);
      edgeTree(39.5 + random(), z);
    }
  }
  // The streets end at the edge in a bush, so nobody walks off the map.
  for (const sz of [-1.3, 1.3]) {
    b.bush(-40.3, sz);
    b.bush(40.3, sz);
  }
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const d = 62 + random() * 18;
    const greens = ["#7cc95a", "#6dbf4e", "#8fd469", "#62b548"];
    b.hill(Math.cos(a) * d, Math.sin(a) * d, 14 + random() * 10, 6 + random() * 8, greens[i % greens.length]);
  }

  batch.build("town");

  const ambient = createAmbient(scene, { x: -24, z: -7.5, rx: 5.2, rz: 3.3 }, { x: 0, z: 0 }, [
    { x: -30, z: -3.5 }, { x: 21, z: 12.8 }, { x: -21, z: 12.8 }, { x: -6, z: -6.2 }, { x: 9, z: 12 },
  ]);

  return {
    nav,
    spawn: { x: 0, z: -6.5 },
    hangouts: [
      { x: 0, z: 6 }, { x: -6, z: -5 }, { x: 6, z: -6 }, { x: -24, z: -1.8 }, { x: -18, z: 4 },
      { x: 20, z: 1 }, { x: 30, z: -1 }, { x: -13, z: 16 }, { x: 13, z: 16 }, { x: 0, z: -18 },
    ],
    shopFronts,
    update: (dt) => ambient.update(dt),
  };
}

/** The grass: a big ground with gently varying shades of green. */
function createGround(scene: Scene, random: () => number): void {
  const ground = CreateGround("ground", { width: 320, height: 320, subdivisions: 48 }, scene);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  const light = Color3.FromHexString(COLORS.grass);
  const dark = Color3.FromHexString(COLORS.grassDark);
  const offset = random() * 100;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    // Overlapping waves make soft, natural-looking patches.
    const n = 0.5 + 0.25 * Math.sin(x * 0.11 + offset) * Math.cos(z * 0.13) + 0.25 * Math.sin((x + z) * 0.05 + offset);
    const c = Color3.Lerp(dark, light, n);
    colors.push(c.r, c.g, c.b, 1);
  }
  ground.setVerticesData(VertexBuffer.ColorKind, colors);
  const mat = createVertexColorMaterial(scene, "ground", 0);
  ground.material = mat;
  ground.isPickable = false;
  ground.freezeWorldMatrix();
}

/** A wooden sign board with text (and an emoji) on it. */
function sign(scene: Scene, text: string, x: number, z: number, rotY: number, width: number, height: number, y: number, color: string): void {
  const texW = 1024;
  const texH = Math.round((texW * height) / width);
  const tex = new DynamicTexture(`sign-${text}`, { width: texW, height: texH }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const r = texH * 0.22;
  ctx.fillStyle = "#7a4a26";
  ctx.fillRect(0, 0, texW, texH);
  ctx.fillStyle = "#fff8e7";
  roundRect(ctx, texH * 0.08, texH * 0.08, texW - texH * 0.16, texH * 0.84, r);
  ctx.fill();
  ctx.fillStyle = color;
  let fontSize = Math.round(texH * 0.52);
  ctx.font = `800 ${fontSize}px "Trebuchet MS", system-ui, sans-serif`;
  while (ctx.measureText(text).width > texW * 0.88 && fontSize > 10) {
    fontSize -= 4;
    ctx.font = `800 ${fontSize}px "Trebuchet MS", system-ui, sans-serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, texW / 2, texH * 0.54);
  tex.update(true);
  tex.anisotropicFilteringLevel = 4;

  const mat = new StandardMaterial(`signMat-${text}`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveColor = new Color3(0.45, 0.45, 0.45);
  mat.specularColor = Color3.Black();

  // The board's back and edges, then the printed face on the front.
  const back = box(scene, "#7a4a26", [width + 0.1, height + 0.1, 0.16], { at: [x, y, z], rot: [0, rotY, 0] });
  back.material = createVertexColorMaterial(scene, "signBack");
  back.freezeWorldMatrix();
  for (const side of [1, -1]) {
    const face = CreatePlane("signFace", { width, height }, scene);
    face.material = mat;
    // A plane faces -Z, so turn it around to face the sign's front (+Z), or keep it for the back.
    const turn = side === 1 ? Math.PI : 0;
    face.rotation.y = rotY + turn;
    face.position.set(x + Math.sin(rotY) * 0.09 * side, y, z + Math.cos(rotY) * 0.09 * side);
    face.isPickable = false;
    face.freezeWorldMatrix();
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

