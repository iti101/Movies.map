import { useEffect, useState } from 'react'
import { getImageUrl, searchTmdb } from '../api/tmdb.js'
import './Search.css'

const TYPE_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV' },
  { id: 'person', label: 'People' },
]

const TYPE_LABELS = {
  movie: 'Movie',
  tv: 'TV',
  person: 'Person',
}

function formatDate(date) {
  if (!date) return null
  return date
}

function Search() {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')
  const [type, setType] = useState('all')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const yearDisabled = type === 'person'
  const hasQuery = query.trim().length > 0
  const showResultsLayout = hasQuery && (status === 'loading' || status === 'success' || status === 'error')

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      setResults([])
      setStatus('idle')
      setErrorMessage('')
      return
    }

    let cancelled = false

    setStatus('loading')
    setErrorMessage('')

    const timer = setTimeout(async () => {
      try {
        const data = await searchTmdb({
          query: trimmed,
          type,
          year: yearDisabled ? '' : year,
        })

        if (cancelled) return

        setResults(data)
        setStatus('success')
      } catch (error) {
        if (cancelled) return

        setResults([])
        setStatus('error')
        setErrorMessage(error.message || 'Something went wrong.')
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, type, year, yearDisabled])

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <section
      id="search"
      className={`snap-section search${showResultsLayout ? ' search--has-results' : ''}`}
      aria-label="Search"
    >
      <div className="search__panel">
        <h2 className="section-title search__title">Search</h2>

        <form className="search__form" onSubmit={handleSubmit} role="search">
          <div className="search__bar-row">
            <input
              className="search__input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search movies, TV shows, people…"
              aria-label="Search query"
              autoComplete="off"
            />
            <input
              className="search__year"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={year}
              onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Year"
              aria-label="Release year filter"
              disabled={yearDisabled}
              title={yearDisabled ? 'Year filter does not apply to people' : 'Optional release year'}
            />
          </div>

          <div className="search__chips" role="group" aria-label="Search type">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`search__chip${type === option.id ? ' search__chip--active' : ''}`}
                aria-pressed={type === option.id}
                onClick={() => setType(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </form>

        {status === 'loading' && <p className="search__status">Searching…</p>}
        {status === 'error' && (
          <p className="search__status search__status--error" role="alert">
            {errorMessage}
          </p>
        )}
        {status === 'success' && results.length === 0 && (
          <p className="search__status">No results found.</p>
        )}

        {status === 'success' && results.length > 0 && (
          <ul className="search__results">
            {results.map((item) => {
              const imageUrl = getImageUrl(item.imagePath)
              const dateLabel = formatDate(item.date)

              return (
                <li key={`${item.mediaType}-${item.id}`} className="search__result">
                  {imageUrl ? (
                    <img
                      className="search__thumb"
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="search__thumb search__thumb--placeholder" aria-hidden="true">
                      No image
                    </div>
                  )}
                  <div className="search__meta">
                    <p className="search__result-title">{item.title}</p>
                    <p className="search__result-details">
                      {TYPE_LABELS[item.mediaType] || item.mediaType}
                      {dateLabel ? ` · ${dateLabel}` : ''}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default Search
