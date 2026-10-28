import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { blob, createVertexColorMaterial } from "./meshKit";

const SKY_TOP = Color3.FromHexString("#5fb4f5");
const SKY_HORIZON = Color3.FromHexString("#d6f0ff");

/** Lights, fog, a gradient sky and slowly drifting clouds. */
export function createSky(scene: Scene, random: () => number): { update: (dt: number) => void } {
  scene.clearColor = Color4.FromColor3(SKY_HORIZON);
  scene.ambientColor = new Color3(0.25, 0.25, 0.25);

  // Soft light from the whole sky, warm bounce light from the ground.
  const sky = new HemisphericLight("skyLight", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.78;
  sky.diffuse = new Color3(1, 1, 1);
  sky.groundColor = new Color3(0.5, 0.48, 0.42);
  sky.specular = Color3.Black();

  // The sun, coming from the south-west so house fronts (facing south) are lit.
  const sun = new DirectionalLight("sun", new Vector3(0.45, -1, 0.65), scene);
  sun.intensity = 0.62;
  sun.diffuse = new Color3(1, 0.96, 0.88);

  // Fog fades the far edges of the world into the sky colour.
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = SKY_HORIZON;
  scene.fogStart = 55;
  scene.fogEnd = 140;

  // Sky dome: a big inside-out sphere, blue at the top fading to pale at the horizon.
  const dome = CreateSphere("skyDome", { diameter: 400, segments: 12, sideOrientation: Mesh.BACKSIDE }, scene);
  const positions = dome.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const t = Math.max(0, Math.min(1, positions[i + 1] / 120));
    const c = Color3.Lerp(SKY_HORIZON, SKY_TOP, Math.pow(t, 0.7));
    colors.push(c.r, c.g, c.b, 1);
  }
  dome.setVerticesData(VertexBuffer.ColorKind, colors);
  const domeMat = new StandardMaterial("skyMat", scene);
  domeMat.disableLighting = true;
  domeMat.emissiveColor = Color3.White();
  domeMat.fogEnabled = false;
  dome.material = domeMat;
  dome.infiniteDistance = true;
  dome.isPickable = false;

  // Clouds: puffy blobs merged into one mesh that slowly turns around the town.
  const cloudMat = createVertexColorMaterial(scene, "clouds");
  cloudMat.emissiveColor = new Color3(0.45, 0.45, 0.5);
  cloudMat.fogEnabled = false;
  const pieces: Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + random() * 0.3;
    const dist = 70 + random() * 50;
    const cx = Math.cos(angle) * dist;
    const cz = Math.sin(angle) * dist;
    const cy = 32 + random() * 18;
    const puffs = 4 + Math.floor(random() * 3);
    for (let k = 0; k < puffs; k++) {
      const r = 3 + random() * 3;
      pieces.push(
        blob(scene, k % 2 ? "#ffffff" : "#f1f6ff", r, {
          at: [cx + (k - puffs / 2) * 3.6, cy + random() * 2, cz + (random() - 0.5) * 4],
          scale: [1.3, 0.8, 1],
        }),
      );
    }
  }
  const clouds = Mesh.MergeMeshes(pieces, true, true)!;
  clouds.material = cloudMat;
  clouds.isPickable = false;

  return {
    update(dt: number) {
      clouds.rotation.y += dt * 0.006;
    },
  };
}
