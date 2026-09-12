import { useEffect, useId, useRef, useState } from 'react'
import type { Place } from '../../liveblocks/types'
import {
  createAutocompleteSession,
  fetchPlaceSuggestions,
  hasGoogleMapsKey,
  type PlaceSuggestion,
} from '../../lib/googleMaps'

const SEARCH_DELAY_MS = 220

type PlaceSearchProps = {
  id: string
  value: Place | null
  onChange: (place: Place | null) => void
}

export function PlaceSearch({ id, value, onChange }: PlaceSearchProps) {
  const listId = useId()
  const [query, setQuery] = useState(value?.label ?? '')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [searchError, setSearchError] = useState('')
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const trimmed = query.trim()
  const canSearch = hasGoogleMapsKey() && trimmed.length >= 2 && trimmed !== value?.label
  const status = hasGoogleMapsKey() ? searchError : 'Add VITE_GOOGLE_API_KEY to search places'

  useEffect(() => {
    if (!canSearch) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        sessionRef.current ??= await createAutocompleteSession()
        const next = await fetchPlaceSuggestions(trimmed, sessionRef.current)
        if (cancelled) return
        setSuggestions(next)
        setActiveIndex(0)
        setOpen(next.length > 0)
        setSearchError('')
      } catch {
        if (!cancelled) {
          setSuggestions([])
          setOpen(false)
          setSearchError('Place search is unavailable')
        }
      }
    }, SEARCH_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [canSearch, trimmed])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  async function choose(suggestion: PlaceSuggestion) {
    try {
      const place = await suggestion.resolve()
      sessionRef.current = null
      onChange(place)
      setQuery(place.label)
      setSuggestions([])
      setOpen(false)
      setSearchError('')
    } catch {
      setSearchError('Could not load that place')
    }
  }

  return (
    <div className="place-search" ref={rootRef}>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && canSearch}
        aria-controls={listId}
        aria-activedescendant={open && canSearch ? `${listId}-${activeIndex}` : undefined}
        value={query}
        placeholder="Kyoto, Japan"
        autoComplete="off"
        disabled={!hasGoogleMapsKey()}
        onChange={(event) => {
          setQuery(event.target.value)
          if (value) onChange(null)
        }}
        onFocus={() => {
          if (canSearch && suggestions.length > 0) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (!open || !canSearch || suggestions.length === 0) return
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((index) => (index + 1) % suggestions.length)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            void choose(suggestions[activeIndex])
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && canSearch && (
        <ul className="place-search-list" id={listId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.placeId} role="presentation">
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className="place-search-item"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void choose(suggestion)}
              >
                <span className="place-search-primary">{suggestion.primary}</span>
                {suggestion.secondary && (
                  <span className="place-search-secondary">{suggestion.secondary}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {status && <p className="home-status">{status}</p>}
    </div>
  )
}
