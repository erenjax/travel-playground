import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useMutation, useUpdateMyPresence } from '@liveblocks/react/suspense'
import type { PlaceAnchor } from '../../lib/placeAnchor'
import {
  fetchSuggestedPlaces,
  hasGoogleMapsKey,
  type PlaceResult,
} from '../../lib/googleMaps'
import type { CanvasCategory, CardKind } from '../../liveblocks/types'
import { CARD_KIND_HINTS, CARD_KIND_LABELS, defaultContentFor, type PlaceFill } from '../cardContent'
import { serializeCardDrag } from '../cardDrag'
import { CARD_MIME } from '../cardMime'
import { CATEGORY_KIND } from '../categories'

const MIN_WIDTH = 260
const MAX_WIDTH = 600
const SEARCH_DELAY_MS = 220

const SEARCH_PROMPT: Record<CanvasCategory, string> = {
  Hotels: 'Search hotels',
  Attractions: 'Search sights',
  Food: 'Search restaurants',
}

function fillFromResult(result: PlaceResult): PlaceFill {
  return {
    place: result.place,
    ...(result.imageUrl ? { imageUrl: result.imageUrl } : {}),
    ...(result.priceLevel ? { priceLevel: result.priceLevel } : {}),
  }
}

function PlaceChip({
  result,
  kind,
  onAdd,
}: {
  result: PlaceResult
  kind: CardKind
  onAdd: () => void
}) {
  return (
    <button
      type="button"
      className="side-tab-place"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(CARD_MIME, serializeCardDrag(kind, fillFromResult(result)))
        event.dataTransfer.setData('text/plain', result.name)
        event.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={onAdd}
    >
      {result.imageUrl ? (
        <img className="side-tab-place-photo" src={result.imageUrl} alt="" draggable={false} />
      ) : (
        <span className="side-tab-place-photo side-tab-place-photo-empty" aria-hidden="true" />
      )}
      <span className="side-tab-place-copy">
        <span className="side-tab-card-title">{result.name}</span>
        <span className="side-tab-card-hint">{result.address ?? result.place.label}</span>
      </span>
    </button>
  )
}

type SideTabProps = {
  category: CanvasCategory
  width: number
  onResize: (width: number) => void
  anchor: PlaceAnchor | null
  onClearSpot: () => void
}

export function SideTab({ category, width, onResize, anchor, onClearSpot }: SideTabProps) {
  const resizeStart = useRef<{ pointerId: number; x: number; width: number } | null>(null)
  const [resizing, setResizing] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(() =>
    hasGoogleMapsKey() ? '' : 'Add VITE_GOOGLE_API_KEY to search places',
  )
  const updateMyPresence = useUpdateMyPresence()
  const kind = CATEGORY_KIND[category]
  const fromOtherCanvas = Boolean(
    anchor?.source === 'selection' && anchor.sourceCategory && anchor.sourceCategory !== category,
  )

  const addPlaceCard = useMutation(({ storage }, fill?: PlaceFill) => {
    const cards = storage.get('cards')
    let count = 0
    cards.forEach((card) => {
      if (card.content._tag === kind) count += 1
    })
    const id = crypto.randomUUID()
    cards.set(id, {
      id,
      position: { x: 96 + count * 28, y: 96 + count * 28 },
      content: defaultContentFor(kind, fill),
    })
    return id
  }, [kind])

  function addCard(fill?: PlaceFill) {
    const id = addPlaceCard(fill)
    updateMyPresence({ selectedCardId: id, selectedEdgeId: null, editingCardId: null })
  }

  useEffect(() => {
    if (!hasGoogleMapsKey()) return

    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const next = await fetchSuggestedPlaces(query, category, anchor)
        if (cancelled) return
        setResults(next)
        setSearchError(next.length === 0 && query.trim() ? 'No places match that search' : '')
      } catch {
        if (!cancelled) {
          setResults([])
          setSearchError('Place search is unavailable')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, SEARCH_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [anchor, category, query])

  function resizeTo(nextWidth: number) {
    onResize(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, nextWidth)))
  }

  function finishResize(event: PointerEvent<HTMLDivElement>) {
    if (resizeStart.current?.pointerId !== event.pointerId) return
    resizeStart.current = null
    setResizing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <aside className={resizing ? 'side-tab side-tab-resizing' : 'side-tab'} aria-label="Place suggestions">
      <div
        className="side-tab-resize-handle"
        role="separator"
        aria-label="Resize place suggestions"
        aria-orientation="vertical"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        aria-valuetext={`${width} pixels wide`}
        tabIndex={0}
        title="Drag to resize, or use the left and right arrow keys"
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.preventDefault()
          event.currentTarget.focus()
          event.currentTarget.setPointerCapture(event.pointerId)
          resizeStart.current = { pointerId: event.pointerId, x: event.clientX, width }
          setResizing(true)
        }}
        onPointerMove={(event) => {
          const start = resizeStart.current
          if (start?.pointerId !== event.pointerId) return
          resizeTo(start.width + start.x - event.clientX)
        }}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onLostPointerCapture={finishResize}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 50 : 10
          switch (event.key) {
            case 'ArrowLeft': resizeTo(width + step); break
            case 'ArrowRight': resizeTo(width - step); break
            case 'Home': resizeTo(MIN_WIDTH); break
            case 'End': resizeTo(MAX_WIDTH); break
            default: return
          }
          event.preventDefault()
        }}
      />
      <div className="side-tab-header">
        <span>{category}</span>
      </div>
      <div className="side-tab-body" aria-busy={loading}>
        {anchor && (
          <div className={fromOtherCanvas ? 'side-tab-anchor side-tab-anchor-away' : 'side-tab-anchor'}>
            <div className="side-tab-anchor-copy">
              <span className="side-tab-anchor-near">Near {anchor.title}</span>
              {fromOtherCanvas && (
                <span className="side-tab-anchor-from">from {anchor.sourceCategory}</span>
              )}
            </div>
            {anchor.source === 'selection' && (
              <button type="button" className="side-tab-anchor-clear" onClick={onClearSpot}>
                Clear
              </button>
            )}
          </div>
        )}

        <input
          className="side-tab-search"
          type="search"
          value={query}
          placeholder={SEARCH_PROMPT[category]}
          autoComplete="off"
          disabled={!hasGoogleMapsKey()}
          onChange={(event) => setQuery(event.target.value)}
        />

        {loading && <p className="side-tab-hint">Looking around…</p>}
        {searchError && <p className="side-tab-status">{searchError}</p>}
        {!loading && !searchError && !anchor && !query.trim() && (
          <p className="side-tab-hint">
            Select a place on a canvas, or search for a {CARD_KIND_LABELS[kind].toLowerCase()}.
          </p>
        )}

        <div className="side-tab-places">
          {results.map((result) => (
            <PlaceChip
              key={result.placeId}
              result={result}
              kind={kind}
              onAdd={() => addCard(fillFromResult(result))}
            />
          ))}
        </div>

        <button
          type="button"
          className="side-tab-card"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(CARD_MIME, serializeCardDrag(kind))
            event.dataTransfer.setData('text/plain', CARD_KIND_LABELS[kind])
            event.dataTransfer.effectAllowed = 'copy'
          }}
          onClick={() => addCard()}
        >
          <span className="side-tab-card-title">Empty {CARD_KIND_LABELS[kind].toLowerCase()}</span>
          <span className="side-tab-card-hint">{CARD_KIND_HINTS[kind]}</span>
        </button>
        <p className="side-tab-hint">Drag onto the canvas, or click to add</p>
      </div>
    </aside>
  )
}
