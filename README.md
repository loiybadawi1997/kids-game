# Kids Town

A 3D educational town game for kids aged 7 to 10. Built with Babylon.js,
TypeScript and Vite, and installable on phones as a Progressive Web App.

See `CLAUDE.md` for the full design and build plan.

## Play it

https://loiybadawi1997.github.io/kids-game/

On a phone, open the link, then:

- **iPhone (Safari):** Share button → "Add to Home Screen".
- **Android (Chrome):** ⋮ menu → "Add to Home screen" / "Install app".

The installed app opens full screen in landscape and works offline.

## How to play

- When the game opens, pick **who is playing** (or tap ➕ to make a new player).
  Up to six children, each with a name, a level (⭐ Middle for 7–8, 🌟 Big for 9–10),
  their own hero avatar (mecha, knight, cyberpunk, wizard or bot, see `docs/CHARACTERS.md`)
  and their own house on Home Lane. Tap ✏️ on a card to change it.
  Everything is saved on this device only.
- 🏠 walks you home, 🛒 walks you to your shop. At the shop counter tap **🍎 Open my shop!**
  to run the Fruit Shop for a day (about 10–15 minutes):
  - ⭐ Middle: pick the fruit each customer asks for, add up the price, give the right change.
  - 🌟 Big: first buy fruit from the farmer (budget 🪙 60) and set your prices, then serve
    customers; prices that are too high make customers say no. The day ends with a profit summary.
  - Every day ends with coins for the child, saved to their profile.
- Tap your picture (top left) to switch player.

- **Move the joystick** (bottom left) to walk, **⬆️ Jump** (bottom right) to jump, or **tap the ground** to walk there.
  The camera swings round behind your hero as they move, and lifts or turns when a building is in the way.
- **Tap a person** to walk over and say hi.
- **Drag** to turn the camera, **pinch** to zoom.

Tap ⚙️ (top right) to change the picture quality (Auto, Low, Medium, High).

Add `?fps` to the address to show the frame rate (useful when testing on phones).

## Work on it

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install
npm run dev      # local server; also prints a network URL you can open on your phone (same Wi-Fi)
npm run build    # checks types and builds the site into dist/
npm run preview  # serves the built site, like it will be online
```

## Code map

- `src/main.ts`: starts the engine, loading screen, automatic quality
- `src/app.ts`: moves between the screens (profiles, creator, town, shop)
- `src/profiles.ts`: saving the children's profiles
- `src/shop/`: the Fruit Shop day (`shopData.ts` has the maths rules, `shopScreen.ts` the screens)
- `src/ui/`: the 2D screens (profile picker, avatar creator, HUD, settings)
- `src/game/game.ts`: the game loop, tapping, camera
- `src/game/town.ts`: the town layout (where every house, tree and path goes)
- `src/game/props.ts`: how each object is built (houses, shops, trees...)
- `src/game/character.ts`: the heroes (parts, colours, skeleton and animations)
- `src/game/townsfolk.ts`: the people who live in town and what they say
- `src/game/navGrid.ts`: where characters can walk, and path finding
- `src/game/kit.ts`: loads the Kenney/Quaternius models (`public/models/`); `tools/import-models.mjs` makes that file
- `src/game/animals.ts`: the pets and wild animals walking around town
- `src/game/meshKit.ts`: helpers that merge shapes so the game stays fast
- `src/game/graphics.ts`: Low / Medium / High quality (shadows, bloom, patterns)
- `src/game/patterns.ts`: brick, wood and tile patterns drawn by the GPU
- `src/game/signs.ts`: all sign lettering, in one shared texture

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages
(see `.github/workflows/deploy.yml`).
