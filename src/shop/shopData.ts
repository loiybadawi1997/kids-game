import { Level } from "../profiles";

/*
 * The maths behind the shop: what is for sale, what customers ask for,
 * how they pay, and (for Big level) how prices change what they buy.
 * No screens here — just plain rules, so they are easy to read and change.
 */

export interface Item {
  id: string;
  emoji: string;
  name: string;
  /** What the shop pays the farmer for one (Big level buys stock). */
  cost: number;
  /** Fixed price on Middle level. */
  middlePrice: number;
}

export const ITEMS: Item[] = [
  { id: "apple", emoji: "🍎", name: "Apple", cost: 1, middlePrice: 2 },
  { id: "banana", emoji: "🍌", name: "Banana", cost: 1, middlePrice: 1 },
  { id: "orange", emoji: "🍊", name: "Orange", cost: 2, middlePrice: 3 },
  { id: "pear", emoji: "🍐", name: "Pear", cost: 1, middlePrice: 2 },
  { id: "grapes", emoji: "🍇", name: "Grapes", cost: 2, middlePrice: 4 },
  { id: "strawberry", emoji: "🍓", name: "Strawberries", cost: 3, middlePrice: 5 },
  { id: "pineapple", emoji: "🍍", name: "Pineapple", cost: 4 , middlePrice: 6 },
  { id: "watermelon", emoji: "🍉", name: "Watermelon", cost: 5, middlePrice: 7 },
];

/** The items each level sells. Middle keeps to six cheaper fruits. */
export function itemsForLevel(level: Level): Item[] {
  return level === "middle" ? ITEMS.slice(0, 6) : ITEMS;
}

/** Coins and notes you can give as change. */
export const MONEY = [1, 2, 5, 10, 20];
/** Notes customers pay with. */
const PAY_WITH = [5, 10, 20, 50];

export const SETTINGS = {
  middle: { customers: 10 },
  big: { customers: 8, budget: 60 },
};

export interface OrderLine {
  item: Item;
  qty: number;
  price: number;
}

export interface Order {
  lines: OrderLine[];
  total: number;
  /** The note or coin the customer pays with (always more than the total, so there is change to give). */
  pays: number;
  /** Lines the customer refused because the price was too high (Big level). */
  refused: OrderLine[];
}

/**
 * How happy a customer is with a price (Big level):
 * up to double the cost is fine, a bit more is "hmm", much more is too expensive.
 */
export function priceMood(item: Item, price: number): "cheap" | "fair" | "pricey" | "tooMuch" {
  if (price <= item.cost) return "cheap";
  if (price <= item.cost * 2 + 1) return "fair";
  if (price <= item.cost * 3 + 1) return "pricey";
  return "tooMuch";
}

/** The smallest note/coin bigger than the total, sometimes one size up, so change is needed. */
function payment(total: number, level: Level, random: () => number): number {
  const options = PAY_WITH.filter((n) => n > total);
  if (options.length === 0) return Math.ceil((total + 1) / 10) * 10;
  // Middle: usually the next note up. Big: sometimes a bigger note, for harder change.
  const bump = level === "big" && random() < 0.35 && options.length > 1 ? 1 : 0;
  return options[bump];
}

/**
 * Make a customer's shopping list.
 * Middle: 1–3 kinds of fruit, total up to 18.
 * Big: 2–3 kinds, total up to 45, only things in stock, at the child's prices.
 */
export function makeOrder(
  level: Level,
  random: () => number,
  stock?: Map<string, number>,
  prices?: Map<string, number>,
): Order {
  const pool = itemsForLevel(level).filter((it) => !stock || (stock.get(it.id) ?? 0) > 0);
  const maxTotal = level === "middle" ? 18 : 45;
  const kinds = level === "middle" ? 1 + Math.floor(random() * 3) : 2 + Math.floor(random() * 2);
  const shuffled = [...pool].sort(() => random() - 0.5).slice(0, Math.min(kinds, pool.length));
  const lines: OrderLine[] = [];
  const refused: OrderLine[] = [];
  let total = 0;
  for (const item of shuffled) {
    const price = level === "middle" ? item.middlePrice : prices?.get(item.id) ?? item.cost * 2;
    const maxQty = Math.min(3, stock ? stock.get(item.id) ?? 0 : 9);
    let qty = 1 + Math.floor(random() * maxQty);
    while (qty > 1 && total + qty * price > maxTotal) qty--;
    if (qty < 1 || total + qty * price > maxTotal) continue;
    const line = { item, qty, price };
    if (level === "big") {
      const mood = priceMood(item, price);
      if (mood === "tooMuch" || (mood === "pricey" && random() < 0.5)) {
        refused.push(line);
        continue;
      }
    }
    lines.push(line);
    total += qty * price;
  }
  return { lines, total, pays: total > 0 ? payment(total, level, random) : 0, refused };
}

/** Do the items in the basket match the order exactly? */
export function basketMatches(order: Order, basket: Map<string, number>): boolean {
  if (order.lines.length !== [...basket.values()].filter((q) => q > 0).length) return false;
  return order.lines.every((l) => basket.get(l.item.id) === l.qty);
}

/** How the child did with one customer. */
export interface CustomerResult {
  firstTry: boolean;
  sale: number;
}

/** Coins for the child at the end of the day. Always at least a few: the day always ends with a reward. */
export function dayReward(level: Level, results: CustomerResult[], profit: number): number {
  const served = results.length;
  const perfect = results.filter((r) => r.firstTry).length;
  if (level === "middle") return Math.max(3, served * 2 + perfect);
  return Math.max(5, Math.round(Math.max(0, profit) * 0.6) + perfect);
}
