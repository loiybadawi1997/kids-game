import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Plane } from "@babylonjs/core/Maths/math.plane";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
// Needed for scene.createPickingRay() (Babylon only includes features we import).
import "@babylonjs/core/Culling/ray";
import { Character, CharacterLook } from "./character";
import { BlobShadows, TapMarker } from "./effects";
import { createSky } from "./sky";
import { TownInfo, buildTown } from "./town";
import { Townsperson, createTownsfolk } from "./townsfolk";
import { Walker } from "./walker";
import { NavGrid } from "./navGrid";
import { makeRandom } from "./props";
import { SpeechBubbles } from "../ui/speechBubbles";

/** The look of the player until avatar creation arrives (Step 3). */
const PLAYER_LOOK: CharacterLook = {
  skin: "#e2a77e",
  hair: "spiky",
  hairColor: "#4a2c1a",
  eyeColor: "#5b3a29",
  outfit: "hoodie",
  top: "#ff6b6b",
  bottom: "#3b5bdb",
  shoes: "#ffffff",
  hat: "none",
  hatColor: "#ffd43b",
};

/**
 * The 3D town: builds the world, then each frame moves the player,
 * the townsfolk and the camera.
 */
export class Game {
  readonly scene: Scene;
  private camera: ArcRotateCamera;
  private player: Character;
  private playerWalker: Walker;
  private people: Townsperson[];
  private shadows: BlobShadows;
  private marker: TapMarker;
  private bubbles: SpeechBubbles;
  private sky: { update: (dt: number) => void };
  private onFirstTap: (() => void) | null = null;
  private nav: NavGrid;
  private town: TownInfo;

  constructor(
    private engine: Engine,
    private canvas: HTMLCanvasElement,
  ) {
    const scene = new Scene(engine);
    this.scene = scene;
    // Small speed-up: we work out taps ourselves, so Babylon doesn't need to test meshes under the finger.
    scene.skipPointerMovePicking = true;
    scene.skipPointerDownPicking = true;
    scene.skipPointerUpPicking = true;

    const random = makeRandom(42);
    this.sky = createSky(scene, random);
    const town = buildTown(scene);
    const nav = town.nav;
    this.nav = nav;
    this.town = town;

    // --- The player ---
    this.player = new Character(scene, PLAYER_LOOK, "player");
    this.player.root.position.set(town.spawn.x, 0, town.spawn.z);
    this.playerWalker = new Walker(this.player, nav, 4.6);
    this.playerWalker.heading = Math.PI; // face the camera at the start
    this.player.root.rotation.y = Math.PI;

    // --- Townsfolk ---
    this.people = createTownsfolk(scene, nav, random, town.hangouts, town.shopFronts);

    // --- Effects ---
    this.shadows = new BlobShadows(scene);
    this.shadows.add(this.player);
    for (const p of this.people) this.shadows.add(p.character);
    this.marker = new TapMarker(scene);
    this.bubbles = new SpeechBubbles(document.getElementById("bubbles")!, (p) => this.toScreen(p));

    // --- Camera: follows the player. Drag to turn it, pinch to zoom. ---
    const cam = new ArcRotateCamera("camera", -Math.PI / 2, 0.82, 14, this.player.position.add(new Vector3(0, 1, 0)), scene);
    cam.lowerRadiusLimit = 7;
    cam.upperRadiusLimit = 22;
    cam.lowerBetaLimit = 0.55;
    cam.upperBetaLimit = 1.0;
    cam.angularSensibilityX = 1400;
    cam.angularSensibilityY = 2600;
    cam.pinchPrecision = 30;
    cam.panningSensibility = 0;
    cam.inertia = 0.8;
    cam.minZ = 0.5;
    cam.maxZ = 450;
    cam.fov = 0.8;
    cam.attachControl(canvas, true);
    cam.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    cam.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    this.camera = cam;

    // --- Tapping ---
    scene.onPointerObservable.add((info) => {
      if (info.type === PointerEventTypes.POINTERTAP) this.handleTap(scene.pointerX, scene.pointerY);
    });

    // Freeze materials that never change, so Babylon skips re-checking them.
    for (const mat of scene.materials) {
      if (mat.name !== "tapMarkerMat") mat.freeze();
    }
  }

  /** Called once, the first time the child taps (used to hide the hint). */
  setOnFirstTap(fn: () => void): void {
    this.onFirstTap = fn;
  }

  private handleTap(x: number, y: number): void {
    if (this.onFirstTap) {
      this.onFirstTap();
      this.onFirstTap = null;
    }

    // Did they tap on a person? Use a generous screen-space distance so it's easy for small fingers.
    let closest: Townsperson | null = null;
    let closestDist = 70;
    for (const p of this.people) {
      const s = this.toScreen(p.character.position.add(new Vector3(0, 1.1, 0)));
      if (!s) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < closestDist) {
        closestDist = d;
        closest = p;
      }
    }
    if (closest) {
      const person = closest;
      this.marker.show(person.character.position);
      // Walk over, then both say hello.
      person.walker.stop();
      this.playerWalker.goTo(person.character.position.clone(), () => this.meet(person), 1.9);
      return;
    }

    // Otherwise walk to the spot on the ground they tapped.
    const ray = this.scene.createPickingRay(x, y, Matrix.Identity(), this.camera);
    const dist = ray.intersectsPlane(new Plane(0, 1, 0, 0));
    if (dist === null) return;
    const point = ray.origin.add(ray.direction.scale(dist));
    if (this.playerWalker.goTo(point)) this.marker.show(point);
  }

  private meet(person: Townsperson): void {
    person.greet(this.player.position);
    this.playerWalker.face(person.character.position);
    this.player.wave();
    this.bubbles.show(person.character, person.name, person.nextLine());
  }

  /** Converts a 3D point to CSS pixels on the screen (or null if behind the camera). */
  private toScreen(point: Vector3): { x: number; y: number } | null {
    const engine = this.engine;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const p = Vector3.Project(point, Matrix.Identity(), this.scene.getTransformMatrix(), this.camera.viewport.toGlobal(width, height));
    if (p.z < 0 || p.z > 1) return null;
    const scale = this.canvas.clientWidth / width;
    return { x: p.x * scale, y: p.y * scale };
  }

  update(): void {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
    this.playerWalker.update(dt);
    this.player.update(dt);
    for (const p of this.people) p.update(dt, this.nav);
    this.shadows.update();
    this.marker.update(dt);
    this.sky.update(dt);
    this.town.update(dt);

    // Camera glides after the player.
    const target = this.camera.target;
    const goal = this.player.position.add(new Vector3(0, 1.0, 0));
    target.addInPlace(goal.subtract(target).scale(Math.min(1, dt * 5)));

    this.bubbles.update();
  }
}
