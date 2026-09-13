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

export const MEDIA_LABELS = {
  movie: 'Movie',
  tv: 'TV',
  person: 'Person',
}

export function detailPath(mediaType, id) {
  if (!MEDIA_LABELS[mediaType]) return null
  return `/${mediaType}/${id}`
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

function genreHashtag(name) {
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

function createGenreLoader(path, mediaType) {
  let promise = null

  return function loadGenres() {
    if (!promise) {
      promise = tmdbFetch(path)
        .then((data) => mapGenreList(data.genres, mediaType))
        .catch((error) => {
          promise = null
          throw error
        })
    }

    return promise
  }
}

const getMovieGenres = createGenreLoader('/genre/movie/list', 'movie')
const getTvGenres = createGenreLoader('/genre/tv/list', 'tv')

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

const spellingSuggestionCache = new Map()

/** Builds the prefix used to probe TMDB when the exact query returns nothing. */
function suggestionPrefix(query) {
  return query.slice(0, Math.max(3, Math.ceil(query.length * 0.6)))
}

/**
 * Candidate titles/names for a "Did you mean…?" correction.
 *
 * TMDB's search matches word prefixes but is NOT typo tolerant, so a misspelling
 * like "avengrs" returns zero results. We probe with a shortened prefix of the
 * query ("aveng") to surface likely-intended titles, returning each with its
 * popularity so the caller can rank canonical titles above obscure look-alikes.
 *
 * @param {string} query
 * @param {'all' | 'movie' | 'tv' | 'person'} [type]
 * @returns {Promise<Array<{ value: string, weight: number }>>}
 */
export async function getSpellingSuggestions(query, type = 'all') {
  const trimmed = String(query ?? '').trim()
  if (trimmed.length < 4) return []

  const prefix = suggestionPrefix(trimmed)
  const cacheKey = `${type || 'all'}:${prefix.toLowerCase()}`
  const cached = spellingSuggestionCache.get(cacheKey)
  if (cached) return cached

  const endpoint = SEARCH_ENDPOINTS[type]

  const promise = (async () => {
    const data = endpoint
      ? await tmdbFetch(endpoint.path, { query: prefix })
      : await tmdbFetch('/search/multi', { query: prefix })

    const byTitle = new Map()

    for (const item of data.results || []) {
      const mediaType = item.media_type || type
      const title = mediaType === 'person' ? item.name : item.title || item.name
      const value = String(title ?? '').trim()
      if (!value) continue

      const weight = item.popularity ?? 0
      const existing = byTitle.get(value)
      if (existing === undefined || weight > existing) byTitle.set(value, weight)
    }

    return [...byTitle.entries()].map(([value, weight]) => ({ value, weight }))
  })().catch((error) => {
    spellingSuggestionCache.delete(cacheKey)
    throw error
  })

  spellingSuggestionCache.set(cacheKey, promise)
  return promise
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

function shuffle(items) {
  const list = [...items]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function genreIdForType(genre, type) {
  return type === 'tv' ? genre.tvId : genre.movieId
}

function genreIdsForType(genres, type) {
  return [...new Set(genres.map((genre) => genreIdForType(genre, type)).filter(Boolean))]
}

function matchesIncludeGenres(item, includeIds) {
  if (!includeIds.length) return true
  return includeIds.some((id) => item.genreIds.includes(id))
}

function matchesExcludeGenres(item, excludeIds) {
  if (!excludeIds.length) return true
  return !excludeIds.some((id) => item.genreIds.includes(id))
}

function pickPersonMatch(results, query) {
  const normalized = query.toLowerCase()
  const exact = results.find((person) => person.name?.toLowerCase() === normalized)
  if (exact) return exact

  const startsWith = results.find((person) =>
    person.name?.toLowerCase().startsWith(normalized),
  )
  if (startsWith) return startsWith

  return results[0] || null
}

async function resolvePersonId(personName) {
  const trimmed = String(personName ?? '').trim()
  if (!trimmed) return null

  const people = await tmdbFetch('/search/person', { query: trimmed })
  const person = pickPersonMatch(people.results || [], trimmed)
  if (!person?.id) {
    const error = new Error(`No person found for “${trimmed}”.`)
    error.code = 'PERSON_NOT_FOUND'
    throw error
  }

  return person.id
}

function mapPersonCredits(credits, type) {
  const byId = new Map()

  for (const list of [credits?.cast || [], credits?.crew || []]) {
    for (const credit of list) {
      const item = normalizeItem(credit, type)
      if (!item) continue

      const existing = byId.get(item.id)
      if (!existing || item.popularity > existing.popularity) {
        byId.set(item.id, item)
      }
    }
  }

  return [...byId.values()]
}

function paginateShuffled(items, page) {
  const pageSize = 20
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const resolvedPage = Math.min(Math.max(1, page || Math.floor(Math.random() * Math.min(5, totalPages)) + 1), totalPages)
  const start = (resolvedPage - 1) * pageSize
  return {
    results: shuffle(items.slice(start, start + pageSize)),
    page: resolvedPage,
  }
}

/**
 * Discover a shuffled batch of movies or TV shows for the Randomizer.
 *
 * @param {{
 *   type: 'movie' | 'tv',
 *   includeGenres?: Array<{ movieId?: number|null, tvId?: number|null }>,
 *   excludeGenres?: Array<{ movieId?: number|null, tvId?: number|null }>,
 *   personName?: string,
 *   page?: number,
 * }} options
 * @returns {Promise<{ results: ReturnType<typeof normalizeItem>[], page: number }>}
 */
export async function discoverRandom({
  type,
  includeGenres = [],
  excludeGenres = [],
  personName = '',
  page,
} = {}) {
  if (type !== 'movie' && type !== 'tv') {
    throw new Error('Randomizer requires movie or tv.')
  }

  const includeIds = genreIdsForType(includeGenres, type)
  const excludeIds = genreIdsForType(excludeGenres, type)
  const personId = await resolvePersonId(personName)

  // TV discover has no with_people/with_cast filter, so person picks always go
  // through credits. Movies use the same path so cast + crew both count.
  if (personId) {
    const creditsPath =
      type === 'tv' ? `/person/${personId}/tv_credits` : `/person/${personId}/movie_credits`
    const credits = await tmdbFetch(creditsPath)
    const filtered = mapPersonCredits(credits, type)
      .filter((item) => matchesIncludeGenres(item, includeIds))
      .filter((item) => matchesExcludeGenres(item, excludeIds))
      .sort((a, b) => b.popularity - a.popularity)

    return paginateShuffled(filtered, page)
  }

  const params = {
    sort_by: 'popularity.desc',
    page: page || Math.floor(Math.random() * 5) + 1,
  }

  // OR: title may include any selected mood genre (and can have others too).
  if (includeIds.length) {
    params.with_genres = includeIds.join('|')
  }

  if (excludeIds.length) {
    params.without_genres = excludeIds.join(',')
  }

  const path = type === 'tv' ? '/discover/tv' : '/discover/movie'
  const data = await tmdbFetch(path, params)
  const results = shuffle(
    mapResults(data.results, type)
      .filter((item) => matchesIncludeGenres(item, includeIds))
      .filter((item) => matchesExcludeGenres(item, excludeIds)),
  )

  return { results, page: data.page || params.page }
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

const RELATED_LIMIT = 8

function mapRelated(recommendations, similar, mediaType, excludeId) {
  const seen = new Set([Number(excludeId)])
  const related = []

  for (const source of [recommendations?.results, similar?.results]) {
    for (const item of mapResults(source, mediaType)) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      related.push(item)
      if (related.length >= RELATED_LIMIT) return related
    }
  }

  return related
}

export async function getMovieDetails(id) {
  const data = await tmdbFetch(`/movie/${id}`, {
    append_to_response: 'credits,videos,watch/providers,recommendations,similar',
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
    similar: mapRelated(data.recommendations, data.similar, 'movie', data.id),
  }
}

export async function getTvDetails(id) {
  const data = await tmdbFetch(`/tv/${id}`, {
    append_to_response:
      'aggregate_credits,credits,videos,watch/providers,recommendations,similar',
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
    similar: mapRelated(data.recommendations, data.similar, 'tv', data.id),
  }
}

function mapPersonMovies(credits) {
  const byMovie = new Map()

  for (const credit of credits?.cast || []) {
    if (!credit.id) continue

    const movie = {
      id: credit.id,
      mediaType: 'movie',
      title: credit.title || credit.original_title || 'Untitled',
      imagePath: credit.poster_path,
      date: credit.release_date || null,
      popularity: credit.popularity ?? 0,
    }

    const existing = byMovie.get(credit.id)
    if (!existing || movie.popularity > existing.popularity) {
      byMovie.set(credit.id, movie)
    }
  }

  return [...byMovie.values()].sort((a, b) => b.popularity - a.popularity)
}

export async function getPersonDetails(id) {
  const data = await tmdbFetch(`/person/${id}`, {
    append_to_response: 'movie_credits',
  })

  return {
    id: data.id,
    name: data.name || 'Unknown',
    biography: data.biography || null,
    profilePath: data.profile_path,
    birthday: data.birthday || null,
    deathday: data.deathday || null,
    placeOfBirth: data.place_of_birth || null,
    knownForDepartment: data.known_for_department || null,
    // TMDB does not expose awards data, so this stays null for now.
    awards: null,
    movies: mapPersonMovies(data.movie_credits),
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
