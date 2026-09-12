import { useRef, useState, type PointerEvent } from 'react'
import { CardBody } from '../Canvas/CardBody'
import { CARD_MIME } from '../cardMime'
import type { CanvasCategory } from '../../liveblocks/types'
import { SUGGESTION_LIMIT, SUGGESTION_MIME, suggestionContent, type Suggestion, type SuggestionResults } from '../suggestions'
import { CATEGORY_KIND } from '../categories'

const MIN_WIDTH = 260
const MAX_WIDTH = 600

function SuggestionCard({ category, suggestion, index }: { category: CanvasCategory; suggestion: Suggestion; index: number }) {
  const kind = CATEGORY_KIND[category]
  return (
    <div
      className="side-tab-card suggestion-card"
      role="listitem"
      aria-label={`${suggestion.name}, drag to the canvas`}
      title="Drag this card onto the canvas"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(CARD_MIME, kind)
        event.dataTransfer.setData(SUGGESTION_MIME, JSON.stringify(suggestion))
        event.dataTransfer.setData('text/plain', suggestion.name)
        event.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <div className="suggestion-card-header">
        <span>Option {index + 1}</span>
        <span aria-hidden="true">⠿</span>
      </div>
      <CardBody content={suggestionContent(category, suggestion)} />
      <p className="suggestion-card-description">{suggestion.description}</p>
      <div className="suggestion-card-footer">
        <span>Drag onto canvas</span>
        {suggestion.website && <a href={suggestion.website} target="_blank" rel="noreferrer" draggable={false}>Website ↗</a>}
      </div>
    </div>
  )
}

type SideTabProps = {
  location: string
  locationDraft: string
  onLocationDraftChange: (value: string) => void
  onSearch: () => void
  search: { data?: SuggestionResults; error?: string; loading: boolean; retry: () => void }
  category: CanvasCategory
  width: number
  onResize: (width: number) => void
}

export function SideTab({ category, width, onResize, location, locationDraft, onLocationDraftChange, onSearch, search }: SideTabProps) {
  const resizeStart = useRef<{ pointerId: number; x: number; width: number } | null>(null)
  const [resizing, setResizing] = useState(false)

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
    <aside className={resizing ? 'side-tab side-tab-resizing' : 'side-tab'} aria-label="Card library">
      <div
        className="side-tab-resize-handle"
        role="separator"
        aria-label="Resize card library"
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
        <span>{category} cards</span>
      </div>
      <form className="location-search" onSubmit={(event) => { event.preventDefault(); onSearch() }}>
        <label htmlFor="suggestion-location">Location</label>
        <input
          id="suggestion-location"
          value={locationDraft}
          onChange={(event) => onLocationDraftChange(event.target.value)}
          placeholder="City or neighborhood"
          maxLength={200}
          required
        />
        <button type="submit" disabled={!locationDraft.trim() || search.loading}>
          {search.loading ? 'Searching…' : 'Find 3 options'}
        </button>
      </form>
      <div className="side-tab-body" aria-busy={search.loading}>
        <div role="status" className="side-tab-hint">
          {!location ? 'Enter a location to find places for your trip.' : search.loading
            ? `Finding ${category === 'Food' ? 'restaurants' : category.toLowerCase()} in ${location}…`
            : search.data ? `${search.data.suggestions.length} suggestions in ${location}` : null}
        </div>
        {search.error && <div role="alert" className="suggestion-error">
          <p>{search.error}</p>
          <button type="button" onClick={search.retry}>Try again</button>
        </div>}
        {search.data?.suggestions.length === 0 && <p className="side-tab-hint">No suggestions found. Try a more specific city or neighborhood.</p>}
        {Boolean(search.data?.suggestions.length) && <p className="side-tab-hint">Drag a suggestion onto the canvas</p>}
        <div className="suggestion-card-list" role="list" aria-label={`${category} card options`}>
          {search.data?.suggestions.slice(0, SUGGESTION_LIMIT).map((suggestion, index) => (
            <SuggestionCard key={`${suggestion.name}-${index}`} category={category} suggestion={suggestion} index={index} />
          ))}
        </div>
        {Boolean(search.data?.sources.length) && <details className="suggestion-sources">
          <summary>Search sources</summary>
          {search.data?.sources.map((source, index) => <a key={index} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}
        </details>}

      </div>
    </aside>
  )
}
