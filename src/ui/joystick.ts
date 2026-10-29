/**
 * An on-screen joystick (bottom left) and a jump button (bottom right),
 * like in Roblox. Tapping the ground to walk still works too.
 *
 * `vector` is how the stick is pushed: x = right, y = forward, each -1..1.
 */
export class TouchControls {
  readonly vector = { x: 0, y: 0 };
  onJump: (() => void) | null = null;
  private root: HTMLDivElement;
  private knob: HTMLDivElement;
  private base: HTMLDivElement;
  private pointerId: number | null = null;

  constructor() {
    const root = document.createElement("div");
    root.id = "touch-controls";
    root.hidden = true;
    root.innerHTML = `
      <div class="stick-base" aria-label="Walk"><div class="stick-knob"></div></div>
      <button class="jump-btn" aria-label="Jump">⬆️<span>Jump</span></button>`;
    document.body.append(root);
    this.root = root;
    this.base = root.querySelector(".stick-base") as HTMLDivElement;
    this.knob = root.querySelector(".stick-knob") as HTMLDivElement;

    this.base.addEventListener("pointerdown", (e) => {
      this.pointerId = e.pointerId;
      this.base.setPointerCapture(e.pointerId);
      this.move(e);
    });
    this.base.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.pointerId) this.move(e);
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.vector.x = 0;
      this.vector.y = 0;
      this.knob.style.transform = "";
      this.base.classList.remove("active");
    };
    this.base.addEventListener("pointerup", release);
    this.base.addEventListener("pointercancel", release);

    const jump = root.querySelector(".jump-btn") as HTMLButtonElement;
    jump.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.onJump?.();
    });
  }

  private move(e: PointerEvent): void {
    const rect = this.base.getBoundingClientRect();
    const radius = rect.width / 2;
    let dx = (e.clientX - (rect.left + radius)) / radius;
    let dy = (e.clientY - (rect.top + radius)) / radius;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    // A small dead zone so a resting thumb doesn't creep.
    const strength = Math.min(1, len) < 0.15 ? 0 : 1;
    this.vector.x = dx * strength;
    this.vector.y = -dy * strength;
    this.knob.style.transform = `translate(${dx * radius * 0.55}px, ${dy * radius * 0.55}px)`;
    this.base.classList.add("active");
  }

  get active(): boolean {
    return Math.hypot(this.vector.x, this.vector.y) > 0.01;
  }

  show(visible: boolean): void {
    this.root.hidden = !visible;
    if (!visible) {
      this.vector.x = 0;
      this.vector.y = 0;
      this.knob.style.transform = "";
    }
  }
}
