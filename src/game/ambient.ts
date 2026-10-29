import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { ball, blob, box, cylinder, createVertexColorMaterial } from "./meshKit";

/*
 * Little moving details that make the town feel alive:
 * ducks paddling on the pond, the fountain splashing, butterflies fluttering.
 * Each is one small mesh, so they cost very little.
 */

export interface Ambient {
  update(dt: number): void;
}

export function createAmbient(scene: Scene, pond: { x: number; z: number; rx: number; rz: number }, fountain: { x: number; z: number }, flowerSpots: { x: number; z: number }[]): Ambient {
  const mat = createVertexColorMaterial(scene, "ambient", 0.1);
  let time = 0;

  // --- Ducks ---
  const makeDuck = (body: string): Mesh => {
    const parts = [
      ball(scene, body, 0.7, { at: [0, 0.2, 0], scale: [0.9, 0.7, 1.25] }, 6),
      ball(scene, body, 0.42, { at: [0, 0.55, 0.3] }, 6),
      ball(scene, "#ff9f1c", 0.2, { at: [0, 0.52, 0.52], scale: [1.1, 0.5, 1.3] }, 4),
      ball(scene, "#222222", 0.07, { at: [-0.13, 0.62, 0.43] }, 3),
      ball(scene, "#222222", 0.07, { at: [0.13, 0.62, 0.43] }, 3),
      ball(scene, body, 0.3, { at: [0, 0.32, -0.42], scale: [0.6, 0.8, 1] }, 4),
    ];
    const duck = Mesh.MergeMeshes(parts, true, true)!;
    duck.material = mat;
    duck.isPickable = false;
    return duck;
  };
  const ducks = [
    { mesh: makeDuck("#ffe066"), speed: 0.25, offset: 0, size: 1 },
    { mesh: makeDuck("#ffffff"), speed: 0.18, offset: 2.5, size: 1.15 },
    { mesh: makeDuck("#ffe066"), speed: 0.25, offset: -0.35, size: 0.7 }, // a duckling following its mum
  ];
  for (const d of ducks) d.mesh.scaling.setAll(d.size);

  // --- Fountain water: a bubbling top and a gently pulsing splash ring ---
  const waterMat = new StandardMaterial("fountainWater", scene);
  waterMat.diffuseColor = Color3.FromHexString("#8fdcff");
  waterMat.emissiveColor = new Color3(0.25, 0.35, 0.45);
  waterMat.specularColor = new Color3(0.6, 0.6, 0.6);
  waterMat.alpha = 0.8;
  const spout = Mesh.MergeMeshes(
    [
      cylinder(scene, "#ffffff", { height: 1.0, top: 0.18, bottom: 0.3, sides: 8 }, { at: [0, 0.5, 0] }, false),
      blob(scene, "#ffffff", 0.35, { at: [0, 1.0, 0] }),
    ],
    true,
    true,
  )!;
  spout.material = waterMat;
  spout.position.set(fountain.x, 3.2, fountain.z);
  spout.isPickable = false;
  const splash = cylinder(scene, "#ffffff", { height: 0.06, top: 2.2, bottom: 2.4, sides: 16 }, { at: [0, 0, 0] }, false);
  splash.material = waterMat;
  splash.position.set(fountain.x, 2.44, fountain.z);

  // --- Butterflies: two wings that flap ---
  const butterflies = flowerSpots.map((spot, i) => {
    const color = ["#ff8cc6", "#ffd43b", "#74c0fc", "#b197fc"][i % 4];
    const wings = Mesh.MergeMeshes(
      [
        box(scene, color, [0.32, 0.02, 0.26], { at: [-0.17, 0, 0], rot: [0, 0, 0] }, false),
        box(scene, color, [0.32, 0.02, 0.26], { at: [0.17, 0, 0] }, false),
        box(scene, "#3b2f2f", [0.05, 0.05, 0.3], { at: [0, 0, 0] }, false),
      ],
      true,
      true,
    )!;
    wings.material = mat;
    wings.isPickable = false;
    return { mesh: wings, spot, phase: i * 1.7 };
  });

  return {
    update(dt: number) {
      time += dt;
      for (const d of ducks) {
        const a = time * d.speed + d.offset;
        const x = pond.x + Math.cos(a) * pond.rx * 0.55;
        const z = pond.z + Math.sin(a) * pond.rz * 0.5;
        d.mesh.position.set(x, 0.02 + Math.sin(time * 2 + d.offset) * 0.03, z);
        // Face the way it's swimming (along the circle).
        d.mesh.rotation.y = Math.atan2(-Math.sin(a) * pond.rx, Math.cos(a) * pond.rz);
        d.mesh.rotation.z = Math.sin(time * 1.5 + d.offset) * 0.06;
      }

      spout.scaling.y = 1 + Math.sin(time * 6) * 0.12;
      spout.rotation.y += dt * 0.8;
      const s = 1 + Math.sin(time * 3) * 0.04;
      splash.scaling.set(s, 1, s);

      for (const b of butterflies) {
        const t = time * 0.6 + b.phase;
        b.mesh.position.set(
          b.spot.x + Math.sin(t) * 1.6,
          1.0 + Math.sin(t * 2.3) * 0.35,
          b.spot.z + Math.sin(t * 0.7) * 1.6,
        );
        b.mesh.rotation.y = Math.atan2(Math.cos(t) * 1.6, Math.cos(t * 0.7) * 0.7 * 1.6);
        // Flap: squash the wings' width quickly.
        b.mesh.scaling.x = 0.25 + Math.abs(Math.sin(time * 14 + b.phase)) * 0.75;
      }
    },
  };
}
