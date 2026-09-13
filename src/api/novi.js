const CONFIGURED_BASE_URL = (import.meta.env.VITE_NOVI_BASE_URL || '').replace(/\/$/, '')
// In dev, call same-origin /novi (Vite proxy) so CORS never blocks login.
const BASE_URL = import.meta.env.DEV ? '/novi' : CONFIGURED_BASE_URL
const PROJECT_ID = import.meta.env.VITE_NOVI_PROJECT_ID

export class NoviApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'NoviApiError'
    this.status = status
  }
}

function ensureConfig() {
  if (!PROJECT_ID || (!import.meta.env.DEV && !CONFIGURED_BASE_URL)) {
    throw new NoviApiError(
      'Missing NOVI env vars. Add VITE_NOVI_BASE_URL and VITE_NOVI_PROJECT_ID to .env and restart the dev server.',
    )
  }
}

async function readErrorMessage(response) {
  try {
    const data = await response.json()
    if (typeof data === 'string' && data.trim()) return data
    if (data?.message) return data.message
    if (data?.title) return data.title
    if (Array.isArray(data?.errors) && data.errors[0]) return String(data.errors[0])
  } catch {
    // ignore JSON parse errors
  }
  return null
}

async function noviFetch(path, { method = 'GET', body, token } = {}) {
  ensureConfig()

  const headers = {
    'novi-education-project-id': PROJECT_ID,
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new NoviApiError('Network error. Check your connection and try again.')
  }

  if (!response.ok) {
    const detail = await readErrorMessage(response)
    if (response.status === 401) {
      throw new NoviApiError(detail || 'Invalid email or password.', 401)
    }
    if (response.status === 400) {
      throw new NoviApiError(detail || 'Invalid request. That email may already be registered.', 400)
    }
    if (response.status === 403) {
      throw new NoviApiError(detail || 'You do not have permission for this action.', 403)
    }
    throw new NoviApiError(detail || `NOVI request failed (${response.status}).`, response.status)
  }

  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** POST /api/login — returns { token, user } */
export async function login({ email, password }) {
  const data = await noviFetch('/api/login', {
    method: 'POST',
    body: { email, password },
  })

  if (!data?.token) {
    throw new NoviApiError('Login succeeded but no token was returned.')
  }

  return data
}

/** POST /api/users — create account (register) */
export async function register({ email, password, roles = ['user'] }) {
  return noviFetch('/api/users', {
    method: 'POST',
    body: { email, password, roles },
  })
}

/** POST /api/profiles — store username linked to the auth user */
export async function createProfile({ userId, username }, token) {
  const trimmed = username.trim()
  try {
    return await noviFetch('/api/profiles', {
      method: 'POST',
      body: { userId, username: trimmed },
      token,
    })
  } catch (error) {
    // Live configs may use displayName; some reject username with 4xx (e.g. 406).
    if (
      error instanceof NoviApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 401 &&
      error.status !== 403
    ) {
      return noviFetch('/api/profiles', {
        method: 'POST',
        body: { userId, displayName: trimmed },
        token,
      })
    }
    throw error
  }
}

/** GET /api/reviews — filter client-side by mediaType + mediaId */
export async function getReviewsForMedia(mediaType, mediaId, token) {
  const all = await noviFetch('/api/reviews', { token })
  const list = Array.isArray(all) ? all : []
  return list
    .filter(
      (review) =>
        review.mediaType === mediaType && Number(review.mediaId) === Number(mediaId),
    )
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
}

/** POST /api/reviews — publish a review for a title */
export async function createReview({ userId, mediaType, mediaId, text, rating }, token) {
  const body = {
    userId,
    mediaType,
    mediaId: Number(mediaId),
    text: text.trim(),
  }

  if (rating != null && Number.isFinite(Number(rating))) {
    body.rating = Number(rating)
  }

  return noviFetch('/api/reviews', {
    method: 'POST',
    body,
    token,
  })
}

/** Prefer JWT-scoped profile, then fall back to filtering all profiles. */
export async function getProfileByUserId(userId, token) {
  try {
    const own = await noviFetch('/api/users/profiles', { token })
    const list = Array.isArray(own) ? own : own ? [own] : []
    const match = list.find((profile) => Number(profile.userId) === Number(userId))
    if (match) return match
    if (list.length === 1 && userId == null) return list[0]
  } catch {
    // fall through to collection GET
  }

  if (userId != null) {
    try {
      const byParent = await noviFetch(`/api/users/${userId}/profiles`, { token })
      const list = Array.isArray(byParent) ? byParent : byParent ? [byParent] : []
      if (list[0]) return list[0]
    } catch {
      // fall through
    }
  }

  const all = await noviFetch('/api/profiles', { token })
  const list = Array.isArray(all) ? all : []
  return list.find((profile) => Number(profile.userId) === Number(userId)) ?? null
}
