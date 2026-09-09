const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w185'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

async function tmdbFetch(path, params = {}) {
  if (!API_KEY) {
    throw new Error('Missing VITE_TMDB_API_KEY. Add it to your .env and restart the dev server.')
  }

  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('language', 'en-US')

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status})`)
  }

  return response.json()
}

function normalizeItem(item, mediaType) {
  const type = mediaType || item.media_type
  if (!type || type === 'collection') return null

  const title =
    type === 'person' ? item.name : item.title || item.name || 'Untitled'

  const date =
    type === 'person' ? null : item.release_date || item.first_air_date || null

  const imagePath =
    type === 'person' ? item.profile_path : item.poster_path

  return {
    id: item.id,
    mediaType: type,
    title,
    date,
    imagePath,
    popularity: item.popularity ?? 0,
  }
}

export function getImageUrl(path) {
  if (!path) return null
  return `${IMAGE_BASE}${path}`
}

export async function searchTmdb({ query, type = 'all', year = '' }) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const yearValue = year.trim()

  if (type === 'movie') {
    const data = await tmdbFetch('/search/movie', {
      query: trimmed,
      primary_release_year: yearValue || undefined,
    })
    return (data.results || [])
      .map((item) => normalizeItem(item, 'movie'))
      .filter(Boolean)
  }

  if (type === 'tv') {
    const data = await tmdbFetch('/search/tv', {
      query: trimmed,
      first_air_date_year: yearValue || undefined,
    })
    return (data.results || [])
      .map((item) => normalizeItem(item, 'tv'))
      .filter(Boolean)
  }

  if (type === 'person') {
    const data = await tmdbFetch('/search/person', { query: trimmed })
    return (data.results || [])
      .map((item) => normalizeItem(item, 'person'))
      .filter(Boolean)
  }

  // type === 'all'
  if (yearValue) {
    const [movies, shows] = await Promise.all([
      tmdbFetch('/search/movie', {
        query: trimmed,
        primary_release_year: yearValue,
      }),
      tmdbFetch('/search/tv', {
        query: trimmed,
        first_air_date_year: yearValue,
      }),
    ])

    const combined = [
      ...(movies.results || []).map((item) => normalizeItem(item, 'movie')),
      ...(shows.results || []).map((item) => normalizeItem(item, 'tv')),
    ].filter(Boolean)

    return combined.sort((a, b) => b.popularity - a.popularity)
  }

  const data = await tmdbFetch('/search/multi', { query: trimmed })
  return (data.results || [])
    .map((item) => normalizeItem(item))
    .filter(Boolean)
}
