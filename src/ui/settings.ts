import { Graphics, QualitySetting } from "../game/graphics";

/**
 * A small ⚙️ button in the corner that opens the settings menu:
 * graphics quality, and (later) switching to another child.
 */
export class SettingsMenu {
  private panel: HTMLDivElement;
  private buttons = new Map<QualitySetting, HTMLButtonElement>();
  private extra: HTMLDivElement;
  onOpenChange: ((open: boolean) => void) | null = null;

  constructor(private graphics: Graphics) {
    const gear = document.createElement("button");
    gear.id = "settings-btn";
    gear.className = "round-btn";
    gear.setAttribute("aria-label", "Settings");
    gear.textContent = "⚙️";
    gear.addEventListener("click", () => this.open());

    const panel = document.createElement("div");
    panel.id = "settings";
    panel.className = "overlay";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="card settings-card">
        <button class="close-btn" aria-label="Close">✖</button>
        <h2>⚙️ Settings</h2>
        <p class="label">🖼️ Picture</p>
        <div class="choice-row quality-row"></div>
        <p class="hint-text" id="quality-now"></p>
        <div class="extra"></div>
      </div>`;
    document.body.append(gear, panel);
    this.panel = panel;
    this.extra = panel.querySelector(".extra") as HTMLDivElement;

    const row = panel.querySelector(".quality-row")!;
    const options: [QualitySetting, string][] = [
      ["auto", "🤖 Auto"],
      ["low", "🐢 Low"],
      ["medium", "🙂 Medium"],
      ["high", "✨ High"],
    ];
    for (const [value, label] of options) {
      const b = document.createElement("button");
      b.className = "choice";
      b.textContent = label;
      b.addEventListener("click", () => {
        this.graphics.choose(value);
        this.refresh();
      });
      row.append(b);
      this.buttons.set(value, b);
    }
    panel.querySelector(".close-btn")!.addEventListener("click", () => this.close());
    panel.addEventListener("click", (e) => {
      if (e.target === panel) this.close();
    });
    graphics.whenChanged(() => this.refresh());
  }

  /** Add another big button to the menu (e.g. "Switch player"). */
  addButton(label: string, onClick: () => void): void {
    const b = document.createElement("button");
    b.className = "big-btn secondary";
    b.textContent = label;
    b.addEventListener("click", () => {
      this.close();
      onClick();
    });
    this.extra.append(b);
  }

  open(): void {
    this.refresh();
    this.panel.hidden = false;
    this.onOpenChange?.(true);
  }

  close(): void {
    this.panel.hidden = true;
    this.onOpenChange?.(false);
  }

  private refresh(): void {
    for (const [value, b] of this.buttons) b.classList.toggle("selected", value === this.graphics.setting);
    const names = { low: "🐢 Low", medium: "🙂 Medium", high: "✨ High" };
    (this.panel.querySelector("#quality-now") as HTMLElement).textContent = `Now using: ${names[this.graphics.quality]}`;
  }
}
