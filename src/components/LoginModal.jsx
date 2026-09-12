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

          <label className="login-modal__field">
            <span className="login-modal__label">Password</span>
            <input
              className="login-modal__input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

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
