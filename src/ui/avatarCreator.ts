import {
  BOTTOM_COLORS,
  CLOTHES_COLORS,
  CharacterLook,
  EYE_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  HairStyle,
  Hat,
  OUTFITS,
  Outfit,
  SHOE_COLORS,
  SKIN_TONES,
  randomLook,
} from "../game/character";
import { Level, Profile } from "../profiles";
import { AvatarPreview } from "./avatarPreview";

/*
 * The avatar creator: a turning 3D preview on the left, simple picture
 * buttons on the right. Words are short and every button has an icon,
 * so a 7-year-old can use it.
 */

export interface CreatorResult {
  name: string;
  level: Level;
  look: CharacterLook;
  portrait: string;
}

const HAIR_LABELS: Record<HairStyle, string> = {
  short: "✂️ Short",
  spiky: "⚡ Spiky",
  long: "🌊 Long",
  ponytail: "🎀 Pony",
  buns: "🍡 Buns",
  curly: "🌀 Curly",
  bob: "💫 Bob",
};
const OUTFIT_LABELS: Record<Outfit, string> = { tee: "👕 T-shirt", hoodie: "🧥 Hoodie", dress: "👗 Dress", overalls: "👖 Overalls" };
const HAT_LABELS: Record<Hat, string> = { none: "🚫 None", cap: "🧢 Cap", beanie: "🧶 Beanie", bow: "🎀 Bow", crown: "👑 Crown" };

type Tab = "me" | "face" | "hair" | "clothes" | "hat";
const TABS: [Tab, string][] = [
  ["me", "✏️ Me"],
  ["face", "🙂 Face"],
  ["hair", "💇 Hair"],
  ["clothes", "👕 Clothes"],
  ["hat", "🧢 Hat"],
];

export function openAvatarCreator(opts: {
  profile?: Profile;
  onDone: (result: CreatorResult) => void;
  onCancel: () => void;
  onDelete?: () => void;
}): void {
  const editing = opts.profile;
  const look: CharacterLook = editing ? { ...editing.look } : randomLook(Math.random);
  let name = editing?.name ?? "";
  let level: Level = editing?.level ?? "middle";
  let tab: Tab = "me";

  const root = document.createElement("div");
  root.className = "overlay creator";
  root.innerHTML = `
    <div class="creator-card">
      <div class="creator-left">
        <canvas class="preview" aria-label="Your avatar"></canvas>
        <button class="choice surprise">🎲 Surprise!</button>
      </div>
      <div class="creator-right">
        <div class="tabs"></div>
        <div class="tab-body"></div>
        <div class="bottom-bar"></div>
      </div>
    </div>`;
  document.body.append(root);
  document.body.classList.add("fullscreen-menu");

  const preview = new AvatarPreview(root.querySelector(".preview") as HTMLCanvasElement);
  preview.show(look);
  const tabsEl = root.querySelector(".tabs") as HTMLDivElement;
  const body = root.querySelector(".tab-body") as HTMLDivElement;
  const bar = root.querySelector(".bottom-bar") as HTMLDivElement;

  const close = () => {
    preview.dispose();
    root.remove();
    document.body.classList.remove("fullscreen-menu");
  };

  const update = () => preview.show(look);

  root.querySelector(".surprise")!.addEventListener("click", () => {
    Object.assign(look, randomLook(Math.random));
    update();
    preview.wave();
    renderBody();
  });

  // --- Tabs ---
  const renderTabs = () => {
    tabsEl.innerHTML = "";
    for (const [id, label] of TABS) {
      const b = document.createElement("button");
      b.className = "tab" + (id === tab ? " selected" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        tab = id;
        renderTabs();
        renderBody();
      });
      tabsEl.append(b);
    }
  };

  // --- Helpers that build rows of buttons ---
  const section = (title: string) => {
    const p = document.createElement("p");
    p.className = "label";
    p.textContent = title;
    body.append(p);
    const row = document.createElement("div");
    row.className = "choice-row";
    body.append(row);
    return row;
  };

  const swatches = (title: string, colors: string[], get: () => string, set: (c: string) => void) => {
    const row = section(title);
    for (const c of colors) {
      const b = document.createElement("button");
      b.className = "swatch" + (get() === c ? " selected" : "");
      b.style.background = c;
      b.setAttribute("aria-label", c);
      b.addEventListener("click", () => {
        set(c);
        update();
        for (const other of row.children) other.classList.remove("selected");
        b.classList.add("selected");
      });
      row.append(b);
    }
  };

  const options = <T extends string>(title: string, values: readonly T[], labels: Record<T, string>, get: () => T, set: (v: T) => void) => {
    const row = section(title);
    for (const v of values) {
      const b = document.createElement("button");
      b.className = "choice" + (get() === v ? " selected" : "");
      b.textContent = labels[v];
      b.addEventListener("click", () => {
        set(v);
        update();
        preview.wave();
        for (const other of row.children) other.classList.remove("selected");
        b.classList.add("selected");
      });
      row.append(b);
    }
  };

  // --- Tab contents ---
  const renderBody = () => {
    body.innerHTML = "";
    if (tab === "me") {
      const p = document.createElement("p");
      p.className = "label";
      p.textContent = "✏️ My name";
      const input = document.createElement("input");
      input.className = "name-input";
      input.maxLength = 12;
      input.placeholder = "Type your name";
      input.value = name;
      input.autocomplete = "off";
      input.addEventListener("input", () => {
        name = input.value.trim();
        renderBar();
      });
      body.append(p, input);
      const row = section("🎯 My level");
      const levels: [Level, string, string][] = [
        ["middle", "⭐ Middle", "age 7–8"],
        ["big", "🌟 Big", "age 9–10"],
      ];
      for (const [value, label, age] of levels) {
        const b = document.createElement("button");
        b.className = "choice level" + (level === value ? " selected" : "");
        b.innerHTML = `${label}<small>${age}</small>`;
        b.addEventListener("click", () => {
          level = value;
          for (const other of row.children) other.classList.remove("selected");
          b.classList.add("selected");
        });
        row.append(b);
      }
    } else if (tab === "face") {
      swatches("🙂 Skin", SKIN_TONES, () => look.skin, (c) => (look.skin = c));
      swatches("👀 Eyes", EYE_COLORS, () => look.eyeColor, (c) => (look.eyeColor = c));
    } else if (tab === "hair") {
      options("💇 Hair style", HAIR_STYLES, HAIR_LABELS, () => look.hair, (v) => (look.hair = v));
      swatches("🎨 Hair colour", HAIR_COLORS, () => look.hairColor, (c) => (look.hairColor = c));
    } else if (tab === "clothes") {
      options("👕 Clothes", OUTFITS, OUTFIT_LABELS, () => look.outfit, (v) => (look.outfit = v));
      swatches("🎨 Top", CLOTHES_COLORS, () => look.top, (c) => (look.top = c));
      swatches("🎨 Trousers", BOTTOM_COLORS, () => look.bottom, (c) => (look.bottom = c));
      swatches("👟 Shoes", SHOE_COLORS, () => look.shoes, (c) => (look.shoes = c));
    } else {
      options("🧢 Hat", HATS, HAT_LABELS, () => look.hat, (v) => (look.hat = v));
      swatches("🎨 Hat colour", CLOTHES_COLORS, () => look.hatColor, (c) => (look.hatColor = c));
    }
  };

  // --- Bottom buttons ---
  const renderBar = (confirmDelete = false) => {
    bar.innerHTML = "";
    if (confirmDelete && editing) {
      const q = document.createElement("span");
      q.className = "confirm-text";
      q.textContent = `🗑️ Delete ${editing.name}?`;
      const yes = button("✅ Yes", "big-btn danger", () => {
        close();
        opts.onDelete?.();
      });
      const no = button("❌ No", "big-btn secondary", () => renderBar());
      bar.append(q, yes, no);
      return;
    }
    if (editing && opts.onDelete) bar.append(button("🗑️", "big-btn danger small", () => renderBar(true), "Delete"));
    bar.append(
      button("⬅️ Back", "big-btn secondary", () => {
        close();
        opts.onCancel();
      }),
    );
    const done = button("✅ Done!", "big-btn", () => {
      if (!name) {
        tab = "me";
        renderTabs();
        renderBody();
        const input = body.querySelector(".name-input") as HTMLInputElement;
        input.classList.add("shake");
        input.focus();
        setTimeout(() => input.classList.remove("shake"), 500);
        return;
      }
      const portrait = preview.portrait();
      close();
      opts.onDone({ name, level, look, portrait });
    });
    bar.append(done);
  };

  renderTabs();
  renderBody();
  renderBar();
}

function button(label: string, className: string, onClick: () => void, aria?: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = className;
  b.textContent = label;
  if (aria) b.setAttribute("aria-label", aria);
  b.addEventListener("click", onClick);
  return b;
}
