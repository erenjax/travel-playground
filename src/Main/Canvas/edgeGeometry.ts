import type { AnchorSide, ArrowMode, Card, Edge, EdgeEndpoint } from '../../liveblocks/types'
import type { Point } from './useCamera'

/**
 * Width is fixed (`.card` in App.css). Height hugs content, so callers that need a
 * real box pass a measured size; these defaults cover the first frame before that.
 */
export const CARD_WIDTH = 196
export const CARD_HEIGHT = 164

export type CardSize = { readonly width: number; readonly height: number }
export type CardSizeMap = Readonly<Record<string, CardSize>>

export function sizeOf(sizes: CardSizeMap | undefined, cardId: string): CardSize {
  return sizes?.[cardId] ?? { width: CARD_WIDTH, height: CARD_HEIGHT }
}

export const ANCHOR_SIDES: readonly AnchorSide[] = ['top', 'right', 'bottom', 'left']

/** Stroke palette offered by the edge toolbar; the first entry is the default. */
export const EDGE_COLORS = ['#6b6375', '#e11d48', '#ea580c', '#16a34a', '#0284c7', '#9333ea']

export const EDGE_THICKNESSES = [2, 4, 7]

export const DEFAULT_EDGE_COLOR = EDGE_COLORS[0]
export const DEFAULT_EDGE_THICKNESS = EDGE_THICKNESSES[0]

/** New connectors show their direction; existing ones keep the look they were made with. */
export const NEW_EDGE_ARROW: ArrowMode = 'end'

export function arrowModeOf(edge: Edge): ArrowMode {
  return edge.arrow ?? 'none'
}

/** Storage hands out cards as an immutable object keyed by card id. */
export type CardMap = Readonly<Record<string, Card>>

const NORMALS: Record<AnchorSide, Point> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
}

/** How far outside a card's bounds a drop still snaps onto it. */
const DROP_MARGIN = 28

const MIN_CONTROL_OFFSET = 32
const MAX_CONTROL_OFFSET = 160
const CONTROL_OFFSET_RATIO = 0.4

/** Arrowheads grow with stroke weight so heavy connectors keep their proportions. */
const ARROW_LENGTH_PER_THICKNESS = 3.2
const ARROW_LENGTH_BASE = 3
const ARROW_HALF_WIDTH_PER_THICKNESS = 1.7
const ARROW_HALF_WIDTH_BASE = 1.5

/** World-space position of one of a card's four cardinal anchors. */
export function anchorPoint(card: Card, side: AnchorSide, size?: CardSize): Point {
  const { x, y } = card.position
  const width = size?.width ?? CARD_WIDTH
  const height = size?.height ?? CARD_HEIGHT
  switch (side) {
    case 'top':
      return { x: x + width / 2, y }
    case 'right':
      return { x: x + width, y: y + height / 2 }
    case 'bottom':
      return { x: x + width / 2, y: y + height }
    case 'left':
      return { x, y: y + height / 2 }
  }
}

export function endpointPoint(
  cards: CardMap,
  endpoint: EdgeEndpoint,
  sizes?: CardSizeMap,
): Point | null {
  const card = cards[endpoint.cardId]
  return card ? anchorPoint(card, endpoint.side, sizeOf(sizes, card.id)) : null
}

export function oppositeSide(side: AnchorSide): AnchorSide {
  switch (side) {
    case 'top':
      return 'bottom'
    case 'right':
      return 'left'
    case 'bottom':
      return 'top'
    case 'left':
      return 'right'
  }
}

/**
 * Control points sit straight out along each anchor's outward normal, which is what
 * makes the curve leave a card perpendicular to the side it is attached to. The push
 * distance scales with the gap between anchors so short connectors stay tight.
 */
function controlPoints(from: Point, fromSide: AnchorSide, to: Point, toSide: AnchorSide) {
  const span = Math.hypot(to.x - from.x, to.y - from.y)
  const offset = Math.min(
    MAX_CONTROL_OFFSET,
    Math.max(MIN_CONTROL_OFFSET, span * CONTROL_OFFSET_RATIO),
  )
  const fromNormal = NORMALS[fromSide]
  const toNormal = NORMALS[toSide]

  return [
    { x: from.x + fromNormal.x * offset, y: from.y + fromNormal.y * offset },
    { x: to.x + toNormal.x * offset, y: to.y + toNormal.y * offset },
  ] as const
}

export function edgePath(from: Point, fromSide: AnchorSide, to: Point, toSide: AnchorSide) {
  const [c1, c2] = controlPoints(from, fromSide, to, toSide)
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`
}

/** The curve's halfway point (cubic at t=0.5), used to place the edge toolbar. */
export function edgeMidpoint(
  from: Point,
  fromSide: AnchorSide,
  to: Point,
  toSide: AnchorSide,
): Point {
  const [c1, c2] = controlPoints(from, fromSide, to, toSide)
  return {
    x: (from.x + 3 * c1.x + 3 * c2.x + to.x) / 8,
    y: (from.y + 3 * c1.y + 3 * c2.y + to.y) / 8,
  }
}

/**
 * Filled triangle for an arrowhead, tip on the anchor and body sitting outside the card.
 * Pushing a control point along the anchor's normal means the curve arrives along that
 * same normal, so the head needs no tangent math - it just points back into the card.
 */
export function arrowheadPath(tip: Point, side: AnchorSide, thickness: number) {
  const normal = NORMALS[side]
  const length = thickness * ARROW_LENGTH_PER_THICKNESS + ARROW_LENGTH_BASE
  const halfWidth = thickness * ARROW_HALF_WIDTH_PER_THICKNESS + ARROW_HALF_WIDTH_BASE

  const baseX = tip.x + normal.x * length
  const baseY = tip.y + normal.y * length
  const spreadX = -normal.y * halfWidth
  const spreadY = normal.x * halfWidth

  return [
    `M ${tip.x} ${tip.y}`,
    `L ${baseX + spreadX} ${baseY + spreadY}`,
    `L ${baseX - spreadX} ${baseY - spreadY}`,
    'Z',
  ].join(' ')
}

function nearestSide(card: Card, world: Point, size?: CardSize): AnchorSide {
  let nearest: AnchorSide = 'top'
  let shortest = Infinity

  for (const side of ANCHOR_SIDES) {
    const point = anchorPoint(card, side, size)
    const distance = Math.hypot(world.x - point.x, world.y - point.y)
    if (distance < shortest) {
      shortest = distance
      nearest = side
    }
  }

  return nearest
}

/**
 * Resolves the anchor a connector drag would land on, computed from geometry rather
 * than DOM hover so it keeps working while the pointer is captured mid-drag.
 */
export function findDropTarget(
  cards: CardMap,
  world: Point,
  excludeCardId: string,
  sizes?: CardSizeMap,
): EdgeEndpoint | null {
  let best: { card: Card; distance: number; size: CardSize } | null = null

  for (const card of Object.values(cards)) {
    if (card.id === excludeCardId) continue

    const size = sizeOf(sizes, card.id)
    const { x, y } = card.position
    const withinReach =
      world.x >= x - DROP_MARGIN &&
      world.x <= x + size.width + DROP_MARGIN &&
      world.y >= y - DROP_MARGIN &&
      world.y <= y + size.height + DROP_MARGIN
    if (!withinReach) continue

    const distance = Math.hypot(world.x - (x + size.width / 2), world.y - (y + size.height / 2))
    if (!best || distance < best.distance) best = { card, distance, size }
  }

  if (!best) return null
  return { cardId: best.card.id, side: nearestSide(best.card, world, best.size) }
}
