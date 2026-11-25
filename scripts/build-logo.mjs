// Logo layers for the preloader (run: node scripts/build-logo.mjs)
//
// design-raw/logo.png (1586×992, transparent) is split so each part of the
// mark can be choreographed on its own, while together they re-form the
// logo pixel for pixel:
//   logo-word.webp  — AURA wordmark, with the four-point star lifted out
//   logo-star.webp  — the star (the opening "spark")
//   logo-tag.webp   — FRAGRANCE HOUSE lettering (the hairline rules either
//                     side are drawn live in CSS, so they can carry progress)
// Geometry, as fractions of the logo box, goes to src/components/logo.json.
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const SRC = 'design-raw/logo.png'
const BOX = { left: 190, top: 276, width: 1202, height: 464 } // the whole mark
const WORD = { left: 190, top: 276, width: 1202, height: 394 }
const STAR = { left: 330, top: 470, width: 120, height: 124, cx: 389.3, cy: 531.7, rx: 54, ry: 57 }
const TAG = { left: 460, top: 696, width: 676, height: 44 }
const RULES = { y: 717, h: 2.2, l: [360, 422], r: [1170, 1232] }

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width
// the star is a concave four-point star: a diamond (|dx|/rx + |dy|/ry ≤ 1)
// contains it without touching the strokes of the A around it
const inStar = (x, y) => Math.abs(x - STAR.cx) / STAR.rx + Math.abs(y - STAR.cy) / STAR.ry
const starW = (x, y) => Math.max(0, Math.min(1, (1.06 - inStar(x, y)) / 0.06))

async function cut(r, file, alpha = () => 1) {
  const out = Buffer.alloc(r.width * r.height * 4)
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
    const sx = r.left + x, sy = r.top + y, i = (sy * W + sx) * 4, j = (y * r.width + x) * 4
    out[j] = data[i]; out[j + 1] = data[i + 1]; out[j + 2] = data[i + 2]
    out[j + 3] = Math.round(data[i + 3] * alpha(sx, sy))
  }
  await sharp(out, { raw: { width: r.width, height: r.height, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`src/assets/img/${file}`)
}
await cut(WORD, 'logo-word.webp', (x, y) => 1 - starW(x, y))
await cut(STAR, 'logo-star.webp', starW)
await cut(TAG, 'logo-tag.webp')

const fx = (v) => (v - BOX.left) / BOX.width
const fy = (v) => (v - BOX.top) / BOX.height
writeFileSync('src/components/logo.json', JSON.stringify({
  aspect: BOX.width / BOX.height,
  word: { l: fx(WORD.left), t: fy(WORD.top), w: WORD.width / BOX.width, h: WORD.height / BOX.height },
  star: { l: fx(STAR.left), t: fy(STAR.top), w: STAR.width / BOX.width, h: STAR.height / BOX.height, cx: fx(STAR.cx), cy: fy(STAR.cy) },
  tag: { l: fx(TAG.left), t: fy(TAG.top), w: TAG.width / BOX.width, h: TAG.height / BOX.height },
  rules: { t: fy(RULES.y - RULES.h / 2), h: RULES.h / BOX.height, l: [fx(RULES.l[0]), fx(RULES.l[1])], r: [fx(RULES.r[0]), fx(RULES.r[1])] },
}, null, 2))
console.log('✓ logo-word / logo-star / logo-tag')
