import { shallow } from '@liveblocks/client'
import {
  useMutation,
  useOthers,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from '@liveblocks/react/suspense'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { Card } from './Card'
import { RemoteCursor } from './RemoteCursor'
import { screenToWorld, useCamera } from './useCamera'
import { ZoomControls } from './ZoomControls'

const CARD_WIDTH = 160
const CARD_HEIGHT = 56
const GRID_SIZE = 24

/** A pan shorter than this still counts as a click, so clicking empty space deselects. */
const PAN_CLICK_SLOP = 4

type PanStart = {
  pointerX: number
  pointerY: number
  moved: boolean
}

export type CanvasHandle = {
  addCard: () => void
}

export const Canvas = forwardRef<CanvasHandle>(function Canvas(_props, ref) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const panStart = useRef<PanStart | null>(null)
  const [panning, setPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)

  const { camera, canZoomIn, canZoomOut, panBy, zoomBy, zoomIn, zoomOut, resetCamera } =
    useCamera()

  const cards = useStorage((root) => root.cards)
  const others = useOthers()
  const updateMyPresence = useUpdateMyPresence()
  const myUser = useSelf((me) => me.presence.user, shallow)
  const mySelectedCardId = useSelf((me) => me.presence.selectedCardId)

  const addCard = useMutation(
    ({ storage }) => {
      const cards = storage.get('cards')
      const viewport = viewportRef.current
      const center = screenToWorld(camera, {
        x: (viewport?.clientWidth ?? 960) / 2,
        y: (viewport?.clientHeight ?? 600) / 2,
      })
      const offset = (cards.size % 6) * 28
      const id = crypto.randomUUID()

      cards.set(id, {
        id,
        text: 'New card',
        position: {
          x: Math.round(center.x - CARD_WIDTH / 2) + offset,
          y: Math.round(center.y - CARD_HEIGHT / 2) + offset,
        },
      })
    },
    [camera],
  )

  useImperativeHandle(ref, () => ({ addCard }), [addCard])

  const moveCard = useMutation(({ storage }, id: string, x: number, y: number) => {
    const cards = storage.get('cards')
    const card = cards.get(id)
    if (!card) return
    cards.set(id, { ...card, position: { x, y } })
  }, [])

  // Scroll pans and ctrl/⌘+scroll (including trackpad pinch) zooms. Registered manually
  // because React's wheel listener is passive, so it cannot preventDefault page zoom.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1

      if (event.ctrlKey || event.metaKey) {
        zoomBy(Math.exp((-event.deltaY * scale) / 120), anchor)
      } else {
        panBy(-event.deltaX * scale, -event.deltaY * scale)
      }
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [panBy, zoomBy])

  // Holding space turns the whole surface into a pan handle, cards included.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.matches('input, textarea, button')) return
      event.preventDefault()
      setSpaceHeld(true)
    }

    function release() {
      setSpaceHeld(false)
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === 'Space') release()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', release)
    }
  }, [])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const middleClick = event.button === 1
    if (event.button !== 0 && !middleClick) return

    panStart.current = { pointerX: event.clientX, pointerY: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPanning(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const start = panStart.current

    if (start) {
      const dx = event.clientX - start.pointerX
      const dy = event.clientY - start.pointerY
      if (!start.moved && Math.hypot(dx, dy) > PAN_CLICK_SLOP) start.moved = true
      start.pointerX = event.clientX
      start.pointerY = event.clientY
      panBy(dx, dy)
    }

    const world = screenToWorld(camera, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
    updateMyPresence({ cursor: { x: Math.round(world.x), y: Math.round(world.y) } })
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = panStart.current
    if (!start) return

    panStart.current = null
    setPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!start.moved && event.button === 0) {
      updateMyPresence({ selectedCardId: null })
    }
  }

  const panMode = spaceHeld || panning
  const viewportClass = panning
    ? 'canvas canvas-panning'
    : spaceHeld
      ? 'canvas canvas-pan-ready'
      : 'canvas'

  return (
    <div
      ref={viewportRef}
      className={viewportClass}
      style={{
        backgroundSize: `${GRID_SIZE * camera.zoom}px ${GRID_SIZE * camera.zoom}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => updateMyPresence({ cursor: null })}
    >
      <div
        className="canvas-world"
        style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
      >
        {Object.values(cards).map((card) => (
          <Card
            key={card.id}
            card={card}
            myColor={myUser.color}
            zoom={camera.zoom}
            panMode={panMode}
            selectedByMe={mySelectedCardId === card.id}
            selectedByOthers={others
              .filter(({ presence }) => presence.selectedCardId === card.id)
              .map(({ presence }) => presence.user)}
            onSelect={(id) => updateMyPresence({ selectedCardId: id })}
            onMove={moveCard}
          />
        ))}

        {others.map(({ connectionId, presence }) =>
          presence.cursor ? (
            <RemoteCursor
              key={connectionId}
              x={presence.cursor.x}
              y={presence.cursor.y}
              zoom={camera.zoom}
              name={presence.user.name}
              color={presence.user.color}
            />
          ) : null,
        )}
      </div>

      <ZoomControls
        zoom={camera.zoom}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onZoomIn={() => zoomIn(viewportCenter(viewportRef.current))}
        onZoomOut={() => zoomOut(viewportCenter(viewportRef.current))}
        onReset={resetCamera}
      />
    </div>
  )
})

function viewportCenter(viewport: HTMLDivElement | null) {
  return {
    x: (viewport?.clientWidth ?? 960) / 2,
    y: (viewport?.clientHeight ?? 600) / 2,
  }
}
