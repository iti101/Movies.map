import { useEffect, useState } from 'react'

function depsChanged(prev, next) {
  if (prev === next) return false
  if (!prev || !next || prev.length !== next.length) return true
  return prev.some((value, index) => value !== next[index])
}

// Loads an async resource whenever `deps` change, tracking loading/error state
// and ignoring results from stale requests after unmount or dependency changes.
export function useAsyncResource(loader, deps) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeDeps, setActiveDeps] = useState(deps)

  // Reset synchronously when deps change so callers never render stale data
  // for a new resource (e.g. movie → person on the same DetailPage instance).
  if (depsChanged(activeDeps, deps)) {
    setActiveDeps(deps)
    setData(null)
    setStatus('loading')
    setErrorMessage('')
  }

  useEffect(() => {
    let cancelled = false

    setStatus('loading')
    setData(null)
    setErrorMessage('')

    loader()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setStatus('success')
      })
      .catch((error) => {
        if (cancelled) return
        setData(null)
        setStatus('error')
        setErrorMessage(error.message || 'Something went wrong.')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, status, errorMessage }
}
