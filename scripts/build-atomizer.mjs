// Atomizer layers for the bottle story (run: node scripts/build-atomizer.mjs)
//
// The spray actuator in story-1.png is a polished gold cylinder with one dark
// orifice. A cylinder turning on its own axis under fixed studio light looks
// unchanged, except for features on its surface, so the turn is built from two
// layers:
//   bottle-head.webp    — the actuator with the orifice painted out. The
//                         cylinder's shading only varies across its width, so
//                         each column is refilled from the same column just
//                         below the hole.
//   bottle-orifice.webp — the orifice itself (hole + its machined rim), which
//                         the page slides round the cylinder and foreshortens.
// Geometry (source px, written to src/sections/atomizer.json for the page):
//   actuator crop  588,334 114×56   cylinder x 596–693   orifice centre 632,354
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const SRC = 'design-raw/story-1.png'
const HEAD = { left: 588, top: 334, width: 114, height: 56 }
const O = { x: 632, y: 354, r: 11.5 } // orifice centre / radius (rim included)
const CYL = { x0: 596, x1: 693 }

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
const px = (x, y) => (y * W + x) * 4

// 1 · orifice sprite (square, feathered circular alpha)
const S = 30
const orifice = Buffer.alloc(S * S * 4)
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const sx = Math.round(O.x - S / 2 + x), sy = Math.round(O.y - S / 2 + y)
  const d = Math.hypot(sx - O.x, sy - O.y)
  const a = Math.max(0, Math.min(1, (O.r + 1.2 - d) / 1.6))
  const i = px(sx, sy), j = (y * S + x) * 4
  orifice[j] = data[i]; orifice[j + 1] = data[i + 1]; orifice[j + 2] = data[i + 2]
  orifice[j + 3] = Math.round(a * 255)
}
await sharp(orifice, { raw: { width: S, height: S, channels: 4 } }).webp({ quality: 95, alphaQuality: 100 }).toFile('src/assets/img/bottle-orifice.webp')

// 2 · actuator without the orifice
const head = Buffer.alloc(HEAD.width * HEAD.height * 4)
const below = Math.round(O.y + O.r + 9) // a clean row under the hole
for (let y = 0; y < HEAD.height; y++) for (let x = 0; x < HEAD.width; x++) {
  const sx = HEAD.left + x, sy = HEAD.top + y
  const i = px(sx, sy), j = (y * HEAD.width + x) * 4
  const d = Math.hypot(sx - O.x, sy - O.y)
  const k = Math.max(0, Math.min(1, (O.r + 6 - d) / 3)) // 1 inside (rim glint too), feathered
  // average a few clean rows so the fill carries no single-row artefact
  let r = 0, g = 0, b = 0
  for (let dy = 0; dy < 3; dy++) { const c = px(sx, below + dy); r += data[c]; g += data[c + 1]; b += data[c + 2] }
  head[j] = data[i] * (1 - k) + (r / 3) * k
  head[j + 1] = data[i + 1] * (1 - k) + (g / 3) * k
  head[j + 2] = data[i + 2] * (1 - k) + (b / 3) * k
  head[j + 3] = data[i + 3]
}
await sharp(head, { raw: { width: HEAD.width, height: HEAD.height, channels: 4 } }).webp({ quality: 92, alphaQuality: 95 }).toFile('src/assets/img/bottle-head.webp')

// fractions of the actuator crop, for CSS placement
writeFileSync('src/sections/atomizer.json', JSON.stringify({
  cx: ((CYL.x0 + CYL.x1 + 1) / 2 - HEAD.left) / HEAD.width, // cylinder axis
  rx: (CYL.x1 + 1 - CYL.x0) / 2 / HEAD.width, // cylinder radius
  oy: (O.y - HEAD.top) / HEAD.height, // orifice height
  os: S / HEAD.width, // sprite size
  phi0: (Math.asin((O.x - (CYL.x0 + CYL.x1 + 1) / 2) / ((CYL.x1 + 1 - CYL.x0) / 2)) * 180) / Math.PI,
}, null, 2))
console.log('✓ bottle-head.webp (clean) + bottle-orifice.webp')
