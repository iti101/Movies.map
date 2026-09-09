import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { getPersonDetails } from '../api/tmdb.js'
import { useAsyncResource } from '../hooks/useAsyncResource.js'
import './DetailPage.css'

function PersonCredits() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: person, status, errorMessage } = useAsyncResource(
    () => getPersonDetails(id),
    [id],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const movieCount = person?.movies.length ?? 0

  return (
    <article className="detail">
      <div className="detail__content">
        <button type="button" className="detail__back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        {status === 'loading' && <p className="detail__status">Loading…</p>}
        {status === 'error' && (
          <p className="detail__status detail__status--error" role="alert">
            {errorMessage}
          </p>
        )}

        {person && (
          <>
            <div className="detail__section-header detail__section-header--spread">
              <div className="detail__credits-heading">
                <p className="detail__credits-kicker">All movies</p>
                <h1 className="detail__title detail__title--sm">
                  {person.name}
                  {movieCount > 0 && (
                    <span className="detail__credits-count">
                      {' · '}
                      {movieCount} {movieCount === 1 ? 'movie' : 'movies'}
                    </span>
                  )}
                </h1>
              </div>
              <Link className="detail__see-all" to={`/person/${person.id}`}>
                <span aria-hidden="true">←</span> Back to profile
              </Link>
            </div>

            {movieCount === 0 ? (
              <p className="detail__text">No movies found for {person.name}.</p>
            ) : (
              <ul className="detail__movie-grid">
                {person.movies.map((movie) => (
                  <li key={movie.id}>
                    <MovieCard item={movie} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </article>
  )
}

export default PersonCredits
