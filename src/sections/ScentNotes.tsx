import { useRef, useState } from 'react'
import { gsap, SplitText, ScrollTrigger, reducedMotion } from '../lib/motion'
import { useGsap } from '../lib/useGsap'
import grain from '../assets/img/grain-cool.webp'
import s from './ScentNotes.module.css'

// Desktop-27 → 30
const NOTES = [
  { n: '01', title: 'THE COMPLIMENT', quote: '“Someone stopped me just to ask what I was wearing.”', color: '#ffd160', light: '#fee185' },
  { n: '02', title: 'THE PRESENCE', quote: '“I want them to remember I was there.”', color: '#f78930', light: '#ffb273' },
  { n: '03', title: 'THE COMFORT', quote: '“Like being wrapped in a hug I never want to leave.”', color: '#9fb341', light: '#e5ff69' },
  { n: '04', title: 'THE MYSTERY', quote: '“Something about me they won’t figure out.”', color: '#ff60e4', light: '#ff9cee' },
]

// stack slots (front → back): centre x, centre y, rotation — from Desktop-27
const SLOTS = [
  { x: 726.5, y: 576.4, r: -2.13 },
  { x: 700.2, y: 592.4, r: -0.17 },
  { x: 678.3, y: 580.4, r: 2.69 },
  { x: 678.3, y: 585.4, r: -0.17 },
]
// how far the ribbon knot shifts with each re-tie (Desktop-27 → 30)
const KNOT = [0, -25, -41, -41]

function Note({ note }: { note: (typeof NOTES)[number] }) {
  return (
    <svg viewBox="0 0 597 485" className={s.paper} aria-hidden>
      <path d="M26 68 585 20.5 597 485H26V68Z" className={s.shadow} />
      <clipPath id={`clip-${note.n}`}>
        <rect width="584" height="472" />
      </clipPath>
      <g clipPath={`url(#clip-${note.n})`}>
        <rect width="584" height="472" fill={note.color} />
        <path
          d="M756.97 632.06 307.23 578.21s184.93-71.34 243.27-144.21c58.34-72.87 55.48-228.99 55.48-228.99l150.99 427.05Z"
          fill={note.light}
        />
        {/* the curled corner catches a little light */}
        <path d="M584 400 C560 430 530 452 500 472 L584 472 Z" fill="#fff" opacity="0.16" />
      </g>
    </svg>
  )
}

export function ScentNotes() {
  const root = useRef<HTMLElement>(null)
  const [front, setFront] = useState(0)

  useGsap(root, () => {
    const q = gsap.utils.selector(root)
    const reduced = reducedMotion()
    const notes = q('[data-note]') as HTMLElement[]
    const ribbons = q('[data-ribbon-path]') as unknown as SVGPathElement[]
    const knot = q('[data-knot]')[0]
    const stage = q('.stage')[0] as HTMLElement
    const unit = () => stage.offsetWidth / 1440 // one Figma px, as rendered
    const head = SplitText.create(q('[data-head]'), { type: 'lines', mask: 'lines' })

    // place note i into stack slot k
    const slotVars = (k: number) => {
      const sl = SLOTS[k]
      return {
        left: `calc(${sl.x} * var(--u))`,
        top: `calc(${sl.y} * var(--u))`,
        rotation: sl.r,
        zIndex: 10 - k,
      }
    }
    notes.forEach((n, i) => gsap.set(n, { ...slotVars(i), xPercent: -50, yPercent: -50 }))

    // entrance: the stack settles, then the ribbon is drawn in from both sides
    // reduced motion: no trigger at all, the stack is simply placed (below)
    const intro = gsap.timeline(reduced ? { paused: true } : { scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } })
    intro
      .from(head.lines, { yPercent: 105, duration: 1.2, stagger: 0.1, ease: 'expo.out' })
      // the entrance moves the inner body (and fades the card) so it never
      // competes with the scrubbed stack shuffle, which owns the outer card
      .from(notes.map((n) => n.firstElementChild), { y: (i: number) => 220 + i * 40, duration: 1.3, stagger: { each: 0.08, from: 'end' }, ease: 'expo.out' }, 0.1)
      .from(notes, { autoAlpha: 0, duration: 0.6, stagger: { each: 0.08, from: 'end' } }, 0.1)
      .fromTo(ribbons, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power3.inOut' }, 0.5)
      .from(knot, { scale: 0, rotation: -40, duration: 0.9, ease: 'back.out(2)' }, 1.4)
    if (reduced) intro.progress(1)

    // each step: the top note lifts off, travels round to the back, the others
    // move one slot forward, and the ribbon is re-tied around the new top note
    const tl = gsap.timeline({ defaults: { ease: 'none' } })
    for (let step = 0; step < NOTES.length - 1; step++) {
      const at = step * 1.2
      const order = NOTES.map((_, i) => (i - step + NOTES.length) % NOTES.length) // slot of each note
      const leaving = notes[step]
      tl.to(knot, { scale: 0.4, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, at)
        .to(leaving, { y: -140, x: -40, rotation: -9, scale: 1.04, duration: 0.45, ease: 'power3.out' }, at + 0.05)
        .to(leaving, { x: -420, rotation: -16, duration: 0.35, ease: 'power2.inOut' }, at + 0.4)
        .set(leaving, { zIndex: 1 }, at + 0.62)
        .to(leaving, { ...slotVars(NOTES.length - 1), x: 0, y: 0, scale: 1, zIndex: 1, duration: 0.5, ease: 'power3.inOut' }, at + 0.62)
      notes.forEach((n, i) => {
        if (n === leaving) return
        const k = (order[i] - 1 + NOTES.length) % NOTES.length
        tl.to(n, { ...slotVars(k), duration: 0.6, ease: 'back.out(1.6)' }, at + 0.35)
      })
      // the left ribbon lives in a mirrored svg, so its path moves the other way
      tl.to(ribbons, { x: (i: number) => (i ? -1 : 1) * KNOT[step + 1], duration: 0.6, ease: 'power3.inOut' }, at + 0.3)
        .set(knot, { x: () => KNOT[step + 1] * unit() }, at + 0.3)
        .to(knot, { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.5, ease: 'back.out(2.2)' }, at + 0.75)
    }
    tl.to({}, { duration: 0.6 })

    ScrollTrigger.create({
      animation: tl,
      trigger: q('[data-pin]')[0],
      start: 'top top',
      end: () => `+=${innerHeight * 2.6}`,
      pin: true,
      scrub: reduced ? true : 0.7,
      snap: reduced ? undefined : { snapTo: [0, 0.31, 0.62, 1], duration: { min: 0.3, max: 0.8 }, delay: 0.1, ease: 'power2.inOut' },
      onUpdate: (self) => {
        const t = self.progress * tl.duration()
        setFront(Math.min(NOTES.length - 1, Math.max(0, Math.floor((t + 0.5) / 1.2))))
      },
    })
  })

  // hover: the stack fans out a little, like a hand riffling through paper
  const fan = (on: boolean) => {
    if (reducedMotion()) return
    const notes = root.current?.querySelectorAll<HTMLElement>('[data-note]')
    notes?.forEach((n) => {
      const z = Number(getComputedStyle(n).zIndex) || 0
      gsap.to(n.firstElementChild, { rotation: on ? (10 - z) * -2.2 : 0, x: on ? (10 - z) * -10 : 0, duration: 0.8, ease: 'expo.out' })
    })
  }

  const n = NOTES[front]
  return (
    <section ref={root} className={s.notes} aria-label="Scent notes — some things never leave you">
      <div data-pin className={s.pin}>
        <div className="stage">
          <header data-head className={s.head}>
            <h2 className={`${s.title} serif`}>Scent Notes</h2>
            <p className={s.sub}>Some Things Never Leave You</p>
          </header>

          <div className={s.stack} onPointerEnter={() => fan(true)} onPointerLeave={() => fan(false)}>
            {NOTES.map((note) => (
              <article key={note.n} data-note className={s.note} aria-hidden={note.n !== n.n}>
                <div className={s.noteBody}>
                  <Note note={note} />
                  <h3 className={`${s.noteTitle} serif`}>{note.title}</h3>
                  <p className={s.quote}>{note.quote}</p>
                </div>
              </article>
            ))}
          </div>

          {/* the ribbon passes over the stack; the number badge ties it */}
          <svg className={s.ribbonR} viewBox="0 0 1455 182" aria-hidden>
            <path data-ribbon-path pathLength={1} d="M21 136.5S239.6 19.3 391 21c146 1.7 199.4 63.8 344.9 76 176.4 14.7 281.7-85.1 455.1-49.5 102.5 21.1 243 113 243 113" />
          </svg>
          <svg className={s.ribbonL} viewBox="0 0 1455 182" aria-hidden>
            <path data-ribbon-path pathLength={1} d="M21 136.5S239.6 19.3 391 21c146 1.7 199.4 63.8 344.9 76 176.4 14.7 281.7-85.1 455.1-49.5 102.5 21.1 243 113 243 113" />
          </svg>
          <div data-knot className={s.knot}>
            <span className={s.knotShadow} />
            <span key={n.n} className={`${s.knotNum} serif`}>
              {n.n}
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            {n.n} {n.title}: {n.quote}
          </p>
        </div>
        <div className={s.grain} style={{ backgroundImage: `url(${grain})` }} aria-hidden />
      </div>
    </section>
  )
}
