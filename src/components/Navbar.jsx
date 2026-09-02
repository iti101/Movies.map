import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import loginIcon from '../assets/ICON-login-user-account.svg'
import './Navbar.css'

const MENU_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Search', to: '/search' },
  { label: 'Log-in', to: '/login' },
]

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      <header className="navbar">
        <button
          type="button"
          className={`navbar__hamburger ${isOpen ? 'navbar__hamburger--open' : ''}`}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="navbar__hamburger-bar" />
          <span className="navbar__hamburger-bar" />
          <span className="navbar__hamburger-bar" />
        </button>

        <Link
          to="/login"
          className="navbar__login"
          aria-label="Log in"
          onClick={() => setIsOpen(false)}
        >
          <img src={loginIcon} alt="" className="navbar__login-icon" />
        </Link>
      </header>

      <div
        className={`navbar__overlay ${isOpen ? 'navbar__overlay--open' : ''}`}
        aria-hidden={!isOpen}
      >
        <nav aria-label="Main navigation">
          <ul className="navbar__menu-list">
            {MENU_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `navbar__menu-link${isActive ? ' navbar__menu-link--active' : ''}`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}

export default Navbar
