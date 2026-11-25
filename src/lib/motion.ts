import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin)

/** One easing vocabulary across the site. */
export const EASE = {
  out: 'expo.out', // entrances
  io: 'power3.inOut', // scrubbed travel
  tactile: 'back.out(1.4)', // paper, tags, things you could touch
}

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

let lenis: Lenis | null = null

export function initSmoothScroll() {
  if (lenis || reducedMotion()) return lenis
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, syncTouch: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis?.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export const getLenis = () => lenis

export function scrollToY(y: number, duration = 1.6) {
  if (lenis) lenis.scrollTo(y, { duration, easing: (t) => 1 - Math.pow(1 - t, 4) })
  else window.scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' })
}

export function lockScroll(lock: boolean) {
  if (lenis) (lock ? lenis.stop() : lenis.start())
  document.documentElement.style.overflow = lock ? 'hidden' : ''
}

/** Normalised pointer position (-1…1), shared by every mouse-reactive layer. */
export const pointer = { x: 0, y: 0, cx: 0, cy: 0 }
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.cx = e.clientX
      pointer.cy = e.clientY
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    },
    { passive: true },
  )
}

export { gsap, ScrollTrigger, SplitText, Draggable }

// dev-only handle for inspecting timelines from the console
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__aura = { gsap, ScrollTrigger, lenis: getLenis }
}
