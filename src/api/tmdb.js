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
    genreIds: item.genre_ids || [],
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

function matchesGenre(item, genre) {
  if (!genre) return true
  if (item.mediaType === 'movie') return Boolean(genre.movieId && item.genreIds.includes(genre.movieId))
  if (item.mediaType === 'tv') return Boolean(genre.tvId && item.genreIds.includes(genre.tvId))
  return false
}

export async function searchTmdb({ query, type = 'all', year = '', genre = null }) {
  const trimmed = query.trim()
  if (!trimmed) return []

  const yearValue = year.trim()
  let results

  if (type !== 'all') {
    const endpoint = SEARCH_ENDPOINTS[type]
    const params = { query: trimmed }
    if (endpoint.yearKey && yearValue) params[endpoint.yearKey] = yearValue
    const data = await tmdbFetch(endpoint.path, params)
    results = mapResults(data.results, type)
  } else if (yearValue) {
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

    results = [...mapResults(movies.results, 'movie'), ...mapResults(shows.results, 'tv')].sort(
      (a, b) => b.popularity - a.popularity,
    )
  } else {
    const data = await tmdbFetch('/search/multi', { query: trimmed })
    results = mapResults(data.results)
  }

  return genre ? results.filter((item) => matchesGenre(item, genre)) : results
}

const GENRE_SLUGS = {
  'Science Fiction': 'sci-fi',
  'TV Movie': 'tv-movie',
  'Action & Adventure': 'action-adventure',
  'Sci-Fi & Fantasy': 'sci-fi-fantasy',
  'War & Politics': 'war-politics',
}

export function genreHashtag(name) {
  const slug =
    GENRE_SLUGS[name] ||
    name
      .toLowerCase()
      .replace(/&/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  return `#${slug}`
}

function mapGenreList(genres, mediaType) {
  return (genres || []).map((genre) => ({
    key: `${mediaType}-${genre.id}`,
    name: genre.name,
    tag: genreHashtag(genre.name),
    movieId: mediaType === 'movie' ? genre.id : null,
    tvId: mediaType === 'tv' ? genre.id : null,
  }))
}

let movieGenresPromise = null
let tvGenresPromise = null

function getMovieGenres() {
  if (!movieGenresPromise) {
    movieGenresPromise = tmdbFetch('/genre/movie/list')
      .then((data) => mapGenreList(data.genres, 'movie'))
      .catch((error) => {
        movieGenresPromise = null
        throw error
      })
  }

  return movieGenresPromise
}

function getTvGenres() {
  if (!tvGenresPromise) {
    tvGenresPromise = tmdbFetch('/genre/tv/list')
      .then((data) => mapGenreList(data.genres, 'tv'))
      .catch((error) => {
        tvGenresPromise = null
        throw error
      })
  }

  return tvGenresPromise
}

export async function getSearchGenres(type = 'all') {
  if (type === 'tv') return getTvGenres()
  if (type === 'movie') return getMovieGenres()

  const [movies, shows] = await Promise.all([getMovieGenres(), getTvGenres()])
  const byTag = new Map()

  for (const genre of movies) {
    byTag.set(genre.tag, { ...genre, key: genre.tag })
  }

  for (const genre of shows) {
    const existing = byTag.get(genre.tag)
    if (existing) {
      existing.tvId = genre.tvId
    } else {
      byTag.set(genre.tag, { ...genre, key: genre.tag })
    }
  }

  return [...byTag.values()]
}

export async function discoverByGenre({ genre, type = 'all', year = '' }) {
  if (!genre) return []

  const yearValue = year.trim()
  const requests = []
  const wantMovies = type === 'all' || type === 'movie'
  const wantTv = type === 'all' || type === 'tv'

  if (wantMovies && genre.movieId) {
    const params = { with_genres: genre.movieId, sort_by: 'popularity.desc' }
    if (yearValue) params.primary_release_year = yearValue
    requests.push(
      tmdbFetch('/discover/movie', params).then((data) => mapResults(data.results, 'movie')),
    )
  }

  if (wantTv && genre.tvId) {
    const params = { with_genres: genre.tvId, sort_by: 'popularity.desc' }
    if (yearValue) params.first_air_date_year = yearValue
    requests.push(tmdbFetch('/discover/tv', params).then((data) => mapResults(data.results, 'tv')))
  }

  if (!requests.length) return []

  const pages = await Promise.all(requests)
  return pages.flat().sort((a, b) => b.popularity - a.popularity)
}

function pickTrailerUrl(videos) {
  const clips = (videos?.results || []).filter((video) => video.site === 'YouTube' && video.key)
  const trailer =
    clips.find((video) => video.type === 'Trailer' && video.official) ||
    clips.find((video) => video.type === 'Trailer') ||
    clips.find((video) => video.type === 'Teaser') ||
    clips.find((video) => video.type === 'Clip') ||
    clips[0]

  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
}

async function fetchTrailerUrl(mediaType, id, appendedVideos) {
  const fromAppend = pickTrailerUrl(appendedVideos)
  if (fromAppend) return fromAppend

  try {
    const videos = await tmdbFetch(`/${mediaType}/${id}/videos`, {
      include_video_language: 'en-US,en,null',
    })
    return pickTrailerUrl(videos)
  } catch {
    return null
  }
}

const OFFER_LABELS = {
  flatrate: 'Stream',
  free: 'Free',
  ads: 'Free with ads',
  rent: 'Rent',
  buy: 'Buy',
}

const WATCH_REGION_STORAGE_KEY = 'movies.map.watchRegion'

const FALLBACK_WATCH_REGION_CODES = [
  'AD', 'AE', 'AG', 'AL', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BB', 'BE', 'BG',
  'BH', 'BM', 'BO', 'BR', 'BS', 'CA', 'CH', 'CL', 'CO', 'CR', 'CZ', 'DE',
  'DK', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ES', 'FI', 'FR', 'GB', 'GR', 'GT',
  'HK', 'HN', 'HR', 'HU', 'ID', 'IE', 'IL', 'IN', 'IS', 'IT', 'JP', 'KE',
  'KR', 'KW', 'LB', 'LT', 'LU', 'LV', 'MA', 'MX', 'MY', 'NG', 'NL', 'NO',
  'NZ', 'OM', 'PA', 'PE', 'PH', 'PK', 'PL', 'PS', 'PT', 'PY', 'QA', 'RO',
  'RS', 'RU', 'SA', 'SE', 'SG', 'SI', 'SK', 'SV', 'TH', 'TR', 'TW', 'UA',
  'US', 'UY', 'VE', 'ZA',
]

const regionDisplayNames = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null

export function watchRegionName(code) {
  if (!code) return ''
  try {
    return regionDisplayNames?.of(code) || code
  } catch {
    return code
  }
}

function toWatchRegionOptions(codes) {
  return [...new Set(codes.filter(Boolean))].map((code) => ({
    code,
    name: watchRegionName(code),
  })).sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

export function getFallbackWatchRegions() {
  return toWatchRegionOptions(FALLBACK_WATCH_REGION_CODES)
}

function browserRegion() {
  const region = navigator.language?.split('-')[1]
  return region ? region.toUpperCase() : 'US'
}

export function getSavedWatchRegion() {
  try {
    const saved = localStorage.getItem(WATCH_REGION_STORAGE_KEY)
    if (saved && /^[A-Z]{2}$/.test(saved)) return saved
  } catch {
    // Ignore storage access errors (private mode, disabled cookies, etc.)
  }

  return browserRegion()
}

export function saveWatchRegion(region) {
  try {
    localStorage.setItem(WATCH_REGION_STORAGE_KEY, region)
  } catch {
    // Ignore storage access errors
  }
}

function mapWatchOffers(offers) {
  if (!offers) return { link: null, providers: [] }

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
    link: offers.link || null,
    providers: [...providers.values()],
  }
}

function normalizeWatchProviders(watchProviders) {
  const byRegion = watchProviders?.results || {}
  const regions = {}

  for (const [code, offers] of Object.entries(byRegion)) {
    regions[code.toUpperCase()] = mapWatchOffers(offers)
  }

  return regions
}

let watchRegionsPromise = null

export async function getWatchRegions() {
  if (!watchRegionsPromise) {
    watchRegionsPromise = tmdbFetch('/watch/providers/regions')
      .then((data) => {
        const codes = (data.results || [])
          .map((region) => region.iso_3166_1?.toUpperCase())
          .filter(Boolean)

        return toWatchRegionOptions(codes.length ? codes : FALLBACK_WATCH_REGION_CODES)
      })
      .catch(() => getFallbackWatchRegions())
  }

  return watchRegionsPromise
}

function mapRating(voteAverage, voteCount) {
  return {
    rating: voteAverage ? Math.round(voteAverage * 10) / 10 : null,
    voteCount: voteCount || 0,
  }
}

function mapCast(credits) {
  return (credits?.cast || []).slice(0, CAST_LIMIT).map((member) => ({
    id: member.id,
    name: member.name,
    character:
      member.character ||
      (member.roles || []).map((role) => role.character).filter(Boolean).join(', ') ||
      null,
    profilePath: member.profile_path,
  }))
}

export async function getMovieDetails(id) {
  const data = await tmdbFetch(`/movie/${id}`, {
    append_to_response: 'credits,videos,watch/providers',
    include_video_language: 'en-US,en,null',
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
    ...mapRating(data.vote_average, data.vote_count),
    directors: (data.credits?.crew || [])
      .filter((member) => member.job === 'Director')
      .map((member) => member.name),
    cast: mapCast(data.credits),
    trailerUrl: await fetchTrailerUrl('movie', id, data.videos),
    watch: normalizeWatchProviders(data['watch/providers']),
  }
}

export async function getTvDetails(id) {
  const data = await tmdbFetch(`/tv/${id}`, {
    append_to_response: 'aggregate_credits,credits,videos,watch/providers',
    include_video_language: 'en-US,en,null',
  })

  return {
    id: data.id,
    title: data.name || data.original_name || 'Untitled',
    overview: data.overview || null,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    firstAirDate: data.first_air_date || null,
    genres: (data.genres || []).map((genre) => genre.name),
    ...mapRating(data.vote_average, data.vote_count),
    createdBy: (data.created_by || []).map((person) => person.name),
    seasons: (data.seasons || [])
      .filter((season) => season.episode_count > 0)
      .map((season) => ({
        number: season.season_number,
        name: season.name,
        episodeCount: season.episode_count,
      })),
    cast: mapCast(
      data.aggregate_credits?.cast?.length ? data.aggregate_credits : data.credits,
    ),
    trailerUrl: await fetchTrailerUrl('tv', id, data.videos),
    watch: normalizeWatchProviders(data['watch/providers']),
  }
}

export async function getTvSeason(showId, seasonNumber) {
  const data = await tmdbFetch(`/tv/${showId}/season/${seasonNumber}`)

  return (data.episodes || []).map((episode) => ({
    id: episode.id,
    number: episode.episode_number,
    name: episode.name || `Episode ${episode.episode_number}`,
    airDate: episode.air_date || null,
    runtime: episode.runtime || null,
    overview: episode.overview || null,
  }))
}
