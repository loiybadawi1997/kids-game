import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Character, CharacterLook, presetLook, randomLook } from "./character";
import { NavGrid } from "./navGrid";
import { Walker } from "./walker";

/** Friendly people who live in the town. */
const PEOPLE: { name: string; lines: string[] }[] = [
  { name: "Lina", lines: ["Hi! I'm Lina! 👋", "I love the fountain! ⛲", "Let's be friends! 💛"] },
  { name: "Omar", lines: ["Hello! I'm Omar! 😄", "The park is so fun! 🌳", "Did you see the ducks? 🦆"] },
  { name: "Maya", lines: ["Hey! I'm Maya! 🌸", "Nice day, right? ☀️", "I like your style! ✨"] },
  { name: "Yusuf", lines: ["Hi there! I'm Yusuf! 🙌", "Race you to the slide! 🛝", "The market has apples! 🍎"] },
  { name: "Noor", lines: ["Hello friend! I'm Noor! 🌟", "I'm going to the shop! 🛒", "Have a great day! 🌈"] },
  { name: "Sami", lines: ["Yo! I'm Sami! 😎", "Let's explore the town! 🗺️", "High five! ✋"] },
];

const SHOPKEEPERS: { name: string; lines: string[] }[] = [
  { name: "Mr. Fig", lines: ["Fresh fruit here! 🍊", "Welcome to my shop! 🛒", "Apples are yummy! 🍎"] },
  { name: "Mrs. Plum", lines: ["Hello, little friend! 🌸", "Come back soon! 😊", "Bananas today! 🍌"] },
];

export class Townsperson {
  readonly walker: Walker;
  private waitTimer: number;
  private lineIndex = 0;
  /** While talking to the player, the person stands still. */
  private talkTimer = 0;

  constructor(
    readonly character: Character,
    readonly name: string,
    private lines: string[],
    nav: NavGrid,
    private wanders: boolean,
    private random: () => number,
    private hangouts: { x: number; z: number }[],
    private homeHeading = 0,
  ) {
    this.walker = new Walker(character, nav, 2.3 + random() * 0.6);
    this.walker.heading = homeHeading;
    character.root.rotation.y = homeHeading;
    this.waitTimer = 1 + random() * 5;
  }

  /** Next thing this person says. */
  nextLine(): string {
    const line = this.lines[this.lineIndex % this.lines.length];
    this.lineIndex++;
    return line;
  }

  /** Stop and say hello to someone at `point`. */
  greet(point: Vector3): void {
    this.walker.stop();
    this.walker.face(point);
    this.character.wave();
    this.talkTimer = 3.5;
  }

  update(dt: number, nav: NavGrid): void {
    this.walker.update(dt);
    this.character.update(dt);

    if (this.talkTimer > 0) {
      this.talkTimer -= dt;
      return;
    }
    if (this.walker.isWalking) return;

    this.waitTimer -= dt;
    if (this.waitTimer > 0) return;
    this.waitTimer = 3 + this.random() * 7;

    if (!this.wanders) {
      // Shopkeepers stay put, face the street and sometimes wave.
      this.walker.heading = this.homeHeading;
      if (this.random() < 0.35) this.character.wave();
      return;
    }
    // Walk to a favourite spot, or somewhere nearby.
    const spot =
      this.random() < 0.5
        ? this.hangouts[Math.floor(this.random() * this.hangouts.length)]
        : null;
    const p = this.character.position;
    const target = spot
      ? nav.nearestWalkable(spot.x + (this.random() - 0.5) * 3, spot.z + (this.random() - 0.5) * 3)
      : nav.randomWalkable(this.random, p.x, p.z, 10);
    if (target) this.walker.goTo(target);
  }
}

export function createTownsfolk(
  scene: Scene,
  nav: NavGrid,
  random: () => number,
  hangouts: { x: number; z: number }[],
  shopFronts: { x: number; z: number; rotY: number }[],
): Townsperson[] {
  const people: Townsperson[] = [];
  PEOPLE.forEach((p, i) => {
    const look: CharacterLook = randomLook(random);
    const c = new Character(scene, look, p.name);
    const start = hangouts[(i * 3) % hangouts.length];
    const pos = nav.nearestWalkable(start.x + random() * 2, start.z + random() * 2) ?? new Vector3(start.x, 0, start.z);
    c.root.position.set(pos.x, 0, pos.z);
    people.push(new Townsperson(c, p.name, p.lines, nav, true, random, hangouts, random() * 6));
  });
  SHOPKEEPERS.forEach((p, i) => {
    const front = shopFronts[i * 3 % shopFronts.length];
    const look = randomLook(random);
    // Shopkeepers are friendly bots.
    Object.assign(look, presetLook("bot"), { primaryColor: look.primaryColor, glowColor: look.glowColor });
    const c = new Character(scene, look, p.name);
    c.root.position.set(front.x, 0, front.z);
    people.push(new Townsperson(c, p.name, p.lines, nav, false, random, hangouts, front.rotY));
  });
  return people;
}
