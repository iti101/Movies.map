import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { discoverByGenre, searchTmdb } from '../api/tmdb.js'
import MovieCard from '../components/MovieCard.jsx'
import {
  criteriaKey,
  getSearchResultsPage,
  hasSearchCriteria,
  parseSearchParams,
  searchResultsLabel,
  setSearchResultsPage,
} from '../utils/searchSession.js'
import './DetailPage.css'

async function fetchSearchResults(criteria) {
  const trimmed = criteria.query?.trim() || ''
  if (trimmed) {
    return searchTmdb({
      query: trimmed,
      type: criteria.type,
      year: criteria.year,
      genre: criteria.genre,
    })
  }
  if (criteria.genre) {
    return discoverByGenre({
      genre: criteria.genre,
      type: criteria.type,
      year: criteria.year,
    })
  }
  return []
}

function resolveInitial(state, search) {
  const cached = getSearchResultsPage()
  const fromParams = parseSearchParams(search)
  const criteria = state?.criteria || cached?.criteria || fromParams
  const key = criteriaKey(criteria)

  if (Array.isArray(state?.results)) {
    return {
      results: state.results,
      label: state.label || searchResultsLabel(criteria),
      criteria,
      status: 'success',
      errorMessage: '',
    }
  }

  if (cached && Array.isArray(cached.results) && criteriaKey(cached.criteria) === key) {
    return {
      results: cached.results,
      label: cached.label || searchResultsLabel(criteria),
      criteria,
      status: 'success',
      errorMessage: '',
    }
  }

  if (hasSearchCriteria(criteria)) {
    return {
      results: [],
      label: searchResultsLabel(criteria),
      criteria,
      status: 'loading',
      errorMessage: '',
    }
  }

  return null
}

function SearchResults() {
  const navigate = useNavigate()
  const location = useLocation()
  const initial = resolveInitial(location.state, location.search)

  const [results, setResults] = useState(() => initial?.results ?? [])
  const [label, setLabel] = useState(() => initial?.label ?? '')
  const [status, setStatus] = useState(() => initial?.status ?? 'idle')
  const [errorMessage, setErrorMessage] = useState(() => initial?.errorMessage ?? '')

  useEffect(() => {
    const next = resolveInitial(location.state, location.search)
    if (!next) {
      setResults([])
      setStatus('idle')
      return
    }

    setLabel(next.label)
    setResults(next.results)
    setStatus(next.status)
    setErrorMessage(next.errorMessage)

    if (next.status === 'success') {
      setSearchResultsPage({
        results: next.results,
        label: next.label,
        criteria: next.criteria,
      })
      return
    }

    let cancelled = false

    fetchSearchResults(next.criteria)
      .then((data) => {
        if (cancelled) return
        const nextLabel = searchResultsLabel(next.criteria)
        setResults(data)
        setLabel(nextLabel)
        setStatus('success')
        setSearchResultsPage({
          results: data,
          label: nextLabel,
          criteria: next.criteria,
        })
      })
      .catch((error) => {
        if (cancelled) return
        setResults([])
        setStatus('error')
        setErrorMessage(error.message || 'Something went wrong.')
      })

    return () => {
      cancelled = true
    }
  }, [location.key, location.search, location.state])

  if (!initial && status === 'idle') {
    return <Navigate to="/" replace state={{ scrollTo: 'search' }} />
  }

  const count = results.length

  return (
    <article className="detail">
      <div className="detail__content">
        <button type="button" className="detail__back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="detail__section-header detail__section-header--spread">
          <div className="detail__credits-heading">
            <p className="detail__credits-kicker">Search results</p>
            <h1 className="detail__title detail__title--sm">
              {label || 'All results'}
              {status === 'success' && (
                <span className="detail__credits-count">
                  {' · '}
                  {count} {count === 1 ? 'result' : 'results'}
                </span>
              )}
            </h1>
          </div>
          <Link className="detail__see-all" to="/" state={{ scrollTo: 'search' }}>
            <span aria-hidden="true">←</span> Back to search
          </Link>
        </div>

        {status === 'loading' && <p className="detail__text">Loading results…</p>}
        {status === 'error' && (
          <p className="detail__status detail__status--error" role="alert">
            {errorMessage}
          </p>
        )}
        {status === 'success' && count === 0 && (
          <p className="detail__text">No results to show.</p>
        )}
        {status === 'success' && count > 0 && (
          <ul className="detail__movie-grid">
            {results.map((item) => (
              <li key={`${item.mediaType}-${item.id}`}>
                <MovieCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

export default SearchResults
