import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import DetailPage from './pages/DetailPage.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Randomizer from './pages/Randomizer.jsx'

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<DetailPage />} />
          <Route path="/tv/:id" element={<DetailPage />} />
          <Route path="/randomizer" element={<Randomizer />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </>
  )
}

export default App
