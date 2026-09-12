import { useRef, useState, type PointerEvent } from 'react'
import type { Sticker as StickerData } from '../../liveblocks/types'

type DragStart = {
  pointerX: number
  pointerY: number
  x: number
  y: number
}

type StickerProps = {
  sticker: StickerData
  zoom: number
  /** While the canvas is being panned, drags belong to the canvas rather than the sticker. */
  panMode: boolean
  selected: boolean
  selectionColor: string
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
}

/** An emoji on the board. Drags like a card, minus votes, anchors, and editing. */
export function Sticker({ sticker, zoom, panMode, selected, selectionColor, onSelect, onMove, onDelete }: StickerProps) {
  const dragStart = useRef<DragStart | null>(null)
  const [dragging, setDragging] = useState(false)

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || panMode) return
    event.stopPropagation()
    onSelect(sticker.id)
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: sticker.position.x,
      y: sticker.position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current
    if (!start) return
    onMove(
      sticker.id,
      Math.round(start.x + (event.clientX - start.pointerX) / zoom),
      Math.round(start.y + (event.clientY - start.pointerY) / zoom),
    )
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return
    dragStart.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const className = ['sticker', dragging ? 'sticker-dragging' : '', selected ? 'sticker-selected' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      style={{
        transform: `translate(${sticker.position.x}px, ${sticker.position.y}px)`,
        fontSize: `${sticker.size}px`,
        boxShadow: selected ? `0 0 0 ${2 / zoom}px ${selectionColor}` : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="sticker-emoji" aria-label={`Sticker ${sticker.emoji}`}>{sticker.emoji}</span>
      <button
        type="button"
        className="sticker-delete"
        aria-label="Delete sticker"
        style={{ transform: `scale(${1 / zoom})` }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onDelete(sticker.id)}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
