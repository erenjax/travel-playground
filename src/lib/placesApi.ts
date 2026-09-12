import type { PlaceResult } from './placeQuery'
import { mapPriceLevel } from './placeTypes'

const PLACES_ENDPOINT = import.meta.env.DEV
  ? '/api/places'
  : 'https://places.googleapis.com/v1'
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.photos',
  'places.priceLevel',
].join(',')

type RestPlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  photos?: { name?: string }[]
  priceLevel?: string
}

function photoUrl(name: string | undefined, apiKey: string): string | undefined {
  if (!name) return undefined
  return `${PLACES_ENDPOINT}/${name}/media?maxWidthPx=480&key=${encodeURIComponent(apiKey)}`
}

export function parsePlacesResponse(body: unknown, apiKey: string): PlaceResult[] {
  if (!body || typeof body !== 'object' || !('places' in body)) return []
  const places = (body as { places?: RestPlace[] }).places
  if (!Array.isArray(places)) return []

  return places.flatMap((place) => {
    const name = place.displayName?.text
    if (!name) return []
    const address = place.formattedAddress
    const lat = place.location?.latitude
    const lng = place.location?.longitude
    return [{
      placeId: place.id ?? name,
      name,
      address,
      place: {
        label: name,
        ...(address ? { address } : {}),
        ...(lat != null ? { lat } : {}),
        ...(lng != null ? { lng } : {}),
      },
      imageUrl: photoUrl(place.photos?.[0]?.name, apiKey),
      priceLevel: mapPriceLevel(place.priceLevel),
    }]
  })
}

async function postPlaces(path: string, body: unknown, apiKey: string): Promise<PlaceResult[]> {
  const response = await fetch(`${PLACES_ENDPOINT}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Places ${path} failed (${response.status})`)
  }
  return parsePlacesResponse(await response.json(), apiKey)
}

export async function searchNearbyPlaces(
  apiKey: string,
  request: { lat: number; lng: number; types: string[]; radius: number },
): Promise<PlaceResult[]> {
  return postPlaces('places:searchNearby', {
    includedPrimaryTypes: request.types,
    maxResultCount: 8,
    rankPreference: 'POPULARITY',
    locationRestriction: {
      circle: {
        center: { latitude: request.lat, longitude: request.lng },
        radius: request.radius,
      },
    },
  }, apiKey)
}

export async function searchTextPlaces(
  apiKey: string,
  request: { query: string; types: string[]; bias?: { lat: number; lng: number; radius: number } },
): Promise<PlaceResult[]> {
  return postPlaces('places:searchText', {
    textQuery: request.query,
    includedType: request.types[0],
    maxResultCount: 8,
    ...(request.bias
      ? {
          locationBias: {
            circle: {
              center: { latitude: request.bias.lat, longitude: request.bias.lng },
              radius: request.bias.radius,
            },
          },
        }
      : {}),
  }, apiKey)
}
