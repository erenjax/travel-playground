import { useRef, useState, type PointerEvent } from 'react'
import type { CanvasUser, Card as CardData } from '../../liveblocks/types'

type DragStart = {
  pointerX: number
  pointerY: number
  cardX: number
  cardY: number
}

type CardProps = {
  card: CardData
  myColor: string
  selectedByMe: boolean
  selectedByOthers: CanvasUser[]
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

export function Card({
  card,
  myColor,
  selectedByMe,
  selectedByOthers,
  onSelect,
  onMove,
}: CardProps) {
  const dragStart = useRef<DragStart | null>(null)
  const [dragging, setDragging] = useState(false)

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
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
      Math.max(0, start.cardX + event.clientX - start.pointerX),
      Math.max(0, start.cardY + event.clientY - start.pointerY),
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

  const otherSelector = selectedByOthers[0]
  const ringColor = selectedByMe ? myColor : otherSelector?.color

  return (
    <div
      className={dragging ? 'card card-dragging' : 'card'}
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
    </div>
  )
}
