import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Character, CharacterLook } from "../game/character";

/**
 * A small 3D view of one character standing on a round stage, slowly
 * turning. Drag to spin it. Used by the avatar creator.
 * It has its own little engine and canvas, created when opened and
 * thrown away when closed.
 */
export class AvatarPreview {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private character: Character | null = null;
  private spin = 0;
  private dragging = false;
  private lastX = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    // preserveDrawingBuffer lets us take a picture of the avatar for the profile card.
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: false }, true);
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
    const scene = new Scene(this.engine);
    this.scene = scene;
    scene.clearColor = new Color4(0, 0, 0, 0);

    this.camera = new ArcRotateCamera("previewCam", -Math.PI / 2, 1.38, 5.2, new Vector3(0, 0.95, 0), scene);
    this.camera.fov = 0.6;
    this.camera.minZ = 0.1;

    const sky = new HemisphericLight("h", new Vector3(0, 1, 0), scene);
    sky.intensity = 0.72;
    sky.groundColor = new Color3(0.55, 0.5, 0.45);
    const sun = new DirectionalLight("d", new Vector3(-0.4, -0.8, 0.6), scene);
    sun.intensity = 0.7;

    // A round stage to stand on.
    const stage = CreateCylinder("stage", { height: 0.2, diameter: 2.2, tessellation: 40 }, scene);
    stage.position.y = -0.1;
    const stageMat = new StandardMaterial("stageMat", scene);
    stageMat.diffuseColor = Color3.FromHexString("#ffe8a3");
    stageMat.specularColor = new Color3(0.1, 0.1, 0.1);
    stage.material = stageMat;
    const rim = CreateCylinder("rim", { height: 0.12, diameter: 2.4, tessellation: 40 }, scene);
    rim.position.y = -0.14;
    const rimMat = new StandardMaterial("rimMat", scene);
    rimMat.diffuseColor = Color3.FromHexString("#ffa94d");
    rimMat.specularColor = Color3.Black();
    rim.material = rimMat;

    // Drag to spin the character.
    canvas.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.dragging || !this.character) return;
      this.character.root.rotation.y -= (e.clientX - this.lastX) * 0.012;
      this.lastX = e.clientX;
      this.spin = 1.2; // pause the automatic turning for a moment
    });
    const stop = () => (this.dragging = false);
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);

    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      if (this.character) {
        if (this.spin > 0) this.spin -= dt;
        else if (!this.dragging) this.character.root.rotation.y += dt * 0.7;
        this.character.update(dt);
      }
      scene.render();
    });
    window.addEventListener("resize", this.onResize);
  }

  private onResize = () => this.engine.resize();

  /** Show a new look (rebuilds the character, keeping the way it faces). */
  show(look: CharacterLook): void {
    const angle = this.character ? this.character.root.rotation.y : Math.PI;
    this.character?.dispose();
    this.character = new Character(this.scene, look, "preview");
    this.character.root.rotation.y = angle;
  }

  /** A happy wave (when something is chosen). */
  wave(): void {
    this.character?.wave();
  }

  /** Take a square picture of the character's face and shoulders, as a small image. */
  portrait(): string {
    if (!this.character) return "";
    const c = this.character;
    const savedAngle = c.root.rotation.y;
    const cam = this.camera;
    const saved = { radius: cam.radius, beta: cam.beta, target: cam.target.clone() };
    c.root.rotation.y = Math.PI; // facing us
    cam.radius = 3.0;
    cam.beta = 1.42;
    cam.target = new Vector3(0, 1.32, 0);
    this.scene.render();
    const src = this.canvas;
    const out = document.createElement("canvas");
    out.width = out.height = 160;
    const ctx = out.getContext("2d")!;
    const size = Math.min(src.width, src.height);
    ctx.drawImage(src, (src.width - size) / 2, (src.height - size) / 2, size, size, 0, 0, 160, 160);
    c.root.rotation.y = savedAngle;
    cam.radius = saved.radius;
    cam.beta = saved.beta;
    cam.target = saved.target;
    try {
      return out.toDataURL("image/webp", 0.85);
    } catch {
      return out.toDataURL("image/png");
    }
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }
}
