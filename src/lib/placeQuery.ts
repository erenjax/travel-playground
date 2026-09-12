import type { CanvasCategory, Place } from '../liveblocks/types'
import type { PlaceAnchor } from './placeAnchor'
import { nearbyTypesFor } from './placeTypes'

export const NEARBY_RADIUS_M = 4000
export const SEARCH_BIAS_RADIUS_M = 8000

export type PlaceResult = {
  placeId: string
  name: string
  address?: string
  place: Place
  imageUrl?: string
  priceLevel?: 1 | 2 | 3 | 4
}

export type SuggestionRequest =
  | { mode: 'none' }
  | { mode: 'nearby'; lat: number; lng: number; types: string[]; radius: number }
  | {
      mode: 'text'
      query: string
      types: string[]
      bias?: { lat: number; lng: number; radius: number }
    }

const SEARCH_NOUN: Record<CanvasCategory, string> = {
  Hotels: 'hotels',
  Attractions: 'attractions',
  Food: 'restaurants',
}

function hasCoordinates(place: Place): place is Place & { lat: number; lng: number } {
  return place.lat != null && place.lng != null
}

export function suggestionRequest(
  query: string,
  category: CanvasCategory,
  anchor: PlaceAnchor | null,
): SuggestionRequest {
  const types = nearbyTypesFor(category)
  const trimmed = query.trim()

  if (trimmed) {
    if (anchor && hasCoordinates(anchor.place)) {
      return {
        mode: 'text',
        query: trimmed,
        types,
        bias: { lat: anchor.place.lat, lng: anchor.place.lng, radius: SEARCH_BIAS_RADIUS_M },
      }
    }
    const city = anchor?.place.label.trim() ?? ''
    const withCity = city && !trimmed.toLowerCase().includes(city.toLowerCase())
      ? `${trimmed} in ${city}`
      : trimmed
    return { mode: 'text', query: withCity, types }
  }

  if (anchor && hasCoordinates(anchor.place)) {
    return {
      mode: 'nearby',
      lat: anchor.place.lat,
      lng: anchor.place.lng,
      types,
      radius: NEARBY_RADIUS_M,
    }
  }

  const city = anchor?.place.label.trim() ?? ''
  if (!city) return { mode: 'none' }
  return { mode: 'text', query: `${SEARCH_NOUN[category]} in ${city}`, types }
}

export function sameSpot(a: Place, b: Place): boolean {
  if (a.lat != null && b.lat != null && a.lng != null && b.lng != null) {
    return Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lng - b.lng) < 0.0005
  }
  return a.label === b.label
}

export function excludeSameSpot(results: PlaceResult[], spot: Place | null | undefined): PlaceResult[] {
  if (!spot) return results
  return results.filter((result) => !sameSpot(result.place, spot))
}
