// Finds the similarity transform (scale + offset) that lays a hero take onto
// design-raw/hero-bg.png, matched on the body (run: node scripts/register-hero-take.mjs <take.png>).
// Used for the numbers in scripts/build-hero-variants.mjs.
import sharp from 'sharp'
const [,, src] = process.argv
const D = 4
const base = sharp('design-raw/hero-bg.png')
const bm = await base.metadata()
const BW = Math.round(bm.width / D), BH = Math.round(bm.height / D)
const B = await sharp('design-raw/hero-bg.png').resize(BW, BH).ensureAlpha().raw().toBuffer()
const sm = await sharp(src).metadata()
const VW = Math.round(sm.width / (D / 2)), VH = Math.round(sm.height / (D / 2)) // variant at half... resolution normalised below
const V = await sharp(src).resize(VW, VH).flatten({ background: '#000' }).raw().toBuffer()
const vs = sm.width / VW
// sample points: model pixels (alpha) outside the bottle crop
const crop = { l: 0.1924 * BW, t: 0.1215 * BH, w: 0.471 * BW, h: 0.84 * BH }
const pts = []
for (let y = 0; y < BH; y += 2) for (let x = 0; x < BW; x += 2) {
  const i = (y * BW + x) * 4
  if (B[i + 3] < 250) continue
  if (x > crop.l && x < crop.l + crop.w * 0.75 && y > crop.t + crop.h * 0.2 && y < crop.t + crop.h) continue
  pts.push([x, y, B[i], B[i + 1], B[i + 2]])
}
const samp = (x, y, c) => {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  if (x0 < 0 || y0 < 0 || x0 + 1 >= VW || y0 + 1 >= VH) return -1
  const g = (xx, yy) => V[(yy * VW + xx) * 3 + c]
  return g(x0, y0) * (1 - fx) * (1 - fy) + g(x0 + 1, y0) * fx * (1 - fy) + g(x0, y0 + 1) * (1 - fx) * fy + g(x0 + 1, y0 + 1) * fx * fy
}
// map base px (in base/D units) -> variant original px:  v = (bx*D - tx)/s ; in V units divide by vs
const cost = (s, tx, ty) => {
  let e = 0, n = 0
  for (const [x, y, r, g, b] of pts) {
    const vx = ((x * D - tx) / s) / vs, vy = ((y * D - ty) / s) / vs
    const R = samp(vx, vy, 0); if (R < 0) continue
    const G = samp(vx, vy, 1), Bb = samp(vx, vy, 2)
    e += Math.abs(R - r) + Math.abs(G - g) + Math.abs(Bb - b); n++
  }
  return n > pts.length * 0.5 ? e / n : 1e9
}
let best = [1e9]
for (let s = 1.8; s <= 2.3; s += 0.02) for (let tx = -300; tx <= 300; tx += 12) for (let ty = -300; ty <= 400; ty += 12) {
  const c = cost(s, tx, ty); if (c < best[0]) best = [c, s, tx, ty]
}
console.log('coarse', best)
let [, s, tx, ty] = best
for (const [ds, dt] of [[0.005, 4], [0.0015, 1], [0.0005, 0.3]]) {
  let b2 = [cost(s, tx, ty), s, tx, ty]
  for (let a = -3; a <= 3; a++) for (let bx = -4; bx <= 4; bx++) for (let by = -4; by <= 4; by++) {
    const c = cost(s + a * ds, tx + bx * dt, ty + by * dt); if (c < b2[0]) b2 = [c, s + a * ds, tx + bx * dt, ty + by * dt]
  }
  ;[, s, tx, ty] = b2; console.log('fine', b2)
}
console.log(JSON.stringify({ s, tx, ty }))
