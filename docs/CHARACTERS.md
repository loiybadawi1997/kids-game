# Characters — Kids Town Heroes

Every character in Kids Town is a **hero**: the player avatars, the townsfolk, the shopkeepers and the shop customers. The heroes are based on the owner's **Forge3D – 3D Character Studio** design (originally a Three.js app), rebuilt for Babylon.js in `src/game/character.ts`.

## Hero types (archetypes)

Each type is a ready-made combination of parts and colours. A child can start from one and then change any part.

| Hero | Head | Body | Shoulders | Back | In hands | Colours (main / second / details / glow) | Finish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 🤖 **Mecha** | Visor | Reactor | Wings | Jets | Sword | `#1e293b` / `#f97316` / `#38bdf8` / `#00f0ff` | Carbon |
| 🛡️ **Knight** | Horns | Armour | Spikes | Cape | Shield | `#e2e8f0` / `#eab308` / `#991b1b` / `#fbbf24` | Metal |
| 😎 **Cyber** (cyberpunk) | Goggles | Vest | Guards | Battery | Blaster | `#0f172a` / `#ec4899` / `#06b6d4` / `#f43f5e` | Hex |
| 🧙 **Wizard** (sorcerer) | Hood | Robe | None | Orbs | Staff | `#2e1065` / `#c084fc` / `#38bdf8` / `#a855f7` | Matte |
| 🔵 **Bot** | Dome | Orb | Small | Battery | None | `#f8fafc` / `#3b82f6` / `#10b981` / `#10b981` | Shiny |

## Parts a child can choose

- **🪖 Head:** 🥽 Visor (glowing band), 🐂 Horns (helm with a glowing T-slit), 👓 Goggles (two glowing lenses), 🧙 Hood (cone hood with glowing eyes), 🔵 Dome (round head with glowing digital eyes)
- **🦺 Body:** ⚡ Reactor (glowing chest core), 🛡️ Armour (V-shaped breastplate), 🦺 Vest (pouches), 👘 Robe (with stole), ⚪ Orb (round droid body with a ring)
- **💪 Shoulders:** 🪽 Wings (three blade fins), ⛰️ Spikes and 🌙 Guards (pauldrons), 🔩 Small, 🚫 None
- **🎒 On my back:** 🚀 Jets (twin thrusters with glowing flames), 🦸 Cape, 🔋 Battery (glowing power cell), 🔮 Orbs (three floating glowing orbs with rings), 🚫 None
- **✋ In my hands:**
  - ⚔️ Sword (glowing blade) and 🔫 Blaster in the right hand
  - 🪄 Staff (glowing crystal) in the right hand
  - 🛡️ Shield on the left arm
  - 🚫 None

  There is no fighting anywhere in the game: this gear is just for show.
- **🎨 Colours:**
  - main: 10 swatches
  - second: 10 swatches
  - little details: 8 swatches
  - glow: 8 swatches
- **🪞 Finish** (how shiny the armour is): 🔧 Metal, 🧱 Matte, ✨ Shiny, 🕸️ Carbon, ⬡ Hex
- **🧍 How I stand** (pose when not walking): 🙂 Relaxed, 🦸 Heroic (item held high), 🫡 Salute, 💪 Ready

## How heroes move

- **Controls:** the player walks with the on-screen joystick, jumps with ⬆️ Jump, or taps the ground to walk there.

- **Walking:** legs stride, knees bend, arms swing, hips bob and twist.
- **Standing:** in the chosen pose, gently breathing and looking around.
- **Saying hello:** the left arm waves and the hero does a little hop. This happens when meeting a friend, when a child picks their profile, and after a shop day.
- **Jumping:** knees tuck up and arms go out while in the air.
- **Smoothing:** every joint glides smoothly to its new position.

## How they are built (for developers)

- **Parts and size:** parts are simple shapes (bevelled boxes, cylinders, spheres, tori, a lathe for thruster nozzles, tubes for horns, extruded outlines for the breastplate, shoulder guards, blade, shield, blaster and cape). Sizes are in the original studio units, where a hero is about 3.7 units tall, and the whole hero is scaled by 0.475 to about **1.75 m**.
- **Two levels of detail:**
  - **Rich** (Medium and High quality, and the avatar creator): smooth rounded armour, and realistic metal (PBR) materials for the main armour, trim, details, frame, joints, glow and blade. They reflect a little "photo studio" (a dim room with three bright light panels) that is drawn once into a cube texture. Carbon and hex finishes use the Forge3D patterns as textures, and glowing parts really emit light (bloom on High).
  - **Simple** (Low quality): one vertex-colour material with a cheaper bevel.

  Changing the quality rebuilds every hero.
- **One mesh per hero:** all parts are merged into **one mesh** with **one material**, moved by an 11-bone skeleton: hips, chest, head, upper and lower arms, thighs and calves. Each hero is a single draw call, and a single shadow caster.
- **Glow (simple heroes):** glowing parts are marked in the vertex colour alpha. A small material plugin (`GlowPlugin`) draws them bright and unlit, and bloom (on High quality) makes them shine.
- **Finishes:** each finish sets how metallic and rough the armour is, from the Forge3D presets.
- **Saved looks:** a hero look is saved with the child's profile as `CharacterLook`:
  - `archetype`, `headStyle`, `torsoStyle`, `shoulderStyle`, `backStyle`, `weaponStyle`
  - `primaryColor`, `secondaryColor`, `accentColor`, `glowColor`
  - `finish`, `pose`

  `normalizeLook()` repairs any saved look. Profiles saved before the heroes (kid looks with hair and clothes) become a Mecha in their old favourite colours.
- **Townsfolk:** townsfolk, shopkeepers and customers get random heroes (`randomLook()`). The two shopkeepers are always friendly Bots.
