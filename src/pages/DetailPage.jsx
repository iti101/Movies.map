import { useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Select from '../components/Select.jsx'
import MovieCard from '../components/MovieCard.jsx'
import WatchlistModal from '../components/WatchlistModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { toWatchlistItem, useWatchlist } from '../context/WatchlistContext.jsx'
import {
  getFallbackWatchRegions,
  getImageUrl,
  getMovieDetails,
  getPersonDetails,
  getSavedWatchRegion,
  getTvDetails,
  getTvSeason,
  getWatchRegions,
  saveWatchRegion,
  watchRegionName,
} from '../api/tmdb.js'
import { useAsyncResource } from '../hooks/useAsyncResource.js'
import './DetailPage.css'

const KNOWN_FOR_LIMIT = 10

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

function genreLabel(genres) {
  return genres.length > 1 ? 'Genres' : 'Genre'
}

function Rating({ rating, voteCount }) {
  if (!rating) {
    return (
      <div className="detail__rating-block">
        <p className="detail__rating-kicker">User rating</p>
        <p className="detail__rating detail__rating--empty">Not rated yet</p>
      </div>
    )
  }

  return (
    <div className="detail__rating-block">
      <p className="detail__rating-kicker">User rating</p>
      <p className="detail__rating">
        <span className="detail__rating-score">{rating.toFixed(1)}</span>
        <span className="detail__rating-meta">
          / 10 · {voteCount.toLocaleString('en-US')} user ratings
        </span>
      </p>
    </div>
  )
}

function TrailerLink({ url }) {
  if (!url) return null

  return (
    <a className="detail__action-btn" href={url} target="_blank" rel="noreferrer">
      ▶ Watch trailer
    </a>
  )
}

function WatchlistButton({ item, mediaType }) {
  const { lists, addItem, isInList } = useWatchlist()
  const { isAuth, openLogin } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [status, setStatus] = useState('')
  const watchItem = toWatchlistItem(item, mediaType)
  const onlyList = lists.length === 1 ? lists[0] : null
  const alreadyInOnlyList = onlyList ? isInList(onlyList.id, watchItem) : false

  useEffect(() => {
    setStatus('')
  }, [item.id, mediaType])

  useEffect(() => {
    if (!status) return undefined
    const timer = window.setTimeout(() => setStatus(''), 2500)
    return () => window.clearTimeout(timer)
  }, [status])

  function handleClick() {
    if (!isAuth) {
      openLogin()
      return
    }

    if (lists.length === 1) {
      if (alreadyInOnlyList) {
        setStatus('Already in watchlist')
        return
      }
      addItem(onlyList.id, watchItem)
      setStatus(`Added to ${onlyList.name}`)
      return
    }

    setModalOpen(true)
  }

  const label = status || (alreadyInOnlyList ? 'In watchlist' : 'Add to watchlist')

  return (
    <>
      <button
        type="button"
        className={`detail__action-btn${status || alreadyInOnlyList ? ' detail__action-btn--added' : ''}`}
        onClick={handleClick}
        aria-live="polite"
      >
        {label}
      </button>
      <WatchlistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        item={watchItem}
        onAdded={(listName) => setStatus(`Added to ${listName}`)}
      />
    </>
  )
}

function FactList({ facts }) {
  return (
    <dl className="detail__facts">
      {facts.map((fact) => (
        <div key={fact.label} className="detail__fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Poster({ title, posterPath }) {
  const posterUrl = getImageUrl(posterPath, 'w500')

  if (!posterUrl) {
    return <div className="detail__poster detail__poster--placeholder">No poster</div>
  }

  return <img className="detail__poster" src={posterUrl} alt={`${title} poster`} />
}

function WatchSection({ watchByRegion }) {
  const countryLabelId = useId()
  const [region, setRegion] = useState(getSavedWatchRegion)
  const [regions, setRegions] = useState(getFallbackWatchRegions)

  useEffect(() => {
    let cancelled = false

    getWatchRegions().then((options) => {
      if (!cancelled) setRegions(options)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const regionOptions = regions.some((option) => option.code === region)
    ? regions
    : [...regions, { code: region, name: watchRegionName(region) }].sort((a, b) =>
        a.name.localeCompare(b.name, 'en'),
      )
  const country = regionOptions.find((option) => option.code === region)?.name || region
  const watch = watchByRegion?.[region]
  const providers = watch?.providers || []

  function handleRegionChange(nextRegion) {
    setRegion(nextRegion)
    saveWatchRegion(nextRegion)
  }

  return (
    <section className="detail__section">
      <div className="detail__section-header">
        <h2 className="detail__section-title">Where to watch</h2>
        <div className="detail__region-picker">
          <span id={countryLabelId} className="detail__region-label">
            Country
          </span>
          <Select
            className="detail__region-select"
            labelledBy={countryLabelId}
            value={region}
            onChange={handleRegionChange}
            options={regionOptions.map((option) => ({
              value: option.code,
              label: option.name,
            }))}
          />
        </div>
      </div>

      {providers.length === 0 ? (
        <p className="detail__text">No streaming options found for {country}.</p>
      ) : (
        <>
          <ul className="detail__providers">
            {providers.map((provider) => {
              const logoUrl = getImageUrl(provider.logoPath, 'w92')
              const ProviderTag = watch.link ? 'a' : 'div'
              const linkProps = watch.link
                ? { href: watch.link, target: '_blank', rel: 'noreferrer' }
                : {}

              return (
                <li key={provider.id}>
                  <ProviderTag className="detail__provider" {...linkProps}>
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
                  </ProviderTag>
                </li>
              )
            })}
          </ul>
          <p className="detail__providers-note">
            Availability for {country}, provided by JustWatch.
          </p>
        </>
      )}
    </section>
  )
}

function CastSection({ cast }) {
  if (!cast?.length) return null

  return (
    <section className="detail__section">
      <h2 className="detail__section-title">Cast</h2>
      <ul className="detail__cast">
        {cast.map((member) => {
          const profileUrl = getImageUrl(member.profilePath, 'w185')

          return (
            <li key={member.id}>
              <Link to={`/person/${member.id}`} className="detail__cast-card">
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
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function MovieDetail({ movie }) {
  const releaseDate = formatReleaseDate(movie.releaseDate)
  const runtime = formatRuntime(movie.runtime)
  const facts = [
    releaseDate && { label: 'Release date', value: releaseDate },
    movie.directors.length > 0 && {
      label: movie.directors.length > 1 ? 'Directors' : 'Director',
      value: movie.directors.join(', '),
    },
    runtime && { label: 'Runtime', value: runtime },
    movie.genres.length > 0 && {
      label: genreLabel(movie.genres),
      value: movie.genres.join(', '),
    },
  ].filter(Boolean)

  return (
    <>
      <div className="detail__header">
        <Poster title={movie.title} posterPath={movie.posterPath} />

        <div className="detail__intro">
          <h1 className="detail__title">{movie.title}</h1>
          {movie.tagline && <p className="detail__tagline">{movie.tagline}</p>}
          <FactList facts={facts} />

          <div className="detail__actions">
            <Rating rating={movie.rating} voteCount={movie.voteCount} />
            <div className="detail__cta">
              <TrailerLink url={movie.trailerUrl} />
              <WatchlistButton item={movie} mediaType="movie" />
            </div>
          </div>
        </div>
      </div>

      <section className="detail__section">
        <h2 className="detail__section-title">Storyline</h2>
        <p className="detail__text">{movie.overview || 'No synopsis available yet.'}</p>
      </section>

      <CastSection cast={movie.cast} />

      <WatchSection watchByRegion={movie.watch} />
    </>
  )
}

function defaultSeasonNumber(seasons) {
  if (!seasons.length) return null
  return seasons.find((season) => season.number >= 1)?.number ?? seasons[0].number
}

function SeasonEpisodes({ showId, seasons }) {
  const [seasonNumber, setSeasonNumber] = useState(() => defaultSeasonNumber(seasons))
  const [episodes, setEpisodes] = useState([])
  const [openEpisodeId, setOpenEpisodeId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (seasonNumber == null) {
      setEpisodes([])
      setStatus('idle')
      return
    }

    let cancelled = false

    setStatus('loading')
    setErrorMessage('')
    setOpenEpisodeId(null)

    getTvSeason(showId, seasonNumber)
      .then((data) => {
        if (cancelled) return
        setEpisodes(data)
        setStatus('success')
      })
      .catch((error) => {
        if (cancelled) return
        setEpisodes([])
        setStatus('error')
        setErrorMessage(error.message || 'Could not load episodes.')
      })

    return () => {
      cancelled = true
    }
  }, [showId, seasonNumber])

  useEffect(() => {
    if (openEpisodeId == null) return

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpenEpisodeId(null)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openEpisodeId])

  if (!seasons.length) return null

  return (
    <section className="detail__section">
      <h2 className="detail__section-title">Episodes</h2>

      <div className="detail__season-picker">
        <Select
          className="detail__season-select"
          ariaLabel="Season"
          value={seasonNumber ?? ''}
          onChange={(nextSeason) => setSeasonNumber(Number(nextSeason))}
          options={seasons.map((season) => ({
            value: season.number,
            label: `${season.name} · ${season.episodeCount} ${
              season.episodeCount === 1 ? 'episode' : 'episodes'
            }`,
          }))}
        />
      </div>

      {status === 'loading' && <p className="detail__text">Loading episodes…</p>}
      {status === 'error' && (
        <p className="detail__status detail__status--error" role="alert">
          {errorMessage}
        </p>
      )}
      {status === 'success' && episodes.length === 0 && (
        <p className="detail__text">No episodes listed for this season.</p>
      )}
      {status === 'success' && episodes.length > 0 && (
        <ol className="detail__episodes">
          {episodes.map((episode) => {
            const airDate = formatReleaseDate(episode.airDate)
            const runtime = formatRuntime(episode.runtime)
            const meta = [airDate, runtime].filter(Boolean).join(' · ')
            const isOpen = openEpisodeId === episode.id

            return (
              <li
                key={episode.id}
                className={`detail__episode${isOpen ? ' detail__episode--open' : ''}`}
              >
                <button
                  type="button"
                  className="detail__episode-toggle"
                  aria-expanded={isOpen}
                  onClick={() => setOpenEpisodeId(episode.id)}
                >
                  <span className="detail__episode-number">E{episode.number}</span>
                  <span className="detail__episode-name">{episode.name}</span>
                  {meta && <span className="detail__episode-meta">{meta}</span>}
                </button>

                {isOpen && (
                  <div className="detail__episode-synopsis">
                    <p className="detail__episode-overview">
                      {episode.overview || 'No synopsis available yet.'}
                    </p>
                    <button
                      type="button"
                      className="detail__episode-close"
                      aria-label="Close episode synopsis"
                      onClick={() => setOpenEpisodeId(null)}
                    >
                      ×
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function TvDetail({ show }) {
  const firstAired = formatReleaseDate(show.firstAirDate)
  const facts = [
    firstAired && { label: 'First aired', value: firstAired },
    show.genres.length > 0 && {
      label: genreLabel(show.genres),
      value: show.genres.join(', '),
    },
    show.createdBy.length > 0 && {
      label: 'Created by',
      value: show.createdBy.join(', '),
    },
  ].filter(Boolean)

  return (
    <>
      <div className="detail__header">
        <Poster title={show.title} posterPath={show.posterPath} />

        <div className="detail__intro">
          <h1 className="detail__title">{show.title}</h1>
          <FactList facts={facts} />

          <div className="detail__actions">
            <Rating rating={show.rating} voteCount={show.voteCount} />
            <div className="detail__cta">
              <TrailerLink url={show.trailerUrl} />
              <WatchlistButton item={show} mediaType="tv" />
            </div>
          </div>
        </div>
      </div>

      <section className="detail__section">
        <h2 className="detail__section-title">Storyline</h2>
        <p className="detail__text">{show.overview || 'No synopsis available yet.'}</p>
      </section>

      <CastSection cast={show.cast} />

      <SeasonEpisodes showId={show.id} seasons={show.seasons} />

      <WatchSection watchByRegion={show.watch} />
    </>
  )
}

function PersonPhoto({ name, profilePath }) {
  const photoUrl = getImageUrl(profilePath, 'w500')

  if (!photoUrl) {
    return <div className="detail__poster detail__poster--placeholder">No photo</div>
  }

  return <img className="detail__poster" src={photoUrl} alt={name} />
}

function KnownForSection({ personId, movies }) {
  if (!movies?.length) return null

  const topMovies = movies.slice(0, KNOWN_FOR_LIMIT)
  const hasMore = movies.length > KNOWN_FOR_LIMIT

  return (
    <section className="detail__section">
      <div className="detail__section-header detail__section-header--spread">
        <h2 className="detail__section-title">Known for…</h2>
        {hasMore && (
          <Link className="detail__see-all" to={`/person/${personId}/movies`}>
            See all <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      <ul className="detail__movie-grid">
        {topMovies.map((movie) => (
          <li key={movie.id}>
            <MovieCard item={movie} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function PersonDetail({ person }) {
  const born = formatReleaseDate(person.birthday)
  const died = formatReleaseDate(person.deathday)
  const facts = [
    born && { label: 'Date of birth', value: born },
    died && { label: 'Died', value: died },
    person.placeOfBirth && { label: 'Place of birth', value: person.placeOfBirth },
  ].filter(Boolean)

  return (
    <>
      <div className="detail__header">
        <PersonPhoto name={person.name} profilePath={person.profilePath} />

        <div className="detail__intro">
          <h1 className="detail__title">{person.name}</h1>
          {facts.length > 0 && <FactList facts={facts} />}

          <div className="detail__awards">
            <p className="detail__awards-label">Awards</p>
            <p className="detail__awards-text">
              {person.awards || 'No awards information available.'}
            </p>
          </div>
        </div>
      </div>

      <section className="detail__section">
        <h2 className="detail__section-title">Biography</h2>
        <p className="detail__text detail__text--bio">
          {person.biography || 'No biography available yet.'}
        </p>
      </section>

      <KnownForSection personId={person.id} movies={person.movies} />
    </>
  )
}

function loadDetails(mediaType, id) {
  if (mediaType === 'person') return getPersonDetails(id)
  if (mediaType === 'tv') return getTvDetails(id)
  return getMovieDetails(id)
}

function DetailPage({ mediaType }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: item, status, errorMessage } = useAsyncResource(
    () => loadDetails(mediaType, id),
    [id, mediaType],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id, mediaType])

  const backdropUrl = getImageUrl(item?.backdropPath, 'w1280')

  return (
    <article className="detail" key={`${mediaType}-${id}`}>
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
        {item &&
          (mediaType === 'person' ? (
            <PersonDetail key={item.id} person={item} />
          ) : mediaType === 'tv' ? (
            <TvDetail key={item.id} show={item} />
          ) : (
            <MovieDetail key={item.id} movie={item} />
          ))}
      </div>
    </article>
  )
}

export default DetailPage
