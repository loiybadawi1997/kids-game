import { Game } from "./game/game";
import { Profile, deleteProfile, emptyLearn, freeHome, loadProfiles, newProfileId, rememberLastProfile, upsertProfile } from "./profiles";
import { openProfilePicker } from "./ui/profilePicker";
import { openAvatarCreator } from "./ui/avatarCreator";
import { Hud, toast } from "./ui/hud";
import { SettingsMenu } from "./ui/settings";
import { openShop } from "./shop/shopScreen";
import { openWorkshop } from "./learn/workshopScreen";
import { openIsland } from "./learn/islandScreen";
import { openTimeGate } from "./learn/timeGateScreen";
import { PUZZLES } from "./learn/workshopData";
import { PLACES } from "./learn/timeGateData";
import { DISCOVERIES } from "./learn/islandData";
import { ActivityId, ActivitySpot } from "./game/town";

/** What the big start button says at each activity. */
const START_LABELS: Record<ActivityId, string> = {
  shop: "🍎 Open my shop!",
  workshop: "🤖 Build robots!",
  island: "🧭 Explore the island!",
  timegate: "🌀 Step through the gate!",
};

/**
 * Ties the screens together:
 * profile picker → (avatar creator) → walking around town as your avatar.
 */
export class App {
  private hud = new Hud();
  private current: Profile | null = null;
  private menus = 0; // how many menus are open (taps on the town are ignored while > 0)
  private here: ActivitySpot | null = null; // the activity the player is standing at

  constructor(
    private game: Game,
    settings: SettingsMenu,
    private hint: HTMLElement,
  ) {
    settings.addButton("👤 Change player", () => this.showPicker());
    settings.onOpenChange = (open) => this.menuOpen(open);
    this.hud.onProfileTap = () => this.showPicker();
    // Using any HUD button also counts as "found out how to move", so the hint goes away.
    this.hud.onHome = () => {
      hint.hidden = true;
      if (this.current) game.goHome(this.current.home);
    };
    this.hud.onPlaces = () => {
      hint.hidden = true;
      this.showPlaces();
    };
    this.hud.onStart = () => this.start();
    game.onActivityNearby = (place) => {
      this.here = place;
      if (place && this.current) hint.hidden = true;
      this.hud.showStart(place && this.current ? START_LABELS[place.id] : null);
    };
    this.refreshHomes();
  }

  get profile(): Profile | null {
    return this.current;
  }

  get hudView(): Hud {
    return this.hud;
  }

  /** Count open menus; the town only listens to taps when none are open. */
  menuOpen(open: boolean): void {
    this.menus = Math.max(0, this.menus + (open ? 1 : -1));
    this.game.inputEnabled = this.menus === 0;
    // The joystick and the floating place icons only show while walking around town.
    this.game.controls.show(this.menus === 0 && this.current !== null);
    this.game.showBeacons(this.menus === 0 && this.current !== null);
  }

  private refreshHomes(): void {
    const names: (string | null)[] = [null, null, null, null, null, null];
    for (const p of loadProfiles()) names[p.home] = p.name;
    this.game.town.setHomeNames(names);
  }

  showPicker(): void {
    this.hud.hide();
    this.hint.hidden = true;
    this.game.attract = true;
    this.menuOpen(true);
    openProfilePicker({
      profiles: loadProfiles(),
      onPick: (p) => {
        this.menuOpen(false);
        this.play(p);
      },
      onNew: () => this.create(),
      onEdit: (p) => this.edit(p),
    });
  }

  private create(): void {
    openAvatarCreator({
      onDone: (r) => {
        const list = loadProfiles();
        const profile: Profile = {
          id: newProfileId(),
          name: r.name,
          level: r.level,
          look: r.look,
          portrait: r.portrait,
          coins: 0,
          home: freeHome(list),
          shop: { days: 0, bestProfit: 0 },
          learn: emptyLearn(),
          items: [],
        };
        upsertProfile(profile);
        this.refreshHomes();
        this.menuOpen(false);
        this.play(profile, true);
      },
      onCancel: () => {
        this.menuOpen(false);
        this.showPicker();
      },
    });
  }

  private edit(p: Profile): void {
    openAvatarCreator({
      profile: p,
      onDone: (r) => {
        const updated: Profile = { ...p, name: r.name, level: r.level, look: r.look, portrait: r.portrait };
        upsertProfile(updated);
        this.refreshHomes();
        if (this.current?.id === p.id) this.current = updated;
        this.menuOpen(false);
        this.showPicker();
      },
      onCancel: () => {
        this.menuOpen(false);
        this.showPicker();
      },
      onDelete: () => {
        deleteProfile(p.id);
        if (this.current?.id === p.id) this.current = null;
        this.refreshHomes();
        this.menuOpen(false);
        this.showPicker();
      },
    });
  }

  /** Start walking around town as this child. */
  play(p: Profile, isNew = false): void {
    this.current = p;
    rememberLastProfile(p.id);
    this.game.attract = false;
    this.game.setPlayer(p.look, p.home);
    this.hud.show(p);
    this.game.controls.show(this.menus === 0);
    this.game.showBeacons(this.menus === 0);
    this.hint.hidden = false;
    toast(isNew ? `🎉 Welcome, ${p.name}! This is your house! 🏠` : `👋 Hi, ${p.name}!`);
    setTimeout(() => this.game.cheer(), 300);
  }

  /** A small menu of places to go: tap one and the hero walks there. */
  private showPlaces(): void {
    const child = this.current;
    if (!child) return;
    this.menuOpen(true);
    const learn = child.learn;
    const progress: Record<ActivityId, string> = {
      shop: `📅 ${child.shop.days} days`,
      workshop: `🧩 ${Math.min(learn.workshop[child.level], PUZZLES[child.level].length)} / ${PUZZLES[child.level].length}`,
      island: `📔 ${learn.journal.length} / ${DISCOVERIES.length}`,
      timegate: `🏺 ${learn.quests.length} / ${PLACES.length}`,
    };
    const subjects: Record<ActivityId, string> = {
      shop: "🔢 Money and maths",
      workshop: "💻 Coding and logic",
      island: "🔬 Science and nature",
      timegate: "📜 History and cultures",
    };
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `<div class="card places-card"><button class="close-btn" aria-label="Close">✖</button><h2>🗺️ Where to?</h2><div class="places-grid"></div></div>`;
    const grid = overlay.querySelector(".places-grid") as HTMLDivElement;
    const close = () => {
      overlay.remove();
      this.menuOpen(false);
    };
    for (const place of this.game.town.activities) {
      const b = document.createElement("button");
      b.className = "place-btn";
      b.innerHTML = `<span class="place-emoji">${place.emoji}</span><b>${place.name}</b><small>${subjects[place.id]}</small><span class="badge">${progress[place.id]}</span>`;
      b.addEventListener("click", () => {
        close();
        this.game.goToActivity(place.id);
      });
      grid.append(b);
    }
    const home = document.createElement("button");
    home.className = "place-btn home";
    home.innerHTML = `<span class="place-emoji">🏠</span><b>My house</b><small>Home Lane</small>`;
    home.addEventListener("click", () => {
      close();
      this.game.goHome(child.home);
    });
    grid.append(home);
    overlay.querySelector(".close-btn")!.addEventListener("click", close);
    document.body.append(overlay);
  }

  /** Start the activity the player is standing at. */
  private start(): void {
    const child = this.current;
    const place = this.here;
    if (!child || !place) return;
    this.hud.showStart(null);
    this.menuOpen(true);
    const back = () => {
      this.menuOpen(false);
      if (this.here) this.hud.showStart(START_LABELS[this.here.id]);
    };
    const pay = (coins: number, message: string) => {
      this.hud.celebrateCoins();
      this.game.cheer();
      toast(`🪙 +${coins} coins! ${message}`, 3200);
    };
    switch (place.id) {
      case "shop":
        openShop({
          level: child.level,
          childName: child.name,
          onClose: (result) => {
            back();
            if (!result) return;
            this.saveCurrent((p) => {
              p.coins += result.reward;
              p.shop.days += 1;
              p.shop.bestProfit = Math.max(p.shop.bestProfit, result.profit);
            });
            pay(result.reward, `Great job, ${child.name}! 🎉`);
          },
        });
        break;
      case "workshop":
        openWorkshop({
          level: child.level,
          childName: child.name,
          startPuzzle: child.learn.workshop[child.level],
          onClose: (result) => {
            back();
            if (!result) return;
            this.saveCurrent((p) => {
              p.coins += result.coins;
              p.learn.workshop[p.level] = Math.max(p.learn.workshop[p.level], result.nextPuzzle);
            });
            pay(result.coins, "Clever coding! 🤖");
          },
        });
        break;
      case "island":
        openIsland({
          level: child.level,
          childName: child.name,
          journal: child.learn.journal,
          onClose: (result) => {
            back();
            if (!result) return;
            this.saveCurrent((p) => {
              p.coins += result.coins;
              p.learn.journal = [...new Set([...p.learn.journal, ...result.found])];
            });
            pay(result.coins, "Great exploring! 🧭");
          },
        });
        break;
      case "timegate":
        openTimeGate({
          level: child.level,
          childName: child.name,
          quests: child.learn.quests,
          onClose: (result) => {
            back();
            if (!result) return;
            this.saveCurrent((p) => {
              p.coins += result.coins;
              p.learn.quests = [...new Set([...p.learn.quests, ...result.finished])];
              p.items = [...new Set([...p.items, ...result.items])];
            });
            pay(result.coins, result.items.length ? "And a rare decoration! 🎁" : "Time traveller! ⏳");
          },
        });
        break;
    }
  }

  /** Save a change to the current child (coins, shop records...). */
  saveCurrent(update: (p: Profile) => void): void {
    if (!this.current) return;
    const fresh = loadProfiles().find((x) => x.id === this.current!.id) ?? this.current;
    update(fresh);
    upsertProfile(fresh);
    this.current = fresh;
    this.hud.setCoins(fresh.coins);
  }
}
