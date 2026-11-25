import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, SplitText, pointer, reducedMotion, finePointer, scrollToY } from '../lib/motion'
import { useGsap } from '../lib/useGsap'
import { Backdrops } from '../gl/Backdrops'
import { GlowButton } from '../components/GlowButton'
import { Odometer } from '../components/Odometer'
import { COLORWAYS, GRID } from './collection.data'
import diamond from '../assets/img/icon-diamond.svg'
import s from './Collection.module.css'

// Timeline map (in timeline seconds; scroll distance is proportional)
const T = {
  namesIn: 0,
  card: 1.0, // card emerges from the centre cell
  expand: 2.2, // card becomes the stage
  scene0: 3.6, // first colourway fully composed
  hold: 0.7, // breathing room on each colourway
  change: 1.3, // length of one colourway transition
}
const sceneAt = (i: number) => T.scene0 + i * (T.hold + T.change)

// card rect in Figma frame coordinates (Desktop-21)
const CARD = { x: 463, y: 218, w: 515, h: 466, r: 24 }
// inside the card the photograph is drawn at 524px for a 1442px stage
const CARD_SCALE = 524 / 1442
// phones held upright get their own composition (see the CSS): the card the
// scene opens from is sized to the phone, not to the 1440 frame
const PHONE = '(max-width: 820px) and (orientation: portrait)'
const isPhone = () => window.matchMedia(PHONE).matches
const PHONE_CARD = { x: 0.13, top: 0.24, bottom: 0.2, r: 22 }
const cardScale = () => (isPhone() ? 1 - 2 * PHONE_CARD.x : CARD_SCALE)

export function Collection() {
  const root = useRef<HTMLElement>(null)
  const canvasHost = useRef<HTMLDivElement>(null)
  const gl = useRef<Backdrops | null>(null)
  const [active, setActive] = useState(0)
  const [uiOn, setUiOn] = useState(false)
  const [glOk, setGlOk] = useState(true)
  const stRef = useRef<ScrollTrigger | null>(null)

  // ── WebGL backdrops ────────────────────────────────────────────────────────
  useEffect(() => {
    const host = canvasHost.current
    if (!host) return
    // a fresh canvas per mount: a context that was released can't be reused
    const cvs = document.createElement('canvas')
    cvs.className = s.canvas
    cvs.setAttribute('aria-hidden', 'true')
    host.appendChild(cvs)
    try {
      gl.current = new Backdrops(
        cvs,
        COLORWAYS.map((c) => c.plate),
      )
    } catch {
      cvs.remove()
      setGlOk(false)
      return
    }
    const g = gl.current
    const onResize = () => g.resize()
    window.addEventListener('resize', onResize)
    let visible = false
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(root.current!)
    const tick = () => {
      if (!visible) return
      g.mouse.x += (pointer.x - g.mouse.x) * 0.05
      g.mouse.y += (pointer.y - g.mouse.y) * 0.05
      g.render()
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', onResize)
      io.disconnect()
      g.destroy()
      cvs.remove()
      gl.current = null
    }
  }, [])

  // ── the pinned sequence ────────────────────────────────────────────────────
  useGsap(root, () => {
    const q = gsap.utils.selector(root)
    const reduced = reducedMotion()
    const pin = q('[data-pin]')[0] as HTMLElement
    const scene = q('[data-scene]')[0] as HTMLElement
    const inner = q('[data-inner]')[0] as HTMLElement
    const frame = q('[data-frame]')[0] as HTMLElement
    const names = q('[data-name]') as HTMLElement[]
    const titles = q('[data-title]') as HTMLElement[]
    const fgs = q('[data-fg]') as HTMLElement[]

    // geometry of the card inside the (centred, u-scaled) stage, in px
    const cardRect = () => {
      const u = Math.min(innerWidth / 1440, innerHeight / 860)
      if (isPhone()) {
        const W = innerWidth, H = innerHeight
        return { l: W * PHONE_CARD.x, t: H * PHONE_CARD.top, r: W * PHONE_CARD.x, b: H * PHONE_CARD.bottom, rad: PHONE_CARD.r, u }
      }
      const sx = (innerWidth - 1440 * u) / 2
      const sy = (innerHeight - 900 * u) / 2
      return {
        l: sx + CARD.x * u,
        t: sy + CARD.y * u,
        r: innerWidth - (sx + (CARD.x + CARD.w) * u),
        b: innerHeight - (sy + (CARD.y + CARD.h) * u),
        rad: CARD.r * u,
        u,
      }
    }
    // clip-path + frame follow one proxy so they can never drift apart
    const clip = { l: 0, t: 0, r: 0, b: 0, rad: 0 }
    const applyClip = () => {
      scene.style.clipPath = `inset(${clip.t}px ${clip.r}px ${clip.b}px ${clip.l}px round ${clip.rad}px)`
      frame.style.left = `${clip.l}px`
      frame.style.top = `${clip.t}px`
      frame.style.right = `${clip.r}px`
      frame.style.bottom = `${clip.b}px`
      frame.style.borderRadius = `${clip.rad}px`
    }
    const collapsed = () => {
      const c = cardRect()
      const cx = (c.l + innerWidth - c.r) / 2
      const cy = (c.t + innerHeight - c.b) / 2
      return { l: cx, t: cy, r: innerWidth - cx, b: innerHeight - cy, rad: c.rad }
    }
    Object.assign(clip, collapsed())
    applyClip()

    // split every title into chars (each colourway has two words)
    const splits = titles.map((t) => SplitText.create(t, { type: 'chars', mask: 'chars' }))
    gsap.set(splits.map((sp) => sp.chars), { yPercent: 110 })
    gsap.set(fgs, { autoAlpha: 0 })

    // names rest just below their line until revealed
    gsap.set(names, { yPercent: 105 })

    const glValue = { v: 0 }
    const tl = gsap.timeline({ defaults: { ease: 'none' } })

    // A · the index of names rises from the centre outward
    tl.to(names, { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: { each: 0.03, from: 'center', grid: 'auto' } }, T.namesIn)
      .fromTo(q('[data-lines] path'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, stagger: 0.12, ease: 'power2.inOut' }, T.namesIn)

    // B · the card surfaces from the centre cell, displacing the words around it
    tl.to(clip, {
      duration: 1.1,
      ease: 'power3.inOut',
      l: () => cardRect().l,
      t: () => cardRect().t,
      r: () => cardRect().r,
      b: () => cardRect().b,
      rad: () => cardRect().rad,
      onUpdate: applyClip,
    }, T.card)
      .fromTo(frame, { opacity: 0 }, { opacity: 1, duration: 0.3 }, T.card)
      .fromTo(inner, { scale: () => cardScale() * 0.8 }, { scale: () => cardScale(), duration: 1.1, ease: 'power3.inOut' }, T.card)
      .to(fgs[0], { autoAlpha: 1, duration: 0.01 }, T.card)
      .to(names, {
        duration: 1.1,
        ease: 'power3.inOut',
        x: (_i: number, el: HTMLElement) => push(el).x,
        y: (_i: number, el: HTMLElement) => push(el).y,
        opacity: (_i: number, el: HTMLElement) => push(el).o,
      }, T.card)

    // C · the card opens into the stage; the index falls away
    tl.to(clip, { duration: 1.4, ease: 'expo.inOut', l: 0, t: 0, r: 0, b: 0, rad: 0, onUpdate: applyClip }, T.expand)
      .to(frame, { opacity: 0, duration: 0.6 }, T.expand + 0.6)
      .to(inner, { scale: 1, duration: 1.4, ease: 'expo.inOut' }, T.expand)
      .to(names, { opacity: 0, duration: 0.7 }, T.expand)
      .to(splits[0].chars, { yPercent: 0, duration: 0.9, stagger: 0.025, ease: 'expo.out' }, T.expand + 0.9)

    // D · colourway → colourway
    for (let i = 0; i < COLORWAYS.length - 1; i++) {
      const at = sceneAt(i) + T.hold
      const out = splits[i]
      const inn = splits[i + 1]
      const dir = i % 2 ? -1 : 1
      tl.to(out.chars, { yPercent: -110, duration: 0.45, stagger: 0.012, ease: 'power3.in' }, at)
        // the bottle leaves on a lifting arc…
        .to(fgs[i], { xPercent: -14 * dir, yPercent: -18, rotation: -10 * dir, scale: 0.86, autoAlpha: 0, filter: 'blur(6px)', duration: 0.6, ease: 'power3.in' }, at + 0.05)
        // …the colour rises through the old one…
        .to(glValue, { v: i + 1, duration: 0.85, ease: 'power2.inOut', onUpdate: () => gl.current?.set(glValue.v) }, at + 0.22)
        // …and the next one is placed into the hands
        .fromTo(fgs[i + 1],
          { xPercent: 12 * dir, yPercent: 22, rotation: 9 * dir, scale: 0.9, autoAlpha: 0, filter: 'blur(6px)' },
          { xPercent: 0, yPercent: 0, rotation: 0, scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 0.75, ease: 'power3.out' }, at + 0.55)
        .fromTo(inn.chars, { yPercent: 110 }, { yPercent: 0, duration: 0.65, stagger: 0.018, ease: 'expo.out' }, at + 0.7)
    }
    tl.to({}, { duration: T.hold }, sceneAt(COLORWAYS.length - 1))
    // phones: as the last scent settles, the scene's lower corners round off,
    // so it lifts away from the cream beneath like a card rather than a hard cut
    // (on desktop the value is unused)
    tl.fromTo(pin, { '--lift': 0 }, { '--lift': 1, duration: T.hold * 0.5, ease: 'power2.out' }, sceneAt(COLORWAYS.length - 1) + T.hold * 0.5)

    // labels for snapping + deep links. Each rests late enough in its hold that
    // the name has fully risen out of its masks — resting earlier left the last
    // letters half-clipped (a stray partial glyph where the title should be)
    tl.addLabel('card', T.card + 1.1)
    COLORWAYS.forEach((_, i) => tl.addLabel(`c${i}`, sceneAt(i) + 0.6))

    const st = ScrollTrigger.create({
      animation: tl,
      trigger: pin,
      start: 'top top',
      end: () => `+=${innerHeight * tl.duration() * 0.62}`,
      pin: true,
      scrub: reduced ? true : 0.8,
      invalidateOnRefresh: true,
      snap: reduced
        ? undefined
        : {
            snapTo: (v: number) => {
              // only snap once we are inside the colourway part
              if (v * tl.duration() < T.expand) return v
              const pts = COLORWAYS.map((_, i) => tl.labels[`c${i}`] / tl.duration())
              return pts.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a))
            },
            duration: { min: 0.3, max: 0.9 },
            delay: 0.12,
            ease: 'power2.inOut',
          },
      onUpdate: (self) => {
        const t = self.progress * tl.duration()
        setUiOn(t > T.expand + 1.15)
        // derive the active colourway from time, so jumps never desync it
        let idx = 0
        for (let i = 1; i < COLORWAYS.length; i++) if (t > sceneAt(i - 1) + T.hold + 0.6) idx = i
        setActive(idx)
      },
      onRefresh: () => {
        if (tl.time() < T.card) {
          Object.assign(clip, collapsed())
          applyClip()
        }
      },
    })
    stRef.current = st

    // displacement of a word away from the card centre (computed on refresh)
    function push(el: HTMLElement) {
      const c = cardRect()
      const cx = (c.l + innerWidth - c.r) / 2
      const cy = (c.t + innerHeight - c.b) / 2
      gsap.set(el, { x: 0, y: 0 })
      const r = el.getBoundingClientRect()
      const ex = r.left + r.width / 2 - cx
      const ey = r.top + r.height / 2 - cy
      const d = Math.hypot(ex, ey) || 1
      // phones: the card fills the width, so a parted word could only rest
      // half off-screen (a clipped fragment); there they drift aside and fade
      if (isPhone()) return { x: (ex / d) * 48, y: (ey / d) * 32, o: 0 }
      const k = Math.max(0, 1 - d / (900 * c.u)) // closer words travel further
      return { x: (ex / d) * 160 * c.u * k, y: (ey / d) * 110 * c.u * k, o: 0.25 + 0.75 * (d / (700 * c.u)) }
    }

    return () => splits.forEach((sp) => sp.revert())
  })

  // ── pointer depth inside a colourway ──────────────────────────────────────
  useEffect(() => {
    if (!finePointer() || reducedMotion()) return
    const q = gsap.utils.selector(root)
    const depth = q('[data-depth]') as HTMLElement[]
    const setters = depth.map((el) => {
      const k = Number(el.dataset.depth)
      return {
        k,
        x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }),
        y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }),
        r: gsap.quickTo(el, 'rotation', { duration: 1.2, ease: 'power3' }),
      }
    })
    const tick = () => {
      if (!root.current || !ScrollTrigger.isInViewport(root.current)) return
      setters.forEach(({ k, x, y, r }) => {
        x(pointer.x * 14 * k)
        y(pointer.y * 9 * k)
        r(pointer.x * 1.2 * k)
      })
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  // deep links from the hero carousel and the side index
  const jump = (i: number) => {
    const st = stRef.current
    if (!st) return
    const tl = st.animation as gsap.core.Timeline
    const p = tl.labels[`c${i}`] / tl.duration()
    scrollToY(st.start + (st.end - st.start) * p, 2.2)
  }
  useEffect(() => {
    const h = (e: Event) => jump((e as CustomEvent<number>).detail)
    document.addEventListener('aura:colorway', h)
    return () => document.removeEventListener('aura:colorway', h)
  }, [])

  const c = COLORWAYS[active]
  const highlight = (name: string | null) => {
    root.current?.querySelectorAll<HTMLElement>('[data-name]').forEach((el) => {
      el.classList.toggle(s.lit, el.dataset.name === name)
    })
  }

  return (
    <section ref={root} className={s.collection} id="collection" aria-label="The collection">

      <div data-pin className={s.pin}>
        <div className="stage">
          <svg data-lines className={s.lines} viewBox="0 0 1583 518" fill="none" aria-hidden>
            <path pathLength={1} d="M6 184.7S244.7 117.3 392.2 151.5c142.2 33 181 105.2 320.5 148.4 169.1 52.4 293.4-22.5 455.1 49.6 95.6 42.6 213 162.6 213 162.6" />
            <path pathLength={1} d="M84.9 167.4S320.4 89.2 469.2 116.7c143.5 26.6 185.6 97 326.9 133.8 171.3 44.6 292.1-35.8 456.9 28.9 97.4 38.3 220.1 152.8 220.1 152.8" />
            <path pathLength={1} d="M162.9 141.2S382.6 50.9 524.2 70.7c136.6 19 178.9 87 313.7 116.4 163.4 35.7 274.7-50.9 432.7 5.1 93.4 33.1 213.5 141 213.5 141" />
          </svg>
          <div className={s.grid} role="list" aria-label="Fragrances">
            {GRID.map((row, ri) => (
              <div key={ri} className={s.row}>
                {row.map((n, ni) => (
                  <span key={ni} className={s.nameMask} role="listitem">
                    <button
                      data-name={n}
                      className={`${s.name} serif`}
                      onPointerEnter={() => highlight(n)}
                      onPointerLeave={() => highlight(null)}
                      onFocus={() => highlight(n)}
                      onBlur={() => highlight(null)}
                      onClick={() => jump(Math.max(0, COLORWAYS.findIndex((c) => c.grid === n)))}
                      style={{ ['--accent' as string]: COLORWAYS.find((c) => c.grid === n)?.accent }}
                      data-cursor="link"
                    >
                      {n}
                    </button>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* the card that becomes the stage */}
        <div data-scene className={s.scene}>
          <div data-inner className={s.inner}>
            <div ref={canvasHost} className={s.canvasHost} />
            {!glOk &&
              COLORWAYS.map((cw, i) => (
                <img key={cw.key} src={cw.plate} alt="" className={s.plateFallback} style={{ opacity: i === active ? 1 : 0 }} />
              ))}
            <div className="stage">
              {COLORWAYS.map((cw) => (
                <div key={cw.key} className={s.titleSet} data-depth="-0.6" aria-hidden>
                  <div data-title>
                    {cw.title.map((w) => (
                      <span key={w.text} className={`${s.title} serif`} style={{ left: `calc(${w.x} * var(--u))`, top: `calc(${w.y} * var(--u))` }}>
                        {w.text}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {COLORWAYS.map((cw, i) => (
                <div
                  key={cw.key}
                  className={s.fgBox}
                  data-depth="1"
                  style={{
                    // right-aligned: the gloved arms enter from the frame's edge
                    ['--fs' as string]: 1442 * cw.frame.s,
                    ['--mcx' as string]: cw.mobile.cx,
                    ['--mbase' as string]: cw.mobile.base,
                    ['--mk' as string]: cw.mobile.k,
                    left: `calc(${1441 - 1442 * cw.frame.s} * var(--u))`,
                    top: `calc(${cw.frame.top} * var(--u))`,
                  }}
                >
                  <img data-fg src={cw.fg} alt={i === active ? `${cw.name} bottle held in black lace gloves` : ''} className={s.fg} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div data-frame className={s.frame} aria-hidden />

        {/* phones: a low veil of the scene's own darkness for the product details */}
        <div className={`${s.veil} ${uiOn ? s.veilOn : ''}`} aria-hidden />

        {/* product UI — one set, its values roll between colourways */}
        <div className={`stage ${s.ui} ${uiOn ? s.uiOn : ''}`} aria-live="polite">
          <div className={s.price} data-depth="0.7">
            <Odometer value={c.price} play={uiOn} />
          </div>
          <div className={s.badge} key={c.badge}>
            <img src={diamond} alt="" width={12} height={12} />
            <span>{c.badge}</span>
          </div>
          <p className={s.usedBy}>
            <span key={c.name} className={s.swap}>
              {c.name}
            </span>{' '}
            used by:
          </p>
          <div className={s.avatars}>
            {c.avatars.map((a, i) => (
              <span key={i} className={s.avatar} style={{ transitionDelay: `${i * 60}ms` }}>
                <img src={a} alt="" />
              </span>
            ))}
            <span className={`${s.avatar} ${s.count}`}>
              +<Odometer value={c.users} play={uiOn} />
            </span>
          </div>
          <div className={s.shop}>
            <GlowButton href="#shop">Shop Now</GlowButton>
          </div>
          <nav className={s.index} aria-label="Colourways">
            {COLORWAYS.map((cw, i) => (
              <button key={cw.key} className={i === active ? s.indexOn : ''} onClick={() => jump(i)} data-cursor="link" aria-current={i === active}>
                <span className={s.indexNum}>0{i + 1}</span>
                <span className={s.indexName}>{cw.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  )
}
