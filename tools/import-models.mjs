/*
 * Converts downloaded CC0 model packs into one small file the game can load
 * offline: public/models/kit.bin + public/models/kit.json.
 *
 * Every model is flattened into a single mesh: positions, normals and a
 * colour per vertex (material colours and colour-palette textures are
 * "baked" into the vertices). That way each model is one draw call and the
 * game needs no glTF loader or decompression code.
 *
 * You only need this when adding models. It needs these extra packages
 * (not installed by default because the game itself doesn't use them):
 *   npm i --no-save @gltf-transform/core @gltf-transform/extensions draco3dgltf meshoptimizer pngjs jpeg-js
 * Usage:
 *   node tools/import-models.mjs <list.json> <outDir>
 * where list.json is [{ "name": "house-a", "file": "path/to/model.gltf", "pack": "...", "author": "...", "license": "CC0-1.0", "source": "url" }, ...]
 */
import fs from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { MeshoptDecoder } from "meshoptimizer";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";

const [listFile, outDir] = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(listFile, "utf8"));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "meshopt.decoder": MeshoptDecoder,
});

const toSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const images = new Map();
function decodeImage(texture) {
  if (!texture) return null;
  if (images.has(texture)) return images.get(texture);
  const data = texture.getImage();
  const mime = texture.getMimeType();
  let img = null;
  try {
    if (mime === "image/png") {
      const png = PNG.sync.read(Buffer.from(data));
      img = { w: png.width, h: png.height, px: png.data };
    } else if (mime === "image/jpeg") {
      const j = jpeg.decode(Buffer.from(data), { useTArray: true });
      img = { w: j.width, h: j.height, px: j.data };
    }
  } catch (e) {
    console.warn("  could not read texture", mime, e.message);
  }
  images.set(texture, img);
  return img;
}

function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

const chunks = [];
let offset = 0;
const index = {};
const push = (typed) => {
  const pad = (4 - (offset % 4)) % 4;
  if (pad) {
    chunks.push(Buffer.alloc(pad));
    offset += pad;
  }
  const start = offset;
  chunks.push(Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength));
  offset += typed.byteLength;
  return start;
};

for (const entry of list) {
  const doc = await io.read(entry.file);
  const pos = [];
  const nrm = [];
  const col = [];
  const idx = [];
  const visit = (node, parentMatrix) => {
    const m = mul(parentMatrix, node.getMatrix());
    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        if (prim.getMode() !== 4) continue; // triangles only
        const P = prim.getAttribute("POSITION");
        const N = prim.getAttribute("NORMAL");
        const UV = prim.getAttribute("TEXCOORD_0");
        const C = prim.getAttribute("COLOR_0");
        const mat = prim.getMaterial();
        const factor = mat ? mat.getBaseColorFactor() : [1, 1, 1, 1];
        const texInfo = mat ? mat.getBaseColorTextureInfo() : null;
        const img = mat ? decodeImage(mat.getBaseColorTexture()) : null;
        const tt = texInfo ? texInfo.getExtension("KHR_texture_transform") : null;
        const base = pos.length / 3;
        const e = [0, 0, 0];
        for (let i = 0; i < P.getCount(); i++) {
          P.getElement(i, e);
          const x = m[0] * e[0] + m[4] * e[1] + m[8] * e[2] + m[12];
          const y = m[1] * e[0] + m[5] * e[1] + m[9] * e[2] + m[13];
          const z = m[2] * e[0] + m[6] * e[1] + m[10] * e[2] + m[14];
          pos.push(x, y, z);
          if (N) {
            N.getElement(i, e);
            let nx = m[0] * e[0] + m[4] * e[1] + m[8] * e[2];
            let ny = m[1] * e[0] + m[5] * e[1] + m[9] * e[2];
            let nz = m[2] * e[0] + m[6] * e[1] + m[10] * e[2];
            const l = Math.hypot(nx, ny, nz) || 1;
            nrm.push(nx / l, ny / l, nz / l);
          } else nrm.push(0, 1, 0);
          let r = toSrgb(factor[0]);
          let g = toSrgb(factor[1]);
          let b = toSrgb(factor[2]);
          if (C) {
            const c = [1, 1, 1, 1];
            C.getElement(i, c);
            r *= toSrgb(c[0]);
            g *= toSrgb(c[1]);
            b *= toSrgb(c[2]);
          }
          if (img && UV) {
            const uv = [0, 0];
            UV.getElement(i, uv);
            if (tt) {
              const o = tt.getOffset();
              const s = tt.getScale();
              uv[0] = uv[0] * s[0] + o[0];
              uv[1] = uv[1] * s[1] + o[1];
            }
            const u = ((uv[0] % 1) + 1) % 1;
            const v = ((uv[1] % 1) + 1) % 1;
            const px = Math.min(img.w - 1, Math.floor(u * img.w));
            const py = Math.min(img.h - 1, Math.floor(v * img.h));
            const k = (py * img.w + px) * 4;
            r *= img.px[k] / 255;
            g *= img.px[k + 1] / 255;
            b *= img.px[k + 2] / 255;
          }
          col.push(Math.round(Math.min(1, r) * 255), Math.round(Math.min(1, g) * 255), Math.round(Math.min(1, b) * 255));
        }
        const I = prim.getIndices();
        if (I) for (let i = 0; i < I.getCount(); i++) idx.push(base + I.getScalar(i));
        else for (let i = 0; i < P.getCount(); i++) idx.push(base + i);
      }
    }
    for (const child of node.listChildren()) visit(child, m);
  };
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const scene of doc.getRoot().listScenes()) for (const n of scene.listChildren()) visit(n, identity);
  if (pos.length === 0) {
    console.warn("SKIP (no triangles)", entry.name);
    continue;
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], pos[i + k]);
    max[k] = Math.max(max[k], pos[i + k]);
  }
  const vcount = pos.length / 3;
  const big = vcount > 65535;
  index[entry.name] = {
    vertices: vcount,
    triangles: idx.length / 3,
    position: push(new Float32Array(pos)),
    normal: push(new Int8Array(nrm.map((v) => Math.round(v * 127)))),
    color: push(new Uint8Array(col)),
    index: push(big ? new Uint32Array(idx) : new Uint16Array(idx)),
    indexCount: idx.length,
    index32: big,
    min: min.map((v) => +v.toFixed(4)),
    max: max.map((v) => +v.toFixed(4)),
    pack: entry.pack,
    author: entry.author,
    license: entry.license,
    source: entry.source,
  };
  console.log(entry.name.padEnd(24), String(vcount).padStart(6), "verts", String(idx.length / 3).padStart(6), "tris");
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "kit.bin"), Buffer.concat(chunks));
fs.writeFileSync(path.join(outDir, "kit.json"), JSON.stringify(index, null, 1));
console.log("models:", Object.keys(index).length, "bytes:", offset);
