function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function bigrams(text) {
  if (text.length < 2) return text.length === 1 ? [text] : []

  const pairs = []
  for (let i = 0; i < text.length - 1; i += 1) {
    pairs.push(text.slice(i, i + 2))
  }
  return pairs
}

/** Dice coefficient (bigram overlap) between two strings, 0..1. */
function diceSimilarity(a, b) {
  const left = normalize(a)
  const right = normalize(b)

  if (!left || !right) return 0
  if (left === right) return 1

  const leftPairs = bigrams(left)
  const rightPairs = bigrams(right)
  if (!leftPairs.length || !rightPairs.length) return 0

  const rightCounts = new Map()
  for (const pair of rightPairs) {
    rightCounts.set(pair, (rightCounts.get(pair) || 0) + 1)
  }

  let overlap = 0
  for (const pair of leftPairs) {
    const count = rightCounts.get(pair) || 0
    if (count > 0) {
      overlap += 1
      rightCounts.set(pair, count - 1)
    }
  }

  return (2 * overlap) / (leftPairs.length + rightPairs.length)
}

/**
 * Picks the best correction from weighted candidates.
 *
 * Ranking by raw similarity alone favours short, obscure titles of a similar
 * length ("Avenger" over "The Avengers"); ranking by weight alone favours
 * popular siblings ("Jurassic World" over "Jurassic Park"). This balances both:
 * it keeps candidates scoring at or above `threshold`, then uses `weight`
 * (e.g. popularity) only to break ties among those within `band` of the top
 * similarity score.
 *
 * @param {string} query
 * @param {Iterable<{ value: string, weight?: number }>} candidates
 * @param {{ threshold?: number, band?: number }} [options]
 */
export function bestSuggestion(query, candidates, { threshold = 0.4, band = 0.1 } = {}) {
  const trimmed = String(query ?? '').trim()
  if (!trimmed) return null

  const scored = []
  for (const candidate of candidates) {
    const value = String(candidate?.value ?? '').trim()
    if (!value) continue

    const score = diceSimilarity(trimmed, value)
    if (score < threshold) continue

    scored.push({ value, score, weight: Number(candidate?.weight) || 0 })
  }

  if (!scored.length) return null

  const topScore = Math.max(...scored.map((candidate) => candidate.score))

  let best = null
  for (const candidate of scored) {
    if (candidate.score < topScore - band) continue
    if (!best || candidate.weight > best.weight) best = candidate
  }

  return best
}

/** True when the query already equals or is contained in the candidate (no typo). */
export function queryMatchesCandidate(query, candidate) {
  const q = normalize(query)
  const c = normalize(candidate)
  if (!q || !c) return false
  return c === q || c.includes(q)
}
