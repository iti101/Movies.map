import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { discoverByGenre, getImageUrl, getSearchGenres, searchTmdb } from '../api/tmdb.js'
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

const DETAIL_PATHS = {
  movie: '/movie',
  tv: '/tv',
}

function SearchResult({ item }) {
  const imageUrl = getImageUrl(item.imagePath)
  const path = DETAIL_PATHS[item.mediaType]
  const href = path ? `${path}/${item.id}` : null
  const Wrapper = href ? Link : 'div'

  return (
    <li>
      <Wrapper
        className={`search__result-body${href ? ' search__result-body--link' : ''}`}
        {...(href ? { to: href } : {})}
      >
        {imageUrl ? (
          <img className="search__thumb" src={imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="search__thumb search__thumb--placeholder" aria-hidden="true">
            No image
          </div>
        )}
        <div className="search__meta">
          <p className="search__result-title">{item.title}</p>
          <p className="search__result-details">
            {TYPE_LABELS[item.mediaType] || item.mediaType}
            {item.date ? ` · ${item.date}` : ''}
          </p>
        </div>
      </Wrapper>
    </li>
  )
}

function Search() {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState('')
  const [type, setType] = useState('all')
  const [releaseDateOn, setReleaseDateOn] = useState(false)
  const [genreOn, setGenreOn] = useState(false)
  const [genres, setGenres] = useState([])
  const [genresStatus, setGenresStatus] = useState('idle')
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const yearDisabled = type === 'person'
  const genreDisabled = type === 'person'
  const yearFilter = releaseDateOn ? year : ''
  const hasQuery = query.trim().length > 0
  const hasLookup = hasQuery || Boolean(selectedGenre)

  useEffect(() => {
    if (!genreOn || genreDisabled) {
      setGenres([])
      setGenresStatus('idle')
      return
    }

    let cancelled = false
    setGenresStatus('loading')

    getSearchGenres(type)
      .then((list) => {
        if (cancelled) return
        setGenres(list)
        setGenresStatus('success')
      })
      .catch(() => {
        if (cancelled) return
        setGenres([])
        setGenresStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [genreOn, genreDisabled, type])

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed && !selectedGenre) {
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
        const data = trimmed
          ? await searchTmdb({
              query: trimmed,
              type,
              year: yearFilter,
              genre: selectedGenre,
            })
          : await discoverByGenre({
              genre: selectedGenre,
              type,
              year: yearFilter,
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
  }, [query, type, yearFilter, selectedGenre])

  const selectType = (nextType) => {
    setType(nextType)
    setSelectedGenre(null)
    if (nextType === 'person') {
      setReleaseDateOn(false)
      setYear('')
      setGenreOn(false)
    }
  }

  const toggleReleaseDate = () => {
    setReleaseDateOn((on) => {
      if (on) setYear('')
      return !on
    })
  }

  const toggleGenre = () => {
    setGenreOn((on) => {
      if (on) setSelectedGenre(null)
      return !on
    })
  }

  const selectGenre = (genre) => {
    setSelectedGenre((current) => (current?.key === genre.key ? null : genre))
  }

  return (
    <section
      id="search"
      className={`snap-section search${hasLookup || genreOn ? ' search--has-results' : ''}`}
      aria-label="Search"
    >
      <div className="search__panel">
        <h2 className="section-title search__title">Search</h2>

        <form
          className="search__form"
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <div className="search__bar">
            <input
              className="search__input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Movies, shows, people..."
              aria-label="Search query"
              autoComplete="off"
            />
            <button type="submit" className="search__submit" aria-label="Search">
              <svg
                className="search__submit-icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M16.2 16.2L20 20"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="search__chips" role="group" aria-label="Search filters">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`search__chip${type === option.id ? ' search__chip--active' : ''}`}
                aria-pressed={type === option.id}
                onClick={() => selectType(option.id)}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className={`search__chip${releaseDateOn ? ' search__chip--active' : ''}`}
              aria-pressed={releaseDateOn}
              disabled={yearDisabled}
              title={
                yearDisabled
                  ? 'Release date does not apply to people'
                  : 'Filter by release year'
              }
              onClick={toggleReleaseDate}
            >
              Release date
            </button>
            <button
              type="button"
              className={`search__chip${genreOn ? ' search__chip--active' : ''}`}
              aria-pressed={genreOn}
              disabled={genreDisabled}
              title={
                genreDisabled ? 'Genre does not apply to people' : 'Browse by genre'
              }
              onClick={toggleGenre}
            >
              Genre
            </button>
          </div>

          {releaseDateOn && (
            <input
              className="search__year"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={year}
              onChange={(event) =>
                setYear(event.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="YYYY"
              aria-label="Release year"
              autoFocus
            />
          )}

          {genreOn && (
            <div className="search__genres" role="group" aria-label="Genres">
              {genresStatus === 'loading' && (
                <p className="search__status">Loading genres…</p>
              )}
              {genresStatus === 'error' && (
                <p className="search__status search__status--error" role="alert">
                  Could not load genres.
                </p>
              )}
              {genres.map((genre) => (
                <button
                  key={genre.key}
                  type="button"
                  className={`search__genre${
                    selectedGenre?.key === genre.key ? ' search__genre--active' : ''
                  }`}
                  aria-pressed={selectedGenre?.key === genre.key}
                  onClick={() => selectGenre(genre)}
                >
                  {genre.tag}
                </button>
              ))}
            </div>
          )}
        </form>

        {status === 'loading' && (
          <p className="search__status">{hasQuery ? 'Searching…' : 'Loading…'}</p>
        )}
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
            {results.map((item) => (
              <SearchResult key={`${item.mediaType}-${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default Search
