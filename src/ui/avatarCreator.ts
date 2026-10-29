import {
  ACCENT_COLORS,
  ARCHETYPES,
  Archetype,
  BACK_STYLES,
  BackStyle,
  CharacterLook,
  FINISHES,
  Finish,
  GLOW_COLORS,
  HEAD_STYLES,
  HeadStyle,
  POSES,
  PRIMARY_COLORS,
  Pose,
  SECONDARY_COLORS,
  SHOULDER_STYLES,
  ShoulderStyle,
  TORSO_STYLES,
  TorsoStyle,
  WEAPON_STYLES,
  WeaponStyle,
  normalizeLook,
  presetLook,
  randomLook,
} from "../game/character";
import { Level, Profile } from "../profiles";
import { AvatarPreview } from "./avatarPreview";

/*
 * The hero creator: a turning 3D preview on the left, simple picture
 * buttons on the right. Words are short and every button has an icon,
 * so a 7-year-old can use it.
 */

export interface CreatorResult {
  name: string;
  level: Level;
  look: CharacterLook;
  portrait: string;
}

const HERO_LABELS: Record<Archetype, string> = { mecha: "🤖 Mecha", knight: "🛡️ Knight", cyberpunk: "😎 Cyber", sorcerer: "🧙 Wizard", bot: "🔵 Bot" };
const POSE_LABELS: Record<Pose, string> = { idle: "🙂 Relaxed", heroic: "🦸 Heroic", salute: "🫡 Salute", combat: "💪 Ready" };
const HEAD_LABELS: Record<HeadStyle, string> = { visor: "🥽 Visor", horned_helm: "🐂 Horns", cyber_goggles: "👓 Goggles", hooded_cowl: "🧙 Hood", bot_dome: "🔵 Dome" };
const TORSO_LABELS: Record<TorsoStyle, string> = { cyber_reactor: "⚡ Reactor", chiseled_cuirass: "🛡️ Armour", tactical_vest: "🦺 Vest", robed_chest: "👘 Robe", orb_core: "⚪ Orb" };
const SHOULDER_LABELS: Record<ShoulderStyle, string> = { blade_wings: "🪽 Wings", spiked_pauldrons: "⛰️ Spikes", curved_guards: "🌙 Guards", compact_joints: "🔩 Small", none: "🚫 None" };
const BACK_LABELS: Record<BackStyle, string> = { twin_thrusters: "🚀 Jets", energy_cape: "🦸 Cape", power_battery: "🔋 Battery", floating_orbs: "🔮 Orbs", none: "🚫 None" };
const WEAPON_LABELS: Record<WeaponStyle, string> = { plasma_sword: "⚔️ Sword", pulse_blaster: "🔫 Blaster", crystal_staff: "🪄 Staff", aegis_shield: "🛡️ Shield", none: "🚫 None" };
const FINISH_LABELS: Record<Finish, string> = { brushed_metal: "🔧 Metal", matte_armor: "🧱 Matte", gloss_car: "✨ Shiny", carbon_weave: "🕸️ Carbon", hex_tech: "⬡ Hex" };

type Tab = "me" | "hero" | "head" | "body" | "gear" | "colours";
const TABS: [Tab, string][] = [
  ["me", "✏️ Me"],
  ["hero", "🦸 Hero"],
  ["head", "🪖 Head"],
  ["body", "🦺 Body"],
  ["gear", "🎒 Gear"],
  ["colours", "🎨 Colours"],
];

export function openAvatarCreator(opts: {
  profile?: Profile;
  onDone: (result: CreatorResult) => void;
  onCancel: () => void;
  onDelete?: () => void;
}): void {
  const editing = opts.profile;
  const look: CharacterLook = editing ? normalizeLook(editing.look) : randomLook(Math.random);
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
    } else if (tab === "hero") {
      const row = section("🦸 Pick a hero");
      for (const a of ARCHETYPES) {
        const b = document.createElement("button");
        b.className = "choice" + (look.archetype === a ? " selected" : "");
        b.textContent = HERO_LABELS[a];
        b.addEventListener("click", () => {
          Object.assign(look, presetLook(a, look.pose));
          update();
          preview.wave();
          renderBody();
        });
        row.append(b);
      }
      options("🧍 How I stand", POSES, POSE_LABELS, () => look.pose, (v) => (look.pose = v));
    } else if (tab === "head") {
      options("🪖 Head", HEAD_STYLES, HEAD_LABELS, () => look.headStyle, (v) => (look.headStyle = v));
    } else if (tab === "body") {
      options("🦺 Body", TORSO_STYLES, TORSO_LABELS, () => look.torsoStyle, (v) => (look.torsoStyle = v));
      options("💪 Shoulders", SHOULDER_STYLES, SHOULDER_LABELS, () => look.shoulderStyle, (v) => (look.shoulderStyle = v));
    } else if (tab === "gear") {
      options("🎒 On my back", BACK_STYLES, BACK_LABELS, () => look.backStyle, (v) => (look.backStyle = v));
      options("✋ In my hands", WEAPON_STYLES, WEAPON_LABELS, () => look.weaponStyle, (v) => (look.weaponStyle = v));
    } else {
      swatches("🎨 Main colour", PRIMARY_COLORS, () => look.primaryColor, (c) => (look.primaryColor = c));
      swatches("🎨 Second colour", SECONDARY_COLORS, () => look.secondaryColor, (c) => (look.secondaryColor = c));
      swatches("🎨 Little details", ACCENT_COLORS, () => look.accentColor, (c) => (look.accentColor = c));
      swatches("✨ Glow", GLOW_COLORS, () => look.glowColor, (c) => (look.glowColor = c));
      options("🪞 Finish", FINISHES, FINISH_LABELS, () => look.finish, (v) => (look.finish = v));
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
