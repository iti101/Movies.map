import { useEffect, useState } from 'react'
import { discoverRandom, getSearchGenres } from '../api/tmdb.js'
import MovieCard from '../components/MovieCard.jsx'
import './Randomizer.css'

const TYPE_OPTIONS = [
  { id: 'movie', label: 'Movie' },
  { id: 'tv', label: 'TV show' },
]

const STEPS = ['type', 'mood', 'exclude', 'person']

const FALLBACK_MESSAGE =
  "Unfortunately we couldn't find anything that matches your exact specifications, but perhaps you would also like…:"

function toggleGenreInList(list, genre) {
  const exists = list.some((item) => item.key === genre.key)
  return exists ? list.filter((item) => item.key !== genre.key) : [...list, genre]
}

function genreKeyList(genres) {
  return (genres || [])
    .map((genre) => genre.key)
    .sort()
    .join(',')
}

function sameFilters(a, b) {
  return (
    String(a.personName ?? '').trim() === String(b.personName ?? '').trim() &&
    genreKeyList(a.includeGenres) === genreKeyList(b.includeGenres) &&
    genreKeyList(a.excludeGenres) === genreKeyList(b.excludeGenres)
  )
}

function Randomizer() {
  const [step, setStep] = useState('type')
  const [type, setType] = useState(null)
  const [genres, setGenres] = useState([])
  const [genresStatus, setGenresStatus] = useState('idle')
  const [moodGenres, setMoodGenres] = useState([])
  const [excludeGenres, setExcludeGenres] = useState([])
  const [personName, setPersonName] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [fallbackMessage, setFallbackMessage] = useState('')
  const [usedPages, setUsedPages] = useState([])
  const [activeFilters, setActiveFilters] = useState(null)

  useEffect(() => {
    if (!type) {
      setGenres([])
      setGenresStatus('idle')
      setMoodGenres([])
      setExcludeGenres([])
      return
    }

    let cancelled = false
    setGenresStatus('loading')
    setMoodGenres([])
    setExcludeGenres([])

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
  }, [type])

  const stepIndex = STEPS.indexOf(step)
  const typeLabel = TYPE_OPTIONS.find((option) => option.id === type)?.label

  const goToStep = (nextStep) => {
    setStep(nextStep)
    setSuggestions([])
    setSuggestionIndex(0)
    setStatus('idle')
    setErrorMessage('')
    setFallbackMessage('')
    setActiveFilters(null)
  }

  const selectType = (nextType) => {
    setType(nextType)
    setSuggestions([])
    setSuggestionIndex(0)
    setStatus('idle')
    setErrorMessage('')
    setFallbackMessage('')
    setActiveFilters(null)
    setUsedPages([])
    setPersonName('')
    setStep('mood')
  }

  const goBack = () => {
    if (stepIndex <= 0) return
    goToStep(STEPS[stepIndex - 1])
  }

  const goNext = () => {
    if (stepIndex < 0 || stepIndex >= STEPS.length - 1) return
    goToStep(STEPS[stepIndex + 1])
  }

  const toggleMood = (genre) => {
    setMoodGenres((current) => toggleGenreInList(current, genre))
    setExcludeGenres((current) => current.filter((item) => item.key !== genre.key))
  }

  const toggleExclude = (genre) => {
    setExcludeGenres((current) => toggleGenreInList(current, genre))
    setMoodGenres((current) => current.filter((item) => item.key !== genre.key))
  }

  const runDiscover = async ({ append }) => {
    if (!type) return

    setStatus('loading')
    setErrorMessage('')
    if (!append) setFallbackMessage('')

    try {
      let page
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = Math.floor(Math.random() * 5) + 1
        if (!usedPages.includes(candidate) || usedPages.length >= 5) {
          page = candidate
          break
        }
      }
      if (!page) page = Math.floor(Math.random() * 5) + 1

      const exactFilters = {
        includeGenres: moodGenres,
        excludeGenres,
        personName,
      }

      const filterAttempts = append && activeFilters
        ? [activeFilters]
        : [
            exactFilters,
            { includeGenres: moodGenres, excludeGenres: [], personName },
            { includeGenres: moodGenres, excludeGenres: [], personName: '' },
            { includeGenres: [], excludeGenres: [], personName },
            { includeGenres: [], excludeGenres: [], personName: '' },
          ].filter((filters, index, list) =>
            list.findIndex((item) => sameFilters(item, filters)) === index,
          )

      let results = []
      let resolvedPage = page
      let usedFilters = filterAttempts[0]
      let usedFallback = false

      for (let index = 0; index < filterAttempts.length; index += 1) {
        const filters = filterAttempts[index]
        const response = await discoverRandom({
          type,
          ...filters,
          page: index === 0 ? page : undefined,
        })

        if (response.results.length) {
          results = response.results
          resolvedPage = response.page
          usedFilters = filters
          usedFallback = !append && !sameFilters(filters, exactFilters)
          break
        }

        // Only fall through to looser filters on the first load.
        if (append) break
      }

      setUsedPages((current) =>
        current.includes(resolvedPage) ? current : [...current, resolvedPage],
      )
      setActiveFilters(usedFilters)

      if (!results.length) {
        if (!append) {
          setSuggestions([])
          setSuggestionIndex(0)
          setStatus('empty')
          setFallbackMessage('')
          setErrorMessage(FALLBACK_MESSAGE)
        } else {
          setStatus('success')
          setErrorMessage('No more suggestions for these filters.')
        }
        return
      }

      setErrorMessage('')
      setFallbackMessage(usedFallback ? FALLBACK_MESSAGE : append ? fallbackMessage : '')

      if (!append) {
        setSuggestions(results)
        setSuggestionIndex(0)
      } else {
        const seen = new Set(suggestions.map((item) => item.id))
        const fresh = results.filter((item) => !seen.has(item.id))
        const previousLength = suggestions.length
        setSuggestions([...suggestions, ...fresh])
        if (fresh.length) setSuggestionIndex(previousLength)
      }
      setStatus('success')
    } catch (error) {
      if (!append) {
        setSuggestions([])
        setSuggestionIndex(0)
        setFallbackMessage('')
        setActiveFilters(null)
      }
      setStatus('error')
      setErrorMessage(
        error?.code === 'PERSON_NOT_FOUND'
          ? error.message
          : 'Could not load suggestions. Try again.',
      )
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (step !== 'person') return
    setUsedPages([])
    setSuggestions([])
    setSuggestionIndex(0)
    setFallbackMessage('')
    setActiveFilters(null)
    runDiscover({ append: false })
  }

  const showPreviousSuggestion = () => {
    setSuggestionIndex((current) => Math.max(0, current - 1))
  }

  const showNextSuggestion = () => {
    if (suggestionIndex < suggestions.length - 1) {
      setSuggestionIndex((current) => current + 1)
      return
    }
    if (status !== 'loading') {
      runDiscover({ append: true })
    }
  }

  const hasSuggestions = suggestions.length > 0
  const currentSuggestion = suggestions[suggestionIndex] || null
  const continueLabel = step === 'mood' || step === 'exclude' ? 'Continue' : null
  const showChosenType = stepIndex > 0 && typeLabel
  const showChosenMood = stepIndex > 1
  const showChosenExclude = stepIndex > 2
  const hasChosenSummary = showChosenType || showChosenMood || showChosenExclude

  return (
    <section id="randomizer" className="snap-section randomizer" aria-label="Randomizer">
      <div className={`randomizer__panel${hasSuggestions ? ' randomizer__panel--has-results' : ''}`}>
        <h2 className="section-title randomizer__title">Randomizer</h2>

        <form className="randomizer__form" onSubmit={handleSubmit}>
          {hasChosenSummary && (
            <div className="randomizer__summary" aria-label="Chosen specs">
              {showChosenType && (
                <div className="randomizer__summary-row">
                  <p className="randomizer__summary-label">Watching</p>
                  <div className="randomizer__summary-chips">
                    <span className="randomizer__summary-chip">{typeLabel}</span>
                  </div>
                </div>
              )}

              {showChosenMood && (
                <div className="randomizer__summary-row">
                  <p className="randomizer__summary-label">In the mood for</p>
                  <div className="randomizer__summary-chips">
                    {moodGenres.length ? (
                      moodGenres.map((genre) => (
                        <span key={`chosen-mood-${genre.key}`} className="randomizer__summary-chip">
                          {genre.tag}
                        </span>
                      ))
                    ) : (
                      <span className="randomizer__summary-chip randomizer__summary-chip--muted">
                        Any
                      </span>
                    )}
                  </div>
                </div>
              )}

              {showChosenExclude && (
                <div className="randomizer__summary-row">
                  <p className="randomizer__summary-label">Not in the mood for</p>
                  <div className="randomizer__summary-chips">
                    {excludeGenres.length ? (
                      excludeGenres.map((genre) => (
                        <span
                          key={`chosen-exclude-${genre.key}`}
                          className="randomizer__summary-chip"
                        >
                          {genre.tag}
                        </span>
                      ))
                    ) : (
                      <span className="randomizer__summary-chip randomizer__summary-chip--muted">
                        None
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'type' && (
            <fieldset className="randomizer__fieldset">
              <legend className="randomizer__legend">I want to watch a…</legend>
              <div className="randomizer__chips" role="group" aria-label="Media type">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`randomizer__chip${type === option.id ? ' randomizer__chip--active' : ''}`}
                    aria-pressed={type === option.id}
                    onClick={() => selectType(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 'mood' && (
            <fieldset className="randomizer__fieldset">
              <legend className="randomizer__legend">I&apos;m in the mood for…</legend>
              <div className="randomizer__genres" role="group" aria-label="Mood genres">
                {genresStatus === 'loading' && (
                  <p className="randomizer__status">Loading genres…</p>
                )}
                {genresStatus === 'error' && (
                  <p className="randomizer__status randomizer__status--error" role="alert">
                    Could not load genres.
                  </p>
                )}
                {genres.map((genre) => (
                  <button
                    key={`mood-${genre.key}`}
                    type="button"
                    className={`randomizer__genre${
                      moodGenres.some((item) => item.key === genre.key)
                        ? ' randomizer__genre--active'
                        : ''
                    }`}
                    aria-pressed={moodGenres.some((item) => item.key === genre.key)}
                    onClick={() => toggleMood(genre)}
                  >
                    {genre.tag}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 'exclude' && (
            <fieldset className="randomizer__fieldset">
              <legend className="randomizer__legend">
                I&apos;m definitely NOT in the mood for…
              </legend>
              <div className="randomizer__genres" role="group" aria-label="Excluded genres">
                {genres.map((genre) => (
                  <button
                    key={`exclude-${genre.key}`}
                    type="button"
                    className={`randomizer__genre${
                      excludeGenres.some((item) => item.key === genre.key)
                        ? ' randomizer__genre--active'
                        : ''
                    }`}
                    aria-pressed={excludeGenres.some((item) => item.key === genre.key)}
                    onClick={() => toggleExclude(genre)}
                  >
                    {genre.tag}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 'person' && (
            <label className="randomizer__person">
              <span className="randomizer__legend">Who should star in / direct it?</span>
              <input
                className="randomizer__input"
                type="text"
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                placeholder="Optional — e.g. Johnny Depp"
                autoComplete="off"
              />
            </label>
          )}

          <div className="randomizer__actions">
            {step !== 'type' && (
              <button type="button" className="randomizer__back" onClick={goBack}>
                Back
              </button>
            )}

            {continueLabel && (
              <button type="button" className="randomizer__continue" onClick={goNext}>
                {continueLabel}
              </button>
            )}

            {step === 'person' && (
              <button
                type="submit"
                className="randomizer__submit"
                disabled={!type || status === 'loading'}
              >
                {status === 'loading' && !hasSuggestions ? 'Finding…' : 'Randomize'}
              </button>
            )}
          </div>
        </form>

        {errorMessage && (
          <p className="randomizer__status randomizer__status--error" role="alert">
            {errorMessage}
          </p>
        )}

        {fallbackMessage && (
          <p className="randomizer__status randomizer__status--fallback" role="status">
            {fallbackMessage}
          </p>
        )}

        {currentSuggestion && (
          <div className="randomizer__suggestion">
            <div className="randomizer__suggestion-stage">
              <button
                type="button"
                className="randomizer__nav"
                aria-label="Previous suggestion"
                disabled={suggestionIndex === 0}
                onClick={showPreviousSuggestion}
              >
                ‹
              </button>

              <div className="randomizer__suggestion-card">
                <MovieCard item={currentSuggestion} />
              </div>

              <button
                type="button"
                className="randomizer__nav"
                aria-label="Next suggestion"
                disabled={status === 'loading'}
                onClick={showNextSuggestion}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Randomizer
