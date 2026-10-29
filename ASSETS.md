# Assets

Every third-party asset used in the game, with its source and licence.

## 3D models (`public/models/kit.bin` + `kit.json`)

These are artist-made models released under **CC0 1.0** (public domain). They
were converted by `tools/import-models.mjs` (list in `tools/models.json`) into
one small file: colours baked into the vertices, compression removed, so the
game loads them offline with no extra code.

- **Kenney** (https://kenney.nl) releases all of his assets under CC0. Everything
  here comes from Kenney's Nature Kit, Food Kit, City Kit and house models.
- **Quaternius** (https://quaternius.com) animals: CC0.
- **Creative Trio** models (ferris wheel, wind turbine, ice-cream truck): marked
  CC0 (licence id 1) on pmndrs market (market.pmnd.rs).

They were downloaded from two public mirrors (the official sites can't be
reached from the build machine):

- `pmndrs/market-assets` on GitHub, the asset store behind market.pmnd.rs
- the npm package `@netforge/asset-library-files`, whose NOTICE lists Kenney
  (Nature Kit, Food Kit, City Kit Commercial, Car Kit) and Quaternius as CC0
  sources

| Model | Author | Pack | Licence | Source |
| ----- | ------ | ---- | ------- | ------ |
| `m-apple` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/apple |
| `m-banana` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/banana |
| `m-barrel` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/barrel |
| `m-bread` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/bread |
| `m-broccoli` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/broccoli |
| `m-cabbage` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/cabbage |
| `m-cake` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/cake |
| `m-cake-birthday` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/cake-birthday |
| `m-candy-bar` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/candy-bar |
| `m-carrot` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/carrot |
| `m-cherries` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/cherries |
| `m-cookie` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/cookie |
| `m-corn` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/corn |
| `m-croissant` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/croissant |
| `m-cupcake` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/cupcake |
| `m-donut-sprinkles` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/donut-sprinkles |
| `m-eggplant` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/eggplant |
| `m-ferris-wheel` | Creative Trio | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/ferris-wheel |
| `m-formation-rock` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/formation-rock |
| `m-formation-stone` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/formation-stone |
| `m-grapes` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/grapes |
| `m-house-18` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/house-18 |
| `m-house-3` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/house-3 |
| `m-house-4` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/house-4 |
| `m-house-5` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/house-5 |
| `m-house-7` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/house-7 |
| `m-house1` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/house1 |
| `m-ice-cream` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/ice-cream |
| `m-ice-cream-cone` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/ice-cream-cone |
| `m-ice-cream-cup` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/ice-cream-cup |
| `m-ice-cream-truck` | Creative Trio | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/ice-cream-truck |
| `m-lemon` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/lemon |
| `m-loaf` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/loaf |
| `m-loaf-baguette` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/loaf-baguette |
| `m-loaf-round` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/loaf-round |
| `m-lollypop` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/lollypop |
| `m-muffin` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/muffin |
| `m-orange` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/orange |
| `m-palm-long` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/palm-long |
| `m-palm-short` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/palm-short |
| `m-pear` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/pear |
| `m-pie` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/pie |
| `m-pineapple` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/pineapple |
| `m-popsicle` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/popsicle |
| `m-pumpkin` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/pumpkin |
| `m-strawberry` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/strawberry |
| `m-sundae` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/sundae |
| `m-tomato` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/tomato |
| `m-tower` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/tower |
| `m-tree-big` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/tree-big |
| `m-tree-small` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/tree-small |
| `m-watermelon` | Kenney | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/watermelon |
| `m-wind-turbine` | Creative Trio | pmndrs market (market.pmnd.rs) | CC0-1.0 | https://github.com/pmndrs/market-assets/tree/main/files/models/wind-turbine |
| `n-barrels` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-bush` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-bush-large` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-campfire` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-cat` | Quaternius | Quaternius animals (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-coin` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-crab` | Quaternius | Quaternius animals (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-crate` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-deer` | Quaternius | Quaternius animals (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-delivery-van` | Kenney | Kenney Car Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-flower-red` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-fox` | Quaternius | Quaternius animals (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-frog` | Quaternius | Quaternius animals (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-gem-pink` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-husky` | Quaternius | Quaternius animals (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-log` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-mushroom-red` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-pug` | Quaternius | Quaternius animals (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-rock-large` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-rock-small` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-rock-tall` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-shiba` | Quaternius | Quaternius animals (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-stump` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-tent` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-tree-autumn` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-tree-dark` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-tree-fat` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-tree-oak` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-tree-pine` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |
| `n-tree-pine-tall` | Kenney | Kenney Nature Kit (via @netforge/asset-library-files) | CC0-1.0 | https://www.npmjs.com/package/@netforge/asset-library-files |

## Made for this project

- The heroes (`src/game/character.ts`) are based on the owner's own
  "Forge3D – 3D Character Studio" design, rebuilt for Babylon.js
  (see `docs/CHARACTERS.md`).
- Shops, the Town Hall, paths, the plaza, fountain, pond, lamps, benches, fences,
  hedges, flowers, the sky and clouds are built in code from simple shapes
  (`src/game/props.ts`, `src/game/town.ts`, `src/game/sky.ts`, `src/game/ambient.ts`).
- Surface patterns (brick, wood, roof tiles, paving, grass) are drawn by a
  shader (`src/game/patterns.ts`), and the Forge3D carbon and hex finishes are
  drawn on a canvas, so there are no image files.
- Sign lettering is drawn at runtime with the device's own fonts and emoji
  (`src/game/signs.ts`).
- The app icons in `public/` were made for this project.
