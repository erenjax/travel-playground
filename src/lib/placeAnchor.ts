import type { CanvasCategory, Place } from '../liveblocks/types'

export type LastSpot = {
  place: Place
  category: CanvasCategory
  title: string
}

export type PlaceAnchor = {
  place: Place
  source: 'selection' | 'destination'
  sourceCategory?: CanvasCategory
  title: string
}

export function sameSpot(a: LastSpot | null, b: LastSpot | null): boolean {
  if (!a || !b) return a === b
  return (
    a.category === b.category &&
    a.title === b.title &&
    a.place.label === b.place.label &&
    a.place.lat === b.place.lat &&
    a.place.lng === b.place.lng
  )
}

export function resolvePlaceAnchor(
  lastSpot: LastSpot | null,
  destination: Place | null | undefined,
): PlaceAnchor | null {
  if (lastSpot) {
    return {
      place: lastSpot.place,
      source: 'selection',
      sourceCategory: lastSpot.category,
      title: lastSpot.title,
    }
  }

  const label = destination?.label.trim() ?? ''
  if (!label || !destination) return null
  return { place: destination, source: 'destination', title: label }
}

export function showAnchorOnTab(
  anchor: PlaceAnchor | null,
  tab: CanvasCategory,
  viewing: CanvasCategory,
): boolean {
  return Boolean(
    anchor?.source === 'selection' &&
    anchor.sourceCategory === tab &&
    tab !== viewing,
  )
}
