import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { StaticBatch, box, createVertexColorMaterial } from "./meshKit";
import { NavGrid } from "./navGrid";
import { COLORS, HouseStyle, PropBuilder, ShopKind, ShopStyle, makeRandom } from "./props";
import { Pattern, encodePattern } from "./patterns";
import { SignAtlas } from "./signs";
import { createAmbient } from "./ambient";

export interface ShopInfo {
  kind: ShopKind;
  name: string;
  /** Where the shopkeeper stands, and which way they face. */
  keeper: Vector3;
  rotY: number;
}

export interface HomeInfo {
  /** Just outside the front door. */
  door: Vector3;
}

/** Everything the rest of the game needs to know about the town. */
export interface TownInfo {
  nav: NavGrid;
  /** Where the player starts. */
  spawn: { x: number; z: number };
  /** Spots where townsfolk like to hang out. */
  hangouts: { x: number; z: number }[];
  shops: ShopInfo[];
  /** The six Home Lane houses, one per child profile. */
  homes: HomeInfo[];
  /** Big merged meshes that cast and receive shadows. */
  solidMeshes: Mesh[];
  ground: Mesh;
  /** Materials that can show surface patterns (switched off on Low quality). */
  patternMaterials: StandardMaterial[];
  /** Write the children's names on their houses (null = empty house). */
  setHomeNames(names: (string | null)[]): void;
  update(dt: number): void;
}

/*
 * The town map, seen from above (north is +Z, east is +X):
 *
 *                     trees & hills
 *   [home][home][home]   |   [home][home][home]        z = 23
 *   ============ Home Lane =+======================    z = 16
 *     park  benches     (plaza)    benches
 *   ====== Main Street =(fountain)= Market Street [shops] ==  z = 0
 *     pond, slide        |             [shops]
 *   ============ South Lane =+=====================    z = -16
 *    [house] [house] [ TOWN HALL ] [house] [house]     z = -24
 */
export function buildTown(scene: Scene): TownInfo {
  const random = makeRandom(7);
  const nav = new NavGrid(-41, -34, 41, 35, 0.5);
  // No shine on the town: a matte, painted look (and no glare on the paths).
  const material = createVertexColorMaterial(scene, "town", 0);
  const batch = new StaticBatch(material, 28);
  const signs = new SignAtlas(scene);
  const b = new PropBuilder(scene, batch, nav, random, signs);

  const ground = createGround(scene, random);

  // --- Paths (remembered so grass tufts can avoid them) ---
  const paths: [number, number, number, number, number][] = [
    [-41, 0, 41, 0, 3.2], // Main Street / Market Street
    [0, -16, 0, 16, 3.2], // north-south
    [-37, 16, 37, 16, 3.0], // Home Lane
    [-31, -16, 31, -16, 3.0], // South Lane
    [0, -21.2, 0, -16, 2.6], // to the Town Hall
  ];
  for (const p of paths) b.path(...p);
  b.plaza(0, 0, 9.5);

  // --- Plaza: fountain, benches, planters, bins ---
  b.fountain(0, 0);
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const x = Math.cos(a) * 7.8;
    const z = Math.sin(a) * 7.8;
    b.bench(x, z, Math.atan2(-x, -z));
    b.planter(Math.cos(a) * 10.7, Math.sin(a) * 10.7, Math.atan2(-x, -z));
  }
  b.bin(-6.2, 6.6);
  b.bin(6.2, -6.6);
  for (const [x, z] of [[-4.6, 4.6], [4.6, 4.6], [-4.6, -4.6], [4.6, -4.6]]) b.flowers(x * 0.98, z * 0.98, 4, 0.5);

  // --- Lamps along the streets ---
  for (const x of [-34, -22, -13, 13, 21, 30, 39]) {
    b.lamp(x, 2.5);
    b.lamp(x + 4, -2.5);
  }
  for (const x of [-24, -12, 12, 24]) b.lamp(x, 18.1);
  for (const x of [-19, -7, 7, 19]) b.lamp(x, -13.9);

  // --- Home Lane: six different homes, one for each child ---
  const homeStyles: HouseStyle[] = [
    { wall: "#ffd6e7", roof: "#e64980", door: "#8f5cc2", roofStyle: "front", porch: true, shutters: "#ffffff", width: 5.6, chimney: null },
    { wall: "#cfe8ff", wallPattern: Pattern.Wood, roof: "#1c7ed6", roofPattern: Pattern.Shingles, door: "#f08c00", floors: 2, balcony: true, width: 5.2, chimney: -1 },
    { wall: "#ffe8a8", wallPattern: Pattern.Brick, roof: "#c2410c", door: "#2b8a3e", dormer: true, shutters: "#40c057", width: 6.0, chimney: 1 },
    { wall: "#d3f9d8", roof: "#2f9e44", door: "#e8590c", roofStyle: "front", floors: 2, shutters: "#ffffff", width: 5.2, chimney: null },
    { wall: "#e5dbff", wallPattern: Pattern.Wood, roof: "#7048e8", roofPattern: Pattern.Shingles, door: "#1971c2", porch: true, width: 6.0, chimney: -1 },
    { wall: "#ffd8c2", wallPattern: Pattern.Brick, roof: "#a61e4d", roofStyle: "front", door: "#1864ab", floors: 2, balcony: true, width: 5.2, chimney: null },
  ];
  const mailColors = ["#ff6b6b", "#4dabf7", "#51cf66", "#ffd43b", "#cc5de8", "#ff922b"];
  const homes: HomeInfo[] = [];
  const nameSlots: number[] = [];
  [-30, -18, -6, 6, 18, 30].forEach((x, i) => {
    const door = b.house(x, 23.6, Math.PI, homeStyles[i]);
    homes.push({ door });
    b.path(x, 17.5, x, 21.0, 1.5); // front path to the door
    b.fence(x - 4.3, 18.4, x - 4.3, 21.4);
    b.fence(x + 4.3, 18.4, x + 4.3, 21.4);
    b.hedge(x - 4.1, 18.2, x - 1.3, 18.2);
    b.hedge(x + 1.3, 18.2, x + 4.1, 18.2);
    b.flowers(x - 2.7, 19.6, 6, 0.8);
    b.flowers(x + 2.7, 19.9, 5, 0.6);
    b.mailbox(x + 1.6, 19.1, Math.PI, mailColors[i]);
    nameSlots.push(b.namePlate(x - 1.7, 19.1, Math.PI));
    b.tree(x + (i % 2 ? 3.5 : -3.5), 29.4, 1.1, i % 3 === 0 ? "blossom" : "round");
  });
  b.signPost("🏡 Home Lane", "#e64980", 0, 18.9, Math.PI, 2.6, 0.7, 2.0);

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

  // --- Market Street: six themed shops ---
  const shopStyles: ShopStyle[] = [
    { kind: "fruit", name: "🍎 Fruit Shop", wall: "#ffe8cc", trim: "#ffffff", stripeA: "#e03131", stripeB: "#ffffff", door: "#2b8a3e" },
    { kind: "bakery", name: "🥐 Bakery", wall: "#fff0d4", wallPattern: Pattern.Brick, trim: "#f8f0e3", stripeA: "#c2410c", stripeB: "#ffe8cc", door: "#7f5434" },
    { kind: "toys", name: "🧸 Toy Shop", wall: "#d0ebff", trim: "#ffffff", stripeA: "#1c7ed6", stripeB: "#ffd43b", door: "#e8590c" },
    { kind: "flowers", name: "🌸 Flowers", wall: "#ffdeeb", wallPattern: Pattern.Wood, trim: "#ffffff", stripeA: "#d6336c", stripeB: "#ffffff", door: "#37b24d" },
    { kind: "icecream", name: "🍦 Ice Cream", wall: "#e6fcf5", trim: "#ffffff", stripeA: "#f06595", stripeB: "#c3fae8", door: "#ae3ec9" },
    { kind: "books", name: "📚 Books", wall: "#f3f0ff", wallPattern: Pattern.Brick, trim: "#f8f9fa", stripeA: "#5f3dc4", stripeB: "#e5dbff", door: "#1864ab" },
  ];
  const shops: ShopInfo[] = [];
  [16.5, 25.5, 34.5].forEach((x, i) => {
    for (const side of [1, -1]) {
      const style = shopStyles[i * 2 + (side === 1 ? 0 : 1)];
      const rotY = side === 1 ? Math.PI : 0;
      const keeper = b.shop(x, side * 8.8, rotY, style);
      shops.push({ kind: style.kind, name: style.name, keeper, rotY });
    }
  });
  b.signPost("🛒 Market Street", "#e03131", 11, 0, -Math.PI / 2, 5.4, 1.1, 3.6);

  // --- The park (west) ---
  b.pond(-24, -7.5, 5.2, 3.3);
  b.slide(-21, 7.5, Math.PI / 2);
  b.swings(-30.5, 7.8, 0);
  b.bench(-24, -2.8, Math.PI);
  b.bench(-17, -6.5, -Math.PI / 2);
  b.bin(-26.6, -2.9);
  b.signPost("🌳 Park", "#2f9e44", -12.6, 3.2, Math.PI / 2, 2.3, 0.8, 2.3);
  for (const [x, z, kind] of [
    [-34, 4, "round"], [-35, -6, "pine"], [-33, -12.5, "round"], [-27, -12.8, "blossom"], [-19.5, -12, "round"],
    [-15.5, -10, "pine"], [-14.5, 8.5, "blossom"], [-26, 11, "round"], [-36, 11, "pine"], [-18, 11.2, "round"],
  ] as const) {
    b.tree(x, z, 1.1, kind);
  }
  for (const [x, z] of [[-30, -3.5], [-16.5, -3], [-33, 0.2]]) b.flowers(x, z, 7, 1.0);
  b.bush(-29.5, -11);
  b.bush(-14, -12.5);
  b.rock(-31, -9.5, 1.2);
  b.rock(-17.6, -9.8, 0.8);

  // --- South Lane: houses and the Town Hall ---
  const southStyles: (HouseStyle & { x: number })[] = [
    { x: -25, wall: "#f8f9fa", wallPattern: Pattern.Wood, roof: "#1864ab", roofPattern: Pattern.Shingles, door: "#c92a2a", floors: 2, width: 5.0, chimney: 1 },
    { x: -13, wall: "#ffc9a9", wallPattern: Pattern.Brick, roof: "#5c3d2e", door: "#1864ab", dormer: true, shutters: "#fff4e6", width: 5.6, chimney: -1 },
    { x: 13, wall: "#d0ebff", roof: "#d9480f", door: "#2b8a3e", roofStyle: "front", porch: true, width: 5.2, chimney: null },
    { x: 25, wall: "#fff3bf", wallPattern: Pattern.Wood, roof: "#2b8a3e", roofPattern: Pattern.Shingles, door: "#862e9c", shutters: "#ffffff", width: 5.6, chimney: -1 },
  ];
  for (const h of southStyles) {
    b.house(h.x, -23.6, 0, h);
    b.path(h.x, -17.5, h.x, -21.0, 1.5);
    b.flowers(h.x - 2.5, -19.6, 5, 0.8);
    b.mailbox(h.x + 1.6, -18.9, 0, "#4dabf7");
    b.bush(h.x + 3.2, -19.4);
    b.tree(h.x + (random() < 0.5 ? -4 : 4), -29.5, 1.1, random() < 0.5 ? "round" : "pine");
  }
  const hall = b.townHall(0, -27.4, 0);
  for (const sx of [-1, 1]) {
    b.lamp(sx * 2.0, -20.0);
    b.tree(sx * 7.6, -21.3, 1.0, "round");
  }

  // South-east and south-west gardens.
  for (const [x, z, kind] of [
    [12, -11.5, "round"], [21, -12.3, "pine"], [30, -12.3, "round"], [-6, -11, "blossom"],
    [6.5, -11.5, "round"], [-9, 11.5, "round"],
  ] as const) {
    b.tree(x, z, 1.0, kind);
  }
  for (const [x, z] of [[-6, -6.2], [6, -12.6], [26, -12.7], [9, 12]]) b.flowers(x, z, 6, 1.0);
  b.bush(17, -12.7);
  b.bush(34, -12.7);

  // --- Trees and bushes all around the edge ---
  const edgeTree = (x: number, z: number) => {
    const r = random();
    b.tree(x, z, 1.1 + random() * 0.5, r < 0.45 ? "pine" : r < 0.85 ? "round" : "blossom");
  };
  for (let x = -40; x <= 40; x += 4 + random() * 1.5) {
    edgeTree(x, 33.5 + random() * 1.2);
    edgeTree(x + 2, -32.5 - random() * 1.2);
  }
  for (let z = -28; z <= 30; z += 4 + random() * 1.5) {
    if (Math.abs(z) > 3.5 && Math.abs(z - 16) > 3 && Math.abs(z + 16) > 3) {
      edgeTree(-39.5 - random(), z);
      edgeTree(39.5 + random(), z);
    }
  }
  // The streets end at the edge in bushes, so nobody walks off the map.
  for (const sz of [-1.3, 1.3]) {
    b.bush(-40.3, sz);
    b.bush(40.3, sz);
  }
  for (const sz of [-1.2, 1.2]) {
    b.bush(-38, 16 + sz);
    b.bush(38, 16 + sz);
    b.bush(-32.5, -16 + sz);
    b.bush(32.5, -16 + sz);
  }

  // Grass tufts everywhere there's open grass.
  const onPath = (x: number, z: number) =>
    !nav.isWalkable(x, z) ||
    Math.hypot(x, z) < 10.5 ||
    paths.some(([x1, z1, x2, z2, w]) => {
      const minX = Math.min(x1, x2) - w / 2 - 0.4;
      const maxX = Math.max(x1, x2) + w / 2 + 0.4;
      const minZ = Math.min(z1, z2) - w / 2 - 0.4;
      const maxZ = Math.max(z1, z2) + w / 2 + 0.4;
      return x > minX && x < maxX && z > minZ && z < maxZ;
    });
  for (let gx = -36; gx <= 36; gx += 12) {
    for (let gz = -30; gz <= 30; gz += 12) b.grassTufts(gx, gz, 16, 6, onPath);
  }

  const solidMeshes = batch.build("town");

  // Hills in the distance: separate, and they don't need shadows.
  const sceneryBatch = new StaticBatch(material, 200, false);
  const hillBuilder = new PropBuilder(scene, sceneryBatch, nav, random, signs);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const d = 62 + random() * 18;
    const greens = ["#7cc95a", "#6dbf4e", "#8fd469", "#62b548"];
    hillBuilder.hill(Math.cos(a) * d, Math.sin(a) * d, 14 + random() * 10, 6 + random() * 8, greens[i % greens.length]);
  }
  sceneryBatch.build("hills");

  // Glowing lamp lanterns: one mesh with a bright, unlit material.
  const glow = Mesh.MergeMeshes(b.glowPieces, true, true)!;
  const glowMat = new StandardMaterial("lampGlow", scene);
  glowMat.disableLighting = true;
  glowMat.emissiveColor = Color3.FromHexString("#ffe9a8");
  glow.material = glowMat;
  glow.isPickable = false;
  glow.freezeWorldMatrix();

  signs.build();

  const ambient = createAmbient(scene, { x: -24, z: -7.5, rx: 5.2, rz: 3.3 }, { x: 0, z: 0 }, [
    { x: -30, z: -3.5 }, { x: 21, z: 12.8 }, { x: -21, z: 12.8 }, { x: -6, z: -6.2 }, { x: 9, z: 12 },
  ]);
  const clock = createClock(scene, material, hall.clock);
  const flag = createFlag(scene, hall.flag);
  let time = 0;

  return {
    nav,
    spawn: { x: 0, z: -6.5 },
    hangouts: [
      { x: 0, z: 6 }, { x: -6, z: -5 }, { x: 6, z: -6 }, { x: -24, z: -1.8 }, { x: -18, z: 4 },
      { x: 20, z: 1 }, { x: 30, z: -1 }, { x: -13, z: 16 }, { x: 13, z: 16 }, { x: 0, z: -18 },
    ],
    shops,
    homes,
    solidMeshes,
    ground,
    patternMaterials: [material, ground.material as StandardMaterial],
    setHomeNames(names) {
      names.forEach((name, i) => {
        if (i < nameSlots.length) signs.setText(nameSlots[i], name ? `🏠 ${name}` : "🏠 For a friend", name ? "#e8590c" : "#adb5bd");
      });
    },
    update(dt) {
      time += dt;
      ambient.update(dt);
      clock();
      flag.rotation.y = Math.sin(time * 1.3) * 0.25;
      flag.scaling.x = 1 + Math.sin(time * 4) * 0.06;
    },
  };
}

/** The grass: a big ground with gently varying shades of green. */
function createGround(scene: Scene, random: () => number): Mesh {
  const ground = CreateGround("ground", { width: 320, height: 320, subdivisions: 48 }, scene);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  const light = Color3.FromHexString(COLORS.grass);
  const dark = Color3.FromHexString(COLORS.grassDark);
  const offset = random() * 100;
  const a = encodePattern(Pattern.Grass);
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    // Overlapping waves make soft, natural-looking patches.
    const n = 0.5 + 0.25 * Math.sin(x * 0.11 + offset) * Math.cos(z * 0.13) + 0.25 * Math.sin((x + z) * 0.05 + offset);
    const c = Color3.Lerp(dark, light, n);
    colors.push(c.r, c.g, c.b, a);
  }
  ground.setVerticesData(VertexBuffer.ColorKind, colors);
  ground.hasVertexAlpha = false;
  ground.material = createVertexColorMaterial(scene, "ground", 0);
  ground.isPickable = false;
  ground.freezeWorldMatrix();
  return ground;
}

/** Clock hands on the Town Hall that show the real time. Returns an update function. */
function createClock(scene: Scene, material: StandardMaterial, face: TransformNode): () => void {
  const hour = new TransformNode("hourHand", scene);
  hour.parent = face;
  const minute = new TransformNode("minuteHand", scene);
  minute.parent = face;
  const hourMesh = box(scene, "#343a40", [0.1, 0.45, 0.05], { at: [0, 0.2, 0] }, false);
  const minuteMesh = box(scene, "#343a40", [0.07, 0.68, 0.05], { at: [0, 0.32, 0.02] }, false);
  hourMesh.parent = hour;
  minuteMesh.parent = minute;
  for (const m of [hourMesh, minuteMesh]) {
    m.material = material;
    m.isPickable = false;
  }
  return () => {
    const now = new Date();
    const minutes = now.getMinutes() + now.getSeconds() / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    // The clock faces the viewer, so turning around +Z goes clockwise for them.
    minute.rotation.z = (minutes / 60) * Math.PI * 2;
    hour.rotation.z = (hours / 12) * Math.PI * 2;
  };
}

/** A little flag on the Town Hall tower. */
function createFlag(scene: Scene, pole: TransformNode): TransformNode {
  const flag = new TransformNode("flag", scene);
  flag.parent = pole;
  const cloth = box(scene, "#ff6b6b", [1.0, 0.6, 0.04], { at: [0.5, 0, 0] }, false);
  const stripe = box(scene, "#ffd43b", [1.0, 0.16, 0.05], { at: [0.5, 0, 0] }, false);
  const mesh = Mesh.MergeMeshes([cloth, stripe], true, true)!;
  mesh.material = createVertexColorMaterial(scene, "flag", 0);
  mesh.parent = flag;
  mesh.isPickable = false;
  return flag;
}
