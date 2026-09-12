import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useStorage, useUpdateMyPresence } from '@liveblocks/react/suspense'
import { Link, useParams } from 'react-router-dom'
import type { CanvasCategory } from '../liveblocks/types'
import { formatTripRange } from '../lib/tripDraft'
import { Canvas } from './Canvas/Canvas'
import { useCamera } from './Canvas/useCamera'
import { SideTab } from './Bars/SideTab'
import { useSuggestions } from '../hooks/useSuggestions'
import { CATEGORIES } from './categories'

export function Main() {
  const [location, setLocation] = useState('')
  const [locationDraft, setLocationDraft] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [category, setCategory] = useState<CanvasCategory>('Hotels')
  const [copied, setCopied] = useState(false)
  const search = useSuggestions(category, location)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const updateMyPresence = useUpdateMyPresence()
  const cameraControls = useCamera(category)
  const { roomId } = useParams()
  const destination = useStorage((root) => root.destination)
  const startDate = useStorage((root) => root.startDate)
  const endDate = useStorage((root) => root.endDate)
  const dateLabel = formatTripRange(startDate ?? '', endDate ?? '')
  const placeLabel = destination?.label.trim() ?? ''

  function selectCategory(next: CanvasCategory) {
    if (next === category) return
    updateMyPresence({
      activeCategory: next,
      cursor: null,
      selectedCardId: null,
      selectedEdgeId: null,
      editingCardId: null,
    })
    setCategory(next)
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % CATEGORIES.length; break
      case 'ArrowLeft': next = (index + CATEGORIES.length - 1) % CATEGORIES.length; break
      case 'Home': next = 0; break
      case 'End': next = CATEGORIES.length - 1; break
      default: return
    }
    event.preventDefault()
    selectCategory(CATEGORIES[next])
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="app">
      <header className="canvas-top-bar">
        <Link to="/" className="canvas-home-link">
          All trips
        </Link>
        {(placeLabel || dateLabel) && (
          <p className="canvas-trip-meta">
            {placeLabel && <span>{placeLabel}</span>}
            {placeLabel && dateLabel && <span aria-hidden="true"> · </span>}
            {dateLabel && <span>{dateLabel}</span>}
          </p>
        )}
        <span className="canvas-top-bar-label">Canvases</span>
        <div className="canvas-tabs" role="tablist" aria-label="Travel canvases">
          {CATEGORIES.map((item, index) => (
            <button
              key={item}
              ref={(element) => { tabRefs.current[index] = element }}
              type="button"
              role="tab"
              id={`canvas-tab-${item}`}
              aria-controls={`canvas-panel-${item}`}
              aria-selected={category === item}
              tabIndex={category === item ? 0 : -1}
              className="canvas-tab"
              onClick={() => selectCategory(item)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {item}
            </button>
          ))}
        </div>
        {roomId && (
          <button
            type="button"
            className="canvas-invite"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}/r/${roomId}`)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            }}
          >
            {copied ? 'Copied' : 'Copy invite'}
          </button>
        )}
      </header>
      {CATEGORIES.map((item) => (
        <div
          key={item}
          className="app-body"
          role="tabpanel"
          id={`canvas-panel-${item}`}
          aria-labelledby={`canvas-tab-${item}`}
          hidden={category !== item}
          tabIndex={0}
          style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
        >
          {category === item && (
            <>
              <Canvas category={item} cameraControls={cameraControls} />
              <SideTab
                category={item}
                width={sidebarWidth}
                onResize={setSidebarWidth}
                location={location}
                locationDraft={locationDraft}
                onLocationDraftChange={setLocationDraft}
                onSearch={() => {
                  const next = locationDraft.trim()
                  if (!next) return
                  if (next === location) search.retry()
                  else setLocation(next)
                }}
                search={search}
              />
            </>
          )}
        </div>
      ))}
    </div>
  )
}
