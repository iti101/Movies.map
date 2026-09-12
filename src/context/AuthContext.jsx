import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createProfile,
  getProfileByUserId,
  login as noviLogin,
  NoviApiError,
  register as noviRegister,
} from '../api/novi.js'

const AUTH_STORAGE_KEY = 'movies-map-auth'
const AuthContext = createContext(null)

function parseJwtPayload(token) {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 <= Date.now()
}

function userIdFromToken(token) {
  const payload = parseJwtPayload(token)
  if (!payload) return null
  const raw = payload.userId ?? payload.sub ?? payload.id ?? payload.nameid
  if (raw == null || raw === '') return null
  const asNumber = Number(raw)
  return Number.isFinite(asNumber) ? asNumber : raw
}

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.token || !parsed?.user) return null
    if (isTokenExpired(parsed.token)) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function persistAuth(token, user) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }))
  } catch {
    // ignore storage access errors
  }
}

function clearPersistedAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // ignore
  }
}

async function enrichUser(token, baseUser) {
  const id = baseUser.id ?? userIdFromToken(token)
  const user = {
    id: id ?? null,
    email: baseUser.email ?? '',
    roles: Array.isArray(baseUser.roles) ? baseUser.roles : [],
    username: baseUser.username ?? null,
  }

  if (user.id == null) return user

  try {
    const profile = await getProfileByUserId(user.id, token)
    if (profile?.username) {
      user.username = profile.username
    } else if (profile?.displayName) {
      user.username = profile.displayName
    }
  } catch {
    // profile is optional for a working session
  }

  return user
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [authView, setAuthView] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function restore() {
      const stored = loadStoredAuth()
      if (!stored) {
        if (!cancelled) setIsReady(true)
        return
      }

      try {
        const enriched = await enrichUser(stored.token, stored.user)
        if (cancelled) return
        setToken(stored.token)
        setUser(enriched)
        persistAuth(stored.token, enriched)
      } catch {
        clearPersistedAuth()
      } finally {
        if (!cancelled) setIsReady(true)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [])

  const openLogin = useCallback(() => setAuthView('login'), [])
  const openRegister = useCallback(() => setAuthView('register'), [])
  const closeAuth = useCallback(() => setAuthView(null), [])

  const applySession = useCallback(async (nextToken, baseUser) => {
    const enriched = await enrichUser(nextToken, baseUser)
    setToken(nextToken)
    setUser(enriched)
    persistAuth(nextToken, enriched)
    setAuthView(null)
    return enriched
  }, [])

  const login = useCallback(
    async (email, password) => {
      const data = await noviLogin({ email, password })
      const baseUser = {
        ...(data.user || {}),
        email: data.user?.email ?? email,
        id: data.user?.id ?? userIdFromToken(data.token),
      }
      return applySession(data.token, baseUser)
    },
    [applySession],
  )

  const register = useCallback(
    async (username, email, password) => {
      const created = await noviRegister({ email, password, roles: ['user'] })
      const data = await noviLogin({ email, password })
      const userId = created?.id ?? data.user?.id ?? userIdFromToken(data.token)

      if (userId != null && username.trim()) {
        try {
          await createProfile({ userId, username: username.trim() }, data.token)
        } catch (error) {
          // Session still works without a profile; surface only hard auth failures.
          if (error instanceof NoviApiError && error.status === 401) throw error
        }
      }

      return applySession(data.token, {
        ...(data.user || {}),
        id: userId,
        email: data.user?.email ?? email,
        username: username.trim(),
      })
    },
    [applySession],
  )

  const logout = useCallback(() => {
    clearPersistedAuth()
    setToken(null)
    setUser(null)
    setAuthView(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuth: Boolean(token && user),
      isReady,
      authView,
      openLogin,
      openRegister,
      closeAuth,
      login,
      register,
      logout,
    }),
    [
      user,
      token,
      isReady,
      authView,
      openLogin,
      openRegister,
      closeAuth,
      login,
      register,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
