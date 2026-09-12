import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { CARD_KIND_HINTS, CARD_KIND_LABELS } from '../cardContent'
import { CARD_MIME } from '../cardMime'
import type { CardKind } from '../../liveblocks/types'

const categories = ['Hotels', 'Flights', 'Attractions', 'Food'] as const

/** Each category tab offers the one card kind it stands for. */
const CATEGORY_KIND: Record<(typeof categories)[number], CardKind> = {
  Hotels: 'HotelCard',
  Flights: 'FlightCard',
  Attractions: 'AttractionCard',
  Food: 'FoodCard',
}

/** Not travel searches, so they sit below the tabs and stay reachable from any category. */
const UTILITY_KINDS: readonly CardKind[] = ['BlankCard', 'PhotoCard']

const MIN_WIDTH = 260
const MAX_WIDTH = 600

function CardChip({ kind }: { kind: CardKind }) {
  return (
    <div
      className="side-tab-card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(CARD_MIME, kind)
        event.dataTransfer.setData('text/plain', CARD_KIND_LABELS[kind])
        event.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <span className="side-tab-card-title">{CARD_KIND_LABELS[kind]}</span>
      <span className="side-tab-card-hint">{CARD_KIND_HINTS[kind]}</span>
    </div>
  )
}

type SideTabProps = {
  width: number
  onResize: (width: number) => void
}

export function SideTab({ width, onResize }: SideTabProps) {
  const resizeStart = useRef<{ pointerId: number; x: number; width: number } | null>(null)
  const [resizing, setResizing] = useState(false)
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('Hotels')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

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

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % categories.length
        break
      case 'ArrowLeft':
        nextIndex = (index + categories.length - 1) % categories.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = categories.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    setActiveCategory(categories[nextIndex])
    tabRefs.current[nextIndex]?.focus()
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
        <span>Card categories</span>
      </div>
      <div className="side-tab-categories" role="tablist" aria-label="Card categories">
        {categories.map((category, index) => (
          <button
            key={category}
            ref={(element) => { tabRefs.current[index] = element }}
            type="button"
            role="tab"
            id={`category-tab-${category}`}
            aria-controls={`category-panel-${category}`}
            aria-selected={activeCategory === category}
            tabIndex={activeCategory === category ? 0 : -1}
            className="side-tab-category"
            onClick={() => setActiveCategory(category)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {category}
          </button>
        ))}
      </div>
      {categories.map((category) => (
        <div
          key={category}
          className="side-tab-body"
          role="tabpanel"
          id={`category-panel-${category}`}
          aria-labelledby={`category-tab-${category}`}
          hidden={activeCategory !== category}
          tabIndex={0}
        >
          <h2 className="side-tab-panel-title">{category} category</h2>
          <CardChip kind={CATEGORY_KIND[category]} />
          <p className="side-tab-hint">Drag onto the canvas</p>
        </div>
      ))}
      <div className="side-tab-footer">
        {UTILITY_KINDS.map((kind) => (
          <CardChip key={kind} kind={kind} />
        ))}
      </div>
    </aside>
  )
}
