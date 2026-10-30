import { CharacterLook, normalizeLook } from "./game/character";

/*
 * Child profiles, saved in the browser's local storage (on this device only).
 * Up to six children, each with a name, a difficulty level, an avatar,
 * coins and their own house on Home Lane.
 */

export type Level = "middle" | "big";

export interface ShopRecord {
  days: number;
  bestProfit: number;
}

/** What a child has learned so far in the districts. */
export interface LearnRecord {
  /** Inventor's Workshop: how many robot puzzles are solved, per level. */
  workshop: Record<Level, number>;
  /** Explorer's Island: ids of the animals, plants and fossils in the journal. */
  journal: string[];
  /** Time Gate: ids of the places whose quest is finished. */
  quests: string[];
}

export function emptyLearn(): LearnRecord {
  return { workshop: { middle: 0, big: 0 }, journal: [], quests: [] };
}

export interface Profile {
  id: string;
  name: string;
  level: Level;
  look: CharacterLook;
  coins: number;
  /** Which Home Lane house is theirs (0 to 5). */
  home: number;
  /** A small picture of their avatar for the profile picker. */
  portrait: string;
  shop: ShopRecord;
  learn: LearnRecord;
  /** Rare decorations won in the districts (for decorating the house later). */
  items: string[];
}

export const MAX_PROFILES = 6;
const KEY = "kidsTown.profiles.v1";
const LAST_KEY = "kidsTown.lastProfile";

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Profile[];
    if (!Array.isArray(list)) return [];
    // Fill in anything missing from older saves.
    return list.slice(0, MAX_PROFILES).map((p) => ({
      ...p,
      look: normalizeLook(p.look),
      coins: Number.isFinite(p.coins) ? p.coins : 0,
      shop: p.shop ?? { days: 0, bestProfit: 0 },
      learn: { ...emptyLearn(), ...p.learn, workshop: { ...emptyLearn().workshop, ...p.learn?.workshop } },
      items: Array.isArray(p.items) ? p.items : [],
      // Pictures saved before the heroes arrived show the old look, so drop them.
      portrait: (p.look as unknown as { archetype?: string })?.archetype ? p.portrait ?? "" : "",
    }));
  } catch {
    return [];
  }
}

export function saveProfiles(list: Profile[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the game still works, it just won't remember.
  }
}

/** The first Home Lane house nobody owns yet. */
export function freeHome(list: Profile[]): number {
  for (let i = 0; i < MAX_PROFILES; i++) if (!list.some((p) => p.home === i)) return i;
  return 0;
}

export function newProfileId(): string {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function upsertProfile(profile: Profile): Profile[] {
  const list = loadProfiles();
  const i = list.findIndex((p) => p.id === profile.id);
  if (i >= 0) list[i] = profile;
  else list.push(profile);
  saveProfiles(list);
  return list;
}

export function deleteProfile(id: string): Profile[] {
  const list = loadProfiles().filter((p) => p.id !== id);
  saveProfiles(list);
  return list;
}

export function addCoins(id: string, amount: number): Profile | null {
  const list = loadProfiles();
  const p = list.find((x) => x.id === id);
  if (!p) return null;
  p.coins = Math.max(0, Math.round(p.coins + amount));
  saveProfiles(list);
  return p;
}

export function rememberLastProfile(id: string): void {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    // ignore
  }
}

export function lastProfileId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
