import { useLayoutEffect, type RefObject, type DependencyList } from 'react'
import { gsap } from './motion'

/**
 * Scoped GSAP context bound to a component root. Everything created inside
 * (tweens, ScrollTriggers, SplitTexts, matchMedia) is reverted on unmount.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  fn: (ctx: gsap.Context) => void | (() => void),
  deps: DependencyList = [],
) {
  useLayoutEffect(() => {
    if (!scope.current) return
    const ctx = gsap.context((self) => fn(self), scope.current)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
