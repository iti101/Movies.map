import { useEffect, useState } from 'react'
import { getSpellingSuggestions } from '../api/tmdb.js'
import { bestSuggestion, queryMatchesCandidate } from '../utils/stringSimilarity.js'

const MIN_QUERY_LENGTH = 4

function pickSuggestion(query, candidates) {
  const match = bestSuggestion(query, candidates)
  if (!match) return ''
  if (queryMatchesCandidate(query, match.value)) return ''
  return match.value
}

/**
 * Suggests a close-but-not-exact correction for the current search query.
 * Prefers titles from live results; when the search returns nothing (typos are
 * not tolerated by TMDB) it probes TMDB with a prefix of the query instead.
 */
export function useDidYouMean({ query, type, results, status }) {
  const [suggestion, setSuggestion] = useState('')
  const trimmed = query.trim()

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH || status !== 'success') {
      setSuggestion('')
      return
    }

    const fromResults = Array.isArray(results)
      ? results
          .map((item) => ({ value: item.title, weight: item.popularity ?? 0 }))
          .filter((candidate) => candidate.value)
      : []

    if (fromResults.length > 0) {
      setSuggestion(pickSuggestion(trimmed, fromResults))
      return
    }

    let cancelled = false
    setSuggestion('')

    getSpellingSuggestions(trimmed, type)
      .then((candidates) => {
        if (cancelled) return
        setSuggestion(pickSuggestion(trimmed, candidates))
      })
      .catch(() => {
        if (cancelled) return
        setSuggestion('')
      })

    return () => {
      cancelled = true
    }
  }, [trimmed, type, results, status])

  return suggestion
}
