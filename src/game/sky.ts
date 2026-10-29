import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { blob, createVertexColorMaterial } from "./meshKit";

const SKY_TOP = Color3.FromHexString("#3d9be9");
const SKY_MIDDLE = Color3.FromHexString("#8cc8f5");
const SKY_HORIZON = Color3.FromHexString("#fbe9cf"); // a warm, sunny glow near the ground

/** Where the sunlight comes from (pointing from the sun towards the ground). */
export const SUN_DIRECTION = new Vector3(0.5, -0.85, 0.55).normalize();

export interface Sky {
  sun: DirectionalLight;
  update(dt: number): void;
}

/** Lights, fog, a gradient sky with a warm sun, and slowly drifting clouds. */
export function createSky(scene: Scene, random: () => number): Sky {
  scene.clearColor = Color4.FromColor3(SKY_HORIZON);
  scene.ambientColor = new Color3(0.25, 0.25, 0.25);

  // Soft light from the whole sky, warm bounce light from the ground.
  const sky = new HemisphericLight("skyLight", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.58;
  sky.diffuse = Color3.FromHexString("#dceeff");
  sky.groundColor = Color3.FromHexString("#8a7d5c");
  sky.specular = Color3.Black();

  // The warm sun. It comes from the south-west so the fronts of the houses on Home Lane are lit.
  const sun = new DirectionalLight("sun", SUN_DIRECTION, scene);
  sun.intensity = 0.88;
  sun.diffuse = Color3.FromHexString("#fff1d6");
  sun.specular = Color3.FromHexString("#fff1d6");
  sun.position = SUN_DIRECTION.scale(-60);

  // Fog fades the far edges of the world into the warm horizon.
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = Color3.Lerp(SKY_HORIZON, SKY_MIDDLE, 0.25);
  scene.fogStart = 60;
  scene.fogEnd = 150;

  // Sky dome: a big inside-out sphere, deep blue at the top fading to a warm horizon.
  const dome = CreateSphere("skyDome", { diameter: 400, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
  const positions = dome.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const t = Math.max(0, Math.min(1, positions[i + 1] / 150));
    const c = t < 0.25 ? Color3.Lerp(SKY_HORIZON, SKY_MIDDLE, t / 0.25) : Color3.Lerp(SKY_MIDDLE, SKY_TOP, Math.pow((t - 0.25) / 0.75, 0.8));
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

  // The sun itself: a glowing disc in the sky (bloom makes it shine on High quality).
  const sunTex = new DynamicTexture("sunTex", { width: 128, height: 128 }, scene, false);
  const ctx = sunTex.getContext() as unknown as CanvasRenderingContext2D;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,240,1)");
  grad.addColorStop(0.22, "rgba(255,250,220,1)");
  grad.addColorStop(0.3, "rgba(255,236,170,0.55)");
  grad.addColorStop(1, "rgba(255,220,150,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  sunTex.update();
  sunTex.hasAlpha = true;
  const sunMat = new StandardMaterial("sunMat", scene);
  sunMat.diffuseTexture = sunTex;
  sunMat.useAlphaFromDiffuseTexture = true;
  sunMat.disableLighting = true;
  sunMat.emissiveColor = new Color3(1.3, 1.25, 1.1);
  sunMat.fogEnabled = false;
  const sunDisc = CreatePlane("sunDisc", { size: 50 }, scene);
  sunDisc.material = sunMat;
  sunDisc.position = SUN_DIRECTION.scale(-180);
  sunDisc.billboardMode = Mesh.BILLBOARDMODE_ALL;
  sunDisc.infiniteDistance = true;
  sunDisc.isPickable = false;

  // Clouds: puffy blobs merged into one mesh that slowly turns around the town.
  const cloudMat = createVertexColorMaterial(scene, "clouds");
  cloudMat.emissiveColor = new Color3(0.5, 0.48, 0.46);
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
        blob(scene, k % 2 ? "#ffffff" : "#fff4ea", r, {
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
    sun,
    update(dt: number) {
      clouds.rotation.y += dt * 0.006;
    },
  };
}
