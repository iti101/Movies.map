import { useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'movies-map-theme'

// index.html applies the stored theme before React mounts, so the document is
// already the source of truth for the initial value.
function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'dark',
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // ignore storage access errors
    }
  }, [theme])

  return [theme, setTheme]
}

export default useTheme
