import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Character } from "../game/character";

interface Bubble {
  el: HTMLDivElement;
  character: Character;
  timeLeft: number;
}

/**
 * Speech bubbles above people's heads. They are plain HTML on top of the
 * 3D view, so the text is always crisp and easy to read.
 */
export class SpeechBubbles {
  private bubbles: Bubble[] = [];
  private last = performance.now();

  constructor(
    private container: HTMLElement,
    private toScreen: (p: Vector3) => { x: number; y: number } | null,
  ) {}

  show(character: Character, name: string, text: string): void {
    // Only one bubble per person at a time.
    this.bubbles = this.bubbles.filter((b) => {
      if (b.character !== character) return true;
      b.el.remove();
      return false;
    });
    const el = document.createElement("div");
    el.className = "bubble";
    const nameEl = document.createElement("div");
    nameEl.className = "bubble-name";
    nameEl.textContent = name;
    const textEl = document.createElement("div");
    textEl.textContent = text;
    el.append(nameEl, textEl);
    this.container.append(el);
    this.bubbles.push({ el, character, timeLeft: 3.5 });
  }

  update(): void {
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    this.bubbles = this.bubbles.filter((b) => {
      b.timeLeft -= dt;
      if (b.timeLeft <= 0) {
        b.el.remove();
        return false;
      }
      const s = this.toScreen(b.character.headTop());
      if (!s) {
        b.el.style.display = "none";
      } else {
        b.el.style.display = "";
        b.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
        b.el.style.opacity = b.timeLeft < 0.4 ? String(b.timeLeft / 0.4) : "1";
      }
      return true;
    });
  }
}
