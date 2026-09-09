import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import './DetailPage.css'

function SearchResults() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const results = state?.results
  const label = state?.label

  if (!Array.isArray(results)) {
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
              <span className="detail__credits-count">
                {' · '}
                {count} {count === 1 ? 'result' : 'results'}
              </span>
            </h1>
          </div>
          <Link className="detail__see-all" to="/" state={{ scrollTo: 'search' }}>
            <span aria-hidden="true">←</span> Back to search
          </Link>
        </div>

        {count === 0 ? (
          <p className="detail__text">No results to show.</p>
        ) : (
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
