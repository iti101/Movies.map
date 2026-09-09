import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollToSection } from '../scrollToSection.js'
import Hero from './Hero.jsx'
import Search from './Search.jsx'
import Contact from './Contact.jsx'

function Home() {
  const { state } = useLocation()

  useEffect(() => {
    const sectionId = state?.scrollTo
    if (!sectionId) return

    const frame = requestAnimationFrame(() => scrollToSection(sectionId))
    return () => cancelAnimationFrame(frame)
  }, [state])

  return (
    <div className="scroll-container">
      <Hero />
      <Search />
      <Contact />
    </div>
  )
}

export default Home
