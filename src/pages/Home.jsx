import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from './Hero.jsx'
import Search from './Search.jsx'
import Contact from './Contact.jsx'

function Home() {
  const location = useLocation()

  useEffect(() => {
    const sectionId = location.state?.scrollTo
    if (!sectionId) return

    const frame = requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    })

    return () => cancelAnimationFrame(frame)
  }, [location.state])

  return (
    <div className="scroll-container">
      <Hero />
      <Search />
      <Contact />
    </div>
  )
}

export default Home
