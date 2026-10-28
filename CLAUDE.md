# Kids Town Game

A 3D educational town game for a family's children aged 7 to 10. It is a value-driven alternative to games like PK XD and Roblox: it keeps what kids love about those games (an avatar they own, a world to explore, constant small rewards, freedom) and ties real learning to the reward loop.

## Audience

- Target age: 7 to 10. Younger siblings (5 to 6) may play casually but are not designed for.
- Two difficulty levels per activity, chosen per child profile:
  - **Middle** (about 7 to 8)
  - **Big** (about 9 to 10)
- Reading level aimed at age 7: short sentences, simple words, icons alongside all important text.
- Players are family only. There is NO chat with strangers, no open servers, no public profiles. Never add features that let unknown people contact a child.

## Devices

Must run well on iPhones, Android phones and Android tablets.

- Landscape orientation only.
- Touch first: tap to move, tap to interact. No joysticks, no complex gestures, no keyboard requirement.
- Must stay smooth on mid-range and older Android phones. Keep polygon counts, texture sizes and draw calls low. Test performance early and often.
- Large touch targets (at least 48px), readable text on small phone screens.

## Tech stack

- **Engine:** Babylon.js
- **Language:** TypeScript
- **Build tool:** Vite
- **App type:** Progressive Web App (installable via "Add to Home Screen", runs full screen, works offline after first load)
- **Hosting:** free static hosting (Netlify, Vercel, Cloudflare Pages or GitHub Pages)
- **Saving:** local storage per child profile for now. A backend for family multiplayer comes later; do not build one until asked.
- **Art:** low-poly, bright, cartoon style. Use free CC0 asset packs (Kenney, Quaternius). Record every asset's source and license in `ASSETS.md`.

## Game structure

One town is the hub. Each child has an avatar and a house in the town. One currency (coins) works everywhere.

**Design pattern:** the town is 3D (walking around, houses, shops). The learning activities are 2D screens shown over the 3D world (shop counter, coding board, quest dialogue). This keeps activities clear and quick to build.

### Districts

1. **Market Street** (money and maths): the child runs a shop, serves customers, gives change, buys stock, sets prices, saves for upgrades.
   - Middle: add prices, give correct change.
   - Big: set prices, buy stock, track profit.
2. **Inventor's Workshop** (logic and coding): build robots and program them with drag-and-drop instruction blocks.
   - Middle: short sequences and repeats.
   - Big: loops and simple conditions.
3. **Explorer's Island** (science and nature): discover and collect animals, plants and fossils into a journal; solve simple physics puzzles to unlock areas.
4. **Time Gate** (history and cultures): travel to historical places such as Andalusia, Ancient Egypt, Baghdad's House of Wisdom and the Silk Road; complete quests.

Districts feed each other: workshop robots can work in the shop, items found on the island sell in the market, history quests unlock rare decorations.

## Reward loop

- Coins and items earned in activities are spent on avatar outfits, house decoration and shop upgrades.
- Activities last about 10 to 15 minutes and always end with a reward.
- A parent-controlled daily play limit ends sessions gently ("the town is going to sleep").
- No ads, no real-money purchases, no loot boxes, no dark patterns.

## Build order

Build one step at a time. Each step must be playable on a real phone before moving on.

1. Project setup: Babylon.js + TypeScript + Vite, PWA config, deploy pipeline, landscape lock, a test scene that runs on phones.
2. 3D town: small town with low-poly assets, tap-to-move character, phone-friendly camera.
3. Child profiles and avatar creation, saved locally.
4. Market Street shop screen with customers, coins and change, two difficulty levels.
5. Shop upgrades and house decoration using coins.
6. Device testing and fixes.
7. Later: Inventor's Workshop, then Explorer's Island, then Time Gate, then family multiplayer.

Do not start a later step unless asked.

## Working rules

- Keep code simple and readable; the owner is not a full-time game developer.
- Small, focused commits with clear messages.
- When a step is done, update the "Progress" section below.
- Prefer working, simple solutions over clever, complex ones.
- If a decision would significantly change the design above, ask first.

## Progress

- [x] Step 1: Project setup
- [ ] Step 2: 3D town
- [ ] Step 3: Profiles and avatar
- [ ] Step 4: Market Street shop
- [ ] Step 5: Upgrades and decoration
- [ ] Step 6: Device testing
