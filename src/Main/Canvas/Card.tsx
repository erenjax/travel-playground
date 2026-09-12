import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { scoreOf, voteOf } from '../../lib/cardVotes'
import type { AnchorSide, CanvasUser, Card as CardData, VoteValue } from '../../liveblocks/types'
import { CardBody } from './CardBody'
import { ANCHOR_SIDES, type CardSize } from './edgeGeometry'

type DragStart = {
  pointerX: number
  pointerY: number
  cardX: number
  cardY: number
}

type CardProps = {
  card: CardData
  voterId: string
  myColor: string
  zoom: number
  /** While the canvas is being panned, drags belong to the canvas rather than the card. */
  panMode: boolean
  /** Forces anchors visible, so every card is a usable target mid-drag. */
  showAnchors: boolean
  selectedByMe: boolean
  selectedByOthers: CanvasUser[]
  editing: boolean
  /** Set while someone else holds the card's text, which makes it read-only here. */
  editedByOther?: CanvasUser
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onStartConnect: (cardId: string, side: AnchorSide, event: PointerEvent<HTMLElement>) => void
  onStartEdit: (id: string) => void
  onEndEdit: () => void
  onChangeText: (id: string, text: string) => void
  onVote: (id: string, value: VoteValue) => void
  onDelete: (id: string) => void
  onResize: (id: string, size: CardSize) => void
}

export function Card({
  card,
  voterId,
  myColor,
  zoom,
  panMode,
  showAnchors,
  selectedByMe,
  selectedByOthers,
  editing,
  editedByOther,
  onSelect,
  onMove,
  onStartConnect,
  onStartEdit,
  onEndEdit,
  onChangeText,
  onVote,
  onDelete,
  onResize,
}: CardProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<DragStart | null>(null)
  const [dragging, setDragging] = useState(false)

  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node) return

    const report = () => onResize(card.id, { width: node.offsetWidth, height: node.offsetHeight })
    report()
    const observer = new ResizeObserver(report)
    observer.observe(node)
    return () => observer.disconnect()
  }, [card.id, onResize])

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

  function handleDoubleClick() {
    if (card.content._tag !== 'BlankCard' || editedByOther) return
    onStartEdit(card.id)
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
  const ringColor = selectedByMe ? myColor : (editedByOther?.color ?? otherSelector?.color)
  const className = [
    'card',
    `card-${card.content._tag}`,
    dragging ? 'card-dragging' : '',
    showAnchors ? 'card-anchored' : '',
    editing ? 'card-editing' : '',
    selectedByMe ? 'card-selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const editingText = editing && card.content._tag === 'BlankCard' ? card.content.data.text : null

  return (
    <div
      ref={rootRef}
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
      onDoubleClick={handleDoubleClick}
    >
      <CardVoteRail
        score={scoreOf(card.votes)}
        myValue={voteOf(card.votes, voterId)}
        myColor={myColor}
        onVote={(value) => onVote(card.id, value)}
      />

      {editingText === null ? (
        <CardBody content={card.content} />
      ) : (
        <textarea
          className="card-editor"
          value={editingText}
          autoFocus
          placeholder="Type something"
          // Every keystroke goes to storage so others watch it land live; only one person
          // can be in here at a time, so there is nothing to merge.
          onChange={(event) => onChangeText(card.id, event.target.value)}
          onBlur={onEndEdit}
          onKeyDown={(event) => {
            if (event.key === 'Escape') event.currentTarget.blur()
          }}
          // Clicking to place the caret must not become a card drag.
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}

      {editedByOther ? (
        <span className="card-selector" style={{ backgroundColor: editedByOther.color }}>
          {editedByOther.name} is editing
        </span>
      ) : otherSelector ? (
        <span className="card-selector" style={{ backgroundColor: otherSelector.color }}>
          {selectedByOthers.map((user) => user.name).join(', ')}
        </span>
      ) : null}

      <button
        type="button"
        className="card-delete"
        aria-label="Delete card"
        style={{ transform: `scale(${1 / zoom})` }}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onClick={() => onDelete(card.id)}
      >
        <DeleteIcon />
      </button>

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

function CardVoteRail({
  score,
  myValue,
  myColor,
  onVote,
}: {
  score: number
  myValue: VoteValue | undefined
  myColor: string
  onVote: (value: VoteValue) => void
}) {
  return (
    <div
      className="card-votes"
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={myValue === 1 ? 'card-vote card-vote-on' : 'card-vote'}
        style={myValue === 1 ? { color: myColor } : undefined}
        aria-label="Upvote"
        aria-pressed={myValue === 1}
        onClick={() => onVote(1)}
      >
        <VoteChevron direction="up" />
      </button>
      <span
        className="card-vote-score"
        style={
          myValue === 1
            ? { color: myColor }
            : myValue === -1
              ? { color: 'var(--danger)' }
              : undefined
        }
      >
        {score}
      </span>
      <button
        type="button"
        className={myValue === -1 ? 'card-vote card-vote-on card-vote-down' : 'card-vote'}
        aria-label="Downvote"
        aria-pressed={myValue === -1}
        onClick={() => onVote(-1)}
      >
        <VoteChevron direction="down" />
      </button>
    </div>
  )
}

function DeleteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 5h10M6.5 5V3.5h3V5M4.5 5l.6 8h5.8l.6-8M6.8 7.2v3.6M9.2 7.2v3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function VoteChevron({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg viewBox="0 0 10 7" width="10" height="7" aria-hidden="true">
      <path
        d={direction === 'up' ? 'M1 6 L5 1.5 L9 6' : 'M1 1 L5 5.5 L9 1'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
