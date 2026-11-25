import { useEffect, useRef, type ReactNode } from 'react'
import { gsap, finePointer, reducedMotion } from '../lib/motion'
import noise from '../assets/img/btn-noise.webp'
import s from './GlowButton.module.css'

type Props = {
  children: ReactNode
  href?: string
  onClick?: () => void
  className?: string
  size?: 'md' | 'lg'
  cursor?: string
}

/**
 * The Figma CTA (gradient + grain + inner light + blue bloom), made physical:
 * the button leans toward the cursor (magnetic), its label leans further, and
 * a light spot follows the pointer across the glass.
 */
export function GlowButton({ children, href = '#', onClick, className = '', size = 'md', cursor = 'shop' }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !finePointer() || reducedMotion()) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' })
    const lxTo = gsap.quickTo(label.current, 'x', { duration: 0.6, ease: 'power3' })
    const lyTo = gsap.quickTo(label.current, 'y', { duration: 0.6, ease: 'power3' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      xTo(dx * 0.28)
      yTo(dy * 0.4)
      lxTo(dx * 0.14)
      lyTo(dy * 0.2)
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    const leave = () => {
      xTo(0)
      yTo(0)
      lxTo(0)
      lyTo(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <a
      ref={ref}
      href={href}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
      className={`${s.btn} ${size === 'lg' ? s.lg : ''} ${className}`}
      data-cursor={cursor}
      data-magnetic
    >
      <span className={s.fill} aria-hidden />
      <span className={s.grain} style={{ backgroundImage: `url(${noise})` }} aria-hidden />
      <span className={s.spot} aria-hidden />
      <span ref={label} className={s.label}>
        {children}
      </span>
      <span className={s.inner} aria-hidden />
    </a>
  )
}
