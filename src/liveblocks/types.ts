import type { LiveMap } from '@liveblocks/client'

export type CanvasUser = {
  name: string
  color: string
}

export type Presence = {
  cursor: { x: number; y: number } | null
  selectedCardId: string | null
  user: CanvasUser
}

/** Readonly because `useStorage` hands out immutable snapshots of storage. */
export type Card = {
  readonly id: string
  readonly text: string
  readonly position: { readonly x: number; readonly y: number }
}

export type Storage = {
  cards: LiveMap<string, Card>
}

declare global {
  interface Liveblocks {
    Presence: Presence
    Storage: Storage
  }
}
