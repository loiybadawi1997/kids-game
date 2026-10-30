import { Level } from "../profiles";

/*
 * Inventor's Workshop: robot puzzles and the little program runner.
 *
 * A puzzle is a grid. The child builds a program from blocks, then the robot
 * runs it. Reach the battery 🔋 to win; collect gears ⚙️ for a star.
 *
 * Grid letters:  R robot start   B battery   G gear   # wall   . floor
 */

export type Dir = 0 | 1 | 2 | 3; // 0 north (up), 1 east, 2 south, 3 west

export type BlockKind = "go" | "left" | "right" | "repeat" | "until" | "ifWall";

export interface Block {
  kind: BlockKind;
  /** How many times (repeat blocks only). */
  times?: number;
  /** Blocks inside (repeat, until and if blocks). */
  body?: Block[];
}

export interface Puzzle {
  grid: string[];
  facing: Dir;
  /** Which blocks are in the toolbox. */
  blocks: BlockKind[];
  /** The fewest blocks needed (for the "smart program" star). */
  par: number;
  /** A friendly tip shown above the board. */
  tip: string;
}

export const BLOCK_INFO: Record<BlockKind, { icon: string; label: string }> = {
  go: { icon: "⬆️", label: "Go" },
  left: { icon: "↩️", label: "Turn left" },
  right: { icon: "↪️", label: "Turn right" },
  repeat: { icon: "🔁", label: "Repeat" },
  until: { icon: "🔁", label: "Until 🔋" },
  ifWall: { icon: "❓", label: "If 🧱 ahead" },
};

export const CONTAINERS: BlockKind[] = ["repeat", "until", "ifWall"];

const BASIC: BlockKind[] = ["go", "left", "right"];
const LOOPS: BlockKind[] = ["go", "left", "right", "repeat"];
const ALL: BlockKind[] = ["go", "left", "right", "repeat", "until", "ifWall"];

/** Middle (7–8): short sequences, then repeats. */
const MIDDLE: Puzzle[] = [
  { grid: ["R...B"], facing: 1, blocks: ["go"], par: 4, tip: "Help the robot reach the battery 🔋! Tap ⬆️ Go to add a step." },
  { grid: ["R..", "##.", "##B"], facing: 1, blocks: BASIC, par: 5, tip: "Go, then turn ↪️ right, then go down!" },
  { grid: ["B.G.", "###.", "R..."], facing: 1, blocks: BASIC, par: 10, tip: "Pick up the gear ⚙️ on the way for a star!" },
  { grid: ["R......B"], facing: 1, blocks: LOOPS, par: 2, tip: "New! 🔁 Repeat does the blocks inside it again and again. Tap the number to change it." },
  { grid: ["R.###", "#.G##", "##..#", "###B#"], facing: 1, blocks: LOOPS, par: 5, tip: "Stairs! Go, turn right, go, turn left… repeat!" },
  { grid: ["R.G.G.G.B"], facing: 1, blocks: LOOPS, par: 2, tip: "Collect all the gears ⚙️ with one 🔁 Repeat!" },
  { grid: ["R##B", ".##.", "G##.", "...."], facing: 2, blocks: LOOPS, par: 6, tip: "A big U! You can put a 🔁 Repeat inside a 🔁 Repeat." },
  { grid: ["R..G", "###.", "....", ".###", "G..B"], facing: 1, blocks: LOOPS, par: 14, tip: "The zig-zag! Use 🔁 Repeat for the long bits." },
];

/** Big (9–10): loops and simple conditions. */
const BIG: Puzzle[] = [
  { grid: ["R.......B"], facing: 1, blocks: LOOPS, par: 2, tip: "Warm up: reach the battery 🔋 with as few blocks as you can." },
  { grid: ["R##B", ".##.", "G##.", "...."], facing: 2, blocks: LOOPS, par: 6, tip: "Try a 🔁 Repeat inside a 🔁 Repeat!" },
  { grid: ["R.G.G.G.G.B"], facing: 1, blocks: ["go", "left", "right", "repeat", "until"], par: 2, tip: "New! 🔁 Until 🔋 keeps going until the robot reaches the battery." },
  { grid: ["R...G", "####.", "B...."], facing: 1, blocks: ALL, par: 4, tip: "New! ❓ If 🧱 ahead only runs its blocks when a wall (or the edge) is in front." },
  { grid: ["R...G", "####.", ".B#..", ".###.", "G...."], facing: 1, blocks: ALL, par: 4, tip: "A spiral! Until 🔋: if 🧱 ahead, turn right. Then go." },
  { grid: ["B...G", "####.", "R...."], facing: 1, blocks: ALL, par: 4, tip: "This time the robot must turn the other way ↩️." },
  { grid: ["R..G", "###.", "....", ".###", "G..B"], facing: 1, blocks: ALL, par: 14, tip: "Left and right turns! Use 🔁 Repeat to keep it short." },
  { grid: ["R....G", "#####.", "...B#.", ".####.", ".####.", "G....."], facing: 1, blocks: ALL, par: 4, tip: "The big spiral! Can you do it with only 4 blocks?" },
];

export const PUZZLES: Record<Level, Puzzle[]> = { middle: MIDDLE, big: BIG };

// ------------------------------------------------------------------
// Running a program
// ------------------------------------------------------------------

export interface RobotState {
  x: number;
  y: number;
  dir: Dir;
}

/** One thing the robot did (the screen animates these one by one). */
export interface Step {
  state: RobotState;
  /** What just happened. */
  event: "move" | "turn" | "bump" | "gear" | "battery";
}

export interface RunResult {
  steps: Step[];
  reachedBattery: boolean;
  gears: number;
  /** Why the robot stopped, for a helpful message. */
  ending: "battery" | "bump" | "end" | "tooLong";
}

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const MAX_STEPS = 150;

export function findStart(p: Puzzle): RobotState {
  for (let y = 0; y < p.grid.length; y++) {
    const x = p.grid[y].indexOf("R");
    if (x >= 0) return { x, y, dir: p.facing };
  }
  return { x: 0, y: 0, dir: p.facing };
}

export function cellAt(p: Puzzle, x: number, y: number): string {
  if (y < 0 || y >= p.grid.length || x < 0 || x >= p.grid[y].length) return "#";
  return p.grid[y][x];
}

/** Run a program and record every step. Stops at the battery, a wall, or after too many steps. */
export function runProgram(p: Puzzle, program: Block[]): RunResult {
  const s = findStart(p);
  const steps: Step[] = [];
  const taken = new Set<string>();
  let gears = 0;
  let ending: RunResult["ending"] | null = null;

  const wallAhead = () => cellAt(p, s.x + DX[s.dir], s.y + DY[s.dir]) === "#";
  const atBattery = () => cellAt(p, s.x, s.y) === "B";
  const stopped = () => ending !== null;

  const run = (blocks: Block[]) => {
    for (const b of blocks) {
      if (stopped()) return;
      if (steps.length >= MAX_STEPS) {
        ending = "tooLong";
        return;
      }
      switch (b.kind) {
        case "go": {
          if (wallAhead()) {
            steps.push({ state: { ...s }, event: "bump" });
            ending = "bump";
            return;
          }
          s.x += DX[s.dir];
          s.y += DY[s.dir];
          const cell = cellAt(p, s.x, s.y);
          const key = `${s.x},${s.y}`;
          if (cell === "G" && !taken.has(key)) {
            taken.add(key);
            gears++;
            steps.push({ state: { ...s }, event: "gear" });
          } else steps.push({ state: { ...s }, event: "move" });
          if (atBattery()) {
            steps[steps.length - 1].event = "battery";
            ending = "battery";
          }
          break;
        }
        case "left":
          s.dir = ((s.dir + 3) % 4) as Dir;
          steps.push({ state: { ...s }, event: "turn" });
          break;
        case "right":
          s.dir = ((s.dir + 1) % 4) as Dir;
          steps.push({ state: { ...s }, event: "turn" });
          break;
        case "repeat":
          for (let i = 0; i < (b.times ?? 2) && !stopped(); i++) run(b.body ?? []);
          break;
        case "until": {
          // Stop an empty or stuck loop from going on for ever.
          let guard = 0;
          while (!stopped() && !atBattery()) {
            const before = steps.length;
            run(b.body ?? []);
            if (steps.length === before || ++guard > MAX_STEPS) {
              ending = ending ?? "tooLong";
              break;
            }
          }
          break;
        }
        case "ifWall":
          if (wallAhead()) run(b.body ?? []);
          break;
      }
    }
  };
  run(program);
  return { steps, reachedBattery: ending === "battery", gears, ending: ending ?? "end" };
}

/** How many blocks are in a program (blocks inside loops count too). */
export function countBlocks(program: Block[]): number {
  return program.reduce((n, b) => n + 1 + countBlocks(b.body ?? []), 0);
}

export function totalGears(p: Puzzle): number {
  return p.grid.join("").split("G").length - 1;
}
