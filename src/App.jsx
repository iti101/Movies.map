import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import DetailPage from './pages/DetailPage.jsx'
import PersonCredits from './pages/PersonCredits.jsx'
import SearchResults from './pages/SearchResults.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Randomizer from './pages/Randomizer.jsx'

// Detail pages scroll the window; Home uses a fixed 100vh snap container.
// Without resetting window scroll on navigation, the viewport can sit below
// that container and look like a blank/unrendered page until a full refresh.
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<DetailPage mediaType="movie" />} />
          <Route path="/tv/:id" element={<DetailPage mediaType="tv" />} />
          <Route path="/person/:id" element={<DetailPage mediaType="person" />} />
          <Route path="/person/:id/movies" element={<PersonCredits />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/randomizer" element={<Randomizer />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </>
  )
}

export default App
