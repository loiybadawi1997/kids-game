import { Engine } from "@babylonjs/core/Engines/engine";
import { registerSW } from "virtual:pwa-register";
import { createTestScene } from "./testScene";

// Turn on the service worker so the game can be installed and works offline.
registerSW({ immediate: true });

const canvas = document.getElementById("game") as HTMLCanvasElement;
const fpsLabel = document.getElementById("fps") as HTMLDivElement;

// antialias is off and we render at most at 2x pixel density: phone screens are
// very sharp, and drawing every pixel at 3x makes older phones slow and hot.
const engine = new Engine(canvas, false, { stencil: false, powerPreference: "high-performance" }, false);
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

const scene = createTestScene(engine, canvas);

let frame = 0;
engine.runRenderLoop(() => {
  scene.render();
  // Update the FPS counter twice a second-ish, not every frame.
  if (++frame % 30 === 0) {
    fpsLabel.textContent = `${engine.getFps().toFixed(0)} FPS`;
  }
});

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
