import { Game } from "./game/game";
import { Profile, deleteProfile, freeHome, loadProfiles, newProfileId, rememberLastProfile, upsertProfile } from "./profiles";
import { openProfilePicker } from "./ui/profilePicker";
import { openAvatarCreator } from "./ui/avatarCreator";
import { Hud, toast } from "./ui/hud";
import { SettingsMenu } from "./ui/settings";
import { openShop } from "./shop/shopScreen";

/**
 * Ties the screens together:
 * profile picker → (avatar creator) → walking around town as your avatar.
 */
export class App {
  private hud = new Hud();
  private current: Profile | null = null;
  private menus = 0; // how many menus are open (taps on the town are ignored while > 0)

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
    this.hud.onShop = () => {
      hint.hidden = true;
      game.goToShop();
    };
    this.hud.onRunShop = () => this.runShop();
    game.onShopNearby = (shop) => {
      const show = shop !== null && this.current !== null;
      if (show) hint.hidden = true;
      this.hud.showRunShop(show);
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
    this.hint.hidden = false;
    toast(isNew ? `🎉 Welcome, ${p.name}! This is your house! 🏠` : `👋 Hi, ${p.name}!`);
    setTimeout(() => this.game.cheer(), 300);
  }

  /** Run the Fruit Shop for a day, then pay the child their coins. */
  private runShop(): void {
    const child = this.current;
    if (!child) return;
    this.hud.showRunShop(false);
    this.menuOpen(true);
    openShop({
      level: child.level,
      childName: child.name,
      onClose: (result) => {
        this.menuOpen(false);
        this.hud.showRunShop(true);
        if (!result) return;
        this.saveCurrent((p) => {
          p.coins += result.reward;
          p.shop.days += 1;
          p.shop.bestProfit = Math.max(p.shop.bestProfit, result.profit);
        });
        this.hud.celebrateCoins();
        this.game.cheer();
        toast(`🪙 +${result.reward} coins! Great job, ${child.name}! 🎉`, 3200);
      },
    });
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
