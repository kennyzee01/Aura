import { useRef } from 'react'
import { gsap, SplitText, ScrollTrigger, reducedMotion, pointer, finePointer } from '../lib/motion'
import { useGsap } from '../lib/useGsap'
import { Mist } from '../gl/Mist'
import cap from '../assets/img/bottle-cap.webp'
import body from '../assets/img/bottle-body.webp'
import head from '../assets/img/bottle-head.webp'
import orificeImg from '../assets/img/bottle-orifice.webp'
import ATOM from './atomizer.json'
import flowers from '../assets/img/flowers.webp'
import grain from '../assets/img/grain-warm.webp'
import s from './BottleStory.module.css'

/*
 * Desktop-32 → 34, one pinned scene in three beats.
 *
 *  1  "You Don't Just Wear It."  The bottle stands closed; the cap lifts off.
 *  →  The bottle never moves. Only the actuator turns on its stem until its
 *     orifice faces left; it is pressed, and a mist leaves the orifice and
 *     drifts left across the page. The first line dissolves into it…
 *  2  "You Feel It."  …and the second line condenses out of the haze.
 *  →  The cap comes back down and seats where it started.
 *  3  "Lasting Impressions" rises behind the same bottle, which then travels
 *     on into the footer (Footer.tsx).
 *
 * The bottle is the frame-32 render split into cap / actuator / body, and the
 * actuator's orifice is its own layer (scripts/build-atomizer.mjs). A polished
 * cylinder turning under fixed light looks the same everywhere except for its
 * features, so the turn is the orifice travelling round the cylinder,
 * foreshortening as it nears the silhouette. Positions are in stage units.
 */
const CAP_ORIGIN = '49.3% 51.4%'
// the cap, seated on the bottle where it stands (matches frame 34)
const CAP_SEATED = { x: -2.1, y: 108.8, scale: 1.003 } // fitted to frame 34's cap
// The cap render shows the inside of its ring — a dark opening. Seated, the
// collar fills that opening, so a copy of the body is drawn in front of the cap,
// clipped to the opening (cap-image px: centre 639,292, radii 94×11). As the cap
// comes down over the neck, the collar rises into the ring.
const CS = 998 / 1312 // cap and body renders share one scale (stage units per px)
function collarClip(tx: number, ty: number) {
  // the cap is placed 243.4 stage units above the body; tx/ty in stage units
  const cx = 639 + tx / CS
  const cy = 292 + (ty - 243.4) / CS
  return `ellipse(${(94 / 1312) * 100}% ${(11 / 879) * 100}% at ${(cx / 1312) * 100}% ${(cy / 879) * 100}%)`
}
const TURN_TO = -78 // degrees round the stem; −90 would be exactly edge-on, facing left
// where the orifice sits on the cylinder for a given turn
function orificeAt(deg: number) {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  return {
    left: `${(ATOM.cx + ATOM.rx * Math.sin(a)) * 100}%`,
    scaleX: Math.max(0.05, c),
    // the hole's walls catch less light as it turns away from the lens
    filter: `brightness(${0.72 + 0.28 * c})`,
  }
}

export function BottleStory() {
  const root = useRef<HTMLElement>(null)

  useGsap(root, () => {
    const q = gsap.utils.selector(root)
    const reduced = reducedMotion()
    const stage = q('.stage')[0] as HTMLElement
    const u = () => stage.offsetWidth / 1440 // one Figma px, as rendered
    const px = (v: number) => () => v * u()
    const l1 = SplitText.create(q('[data-line1]'), { type: 'words,chars' })
    const l2 = SplitText.create(q('[data-line2]'), { type: 'words,chars' })
    // no masks: a mask is the line box (line-height 0.9), so it cut the letters
    // — descenders included — while they rose
    const lasting = SplitText.create(q('[data-lasting]'), { type: 'chars' })
    const impressions = SplitText.create(q('[data-impressions]'), { type: 'chars' })
    const press = q('[data-press]')[0] as HTMLElement
    const orifice = q('[data-orifice]')[0] as HTMLElement
    const capEl = q('[data-cap]')[0] as HTMLElement
    const collar = q('[data-collar]')[0] as HTMLElement
    const syncCollar = () => {
      collar.style.clipPath = collarClip(+gsap.getProperty(capEl, 'x') / u(), +gsap.getProperty(capEl, 'y') / u())
    }
    const canvas = q('[data-mist]')[0] as HTMLCanvasElement
    const pin = q('[data-pin]')[0] as HTMLElement
    const mist = new Mist(canvas)

    // the bottle arrives closed: the cap starts on its seat
    gsap.set(capEl, { transformOrigin: CAP_ORIGIN, x: px(CAP_SEATED.x), y: px(CAP_SEATED.y), scale: CAP_SEATED.scale })
    syncCollar()
    gsap.set(l2.chars, { autoAlpha: 0 })
    gsap.set([lasting.chars, impressions.chars], { yPercent: 45, autoAlpha: 0 })

    // the actuator's turn: the orifice rides round the cylinder
    const turn = { deg: ATOM.phi0 }
    const placeOrifice = () => gsap.set(orifice, orificeAt(turn.deg))
    gsap.set(orifice, { xPercent: -50, yPercent: -50 })
    placeOrifice()

    // the mist leaves the orifice itself, wherever it is on screen
    const sim = { t: 0 }
    const paint = () => {
      if (sim.t <= 0) return mist.clear()
      const pr = pin.getBoundingClientRect()
      const r = orifice.getBoundingClientRect()
      mist.draw(sim.t, r.left - pr.left, r.top + r.height / 2 - pr.top, Math.PI + 0.04, u())
    }
    const onResize = () => {
      mist.resize()
      paint()
      syncCollar()
    }
    window.addEventListener('resize', onResize)

    // arrival of beat 1 (plays once, independent of the scrub)
    if (!reduced)
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: 'top 55%', once: true } })
        .from(l1.words, { y: () => 40 * u(), autoAlpha: 0, duration: 1.3, stagger: 0.06, ease: 'expo.out' })
        .from(q('[data-bottle-in]'), { y: () => 120 * u(), autoAlpha: 0, duration: 1.6, ease: 'expo.out' }, 0)

    const O = 0.6 // beat 1 opens with the cap lifting off
    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
    tl.addLabel('b1')
      // the cap lifts straight off the neck (its seat is where it returns to)
      .to(capEl, { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'power2.inOut', onUpdate: syncCollar }, 0)
      // the actuator turns a quarter round on its stem: the orifice faces left
      .to(turn, { deg: TURN_TO, duration: 0.95, ease: 'power2.inOut', onUpdate: placeOrifice }, O + 0.1)
      // a short, firm press; the stem takes it, then the spring returns it
      .to(press, { yPercent: 9, duration: 0.1, ease: 'power2.in' }, O + 1.12)
      .to(press, { yPercent: 0, duration: 0.22, ease: 'power2.out' }, O + 1.4)
      // the mist (sim seconds map 1:1 to timeline seconds)
      .fromTo(sim, { t: 0 }, { t: 1.95, duration: 1.95, ease: 'none', onUpdate: paint }, O + 1.17)
      // line 1 dissolves as the front of the mist passes over it — right to left
      .to(l1.chars, {
        autoAlpha: 0,
        filter: 'blur(10px)',
        x: () => -26 * u(),
        duration: 0.42,
        ease: 'power1.in',
        stagger: { each: 0.016, from: 'end' },
      }, O + 1.26)
      // line 2 condenses out of the haze as it thins
      .fromTo(l2.chars, { autoAlpha: 0, filter: 'blur(14px)', y: () => 10 * u() }, {
        autoAlpha: 1,
        filter: 'blur(0px)',
        y: 0,
        duration: 0.9,
        ease: 'power2.out',
        stagger: { each: 0.035, from: 'start' },
      }, O + 1.8)
      .addLabel('b2', O + 3.15)
      // beat 3: line 2 clears, and the cap makes one continuous move back down
      // onto its seat — the very values it started from
      .to(l2.chars, { autoAlpha: 0, filter: 'blur(8px)', duration: 0.45, stagger: 0.01, ease: 'power1.in' }, O + 3.4)
      .to(capEl, { x: px(CAP_SEATED.x), y: px(CAP_SEATED.y), scale: CAP_SEATED.scale, duration: 1.05, ease: 'power2.inOut', onUpdate: syncCollar }, O + 3.45)
      // the same bottle stays; the heading rises behind it once the cap is home
      .to(lasting.chars, { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.025, ease: 'power3.out' }, O + 4.45)
      .to(impressions.chars, { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.02, ease: 'power3.out' }, O + 4.55)
      .addLabel('b3', O + 5.45)
      // a still hold, so the scrub (which trails the scroll) finishes beat 3
      // while the section is still pinned. It ends on its own label: a stop in
      // the hold snaps on to the pin's end, never back to b3 after the next
      // section has begun to show.
      .to({}, { duration: 0.6 })
      .addLabel('end')

    if (reduced) {
      // no travel: the beats cut, and there is no spray
      tl.getChildren().forEach((c) => c.duration() > 0 && c.duration(0.001))
    }

    const st = ScrollTrigger.create({
      animation: tl,
      trigger: pin,
      start: 'top top',
      end: () => `+=${innerHeight * 3}`,
      pin: true,
      scrub: reduced ? true : 0.9,
      snap: reduced ? undefined : { snapTo: 'labelsDirectional', duration: { min: 2, max: 2.6 }, delay: 0.2, ease: 'sine.inOut' },
    })

    // a breath of depth: only the flowers drift — the bottle stays put
    let tick: (() => void) | undefined
    if (!reduced && finePointer()) {
      const fx = gsap.quickTo(q('[data-flowers]'), 'x', { duration: 1.2, ease: 'power3' })
      tick = () => {
        if (st.isActive) fx(pointer.x * -22 * u())
      }
      gsap.ticker.add(tick)
    }
    return () => {
      window.removeEventListener('resize', onResize)
      if (tick) gsap.ticker.remove(tick)
    }
  })

  return (
    <section ref={root} id="our-story" className={s.story} aria-label="You don't just wear it. You feel it. Lasting impressions.">
      <div data-pin className={s.pin}>
        <div className="stage">
          <h2 data-line1 className={`${s.line} serif`}>
            You Don’t Just Wear It.
          </h2>
          <h2 data-line2 className={`${s.line} serif`} aria-hidden>
            You Feel It.
          </h2>
          <p className={`${s.big} ${s.lasting} serif`} data-lasting aria-hidden>
            Lasting
          </p>
          <p className={`${s.big} ${s.impressions} serif`} data-impressions aria-hidden>
            Impressions
          </p>

          <div data-bottle className={s.bottle}>
            <div data-bottle-in className={s.bottle} role="img" aria-label="AURA Dilla Lucci perfume bottle">
              <BottleLayers />
            </div>
          </div>

          <img data-flowers src={flowers} alt="" className={s.flowers} />
        </div>
        <canvas data-mist className={s.mist} aria-hidden />
        <div className={s.grain} style={{ backgroundImage: `url(${grain})` }} aria-hidden />
      </div>
    </section>
  )
}

/** The bottle's layers: body, actuator (with its orifice) and cap. */
function BottleLayers({ closed = false }: { closed?: boolean }) {
  // `closed`: the bottle exactly as the story leaves it — actuator turned, cap
  // on its seat — so the footer holds the very same bottle
  const o = closed ? orificeAt(TURN_TO) : undefined
  const k = (v: number) => `calc(${v} * var(--u))`
  return (
    <div data-split>
      <div className={s.group}>
        <img src={body} alt="" className={s.body} />
        {/* the actuator: clipped at the collar so a press sinks into it */}
        <div className={s.head}>
          <div data-press className={s.press}>
            <img src={head} alt="" className={s.headImg} />
            <div className={s.orificeClip}>
              <img
                data-orifice
                src={orificeImg}
                alt=""
                className={s.orifice}
                style={o && { left: o.left, filter: o.filter, transform: `translate(-50%, -50%) scaleX(${o.scaleX})` }}
              />
            </div>
          </div>
        </div>
      </div>
      <img
        data-cap
        src={cap}
        alt=""
        className={s.cap}
        style={closed ? { transformOrigin: CAP_ORIGIN, transform: `translate(${k(CAP_SEATED.x)}, ${k(CAP_SEATED.y)}) scale(${CAP_SEATED.scale})` } : undefined}
      />
      {/* the collar, inside the cap's ring */}
      <div data-collar className={s.group} style={closed ? { clipPath: collarClip(CAP_SEATED.x, CAP_SEATED.y) } : undefined}>
        <img src={body} alt="" className={s.body} />
      </div>
    </div>
  )
}

/** The story's bottle, closed — for the footer, where its journey ends. */
export function ClosedBottle({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`${s.bottle} ${className}`}>
      <BottleLayers closed />
    </div>
  )
}
