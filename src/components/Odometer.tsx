import { useEffect, useRef } from 'react'
import s from './Odometer.module.css'

const DIGITS = '0123456789'

/**
 * Rolls each digit to its new value like a mechanical counter.
 * Non-digits (",", ".", "$", "+", "%", "/") stay put.
 * `play` lets a parent hold the counter at zero until it should roll in.
 */
export function Odometer({ value, play = true, className = '' }: { value: string; play?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const chars = value.split('')

  useEffect(() => {
    const cols = ref.current?.querySelectorAll<HTMLElement>('[data-col]')
    cols?.forEach((c, i) => {
      const d = play ? Number(c.dataset.digit) : 0
      c.style.transitionDelay = `${(cols.length - i) * 55}ms`
      c.style.transform = `translateY(${-d * 1.12}em)`
    })
  }, [value, play])

  return (
    <span ref={ref} className={`${s.odo} ${className}`} aria-label={value} role="text">
      {chars.map((ch, i) =>
        DIGITS.includes(ch) ? (
          <span key={i} className={s.slot} aria-hidden>
            <span className={s.col} data-col data-digit={ch}>
              {DIGITS.split('').map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
            <span className={s.sizer}>{ch}</span>
          </span>
        ) : (
          <span key={i} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  )
}
