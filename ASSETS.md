# Assets

Every third-party asset used in the game, with its source and license.

| Asset | Source | License |
| ----- | ------ | ------- |
| _none yet_ | | |

All 3D art is currently made in code from simple shapes, so there are no
third-party files to credit:

- Characters: `src/game/character.ts`
- Houses, shops, trees, fountain, pond, playground and so on: `src/game/props.ts`
- Sky, sun and clouds: `src/game/sky.ts`
- Surface patterns (brick, wood, roof tiles, paving, grass) are drawn by a
  shader from world position: `src/game/patterns.ts` (no image files)
- Sign lettering is drawn at runtime with the device's own fonts and emoji: `src/game/signs.ts`
- Ducks, butterflies and fountain water: `src/game/ambient.ts`

The app icons in `public/` (`favicon.svg`, `icon-192.png`, `icon-512.png`,
`apple-touch-icon.png`) were made for this project.
