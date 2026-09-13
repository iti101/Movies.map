/**
 * Keeps search UI / results alive across route changes.
 * Home unmounts when you open a detail page; location.state alone is also lost
 * if /search is revisited without it — so we mirror both in memory.
 */

let homeSearch = null
let resultsPage = null

export function getHomeSearchState() {
  return homeSearch
}

export function setHomeSearchState(next) {
  homeSearch = next
}

export function getSearchResultsPage() {
  return resultsPage
}

export function setSearchResultsPage(next) {
  resultsPage = next
}

export function buildSearchPath({ query = '', type = 'all', year = '', genre = null } = {}) {
  const params = new URLSearchParams()
  const trimmed = query.trim()

  if (trimmed) params.set('q', trimmed)
  if (type && type !== 'all') params.set('type', type)
  if (year) params.set('year', year)
  if (genre) {
    if (genre.tag) params.set('g', genre.tag)
    if (genre.name) params.set('gn', genre.name)
    if (genre.movieId) params.set('gm', String(genre.movieId))
    if (genre.tvId) params.set('gt', String(genre.tvId))
  }

  const qs = params.toString()
  return qs ? `/search?${qs}` : '/search'
}

export function parseSearchParams(search) {
  const params = new URLSearchParams(search)
  const query = params.get('q') || ''
  const type = params.get('type') || 'all'
  const year = params.get('year') || ''
  const tag = params.get('g')
  const name = params.get('gn')
  const movieId = params.get('gm')
  const tvId = params.get('gt')

  const genre =
    tag || name || movieId || tvId
      ? {
          key: tag || `genre-${movieId || tvId}`,
          name: name || (tag ? tag.replace(/^#/, '') : 'Genre'),
          tag: tag || (name ? `#${name.replace(/\s+/g, '')}` : '#Genre'),
          movieId: movieId ? Number(movieId) : null,
          tvId: tvId ? Number(tvId) : null,
        }
      : null

  return { query, type, year, genre }
}

export function criteriaKey({ query = '', type = 'all', year = '', genre = null } = {}) {
  return [
    query.trim().toLowerCase(),
    type || 'all',
    year || '',
    genre?.movieId ?? '',
    genre?.tvId ?? '',
    genre?.tag ?? '',
  ].join('|')
}

export function searchResultsLabel({ query = '', genre = null } = {}) {
  const trimmed = query.trim()
  if (trimmed) return `“${trimmed}”`
  return genre?.tag || 'All results'
}

export function hasSearchCriteria({ query = '', genre = null } = {}) {
  return query.trim().length > 0 || Boolean(genre)
}
