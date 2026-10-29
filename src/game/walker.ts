import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Character } from "./character";
import { NavGrid } from "./navGrid";

/**
 * Walks a character along a route found by the NavGrid,
 * turning smoothly to face where it is going.
 */
export class Walker {
  private route: Vector3[] = [];
  private onArrive: (() => void) | null = null;
  /** Direction the character is facing, in radians. */
  heading = 0;

  constructor(
    readonly character: Character,
    private nav: NavGrid,
    public speed = 4.2,
  ) {}

  get isWalking(): boolean {
    return this.route.length > 0;
  }

  /**
   * Start walking to `target`. `stopShort` stops that far before it
   * (to stand next to someone instead of on top of them).
   * Returns false if there is no way to get there.
   */
  goTo(target: Vector3, onArrive?: () => void, stopShort = 0): boolean {
    const from = this.character.position;
    let goal = target;
    if (stopShort > 0) {
      const dir = from.subtract(target);
      dir.y = 0;
      const len = dir.length();
      if (len <= stopShort) {
        this.route = [];
        onArrive?.();
        return true;
      }
      goal = target.add(dir.scale(stopShort / len));
    }
    const route = this.nav.findPath(from, goal);
    if (!route || route.length === 0) return false;
    this.route = route;
    this.onArrive = onArrive ?? null;
    return true;
  }

  stop(): void {
    this.route = [];
    this.onArrive = null;
  }

  /** Turn to look at a point. */
  face(point: Vector3): void {
    const p = this.character.position;
    this.heading = Math.atan2(point.x - p.x, point.z - p.z);
  }

  update(dt: number): void {
    const pos = this.character.position;
    let moving = 0;
    let remaining = this.speed * dt;

    while (remaining > 0 && this.route.length > 0) {
      const next = this.route[0];
      const dx = next.x - pos.x;
      const dz = next.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001) this.heading = Math.atan2(dx, dz);
      if (dist <= remaining) {
        pos.x = next.x;
        pos.z = next.z;
        remaining -= dist;
        this.route.shift();
      } else {
        pos.x += (dx / dist) * remaining;
        pos.z += (dz / dist) * remaining;
        remaining = 0;
      }
      moving = 1;
    }
    this.character.moving = moving * (this.speed / 4.2);

    if (moving && this.route.length === 0) {
      const done = this.onArrive;
      this.onArrive = null;
      done?.();
    }

    this.turn(dt);
  }

  /**
   * Walk in a direction (from the joystick). `amount` is how far the stick is
   * pushed (0 to 1). Characters slide along walls instead of walking through them.
   */
  drive(dirX: number, dirZ: number, amount: number, dt: number): void {
    this.route = [];
    this.onArrive = null;
    const pos = this.character.position;
    const step = this.speed * 1.15 * amount * dt;
    const nx = pos.x + dirX * step;
    const nz = pos.z + dirZ * step;
    if (this.nav.isWalkable(nx, nz)) {
      pos.x = nx;
      pos.z = nz;
    } else if (this.nav.isWalkable(nx, pos.z)) {
      pos.x = nx;
    } else if (this.nav.isWalkable(pos.x, nz)) {
      pos.z = nz;
    }
    this.heading = Math.atan2(dirX, dirZ);
    this.character.moving = amount * 1.15;
    this.turn(dt);
  }

  /** Smoothly turn towards the heading (taking the short way round). */
  private turn(dt: number): void {
    const root = this.character.root;
    let diff = this.heading - root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    root.rotation.y += diff * Math.min(1, dt * 12);
  }
}
