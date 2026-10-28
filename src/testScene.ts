import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

/**
 * A simple test scene: grass, a little house, some trees and rocks,
 * and a camera you can turn with one finger and zoom with two.
 * It is only here to check that 3D runs smoothly on phones.
 */
export function createTestScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.53, 0.81, 0.92, 1); // sky blue

  // Small speed-ups: we don't need mouse-hover picking or these features.
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;
  scene.autoClearDepthAndStencil = true;

  // --- Camera: drag to rotate, pinch to zoom. Limits keep kids from getting lost. ---
  const camera = new ArcRotateCamera("camera", -Math.PI / 2.5, Math.PI / 3, 22, new Vector3(0, 1, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 35;
  camera.lowerBetaLimit = 0.3; // not straight down
  camera.upperBetaLimit = Math.PI / 2.2; // never below the ground
  camera.angularSensibilityX = 1500; // lower = faster rotation
  camera.angularSensibilityY = 1500;
  camera.pinchPrecision = 40;
  camera.panningSensibility = 0; // no two-finger panning, it's confusing for kids
  camera.inertia = 0.85;

  // --- Lights: one soft sky light plus a sun. No shadows yet (they cost a lot on phones). ---
  const sky = new HemisphericLight("sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.75;
  sky.groundColor = new Color3(0.45, 0.5, 0.4);
  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.3), scene);
  sun.intensity = 0.6;

  // One material per colour, shared by all meshes that use it.
  const materials = new Map<string, StandardMaterial>();
  const mat = (hex: string): StandardMaterial => {
    let m = materials.get(hex);
    if (!m) {
      m = new StandardMaterial(hex, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = Color3.Black(); // matte cartoon look
      materials.set(hex, m);
    }
    return m;
  };

  const meshes: Mesh[] = [];
  // convertToFlatShadedMesh gives the faceted low-poly look.
  const add = (mesh: Mesh, colour: string, flat = true): Mesh => {
    mesh.material = mat(colour);
    if (flat) mesh.convertToFlatShadedMesh();
    meshes.push(mesh);
    return mesh;
  };

  // --- Ground ---
  add(CreateGround("ground", { width: 40, height: 40 }, scene), "#6cc24a", false);

  // --- A little house ---
  const walls = add(CreateBox("walls", { width: 4, height: 3, depth: 4 }, scene), "#ffd166");
  walls.position.y = 1.5;
  // A 3-sided cylinder is a triangular prism; tipping it on its side makes a roof.
  const roof = add(CreateCylinder("roof", { height: 4.4, diameter: 5.2, tessellation: 3 }, scene), "#e8504a");
  roof.rotation.z = Math.PI / 2;
  roof.position.y = 4.3;
  const door = add(CreateBox("door", { width: 1, height: 1.8, depth: 0.1 }, scene), "#8a5a2b");
  door.position.set(0, 0.9, -2.03);

  // --- Low-poly trees: a brown trunk and a green cone ---
  const treeSpots = [
    [-7, -4], [-9, 3], [7, -5], [8, 4], [-3, 8], [4, 9], [-12, -9], [12, -10],
  ];
  for (const [x, z] of treeSpots) {
    const trunk = add(CreateCylinder("trunk", { height: 1.2, diameter: 0.5, tessellation: 6 }, scene), "#8a5a2b");
    trunk.position.set(x, 0.6, z);
    const leaves = add(
      CreateCylinder("leaves", { height: 3, diameterTop: 0, diameterBottom: 2.4, tessellation: 6 }, scene),
      "#2e9e4f",
    );
    leaves.position.set(x, 2.7, z);
  }

  // --- Rocks and a ball ---
  const rockSpots = [[-4, -7], [5, -2], [-10, 0], [10, 1]];
  for (const [x, z] of rockSpots) {
    const rock = add(CreateSphere("rock", { diameter: 1.2, segments: 2 }, scene), "#9aa5b1");
    rock.position.set(x, 0.4, z);
    rock.scaling.y = 0.7;
  }
  const ball = add(CreateSphere("ball", { diameter: 1, segments: 3 }, scene), "#3a86ff");
  ball.position.set(3, 0.5, -4);

  // A spinning box so you can see the frame rate is smooth.
  const spinner = add(CreateBox("spinner", { size: 1.2 }, scene), "#ff8fab");
  spinner.position.set(-3, 1.6, -4);

  // Freeze everything that never moves: Babylon then skips recalculating it each frame.
  for (const m of meshes) {
    if (m !== spinner) m.freezeWorldMatrix();
    m.isPickable = false;
  }
  for (const m of materials.values()) m.freeze();

  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    spinner.rotation.y += dt;
    spinner.rotation.x += dt * 0.5;
  });

  return scene;
}
