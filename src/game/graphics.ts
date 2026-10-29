import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { PatternPlugin } from "./patterns";

/*
 * Graphics quality: Low, Medium or High.
 *
 *   Low    – no real-time shadows (soft blobs instead), no surface patterns,
 *            fewer pixels. Made for older Android phones.
 *   Medium – soft sun shadows, brick/wood/tile patterns, colour grading.
 *   High   – sharper shadows, sharper picture, glowing bloom and anti-aliasing.
 *
 * The level is guessed from the device, then lowered automatically if the
 * game runs slowly. Parents can also pick one in the settings menu.
 */

export type Quality = "low" | "medium" | "high";
export type QualitySetting = Quality | "auto";

const SETTING_KEY = "kidsTown.quality";
const AUTO_LEVEL_KEY = "kidsTown.autoQuality";

export function loadQualitySetting(): QualitySetting {
  try {
    const v = localStorage.getItem(SETTING_KEY);
    if (v === "low" || v === "medium" || v === "high" || v === "auto") return v;
  } catch {
    // Storage can be blocked (private browsing); just use auto.
  }
  return "auto";
}

export function saveQualitySetting(s: QualitySetting): void {
  try {
    localStorage.setItem(SETTING_KEY, s);
  } catch {
    // ignore
  }
}

/** A best guess from what the browser tells us about the device. */
export function guessQuality(engine: Engine): Quality {
  try {
    const remembered = localStorage.getItem(AUTO_LEVEL_KEY);
    if (remembered === "low" || remembered === "medium" || remembered === "high") return remembered;
  } catch {
    // ignore
  }
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const gpu = engine.getGlInfo().renderer ?? "";

  if (engine.webGLVersion < 2) return "low";
  if (!mobile) return memory >= 4 ? "high" : "medium";
  if (memory <= 2 || cores <= 4 || /Mali-4|Mali-T|Adreno \(TM\) [2-5]\d\d|PowerVR|SGX/i.test(gpu)) return "low";
  if (/Apple/i.test(gpu) && cores >= 6) return "high";
  if (/Adreno \(TM\) (6[4-9]\d|7\d\d|8\d\d)|Mali-G(7[1-9]|7\d\d|[6-9]1\d)|Immortalis|Xclipse/i.test(gpu) && memory >= 6) return "high";
  return "medium";
}

function rememberAutoLevel(q: Quality): void {
  try {
    localStorage.setItem(AUTO_LEVEL_KEY, q);
  } catch {
    // ignore
  }
}

export class Graphics {
  quality: Quality = "medium";
  private shadows: ShadowGenerator | null = null;
  private pipeline: DefaultRenderingPipeline | null = null;
  private plugins: PatternPlugin[];
  private casters: AbstractMesh[] = [];
  private onChange: ((q: Quality) => void)[] = [];

  // For the automatic slow-down check.
  private slowSeconds = 0;
  private watchTime = 0;

  constructor(
    private engine: Engine,
    private scene: Scene,
    private camera: Camera,
    private sun: DirectionalLight,
    /** Big town meshes: they cast and receive shadows. */
    private solid: AbstractMesh[],
    /** Meshes that only receive shadows (the ground). */
    private receivers: AbstractMesh[],
    patternMaterials: StandardMaterial[],
    public setting: QualitySetting,
  ) {
    this.plugins = patternMaterials.map((m) => new PatternPlugin(m));
    this.setupColourGrading();
  }

  /** Characters and other moving things that should cast shadows. */
  addCaster(...meshes: AbstractMesh[]): void {
    this.casters.push(...meshes);
    const map = this.shadows?.getShadowMap();
    if (map) map.renderList!.push(...meshes);
  }

  whenChanged(fn: (q: Quality) => void): void {
    this.onChange.push(fn);
  }

  /** Cheerful colour grading: a bit more contrast and colour, warm highlights, cool shadows. */
  private setupColourGrading(): void {
    const ip = this.scene.imageProcessingConfiguration;
    ip.isEnabled = true;
    ip.toneMappingEnabled = false;
    ip.contrast = 1.1;
    ip.exposure = 1.04;
    const curves = new ColorCurves();
    curves.globalSaturation = 18;
    curves.highlightsHue = 45;
    curves.highlightsDensity = 18;
    curves.highlightsSaturation = 20;
    curves.shadowsHue = 220;
    curves.shadowsDensity = 12;
    curves.shadowsSaturation = 25;
    ip.colorCurves = curves;
    ip.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    ip.vignetteColor = new Color4(0.55, 0.45, 0.4, 0);
    ip.vignetteWeight = 1.2;
    ip.vignetteStretch = 0.4;
  }

  apply(q: Quality): void {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    const density = q === "high" ? Math.min(dpr, 2) : q === "medium" ? Math.min(dpr, 1.6) : Math.min(dpr, 1.25);
    this.engine.setHardwareScalingLevel(1 / density);

    for (const p of this.plugins) p.active = q !== "low";
    const ip = this.scene.imageProcessingConfiguration;
    ip.colorCurvesEnabled = q !== "low";
    ip.vignetteEnabled = q === "high";

    // --- Sun shadows ---
    this.shadows?.dispose();
    this.shadows = null;
    for (const m of [...this.solid, ...this.receivers]) m.receiveShadows = false;
    if (q !== "low") {
      const sg = new ShadowGenerator(q === "high" ? 2048 : 1024, this.sun);
      if (this.engine.webGLVersion >= 2) {
        sg.usePercentageCloserFiltering = true;
        sg.filteringQuality = q === "high" ? ShadowGenerator.QUALITY_MEDIUM : ShadowGenerator.QUALITY_LOW;
      } else {
        sg.usePoissonSampling = true;
      }
      sg.bias = 0.0012;
      sg.normalBias = 0.025;
      sg.setDarkness(0.38); // soft, friendly shadows rather than black ones
      sg.transparencyShadow = false;
      const list = sg.getShadowMap()!.renderList!;
      list.push(...this.solid, ...this.casters);
      for (const m of [...this.solid, ...this.receivers]) m.receiveShadows = true;
      this.sun.autoUpdateExtends = true;
      this.sun.autoCalcShadowZBounds = true;
      this.shadows = sg;
    }

    // --- Bloom and anti-aliasing (High only: these cost a full-screen pass) ---
    this.pipeline?.dispose();
    this.pipeline = null;
    if (q === "high") {
      const pipe = new DefaultRenderingPipeline("pipeline", false, this.scene, [this.camera]);
      pipe.samples = this.engine.webGLVersion >= 2 ? 4 : 1;
      pipe.fxaaEnabled = this.engine.webGLVersion < 2;
      pipe.bloomEnabled = true;
      pipe.bloomThreshold = 0.9;
      pipe.bloomWeight = 0.28;
      pipe.bloomKernel = 48;
      pipe.bloomScale = 0.5;
      pipe.imageProcessingEnabled = true;
      this.pipeline = pipe;
    }

    for (const fn of this.onChange) fn(q);
  }

  /** Called a few times a second with the current frame rate. In "auto", steps down if it stays slow. */
  watchFrameRate(fps: number, seconds: number): void {
    this.watchTime += seconds;
    if (this.setting !== "auto" || this.quality === "low" || this.watchTime < 4) return;
    if (fps < 34) {
      this.slowSeconds += seconds;
      if (this.slowSeconds >= 3) {
        this.slowSeconds = 0;
        this.watchTime = 0;
        const lower: Quality = this.quality === "high" ? "medium" : "low";
        rememberAutoLevel(lower);
        this.apply(lower);
      }
    } else {
      this.slowSeconds = Math.max(0, this.slowSeconds - seconds);
    }
  }

  /** Change the setting from the menu. */
  choose(setting: QualitySetting): void {
    this.setting = setting;
    saveQualitySetting(setting);
    this.watchTime = 0;
    if (setting === "auto") {
      try {
        localStorage.removeItem(AUTO_LEVEL_KEY);
      } catch {
        // ignore
      }
      this.apply(guessQuality(this.engine));
    } else {
      this.apply(setting);
    }
  }
}
