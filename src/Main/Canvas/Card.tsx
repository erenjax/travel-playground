import { useRef, useState, type PointerEvent } from 'react'
import type { AnchorSide, CanvasUser, Card as CardData } from '../../liveblocks/types'
import { ANCHOR_SIDES } from './edgeGeometry'

type DragStart = {
  pointerX: number
  pointerY: number
  cardX: number
  cardY: number
}

type CardProps = {
  card: CardData
  myColor: string
  zoom: number
  /** While the canvas is being panned, drags belong to the canvas rather than the card. */
  panMode: boolean
  /** Forces anchors visible, so every card is a usable target mid-drag. */
  showAnchors: boolean
  selectedByMe: boolean
  selectedByOthers: CanvasUser[]
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onStartConnect: (cardId: string, side: AnchorSide, event: PointerEvent<HTMLElement>) => void
}

export function Card({
  card,
  myColor,
  zoom,
  panMode,
  showAnchors,
  selectedByMe,
  selectedByOthers,
  onSelect,
  onMove,
  onStartConnect,
}: CardProps) {
  const dragStart = useRef<DragStart | null>(null)
  const [dragging, setDragging] = useState(false)

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || panMode) return
    event.stopPropagation()
    onSelect(card.id)
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      cardX: card.position.x,
      cardY: card.position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current
    if (!start) return
    onMove(
      card.id,
      Math.round(start.cardX + (event.clientX - start.pointerX) / zoom),
      Math.round(start.cardY + (event.clientY - start.pointerY) / zoom),
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

  function handleAnchorPointerDown(side: AnchorSide, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || panMode) return
    // Keeps the card's own drag handler from claiming the pointer, and keeps focus off
    // the button so the space-to-pan shortcut is not swallowed afterwards.
    event.stopPropagation()
    event.preventDefault()
    onStartConnect(card.id, side, event)
  }

  const otherSelector = selectedByOthers[0]
  const ringColor = selectedByMe ? myColor : otherSelector?.color
  const className = ['card', dragging ? 'card-dragging' : '', showAnchors ? 'card-anchored' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      style={{
        transform: `translate(${card.position.x}px, ${card.position.y}px)`,
        boxShadow: ringColor
          ? `0 0 0 2px ${ringColor}, 0 1px 3px rgba(0, 0, 0, 0.12)`
          : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {card.text}
      {otherSelector ? (
        <span className="card-selector" style={{ backgroundColor: otherSelector.color }}>
          {selectedByOthers.map((user) => user.name).join(', ')}
        </span>
      ) : null}

      {ANCHOR_SIDES.map((side) => (
        <button
          key={side}
          type="button"
          className={`card-anchor card-anchor-${side}`}
          // Counter-scales so anchors stay the same size on screen at any zoom.
          style={{ transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
          aria-label={`Draw a connector from the ${side} of this card`}
          onPointerDown={(event) => handleAnchorPointerDown(side, event)}
        />
      ))}
    </div>
  )
}
