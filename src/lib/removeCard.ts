import type { Edge } from '../liveblocks/types'

/** Connectors that would be left dangling if this card disappeared. */
export function edgeIdsAttachedTo(edges: readonly Edge[], cardId: string): string[] {
  return edges
    .filter((edge) => edge.from.cardId === cardId || edge.to.cardId === cardId)
    .map((edge) => edge.id)
}
