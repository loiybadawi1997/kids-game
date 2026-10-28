import { Engine } from "@babylonjs/core/Engines/engine";
import { registerSW } from "virtual:pwa-register";
import { Game } from "./game/game";
import { loadQualitySetting } from "./game/graphics";
import { SettingsMenu } from "./ui/settings";
import { App } from "./app";

// Turn on the service worker so the game can be installed and works offline.
registerSW({ immediate: true });

const canvas = document.getElementById("game") as HTMLCanvasElement;
const fpsLabel = document.getElementById("fps") as HTMLDivElement;
const loading = document.getElementById("loading") as HTMLDivElement;
const hint = document.getElementById("hint") as HTMLDivElement;
// Add ?fps to the address to see the frame rate (handy when testing on phones).
const showFps = new URLSearchParams(location.search).has("fps");
fpsLabel.hidden = !showFps;

const engine = new Engine(canvas, true, { stencil: true, powerPreference: "high-performance" }, false);

// Let the loading screen appear before the (slightly slow) town building starts.
requestAnimationFrame(() =>
  setTimeout(() => {
    const game = new Game(engine, canvas, loadQualitySetting());
    game.setOnFirstTap(() => (hint.hidden = true));
    const settings = new SettingsMenu(game.graphics);
    const app = new App(game, settings, hint);

    let frame = 0;
    let last = performance.now();
    engine.runRenderLoop(() => {
      game.update();
      game.scene.render();
      frame++;

      // Check the frame rate twice a second (and let the graphics step down if it's too slow).
      if (frame % 30 === 0) {
        const now = performance.now();
        const fps = engine.getFps();
        game.graphics.watchFrameRate(fps, (now - last) / 1000);
        last = now;
        if (showFps) fpsLabel.textContent = `${fps.toFixed(0)} FPS · ${game.graphics.quality}`;
      }

      if (frame === 3) {
        // Handy for poking at the game from the browser console while testing.
        Object.assign(window as object, { game, app });
        loading.classList.add("done");
        app.showPicker();
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
