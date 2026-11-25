import { useEffect, useRef, useState } from 'react'
import { gsap, Draggable, SplitText, reducedMotion, finePointer } from '../lib/motion'
import { useGsap } from '../lib/useGsap'
import { GlowButton } from '../components/GlowButton'
import flowers from '../assets/img/flowers.webp'
import untamed from '../assets/img/mood-untamed.webp'
import golden from '../assets/img/mood-golden.webp'
import after from '../assets/img/mood-after.webp'
import s from './Moods.module.css'

const MOODS = [
  { name: 'UNTAMED', line: 'Bold. Smoky. Unconventional.', img: untamed, tint: '#efebe6', pos: '50% 22%' },
  { name: 'GOLDEN HOUR', line: 'Warm. Radiant. Captivating.', img: golden, tint: '#faeedb', pos: '50% 18%' },
  { name: 'AFTER HOURS', line: 'Dark. Mysterious. Sensual.', img: after, tint: '#eee3e1', pos: '50% 20%' },
]

/**
 * Choosing a mood. The cards sit on a dragable rail with inertia; whichever
 * card is centred takes focus, the others turn away in perspective, and the
 * whole section takes on that mood's temperature.
 */
export function Moods() {
  const root = useRef<HTMLElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(1)
  const drag = useRef<Draggable | null>(null)

  // header: the bouquet opens from its centre, the question writes itself
  useGsap(root, () => {
    const reduced = reducedMotion()
    const title = SplitText.create('[data-title]', { type: 'lines,words', mask: 'lines' })
    const sub = SplitText.create('[data-sub]', { type: 'lines', mask: 'lines' })
    const tl = gsap.timeline({ scrollTrigger: { trigger: '[data-head]', start: 'top 75%', once: true } })
    tl.fromTo('[data-flowers]', { clipPath: 'inset(30% 48% 40% 48% round 40%)', scale: 1.12 }, { clipPath: 'inset(0% 0% 0% 0% round 0%)', scale: 1, duration: reduced ? 0 : 2, ease: 'expo.out' })
      .from(title.lines, { yPercent: 105, duration: 1.3, stagger: 0.1, ease: 'expo.out' }, 0.35)
      .from(sub.lines, { yPercent: 105, duration: 1.1, stagger: 0.08, ease: 'expo.out' }, 0.6)
      // clip, not opacity: the rail owns each card's opacity (focus dimming)
      .fromTo('[data-card]', { y: 120, rotationX: -18, clipPath: 'inset(100% 0% 0% 0% round 20px)' }, { y: 0, rotationX: 0, clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.4, stagger: 0.1, ease: 'expo.out' }, 0.7)
      .from('[data-cta]', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out' }, 1.1)
    if (!reduced) {
      gsap.to('[data-flowers]', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    }
  })

  // rail: drag with inertia, snap to a card, keep the centred one in focus
  const update = useRef<() => void>(() => {})
  const centreOf = (i: number) => {
    const r = rail.current!
    const c = r.querySelectorAll<HTMLElement>('[data-card]')[i]
    return -(c.offsetLeft + c.offsetWidth / 2 - r.parentElement!.offsetWidth / 2)
  }
  useEffect(() => {
    const r = rail.current
    if (!r) return
    const cards = Array.from(r.querySelectorAll<HTMLElement>('[data-card]'))
    let last = -1
    update.current = () => {
      const x = gsap.getProperty(r, 'x') as number
      const mid = r.parentElement!.offsetWidth / 2
      let best = 0
      let bestD = Infinity
      cards.forEach((c, i) => {
        const d = (c.offsetLeft + c.offsetWidth / 2 + x - mid) / c.offsetWidth // -1…1 around centre
        const ad = Math.min(1, Math.abs(d))
        gsap.set(c, { rotationY: gsap.utils.clamp(-28, 28, -d * 26), z: -ad * 120, opacity: 1 - ad * 0.45 })
        if (Math.abs(d) < bestD) {
          bestD = Math.abs(d)
          best = i
        }
      })
      if (best !== last) setActive((last = best))
    }
    const snaps = () => cards.map((_, i) => centreOf(i))
    gsap.set(r, { x: centreOf(1) })
    update.current()
    drag.current = Draggable.create(r, {
      type: 'x',
      inertia: true,
      edgeResistance: 0.85,
      bounds: { minX: snaps()[cards.length - 1] - 60, maxX: snaps()[0] + 60 },
      snap: (v) => gsap.utils.snap(snaps(), v),
      onDrag: () => update.current(),
      onThrowUpdate: () => update.current(),
      dragClickables: true,
      zIndexBoost: false,
    })[0]
    const onResize = () => {
      gsap.set(r, { x: centreOf(last < 0 ? 1 : last) })
      drag.current?.applyBounds({ minX: snaps()[cards.length - 1] - 60, maxX: snaps()[0] + 60 })
      update.current()
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      drag.current?.kill()
    }
  }, [])

  const focus = (i: number) => {
    const r = rail.current
    if (!r) return
    gsap.to(r, {
      x: centreOf(i),
      duration: reducedMotion() ? 0 : 1.1,
      ease: 'expo.out',
      overwrite: true,
      onUpdate: () => {
        drag.current?.update()
        update.current()
      },
    })
  }

  // keyboard
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') focus(Math.min(MOODS.length - 1, active + 1))
    if (e.key === 'ArrowLeft') focus(Math.max(0, active - 1))
  }

  // image inside the focused card leans toward the pointer
  const lean = (e: React.PointerEvent<HTMLElement>) => {
    if (!finePointer() || reducedMotion()) return
    const c = e.currentTarget
    const b = c.getBoundingClientRect()
    gsap.to(c.querySelector('img'), {
      xPercent: ((e.clientX - b.left) / b.width - 0.5) * -4,
      yPercent: ((e.clientY - b.top) / b.height - 0.5) * -4,
      duration: 0.9,
      ease: 'power3',
    })
  }

  return (
    <section ref={root} id="discover" className={s.moods} style={{ background: MOODS[active].tint }} aria-label="How do you want to be remembered?">
      <div className={s.flowersWrap} aria-hidden>
        <img data-flowers src={flowers} alt="" className={s.flowers} />
      </div>
      <header data-head className={s.head}>
        <span className={s.eyebrow}>Moods</span>
        <h2 data-title className={`${s.title} serif`}>
          How Do You Want To Be Remembered?
        </h2>
        <p data-sub className={s.sub}>
          Choose a mood, &amp; discover the fragrance that matches your mood and feels unmistakably you.
        </p>
      </header>

      <div className={s.viewport} data-cursor="drag" onKeyDown={onKey} role="listbox" aria-label="Moods" tabIndex={0} aria-activedescendant={`mood-${active}`}>
        <div ref={rail} className={s.rail}>
          {MOODS.map((m, i) => (
            <article
              key={m.name}
              id={`mood-${i}`}
              data-card
              role="option"
              aria-selected={i === active}
              className={`${s.card} ${i === active ? s.on : ''}`}
              onClick={() => focus(i)}
              onPointerMove={lean}
            >
              <span className={s.num} aria-hidden>
                0{i + 1}
              </span>
              <div className={s.photo}>
                <img src={m.img} alt="" style={{ objectPosition: m.pos }} loading="lazy" draggable={false} />
              </div>
              <h3 className={`${s.name} serif`}>{m.name}</h3>
              <p className={s.line}>{m.line}</p>
            </article>
          ))}
        </div>
      </div>

      <div data-cta className={s.cta}>
        <GlowButton size="lg" href="#find">
          Find Your Fragrance
        </GlowButton>
      </div>
    </section>
  )
}
