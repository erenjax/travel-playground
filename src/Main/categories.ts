import type { CanvasCategory, CardKind } from '../liveblocks/types'

export const CATEGORIES: readonly CanvasCategory[] = ['Hotels', 'Attractions', 'Food']

export const CATEGORY_KIND = {
  Hotels: 'HotelCard',
  Attractions: 'AttractionCard',
  Food: 'FoodCard',
} as const satisfies Record<CanvasCategory, CardKind>
