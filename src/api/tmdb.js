const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const CAST_LIMIT = 12

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

export function getImageUrl(path, size = 'w185') {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

function mapResults(results, mediaType) {
  return (results || []).map((item) => normalizeItem(item, mediaType)).filter(Boolean)
}

const SEARCH_ENDPOINTS = {
  movie: { path: '/search/movie', yearKey: 'primary_release_year' },
  tv: { path: '/search/tv', yearKey: 'first_air_date_year' },
  person: { path: '/search/person' },
}

export async function searchTmdb({ query, type = 'all', year = '' }) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const yearValue = year.trim()

  if (type !== 'all') {
    const endpoint = SEARCH_ENDPOINTS[type]
    const params = { query: trimmed }
    if (endpoint.yearKey && yearValue) params[endpoint.yearKey] = yearValue
    const data = await tmdbFetch(endpoint.path, params)
    return mapResults(data.results, type)
  }

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

    return [...mapResults(movies.results, 'movie'), ...mapResults(shows.results, 'tv')].sort(
      (a, b) => b.popularity - a.popularity,
    )
  }

  const data = await tmdbFetch('/search/multi', { query: trimmed })
  return mapResults(data.results)
}

function pickTrailerUrl(videos) {
  const clips = (videos?.results || []).filter((video) => video.site === 'YouTube')
  const trailer =
    clips.find((video) => video.type === 'Trailer' && video.official) ||
    clips.find((video) => video.type === 'Trailer') ||
    clips.find((video) => video.type === 'Teaser')

  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
}

const OFFER_LABELS = {
  flatrate: 'Stream',
  free: 'Free',
  ads: 'Free with ads',
  rent: 'Rent',
  buy: 'Buy',
}

function browserRegion() {
  const region = navigator.language?.split('-')[1]
  return region ? region.toUpperCase() : 'US'
}

function normalizeWatchProviders(watchProviders) {
  const byRegion = watchProviders?.results || {}
  const region =
    [browserRegion(), 'US'].find((code) => byRegion[code]) || Object.keys(byRegion)[0]
  const offers = region ? byRegion[region] : null
  if (!offers) return null

  const providers = new Map()

  for (const [offerType, label] of Object.entries(OFFER_LABELS)) {
    for (const provider of offers[offerType] || []) {
      const known = providers.get(provider.provider_id)

      if (known) {
        known.offers.push(label)
        continue
      }

      providers.set(provider.provider_id, {
        id: provider.provider_id,
        name: provider.provider_name,
        logoPath: provider.logo_path,
        offers: [label],
      })
    }
  }

  return {
    region,
    link: offers.link || null,
    providers: [...providers.values()],
  }
}

export async function getMovieDetails(id) {
  const data = await tmdbFetch(`/movie/${id}`, {
    append_to_response: 'credits,videos,watch/providers',
  })

  return {
    id: data.id,
    title: data.title || data.original_title || 'Untitled',
    tagline: data.tagline || null,
    overview: data.overview || null,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    releaseDate: data.release_date || null,
    runtime: data.runtime || null,
    genres: (data.genres || []).map((genre) => genre.name),
    rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
    voteCount: data.vote_count || 0,
    directors: (data.credits?.crew || [])
      .filter((member) => member.job === 'Director')
      .map((member) => member.name),
    cast: (data.credits?.cast || []).slice(0, CAST_LIMIT).map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character || null,
      profilePath: member.profile_path,
    })),
    trailerUrl: pickTrailerUrl(data.videos),
    watch: normalizeWatchProviders(data['watch/providers']),
  }
}
