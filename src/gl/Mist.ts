/**
 * Perfume mist, drawn on a 2D canvas as a deterministic function of time, so a
 * scrubbed (and reversed) scroll timeline can drive it frame-exactly.
 *
 * Each droplet cloud is emitted from the nozzle along a narrow cone, loses
 * speed to air drag, swells as it diffuses, rises a little, and fades. Early,
 * fast particles form the jet; later, slower and larger ones become the haze
 * the next line of copy condenses out of.
 */
type P = { te: number; ang: number; spd: number; r0: number; g: number; life: number; a: number; wob: number; lift: number }

const N = 240
const EMIT = 0.42 // seconds of spray (sim time)

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
}

export class Mist {
  private ctx: CanvasRenderingContext2D
  private puff: HTMLCanvasElement
  private parts: P[] = []
  private dpr = Math.min(window.devicePixelRatio || 1, 1.5)

  canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    // one soft droplet-cloud sprite, reused for every particle
    this.puff = document.createElement('canvas')
    this.puff.width = this.puff.height = 128
    const p = this.puff.getContext('2d')!
    const g = p.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,253,251,1)')
    g.addColorStop(0.35, 'rgba(255,250,247,0.55)')
    g.addColorStop(1, 'rgba(255,248,245,0)')
    p.fillStyle = g
    p.fillRect(0, 0, 128, 128)

    const r = rng(11)
    const gauss = () => (r() + r() + r() - 1.5) / 1.5
    for (let i = 0; i < N; i++) {
      const jet = i % 3 === 0 // a third of the droplets form the fast core
      this.parts.push({
        te: (i / N) * EMIT,
        ang: gauss() * (jet ? 0.07 : 0.19),
        spd: jet ? 0.95 + r() * 0.35 : 0.55 + r() * 0.45,
        r0: jet ? 2 + r() * 3 : 6 + r() * 10,
        g: jet ? 70 + r() * 70 : 140 + r() * 180,
        life: jet ? 0.55 + r() * 0.35 : 0.9 + r() * 0.5,
        a: jet ? 0.45 + r() * 0.2 : 0.12 + r() * 0.09,
        wob: r() * Math.PI * 2,
        lift: 20 + r() * 50,
      })
    }
    this.resize()
  }

  resize() {
    const w = this.canvas.offsetWidth
    const h = this.canvas.offsetHeight
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
  }

  /**
   * @param t     sim time in seconds (0 = the press)
   * @param ox,oy nozzle position in CSS px, relative to the canvas
   * @param dir   spray direction in radians (π = straight left)
   * @param u     one Figma px in CSS px
   */
  draw(t: number, ox: number, oy: number, dir: number, u: number) {
    const c = this.ctx
    const s = this.dpr
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (t <= 0) return
    c.setTransform(s, 0, 0, s, 0, 0)
    const reach = 980 * u
    for (const p of this.parts) {
      const age = t - p.te
      if (age <= 0 || age >= p.life) continue
      const d = reach * p.spd * (1 - Math.exp(-3.1 * age)) // air drag
      const a = dir + p.ang
      const wob = Math.sin(p.wob + age * 3.2) * 14 * u * age
      const x = ox + Math.cos(a) * d - Math.sin(a) * wob
      const y = oy + Math.sin(a) * d + Math.cos(a) * wob - p.lift * u * age * age
      const rad = (p.r0 + p.g * age) * u
      const k = age / p.life
      const alpha = p.a * Math.min(1, age / 0.035) * Math.pow(1 - k, 1.5)
      if (alpha < 0.004) continue
      c.globalAlpha = alpha
      c.drawImage(this.puff, x - rad, y - rad, rad * 2, rad * 2)
    }
    c.globalAlpha = 1
  }

  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
