import { Level } from "../profiles";
import { DISCOVERIES, Discovery, FLOAT_SINK, KIND_INFO, SEESAWS } from "./islandData";
import { askQuestion, bigButton, openActivityScreen, shake, showReward, shuffle } from "./ui";

/*
 * Explorer's Island: explore the island, discover animals, plants and
 * fossils for the journal, and solve a science puzzle to open the bridge
 * to the far side.
 *
 * Middle: "float or sink?"   Big: balance the seesaw (weight × distance).
 */

export interface IslandResult {
  coins: number;
  /** Ids of everything discovered on this trip (added to the journal). */
  found: string[];
}

/** Hiding places on the map (percent of the map), three on each side of the bridge. */
const SPOTS = [
  { x: 14, y: 30, hide: "🌿" },
  { x: 30, y: 70, hide: "🪨" },
  { x: 38, y: 34, hide: "🌳" },
  { x: 64, y: 28, hide: "🏖️" },
  { x: 74, y: 68, hide: "🌴" },
  { x: 88, y: 40, hide: "🕳️" },
];

export function openIsland(opts: { level: Level; childName: string; journal: string[]; onClose: (r: IslandResult | null) => void }): void {
  const level = opts.level;
  const journal = new Set(opts.journal);
  // Things not in the journal yet come first.
  const unfound = shuffle(DISCOVERIES.filter((d) => !journal.has(d.id)));
  const known = shuffle(DISCOVERIES.filter((d) => journal.has(d.id)));
  const trip: Discovery[] = [...unfound, ...known].slice(0, SPOTS.length);
  const done = new Set<number>();
  const found: string[] = [];
  let coins = 0;
  let firstTries = 0;
  let bridgeOpen = false;
  let busy = false;

  const screen = openActivityScreen("🏝️ Explorer's Island", "island", () => {
    if (found.length > 0) finish();
    else {
      screen.close();
      opts.onClose(null);
    }
  });
  const updateStats = () =>
    (screen.stats.innerHTML = `<span class="stat">🔍 ${done.size} / ${SPOTS.length}</span><span class="stat">📔 ${journal.size} / ${DISCOVERIES.length}</span><span class="stat">🪙 ${coins}</span>`);

  screen.main.innerHTML = `
    <div class="isl-map">
      <div class="isl-land left"></div>
      <div class="isl-land right"></div>
      <button class="isl-bridge" aria-label="Bridge">🚧</button>
    </div>
    <div class="isl-panel"></div>`;
  const map = screen.main.querySelector(".isl-map") as HTMLDivElement;
  const panel = screen.main.querySelector(".isl-panel") as HTMLDivElement;
  const bridge = screen.main.querySelector(".isl-bridge") as HTMLButtonElement;

  const spotButtons = SPOTS.map((spot, i) => {
    const b = document.createElement("button");
    b.className = "isl-spot";
    b.style.left = `${spot.x}%`;
    b.style.top = `${spot.y}%`;
    b.innerHTML = `<span class="isl-hide">${spot.hide}</span><span class="isl-q">❓</span>`;
    b.addEventListener("click", () => explore(i));
    map.append(b);
    return b;
  });
  const refreshMap = () => {
    spotButtons.forEach((b, i) => {
      const locked = i >= 3 && !bridgeOpen;
      b.classList.toggle("locked", locked);
      b.classList.toggle("done", done.has(i));
      if (done.has(i)) b.innerHTML = `<span class="isl-found">${trip[i].emoji}</span>`;
    });
    const leftDone = [0, 1, 2].every((i) => done.has(i));
    bridge.classList.toggle("ready", leftDone && !bridgeOpen);
    bridge.textContent = bridgeOpen ? "🌉" : "🚧";
    updateStats();
  };

  const welcome = (text: string) => {
    panel.innerHTML = `<div class="isl-welcome"><p class="big-message">🧭</p><p class="question-text">${text}</p></div>`;
    const jb = bigButton("📔 My journal", showJournal, "secondary");
    panel.querySelector(".isl-welcome")!.append(jb);
  };

  // --- Discovering something ---
  const explore = (i: number) => {
    if (busy || done.has(i)) return;
    if (i >= 3 && !bridgeOpen) {
      shake(bridge);
      welcome("🚧 The bridge is closed! Find everything on this side first, then fix the bridge.");
      return;
    }
    busy = true;
    const d = trip[i];
    spotButtons[i].classList.add("digging");
    const isNew = !journal.has(d.id);
    panel.innerHTML = `
      <div class="isl-card">
        <div class="isl-card-top"><span class="isl-emoji">${d.emoji}</span>
          <span><b>${d.name}</b><small>${KIND_INFO[d.kind].icon} ${KIND_INFO[d.kind].label}${isNew ? " · ✨ New!" : ""}</small></span></div>
        <p class="isl-fact">💡 ${d.fact}</p>
      </div>`;
    askQuestion(panel.querySelector(".isl-card")!, level === "middle" ? d.middle : d.big, (firstTry) => {
      done.add(i);
      found.push(d.id);
      journal.add(d.id);
      coins += 3 + (firstTry ? 1 : 0) + (isNew ? 1 : 0);
      if (firstTry) firstTries++;
      busy = false;
      spotButtons[i].classList.remove("digging");
      refreshMap();
      if (done.size === SPOTS.length) {
        setTimeout(finish, 600);
        return;
      }
      if (!bridgeOpen && [0, 1, 2].every((n) => done.has(n))) welcome("🌉 You found everything here! Now tap the 🚧 bridge to fix it.");
      else welcome(`${isNew ? `📔 ${d.emoji} is in your journal now!` : `${d.emoji} Good to see you again!`}<br>Tap another ❓ to explore.`);
    });
  };

  // --- The bridge: a science puzzle ---
  bridge.addEventListener("click", () => {
    if (busy || bridgeOpen) return;
    if (![0, 1, 2].every((i) => done.has(i))) {
      shake(bridge);
      welcome("🔍 Explore this side of the island first!");
      return;
    }
    busy = true;
    const opened = () => {
      bridgeOpen = true;
      busy = false;
      coins += 5;
      refreshMap();
      bridge.classList.add("opened");
      welcome("🌉 The bridge is open! +🪙 5<br>Explore the other side!");
    };
    if (level === "middle") floatOrSink(panel, opened);
    else seesaw(panel, opened);
  });

  // --- The journal ---
  const showJournal = () => {
    if (busy) return;
    panel.innerHTML = `<div class="journal"><h3>📔 ${opts.childName}'s journal <small>${journal.size} / ${DISCOVERIES.length}</small></h3><div class="journal-grid"></div></div>`;
    const grid = panel.querySelector(".journal-grid") as HTMLDivElement;
    for (const d of DISCOVERIES) {
      const has = journal.has(d.id);
      const cell = document.createElement("button");
      cell.className = `journal-cell${has ? "" : " missing"}`;
      cell.innerHTML = has ? `<span>${d.emoji}</span><small>${d.name}</small>` : `<span>❓</span><small>${KIND_INFO[d.kind].icon}</small>`;
      if (has) cell.addEventListener("click", () => {
        panel.innerHTML = `<div class="isl-card"><div class="isl-card-top"><span class="isl-emoji">${d.emoji}</span><span><b>${d.name}</b><small>${KIND_INFO[d.kind].icon} ${KIND_INFO[d.kind].label}</small></span></div><p class="isl-fact">💡 ${d.fact}</p></div>`;
        panel.querySelector(".isl-card")!.append(bigButton("📔 Back", showJournal, "secondary"));
      });
      grid.append(cell);
    }
    panel.querySelector(".journal")!.append(bigButton("🧭 Explore", () => welcome("Tap a ❓ on the island to explore!")));
  };

  const finish = () => {
    busy = true;
    screen.stats.innerHTML = "";
    const newOnes = found.filter((id) => !opts.journal.includes(id)).length;
    showReward(screen.main, {
      title: "🎉 What an adventure!",
      stars: found.length === 0 ? 1 : Math.ceil((firstTries / found.length) * 3),
      rows: [`🔍 Discovered: <b>${found.length}</b>`, `✨ New in journal: <b>${newOnes}</b>`, `📔 Journal: <b>${journal.size} / ${DISCOVERIES.length}</b>`, `🌉 Bridge: <b>${bridgeOpen ? "fixed!" : "not yet"}</b>`],
      coins,
      button: "🏠 Back to town",
      onDone: () => {
        screen.close();
        opts.onClose({ coins, found });
      },
    });
  };

  refreshMap();
  welcome(`Welcome, explorer ${opts.childName}! 🧭<br>Tap a ❓ to find animals, plants and fossils.`);
}

// ------------------------------------------------------------------
// Middle science puzzle: float or sink?
// ------------------------------------------------------------------
function floatOrSink(panel: HTMLElement, done: () => void): void {
  const items = shuffle(FLOAT_SINK).slice(0, 6);
  let n = 0;
  const next = () => {
    if (n >= items.length) {
      panel.innerHTML = `<p class="big-message">🌉</p><p class="question-text">You fixed the bridge with things that float!</p>`;
      setTimeout(done, 1300);
      return;
    }
    const item = items[n];
    panel.innerHTML = `
      <div class="fs">
        <p class="question-text">🚧 Fix the bridge! Only things that <b>float</b> can hold it up.<br>Will it float or sink? (${n + 1} / ${items.length})</p>
        <div class="fs-tank"><span class="fs-item">${item.emoji}</span><div class="fs-water"></div></div>
        <p class="fs-name">${item.name}</p>
        <div class="answers"></div>
        <p class="answer-note hint-text"></p>
      </div>`;
    const answers = panel.querySelector(".answers") as HTMLDivElement;
    const note = panel.querySelector(".answer-note") as HTMLElement;
    const tank = panel.querySelector(".fs-tank") as HTMLElement;
    let answered = false;
    for (const [label, floats] of [["🛟 Floats", true], ["⚓ Sinks", false]] as const) {
      const b = document.createElement("button");
      b.className = "answer-btn";
      b.textContent = label;
      b.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        tank.classList.add(item.floats ? "floats" : "sinks");
        const right = floats === item.floats;
        b.classList.add(right ? "right" : "wrong");
        note.textContent = `${right ? "🌟 Yes!" : "👀 Look!"} It ${item.floats ? "floats" : "sinks"}. ${item.why}`;
        n++;
        setTimeout(next, 2300);
      });
      answers.append(b);
    }
  };
  next();
}

// ------------------------------------------------------------------
// Big science puzzle: balance the seesaw
// ------------------------------------------------------------------
function seesaw(panel: HTMLElement, done: () => void): void {
  const rounds = shuffle(SEESAWS).slice(0, 3);
  let n = 0;
  const next = () => {
    if (n >= rounds.length) {
      panel.innerHTML = `<p class="big-message">🌉</p><p class="question-text">Balanced! The bridge is level and safe.</p>`;
      setTimeout(done, 1300);
      return;
    }
    const r = rounds[n];
    let tries = 0;
    panel.innerHTML = `
      <div class="ss">
        <p class="question-text">⚖️ Balance the seesaw to fix the bridge! (${n + 1} / ${rounds.length})<br><small>Where should the <b>${r.right} kg</b> box go?</small></p>
        <div class="ss-stage"><div class="ss-plank"></div><div class="ss-pivot">▲</div></div>
        <p class="answer-note hint-text">💡 Far from the middle pushes harder.</p>
      </div>`;
    const plank = panel.querySelector(".ss-plank") as HTMLDivElement;
    const note = panel.querySelector(".answer-note") as HTMLElement;
    // 4 places on each side of the middle.
    for (let pos = -4; pos <= 4; pos++) {
      const slot = document.createElement(pos > 0 ? "button" : "div");
      slot.className = `ss-slot${pos === 0 ? " mid" : ""}`;
      if (pos < 0) {
        slot.textContent = -pos === r.leftAt ? `${r.left}kg` : `${-pos}`;
        if (-pos === r.leftAt) slot.classList.add("weight");
      } else if (pos > 0) {
        slot.textContent = `${pos}`;
        slot.setAttribute("aria-label", `Put the box at ${pos}`);
        slot.addEventListener("click", () => {
          if (plank.classList.contains("solved")) return;
          plank.querySelectorAll(".ss-slot.placed").forEach((s) => {
            s.classList.remove("placed");
            s.textContent = s.getAttribute("data-n");
          });
          slot.setAttribute("data-n", `${pos}`);
          slot.classList.add("placed");
          slot.textContent = `${r.right}kg`;
          const left = r.left * r.leftAt;
          const right = r.right * pos;
          const tilt = Math.max(-7, Math.min(7, (right - left) * 1.5));
          plank.style.transform = `rotate(${tilt}deg)`;
          if (left === right) {
            plank.classList.add("solved");
            note.innerHTML = `🌟 Balanced! ${r.left} × ${r.leftAt} = ${r.right} × ${pos}`;
            n++;
            setTimeout(next, 2000);
            return;
          }
          tries++;
          const hint = `Left: ${r.left} × ${r.leftAt} = <b>${left}</b>. Right: ${r.right} × ${pos} = <b>${right}</b>.`;
          note.innerHTML = tries >= 3 ? `${hint}<br>👉 Try place <b>${r.answer}</b>!` : `${right > left ? "⬇️ Too far!" : "⬆️ Not far enough!"} ${hint}`;
        });
      } else slot.textContent = "";
      plank.append(slot);
    }
  };
  next();
}
