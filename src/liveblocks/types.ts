import type { LiveMap } from '@liveblocks/client'

export type CanvasUser = {
  name: string
  color: string
}

export type Presence = {
  cursor: { x: number; y: number } | null
  selectedCardId: string | null
  selectedEdgeId: string | null
  user: CanvasUser
}

/** Readonly because `useStorage` hands out immutable snapshots of storage. */
export type Card = {
  readonly id: string
  readonly text: string
  readonly position: { readonly x: number; readonly y: number }
}

/** The edge of a card a connector attaches to. */
export type AnchorSide = 'top' | 'right' | 'bottom' | 'left'

export type EdgeEndpoint = {
  readonly cardId: string
  readonly side: AnchorSide
}

/** Which ends of a connector get an arrowhead. `end` means the head sits at `to`. */
export type ArrowMode = 'none' | 'end' | 'both'

/**
 * Endpoints reference a card and side rather than coordinates, so connectors
 * follow their cards as those move. `from` -> `to` is the edge's direction; flipping
 * a connector swaps the two.
 */
export type Edge = {
  readonly id: string
  readonly from: EdgeEndpoint
  readonly to: EdgeEndpoint
  readonly color: string
  readonly thickness: number
  /** Absent on connectors created before arrows existed; treat that as `none`. */
  readonly arrow?: ArrowMode
}

export type Storage = {
  cards: LiveMap<string, Card>
  edges: LiveMap<string, Edge>
  tripTitle: string
}

declare global {
  interface Liveblocks {
    Presence: Presence
    Storage: Storage
  }
}
