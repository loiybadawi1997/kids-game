import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ActivityId, ActivitySpot } from "../game/town";

/*
 * Big floating icons above the learning activities (🍎 🤖 🏝️ ⏳), so
 * children can see where to go. Tapping one walks there.
 */
export class Beacons {
  private root: HTMLDivElement;
  private items: { place: ActivitySpot; el: HTMLButtonElement; at: Vector3 }[] = [];
  private visible = true;
  onTap: ((id: ActivityId) => void) | null = null;

  constructor(places: ActivitySpot[], private toScreen: (p: Vector3) => { x: number; y: number } | null) {
    this.root = document.createElement("div");
    this.root.id = "beacons";
    document.body.append(this.root);
    for (const place of places) {
      const el = document.createElement("button");
      el.className = "beacon";
      el.innerHTML = `<span class="beacon-icon">${place.emoji}</span><span class="beacon-name">${place.name}</span>`;
      el.setAttribute("aria-label", `Go to ${place.name}`);
      el.addEventListener("click", () => this.onTap?.(place.id));
      this.root.append(el);
      this.items.push({ place, el, at: place.spot.add(new Vector3(0, 3.4, 0)) });
    }
  }

  show(show: boolean): void {
    this.visible = show;
    this.root.hidden = !show;
  }

  update(player: Vector3, here: ActivityId | null): void {
    if (!this.visible) return;
    for (const { place, el, at } of this.items) {
      const far = Vector3.Distance(player, place.spot);
      const s = place.id !== here && far < 60 ? this.toScreen(at) : null;
      if (!s) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      // Smaller when far away, but never too small to tap.
      const scale = Math.max(0.75, Math.min(1.15, 14 / Math.max(1, far)));
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%) scale(${scale.toFixed(2)})`;
    }
  }
}
