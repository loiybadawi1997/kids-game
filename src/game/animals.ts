import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Kit } from "./kit";
import { NavGrid } from "./navGrid";

/*
 * Pets and wild animals (Quaternius, CC0) that wander around town:
 * cats and dogs near the homes and plaza, deer and foxes by the trees,
 * frogs and crabs at the pond. They trot from spot to spot with a little
 * bounce. They don't do anything else — they just make the town feel alive.
 */

interface Animal {
  root: TransformNode;
  body: Mesh;
  home: Vector3;
  roam: number;
  speed: number;
  route: Vector3[];
  wait: number;
  phase: number;
  heading: number;
}

const KINDS: { model: string; height: number; speed: number; roam: number; spots: [number, number][] }[] = [
  { model: "n-cat", height: 0.55, speed: 1.6, roam: 8, spots: [[-24, 19.5], [6, 19.5], [-2, -18]] },
  { model: "n-pug", height: 0.5, speed: 1.8, roam: 9, spots: [[3, 7], [-13, 13]] },
  { model: "n-shiba", height: 0.65, speed: 2.0, roam: 10, spots: [[20, 2], [-18, 4]] },
  { model: "n-husky", height: 0.8, speed: 2.2, roam: 12, spots: [[0, -12]] },
  { model: "n-deer", height: 1.5, speed: 1.4, roam: 6, spots: [[34, -26], [-36, 26]] },
  { model: "n-fox", height: 0.6, speed: 2.0, roam: 7, spots: [[-36, -26], [36, 26]] },
  { model: "n-frog", height: 0.3, speed: 0.9, roam: 2.5, spots: [[-18.4, -9.5], [-29.6, -6.4]] },
  { model: "n-crab", height: 0.25, speed: 0.7, roam: 2, spots: [[-24, -3.6]] },
];

export function createAnimals(scene: Scene, kit: Kit, nav: NavGrid, random: () => number): { meshes: Mesh[]; update(dt: number): void } {
  const animals: Animal[] = [];
  const meshes: Mesh[] = [];
  for (const kind of KINDS) {
    if (!kit.has(kind.model)) continue;
    for (const [x, z] of kind.spots) {
      const start = nav.nearestWalkable(x, z) ?? new Vector3(x, 0, z);
      const root = new TransformNode(kind.model, scene);
      root.position.copyFrom(start);
      const body = kit.create(kind.model);
      const size = kit.size(kind.model);
      const s = kind.height / size.y;
      body.scaling.setAll(s);
      // Stand the model on the ground (its lowest point is below its origin).
      body.refreshBoundingInfo();
      body.position.y = -body.getBoundingInfo().boundingBox.minimum.y * s;
      body.parent = root;
      body.addLODLevel(45, null);
      meshes.push(body);
      animals.push({ root, body, home: start.clone(), roam: kind.roam, speed: kind.speed * (0.85 + random() * 0.3), route: [], wait: random() * 4, phase: random() * 10, heading: random() * 6 });
    }
  }

  return {
    meshes,
    update(dt: number) {
      for (const a of animals) {
        const p = a.root.position;
        let moving = false;
        if (a.route.length > 0) {
          const next = a.route[0];
          const dx = next.x - p.x;
          const dz = next.z - p.z;
          const dist = Math.hypot(dx, dz);
          const step = a.speed * dt;
          if (dist <= step) {
            p.x = next.x;
            p.z = next.z;
            a.route.shift();
          } else {
            p.x += (dx / dist) * step;
            p.z += (dz / dist) * step;
            a.heading = Math.atan2(dx, dz);
          }
          moving = true;
        } else {
          a.wait -= dt;
          if (a.wait <= 0) {
            a.wait = 2 + random() * 6;
            const target = nav.randomWalkable(random, a.home.x, a.home.z, a.roam);
            a.route = nav.findPath(p, target) ?? [];
          }
        }
        // Turn smoothly, and trot with a little bounce (or breathe gently when still).
        let diff = a.heading - a.root.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        a.root.rotation.y += diff * Math.min(1, dt * 8);
        a.phase += dt * (moving ? a.speed * 7 : 2);
        a.root.position.y = moving ? Math.abs(Math.sin(a.phase)) * 0.08 : 0;
        a.body.rotation.z = moving ? Math.sin(a.phase) * 0.08 : 0;
        a.body.rotation.x = moving ? 0 : Math.sin(a.phase) * 0.02;
      }
    },
  };
}
