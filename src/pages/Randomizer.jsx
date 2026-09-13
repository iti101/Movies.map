import { useEffect, useState } from 'react'
import { discoverRandom, getSearchGenres, searchTmdb } from '../api/tmdb.js'
import DidYouMean from '../components/DidYouMean.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { useDidYouMean } from '../hooks/useDidYouMean.js'
import './Randomizer.css'

const TYPE_OPTIONS = [
  { id: 'movie', label: 'Movie' },
  { id: 'tv', label: 'TV show' },
]

const STEPS = ['type', 'mood', 'exclude', 'person']

const FALLBACK_MESSAGE =
  "Unfortunately we couldn't find any suggestions that matched your search specifications. But perhaps you'll also like this:"

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

/** Loosen filters gradually so we can still suggest titles that match part of the specs. */
function buildFilterAttempts(exactFilters) {
  const { includeGenres, excludeGenres, personName } = exactFilters
  const trimmedPerson = String(personName ?? '').trim()
  const attempts = [
    exactFilters,
    { includeGenres, excludeGenres: [], personName: trimmedPerson },
    { includeGenres, excludeGenres: [], personName: '' },
  ]

  // Prefer keeping one mood genre at a time over dropping all of them.
  if (includeGenres.length > 1) {
    for (const genre of includeGenres) {
      attempts.push({
        includeGenres: [genre],
        excludeGenres: [],
        personName: trimmedPerson,
      })
      attempts.push({
        includeGenres: [genre],
        excludeGenres: [],
        personName: '',
      })
    }
  }

  if (trimmedPerson) {
    attempts.push({ includeGenres: [], excludeGenres: [], personName: trimmedPerson })
  }

  attempts.push({ includeGenres: [], excludeGenres: [], personName: '' })

  return attempts.filter(
    (filters, index, list) =>
      list.findIndex((item) => sameFilters(item, filters)) === index,
  )
}

async function discoverWithFilters({ type, filters, page }) {
  try {
    return await discoverRandom({
      type,
      ...filters,
      page,
    })
  } catch (error) {
    // Missing person should fall through to looser specs, not abort the chain.
    if (error?.code === 'PERSON_NOT_FOUND') {
      return { results: [], page: page || 1 }
    }
    throw error
  }
}

function Randomizer() {
  const [step, setStep] = useState('type')
  const [type, setType] = useState(null)
  const [genres, setGenres] = useState([])
  const [genresStatus, setGenresStatus] = useState('idle')
  const [moodGenres, setMoodGenres] = useState([])
  const [excludeGenres, setExcludeGenres] = useState([])
  const [personName, setPersonName] = useState('')
  const [personResults, setPersonResults] = useState([])
  const [personStatus, setPersonStatus] = useState('idle')
  const [suggestions, setSuggestions] = useState([])
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fallbackMessage, setFallbackMessage] = useState('')
  const [usedPages, setUsedPages] = useState([])
  const [activeFilters, setActiveFilters] = useState(null)

  const personSuggestion = useDidYouMean({
    query: personName,
    type: 'person',
    results: personResults,
    status: personStatus,
  })

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

  useEffect(() => {
    if (step !== 'person') {
      setPersonResults([])
      setPersonStatus('idle')
      return
    }

    const trimmed = personName.trim()
    if (trimmed.length < 4) {
      setPersonResults([])
      setPersonStatus('idle')
      return
    }

    let cancelled = false
    setPersonStatus('loading')

    const timer = setTimeout(async () => {
      try {
        const data = await searchTmdb({ query: trimmed, type: 'person' })
        if (cancelled) return
        setPersonResults(data)
        setPersonStatus('success')
      } catch {
        if (cancelled) return
        setPersonResults([])
        setPersonStatus('error')
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [personName, step])

  const acceptPersonSuggestion = (name) => {
    setPersonName(name)
    setErrorMessage('')
  }

  const stepIndex = STEPS.indexOf(step)
  const typeLabel = TYPE_OPTIONS.find((option) => option.id === type)?.label

  const clearResults = () => {
    setSuggestions([])
    setSuggestionIndex(0)
    setLoading(false)
    setErrorMessage('')
    setFallbackMessage('')
    setActiveFilters(null)
  }

  const goToStep = (nextStep) => {
    setStep(nextStep)
    clearResults()
  }

  const selectType = (nextType) => {
    setType(nextType)
    clearResults()
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

    setLoading(true)
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

      const filterAttempts =
        append && activeFilters ? [activeFilters] : buildFilterAttempts(exactFilters)

      let results = []
      let resolvedPage = page
      let usedFilters = filterAttempts[0]
      let usedFallback = false

      for (let index = 0; index < filterAttempts.length; index += 1) {
        const filters = filterAttempts[index]
        const response = await discoverWithFilters({
          type,
          filters,
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
        if (append) {
          setErrorMessage('No more suggestions for these filters.')
        } else {
          setSuggestions([])
          setSuggestionIndex(0)
          setFallbackMessage('')
          setErrorMessage('No suggestions available for these filters. Try different specs.')
        }
        return
      }

      if (usedFallback) setFallbackMessage(FALLBACK_MESSAGE)

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
    } catch {
      if (!append) {
        setSuggestions([])
        setSuggestionIndex(0)
        setFallbackMessage('')
        setActiveFilters(null)
      }
      setErrorMessage('Could not load suggestions. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (step !== 'person') return
    clearResults()
    setUsedPages([])
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
    if (!loading) {
      runDiscover({ append: true })
    }
  }

  const hasSuggestions = suggestions.length > 0
  const currentSuggestion = suggestions[suggestionIndex] || null
  const showContinue = step === 'mood' || step === 'exclude'
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
            <div className="randomizer__person">
              <label className="randomizer__person-field" htmlFor="randomizer-person">
                <span className="randomizer__legend">Who should star in / direct it?</span>
                <input
                  id="randomizer-person"
                  className="randomizer__input"
                  type="text"
                  value={personName}
                  onChange={(event) => setPersonName(event.target.value)}
                  placeholder="Optional — e.g. Johnny Depp"
                  autoComplete="off"
                />
              </label>
              <DidYouMean suggestion={personSuggestion} onAccept={acceptPersonSuggestion} />
            </div>
          )}

          <div className="randomizer__actions">
            {step !== 'type' && (
              <button type="button" className="randomizer__back" onClick={goBack}>
                Back
              </button>
            )}

            {showContinue && (
              <button type="button" className="randomizer__continue" onClick={goNext}>
                Continue
              </button>
            )}

            {step === 'person' && (
              <button
                type="submit"
                className="randomizer__submit"
                disabled={!type || loading}
              >
                {loading && !hasSuggestions ? 'Finding…' : 'Randomize'}
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
                disabled={loading}
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
