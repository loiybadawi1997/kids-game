import { Engine } from "@babylonjs/core/Engines/engine";
import { registerSW } from "virtual:pwa-register";
import { Game } from "./game/game";

// Turn on the service worker so the game can be installed and works offline.
registerSW({ immediate: true });

const canvas = document.getElementById("game") as HTMLCanvasElement;
const fpsLabel = document.getElementById("fps") as HTMLDivElement;
const loading = document.getElementById("loading") as HTMLDivElement;
const hint = document.getElementById("hint") as HTMLDivElement;
// Add ?fps to the address to see the frame rate (handy when testing on phones).
const showFps = new URLSearchParams(location.search).has("fps");
fpsLabel.hidden = !showFps;

// Antialiasing is on: it makes the cartoon edges look clean, and the
// automatic quality setting below lowers the resolution if a phone struggles.
const engine = new Engine(canvas, true, { stencil: false, powerPreference: "high-performance" }, false);

/*
 * Automatic quality: start sharp (up to 2x pixel density). If the frame rate
 * stays low, draw fewer pixels. Older phones get a slightly softer picture
 * but stay smooth.
 */
const dpr = window.devicePixelRatio || 1;
const qualityLevels = [Math.min(dpr, 2), Math.min(dpr, 1.5), 1, 0.8];
let quality = 0;
engine.setHardwareScalingLevel(1 / qualityLevels[quality]);

// Let the loading screen appear before the (slightly slow) town building starts.
requestAnimationFrame(() =>
  setTimeout(() => {
    const game = new Game(engine, canvas);
    game.setOnFirstTap(() => (hint.hidden = true));

    let frame = 0;
    let slowTime = 0;
    engine.runRenderLoop(() => {
      game.update();
      game.scene.render();
      frame++;

      // Check the frame rate twice a second.
      if (frame % 30 === 0) {
        const fps = engine.getFps();
        if (showFps) fpsLabel.textContent = `${fps.toFixed(0)} FPS · ${qualityLevels[quality]}x`;
        if (frame > 120 && fps < 40 && quality < qualityLevels.length - 1) {
          slowTime += 0.5;
          if (slowTime >= 2) {
            quality++;
            engine.setHardwareScalingLevel(1 / qualityLevels[quality]);
            slowTime = 0;
          }
        } else {
          slowTime = 0;
        }
      }

      if (frame === 3) {
        // Handy for poking at the game from the browser console while developing.
        if (import.meta.env.DEV) (window as unknown as { game: Game }).game = game;
        loading.classList.add("done");
        hint.hidden = false;
        setTimeout(() => loading.remove(), 600);
      }
    });
  }, 30),
);

window.addEventListener("resize", () => engine.resize());

// Android: when running full screen, ask the browser to keep landscape.
// This quietly does nothing on browsers that don't support it (e.g. iPhone).
function lockLandscape(): void {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
  };
  orientation.lock?.("landscape").catch(() => {});
}
lockLandscape();
window.addEventListener("pointerdown", lockLandscape, { once: true });
