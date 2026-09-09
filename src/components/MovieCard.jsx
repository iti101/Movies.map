import { Link } from 'react-router-dom'
import { detailPath, getImageUrl, MEDIA_LABELS } from '../api/tmdb.js'
import './MovieCard.css'

function MovieCard({ item }) {
  const posterUrl = getImageUrl(item.imagePath, 'w342')
  const href = detailPath(item.mediaType, item.id)
  const year = item.date ? item.date.slice(0, 4) : null
  const subtitle = year || MEDIA_LABELS[item.mediaType] || item.mediaType

  const body = (
    <>
      {posterUrl ? (
        <img
          className="movie-card__poster"
          src={posterUrl}
          alt={`${item.title} poster`}
          loading="lazy"
        />
      ) : (
        <span
          className="movie-card__poster movie-card__poster--placeholder"
          aria-hidden="true"
        >
          No poster
        </span>
      )}

      <span className="movie-card__body">
        <span className="movie-card__title">{item.title}</span>
        <span className="movie-card__year">{subtitle}</span>
      </span>
    </>
  )

  if (!href) {
    return <div className="movie-card">{body}</div>
  }

  return (
    <Link className="movie-card" to={href}>
      {body}
    </Link>
  )
}

export default MovieCard
