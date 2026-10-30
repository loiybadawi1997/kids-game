import { Profile } from "../profiles";

/**
 * The things on screen while walking around town: who is playing and
 * their coins (top left), "go home" and "places" buttons, and a big
 * start button when standing at an activity.
 */
export class Hud {
  private root: HTMLDivElement;
  private nameEl: HTMLElement;
  private coinsEl: HTMLElement;
  private portraitEl: HTMLElement;
  private startButton: HTMLButtonElement;
  onProfileTap: (() => void) | null = null;
  onHome: (() => void) | null = null;
  onPlaces: (() => void) | null = null;
  onStart: (() => void) | null = null;

  constructor() {
    const root = document.createElement("div");
    root.id = "hud";
    root.hidden = true;
    root.innerHTML = `
      <button class="player-chip" aria-label="Change player">
        <span class="chip-portrait"></span>
        <span class="chip-text"><span class="chip-name"></span><span class="chip-coins"></span></span>
      </button>
      <div class="hud-buttons">
        <button class="round-btn hud-btn home" aria-label="Go home">🏠</button>
        <button class="round-btn hud-btn places" aria-label="Places to go">🗺️</button>
      </div>
      <button class="big-btn run-shop" hidden></button>`;
    document.body.append(root);
    this.root = root;
    this.nameEl = root.querySelector(".chip-name")!;
    this.coinsEl = root.querySelector(".chip-coins")!;
    this.portraitEl = root.querySelector(".chip-portrait")!;
    this.startButton = root.querySelector(".run-shop")!;
    root.querySelector(".player-chip")!.addEventListener("click", () => this.onProfileTap?.());
    root.querySelector(".home")!.addEventListener("click", () => this.onHome?.());
    root.querySelector(".places")!.addEventListener("click", () => this.onPlaces?.());
    this.startButton.addEventListener("click", () => this.onStart?.());
  }

  show(profile: Profile): void {
    this.nameEl.textContent = profile.name;
    this.portraitEl.innerHTML = profile.portrait ? `<img alt="" src="${profile.portrait}">` : "🙂";
    this.setCoins(profile.coins);
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  setCoins(coins: number): void {
    this.coinsEl.textContent = `🪙 ${coins}`;
  }

  /** Bounce the coin counter (after earning coins). */
  celebrateCoins(): void {
    this.coinsEl.classList.remove("bump");
    void this.coinsEl.offsetWidth;
    this.coinsEl.classList.add("bump");
  }

  /** Show the big start button (e.g. "🍎 Open my shop!"), or hide it with null. */
  showStart(label: string | null): void {
    this.startButton.hidden = label === null;
    if (label) this.startButton.textContent = label;
  }
}

/** A big friendly message that pops up for a moment. */
export function toast(text: string, ms = 2600): void {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.classList.add("out"), ms - 400);
  setTimeout(() => el.remove(), ms);
}
