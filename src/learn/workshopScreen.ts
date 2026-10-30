import { Level } from "../profiles";
import { BLOCK_INFO, Block, BlockKind, CONTAINERS, PUZZLES, Puzzle, RobotState, cellAt, countBlocks, findStart, runProgram, totalGears } from "./workshopData";
import { bigButton, openActivityScreen, shake, showReward } from "./ui";

/*
 * Inventor's Workshop: program a robot with instruction blocks.
 *
 * Tap a block in the toolbox to add it to the program. Tap a block in the
 * program to take it out. Loops and "if" blocks have a box inside: tap the
 * box to put the next blocks in there. Then press ▶️ Run.
 */

export interface WorkshopResult {
  coins: number;
  solved: number;
  /** Which puzzle to start from next time. */
  nextPuzzle: number;
}

const PUZZLES_PER_VISIT = 4;
const CELL_ICONS: Record<string, string> = { "#": "🧱", B: "🔋", G: "⚙️" };

export function openWorkshop(opts: { level: Level; childName: string; startPuzzle: number; onClose: (r: WorkshopResult | null) => void }): void {
  const list = PUZZLES[opts.level];
  let index = opts.startPuzzle;
  let played = 0;
  let solved = 0;
  let coins = 0;
  let stars = 0;

  const screen = openActivityScreen("🤖 Inventor's Workshop", "workshop", () => {
    if (solved > 0) finish();
    else {
      screen.close();
      opts.onClose(null);
    }
  });
  const statsEl = screen.stats;
  const updateStats = () => (statsEl.innerHTML = `<span class="stat">🧩 ${played + 1} / ${PUZZLES_PER_VISIT}</span><span class="stat">🪙 ${coins}</span>`);

  const finish = () => {
    statsEl.innerHTML = "";
    showReward(screen.main, {
      title: "🎉 Great coding!",
      stars: Math.round(stars / Math.max(1, solved)),
      rows: [`🧩 Puzzles solved: <b>${solved}</b>`, `⭐ Stars: <b>${stars}</b>`],
      coins,
      button: "🏠 Back to town",
      onDone: () => {
        screen.close();
        opts.onClose({ coins, solved, nextPuzzle: index });
      },
    });
  };

  const playPuzzle = () => {
    const puzzle = list[index % list.length];
    updateStats();
    let program: Block[] = [];
    let target: Block[] = program; // where tapped blocks go
    let running = false;

    screen.main.innerHTML = `
      <div class="ws-left">
        <p class="ws-tip"></p>
        <div class="ws-board-wrap"><div class="ws-board"></div></div>
      </div>
      <div class="ws-right">
        <div class="ws-label">🧰 Blocks <small>(tap to add)</small></div>
        <div class="ws-toolbox"></div>
        <div class="ws-label">📜 My program <small>(tap a block to take it out)</small></div>
        <div class="ws-program"></div>
        <div class="ws-actions"></div>
      </div>`;
    const tipEl = screen.main.querySelector(".ws-tip") as HTMLElement;
    const boardWrap = screen.main.querySelector(".ws-board-wrap") as HTMLDivElement;
    const board = screen.main.querySelector(".ws-board") as HTMLDivElement;
    const toolbox = screen.main.querySelector(".ws-toolbox") as HTMLDivElement;
    const programEl = screen.main.querySelector(".ws-program") as HTMLDivElement;
    const actions = screen.main.querySelector(".ws-actions") as HTMLDivElement;
    tipEl.textContent = `💡 ${puzzle.tip}`;

    // --- The board ---
    const rows = puzzle.grid.length;
    const cols = Math.max(...puzzle.grid.map((r) => r.length));
    const cells: HTMLDivElement[] = [];
    const size = Math.floor(Math.max(30, Math.min(72, boardWrap.clientHeight / rows, boardWrap.clientWidth / cols)));
    board.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
    board.style.gridTemplateRows = `repeat(${rows}, ${size}px)`;
    board.style.fontSize = `${size * 0.6}px`;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = cellAt(puzzle, x, y);
        const cell = document.createElement("div");
        cell.className = `ws-cell${c === "#" ? " wall" : ""}`;
        cell.textContent = CELL_ICONS[c] ?? "";
        board.append(cell);
        cells.push(cell);
      }
    }
    const robot = document.createElement("div");
    robot.className = "ws-robot";
    robot.style.width = robot.style.height = `${size}px`;
    robot.innerHTML = `<span class="ws-arrow">▲</span><span class="ws-bot">🤖</span>`;
    board.append(robot);
    const arrow = robot.querySelector(".ws-arrow") as HTMLElement;
    let turns = 0; // keeps the arrow turning the short way
    const placeRobot = (s: RobotState, instant = false) => {
      robot.style.transition = instant ? "none" : "";
      robot.style.transform = `translate(${s.x * (size + 2)}px, ${s.y * (size + 2)}px)`;
      const current = ((turns % 4) + 4) % 4;
      let diff = s.dir - current;
      if (diff === 3) diff = -1;
      if (diff === -3) diff = 1;
      turns += diff;
      arrow.style.transform = `rotate(${turns * 90}deg)`;
    };
    const resetBoard = () => {
      turns = puzzle.facing;
      placeRobot(findStart(puzzle), true);
      cells.forEach((cell, i) => {
        const c = cellAt(puzzle, i % cols, Math.floor(i / cols));
        cell.textContent = CELL_ICONS[c] ?? "";
        cell.classList.remove("trail");
      });
    };
    resetBoard();

    // --- The toolbox ---
    for (const kind of puzzle.blocks) {
      const b = document.createElement("button");
      b.className = `code-block tool kind-${kind}`;
      b.innerHTML = `<span class="cb-icon">${BLOCK_INFO[kind].icon}</span><span class="cb-label">${BLOCK_INFO[kind].label}</span>`;
      b.addEventListener("click", () => {
        if (running) return;
        if (countBlocks(program) >= 30) return shake(programEl);
        const block: Block = { kind };
        if (kind === "repeat") block.times = 3;
        if (CONTAINERS.includes(kind)) block.body = [];
        target.push(block);
        // The next blocks go inside a new loop (until the child taps somewhere else).
        if (block.body) target = block.body;
        renderProgram();
      });
      toolbox.append(b);
    }

    // --- The program ---
    const contains = (blocks: Block[], list: Block[]): boolean => blocks === list || list.some((b) => b.body !== undefined && contains(blocks, b.body));
    const renderBlocks = (blocks: Block[], into: HTMLElement) => {
      blocks.forEach((block, i) => {
        const el = document.createElement("div");
        el.className = `code-block kind-${block.kind}`;
        const head = document.createElement("div");
        head.className = "cb-head";
        head.innerHTML = `<span class="cb-icon">${BLOCK_INFO[block.kind].icon}</span><span class="cb-label">${BLOCK_INFO[block.kind].label}</span>`;
        head.addEventListener("click", (e) => {
          e.stopPropagation();
          if (running) return;
          if (block.body && contains(target, [block])) target = blocks;
          blocks.splice(i, 1);
          renderProgram();
        });
        el.append(head);
        if (block.kind === "repeat") {
          const times = document.createElement("button");
          times.className = "cb-times";
          times.textContent = `× ${block.times}`;
          times.setAttribute("aria-label", "Change how many times");
          times.addEventListener("click", (e) => {
            e.stopPropagation();
            if (running) return;
            block.times = (block.times ?? 2) >= 9 ? 2 : (block.times ?? 2) + 1;
            renderProgram();
          });
          head.append(times);
        }
        if (block.body) {
          const body = document.createElement("div");
          body.className = `cb-body${block.body === target ? " target" : ""}`;
          if (block.body.length === 0) body.innerHTML = `<span class="cb-empty">${block.body === target ? "👇 blocks go here" : "tap to fill"}</span>`;
          renderBlocks(block.body, body);
          body.addEventListener("click", (e) => {
            e.stopPropagation();
            if (running) return;
            target = block.body!;
            renderProgram();
          });
          el.append(body);
        }
        into.append(el);
      });
    };
    const renderProgram = () => {
      programEl.innerHTML = "";
      programEl.classList.toggle("target", target === program);
      renderBlocks(program, programEl);
      if (program.length === 0) programEl.innerHTML = `<span class="cb-empty">Tap the blocks above to build a program</span>`;
      const n = countBlocks(program);
      runButton.disabled = n === 0;
      countEl.textContent = `🧱 ${n} blocks`;
    };
    // Tapping the program area (not inside a loop) puts new blocks at the end of the program.
    programEl.addEventListener("click", () => {
      if (running) return;
      target = program;
      renderProgram();
    });

    // --- Buttons ---
    const countEl = document.createElement("span");
    countEl.className = "ws-count";
    const clear = bigButton("🗑️", () => {
      if (running) return;
      program = [];
      target = program;
      renderProgram();
    }, "small secondary");
    clear.setAttribute("aria-label", "Clear the program");
    const runButton = bigButton("▶️ Run", () => run());
    actions.append(countEl, clear, runButton);
    renderProgram();

    // --- Running ---
    const message = (html: string, kind: "good" | "oops") => {
      tipEl.innerHTML = html;
      tipEl.className = `ws-tip ${kind}`;
    };
    const run = () => {
      if (running) return;
      running = true;
      screen.main.classList.add("running");
      resetBoard();
      const result = runProgram(puzzle, program);
      let i = 0;
      const tick = () => {
        if (i >= result.steps.length) return done();
        const step = result.steps[i++];
        if (step.event === "bump") {
          robot.classList.remove("bump");
          void robot.offsetWidth;
          robot.classList.add("bump");
        } else {
          placeRobot(step.state);
          const cell = cells[step.state.y * cols + step.state.x];
          if (step.event === "gear") cell.textContent = "✨";
          else if (step.event === "move") cell.classList.add("trail");
        }
        setTimeout(tick, step.event === "turn" ? 260 : 380);
      };
      const done = () => {
        if (result.reachedBattery) {
          const gearsAll = result.gears === totalGears(puzzle);
          const smart = countBlocks(program) <= puzzle.par;
          const got = 1 + (gearsAll ? 1 : 0) + (smart ? 1 : 0);
          const earned = 2 + got * 2;
          solved++;
          stars += got;
          coins += earned;
          index++;
          played++;
          message(`🔋 Charged! ${"⭐".repeat(got)} +🪙 ${earned}` + (smart ? "" : `<br><small>Tip: it can be done with ${puzzle.par} blocks!</small>`), "good");
          robot.classList.add("happy");
          actions.innerHTML = "";
          actions.append(bigButton(played >= PUZZLES_PER_VISIT ? "🏁 Finish" : "Next ➡️", () => (played >= PUZZLES_PER_VISIT ? finish() : playPuzzle())));
          statsEl.querySelector(".stat:last-child")!.textContent = `🪙 ${coins}`;
          return;
        }
        const why = {
          bump: "Bonk! 🧱 The robot hit a wall.",
          end: "The program ended before the battery 🔋.",
          tooLong: "The robot is going round and round! 😵",
          battery: "",
        }[result.ending];
        message(`${why}<br><small>Change the program and try again! 💪</small>`, "oops");
        setTimeout(() => {
          running = false;
          screen.main.classList.remove("running");
          resetBoard();
        }, 1400);
      };
      setTimeout(tick, 200);
    };
  };

  playPuzzle();
}

export type { BlockKind, Puzzle };
