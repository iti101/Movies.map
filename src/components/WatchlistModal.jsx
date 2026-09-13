import { useEffect, useId, useRef, useState } from 'react'
import { useWatchlist } from '../context/WatchlistContext.jsx'
import { useModalDismiss } from '../hooks/useModalDismiss.js'
import './LoginModal.css'
import './WatchlistModal.css'

function WatchlistModal({ isOpen, onClose, item = null, onAdded }) {
  const titleId = useId()
  const firstFieldRef = useRef(null)
  const { lists, createList, addItem, isInList } = useWatchlist()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(!item || lists.length === 0)

  useModalDismiss(isOpen, onClose)

  useEffect(() => {
    if (!isOpen) return

    setName('')
    setError('')
    setCreating(!item || lists.length === 0)
  }, [isOpen, item, lists.length])

  useEffect(() => {
    if (isOpen && creating) firstFieldRef.current?.focus()
  }, [isOpen, creating])

  if (!isOpen) return null

  const title = creating ? 'Create a new list' : 'Add to a list'

  function finishAdd(list) {
    if (item) {
      addItem(list.id, item)
      onAdded?.(list.name)
    }
    onClose()
  }

  function handleCreate(event) {
    event.preventDefault()
    const list = createList(name, item)
    if (!list) {
      setError('Please enter a list name.')
      return
    }
    if (item) onAdded?.(list.name)
    onClose()
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
          aria-label="Close"
        >
          ×
        </button>

        <h2 id={titleId} className="login-modal__title">
          {title}
        </h2>

        {item && !creating && (
          <p className="watchlist-modal__subtitle">Choose a list for {item.title}.</p>
        )}

        {creating ? (
          <form className="login-modal__form" onSubmit={handleCreate}>
            <label className="login-modal__field">
              <span className="login-modal__label">List name</span>
              <input
                ref={firstFieldRef}
                className="login-modal__input"
                type="text"
                name="listName"
                placeholder="e.g. Rainy Sunday, Date night"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setError('')
                }}
                maxLength={60}
                required
              />
            </label>

            {error && (
              <p className="watchlist-modal__error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-modal__submit">
              {item ? 'Create list & add' : 'Create list'}
            </button>

            {item && lists.length > 0 && (
              <button
                type="button"
                className="watchlist-modal__secondary"
                onClick={() => {
                  setCreating(false)
                  setError('')
                }}
              >
                Back to lists
              </button>
            )}
          </form>
        ) : (
          <>
            <ul className="watchlist-modal__choices">
              {lists.map((list) => {
                const alreadyIn = isInList(list.id, item)
                const count = list.items.length

                return (
                  <li key={list.id}>
                    <button
                      type="button"
                      className="watchlist-modal__choice"
                      disabled={alreadyIn}
                      onClick={() => finishAdd(list)}
                    >
                      <span className="watchlist-modal__choice-name">{list.name}</span>
                      <span className="watchlist-modal__choice-meta">
                        {alreadyIn
                          ? 'Already added'
                          : `${count} ${count === 1 ? 'title' : 'titles'}`}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              className="watchlist-modal__secondary"
              onClick={() => setCreating(true)}
            >
              Create new list
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default WatchlistModal
