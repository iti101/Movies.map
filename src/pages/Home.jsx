import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToSection } from '../scrollToSection.js'
import Hero from './Hero.jsx'
import Search from './Search.jsx'
import Randomizer from './Randomizer.jsx'

function Home() {
  const { state } = useLocation()

  useEffect(() => {
    const sectionId = state?.scrollTo
    const container = document.querySelector('.scroll-container')

    if (!sectionId) {
      if (container) container.scrollTop = 0
      return
    }

    // Wait a frame so the snap sections are laid out before scrolling.
    const frame = requestAnimationFrame(() => scrollToSection(sectionId))
    return () => cancelAnimationFrame(frame)
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
