import { useRef, useState } from 'react'
import { gsap, ScrollTrigger, SplitText, reducedMotion } from '../lib/motion'
import { useGsap } from '../lib/useGsap'
import { Odometer } from '../components/Odometer'
import dilla from '../assets/img/dilla-fg.webp'
import emerald from '../assets/img/emerald-fg.webp'
import gold from '../assets/img/gold-fg.webp'
import s from './Stats.module.css'

const ROWS = [
  { label: 'Signature fragrances', value: '5,000+', caption: 'Happy Customers', img: dilla },
  { label: 'For a lasting impression', value: '4.9/5', caption: 'Customer Rating', img: emerald },
  { label: 'Extraordinary moments', value: '100%', caption: 'Authenticity Guaranteed', img: gold },
]

/**
 * A quiet beat after the colour. Each row is drawn open like a drawer,
 * its words settle, and the figure rolls into place like a counter.
 */
export function Stats() {
  const root = useRef<HTMLElement>(null)
  const [played, setPlayed] = useState([false, false, false])

  useGsap(root, () => {
    const rows = gsap.utils.toArray<HTMLElement>('[data-row]')
    const reduced = reducedMotion()
    rows.forEach((row, i) => {
      const label = SplitText.create(row.querySelector('[data-label]'), { type: 'words', mask: 'words' })
      const tl = gsap.timeline({ paused: true })
      tl.fromTo(row, { clipPath: 'inset(0% 100% 0% 0% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.3, ease: 'expo.inOut' })
        .from(label.words, { yPercent: 110, duration: 1, stagger: 0.06, ease: 'expo.out' }, 0.55)
        .from(row.querySelector('[data-caption]'), { y: 14, autoAlpha: 0, duration: 0.8, ease: 'expo.out' }, 0.8)
      ScrollTrigger.create({
        trigger: row,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          if (reduced) tl.progress(1)
          else tl.play()
          gsap.delayedCall(reduced ? 0 : 0.7, () => setPlayed((p) => p.map((v, j) => (j === i ? true : v))))
        },
      })
    })
  })

  return (
    <section ref={root} className={s.stats} aria-label="AURA in numbers">
      <ul className={s.list}>
        {ROWS.map((r, i) => (
          <li key={r.label} data-row className={s.row} tabIndex={0}>
            <img src={r.img} alt="" className={s.peek} aria-hidden loading="lazy" />
            <p data-label className={`${s.label} serif`}>
              {r.label}
            </p>
            <div className={s.figure}>
              <p className={`${s.value} serif`}>
                <Odometer value={r.value} play={played[i]} />
              </p>
              <p data-caption className={s.caption}>
                {r.caption}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
