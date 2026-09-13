import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

const STORAGE_PREFIX = 'movies-map-watchlists'
const WatchlistContext = createContext(null)

function storageKeyFor(userId) {
  return userId == null ? STORAGE_PREFIX : `${STORAGE_PREFIX}:${userId}`
}

function sameItem(a, b) {
  return a.mediaType === b.mediaType && Number(a.id) === Number(b.id)
}

function loadState(userId) {
  try {
    const raw = localStorage.getItem(storageKeyFor(userId))
    if (!raw) return { lists: [], activeListId: null }

    const parsed = JSON.parse(raw)
    const lists = Array.isArray(parsed?.lists) ? parsed.lists : []
    const activeListId =
      lists.some((list) => list.id === parsed?.activeListId)
        ? parsed.activeListId
        : lists[0]?.id ?? null

    return { lists, activeListId }
  } catch {
    return { lists: [], activeListId: null }
  }
}

export function toWatchlistItem(item, mediaType) {
  return {
    id: item.id,
    mediaType,
    title: item.title,
    imagePath: item.posterPath,
    date: item.releaseDate || item.firstAirDate || null,
  }
}

export function WatchlistProvider({ children }) {
  const { user, isAuth } = useAuth()
  const userId = isAuth ? user?.id ?? null : null
  const [state, setState] = useState(() => loadState(userId))

  useEffect(() => {
    setState(loadState(userId))
  }, [userId])

  useEffect(() => {
    if (!isAuth || userId == null) return

    try {
      localStorage.setItem(storageKeyFor(userId), JSON.stringify(state))
    } catch {
      // ignore storage access errors
    }
  }, [state, isAuth, userId])

  const createList = useCallback((name, firstItem) => {
    const trimmed = name.trim()
    if (!trimmed) return null

    const list = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: Date.now(),
      items: firstItem ? [firstItem] : [],
    }

    setState((prev) => ({
      lists: [...prev.lists, list],
      activeListId: list.id,
    }))

    return list
  }, [])

  const deleteList = useCallback((listId) => {
    setState((prev) => {
      const lists = prev.lists.filter((list) => list.id !== listId)
      const activeListId =
        prev.activeListId === listId ? lists[0]?.id ?? null : prev.activeListId
      return { lists, activeListId }
    })
  }, [])

  const setActiveListId = useCallback((listId) => {
    setState((prev) => ({ ...prev, activeListId: listId }))
  }, [])

  const addItem = useCallback((listId, item) => {
    let added = false

    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => {
        if (list.id !== listId) return list
        if (list.items.some((existing) => sameItem(existing, item))) return list
        added = true
        return { ...list, items: [...list.items, item] }
      }),
    }))

    return added
  }, [])

  const removeItem = useCallback((listId, item) => {
    setState((prev) => ({
      ...prev,
      lists: prev.lists.map((list) =>
        list.id === listId
          ? { ...list, items: list.items.filter((existing) => !sameItem(existing, item)) }
          : list,
      ),
    }))
  }, [])

  const isInList = useCallback(
    (listId, item) => {
      const list = state.lists.find((entry) => entry.id === listId)
      return list?.items.some((existing) => sameItem(existing, item)) ?? false
    },
    [state.lists],
  )

  const isInAnyList = useCallback(
    (item) => state.lists.some((list) => list.items.some((existing) => sameItem(existing, item))),
    [state.lists],
  )

  const value = useMemo(
    () => ({
      lists: state.lists,
      activeListId: state.activeListId,
      activeList: state.lists.find((list) => list.id === state.activeListId) ?? null,
      createList,
      deleteList,
      setActiveListId,
      addItem,
      removeItem,
      isInList,
      isInAnyList,
    }),
    [state, createList, deleteList, setActiveListId, addItem, removeItem, isInList, isInAnyList],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  if (!context) {
    throw new Error('useWatchlist must be used within WatchlistProvider')
  }
  return context
}
