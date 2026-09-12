import type { LiveMap } from '@liveblocks/client'

export type CanvasUser = {
  name: string
  color: string
}

export type CanvasCategory = 'Hotels' | 'Attractions' | 'Food'

export type Presence = {
  activeCategory?: CanvasCategory
  cursor: { x: number; y: number } | null
  selectedCardId: string | null
  selectedEdgeId: string | null
  /**
   * Claims a card for text editing. Card text is a plain string with no per-character
   * merge, so this keeps it to one writer at a time rather than letting two people
   * overwrite each other.
   */
  editingCardId: string | null
  user: CanvasUser
}

/**
 * A spot on the map. `label` is what a card shows; the coordinates are optional so a
 * card can be filled in before it has been resolved to a real place.
 */
export type Place = {
  readonly label: string
  readonly address?: string
  readonly lat?: number
  readonly lng?: number
}

export type Money = {
  readonly amount: number
  /** ISO 4217, e.g. `USD`. */
  readonly currency: string
}

/**
 * Dates and times are ISO 8601 strings because storage round-trips through JSON and a
 * `Date` would not survive. Times carry no zone: they are wall-clock at the place they
 * describe, so a flight leaving at `2026-10-02T08:15` leaves at 08:15 where it takes off.
 */
export type HotelCard = {
  readonly _tag: 'HotelCard'
  readonly data: {
    readonly name: string
    readonly imageUrl: string
    readonly location: Place
    /** Total for the stay, not per night. */
    readonly price: Money
    readonly checkIn: string
    readonly checkOut: string
  }
}

export type FlightLeg = {
  readonly place: Place
  readonly time: string
}

export type FlightStop = {
  readonly place: Place
  readonly layoverMinutes?: number
}

export type FlightCard = {
  readonly _tag: 'FlightCard'
  readonly data: {
    readonly airline: string
    readonly flightNumber?: string
    readonly departure: FlightLeg
    readonly arrival: FlightLeg
    /**
     * Empty means nonstop. The array element type is mutable because Liveblocks' `Lson`
     * constraint rejects `readonly T[]`; treat it as read-only anyway.
     */
    readonly stops: FlightStop[]
  }
}

/** A sight or an event. Events fill in the time window; sights usually leave it out. */
export type AttractionCard = {
  readonly _tag: 'AttractionCard'
  readonly data: {
    readonly name: string
    readonly location: Place
    readonly imageUrl?: string
    readonly price?: Money
    readonly startsAt?: string
    readonly endsAt?: string
  }
}

export type FoodCard = {
  readonly _tag: 'FoodCard'
  readonly data: {
    readonly name: string
    readonly location: Place
    readonly cuisine?: string
    /** 1 through 4, rendered as `$` to `$$$$`. */
    readonly priceLevel?: 1 | 2 | 3 | 4
    readonly reservationAt?: string
    readonly imageUrl?: string
  }
}

export type PhotoCard = {
  readonly _tag: 'PhotoCard'
  readonly data: {
    readonly imageUrl: string
    readonly caption?: string
  }
}

/** The plain sticky note: free text, no travel semantics. */
export type BlankCard = {
  readonly _tag: 'BlankCard'
  readonly data: {
    readonly text: string
  }
}

export type CardContent =
  | HotelCard
  | FlightCard
  | AttractionCard
  | FoodCard
  | PhotoCard
  | BlankCard

export type CardKind = CardContent['_tag']

/** `1` is an upvote, `-1` a downvote. A person with no entry has not voted. */
export type VoteValue = 1 | -1

export type CardVote = {
  readonly voterId: string
  readonly name: string
  readonly value: VoteValue
}

/**
 * The canvas envelope: where a card sits, plus what it holds. Keeping content nested
 * means everything that only moves cards around stays indifferent to card types.
 *
 * Readonly because `useStorage` hands out immutable snapshots of storage.
 */
export type Card = {
  readonly id: string
  readonly position: { readonly x: number; readonly y: number }
  readonly content: CardContent
  /**
   * One entry per voter. An array rather than a map because Liveblocks' JSON type
   * rejects string-keyed records. Treat it as keyed by `voterId`.
   */
  readonly votes?: CardVote[]
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
  destination: Place
  startDate: string
  endDate: string
}

declare global {
  interface Liveblocks {
    Presence: Presence
    Storage: Storage
  }
}
