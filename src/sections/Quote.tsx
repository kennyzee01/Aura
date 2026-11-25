import { useRef } from 'react'
import { gsap, SplitText, reducedMotion, finePointer } from '../lib/motion'
import { useGsap } from '../lib/useGsap'
import { GlowButton } from '../components/GlowButton'
import photo from '../assets/img/quote.webp'
import s from './Quote.module.css'

/**
 * Desktop-31. A held breath between chapters: the photograph drifts in slowly
 * (Ken Burns, tied to scroll), the line inks itself in word by word as you
 * read, and a soft pool of light follows the cursor across the image.
 */
export function Quote() {
  const root = useRef<HTMLElement>(null)

  useGsap(root, () => {
    const q = gsap.utils.selector(root)
    const reduced = reducedMotion()
    const split = SplitText.create(q('[data-line]'), { type: 'words' })

    if (reduced) return
    gsap.fromTo(q('[data-photo]'), { scale: 1.18, yPercent: -4 }, {
      scale: 1.02,
      yPercent: 4,
      ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
    })
    gsap.fromTo(split.words, { opacity: 0.14 }, {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top 65%', end: 'top 5%', scrub: 0.6 },
    })
    gsap.from(q('[data-after]'), {
      y: 30,
      autoAlpha: 0,
      duration: 1.2,
      stagger: 0.12,
      ease: 'expo.out',
      scrollTrigger: { trigger: root.current, start: 'top 25%', once: true },
    })
  })

  const light = (e: React.PointerEvent<HTMLElement>) => {
    if (!finePointer() || reducedMotion()) return
    const b = e.currentTarget.getBoundingClientRect()
    gsap.to(e.currentTarget, {
      '--sx': `${e.clientX - b.left}px`,
      '--sy': `${e.clientY - b.top}px`,
      '--so': 1,
      duration: 0.9,
      ease: 'power3',
    })
  }

  return (
    <section
      ref={root}
      className={s.quote}
      onPointerMove={light}
      onPointerLeave={(e) => gsap.to(e.currentTarget, { '--so': 0, duration: 1.2 })}
      aria-label="Quote"
    >
      <img data-photo src={photo} alt="" className={s.photo} loading="lazy" />
      <div className={s.spot} aria-hidden />
      <div className="stage">
        <figure className={s.figure}>
          <blockquote data-line className={`${s.line} serif`}>
            You don’t need to say a word to leave an impression.
          </blockquote>
          <figcaption data-after className={s.by}>
            - J.A Kingsley
          </figcaption>
        </figure>
        <div data-after className={s.cta}>
          <GlowButton size="lg" href="#find">
            Find Your Fragrance
          </GlowButton>
        </div>
      </div>
    </section>
  )
}
