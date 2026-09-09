import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import './Select.css'

const MENU_GAP = 0.45
const VIEWPORT_PAD = 8
const PREFERRED_MAX_HEIGHT = 16.5

function remToPx(value) {
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return value * rootFontSize
}

function positionMenu(button, menu) {
  if (!button || !menu) return

  const rect = button.getBoundingClientRect()
  const gap = remToPx(MENU_GAP)
  const preferredMax = remToPx(PREFERRED_MAX_HEIGHT)
  const spaceBelow = window.innerHeight - rect.bottom - gap - VIEWPORT_PAD
  const spaceAbove = rect.top - gap - VIEWPORT_PAD
  const needed = Math.min(preferredMax, menu.scrollHeight)
  const openUp = spaceBelow < needed && spaceAbove > spaceBelow
  const maxHeight = Math.min(preferredMax, Math.max(0, openUp ? spaceAbove : spaceBelow))

  menu.style.minWidth = `${rect.width}px`
  menu.style.maxHeight = `${maxHeight}px`

  const menuWidth = menu.offsetWidth
  const maxLeft = window.innerWidth - menuWidth - VIEWPORT_PAD
  menu.style.left = `${Math.max(VIEWPORT_PAD, Math.min(rect.left, maxLeft))}px`

  if (openUp) {
    menu.style.top = 'auto'
    menu.style.bottom = `${window.innerHeight - rect.top + gap}px`
  } else {
    menu.style.bottom = 'auto'
    menu.style.top = `${rect.bottom + gap}px`
  }
}

function scrollOptionIntoMenu(menu, index) {
  const option = menu?.querySelector(`[data-index="${index}"]`)
  if (!menu || !option) return

  const menuRect = menu.getBoundingClientRect()
  const optionRect = option.getBoundingClientRect()

  if (optionRect.bottom > menuRect.bottom) {
    menu.scrollTop += optionRect.bottom - menuRect.bottom
  } else if (optionRect.top < menuRect.top) {
    menu.scrollTop -= menuRect.top - optionRect.top
  }
}

function Select({ className = '', value, onChange, options, labelledBy, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const searchRef = useRef('')
  const searchTimerRef = useRef(0)
  const listId = useId()
  const valueId = useId()

  const selectedIndex = options.findIndex((option) => String(option.value) === String(value))
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0))

  useEffect(() => {
    return () => window.clearTimeout(searchTimerRef.current)
  }, [])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const index = selectedIndex >= 0 ? selectedIndex : 0
    setActiveIndex(index)

    function updatePosition() {
      positionMenu(buttonRef.current, menuRef.current)
    }

    updatePosition()
    scrollOptionIntoMenu(menuRef.current, index)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, selectedIndex])

  function scrollToIndex(index) {
    scrollOptionIntoMenu(menuRef.current, index)
  }

  function selectIndex(index) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function moveActive(nextIndex) {
    if (!options.length) return
    const clamped = (nextIndex + options.length) % options.length
    setActiveIndex(clamped)
    scrollToIndex(clamped)
  }

  function onButtonKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      moveActive(event.key === 'ArrowDown' ? activeIndex + 1 : activeIndex - 1)
      return
    }

    if (open && event.key === 'Home') {
      event.preventDefault()
      moveActive(0)
      return
    }

    if (open && event.key === 'End') {
      event.preventDefault()
      moveActive(options.length - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      selectIndex(activeIndex)
      return
    }

    if (open && event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }

    if (open && event.key === 'Tab') {
      setOpen(false)
      return
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const next = `${searchRef.current}${event.key}`.toLowerCase()
      searchRef.current = next
      window.clearTimeout(searchTimerRef.current)
      searchTimerRef.current = window.setTimeout(() => {
        searchRef.current = ''
      }, 500)

      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(next))
      if (match >= 0) {
        if (!open) setOpen(true)
        setActiveIndex(match)
        requestAnimationFrame(() => scrollToIndex(match))
      }
    }
  }

  const activeId = options[activeIndex] ? `${listId}-${activeIndex}` : undefined

  return (
    <div
      ref={rootRef}
      className={`select${className ? ` ${className}` : ''}${open ? ' select--open' : ''}`}
    >
      <button
        ref={buttonRef}
        type="button"
        className="select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-activedescendant={open ? activeId : undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={onButtonKeyDown}
      >
        <span id={valueId} className="select__value">
          {selected?.label ?? 'Select'}
        </span>
      </button>

      {open && (
        <ul ref={menuRef} id={listId} className="select__menu" role="listbox" tabIndex={-1}>
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value)
            const isActive = index === activeIndex

            return (
              <li
                key={String(option.value)}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                className={`select__option${isSelected ? ' select__option--selected' : ''}${
                  isActive ? ' select__option--active' : ''
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectIndex(index)}
              >
                {option.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Select
