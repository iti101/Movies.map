import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import loginIcon from '../assets/ICON-login-user-account.svg'
import { useAuth } from '../context/AuthContext.jsx'
import useTheme from '../hooks/useTheme.js'
import { scrollToSection } from '../scrollToSection.js'
import CreateAccountModal from './CreateAccountModal.jsx'
import LoginModal from './LoginModal.jsx'
import './Navbar.css'

const BASE_MENU_ITEMS = [
  { label: 'Home', sectionId: 'hero' },
  { label: 'Search', sectionId: 'search' },
  { label: 'Watchlist', to: '/watchlist' },
  { label: 'Randomizer', sectionId: 'randomizer' },
]

const menuLinkClass = ({ isActive }) =>
  `navbar__menu-link${isActive ? ' navbar__menu-link--active' : ''}`

function SunIcon() {
  return (
    <svg className="navbar__theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.05 5.05l1.55 1.55M17.4 17.4l1.55 1.55M18.95 5.05l-1.55 1.55M6.6 17.4l-1.55 1.55"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="navbar__theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 13.2A7.5 7.5 0 1 1 10.8 4.5 6 6 0 0 0 19.5 13.2Z"
      />
    </svg>
  )
}

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const {
    isAuth,
    user,
    authView,
    openLogin,
    openRegister,
    closeAuth,
    logout,
  } = useAuth()

  const closeMenu = () => setIsOpen(false)

  const handleOpenLogin = () => {
    closeMenu()
    openLogin()
  }

  const handleLogout = () => {
    closeMenu()
    logout()
  }

  const menuItems = [
    ...BASE_MENU_ITEMS,
    isAuth
      ? { label: 'Log out', action: 'logout' }
      : { label: 'Log-in', action: 'login' },
  ]

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

  const goHomeFromAuth = () => {
    closeAuth()
    if (pathname !== '/') {
      navigate('/')
    }
  }

  const displayName = user?.username || user?.email || 'Account'

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

        <div className="navbar__actions">
          <div className="navbar__theme" role="group" aria-label="Color theme">
            <button
              type="button"
              className={`navbar__theme-btn${theme === 'light' ? ' navbar__theme-btn--active' : ''}`}
              aria-label="Light mode"
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
            >
              <SunIcon />
            </button>
            <button
              type="button"
              className={`navbar__theme-btn${theme === 'dark' ? ' navbar__theme-btn--active' : ''}`}
              aria-label="Dark mode"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
            >
              <MoonIcon />
            </button>
          </div>

          {isAuth ? (
            <div className="navbar__account">
              <span className="navbar__user" title={user?.email || displayName}>
                {displayName}
              </span>
              <button
                type="button"
                className="navbar__logout"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="navbar__login"
              aria-label="Log in"
              onClick={handleOpenLogin}
            >
              <img src={loginIcon} alt="" className="navbar__login-icon" />
            </button>
          )}
        </div>
      </header>

      <div
        className={`navbar__overlay${isOpen ? ' navbar__overlay--open' : ''}`}
        aria-hidden={!isOpen}
      >
        <nav aria-label="Main navigation">
          <ul className="navbar__menu-list">
            {menuItems.map((item) => (
              <li key={item.label}>
                {item.to ? (
                  <NavLink to={item.to} className={menuLinkClass} onClick={closeMenu}>
                    {item.label}
                  </NavLink>
                ) : item.action === 'login' ? (
                  <button type="button" className="navbar__menu-link" onClick={handleOpenLogin}>
                    {item.label}
                  </button>
                ) : item.action === 'logout' ? (
                  <button type="button" className="navbar__menu-link" onClick={handleLogout}>
                    {item.label}
                  </button>
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

      <LoginModal
        isOpen={authView === 'login'}
        onClose={closeAuth}
        onCreateAccount={openRegister}
      />
      <CreateAccountModal
        isOpen={authView === 'register'}
        onClose={closeAuth}
        onSignIn={openLogin}
        onBackHome={goHomeFromAuth}
      />
    </>
  )
}

export default Navbar
