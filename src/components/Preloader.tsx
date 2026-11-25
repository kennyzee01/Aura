import { useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger, reducedMotion, lockScroll } from '../lib/motion'
import word from '../assets/img/logo-word.webp'
import star from '../assets/img/logo-star.webp'
import tag from '../assets/img/logo-tag.webp'
import grain from '../assets/img/grain-warm.webp'
import G from './logo.json'
import s from './Preloader.module.css'

/*
 * "The first spark" — AURA's opening, in four movements.
 *
 *  1  Atmosphere   warm light gathers on the cream ground.
 *  2  Spark        the four-point star from the mark catches the light.
 *  3  Name         the wordmark blooms outward from the spark, out of focus
 *                  into focus; FRAGRANCE HOUSE opens from its centre and the
 *                  hairline rules draw out with the real loading progress.
 *  4  Release      once everything is in, the name dissipates like scent and
 *                  the cream parts like mist, revealing the hero beneath —
 *                  whose own entrance is choreographed into this same
 *                  timeline (see lib/intro.ts).
 *
 * The logo is the brand file split into wordmark / star / lettering
 * (scripts/build-logo.mjs), so at rest it is the logo, pixel for pixel.
 */
const OWN = [word, star, tag]
const COUNT_FOR = 1.6 // s: the soonest the count may reach 99 (the mark is composed by ~2s)
const HOLD = 0.25 // s at 100% before the release
const GIVE_UP = 8000 // never hold the site hostage to a slow or failed asset

type Props = { images: string[]; onReveal: (tl: gsap.core.Timeline) => void }

const decode = (src: string) => {
  const img = new Image()
  img.src = src
  return img.decode().catch(() => {}) // a failed image must not block the site
}

export function Preloader({ images, onReveal }: Props) {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const reduced = reducedMotion()
    const el = root.current!
    lockScroll(true)
    window.scrollTo(0, 0)
    let stopTick = () => {}

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el)
      const [wordEl, starEl, tagEl, flare, glow, bloom, panel, mark] = [
        '[data-word]', '[data-star]', '[data-tag]', '[data-flare]', '[data-glow]', '[data-bloom]', '[data-panel]', '[data-mark]',
      ].map((k) => q(k)[0] as HTMLElement)
      const rules = q('[data-rule]') as HTMLElement[]
      const count = q('[data-count]')[0] as HTMLElement
      const digits = q('[data-digit]') as HTMLElement[]

      // ── honest progress: what has actually been decoded (hero images + fonts)
      let loaded = 0
      const total = images.length + 1
      let ready = false // every hero asset is in (or we gave up waiting)
      const assets = Promise.all([
        ...images.map((src) => decode(src).finally(() => void loaded++)),
        document.fonts.ready.finally(() => void loaded++),
      ])
      const everything = Promise.race([assets, new Promise((r) => setTimeout(r, GIVE_UP))])
      everything.then(() => void (ready = true))

      // ── the count. What it shows is the real progress, paced by a clock so a
      // fast load still reads as a deliberate 0 → 100 rather than a jump, and
      // eased toward so the numerals roll through every value. It holds at 99
      // until the hero is truly ready; only then does it land on 100.
      const shown = { v: 0 }
      let started = false
      let clock = 0
      let last = -1
      let landed = false
      const paint = (v: number) => {
        const n = Math.min(100, Math.floor(v))
        if (n === last) return
        last = n
        const s3 = String(n).padStart(3, '0')
        let lead = true
        digits.forEach((d, i) => {
          d.textContent = s3[i]
          // leading zeros sit back as quiet placeholders
          lead = lead && s3[i] === '0' && i < 2
          d.classList.toggle(s.dim, lead)
        })
        gsap.set(rules, { scaleX: n / 100 })
      }
      paint(0)
      let onLanded: () => void = () => {}
      const landedP = new Promise<void>((r) => (onLanded = r))
      const tick = (_t: number, dt: number) => {
        if (!started) return // the count begins with the opening, not before
        clock += dt / 1000
        const paced = gsap.parseEase('power1.inOut')(Math.min(1, clock / COUNT_FOR))
        const target = Math.min(ready ? 1 : loaded / total, paced) * 99
        // a stalled frame must not become a leap: the numerals always roll,
        // catching up over the next frames instead
        const step = (target - shown.v) * (reduced ? 1 : 1 - Math.exp(-Math.min(dt / 1000, 1 / 30) * 11))
        shown.v += reduced ? step : Math.min(step, 2.4)
        paint(shown.v)
        if (!landed && ready && clock >= COUNT_FOR && shown.v > 98.6) {
          landed = true
          gsap.ticker.remove(tick)
          land()
        }
      }
      gsap.ticker.add(tick)
      stopTick = () => gsap.ticker.remove(tick)

      // 99 → 100: the leading 1 lights, the rules close on the lettering and
      // the star catches the light once more — then a breath before release
      const land = () => {
        paint(100)
        const tl = gsap.timeline()
        if (reduced) {
          tl.set(rules, { scaleX: 1 }).call(onLanded, [], HOLD)
          return
        }
        tl.fromTo(digits[0], { yPercent: 40, autoAlpha: 0, filter: 'blur(4px)' }, { yPercent: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }, 0)
          .fromTo(count, { scale: 0.96 }, { scale: 1, duration: 0.6, ease: 'expo.out' }, 0)
          .fromTo(count, { '--glint': 0 }, { '--glint': 1, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 }, 0)
          .to(rules, { scaleX: 1, duration: 0.45, ease: 'power3.out' }, 0)
          .fromTo(flare, { scaleX: 0.2, autoAlpha: 0 }, { scaleX: 1.15, autoAlpha: 0.9, duration: 0.22, ease: 'power3.out' }, 0.02)
          .to(flare, { scaleX: 1.5, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 0.24)
          .fromTo(glow, { scale: 0.6, autoAlpha: 0 }, { scale: 1.1, autoAlpha: 0.55, duration: 0.25, ease: 'power2.out' }, 0.02)
          .to(glow, { scale: 1.6, autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, 0.27)
          // the hold: 100% lands (~0.2s), is seen and settles; the glint's
          // tail is left to fade under the release
          .call(onLanded, [], 0.2 + HOLD)
      }

      // ── the opening (plays while the site loads)
      gsap.set(mark, { autoAlpha: 0 })
      gsap.set(rules, { scaleX: 0 })
      const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
      if (reduced) {
        intro.to(mark, { autoAlpha: 1, duration: 0.4, ease: 'power1.out' })
          .set(wordEl, { '--r': 160 }, 0)
      } else {
        intro
          .set(mark, { autoAlpha: 1 })
          // 1 · atmosphere
          .fromTo(bloom, { autoAlpha: 0, scale: 0.72 }, { autoAlpha: 1, scale: 1, duration: 2.4, ease: 'power2.out' }, 0)
          // 2 · the spark: the star turns into place as the light catches it
          .fromTo(starEl, { scale: 0, rotation: -135, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: 1.1 }, 0.15)
          .fromTo(glow, { scale: 0.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'power2.out' }, 0.3)
          .to(glow, { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: 'power2.inOut' }, 0.95)
          .fromTo(flare, { scaleX: 0, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 0.55, ease: 'power3.out' }, 0.42)
          .to(flare, { scaleX: 1.35, autoAlpha: 0, duration: 0.8, ease: 'power2.in' }, 0.85)
          // 3 · the name blooms out of the spark and comes into focus
          .fromTo(wordEl, { '--r': 0, filter: 'blur(9px)', scale: 1.035 }, { '--r': 160, filter: 'blur(0px)', scale: 1, duration: 1.5, ease: 'power3.out' }, 0.55)
          // the lettering opens from its centre
          .fromTo(tagEl, { clipPath: 'inset(0% 50% 0% 50%)', autoAlpha: 0.0001 }, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1, duration: 1.1, ease: 'power3.inOut' }, 1.0)
          .fromTo(q('[data-rules]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'none' }, 1.35)
          // the count surfaces quietly beneath the name
          .fromTo(count, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0.25)
          // the light keeps breathing while we wait
          .to(bloom, { scale: 1.05, duration: 3.2, ease: 'sine.inOut', repeat: -1, yoyo: true }, 2.4)
      }

      // the mark's own images first, so nothing pops in half-drawn
      Promise.all(OWN.map(decode)).then(() => {
        started = true
        intro.play()
      })

      // ── the release: the count has landed on 100 (which it only does once
      // the hero is ready) and been held for a beat
      landedP.then(() => {
        // the opening hands over completely: nothing of it may fight the exit
        intro.pause()
        // fonts + images are in: measure every scroll scene once, for real
        ScrollTrigger.refresh()
        const tl = gsap.timeline({
          onComplete: () => {
            intro.kill()
            lockScroll(false)
            el.style.display = 'none'
          },
        })
        if (reduced) {
          tl.to(el, { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut' }, 0.2)
            .set(el, { pointerEvents: 'none' }, 0.2)
        } else {
          gsap.set(rules, { scaleX: 1 })
          tl
            // the lettering and rules withdraw first…
            .to([tagEl, ...q('[data-rules]'), count], { autoAlpha: 0, y: -6, duration: 0.45, ease: 'power2.in' }, 0)
            // …then the name dissipates like scent
            .to([wordEl, starEl], { filter: 'blur(14px)', autoAlpha: 0, scale: 1.07, duration: 0.95, ease: 'power2.in' }, 0.08)
            .to(bloom, { scale: 1.9, autoAlpha: 0, duration: 1.6, ease: 'power2.inOut' }, 0.2)
            // and the cream parts like mist, from the centre outward
            .fromTo(panel, { '--m': 0 }, { '--m': 170, duration: 1.55, ease: 'power3.inOut' }, 0.45)
            // the site is live as soon as most of it can be seen
            .set(el, { pointerEvents: 'none' }, 1.15)
        }
        onReveal(tl)
      })
    }, el)

    return () => {
      stopTick()
      ctx.revert()
      lockScroll(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pct = (v: number) => `${v * 100}%`
  return (
    <div ref={root} className={s.loader} role="status" aria-live="polite" aria-label="Loading AURA">
      <div data-panel className={s.panel}>
        <div data-bloom className={s.bloom} />
        <div className={s.grain} style={{ backgroundImage: `url(${grain})` }} />
      </div>

      <div data-mark className={s.mark} style={{ aspectRatio: `${G.aspect}` }}>
        <img
          data-word
          src={word}
          alt="AURA"
          className={s.word}
          style={{
            left: pct(G.word.l), top: pct(G.word.t), width: pct(G.word.w), height: pct(G.word.h),
            // the reveal grows out of the star (in the word layer's own box)
            ['--sx' as string]: pct((G.star.cx - G.word.l) / G.word.w),
            ['--sy' as string]: pct((G.star.cy - G.word.t) / G.word.h),
          }}
        />
        <span data-glow className={s.glow} style={{ left: pct(G.star.cx), top: pct(G.star.cy) }} />
        <span data-flare className={s.flare} style={{ left: pct(G.star.cx), top: pct(G.star.cy) }} />
        <img data-star src={star} alt="" className={s.star} style={{ left: pct(G.star.l), top: pct(G.star.t), width: pct(G.star.w) }} />
        <div data-rules className={s.rules}>
          <span data-rule className={`${s.rule} ${s.ruleL}`} style={{ left: pct(G.rules.l[0]), width: pct(G.rules.l[1] - G.rules.l[0]), top: pct(G.rules.t) }} />
          <span data-rule className={`${s.rule} ${s.ruleR}`} style={{ left: pct(G.rules.r[0]), width: pct(G.rules.r[1] - G.rules.r[0]), top: pct(G.rules.t) }} />
        </div>
        <img data-tag src={tag} alt="Fragrance House" className={s.tag} style={{ left: pct(G.tag.l), top: pct(G.tag.t), width: pct(G.tag.w) }} />
        <p data-count className={`${s.count} serif`} aria-hidden>
          <span data-digit className={s.dim}>0</span>
          <span data-digit className={s.dim}>0</span>
          <span data-digit>0</span>
          <span className={s.pct}>%</span>
        </p>
      </div>
    </div>
  )
}
