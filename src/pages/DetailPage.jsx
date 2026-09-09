import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getImageUrl, getMovieDetails } from '../api/tmdb.js'
import './DetailPage.css'

function formatReleaseDate(value) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRuntime(minutes) {
  if (!minutes) return null

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function MovieDetail({ movie }) {
  const posterUrl = getImageUrl(movie.posterPath, 'w500')
  const releaseDate = formatReleaseDate(movie.releaseDate)
  const runtime = formatRuntime(movie.runtime)
  const facts = [
    releaseDate && { label: 'Release date', value: releaseDate },
    movie.directors.length > 0 && {
      label: movie.directors.length > 1 ? 'Directors' : 'Director',
      value: movie.directors.join(', '),
    },
    runtime && { label: 'Runtime', value: runtime },
    movie.genres.length > 0 && { label: 'Genres', value: movie.genres.join(', ') },
  ].filter(Boolean)

  return (
    <>
      <div className="detail__header">
        {posterUrl ? (
          <img className="detail__poster" src={posterUrl} alt={`${movie.title} poster`} />
        ) : (
          <div className="detail__poster detail__poster--placeholder">No poster</div>
        )}

        <div className="detail__intro">
          <h1 className="detail__title">{movie.title}</h1>
          {movie.tagline && <p className="detail__tagline">{movie.tagline}</p>}

          <dl className="detail__facts">
            {facts.map((fact) => (
              <div key={fact.label} className="detail__fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          <div className="detail__actions">
            {movie.rating ? (
              <p className="detail__rating">
                <span className="detail__rating-score">{movie.rating.toFixed(1)}</span>
                <span className="detail__rating-meta">
                  / 10 · {movie.voteCount.toLocaleString('en-US')} user ratings
                </span>
              </p>
            ) : (
              <p className="detail__rating detail__rating--empty">Not rated yet</p>
            )}

            {movie.trailerUrl && (
              <a
                className="detail__trailer"
                href={movie.trailerUrl}
                target="_blank"
                rel="noreferrer"
              >
                ▶ Watch trailer
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="detail__section">
        <h2 className="detail__section-title">Storyline</h2>
        <p className="detail__text">{movie.overview || 'No synopsis available yet.'}</p>
      </section>

      {movie.cast.length > 0 && (
        <section className="detail__section">
          <h2 className="detail__section-title">Cast</h2>
          <ul className="detail__cast">
            {movie.cast.map((member) => {
              const profileUrl = getImageUrl(member.profilePath, 'w185')

              return (
                <li key={member.id}>
                  <button type="button" className="detail__cast-card">
                    {profileUrl ? (
                      <img
                        className="detail__cast-photo"
                        src={profileUrl}
                        alt={member.name}
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="detail__cast-photo detail__cast-photo--placeholder"
                        aria-hidden="true"
                      >
                        No photo
                      </span>
                    )}
                    <span className="detail__cast-name">{member.name}</span>
                    {member.character && (
                      <span className="detail__cast-role">{member.character}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="detail__section">
        <h2 className="detail__section-title">Where to watch</h2>

        {movie.watch?.providers.length ? (
          <>
            <ul className="detail__providers">
              {movie.watch.providers.map((provider) => {
                const logoUrl = getImageUrl(provider.logoPath, 'w92')

                return (
                  <li key={provider.id}>
                    <a
                      className="detail__provider"
                      href={movie.watch.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {logoUrl && (
                        <img
                          className="detail__provider-logo"
                          src={logoUrl}
                          alt=""
                          loading="lazy"
                        />
                      )}
                      <span className="detail__provider-meta">
                        <span className="detail__provider-name">{provider.name}</span>
                        <span className="detail__provider-offers">
                          {provider.offers.join(' · ')}
                        </span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
            <p className="detail__providers-note">
              Availability for {movie.watch.region}, provided by JustWatch.
            </p>
          </>
        ) : (
          <p className="detail__text">No streaming options found for your region.</p>
        )}
      </section>
    </>
  )
}

function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    setStatus('loading')
    setMovie(null)
    setErrorMessage('')
    window.scrollTo(0, 0)

    getMovieDetails(id)
      .then((data) => {
        if (cancelled) return
        setMovie(data)
        setStatus('success')
      })
      .catch((error) => {
        if (cancelled) return
        setMovie(null)
        setStatus('error')
        setErrorMessage(error.message || 'Something went wrong.')
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const backdropUrl = getImageUrl(movie?.backdropPath, 'w1280')

  return (
    <article className="detail">
      {backdropUrl && (
        <div
          className="detail__backdrop"
          style={{ backgroundImage: `url(${backdropUrl})` }}
          aria-hidden="true"
        />
      )}

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
        {movie && <MovieDetail movie={movie} />}
      </div>
    </article>
  )
}

export default DetailPage
