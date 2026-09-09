import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import loginIcon from '../assets/ICON-login-user-account.svg'
import { scrollToSection } from '../scrollToSection.js'
import './Navbar.css'

const MENU_ITEMS = [
  { label: 'Home', sectionId: 'hero' },
  { label: 'Search', sectionId: 'search' },
  { label: 'Randomizer', to: '/randomizer' },
  { label: 'Log-in', to: '/login' },
]

const menuLinkClass = ({ isActive }) =>
  `navbar__menu-link${isActive ? ' navbar__menu-link--active' : ''}`

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const goToSection = (sectionId) => {
    closeMenu()

    if (pathname === '/') {
      scrollToSection(sectionId)
      return
    }

    navigate('/', { state: { scrollTo: sectionId } })
  }

  return (
    <>
      <header className="navbar">
        <button
          type="button"
          className={`navbar__hamburger${isOpen ? ' navbar__hamburger--open' : ''}`}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="navbar__hamburger-bar" />
          <span className="navbar__hamburger-bar" />
          <span className="navbar__hamburger-bar" />
        </button>

        <NavLink to="/login" className="navbar__login" aria-label="Log in" onClick={closeMenu}>
          <img src={loginIcon} alt="" className="navbar__login-icon" />
        </NavLink>
      </header>

      <div
        className={`navbar__overlay${isOpen ? ' navbar__overlay--open' : ''}`}
        aria-hidden={!isOpen}
      >
        <nav aria-label="Main navigation">
          <ul className="navbar__menu-list">
            {MENU_ITEMS.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <NavLink to={item.to} className={menuLinkClass} onClick={closeMenu}>
                    {item.label}
                  </NavLink>
                ) : (
                  <button
                    type="button"
                    className="navbar__menu-link"
                    onClick={() => goToSection(item.sectionId)}
                  >
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}

export default Navbar
