import { useEffect, useState } from 'react'
import './Typewriter.css'

const FINAL = 'Find any episode'

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function Typewriter() {
  const [text, setText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setText(FINAL)
      setShowCursor(false)
      return
    }

    const ac = new AbortController()
    const { signal } = ac
    let current = ''

    const wait = (ms) =>
      new Promise((resolve, reject) => {
        const id = setTimeout(resolve, ms)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(id)
            reject(new DOMException('Aborted', 'AbortError'))
          },
          { once: true },
        )
      })

    const render = (next) => {
      current = next
      setText(next)
    }

    const type = async (chunk) => {
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i]
        render(current + ch)

        let delay = rand(38, 82)
        if (ch === ' ') delay = rand(80, 160)
        else if (i === 0) delay = rand(60, 120)
        else if (Math.random() < 0.14) delay = rand(120, 240)
        await wait(delay)
      }
    }

    const backspace = async (count) => {
      await wait(rand(60, 140))
      for (let i = 0; i < count; i++) {
        render(current.slice(0, -1))
        const delay = i === 0 ? rand(50, 90) : i === 1 ? rand(36, 58) : rand(16, 34)
        await wait(delay)
      }
    }

    ;(async () => {
      try {
        await type('Find any')
        await wait(rand(160, 280))
        await type(' movie')
        await wait(rand(380, 520))
        await backspace(5)
        await wait(rand(70, 140))
        await type('show')
        await wait(500)
        await backspace(4)
        await wait(rand(80, 150))
        await type('episode')
        await wait(250)
        setShowCursor(false)
      } catch {
        // unmounted
      }
    })()

    return () => ac.abort()
  }, [])

  return (
    <h1 className="typewriter section-title" aria-label={FINAL}>
      <span className="typewriter__text">{text}</span>
      {showCursor && (
        <span className="typewriter__cursor" aria-hidden="true">
          |
        </span>
      )}
    </h1>
  )
}

export default Typewriter
