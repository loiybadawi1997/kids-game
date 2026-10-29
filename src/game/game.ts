import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Plane } from "@babylonjs/core/Maths/math.plane";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
// Needed for scene.createPickingRay() (Babylon only includes features we import).
import "@babylonjs/core/Culling/ray";
import { Character, CharacterLook, presetLook } from "./character";
import { BlobShadows, TapMarker } from "./effects";
import { Sky, createSky } from "./sky";
import { ShopInfo, TownInfo, buildTown } from "./town";
import { Townsperson, createTownsfolk } from "./townsfolk";
import { Walker } from "./walker";
import { makeRandom } from "./props";
import { Graphics, QualitySetting, guessQuality } from "./graphics";
import { SpeechBubbles } from "../ui/speechBubbles";

/** Used before a child has picked a profile (and for the start screen backdrop). */
export const DEFAULT_LOOK: CharacterLook = presetLook("mecha");

/** The shop the children run (Market Street, first shop on the north side). */
export const PLAYER_SHOP_KIND = "fruit";

/**
 * The 3D town: builds the world, then each frame moves the player,
 * the townsfolk and the camera.
 */
export class Game {
  readonly scene: Scene;
  readonly graphics: Graphics;
  readonly town: TownInfo;
  /** When false, taps on the 3D world are ignored (a menu is open). */
  inputEnabled = true;
  /** When true the camera slowly circles the town (behind the start screen). */
  attract = false;
  /** Called when the player is standing at their shop's counter (or walks away: null). */
  onShopNearby: ((shop: ShopInfo | null) => void) | null = null;

  private camera: ArcRotateCamera;
  player: Character;
  private playerWalker: Walker;
  private people: Townsperson[];
  private blobs: BlobShadows;
  private marker: TapMarker;
  private bubbles: SpeechBubbles;
  private sky: Sky;
  private onFirstTap: (() => void) | null = null;
  private playerShop: ShopInfo;
  private nearShop = false;

  constructor(
    private engine: Engine,
    private canvas: HTMLCanvasElement,
    qualitySetting: QualitySetting,
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
    this.town = town;
    this.playerShop = town.shops.find((s) => s.kind === PLAYER_SHOP_KIND)!;

    // --- The player ---
    this.player = new Character(scene, DEFAULT_LOOK, "player");
    this.player.root.position.set(town.spawn.x, 0, town.spawn.z);
    this.playerWalker = new Walker(this.player, town.nav, 4.6);
    this.playerWalker.heading = Math.PI; // face the camera at the start
    this.player.root.rotation.y = Math.PI;

    // --- Townsfolk (shopkeepers stand at the shops the children don't run) ---
    const keeperSpots = town.shops.filter((s) => s.kind === "bakery" || s.kind === "toys").map((s) => ({ x: s.keeper.x, z: s.keeper.z, rotY: s.rotY }));
    this.people = createTownsfolk(scene, town.nav, random, town.hangouts, keeperSpots);

    // --- Effects ---
    this.blobs = new BlobShadows(scene);
    this.blobs.add(this.player);
    for (const p of this.people) this.blobs.add(p.character);
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

    // --- Graphics quality (shadows, patterns, bloom...) ---
    this.graphics = new Graphics(engine, scene, cam, this.sky.sun, town.solidMeshes, [town.ground], town.patternMaterials, qualitySetting);
    this.graphics.addCaster(...this.characterMeshes(this.player));
    for (const p of this.people) {
      const meshes = this.characterMeshes(p.character);
      this.graphics.addCaster(...meshes);
      // Townsfolk far from the camera are hidden (they'd be tiny dots in the fog anyway).
      for (const m of meshes) (m as Mesh).addLODLevel(45, null);
    }
    this.graphics.whenChanged((q) => this.blobs.setVisible(q === "low"));
    this.graphics.apply(qualitySetting === "auto" ? guessQuality(engine) : qualitySetting);

    // --- Tapping ---
    scene.onPointerObservable.add((info) => {
      if (info.type === PointerEventTypes.POINTERTAP && this.inputEnabled) this.handleTap(scene.pointerX, scene.pointerY);
    });
  }

  private characterMeshes(c: Character) {
    const meshes = c.meshes();
    for (const m of meshes) m.receiveShadows = true;
    return meshes;
  }

  /** Called once, the first time the child taps (used to hide the hint). */
  setOnFirstTap(fn: () => void): void {
    this.onFirstTap = fn;
  }

  /** Swap the player character for a child's own avatar and put them outside their house. */
  setPlayer(look: CharacterLook, homeIndex: number | null): void {
    const old = this.player;
    const pos = homeIndex !== null ? this.town.homes[homeIndex].door : old.position.clone();
    this.player = new Character(this.scene, look, "player");
    this.player.root.position.set(pos.x, 0, pos.z);
    this.player.root.rotation.y = Math.PI;
    this.playerWalker = new Walker(this.player, this.town.nav, 4.6);
    this.playerWalker.heading = Math.PI;
    this.blobs.replace(old, this.player);
    old.dispose();
    this.graphics.addCaster(...this.characterMeshes(this.player));
    this.camera.target.set(pos.x, 1, pos.z);
    this.nearShop = false;
  }

  /** Walk the player back to a Home Lane house. */
  goHome(homeIndex: number): void {
    const door = this.town.homes[homeIndex].door;
    if (this.playerWalker.goTo(door.clone(), () => this.playerWalker.face(door.add(new Vector3(0, 0, -1))))) this.marker.show(door);
  }

  /** Walk the player to their shop counter. */
  goToShop(): void {
    this.marker.show(this.playerShop.keeper);
    this.playerWalker.goTo(this.playerShop.keeper.clone(), () => this.playerWalker.face(this.playerShop.keeper.add(new Vector3(Math.sin(this.playerShop.rotY), 0, Math.cos(this.playerShop.rotY)))));
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

  /** Make the player wave (used when a menu wants a happy moment). */
  cheer(): void {
    this.player.wave();
  }

  /** Converts a 3D point to CSS pixels on the screen (or null if behind the camera). */
  toScreen(point: Vector3): { x: number; y: number } | null {
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
    for (const p of this.people) p.update(dt, this.town.nav);
    this.blobs.update();
    this.marker.update(dt);
    this.sky.update(dt);
    this.town.update(dt);

    if (this.attract) this.camera.alpha += dt * 0.06;

    // Camera glides after the player.
    const target = this.camera.target;
    const goal = this.player.position.add(new Vector3(0, 1.0, 0));
    target.addInPlace(goal.subtract(target).scale(Math.min(1, dt * 5)));

    // Is the player standing at their shop?
    const near = Vector3.Distance(this.player.position, this.playerShop.keeper) < 2.6 && !this.playerWalker.isWalking;
    if (near !== this.nearShop) {
      this.nearShop = near;
      this.onShopNearby?.(near ? this.playerShop : null);
    }

    this.bubbles.update();
  }
}
