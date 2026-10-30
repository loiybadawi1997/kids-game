/*
 * Small building blocks shared by the learning activities
 * (Inventor's Workshop, Explorer's Island, Time Gate).
 *
 * Every activity is a full-screen 2D screen over the town, with a coloured
 * top bar, a ✖ button, and a reward screen at the end.
 */

export interface ActivityScreen {
  root: HTMLDivElement;
  /** The area under the top bar where the activity draws itself. */
  main: HTMLDivElement;
  /** Little badges in the top bar (progress, coins...). */
  stats: HTMLDivElement;
  /** Remove the screen. */
  close(): void;
}

/** Open a full-screen activity. `theme` is a CSS class that sets its colours. */
export function openActivityScreen(title: string, theme: string, onCloseTap: () => void): ActivityScreen {
  const root = document.createElement("div");
  root.className = `overlay activity ${theme}`;
  root.innerHTML = `
    <div class="activity-top">
      <div class="activity-title"></div>
      <div class="activity-stats"></div>
      <button class="close-btn activity-close" aria-label="Close">✖</button>
    </div>
    <div class="activity-main"></div>`;
  root.querySelector(".activity-title")!.textContent = title;
  document.body.append(root);
  document.body.classList.add("fullscreen-menu");
  root.querySelector(".activity-close")!.addEventListener("click", onCloseTap);
  let closed = false;
  return {
    root,
    main: root.querySelector(".activity-main") as HTMLDivElement,
    stats: root.querySelector(".activity-stats") as HTMLDivElement,
    close() {
      if (closed) return;
      closed = true;
      root.remove();
      document.body.classList.remove("fullscreen-menu");
    },
  };
}

export function bigButton(label: string, onClick: () => void, extraClass = ""): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = `big-btn ${extraClass}`.trim();
  b.innerHTML = label;
  b.addEventListener("click", onClick);
  return b;
}

export function shake(el: Element): void {
  el.classList.remove("shake");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("shake");
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Question {
  q: string;
  /** The answers (with an emoji each). The first one is the right one; they are shuffled on screen. */
  options: string[];
}

/**
 * Ask a question with big answer buttons. A wrong answer just greys out
 * (no telling off), so the child can try again. `done` gets true if the
 * first answer was right.
 */
export function askQuestion(container: HTMLElement, question: Question, done: (firstTry: boolean) => void): void {
  let wrong = 0;
  const wrap = document.createElement("div");
  wrap.className = "question";
  wrap.innerHTML = `<p class="question-text"></p><div class="answers"></div><p class="answer-note hint-text"></p>`;
  wrap.querySelector(".question-text")!.innerHTML = question.q;
  const answers = wrap.querySelector(".answers") as HTMLDivElement;
  const note = wrap.querySelector(".answer-note") as HTMLElement;
  const right = question.options[0];
  for (const option of shuffle(question.options)) {
    const b = document.createElement("button");
    b.className = "answer-btn";
    b.innerHTML = option;
    b.addEventListener("click", () => {
      if (wrap.classList.contains("answered")) return;
      if (option === right) {
        wrap.classList.add("answered");
        b.classList.add("right");
        note.textContent = wrong === 0 ? "🌟 Yes! Well done!" : "👍 Yes, that's it!";
        setTimeout(() => done(wrong === 0), 1100);
      } else {
        wrong++;
        b.classList.add("wrong");
        b.disabled = true;
        note.textContent = "🤔 Not that one. Try again!";
      }
    });
    answers.append(b);
  }
  container.append(wrap);
}

/**
 * Tap the cards in the right order (first, second, third...).
 * `steps` are given in the right order; they are shuffled on screen.
 */
export function orderTask(container: HTMLElement, title: string, steps: string[], done: (firstTry: boolean) => void): void {
  let next = 0;
  let mistakes = 0;
  const wrap = document.createElement("div");
  wrap.className = "order-task";
  wrap.innerHTML = `<p class="question-text"></p><div class="order-slots"></div><div class="order-cards"></div><p class="answer-note hint-text">👆 Tap the first one!</p>`;
  wrap.querySelector(".question-text")!.innerHTML = title;
  const slots = wrap.querySelector(".order-slots") as HTMLDivElement;
  const cards = wrap.querySelector(".order-cards") as HTMLDivElement;
  const note = wrap.querySelector(".answer-note") as HTMLElement;
  steps.forEach((_, i) => {
    const s = document.createElement("div");
    s.className = "order-slot";
    s.textContent = `${i + 1}`;
    slots.append(s);
  });
  for (const step of shuffle(steps)) {
    const b = document.createElement("button");
    b.className = "answer-btn";
    b.innerHTML = step;
    b.addEventListener("click", () => {
      if (step === steps[next]) {
        const slot = slots.children[next] as HTMLElement;
        slot.innerHTML = `<b>${next + 1}</b> ${step}`;
        slot.classList.add("filled");
        b.remove();
        next++;
        if (next === steps.length) {
          note.textContent = mistakes === 0 ? "🌟 Perfect order!" : "👍 You did it!";
          setTimeout(() => done(mistakes === 0), 1100);
        } else note.textContent = "👍 Good! What comes next?";
      } else {
        mistakes++;
        shake(b);
        note.textContent = "🤔 Not yet. What comes before that?";
      }
    });
    cards.append(b);
  }
  container.append(wrap);
}

/** The reward screen that ends every activity. */
export function showReward(
  container: HTMLElement,
  opts: { title: string; stars: number; rows: string[]; coins: number; extra?: string; button: string; onDone: () => void },
): void {
  container.innerHTML = `
    <div class="summary activity-summary">
      <h2></h2>
      <div class="stars">${"⭐".repeat(Math.max(1, Math.min(3, opts.stars)))}</div>
      <div class="summary-rows">${opts.rows.map((r) => `<div>${r}</div>`).join("")}</div>
      ${opts.extra ? `<div class="won-item">${opts.extra}</div>` : ""}
      <div class="reward">+ 🪙 ${opts.coins} for you!</div>
    </div>`;
  container.querySelector("h2")!.textContent = opts.title;
  container.querySelector(".summary")!.append(bigButton(opts.button, opts.onDone));
  confetti(container);
}

export function confetti(root: HTMLElement): void {
  const colors = ["#ff6b6b", "#ffd43b", "#51cf66", "#4dabf7", "#cc5de8", "#ff922b"];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    c.textContent = i % 5 === 0 ? "🪙" : "";
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = i % 5 === 0 ? "transparent" : colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.8}s`;
    c.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    root.append(c);
    setTimeout(() => c.remove(), 4500);
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
