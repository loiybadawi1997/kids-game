import { randomLook } from "../game/character";
import { Level } from "../profiles";
import { AvatarPreview } from "../ui/avatarPreview";
import {
  CustomerResult,
  ITEMS,
  Item,
  MONEY,
  Order,
  SETTINGS,
  basketMatches,
  dayReward,
  itemsForLevel,
  makeOrder,
  priceMood,
} from "./shopData";

/*
 * Running the Fruit Shop for a day.
 *
 * Middle: for each customer, tap the fruit they ask for, add up the total
 *         and give the right change with coin and note buttons.
 * Big:    first buy fruit from the farmer with a budget and set the prices,
 *         then serve customers, then see how much profit the shop made.
 *
 * Mistakes are never punished: the customer gives a gentle hint, and after
 * a few tries shows the answer. Every day ends with coins for the child.
 */

export interface DayResult {
  reward: number;
  served: number;
  perfect: number;
  sales: number;
  stockCost: number;
  profit: number;
}

const GREETINGS = ["Hello! 👋", "Hi there! 😊", "Good morning! ☀️", "Hiya! 🙌", "Hello, shopkeeper! 🙂"];
const THANKS = ["Thank you! 😊", "Yummy! Thanks! 😋", "You're the best! 🌟", "Great shop! 💛", "See you soon! 👋"];

export function openShop(opts: { level: Level; childName: string; onClose: (result: DayResult | null) => void }): void {
  const level = opts.level;
  const random = Math.random;
  const results: CustomerResult[] = [];
  let till = 0; // money taken today
  let stockCost = 0;
  const stock = new Map<string, number>();
  const prices = new Map<string, number>();
  const customersToday = level === "middle" ? SETTINGS.middle.customers : SETTINGS.big.customers;
  let customerNumber = 0;

  // ---------------------------------------------------------------
  // Screen skeleton
  // ---------------------------------------------------------------
  const root = document.createElement("div");
  root.className = "overlay shop";
  root.innerHTML = `
    <div class="shop-top">
      <div class="shop-title">🍎 ${escapeHtml(opts.childName)}'s Fruit Shop</div>
      <div class="shop-stats"><span class="stat progress"></span><span class="stat till"></span></div>
      <button class="close-btn shop-close" aria-label="Close the shop">✖</button>
    </div>
    <div class="shop-main">
      <div class="shop-left">
        <div class="bubble order-bubble" hidden></div>
        <div class="customer-wrap"><canvas class="customer"></canvas></div>
        <div class="counter"></div>
      </div>
      <div class="shop-right"></div>
    </div>`;
  document.body.append(root);
  document.body.classList.add("fullscreen-menu");

  const preview = new AvatarPreview(root.querySelector(".customer") as HTMLCanvasElement, { stage: false });
  preview.autoTurn = false;
  preview.frameUpperBody();
  const customerWrap = root.querySelector(".customer-wrap") as HTMLDivElement;
  const bubble = root.querySelector(".order-bubble") as HTMLDivElement;
  const panel = root.querySelector(".shop-right") as HTMLDivElement;
  const progressEl = root.querySelector(".progress") as HTMLElement;
  const tillEl = root.querySelector(".till") as HTMLElement;

  const updateStats = () => {
    progressEl.textContent = customerNumber > 0 ? `🧑 ${Math.min(customerNumber, customersToday)} / ${customersToday}` : "🔔 Opening";
    tillEl.textContent = `💰 ${till}`;
  };
  updateStats();

  let closed = false;
  const close = (result: DayResult | null) => {
    if (closed) return;
    closed = true;
    preview.dispose();
    root.remove();
    document.body.classList.remove("fullscreen-menu");
    opts.onClose(result);
  };

  root.querySelector(".shop-close")!.addEventListener("click", () => {
    // Closing early still gives a reward for the customers already served.
    if (customerNumber > 1 || results.length > 0) showSummary(true);
    else close(null);
  });

  const say = (html: string) => {
    bubble.innerHTML = html;
    bubble.hidden = false;
    bubble.classList.remove("pop-in");
    void bubble.offsetWidth;
    bubble.classList.add("pop-in");
  };

  // ---------------------------------------------------------------
  // Big level: buy stock, then set prices
  // ---------------------------------------------------------------
  const showStock = () => {
    const budget = SETTINGS.big.budget;
    const qty = new Map<string, number>(ITEMS.map((it) => [it.id, 0]));
    const spent = () => ITEMS.reduce((sum, it) => sum + (qty.get(it.id) ?? 0) * it.cost, 0);
    customerWrap.classList.add("away");
    say(`🚚 The farmer is here!<br>You have <b>🪙 ${budget}</b> to buy fruit.`);
    const render = () => {
      const left = budget - spent();
      panel.innerHTML = `<h3>🚚 Buy fruit <span class="money-left">🪙 ${left} left</span></h3><div class="rows"></div>`;
      const rows = panel.querySelector(".rows") as HTMLDivElement;
      for (const it of ITEMS) {
        const n = qty.get(it.id) ?? 0;
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<span class="big-emoji">${it.emoji}</span><span class="row-text">${it.name}<small>🪙 ${it.cost} each</small></span>`;
        row.append(
          stepper(n, (d) => {
            const next = n + d;
            if (next < 0 || next > 12) return;
            if (d > 0 && spent() + it.cost > budget) {
              panel.querySelector(".money-left")!.classList.add("shake");
              return;
            }
            qty.set(it.id, next);
            render();
          }),
        );
        rows.append(row);
      }
      const total = [...qty.values()].reduce((a, b) => a + b, 0);
      const next = bigButton("Next ➡️", () => {
        stockCost = spent();
        for (const [id, n] of qty) if (n > 0) stock.set(id, n);
        showPrices();
      });
      next.disabled = total < 4;
      const hint = document.createElement("p");
      hint.className = "hint-text";
      hint.textContent = total < 4 ? "Buy at least 4 fruits 🍎" : `You spend 🪙 ${spent()}`;
      panel.append(hint, next);
    };
    render();
  };

  const showPrices = () => {
    for (const id of stock.keys()) {
      const it = ITEMS.find((i) => i.id === id)!;
      prices.set(id, it.cost * 2);
    }
    say(`🏷️ Now choose your prices!<br>Too high, and people won't buy. 🤔`);
    const faces = { cheap: "🤑 Cheap", fair: "😀 Good", pricey: "🤔 High", tooMuch: "😟 Too high" };
    const render = () => {
      panel.innerHTML = `<h3>🏷️ Set prices</h3><div class="rows"></div>`;
      const rows = panel.querySelector(".rows") as HTMLDivElement;
      for (const [id, n] of stock) {
        const it = ITEMS.find((i) => i.id === id)!;
        const price = prices.get(id)!;
        const mood = priceMood(it, price);
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<span class="big-emoji">${it.emoji}</span><span class="row-text">×${n}<small>cost 🪙 ${it.cost}</small></span><span class="mood ${mood}">${faces[mood]}</span>`;
        row.append(
          stepper(price, (d) => {
            const next = price + d;
            if (next < 1 || next > it.cost * 5) return;
            prices.set(id, next);
            render();
          }, "🪙 "),
        );
        rows.append(row);
      }
      panel.append(bigButton("🔔 Open the shop!", () => nextCustomer()));
    };
    render();
  };

  // ---------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------
  const stockLeft = () => [...stock.values()].reduce((a, b) => a + b, 0);

  const nextCustomer = () => {
    if (customerNumber >= customersToday || (level === "big" && stockLeft() === 0)) {
      showSummary(false);
      return;
    }
    customerNumber++;
    updateStats();
    panel.innerHTML = "";
    bubble.hidden = true;

    // A new customer walks in from the side.
    preview.show(randomLook(random));
    preview.setWalking(true);
    customerWrap.classList.remove("away", "leave");
    customerWrap.classList.add("arrive");
    setTimeout(() => {
      preview.setWalking(false);
      customerWrap.classList.remove("arrive");
      const order = level === "big" ? makeOrder(level, random, stock, prices) : makeOrder(level, random);
      if (order.lines.length === 0) {
        const why = order.refused.length ? `${order.refused.map((l) => l.item.emoji).join(" ")} is too expensive! 😟` : "Oh, it's all sold out! 😮";
        say(`${why}<br>Maybe next time!`);
        results.push({ firstTry: false, sale: 0 });
        panel.innerHTML = `<p class="big-message">😟 They didn't buy anything.</p><p class="hint-text">Lower prices make people happy to buy!</p>`;
        setTimeout(leaveAndNext, 2600);
        return;
      }
      serve(order);
    }, 1300);
  };

  const leaveAndNext = () => {
    preview.setWalking(true);
    customerWrap.classList.add("leave");
    setTimeout(nextCustomer, 900);
  };

  const orderHtml = (order: Order) =>
    order.lines
      .map((l) => {
        const pics = level === "middle" ? l.item.emoji.repeat(l.qty) : `${l.item.emoji} ×${l.qty}`;
        return `<span class="want">${pics}</span>`;
      })
      .join("");

  const serve = (order: Order) => {
    let mistakes = 0;
    const greet = GREETINGS[Math.floor(random() * GREETINGS.length)];
    const refusedText = order.refused.length ? `<small>(${order.refused.map((l) => l.item.emoji).join("")} is too expensive 😟)</small><br>` : "";
    say(`${greet} I'd like:<br>${refusedText}${orderHtml(order)}`);

    // --- Step 1: pick the fruit ---
    const basket = new Map<string, number>();
    const pickStep = () => {
      panel.innerHTML = `<h3>👆 Tap what they want</h3><div class="shelf"></div><div class="basket"><span class="basket-icon">🧺</span><span class="basket-items"></span></div>`;
      const shelf = panel.querySelector(".shelf") as HTMLDivElement;
      const basketEl = panel.querySelector(".basket-items") as HTMLSpanElement;
      const items = level === "big" ? ITEMS.filter((it) => (stock.get(it.id) ?? 0) > 0) : itemsForLevel(level);
      const renderBasket = () => {
        basketEl.innerHTML = "";
        for (const [id, n] of basket) {
          const it = ITEMS.find((i) => i.id === id)!;
          for (let i = 0; i < n; i++) {
            const b = document.createElement("button");
            b.className = "basket-item";
            b.textContent = it.emoji;
            b.setAttribute("aria-label", `Take out ${it.name}`);
            b.addEventListener("click", () => {
              basket.set(id, (basket.get(id) ?? 1) - 1);
              if (basket.get(id) === 0) basket.delete(id);
              renderBasket();
            });
            basketEl.append(b);
          }
        }
        if (basket.size === 0) basketEl.innerHTML = `<span class="hint-text">Tap fruit to put it here</span>`;
      };
      for (const it of items) {
        const price = level === "middle" ? it.middlePrice : prices.get(it.id)!;
        const b = document.createElement("button");
        b.className = "item-btn";
        b.innerHTML = `<span class="item-emoji">${it.emoji}</span><span class="price-tag">🪙 ${price}</span>`;
        b.addEventListener("click", () => {
          if ([...basket.values()].reduce((a, c) => a + c, 0) >= 12) return;
          basket.set(it.id, (basket.get(it.id) ?? 0) + 1);
          renderBasket();
        });
        shelf.append(b);
      }
      renderBasket();
      panel.append(
        bigButton("✅ That's it!", () => {
          if (basketMatches(order, basket)) {
            totalStep();
            return;
          }
          mistakes++;
          say(`${pickHint(order, basket)}<br>${orderHtml(order)}`);
        }),
      );
    };

    // --- Step 2: add up the total ---
    const totalStep = () => {
      let tries = 0;
      const sum =
        level === "middle"
          ? order.lines.flatMap((l) => Array.from({ length: l.qty }, () => `${l.item.emoji}<b>${l.price}</b>`)).join(" + ") + " = ?"
          : order.lines.map((l) => `${l.item.emoji} ${l.qty} × 🪙${l.price}`).join(" &nbsp;+&nbsp; ") + " = ?";
      panel.innerHTML = `<h3>🧮 How much is it?</h3><p class="sum">${sum}</p>`;
      say(`How much is that? 🤔<br>${orderHtml(order)}`);
      const pad = numberPad((value) => {
        if (value === order.total) {
          payStep();
          return true;
        }
        tries++;
        mistakes++;
        if (tries >= 3) {
          say(`It's <b>🪙 ${order.total}</b>! ✨<br>${explainTotal(order)}`);
          setTimeout(payStep, 2600);
          return true;
        }
        say(tries === 1 ? "Hmm, try again! 💪" : `Almost! Count slowly 🐢<br>${explainTotal(order)}`);
        return false;
      });
      panel.append(pad);
    };

    // --- Step 3: give change ---
    const payStep = () => {
      const change = order.pays - order.total;
      let tries = 0;
      const tray: number[] = [];
      say(`Here you go! 💵<br>${moneyHtml(order.pays, "pay")}`);
      const render = () => {
        const inTray = tray.reduce((a, b) => a + b, 0);
        panel.innerHTML = `
          <h3>💰 Give the change</h3>
          <p class="sum">${level === "middle" ? `${order.pays} − ${order.total} = ?` : `They paid 🪙 ${order.pays}. It costs 🪙 ${order.total}.`}</p>
          <div class="money-buttons"></div>
          <div class="tray"><span class="tray-items"></span>${level === "middle" ? `<span class="tray-total">= 🪙 ${inTray}</span>` : ""}</div>`;
        const buttons = panel.querySelector(".money-buttons") as HTMLDivElement;
        for (const value of MONEY.filter((v) => v < order.pays)) {
          const b = document.createElement("button");
          b.className = "money-btn";
          b.innerHTML = moneyHtml(value);
          b.addEventListener("click", () => {
            if (tray.length >= 15) return;
            tray.push(value);
            render();
          });
          buttons.append(b);
        }
        const trayEl = panel.querySelector(".tray-items") as HTMLSpanElement;
        tray.forEach((value, i) => {
          const b = document.createElement("button");
          b.className = "tray-money";
          b.innerHTML = moneyHtml(value);
          b.setAttribute("aria-label", "Take back");
          b.addEventListener("click", () => {
            tray.splice(i, 1);
            render();
          });
          trayEl.append(b);
        });
        if (tray.length === 0) trayEl.innerHTML = `<span class="hint-text">Tap coins to give them</span>`;
        panel.append(
          bigButton("✅ Give change", () => {
            const given = tray.reduce((a, b) => a + b, 0);
            if (given === change) {
              happy();
              return;
            }
            tries++;
            mistakes++;
            if (tries >= 3) {
              say(`The change is <b>🪙 ${change}</b>! ✨<br>${order.pays} − ${order.total} = ${change}`);
              setTimeout(happy, 2600);
              return;
            }
            say(given < change ? "A little more, please! ➕" : "Oops, that's too much! ➖");
          }),
        );
      };
      render();
    };

    // --- Done: a happy customer ---
    const happy = () => {
      till += order.total;
      for (const l of order.lines) stock.set(l.item.id, Math.max(0, (stock.get(l.item.id) ?? 0) - l.qty));
      results.push({ firstTry: mistakes === 0, sale: order.total });
      updateStats();
      preview.wave();
      say(`${THANKS[Math.floor(random() * THANKS.length)]}${mistakes === 0 ? "<br>⭐ Perfect!" : ""}`);
      panel.innerHTML = `<p class="big-message">${mistakes === 0 ? "🌟 Perfect!" : "😊 Well done!"}</p><p class="till-add">+ 🪙 ${order.total} in the till</p>`;
      setTimeout(leaveAndNext, 2000);
    };

    pickStep();
  };

  // ---------------------------------------------------------------
  // End of the day
  // ---------------------------------------------------------------
  const showSummary = (early: boolean) => {
    const served = results.filter((r) => r.sale > 0).length;
    const perfect = results.filter((r) => r.firstTry).length;
    const profit = till - stockCost;
    const reward = dayReward(level, results.filter((r) => r.sale > 0), profit);
    customerWrap.classList.remove("leave", "arrive");
    customerWrap.classList.add("away");
    bubble.hidden = true;
    const stars = "⭐".repeat(Math.max(1, Math.min(3, Math.ceil((perfect / Math.max(1, results.length)) * 3))));
    const leftovers = [...stock].filter(([, n]) => n > 0).map(([id, n]) => `${ITEMS.find((i) => i.id === id)!.emoji}×${n}`).join(" ");
    panel.innerHTML = `
      <div class="summary">
        <h2>${early ? "🏁 Shop closed!" : "🎉 What a great day!"}</h2>
        <div class="stars">${stars}</div>
        <div class="summary-rows">
          <div>🧑 Customers: <b>${served}</b></div>
          <div>🌟 Perfect: <b>${perfect}</b></div>
          ${
            level === "big"
              ? `<div>💰 Sales: <b>🪙 ${till}</b></div>
                 <div>🚚 Fruit cost: <b>🪙 ${stockCost}</b></div>
                 <div class="profit ${profit >= 0 ? "good" : "bad"}">📈 Profit: <b>🪙 ${profit}</b></div>
                 ${leftovers ? `<div class="hint-text">Left over: ${leftovers}</div>` : ""}`
              : `<div>💰 Money taken: <b>🪙 ${till}</b></div>`
          }
        </div>
        <div class="reward">+ 🪙 ${reward} for you!</div>
      </div>`;
    panel.querySelector(".summary")!.append(bigButton("🏠 Back to town", () => close({ reward, served, perfect, sales: till, stockCost, profit })));
    confetti(root);
  };

  // Start the day.
  if (level === "big") showStock();
  else {
    say(`🔔 Your shop is open, ${escapeHtml(opts.childName)}!<br>Here comes a customer!`);
    setTimeout(nextCustomer, 1400);
  }
}

// -----------------------------------------------------------------
// Little helpers
// -----------------------------------------------------------------

/** A friendly hint about what is wrong with the basket. */
function pickHint(order: Order, basket: Map<string, number>): string {
  for (const [id, n] of basket) {
    const line = order.lines.find((l) => l.item.id === id);
    const it = ITEMS.find((i) => i.id === id)!;
    if (!line) return `I didn't ask for ${it.emoji}! 🙈`;
    if (n > line.qty) return `Too many ${it.emoji}! ➖`;
  }
  for (const l of order.lines) {
    if ((basket.get(l.item.id) ?? 0) < l.qty) return `I need more ${l.item.emoji}, please! ➕`;
  }
  return "Hmm, look again! 🤔";
}

function explainTotal(order: Order): string {
  return order.lines.map((l) => (l.qty > 1 ? `${l.qty}×${l.price}` : `${l.price}`)).join(" + ") + ` = ${order.total}`;
}

/** A picture of a coin (1, 2, 5, 10) or a note (20, 50). */
function moneyHtml(value: number, extra = ""): string {
  const note = value >= 20;
  return `<span class="money ${note ? "note" : "coin"} v${value} ${extra}">${note ? "💵 " : ""}${value}</span>`;
}

function bigButton(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "big-btn";
  b.innerHTML = label;
  b.addEventListener("click", onClick);
  return b;
}

/** A − value + control. */
function stepper(value: number, change: (delta: number) => void, prefix = ""): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "stepper";
  const minus = document.createElement("button");
  minus.textContent = "−";
  minus.setAttribute("aria-label", "Less");
  minus.addEventListener("click", () => change(-1));
  const v = document.createElement("span");
  v.className = "stepper-value";
  v.textContent = `${prefix}${value}`;
  const plus = document.createElement("button");
  plus.textContent = "+";
  plus.setAttribute("aria-label", "More");
  plus.addEventListener("click", () => change(1));
  wrap.append(minus, v, plus);
  return wrap;
}

/** Big number buttons. `submit` returns true when the answer is accepted. */
function numberPad(submit: (value: number) => boolean): HTMLDivElement {
  let text = "";
  const wrap = document.createElement("div");
  wrap.className = "numpad-wrap";
  const display = document.createElement("div");
  display.className = "numpad-display";
  const grid = document.createElement("div");
  grid.className = "numpad";
  const refresh = () => (display.textContent = text ? `🪙 ${text}` : "🪙 ?");
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✅"];
  for (const k of keys) {
    const b = document.createElement("button");
    b.textContent = k;
    if (k === "✅") b.className = "ok";
    b.addEventListener("click", () => {
      if (k === "⌫") text = text.slice(0, -1);
      else if (k === "✅") {
        if (!text) return;
        if (!submit(Number(text))) {
          display.classList.remove("shake");
          void display.offsetWidth;
          display.classList.add("shake");
          text = "";
        }
      } else if (text.length < 3) text += k;
      refresh();
    });
    grid.append(b);
  }
  refresh();
  wrap.append(display, grid);
  return wrap;
}

function confetti(root: HTMLElement): void {
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type { Item };
