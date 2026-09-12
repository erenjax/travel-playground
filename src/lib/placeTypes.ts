import type { CanvasCategory } from '../liveblocks/types'

export const NEARBY_TYPES = {
  Hotels: ['lodging'],
  Attractions: ['tourist_attraction', 'museum', 'park', 'art_gallery', 'amusement_park', 'zoo'],
  Food: ['restaurant', 'cafe', 'bakery', 'bar'],
} as const satisfies Record<CanvasCategory, readonly string[]>

export function nearbyTypesFor(category: CanvasCategory): string[] {
  return [...NEARBY_TYPES[category]]
}

const NAMED_LEVELS: Record<string, 1 | 2 | 3 | 4> = {
  FREE: 1,
  INEXPENSIVE: 1,
  MODERATE: 2,
  EXPENSIVE: 3,
  VERY_EXPENSIVE: 4,
}

export function mapPriceLevel(level: string | number | undefined): 1 | 2 | 3 | 4 | undefined {
  if (level == null) return undefined
  if (typeof level === 'number') {
    if (level <= 1) return 1
    if (level === 2) return 2
    if (level === 3) return 3
    if (level >= 4) return 4
    return undefined
  }
  const name = level.startsWith('PRICE_LEVEL_') ? level.slice('PRICE_LEVEL_'.length) : level
  return NAMED_LEVELS[name]
}
