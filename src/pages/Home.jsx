import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToSection } from '../scrollToSection.js'
import Hero from './Hero.jsx'
import Search from './Search.jsx'
import Randomizer from './Randomizer.jsx'

// Survives Home unmounting when you open a detail page, so Back can restore
// Search / Randomizer instead of always dumping you on the hero.
let savedHomeScrollTop = 0

function Home() {
  const { state } = useLocation()

  useEffect(() => {
    const container = document.querySelector('.scroll-container')
    if (!container) return

    const onScroll = () => {
      savedHomeScrollTop = container.scrollTop
    }

    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const container = document.querySelector('.scroll-container')
    if (!container) return

    const sectionId = state?.scrollTo
    if (sectionId) {
      const frame = requestAnimationFrame(() => {
        scrollToSection(sectionId)
        requestAnimationFrame(() => {
          savedHomeScrollTop = container.scrollTop
        })
      })
      return () => cancelAnimationFrame(frame)
    }

    container.scrollTop = savedHomeScrollTop
  }, [state])

  return (
    <div className="scroll-container">
      <Hero />
      <Search />
      <Randomizer />
    </div>
  )
}

export default Home
