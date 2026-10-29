# Kids Town — Game Summary and Full Build Prompt

This file has two parts:

1. **Summary**: what the game is and what is built so far.
2. **Full prompt**: a complete, self-contained brief you can give to a developer or an AI to build (or rebuild) the game.

Characters are **not** described here. They are defined in **`Characters.md`** (attached separately), which overrides anything in this file about how characters look, move or are customised.

---

# Part 1 — Summary

## What the game is

**Kids Town** is a 3D educational town game for one family's children, aged 7 to 10. It keeps what kids love in games like PK XD and Roblox (their own avatar, a world to explore, small rewards all the time) but ties real learning to the reward loop. It runs in the phone's browser and can be installed to the Home Screen like an app.

- **Players:** family only. No chat, no strangers, no online servers, no public profiles.
- **Levels:** every child picks one of two:
  - **⭐ Middle**: about age 7–8
  - **🌟 Big**: about age 9–10
- **Devices:** iPhones, Android phones and Android tablets, landscape only, touch only.
- **Money:** no ads, no real-money purchases, no loot boxes, no dark patterns.

## What is built so far

| Step | Status | What it contains |
| --- | --- | --- |
| 1. Project setup | ✅ Done | Babylon.js + TypeScript + Vite, installable app that works offline, landscape lock, automatic deploy to GitHub Pages |
| 2. 3D town | ✅ Done | A full low-poly town, tap to walk with pathfinding, follow camera, townsfolk who greet you |
| Extra: visual polish | ✅ Done | Sun shadows, patterns drawn by the GPU, bloom, colour grading, Low/Medium/High quality |
| 3. Profiles and avatar | ✅ Done | Up to 6 children, avatar creator with a 3D preview, saved on the device, a house each |
| 4. Market Street shop | ✅ Done | Fruit Shop day: maths for Middle, stock, prices and profit for Big, coin rewards |
| 5. Upgrades and decoration | ⬜ Next | Spend coins on shop upgrades and house decoration |
| 6. Device testing | ⬜ Later | Testing and fixes on real phones |
| 7. More districts | ⬜ Later | Inventor's Workshop, Explorer's Island, Time Gate, family multiplayer |

- **Live address:** https://loiybadawi1997.github.io/kids-game/
- **Code:** GitHub repo `loiybadawi1997/kids-game`. Every push to `main` deploys.

## The town today

- **Plaza:** a fountain with splashing water, benches, flower planters and bins.
- **Home Lane:** six different houses, one per child. Each has a name plate showing the child's name, a mailbox, a fence, a hedge and flowers.
  - The houses differ in floors, roof style, balconies, porches, dormers, shutters, chimneys, and brick, wood or plaster walls.
- **Market Street:** six themed shops (Fruit, Bakery, Toys, Flowers, Ice Cream, Books). Each has a striped awning, a name sign, goods outside and a giant rooftop icon.
- **Park:** a pond with ducks, lily pads and reeds, plus a slide, swings and benches.
- **Town Hall:** the landmark. Steps, white columns, a pediment, a clock tower that shows the real time, a bell and a waving flag.
- **South Lane:** four more houses.
- **Everywhere:** glowing street lamps, kerb stones, grass tufts, flowers, butterflies, drifting clouds, and trees and hills around the edge.
- **Townsfolk:** six wander the town and two shopkeepers stand at their shops. Tap one and you walk over, both wave, and they say a short line in a speech bubble.

## Screens today

1. **Loading screen**, then **"Who is playing?"**: cards with portrait, name, level and coins, plus ➕ to add a player and ✏️ to edit one.
2. **Avatar creator:** a turning 3D preview, tabs (Me, Face, Hair, Clothes, Hat), a 🎲 Surprise button, the name and the level.
3. **Town:**
   - top left: player chip with portrait, name and 🪙 coins
   - bottom left: 🏠 go home and 🛒 go to my shop
   - top right: ⚙️ settings (quality, change player)
4. **Fruit Shop day:** the full-screen shop activity, ending with a reward screen.

---

# Part 2 — Full Build Prompt

> Copy everything below this line into a new session or hand it to a developer.
> Attach **`Characters.md`** alongside it.

---

## Role and goal

You are building **Kids Town**, a 3D educational town game for a family's children aged 7 to 10. Build it step by step. Each step must be playable on a real phone before the next one starts. Keep the code simple and readable: the owner is not a full-time game developer. Make small, focused commits with clear messages. When a decision would significantly change this design, ask first.

**All character design** (looks, body proportions, customisation options, animations, townsfolk names and lines) comes from the attached **`Characters.md`**. Where this prompt mentions characters, it only describes how they are *used* in the game. If anything here conflicts with `Characters.md`, follow `Characters.md`.

## 1. Audience and safety

- Ages 7–10. Younger siblings (5–6) may play casually but are not designed for.
- Two difficulty levels per activity, chosen per child profile:
  - **⭐ Middle** (about 7–8)
  - **🌟 Big** (about 9–10)
- Reading level for a 7-year-old: short sentences, simple words, an emoji or icon next to all important text.
- **Family only.** Never add chat with strangers, open servers, public profiles, or any way for unknown people to contact a child.
- No ads, no real-money purchases, no loot boxes, no dark patterns (no fake urgency, no streak guilt, no "pay to skip").
- Mistakes are never punished. Give gentle hints, and show the answer after a few tries.
- Every activity lasts about 10–15 minutes and always ends with a reward.
- Later: a parent-controlled daily play limit that ends sessions gently ("🌙 The town is going to sleep").

## 2. Devices and controls

- Must run on iPhones, Android phones and Android tablets, and stay smooth on mid-range and older Android phones.
- **Landscape only:**
  - the installed app is locked to landscape
  - in portrait, a full-screen overlay says "📱 Turn your phone sideways" with an animated phone
  - Android: also call `screen.orientation.lock("landscape")` after the first tap
- **Touch first:**
  - tap the ground to walk there
  - tap a person or object to go and interact with it
  - drag to turn the camera, pinch to zoom
  - no joysticks, no complex gestures, no keyboard needed (except typing a name)
- Touch targets at least **48 px**. Text readable on a 360 px-tall landscape phone. Respect safe areas (`env(safe-area-inset-*)`) for notches.

## 3. Tech stack

- **Engine:** Babylon.js (import tree-shakable modules from `@babylonjs/core/...`).
  - Babylon's split modules need side-effect imports for some features. Without them, production builds fail silently while dev builds work:
    - `@babylonjs/core/Culling/ray` for `scene.createPickingRay`
    - `@babylonjs/core/Meshes/thinInstanceMesh`
    - `@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent`
  - Always test the **production** build.
- **Language:** TypeScript (strict).
- **Build tool:** Vite.
- **App type:** Progressive Web App via `vite-plugin-pwa`:
  - `display: fullscreen`, `orientation: landscape`, auto-update
  - precache everything so it works offline after the first visit
  - icons at 192, 512 and maskable, plus an `apple-touch-icon`
  - iOS meta tags for full-screen Home Screen apps
- **Hosting:** GitHub Pages, deployed by GitHub Actions on every push to `main`. The site lives under `/kids-game/`, so Vite `base` must be `/kids-game/`.
- **Saving:** `localStorage` only, per child profile. No backend until family multiplayer is asked for. Wrap every storage call in try/catch so private browsing never crashes the game.
- **Art:** bright, low-poly cartoon style in one soft palette.
  - Either use free CC0 packs (Kenney, Quaternius) or build models in code from simple shapes.
  - Record every third-party asset's source and licence in `ASSETS.md`.

## 4. Performance rules (very important)

- **Draw calls:** merge static scenery into a few big meshes, chunked by area so off-screen chunks are skipped.
  - Use **vertex colours** instead of many materials, so the whole town shares one material.
  - Use thin instances for repeated models.
- **Triangles:** keep the town around 100k and each character in the low thousands. Hide townsfolk far from the camera (LOD cut-off around 45 m).
- **Pixels:** cap pixel density (High ≤ 2×, Medium ≤ 1.6×, Low ≤ 1.25×).
- **Shadows:** use real-time shadows only on Medium and High. On Low, use cheap blob shadows (one instanced soft dark disc per character).
- **Taps:** work out taps yourself (ray against the ground plane, and screen-space distance to people) instead of Babylon mesh picking. Set `skipPointerMovePicking` and similar.
- **Frame rate:** add a frame-rate readout behind a URL flag (`?fps`).

## 5. Graphics quality (Low / Medium / High)

- **Picking the level:**
  - Guess from the device: WebGL version, mobile or desktop, `deviceMemory`, `hardwareConcurrency`, GPU name. Old Mali-4xx/T-series, Adreno ≤5xx and PowerVR mean Low; fast Apple, Adreno 6xx+ and Mali-G7x mean High.
  - In **Auto**, step down a level if the frame rate stays under about 34 fps for 3 seconds, and remember the result.
  - A ⚙️ settings menu offers 🤖 Auto, 🐢 Low, 🙂 Medium, ✨ High and shows the level in use.
- **What each level adds:**

| Feature | Low | Medium | High |
| --- | --- | --- | --- |
| Sun shadows | blob shadows | soft shadows (1024, PCF low) | softer, sharper shadows (2048, PCF medium) |
| Surface patterns (brick, wood, tiles…) | off | on | on |
| Colour grading | contrast and exposure only | + colour curves | + colour curves + light vignette |
| Bloom and MSAA | off | off | on |
| Pixel density cap | 1.25× | 1.6× | 2× |

- **Look on every level:**
  - a warm sun from the south-west
  - a soft hemispheric sky light with warm ground bounce
  - a gradient sky dome, from deep blue at the top to a warm cream horizon, with a glowing sun disc
  - linear fog that blends the far edges into the horizon
  - baked ambient occlusion: walls get slightly darker towards the ground, done once at load
- **Surface patterns:** draw them in the shader from world position, with no image files, using a Babylon `MaterialPluginBase`:
  - brick, wood boards, roof tiles, paving stones, plaster, grass, shingles, cobbles
  - store the pattern number in the vertex-colour alpha, and pass it through your own varying (Babylon drops vertex alpha on solid meshes)
  - fade patterns out with distance to avoid shimmer
- **No shine on the town:** set specular to 0 so there is no glare on paths.

## 6. Game structure

- One **town** is the hub. Each child has an avatar and a house in the town. **One currency (🪙 coins)** works everywhere.
- **Design pattern:** the town is 3D (walking, houses, shops). Learning activities are **2D screens over the 3D world** (shop counter, coding board, quest dialogue). This keeps activities clear and quick to build.

### Districts

1. **Market Street** (money and maths): the child runs a shop, serves customers, gives change, buys stock, sets prices and saves for upgrades.
   - Middle: add prices, give correct change.
   - Big: set prices, buy stock, track profit.
2. **Inventor's Workshop** (logic and coding): build robots and program them with drag-and-drop instruction blocks.
   - Middle: short sequences and repeats.
   - Big: loops and simple conditions.
3. **Explorer's Island** (science and nature): discover and collect animals, plants and fossils into a journal; solve simple physics puzzles to unlock areas.
4. **Time Gate** (history and cultures): travel to places such as Andalusia, Ancient Egypt, Baghdad's House of Wisdom and the Silk Road, and complete quests.

Districts feed each other: workshop robots can work in the shop, island finds sell in the market, history quests unlock rare decorations.

### Reward loop

- Coins and items from activities are spent on avatar outfits, house decoration and shop upgrades.
- Activities last 10–15 minutes and always end with a reward and a happy summary screen.

## 7. The town (layout and content)

World units are about metres. North is +Z, east is +X. An object's front (door) faces its local +Z.

```
                     trees & hills
   [home][home][home]   |   [home][home][home]         z ≈ 23.6
   ============ Home Lane =+=======================    z = 16
     park  benches     (plaza)    benches
   ====== Main Street =(fountain)= Market Street [shops] ==   z = 0
     pond, slide        |              [shops]
   ============ South Lane =+======================    z = -16
    [house] [house] [ TOWN HALL ] [house] [house]      z ≈ -24 / -27
```

- **Ground:** a large grass plane with soft colour variation in its vertex colours and a grass pattern.
- **Paths:** paved, about 3 m wide, with kerb-stone edges.
  - The plaza is a 9.5 m radius circle of cobbles with paving rings.
  - Small 1.5 m paths lead to each front door.
- **Plaza:** fountain (two basins, central column, animated water spout and splash ring, lily pads and coins in the water), four benches facing the centre, four flower planters, bins and flower patches.
- **Home Lane:** six houses at x = −30, −18, −6, 6, 18, 30, facing south.
  - **Every house is different:** wall colour and material, one or two floors, a "side" or "front" gable roof, balcony, porch, dormer, shutters and chimney position.
  - **Each house has:** a front path, side fences, a low hedge with a gap, flowers, a coloured mailbox and a wooden **name plate** showing the owner's name ("🏠 Lina"), or "🏠 For a friend" when empty.
  - A "🏡 Home Lane" sign post stands at the end of the north–south path.
- **House builder parts:**
  - stone foundation, bevelled walls, corner trims and floor bands
  - pitched roof (wall-coloured gable ends, two tiled slabs with overhang, ridge cap, eave boards)
  - door with frame, small window, knob and two steps
  - windows with frame, cross bars, sill, optional shutters and flower box
  - optional round attic window, dormer, porch on two posts, balcony with railing, door and flowers
  - brick chimney with cap
- **Market Street:** six shops, three on each side of Main Street (east of the plaza), at about z = ±8.8, facing the street. Each shop has:
  - bevelled walls, a flat roof with parapet, a big display window and a glass door
  - a striped awning with a scalloped edge, and a name sign
  - flower pots by the door, a wooden stand of goods out front, and a **giant rooftop icon**

| Shop | Goods out front | Rooftop icon |
| --- | --- | --- |
| 🍎 Fruit Shop (the children's shop) | fruit | big apple |
| 🥐 Bakery | bread | loaf |
| 🧸 Toy Shop | balls and a box | ball and block |
| 🌸 Flowers | potted flowers | big flower |
| 🍦 Ice Cream | cones | giant cone |
| 📚 Books | books | stack of books |

  - A "🛒 Market Street" sign arch spans the street entrance.
- **Park (west):**
  - oval pond with stones, lily pads, flowers, reeds and animated ducks (a mother and a duckling)
  - slide, two-seat swings, benches, rocks, trees and flowers
  - "🌳 Park" sign post
- **Town Hall (south, the landmark):**
  - raised stone base, brick main block, two rows of tall windows, low blue tiled roof
  - front portico: wide steps, four white columns, a pointed pediment with a golden emblem, and the "🏛️ Town Hall" sign
  - big double door and flower beds
  - **clock tower** with a clock face whose hands show the real time, an open bell storey with a golden bell, a pointed blue roof, and a flag pole with a gently waving flag
- **South Lane:** four more distinct houses with mailboxes.
- **Details everywhere:**
  - glowing street lamps (lantern bulbs merged into one emissive mesh)
  - benches, green bins, hedges, bushes, flower patches, grass tufts
  - round, pine and blossom trees (some with apples)
  - butterflies, slowly turning clouds, and soft hills in the distance
- **Signs:** draw all sign lettering into **one shared canvas texture atlas** with **one mesh**, so every sign costs one draw call. Name plates can be redrawn when profiles change.
- **Walkable area:** a grid at 0.5 m resolution covering the town.
  - Buildings, trees, fences, the fountain, the pond and furniture block cells, with a small margin.
  - Use A* with 8 directions and no corner-cutting, then smooth the path with line-of-sight checks.
  - Tapping a blocked spot walks to the nearest walkable cell.
  - Bushes close off street ends so nobody walks off the map.

## 8. Camera, movement and town interactions

- **Camera:** an arc-rotate camera that glides after the player.
  - Default angle beta ≈ 0.82, radius about 14 m (zoom 7–22), fov about 0.8.
  - The high angle stops buildings hiding the player.
  - No panning and no keyboard. Drag to turn, pinch to zoom.
- **Tapping:**
  - tap the ground: the player walks there along a path, and a yellow ring pops up where you tapped
  - tap a person (forgiving screen-space radius of about 70 px): walk over, stop about 1.9 m away, both turn and wave, and the person says their next line in an HTML speech bubble above their head (name plus a short line with an emoji, about 3.5 s)
- **Townsfolk:** wander between favourite spots in town or nearby random spots. Two shopkeepers stand outside the Bakery and Toy Shop, face the street and wave now and then. Names, looks and lines come from `Characters.md`.
- **HUD:**
  - top left: player chip (portrait, name, coins); tapping it opens the profile picker
  - bottom left: 🏠 (walk to my house) and 🛒 (walk to my shop)
  - top right: ⚙️
  - a first-time hint "👆 Tap the ground to walk! / Tap a friend to say hi 👋" that disappears after the first tap or any HUD button
  - toast messages for big moments ("👋 Hi, Lina!", "🪙 +29 coins!")
- **Shop counter:** when the player stands at their shop counter, a bobbing **"🍎 Open my shop!"** button appears.

## 9. Child profiles (Step 3)

- **Profile data** (saved in `localStorage`, up to **6** profiles):
  - `id`, `name` (max 12 characters), `level` ("middle" or "big"), `look` (avatar options as defined in `Characters.md`)
  - `coins`, `home` (Home Lane house 0–5, the first free one), a small `portrait` image (160×160 webp, captured from the 3D preview)
  - shop record: `{ days, bestProfit }`
- **"Who is playing?" screen:**
  - shown on every launch, over the town while the camera slowly circles it
  - big cards with portrait, name, level badge (⭐ Middle / 🌟 Big) and 🪙 coins
  - ✏️ on each card to edit, and a ➕ "New player" card while fewer than 6 exist
  - with no profiles yet: "👋 Hello! Let's make your player!"
- **Avatar creator** (full screen):
  - **left:** a turning 3D preview of the avatar on a round stage (its own small Babylon engine). Drag to spin; it waves when an option changes. A 🎲 Surprise! button makes a random look.
  - **right:** tabs ✏️ Me (name field and level choice with ages), then the look tabs (colour swatches and picture buttons). The tab list and options come from `Characters.md`.
  - **bottom:** ⬅️ Back, ✅ Done! (if the name is empty, it jumps to the name field and shakes it gently), and 🗑️ Delete with a "Delete Lina? ✅ Yes / ❌ No" confirmation when editing.
- **After choosing a child:**
  - their avatar replaces the player character and appears outside their own house
  - their name is written on the house's name plate
  - the HUD shows their picture and coins
- **Switching child:** from the HUD chip or ⚙️ → "👤 Change player".

## 10. Market Street — the Fruit Shop (Step 4)

The child runs the **🍎 Fruit Shop**. It is a full-screen 2D activity:

- **Header:** a striped red-and-white awning with a scalloped edge, "🍎 {Name}'s Fruit Shop", "🧑 3 / 10", "💰 till" and ✖.
- **Left:** the current customer in 3D (a random look from `Characters.md`) behind a wooden counter, with a speech bubble. Customers walk in from the side and walk out to the other side. A customer who has left must not block taps.
- **Right:** a panel that changes with each step. Its main action button always stays visible at the bottom.

### Fruit and prices

| Fruit | Farmer cost (Big) | Middle price |
| --- | --- | --- |
| 🍎 Apple | 1 | 2 |
| 🍌 Banana | 1 | 1 |
| 🍊 Orange | 2 | 3 |
| 🍐 Pear | 1 | 2 |
| 🍇 Grapes | 2 | 4 |
| 🍓 Strawberries | 3 | 5 |
| 🍍 Pineapple | 4 | 6 |
| 🍉 Watermelon | 5 | 7 |

Middle sells only the first six. Big sells all eight.

- **Money buttons for change:** coins 1, 2 (gold), 5, 10 (silver) and notes 20, 50 (green and purple).
- **Customers pay with** 5, 10, 20 or 50: always more than the total, so there is change to give.

### Each customer

1. **Order:** a greeting and the order in pictures.
   - Middle repeats the emoji (🍐🍐); Big shows "🍎 ×3".
   - Middle: 1–3 kinds of fruit, 1–3 of each, total ≤ 18.
   - Big: 2–3 kinds, up to 3 of each, total ≤ 45, only fruit in stock, at the child's prices.
2. **Pick:** "👆 Tap what they want". A shelf of fruit buttons with price tags. A 🧺 basket shows the chosen fruit; tap a fruit in the basket to take it out. Then "✅ That's it!".
   - Wrong basket: a friendly hint ("I didn't ask for 🍇! 🙈", "Too many 🍎! ➖", "I need more 🍌, please! ➕").
3. **Total:** "🧮 How much is it?" and a big number pad (0–9, ⌫, ✅).
   - Middle sees a picture sum ("🍐**2** + 🍐**2** = ?").
   - Big sees "🍎 3 × 🪙2 + 🍌 4 × 🪙1 = ?".
   - Wrong answer: "Hmm, try again! 💪", then a slow-counting hint, then the customer shows the answer.
4. **Change:** the customer hands over a note (shown in the bubble).
   - Middle sees "10 − 7 = ?" and a running "= 🪙 3" for the tray.
   - Big sees "They paid 🪙 50. It costs 🪙 37." with no running total.
   - Tap money buttons to put coins in the tray; tap a coin in the tray to take it back. "✅ Give change" checks it: "A little more, please! ➕" / "Oops, that's too much! ➖". After 3 tries the customer shows the answer.
5. **Happy:** the customer waves, says "Thank you! 😊" ("⭐ Perfect!" if there were no mistakes), and "+ 🪙 N in the till" shows. Then they leave and the next customer comes.

### Big level only: before opening

- **🚚 Buy fruit:** the farmer is here with a budget of **🪙 60**. Each fruit has a row with its cost and − / + buttons (0–12 each), and the money left is shown. At least 4 fruits must be bought to continue.
- **🏷️ Set prices:** each stocked fruit starts at 2× its cost and can be set from 1 to 5× cost. A face shows the price mood:
  - **🤑 Cheap** (≤ cost)
  - **😀 Good** (≤ 2× cost + 1)
  - **🤔 High** (≤ 3× cost + 1): customers refuse it half the time
  - **😟 Too high**: customers always refuse it ("🍓 is too expensive! 😟")

  Then "🔔 Open the shop!".
- **Selling out:** if nothing left is affordable, a customer may leave without buying ("Maybe next time!", with a tip that lower prices help). The day ends early when the stock runs out.

### The day

- **Length:** Middle has 10 customers and Big has 8, about 10–15 minutes for a child.
- **✖ during the day:** closes the shop early and still gives the reward for the customers already served.
- **Summary screen:** confetti and coins, "🎉 What a great day!", 1–3 ⭐ (based on customers served without mistakes), customers, perfect count, and:
  - Middle: money taken
  - Big: 💰 sales, 🚚 fruit cost, 📈 profit (green, or red if negative) and leftover fruit
- **Reward for the child** (saved to their profile):
  - Middle: `max(3, served × 2 + perfect)`
  - Big: `max(5, round(max(0, profit) × 0.6) + perfect)`
  - Show it big ("+ 🪙 29 for you!") with a "🏠 Back to town" button.
- **Back in town:** the coin counter bounces, the player waves, a toast says "🪙 +29 coins! Great job, Sam! 🎉", and the shop record is updated (days, best profit).
- **Shop money and the child's coins are separate.** Shop money is "💰 in the till"; the child's own coins are the reward.

## 11. Next steps (build only when asked)

5. **Shop upgrades and house decoration with coins:**
   - shop: new fruit, a bigger stand, a nicer awning, a helper
   - house: furniture, colours, garden items
   - avatar outfits (see `Characters.md`)
   - fair prices; spending is always optional and never pushed
6. **Device testing and fixes:** real iPhones, Android phones and tablets, with older Android phones on Low.
7. **Later districts:** Inventor's Workshop, then Explorer's Island, then Time Gate, then family multiplayer (the first and only backend, family-only).

## 12. Project files and conventions

- `CLAUDE.md`: the design rules and a **Progress** checklist; update it when a step is done.
- `ASSETS.md`: source and licence of every third-party asset.
- `README.md`: how to play, how to run it (`npm install`, `npm run dev`, `npm run build`, `npm run preview`), a code map, and deployment notes.
- Suggested code layout:
  - `src/main.ts`: engine, loading screen, frame-rate watch
  - `src/app.ts`: moves between screens (profiles → creator → town → shop)
  - `src/profiles.ts`: saving profiles
  - `src/game/`:
    - `game.ts`: game loop, taps, camera
    - `town.ts`: layout
    - `props.ts`: house, shop, tree and other builders
    - `meshKit.ts`: shape helpers, merging, baked AO
    - `navGrid.ts`: walkable grid and A*
    - `walker.ts`: walking along a path
    - `townsfolk.ts`: townspeople
    - `character.ts`: per `Characters.md`
    - `sky.ts`: lights, sky, sun, clouds
    - `graphics.ts`: quality levels
    - `patterns.ts`: shader patterns
    - `signs.ts`: sign atlas
    - `ambient.ts`: ducks, fountain, butterflies
    - `effects.ts`: blob shadows, tap ring
  - `src/ui/`: profile picker, avatar creator, 3D avatar preview, HUD, settings, speech bubbles
  - `src/shop/`:
    - `shopData.ts`: the maths rules (fruit, orders, prices, rewards)
    - `shopScreen.ts`: the screens
- **Testing after every change:**
  - build the production version
  - test in a phone-sized landscape browser (844×390 and 740×360)
  - check portrait shows the rotate screen
  - check offline reload works
  - play a full shop day at both levels
  - fix what breaks, then commit
