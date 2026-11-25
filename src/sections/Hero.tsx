import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap, SplitText, ScrollTrigger, EASE, pointer, reducedMotion, finePointer } from '../lib/motion'
import { useGsap } from '../lib/useGsap'
import { registerIntro } from '../lib/intro'
import { GlowButton } from '../components/GlowButton'
import { Odometer } from '../components/Odometer'
import { COLORWAYS } from './collection.data'
import sky from '../assets/img/hero-sky.webp'
import model from '../assets/img/hero-model.webp'
import bDilla from '../assets/img/hero-bottle-dilla.webp'
import bEmerald from '../assets/img/hero-bottle-emerald.webp'
import bGold from '../assets/img/hero-bottle-gold.webp'
import bBurgundy from '../assets/img/hero-bottle-burgundy.webp'
import cardDilla from '../assets/img/card-dilla.webp'
import cardEmerald from '../assets/img/card-emerald.webp'
import cardGold from '../assets/img/gold-bg.webp'
import cardBurgundy from '../assets/img/burgundy-bg.webp'
import CROP from './hero.bottle.json'
import TAKES from './hero.variants.json'
import s from './Hero.module.css'

const PRODUCTS = COLORWAYS.map((c, i) => ({
  name: c.name,
  price: c.price,
  bottle: [bDilla, bEmerald, bGold, bBurgundy][i],
  card: [cardDilla, cardEmerald, cardGold, cardBurgundy][i],
  // Emerald and Gold are their own photographs (scripts/build-hero-variants.mjs),
  // a little wider than the shared crop; same top and height, so the reveal is identical
  crop: [CROP, TAKES.emerald, TAKES.gold, CROP][i],
}))
const DWELL = 7 // seconds each fragrance is presented before the next

/* ── the curtain between the hero and the collection ──────────────────────────
   At rest it is the lavender wave on the hero's lower edge. On scroll the seam
   opens from its centre: the left curve sweeps out to the left, the right one
   to the right, and the cream page fills the space they leave behind.
   Geometry is in a 1440 × 900 box stretched to the viewport.            */
function curtainPaths(p: number) {
  const yb = 935
  const sx = p * 1150 // how far each curve has travelled outward
  const gx = p * 900 // how far the seam has opened at its inner end
  const yt = yb + 70 - (yb + 70 + 220) * Math.min(1, p * 2.2) // inner end climbs to the top
  const A = { x: -100 - sx, y: yb + 20 }
  const B = { x: 720 - gx, y: yt }
  const C1 = { x: A.x + 520, y: A.y - 260 }
  const C2 = { x: B.x + 40, y: B.y + 0.5 * (A.y - B.y) }
  const m = (x: number) => 1440 - x
  const left = `M${A.x},${A.y} C${C1.x},${C1.y} ${C2.x},${C2.y} ${B.x},${B.y}`
  const right = `M${m(A.x)},${A.y} C${m(C1.x)},${C1.y} ${m(C2.x)},${C2.y} ${m(B.x)},${B.y}`
  const fill =
    `M${A.x - 200},1200 L${A.x},${A.y} C${C1.x},${C1.y} ${C2.x},${C2.y} ${B.x},${B.y} ` +
    `Q720,${yt + 30} ${m(B.x)},${B.y} C${m(C2.x)},${C2.y} ${m(C1.x)},${C1.y} ${m(A.x)},${A.y} ` +
    `L${m(A.x) + 200},1200 Z`
  return { left, right, fill }
}

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0) // the product whose caption is on screen
  const track = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const current = useRef(0)
  const ring = useRef<gsap.core.Tween | null>(null)
  const paused = useRef(false)

  // ── entrance (choreographed against the preloader curtain) ────────────────
  useGsap(root, () => {
    const q = gsap.utils.selector(root)
    const headline = SplitText.create(q('[data-headline]'), { type: 'lines,words', mask: 'lines' })
    const sub = SplitText.create(q('[data-sub]'), { type: 'lines', mask: 'lines' })

    gsap.set(q('[data-sky]'), { scale: 1.25 })
    gsap.set(q('[data-model]'), { yPercent: 14, scale: 1.14, rotation: -2.5, transformOrigin: '40% 90%' })
    gsap.set(headline.lines, { yPercent: 105, rotation: 3, transformOrigin: '0% 100%' })
    gsap.set(sub.lines, { yPercent: 105 })
    gsap.set(q('[data-cta]'), { autoAlpha: 0, y: 30 })
    gsap.set(q('[data-card]'), { xPercent: 70, rotationY: -35, autoAlpha: 0, transformOrigin: '0% 50%' })
    gsap.set(q('[data-switch]'), { autoAlpha: 0, y: 24 })
    const nav = document.querySelector('[data-nav]')
    if (nav) gsap.set(nav, { yPercent: -160 })

    return registerIntro((curtain) => {
      const at = reducedMotion() ? 0 : 0.85
      const d = reducedMotion() ? 0.01 : 1
      curtain
        .to(q('[data-sky]'), { scale: 1, duration: 2.4 * d, ease: 'expo.out' }, at)
        .to(q('[data-model]'), { yPercent: 0, scale: 1, rotation: 0, duration: 2.2 * d, ease: 'expo.out' }, at + 0.25 * d)
        .to(headline.lines, { yPercent: 0, rotation: 0, duration: 1.4 * d, stagger: 0.12, ease: 'expo.out' }, at + 0.7 * d)
        .to(sub.lines, { yPercent: 0, duration: 1.2 * d, stagger: 0.08, ease: 'expo.out' }, at + 0.95 * d)
        .to(q('[data-cta]'), { autoAlpha: 1, y: 0, duration: 1.2 * d, ease: 'expo.out' }, at + 1.1 * d)
        .to(q('[data-card]'), { xPercent: 0, rotationY: 0, autoAlpha: (i: number) => (i < 2 ? 1 : 0.0001), duration: 1.6 * d, stagger: 0.1, ease: 'expo.out' }, at + 0.9 * d)
        .to(q('[data-switch]'), { autoAlpha: 1, y: 0, duration: 1.2 * d, ease: 'expo.out' }, at + 1.3 * d)
        .to(nav, { yPercent: 0, duration: 1.2 * d, ease: 'expo.out' }, at + 1.2 * d)
        .add(() => {
          root.current?.classList.add(s.ready)
          startRing()
        })
    })
  })

  // ── scroll: the seam opens and the cream page takes the screen ────────────
  useGsap(root, () => {
    const q = gsap.utils.selector(root)
    const reduced = reducedMotion()
    const fill = q('[data-curtain-fill]')[0] as SVGPathElement
    const left = q('[data-curtain-l]')[0] as SVGPathElement
    const right = q('[data-curtain-r]')[0] as SVGPathElement
    const svg = q('[data-curtain]')[0] as SVGSVGElement
    const draw = (p: number) => {
      const d = curtainPaths(p)
      fill.setAttribute('d', d.fill)
      left.setAttribute('d', d.left)
      right.setAttribute('d', d.right)
    }
    const stroke = () => svg.style.setProperty('--sw', `${(42 * innerWidth) / 1440}px`)
    stroke()
    draw(0)
    window.addEventListener('resize', stroke)

    const ease = gsap.parseEase('power2.inOut')
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root.current,
        start: 'top top',
        end: 'bottom top',
        scrub: reduced ? true : 0.6,
        pin: true,
        pinSpacing: false,
        onUpdate: (st) => {
          draw(ease(st.progress))
          // the presentation loop rests while the hero is leaving
          paused.current = st.progress > 0.02
          if (paused.current) ring.current?.pause()
          else if (!busy.current) ring.current?.resume()
        },
      },
      defaults: { ease: 'none' },
    })
    if (!reduced) {
      tl.to(q('[data-model-wrap]'), { scale: 1.12, yPercent: 4 }, 0)
        .to(q('[data-sky-wrap]'), { scale: 1.06, yPercent: -3 }, 0)
        .to(q('[data-copy]'), { yPercent: -40, autoAlpha: 0, ease: 'power1.in', duration: 0.6 }, 0)
        .to(q('[data-cards]'), { yPercent: -12, autoAlpha: 0, ease: 'power1.in', duration: 0.6 }, 0)
        .to(q('[data-switch]'), { yPercent: -40, autoAlpha: 0, ease: 'power1.in', duration: 0.5 }, 0)
    }
    return () => window.removeEventListener('resize', stroke)
  })

  // ── pointer: three depths + a light that rakes across skin and glass ──────
  useEffect(() => {
    if (!finePointer() || reducedMotion()) return
    const el = root.current!
    const q = gsap.utils.selector(el)
    const skyEl = q('[data-sky]')
    const mdl = q('[data-model]')[0]
    const light = q('[data-light]')[0] as HTMLElement
    const skyX = gsap.quickTo(skyEl, 'x', { duration: 1.4, ease: 'power3' })
    const skyY = gsap.quickTo(skyEl, 'y', { duration: 1.4, ease: 'power3' })
    const mX = gsap.quickTo(mdl, 'x', { duration: 1.1, ease: 'power3' })
    const mY = gsap.quickTo(mdl, 'y', { duration: 1.1, ease: 'power3' })
    const mR = gsap.quickTo(mdl, 'rotationY', { duration: 1.1, ease: 'power3' })
    const mRX = gsap.quickTo(mdl, 'rotationX', { duration: 1.1, ease: 'power3' })
    const lp = { x: 0.4, y: 0.55 }
    const tick = () => {
      if (!ScrollTrigger.isInViewport(el)) return
      skyX(-pointer.x * 14)
      skyY(-pointer.y * 10)
      mX(pointer.x * 22)
      mY(pointer.y * 12)
      mR(pointer.x * 3)
      mRX(-pointer.y * 2)
      const r = mdl.getBoundingClientRect()
      lp.x += ((pointer.cx - r.left) / r.width - lp.x) * 0.12
      lp.y += ((pointer.cy - r.top) / r.height - lp.y) * 0.12
      light.style.setProperty('--lx', `${(lp.x * 100).toFixed(2)}%`)
      light.style.setProperty('--ly', `${(lp.y * 100).toFixed(2)}%`)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  // ── presenting a fragrance ────────────────────────────────────────────────
  // She lowers her hand out of the light and lifts it back toward you; while
  // the bottle is low the new scent fills the glass from the base up, so by the
  // time it is presented again it is the next fragrance. Hand, bottle and body
  // always move as one image — nothing is ever detached.
  const present = useCallback((next: number) => {
    const el = root.current
    if (!el || busy.current || next === current.current) return
    const q = gsap.utils.selector(el)
    const prev = current.current
    current.current = next
    busy.current = true
    ring.current?.kill()
    gsap.set(q('[data-ring-bar]'), { strokeDashoffset: 1 })
    setIndex(next)

    const pose = q('[data-pose]')[0]
    const bottles = q('[data-bottle]') as HTMLElement[]
    const inc = bottles[next]
    const out = bottles[prev]
    const cap = q('[data-caption]')[0]
    const reduced = reducedMotion()

    gsap.set(bottles, { zIndex: (i: number) => (i === next ? 3 : i === prev ? 2 : 1) })
    gsap.set(inc, { autoAlpha: 1, '--reveal': 0 })

    const tl = gsap.timeline({
      onComplete: () => {
        bottles.forEach((b, i) => i !== next && gsap.set(b, { autoAlpha: 0 }))
        busy.current = false
        startRing()
      },
    })
    if (reduced) {
      tl.to(inc, { '--reveal': 1, duration: 0.01 })
        .add(() => setShown(next))
      return
    }
    tl
      // 1 · the caption steps back first
      .to(cap, { yPercent: -30, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, 0)
      // 2 · she lowers the bottle — the hand travels furthest, her head barely
      .to(pose, { yPercent: 8, rotation: -3.6, duration: 0.7, ease: 'power3.in' }, 0.05)
      // 3 · at the low point the new glass fills from its base…
      .to(inc, { '--reveal': 1, duration: 1.05, ease: 'power2.inOut' }, 0.45)
      .set(out, { autoAlpha: 0 }, 1.5)
      // 4 · …as she lifts it back into the light and holds it there
      .to(pose, { yPercent: 0, rotation: 0, duration: 1.6, ease: 'expo.out' }, 0.75)
      // 5 · name and price arrive once the bottle has settled
      .add(() => setShown(next), 1.05)
      .fromTo(cap, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out' }, 1.1)
  }, [])

  // progress ring: one revolution per fragrance, then the next is presented
  const startRing = useCallback(() => {
    if (reducedMotion()) return
    const bar = root.current?.querySelector('[data-ring-bar]')
    if (!bar) return
    ring.current?.kill()
    ring.current = gsap.fromTo(bar, { strokeDashoffset: 1 }, {
      strokeDashoffset: 0,
      duration: DWELL,
      ease: 'none',
      paused: paused.current,
      onComplete: () => present((current.current + 1) % PRODUCTS.length),
    })
  }, [present])

  useEffect(() => {
    const vis = () => (document.hidden ? ring.current?.pause() : !paused.current && !busy.current && ring.current?.resume())
    document.addEventListener('visibilitychange', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      ring.current?.kill()
    }
  }, [])
  const hold = (on: boolean) => {
    if (on) ring.current?.pause()
    else if (!paused.current && !busy.current) ring.current?.resume()
  }

  // cards follow: the presented fragrance leads, the next one waits beside it
  useEffect(() => {
    const t = track.current
    if (!t) return
    const cards = t.querySelectorAll<HTMLElement>('[data-card]')
    const step = cards[0].offsetWidth + parseFloat(getComputedStyle(t).columnGap || '0')
    gsap.to(t, { overwrite: 'auto', x: -index * step, duration: reducedMotion() ? 0 : 1.4, ease: EASE.out, delay: reducedMotion() ? 0 : 0.5 })
    cards.forEach((c, i) => {
      const rel = i - index
      // the card that was presented leaves at once, so it never ghosts over her
      if (rel < 0) {
        gsap.to(c, { autoAlpha: 0.0001, scale: 0.9, duration: 0.35, ease: 'power2.in', overwrite: 'auto' })
        return
      }
      gsap.to(c, {
        autoAlpha: rel === 0 ? 1 : rel === 1 ? 0.55 : 0.0001,
        scale: rel === 0 ? 1 : 0.92,
        transformOrigin: '0% 50%',
        duration: 1.2,
        delay: 0.5,
        ease: EASE.out,
        overwrite: 'auto',
      })
    })
  }, [index])

  const go = (dir: number) => present((current.current + dir + PRODUCTS.length) % PRODUCTS.length)

  // card tilt
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (!finePointer() || reducedMotion()) return
    const c = e.currentTarget
    const r = c.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    gsap.to(c.querySelector('[data-tilt]'), { rotationY: px * 10, rotationX: -py * 10, duration: 0.6, ease: 'power3' })
    c.style.setProperty('--gx', `${(px + 0.5) * 100}%`)
    c.style.setProperty('--gy', `${(py + 0.5) * 100}%`)
  }
  const untilt = (e: React.PointerEvent<HTMLElement>) => {
    gsap.to(e.currentTarget.querySelector('[data-tilt]'), { rotationY: 0, rotationX: 0, duration: 1.1, ease: 'power3.out' })
  }

  const toCollection = (i: number) => document.dispatchEvent(new CustomEvent('aura:colorway', { detail: i }))
  const p = PRODUCTS[shown]
  const curtain = curtainPaths(0)

  return (
    <section ref={root} className={s.hero} id="top" aria-label="Not just a scent. It's a presence.">
      <div className={s.skyFull} aria-hidden>
        <div data-sky-wrap className={s.fill}>
          <img data-sky src={sky} alt="" className={s.cover} />
        </div>
      </div>

      <div className="stage">
        <div data-model-wrap className={s.modelBox}>
          <div data-model className={s.model}>
            <div data-pose className={s.pose}>
              <img src={model} alt="" className={s.modelImg} />
              {PRODUCTS.map((b, i) => (
                <img
                  key={b.name}
                  data-bottle
                  src={b.bottle}
                  alt=""
                  className={s.bottle}
                  style={{
                    left: `${b.crop.left * 100}%`,
                    top: `${b.crop.top * 100}%`,
                    width: `${b.crop.width * 100}%`,
                    height: `${b.crop.height * 100}%`,
                    opacity: i === 0 ? 1 : 0,
                    visibility: i === 0 ? 'visible' : 'hidden',
                  }}
                />
              ))}
              <div data-light className={s.light} style={{ maskImage: `url(${model})`, WebkitMaskImage: `url(${model})` }} />
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            A woman in a camel jacket presents {p.name} toward you
          </p>
        </div>

        <div data-copy className={s.copy}>
          <h1 data-headline className={`${s.headline} serif`}>
            Not Just a Scent.
            <br />
            It's a Presence
          </h1>
          <p data-sub className={s.sub}>
            Fragrances that become part of your story, long after the moment has passed.
          </p>
          <div data-cta className={s.cta}>
            <GlowButton href="#collection" onClick={() => toCollection(current.current)}>
              Explore the presence
            </GlowButton>
          </div>
        </div>

        <div data-cards className={s.cardsViewport} onPointerEnter={() => hold(true)} onPointerLeave={() => hold(false)}>
          <div ref={track} className={s.track}>
            {PRODUCTS.map((c, i) => (
              <article key={c.name} data-card className={s.card} onPointerMove={tilt} onPointerLeave={untilt} aria-label={c.name}>
                <div data-tilt className={s.cardInner}>
                  <button
                    className={s.cardImg}
                    onClick={() => (i === index ? toCollection(i) : present(i))}
                    data-cursor="view"
                    aria-label={i === index ? `View ${c.name} in the collection` : `Present ${c.name}`}
                  >
                    <img src={c.card} alt="" loading={i > 1 ? 'lazy' : 'eager'} />
                    <span className={s.glare} aria-hidden />
                  </button>
                  <button className={s.shop} data-cursor="shop" onClick={() => toCollection(i)}>
                    <span>Shop now</span>
                    <span aria-hidden>Shop now</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* the presenter: what she is holding, and the way to the next one */}
        <div data-switch className={s.switch} onPointerEnter={() => hold(true)} onPointerLeave={() => hold(false)}>
          <div data-caption className={s.caption} aria-live="polite">
            <span className={s.capIndex}>
              {String(shown + 1).padStart(2, '0')}
              <i> / {String(PRODUCTS.length).padStart(2, '0')}</i>
            </span>
            <span className={`${s.capName} serif`}>{p.name}</span>
            <Odometer value={p.price} className={s.capPrice} />
          </div>
          <div className={s.controls}>
            <button className={s.arrow} onClick={() => go(-1)} aria-label="Previous fragrance" data-cursor="link">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>
            <svg className={s.ring} viewBox="0 0 48 48" aria-hidden>
              <circle cx="24" cy="24" r="22" className={s.ringTrack} />
              <circle data-ring-bar cx="24" cy="24" r="22" pathLength={1} className={s.ringBar} />
              {PRODUCTS.map((_, i) => {
                const a = (i / PRODUCTS.length) * Math.PI * 2 - Math.PI / 2
                return <circle key={i} cx={24 + Math.cos(a) * 22} cy={24 + Math.sin(a) * 22} r={i === index ? 2.4 : 1.6} className={i === index ? s.tickOn : s.tick} />
              })}
            </svg>
            <button className={s.arrow} onClick={() => go(1)} aria-label="Next fragrance" data-cursor="link">
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <svg data-curtain className={s.curtain} viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden>
        <path data-curtain-fill d={curtain.fill} className={s.curtainFill} />
        <path data-curtain-l d={curtain.left} className={s.curtainLine} />
        <path data-curtain-r d={curtain.right} className={s.curtainLine} />
      </svg>
    </section>
  )
}
