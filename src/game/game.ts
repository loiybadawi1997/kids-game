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
import { TouchControls } from "../ui/joystick";

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
  /** The on-screen joystick and jump button. */
  readonly controls = new TouchControls();
  // Jumping
  private jumpHeight = 0;
  private jumpSpeed = 0;
  // Camera: the distance the child chose (pinch), and when they last turned it by hand.
  private wantedRadius = 9.5;
  private lastSetRadius = 9.5;
  private wantedBeta = 1.02;
  private lastSetBeta = 1.02;
  private lastManualTurn = -10;
  private clock = 0;
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

    // Heroes are built smooth and shiny unless the device is on Low quality.
    const startQuality = qualitySetting === "auto" ? guessQuality(engine) : qualitySetting;
    Character.detail = startQuality === "low" ? "simple" : "rich";

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
    const cam = new ArcRotateCamera("camera", -Math.PI / 2, 1.02, 9.5, this.player.position.add(new Vector3(0, 1.2, 0)), scene);
    cam.lowerRadiusLimit = 2.2; // the camera may come this close to dodge a building (pinch stops at 5)
    cam.upperRadiusLimit = 18;
    cam.lowerBetaLimit = 0.6;
    cam.upperBetaLimit = 1.3;
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
    this.track(this.player, false);
    for (const p of this.people) this.track(p.character, true);
    this.graphics.whenChanged((q) => {
      this.blobs.setVisible(q === "low");
      // Rebuild every hero smooth (Medium/High) or simple (Low).
      Character.detail = q === "low" ? "simple" : "rich";
      this.player.setDetail(Character.detail);
      for (const p of this.people) p.character.setDetail(Character.detail);
    });
    this.graphics.apply(startQuality);

    this.controls.onJump = () => this.jump();

    // --- Tapping ---
    scene.onPointerObservable.add((info) => {
      if (info.type === PointerEventTypes.POINTERTAP && this.inputEnabled) this.handleTap(scene.pointerX, scene.pointerY);
    });
  }

  /** Give a hero shadows (and, for townsfolk, hide them when far away), now and whenever it is rebuilt. */
  private track(c: Character, townsperson: boolean): void {
    const setup = (m: Mesh) => {
      m.receiveShadows = true;
      this.graphics.addCaster(m);
      // Townsfolk far from the camera are hidden (they'd be tiny dots in the fog anyway).
      if (townsperson) m.addLODLevel(45, null);
    };
    c.meshes().forEach(setup);
    c.onMeshChanged = setup;
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
    this.track(this.player, false);
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

  /** Jump (only from the ground). */
  jump(): void {
    if (!this.inputEnabled || this.jumpHeight > 0.01) return;
    this.jumpSpeed = 7;
  }

  /** Make the player wave (used when a menu wants a happy moment). */
  cheer(): void {
    this.player.wave();
  }

  /**
   * The camera glides after the hero and, while they move, swings round
   * behind them. If a building gets between the camera and the hero, the
   * camera moves in closer so the hero is never hidden.
   */
  private updateCamera(dt: number, moving: boolean): void {
    const cam = this.camera;
    if (this.attract) {
      cam.alpha += dt * 0.06;
    } else {
      if (Math.abs(cam.inertialAlphaOffset) > 1e-4 || Math.abs(cam.inertialBetaOffset) > 1e-4) this.lastManualTurn = this.clock;
      if (moving && this.clock - this.lastManualTurn > 1.2) {
        const h = this.playerWalker.heading;
        const behind = Math.atan2(-Math.cos(h), -Math.sin(h));
        let diff = behind - cam.alpha;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        cam.alpha += diff * Math.min(1, dt * 2.2);
      }
    }

    const target = cam.target;
    const goal = this.player.position.add(new Vector3(0, 1.2, 0));
    goal.y = 1.2 + this.jumpHeight * 0.5;
    target.addInPlace(goal.subtract(target).scale(Math.min(1, dt * 6)));

    // Pinching and dragging set the distance and height the child wants.
    if (Math.abs(cam.radius - this.lastSetRadius) > 0.05) this.wantedRadius = Math.max(5, Math.min(18, cam.radius));
    if (Math.abs(cam.beta - this.lastSetBeta) > 0.01) this.wantedBeta = cam.beta;
    // If a building is in the way, try looking from a bit higher, then from a bit to the side;
    // only move closer if nothing else gives a clear view.
    const want = Math.min(this.wantedRadius, 6.5);
    let best = { alpha: cam.alpha, beta: this.wantedBeta, clear: -1 };
    search: for (const turn of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4]) {
      for (const b of [this.wantedBeta, 0.86, 0.7]) {
        if (b > this.wantedBeta + 1e-3) continue;
        const clear = this.clearDistance(target, cam.alpha + turn, b, this.wantedRadius);
        if (clear > best.clear + 0.3) best = { alpha: cam.alpha + turn, beta: b, clear };
        if (clear >= want) break search;
      }
    }
    let turnBy = best.alpha - cam.alpha;
    turnBy = Math.atan2(Math.sin(turnBy), Math.cos(turnBy));
    cam.alpha += turnBy * Math.min(1, dt * 3);
    cam.beta += (best.beta - cam.beta) * Math.min(1, dt * 4);
    cam.radius += (best.clear - cam.radius) * Math.min(1, dt * (best.clear < cam.radius ? 8 : 3));
    this.lastSetRadius = cam.radius;
    this.lastSetBeta = cam.beta;
  }

  /** How far the camera can be from the target before a building blocks the view. */
  private clearDistance(target: Vector3, alpha: number, beta: number, radius: number): number {
    const dir = new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
    let best = radius;
    for (const b of this.town.buildings) {
      // Look at the camera line in the building's own frame (an axis-aligned box there).
      const cos = Math.cos(b.rotY);
      const sin = Math.sin(b.rotY);
      const ox = target.x - b.x;
      const oz = target.z - b.z;
      const lx = ox * cos - oz * sin;
      const lz = ox * sin + oz * cos;
      const dx = dir.x * cos - dir.z * sin;
      const dz = dir.x * sin + dir.z * cos;
      let t0 = 0;
      let t1 = radius;
      for (const [o, d, half] of [[lx, dx, b.width / 2], [lz, dz, b.depth / 2]]) {
        if (Math.abs(d) < 1e-6) {
          if (Math.abs(o) > half) t1 = -1;
          continue;
        }
        const a = (-half - o) / d;
        const c = (half - o) / d;
        t0 = Math.max(t0, Math.min(a, c));
        t1 = Math.min(t1, Math.max(a, c));
      }
      if (t1 < t0 || t1 <= 0) continue;
      // Only if the line is still below the roof where it enters the building.
      if (target.y + dir.y * t0 < b.height) best = Math.min(best, Math.max(2.2, t0 - 0.6));
    }
    return best;
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
    this.clock += dt;

    // Joystick: walk relative to where the camera is looking. Otherwise follow the tapped path.
    const stick = this.controls.vector;
    const stickAmount = this.inputEnabled ? Math.min(1, Math.hypot(stick.x, stick.y)) : 0;
    if (stickAmount > 0.01) {
      const forward = this.player.position.subtract(this.camera.position);
      forward.y = 0;
      forward.normalize();
      const right = new Vector3(forward.z, 0, -forward.x);
      const dir = forward.scale(stick.y).add(right.scale(stick.x)).normalize();
      this.playerWalker.drive(dir.x, dir.z, stickAmount, dt);
      if (this.onFirstTap) {
        this.onFirstTap();
        this.onFirstTap = null;
      }
    } else {
      this.playerWalker.update(dt);
    }

    // Jumping: up, then gravity brings the hero back down.
    if (this.jumpSpeed !== 0 || this.jumpHeight > 0) {
      this.jumpSpeed -= 20 * dt;
      this.jumpHeight = Math.max(0, this.jumpHeight + this.jumpSpeed * dt);
      if (this.jumpHeight === 0) this.jumpSpeed = 0;
    }
    this.player.root.position.y = this.jumpHeight;
    this.player.airborne += ((this.jumpHeight > 0.05 ? 1 : 0) - this.player.airborne) * Math.min(1, dt * 14);
    this.player.update(dt);
    for (const p of this.people) p.update(dt, this.town.nav);
    this.blobs.update();
    this.marker.update(dt);
    this.sky.update(dt);
    this.town.update(dt);

    this.updateCamera(dt, stickAmount > 0.01 || this.playerWalker.isWalking);

    // Is the player standing at their shop?
    const near = Vector3.Distance(this.player.position, this.playerShop.keeper) < 2.6 && !this.playerWalker.isWalking;
    if (near !== this.nearShop) {
      this.nearShop = near;
      this.onShopNearby?.(near ? this.playerShop : null);
    }

    this.bubbles.update();
  }
}
