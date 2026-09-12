import { CATEGORY_KIND, CATEGORIES } from '../Main/categories'
import type { CanvasCategory, CardContent, CardKind, Place } from '../liveblocks/types'

export function placeFromCard(content: CardContent): Place | null {
  switch (content._tag) {
    case 'HotelCard':
    case 'AttractionCard':
    case 'FoodCard':
      return content.data.location
    default:
      return null
  }
}

export function cardTitle(content: CardContent): string | null {
  switch (content._tag) {
    case 'HotelCard':
    case 'AttractionCard':
    case 'FoodCard':
      return content.data.name
    default:
      return null
  }
}

export function categoryOfKind(kind: CardKind): CanvasCategory | null {
  for (const category of CATEGORIES) {
    if (CATEGORY_KIND[category] === kind) return category
  }
  return null
}
