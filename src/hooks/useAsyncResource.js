import { useEffect, useState } from 'react'

// Loads an async resource whenever `deps` change, tracking loading/error state
// and ignoring results from stale requests after unmount or dependency changes.
export function useAsyncResource(loader, deps) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

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
