import { shallow } from '@liveblocks/client'
import {
  useMutation,
  useOthers,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from '@liveblocks/react/suspense'
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import type { AnchorSide, CanvasCategory, CanvasUser, CardContent, Edge, EdgeEndpoint, VoteValue } from '../../liveblocks/types'
import { toggleCardVote } from '../../lib/cardVotes'
import { edgeIdsAttachedTo } from '../../lib/removeCard'
import { getVoterId } from '../../lib/voterId'
import { defaultContentFor, parseCardKind } from '../cardContent'
import { parseSuggestions, suggestionContent, SUGGESTION_MIME } from '../suggestions'
import { CATEGORY_KIND } from '../categories'
import { CARD_MIME } from '../cardMime'
import { Card } from './Card'
import { EdgeLayer, type DraftEdge } from './EdgeLayer'
import { EdgeToolbar } from './EdgeToolbar'
import {
  anchorPoint,
  CARD_HEIGHT,
  CARD_WIDTH,
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_THICKNESS,
  edgeMidpoint,
  endpointPoint,
  findDropTarget,
  NEW_EDGE_ARROW,
  sizeOf,
  type CardSize,
  type CardSizeMap,
} from './edgeGeometry'
import { RemoteCursor } from './RemoteCursor'
import { screenToWorld, useCamera, worldToScreen } from './useCamera'
import { ZoomControls } from './ZoomControls'

const GRID_SIZE = 24

/** A pan shorter than this still counts as a click, so clicking empty space deselects. */
const PAN_CLICK_SLOP = 4

type PanStart = {
  pointerX: number
  pointerY: number
  moved: boolean
}

function isCardDrag(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes(CARD_MIME)
}

type CanvasProps = {
  category: CanvasCategory
  cameraControls: ReturnType<typeof useCamera>
}

export function Canvas({ category, cameraControls }: CanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const panStart = useRef<PanStart | null>(null)
  const [panning, setPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [draft, setDraft] = useState<DraftEdge | null>(null)
  const [cardSizes, setCardSizes] = useState<CardSizeMap>({})

  const { camera, canZoomIn, canZoomOut, panBy, zoomBy, zoomIn, zoomOut, resetCamera } =
    cameraControls

  const allCards = useStorage((root) => root.cards)
  const allEdges = useStorage((root) => root.edges)
  const cards = useMemo(() => Object.fromEntries(
    Object.entries(allCards).filter(([, card]) => card.content._tag === CATEGORY_KIND[category]),
  ), [allCards, category])
  const edges = useMemo(() => Object.fromEntries(
    Object.entries(allEdges).filter(([, edge]) => cards[edge.from.cardId] && cards[edge.to.cardId]),
  ), [allEdges, cards])
  const allOthers = useOthers()
  const others = useMemo(() => allOthers.filter(
    ({ presence }) => (presence.activeCategory ?? 'Hotels') === category,
  ), [allOthers, category])
  const updateMyPresence = useUpdateMyPresence()
  const myUser = useSelf((me) => me.presence.user, shallow) as CanvasUser
  const myConnectionId = useSelf((me) => me.connectionId)
  const mySelectedCardId = useSelf((me) => me.presence.selectedCardId)
  const mySelectedEdgeId = useSelf((me) => me.presence.selectedEdgeId)
  const myEditingCardId = useSelf((me) => me.presence.editingCardId)
  const voterId = useMemo(() => getVoterId(), [])

  const addCardAt = useMutation(({ storage }, content: CardContent, x: number, y: number) => {
    const cards = storage.get('cards')
    const id = crypto.randomUUID()

    cards.set(id, {
      id,
      position: { x: Math.round(x), y: Math.round(y) },
      content,
    })

    return id
  }, [])

  /** Only blank cards carry free text, so nothing else can be retagged by accident. */
  const updateCardText = useMutation(({ storage }, id: string, text: string) => {
    const cards = storage.get('cards')
    const card = cards.get(id)
    if (!card || card.content._tag !== 'BlankCard') return
    cards.set(id, { ...card, content: { _tag: 'BlankCard', data: { text } } })
  }, [])

  const moveCard = useMutation(({ storage }, id: string, x: number, y: number) => {
    const cards = storage.get('cards')
    const card = cards.get(id)
    if (!card) return
    cards.set(id, { ...card, position: { x, y } })
  }, [])

  const setCardVote = useMutation(
    ({ storage }, id: string, voterId: string, name: string, value: VoteValue) => {
      const cards = storage.get('cards')
      const card = cards.get(id)
      if (!card) return
      const votes = toggleCardVote(card.votes, voterId, name, value)
      cards.set(id, votes
        ? { ...card, votes }
        : { id: card.id, position: card.position, content: card.content })
    },
    [],
  )

  const addEdge = useMutation(({ storage }, from: EdgeEndpoint, to: EdgeEndpoint) => {
    const id = crypto.randomUUID()
    storage.get('edges').set(id, {
      id,
      from,
      to,
      color: DEFAULT_EDGE_COLOR,
      thickness: DEFAULT_EDGE_THICKNESS,
      arrow: NEW_EDGE_ARROW,
    })
  }, [])

  const styleEdge = useMutation(
    ({ storage }, id: string, patch: Partial<Pick<Edge, 'color' | 'thickness' | 'arrow'>>) => {
      const edges = storage.get('edges')
      const edge = edges.get(id)
      if (!edge) return
      edges.set(id, { ...edge, ...patch })
    },
    [],
  )

  /** Reverses direction, which is what turns a head at `to` into a head at `from`. */
  const flipEdge = useMutation(({ storage }, id: string) => {
    const edges = storage.get('edges')
    const edge = edges.get(id)
    if (!edge) return
    edges.set(id, { ...edge, from: edge.to, to: edge.from })
  }, [])

  const removeEdge = useMutation(({ storage }, id: string) => {
    storage.get('edges').delete(id)
  }, [])

  const removeCard = useMutation(({ storage }, id: string) => {
    const cards = storage.get('cards')
    if (!cards.get(id)) return
    const edges = storage.get('edges')
    const attached: Edge[] = []
    edges.forEach((edge) => attached.push(edge))
    for (const edgeId of edgeIdsAttachedTo(attached, id)) {
      edges.delete(edgeId)
    }
    cards.delete(id)
  }, [])

  const rememberCardSize = useCallback((id: string, size: CardSize) => {
    setCardSizes((current) => {
      const previous = current[id]
      if (previous && previous.width === size.width && previous.height === size.height) {
        return current
      }
      return { ...current, [id]: size }
    })
  }, [])

  /** Who is editing which card, keyed by card id, from everyone else's presence. */
  const editors = useMemo(() => {
    const claims: Record<string, { user: CanvasUser; connectionId: number }> = {}
    for (const { connectionId, presence } of others) {
      const cardId = presence.editingCardId
      if (!cardId) continue
      const held = claims[cardId]
      if (!held || connectionId < held.connectionId) {
        claims[cardId] = { user: presence.user, connectionId }
      }
    }
    return claims
  }, [others])

  // Presence is a broadcast rather than a real lock, so two people can claim the same card
  // in the same instant. The lowest connection id keeps it; everyone else drops to viewing.
  useEffect(() => {
    if (!myEditingCardId) return
    const rival = editors[myEditingCardId]
    if (rival && rival.connectionId < myConnectionId) {
      updateMyPresence({ editingCardId: null })
    }
  }, [myEditingCardId, editors, myConnectionId, updateMyPresence])

  function startEdit(cardId: string) {
    if (editors[cardId]) return
    updateMyPresence({ editingCardId: cardId, selectedCardId: cardId, selectedEdgeId: null })
  }

  function stopEdit() {
    updateMyPresence({ editingCardId: null })
  }

  function deleteSelectedEdge() {
    if (!mySelectedEdgeId) return
    removeEdge(mySelectedEdgeId)
    updateMyPresence({ selectedEdgeId: null })
  }

  const deleteCard = useCallback((id: string) => {
    removeCard(id)
    updateMyPresence({
      selectedCardId: mySelectedCardId === id ? null : mySelectedCardId,
      editingCardId: myEditingCardId === id ? null : myEditingCardId,
    })
  }, [removeCard, updateMyPresence, mySelectedCardId, myEditingCardId])

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

  // Delete removes the selected connector or card. Only bound while something is
  // selected, so it stays out of the way of the rest of the app.
  useEffect(() => {
    const selectedEdgeId = mySelectedEdgeId
    const selectedCardId = mySelectedCardId
    if (!selectedEdgeId && !selectedCardId) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.matches('input, textarea')) return
      event.preventDefault()
      if (selectedEdgeId) {
        removeEdge(selectedEdgeId)
        updateMyPresence({ selectedEdgeId: null })
        return
      }
      if (selectedCardId) {
        deleteCard(selectedCardId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mySelectedEdgeId, mySelectedCardId, removeEdge, deleteCard, updateMyPresence])

  function startConnect(cardId: string, side: AnchorSide, event: PointerEvent<HTMLElement>) {
    const viewport = viewportRef.current
    const card = cards[cardId]
    if (!viewport || !card) return

    // Capturing on the viewport keeps move/up events coming here even once the pointer
    // leaves the source card, so the drop target can be resolved from the cursor.
    viewport.setPointerCapture(event.pointerId)
    setDraft({ from: { cardId, side }, to: null, cursor: anchorPoint(card, side, sizeOf(cardSizes, cardId)) })
    updateMyPresence({ selectedCardId: null, selectedEdgeId: null })
  }

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

    setDraft((current) =>
      current
        ? { ...current, cursor: world, to: findDropTarget(cards, world, current.from.cardId, cardSizes) }
        : null,
    )
  }

  /** `commit` is false for a cancelled pointer, which should discard the drag instead. */
  function finishPointer(event: PointerEvent<HTMLDivElement>, commit: boolean) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    // A connector drag never starts a pan, so it is resolved before the pan bookkeeping.
    if (draft) {
      setDraft(null)
      if (commit && draft.to) addEdge(draft.from, draft.to)
      return
    }

    const start = panStart.current
    if (!start) return

    panStart.current = null
    setPanning(false)
    if (commit && !start.moved && event.button === 0) {
      updateMyPresence({ selectedCardId: null, selectedEdgeId: null })
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isCardDrag(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!isCardDrag(event.dataTransfer)) return
    event.preventDefault()
    setDropActive(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setDropActive(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDropActive(false)
    if (!isCardDrag(event.dataTransfer)) return

    const rect = event.currentTarget.getBoundingClientRect()
    const world = screenToWorld(camera, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })

    const kind = parseCardKind(event.dataTransfer.getData(CARD_MIME))
    if (kind !== CATEGORY_KIND[category]) return
    let content = defaultContentFor(kind)
    const suggestionPayload = event.dataTransfer.getData(SUGGESTION_MIME)
    if (suggestionPayload) {
      try {
        const [suggestion] = parseSuggestions([JSON.parse(suggestionPayload)])
        content = suggestionContent(category, suggestion)
      } catch { return }
    }
    addCardAt(content, world.x - CARD_WIDTH / 2, world.y - CARD_HEIGHT / 2)


  }

  const panMode = spaceHeld || panning
  const viewportClass = [
    'canvas',
    panning ? 'canvas-panning' : spaceHeld ? 'canvas-pan-ready' : '',
    dropActive ? 'canvas-drop-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const selectedEdge = mySelectedEdgeId ? edges[mySelectedEdgeId] : undefined

  /** Halo color per selected edge, so other people's selections are visible too. */
  const edgeSelection = useMemo(() => {
    const colors: Record<string, string> = {}
    for (const { presence } of others) {
      if (presence.selectedEdgeId) colors[presence.selectedEdgeId] = presence.user.color
    }
    if (mySelectedEdgeId) colors[mySelectedEdgeId] = myUser.color
    return colors
  }, [others, mySelectedEdgeId, myUser.color])

  const toolbarPosition = useMemo(() => {
    if (!selectedEdge) return null
    const from = endpointPoint(cards, selectedEdge.from, cardSizes)
    const to = endpointPoint(cards, selectedEdge.to, cardSizes)
    if (!from || !to) return null
    const midpoint = edgeMidpoint(from, selectedEdge.from.side, to, selectedEdge.to.side)
    return worldToScreen(camera, midpoint)
  }, [selectedEdge, cards, cardSizes, camera])

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
      onPointerUp={(event) => finishPointer(event, true)}
      onPointerCancel={(event) => finishPointer(event, false)}
      onPointerLeave={() => updateMyPresence({ cursor: null })}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="canvas-world"
        style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
      >
        <EdgeLayer
          edges={Object.values(edges)}
          cards={cards}
          sizes={cardSizes}
          zoom={camera.zoom}
          draft={draft}
          selection={edgeSelection}
          onSelect={(id) => updateMyPresence({ selectedEdgeId: id, selectedCardId: null })}
        />

        {Object.values(cards).map((card) => (
          <CardErrorBoundary key={card.id}>
            <Card
              card={card}
              voterId={voterId}
              myColor={myUser.color}
              zoom={camera.zoom}
              panMode={panMode}
              showAnchors={draft !== null}
              selectedByMe={mySelectedCardId === card.id}
              selectedByOthers={others
                .filter(({ presence }) => presence.selectedCardId === card.id)
                .map(({ presence }) => presence.user)}
              editing={myEditingCardId === card.id}
              editedByOther={editors[card.id]?.user}
              onSelect={(id) => updateMyPresence({ selectedCardId: id, selectedEdgeId: null })}
              onMove={moveCard}
              onStartConnect={startConnect}
              onStartEdit={startEdit}
              onEndEdit={stopEdit}
              onChangeText={updateCardText}
              onVote={(id, value) => setCardVote(id, getVoterId(), myUser.name, value)}
              onDelete={deleteCard}
              onResize={rememberCardSize}
            />
          </CardErrorBoundary>
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

      {selectedEdge && toolbarPosition && !draft ? (
        <EdgeToolbar
          edge={selectedEdge}
          x={toolbarPosition.x}
          y={toolbarPosition.y}
          onChangeColor={(color) => styleEdge(selectedEdge.id, { color })}
          onChangeThickness={(thickness) => styleEdge(selectedEdge.id, { thickness })}
          onChangeArrow={(arrow) => styleEdge(selectedEdge.id, { arrow })}
          onFlip={() => flipEdge(selectedEdge.id)}
          onDelete={deleteSelectedEdge}
        />
      ) : null}

      <div className="canvas-controls">
        <ZoomControls
          zoom={camera.zoom}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          onZoomIn={() => zoomIn(viewportCenter(viewportRef.current))}
          onZoomOut={() => zoomOut(viewportCenter(viewportRef.current))}
          onReset={resetCamera}
        />
      </div>
    </div>
  )
}

function viewportCenter(viewport: HTMLDivElement | null) {
  return {
    x: (viewport?.clientWidth ?? 960) / 2,
    y: (viewport?.clientHeight ?? 600) / 2,
  }
}

class CardErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
