import { useEffect } from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { WatchlistProvider } from './context/WatchlistContext.jsx'
import DetailPage from './pages/DetailPage.jsx'
import PersonCredits from './pages/PersonCredits.jsx'
import SearchResults from './pages/SearchResults.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Watchlist from './pages/Watchlist.jsx'

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

function PrivateRoute({ children }) {
  const { isAuth, isReady, openLogin } = useAuth()

  useEffect(() => {
    if (isReady && !isAuth) openLogin()
  }, [isReady, isAuth, openLogin])

  if (!isReady) return null
  if (!isAuth) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
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
          <Route
            path="/watchlist"
            element={
              <PrivateRoute>
                <Watchlist />
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <WatchlistProvider>
        <AppRoutes />
      </WatchlistProvider>
    </AuthProvider>
  )
}

export default App
