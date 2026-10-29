import { Material } from "@babylonjs/core/Materials/material";
import { MaterialDefines } from "@babylonjs/core/Materials/materialDefines";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";

/**
 * Surface patterns, drawn by the GPU instead of loaded from image files.
 * They are worked out from each pixel's position in the world, so bricks
 * stay the same size on every wall and nothing needs to be downloaded.
 */
export enum Pattern {
  None = 0,
  Brick = 1,
  Wood = 2,
  RoofTiles = 3,
  Paving = 4,
  Plaster = 5,
  Grass = 6,
  Shingles = 7,
  Cobbles = 8,
}

/** Patterns are stored in the vertex colour's alpha: 1.0 = none, lower = pattern number. */
export function encodePattern(p: Pattern): number {
  return 1 - p / 16;
}

const GLSL_FUNCTIONS = `
float patHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float patNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = patHash(i);
  float b = patHash(i + vec2(1.0, 0.0));
  float c = patHash(i + vec2(0.0, 1.0));
  float d = patHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// Staggered blocks (bricks, paving, tiles). Returns: x = distance to the joint (0..0.5), y = random tint per block.
vec2 patBlocks(vec2 uv, vec2 size) {
  float row = floor(uv.y / size.y);
  float x = uv.x / size.x + 0.5 * mod(row, 2.0);
  vec2 f = vec2(fract(x), fract(uv.y / size.y));
  float edge = min(min(f.x, 1.0 - f.x) * size.x, min(f.y, 1.0 - f.y) * size.y);
  return vec2(edge, patHash(vec2(floor(x), row)));
}
float patternShade(float id, vec3 pos, vec3 n) {
  // Choose 2D coordinates for this surface: floors use x/z,
  // walls and roofs run along the wall with height going up.
  vec2 uv;
  vec3 an = abs(n);
  if (an.y > 0.92) {
    uv = pos.xz;
  } else {
    vec2 t = normalize(vec2(-n.z, n.x) + vec2(1e-4, 0.0));
    uv = vec2(dot(pos.xz, t), pos.y);
  }
  float shade = 1.0;
  if (id < 0.5) {
    shade = 1.0;
  } else if (id < 1.5) {           // brick
    vec2 b = patBlocks(uv, vec2(0.5, 0.22));
    shade = mix(1.12, 0.9 + 0.1 * b.y, smoothstep(0.012, 0.028, b.x));
  } else if (id < 2.5) {           // wood boards
    float board = fract(uv.y / 0.26);
    float grain = 0.95 + 0.05 * patNoise(vec2(uv.x * 1.5, uv.y * 12.0 + floor(uv.y / 0.26) * 7.0));
    shade = grain * mix(0.8, 1.0, smoothstep(0.0, 0.12, board));
  } else if (id < 3.5) {           // roof tiles (rows with a shadow under each overlap)
    vec2 b = patBlocks(uv, vec2(0.36, 0.26));
    float row = fract(uv.y / 0.26);
    shade = (0.92 + 0.1 * b.y) * mix(0.78, 1.04, smoothstep(0.0, 0.55, row));
    shade *= mix(0.88, 1.0, smoothstep(0.0, 0.02, b.x));
  } else if (id < 4.5) {           // paving stones
    vec2 b = patBlocks(uv, vec2(0.75, 0.55));
    shade = mix(0.89, 0.96 + 0.06 * b.y, smoothstep(0.02, 0.05, b.x));
  } else if (id < 5.5) {           // plaster: very soft blotches
    shade = 0.96 + 0.06 * patNoise(uv * 2.2);
  } else if (id < 6.5) {           // grass: soft patches and tiny speckles
    shade = 0.93 + 0.08 * patNoise(uv * 0.35) + 0.04 * patNoise(uv * 2.7);
  } else if (id < 7.5) {           // wooden shingles
    vec2 b = patBlocks(uv, vec2(0.28, 0.2));
    float row = fract(uv.y / 0.2);
    shade = (0.88 + 0.16 * b.y) * mix(0.8, 1.0, smoothstep(0.0, 0.4, row));
  } else {                         // small cobbles, staggered, softly rounded
    vec2 b = patBlocks(uv, vec2(0.42, 0.34));
    shade = mix(0.9, 0.97 + 0.07 * b.y, smoothstep(0.012, 0.06, b.x));
  }
  return shade;
}
`;

/**
 * Adds the patterns to a normal Babylon StandardMaterial. When the plugin is
 * switched off (Low quality) the material is exactly as before.
 */
export class PatternPlugin extends MaterialPluginBase {
  private _active = false;

  constructor(material: Material) {
    super(material, "Patterns", 200, { PATTERNS: false });
    this._enable(true);
  }

  get active(): boolean {
    return this._active;
  }

  set active(value: boolean) {
    if (this._active === value) return;
    this._active = value;
    this.markAllDefinesAsDirty();
  }

  prepareDefines(defines: MaterialDefines): void {
    defines["PATTERNS"] = this._active;
  }

  getClassName(): string {
    return "PatternPlugin";
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    // Babylon ignores vertex colour alpha on solid meshes, so pass it along ourselves.
    if (shaderType === "vertex") {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `#if defined(PATTERNS) && defined(VERTEXCOLOR)\nvarying float vPatternId;\n#endif`,
        CUSTOM_VERTEX_MAIN_END: `#if defined(PATTERNS) && defined(VERTEXCOLOR)\nvPatternId = color.a;\n#endif`,
      };
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `#if defined(PATTERNS) && defined(VERTEXCOLOR)\nvarying float vPatternId;\n${GLSL_FUNCTIONS}\n#endif`,
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
#if defined(PATTERNS) && defined(VERTEXCOLOR) && defined(NORMAL)
{
  float patId = floor((1.0 - vPatternId) * 16.0 + 0.5);
  if (patId > 0.5) {
    float patShade = patternShade(patId, vPositionW, normalize(vNormalW));
    // Fade patterns out in the distance, where they would only shimmer.
    float patFade = smoothstep(28.0, 60.0, distance(vEyePosition.xyz, vPositionW));
    baseColor.rgb *= mix(patShade, 1.0, patFade);
  }
}
#endif`,
    };
  }
}
