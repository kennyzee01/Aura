import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { ScrollTrigger, gsap, scrollToY, lockScroll, reducedMotion } from '../lib/motion'
import logo from '../assets/img/logo.webp'
import flag from '../assets/img/flag-us.svg'
import s from './Nav.module.css'

const LINKS = [
  { label: 'Shop', href: '#collection', note: 'The collection' },
  { label: 'Discover', href: '#discover', note: 'Find your mood' },
  { label: 'Our Story', href: '#our-story', note: 'Lasting impressions' },
]

function RollText({ text }: { text: string }) {
  // two stacked copies; hover rolls the top one out and the bottom one in, per letter
  return (
    <span className={s.roll} aria-label={text}>
      {[0, 1].map((row) => (
        <span key={row} className={s.rollRow} aria-hidden>
          {text.split('').map((c, i) => (
            <span key={i} style={{ transitionDelay: `${i * 18}ms` }}>
              {c === ' ' ? ' ' : c}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

/** scroll to a section; a pinned section is measured by its spacer, which stays in flow */
function goTo(href: string) {
  if (href === '#top') return scrollToY(0)
  const el = document.querySelector<HTMLElement>(href)
  if (!el) return
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el
  scrollToY(box.getBoundingClientRect().top + window.scrollY)
}

export function Nav() {
  const ref = useRef<HTMLElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  openRef.current = open

  useEffect(() => {
    // tuck away while reading downward, return the moment you scroll up
    const st = ScrollTrigger.create({
      start: () => window.innerHeight * 0.9,
      end: 'max',
      onUpdate: (self) => {
        if (openRef.current) return
        gsap.to(ref.current, {
          yPercent: self.direction === 1 ? -160 : 0,
          duration: 0.7,
          ease: 'expo.out',
          overwrite: 'auto',
        })
      },
      onLeaveBack: () => gsap.to(ref.current, { yPercent: 0, duration: 0.7, ease: 'expo.out', overwrite: 'auto' }),
    })
    return () => st.kill()
  }, [])

  // the menu sheet: opens as a soft circle from the button, like the preloader's
  // mist clearing in reverse; the lines rise out of their masks one by one
  useEffect(() => {
    const el = sheet.current
    if (!el) return
    const items = el.querySelectorAll('[data-rise]')
    const rule = el.querySelectorAll('[data-rule]')
    const reduced = reducedMotion()
    if (open) {
      lockScroll(true)
      gsap.to(ref.current, { yPercent: 0, duration: 0.5, ease: 'expo.out', overwrite: 'auto' })
      gsap.killTweensOf([el, items, rule])
      gsap.set(el, { visibility: 'visible' })
      if (reduced) {
        gsap.set(el, { '--r': 160, autoAlpha: 1 })
        gsap.set(items, { yPercent: 0, autoAlpha: 1 })
        gsap.set(rule, { scaleX: 1 })
      } else {
        gsap.fromTo(el, { '--r': 0, autoAlpha: 1 }, { '--r': 160, duration: 0.9, ease: 'expo.inOut' })
        gsap.fromTo(items, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.32 })
        gsap.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.inOut', stagger: 0.06, delay: 0.3 })
      }
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    lockScroll(false)
    if (getComputedStyle(el).visibility === 'hidden') return
    gsap.killTweensOf([el, items, rule])
    gsap.to(items, { yPercent: -60, autoAlpha: 0, duration: 0.35, ease: 'power2.in', stagger: 0.025 })
    gsap.to(el, {
      '--r': 0,
      duration: reduced ? 0 : 0.7,
      delay: reduced ? 0 : 0.15,
      ease: 'expo.inOut',
      onComplete: () => gsap.set(el, { visibility: 'hidden' }),
    })
  }, [open])

  // leaving the phone layout (rotate / resize) closes the sheet
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const off = () => !mq.matches && setOpen(false)
    mq.addEventListener('change', off)
    return () => mq.removeEventListener('change', off)
  }, [])

  const follow = (href: string) => (e: MouseEvent) => {
    e.preventDefault()
    if (openRef.current) {
      setOpen(false)
      // let the sheet start lifting before the page moves beneath it
      gsap.delayedCall(0.35, () => goTo(href))
    } else goTo(href)
  }

  const openSearch = () => {
    setOpen(true)
    gsap.delayedCall(0.6, () => searchRef.current?.focus({ preventScroll: true }))
  }

  return (
    <>
      <header ref={ref} className={`${s.nav} ${open ? s.isOpen : ''}`} data-nav>
        <div className={s.left}>
          <a href="#top" className={s.logo} aria-label="AURA home" data-cursor="link" onClick={follow('#top')}>
            <img src={logo} alt="AURA" width={91} height={57} />
          </a>
          <nav className={s.links} aria-label="Primary">
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className={s.link} data-cursor="link" onClick={follow(l.href)}>
                <RollText text={l.label} />
              </a>
            ))}
          </nav>
        </div>
        <div className={s.right}>
          <button className={s.lang} data-cursor="link" aria-label="Language: English">
            <img src={flag} alt="" width={24} height={24} />
            <span>EN</span>
          </button>
          <label className={s.search} data-cursor="link">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M16.5 11a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z" stroke="currentColor" />
              <path d="m15 15 4 4" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <input type="search" placeholder="Search" aria-label="Search fragrances" />
          </label>
          <button className={s.searchBtn} aria-label="Search fragrances" onClick={openSearch}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M16.5 11a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z" stroke="currentColor" />
              <path d="m15 15 4 4" stroke="currentColor" strokeLinecap="round" />
            </svg>
          </button>
          <button className={s.cart} aria-label="Cart" data-cursor="link">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
              <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" transform="translate(4.7 5.3)">
                <circle cx="9.17" cy="20.5" r="2" />
                <circle cx="18.5" cy="20.5" r="2" />
                <path d="M.5.5h2.67l4.67 14.67H18.5" />
                <path d="M6.8 11.83 4.23 3.83h16.68a.67.67 0 0 1 .63.88l-2.22 6.67a.67.67 0 0 1-.63.45H6.8Z" />
              </g>
            </svg>
            <span className={s.badge}>0</span>
          </button>
          <button
            className={s.menuBtn}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="aura-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div ref={sheet} id="aura-menu" data-lenis-prevent className={s.sheet} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open}>
        <nav className={s.sheetLinks} aria-label="Menu">
          {LINKS.map((l, i) => (
            <a key={l.label} href={l.href} className={s.sheetLink} onClick={follow(l.href)} tabIndex={open ? 0 : -1}>
              <span className={s.mask}>
                <span data-rise className={s.sheetNum}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </span>
              <span className={s.mask}>
                <span data-rise className={`${s.sheetLabel} serif`}>
                  {l.label}
                </span>
              </span>
              <span className={s.mask}>
                <span data-rise className={s.sheetNote}>
                  {l.note}
                </span>
              </span>
              <i data-rule className={s.sheetRule} aria-hidden />
            </a>
          ))}
        </nav>
        <div className={s.sheetFoot}>
          <span className={s.mask}>
            <label data-rise className={s.sheetSearch}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M16.5 11a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z" stroke="currentColor" />
                <path d="m15 15 4 4" stroke="currentColor" strokeLinecap="round" />
              </svg>
              <input ref={searchRef} type="search" placeholder="Search fragrances" aria-label="Search fragrances" tabIndex={open ? 0 : -1} />
            </label>
          </span>
          <span className={s.mask}>
            <button data-rise className={s.sheetLang} aria-label="Language: English" tabIndex={open ? 0 : -1}>
              <img src={flag} alt="" width={20} height={20} />
              <span>EN</span>
            </button>
          </span>
        </div>
      </div>
    </>
  )
}
