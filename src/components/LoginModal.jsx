import { useEffect, useId, useRef } from 'react'
import { useModalDismiss } from '../hooks/useModalDismiss.js'
import './LoginModal.css'

function LoginModal({ isOpen, onClose, onCreateAccount }) {
  const titleId = useId()
  const firstFieldRef = useRef(null)

  useModalDismiss(isOpen, onClose)

  useEffect(() => {
    if (isOpen) firstFieldRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (event) => {
    event.preventDefault()
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
            <span className="login-modal__label">Username or email</span>
            <input
              ref={firstFieldRef}
              className="login-modal__input"
              type="text"
              name="identifier"
              autoComplete="username"
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
              required
            />
          </label>

          <a
            className="login-modal__forgot"
            href="#"
            onClick={(event) => event.preventDefault()}
          >
            Forgot your password?
          </a>

          <button type="submit" className="login-modal__submit">
            Sign in
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
