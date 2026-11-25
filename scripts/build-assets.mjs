// Asset pipeline: turns raw Figma exports (src/assets/raw) into optimised,
// layered WebP files (src/assets/img). Run with `npm run assets`.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const RAW = 'design-raw'
const OUT = 'src/assets/img'
await mkdir(OUT, { recursive: true })

const r = (f) => path.join(RAW, f)
const o = (f) => path.join(OUT, f)

async function webp(src, dest, width, q = 82) {
  let img = sharp(r(src))
  if (width) img = img.resize({ width, withoutEnlargement: true })
  await img.webp({ quality: q, alphaQuality: 90, effort: 5 }).toFile(o(dest))
  console.log('✓', dest)
}

// ── Hero: rebuild a clean sky plate behind the model ─────────────────────────
// The Figma file only has the composite (sky + model) and the model cut-out.
// We mask the model out of the composite and fill the hole with a push-pull
// (multi-scale average of valid pixels) so parallax never reveals a ghost.
async function cleanPlate(compFile, cutFile, outFile, W, H, outWidth = W) {
  const comp = await sharp(r(compFile)).resize(W, H).removeAlpha().raw().toBuffer()
  const cut = await sharp(r(cutFile)).resize(W, H).ensureAlpha().extractChannel(3)
    .blur(18).raw().toBuffer() // dilate-ish so halos (hair, glass edges) go too

  let levels = []
  let w = W, h = H
  let col = new Float32Array(W * H * 3)
  let wt = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const valid = cut[i] < 8 ? 1 : 0
    wt[i] = valid
    for (let c = 0; c < 3; c++) col[i * 3 + c] = comp[i * 3 + c] * valid
  }
  levels.push({ w, h, col, wt })
  while (w > 4 && h > 4) {
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
  // pull: fill each level's holes from the coarser level
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l], C = levels[l + 1]
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const i = y * L.w + x, j = (y >> 1) * C.w + (x >> 1)
      const a = Math.min(1, L.wt[i])
      const cw = C.wt[j] || 1
      for (let c = 0; c < 3; c++) {
        const own = L.wt[i] ? L.col[i * 3 + c] / L.wt[i] : 0
        const coarse = C.col[j * 3 + c] / cw
        L.col[i * 3 + c] = own * a + coarse * (1 - a)
      }
      L.wt[i] = 1
    }
  }
  const out = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H * 3; i++) out[i] = Math.max(0, Math.min(255, levels[0].col[i]))
  // soften the push-pull blocks, then lay the real sky back over it with a
  // feathered mask so only the hidden region is synthetic
  const soft = await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .blur(45).removeAlpha().raw().toBuffer()
  const final = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H; i++) {
    // feathered: fully real sky where the (blurred) model mask is ~0
    const a = Math.max(0, Math.min(1, 1 - cut[i] / 40))
    for (let c = 0; c < 3; c++) final[i * 3 + c] = comp[i * 3 + c] * a + soft[i * 3 + c] * (1 - a)
  }
  await sharp(final, { raw: { width: W, height: H, channels: 3 } })
    .resize({ width: outWidth }).webp({ quality: 80 }).toFile(o(outFile))
  console.log('✓', outFile, '(clean plate)')
}

// ── Bottle story: split the "cap lifted" render into cap + body layers ───────
async function splitBottle() {
  // story-1 (1312×1199): cap lifted above an open bottle. Three layers:
  //   cap   — rows 0–320
  //   head  — the spray actuator (rows 334–390, x 588–702), so it can be pressed
  //   body  — rows 320–1199 with the actuator removed
  const meta = await sharp(r('story-1.png')).metadata()
  const CUT = 320 // empty rows between cap and nozzle (alpha profile)
  const HEAD = { left: 588, top: 334, width: 114, height: 56 }
  await sharp(r('story-1.png')).extract({ left: 0, top: 0, width: meta.width, height: CUT })
    .webp({ quality: 86, alphaQuality: 92 }).toFile(o('bottle-cap.webp'))
  await sharp(r('story-1.png')).extract(HEAD).webp({ quality: 90, alphaQuality: 95 }).toFile(o('bottle-head.webp'))
  const { data, info } = await sharp(r('story-1.png'))
    .extract({ left: 0, top: CUT, width: meta.width, height: meta.height - CUT })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let y = HEAD.top - CUT; y < HEAD.top - CUT + HEAD.height - 2; y++)
    for (let x = HEAD.left; x < HEAD.left + HEAD.width; x++) data[(y * info.width + x) * 4 + 3] = 0
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 86, alphaQuality: 92 }).toFile(o('bottle-body.webp'))
  console.log('✓ bottle-cap / bottle-head / bottle-body', meta.width, meta.height)
}

// The gold cut-out in Figma fades out before the forearm ends. The arm is
// near-black on a light backdrop, so we luminance-key it from the photo and
// merge it into the cut-out (only in the lower-right where the arm lives).
async function repairGoldCutout() {
  const S = 1080
  const bg = await sharp(r('gold-bg.png')).resize(S, S).removeAlpha().raw().toBuffer()
  const fg = await sharp(r('gold-fg.png')).resize(S, S).ensureAlpha().raw().toBuffer()
  const out = Buffer.alloc(S * S * 4)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x
    const lum = 0.299 * bg[i * 3] + 0.587 * bg[i * 3 + 1] + 0.114 * bg[i * 3 + 2]
    const inRegion = x > S * 0.42 && x < S * 0.84 && y > S * 0.7
    let key = inRegion ? Math.max(0, Math.min(1, (27 - lum) / 15)) : 0
    const fa = fg[i * 4 + 3] / 255
    const a = Math.max(fa, key)
    // keep the cut-out's own pixels; use the photo where only the key applies
    const useFg = fa >= key
    for (let c = 0; c < 3; c++) out[i * 4 + c] = useFg ? fg[i * 4 + c] : bg[i * 3 + c]
    out[i * 4 + 3] = Math.round(a * 255)
  }
  await sharp(out, { raw: { width: S, height: S, channels: 4 } }).png().toFile(r('gold-fg-full.png'))
  console.log('✓ gold-fg-full.png (arm restored)')
}
await repairGoldCutout()
await cleanPlate('hx3.png', 'hx2.png', 'hero-sky.webp', 1440, 1031)
// colourway backdrops without bottle + hands, so the cut-outs can move freely
for (const n of ['dilla', 'emerald', 'gold', 'burgundy'])
  await cleanPlate(`${n}-bg.png`, n === 'gold' ? 'gold-fg-full.png' : `${n}-fg.png`, `${n}-plate.webp`, 1080, 1080, 1024)
await splitBottle()
await Promise.all([
  webp('hx2.png', 'hero-model.webp', 2000, 85),
  webp('hx4.png', 'hero-gold-ref.webp', 1600),
  webp('logo.png', 'logo.webp', 300, 90),
  webp('btn-noise.png', 'btn-noise.webp', 512, 70),
  webp('hero-card-dilla.png', 'card-dilla.webp', 900),
  webp('hero-card-emerald.png', 'card-emerald.webp', 900),
  ...['dilla', 'emerald', 'gold', 'burgundy'].flatMap((n) => [
    webp(`${n}-bg.png`, `${n}-bg.webp`, 1600, 80),
    webp(n === 'gold' ? 'gold-fg-full.png' : `${n}-fg.png`, `${n}-fg.webp`, 1600, 85),
  ]),
  ...[1, 2, 3, 4].map((i) => webp(`avatar${i}.png`, `avatar${i}.webp`, 128, 80)),
  webp('flowers.png', 'flowers.webp', 1800, 85),
  webp('mood-untamed.png', 'mood-untamed.webp', 900),
  webp('mood-golden.png', 'mood-golden.webp', 900),
  webp('mood-after.png', 'mood-after.webp', 900),
  webp('grain.png', 'grain-cool.webp', 736, 70),
  webp('story-grain.png', 'grain-warm.webp', 711, 70),
  webp('quote.png', 'quote.webp', 1920, 82),
  webp('story-2.png', 'bottle-fallen.webp', 1600, 85),
  webp('story-3.png', 'bottle-full.webp', 1100, 85),
])
