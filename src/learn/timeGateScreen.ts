import { Level } from "../profiles";
import { PLACES, Place, Task } from "./timeGateData";
import { askQuestion, bigButton, openActivityScreen, orderTask, showReward } from "./ui";

/*
 * Time Gate: step through the gate to a real place in history, meet a
 * guide, and help them in four little scenes. Finishing a place for the
 * first time wins a rare decoration.
 */

export interface TimeGateResult {
  coins: number;
  /** Places finished on this visit. */
  finished: string[];
  /** Prize decorations won on this visit. */
  items: string[];
}

export function openTimeGate(opts: { level: Level; childName: string; quests: string[]; onClose: (r: TimeGateResult | null) => void }): void {
  const level = opts.level;
  const doneBefore = new Set(opts.quests);
  const result: TimeGateResult = { coins: 0, finished: [], items: [] };

  const screen = openActivityScreen("⏳ Time Gate", "timegate", () => {
    screen.close();
    opts.onClose(result.finished.length > 0 ? result : null);
  });

  const showPlaces = () => {
    screen.stats.innerHTML = result.coins ? `<span class="stat">🪙 ${result.coins}</span>` : "";
    screen.main.innerHTML = `
      <div class="tg-menu">
        <p class="question-text">🌀 Where shall we travel, ${opts.childName}?</p>
        <div class="tg-places"></div>
      </div>`;
    const list = screen.main.querySelector(".tg-places") as HTMLDivElement;
    for (const place of PLACES) {
      const finished = doneBefore.has(place.id);
      const b = document.createElement("button");
      b.className = `tg-place${finished ? " finished" : ""}`;
      b.innerHTML = `
        <span class="tg-emoji">${place.emoji}</span>
        <b>${place.name}</b>
        <small>${place.when}</small>
        <span class="tg-prize">${finished ? `✅ ${place.prize.emoji}` : `🎁 ${place.prize.emoji}?`}</span>`;
      b.addEventListener("click", () => travel(place));
      list.append(b);
    }
  };

  const travel = (place: Place) => {
    screen.main.innerHTML = `<div class="tg-warp"><span>🌀</span><p>${place.emoji} ${place.name}…</p></div>`;
    setTimeout(() => quest(place), 1300);
  };

  const quest = (place: Place) => {
    let scene = 0;
    let firstTries = 0;
    const runScene = () => {
      if (scene >= place.scenes.length) return finishQuest();
      screen.stats.innerHTML = `<span class="stat">${place.emoji} ${scene + 1} / ${place.scenes.length}</span>`;
      const s = place.scenes[scene];
      screen.main.innerHTML = `
        <div class="tg-scene tg-${place.id}">
          <div class="tg-guide"><span class="tg-guide-emoji">${place.guide.emoji}</span><small>${place.guide.name}</small></div>
          <div class="tg-right">
            <div class="bubble tg-story"></div>
            <div class="tg-task"></div>
          </div>
        </div>`;
      screen.main.querySelector(".tg-story")!.textContent = s.story;
      const taskEl = screen.main.querySelector(".tg-task") as HTMLDivElement;
      const task: Task = level === "middle" ? s.middle : s.big;
      const next = (firstTry: boolean) => {
        if (firstTry) firstTries++;
        scene++;
        runScene();
      };
      if (task.order) orderTask(taskEl, task.order.title, task.order.steps, next);
      else if (task.question) askQuestion(taskEl, task.question, next);
      else next(true);
    };

    const finishQuest = () => {
      const firstTime = !doneBefore.has(place.id);
      const coins = (firstTime ? 12 : 6) + firstTries * 2;
      result.coins += coins;
      if (!result.finished.includes(place.id)) result.finished.push(place.id);
      if (firstTime) {
        doneBefore.add(place.id);
        result.items.push(place.prize.id);
      }
      screen.stats.innerHTML = "";
      showReward(screen.main, {
        title: `🎉 ${place.name}: quest done!`,
        stars: Math.ceil((firstTries / place.scenes.length) * 3),
        rows: [`${place.guide.emoji} Helped: <b>${place.guide.name}</b>`, `🌟 First try: <b>${firstTries} / ${place.scenes.length}</b>`],
        extra: firstTime ? `🎁 You won a rare decoration: <b>${place.prize.emoji} ${place.prize.name}</b>` : undefined,
        coins,
        button: "🏠 Back to town",
        onDone: () => {
          screen.close();
          opts.onClose(result);
        },
      });
      screen.main.querySelector(".summary")!.append(bigButton("🌀 Another trip", showPlaces, "secondary"));
    };

    runScene();
  };

  showPlaces();
}
