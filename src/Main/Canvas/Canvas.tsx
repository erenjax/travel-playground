import { LiveMap, shallow } from '@liveblocks/client'
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
import type {
  AnchorSide,
  CanvasCategory,
  CanvasUser,
  CardContent,
  Edge,
  EdgeEndpoint,
  Sticker as StickerData,
  Stroke,
  VoteValue,
} from '../../liveblocks/types'
import { toggleCardVote } from '../../lib/cardVotes'
import { edgeIdsAttachedTo } from '../../lib/removeCard'
import { getVoterId } from '../../lib/voterId'
import { defaultContentFor } from '../cardContent'
import { parseCardDrag } from '../cardDrag'
import { CATEGORY_KIND } from '../categories'
import { CARD_MIME } from '../cardMime'
import { BoardToolbar, type Tool } from './BoardToolbar'
import {
  DEFAULT_NOTE_COLOR,
  DEFAULT_PEN_COLOR,
  DEFAULT_PEN_WIDTH,
  STICKER_SIZE,
  STICKERS,
  strokeHit,
} from './boardGeometry'
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
import { Sticker } from './Sticker'
import { StrokeLayer } from './StrokeLayer'
import { screenToWorld, useCamera, worldToScreen, type Point } from './useCamera'
import { ZoomControls } from './ZoomControls'

const GRID_SIZE = 24

/** A pan shorter than this still counts as a click, so clicking empty space deselects. */
const PAN_CLICK_SLOP = 4

type PanStart = {
  pointerX: number
  pointerY: number
  moved: boolean
}

/** How close, in screen pixels, the eraser has to pass to a stroke to remove it. */
const ERASE_REACH = 10

/** Strokes and stickers are selected locally; only cards and connectors go through presence. */
type BoardSelection = { kind: 'stroke' | 'sticker'; id: string } | null

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
  const [tool, setTool] = useState<Tool>('select')
  const [noteColor, setNoteColor] = useState(DEFAULT_NOTE_COLOR)
  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLOR)
  const [penWidth, setPenWidth] = useState(DEFAULT_PEN_WIDTH)
  const [stickerEmoji, setStickerEmoji] = useState(STICKERS[0])
  const [draftStroke, setDraftStroke] = useState<Stroke | null>(null)
  const [boardSelection, setBoardSelection] = useState<BoardSelection>(null)
  /** Set while the eraser is held down, so moving over ink removes it. */
  const erasing = useRef(false)

  const { camera, canZoomIn, canZoomOut, panBy, zoomBy, zoomIn, zoomOut, resetCamera } =
    cameraControls

  const allCards = useStorage((root) => root.cards)
  const allEdges = useStorage((root) => root.edges)
  const allStrokes = useStorage((root) => root.strokes)
  const allStickers = useStorage((root) => root.stickers)
  // Notes belong to the tab they were written on, alongside that tab's place cards.
  const cards = useMemo(() => Object.fromEntries(
    Object.entries(allCards).filter(([, card]) =>
      card.content._tag === CATEGORY_KIND[category]
      || (card.content._tag === 'BlankCard' && card.content.data.category === category)),
  ), [allCards, category])
  const strokes = useMemo(
    () => Object.values(allStrokes ?? {}).filter((stroke) => stroke.category === category),
    [allStrokes, category],
  )
  const stickers = useMemo(
    () => Object.values(allStickers ?? {}).filter((sticker) => sticker.category === category),
    [allStickers, category],
  )
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
    cards.set(id, { ...card, content: { _tag: 'BlankCard', data: { ...card.content.data, text } } })
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

  // Rooms made before drawing existed have no stroke or sticker maps, so mutations create
  // them on first use rather than assuming they are there.
  const addStroke = useMutation(({ storage }, stroke: Stroke) => {
    let strokes = storage.get('strokes')
    if (!strokes) {
      strokes = new LiveMap<string, Stroke>()
      storage.set('strokes', strokes)
    }
    strokes.set(stroke.id, stroke)
  }, [])

  const removeStrokes = useMutation(({ storage }, ids: readonly string[]) => {
    const strokes = storage.get('strokes')
    if (!strokes) return
    for (const id of ids) strokes.delete(id)
  }, [])

  const addSticker = useMutation(({ storage }, sticker: StickerData) => {
    let stickers = storage.get('stickers')
    if (!stickers) {
      stickers = new LiveMap<string, StickerData>()
      storage.set('stickers', stickers)
    }
    stickers.set(sticker.id, sticker)
  }, [])

  const moveSticker = useMutation(({ storage }, id: string, x: number, y: number) => {
    const stickers = storage.get('stickers')
    const sticker = stickers?.get(id)
    if (!stickers || !sticker) return
    stickers.set(id, { ...sticker, position: { x, y } })
  }, [])

  const removeSticker = useMutation(({ storage }, id: string) => {
    storage.get('stickers')?.delete(id)
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
    if (!selectedEdgeId && !selectedCardId && !boardSelection) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.matches('input, textarea')) return
      event.preventDefault()
      if (boardSelection) {
        if (boardSelection.kind === 'stroke') removeStrokes([boardSelection.id])
        else removeSticker(boardSelection.id)
        setBoardSelection(null)
        return
      }
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
  }, [mySelectedEdgeId, mySelectedCardId, boardSelection, removeEdge, removeStrokes, removeSticker, deleteCard, updateMyPresence])

  // Single-key tool switches, plus Escape back to the pointer.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.matches('input, textarea')) return
      const next: Record<string, Tool> = { v: 'select', n: 'note', d: 'draw', e: 'erase', s: 'sticker', Escape: 'select' }
      const chosen = next[event.key.length === 1 ? event.key.toLowerCase() : event.key]
      if (!chosen) return
      setTool(chosen)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function chooseTool(next: Tool) {
    setTool(next)
    setBoardSelection(null)
    updateMyPresence({ selectedCardId: null, selectedEdgeId: null })
  }

  function selectStroke(id: string) {
    setBoardSelection({ kind: 'stroke', id })
    updateMyPresence({ selectedCardId: null, selectedEdgeId: null })
  }

  function selectSticker(id: string) {
    setBoardSelection({ kind: 'sticker', id })
    updateMyPresence({ selectedCardId: null, selectedEdgeId: null })
  }

  function deleteSticker(id: string) {
    removeSticker(id)
    setBoardSelection((current) => (current?.id === id ? null : current))
  }

  function eraseAt(world: Point) {
    const reach = ERASE_REACH / camera.zoom
    const hit = strokes
      .filter((stroke) => strokeHit(stroke.points, world, stroke.width / 2 + reach))
      .map((stroke) => stroke.id)
    if (hit.length) removeStrokes(hit)
  }

  /** Drops whatever the active tool makes at a world point; returns false for the pointer tool. */
  function placeAt(world: Point): boolean {
    if (tool === 'note') {
      const id = addCardAt(
        { _tag: 'BlankCard', data: { text: '', color: noteColor, category } },
        world.x - CARD_WIDTH / 2,
        world.y - 40,
      )
      setTool('select')
      updateMyPresence({ editingCardId: id, selectedCardId: id, selectedEdgeId: null })
      return true
    }
    if (tool === 'sticker') {
      addSticker({
        id: crypto.randomUUID(),
        category,
        emoji: stickerEmoji,
        position: { x: Math.round(world.x - STICKER_SIZE / 2), y: Math.round(world.y - STICKER_SIZE / 2) },
        size: STICKER_SIZE,
      })
      return true
    }
    return false
  }

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

    // Space still pans in every tool; otherwise the pen and eraser claim the pointer here.
    if (event.button === 0 && !spaceHeld) {
      const rect = event.currentTarget.getBoundingClientRect()
      const world = screenToWorld(camera, { x: event.clientX - rect.left, y: event.clientY - rect.top })
      if (tool === 'draw') {
        event.currentTarget.setPointerCapture(event.pointerId)
        setDraftStroke({
          id: crypto.randomUUID(),
          category,
          color: penColor,
          width: penWidth,
          points: [Math.round(world.x), Math.round(world.y)],
        })
        return
      }
      if (tool === 'erase') {
        event.currentTarget.setPointerCapture(event.pointerId)
        erasing.current = true
        eraseAt(world)
        return
      }
    }

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

    if (draftStroke) {
      const x = Math.round(world.x)
      const y = Math.round(world.y)
      setDraftStroke((current) => {
        if (!current) return null
        const n = current.points.length
        // Skips points that did not move, which keeps fast scribbles from ballooning.
        if (current.points[n - 2] === x && current.points[n - 1] === y) return current
        return { ...current, points: [...current.points, x, y] }
      })
      return
    }

    if (erasing.current) {
      eraseAt(world)
      return
    }

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

    if (draftStroke) {
      setDraftStroke(null)
      if (commit) addStroke(draftStroke)
      return
    }

    if (erasing.current) {
      erasing.current = false
      return
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
      const rect = event.currentTarget.getBoundingClientRect()
      const world = screenToWorld(camera, { x: event.clientX - rect.left, y: event.clientY - rect.top })
      if (!spaceHeld && placeAt(world)) return
      setBoardSelection(null)
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

    const { kind, fill } = parseCardDrag(event.dataTransfer.getData(CARD_MIME))
    if (kind !== CATEGORY_KIND[category]) return
    addCardAt(defaultContentFor(kind, fill), world.x - CARD_WIDTH / 2, world.y - CARD_HEIGHT / 2)


  }

  const panMode = spaceHeld || panning
  const viewportClass = [
    'canvas',
    `canvas-tool-${tool}`,
    panning ? 'canvas-panning' : spaceHeld ? 'canvas-pan-ready' : '',
    dropActive ? 'canvas-drop-active' : '',
    draftStroke ? 'canvas-drawing' : '',
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
        <StrokeLayer
          strokes={strokes}
          draft={draftStroke}
          zoom={camera.zoom}
          selectedId={boardSelection?.kind === 'stroke' ? boardSelection.id : null}
          selectionColor={myUser.color}
          selectable={tool === 'select' && !panMode}
          onSelect={selectStroke}
        />

        <EdgeLayer
          edges={Object.values(edges)}
          cards={cards}
          sizes={cardSizes}
          zoom={camera.zoom}
          draft={draft}
          selection={edgeSelection}
          onSelect={(id) => updateMyPresence({ selectedEdgeId: id, selectedCardId: null })}
        />

        {Object.values(cards).map((card, index) => (
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
              tilt={index % 2 === 0 ? -2.5 : 2.5}
            />
          </CardErrorBoundary>
        ))}

        {stickers.map((sticker) => (
          <Sticker
            key={sticker.id}
            sticker={sticker}
            zoom={camera.zoom}
            panMode={panMode}
            selected={boardSelection?.kind === 'sticker' && boardSelection.id === sticker.id}
            selectionColor={myUser.color}
            onSelect={selectSticker}
            onMove={moveSticker}
            onDelete={deleteSticker}
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
        <BoardToolbar
          tool={tool}
          noteColor={noteColor}
          penColor={penColor}
          penWidth={penWidth}
          sticker={stickerEmoji}
          onChangeTool={chooseTool}
          onChangeNoteColor={setNoteColor}
          onChangePenColor={setPenColor}
          onChangePenWidth={setPenWidth}
          onChangeSticker={setStickerEmoji}
        />
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
