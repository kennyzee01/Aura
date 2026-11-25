import { useEffect } from 'react'
import { initSmoothScroll, ScrollTrigger } from './lib/motion'
import { playIntro } from './lib/intro'
import { Preloader } from './components/Preloader'
import { Cursor } from './components/Cursor'
import { Nav } from './components/Nav'
import { Hero } from './sections/Hero'
import { Collection } from './sections/Collection'
import { Stats } from './sections/Stats'
import { Moods } from './sections/Moods'
import { ScentNotes } from './sections/ScentNotes'
import { Quote } from './sections/Quote'
import { BottleStory } from './sections/BottleStory'
import { Footer } from './sections/Footer'
import sky from './assets/img/hero-sky.webp'
import model from './assets/img/hero-model.webp'
import cardDilla from './assets/img/card-dilla.webp'
import cardEmerald from './assets/img/card-emerald.webp'
import heroBottle from './assets/img/hero-bottle-dilla.webp'

// everything the hero shows in its first frame: the preloader reaches 100% only once these are decoded
const CRITICAL = [sky, model, heroBottle, cardDilla, cardEmerald]

export default function App() {
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    initSmoothScroll()
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return (
    <>
      <Preloader images={CRITICAL} onReveal={playIntro} />
      <Cursor />
      <Nav />
      <main>
        <Hero />
        <Collection />
        <Stats />
        <Moods />
        <ScentNotes />
        <Quote />
        <BottleStory />
      </main>
      <Footer />
    </>
  )
}
