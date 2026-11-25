// Hero assets (run: node scripts/build-hero.mjs)
//  1. hero-model.webp     — the model cut-out from the 2× Figma export (sharper,
//                           and exactly the Figma image-group aspect 1481×1119)
//  2. hero-bottle-*.webp  — the same crop of the bottle for every colourway.
//                           Only the glass is recoloured (hue remap of the
//                           magenta glass); the fingers, rings and rose-gold
//                           stripes are untouched, so the variants are
//                           pixel-identical apart from the scent itself.
//  3. hero-sky.webp       — one continuous sky plate (the model removed from
//                           the composite and the hole rebuilt), so the page
//                           only ever shows a single sky layer.
import sharp from 'sharp'
import path from 'node:path'
import { writeFileSync } from 'node:fs'

const r = (f) => path.join('design-raw', f)
const o = (f) => path.join('src/assets/img', f)

// ── helpers ──────────────────────────────────────────────────────────────────
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let h
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const t = (x) => {
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255]
}
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t) }

// ── 1 + 2: model and bottle variants ─────────────────────────────────────────
const SRC = 'hero-bg.png' // 2962 × 2238, transparent background
const { data: M, info } = await sharp(r(SRC)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height

// find the glass: magenta-violet, saturated, in the left-centre of the frame
const glass = new Float32Array(W * H)
let bx0 = W, by0 = H, bx1 = 0, by1 = 0
for (let y = Math.floor(H * 0.3); y < H * 0.95; y++) for (let x = Math.floor(W * 0.15); x < W * 0.65; x++) {
  const i = y * W + x
  if (M[i * 4 + 3] < 128) continue
  const [h, s, l] = rgb2hsl(M[i * 4], M[i * 4 + 1], M[i * 4 + 2])
  // hue window 298°–360°(+3) with soft shoulders, saturation gate
  const hw = h > 180 ? smooth(292, 306, h) : 1 - smooth(1, 6, h)
  const w = hw * smooth(0.12, 0.22, s) * smooth(0.04, 0.1, l)
  // the index fingernail reflects the glass; it must stay a nail
  const nx = (x - 871) / 75, ny = (y - 1215) / 95
  glass[i] = nx * nx + ny * ny < 1 ? 0 : w
  if (w > 0.5) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y) }
}
// the cap and gold collar sit above the glass; include them in the crop
const pad = 40
const crop = {
  left: Math.max(0, bx0 - pad), top: Math.max(0, by0 - Math.round((by1 - by0) * 0.28)),
  width: 0, height: 0,
}
crop.width = Math.min(W, bx1 + pad) - crop.left
crop.height = Math.min(H, by1 + pad) - crop.top
console.log('glass bbox', bx0, by0, bx1, by1, 'crop', crop)

const VARIANTS = {
  // target hue, saturation ×, lightness curve
  emerald: { hue: 158, sat: 0.95, light: (l) => l * 0.92 },
  gold: { hue: 30, sat: 1.0, light: (l) => clamp(0.1 + l * 1.02) },
  burgundy: { hue: 356, sat: 1.12, light: (l) => l * 0.78 },
}

await sharp(r(SRC)).resize({ width: 2400 }).webp({ quality: 84, alphaQuality: 92, effort: 5 }).toFile(o('hero-model.webp'))
console.log('✓ hero-model.webp')

const cw = crop.width, ch = crop.height
const mkCrop = async (name, fn) => {
  const out = Buffer.alloc(cw * ch * 4)
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = (y + crop.top) * W + (x + crop.left), di = y * cw + x
    let R = M[si * 4], G = M[si * 4 + 1], B = M[si * 4 + 2]
    if (fn && glass[si] > 0) {
      const [h, s, l] = rgb2hsl(R, G, B)
      const [nr, ng, nb] = fn(h, s, l)
      const k = glass[si]
      R = R * (1 - k) + nr * k; G = G * (1 - k) + ng * k; B = B * (1 - k) + nb * k
    }
    out[di * 4] = R; out[di * 4 + 1] = G; out[di * 4 + 2] = B
    out[di * 4 + 3] = M[si * 4 + 3]
  }
  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } })
    .resize({ width: Math.round(cw * (2400 / W)) })
    .webp({ quality: 86, alphaQuality: 92, effort: 5 }).toFile(o(`hero-bottle-${name}.webp`))
  console.log('✓', `hero-bottle-${name}.webp`)
}
await mkCrop('dilla', null)
for (const [name, v] of Object.entries(VARIANTS)) {
  await mkCrop(name, (h, s, l) => {
    // keep each pixel's offset from the glass's mean violet (≈335°)
    const dh = ((h - 335 + 540) % 360) - 180
    return hsl2rgb(v.hue + dh * 0.6, clamp(s * v.sat), v.light(l))
  })
}
// crop geometry, as fractions of the model image, for CSS placement
writeFileSync('src/sections/hero.bottle.json', JSON.stringify({
  left: crop.left / W, top: crop.top / H, width: cw / W, height: ch / H,
}, null, 2))

// ── 3: sky plate ─────────────────────────────────────────────────────────────
{
  const SW = 1440, SH = 1031
  const comp = await sharp(r('hx3.png')).resize(SW, SH).removeAlpha().raw().toBuffer()
  // generous dilation: hair strands and glass halos must not leak into the fill
  const cut = await sharp(r('hx2.png')).resize(SW, SH).ensureAlpha().extractChannel(3).blur(34).raw().toBuffer()
  const valid = (i) => (cut[i] < 3 ? 1 : 0)
  // push-pull fill
  let levels = []
  let w = SW, h = SH
  let col = new Float32Array(SW * SH * 3), wt = new Float32Array(SW * SH)
  for (let i = 0; i < SW * SH; i++) {
    const v = valid(i)
    wt[i] = v
    for (let c = 0; c < 3; c++) col[i * 3 + c] = comp[i * 3 + c] * v
  }
  levels.push({ w, h, col, wt })
  while (w > 1 || h > 1) {
    const nw = Math.ceil(w / 2), nh = Math.ceil(h / 2)
    const ncol = new Float32Array(nw * nh * 3), nwt = new Float32Array(nw * nh)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, j = (y >> 1) * nw + (x >> 1)
      nwt[j] += wt[i]
      for (let c = 0; c < 3; c++) ncol[j * 3 + c] += col[i * 3 + c]
    }
    w = nw; h = nh; col = ncol; wt = nwt
    levels.push({ w, h, col, wt })
  }
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l], C = levels[l + 1]
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const i = y * L.w + x, j = (y >> 1) * C.w + (x >> 1)
      const a = Math.min(1, L.wt[i]), cwt = C.wt[j] || 1
      for (let c = 0; c < 3; c++) {
        const own = L.wt[i] ? L.col[i * 3 + c] / L.wt[i] : 0
        L.col[i * 3 + c] = own * a + (C.col[j * 3 + c] / cwt) * (1 - a)
      }
      L.wt[i] = 1
    }
  }
  const fill = Buffer.alloc(SW * SH * 3)
  for (let i = 0; i < SW * SH * 3; i++) fill[i] = clamp(levels[0].col[i], 0, 255)
  const soft = await sharp(fill, { raw: { width: SW, height: SH, channels: 3 } }).blur(70).raw().toBuffer()
  // real sky where visible; rebuilt sky (plus a touch of film grain so it
  // doesn't read as a flat gradient) where the model was
  const out = Buffer.alloc(SW * SH * 3)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5)
  for (let i = 0; i < SW * SH; i++) {
    const a = clamp(1 - cut[i] / 22)
    const n = rnd() * 5
    for (let c = 0; c < 3; c++) out[i * 3 + c] = clamp(comp[i * 3 + c] * a + (soft[i * 3 + c] + n) * (1 - a), 0, 255)
  }
  await sharp(out, { raw: { width: SW, height: SH, channels: 3 } }).webp({ quality: 82 }).toFile(o('hero-sky.webp'))
  console.log('✓ hero-sky.webp')
}
