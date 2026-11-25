import { useRef } from 'react'
import { gsap, SplitText, ScrollTrigger, reducedMotion, finePointer, scrollToY } from '../lib/motion'
import { useGsap } from '../lib/useGsap'
import { ClosedBottle } from './BottleStory'
import grain from '../assets/img/grain-warm.webp'
import flowers from '../assets/img/flowers.webp'
import s from './Footer.module.css'

const LEFT = [
  { label: 'The collection', href: '#collection' },
  { label: 'Find Your Scent', href: '#find' },
  { label: 'Contact', href: 'mailto:hello@aura.example' },
]
const RIGHT = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'TikTok', href: 'https://tiktok.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
]

/**
 * Desktop-36. The story's own bottle travels on into the footer and settles in
 * front of the wordmark at Figma's 8.59° lean, its shadow gathering beneath it.
 *
 * The bottle can't leave the story's pinned, clipped stage, so the footer holds
 * the same closed bottle (same layers, same stage geometry). One scroll value
 * places both: each copy is cancelled against its own section's movement, so
 * on screen they are one bottle, cut by the section edge at the same line —
 * the story's part above it, the footer's below. Then it eases to its seat.
 */
// the bottle's optical centre in stage units (its transform origin) and where
// it comes to rest in the footer: centred in the wordmark, at the authored size
const CENTRE = { x: 714.5, y: 562 }
const REST = { x: 799 - CENTRE.x, y: 449 - CENTRE.y, scale: 568 / (1012 * 1.0303), rotation: 8.59 }
const ORIGIN = `${(CENTRE.x / 1440) * 100}% ${(CENTRE.y / 900) * 100}%`
export function Footer() {
  const root = useRef<HTMLElement>(null)

  useGsap(root, () => {
    const q = gsap.utils.selector(root)
    const reduced = reducedMotion()
    const word = SplitText.create(q('[data-word]'), { type: 'chars', mask: 'chars' })
    const stage = q('.stage')[0] as HTMLElement
    const fb = q('[data-fbottle]')[0] as HTMLElement
    const tilt = q('[data-ftilt]')[0] as HTMLElement
    const ff = q('[data-fflowers]')[0] as HTMLElement
    const fg = q('[data-fgrain]')[0] as HTMLElement
    const story = () => document.querySelector<HTMLElement>('#our-story [data-bottle]')
    const ease = gsap.parseEase('sine.inOut')
    // place a copy of the bottle p of the way along its journey, shifted by dy
    const place = (el: HTMLElement, p: number, dy: number) => {
      const u = stage.offsetWidth / 1440
      const e = ease(p)
      gsap.set(el, {
        transformOrigin: ORIGIN,
        x: REST.x * u * e,
        y: dy + REST.y * u * e,
        scale: 1 + (REST.scale - 1) * e,
        rotation: REST.rotation * e,
      })
    }
    // the journey needs both stages on the same scale (desktop layout)
    const journey = !reduced && matchMedia('(min-width: 821px)').matches
    let p = journey ? 0 : 1
    place(fb, p, 0)
    if (journey) {
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top bottom', // = the end of the story's pin
        end: 'top top',
        onRefresh: (self) => travel(self),
        onUpdate: (self) => travel(self),
      })
    }
    function travel(self: ScrollTrigger) {
      const range = self.end - self.start
      const off = gsap.utils.clamp(0, range, self.scroll() - self.start)
      p = off / range
      const s = story()
      // the story scrolls up by `off`; the footer is still `range - off` below
      if (s) place(s, p, off)
      // the bouquet keeps whatever drift the pointer gave it in the story
      const sf = document.querySelector('#our-story [data-flowers]')
      if (sf) gsap.set(ff, { x: gsap.getProperty(sf, 'x') })
      // the grain's mask follows the bouquet copy
      const fr = ff.getBoundingClientRect()
      const gr = fg.getBoundingClientRect()
      fg.style.maskSize = fg.style.webkitMaskSize = `${fr.width}px ${fr.height}px`
      fg.style.maskPosition = fg.style.webkitMaskPosition = `${fr.left - gr.left}px ${fr.top - gr.top}px`
      place(fb, p, -(range - off))
      if (p < 1) {
        gsap.killTweensOf(tilt)
        gsap.set(tilt, { rotation: 0 })
      }
    }
    if (reduced) return

    const tl = gsap.timeline({
      scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'top 5%', scrub: 0.8 },
    })
    tl.from(word.chars, { yPercent: 100, stagger: 0.08, ease: 'power3.out', duration: 0.7 }, 0)
      .from(q('[data-fshadow]'), { scaleX: 0.3, opacity: 0, duration: 0.8, ease: 'power2.in' }, 0.05)
      .from(q('[data-flinks] li'), { yPercent: 100, autoAlpha: 0, stagger: 0.04, duration: 0.4 }, 0.6)

    if (finePointer()) {
      const rot = gsap.quickTo(tilt, 'rotation', { duration: 1, ease: 'power3' })
      // the lean follows the pointer only once the bottle has arrived
      const move = (e: PointerEvent) => p >= 1 && rot(((e.clientX / innerWidth) - 0.5) * 6)
      root.current!.addEventListener('pointermove', move)
      return () => root.current?.removeEventListener('pointermove', move)
    }
  })

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === '#collection') {
      e.preventDefault()
      const el = document.getElementById('collection')
      if (el) scrollToY(el.getBoundingClientRect().top + scrollY)
    }
  }

  const links = (list: typeof LEFT, cls: string) => (
    <ul data-flinks className={`${s.links} ${cls}`}>
      {list.map((l) => (
        <li key={l.label}>
          <a href={l.href} onClick={(e) => go(e, l.href)} data-cursor="link" className={s.link} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
            <span data-text={l.label}>{l.label}</span>
          </a>
        </li>
      ))}
    </ul>
  )

  return (
    <footer ref={root} className={s.footer}>
      <div className="stage">
        <p data-word className={`${s.word} serif`} aria-label="AURA">
          AURA
        </p>
        <div className={s.bottleBox}>
          <span data-fshadow className={s.shadow} aria-hidden />
        </div>
        <nav aria-label="Footer">
          {links(LEFT, s.left)}
          {links(RIGHT, s.right)}
        </nav>
      </div>
      <div className={s.grain} style={{ backgroundImage: `url(${grain})` }} aria-hidden />
      {/* the story's grain (same image, blend and strength) over the bouquet
          only, so its lower part reads like the part above the edge */}
      <div data-fgrain className={s.flowerGrain} style={{ maskImage: `url(${flowers})`, WebkitMaskImage: `url(${flowers})` }} aria-hidden>
        {/* mirrored at the section edge, so the texture runs on without a step */}
        <div style={{ backgroundImage: `url(${grain})` }} />
      </div>
      {/* the bottle sits above the grain, so it keeps the story's colours */}
      <div className="stage" aria-hidden>
        <div data-ftilt className={s.tilt}>
          <ClosedBottle data-fbottle />
        </div>
        {/* the story's bouquet runs on past its section's edge: its lower part,
            otherwise clipped there, is shown here one screen lower — the same
            image, continuing pixel for pixel across the boundary */}
        <img data-fflowers src={flowers} alt="" className={s.flowers} />
      </div>
    </footer>
  )
}
