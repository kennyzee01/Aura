import { useEffect, useRef, useState } from 'react'
import { gsap, finePointer, reducedMotion } from '../lib/motion'
import s from './Cursor.module.css'

const LABELS: Record<string, string> = {
  view: 'View',
  shop: '',
  drag: 'Drag',
  open: 'Open',
}

/**
 * A small ring that becomes a labelled lens over images and collapses into a
 * dot over buttons (the button itself is the feedback there).
 * Driven by [data-cursor] on any element.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const [enabled] = useState(() => finePointer() && !reducedMotion())
  const [mode, setMode] = useState<string>('')

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-cursor')
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.5, ease: 'power3' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.5, ease: 'power3' })
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3' })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3' })
    let shown = false
    const move = (e: PointerEvent) => {
      if (!shown) {
        shown = true
        gsap.to([ring.current, dot.current], { autoAlpha: 1, duration: 0.3 })
      }
      rx(e.clientX)
      ry(e.clientY)
      dx(e.clientX)
      dy(e.clientY)
      const t = (e.target as HTMLElement)?.closest?.('[data-cursor]') as HTMLElement | null
      setMode(t?.dataset.cursor ?? '')
    }
    const leave = () => {
      shown = false
      gsap.to([ring.current, dot.current], { autoAlpha: 0, duration: 0.3 })
    }
    const down = () => gsap.to(ring.current, { scale: 0.82, duration: 0.2 })
    const up = () => gsap.to(ring.current, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' })
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div ref={ring} className={s.ring} data-mode={mode} aria-hidden>
        <span className={s.label}>{LABELS[mode] ?? ''}</span>
      </div>
      <div ref={dot} className={s.dot} data-mode={mode} aria-hidden />
    </>
  )
}
