import { useRef, useState, type PointerEvent } from 'react'
import { CARD_KIND_HINTS, CARD_KIND_LABELS } from '../cardContent'
import { CARD_MIME } from '../cardMime'
import type { CardKind, CanvasCategory } from '../../liveblocks/types'
import { CATEGORY_KIND } from '../categories'

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
  category: CanvasCategory
  width: number
  onResize: (width: number) => void
}

export function SideTab({ category, width, onResize }: SideTabProps) {
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
      <div className="side-tab-body">
        <CardChip kind={CATEGORY_KIND[category]} />
        <p className="side-tab-hint">Drag onto the {category.toLowerCase()} canvas</p>
      </div>
    </aside>
  )
}
