// Emerald Couture + Luxury Gold hero bottles from their real photographs
// (run: node scripts/build-hero-variants.mjs)
//
// The Figma file holds a full hero shot per scent (design-raw/hero-emerald.png
// — already cut out — and design-raw/hero-gold.png on its sky). They are
// separate takes: the body matches the Dilla base (hero-bg.png) after a
// similarity transform, but hand and bottle sit a touch lower-left. So each
// layer carries its own hand + bottle, cut from its own photograph, registered
// onto hero-bg's pixel frame and feathered into the model at the crop edges.
//
// Dilla and Burgundy are untouched (scripts/build-hero.mjs).
// Writes src/assets/img/hero-bottle-{emerald,gold}.webp and
// src/sections/hero.variants.json (each crop as fractions of the model image).
import sharp from 'sharp'
import { writeFileSync, readFileSync } from 'node:fs'

const W = 2962, H = 2238 // hero-bg.png
const OUT_W = 2400 // hero-model.webp width
const BASE = JSON.parse(readFileSync('src/sections/hero.bottle.json', 'utf8'))
const TOP = Math.round(BASE.top * H), HEIGHT = Math.round(BASE.height * H)

// registration onto hero-bg, measured on the body (scripts/register-hero-take.mjs):
// base_px = variant_px * s + t
const SHOTS = {
  // (photo: the same take on its sky — Figma ships emerald both ways)
  emerald: { src: 'design-raw/hero-emerald.png', photo: 'design-raw/hero-emerald-sky.png', s: 2.1115, tx: -80.7, ty: 0.3 },
  gold: { src: 'design-raw/hero-gold.png', photo: 'design-raw/hero-gold.png', s: 2.1035, tx: -75.1, ty: -1.4, matteFrom: 'design-raw/hero-emerald.png' },
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

const hero = await sharp('design-raw/hero-bg.png').ensureAlpha().raw().toBuffer()

/** normalised blur: mean colour of the pixels where m = 1, spread into the rest */
async function fillBlur(rgb, m, w, h, sigma) {
  // colour and weight blurred separately: sharp premultiplies RGBA, which
  // would darken the estimate
  const pre = Buffer.alloc(w * h * 3), wt = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) pre[i * 3 + c] = rgb[i * 4 + c] * m[i]
    wt[i] = 255 * m[i]
  }
  const b = await sharp(pre, { raw: { width: w, height: h, channels: 3 } }).blur(sigma).raw().toBuffer()
  const a = await sharp(wt, { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer()
  const out = new Float32Array(w * h * 3)
  for (let i = 0; i < w * h; i++) {
    const k = a[i] / 255
    for (let c = 0; c < 3; c++) out[i * 3 + c] = k > 0.004 ? b[i * 3 + c] / k : 0
  }
  out.weight = a
  return out
}

/**
 * A matte for the gold take, which only exists on its sky. Trimap from the
 * emerald take's (near-identical pose) matte, widened enough to cover the
 * small difference in pose; across the unknown band each pixel's alpha is its
 * colour's position between the local sky and the local subject.
 */
async function matteOnSky(src, guide) {
  const { data: img, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width, h = info.height
  const g = await sharp(guide).ensureAlpha().extractChannel(3).raw().toBuffer()
  const R = 22 // px, unknown band half-width
  const grow = await sharp(g, { raw: { width: w, height: h, channels: 1 } }).blur(R / 2).extractChannel(0).raw().toBuffer()
  const fg = new Float32Array(w * h), bg = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    // sky must also *look* like sky, or it's not definite background
    const r = img[i * 4], gg = img[i * 4 + 1], b = img[i * 4 + 2]
    const skyish = b - r > 25 || (b >= r && Math.min(r, gg, b) > 190)
    const sky = b - r > 45 && b > 150 // unmistakably sky, whatever the guide says
    fg[i] = grow[i] > 250 && g[i] > 250 && !sky ? 1 : 0
    bg[i] = grow[i] < 3 && skyish ? 1 : 0
  }
  // sky reachable from the open sky through sky-coloured pixels is sky, even
  // where the guide take had subject (this take's pose differs a little);
  // bluish highlights enclosed by the subject are never reached
  const open = new Uint8Array(w * h)
  const stack = []
  for (let i = 0; i < w * h; i++) if (bg[i]) { open[i] = 1; stack.push(i) }
  const skyCol = (i) => img[i * 4 + 2] - img[i * 4] > 30 && img[i * 4 + 2] > 120
  while (stack.length) {
    const i = stack.pop(), x = i % w
    for (const j of [i - 1, i + 1, i - w, i + w]) {
      if (j < 0 || j >= w * h || open[j] || (j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue
      if (skyCol(j)) { open[j] = 1; stack.push(j) }
    }
  }
  for (let i = 0; i < w * h; i++) if (open[i]) { fg[i] = 0; bg[i] = 1 }
  const F = await fillBlur(img, fg, w, h, 9)
  const B = await fillBlur(img, bg, w, h, 9)
  const a = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) {
    if (open[i]) { a[i] = 0; continue }
    if (fg[i]) { a[i] = 255; continue }
    if (bg[i]) { a[i] = 0; continue }
    let num = 0, den = 0
    for (let c = 0; c < 3; c++) {
      const d = F[i * 3 + c] - B[i * 3 + c]
      num += (img[i * 4 + c] - B[i * 3 + c]) * d
      den += d * d
    }
    let al = den > 60 ? num / den : g[i] / 255
    // the subject's own blue-ish highlights must not punch holes in it
    const sky = img[i * 4 + 2] - img[i * 4] > 45 && img[i * 4 + 2] > 150
    if (g[i] > 200 && grow[i] > 200 && !sky) al = Math.max(al, 0.98)
    a[i] = Math.round(clamp(al) * 255)
  }
  // un-premix the sky out of the edge pixels so no blue fringe survives
  // (the faintest edge is mostly sky light: lift the floor, and lean the
  // thinnest pixels on the subject's local colour rather than a noisy unmix)
  const out = Buffer.from(img)
  for (let i = 0; i < w * h; i++) {
    const al = a[i] / 255
    const t = clamp((al - 0.06) / 0.88)
    out[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255)
    if (al > 0.02 && al < 0.98)
      for (let c = 0; c < 3; c++) {
        const un = clamp((img[i * 4 + c] - B[i * 3 + c] * (1 - al)) / al, 0, 255)
        const u = clamp(al / 0.2)
        out[i * 4 + c] = F[i * 3 + c] * (1 - u) + un * u
      }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
}

/** the take, resampled into hero-bg's pixel frame */
async function warp(input, { s, tx, ty }) {
  const m = await sharp(input).metadata()
  // integer offset + sub-pixel via an affine resample
  const big = await sharp(input).ensureAlpha()
    .affine([s, 0, 0, s], { idx: tx - Math.floor(tx), idy: ty - Math.floor(ty), interpolator: 'bicubic', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw().toBuffer({ resolveWithObject: true })
  const bw = big.info.width, bh = big.info.height
  const ox = Math.floor(tx), oy = Math.floor(ty)
  const out = Buffer.alloc(W * H * 4)
  for (let y = 0; y < H; y++) {
    const sy = y - oy
    if (sy < 0 || sy >= bh) continue
    for (let x = 0; x < W; x++) {
      const sx = x - ox
      if (sx < 0 || sx >= bw) continue
      big.data.copy(out, (y * W + x) * 4, (sy * bw + sx) * 4, (sy * bw + sx) * 4 + 4)
    }
  }
  void m
  return out
}

const variants = {}
for (const [name, shot] of Object.entries(SHOTS)) {
  const input = shot.matteFrom ? await matteOnSky(shot.src, shot.matteFrom) : shot.src
  const V = await warp(input, shot)

  // the hand + bottle region: as wide as the take's hand reaches, same top and
  // height as the shared crop so the bottom-up reveal times identically
  let x0 = W, x1 = 0
  for (let y = TOP; y < TOP + HEIGHT; y++) for (let x = 0; x < W * 0.7; x++) {
    if (V[(y * W + x) * 4 + 3] < 128) continue
    // only the arm/hand/bottle zone (left of the torso), not the legs below
    if (y > TOP + HEIGHT * 0.86) continue
    if (x < x0) x0 = x
  }
  x0 = Math.max(0, x0 - 24)
  x1 = Math.round((BASE.left + BASE.width) * W) + 24
  const C = { left: x0, top: TOP, width: x1 - x0, height: HEIGHT }

  // feather into the model where the layer's rectangle cuts through the body
  // (top, right, bottom); the left edge is sky
  const F = 70
  const cw = C.width, chh = C.height
  // the take, cut to the crop
  const cut = Buffer.alloc(cw * chh * 4), solid = new Float32Array(cw * chh), va = Buffer.alloc(cw * chh)
  for (let y = 0; y < chh; y++) {
    const s0 = ((y + C.top) * W + C.left) * 4
    V.copy(cut, y * cw * 4, s0, s0 + cw * 4)
  }
  void solid; void va

  // The takes are posed a few px differently from the Dilla base, so in places
  // the base's silhouette (fingers, sleeve, leg) reaches past this take's. In
  // this take's photograph those pixels are sky — so that is what the layer
  // carries there, taken from the photograph itself. The scent then shows its
  // own true silhouette, with nothing of the base behind it.
  const P = await warp(shot.photo, shot)
  const out = Buffer.alloc(cw * chh * 4)
  let gap = 0, filled = 0
  for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
    const X = x + C.left, Y = y + C.top, si = (Y * W + X) * 4, di = (y * cw + x) * 4
    const edge = Math.min(y / F, (cw - 1 - x) / F, (chh - 1 - y) / F, 1)
    const k = clamp(edge) * clamp(edge) * (3 - 2 * clamp(edge))
    let r = cut[di], g = cut[di + 1], b = cut[di + 2], a = cut[di + 3]
    const ha = hero[si + 3]
    if (ha > a && P[si + 3] > 0) {
      // inside the base's silhouette the layer is (near) opaque anyway, so it
      // shows the photograph exactly as shot: subject edge over its own sky
      r = P[si]; g = P[si + 1]; b = P[si + 2]
      a = ha
      if (ha - cut[di + 3] > 128) filled++
    }
    out[di] = r; out[di + 1] = g; out[di + 2] = b; out[di + 3] = Math.round(a * k)
    // Dilla still showing through: should be nothing
    if (ha > 200 && a < 40 && k > 0.99) gap++
  }
  console.log(`  base silhouette covered with the take's own sky: ${filled} px`)
  const sc = OUT_W / W
  await sharp(out, { raw: { width: C.width, height: C.height, channels: 4 } })
    .resize({ width: Math.round(C.width * sc) })
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(`src/assets/img/hero-bottle-${name}.webp`)
  variants[name] = { left: C.left / W, top: C.top / H, width: C.width / W, height: C.height / H }
  console.log('✓', `hero-bottle-${name}.webp`, C, 'uncovered dilla px:', gap)
}
writeFileSync('src/sections/hero.variants.json', JSON.stringify(variants, null, 2))
