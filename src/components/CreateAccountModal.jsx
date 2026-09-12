import { useEffect, useId, useRef, useState } from 'react'
import { NoviApiError } from '../api/novi.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useModalDismiss } from '../hooks/useModalDismiss.js'
import './LoginModal.css'
import './CreateAccountModal.css'

function PasswordField({
  id,
  label,
  name,
  placeholder,
  autoComplete,
  value,
  onChange,
  required = true,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="login-modal__field">
      <label className="login-modal__label" htmlFor={id}>
        {label}
      </label>
      <div className="create-account__password-wrap">
        <input
          id={id}
          className="login-modal__input create-account__password-input"
          type={visible ? 'text' : 'password'}
          name={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required={required}
        />
        <button
          type="button"
          className="create-account__toggle"
          onClick={() => setVisible((open) => !open)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
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
  )
}

function CreateAccountModal({ isOpen, onClose, onSignIn, onBackHome }) {
  const titleId = useId()
  const usernameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const confirmId = useId()
  const firstFieldRef = useRef(null)
  const { register } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useModalDismiss(isOpen, onClose)

  useEffect(() => {
    if (isOpen) {
      firstFieldRef.current?.focus()
      return
    }

    setUsername('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setPending(false)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()

    const hasMinLength = password.length >= 8
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[^A-Za-z0-9]/.test(password)

    if (!hasMinLength || !hasNumber || !hasSpecial) {
      setError('Password must be at least 8 characters and include a number and special character.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setPending(true)

    try {
      await register(username.trim(), email.trim(), password)
      onClose()
    } catch (err) {
      setError(
        err instanceof NoviApiError ? err.message : 'Could not create account. Please try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login-modal" role="presentation" onClick={onClose}>
      <div
        className="login-modal__dialog create-account__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="login-modal__close"
          onClick={onClose}
          aria-label="Close create account"
        >
          ×
        </button>

        <div className="create-account__header">
          <h2 id={titleId} className="login-modal__title create-account__title">
            Create account
          </h2>
          <p className="create-account__subtitle">
            Register with your email to save watchlists and write reviews.
          </p>
        </div>

        <form className="login-modal__form" onSubmit={handleSubmit}>
          <label className="login-modal__field" htmlFor={usernameId}>
            <span className="login-modal__label">Username</span>
            <input
              ref={firstFieldRef}
              id={usernameId}
              className="login-modal__input"
              type="text"
              name="username"
              placeholder="Choose a username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="login-modal__field" htmlFor={emailId}>
            <span className="login-modal__label">Email</span>
            <input
              id={emailId}
              className="login-modal__input"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <div className="create-account__password-block">
            <PasswordField
              id={passwordId}
              label="Password"
              name="password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <ul className="create-account__rules">
              <li>At least 8 characters</li>
              <li>At least 1 number</li>
              <li>At least 1 special character</li>
            </ul>
          </div>

          <PasswordField
            id={confirmId}
            label="Confirm password"
            name="confirmPassword"
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {error ? <p className="create-account__error">{error}</p> : null}

          <button type="submit" className="login-modal__submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="create-account__footer">
          <p className="login-modal__footer create-account__footer-text">
            Already have an account?{' '}
            <button type="button" className="login-modal__create" onClick={onSignIn}>
              Sign in
            </button>
          </p>
          <button type="button" className="create-account__home" onClick={onBackHome}>
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateAccountModal
