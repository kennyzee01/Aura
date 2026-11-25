
// The preloader owns the moment the curtain lifts; the hero owns what is
// revealed underneath. This tiny bridge lets the hero's entrance start at an
// exact point inside the curtain timeline.
type IntroBuilder = (curtain: gsap.core.Timeline) => void
let builder: IntroBuilder | null = null
let pending: gsap.core.Timeline | null = null

export function registerIntro(fn: IntroBuilder) {
  builder = fn
  if (pending) {
    fn(pending)
    pending = null
  }
  return () => {
    if (builder === fn) builder = null
  }
}

export function playIntro(curtain: gsap.core.Timeline) {
  if (builder) builder(curtain)
  else pending = curtain
}
