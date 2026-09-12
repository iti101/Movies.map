import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { NoviApiError } from '../api/novi.js'
import { useModalDismiss } from '../hooks/useModalDismiss.js'
import './LoginModal.css'

function LoginModal({ isOpen, onClose, onCreateAccount }) {
  const titleId = useId()
  const firstFieldRef = useRef(null)
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useModalDismiss(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      firstFieldRef.current?.focus()
      return
    }

    setEmail('')
    setPassword('')
    setShowPassword(false)
    setError('')
    setPending(false)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setPending(true)

    try {
      await login(email.trim(), password)
      onClose()
    } catch (err) {
      setError(err instanceof NoviApiError ? err.message : 'Sign in failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login-modal" role="presentation" onClick={onClose}>
      <div
        className="login-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="login-modal__close"
          onClick={onClose}
          aria-label="Close sign in"
        >
          ×
        </button>

        <h2 id={titleId} className="login-modal__title">
          Sign in
        </h2>

        <form className="login-modal__form" onSubmit={handleSubmit}>
          <label className="login-modal__field">
            <span className="login-modal__label">Email</span>
            <input
              ref={firstFieldRef}
              className="login-modal__input"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <div className="login-modal__field">
            <label className="login-modal__label" htmlFor="login-password">
              Password
            </label>
            <div className="login-modal__password-wrap">
              <input
                id="login-password"
                className="login-modal__input login-modal__password-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="login-modal__password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 5c-5 0-9.27 3.11-11 7.5C2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M2.1 3.51 3.51 2.1l18.38 18.39-1.41 1.41-3.13-3.13A11.7 11.7 0 0 1 12 20c-5 0-9.27-3.11-11-7.5a12.4 12.4 0 0 1 4.6-5.47L2.1 3.51zM12 7c5 0 9.27 3.11 11 7.5a12.5 12.5 0 0 1-3.46 4.4l-2.2-2.2A5 5 0 0 0 9.3 8.66L7.12 6.48A11.7 11.7 0 0 1 12 7zm0 3a3 3 0 0 1 3 3c0 .45-.1.87-.28 1.25l-3.97-3.97c.38-.18.8-.28 1.25-.28z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error ? (
            <p className="login-modal__error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="login-modal__submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-modal__footer">
          Don&apos;t have an account?{' '}
          <button type="button" className="login-modal__create" onClick={onCreateAccount}>
            Create an account
          </button>
        </p>
      </div>
    </div>
  )
}

export default LoginModal
