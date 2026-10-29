import { MAX_PROFILES, Profile } from "../profiles";

/**
 * "Who is playing?" — one big card per child, plus a card to add a new player.
 * Returns a function that closes the picker.
 */
export function openProfilePicker(opts: {
  profiles: Profile[];
  onPick: (p: Profile) => void;
  onNew: () => void;
  onEdit: (p: Profile) => void;
}): () => void {
  const root = document.createElement("div");
  root.className = "overlay picker";
  const empty = opts.profiles.length === 0;
  root.innerHTML = `
    <div class="picker-inner">
      <h1>${empty ? "👋 Hello! Let's make your player!" : "👋 Who is playing?"}</h1>
      <div class="cards"></div>
    </div>`;
  const cards = root.querySelector(".cards") as HTMLDivElement;

  for (const p of opts.profiles) {
    const card = document.createElement("div");
    card.className = "profile-card";
    card.setAttribute("role", "button");
    card.innerHTML = `
      <div class="portrait">${p.portrait ? `<img alt="" src="${p.portrait}">` : "🙂"}</div>
      <div class="pname"></div>
      <div class="badges"><span class="badge">${p.level === "big" ? "🌟 Big" : "⭐ Middle"}</span><span class="badge coins">🪙 ${p.coins}</span></div>
      <button class="edit-btn" aria-label="Change">✏️</button>`;
    (card.querySelector(".pname") as HTMLElement).textContent = p.name;
    card.addEventListener("click", () => {
      close();
      opts.onPick(p);
    });
    card.querySelector(".edit-btn")!.addEventListener("click", (e) => {
      e.stopPropagation();
      close();
      opts.onEdit(p);
    });
    cards.append(card);
  }
  if (opts.profiles.length < MAX_PROFILES) {
    const add = document.createElement("div");
    add.className = "profile-card new";
    add.setAttribute("role", "button");
    add.innerHTML = `<div class="portrait">➕</div><div class="pname">New player</div>`;
    add.addEventListener("click", () => {
      close();
      opts.onNew();
    });
    cards.append(add);
  }
  document.body.append(root);

  const close = () => root.remove();
  return close;
}
